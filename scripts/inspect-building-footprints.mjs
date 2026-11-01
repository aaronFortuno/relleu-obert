import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {readVector} from '../src/sources.js';
import {combineBuildings} from '../src/buildings.js';
import {polygonOps} from '../src/polygon-ops.js';
const meta=JSON.parse(await readFile('public/data/tamariu.json','utf8'));
const official=JSON.parse(await readFile('public/data/'+meta.officialBuildings,'utf8'));
const features=(await Promise.all(meta.tiles.map(async t=>readVector(await readFile('public/data/'+t.vector),t)))).flat();
const combined=combineBuildings(features,official);
const bbox=[3.199,41.917,3.209,41.922],width=1100,height=740;
const xy=([x,y])=>[(x-bbox[0])/(bbox[2]-bbox[0])*width,height-(y-bbox[1])/(bbox[3]-bbox[1])*height];
const polys=f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];
const block=official.features.find(f=>f.id==='icgc-1074761'),pc=polygonOps(1e-10);
const osmOverlaps=features.filter(f=>f.properties.sourceLayer==='building'&&pc.intersection(polys(f),polys(block)).length).map(f=>({id:f.id,properties:f.properties}));
console.log('OSM features intersecting the Perica block:',JSON.stringify(osmOverlaps));
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f4f3e9"/>`;
for(const f of features.filter(f=>f.properties.sourceLayer==='transportation')){
  const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[];
  for(const line of lines)svg+=`<path d="M${line.map(xy).map(p=>p.join(',')).join('L')}" fill="none" stroke="#c3c7c3" stroke-width="4"/>`;
}
const summary=[];
for(const f of official.features)for(const poly of polys(f)){
  const points=poly[0],center=[points.reduce((s,p)=>s+p[0],0)/points.length,points.reduce((s,p)=>s+p[1],0)/points.length];
  if(center[0]<bbox[0]||center[0]>bbox[2]||center[1]<bbox[1]||center[1]>bbox[3])continue;
  const retained=combined.features.find(g=>g.id===f.id);
  const m=points.map(([lon,lat])=>[(lon-center[0])*111320*Math.cos(center[1]*Math.PI/180),(lat-center[1])*111320]);
  const area=Math.abs(m.reduce((s,p,i)=>{const q=m[(i+1)%m.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2);
  summary.push({id:f.id,center,areaM2:Math.round(area),height:f.properties.render_height,vertices:points.length,unchanged:JSON.stringify(f.geometry)===JSON.stringify(retained?.geometry)});
  svg+=`<path d="${poly.map(r=>'M'+r.map(xy).map(p=>p.join(',')).join('L')+'Z').join('')}" fill="#e0bc8e" stroke="#865c32" stroke-width="1" fill-rule="evenodd"/><text x="${xy(center)[0]}" y="${xy(center)[1]}" text-anchor="middle" font-family="sans-serif" font-size="9">${f.properties.official_id}</text>`;
}
svg+='</svg>';await mkdir('output',{recursive:true});await writeFile('output/building-footprints.svg',svg);await writeFile('output/building-footprints.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary.sort((a,b)=>b.areaM2-a.areaM2).slice(0,15),null,2));
