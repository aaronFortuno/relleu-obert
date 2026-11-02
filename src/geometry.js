import {polygonOps} from './polygon-ops.js';
import earcut from 'earcut';
import {sampleHeight,prepareElevationTiles,createTerrainField} from './elevation.js';
import {CATEGORIES,groupMaterials} from './materials.js';
import {polygonTester} from './polygon-index.js';
import {lineBuffer} from './roads.js';
import {buildingOptions,buildingRise} from './building-options.js';
import {validateScale} from './selection.js';
import {localRasterSampler} from './local-raster.js';
import {treeDimensions,TREE_CROWN_METRES,MIN_TREE_MM} from './tree-scale.js';
import {treeSampler,fitTrees,MAX_TREES} from './vegetation-budget.js';
import {scatterBrush} from './brush-scatter.js';
import {createGestureCoverage} from './brush-coverage.js';
import {roofProfile} from './building-roofs.js';
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
  const roof=referenceGround+rise;
  if(profile?.parts){
    const result={vertices:[],faces:[]};
    for(const ring of profile.parts){const clipped=intersect(polys,[[ring]]);append(result,solidPatches(terrainPatches(clipped,width,height,res),(x,y)=>roof-profile.heightMM+profile.heightMM*profile.factor(x,y),(x,y)=>ground(x,y)-.3));}
    return {vertices:new Float32Array(result.vertices),faces:new Uint32Array(result.faces),roof,referenceGround,roofShape:profile.shape};
  }
  return {...solidPatches(patches,()=>roof,(x,y)=>ground(x,y)-.3),roof,referenceGround};
}
function append(target,mesh){const offset=target.vertices.length/3;for(const v of mesh.vertices)target.vertices.push(v);for(const i of mesh.faces)target.faces.push(i+offset);}
export function treeMesh({x,y,ground,rx,ry,rz,rotation=0,phase=0}){
  const surf=new Surface(),rings=6,segments=8,embed=Math.min(.3,rz*.35),z=ground+rz-embed;
  const p=(i,j)=>{const v=i/rings*Math.PI,u=j/segments*Math.PI*2,w=1+.05*Math.cos(3*u+phase)*Math.sin(v),dx=rx*Math.sin(v)*Math.cos(u)*w,dy=ry*Math.sin(v)*Math.sin(u)*w;return [x+dx*Math.cos(rotation)-dy*Math.sin(rotation),y+dx*Math.sin(rotation)+dy*Math.cos(rotation),z+rz*Math.cos(v)];};
  for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){surf.tri(p(i,j),p(i+1,j),p(i+1,j+1));surf.tri(p(i,j),p(i+1,j+1),p(i,j+1));}
  return {vertices:surf.vertices,faces:surf.faces};
}
export function buildModel(data,options={},progress=()=>{}){
  const {size=160,exaggeration=1.5,density=2.5,resolution=36}=options,proj=makeProjection(data.meta.bbox,size,options),{width,height,project,scale}=proj,rect=box(width,height),warnings=[];
  if(!Number.isFinite(density)||density<.25||density>5||!Number.isInteger(resolution)||resolution<2||resolution>100||!Number.isFinite(exaggeration)||exaggeration<1||exaggeration>5||!Number.isFinite(size)||size<50||size>450||width>450||height>450)throw Error('Els ajustos de la maqueta són fora del rang admès.');
  if(options.targetScale!=null&&Math.abs(1000/scale-validateScale(options.targetScale))>options.targetScale*1e-6)throw Error('El retall no concorda amb l’escala demanada. Torna a seleccionar la regió.');
  const prepared=data.localDEM?{tiles:[],diagnostics:{invalid:0,spikes:0,repaired:0,source:'local GeoTIFF'}}:prepareElevationTiles(data.dem),localHeight=data.localDEM?localRasterSampler(data.localDEM):null;
  if(prepared.diagnostics.repaired)warnings.push(`S’han reconstruït ${prepared.diagnostics.repaired} mostres d’altitud invàlides o pics aïllats a partir dels veïns.`);
  const water=[],ocean=[],green=[],woods=[],roads=[];
  for(const f of data.features){const p=f.properties,layer=p.sourceLayer,polys=geoPolys(f,project);
    if(layer==='water'){water.push(...polys.map(p=>[p]));if(p.class==='ocean')ocean.push(...polys.map(p=>[p]));}
    if((layer==='landcover'&&['wood','grass','scrub'].includes(p.class))||(layer==='landuse'&&['park','forest','grass','cemetery','recreation_ground'].includes(p.class)))green.push(...polys.map(p=>[p]));
    if(['wood','forest','scrub'].includes(p.class))woods.push(...polys.map(p=>[p]));
    if(layer==='transportation'&&p.brunnel!=='tunnel'&&f.geometry.type.includes('LineString')){
      const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
      const r=Math.max(.22,(['primary','secondary','tertiary'].includes(p.class)?5:2)*scale);
      for(const line of lines)roads.push(...lineBuffer(line.map(project),r,[width,height]).map(p=>[p]));
    }
  }
  progress('Delimitant costa i capes…');
  const cropped=polys=>polys.map(p=>intersect(p,rect)).filter(p=>p.length);
  const waterPoly=merge(cropped(water)),land=subtract(rect,waterPoly),roadPoly=intersect(merge(cropped(roads)),land),forest=subtract(intersect(merge(cropped(green)),land),roadPoly),bare=subtract(subtract(land,roadPoly),forest);
  const oceanPoly=merge(cropped(ocean)),hasOcean=oceanPoly.length>0;
  const field=createTerrainField({width,height,resolution,at:(x,y)=>{const[lon,lat]=proj.unproject([x,y]);const h=localHeight?localHeight(lon,lat):sampleHeight(prepared.tiles,lon,lat);return hasOcean?Math.max(0,h):h;}});
  let originMeters=Infinity;for(const h of field.values)originMeters=Math.min(originMeters,h);
  if(hasOcean)originMeters=0;
  const verticalReference={originMeters,minimumSurfaceMM:5,seaLevelMM:hasOcean?5:null,method:hasOcean?'sea level at 5 mm; no bathymetry':'lowest generated-terrain sample at 5 mm'};
  for(let i=0;i<field.values.length;i++)field.values[i]=5+(field.values[i]-originMeters)*scale*exaggeration;
  const ground=field.sample;
  const aggregates=CATEGORIES.map(m=>({...m,vertices:[],faces:[]}));const add=(id,mesh)=>append(aggregates[id],mesh);
  progress('Construint superfícies amb límits vectorials…');
  add(0,terrainSolid(land,(x,y)=>ground(x,y)-.65,()=>0,width,height,resolution));
  const forestGround=intersect(forest,merge(cropped(woods))),grassGround=subtract(forest,forestGround);
  for(const [id,polys]of [[0,bare],[3,roadPoly],[4,forestGround],[6,grassGround]]){progress(`Construint ${CATEGORIES[id].name.toLowerCase()}…`);add(id,terrainSolid(polys,ground,(x,y)=>ground(x,y)-.65,width,height,resolution));}
  const inlandWater=subtract(waterPoly,oceanPoly);
  const seaSurf=new Surface();for(const p of oceanPoly)seaSurf.polygon(p,()=>5);add(1,seaSurf.solid(()=>0));
  // A swimming pool or lake on a hillside must not be extruded down to sea level.
  add(7,terrainSolid(inlandWater,(x,y)=>Math.max(3,ground(x,y)-.3),()=>0,width,height,resolution));
  warnings.push('Els arbres són una representació procedimental dins de zones verdes, no posicions d’arbres mesurades.');
  warnings.push('Les tessel·les vectorials estan generalitzades. Aquesta prova no substitueix cartografia topogràfica de precisió.');
  const context={ground,verticalReference,proj,rect,forest,land,roadPoly,containsForest:polygonTester(forest),containsLand:polygonTester(land),containsRoad:polygonTester(roadPoly),width,height,scale,staticWarnings:warnings,options:{...options,size,exaggeration,resolution},meta:data.meta,diagnostics:prepared.diagnostics,staticBase:aggregates.map(p=>({...p,vertices:new Float32Array(p.vertices),faces:new Uint32Array(p.faces)}))};
  return updateBuildings({context},{features:data.features,meta:data.meta},options,progress);
}

export function updateBuildings(previous,layer={},changes={},progress=()=>{}){
  if(!previous.context)throw Error('Cal generar primer el terreny.');
  const old=previous.context,options={...old.options,...changes},config=buildingOptions(options),{buildingMode,maxBuildingHeight}=config;
  const ctx={...old,options:{...options,...config},meta:layer.meta||old.meta,buildingFeatures:layer.features||old.buildingFeatures,vegetationCache:null};
  const {width,height,ground,scale,rect,land}=ctx,res=options.resolution;
  const mesh={vertices:[],faces:[]},clipped=[],warnings=[...ctx.staticWarnings,...(ctx.meta.sourceWarnings||[])];
  let buildingCount=0,approximate=0,limited=0,shapedRoofs=0,fallbackRoofs=0;const volumes=[];
  progress('Actualitzant la capa d’edificis…');
  if(buildingMode!=='none')for(const f of ctx.buildingFeatures){
    if(f.properties.sourceLayer!=='building'||f.properties.hide_3d)continue;
    const p=f.properties,h=Number(p.render_height),valid=Number.isFinite(h)&&h>0&&h<=1200;
    for(const poly of geoPolys(f,ctx.proj.project)){
      const polys=intersect(intersect([poly],rect),land).filter(p=>Math.abs(area(p[0]))>=.04);if(!polys.length)continue;
      clipped.push(...polys);const rise=buildingRise(valid?h:6,scale,config);
      const profile=buildingMode==='source'?roofProfile(p,poly[0],scale,valid?h:6,options.selectionPose?.rotation||0):null;
      const solid=buildingMode==='flat'?terrainSolid(polys,(x,y)=>ground(x,y)+rise,(x,y)=>ground(x,y)-.3,width,height,res):levelBuildingSolid(polys,rise,ground,width,height,res,profile);
      if(profile?.parts)shapedRoofs++;if(profile?.fallback)fallbackRoofs++;
      append(mesh,solid);buildingCount+=polys.length;if(p.height_estimated||!valid)approximate+=polys.length;if(buildingMode==='limited'&&h>maxBuildingHeight)limited+=polys.length;
      volumes.push({id:f.id??p.source_id??null,family:p.family??null,fragments:polys.length,roof:solid.roof??null,roofShape:solid.roofShape||'flat',roofFallback:profile?.fallback||null,estimated:!!p.height_estimated||!valid});
    }
  }
  if(approximate)warnings.push(approximate+' fragments d’edificis amb alçària estimada; consulta la procedència de la font.');
  if(ctx.meta.buildings?.officialCount)warnings.push('Algunes petjades ICGC agrupen diverses cases sense divisions interiors. Pots comparar-les amb parts del Catastre.');
  if(buildingMode==='limited')warnings.push('Edificis amb coberta horitzontal, com a màxim '+maxBuildingHeight+' m reals sobre el punt més alt de la petjada. La façana del costat baix pot superar aquest valor. '+limited+' fragments limitats en altura.');
  if(buildingMode==='source')warnings.push('Altures de la font sobre el punt més alt de la petjada; coberta plana quan falten dades de forma.');
  if(shapedRoofs)warnings.push(shapedRoofs+' cobertes inclinades generades amb forma, altura i direcció de la font.');
  if(fallbackRoofs)warnings.push(fallbackRoofs+' cobertes simplificades a planes perquè falten paràmetres o la forma encara no s’admet.');
  if(buildingMode==='flat')warnings.push('Petjades de color de 0,12 mm, sense volum.');
  if(buildingMode==='none')warnings.push('Edificis omesos; es conserva el relleu actual, sense reconstrucció històrica.');
  ctx.base=ctx.staticBase.slice();ctx.base[2]={...CATEGORIES[2],vertices:new Float32Array(mesh.vertices),faces:new Uint32Array(mesh.faces)};
  ctx.buildingMask=merge(clipped.map(poly=>[poly]));ctx.containsBuilding=polygonTester(ctx.buildingMask);ctx.buildingCount=buildingCount;ctx.warnings=warnings;ctx.buildingVolumes=volumes;
  if(!previous.categories)return updateVegetation({context:ctx},ctx.options,progress);
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

export function updateVegetation(previous,changes={},progress=()=>{}){
  if(!previous.context)throw Error('Cal generar primer el terreny.');const ctx={...previous.context};
  const options={...ctx.options,...changes}, {density=2.5,trees=true,treeType='mixed',strokes=[]}=options;
  if(!Number.isFinite(density)||density<.25||density>5)throw Error('Densitat fora del rang admès.');
  const {ground,containsForest,containsLand,containsRoad,containsBuilding,width,height}=ctx;
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
      for(let y=step;y<height-step;y+=step)for(let x=step;x<width-step;x+=step){const tree=make(x+(rand()-.5)*step,y+(rand()-.5)*step*.5);if(tree)sampler.add(tree);}
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
  const mesh={vertices:[],faces:[]};for(const tree of placements)append(mesh,treeMesh(tree));
  const categories=ctx.base.slice();categories[5]={...CATEGORIES[5],vertices:new Float32Array(mesh.vertices),faces:new Uint32Array(mesh.faces)};
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
