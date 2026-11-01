import {polygonOps} from './polygon-ops.js';
import earcut from 'earcut';
import {sampleHeight,prepareElevationTiles,createTerrainField} from './elevation.js';
import {CATEGORIES,groupMaterials} from './materials.js';
import {polygonTester} from './polygon-index.js';
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
  const [w,s,e,n]=bbox,c=Math.cos((s+n)/2*Math.PI/180),xm=(e-w)*111320*c,ym=(n-s)*111320,scale=size/Math.max(xm,ym);
  const width=physical.widthMM||xm*scale,height=physical.heightMM||ym*scale,sx=width/xm,sy=height/ym;
  return {width,height,scale:Math.min(sx,sy),project:([lon,lat])=>[snap((lon-w)*111320*c*sx),snap((lat-s)*111320*sy)],unproject:([x,y])=>[w+x/(111320*c*sx),s+y/(111320*sy)]};
}
function geoPolys(f,project){const coords=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];return coords.map(poly=>poly.map(r=>r.map(project)));}
function lineBuffer(line,r){const polys=[];for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);if(l<1e-5)continue;const x=-dy/l*r,y=dx/l*r;polys.push([[[a[0]+x,a[1]+y],[a[0]-x,a[1]-y],[b[0]-x,b[1]-y],[b[0]+x,b[1]+y],[a[0]+x,a[1]+y]]]);}return polys;}
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
function terrainSolid(polys,height,bottom,width,heightMM,res){
  const result={vertices:[],faces:[]};if(!polys.length)return {vertices:new Float32Array(),faces:new Uint32Array()};
  // Clip into columns once. Intersecting a whole road network for every triangle
  // is both slow and numerically fragile; each cell then sees only local edges.
  const columns=Array.from({length:res},(_,i)=>intersect(polys,[[[[i*width/res,0],[(i+1)*width/res,0],[(i+1)*width/res,heightMM],[i*width/res,heightMM],[i*width/res,0]]]]));
  for(let j=0;j<res;j++)for(let i=0;i<res;i++){
    const x=i*width/res,y=j*heightMM/res,x1=(i+1)*width/res,y1=(j+1)*heightMM/res;
    const candidates=intersect(columns[i],[[[[x,y],[x1,y],[x1,y1],[x,y1],[x,y]]]]);
    if(!candidates.length)continue;
    for(const tri of [[[x,y],[x1,y],[x1,y1],[x,y]],[[x,y],[x1,y1],[x,y1],[x,y]]]){
      for(const poly of intersect(candidates,[[tri]])){const patch=new Surface();patch.polygon(poly,height);append(result,patch.solid(bottom));}
    }
  }return {vertices:new Float32Array(result.vertices),faces:new Uint32Array(result.faces)};
}
function append(target,mesh){const offset=target.vertices.length/3;for(const v of mesh.vertices)target.vertices.push(v);for(const i of mesh.faces)target.faces.push(i+offset);}
export function treeMesh({x,y,ground,rx,ry,rz,rotation=0,phase=0}){
  const surf=new Surface(),rings=6,segments=8,embed=Math.min(.3,rz*.35),z=ground+rz-embed;
  const p=(i,j)=>{const v=i/rings*Math.PI,u=j/segments*Math.PI*2,w=1+.05*Math.cos(3*u+phase)*Math.sin(v),dx=rx*Math.sin(v)*Math.cos(u)*w,dy=ry*Math.sin(v)*Math.sin(u)*w;return [x+dx*Math.cos(rotation)-dy*Math.sin(rotation),y+dx*Math.sin(rotation)+dy*Math.cos(rotation),z+rz*Math.cos(v)];};
  for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){surf.tri(p(i,j),p(i+1,j),p(i+1,j+1));surf.tri(p(i,j),p(i+1,j+1),p(i,j+1));}
  return {vertices:surf.vertices,faces:surf.faces};
}
export function buildModel(data,options={},progress=()=>{}){
  const {size=160,exaggeration=1.5,density=2.5,resolution=36}=options,proj=makeProjection(data.meta.bbox,size,options),{width,height,project,scale}=proj,rect=box(width,height),warnings=[...(data.meta.sourceWarnings||[])];
  if(!Number.isFinite(density)||density<.25||density>5||!Number.isInteger(resolution)||resolution<2||resolution>100||!Number.isFinite(exaggeration)||exaggeration<1||exaggeration>5||!Number.isFinite(size)||size<50||size>450||width>450||height>450)throw Error('Els ajustos de la maqueta són fora del rang admès.');
  const prepared=prepareElevationTiles(data.dem);
  if(prepared.diagnostics.repaired)warnings.push(`S’han reconstruït ${prepared.diagnostics.repaired} mostres d’altitud invàlides o pics aïllats a partir dels veïns.`);
  const water=[],ocean=[],green=[],woods=[],roads=[],buildings=[];let approximateBuildings=0;
  for(const f of data.features){const p=f.properties,layer=p.sourceLayer,polys=geoPolys(f,project);
    if(layer==='water'){water.push(...polys.map(p=>[p]));if(p.class==='ocean')ocean.push(...polys.map(p=>[p]));}
    if((layer==='landcover'&&['wood','grass','scrub'].includes(p.class))||(layer==='landuse'&&['park','forest','grass','cemetery','recreation_ground'].includes(p.class)))green.push(...polys.map(p=>[p]));
    if(['wood','forest','scrub'].includes(p.class))woods.push(...polys.map(p=>[p]));
    if(layer==='building'&&!p.hide_3d)for(const poly of polys){const h=Number(p.render_height),valid=Number.isFinite(h)&&h>0&&h<=1200;buildings.push({poly,height:valid?h:6,estimated:!!p.height_estimated||!valid});}
    if(layer==='transportation'&&p.brunnel!=='tunnel'&&f.geometry.type.includes('LineString')){
      const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
      const r=Math.max(.22,(['primary','secondary','tertiary'].includes(p.class)?5:2)*scale);
      for(const line of lines)roads.push(...lineBuffer(line.map(project),r).map(p=>[p]));
    }
  }
  progress('Delimitant costa i capes…');
  const cropped=polys=>polys.map(p=>intersect(p,rect)).filter(p=>p.length);
  const waterPoly=merge(cropped(water)),land=subtract(rect,waterPoly),roadPoly=intersect(merge(cropped(roads)),land),forest=subtract(intersect(merge(cropped(green)),land),roadPoly),bare=subtract(subtract(land,roadPoly),forest);
  const field=createTerrainField({width,height,resolution,at:(x,y)=>{const[lon,lat]=proj.unproject([x,y]);return 3.6+Math.max(0,sampleHeight(prepared.tiles,lon,lat))*scale*exaggeration;}});
  const ground=field.sample;
  const aggregates=CATEGORIES.map(m=>({...m,vertices:[],faces:[]}));const add=(id,mesh)=>append(aggregates[id],mesh);
  progress('Construint superfícies amb límits vectorials…');
  add(0,terrainSolid(land,(x,y)=>ground(x,y)-.65,()=>0,width,height,resolution));
  const forestGround=intersect(forest,merge(cropped(woods))),grassGround=subtract(forest,forestGround);
  for(const [id,polys]of [[0,bare],[3,roadPoly],[4,forestGround],[6,grassGround]]){progress(`Construint ${CATEGORIES[id].name.toLowerCase()}…`);add(id,terrainSolid(polys,ground,(x,y)=>ground(x,y)-.65,width,height,resolution));}
  const oceanPoly=merge(cropped(ocean)),inlandWater=subtract(waterPoly,oceanPoly);
  const seaSurf=new Surface();for(const p of oceanPoly)seaSurf.polygon(p,()=>3.0);add(1,seaSurf.solid(()=>0));
  // A swimming pool or lake on a hillside must not be extruded down to sea level.
  add(7,terrainSolid(inlandWater,(x,y)=>Math.max(3,ground(x,y)-.3),()=>0,width,height,resolution));
  progress('Afegint edificis i vegetació…');
  let buildingCount=0;const clippedBuildings=[];
  for(const b of buildings){const polys=intersect(intersect([b.poly],rect),land);for(const poly of polys){
    if(Math.abs(area(poly[0]))<.04)continue;clippedBuildings.push(poly);const pts=poly[0],base=Math.max(...pts.map(p=>ground(...p))),h=Math.max(.6,b.height*scale),surf=new Surface();surf.polygon(poly,()=>base+h);add(2,surf.solid((x,y)=>ground(x,y)-.3));buildingCount++;if(b.estimated)approximateBuildings++;
  }}
  const buildingMask=merge(clippedBuildings.map(poly=>[poly]));
  if(approximateBuildings)warnings.push(`${approximateBuildings} fragments d’edificis sense alçària disponible: alçària orientativa de 6 m.`);
  warnings.push('Els arbres són una representació procedimental dins de zones verdes, no posicions d’arbres mesurades.');
  warnings.push('Les tessel·les vectorials estan generalitzades. Aquesta prova no substitueix cartografia topogràfica de precisió.');
  const context={ground,forest,land,roadPoly,buildingMask,containsForest:polygonTester(forest),containsLand:polygonTester(land),containsRoad:polygonTester(roadPoly),containsBuilding:polygonTester(buildingMask),width,height,scale,buildingCount,warnings,options:{...options,size,exaggeration,resolution},meta:data.meta,diagnostics:prepared.diagnostics,base:aggregates.map(p=>({...p,vertices:new Float32Array(p.vertices),faces:new Uint32Array(p.faces)}))};
  return updateVegetation({context},options,progress);
}

export function updateVegetation(previous,changes={},progress=()=>{}){
  const ctx=previous.context;if(!ctx)throw Error('Cal generar primer el terreny.');
  const options={...ctx.options,...changes}, {density=2.5,trees=true,treeType='mixed',strokes=[]}=options;
  if(!Number.isFinite(density)||density<.25||density>5)throw Error('Densitat fora del rang admès.');
  const {ground,containsForest,containsLand,containsRoad,containsBuilding,width,height}=ctx;
  progress('Actualitzant la capa de vegetació…');
  let seed=7341,capped=false;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const candidates=[],step=2.1/Math.sqrt(density);
  const make=(x,y,manual=false)=>{
    const rx=.7*(.85+rand()*.3),ry=.7*(.85+rand()*.3),rz=.7*(treeType==='round'?.9+rand()*.2:treeType==='tall'?1.35+rand()*.25:.95+rand()*.5),rotation=rand()*Math.PI*2,phase=rand()*Math.PI*2,r=Math.max(rx,ry)*1.06,p=[x,y];
    const contains=manual?containsLand:containsForest;
    if(x<=r||y<=r||x>=width-r||y>=height-r||!contains(p)||containsRoad(p)||containsBuilding(p))return;
    const footprint=Array.from({length:12},(_,i)=>[x+Math.cos(i/12*Math.PI*2)*r,y+Math.sin(i/12*Math.PI*2)*r]);
    if(footprint.every(q=>contains(q)&&!containsBuilding(q)&&!containsRoad(q)))return {x,y,ground:ground(x,y),rx,ry,rz,rotation,phase};
  };
  if(trees){
    outer:for(let y=step;y<height-step;y+=step)for(let x=step;x<width-step;x+=step){const tree=make(x+(rand()-.5)*step*.5,y+(rand()-.5)*step*.5);if(tree)candidates.push(tree);if(candidates.length>=12000){capped=true;break outer;}}
  }
  let placements=candidates;
  if(trees)for(const stroke of strokes){
    if(![stroke.x,stroke.y,stroke.radius].every(Number.isFinite)||stroke.radius<=0||stroke.radius>30)continue;
    if(stroke.mode==='erase')placements=placements.filter(p=>Math.hypot(p.x-stroke.x,p.y-stroke.y)>stroke.radius);
    if(stroke.mode==='add'){
      const occupied=new Set(placements.map(p=>`${Math.round(p.x)},${Math.round(p.y)}`));
      for(let y=stroke.y-stroke.radius;y<=stroke.y+stroke.radius;y+=1.5)for(let x=stroke.x-stroke.radius;x<=stroke.x+stroke.radius;x+=1.5){const key=`${Math.round(x)},${Math.round(y)}`;if(Math.hypot(x-stroke.x,y-stroke.y)>stroke.radius||occupied.has(key))continue;const tree=make(x,y,true);if(tree&&placements.length<12000){placements.push(tree);occupied.add(key);}}
    }
  }
  const mesh={vertices:[],faces:[]};for(const tree of placements)append(mesh,treeMesh(tree));
  const categories=ctx.base.slice();categories[5]={...CATEGORIES[5],vertices:new Float32Array(mesh.vertices),faces:new Uint32Array(mesh.faces)};
  const present=categories.filter(p=>p.faces.length),warnings=ctx.warnings.slice();if(capped)warnings.push('S’ha limitat la vegetació a 12.000 volums.');
  const raw={categories:present,width,height,treeCount:placements.length,buildingCount:ctx.buildingCount,scale:Math.round(1000/ctx.scale),triangles:present.reduce((s,p)=>s+p.faces.length/3,0),warnings,elevationDiagnostics:ctx.diagnostics,provenance:{...ctx.meta,options,treeMode:'procedural, varied crowns embedded in the generated terrain mesh',elevation:ctx.meta.terrain?.provider||'Mapterhorn Terrarium',elevationRepairs:ctx.diagnostics,units:'millimeters',verticalExaggeration:options.exaggeration}};
  const model=groupMaterials(raw,4);for(const material of MATERIALS)if(!model.parts.some(p=>p.id===material.id))warnings.push(`${material.name}: no hi ha geometria exportable d’aquesta capa a les dades carregades.`);
  Object.defineProperty(model,'context',{value:ctx});return model;
}
