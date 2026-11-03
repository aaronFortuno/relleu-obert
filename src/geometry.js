import {polygonOps} from './polygon-ops.js';
import earcut from 'earcut';
import {sampleHeight,prepareElevationTiles,createTerrainField} from './elevation.js';
import {CATEGORIES,groupMaterials} from './materials.js';
import {polygonTester} from './polygon-index.js';
import {lineBuffer} from './roads.js';
import {isRailway,isInactiveRailway,railwayOptions,railwayWidthMetres} from './railways.js';
import {buildingOptions,buildingRise} from './building-options.js';
import {validateScale} from './selection.js';
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
import {generateProceduralTunnelVoids} from './procedural-tunnels.js';
import {carveAvailableTunnels} from './tunnel-operations.js';
import {generateMajorRoadItems,reserveProfileEnds} from './major-roads.js';
import {roadWidthMM,MIN_ROAD_WIDTH_MM} from './transport-width.js';
import {transportIdentity,compatibleTransport,continuationRoute} from './transport-network.js';
import {crossSectionFractions} from './transport-sections.js';
import {fitMajorRoadItem,knownBridgeClearance} from './major-road-fit.js';
import {carveTransportDecks} from './transport-carving.js';
export {sampleHeight} from './elevation.js';
const pc=polygonOps();

export const MATERIALS=[{id:'terrain',name:'Terreny',color:'#c6b38d'},{id:'water',name:'Aigua',color:'#8dc5ca'},{id:'built',name:'Edificis i camins',color:'#eee9dc'},{id:'green',name:'Vegetació',color:'#4e8966'}];
const area=r=>r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;
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
function* terrainPatches(polys,width,heightMM,res){
  if(!polys.length)return;
  // Clip into columns once. Intersecting a whole road network for every triangle
  // is both slow and numerically fragile; each cell then sees only local edges.
  let minX=width,minY=heightMM,maxX=0,maxY=0;for(const poly of polys)for(const [x,y]of poly[0]){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  const i0=Math.max(0,Math.floor(minX/width*res)),i1=Math.min(res-1,Math.floor(maxX/width*res)),j0=Math.max(0,Math.floor(minY/heightMM*res)),j1=Math.min(res-1,Math.floor(maxY/heightMM*res)),columns=[];
  for(let i=i0;i<=i1;i++)columns[i]=intersect(polys,[[[[i*width/res,0],[(i+1)*width/res,0],[(i+1)*width/res,heightMM],[i*width/res,heightMM],[i*width/res,0]]]]);
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
    const x=i*width/res,y=j*heightMM/res,x1=(i+1)*width/res,y1=(j+1)*heightMM/res;
    const candidates=intersect(columns[i],[[[[x,y],[x1,y],[x1,y1],[x,y1],[x,y]]]]);
    if(!candidates.length)continue;
    for(const tri of [[[x,y],[x1,y],[x1,y1],[x,y]],[[x,y],[x1,y1],[x,y1],[x,y]]]){
      yield* intersect(candidates,[[tri]]);
    }
  }
}
function solidPatches(patches,height,bottom){
  const result={vertices:[],faces:[]};for(const poly of patches){const patch=new Surface();patch.polygon(poly,height);append(result,patch.solid(bottom));}
  return {vertices:new Float32Array(result.vertices),faces:new Uint32Array(result.faces)};
}
function terrainSolid(polys,height,bottom,width,heightMM,res){
  return solidPatches(terrainPatches(polys,width,heightMM,res),height,bottom);
}
export function levelBuildingSolid(polys,rise,ground,width,height,res,profile){
  const patches=[...terrainPatches(polys,width,height,res)];let referenceGround=-Infinity;
  // Piecewise-planar terrain can peak inside the footprint, not just at its
  // original outline vertices. Reuse the actual terrain cuts to find its maximum.
  for(const poly of patches)for(const ring of poly)for(const [x,y]of ring)referenceGround=Math.max(referenceGround,ground(x,y));
  const roof=referenceGround+rise,baseOffset=profile?.baseOffsetMM??0;
  if(!Number.isFinite(baseOffset)||baseOffset<0||baseOffset>=rise)throw Error('Cota inferior d’edifici invàlida.');
  const bottom=baseOffset>0?()=>referenceGround+baseOffset:(x,y)=>ground(x,y)-.3;
  if(profile?.parts){
    const result={vertices:[],faces:[]};
    for(const ring of profile.parts){const clipped=intersect(polys,[[ring]]);append(result,solidPatches(terrainPatches(clipped,width,height,res),(x,y)=>roof-profile.heightMM+profile.heightMM*profile.factor(x,y),bottom));}
    return {vertices:new Float32Array(result.vertices),faces:new Uint32Array(result.faces),roof,referenceGround,roofShape:profile.shape};
  }
  return {...solidPatches(patches,()=>roof,bottom),roof,referenceGround};
}
function append(target,mesh){const offset=target.vertices.length/3;for(const v of mesh.vertices)target.vertices.push(v);for(const i of mesh.faces)target.faces.push(i+offset);}
// The official IFC contains surveyed deck TOP surfaces, despite naming its
// open shells IFCCLOSEDSHELL. Preserve those Z values and give each clipped
// surface a documented printable thickness; do not invent engineering piers.
export function deckSurfaceSolid(item,proj,verticalReference,exaggeration,thickness=.6,lift=0){
  const points=projectInfrastructurePath(item.coordinates,proj,verticalReference,exaggeration).map(([x,y,z])=>[x,y,z+lift]),surface=new Surface(),rect=box(proj.width,proj.height);
  if(!Array.isArray(item.faces)||item.faces.length%3||item.faces.some(i=>!Number.isSafeInteger(i)||i<0||i>=points.length)||!Number.isFinite(thickness)||thickness<=0)throw Error('Superfície de pont invàlida.');
  for(let i=0;i<item.faces.length;i+=3){
    const p=item.faces.slice(i,i+3).map(j=>points[j]);let [a,b,c]=p;
    const det=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(det)<1e-12)continue;
    if(det<0){[b,c]=[c,b];p[1]=b;p[2]=c;}
    if(p.every(([x,y])=>x>=0&&y>=0&&x<=proj.width&&y<=proj.height)){surface.tri(...p);continue;}
    const clipped=intersect([[p.map(v=>v.slice(0,2)).concat([a.slice(0,2)])]],rect);
    const dz=(x,y)=>{const u=((x-a[0])*(c[1]-a[1])-(y-a[1])*(c[0]-a[0]))/Math.abs(det),v=((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/Math.abs(det);return a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]);};
    for(const poly of clipped)surface.polygon(poly,dz);
  }
  return surface.solid((x,y,z)=>z-thickness);
}
export function treeMesh({x,y,ground,rx,ry,rz,rotation=0,phase=0}){
  const surf=new Surface(),rings=6,segments=8,embed=Math.min(.3,rz*.35),z=ground+rz-embed;
  const p=(i,j)=>{const v=i/rings*Math.PI,u=j/segments*Math.PI*2,w=1+.05*Math.cos(3*u+phase)*Math.sin(v),dx=rx*Math.sin(v)*Math.cos(u)*w,dy=ry*Math.sin(v)*Math.sin(u)*w;return [x+dx*Math.cos(rotation)-dy*Math.sin(rotation),y+dx*Math.sin(rotation)+dy*Math.cos(rotation),z+rz*Math.cos(v)];};
  for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){surf.tri(p(i,j),p(i+1,j),p(i+1,j+1));surf.tri(p(i,j),p(i+1,j+1),p(i,j+1));}
  return {vertices:surf.vertices,faces:surf.faces};
}
function prepareTerrain(data,options,progress,preview,measure){
  const {size=160,exaggeration=1.5,density=2.5,resolution=36}=options,proj=makeProjection(data.meta.bbox,size,options),{width,height,project,scale}=proj,rect=box(width,height),warnings=[];
  if(!Number.isFinite(density)||density<.25||density>5||!Number.isInteger(resolution)||resolution<2||resolution>100||!Number.isFinite(exaggeration)||exaggeration<1||exaggeration>5||!Number.isFinite(size)||size<50||size>450||width>450||height>450)throw Error('Els ajustos de la maqueta són fora del rang admès.');
  if(options.targetScale!=null&&Math.abs(1000/scale-validateScale(options.targetScale))>options.targetScale*1e-6)throw Error('El retall no concorda amb l’escala demanada. Torna a seleccionar la regió.');
  preview?.stage('terrain','Revisant les mostres d’altitud…');
  const prepared=data.localDEM?{tiles:[],diagnostics:{invalid:0,spikes:0,repaired:0,source:'local GeoTIFF'}}:prepareElevationTiles(data.dem),localHeight=data.localDEM?localRasterSampler(data.localDEM):null;
  const elevationAt=(lon,lat)=>localHeight?localHeight(lon,lat):sampleHeight(prepared.tiles,lon,lat);
  if(prepared.diagnostics.repaired)warnings.push(`S’han reconstruït ${prepared.diagnostics.repaired} mostres d’altitud invàlides o pics aïllats a partir dels veïns.`);
  const water=[],ocean=[],green=[],woods=[],roads=[],rails=[],transport=[],roadPieces=[],railPieces=[];
  const knownItems=[],knownFootprints=[];
  const deckFootprint=item=>intersect(item.outlines.map(r=>[r.map(project)]),rect);
  for(const item of data.infrastructure?.items||[]){
    try{
      const footprint=deckFootprint(item);
      if(footprint.length){knownItems.push(item);knownFootprints.push(footprint);}
    }catch(error){warnings.push(`Pont ${item.id} omès: ${error.message}`);}
  }
  const knownMask=merge(knownFootprints);
  const validLine=line=>Array.isArray(line)&&line.length>=2&&line.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
  const overlapsKnown=line=>knownMask.length&&validLine(line)&&intersect(lineBuffer(line.map(project),.05,[width,height]),knownMask).length;
  const candidates=[],incompleteBridges=new Set(data.incompleteBridgeIds);
  for(const f of [...data.features,...(data.bridgeFeatures||[])])if(f.properties?.sourceLayer==='transportation'&&f.properties.brunnel==='bridge'&&!isInactiveRailway(f.properties)&&!incompleteBridges.has(f.id)&&f.geometry.type.includes('LineString')){
    const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
    for(const line of lines)if(!overlapsKnown(line))candidates.push({...f,geometry:{type:'LineString',coordinates:line}});
  }
  const bridgeTiles=data.bridgeDem?.length?[...prepared.tiles,...prepareElevationTiles(data.bridgeDem).tiles]:null;
  const bridgeElevation=bridgeTiles?(lon,lat)=>sampleHeight(bridgeTiles,lon,lat):elevationAt;
  preview?.stage('terrain','Identificant els traçats dels ponts…');
  const generated=generateProceduralBridgeItems(candidates,bridgeElevation,{scale,bbox:data.meta.bbox});warnings.push(...generated.warnings);
  const deckItems=knownItems.slice(),deckFootprints=knownFootprints.slice();
  for(const item of generated.items){
    try{
      const footprint=deckFootprint(item);
      if(footprint.length){deckItems.push(item);deckFootprints.push(footprint);}
    }catch(error){warnings.push(`Pont ${item.id} omès: ${error.message}`);}
  }
  const deckMask=merge(deckFootprints);
  for(const [featureIndex,f]of data.features.entries()){const p=f.properties,layer=p.sourceLayer,polys=layer==='building'?[]:geoPolys(f,project);
    if(preview&&featureIndex%128===0)preview.stage('terrain','Classificant la cartografia del retall…',featureIndex,data.features.length);
    if(layer==='water'){water.push(...polys.map(p=>[p]));if(p.class==='ocean')ocean.push(...polys.map(p=>[p]));}
    if((layer==='landcover'&&['wood','grass','scrub'].includes(p.class))||(layer==='landuse'&&['park','forest','grass','cemetery','recreation_ground'].includes(p.class)))green.push(...polys.map(p=>[p]));
    if(['wood','forest','scrub'].includes(p.class))woods.push(...polys.map(p=>[p]));
    if(layer==='transportation'&&!isInactiveRailway(p)&&f.geometry.type.includes('LineString')){
      const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
      const railway=isRailway(p),r=railway?Math.max(.22,railwayWidthMetres(p)*scale/2):roadWidthMM(p,scale)/2;
      for(const line of lines){
        if(!validLine(line)){
          warnings.push(`Via ${f.id??featureIndex} omesa: traçat invàlid.`);
          continue;
        }
        const points=line.map(project);
        const identity=transportIdentity(p,f.id??featureIndex);
        transport.push({...identity,identity,properties:p,points,class:railway?'rail':p.class,brunnel:p.brunnel,width:r*2,railway});
        if(p.brunnel==='tunnel')continue;
        let buffers;
        try{
          if(p.brunnel==='bridge'&&intersect(lineBuffer(points,.05,[width,height]),deckMask).length)continue;
          buffers=lineBuffer(points,r,[width,height]);
        }
        catch(error){warnings.push(`Via ${f.id??featureIndex} omesa: ${error.message}`);continue;}
        if(railway){rails.push(...buffers.map(p=>[p]));railPieces.push({id:f.id??featureIndex,polys:buffers});}
        else{roads.push(...buffers.map(p=>[p]));roadPieces.push({id:f.id??featureIndex,polys:buffers});}
      }
    }
  }
  progress('Delimitant costa i capes…');
  const cropped=polys=>polys.map(p=>intersect(p,rect)).filter(p=>p.length);
  const boundedRoads=polys=>polys.map(p=>p.every(poly=>poly.every(ring=>ring.every(([x,y])=>x>=0&&x<=width&&y>=0&&y<=height)))?p:intersect(p,rect)).filter(p=>p.length);
  const waterPoly=measure('terrain.water',()=>merge(cropped(water)),{inputs:water.length}),land=subtract(rect,waterPoly);
  const railPoly=measure('terrain.railways',()=>intersect(mergeLayer(boundedRoads(rails)),land),{inputs:rails.length});
  const roadOnlyPoly=measure('terrain.roads',()=>subtract(intersect(mergeLayer(boundedRoads(roads)),land),railPoly),{inputs:roads.length});
  const roadPoly=merge([roadOnlyPoly,railPoly].filter(p=>p.length));
  const greenLand=measure('terrain.green-union',()=>intersect(merge(cropped(green)),land),{inputs:green.length});
  const forest=measure('terrain.green-minus-roads',()=>subtract(greenLand,roadPoly));
  const bare=measure('terrain.bare',()=>subtract(subtract(land,roadPoly),forest));
  const oceanPoly=merge(cropped(ocean)),hasOcean=oceanPoly.length>0;
  progress('Calculant el camp d’altures…');
  const field=createTerrainField({width,height,resolution,at:(x,y)=>{const[lon,lat]=proj.unproject([x,y]);const h=localHeight?localHeight(lon,lat):sampleHeight(prepared.tiles,lon,lat);return hasOcean?Math.max(0,h):h;}});
  let originMeters=Infinity;for(const h of field.values)originMeters=Math.min(originMeters,h);
  if(hasOcean)originMeters=0;
  const verticalReference={originMeters,minimumSurfaceMM:5,seaLevelMM:hasOcean?5:null,method:hasOcean?'sea level at 5 mm; no bathymetry':'lowest generated-terrain sample at 5 mm'};
  for(let i=0;i<field.values.length;i++)field.values[i]=5+(field.values[i]-originMeters)*scale*exaggeration;
  const ground=field.sample;
  const terrain={size,exaggeration,resolution,proj,rect,warnings,elevationAt,deckItems,deckMask,transport,roadPieces,railPieces,
    roadOnlyPoly,roadPoly,forest,bare,railPoly,waterPoly,land,oceanPoly,green,cropped,ground,verticalReference,diagnostics:prepared.diagnostics,
    woodsMask:measure('terrain.woods',()=>merge(cropped(woods)),{inputs:woods.length})};
  terrain.surfaces=measure('terrain.surfaces',()=>terrainCover(forest,bare,terrain,progress));
  const sea=new Surface();
  for(const polygon of oceanPoly)sea.polygon(polygon,()=>5);
  terrain.surfaces[1]=surfacePart(1,sea.solid(()=>0));
  terrain.surfaces[7]=surfacePart(7,terrainSolid(subtract(waterPoly,oceanPoly),(x,y)=>Math.max(3,ground(x,y)-.3),()=>0,width,height,resolution));
  return terrain;
}

function terrainCover(forest,bare,terrain,progress){
  const {ground,land,woodsMask,proj:{width,height},resolution}=terrain;
  const base={vertices:[],faces:[]};
  progress('Construint superfícies amb límits vectorials…');
  append(base,terrainSolid(land,(x,y)=>ground(x,y)-.65,()=>0,width,height,resolution));
  append(base,terrainSolid(bare,ground,(x,y)=>ground(x,y)-.65,width,height,resolution));
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
  const {ground,proj:{width,height},resolution}=terrain;
  return surfacePart(index,terrainSolid(polygons,(x,y)=>ground(x,y)+rise,(x,y)=>ground(x,y)-.65,width,height,resolution));
}

export function buildModel(data,options={},progress=()=>{},infrastructureApi=null,diagnostics=null,preview){
  preview?.stage('terrain','Preparant el relleu…');
  const terrain=prepareTerrain(data,options,progress,preview,phaseTimer(diagnostics));
  preview?.parts('terrain',terrain.surfaces,terrain.proj);
  return buildTransport(data,options,terrain,progress,infrastructureApi,diagnostics,undefined,undefined,preview);
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

function buildTransport(data,options,terrain,progress,infrastructureApi,diagnostics,buildingGeometry,excludedProfiles=new Map(),preview){
  preview?.stage('transport','Calculant les vies…');
  const measure=phaseTimer(diagnostics);
  const {size,exaggeration,resolution,proj,rect,elevationAt,transport,roadPieces,railPieces,waterPoly,land,green,cropped,ground,verticalReference}=terrain;
  const {width,height,project,scale}=proj,{originMeters}=verticalReference;
  const warnings=terrain.warnings.slice(),deckItems=terrain.deckItems.slice();
  let {deckMask,roadOnlyPoly,railPoly,roadPoly,forest,bare}=terrain;
  let containsDeck=polygonTester(deckMask);
  const mappedDeckMask=deckMask,sourceRoadPoly=roadPoly;
  const roadRise=options.roadRise??0;
  if(![0,.5,1].includes(roadRise))throw Error('Relleu dels camins invàlid.');
  const {railRise}=railwayOptions(options);
  const knownItems=data.infrastructure?.items||[];
  const knownCrossingSources=knownItems.filter(item=>!item.estimated).map(item=>({item,contains:polygonTester(item.outlines.map(r=>[r.map(project)]))}));
  const representedElevationAt=(lon,lat)=>{
    const [x,y]=project([lon,lat]);if(x<0||y<0||x>width||y>height)return elevationAt(lon,lat);
    return originMeters+(ground(x,y)-5)/(scale*exaggeration);
  };
  const majorRoadsEnabled=options.majorRoads===true;
  if(majorRoadsEnabled)progress('Calculant els perfils de les vies principals…');
  const majorPlan=majorRoadsEnabled&&infrastructureApi?generateMajorRoadItems(data.features,elevationAt,{projection:proj,bbox:data.meta.bbox,roi:rect,renderedElevationAt:representedElevationAt,allowEndpointLift:true,smoothProfiles:options.smoothProfiles===true,maxLiftMetres:30,allowCrossing:(other,p)=>other.properties?.brunnel==='bridge'&&knownCrossingSources.some(source=>source.contains(p)&&!!source.item.railway===isRailway(other.properties))}):{items:[],metadata:{count:0,terrainModified:false},warnings:[]};
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
      const item=options.smoothProfiles?reserveProfileEnds(profile,proj):profile;
      if(!item){
        majorOmissions.push({sourceFeatureIds:profile.sourceFeatureIds,reason:'espai o pendent insuficients per enllaçar amb la via sobre el terreny'});
        continue;
      }
      const fit=fitMajorRoadItem(item,{projection:proj,verticalReference,exaggeration,ground,maxLiftMetres:30,patches:polys=>terrainPatches(intersect(polys,land),width,height,resolution)});
      const clearance=fit.accepted?knownBridgeClearance(item,fit,knownCrossingSources.map(p=>p.item),{projection:proj,verticalReference,exaggeration,roadRise,railRise}):null;
      if(fit.accepted&&clearance.accepted){
        let terminalApproaches;
        if(item.terminalRoutes){
          const identity=transportIdentity({class:item.roadClass,ref:item.ref,name:item.name,oneway:item.oneway,layer:item.layer,railway:item.railway,sourceFeatureIds:item.sourceFeatureIds});
          const surfaceRise=roadRise+(item.railway?railRise:0),axis=item.axis.map(project);
          axis.identity=identity;
          const points=projectInfrastructurePath(item.coordinates,proj,verticalReference,exaggeration).map(([x,y,z])=>[x,y,z+surfaceRise+fit.adjustmentMM]);
          const containsDeck=polygonTester(intersect(item.outlines.map(r=>[r.map(project)]),rect));
          const terminalRoads=item.terminalRoutes.map(path=>path&&({...identity,points:path,width:Math.max(.44,item.sourceWidthMetres*scale)}));
          terminalApproaches=planApproaches({axis,points,faces:item.faces,containsDeck,roads:[],ground,
            destinationBreaks:section=>crossSectionFractions(section,{fieldWidth:width,fieldHeight:height,resolution}),
            forceConnections:true,roadRise:surfaceRise,scale,widthMM:width,heightMM:height,roadWidth:item.widthMetres*scale,
            terminalRoads,maxGrade:item.maxGrade*exaggeration});
          if(terminalApproaches.missed.length){
            majorOmissions.push({sourceFeatureIds:item.sourceFeatureIds,reason:'espai o pendent insuficients per enllaçar amb la via sobre el terreny',ends:terminalApproaches.missed});
            continue;
          }
        }
        acceptedMajor.push({...item,terminalApproaches,generatedSurfaceAdjustmentMM:fit.adjustmentMM,maximumPrintedLiftMetres:fit.maximumPrintedLiftMetres,checkedCrossings:clearance.checkedCrossings,knownCrossingClearanceMM:Number.isFinite(clearance.minimumClearanceMM)?clearance.minimumClearanceMM:null});
      }
      else if(fit.accepted)majorOmissions.push({sourceFeatureIds:item.sourceFeatureIds,reason:clearance.reason});
      else if(fit.present)majorOmissions.push({sourceFeatureIds:item.sourceFeatureIds,reason:fit.reason});
    }catch(error){majorOmissions.push({sourceFeatureIds:item.sourceFeatureIds,reason:error.message});}
  }
  let majorMetadata={...majorPlan.metadata,enabled:majorRoadsEnabled,applied:false,count:acceptedMajor.length,omissions:[...(majorPlan.metadata.omissions||[]),...majorOmissions],omitted:(majorPlan.metadata.omitted||0)+majorOmissions.length};
  warnings.push(...majorPlan.warnings,...majorOmissions.map(p=>'Perfil principal omès: '+p.reason));
  if(acceptedMajor.length){
    progress('Integrant les vies principals amb les capes…');
    function remainingSurface(pieces,profiles){
      if(!profiles.length)return pieces.flatMap(piece=>piece.polys);
      const mask=measure('major.masks',()=>merge(profiles.flatMap(item=>item.outlines.map(r=>intersect([[r.map(project)]],land))).filter(p=>p.length)));
      const ids=new Set(profiles.flatMap(item=>item.sourceFeatureIds));
      return measure('major.road-differences',()=>pieces.flatMap(p=>ids.has(p.id)?subtract(p.polys,mask):p.polys),{pieces:pieces.length,profiles:profiles.length});
    }
    const railProfiles=acceptedMajor.filter(item=>item.railway);
    const remaining=remainingSurface(roadPieces,acceptedMajor.filter(item=>!item.railway));
    if(railProfiles.length)railPoly=intersect(merge(remainingSurface(railPieces,railProfiles).map(p=>[p])),land);
    measure('major.road-coverage',()=>{
      roadOnlyPoly=subtract(intersect(merge(remaining.map(p=>[p])),land),terrain.railPoly);
      roadPoly=merge([roadOnlyPoly,railPoly].filter(p=>p.length));
    });
    measure('major.land-coverage',()=>{forest=subtract(intersect(merge(cropped(green)),land),roadPoly);bare=subtract(subtract(land,roadPoly),forest);});
    deckItems.push(...acceptedMajor);
    deckMask=merge([deckMask,...acceptedMajor.flatMap(item=>item.outlines.map(r=>intersect([[r.map(project)]],land)))].filter(p=>p.length));
    containsDeck=polygonTester(deckMask);
  }
  const fallbackMajor=message=>{
    const restored=measure('major.fallback',()=>buildTransport(data,{...options,majorRoads:false},terrain,progress,infrastructureApi,diagnostics,buildingGeometry,undefined,preview),{reason:message});restored.warnings.unshift(message);
    restored.provenance.majorRoads={...majorMetadata,attempted:majorMetadata.count,count:0,applied:false,error:message};
    restored.context.meta.majorRoads=restored.provenance.majorRoads;
    restored.context.options.majorRoads=options.majorRoads;
    restored.provenance.options.majorRoads=options.majorRoads;
    return restored;
  };
  const recoverProfiles=(ids,message)=>{
    if(excludedProfiles.size||ids.length>=acceptedMajor.length)return fallbackMajor(message);
    return buildTransport(data,options,terrain,progress,infrastructureApi,diagnostics,buildingGeometry,new Map(ids.map(id=>[id,message])),preview);
  };
  let staticBase=terrain.surfaces.slice();
  if(acceptedMajor.length){
    const cover=terrainCover(forest,bare,terrain,progress);
    for(const index of [0,4,6])staticBase[index]=cover[index];
  }
  if(preview)progress('Triangulant carreteres i ferrocarrils…');
  staticBase[3]=roadSurface(3,roadOnlyPoly,roadRise,terrain);
  staticBase[8]=roadSurface(8,railPoly,roadRise+railRise,terrain);
  preview?.parts('transport',staticBase,proj);
  const bridges=[];
  let publishedDecks=0,lastDeckPreview=performance.now();
  for(const [index,item] of deckItems.entries()){
    preview?.stage('transport','Construint els taulers…',index,deckItems.length);
    if(preview&&publishedDecks<bridges.length&&performance.now()-lastDeckPreview>=180){
      preview.parts('transport',bridges.slice(publishedDecks).map(b=>({...CATEGORIES[b.category],...b.mesh})),proj,'append');
      publishedDecks=bridges.length;
      lastDeckPreview=performance.now();
    }
    try{
    const mask=intersect(item.outlines.map(r=>[r.map(project)]),rect),contains=polygonTester(mask);
    const matches=transport.filter(t=>t.brunnel==='bridge').map(t=>({t,score:t.points.slice(1).reduce((n,p,i)=>n+(contains([(p[0]+t.points[i][0])/2,(p[1]+t.points[i][1])/2])?Math.hypot(p[0]-t.points[i][0],p[1]-t.points[i][1]):0),0)})).sort((a,b)=>b.score-a.score);
    const railway=!!(item.railway??(matches[0]?.score>0&&matches[0].t.railway));
    const surfaceRise=roadRise+(railway?railRise:0),thickness=.6+surfaceRise,category=railway?8:3;
    // Extra platform is added above the source top. The underside and pier
    // abutment are independent of the visual railway rise.
    const lift=surfaceRise+(item.generatedSurfaceAdjustmentMM||0),mesh=deckSurfaceSolid(item,proj,verticalReference,exaggeration,thickness,lift);if(!mesh.faces.length)continue;
    const points=projectInfrastructurePath(item.coordinates,proj,verticalReference,exaggeration).map(([x,y,z])=>[x,y,z+lift]),top=topSampler(points,item.faces);
    let axis=item.axis?.map(project)||(matches[0]?.score>0?matches[0].t.points:null);
    if(!axis){const center=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]),xx=points.reduce((n,p)=>n+(p[0]-center[0])**2,0),yy=points.reduce((n,p)=>n+(p[1]-center[1])**2,0),xy=points.reduce((n,p)=>n+(p[0]-center[0])*(p[1]-center[1]),0),angle=Math.atan2(2*xy,xx-yy)/2,d=[Math.cos(angle),Math.sin(angle)],positions=points.map(p=>(p[0]-center[0])*d[0]+(p[1]-center[1])*d[1]);axis=[Math.min(...positions),Math.max(...positions)].map(s=>[center[0]+s*d[0],center[1]+s*d[1]]);}
    axis=axis.slice();axis.roadClass=item.roadClass||matches[0]?.t.class;
    const identity=!item.sourceFeatureIds?.length&&matches[0]?.score>0?{...matches[0].t.identity}:transportIdentity({class:item.roadClass,ref:item.ref,name:item.name,oneway:item.oneway,layer:item.layer,railway},null);
    if(item.sourceFeatureIds?.length)identity.sourceFeatureIds=item.sourceFeatureIds;
    const roadWidth=item.mainRoad?item.widthMetres*scale:matches[0]?.t.width||.44;
    const layout=data.infrastructure?.layouts?.items?.[item.id],pierAxis=layout?.start==='south'&&proj.unproject(axis[0])[1]>proj.unproject(axis.at(-1))[1]?axis.slice().reverse():axis;
    pierAxis.identity=identity;pierAxis.roadClass=axis.roadClass;
    bridges.push({id:item.id,mesh,axis:pierAxis,points,sourceFaces:item.faces,identity,roadWidth,top,mask,contains,approaches:item.terminalApproaches||{plans:[],missed:[]},terminalApproaches:!!item.terminalApproaches,layout,railway,category,thickness,surfaceRise,mainRoad:!!item.mainRoad,generatedSurfaceAdjustmentMM:item.generatedSurfaceAdjustmentMM||0,maximumPrintedLiftMetres:item.maximumPrintedLiftMetres,estimated:!!item.estimated,elevationMethod:item.elevationMethod,widthMetres:item.widthMetres,sourceFeatureIds:item.sourceFeatureIds});
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
      const own=new Set(bridge.sourceFeatureIds),pieces=bridge.railway?railPieces:roadPieces;
      const other=pieces.flatMap(p=>own.has(p.id)?subtract(p.polys,bridge.mask):p.polys);
      return merge([...other.map(p=>[p]),bridge.railway?terrain.roadOnlyPoly:terrain.railPoly,mappedDeckMask].filter(p=>p.length));
    },{id:bridge.id}));
  }
  const matchesLine=(structure,line)=>{
    if(!line)return false;
    const ids=new Set((structure.sourceFeatureIds||structure.identity?.sourceFeatureIds||[]).map(String));
    return (line.sourceFeatureIds||line.identity?.sourceFeatureIds||[]).some(id=>ids.has(String(id)));
  };
  const exteriorSurface=(x,y,railway,properties={},routeLine=null,excludedID=null)=>{
    const identity=transportIdentity(properties);
    for(const bridge of bridges)if(bridge.id!==excludedID&&bridge.railway===railway&&matchesLine(bridge,routeLine)&&compatibleTransport(identity,bridge.identity)){const z=bridge.top(x,y);if(z!=null)return z;}
    return ground(x,y)+roadRise+(railway?railRise:0);
  };
  const exteriorBreaks=section=>{
    const fractions=crossSectionFractions(section,{fieldWidth:width,fieldHeight:height,resolution});
    for(const bridge of bridges)if(matchesLine(bridge,section.line))fractions.push(...crossSectionFractions(section,{points:bridge.points,faces:bridge.sourceFaces}));
    return fractions;
  };
  if(preview&&options.estimatedTunnels)progress('Calculant els traçats i portals dels túnels…');
  const tunnelVoids=generateProceduralTunnelVoids(data.features,elevationAt,{enabled:options.estimatedTunnels===true,projection:proj,verticalReference,exaggeration,ground,surfaceRiseMM:roadRise,railSurfaceRiseMM:roadRise+railRise,waterMask:waterPoly,surfaceAt:exteriorSurface,surfaceBreaks:exteriorBreaks,portalRoute:({point,outward,properties,sourceFeatureIds,maxLengthMM})=>{
    const own=new Set(sourceFeatureIds),lines=transport.filter(t=>t.brunnel!=='tunnel'&&!t.sourceFeatureIds?.some(id=>own.has(id)));
    const route=continuationRoute(point,outward,lines,transportIdentity(properties),maxLengthMM,{allowStructures:true});return route.segments.length?route:null;
  }});
  warnings.push(...tunnelVoids.warnings);
  const deckCount=bridges.length;
  const proceduralCount=bridges.filter(b=>b.estimated&&!b.mainRoad).length,knownCount=bridges.filter(b=>!b.estimated).length;
  if(knownCount)warnings.push(`${knownCount} taulers amb cota de la font específica. Pilars i enllaços simplificats per imprimir. El datum vertical de l’ICGC no s’ha transformat al del relleu.`);
  if(proceduralCount)warnings.push(`${proceduralCount} ponts procedimentals: perfil estimat entre les cotes DEM dels extrems cartografiats, sense seguir el fons de la vall. No són altures mesurades de l’estructura.`);
  if(railPoly.length||bridges.some(b=>b.railway))warnings.push(`Ferrocarrils realçats ${railRise.toLocaleString('ca')} mm sobre el nivell dels camins; és una plataforma simplificada de la maqueta, no una cota real.`);
  if(roadRise)warnings.push(`Camins realçats ${roadRise.toLocaleString('ca')} mm sobre el terreny; és un efecte de la maqueta, no una altura real.`);
  const majorDecks=bridges.filter(b=>b.mainRoad);
  if(majorDecks.length){
    progress('Assignant el paviment de les vies principals…');const carved=measure('major.material-replacement',()=>carveTransportDecks(staticBase,majorDecks,infrastructureApi));
    if(!carved.metadata.applied)return fallbackMajor(carved.warnings.join(' '));
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
    if(carved.metadata.applied)for(const bridge of majorDecks){
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
  if(preview&&bridges.length)progress('Calculant els enllaços dels ponts…');
  for(const bridge of bridges){
    if(bridge.terminalApproaches)continue;
    try{
    const destination=(x,y,line)=>{
      for(const floor of floorTargets)if(floor.railway===bridge.railway&&matchesLine(floor,line)&&compatibleTransport(bridge.identity,floor.identity)){const z=floor.top(x,y);if(z!=null)return z-bridge.surfaceRise;}
      return exteriorSurface(x,y,bridge.railway,bridge.identity,line,bridge.id)-bridge.surfaceRise;
    };
    const own=new Set(bridge.sourceFeatureIds||bridge.identity.sourceFeatureIds),lines=transport.filter(t=>t.railway===bridge.railway&&!t.sourceFeatureIds?.some(id=>own.has(id))&&(t.brunnel!=='tunnel'||floorTargets.some(f=>matchesLine(f,t))));
    const destinationBreaks=section=>{
      const fractions=exteriorBreaks(section);
      for(const floor of floorTargets)if(matchesLine(floor,section.line))fractions.push(...crossSectionFractions(section,{points:floor.points,faces:floor.faces}));
      return fractions;
    };
    bridge.approaches=planApproaches({axis:bridge.axis,points:bridge.points,faces:bridge.sourceFaces,containsDeck:bridge.contains,roads:lines,ground,destinationSurface:destination,destinationBreaks,forceConnections:true,roadRise:bridge.surfaceRise,scale,widthMM:width,heightMM:height,roadWidth:bridge.roadWidth});
    }catch(error){bridge.approaches.missed.push({reason:'invalid approach pavement',error:error.message});}
  }
  warnings.push('Els arbres són una representació procedimental dins de zones verdes, no posicions d’arbres mesurades.');
  warnings.push('Les tessel·les vectorials estan generalitzades. Aquesta prova no substitueix cartografia topogràfica de precisió.');
  const containsGroundRoad=polygonTester(roadPoly),approachMask=merge(bridges.flatMap(b=>b.approaches.plans.map(p=>intersect(p.footprint,rect))).filter(p=>p.length)),containsApproach=polygonTester(approachMask);
  const context={ground,verticalReference,proj,rect,forest,land,roadPoly,roadOnlyPoly,railPoly,waterPoly,bridges,tunnelMask,infrastructureApi,containsForest:polygonTester(forest),containsLand:polygonTester(land),containsRoad:p=>containsDeck(p)||containsApproach(p)||containsGroundRoad(p),width,height,scale,staticWarnings:warnings,options:{...options,size,exaggeration,resolution,roadRise,railRise},meta:{...data.meta,tunnels:tunnelMetadata,railways:{incrementMM:railRise,surfaceRiseMM:roadRise+railRise,method:'cartographic railway platform; physical millimetres, no vertical exaggeration',groundPresent:railPoly.length>0,bridges:bridges.filter(b=>b.railway).length},infrastructure:deckCount?{...data.infrastructure,provider:knownCount?'Specific overrides and estimated transport platforms':'Estimated transport platforms from OSM/DEM',items:undefined,count:deckCount,knownCount,proceduralCount,deckProfiles:bridges.map(b=>({id:b.id,mainRoad:b.mainRoad,generatedSurfaceAdjustmentMM:b.generatedSurfaceAdjustmentMM,estimated:b.estimated,elevationMethod:b.elevationMethod,widthMetres:b.widthMetres,sourceFeatureIds:b.sourceFeatureIds,railway:b.railway,surfaceRiseMM:b.surfaceRise,printableThicknessMM:b.thickness})),printableThicknessMM:.6+roadRise,railwayPrintableThicknessMM:bridges.some(b=>b.railway)?.6+roadRise+railRise:undefined}:null},diagnostics:terrain.diagnostics,staticBase,terrain,transportSource:{infrastructure:data.infrastructure,features:data.features},buildingGeometry,buildingFeatures:buildingGeometry?.features??data.features};
  context.meta.majorRoads=majorMetadata;
  context.meta.transportContinuity={widthPolicy:'mapped width, then lanes, then road class; scale-sensitive floor; independent of structural deck and bore',minimumCarriagewayMM:MIN_ROAD_WIDTH_MM,connections:bridges.map(b=>({id:b.id,identity:b.identity,carriagewayWidthMM:b.roadWidth,joins:b.approaches.plans.map(p=>({startWidthMM:p.startWidthMM,endWidthMM:p.endWidthMM,targetFeatureIds:p.targetFeatureIds,routingRepairs:p.routingRepairs})),unconnectedEnds:b.approaches.missed})),portals:openedTunnels.flatMap(t=>t.portalConnections||[])};
  if(context.meta.infrastructure)context.meta.infrastructure.mainRoadCount=majorDecks.length;
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

function prepareBuildingGeometry(ctx,config,progress,preview){
  const {buildingMode,maxBuildingHeight}=config;
  const {width,height,ground,scale,rect,land,options}=ctx,res=options.resolution;
  const mesh={vertices:[],faces:[]},warnings=[],prepared=[],seen=new Set(),volumes=[];
  let buildingCount=0,approximate=0,limited=0,shapedRoofs=0,fallbackRoofs=0,omitted=0,duplicates=0;
  progress('Actualitzant la capa d’edificis…');
  const features=ctx.buildingFeatures.filter(f=>f?.properties?.sourceLayer==='building'&&!f.properties.hide_3d);
  let batch={vertices:[],faces:[]},lastPreview=performance.now();
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
        const inside=intersect([poly],rect);
        if(buildingMode==='none'){footprints.push(...inside);continue;}
        const polys=intersect(inside,land).filter(p=>Math.abs(area(p[0]))>=.04);if(!polys.length)continue;
        const rise=buildingRise(valid?h:6,scale,config);
        const profile=buildingMode==='source'?roofProfile(p,poly[0],scale,valid?h:6,options.selectionPose?.rotation||0):null;
        const solid=buildingMode==='flat'?terrainSolid(polys,(x,y)=>ground(x,y)+rise,(x,y)=>ground(x,y)-.3,width,height,res):levelBuildingSolid(polys,rise,ground,width,height,res,profile);
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
  try{mask=merge(prepared.flatMap(b=>b.footprints.map(poly=>[poly])));}
  catch{
    mask=[];accepted=[];
    for(const building of prepared){
      try{
        mask=merge([mask,...building.footprints.map(poly=>[poly])].filter(p=>p.length));
        accepted.push(building);
      }catch{omitted++;}
    }
  }
  for(const {p,id,h,valid,fragments}of accepted){
    for(const {solid,profile,count}of fragments){
      if(profile?.parts)shapedRoofs++;if(profile?.fallback)fallbackRoofs++;
      append(mesh,solid);buildingCount+=count;if(p.height_estimated||!valid)approximate+=count;if(buildingMode==='limited'&&h>maxBuildingHeight)limited+=count;
      volumes.push({id:id??null,family:p.family??null,fragments:count,roof:solid.roof??null,roofShape:solid.roofShape||'flat',roofFallback:profile?.fallback||null,roofSource:p.roofSource||null,roofMetadata:profile?.metadata||null,baseOffsetMM:profile?.baseOffsetMM||0,estimated:!!p.height_estimated||!valid});
    }
  }
  if(omitted)warnings.push(`Edificis omesos per geometria invàlida: ${omitted}.`);
  if(duplicates)warnings.push(`Còpies d’edificis omeses: ${duplicates}. Es conserva una petjada per còpia.`);
  if(approximate)warnings.push(approximate+' fragments d’edificis amb alçària estimada; consulta la procedència de la font.');
  if(buildingMode==='limited')warnings.push('Edificis amb coberta horitzontal, com a màxim '+maxBuildingHeight+' m reals sobre el punt més alt de la petjada. La façana del costat baix pot superar aquest valor. '+limited+' fragments limitats en altura.');
  if(buildingMode==='source')warnings.push('Altures de la font sobre el punt més alt de la petjada; coberta plana quan falten dades de forma.');
  if(shapedRoofs)warnings.push(shapedRoofs+' cobertes inclinades o corbes segons els atributs de la font; consulta els criteris derivats a la procedència.');
  if(fallbackRoofs)warnings.push(fallbackRoofs+' cobertes simplificades a planes perquè falten paràmetres o la forma encara no s’admet.');
  if(buildingMode==='flat')warnings.push('Petjades de color de 0,12 mm, sense volum.');
  if(buildingMode==='none')warnings.push('Edificis omesos; es conserva el relleu actual, sense reconstrucció històrica.');
  return {features:ctx.buildingFeatures,mode:buildingMode,height:maxBuildingHeight,part:surfacePart(2,mesh),
    mask:buildingMode==='none'?[]:mask,contains:polygonTester(buildingMode==='none'?[]:mask),obstacleMask:mask,count:buildingCount,volumes,warnings};
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
  const ctx={...old,options:{...options,...config},meta:{...(layer.meta||old.meta),infrastructure:old.meta.infrastructure,tunnels:old.meta.tunnels,railways:old.meta.railways,majorRoads:old.meta.majorRoads,transportContinuity:old.meta.transportContinuity},buildingFeatures:layer.features||old.buildingFeatures,vegetationCache:null};
  const {width,height,ground,scale,rect}=ctx;
  const cached=old.buildingGeometry;
  preview?.stage('buildings','Calculant els edificis…');
  const buildings=cached&&cached.features===ctx.buildingFeatures&&cached.mode===buildingMode&&cached.height===maxBuildingHeight
    ?cached:prepareBuildingGeometry(ctx,config,progress,preview);
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
        const support=measure('bridge.supports',()=>planPiers({axis:bridge.axis,top:under,containsDeck:bridge.contains,ground,blocked:[bridge.supportRoadPoly||ctx.roadPoly,pierBuildings,ctx.waterPoly,ctx.tunnelMask||[]],scale,widthMM:width,heightMM:height,layout:bridge.layout,minimumClearanceMM:bridge.mainRoad?.25:.8}),{id:bridge.id});
        const pieces=[bridge.mesh,...bridge.approaches.plans.map(p=>p.mesh),...support.piers.map(p=>columnSolid(p.ring,ground,under,p.topRing))];
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
    ctx.warnings.push(`${piers} pilars simplificats i ${connections} enllaços suaus amb camins i vies. ${ctx.bridges.some(b=>b.layout)?'Rajadell segueix els trams del projecte IDEAM; la col·locació sobre l’eix i els altres suports són aproximats.':'Distribució procedimental de suports, no posicions mesurades.'} S’eviten camins i edificis disponibles.`);
    const auxiliary=stats.reduce((n,s)=>n+(s.auxiliaryPiers||0),0);if(auxiliary)ctx.warnings.push(`${auxiliary} suports auxiliars afegits per reduir les llums de la maqueta; no són pilars mesurats del projecte.`);
    if(omitted)ctx.warnings.push(`${omitted} posicions de suport omeses per falta d’espai o obstacles. Revisa els trams lliures al laminador.`);
    const longSpans=stats.reduce((n,s)=>n+(s.unsupportedSpans?.length||0),0);if(longSpans)ctx.warnings.push(`${longSpans} trams elevats superen la separació prevista de suports perquè no hi ha una posició segura disponible. Comprova les llums al laminador.`);
    const unconnected=stats.flatMap(s=>s.unconnectedEnds);
    for(const detail of stats)for(const end of detail.unconnectedEnds)if(end?.error)ctx.warnings.push(`Enllaç del pont ${detail.id} omès. ${end.error}`);
    const clipped=unconnected.filter(end=>end?.clippedByCrop).length;
    if(clipped)ctx.warnings.push(`El límit de la maqueta talla ${clipped} continuacions de pont abans que es puguin enllaçar suaument. Amplia o desplaça el retall per donar espai als enllaços.`);
    if(unconnected.length>clipped)ctx.warnings.push(`${unconnected.length-clipped} extrems sense enllaç suau dins del retall.`);
    if(stats.some(s=>s.connectedComponents>1))ctx.warnings.push('Alguns ponts contenen fragments separats. Revisa les unions i els extrems al laminador abans d’imprimir.');
  }
  if(!previous.categories){
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
  if(!previous.context)throw Error('Cal generar primer el terreny.');const ctx={...previous.context};
  const options={...ctx.options,...changes}, {density=2.5,trees=true,treeType='mixed',strokes=[]}=options;
  if(!Number.isFinite(density)||density<.25||density>5)throw Error('Densitat fora del rang admès.');
  const {ground,containsForest,containsLand,containsRoad,containsBuilding,width,height}=ctx;
  preview?.stage('vegetation','Distribuint la vegetació…');
  progress('Actualitzant la capa de vegetació…');
  let seed=7341;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const dimensions=treeDimensions(ctx.scale),step=dimensions.spacing/Math.sqrt(density);
  const brushDensity=options.brushDensity??density;
  if(!Number.isFinite(brushDensity)||brushDensity<.25||brushDensity>5)throw Error('Densitat del pinzell fora del rang admès.');
  const make=(x,y,manual=false,random=rand)=>{
    const rx=dimensions.radius*(.85+random()*.3),ry=dimensions.radius*(.85+random()*.3),rz=dimensions.radius*(treeType==='round'?.9+random()*.2:treeType==='tall'?1.35+random()*.25:.95+random()*.5),rotation=random()*Math.PI*2,phase=random()*Math.PI*2,r=Math.max(rx,ry)*1.06,p=[x,y];
    const contains=manual?containsLand:containsForest;
    if(x<=r||y<=r||x>=width-r||y>=height-r||!contains(p)||containsRoad(p)||containsBuilding(p))return;
    const footprint=Array.from({length:12},(_,i)=>[x+Math.cos(i/12*Math.PI*2)*r,y+Math.sin(i/12*Math.PI*2)*r]);
    if(footprint.every(q=>contains(q)&&!containsBuilding(q)&&!containsRoad(q)))return {x,y,manual,ground:ground(x,y),rx,ry,rz,rotation,phase};
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
  const raw={categories:present,width,height,treeCount:placements.length,buildingCount:ctx.buildingCount,scale:options.targetScale??Math.round(1000/ctx.scale),triangles:present.reduce((s,p)=>s+p.faces.length/3,0),warnings,elevationDiagnostics:ctx.diagnostics,provenance:{...ctx.meta,options,vegetationBudget,buildingVolumes:ctx.buildingVolumes,buildingHeightReference:'highest generated-terrain point within the clipped footprint; horizontal roof for limited/source modes',treeMode:'procedural, varied crowns embedded in the generated terrain mesh',treeRepresentation:{crownDiameterMetres:TREE_CROWN_METRES,scale:'horizontal geographic scale; no vertical exaggeration',minimumDiameterMM:MIN_TREE_MM,omittedBelowThreshold:!!trees&&!dimensions.visible},elevation:ctx.meta.terrain?.provider||'Mapterhorn Terrarium',elevationRepairs:ctx.diagnostics,units:'millimeters',verticalExaggeration:options.exaggeration,verticalReference:ctx.verticalReference}};
  const model=groupMaterials(raw,4);for(const material of MATERIALS)if(!model.parts.some(p=>p.id===material.id))warnings.push(`${material.name}: no hi ha geometria exportable d’aquesta capa a les dades carregades.`);
  Object.defineProperty(model,'context',{value:ctx});return model;
}
