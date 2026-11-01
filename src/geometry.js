import {polygonOps} from './polygon-ops.js';
import earcut from 'earcut';
import {sampleHeight,prepareElevationTiles,createTerrainField} from './elevation.js';
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
export function makeProjection(bbox,size){
  const [w,s,e,n]=bbox,c=Math.cos((s+n)/2*Math.PI/180),xm=(e-w)*111320*c,ym=(n-s)*111320,scale=size/Math.max(xm,ym);
  return {width:xm*scale,height:ym*scale,scale,project:([lon,lat])=>[snap((lon-w)*111320*c*scale),snap((lat-s)*111320*scale)],unproject:([x,y])=>[w+x/(111320*c*scale),s+y/(111320*scale)]};
}
function geoPolys(f,project){const coords=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];return coords.map(poly=>poly.map(r=>r.map(project)));}
function lineBuffer(line,r){const polys=[];for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);if(l<1e-5)continue;const x=-dy/l*r,y=dx/l*r;polys.push([[[a[0]+x,a[1]+y],[a[0]-x,a[1]-y],[b[0]-x,b[1]-y],[b[0]+x,b[1]+y],[a[0]+x,a[1]+y]]]);}return polys;}
export class Surface {
  constructor(){this.vertices=[];this.faces=[];this.lookup=new Map();}
  vertex(p){if(!p.every(Number.isFinite))throw Error('La geometria conté una coordenada invàlida.');const key=p.map(x=>x.toFixed(6)).join(',');if(!this.lookup.has(key)){this.lookup.set(key,this.vertices.length/3);this.vertices.push(...p);}return this.lookup.get(key);}
  tri(a,b,c){const ids=[a,b,c].map(p=>this.vertex(p));if(new Set(ids).size===3)this.faces.push(...ids);}
  polygon(poly,height){const flat=[],holes=[];for(let i=0;i<poly.length;i++){if(i)holes.push(flat.length/2);const ring=poly[i];for(const p of ring.slice(0,-1))flat.push(...p);}const ix=earcut(flat,holes);for(let i=0;i<ix.length;i+=3){let p=ix.slice(i,i+3).map(j=>[flat[2*j],flat[2*j+1]]);if(area(p)<0)[p[1],p[2]]=[p[2],p[1]];this.tri(...p.map(([x,y])=>[x,y,height(x,y)]));}}
  solid(bottom){
    const topVertices=this.vertices.slice(),topFaces=this.faces.slice(),edges=new Map();
    for(let i=0;i<topFaces.length;i+=3){const ids=topFaces.slice(i,i+3),p=ids.map(j=>topVertices.slice(3*j,3*j+3));this.tri(...[p[2],p[1],p[0]].map(v=>[v[0],v[1],bottom(...v)]));for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}}
    for(const [a,b]of edges.values()){const p=topVertices.slice(a*3,a*3+3),q=topVertices.slice(b*3,b*3+3),pb=[p[0],p[1],bottom(...p)],qb=[q[0],q[1],bottom(...q)];this.tri(p,pb,qb);this.tri(p,qb,q);}
    return {vertices:new Float32Array(this.vertices),faces:new Uint32Array(this.faces)};
  }
}
function terrainSolid(polys,height,bottom,width,heightMM,res){
  const surface=new Surface();if(!polys.length)return {vertices:new Float32Array(),faces:new Uint32Array()};
  // Clip into columns once. Intersecting a whole road network for every triangle
  // is both slow and numerically fragile; each cell then sees only local edges.
  const columns=Array.from({length:res},(_,i)=>intersect(polys,[[[[i*width/res,0],[(i+1)*width/res,0],[(i+1)*width/res,heightMM],[i*width/res,heightMM],[i*width/res,0]]]]));
  for(let j=0;j<res;j++)for(let i=0;i<res;i++){
    const x=i*width/res,y=j*heightMM/res,x1=(i+1)*width/res,y1=(j+1)*heightMM/res;
    const candidates=intersect(columns[i],[[[[x,y],[x1,y],[x1,y1],[x,y1],[x,y]]]]);
    if(!candidates.length)continue;
    for(const tri of [[[x,y],[x1,y],[x1,y1],[x,y]],[[x,y],[x1,y1],[x,y1],[x,y]]]){
      for(const poly of intersect(candidates,[[tri]]))surface.polygon(poly,height);
    }
  }return surface.solid(bottom);
}
function append(target,mesh){const offset=target.vertices.length/3;for(const v of mesh.vertices)target.vertices.push(v);for(const i of mesh.faces)target.faces.push(i+offset);}
export function treeMesh({x,y,ground,rx,ry,rz,rotation=0,phase=0}){
  const surf=new Surface(),rings=6,segments=8,embed=Math.min(.3,rz*.35),z=ground+rz-embed;
  const p=(i,j)=>{const v=i/rings*Math.PI,u=j/segments*Math.PI*2,w=1+.05*Math.cos(3*u+phase)*Math.sin(v),dx=rx*Math.sin(v)*Math.cos(u)*w,dy=ry*Math.sin(v)*Math.sin(u)*w;return [x+dx*Math.cos(rotation)-dy*Math.sin(rotation),y+dx*Math.sin(rotation)+dy*Math.cos(rotation),z+rz*Math.cos(v)];};
  for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){surf.tri(p(i,j),p(i+1,j),p(i+1,j+1));surf.tri(p(i,j),p(i+1,j+1),p(i,j+1));}
  return {vertices:surf.vertices,faces:surf.faces};
}
export function buildModel(data,options={},progress=()=>{}){
  const {size=160,exaggeration=1.5,trees=true,density=2.5,resolution=36}=options,proj=makeProjection(data.meta.bbox,size),{width,height,project,scale}=proj,rect=box(width,height),warnings=[...(data.meta.sourceWarnings||[])];
  if(!Number.isFinite(density)||density<.25||density>5||!Number.isInteger(resolution)||resolution<2||resolution>100||!Number.isFinite(exaggeration)||exaggeration<1||exaggeration>5||!Number.isFinite(size)||size<50||size>300)throw Error('Els ajustos de la maqueta són fora del rang admès.');
  const prepared=prepareElevationTiles(data.dem);
  if(prepared.diagnostics.repaired)warnings.push(`S’han reconstruït ${prepared.diagnostics.repaired} mostres d’altitud invàlides o pics aïllats a partir dels veïns.`);
  const water=[],ocean=[],green=[],roads=[],buildings=[];let approximateBuildings=0;
  for(const f of data.features){const p=f.properties,layer=p.sourceLayer,polys=geoPolys(f,project);
    if(layer==='water'){water.push(...polys.map(p=>[p]));if(p.class==='ocean')ocean.push(...polys.map(p=>[p]));}
    if((layer==='landcover'&&['wood','grass','scrub'].includes(p.class))||(layer==='landuse'&&['park','forest','grass','cemetery','recreation_ground'].includes(p.class)))green.push(...polys.map(p=>[p]));
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
  const aggregates=MATERIALS.map(m=>({...m,vertices:[],faces:[]}));const add=(id,mesh)=>append(aggregates[id],mesh);
  progress('Construint superfícies amb límits vectorials…');
  add(0,terrainSolid(land,(x,y)=>ground(x,y)-.65,()=>0,width,height,resolution));
  for(const [id,polys]of [[0,bare],[2,roadPoly],[3,forest]]){progress(`Construint ${MATERIALS[id].name.toLowerCase()}…`);add(id,terrainSolid(polys,ground,(x,y)=>ground(x,y)-.65,width,height,resolution));}
  const oceanPoly=merge(cropped(ocean)),inlandWater=subtract(waterPoly,oceanPoly);
  const seaSurf=new Surface();for(const p of oceanPoly)seaSurf.polygon(p,()=>3.0);add(1,seaSurf.solid(()=>0));
  // A swimming pool or lake on a hillside must not be extruded down to sea level.
  add(1,terrainSolid(inlandWater,(x,y)=>Math.max(3,ground(x,y)-.3),()=>0,width,height,resolution));
  progress('Afegint edificis i vegetació…');
  let buildingCount=0;const clippedBuildings=[];
  for(const b of buildings){const polys=intersect(intersect([b.poly],rect),land);for(const poly of polys){
    if(Math.abs(area(poly[0]))<.04)continue;clippedBuildings.push(poly);const pts=poly[0],base=Math.max(...pts.map(p=>ground(...p))),h=Math.max(.6,b.height*scale),surf=new Surface();surf.polygon(poly,()=>base+h);add(2,surf.solid((x,y)=>ground(x,y)-.3));buildingCount++;if(b.estimated)approximateBuildings++;
  }}
  const buildingMask=merge(clippedBuildings.map(poly=>[poly]));let treeCount=0;
  if(trees){const step=2.1/Math.sqrt(density);let seed=7341,capped=false;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
    for(let y=step;y<height-step;y+=step)for(let x=step;x<width-step;x+=step){const p=[x+(rand()-.5)*step*.5,y+(rand()-.5)*step*.5],rx=.7*(.85+rand()*.3),ry=.7*(.85+rand()*.3),rz=.7*(.95+rand()*.5),rotation=rand()*Math.PI*2,phase=rand()*Math.PI*2,r=Math.max(rx,ry)*1.06;
      const footprint=Array.from({length:12},(_,i)=>[p[0]+Math.cos(i/12*Math.PI*2)*r,p[1]+Math.sin(i/12*Math.PI*2)*r]);
      if(inMulti(p,forest)&&!inMulti(p,buildingMask)&&footprint.every(q=>inMulti(q,forest)&&!inMulti(q,buildingMask))){if(treeCount>=12000){capped=true;continue;}append(aggregates[3],treeMesh({x:p[0],y:p[1],ground:ground(...p),rx,ry,rz,rotation,phase}));treeCount++;}
    }
    if(capped)warnings.push('S’ha limitat la vegetació a 12.000 volums per mantenir un ús de memòria moderat.');
  }
  if(approximateBuildings)warnings.push(`${approximateBuildings} fragments d’edificis sense alçària disponible: alçària orientativa de 6 m.`);
  warnings.push('Els arbres són una representació procedimental dins de zones verdes, no posicions d’arbres mesurades.');
  warnings.push('Les tessel·les vectorials estan generalitzades. Aquesta prova no substitueix cartografia topogràfica de precisió.');
  const parts=aggregates.filter(p=>p.faces.length).map(p=>({...p,vertices:new Float32Array(p.vertices),faces:new Uint32Array(p.faces)}));
  for(const material of MATERIALS)if(!parts.some(p=>p.id===material.id))warnings.push(`${material.name}: no hi ha geometria exportable d’aquesta capa a les dades carregades.`);
  return {parts,width,height,treeCount,buildingCount,scale:Math.round(1000/scale),triangles:parts.reduce((s,p)=>s+p.faces.length/3,0),warnings,elevationDiagnostics:prepared.diagnostics,provenance:{...data.meta,options:{size,exaggeration,trees,density,resolution},treeMode:'procedural, varied crowns embedded in the generated terrain mesh',elevation:data.meta.terrain?.provider||'Mapterhorn Terrarium, source precision varies',elevationRepairs:prepared.diagnostics,vector:'OpenFreeMap / OpenMapTiles / OpenStreetMap; optional ICGC RTT buildings',units:'millimeters',verticalExaggeration:exaggeration}};
}
