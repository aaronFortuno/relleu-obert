import {normalizeBasicObjects} from './basic-object-settings.js';
import {CATEGORIES} from './materials.js';
import {selectSurfaceComponents,removeCollapsedSurfaceComponents} from './surface-components.js';
import {subtractVoids} from './solid-voids.js';
import {uniteMaterials} from './solid-operations.js';
import {partComponents} from './solid-audit.js';

const MATERIAL=CATEGORIES.find(p=>p.id==='buildings');
const SUPPORT=new Set(['terrain','forest','grass','roads','railways','buildings','rock','snow']);
const WATER=new Set(['water','inland-water']);
const error=(code,objectIndex,cause)=>Object.assign(new Error(code,{cause}),{code,objectIndex});

// Read the top of the actual printable mesh, including roofs and edited pads.
// A DEM sample alone would leave additions buried in a building or floating
// above a freshly levelled courtyard.
function supportAt(parts,x,y){
  let top=-Infinity,water=-Infinity;
  for(const part of parts){
    if(!SUPPORT.has(part.id)&&!WATER.has(part.id))continue;
    const {vertices:v,faces:f}=part;
    for(let i=0;i<f.length;i+=3){
      const a=f[i]*3,b=f[i+1]*3,c=f[i+2]*3;
      if(x<Math.min(v[a],v[b],v[c])-1e-6||x>Math.max(v[a],v[b],v[c])+1e-6||
        y<Math.min(v[a+1],v[b+1],v[c+1])-1e-6||y>Math.max(v[a+1],v[b+1],v[c+1])+1e-6)continue;
      const den=(v[b+1]-v[c+1])*(v[a]-v[c])+(v[c]-v[b])*(v[a+1]-v[c+1]);
      if(Math.abs(den)<1e-10)continue;
      const u=((v[b+1]-v[c+1])*(x-v[c])+(v[c]-v[b])*(y-v[c+1]))/den;
      const w=((v[c+1]-v[a+1])*(x-v[c])+(v[a]-v[c])*(y-v[c+1]))/den,t=1-u-w;
      if(Math.min(u,w,t)<-1e-6)continue;
      const z=u*v[a+2]+w*v[b+2]+t*v[c+2];
      if(WATER.has(part.id))water=Math.max(water,z);else top=Math.max(top,z);
    }
  }
  return Number.isFinite(top)&&water<top-1e-5?top:null;
}

function typed(solid){
  const mesh=solid.getMesh(),vertices=new Float32Array(mesh.numVert*3);
  for(let i=0;i<mesh.numVert;i++)vertices.set(mesh.vertProperties.subarray(i*mesh.numProp,i*mesh.numProp+3),i*3);
  return {...MATERIAL,vertices,faces:new Uint32Array(mesh.triVerts)};
}

function objectMesh(item,x,y,base,width,height,api){
  const owned=[],own=s=>(owned.push(s),s),{shape,widthMM:w,depthMM:d,heightMM:h,rotation}=item;
  try{
    let solid;
    if(shape==='box')solid=own(api.Manifold.cube([w,d,h],true));
    else if(shape==='cylinder')solid=own(own(api.Manifold.cylinder(h,1,1,48,true)).scale([w/2,d/2,1]));
    else solid=own(own(api.Manifold.sphere(1,48)).scale([w/2,d/2,h/2]));
    solid=own(own(solid.rotate([0,0,rotation])).translate([x,y,base+h/2]));
    const crop=own(api.Manifold.cube([width,height,Math.max(1,base+h+1)]));
    const clipped=own(solid.intersect(crop));
    if(clipped.status()!=='NoError')throw Error('Invalid object solid');
    return clipped.numTri()?typed(clipped):null;
  }finally{for(const solid of owned.reverse())solid.delete();}
}

// Reapply against the unchanged source when an object moves or is removed.
// Objects claim their own material volume rather than overlapping filament
// shells and letting the slicer decide which colour should win.
export function applyBasicObjects(model,objects,api){
  let items;
  try{items=normalizeBasicObjects(objects);}catch(cause){throw error('OBJECT_INVALID',undefined,cause);}
  const levels=Array(items.length).fill(null),ctx=model.context;
  if(!items.length)return {model,levels};
  if(!ctx?.proj?.project||!api?.Manifold||!Array.isArray(model.categories))throw error('OBJECT_FAILED');
  const {width,height}=model;
  let categories=model.categories,current,treeCount=model.treeCount;
  try{
    for(const [index,item] of items.entries()){
      current=index;
      const [x,y]=ctx.proj.project(item.position),r=item.rotation*Math.PI/180,cos=Math.cos(r),sin=Math.sin(r);
      if(!Number.isFinite(x)||!Number.isFinite(y))throw error('OBJECT_INVALID',index);
      const ring=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{
        const dx=a*item.widthMM/2,dy=b*item.depthMM/2;
        return [x+dx*cos-dy*sin,y+dx*sin+dy*cos];
      });
      const minX=Math.min(...ring.map(p=>p[0])),maxX=Math.max(...ring.map(p=>p[0]));
      const minY=Math.min(...ring.map(p=>p[1])),maxY=Math.max(...ring.map(p=>p[1]));
      if(maxX<=0||minX>=width||maxY<=0||minY>=height)continue;
      const sx=Math.max(0,Math.min(width,x)),sy=Math.max(0,Math.min(height,y));
      const support=supportAt(categories,sx,sy);
      if(support===null)throw error('OBJECT_NO_SUPPORT',index);
      const base=Math.max(0,support-Math.min(.2,item.heightMM*.15));
      const mesh=objectMesh(item,x,y,base,width,height,api);
      if(!mesh)continue;
      const footprint=[[[...ring,ring[0]]]];
      const {selected,restore}=selectSurfaceComponents(categories,[mesh],{categories:categories.map(p=>p.id),footprints:[footprint]});
      const substrate=selected.filter(part=>part.id!=='buildings'&&part.id!=='trees');
      const cut=substrate.length?subtractVoids({parts:substrate},[mesh],api).parts:[];
      const existing=selected.find(part=>part.id==='buildings');
      const built=existing?uniteMaterials({parts:[existing,mesh]},api).parts:[mesh];
      const trees=selected.find(part=>part.id==='trees');
      const cleared=trees?[{...trees,vertices:new Float32Array(),faces:new Uint32Array()}]:[];
      // Remove a touched tree as a whole, rather than cutting its trunk and
      // leaving its crown suspended above the new building.
      if(trees&&Number.isFinite(treeCount))treeCount=Math.max(0,treeCount-partComponents(trees.faces).length);
      categories=restore(removeCollapsedSurfaceComponents([...cut,...built,...cleared],{floatRoundoff:true}).parts).filter(p=>p.faces.length);
      levels[index]={baseMM:base,topMM:base+item.heightMM};
    }
    const next={...model,categories,parts:categories,triangles:categories.reduce((n,p)=>n+p.faces.length/3,0)};
    if(Number.isFinite(treeCount))next.treeCount=treeCount;
    Object.defineProperty(next,'context',{value:ctx});
    return {model:next,levels};
  }catch(cause){
    if(cause.code?.startsWith('OBJECT_'))throw cause;
    throw error('OBJECT_FAILED',current,cause);
  }
}
