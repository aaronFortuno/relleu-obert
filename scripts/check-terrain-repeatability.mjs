import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import decodeWebp,{init} from '@jsquash/webp/decode.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {readVector} from '../src/sources.js';
import {combineBuildings} from '../src/buildings.js';
import {buildModel} from '../src/geometry.js';
import {threeMF} from '../src/export.js';

await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const meta=JSON.parse(await readFile('public/data/tamariu.json')),features=[],dem=[];
for(const t of meta.tiles){features.push(...readVector(await readFile('public/data/'+t.vector),t));dem.push(await decodeDEMTile(await readFile('public/data/'+t.dem),t,decodeWebp));}
const official=JSON.parse(await readFile('public/data/'+meta.officialBuildings)),combined=combineBuildings(features,official);meta.buildings=combined.metadata;
const [w,s,e,n]=meta.bbox,lat=(s+n)/2,lon=(w+e)/2,span=Math.min((e-w)*Math.cos(lat*Math.PI/180),n-s);
meta.bbox=[lon-span/2/Math.cos(lat*Math.PI/180),lat-span/2,lon+span/2/Math.cos(lat*Math.PI/180),lat+span/2];
meta.elevationDecoding={method:'binary RGB; no canvas readback',tiles:dem.map(t=>({z:t.z,x:t.x,y:t.y,...t.decoding}))};
const input={meta,features:combined.features,dem},options={size:150,widthMM:150,heightMM:150,resolution:36,exaggeration:1.5,density:2.5},hash=parts=>{const h=createHash('sha256');for(const p of parts){h.update(p.id);h.update(p.vertices);h.update(p.faces);}return h.digest('hex');};
const cases=[{name:'baseline-1'},{name:'baseline-2'},{name:'baseline-3'},{name:'without-trees',trees:false},{name:'without-buildings',buildingMode:'none'},{name:'higher-relief',exaggeration:3,resolution:24}];
const results=[];let baseline,groundHash;
await mkdir('output',{recursive:true});
for(const c of cases){const started=Date.now(),m=buildModel(structuredClone(input),{...options,...c});const digest=hash(m.categories),terrainHash=hash(m.categories.filter(p=>p.id==='terrain'));
  for(const part of m.categories){assert([...part.vertices].every(Number.isFinite));assert([...part.faces].every(i=>i<part.vertices.length/3));}
  const maximumSource=Math.max(...dem.map(t=>t.decoding.maxMeters)),maximumZ=3.6+maximumSource*m.context.scale*m.provenance.options.exaggeration+3;
  for(const p of m.categories)for(let i=2;i<p.vertices.length;i+=3)assert(p.vertices[i]<=maximumZ+.0001,'Geometry overshoots the source envelope');
  if(c.name.startsWith('baseline')){baseline??=digest;groundHash??=terrainHash;assert.equal(digest,baseline,'Identical inputs must produce identical meshes');}
  if(c.name.startsWith('without'))assert.equal(terrainHash,groundHash,'Trees/buildings must not alter the ground');
  if(c.name==='baseline-1'){await writeFile('output/ro-001-bambu.3mf',threeMF(m,{bambu:true}));await writeFile('output/ro-001-standard.3mf',threeMF(m));}
  const result={case:c.name,sha256:digest,terrainSha256:terrainHash,triangles:m.triangles,trees:m.treeCount,buildings:m.buildingCount,elevationDiagnostics:m.elevationDiagnostics,durationMS:Date.now()-started};results.push(result);console.log(JSON.stringify(result));
}
await writeFile('output/ro-001-elevation-audit.json',JSON.stringify({bbox:meta.bbox,decoding:meta.elevationDecoding,options,results,verification:'Node geometry and independent raster reference; native Brave verification remains pending'},null,2));
