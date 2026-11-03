import {writeFile} from 'node:fs/promises';
import {lonLatTile,readVector} from '../src/sources.js';
import {polygonOps} from '../src/polygon-ops.js';
import {ANETO_LAKE_BOUNDS,ANETO_LAKE_FILE} from '../src/relief-coverage.js';

const fetchJSON=async url=>{
  const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('HTTP '+response.status+' · '+url);
  return response;
};
const [w,s,e,n]=ANETO_LAKE_BOUNDS,z=12;
const catalog=await(await fetchJSON('https://tiles.openfreemap.org/planet')).json(),template=catalog.tiles[0];
const [left,top]=lonLatTile(w,n,z).map(Math.floor),[right,bottom]=lonLatTile(e,s,z).map(Math.floor);
const groups=new Map(),pc=polygonOps();
const clip=[[[w,s],[e,s],[e,n],[w,n],[w,s]]];
const clean=polys=>polys.map(poly=>poly.map(ring=>ring.map(p=>p.map(value=>Math.round(value*1e7)/1e7))));
for(let x=left;x<=right;x++)for(let y=top;y<=bottom;y++){
  const url=template.replace('{z}',z).replace('{x}',x).replace('{y}',y);
  const response=await fetchJSON(url);
  for(const f of readVector(new Uint8Array(await response.arrayBuffer()),{x,y,z})){
    const {sourceLayer,class:kind,intermittent,id}=f.properties;
    if(sourceLayer!=='water'||!['lake','pond'].includes(kind)||intermittent||id==null)continue;
    const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];
    if(!polygons.length)continue;
    if(!groups.has(id))groups.set(id,{kind,fragments:[]});
    groups.get(id).fragments.push(clean(polygons));
  }
}
const features=[];
for(const [id,{kind,fragments}]of groups){
  const polygons=clean(pc.intersection(pc.union(...fragments),clip));
  if(polygons.length)features.push({type:'Feature',id,properties:{class:kind},geometry:{type:'MultiPolygon',coordinates:polygons}});
}
const data={type:'FeatureCollection',bbox:ANETO_LAKE_BOUNDS,attribution:'© OpenStreetMap contributors · OpenFreeMap · ODbL',
  source:template,features};
await writeFile(new URL('../public/'+ANETO_LAKE_FILE,import.meta.url),JSON.stringify(data)+'\n');
console.log(features.length+' llacs i estanys.');
