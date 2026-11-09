import {printableReliefCoverage,sampleCoverage} from './relief-contours.js';
import {levelReliefLakes} from './relief-lakes.js';
import {reliefDiagonals,reliefParts,reliefGridSize,reliefTreesPart,previewReliefPieces,assemblePanoramicRelief,reliefInlandWater,PURE_RELIEF_RESOLUTIONS} from './pure-relief-mesh.js';
import {reliefStreamStrips} from './relief-streams.js';
import {sampleReliefMask} from './relief-forest.js';
import {alpineCrownHeightFactor,reliefCrownTaper} from './relief-forest-trees.js';
import {reliefVegetationHeightRange,reliefVegetationTexture} from './relief-vegetation-texture.js';
import {waterwayPolygons} from './waterways.js';
import {polygonOps} from './polygon-ops.js';
import earcut from 'earcut';
import {sampleHeight,prepareElevationTiles,createTerrainField,createElevationSampler,focusedTerrainGrid} from './elevation.js';
import {CATEGORIES,groupMaterials} from './materials.js';
import {polygonTester} from './polygon-index.js';
import {lineBuffer} from './roads.js';
import {isRailway,isInactiveRailway,railwayOptions,railwayWidthMetres} from './railways.js';
import {surfaceRailAxes,railwaySections,corridorPatches} from './railway-surface.js';
import {applyCatalogueRailways} from './catalogue-railways.js';
import {principalSurface,principalAxes,principalSections} from './principal-road-surface.js';
import {buildingOptions,buildingRise} from './building-options.js';
import {splitModel} from './mesh-tiles.js';
import {catalogueBridgeItem,catalogueBridgeUpper} from './catalogue-bridges.js';
import {prepareCatalogueLandforms,resolvableLandform,catalogueTerrain,carveCatalogueLandforms,clearOfLandforms,landformWarnings} from './catalogue-landforms.js';
import {MAX_MODEL_SIDE_MM,validateScale,isPanoramicSize,validPieceDimensions,PURE_SCALE_RANGE,PANORAMIC_SCALE_RANGE} from './selection.js';
import {localRasterSampler} from './local-raster.js';
import {treeDimensions,TREE_CROWN_METRES,MIN_TREE_MM} from './tree-scale.js';
import {treeSampler,fitTrees,MAX_TREES} from './vegetation-budget.js';
import {scatterBrush} from './brush-scatter.js';
import {createGestureCoverage} from './brush-coverage.js';
import {roofProfile} from './building-roofs.js';
import {projectInfrastructurePath} from './infrastructure-solids.js';
import {topSampler,planApproaches,planPiers,columnSolid,deferredObstacleMask} from './bridge-completion.js';
import {uniteMaterials} from './solid-operations.js';
import {auditPart} from './solid-audit.js';
import {generateProceduralBridgeItems} from './procedural-bridges.js';
import {bridgeCrossesWater,fitWaterBridge,fitMainWaterBridge} from './bridge-water.js';
import {generateProceduralTunnelVoids} from './procedural-tunnels.js';
import {carveAvailableTunnels} from './tunnel-operations.js';
import {generateMajorRoadItems,reserveProfileEnds} from './major-roads.js';
import {roadWidthMM,MIN_ROAD_WIDTH_MM,isPrincipalRoad} from './transport-width.js';
import {transportIdentity,compatibleTransport,continuationRoute} from './transport-network.js';
import {crossSectionFractions} from './transport-sections.js';
import {fitMajorRoadItem,knownBridgeClearance,openedTunnelClearance} from './major-road-fit.js';
import {carveIndependentTransportDecks,carveTransportDecks} from './transport-carving.js';
import {subtractVoids} from './solid-voids.js';
import {planSurfaceRoad} from './surface-road.js';
import {planClassifiedRoadCoupon,planRegionalSurfaceRoads} from './regional-surface-roads.js';
import {removeCollapsedSurfaceComponents} from './surface-components.js';
import {isFlowingWater,isMarineWater,isStandingWater,shorelineLevel} from './standing-water.js';
import {DEFAULT_BASE_THICKNESS_MM,validBaseThickness} from './print-settings.js';
export {sampleHeight} from './elevation.js';
const pc=polygonOps(undefined,{recoverMillimetreUnions:true});
function modelBaseThickness(value=DEFAULT_BASE_THICKNESS_MM){
  if(!validBaseThickness(value))throw Error('El gruix de la base ha de ser entre 2 i 30 mm, en passos de 0,5 mm.');
  return value;
}

function verticalDatum(originMeters,minimumSurfaceMM,hasOcean){
  return {originMeters,minimumSurfaceMM,seaLevelMM:hasOcean?minimumSurfaceMM:null,
    method:hasOcean?`sea level at ${minimumSurfaceMM} mm; no bathymetry`:`lowest generated-terrain sample at ${minimumSurfaceMM} mm`};
}

export const MATERIALS=[{id:'terrain',name:'Terreny',color:'#c6b38d'},{id:'water',name:'Aigua',color:'#8dc5ca'},{id:'built',name:'Edificis i camins',color:'#eee9dc'},{id:'green',name:'Vegetació',color:'#4e8966'}];
const area=r=>r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;
const footprintArea=polys=>polys.reduce((total,poly)=>total+Math.abs(poly.reduce((sum,ring)=>sum+area(ring),0)),0);
export function pointIn(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function inMulti(p,m){return m.some(poly=>pointIn(p,poly[0])&&!poly.slice(1).some(r=>pointIn(p,r)));}
const box=(w,h)=>[[[[0,0],[w,0],[w,h],[0,h],[0,0]]]];
const intersect=(a,b)=>a.length&&b.length?pc.intersection(a,b):[];
const subtract=(a,b)=>a.length&&b.length?pc.difference(a,b):a;
function merge(polys){let result=[];for(let i=0;i<polys.length;i+=30){const batch=polys.slice(i,i+30);result=result.length?pc.union(result,...batch):pc.union(...batch);}return result;}
// Keep the accumulated outlines local until the final union. Repeatedly
// merging tiny batches into one region-wide outline reprocesses it each time.
function mergeLayer(polys){
  if(polys.length<=300)return merge(polys);
  let level=polys;
  while(level.length>30){
    const next=[];
    for(let i=0;i<level.length;i+=30)next.push(pc.union(...level.slice(i,i+30)));
    level=next;
  }
  return pc.union(...level);
}
const snap=v=>Math.round(v*1e5)/1e5;
export function makeProjection(bbox,size,physical={}){
  if(physical.selectionPose){
    const {center:[lat,lon],widthM,heightM,rotation}=physical.selectionPose,c=Math.cos(lat*Math.PI/180),a=rotation*Math.PI/180,cos=Math.cos(a),sin=Math.sin(a),width=physical.widthMM||size,height=physical.heightMM||size*heightM/widthM,sx=width/widthM,sy=height/heightM;
    if(![lat,lon,widthM,heightM,rotation].every(Number.isFinite)||widthM<=0||heightM<=0)throw Error('Orientació del retall invàlida.');
    return {width,height,scale:Math.min(sx,sy),project:([x,y])=>{const dx=(x-lon)*111320*c,dy=(y-lat)*111320;return [snap(width/2+(dx*cos-dy*sin)*sx),snap(height/2+(dx*sin+dy*cos)*sy)];},unproject:([x,y])=>{const dx=(x-width/2)/sx,dy=(y-height/2)/sy;return [lon+(dx*cos+dy*sin)/(111320*c),lat+(-dx*sin+dy*cos)/111320];}};
  }
  const [w,s,e,n]=bbox,c=Math.cos((s+n)/2*Math.PI/180),xm=(e-w)*111320*c,ym=(n-s)*111320,scale=size/Math.max(xm,ym);
  const width=physical.widthMM||xm*scale,height=physical.heightMM||ym*scale,sx=width/xm,sy=height/ym;
  return {width,height,scale:Math.min(sx,sy),project:([lon,lat])=>[snap((lon-w)*111320*c*sx),snap((lat-s)*111320*sy)],unproject:([x,y])=>[w+x/(111320*c*sx),s+y/(111320*sy)]};
}
function geoPolys(f,project){const coords=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];return coords.map(poly=>poly.map(r=>r.map(project)));}
export class Surface {
  constructor(){this.vertices=[];this.faces=[];this.lookup=new Map();}
  vertex(p){if(!p.every(Number.isFinite))throw Error('La geometria conté una coordenada invàlida.');const key=p.map(x=>x.toFixed(6)).join(',');if(!this.lookup.has(key)){this.lookup.set(key,this.vertices.length/3);this.vertices.push(...p);}return this.lookup.get(key);}
  tri(a,b,c){const ids=[a,b,c].map(p=>this.vertex(p));if(new Set(ids).size===3)this.faces.push(...ids);}
  polygon(poly,height){
    const flat=[],holes=[];
    for(let i=0;i<poly.length;i++){
      const ring=[];for(const p of poly[i].slice(0,-1)){const q=p.map(v=>Math.round(v*1e4)/1e4);if(!ring.length||q[0]!==ring.at(-1)[0]||q[1]!==ring.at(-1)[1])ring.push(q);}
      if(ring.length>1&&ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1])ring.pop();
      if(ring.length<3||Math.abs(area(ring))<1e-8){if(i===0)return;continue;}
      if(i)holes.push(flat.length/2);for(const p of ring)flat.push(...p);
    }
    const ix=earcut(flat,holes);for(let i=0;i<ix.length;i+=3){const p=ix.slice(i,i+3).map(j=>[flat[2*j],flat[2*j+1]]),a=area(p);if(Math.abs(a)<1e-8)continue;if(a<0)[p[1],p[2]]=[p[2],p[1]];this.tri(...p.map(([x,y])=>[x,y,height(x,y)]));}
  }
  solid(bottom){
    if(this.faces.length===3){
      const [a,b,c]=this.faces.map(id=>this.vertices.slice(id*3,id*3+2));
      const determinant=([x,y],[u,v],[p,q])=>(u-x)*(q-y)-(v-y)*(p-x);
      // An isolated thin prism can change winding when its XY is stored in
      // Float32. Orient the entire shell from its representable footprint.
      if(determinant(a,b,c)>0&&determinant(a.map(Math.fround),b.map(Math.fround),c.map(Math.fround))<0)
        [this.faces[1],this.faces[2]]=[this.faces[2],this.faces[1]];
    }
    const topVertices=this.vertices.slice(),topFaces=this.faces.slice(),edges=new Map();
    const counts=new Map(),degree=new Map();
    for(let i=0;i<topFaces.length;i+=3)for(let j=0;j<3;j++){const a=topFaces[i+j],b=topFaces[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');counts.set(key,(counts.get(key)||0)+1);}
    for(const [key,count]of counts)if(count===1)for(const id of key.split(',').map(Number))degree.set(id,(degree.get(id)||0)+1);
    // A road junction can pinch to a point after polygon clipping. Extrude its
    // triangles separately so four side faces never share a single edge.
    if([...counts.values()].some(n=>n>2)||[...degree.values()].some(n=>n!==2)){
      const result={vertices:[],faces:[]};for(let i=0;i<topFaces.length;i+=3){const prism=new Surface();prism.tri(...topFaces.slice(i,i+3).map(id=>topVertices.slice(id*3,id*3+3)));append(result,prism.solid(bottom));}return {vertices:new Float32Array(result.vertices),faces:new Uint32Array(result.faces)};
    }
    for(let i=0;i<topFaces.length;i+=3){const ids=topFaces.slice(i,i+3),p=ids.map(j=>topVertices.slice(3*j,3*j+3));this.tri(...[p[2],p[1],p[0]].map(v=>[v[0],v[1],bottom(...v)]));for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}}
    for(const [a,b]of edges.values()){const p=topVertices.slice(a*3,a*3+3),q=topVertices.slice(b*3,b*3+3),pb=[p[0],p[1],bottom(...p)],qb=[q[0],q[1],bottom(...q)];this.tri(p,pb,qb);this.tri(p,qb,q);}
    return {vertices:new Float32Array(this.vertices),faces:new Uint32Array(this.faces)};
  }
}
function boundaryCells(polys,nx,ny,gridX,gridY,i0=0,i1=nx-1,j0=0,j1=ny-1){
  const boundary=new Uint8Array(nx*ny);
  for(const polygon of polys)for(const ring of polygon)for(let k=1;k<ring.length;k++){
    const a=ring[k-1],b=ring[k],left=Math.min(gridX(a[0]),gridX(b[0])),right=Math.max(gridX(a[0]),gridX(b[0]));
    const bottom=Math.min(gridY(a[1]),gridY(b[1])),top=Math.max(gridY(a[1]),gridY(b[1]));
    for(let j=Math.max(j0,Math.floor(bottom-1e-7));j<=Math.min(j1,Math.floor(top+1e-7));j++)
      for(let i=Math.max(i0,Math.floor(left-1e-7));i<=Math.min(i1,Math.floor(right+1e-7));i++)boundary[j*nx+i]=1;
  }
  return boundary;
}
function* terrainPatches(polys,width,heightMM,res,grid){
  if(!polys.length)return;
  const nx=grid?grid.x.length-1:res,ny=grid?grid.y.length-1:res;
  const indexX=grid?.indexX??(x=>x/width*res),indexY=grid?.indexY??(y=>y/heightMM*res);
  let minX=width,minY=heightMM,maxX=0,maxY=0;for(const poly of polys)for(const [x,y]of poly[0]){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  const i0=Math.max(0,Math.floor(indexX(minX))),i1=Math.min(nx-1,Math.floor(indexX(maxX))),j0=Math.max(0,Math.floor(indexY(minY))),j1=Math.min(ny-1,Math.floor(indexY(maxY))),columns=[];
  // Only cells crossed by a polygon boundary need clipping. Include both
  // sides of grid-aligned edges and the boundaries of holes.
  const boundary=boundaryCells(polys,nx,ny,grid?.indexX??(x=>x*res/width),grid?.indexY??(y=>y*res/heightMM),i0,i1,j0,j1);
  let contains;
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
    const x=grid?grid.x[i]:i*width/res,y=grid?grid.y[j]:j*heightMM/res;
    const x1=grid?grid.x[i+1]:(i+1)*width/res,y1=grid?grid.y[j+1]:(j+1)*heightMM/res;
    const tris=[[[x,y],[x1,y],[x1,y1],[x,y]],[[x,y],[x1,y1],[x,y1],[x,y]]];
    if(!boundary[j*nx+i]){
      contains??=polygonTester(polys);
      if(contains([(x+x1)/2,(y+y1)/2]))for(const tri of tris)yield [tri];
      continue;
    }
    columns[i]??=intersect(polys,[[[[x,0],[x1,0],[x1,heightMM],[x,heightMM],[x,0]]]]);
    const candidates=intersect(columns[i],[[[[x,y],[x1,y],[x1,y1],[x,y1],[x,y]]]]);
    if(!candidates.length)continue;
    for(const tri of tris)yield* intersect(candidates,[[tri]]);
  }
}
function dryFootprints(water,width,height,res){
  if(!water.length)return ()=>true;
  const wet=boundaryCells(water,res,res,x=>x*res/width,y=>y*res/height),contains=polygonTester(water);
  // With no boundary in a cell, its centre classifies the whole cell.
  // Mark uncertain cells wet so waterfront buildings keep the exact clip.
  for(let j=0;j<res;j++)for(let i=0;i<res;i++){
    const k=j*res+i;
    if(!wet[k]&&contains([(i+.5)*width/res,(j+.5)*height/res]))wet[k]=1;
  }
  return polygons=>polygons.every(([outer])=>{
    let west=width,east=0,south=height,north=0;
    for(const [x,y] of outer){
      west=Math.min(west,x);east=Math.max(east,x);
      south=Math.min(south,y);north=Math.max(north,y);
    }
    const left=Math.max(0,Math.floor(west*res/width-1e-7)),right=Math.min(res-1,Math.floor(east*res/width+1e-7));
    const bottom=Math.max(0,Math.floor(south*res/height-1e-7)),top=Math.min(res-1,Math.floor(north*res/height+1e-7));
    for(let j=bottom;j<=top;j++)for(let i=left;i<=right;i++)if(wet[j*res+i])return false;
    return true;
  });
}
function solidPatches(patches,height,bottom){
  const result={vertices:[],faces:[]};for(const poly of patches){const patch=new Surface();patch.polygon(poly,height);append(result,patch.solid(bottom));}
  return {vertices:new Float32Array(result.vertices),faces:new Uint32Array(result.faces)};
}
function terrainSolid(polys,height,bottom,width,heightMM,res,grid){
  return solidPatches(terrainPatches(polys,width,heightMM,res,grid),height,bottom);
}
const INLAND_WATER_DEPTH_MM=.65;
function appendInlandWater(patches,height,water,support){
  const bedHeight=(x,y,z)=>z-INLAND_WATER_DEPTH_MM;
  for(const polygon of patches){
    const surface=new Surface(),bed=new Surface();
    surface.polygon(polygon,height);
    // Build the interface from the water triangles so both materials meet on
    // the same planes, including at clipped stream banks and lake shorelines.
    for(let i=0;i<surface.faces.length;i+=3){
      const triangle=surface.faces.slice(i,i+3).map(index=>{
        const [x,y,z]=surface.vertices.slice(index*3,index*3+3);
        return [x,y,bedHeight(x,y,z)];
      });
      bed.tri(...triangle);
    }
    append(water,surface.solid(bedHeight));
    append(support,bed.solid(()=>0));
  }
}
export function levelBuildingSolid(polys,rise,ground,width,height,res,profile,grid){
  const patches=[...terrainPatches(polys,width,height,res,grid)];let referenceGround=-Infinity;
  // Piecewise-planar terrain can peak inside the footprint, not just at its
  // original outline vertices. Reuse the actual terrain cuts to find its maximum.
  for(const poly of patches)for(const ring of poly)for(const [x,y]of ring)referenceGround=Math.max(referenceGround,ground(x,y));
  const roof=referenceGround+rise,baseOffset=profile?.baseOffsetMM??0;
  if(!Number.isFinite(baseOffset)||baseOffset<0||baseOffset>=rise)throw Error('Cota inferior d’edifici invàlida.');
  const bottom=baseOffset>0?()=>referenceGround+baseOffset:(x,y)=>ground(x,y)-.3;
  if(profile?.parts){
    const result={vertices:[],faces:[]};
    for(const ring of profile.parts){const clipped=intersect(polys,[[ring]]);append(result,solidPatches(terrainPatches(clipped,width,height,res,grid),(x,y)=>roof-profile.heightMM+profile.heightMM*profile.factor(x,y),bottom));}
    return {vertices:new Float32Array(result.vertices),faces:new Uint32Array(result.faces),roof,referenceGround,roofShape:profile.shape};
  }
  return {...solidPatches(patches,()=>roof,bottom),roof,referenceGround};
}
function append(target,mesh){const offset=target.vertices.length/3;for(const v of mesh.vertices)target.vertices.push(v);for(const i of mesh.faces)target.faces.push(i+offset);}
// The official IFC contains surveyed deck TOP surfaces, despite naming its
// open shells IFCCLOSEDSHELL. Preserve those Z values and give each clipped
// surface a documented printable thickness; do not invent engineering piers.
export function deckSurfaceSolid(item,proj,verticalReference,exaggeration,thickness=.6,lift=0){
  const points=projectInfrastructurePath(item.coordinates,proj,verticalReference,exaggeration).map(([x,y,z])=>[x,y,z+lift]);
  if(!Array.isArray(item.faces)||item.faces.length%3||item.faces.some(i=>!Number.isSafeInteger(i)||i<0||i>=points.length)||!Number.isFinite(thickness)||thickness<=0)throw Error('Superfície de pont invàlida.');
  return clippedDeckSlab(points,item.faces,proj,thickness);
}

function clippedDeckSlab(points,faces,proj,thickness){
  const surface=new Surface(),rect=box(proj.width,proj.height);
  for(let i=0;i<faces.length;i+=3){
    const p=faces.slice(i,i+3).map(j=>points[j]);let [a,b,c]=p;
    const det=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(det)<1e-12)continue;
    if(det<0){[b,c]=[c,b];p[1]=b;p[2]=c;}
    if(p.every(([x,y])=>x>=0&&y>=0&&x<=proj.width&&y<=proj.height)){surface.tri(...p);continue;}
    const clipped=intersect([[p.map(v=>v.slice(0,2)).concat([a.slice(0,2)])]],rect);
    const dz=(x,y)=>{const u=((x-a[0])*(c[1]-a[1])-(y-a[1])*(c[0]-a[0]))/Math.abs(det),v=((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/Math.abs(det);return a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]);};
    for(const poly of clipped)surface.polygon(poly,dz);
  }
  return surface.solid((x,y,z)=>z-thickness);
}

function slabTopMesh(mesh){
  const points=Array.from({length:mesh.vertices.length/3},(_,i)=>Array.from(mesh.vertices.slice(i*3,i*3+3)));
  const faces=[];
  for(let i=0;i<mesh.faces.length;i+=3){
    const triangle=mesh.faces.slice(i,i+3),[a,b,c]=Array.from(triangle,id=>points[id]);
    if((b[0]-a[0])*(c[1]-a[1])>(b[1]-a[1])*(c[0]-a[0]))faces.push(...triangle);
  }
  return {points,faces};
}

function clipApproachSlab(mesh,proj,thickness){
  const {points,faces}=slabTopMesh(mesh);
  return clippedDeckSlab(points,faces,proj,thickness);
}
export function treeMesh({x,y,ground,rx,ry,rz,rotation=0,phase=0,crownTaper=0}){
  const surf=new Surface(),rings=6,segments=8,embed=Math.min(.3,rz*.35),z=ground+rz-embed;
  const stretch=alpineCrownHeightFactor(crownTaper);
  const p=(i,j)=>{
    const t=i/rings,v=t*Math.PI,u=j/segments*Math.PI*2;
    const round=Math.sin(v),cone=Math.min(t*1.5,(1-t)*3);
    const radius=round+(cone-round)*crownTaper,w=1+.05*Math.cos(3*u+phase)*radius;
    const dx=rx*radius*Math.cos(u)*w,dy=ry*radius*Math.sin(u)*w;
    const elevation=z+rz*Math.cos(v);
    return [x+dx*Math.cos(rotation)-dy*Math.sin(rotation),y+dx*Math.sin(rotation)+dy*Math.cos(rotation),
      stretch>1&&elevation>ground?ground+(elevation-ground)*stretch:elevation];
  };
  for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){surf.tri(p(i,j),p(i+1,j),p(i+1,j+1));surf.tri(p(i,j),p(i+1,j+1),p(i,j+1));}
  return {vertices:surf.vertices,faces:surf.faces};
}

function validBuildingMesh(model){
  const mesh=auditPart(model);
  return !mesh.empty&&!mesh.errors.length&&mesh.bbox&&Math.abs(mesh.bbox.min[1])<=.001&&Math.abs(mesh.bbox.max[1]-model.height)<=.01;
}

function paddedFootprintBounds(points,margin){
  return {lo:[0,1].map(axis=>Math.min(...points.map(point=>point[axis]))-margin),
    hi:[0,1].map(axis=>Math.max(...points.map(point=>point[axis]))+margin)};
}

function buildingTerrainUnderlays(models,proj){
  // Surface elevation products may already contain a large monument.
  // Blend from the surveyed ground through roughly one coarse DEM sample.
  const margin=30*proj.scale;
  return (models??[]).filter(model=>model.kind==='building'&&Number.isFinite(model.terrainBaseElevation)&&validBuildingMesh(model)).map(model=>{
    const footprint=geoPolys({geometry:model.footprint},proj.project);
    const rings=footprint.flat(),points=rings.flat();
    const {lo,hi}=paddedFootprintBounds(points,margin);
    const edges=rings.flatMap(ring=>ring.slice(1).map(([x,y],i)=>{
      const [ax,ay]=ring[i],dx=x-ax,dy=y-ay;
      return {ax,ay,dx,dy,lengthSquared:dx*dx+dy*dy};
    })).filter(edge=>edge.lengthSquared>0);
    return {id:model.id,elevation:model.terrainBaseElevation,lo,hi,margin,contains:polygonTester(footprint),edges};
  });
}

function buildingTerrainHeight(height,point,underlays){
  const [x,y]=point;
  for(const {elevation,lo,hi,margin,contains,edges} of underlays){
    if(x<lo[0]||x>hi[0]||y<lo[1]||y>hi[1])continue;
    if(contains(point))return elevation;
    let distance=margin;
    for(const {ax,ay,dx,dy,lengthSquared} of edges){
      const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/lengthSquared));
      distance=Math.min(distance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
    }
    const t=1-distance/margin;
    height+=(elevation-height)*t*t*(3-2*t);
  }
  return height;
}

function prepareTerrain(data,options,progress,preview,measure){
  const {size=160,exaggeration=1.5,density=2.5,resolution=36,baseThickness}=options,proj=makeProjection(data.meta.bbox,size,options),{width,height,project,scale}=proj,rect=box(width,height),warnings=[];
  if(!Number.isFinite(density)||density<.25||density>5||!Number.isInteger(resolution)||resolution<2||resolution>100||!Number.isFinite(exaggeration)||exaggeration<1||exaggeration>5||!Number.isFinite(size)||size<50||size>MAX_MODEL_SIDE_MM||width>MAX_MODEL_SIDE_MM||height>MAX_MODEL_SIDE_MM)throw Error('Els ajustos de la maqueta són fora del rang admès.');
  if(options.targetScale!=null&&Math.abs(1000/scale-validateScale(options.targetScale))>options.targetScale*1e-6)throw Error('El retall no concorda amb l’escala demanada. Torna a seleccionar la regió.');
  preview?.stage('terrain','Revisant les mostres d’altitud…');
  const raster=data.localDEM||data.terrainRaster;
  const prepared=raster?{tiles:[],diagnostics:{invalid:0,spikes:0,repaired:0,source:data.meta.terrain?.provider||'local GeoTIFF'}}:prepareElevationTiles(data.dem);
  const rasterHeight=raster?localRasterSampler(raster):null;
  const landforms=data.localDEM?[]:prepareCatalogueLandforms(data.singularModels,proj);
  const underlays=data.localDEM?[]:buildingTerrainUnderlays(data.singularModels,proj);
  const terrainBands=landforms.map(({model,surfaceExtent:{lo,hi}})=>
    ({lo,hi,step:Math.max(Math.min(3,model.landform.minimumWidth/3)*scale,(hi[0]-lo[0])/48,(hi[1]-lo[1])/48)}));
  for(const {lo,hi} of underlays)terrainBands.push({lo,hi,step:Math.max(5*scale,(hi[0]-lo[0])/48,(hi[1]-lo[1])/48)});
  if(!data.localDEM)for(const model of data.singularModels??[]){
    if(model.kind!=='building'||!Number.isFinite(model.anchorElevation)||!validBuildingMesh(model))continue;
    const points=geoPolys({geometry:model.footprint},project).flat(2);
    const {lo,hi}=paddedFootprintBounds(points,6*scale);
    terrainBands.push({lo,hi,step:Math.max(3*scale,(hi[0]-lo[0])/48,(hi[1]-lo[1])/48)});
  }
  const surfaceAt=catalogueTerrain((lon,lat)=>rasterHeight?rasterHeight(lon,lat):sampleHeight(prepared.tiles,lon,lat),landforms);
  const elevationAt=underlays.length?(lon,lat)=>buildingTerrainHeight(surfaceAt(lon,lat),project([lon,lat]),underlays):surfaceAt;
  let terrainGrid=terrainBands.length?focusedTerrainGrid(width,height,resolution,terrainBands):undefined;
  // A coarse slope cell can lie below the surveyed centreline of a tunnel.
  // Refine only corridors where the source still supports the railbed.
  const profiledTunnels=(data.singularModels??[]).filter(model=>model.kind==='railway').flatMap(model=>
    (model.paths??[]).filter(path=>path.structure==='tunnel'&&path.points[0].length===3));
  if(profiledTunnels.length&&Math.max(width,height)/resolution>45*scale){
    const at=(x,y)=>elevationAt(...proj.unproject([x,y]));
    const coarse=createTerrainField({width,height,resolution,grid:terrainGrid,at}).sample;
    let refinements=0;
    for(const {points} of profiledTunnels){
      const axis=points.map(([lon,lat,z])=>[...project([lon,lat]),z]);
      const needsRefinement=(x,y,z)=>x>0&&x<width&&y>0&&y<height&&coarse(x,y)<z+1&&at(x,y)>z+1;
      if(!axis.some((point,i)=>needsRefinement(...point)||(i&&needsRefinement(...point.map((v,j)=>(v+axis[i-1][j])/2)))))continue;
      const {lo,hi}=paddedFootprintBounds(axis,10*scale);
      terrainBands.push({lo,hi,step:Math.max(10*scale,(hi[0]-lo[0])/15,(hi[1]-lo[1])/15)});
      if(++refinements===8)break;
    }
    if(refinements)terrainGrid=focusedTerrainGrid(width,height,resolution,terrainBands);
  }
  if(prepared.diagnostics.repaired)warnings.push(`S’han reconstruït ${prepared.diagnostics.repaired} mostres d’altitud invàlides o pics aïllats a partir dels veïns.`);
  const water=[],ocean=[],stillWater=[],green=[],woods=[],roads=[],transport=[],roadPieces=[];
  const cropped=polys=>polys.map(p=>intersect(p,rect)).filter(p=>p.length);
  for(const feature of data.features){
    const p=feature.properties;
    if(p.sourceLayer!=='water'||options.streams===false&&isFlowingWater(p))continue;
    const entries=geoPolys(feature,project).map(polygon=>[polygon]);
    water.push(...entries);
    if(isMarineWater(p))ocean.push(...entries);
    else if(isStandingWater(p))stillWater.push(...entries);
  }
  const waterways=options.streams!==false?waterwayPolygons(data.features.filter(f=>f.properties?.sourceLayer==='waterway'),project,
    {width,height,scale,multiplier:options.streamWidth}).flatMap(line=>line.map(poly=>[poly])):[];
  const waterPoly=measure('terrain.water',()=>mergeLayer(cropped([...water,...waterways])),{inputs:water.length+waterways.length});
  const containsWater=polygonTester(waterPoly);
  const knownItems=[],knownFootprints=[];
  const deckFootprint=item=>intersect(item.outlines.map(r=>[r.map(project)]),rect);
  const catalogueItems=[];
  for(const model of data.singularModels||[])if(model.kind==='bridge'){
    try{catalogueItems.push(catalogueBridgeItem(model));}
    catch(error){warnings.push(`Pont ${model.id} omès: ${error.message}`);}
  }
  for(const item of [...(data.infrastructure?.items||[]),...catalogueItems]){
    try{
      const footprint=deckFootprint(item);
      if(footprint.length){knownItems.push(item);knownFootprints.push(footprint);}
    }catch(error){warnings.push(`Pont ${item.id} omès: ${error.message}`);}
  }
  const validLine=line=>Array.isArray(line)&&line.length>=2&&line.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
  const overridesLine=(item,id)=>!item.catalogue||item.sourceFeatureIds.includes(String(id));
  const overlapsKnown=(line,id)=>knownItems.length&&validLine(line)&&knownItems.some((item,i)=>
    overridesLine(item,id)&&intersect(lineBuffer(line.map(project),.05,[width,height]),knownFootprints[i]).length);
  const candidates=[],incompleteBridges=new Set(data.incompleteBridgeIds);
  for(const f of [...data.features,...(data.bridgeFeatures||[])])if(f.properties?.sourceLayer==='transportation'&&f.properties.brunnel==='bridge'&&!isInactiveRailway(f.properties)&&!incompleteBridges.has(f.id)&&f.geometry.type.includes('LineString')){
    const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
    for(const line of lines)if(!overlapsKnown(line,f.id))candidates.push({...f,geometry:{type:'LineString',coordinates:line}});
  }
  const bridgeTiles=data.bridgeDem?.length?[...prepared.tiles,...prepareElevationTiles(data.bridgeDem).tiles]:null;
  const bridgeElevation=bridgeTiles?(lon,lat)=>{
    if(data.terrainRaster){
      try{return elevationAt(lon,lat);}catch{/* Use the context DEM beyond the MET5 window. */}
    }
    return sampleHeight(bridgeTiles,lon,lat);
  }:elevationAt;
  preview?.stage('terrain','Identificant els traçats dels ponts…');
  const crossesWater=waterPoly.length?axis=>bridgeCrossesWater(axis.map(project),containsWater):null;
  const generated=generateProceduralBridgeItems(candidates,bridgeElevation,{scale,bbox:data.meta.bbox,trailWidth:options.trailWidth,crossesWater});warnings.push(...generated.warnings);
  const deckItems=knownItems.slice(),deckFootprints=knownFootprints.slice();
  for(const item of generated.items){
    try{
      const footprint=deckFootprint(item);
      if(footprint.length){deckItems.push(item);deckFootprints.push(footprint);}
    }catch(error){warnings.push(`Pont ${item.id} omès: ${error.message}`);}
  }
  const deckMask=merge(deckFootprints);
  const generalDeckMask=catalogueItems.length?merge(deckFootprints.filter((_,i)=>!deckItems[i].catalogue)):deckMask;
  for(const [featureIndex,f]of data.features.entries()){const p=f.properties,layer=p.sourceLayer,polys=layer==='building'||layer==='water'?[]:geoPolys(f,project);
    if(preview&&featureIndex%128===0)preview.stage('terrain','Classificant la cartografia del retall…',featureIndex,data.features.length);
    if((layer==='landcover'&&['wood','grass','scrub'].includes(p.class))||(layer==='landuse'&&['park','forest','grass','cemetery','recreation_ground'].includes(p.class)))green.push(...polys.map(p=>[p]));
    if(['wood','forest','scrub'].includes(p.class))woods.push(...polys.map(p=>[p]));
    if(layer==='transportation'&&!isInactiveRailway(p)&&f.geometry.type.includes('LineString')){
      const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
      const railway=isRailway(p),r=railway?Math.max(.22,railwayWidthMetres(p)*scale/2):roadWidthMM(p,scale,{trailWidth:options.trailWidth})/2;
      for(const line of lines){
        if(!validLine(line)){
          warnings.push(`Via ${f.id??featureIndex} omesa: traçat invàlid.`);
          continue;
        }
        const points=line.map(project);
        const identity=transportIdentity(p,f.id??featureIndex);
        const route={...identity,identity,properties:p,points,class:railway?'rail':p.class,brunnel:p.brunnel,width:r*2,railway};
        if(railway&&p.catalogueRailway&&line[0].length===3)route.elevations=line.map(point=>point[2]);
        transport.push(route);
        if(railway||p.brunnel==='tunnel')continue;
        let buffers;
        try{
          if(p.brunnel==='bridge'&&(overlapsKnown(line,f.id)||intersect(lineBuffer(points,.05,[width,height]),generalDeckMask).length))continue;
          buffers=lineBuffer(points,r,[width,height]);
        }
        catch(error){warnings.push(`Via ${f.id??featureIndex} omesa: ${error.message}`);continue;}
        roads.push(...buffers.map(p=>[p]));
        route.roadPiece=roadPieces.length;
        roadPieces.push({id:f.id??featureIndex,polys:buffers});
      }
    }
  }
  progress('Delimitant costa i capes…');
  const boundedRoads=polys=>polys.map(p=>p.every(poly=>poly.every(ring=>ring.every(([x,y])=>x>=0&&x<=width&&y>=0&&y<=height)))?p:intersect(p,rect)).filter(p=>p.length);
  const land=subtract(rect,waterPoly);
  const roadPoly=measure('terrain.roads',()=>intersect(mergeLayer(boundedRoads(roads)),land),{inputs:roads.length});
  const greenLand=measure('terrain.green-union',()=>intersect(merge(cropped(green)),land),{inputs:green.length});
  const forest=measure('terrain.green-minus-roads',()=>subtract(greenLand,roadPoly));
  const bare=measure('terrain.bare',()=>subtract(subtract(land,roadPoly),forest));
  const oceanPoly=merge(cropped(ocean)),hasOcean=oceanPoly.length>0;
  progress('Calculant el camp d’altures…');
  const field=createTerrainField({width,height,resolution,grid:terrainGrid,at:(x,y)=>{const h=elevationAt(...proj.unproject([x,y]));return hasOcean?Math.max(0,h):h;}});
  let originMeters=Infinity,maximumElevation=-Infinity;
  for(const h of field.values){originMeters=Math.min(originMeters,h);maximumElevation=Math.max(maximumElevation,h);}
  if(hasOcean)originMeters=0;
  const verticalReference=verticalDatum(originMeters,baseThickness,hasOcean);
  for(let i=0;i<field.values.length;i++)field.values[i]=baseThickness+(field.values[i]-originMeters)*scale*exaggeration;
  const ground=field.sample;
  const inland=subtract(waterPoly,oceanPoly),lakes=intersect(inland,mergeLayer(cropped(stillWater)));
  const inlandWater={vertices:[],faces:[]},inlandSupport={vertices:[],faces:[]},lakeLevels=[];
  const flowingWaterAt=(x,y)=>Math.max(baseThickness,ground(x,y)-.3);
  measure('terrain.inland-water',()=>{
    const patches=polys=>terrainPatches(polys,width,height,resolution,terrainGrid);
    appendInlandWater(patches(subtract(inland,lakes)),flowingWaterAt,inlandWater,inlandSupport);
    for(const polygon of lakes){
      const level=Math.max(baseThickness,shorelineLevel(polygon,ground,width,height)-.3);
      appendInlandWater(patches([polygon]),()=>level,inlandWater,inlandSupport);
      let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
      for(const [x,y] of polygon[0]){
        west=Math.min(west,x);east=Math.max(east,x);
        south=Math.min(south,y);north=Math.max(north,y);
      }
      lakeLevels.push({polygon,level,west,south,east,north});
    }
  });
  const containsOcean=polygonTester(oceanPoly);
  const waterAt=(x,y)=>{
    const point=[x,y];
    if(!containsWater(point))return null;
    if(containsOcean(point))return verticalReference.seaLevelMM;
    for(const lake of lakeLevels)if(x>=lake.west&&x<=lake.east&&y>=lake.south&&y<=lake.north){
      lake.contains??=polygonTester([lake.polygon]);
      if(lake.contains(point))return lake.level;
    }
    return flowingWaterAt(x,y);
  };
  const terrain={size,exaggeration,resolution,terrainGrid,proj,rect,warnings,landforms,terrainBases:new Map(underlays.map(({id,elevation})=>[id,elevation])),
    useCatalogueAnchors:!data.localDEM,elevationAt:data.terrainRaster?bridgeElevation:elevationAt,cropToElevationWindow:!!data.terrainRaster,deckItems,deckMask,transport,roadPieces,maximumElevation,waterAt,
    roadPoly,forest,bare,waterPoly,land,oceanPoly,inlandSupport:surfacePart(0,inlandSupport),green,cropped,ground,verticalReference,diagnostics:prepared.diagnostics,
    woodsMask:measure('terrain.woods',()=>merge(cropped(woods)),{inputs:woods.length})};
  terrain.surfaces=measure('terrain.surfaces',()=>terrainCover(forest,bare,terrain,progress));
  const sea=new Surface();
  for(const polygon of oceanPoly)sea.polygon(polygon,()=>verticalReference.seaLevelMM);
  terrain.surfaces[1]=surfacePart(1,sea.solid(()=>0));
  terrain.surfaces[7]=surfacePart(7,inlandWater);
  return terrain;
}

function terrainCover(forest,bare,terrain,progress){
  const {ground,land,inlandSupport,woodsMask,proj:{width,height},resolution,terrainGrid}=terrain;
  const base={vertices:[],faces:[]};
  progress('Construint superfícies amb límits vectorials…');
  append(base,terrainSolid(land,(x,y)=>ground(x,y)-.65,()=>0,width,height,resolution,terrainGrid));
  append(base,terrainSolid(bare,ground,(x,y)=>ground(x,y)-.65,width,height,resolution,terrainGrid));
  append(base,inlandSupport);
  const forestGround=intersect(forest,woodsMask),grassGround=subtract(forest,forestGround);
  const parts=CATEGORIES.map((_,index)=>surfacePart(index,{vertices:[],faces:[]}));
  parts[0]=surfacePart(0,base);
  parts[4]=roadSurface(4,forestGround,0,terrain);
  parts[6]=roadSurface(6,grassGround,0,terrain);
  return parts;
}

function surfacePart(index,{vertices,faces}){
  return {...CATEGORIES[index],
    vertices:vertices instanceof Float32Array?vertices:new Float32Array(vertices),
    faces:faces instanceof Uint32Array?faces:new Uint32Array(faces)};
}

function roadSurface(index,polygons,rise,terrain){
  const {ground,proj:{width,height},resolution,terrainGrid}=terrain;
  return surfacePart(index,terrainSolid(polygons,(x,y)=>ground(x,y)+rise,(x,y)=>ground(x,y)-.65,width,height,resolution,terrainGrid));
}

function buildSurfaceCorridors(land,rise,index,axes,sectionsFor,protectedMask=[]){
  const part={vertices:[],faces:[]},support={vertices:[],faces:[]};
  const accepted=[],omissions=[],byId=new Map();
  for(const axis of axes){
    try{
      const sections=sectionsFor(axis,accepted);
      let patches=corridorPatches(sections);
      const shape=mergeLayer(patches.map(p=>[p.polygon]));
      if(patches.reduce((sum,p)=>sum+area(p.polygon[0]),0)-footprintArea(shape)>1e-5){
        if(index!==3)throw Error('El traçat se solapa amb ell mateix.');
        let used=[];
        patches=patches.flatMap(({polygon,top})=>{
          const visible=subtract([polygon],used);
          used=mergeLayer([used,[polygon]].filter(mask=>mask.length));
          return visible.map(polygon=>({polygon,top}));
        });
      }
      const extent=meshFootprintBounds(shape);
      const occupied=accepted.filter(route=>extent.every((value,i)=>i<2?value<=route.extent[i+2]:value>=route.extent[i-2]));
      const avoid=mergeLayer([protectedMask,...occupied.map(route=>route.mask),...(axis.anchors??[]).flatMap(anchor=>anchor?[anchor.mask]:[])].filter(mask=>mask.length));
      const mask=subtract(intersect(shape,land),avoid);
      if(!mask.length)continue;
      const clipped=footprintArea(shape)-footprintArea(mask)>1e-8;
      const platform=new Surface(),foundation=new Surface(),thickness=.65+rise;
      const visible=clipped?patches.flatMap(({polygon,top})=>intersect([polygon],mask).map(polygon=>({polygon,top}))):patches;
      for(const {polygon,top} of visible){platform.polygon(polygon,top);foundation.polygon(polygon,(x,y)=>top(x,y)-thickness);}
      const points=[],faces=platform.faces.slice();
      for(let i=0;i<platform.vertices.length;i+=3)points.push(platform.vertices.slice(i,i+3));
      const floor=(x,y,z)=>z-thickness;
      let pavement=platform.solid(floor),base=foundation.solid(()=>0);
      let errors=[...auditPart(pavement).errors,...auditPart(base).errors];
      if(errors.length&&(index===3||axis.points[0].length===3)){
        // Cropped seams can meet at a T after rounding. Use the same closed
        // prisms as the terrain, keeping the planned height at every vertex.
        const prisms={vertices:[],faces:[]},supports={vertices:[],faces:[]};
        for(let i=0;i<faces.length;i+=3){
          const row=faces.slice(i,i+3).map(id=>points[id]);
          const strip=new Surface(),fill=new Surface();
          strip.tri(...row);fill.tri(...row.map(([x,y,z])=>[x,y,floor(x,y,z)]));
          append(prisms,strip.solid(floor));append(supports,fill.solid(()=>0));
        }
        [pavement,base]=removeCollapsedSurfaceComponents([surfacePart(index,prisms),surfacePart(0,supports)],{floatRoundoff:true}).parts;
        errors=[...auditPart(pavement).errors,...auditPart(base).errors];
      }
      if(!pavement.faces.length||errors.length)throw Error(errors[0]??'El paviment no forma una malla tancada.');
      append(part,pavement);append(support,base);
      const route={axis,sections,mask,extent,points,faces,top:topSampler(points,faces)};
      accepted.push(route);
      for(const id of axis.sourceFeatureIds.map(String)){
        if(!byId.has(id))byId.set(id,[]);
        byId.get(id).push(route);
      }
    }catch(error){omissions.push({sourceFeatureIds:axis.sourceFeatureIds,reason:error.message});}
  }
  return {part:surfacePart(index,part),support,mask:mergeLayer(accepted.map(route=>route.mask)),count:accepted.length,omissions,byId,accepted};
}

function meshFootprintBounds(polygons){
  const bounds=[Infinity,Infinity,-Infinity,-Infinity];
  for(const [ring] of polygons)for(const [x,y] of ring){
    bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);
    bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);
  }
  return bounds;
}

function buildSurfaceRoadPilot(terrain,rise,api,progress,{crossingFallback=false}={}){
  const roads=crossingFallback?terrain.transport.map(road=>({...road,gradeWindow:Math.max(6,30*terrain.proj.scale)})):terrain.transport;
  const overpass=roads.some(road=>road.brunnel==='bridge');
  const underground=roads.some(road=>road.brunnel==='tunnel');
  if(!roads.length||roads.length>(underground?3:8)||roads.some(road=>road.railway)||
      overpass&&underground||!overpass&&terrain.deckItems.length)
    throw Error('La xarxa supera els límits del pilot de paviment.');
  const plan=planSurfaceRoad(roads,terrain,rise,.65+rise,{crossingFallback});
  if(plan.crossing)return assembleSupportedRoadPlan(terrain,rise,api,progress,plan,[],'crossing-coupon');
  return assembleSurfaceRoads(terrain,rise,api,progress,plan);
}

function* surfaceRoadPatches(route,terrain,rise){
  const {transitionMM,edgeEnds=[false,false]}=route;
  const {ground,proj:{width,height},resolution,terrainGrid}=terrain;
  const length=route.profile.stations.at(-1).distanceMM;
  const [startBlend,endBlend]=edgeEnds.map(atEdge=>atEdge?0:transitionMM);
  for(const patch of route.patches){
    if(!transitionMM||patch.startMM>=startBlend&&patch.endMM<=length-endBlend){
      yield patch;
      continue;
    }
    const top=(x,y)=>{
      const station=patch.stationAt(x,y);
      const t=Math.max(0,Math.min(1,startBlend?station/startBlend:1,endBlend?(length-station)/endBlend:1));
      const legacy=ground(x,y)+rise;
      return legacy+t*t*(3-2*t)*(patch.top(x,y)-legacy);
    };
    // At the ends the new pavement meets the actual terrain triangles, so
    // include their breakpoints before replacing part of the old road.
    for(const polygon of terrainPatches([patch.polygon],width,height,resolution,terrainGrid))
      yield {...patch,polygon,top};
  }
}

function regionalPavement(terrain,rise,api,routes){
  const thickness=.65+rise;
  const pavements=routes.map(route=>{
    const surface=new Surface();
    for(const {polygon,top} of surfaceRoadPatches(route,terrain,rise))surface.polygon(polygon,top);
    return surfacePart(3,surface.solid((x,y,z)=>z-thickness));
  });
  const [road]=removeCollapsedSurfaceComponents(uniteMaterials({parts:pavements},api).parts).parts;
  if(!road.faces.length)throw Error('El retall no té una superfície de paviment imprimible.');

  // The terrain outside the road and the new road occupy disjoint footprints.
  // Use the actual underside of the road as the top of its foundation.
  const foundation=new Surface();
  for(let i=0;i<road.faces.length;i+=3){
    const [a,b,c]=Array.from(road.faces.subarray(i,i+3),id=>Array.from(road.vertices.subarray(3*id,3*id+3)));
    if((b[0]-a[0])*(c[1]-a[1])<(b[1]-a[1])*(c[0]-a[0]))foundation.tri(c,b,a);
  }
  const topIndexCount=foundation.faces.length;
  if(!topIndexCount)throw Error('Falta el suport sota el paviment.');
  let support=foundation.solid(()=>0);
  if(auditPart(support).errors.length){
    // Two very close underside vertices may snap to the same point at z=0.
    // In that case keep their prisms separate, as for the terrain cells.
    const pieces={vertices:[],faces:[]};
    for(let i=0;i<topIndexCount;i+=3){
      const triangle=foundation.faces.slice(i,i+3).map(id=>foundation.vertices.slice(id*3,id*3+3));
      const prism=new Surface();
      prism.tri(...triangle);
      append(pieces,prism.solid(()=>0));
    }
    [support]=removeCollapsedSurfaceComponents([surfacePart(0,pieces)],{floatRoundoff:true}).parts;
    if(!support.faces.length||auditPart(support).errors.length)throw Error('El suport sota el paviment no forma una malla tancada.');
  }
  return {road,support};
}

function assembleRegionalSurfaceRoads(terrain,rise,api,progress,{regions,metadata},originalRoadPoly,railPoly){
  const accepted=[],roads={vertices:[],faces:[]},base={vertices:[],faces:[]};
  progress('Encaixant el paviment amb el relleu…');
  for(const region of regions){
    try{
      const {road,support}=regionalPavement(terrain,rise,api,region.routes);
      append(roads,road);
      append(base,support);
      accepted.push(region);
    }catch(error){
      const {sourceFeatureIds}=region.info,reason='mesh-rejected',count=sourceFeatureIds.length;
      metadata.omissionCounts[reason]=(metadata.omissionCounts[reason]||0)+count;
      if(metadata.omissions.length<64)metadata.omissions.push({reason,sourceFeatureIds,detail:error.message,count});
    }
  }
  if(!accepted.length)return null;
  const mask=merge(accepted.map(region=>region.mask));
  const replaced=merge(accepted.filter(region=>!region.partial).map(region=>region.replaces));
  const retained=subtract(originalRoadPoly,replaced);
  const legacyRoadPoly=subtract(retained,mask);
  // Union from the original footprints before the pavement cut introduces
  // coincident boundaries between the two road meshes.
  const roadPoly=merge([retained,railPoly,mask].filter(p=>p.length));
  const land=subtract(terrain.land,mask);
  const uncovered=subtract(terrain.land,roadPoly),greenMask=merge(terrain.cropped(terrain.green));
  const forest=intersect(uncovered,greenMask),bare=subtract(uncovered,greenMask);
  const parts=terrainCover(forest,bare,{...terrain,land},progress);
  for(const index of [1,7])parts[index]=terrain.surfaces[index];
  append(base,parts[0]);
  [parts[0]]=removeCollapsedSurfaceComponents([surfacePart(0,base)],{floatRoundoff:true}).parts;
  append(roads,roadSurface(3,legacyRoadPoly,rise,terrain));
  parts[3]=surfacePart(3,roads);
  metadata.groups=accepted.filter(region=>!region.partial).map(region=>region.info);
  metadata.partialGroups=accepted.filter(region=>region.partial).map(region=>region.info);
  metadata.stations=accepted.reduce((sum,region)=>sum+region.info.stations,0);
  metadata.junctionCount=metadata.groups.reduce((sum,group)=>sum+group.junctions,0);
  metadata.fullAccepted=metadata.groups.reduce((sum,group)=>sum+group.fragments,0);
  metadata.partialAccepted=new Set(metadata.partialGroups.map(group=>group.sourcePiece)).size;
  metadata.partialLengthMM=metadata.partialGroups.reduce((sum,group)=>sum+group.lengthMM,0);
  metadata.accepted=metadata.fullAccepted+metadata.partialAccepted;
  metadata.applied=true;
  const originalMM2=footprintArea(originalRoadPoly),legacyMM2=footprintArea(legacyRoadPoly);
  metadata.coverage={originalMM2,legacyMM2,replacedPercent:originalMM2>0?100*(1-legacyMM2/originalMM2):0};
  return {parts,forest,mask,legacyRoadPoly,roadPoly};
}

function buildClassifiedRoadCoupon(terrain,rise,api,progress){
  const {plan,trailMask}=planClassifiedRoadCoupon(terrain,rise,.65+rise);
  return assembleSupportedRoadPlan(terrain,rise,api,progress,plan,trailMask,'classified-coupon');
}

function assembleSupportedRoadPlan(terrain,rise,api,progress,plan,trailMask,mode){
  const profiles=plan.routes.map(route=>route.profile),sourceFeatureIds=profiles.flatMap(profile=>profile.featureIds);
  const metadata={omissionCounts:{},omissions:[]};
  const info={sourceFeatureIds,fragments:sourceFeatureIds.length,junctions:plan.junctionCount,
    stations:profiles.reduce((sum,profile)=>sum+profile.stations.length,0)};
  const coupon=assembleRegionalSurfaceRoads(terrain,rise,api,progress,
    {metadata,regions:[{mask:plan.mask,replaces:[],routes:plan.routes,info}]},trailMask,[]);
  if(!coupon)throw Error(metadata.omissions[0]?.detail??'El paviment del cupó no s’ha pogut construir.');
  return {...coupon,metadata:{mode,applied:true,profiles,junctionCount:plan.junctionCount,crossing:plan.crossing}};
}

function assembleSurfaceRoads(terrain,rise,api,progress,plan){
  const {mask,fillMask,routes,junctionCount,structure,tunnel,crossing}=plan,thickness=.65+rise;
  let sharedPavement;
  const cutters=[];
  const {originMeters,minimumSurfaceMM}=terrain.verticalReference;
  const terrainTop=minimumSurfaceMM+(terrain.maximumElevation-originMeters)*terrain.proj.scale*terrain.exaggeration;
  const ceiling=Math.max(terrainTop,...routes.flatMap(r=>r.profile.stations.map(s=>s.heightMM)))+2;
  const corridorParts=routes.flatMap(route=>{
    const pavement=new Surface(),fill=new Surface(),cutter=tunnel?null:new Surface();
    for(const {polygon,top,structural} of surfaceRoadPatches(route,terrain,rise)){
      pavement.polygon(polygon,top);
      if(!structural)fill.polygon(polygon,tunnel?(x,y)=>top(x,y)-thickness:top);
      cutter?.polygon(polygon,()=>ceiling);
    }
    const points=Array.from({length:pavement.vertices.length/3},(_,i)=>pavement.vertices.slice(i*3,i*3+3));
    const pavementTop=topSampler(points,pavement.faces);
    if(tunnel)sharedPavement={top:pavementTop,exposed:polygonTester(fillMask),thicknessMM:thickness};
    else cutters.push({mask:route.mask,mesh:cutter.solid((x,y)=>{
      const top=pavementTop(x,y);
      if(top===null)throw Error('Falta una cota de calçada per encaixar el paviment.');
      return top-thickness;
    })});
    return [surfacePart(0,fill.solid(()=>0)),surfacePart(3,pavement.solid((x,y,z)=>z-thickness))];
  });
  const land=subtract(terrain.land,fillMask);
  const forest=intersect(merge(terrain.cropped(terrain.green)),land);
  const bare=subtract(land,forest);
  const parts=terrainCover(forest,bare,{...terrain,land},progress);
  const united=uniteMaterials({parts:corridorParts.filter(p=>p.id==='roads')},api);
  const [road]=removeCollapsedSurfaceComponents(united.parts).parts;
  if(!road.faces.length)throw Error('El cupó no té una superfície de paviment imprimible.');
  for(const index of [1,7])parts[index]=terrain.surfaces[index];
  const terrainParts=[parts[0],...corridorParts.filter(p=>p.id==='terrain')];
  if(cutters.length){
    progress('Encaixant el paviment amb el relleu…');
    const cleared=subtractVoids({parts:[...terrainParts,parts[4],parts[6]]},cutters.map(c=>c.mesh),api);
    for(const index of [0,4,6])parts[index]=cleared.parts.find(p=>p.id===parts[index].id);
  }else [parts[0]]=uniteMaterials({parts:terrainParts},api).parts;
  parts[0]=removeCollapsedSurfaceComponents([parts[0]],{floatRoundoff:true}).parts[0];
  if(cutters.length){
    // Remove any local overlap left by triangulating the terrain and road
    // separately, using the exact pavement solid that will be exported.
    const separated=subtractVoids({parts:[parts[0],parts[4],parts[6]]},[road],api);
    const cleaned=removeCollapsedSurfaceComponents(separated.parts,{floatRoundoff:true}).parts;
    for(const index of [0,4,6])parts[index]=cleaned.find(p=>p.id===parts[index].id);
  }
  parts[3]=road;
  const featureIds=terrain.transport.flatMap(route=>route.sourceFeatureIds);
  return {parts,mask,forest,sharedPavement,metadata:{applied:true,featureId:featureIds[0],featureIds,junctionCount,widthMM:terrain.transport[0].width,
    pavementThicknessMM:thickness,profiles:routes.map(route=>route.profile),...(structure?{bridge:structure}:{}),
    ...(tunnel?{tunnel}:{}),...(crossing?{crossing}:{})}};
}

export function buildModel(data,options={},progress=()=>{},infrastructureApi=null,diagnostics=null,preview){
  options={...options,baseThickness:modelBaseThickness(options.baseThickness)};
  if(options.pureRelief)return buildPureRelief(data,options,progress,preview,infrastructureApi);
  preview?.stage('terrain','Preparant el relleu…');
  data=applyCatalogueRailways(data);
  const terrain=prepareTerrain(data,options,progress,preview,phaseTimer(diagnostics));
  preview?.parts('terrain',terrain.surfaces,terrain.proj);
  return buildTransport(data,options,terrain,progress,infrastructureApi,diagnostics,undefined,undefined,preview);
}

function buildPureRelief(data,options,progress,preview,api){
  const {size=160,exaggeration=1.5,resolution=56,baseThickness}=options;
  const proj=makeProjection(data.meta.bbox,size,options),{width,height,scale,project,unproject}=proj;
  const panoramic=isPanoramicSize(width,height);
  const [minimum,maximum]=panoramic?PANORAMIC_SCALE_RANGE:PURE_SCALE_RANGE;
  if(![width,height,exaggeration].every(Number.isFinite)||Math.min(width,height)<=0||
      (panoramic?!validPieceDimensions(width,height):Math.max(width,height)>MAX_MODEL_SIDE_MM)||exaggeration<1||exaggeration>5||
      !Number.isInteger(resolution)||resolution<2||resolution>PURE_RELIEF_RESOLUTIONS[56]||1000/scale<minimum-.1||1000/scale>maximum+1)
    throw Error(panoramic?'El format panoràmic admet escales d’1:50.000 a 1:500.000 i fins a 100 × 20 cm.':'El mode Relleu pur admet escales d’1:10.000 a 1:500.000.');
  const {columns,rows}=reliefGridSize(width,height,resolution,panoramic),stride=columns+1;
  preview?.stage('terrain','Revisant les mostres d’altitud…');
  const prepared=data.terrainRaster?{diagnostics:{invalid:0,spikes:0,repaired:0,source:data.meta.terrain?.provider}}:prepareElevationTiles(data.dem);
  const landforms=prepareCatalogueLandforms(data.singularModels,proj)
    .filter(patch=>resolvableLandform(patch,Math.max(width/columns,height/rows)/scale));
  const sample=catalogueTerrain(data.terrainRaster?localRasterSampler(data.terrainRaster):createElevationSampler(prepared.tiles),landforms);
  let oceanPolygons=(data.oceans||[]).flatMap(feature=>geoPolys(feature,project));
  if(oceanPolygons.length){
    progress('Delimitant la costa cartografiada…');
    // Remove vector tile boundaries before measuring the distance to the shore.
    try{oceanPolygons=mergeLayer(oceanPolygons.map(polygon=>[polygon]));}
    catch{/* Preserve the available footprints if a fragment prevents the union. */}
  }
  const ocean=sampleReliefMask(oceanPolygons,width,height,columns,rows);
  const oceanWeights=ocean?.cells?ocean.weights:null;
  progress('Calculant el camp d’altures…');
  const gridPoint=(x,y)=>[x*width/columns,y*height/rows];
  const heightAt=point=>{
    const z=sample(...unproject(point));
    return oceanWeights?Math.max(0,z):z;
  };
  const metres=new Float64Array(stride*(rows+1));
  for(let row=0;row<=rows;row++){
    for(let col=0;col<=columns;col++){
      const index=row*stride+col;
      metres[index]=oceanWeights?.[index]>0?0:heightAt(gridPoint(col,row));
    }
    if(row%32===31||row===rows)preview?.stage('terrain','Calculant el camp d’altures…',row+1,rows+1);
  }
  const lakes=data.lakes?.length?levelReliefLakes(data.lakes,project,metres,columns,width,height,rows):null;
  let originMeters=0;
  if(oceanWeights){
    if(lakes?.count)for(let i=0;i<metres.length;i++)if(oceanWeights[i]>0)metres[i]=0;
  }else{
    originMeters=Infinity;
    for(const z of metres)originMeters=Math.min(originMeters,z);
  }
  progress('Ajustant la malla al relleu…');
  const diagonals=reliefDiagonals(metres,columns,(col,row)=>{
    const point=gridPoint(col+.5,row+.5);
    return oceanWeights&&ocean.contains(point)?0:heightAt(point);
  },rows);
  const reliefGrid=scaleReliefGrid({resolution:columns,rows,width,height,diagonals,originMeters,oceanWeights},metres,scale,exaggeration,baseThickness);
  if(preview){
    progress('Preparant la vista per peces…');
    previewReliefPieces(reliefGrid,(parts,piece)=>{
      preview.parts('terrain',parts,{width,height},piece.index===1?'replace':'append',piece);
      preview.stage('terrain','Previsualització del relleu per peces',piece.index,piece.total);
    });
  }
  const cells=[0,0],sourceCoverage=data.coverage||[];
  const coverage=printableReliefCoverage(sourceCoverage,project);
  const scores=coverage.length?new Float32Array(metres.length*3):null;
  progress('Traçant els contorns de sòl nu i neu o gel…');
  if(scores){
    for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
      const [lon,lat]=unproject([col*width/columns,row*height/rows]);
      sampleCoverage(coverage,lon,lat,scores,(row*stride+col)*3);
    }
    const centre=new Float32Array(3);
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const [lon,lat]=unproject([(col+.5)*width/columns,(row+.5)*height/rows]);
      centre.fill(0);sampleCoverage(coverage,lon,lat,centre,0);
      if(centre[1]>centre[0]&&centre[1]>centre[2])cells[0]++;
      else if(centre[2]>centre[0])cells[1]++;
    }
  }
  const waterAreas=(data.waterAreas||[]).map(feature=>geoPolys(feature,project));
  const shoreAndLakes=[...oceanPolygons,...(data.lakes||[]).flatMap(feature=>geoPolys(feature,project))];
  const streams=options.streams!==false,streamWidth=options.streamWidth??1;
  const context=prepareReliefWaterways({scale,metres,project,waterways:data.waterways||[],waterAreas,shoreAndLakes},reliefGrid,streamWidth);
  const water=reliefHydrology(reliefGrid,context,streams,progress);
  let forestPolygons=(data.forests||[]).flatMap(feature=>geoPolys(feature,project));
  if(forestPolygons.length>1){
    // Tile fragments can overlap. Feather the forest outline, not each fragment.
    try{forestPolygons=mergeLayer(forestPolygons.map(polygon=>[polygon]));}
    catch{/* Preserve coverage when an invalid fragment prevents the union. */}
  }
  const forest=sampleReliefMask(forestPolygons,width,height,columns,rows);
  Object.assign(reliefGrid,{scores,lakeWeights:lakes?.count?lakes.weights:null,
    forestWeights:forest?.cells?forest.weights:null,streamStrips:water.streamStrips});
  const verticalReference=verticalDatum(originMeters,baseThickness,!!oceanWeights);
  const provenance={...data.meta,options:{...options,pureRelief:true,exaggeration,streams,streamWidth,trees:options.trees!==false},verticalExaggeration:exaggeration,verticalReference,
    units:'millimeters',reliefSampling:{columns,rows,stepMM:[width/columns,height/rows]},
    coverageCells:{bare:cells[0],snow:cells[1],total:columns*rows},lakeCount:lakes?.count??0,
    streamCount:water.streamCount,flowingWaterAreaCount:water.flowingWaterAreaCount,forestSamples:forest?.cells??0};
  const warnings=[...(data.meta.sourceWarnings||[])];
  if(coverage.length<sourceCoverage.length)
    warnings.push('S’ha omès la coberta regional perquè els píxels són massa grans per a l’escala de la maqueta.');
  return renderPureRelief({width,height,scale:Math.round(1000/scale),buildingCount:0,reliefGrid,
    warnings,elevationDiagnostics:prepared.diagnostics,provenance},{...context,landforms,api,sourceWarnings:warnings},progress,preview);
}

function scaleReliefGrid(grid,metres,scale,exaggeration,baseThickness){
  const {originMeters,oceanWeights}=grid;
  const heights=metres.map(z=>baseThickness+(z-originMeters)*scale*exaggeration);
  const seaLevelMM=oceanWeights?baseThickness:null;
  return {...grid,heights,seaLevelMM,exaggeration};
}

function prepareReliefWaterways(context,{width,height},streamWidth){
  const {scale,project,waterways,waterAreas,shoreAndLakes}=context;
  const paths=waterwayPolygons(waterways,project,{width,height,scale,multiplier:streamWidth});
  const waterPolygons=[...shoreAndLakes,...paths.flat(),...waterAreas.flat()];
  return {...context,paths,waterPolygons,waterMask:undefined};
}

function reliefHydrology({width,height,resolution},{paths,waterAreas},streams,progress){
  if(streams&&(paths.length||waterAreas.length))progress('Traçant els rius i rierols…');
  return {streamStrips:streams?reliefStreamStrips([...paths,...waterAreas],width,height,resolution):null,
    streamCount:streams?paths.length:0,flowingWaterAreaCount:streams?waterAreas.length:0};
}

function renderPureRelief(model,context,progress,preview,texture){
  const {width,height,reliefGrid}=model;
  const bareGrid={...reliefGrid,streamStrips:null,vegetationTexture:null};
  const panoramic=isPanoramicSize(width,height);
  progress('Construint el sòlid del relleu…');
  const ground=panoramic?assemblePanoramicRelief(bareGrid,(completed,total)=>{
    preview?.stage('terrain','Acabant el relleu i les capes de cada peça',completed,total);
  }):reliefParts(bareGrid);
  const lakePart=ground.find(part=>part.id==='inland-water');
  let categories=replaceReliefWater(ground,reliefInlandWater(reliefGrid,lakePart,panoramic));
  if(context.landforms.length){
    const cut=carveCatalogueLandforms(categories,context.landforms,context.api,model.provenance.verticalReference,context.scale*reliefGrid.exaggeration);
    categories=cut.parts;
    model={...model,warnings:[...context.sourceWarnings,...landformWarnings(cut)],
      provenance:{...model.provenance,catalogueLandforms:cut.applied,catalogueLandformOmissions:cut.skipped}};
  }
  const activeLandforms=context.landforms.filter(({model:source})=>model.provenance.catalogueLandforms?.some(entry=>entry.id===source.id));
  return finishReliefVegetation({...model,categories},{...context,lakePart,activeLandforms},texture);
}

function replaceReliefWater(categories,water){
  const next=categories.filter(part=>part.id!=='inland-water');
  if(water){
    const index=next.findIndex(part=>['forest','water','trees'].includes(part.id));
    next.splice(index<0?next.length:index,0,water);
  }
  return next;
}

export function updatePureRelief(previous,changes={},progress=()=>{}){
  const context=previous?.reliefVegetationContext;
  if(!context)throw Error('Cal generar primer el relleu.');
  const before=previous.provenance.options;
  const {exaggeration=before.exaggeration,streams=before.streams,streamWidth=before.streamWidth}=changes;
  const baseThickness=modelBaseThickness(changes.baseThickness===undefined?before.baseThickness:changes.baseThickness);
  if(!Number.isFinite(exaggeration)||exaggeration<1||exaggeration>5||typeof streams!=='boolean'||
      (streamWidth!==0&&(!Number.isFinite(streamWidth)||streamWidth<1||streamWidth>3)))throw Error('Els ajustos de relleu queden fora del rang admès.');
  const vertical=exaggeration!==before.exaggeration||baseThickness!==before.baseThickness,wide=streamWidth!==before.streamWidth;
  if(!vertical&&!wide&&streams===before.streams)return previous;
  const grid=previous.reliefGrid;
  const nextContext=wide?prepareReliefWaterways(context,grid,streamWidth):context;
  const water=wide||streams!==before.streams?reliefHydrology(grid,nextContext,streams,progress):null;
  const reliefGrid=vertical?scaleReliefGrid(grid,context.metres,context.scale,exaggeration,baseThickness):{...grid};
  if(water)reliefGrid.streamStrips=water.streamStrips;
  const provenance={...previous.provenance,options:{...before,exaggeration,streams,streamWidth,baseThickness},verticalExaggeration:exaggeration,
    verticalReference:verticalDatum(reliefGrid.originMeters,baseThickness,!!reliefGrid.oceanWeights),
    streamCount:water?.streamCount??previous.provenance.streamCount,
    flowingWaterAreaCount:water?.flowingWaterAreaCount??previous.provenance.flowingWaterAreaCount};
  const next={...previous,reliefGrid,provenance};
  if(vertical)return renderPureRelief(next,nextContext,progress,undefined,wide?undefined:grid.vegetationTexture);
  const waterPart=reliefInlandWater(reliefGrid,context.lakePart,isPanoramicSize(grid.width,grid.height));
  const carvedWater=waterPart&&context.activeLandforms.length?carveCatalogueLandforms([waterPart],context.activeLandforms,context.api,
    provenance.verticalReference,context.scale*exaggeration).parts[0]:waterPart;
  const categories=replaceReliefWater(previous.categories,carvedWater);
  if(wide)return finishReliefVegetation({...next,categories:categories.filter(part=>part.id!=='trees')},nextContext);
  return finalizePureRelief({...next,categories},nextContext);
}

function finishReliefVegetation(model,context,vegetationTexture=reliefVegetationTexture(model.reliefGrid,context,model.provenance.options)){
  const {provenance}=model;
  const reliefGrid={...model.reliefGrid,vegetationTexture};
  const part=reliefTreesPart(reliefGrid);
  const categories=part?[...model.categories,part]:model.categories;
  const treeRepresentation={manualStyle:'texture',areaMM2:part?.areaMM2??0,
    heightRangeMM:vegetationTexture?.heightRangeMM??reliefVegetationHeightRange(context.scale,provenance.options)};
  return finalizePureRelief({...model,reliefGrid,categories,provenance:{...provenance,treeRepresentation}},context);
}

function finalizePureRelief(model,context){
  const next=groupMaterials({...model,treeCount:0,triangles:model.categories.reduce((n,p)=>n+p.faces.length/3,0)});
  Object.defineProperty(next,'reliefVegetationContext',{value:context});
  return next;
}

export function updateTransport(previous,changes={},progress=()=>{},infrastructureApi=previous.context?.infrastructureApi){
  const ctx=previous.context;
  if(!ctx?.terrain)throw Error('Cal generar primer el terreny.');
  const {roadRise=ctx.options.roadRise,railRise=ctx.options.railRise,estimatedTunnels=ctx.options.estimatedTunnels,majorRoads=ctx.options.majorRoads}=changes;
  const options={...ctx.options,roadRise,railRise,estimatedTunnels,majorRoads};
  return buildTransport({...ctx.transportSource,meta:ctx.meta},options,ctx.terrain,progress,infrastructureApi,null,ctx.buildingGeometry);
}

function phaseTimer(diagnostics){
  // Optional synchronous diagnostics stay out of worker options/provenance.
  return (phase,run,details={})=>{
    if(!diagnostics)return run();
    const start=performance.now();diagnostics({phase,event:'start',...details});
    try{return run();}finally{diagnostics({phase,event:'end',milliseconds:performance.now()-start,...details});}
  };
}

function buildTransport(data,options,terrain,progress,infrastructureApi,diagnostics,buildingGeometry,excludedProfiles=new Map(),preview,recoveryPass=0){
  preview?.stage('transport','Calculant les vies…');
  const measure=phaseTimer(diagnostics);
  const {size,exaggeration,resolution,terrainGrid,proj,rect,elevationAt,transport,roadPieces,waterPoly,land,green,cropped,ground,verticalReference}=terrain;
  const {width,height,project,scale}=proj,{originMeters,minimumSurfaceMM}=verticalReference;
  const warnings=terrain.warnings.slice(),deckItems=terrain.deckItems.slice();
  let {deckMask,forest,bare}=terrain;
  let containsDeck=polygonTester(deckMask);
  const mappedDeckMask=deckMask;
  const roadRise=options.roadRise??0;
  if(![0,.5,1].includes(roadRise))throw Error('Relleu dels camins invàlid.');
  const {railRise}=railwayOptions(options);
  const railwayRise=roadRise+railRise;
  const rail=measure('transport.railways',()=>buildSurfaceCorridors(land,railwayRise,8,surfaceRailAxes(transport,width,height),
    axis=>railwaySections(axis,ground,exaggeration,minimumSurfaceMM,railwayRise,
      elevation=>minimumSurfaceMM+(elevation-originMeters)*scale*exaggeration))),railPoly=rail.mask;
  const roadOnlySource=subtract(terrain.roadPoly,railPoly);
  const sourceRoadPoly=railPoly.length?merge([roadOnlySource,railPoly].filter(p=>p.length)):terrain.roadPoly;
  let cutTerrain=railPoly.length?{...terrain,land:subtract(land,railPoly)}:terrain;
  let roadOnlyPoly=roadOnlySource,roadPoly=sourceRoadPoly;
  if(railPoly.length){forest=subtract(forest,railPoly);bare=subtract(bare,railPoly);}
  warnings.push(...rail.omissions.map(({sourceFeatureIds,reason})=>`Via ferroviària ${sourceFeatureIds.join(', ')} omesa: ${reason}`));
  let surfaceRoad=options.surfaceRoads===true?buildSurfaceRoadPilot(terrain,roadRise,infrastructureApi,progress):null;
  if(options.surfaceRoads==='crossing-coupon')surfaceRoad=buildSurfaceRoadPilot(terrain,roadRise,infrastructureApi,progress,{crossingFallback:true});
  if(options.surfaceRoads==='classified-coupon')surfaceRoad=buildClassifiedRoadCoupon(terrain,roadRise,infrastructureApi,progress);
  let regionalMetadata;
  if(surfaceRoad){
    roadOnlyPoly=surfaceRoad.legacyRoadPoly??surfaceRoad.mask;
    roadPoly=surfaceRoad.roadPoly??surfaceRoad.mask;
    forest=surfaceRoad.forest;
    if(surfaceRoad.metadata.bridge||surfaceRoad.metadata.crossing)deckItems.length=0;
  }
  const knownItems=terrain.deckItems;
  const knownCrossingSources=knownItems.filter(item=>!item.estimated).map(item=>({item,contains:polygonTester(item.outlines.map(r=>[r.map(project)]))}));
  const representedElevationAt=(lon,lat)=>{
    const [x,y]=project([lon,lat]);if(x<0||y<0||x>width||y>height)return elevationAt(lon,lat);
    return originMeters+(ground(x,y)-minimumSurfaceMM)/(scale*exaggeration);
  };
  const gradeFirst=options.surfaceRoads==='grade-first'&&options.majorRoads===true;
  const majorRoadsEnabled=!gradeFirst&&!surfaceRoad&&options.majorRoads===true;
  if(majorRoadsEnabled)progress('Calculant els perfils de les vies principals…');
  const allowCrossing=(other,p)=>other.properties?.brunnel==='tunnel'?options.estimatedTunnels===true:
    other.properties?.brunnel==='bridge'&&knownCrossingSources.some(source=>source.contains(p)&&!!source.item.railway===isRailway(other.properties));
  const majorPlan=majorRoadsEnabled&&infrastructureApi?generateMajorRoadItems(data.features,elevationAt,{projection:proj,bbox:data.meta.bbox,roi:rect,renderedElevationAt:representedElevationAt,allowEndpointLift:true,cropToElevationWindow:terrain.cropToElevationWindow,smoothProfiles:options.smoothProfiles===true,maxLiftMetres:30,allowCrossing,includeSurfaceRailways:false}):{items:[],metadata:{count:0,terrainModified:false},warnings:[]};
  const acceptedMajor=[],majorOmissions=[];
  for(const [itemIndex,profile]of majorPlan.items.entries()){
    if(excludedProfiles.has(profile.id)){
      majorOmissions.push({sourceFeatureIds:profile.sourceFeatureIds,reason:excludedProfiles.get(profile.id)});
      continue;
    }
    const message='Comprovant els perfils de les vies principals…';
    if(preview)preview.stage('transport',message,itemIndex,majorPlan.items.length);
    else progress(`Comprovant la via principal ${itemIndex+1} de ${majorPlan.items.length}…`);
    try{
      // Give the rail the crossing even if it lies outside the section checked
      // by the main-road planner (for example, close to the end of the road).
      if(railPoly.length&&profile.outlines.some(ring=>intersect([[ring.map(project)]],railPoly).length)){
        majorOmissions.push({sourceFeatureIds:profile.sourceFeatureIds,reason:'el creuament amb el ferrocarril es representa a nivell'});
        continue;
      }
      const joinFailure='espai o pendent insuficients per enllaçar amb la via sobre el terreny';
      let omission,previous;
      // Try longer approaches only when the usual landing cannot match the grade.
      for(const reserveFactor of [1,1.4,1.9]){
        const item=options.smoothProfiles?reserveProfileEnds(profile,proj,reserveFactor):profile;
        if(!item){omission??={reason:joinFailure};break;}
        const ends=item.terminalRoutes?.map(path=>path?.[0]?.join(',')).join('|');
        if(reserveFactor>1&&ends===previous)continue;
        previous=ends;
        const fit=fitMajorRoadItem(item,{projection:proj,verticalReference,exaggeration,ground,maxLiftMetres:30,patches:polys=>terrainPatches(intersect(polys,land),width,height,resolution,terrainGrid)});
        if(!fit.accepted){if(fit.present)omission??={reason:fit.reason};break;}
        const tunnelChecks=item.crossingChecks.filter(check=>check.kind==='tunnel');
        const bridgeChecks=item.crossingChecks.filter(check=>check.kind!=='tunnel');
        const clearance=knownBridgeClearance({...item,crossingChecks:bridgeChecks},fit,knownCrossingSources.map(p=>p.item),{projection:proj,verticalReference,exaggeration,roadRise,railRise});
        if(!clearance.accepted){omission??={reason:clearance.reason};break;}
        let terminalApproaches;
        if(item.terminalRoutes){
          const identity=transportIdentity({class:item.roadClass,ref:item.ref,name:item.name,oneway:item.oneway,layer:item.layer,railway:item.railway,sourceFeatureIds:item.sourceFeatureIds});
          const surfaceRise=roadRise+(item.railway?railRise:0),axis=item.axis.map(project);
          axis.identity=identity;
          const points=projectInfrastructurePath(item.coordinates,proj,verticalReference,exaggeration).map(([x,y,z])=>[x,y,z+surfaceRise+fit.adjustmentMM]);
          const containsDeck=polygonTester(intersect(item.outlines.map(r=>[r.map(project)]),rect));
          const terminalRoads=item.terminalRoutes.map(path=>path&&({...identity,points:path,width:Math.max(.44,item.sourceWidthMetres*scale)}));
          terminalApproaches=planApproaches({axis,points,faces:item.faces,containsDeck,roads:[],ground,
            destinationBreaks:section=>crossSectionFractions(section,{fieldWidth:width,fieldHeight:height,resolution,grid:terrainGrid}),
            forceConnections:true,roadRise:surfaceRise,scale,widthMM:width,heightMM:height,roadWidth:item.widthMetres*scale,
            terminalRoads,maxGrade:item.maxGrade*exaggeration});
          if(terminalApproaches.missed.length){
            omission={reason:joinFailure,ends:terminalApproaches.missed};
            continue;
          }
        }
        acceptedMajor.push({...item,terminalApproaches,tunnelChecks,generatedSurfaceAdjustmentMM:fit.adjustmentMM,maximumPrintedLiftMetres:fit.maximumPrintedLiftMetres,checkedCrossings:clearance.checkedCrossings,knownCrossingClearanceMM:Number.isFinite(clearance.minimumClearanceMM)?clearance.minimumClearanceMM:null});
        omission=undefined;
        break;
      }
      if(omission)majorOmissions.push({sourceFeatureIds:profile.sourceFeatureIds,...omission});
    }catch(error){majorOmissions.push({sourceFeatureIds:profile.sourceFeatureIds,reason:error.message});}
  }
  let majorMetadata={...majorPlan.metadata,enabled:majorRoadsEnabled,applied:false,count:acceptedMajor.length,
    ...(recoveryPass?{recoveryPass}:{}),omissions:[...(majorPlan.metadata.omissions||[]),...majorOmissions],omitted:(majorPlan.metadata.omitted||0)+majorOmissions.length};
  warnings.push(...majorPlan.warnings,...majorOmissions.map(p=>'Perfil principal omès: '+p.reason));
  const fallbackMajor=message=>{
    const restored=measure('major.fallback',()=>buildTransport(data,{...options,majorRoads:false},terrain,progress,infrastructureApi,diagnostics,buildingGeometry,undefined,preview),{reason:message});restored.warnings.unshift(message);
    restored.provenance.majorRoads={...majorMetadata,attempted:majorMetadata.count,count:0,applied:false,error:message};
    restored.context.meta.majorRoads=restored.provenance.majorRoads;
    restored.context.options.majorRoads=options.majorRoads;
    restored.provenance.options.majorRoads=options.majorRoads;
    return restored;
  };
  if(acceptedMajor.length){
    progress('Integrant les vies principals amb les capes…');
    try{
      function remainingSurface(pieces,profiles){
        if(!profiles.length)return pieces.flatMap(piece=>piece.polys);
        const mask=measure('major.masks',()=>merge(profiles.flatMap(item=>item.outlines.map(r=>intersect([[r.map(project)]],land))).filter(p=>p.length)));
        const ids=new Set(profiles.flatMap(item=>item.sourceFeatureIds));
        return measure('major.road-differences',()=>pieces.flatMap(p=>ids.has(p.id)?subtract(p.polys,mask):p.polys),{pieces:pieces.length,profiles:profiles.length});
      }
      const remaining=remainingSurface(roadPieces,acceptedMajor);
      measure('major.road-coverage',()=>{
        roadOnlyPoly=subtract(intersect(merge(remaining.map(p=>[p])),land),railPoly);
        roadPoly=merge([roadOnlyPoly,railPoly].filter(p=>p.length));
      });
      measure('major.land-coverage',()=>{forest=subtract(intersect(merge(cropped(green)),land),roadPoly);bare=subtract(subtract(land,roadPoly),forest);});
      deckItems.push(...acceptedMajor);
      deckMask=merge([deckMask,...acceptedMajor.flatMap(item=>item.outlines.map(r=>intersect([[r.map(project)]],land)))].filter(p=>p.length));
      containsDeck=polygonTester(deckMask);
    }catch(error){
      return fallbackMajor('No s’han pogut integrar els perfils suaus amb les capes. '+error.message);
    }
  }
  const recoverProfiles=(ids,message)=>{
    const rejected=new Set(ids);
    if(recoveryPass>=4||acceptedMajor.every(item=>rejected.has(item.id)))return fallbackMajor(message);
    const next=new Map(excludedProfiles);
    for(const id of rejected)next.set(id,message);
    if(next.size===excludedProfiles.size)return fallbackMajor(message);
    return buildTransport(data,options,terrain,progress,infrastructureApi,diagnostics,buildingGeometry,next,preview,recoveryPass+1);
  };
  const bridges=[];
  let publishedDecks=0,lastDeckPreview=performance.now();
  for(const [index,sourceItem] of deckItems.entries()){
    preview?.stage('transport','Construint els taulers…',index,deckItems.length);
    if(preview&&publishedDecks<bridges.length&&performance.now()-lastDeckPreview>=180){
      preview.parts('transport',bridges.slice(publishedDecks).map(b=>({...CATEGORIES[b.category],...b.mesh})),proj,'append');
      publishedDecks=bridges.length;
      lastDeckPreview=performance.now();
    }
    let item=sourceItem;
    try{
    const mask=intersect(item.outlines.map(r=>[r.map(project)]),rect),contains=polygonTester(mask);
    const matches=transport.filter(t=>t.brunnel==='bridge').map(t=>({t,score:t.points.slice(1).reduce((n,p,i)=>n+(contains([(p[0]+t.points[i][0])/2,(p[1]+t.points[i][1])/2])?Math.hypot(p[0]-t.points[i][0],p[1]-t.points[i][1]):0),0)})).sort((a,b)=>b.score-a.score);
    const railway=!!(item.railway??(matches[0]?.score>0&&matches[0].t.railway));
    const surfaceRise=roadRise+(railway?railRise:0),category=railway?8:3;
    // Extra platform is added above the source top. The underside and pier
    // abutment are independent of the visual railway rise.
    const lift=surfaceRise+(item.generatedSurfaceAdjustmentMM||0);
    let points=projectInfrastructurePath(item.coordinates,proj,verticalReference,exaggeration);
    let axis=item.axis?.map(project)||(matches[0]?.score>0?matches[0].t.points:null);
    const inside=([x,y])=>x>=0&&x<=width&&y>=0&&y<=height;
    let waterFit;
    if(item.elevationMethod==='linear-dem-endpoints'&&waterPoly.length&&axis){
      const rows=axis.map((_,i)=>points.slice(i*2,i*2+2));
      if(inside(axis[0])&&inside(axis.at(-1)))waterFit=fitWaterBridge(axis,rows,ground,terrain.waterAt);
      if(waterFit){
        const zScale=scale*exaggeration;
        item={...item,coordinates:item.coordinates.map(([lon,lat],i)=>[lon,lat,originMeters+(waterFit.heights[i>>1]-verticalReference.minimumSurfaceMM)/zScale]),
          elevationMethod:'estimated-short-water-crossing'};
        points=points.map(([x,y],i)=>[x,y,waterFit.heights[i>>1]]);
      }else if(!railway&&isPrincipalRoad({class:item.roadClass,ramp:item.ramp})){
        waterFit=fitMainWaterBridge(axis,rows,ground,terrain.waterAt,{maxGrade:.12*exaggeration,inModel:inside});
        if(waterFit){
          axis=waterFit.axis;
          points=waterFit.rows.flat();
          const zScale=scale*exaggeration,faces=[];
          for(let i=0;i<points.length-2;i+=2)faces.push(i,i+1,i+3,i,i+3,i+2);
          item={...item,coordinates:points.map(([x,y,z])=>[...proj.unproject([x,y]),originMeters+(z-minimumSurfaceMM)/zScale]),
            faces,elevationMethod:'estimated-main-water-crossing'};
        }
      }
    }
    const thickness=(item.catalogue?Math.max(.6,item.catalogueModel.bridge.depth*scale*exaggeration):waterFit?.thicknessMM??.6)+surfaceRise;
    const mesh=deckSurfaceSolid(item,proj,verticalReference,exaggeration,thickness,lift);if(!mesh.faces.length)continue;
    let upper;
    if(item.catalogue&&infrastructureApi){
      try{upper=catalogueBridgeUpper(item,proj,verticalReference,exaggeration,lift,infrastructureApi,CATEGORIES[category]);}
      catch(error){warnings.push(`Pont ${item.id}: detalls superiors omesos. ${error.message}`);}
    }
    points=points.map(([x,y,z])=>[x,y,z+lift]);
    const top=topSampler(points,item.faces);
    if(!axis){const center=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]),xx=points.reduce((n,p)=>n+(p[0]-center[0])**2,0),yy=points.reduce((n,p)=>n+(p[1]-center[1])**2,0),xy=points.reduce((n,p)=>n+(p[0]-center[0])*(p[1]-center[1]),0),angle=Math.atan2(2*xy,xx-yy)/2,d=[Math.cos(angle),Math.sin(angle)],positions=points.map(p=>(p[0]-center[0])*d[0]+(p[1]-center[1])*d[1]);axis=[Math.min(...positions),Math.max(...positions)].map(s=>[center[0]+s*d[0],center[1]+s*d[1]]);}
    axis=axis.slice();
    const identity=!item.sourceFeatureIds?.length&&matches[0]?.score>0?{...matches[0].t.identity}:transportIdentity({class:item.roadClass,ramp:item.ramp,ref:item.ref,name:item.name,oneway:item.oneway,layer:item.layer,railway},null);
    axis.roadClass=identity.class||matches[0]?.t.class;
    if(item.sourceFeatureIds?.length)identity.sourceFeatureIds=item.sourceFeatureIds;
    const roadWidth=item.mainRoad||item.catalogue?item.widthMetres*scale:matches[0]?.t.width||.44;
    const layout=item.layout??data.infrastructure?.layouts?.items?.[item.id],pierAxis=layout?.start==='south'&&proj.unproject(axis[0])[1]>proj.unproject(axis.at(-1))[1]?axis.slice().reverse():axis;
    pierAxis.identity=identity;pierAxis.roadClass=axis.roadClass;
    bridges.push({id:item.id,mesh,axis:pierAxis,points,sourceFaces:item.faces,identity,roadWidth,top,mask,contains,approaches:item.terminalApproaches||{plans:[],missed:[]},terminalApproaches:!!item.terminalApproaches,layout,railway,category,thickness,surfaceRise,mainRoad:!!item.mainRoad,tunnelChecks:item.tunnelChecks,generatedSurfaceAdjustmentMM:item.generatedSurfaceAdjustmentMM||0,maximumPrintedLiftMetres:item.maximumPrintedLiftMetres,estimated:!!item.estimated,elevationMethod:item.elevationMethod,waterClearanceMM:waterFit?.minimumClearanceMM,widthMetres:item.widthMetres,sourceFeatureIds:item.sourceFeatureIds,catalogue:item.catalogue,upper,supportFeatureIds:item.supportFeatureIds});
    }catch(error){
      if(item.mainRoad)return recoverProfiles([item.id],error.message);
      warnings.push(`Pont ${item.id} omès: ${error.message}`);
    }
  }
  if(preview&&publishedDecks<bridges.length){
    preview.parts('transport',bridges.slice(publishedDecks).map(b=>({...CATEGORIES[b.category],...b.mesh})),proj,'append');
  }
  for(const bridge of bridges){
    if(!bridge.mainRoad){bridge.supportRoadPoly=sourceRoadPoly;continue;}
    bridge.supportRoadPoly=deferredObstacleMask(()=>measure('major.support-obstacles',()=>{
      const own=new Set(bridge.sourceFeatureIds);
      const other=roadPieces.flatMap(p=>own.has(p.id)?subtract(p.polys,bridge.mask):p.polys);
      return merge([...other.map(p=>[p]),railPoly,mappedDeckMask].filter(p=>p.length));
    },{id:bridge.id}));
  }
  const principalRoutes=gradeFirst?transport.filter(principalSurface):[];
  let principal=null;
  if(principalRoutes.length){
    progress('Construint la rasant i el suport de les vies principals…');
    const junctionAt=(point,axis,accepted)=>{
      for(const route of accepted)if((route.axis.layer??0)===(axis.layer??0)){
        const z=route.top(...point);if(z!=null)return z;
      }
      return null;
    };
    principal=measure('transport.principal-grade',()=>buildSurfaceCorridors(land,roadRise,3,principalAxes(principalRoutes,bridges,proj),
      (axis,accepted)=>principalSections(axis,terrain,roadRise,(point,route)=>junctionAt(point,route,accepted)),railPoly));
    const original=mergeLayer(principalRoutes.flatMap(route=>roadPieces[route.roadPiece]?.polys.map(p=>[p])??[]));
    roadOnlyPoly=subtract(roadOnlyPoly,mergeLayer([original,principal.mask].filter(mask=>mask.length)));
    roadPoly=mergeLayer([roadOnlyPoly,railPoly,principal.mask].filter(mask=>mask.length));
    cutTerrain={...terrain,land:subtract(cutTerrain.land,principal.mask)};
    const uncovered=subtract(land,roadPoly),greenMask=merge(cropped(green));
    forest=intersect(uncovered,greenMask);bare=subtract(uncovered,greenMask);
    majorMetadata={...majorMetadata,enabled:true,applied:principal.count>0,method:'endpoint-grade-cut-and-fill',count:principal.count,
      terrainModified:principal.count>0,omitted:principal.omissions.length,omissions:principal.omissions,
      profiles:principal.accepted.map(({axis,sections})=>({sourceFeatureIds:axis.sourceFeatureIds,roadClass:axis.class,
        elevationMethod:'endpoint-grade-cut-and-fill',sections,anchors:axis.anchors.map(anchor=>anchor&&{bridgeId:anchor.bridgeId,point:anchor.point,z:anchor.z})}))};
    warnings.push(...principal.omissions.map(({sourceFeatureIds,reason})=>`Rasant de la via ${sourceFeatureIds.join(', ')} omesa: ${reason}`));
  }
  const independentPavement=options.surfaceRoads==='independent';
  const fixedTransportMask=principal?.mask.length?mergeLayer([railPoly,principal.mask].filter(mask=>mask.length)):railPoly;
  if((options.surfaceRoads==='regional'||options.surfaceRoads==='grade-first'||independentPavement)&&infrastructureApi){
    try{
      progress('Comprovant on es pot aplicar el paviment nou…');
      const blockedIds=new Set([...acceptedMajor,...principalRoutes].flatMap(item=>item.sourceFeatureIds));
      const blockedMask=merge([deckMask,fixedTransportMask].filter(p=>p.length));
      const plan=measure('surface-road.regional-plan',()=>planRegionalSurfaceRoads(terrain,{rise:roadRise,thickness:.65+roadRise,
        blockedMask,blockedIds,principalPavement:independentPavement&&options.majorRoads===true&&options.smoothProfiles===true}));
      regionalMetadata=plan.metadata;
      if(plan.regions.length){
        const built=measure('surface-road.regional-mesh',()=>assembleRegionalSurfaceRoads(cutTerrain,roadRise,infrastructureApi,progress,plan,roadOnlyPoly,fixedTransportMask));
        if(built){
          surfaceRoad=built;
          roadOnlyPoly=built.legacyRoadPoly;
          roadPoly=built.roadPoly;
          forest=built.forest;
        }
      }
    }catch(error){
      regionalMetadata={...regionalMetadata,mode:'regional',applied:false,accepted:0,fullAccepted:0,partialAccepted:0,
        partialLengthMM:0,error:error.message};
    }
    if(regionalMetadata.eligible||regionalMetadata.error)warnings.push(regionalMetadata.applied
      ?`Paviment de superfície nou aplicat a ${regionalMetadata.accepted} fragments viaris. La resta conserva el càlcul habitual.`
      :`Paviment de superfície nou sense aplicar al retall. ${regionalMetadata.error??'Cap grup ha superat les comprovacions.'}`);
  }
  let staticBase=surfaceRoad?.parts??terrain.surfaces.slice();
  if((acceptedMajor.length||railPoly.length||principal)&&!regionalMetadata?.applied){
    const cover=terrainCover(forest,bare,cutTerrain,progress);
    for(const index of [0,4,6])staticBase[index]=cover[index];
  }
  if(principal?.support.faces.length)append(rail.support,principal.support);
  if(rail.support.faces.length){append(rail.support,staticBase[0]);staticBase[0]=surfacePart(0,rail.support);}
  if(preview)progress('Triangulant carreteres i ferrocarrils…');
  if(!surfaceRoad)staticBase[3]=roadSurface(3,roadOnlyPoly,roadRise,terrain);
  if(principal?.part.faces.length){
    const roads={vertices:[],faces:[]};append(roads,staticBase[3]);append(roads,principal.part);
    staticBase[3]=surfacePart(3,roads);
  }
  staticBase[8]=rail.part;
  preview?.parts('transport',[...staticBase,...bridges.map(bridge=>({...CATEGORIES[bridge.category],...bridge.mesh}))],proj);
  const matchesLine=(structure,line)=>{
    if(!line)return false;
    const ids=new Set((structure.sourceFeatureIds||structure.identity?.sourceFeatureIds||[]).map(String));
    return (line.sourceFeatureIds||line.identity?.sourceFeatureIds||[]).some(id=>ids.has(String(id)));
  };
  const bridgesByRoute=new Map();
  for(const [index,bridge] of bridges.entries()){
    for(const id of new Set((bridge.sourceFeatureIds||bridge.identity.sourceFeatureIds).map(String))){
      if(!bridgesByRoute.has(id))bridgesByRoute.set(id,[]);
      bridgesByRoute.get(id).push(index);
    }
  }
  const bridgeIndices=line=>{
    const ids=line?.sourceFeatureIds||line?.identity?.sourceFeatureIds||[];
    if(!ids.length)return [];
    if(ids.length===1)return bridgesByRoute.get(String(ids[0]))||[];
    return [...new Set(ids.flatMap(id=>bridgesByRoute.get(String(id))||[]))].sort((a,b)=>a-b);
  };
  const corridorLandings=line=>new Set((line?.sourceFeatureIds||[]).flatMap(id=>
    (line.railway?rail:principal)?.byId.get(String(id))||[]));
  const exteriorSurface=(x,y,railway,properties={},routeLine=null,excludedID=null)=>{
    const identity=transportIdentity(properties);
    for(const index of bridgeIndices(routeLine)){
      const bridge=bridges[index];
      if(bridge.id!==excludedID&&bridge.railway===railway&&compatibleTransport(identity,bridge.identity)){
        const z=bridge.top(x,y);if(z!=null)return z;
      }
    }
    for(const platform of corridorLandings(routeLine)){
      const z=platform.top(x,y);if(z!=null)return z;
    }
    return ground(x,y)+roadRise+(railway?railRise:0);
  };
  const exteriorBreaks=section=>{
    const fractions=crossSectionFractions(section,{fieldWidth:width,fieldHeight:height,resolution,grid:terrainGrid});
    for(const index of bridgeIndices(section.line)){
      const bridge=bridges[index];
      fractions.push(...crossSectionFractions(section,{points:bridge.points,faces:bridge.sourceFaces}));
    }
    for(const platform of corridorLandings(section.line))fractions.push(...crossSectionFractions(section,platform));
    return fractions;
  };
  if(preview&&options.estimatedTunnels)progress('Calculant els traçats i portals dels túnels…');
  const roofGround=principal?(x,y)=>{
    for(const route of principal.accepted){
      const [left,bottom,right,top]=route.extent;
      if(x<left||x>right||y<bottom||y>top)continue;
      const height=route.top(x,y);if(height!=null)return height;
    }
    return ground(x,y);
  }:ground;
  const tunnelVoids=generateProceduralTunnelVoids(data.features,elevationAt,{enabled:options.estimatedTunnels===true,projection:proj,verticalReference,exaggeration,ground,roofGround,minimumVoidFloorMM:minimumSurfaceMM,surfaceRiseMM:roadRise,railSurfaceRiseMM:roadRise+railRise,waterMask:waterPoly,surfaceAt:exteriorSurface,surfaceBreaks:exteriorBreaks,portalProfile:(point,line,properties)=>{
    if(line?.properties?.catalogueRailway!==properties.catalogueRailway)return null;
    for(const landing of corridorLandings(line)){
      const height=landing.top(...point);if(height!=null)return height;
    }
    return null;
  },sharedPavement:surfaceRoad?.sharedPavement,trailWidth:options.trailWidth,portalRoute:({point,outward,properties,sourceFeatureIds,maxLengthMM})=>{
    const own=new Set(sourceFeatureIds),lines=transport.filter(t=>t.brunnel!=='tunnel'&&!t.sourceFeatureIds?.some(id=>own.has(id)));
    const route=continuationRoute(point,outward,lines,transportIdentity(properties),maxLengthMM,{allowStructures:true});return route.segments.length?route:null;
  }});
  warnings.push(...tunnelVoids.warnings);
  const deckCount=bridges.length;
  const proceduralCount=bridges.filter(b=>b.estimated&&!b.mainRoad).length,knownCount=bridges.filter(b=>!b.estimated).length;
  const catalogueBridges=bridges.filter(bridge=>bridge.catalogue);
  if(knownCount>catalogueBridges.length)warnings.push(`${knownCount-catalogueBridges.length} taulers amb cota de la font específica. Pilars i enllaços simplificats per imprimir. El datum vertical de l’ICGC no s’ha transformat al del relleu.`);
  for(const bridge of catalogueBridges)warnings.push(`Model singular del catàleg «${bridge.catalogue.name}» (${bridge.catalogue.revision}).`);
  const waterBridgeCount=bridges.filter(b=>b.waterClearanceMM).length;
  const shortWaterBridgeCount=bridges.filter(b=>b.elevationMethod==='estimated-short-water-crossing').length;
  if(proceduralCount)warnings.push(`${proceduralCount} ponts procedimentals amb cotes estimades a partir del relleu i la cartografia.`);
  if(waterBridgeCount)warnings.push(`${waterBridgeCount} taulers ajustats per deixar pas sobre l’aigua. Comprova l’obertura al laminador.`);
  if(railPoly.length||bridges.some(b=>b.railway))warnings.push(`Ferrocarrils realçats ${railRise.toLocaleString('ca')} mm sobre el nivell dels camins; és una plataforma simplificada de la maqueta, no una cota real.`);
  if(roadRise)warnings.push(`Camins realçats ${roadRise.toLocaleString('ca')} mm sobre el terreny; és un efecte de la maqueta, no una altura real.`);
  const majorDecks=bridges.filter(b=>b.mainRoad);
  if(majorDecks.length){
    progress('Assignant el paviment de les vies principals…');const carved=measure('major.material-replacement',()=>carveIndependentTransportDecks(staticBase,majorDecks,infrastructureApi));
    if(!carved.metadata.applied){
      majorMetadata.materialReplacement={...carved.metadata,rejected:carved.rejected};
      return fallbackMajor(carved.warnings.join(' '));
    }
    if(carved.rejected.length)return recoverProfiles(carved.rejected.map(deck=>deck.id),
      'No s’ha pogut separar el paviment d’algunes vies del terreny. '+[...new Set(carved.rejected.map(deck=>deck.error))].join('. '));
    warnings.push(...carved.warnings);
    staticBase=carved.parts;majorMetadata={...majorMetadata,applied:true,materialReplacement:carved.metadata,profiles:acceptedMajor.map(({coordinates,faces,outlines,axis,terminalRoutes,terminalApproaches,...p})=>p)};
  }
  let tunnelMetadata=tunnelVoids.metadata,tunnelMask=[],openedTunnels=[];
  if(tunnelVoids.items.length){
    progress('Obrint els túnels estimats…');
    const carved=carveAvailableTunnels(staticBase,tunnelVoids.items,infrastructureApi);
    staticBase=carved.parts;warnings.push(...carved.warnings);tunnelMetadata={...tunnelMetadata,...carved.metadata};
    openedTunnels=carved.tunnels;
    if(carved.metadata.applied)tunnelMask=merge(openedTunnels.flatMap(t=>t.footprints));
  }
  if(surfaceRoad?.metadata?.tunnel&&!openedTunnels.length)
    throw Error('El pilot no ha pogut obrir el túnel. '+(tunnelMetadata.error??tunnelVoids.warnings.join(' ')));
  const tunnelCrossings=[],rejectedCrossings=[];
  for(const bridge of majorDecks){
    if(!bridge.tunnelChecks.length)continue;
    try{
      const clearance=openedTunnelClearance(bridge,openedTunnels);
      if(clearance.accepted)tunnelCrossings.push(...clearance.results.map(check=>({id:bridge.id,...check})));
      else rejectedCrossings.push({id:bridge.id,reason:clearance.reason});
    }catch(error){rejectedCrossings.push({id:bridge.id,reason:`No s’ha pogut comprovar la separació del túnel. ${error.message}`});}
  }
  if(rejectedCrossings.length)return recoverProfiles(rejectedCrossings.map(c=>c.id),[...new Set(rejectedCrossings.map(c=>c.reason))].join('. '));
  if(tunnelCrossings.length)majorMetadata={...majorMetadata,tunnelCrossings};
  if(openedTunnels.length){
    for(const bridge of majorDecks){
      const opened=carveTransportDecks([{...CATEGORIES[bridge.category],...bridge.mesh}],openedTunnels,infrastructureApi,{},bridge.railway);
      if(!opened.metadata.applied||!opened.parts[0]?.faces.length)return recoverProfiles([bridge.id],'No s’han pogut conservar els passos sota el perfil principal.');
      warnings.push(...opened.warnings);
      bridge.mesh=opened.parts[0];
    }
  }
  // A final connection pass sees every accepted structure and opened portal,
  // independent of feature order. It does not alter surveyed deck coordinates.
  const floorTargets=openedTunnels.map(t=>{
    const rows=t.pavementSections.map(s=>s.across||[s.left,s.right]),n=rows[0].length,points=rows.flat(),faces=[];
    for(let i=0;i<rows.length-1;i++)for(let j=0;j<n-1;j++){const a=i*n+j;faces.push(a,a+1,a+n,a+1,a+n+1,a+n);}
    return {top:topSampler(points,faces),points,faces,identity:t.roadIdentity||transportIdentity(data.features.find((f,i)=>t.sourceFeatureIds.includes(f.id??i))?.properties),sourceFeatureIds:t.sourceFeatureIds,railway:t.pavementCategory==='railways'};
  });
  const apronTargets=new Map();
  for(const bridge of majorDecks)for(const plan of bridge.approaches.plans){
    const ids=plan.targetFeatureIds;
    if(!ids?.length)continue;
    const {points,faces}=slabTopMesh(plan.mesh),target={points,faces,top:topSampler(points,faces),identity:bridge.identity};
    for(const id of ids.map(String)){
      if(!apronTargets.has(id))apronTargets.set(id,[]);
      apronTargets.get(id).push(target);
    }
  }
  const apronsByLine=new WeakMap();
  const landingAprons=line=>{
    if(!line)return [];
    if(!apronsByLine.has(line)){
      const targets=[...new Set((line.sourceFeatureIds||[]).flatMap(id=>apronTargets.get(String(id))||[]))];
      apronsByLine.set(line,targets.filter(target=>compatibleTransport(line,target.identity)));
    }
    return apronsByLine.get(line);
  };
  for(const [index,bridge] of bridges.entries()){
    preview?.stage('transport','Calculant els enllaços dels ponts…',index+1,bridges.length);
    if(bridge.terminalApproaches)continue;
    try{
    const destination=(x,y,line)=>{
      for(const floor of floorTargets)if(floor.railway===bridge.railway&&matchesLine(floor,line)&&compatibleTransport(bridge.identity,floor.identity)){const z=floor.top(x,y);if(z!=null)return z-bridge.surfaceRise;}
      // When the continuation already has a smoothed approach, use the
      // actual pavement as the landing instead of the DEM under that ramp.
      for(const apron of landingAprons(line)){const z=apron.top(x,y);if(z!=null)return z-bridge.surfaceRise;}
      return exteriorSurface(x,y,bridge.railway,bridge.identity,line,bridge.id)-bridge.surfaceRise;
    };
    const own=new Set(bridge.sourceFeatureIds||bridge.identity.sourceFeatureIds),lines=transport.filter(t=>t.railway===bridge.railway&&!t.sourceFeatureIds?.some(id=>own.has(id))&&(t.brunnel!=='tunnel'||floorTargets.some(f=>matchesLine(f,t))));
    const destinationBreaks=section=>{
      const fractions=exteriorBreaks(section);
      for(const floor of floorTargets)if(matchesLine(floor,section.line))fractions.push(...crossSectionFractions(section,{points:floor.points,faces:floor.faces}));
      for(const apron of landingAprons(section.line))fractions.push(...crossSectionFractions(section,apron));
      return fractions;
    };
    const mainAtEdge=!!bridge.catalogue||bridge.estimated&&!bridge.railway&&isPrincipalRoad(bridge.identity);
    bridge.approaches=planApproaches({axis:bridge.axis,points:bridge.points,faces:bridge.sourceFaces,containsDeck:bridge.contains,roads:lines,ground,destinationSurface:destination,destinationBreaks,forceConnections:true,roadRise:bridge.surfaceRise,scale,widthMM:width,heightMM:height,roadWidth:bridge.roadWidth,maxGrade:bridge.waterClearanceMM ? .3 : null,
      clipApproach:mainAtEdge?(mesh,thickness)=>clipApproachSlab(mesh,proj,thickness):null,
      dryApproach:mainAtEdge?(x,y)=>terrain.waterAt(x,y)===null:null,
      maxStartDistanceMM:bridge.catalogue?Math.min(4,bridge.roadWidth/2+18*scale):undefined,markClippedEnds:!!bridge.catalogue});
    }catch(error){bridge.approaches.missed.push({reason:'invalid approach pavement',error:error.message});}
  }
  warnings.push('Els arbres són una representació procedimental dins de zones verdes, no posicions d’arbres mesurades.');
  warnings.push('Les tessel·les vectorials estan generalitzades. Aquesta prova no substitueix cartografia topogràfica de precisió.');
  const containsGroundRoad=polygonTester(roadPoly),approachMask=merge(bridges.flatMap(b=>b.approaches.plans.map(p=>intersect(p.footprint,rect))).filter(p=>p.length)),containsApproach=polygonTester(approachMask);
  const catalogueProfiles=rail.accepted.filter(({axis})=>axis.points[0].length===3).map(({axis})=>axis.sourceFeatureIds);
  const railwayMetadata={incrementMM:railRise,surfaceRiseMM:roadRise+railRise,
    method:catalogueProfiles.length?'level cross-sections; catalogue or endpoint grade; cut and fill':
      'level cross-sections; constant estimated grade between endpoints; cut and fill',
    groundPresent:railPoly.length>0,bridges:bridges.filter(b=>b.railway).length,profiles:rail.count,omissions:rail.omissions,
    ...(catalogueProfiles.length?{catalogueProfiles}:{})};
  const context={ground,verticalReference,proj,rect,forest,land,roadPoly,roadOnlyPoly,railPoly,waterPoly,bridges,tunnelMask,infrastructureApi,containsForest:polygonTester(forest),containsLand:polygonTester(land),containsRoad:p=>containsDeck(p)||containsApproach(p)||containsGroundRoad(p),width,height,scale,staticWarnings:warnings,options:{...options,size,exaggeration,resolution,roadRise,railRise},meta:{...data.meta,tunnels:tunnelMetadata,railways:railwayMetadata,infrastructure:deckCount?{...data.infrastructure,provider:knownCount?'Specific overrides and estimated transport platforms':'Estimated transport platforms from OSM/DEM',items:undefined,count:deckCount,knownCount,proceduralCount,deckProfiles:bridges.map(b=>({id:b.id,mainRoad:b.mainRoad,generatedSurfaceAdjustmentMM:b.generatedSurfaceAdjustmentMM,estimated:b.estimated,elevationMethod:b.elevationMethod,widthMetres:b.widthMetres,sourceFeatureIds:b.sourceFeatureIds,railway:b.railway,surfaceRiseMM:b.surfaceRise,printableThicknessMM:b.thickness})),printableThicknessMM:.6+roadRise,railwayPrintableThicknessMM:bridges.some(b=>b.railway)?.6+roadRise+railRise:undefined}:null},diagnostics:terrain.diagnostics,staticBase,terrain,singularModels:data.singularModels,transportSource:{infrastructure:data.infrastructure,features:data.features,singularModels:data.singularModels},buildingGeometry,buildingFeatures:buildingGeometry?.features??data.features};
  if(terrain.landforms.length){
    const cut=measure('terrain.singular-openings',()=>carveCatalogueLandforms(staticBase,terrain.landforms,infrastructureApi,verticalReference,scale*exaggeration));
    context.staticBase=staticBase=cut.parts;
    context.activeLandforms=terrain.landforms.filter(({model})=>cut.applied.some(entry=>entry.id===model.id));
    context.meta.catalogueLandforms=cut.applied;
    context.meta.catalogueLandformOmissions=cut.skipped;
    warnings.push(...landformWarnings(cut));
  }
  context.meta.majorRoads=majorMetadata;
  if(regionalMetadata||surfaceRoad)context.meta.surfaceRoads=regionalMetadata??surfaceRoad.metadata;
  context.meta.transportContinuity={widthPolicy:'mapped width, then lanes, then road class; scale-sensitive floor; independent of structural deck and bore',minimumCarriagewayMM:MIN_ROAD_WIDTH_MM,connections:bridges.map(b=>({id:b.id,identity:b.identity,carriagewayWidthMM:b.roadWidth,joins:b.approaches.plans.map(p=>({startWidthMM:p.startWidthMM,endWidthMM:p.endWidthMM,targetFeatureIds:p.targetFeatureIds,routingRepairs:p.routingRepairs})),unconnectedEnds:b.approaches.missed})),portals:openedTunnels.flatMap(t=>t.portalConnections||[])};
  if(context.meta.infrastructure){
    if(catalogueBridges.length)context.meta.infrastructure.catalogueBridges=catalogueBridges.map(bridge=>({...bridge.catalogue,
      staysIncluded:bridge.upper?.staysIncluded??false,upperGeometryIncluded:!!bridge.upper?.parts.length,printableThicknessMM:bridge.thickness}));
    context.meta.infrastructure.mainRoadCount=majorDecks.length;
    context.meta.infrastructure.shortWaterCrossings=shortWaterBridgeCount;
    context.meta.infrastructure.mainWaterCrossings=waterBridgeCount-shortWaterBridgeCount;
    for(const [index,bridge] of bridges.entries())if(bridge.waterClearanceMM)
      context.meta.infrastructure.deckProfiles[index].waterClearanceMM=bridge.waterClearanceMM;
  }
  if(preview&&(openedTunnels.length||majorDecks.length)){
    preview.parts('transport',[...staticBase,...bridges.map(b=>({...CATEGORIES[b.category],...b.mesh}))],proj);
  }
  let model;
  try{
    model=measure('model.buildings-supports',()=>updateBuildings({context},{},options,progress,preview,measure));
  }catch(error){
    if(!options.smoothProfiles||!acceptedMajor.length)throw error;
    return fallbackMajor('No s’han pogut tancar les unions dels perfils suaus. '+error.message);
  }
  const rejectedProfiles=[
    ...(model.provenance.majorRoads?.completion||[]).filter(p=>p.unsupportedSpans?.length).map(p=>p.id),
    ...(model.context.bridgeCache?.failures||[]).filter(p=>p.mainRoad).map(p=>p.id)
  ];
  if(rejectedProfiles.length)return recoverProfiles(rejectedProfiles,'Algunes vies principals no tenen espai segur per als suports o els enllaços; es recuperen els camins sobre el terreny.');
  return model;
}

function prepareLandmark(ctx,model,config){
  const {proj:{project},rect,land,ground,width,height,scale,options:{resolution},infrastructureApi}=ctx,grid=ctx.terrain?.terrainGrid;
  const footprint=intersect(geoPolys({geometry:model.footprint},project),rect);
  if(!footprint.length)return null;
  if(footprintArea(intersect(footprint,land))<footprintArea(footprint)-1e-5)throw Error('La petjada queda en aigua.');
  if(!validBuildingMesh(model))throw Error('La malla original no té una base o altura vàlida.');
  const mode=config.buildingMode,rise=buildingRise(model.height,scale,config);
  const terrainBaseElevation=ctx.terrain?.terrainBases?.get(model.id);
  const anchorElevation=mode==='source'&&ctx.terrain?.useCatalogueAnchors?model.anchorElevation:undefined;
  let solid;
  if(mode==='flat')solid=terrainSolid(footprint,(x,y)=>ground(x,y)+rise,(x,y)=>ground(x,y)-.3,width,height,resolution,grid);
  else if(mode==='limited')solid=levelBuildingSolid(footprint,rise,ground,width,height,resolution,undefined,grid);
  else{
    let floor=Infinity,reference=-Infinity;
    for(const patch of terrainPatches(footprint,width,height,resolution,grid))for(const ring of patch)for(const [x,y]of ring){
      const z=ground(x,y);floor=Math.min(floor,z);reference=Math.max(reference,z);
    }
    const catalogueElevation=terrainBaseElevation??anchorElevation;
    if(catalogueElevation!==undefined){
      const {minimumSurfaceMM,originMeters}=ctx.verticalReference;
      reference=minimumSurfaceMM+(catalogueElevation-originMeters)*scale*ctx.terrain.exaggeration;
      floor=Math.min(reference,floor);
    }
    const [lon,lat]=model.anchor,lonMetres=111320*Math.cos(lat*Math.PI/180);
    const vertices=new Float32Array(model.vertices.length);
    const embed=Math.max(0,floor-.3);
    const verticalScale=anchorElevation===undefined?scale:scale*ctx.terrain.exaggeration;
    let crossesEdge=false;
    for(let i=0;i<vertices.length;i+=3){
      const [x,y]=project([lon+model.vertices[i]/lonMetres,lat-model.vertices[i+2]/111320]);
      const up=model.vertices[i+1];
      vertices[i]=x;vertices[i+1]=y;vertices[i+2]=Math.abs(up)<1e-5?embed:reference+up*verticalScale;
      crossesEdge||=x<0||x>width||y<0||y>height;
    }
    solid={vertices,faces:model.faces};
    if(crossesEdge){
      const tile={x0:0,y0:0,x1:width,y1:height,width,height,name:model.name};
      [solid]=splitModel({parts:[solid],width,height,provenance:{name:model.name}},infrastructureApi,
        {cols:1,rows:1,tiles:[tile]})[0].parts;
    }
    const audit=auditPart(solid);
    if(audit.empty||audit.errors.length||!audit.bbox)throw Error('El model no forma un sòlid imprimible.');
    solid={...solid,roof:audit.bbox.max[2],roofShape:'catalogue'};
  }
  if(!solid?.faces.length)throw Error('El model no té volum dins del retall.');
  const {id,name,revision,license,spatialDataLicense,attribution,sources,replacement}=model;
  return {id,h:model.height,valid:true,p:{landmark:{name,revision,license,spatialDataLicense,attribution,sources,
    ...(anchorElevation===undefined?{}:{anchorElevation}),
    ...(terrainBaseElevation===undefined?{}:{terrainBaseElevation})}},
    footprints:footprint,fragments:[{solid,count:1}],replacement};
}

function coveredByLandmark(poly,id,family,landmarks){
  if(!landmarks.length)return false;
  const [ring]=poly,xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
  const west=Math.min(...xs),east=Math.max(...xs),south=Math.min(...ys),north=Math.max(...ys);
  return landmarks.some(({footprints,replacement,bounds:[w,s,e,n]})=>{
    if(e<=west||east<=w||n<=south||north<=s)return false;
    const common=footprintArea(intersect([poly],footprints));
    const identified=replacement?.featureIds?.includes(String(id))||replacement?.families?.includes(family);
    return common>0&&(identified||common>=footprintArea([poly])*.55);
  });
}

function prepareBuildingGeometry(ctx,config,progress,preview,measure=(_phase,run)=>run()){
  const {buildingMode,maxBuildingHeight}=config;
  const {width,height,ground,scale,rect,land,waterPoly,options}=ctx,res=options.resolution,grid=ctx.terrain?.terrainGrid;
  const mesh={vertices:[],faces:[]},warnings=[],prepared=[],seen=new Set(),volumes=[];
  let buildingCount=0,approximate=0,limited=0,shapedRoofs=0,fallbackRoofs=0,omitted=0,duplicates=0;
  progress('Actualitzant la capa d’edificis…');
  const features=ctx.buildingFeatures.filter(f=>f?.properties?.sourceLayer==='building'&&!f.properties.hide_3d);
  const urbanCover=ctx.meta.historical?.layer==='urban';
  const isDry=(buildingMode==='none'&&!urbanCover)||!features.length?null:dryFootprints(waterPoly,width,height,res);
  let batch={vertices:[],faces:[]},lastPreview=performance.now();
  const withBounds=landmark=>{
    const points=landmark.footprints.flatMap(([ring])=>ring),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    return {...landmark,bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]};
  };
  // A façade carved into the terrain can replace an extruded building outline.
  // Keep the original outline whenever the terrain cut is skipped.
  const landmarks=(ctx.activeLandforms||[]).flatMap(({model})=>{
    if(!model.replacement)return [];
    const footprints=intersect(geoPolys({geometry:model.footprint},ctx.proj.project),rect);
    return footprints.length?[withBounds({footprints,replacement:model.replacement})]:[];
  });
  const bridgeSupports=new Map();
  for(const bridge of ctx.bridges||[])for(const id of bridge.supportFeatureIds||[])bridgeSupports.set(id,bridge.mask);
  if(buildingMode!=='none'&&!urbanCover)for(const model of ctx.singularModels||[]){
    if(model.kind&&model.kind!=='building')continue;
    try{
      const landmark=prepareLandmark(ctx,model,config);
      if(!landmark)continue;
      landmarks.push(withBounds(landmark));
      prepared.push(landmark);
      if(preview)append(batch,landmark.fragments[0].solid);
    }catch{
      warnings.push('No s’ha pogut encaixar algun model singular. Es conserva la geometria de la font d’edificis.');
    }
  }
  for(const [index,f] of features.entries()){
    if(preview&&(index===0||index%32===0)){
      preview.stage('buildings','Preparant les petjades i cobertes…',index,features.length);
      if(batch.faces.length&&performance.now()-lastPreview>=180){
        preview.parts('buildings',[surfacePart(2,batch)],ctx,'append');
        batch={vertices:[],faces:[]};
        lastPreview=performance.now();
      }
    }
    const p=f?.properties;if(p?.sourceLayer!=='building'||p.hide_3d)continue;
    try{
      const id=f.id??p.source_id,polygons=geoPolys(f,ctx.proj.project);
      if(!polygons.length||polygons.some(poly=>!poly.length||poly.some(r=>r.length<3||r.some(q=>!q.every(Number.isFinite)))))throw Error('Petjada invàlida.');
      // A tiled feature can have several distinct footprints. Deduplicate
      // exact copies of the same footprint, keeping the first usable entry.
      const key=id==null?null:JSON.stringify([p.provider??null,id,polygons]);
      if(key!=null&&seen.has(key)){duplicates++;continue;}
      const fragments=[],footprints=[];
      const h=Number(p.render_height),valid=Number.isFinite(h)&&h>0&&h<=1200;
      for(const poly of polygons){
        const supportMask=bridgeSupports.get(String(id));
        const inside=intersect([poly],rect).filter(part=>
          !(supportMask&&intersect([part],supportMask).length)&&!coveredByLandmark(part,id,p.family,landmarks));
        if(buildingMode==='none'&&!urbanCover){footprints.push(...inside);continue;}
        const cover=urbanCover&&p.historical_urban;
        const dry=isDry(inside)?inside:intersect(inside,land);
        const polys=(cover&&ctx.roadPoly.length?subtract(dry,ctx.roadPoly):dry).filter(p=>Math.abs(area(p[0]))>=.04);if(!polys.length)continue;
        const rise=cover ? .3 : buildingRise(valid?h:6,scale,config);
        const profile=!cover&&buildingMode==='source'?roofProfile(p,poly[0],scale,valid?h:6,options.selectionPose?.rotation||0):null;
        const solid=cover||buildingMode==='flat'?terrainSolid(polys,(x,y)=>ground(x,y)+rise,(x,y)=>ground(x,y)-.3,width,height,res,grid):levelBuildingSolid(polys,rise,ground,width,height,res,profile,grid);
        if(!solid.faces.length)continue;
        footprints.push(...polys);fragments.push({solid,profile,count:polys.length});
      }
      if(!footprints.length)continue;
      prepared.push({p,id,h,valid,fragments,footprints});
      if(preview)for(const {solid} of fragments)append(batch,solid);
      if(key!=null)seen.add(key);
    }catch{omitted++;}
  }
  if(preview&&batch.faces.length)preview.parts('buildings',[surfacePart(2,batch)],ctx,'append');
  preview?.stage('buildings','Integrant els edificis…',features.length,features.length);
  let mask,accepted=prepared;
  const footprints=prepared.flatMap(b=>b.footprints.map(poly=>[poly]));
  measure('buildings.mask',()=>{
    try{mask=mergeLayer(footprints);}
    catch{
      mask=[];accepted=[];
      for(const building of prepared){
        try{
          mask=merge([mask,...building.footprints.map(poly=>[poly])].filter(p=>p.length));
          accepted.push(building);
        }catch{omitted++;}
      }
    }
  },{footprints:footprints.length});
  for(const {p,id,h,valid,fragments}of accepted){
    if(p.landmark)warnings.push(`Model singular del catàleg «${p.landmark.name}» (${p.landmark.revision}).`);
    for(const {solid,profile,count}of fragments){
      if(urbanCover&&p.historical_urban){append(mesh,solid);continue;}
      if(profile?.parts)shapedRoofs++;if(profile?.fallback)fallbackRoofs++;
      append(mesh,solid);buildingCount+=count;if(p.height_estimated||!valid)approximate+=count;if(buildingMode==='limited'&&h>maxBuildingHeight)limited+=count;
      volumes.push({id:id??null,family:p.family??null,fragments:count,roof:solid.roof??null,roofShape:solid.roofShape||'flat',roofFallback:profile?.fallback||null,roofSource:p.roofSource||null,roofMetadata:profile?.metadata||null,baseOffsetMM:profile?.baseOffsetMM||0,estimated:!!p.height_estimated||!valid,
        ...(p.landmark?{landmark:p.landmark}:{})});
    }
  }
  if(omitted)warnings.push(`Edificis omesos per geometria invàlida: ${omitted}.`);
  if(duplicates)warnings.push(`Còpies d’edificis omeses: ${duplicates}. Es conserva una petjada per còpia.`);
  if(approximate)warnings.push(approximate+' fragments d’edificis amb alçària estimada; consulta la procedència de la font.');
  if(!urbanCover&&buildingMode==='limited')warnings.push('Edificis amb coberta horitzontal, com a màxim '+maxBuildingHeight+' m reals sobre el punt més alt de la petjada. La façana del costat baix pot superar aquest valor. '+limited+' fragments limitats en altura.');
  if(!urbanCover&&buildingMode==='source')warnings.push('Altures de la font sobre el punt més alt de la petjada; coberta plana quan falten dades de forma.');
  if(shapedRoofs)warnings.push(shapedRoofs+' cobertes inclinades o corbes segons els atributs de la font; consulta els criteris derivats a la procedència.');
  if(fallbackRoofs)warnings.push(fallbackRoofs+' cobertes simplificades a planes perquè falten paràmetres o la forma encara no s’admet.');
  if(!urbanCover&&buildingMode==='flat')warnings.push('Petjades de color de 0,12 mm, sense volum.');
  if(!urbanCover&&buildingMode==='none')warnings.push('Edificis omesos; es conserva el relleu actual, sense reconstrucció històrica.');
  return {features:ctx.buildingFeatures,mode:buildingMode,height:maxBuildingHeight,part:surfacePart(2,mesh),
    mask:buildingMode==='none'&&!urbanCover?[]:mask,contains:polygonTester(buildingMode==='none'&&!urbanCover?[]:mask),obstacleMask:urbanCover?[]:mask,count:buildingCount,volumes,warnings};
}

export function previewBuildingLayer(previous,features,changes={}){
  const context=previous?.context;
  if(!context)throw Error('Cal generar primer el terreny.');
  const options={...context.options,...changes};
  return prepareBuildingGeometry({...context,options,buildingFeatures:features},buildingOptions(options),()=>{}).part;
}

export function updateBuildings(previous,layer={},changes={},progress=()=>{},preview,measure=(_phase,run)=>run()){
  if(!previous.context)throw Error('Cal generar primer el terreny.');
  const old=previous.context,options={...old.options,...changes},config=buildingOptions(options),{buildingMode,maxBuildingHeight}=config;
  const switchingHistory=Object.hasOwn(layer,'historical');
  const historical=switchingHistory?layer.historical??undefined:old.meta.historical;
  const ctx={...old,options:{...options,...config},meta:{...(layer.meta||old.meta),historical,infrastructure:old.meta.infrastructure,tunnels:old.meta.tunnels,railways:old.meta.railways,majorRoads:old.meta.majorRoads,transportContinuity:old.meta.transportContinuity,catalogueLandforms:old.meta.catalogueLandforms,catalogueLandformOmissions:old.meta.catalogueLandformOmissions},buildingFeatures:layer.features||old.buildingFeatures,vegetationCache:null};
  const {width,height,ground,scale,rect}=ctx;
  const cached=old.buildingGeometry;
  preview?.stage('buildings','Calculant els edificis…');
  const buildings=cached&&cached.features===ctx.buildingFeatures&&cached.mode===buildingMode&&cached.height===maxBuildingHeight
    ?cached:prepareBuildingGeometry(ctx,config,progress,preview,measure);
  ctx.buildingGeometry=buildings;
  ctx.base=ctx.staticBase.slice();
  ctx.base[2]=buildings.part;
  ctx.buildingMask=buildings.mask;
  ctx.containsBuilding=buildings.contains;
  ctx.buildingCount=buildings.count;
  ctx.buildingVolumes=buildings.volumes;
  ctx.warnings=[...ctx.staticWarnings,...(ctx.meta.sourceWarnings||[]),...buildings.warnings];
  if(ctx.meta.buildings?.officialCount)ctx.warnings.push('Algunes petjades ICGC agrupen diverses cases sense divisions interiors. Pots comparar-les amb parts del Catastre.');
  if(ctx.bridges?.length){
    const pierBuildings=buildings.obstacleMask;
    const bridgeKey=JSON.stringify(pierBuildings);
    if(ctx.bridgeCache?.key!==bridgeKey){
      progress('Connectant viaductes i situant pilars…');
      const roads={vertices:[],faces:[]},rails={vertices:[],faces:[]};append(roads,ctx.staticBase[3]);append(rails,ctx.staticBase[8]);const stats=[],failures=[];
      for(const [index,bridge] of ctx.bridges.entries()){
        preview?.stage('buildings','Completant els suports de les vies amb els edificis…',index,ctx.bridges.length);
        try{
        const thickness=bridge.thickness,under=(x,y)=>{const z=bridge.top(x,y);return z==null?null:z-thickness;};
        const support=measure('bridge.supports',()=>planPiers({axis:bridge.axis,top:under,containsDeck:bridge.contains,ground,blocked:[bridge.supportRoadPoly||ctx.roadPoly,pierBuildings,ctx.waterPoly,ctx.tunnelMask||[]],scale,widthMM:width,heightMM:height,layout:bridge.layout,preserveSpans:!!bridge.catalogue,minimumClearanceMM:bridge.mainRoad?.25:.8}),{id:bridge.id});
        const pieces=[bridge.mesh,...(bridge.upper?.parts||[]),...bridge.approaches.plans.map(p=>p.mesh),...support.piers.map(p=>columnSolid(p.ring,ground,under,p.topRing))];
        let connectedComponents=null;
        if(ctx.infrastructureApi){
          const united=measure('bridge.union',()=>uniteMaterials({parts:pieces.map(p=>({...p,...CATEGORIES[bridge.category]}))},ctx.infrastructureApi),{id:bridge.id,pieces:pieces.length});
          connectedComponents=0;
          for(const part of united.parts){connectedComponents+=auditPart(part).components;append(bridge.railway?rails:roads,part);}
        }
        else for(const part of pieces)append(bridge.railway?rails:roads,part);
        stats.push({id:bridge.id,mainRoad:bridge.mainRoad,kind:bridge.mainRoad?'major-road-envelope':'mapped-bridge',generatedSurfaceAdjustmentMM:bridge.generatedSurfaceAdjustmentMM,railway:bridge.railway,surfaceRiseMM:bridge.surfaceRise,piers:support.piers,omittedPiers:support.omitted,spacingMM:support.spacing,maxSpanMM:support.maxSpanMM,maxUnsupportedSpanMM:support.maxUnsupportedSpanMM,unsupportedSpans:support.unsupportedSpans,auxiliaryPiers:support.auxiliaryPiers,layoutBasis:bridge.layout?'project span layout, aligned approximately to mapped axis':'procedural print supports',approaches:bridge.approaches.plans.map(p=>({lengthMM:p.length,initialGrade:p.grade,finalGrade:p.endGrade,startWidthMM:p.startWidthMM,endWidthMM:p.endWidthMM,targetFeatureIds:p.targetFeatureIds,routingRepairs:p.routingRepairs,sections:p.sections})),unconnectedEnds:bridge.approaches.missed,connectedComponents,estimated:true});
        }catch(error){
          // Keep an auditable deck as a partial result and report lost supports.
          if(!auditPart(bridge.mesh).errors.length)append(bridge.railway?rails:roads,bridge.mesh);
          failures.push({id:bridge.id,mainRoad:bridge.mainRoad,error:error.message});
        }
      }
      ctx.bridgeCache={key:bridgeKey,roads:{...CATEGORIES[3],vertices:new Float32Array(roads.vertices),faces:new Uint32Array(roads.faces)},railways:{...CATEGORIES[8],vertices:new Float32Array(rails.vertices),faces:new Uint32Array(rails.faces)},stats,failures};
    }
    ctx.base[3]=ctx.bridgeCache.roads;ctx.base[8]=ctx.bridgeCache.railways;
    for(const failure of ctx.bridgeCache.failures)ctx.warnings.push(`Pont ${failure.id} amb geometria parcial o omesa. ${failure.error}`);
    const stats=ctx.bridgeCache.stats,piers=stats.reduce((n,s)=>n+s.piers.length,0),connections=stats.reduce((n,s)=>n+s.approaches.length,0),omitted=stats.reduce((n,s)=>n+s.omittedPiers,0);
    if(previous.categories){
      const reason='Els nous edificis impedeixen completar els suports o els enllaços del perfil principal.';
      const rejected=new Map([
        ...stats.filter(s=>s.mainRoad&&s.unsupportedSpans?.length).map(s=>[s.id,reason]),
        ...ctx.bridgeCache.failures.filter(f=>f.mainRoad).map(f=>[f.id,f.error])
      ]);
      if(rejected.size)return buildTransport({...ctx.transportSource,meta:ctx.meta},ctx.options,ctx.terrain,progress,ctx.infrastructureApi,null,buildings,rejected);
    }
    ctx.meta={...ctx.meta,infrastructure:{...ctx.meta.infrastructure,completion:{piers,connections,omitted,estimated:true,union:!!ctx.infrastructureApi,details:stats}},majorRoads:{...ctx.meta.majorRoads,completion:stats.filter(s=>s.mainRoad)}};
    const catalogueIds=new Set(ctx.bridges.filter(b=>b.catalogue).map(b=>b.id));
    const supportNote=ctx.bridges.some(b=>b.layout&&!b.catalogue)
      ?'Rajadell segueix els trams del projecte IDEAM; la col·locació sobre l’eix i els altres suports són aproximats.'
      :catalogueIds.size?'Els viaductes del catàleg conserven la distribució de piles del projecte.':'Distribució procedimental de suports, no posicions mesurades.';
    ctx.warnings.push(`${piers} pilars simplificats i ${connections} enllaços suaus amb camins i vies. ${supportNote} S’eviten camins i edificis disponibles.`);
    const auxiliary=stats.reduce((n,s)=>n+(s.auxiliaryPiers||0),0);if(auxiliary)ctx.warnings.push(`${auxiliary} suports auxiliars afegits per reduir les llums de la maqueta; no són pilars mesurats del projecte.`);
    if(omitted)ctx.warnings.push(`${omitted} posicions de suport omeses per falta d’espai o obstacles. Revisa els trams lliures al laminador.`);
    const longSpans=stats.reduce((n,s)=>n+(catalogueIds.has(s.id)?0:s.unsupportedSpans?.length||0),0);if(longSpans)ctx.warnings.push(`${longSpans} trams elevats superen la separació prevista de suports perquè no hi ha una posició segura disponible. Comprova les llums al laminador.`);
    if(stats.some(s=>catalogueIds.has(s.id)&&s.unsupportedSpans?.length))ctx.warnings.push('El viaducte del catàleg conserva les llums reals. Comprova els suports al laminador.');
    const unconnected=stats.flatMap(s=>s.unconnectedEnds);
    for(const detail of stats)for(const end of detail.unconnectedEnds)if(end?.error)ctx.warnings.push(`Enllaç del pont ${detail.id} omès. ${end.error}`);
    const clipped=unconnected.filter(end=>end?.clippedByCrop).length;
    if(clipped)ctx.warnings.push(`El límit de la maqueta talla ${clipped} continuacions de pont abans que es puguin enllaçar suaument. Amplia o desplaça el retall per donar espai als enllaços.`);
    if(unconnected.length>clipped)ctx.warnings.push(`${unconnected.length-clipped} extrems sense enllaç suau dins del retall.`);
    if(stats.some(s=>s.connectedComponents>1))ctx.warnings.push('Alguns ponts contenen fragments separats. Revisa les unions i els extrems al laminador abans d’imprimir.');
  }
  if(!previous.categories||switchingHistory){
    preview?.parts('buildings',ctx.base,ctx);
    return updateVegetation({context:ctx},ctx.options,progress,preview);
  }
  // Keep surviving crowns and all terrain/land-cover buffers unchanged. Only
  // trees that collide with the new footprints need to disappear.
  const placements=old.placements.filter(tree=>{
    const r=Math.max(tree.rx,tree.ry)*1.06;
    return !ctx.containsBuilding([tree.x,tree.y])&&Array.from({length:12},(_,i)=>[tree.x+Math.cos(i/12*Math.PI*2)*r,tree.y+Math.sin(i/12*Math.PI*2)*r]).every(p=>!ctx.containsBuilding(p));
  });
  const categories=ctx.base.slice();
  if(placements.length===old.placements.length){const trees=previous.categories.find(p=>p.id==='trees');if(trees)categories[5]=trees;}
  else{const trees={vertices:[],faces:[]};for(const t of placements)append(trees,treeMesh(t));categories[5]={...CATEGORIES[5],vertices:new Float32Array(trees.vertices),faces:new Uint32Array(trees.faces)};}
  const budget={...old.vegetationBudget,automatic:placements.filter(p=>!p.manual).length,manual:placements.filter(p=>p.manual).length,removedForBuildings:old.placements.length-placements.length};
  if(budget.removedForBuildings)ctx.warnings.push(budget.removedForBuildings+' arbres retirats perquè coincidien amb els edificis nous. La resta conserva la posició.');
  return finishModel(ctx,ctx.options,placements,categories,budget);
}

export function updateVegetation(previous,changes={},progress=()=>{},preview){
  if(previous.reliefVegetationContext){
    progress('Actualitzant la capa de vegetació…');
    const context=previous.reliefVegetationContext;
    const options={...previous.provenance.options,...changes};
    const categories=previous.categories.filter(part=>part.id!=='trees');
    return finishReliefVegetation({...previous,categories,provenance:{...previous.provenance,options}},context);
  }
  if(!previous.context)throw Error('Cal generar primer el terreny.');const ctx={...previous.context};
  const options={...ctx.options,...changes}, {density=2.5,trees=true,treeType='mixed',strokes=[]}=options;
  if(!Number.isFinite(density)||density<.25||density>5)throw Error('Densitat fora del rang admès.');
  const {ground,containsForest,containsLand,containsRoad,containsBuilding,width,height}=ctx;
  preview?.stage('vegetation','Distribuint la vegetació…');
  progress('Actualitzant la capa de vegetació…');
  let seed=7341;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const dimensions=treeDimensions(ctx.scale),step=dimensions.spacing/Math.sqrt(density);
  const crownTaper=treeType==='mixed'?reliefCrownTaper(ctx.terrain?.maximumElevation??0):0;
  const brushDensity=options.brushDensity??density;
  if(!Number.isFinite(brushDensity)||brushDensity<.25||brushDensity>5)throw Error('Densitat del pinzell fora del rang admès.');
  const make=(x,y,manual=false,random=rand)=>{
    const rx=dimensions.radius*(.85+random()*.3),ry=dimensions.radius*(.85+random()*.3),rz=dimensions.radius*(treeType==='round'?.9+random()*.2:treeType==='tall'?1.35+random()*.25:.95+random()*.5),rotation=random()*Math.PI*2,phase=random()*Math.PI*2,r=Math.max(rx,ry)*1.06,p=[x,y];
    const contains=manual?containsLand:containsForest;
    if(x<=r||y<=r||x>=width-r||y>=height-r||!contains(p)||containsRoad(p)||containsBuilding(p)||!clearOfLandforms(ctx.activeLandforms,x,y,r))return;
    const footprint=Array.from({length:12},(_,i)=>[x+Math.cos(i/12*Math.PI*2)*r,y+Math.sin(i/12*Math.PI*2)*r]);
    if(footprint.every(q=>contains(q)&&!containsBuilding(q)&&!containsRoad(q)))return {x,y,manual,ground:ground(x,y),rx,ry,rz,rotation,phase,crownTaper};
  };
  let candidates=[],eligible=0;
  if(trees&&dimensions.visible){
    const cached=ctx.vegetationCache;
    if(cached&&cached.density===density&&cached.treeType===treeType){candidates=cached.candidates;eligible=cached.eligible;seed=cached.seed;}
    else{
      const sampler=treeSampler();
      let rows=0,row=0;
      if(preview)for(let y=step;y<height-step;y+=step)rows++;
      for(let y=step;y<height-step;y+=step,row++){
        if(preview&&row%8===0)preview.stage('vegetation','Distribuint la vegetació…',row,rows);
        for(let x=step;x<width-step;x+=step){const tree=make(x+(rand()-.5)*step,y+(rand()-.5)*step*.5);if(tree)sampler.add(tree);}
      }
      candidates=sampler.values;eligible=sampler.seen;
      ctx.vegetationCache={density,treeType,candidates,eligible,seed};
    }
  }
  let automatic=candidates.slice(),manual=[],manualDropped=0,coverage=null,coverageGesture=null,strokeIndex=-1;
  if(trees&&dimensions.visible)for(const stroke of strokes){
    strokeIndex+=1;
    if(![stroke.x,stroke.y,stroke.radius].every(Number.isFinite)||stroke.radius<=0||stroke.radius>30)continue;
    if(stroke.mode==='erase'){automatic=automatic.filter(p=>Math.hypot(p.x-stroke.x,p.y-stroke.y)>stroke.radius);manual=manual.filter(p=>Math.hypot(p.x-stroke.x,p.y-stroke.y)>stroke.radius);}
    if(stroke.mode==='add'){
      const strokeDensity=stroke.density??brushDensity;
      if(!Number.isFinite(strokeDensity)||strokeDensity<.25||strokeDensity>5)throw Error('Densitat del traç fora del rang admès.');
      const keyFor=(x,y)=>`${Math.round(x*10)},${Math.round(y*10)}`,occupied=new Set([...automatic,...manual].map(p=>keyFor(p.x,p.y)));
      const gestureId=stroke.gesture??strokeIndex;
      if(coverageGesture!==gestureId){coverage=createGestureCoverage();coverageGesture=gestureId;}
      let localSeed=(Math.round(stroke.x*1000)^Math.imul(Math.round(stroke.y*1000),73856093)^Math.imul(gestureId,19349663))>>>0;
      const random=()=>{localSeed=(1664525*localSeed+1013904223)>>>0;return localSeed/4294967296;};
      for(const [x,y]of scatterBrush({x:stroke.x,y:stroke.y,radius:stroke.radius,spacing:Math.max(1.5,dimensions.radius*2.2),density:strokeDensity,seed:localSeed})){
        if(coverage.covers(x,y))continue;
        const key=keyFor(x,y);if(occupied.has(key))continue;
        const tree=make(x,y,true,random);if(tree){manual.push(tree);occupied.add(key);}
      }
      coverage.addCircle(stroke.x,stroke.y,stroke.radius);
      if(manual.length>MAX_TREES){manualDropped+=manual.length-MAX_TREES;manual=manual.slice(-MAX_TREES);}
    }
  }
  const fitted=fitTrees(automatic,manual),{placements}=fitted;
  const vegetationBudget={limit:MAX_TREES,eligibleAutomatic:eligible,automatic:fitted.automatic,manual:fitted.manual,automaticReduced:fitted.automaticReduced,manualDropped:manualDropped+fitted.manualDropped};
  const mesh={vertices:[],faces:[]};
  let batch={vertices:[],faces:[]},lastPreview=performance.now();
  for(const [index,tree] of placements.entries()){
    if(preview&&index%128===0){
      preview.stage('vegetation','Construint les capçades…',index,placements.length);
      if(batch.faces.length&&performance.now()-lastPreview>=180){
        preview.parts('vegetation',[surfacePart(5,batch)],ctx,'append');
        batch={vertices:[],faces:[]};
        lastPreview=performance.now();
      }
    }
    const part=treeMesh(tree);
    append(mesh,part);
    if(preview)append(batch,part);
  }
  if(preview&&batch.faces.length)preview.parts('vegetation',[surfacePart(5,batch)],ctx,'append');
  const categories=ctx.base.slice();categories[5]={...CATEGORIES[5],vertices:new Float32Array(mesh.vertices),faces:new Uint32Array(mesh.faces)};
  if(preview)progress('Agrupant materials i preparant el model final…');
  return finishModel(ctx,options,placements,categories,vegetationBudget);
}
function finishModel(ctx,options,placements,categories,vegetationBudget){
  const {width,height}=ctx,dimensions=treeDimensions(ctx.scale),trees=options.trees!==false;
  ctx.options=options;ctx.placements=placements;ctx.vegetationBudget=vegetationBudget;
  const present=categories.filter(p=>p.faces.length),warnings=ctx.warnings.slice();
  if(vegetationBudget.eligibleAutomatic>MAX_TREES||vegetationBudget.automaticReduced)warnings.push('Límit de 12.000 arbres: repartits per tota la zona verda; el pinzell té prioritat.');
  if(vegetationBudget.manualDropped)warnings.push('Límit de 12.000 arbres pintats: els nous substitueixen els més antics.');
  if(trees&&!dimensions.visible)warnings.push('Arbres massa petits a aquesta escala: es conserva la superfície del bosc.');
  const raw={categories:present,width,height,treeCount:placements.length,buildingCount:ctx.buildingCount,scale:options.targetScale??Math.round(1000/ctx.scale),triangles:present.reduce((s,p)=>s+p.faces.length/3,0),warnings,elevationDiagnostics:ctx.diagnostics,provenance:{...ctx.meta,options,vegetationBudget,buildingVolumes:ctx.buildingVolumes,buildingHeightReference:'highest generated-terrain point within the clipped footprint; horizontal roof for limited/source modes',treeMode:'procedural, varied crowns embedded in the generated terrain mesh',treeRepresentation:{crownDiameterMetres:TREE_CROWN_METRES,scale:'horizontal geographic scale; no vertical exaggeration',minimumDiameterMM:MIN_TREE_MM,omittedBelowThreshold:!!trees&&!dimensions.visible,crownTaper:placements[0]?.crownTaper??0},elevation:ctx.meta.terrain?.provider||'Mapterhorn Terrarium',elevationRepairs:ctx.diagnostics,units:'millimeters',verticalExaggeration:options.exaggeration,verticalReference:ctx.verticalReference}};
  const model=groupMaterials(raw,4);for(const material of MATERIALS)if(!model.parts.some(p=>p.id===material.id))warnings.push(`${material.name}: no hi ha geometria exportable d’aquesta capa a les dades carregades.`);
  Object.defineProperty(model,'context',{value:ctx});return model;
}
