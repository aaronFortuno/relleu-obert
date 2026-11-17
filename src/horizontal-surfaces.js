import earcut from 'earcut';
import {normalizeHorizontalSurfaces} from './horizontal-surface-settings.js';
import {CATEGORIES} from './materials.js';
import {polygonTester} from './polygon-index.js';
import {polygonOps} from './polygon-ops.js';
import {DEFAULT_BASE_THICKNESS_MM} from './print-settings.js';
import {partComponents} from './solid-audit.js';
import {removeCollapsedSurfaceComponents,selectSurfaceComponents} from './surface-components.js';
import {uniteMaterials} from './solid-operations.js';
import {subtractVoids} from './solid-voids.js';

const OPS=polygonOps(),EPS=1e-6,MIN_AREA=.25,FINISH=.55;
const REPLACE=['terrain','forest','grass','roads'],PROTECTED=['water','inland-water','buildings','railways'];
const error=(code,surfaceIndex,cause)=>Object.assign(new Error(code,{cause}),{code,surfaceIndex});
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const dist2=(a,b)=>(b[0]-a[0])**2+(b[1]-a[1])**2;
const half=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const ringArea=ring=>Math.abs(ring.reduce((area,p,i)=>area+(i>1?cross(ring[0],ring[i-1],p):0),0))/2;
const polygonArea=polygon=>polygon.reduce((area,ring,i)=>area+(i?-1:1)*ringArea(ring),0);
const area=polygons=>polygons.reduce((n,polygon)=>n+polygonArea(polygon),0);
const wrap=ring=>[[[...ring,ring[0]]]];
const rect=(x0,y0,x1,y1)=>wrap([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);
const bounds=polygons=>{
  const box=[Infinity,Infinity,-Infinity,-Infinity];
  for(const [outer] of polygons)for(const [x,y] of outer){
    box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],y);
    box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],y);
  }
  return box;
};
const near=(a,b)=>a[0]<b[2]&&a[1]<b[3]&&a[2]>b[0]&&a[3]>b[1];

function onSegment(a,b,p){
  return Math.abs(cross(a,b,p))<=EPS&&[0,1].every(k=>Math.min(a[k],b[k])-EPS<=p[k]&&p[k]<=Math.max(a[k],b[k])+EPS);
}
function intersects(a,b,c,d){
  const [j,k,l,m]=[cross(a,b,c),cross(a,b,d),cross(c,d,a),cross(c,d,b)];
  return (j>EPS&&k<-EPS||j<-EPS&&k>EPS)&&(l>EPS&&m<-EPS||l<-EPS&&m>EPS)||
    onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);
}

function isSimple(points){
  const n=points.length;
  for(let i=0;i<n;i++){
    const a=points[i],b=points[(i+1)%n],c=points[(i+2)%n];
    if(dist2(a,b)<EPS**2||onSegment(a,b,c)||onSegment(b,c,a))return false;
    for(let j=i+2;j<n;j++)if((j+1)%n!==i&&intersects(a,b,points[j],points[(j+1)%n]))return false;
  }
  return ringArea(points)>EPS;
}

function sampleLevels(polygons,ground,surfaceIndex){
  let min=Infinity,max=-Infinity,total=0,covered=0;
  const sample=p=>{
    const z=ground(...p);
    if(!Number.isFinite(z))throw error('HORIZONTAL_SURFACE_INVALID',surfaceIndex);
    min=Math.min(min,z);max=Math.max(max,z);return z;
  };
  // Area-weighted centroids avoid favouring dense corners of a hand drawn
  // outline. Split long triangles so the interior also contributes extrema.
  const scan=(a,b,c,depth)=>{
    const span=[dist2(a,b),dist2(b,c),dist2(c,a)],longest=Math.max(...span);
    if(longest>36&&depth<8){
      if(span[1]===longest)[a,b,c]=[b,c,a];
      else if(span[2]===longest)[a,b,c]=[c,a,b];
      const mid=half(a,b);sample(mid);scan(a,mid,c,depth+1);scan(mid,b,c,depth+1);
    }else{
      const weight=Math.abs(cross(a,b,c))/2;
      const z=sample([(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3]);
      total+=z*weight;covered+=weight;
    }
  };
  for(const polygon of polygons){
    const points=[],holes=[];
    polygon.forEach((ring,i)=>{
      if(i)holes.push(points.length);
      for(const p of ring.slice(0,-1)){sample(p);points.push(p);}
    });
    const faces=earcut(points.flat(),holes);
    for(let i=0;i<faces.length;i+=3)scan(points[faces[i]],points[faces[i+1]],points[faces[i+2]],0);
  }
  if(covered<EPS)throw error('HORIZONTAL_SURFACE_INVALID',surfaceIndex);
  return {min,max,mean:total/covered};
}

function prism(api,footprint,lo,hi,metadata){
  const section=new api.CrossSection(footprint.flatMap(p=>p.map(r=>r.slice(0,-1))),'EvenOdd');
  let extruded,solid;
  try{
    extruded=section.extrude(hi-lo);
    solid=extruded.translate([0,0,lo]);
    if(solid.status()!=='NoError'||!solid.numTri())throw Error('Invalid surface prism');
    const mesh=solid.getMesh(),vertices=new Float32Array(mesh.numVert*3);
    for(let i=0;i<mesh.numVert;i++)vertices.set(mesh.vertProperties.subarray(i*mesh.numProp,i*mesh.numProp+3),i*3);
    return {...metadata,vertices,faces:new Uint32Array(mesh.triVerts)};
  }finally{solid?.delete();extruded?.delete();section.delete();}
}

function protectedFootprints(context){
  const footprints=[context.waterPoly,context.railPoly,context.buildingMask,context.tunnelMask];
  for(const bridge of context.bridges??[]){
    footprints.push(bridge.mask);
    for(const plan of bridge.approaches?.plans??[])if(plan.footprint?.length)footprints.push([plan.footprint]);
  }
  for(const patch of context.activeLandforms??[])for(const {extent:{lo,hi}} of patch.cutters??[])
    footprints.push(rect(lo[0],lo[1],hi[0],hi[1]));
  return footprints.filter(footprint=>footprint?.length).flatMap(polygons=>polygons.map(p=>({polygon:[p],box:bounds([p])})));
}

const emptyPart=part=>({...part,vertices:new Float32Array(),faces:new Uint32Array()});
const metadata=id=>CATEGORIES.find(mat=>mat.id===id);

// The platform changes only the solids under its outline. Earth continues
// underneath the thin material finish, and the bottom plane stays intact.
export function applyHorizontalSurfaces(model,edits,api){
  let surfaces;
  try{surfaces=normalizeHorizontalSurfaces(edits);}catch(cause){throw error('HORIZONTAL_SURFACE_INVALID',undefined,cause);}
  const ctx=model.context,levels=Array(surfaces.length).fill(null);
  if(!surfaces.length)return {model,levels,ground:ctx?.ground};
  if(!ctx?.proj?.project||!ctx.ground||!api?.CrossSection||!Array.isArray(model.categories))
    throw error('HORIZONTAL_SURFACE_FAILED');
  const {width,height,ground}=ctx;
  const crop=ctx.rect??rect(0,0,width,height),base=model.provenance?.options?.baseThickness??DEFAULT_BASE_THICKNESS_MM;
  // Refill from the existing underside. Unlike a cut stopping just below
  // the nominal base, this remains connected where a road has already
  // excavated the surrounding ground below the nominal datum.
  const cutFloor=0,pads=[];
  let upper=-Infinity,current;
  try{
    const blockers=protectedFootprints(ctx);
    for(const [index,surface] of surfaces.entries()){
      current=index;
      const points=surface.points.map(point=>ctx.proj.project(point));
      if(points.some(p=>!p||![p[0],p[1]].every(Number.isFinite))||!isSimple(points))throw error('HORIZONTAL_SURFACE_INVALID',index);
      const footprint=OPS.intersection(wrap(points),crop),clippedArea=area(footprint);
      if(clippedArea<EPS)continue;
      if(clippedArea<MIN_AREA)throw error('HORIZONTAL_SURFACE_INVALID',index);
      if(pads.some(p=>area(OPS.intersection(p.footprint,footprint))>EPS))throw error('HORIZONTAL_SURFACE_OVERLAP',index);
      const box=bounds(footprint);
      if(blockers.some(p=>near(p.box,box)&&area(OPS.intersection(p.polygon,footprint))>EPS)||
        ctx.land?.length&&clippedArea-area(OPS.intersection(ctx.land,footprint))>EPS)
        throw error('HORIZONTAL_SURFACE_CONFLICT',index);
      const stats=sampleLevels(footprint,ground,index);
      const level=Math.fround(Math.max(base,stats[surface.reference]+surface.offsetMM));
      levels[index]={levelMM:level,minMM:stats.min,maxMM:stats.max};
      pads.push({index,footprint,level,material:surface.material,contains:polygonTester(footprint)});
      upper=Math.max(upper,level,stats.max);
    }

    if(!pads.length)return {model,levels,ground};
    for(const {vertices} of model.categories)for(let i=2;i<vertices.length;i+=3)upper=Math.max(upper,vertices[i]);
    current=pads.length===1?pads[0].index:undefined;
    const footprints=pads.map(p=>p.footprint),cutters=pads.map(p=>prism(api,p.footprint,cutFloor,upper+1));
    // Confirm against the actual meshes too: explicit catalogue geometry,
    // for example, need not be fully represented in the source masks.
    const protectedMeshes=selectSurfaceComponents(model.categories,cutters,{categories:PROTECTED,footprints});
    if(protectedMeshes.selected.length){
      const culprit=pads.length===1?0:pads.findIndex((p,i)=>
        selectSurfaceComponents(protectedMeshes.selected,[cutters[i]],{categories:PROTECTED,footprints:[p.footprint]}).selected.length);
      throw error('HORIZONTAL_SURFACE_CONFLICT',pads[culprit]?.index);
    }
    const {selected,restore}=selectSurfaceComponents(model.categories,cutters,{categories:[...REPLACE,'trees'],footprints});
    const sculpt=selected.filter(part=>part.id!=='trees'),trees=selected.find(part=>part.id==='trees');
    const cut=sculpt.length?subtractVoids({parts:sculpt},cutters,api).parts:[];
    const inserts=new Map();
    const add=(id,p,lo,hi)=>{
      if(!inserts.has(id))inserts.set(id,[]);
      inserts.get(id).push(prism(api,p.footprint,lo,hi,metadata(id)));
    };
    for(const p of pads){
      const soilTop=p.material==='terrain'?p.level:Math.fround(p.level-FINISH);
      add('terrain',p,cutFloor,soilTop);
      if(p.material!=='terrain')add(p.material,p,soilTop,p.level);
    }
    const local=cut.filter(part=>!inserts.has(part.id));
    for(const [id,parts] of inserts){
      const adjacent=cut.find(part=>part.id===id);
      if(adjacent?.faces.length)parts.unshift(adjacent);
      local.push(...(parts.length>1?uniteMaterials({parts},api).parts:parts));
    }
    const clean=removeCollapsedSurfaceComponents(local,{floatRoundoff:true}).parts;
    const categories=restore(trees?[...clean,emptyPart(trees)]:clean).filter(p=>p.faces.length);
    const next={...model,categories,parts:categories,triangles:categories.reduce((n,p)=>n+p.faces.length/3,0)};
    Object.defineProperty(next,'context',{value:ctx});
    if(trees&&Number.isFinite(next.treeCount))next.treeCount=Math.max(0,next.treeCount-partComponents(trees.faces).length);
    // Selectors call this to seat later additions (like fences) on the new surface.
    const modifiedGround=(x,y)=>pads.find(p=>p.contains([x,y])||
      p.footprint.some(poly=>poly.some(ring=>ring.slice(1).some((end,i)=>onSegment(ring[i],end,[x,y])))))?.level??ground(x,y);
    return {model:next,levels,ground:modifiedGround};
  }catch(cause){
    if(cause.code?.startsWith('HORIZONTAL_SURFACE_'))throw cause;
    throw error('HORIZONTAL_SURFACE_FAILED',current,cause);
  }
}
