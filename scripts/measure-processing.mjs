import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {freemem} from 'node:os';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {buildModel} from '../src/geometry.js';
import {physicalBBox} from '../src/selection.js';
import {createProcessingTiming} from '../src/processing-timing.js';
import {auditPart} from '../src/solid-audit.js';

const name=process.argv[2];
if(!['tamariu','millau'].includes(name))throw Error('Ús: node --max-old-space-size=512 scripts/measure-processing.mjs tamariu|millau');
if(freemem()/2**30<2.5)throw Error('Calen almenys 2,5 GiB lliures.');
const sample=name==='tamariu';
const bbox=sample?physicalBBox([41.918,3.2075],.65,.65):physicalBBox([44.0797,3.0226],3,3);
const startedAt=new Date().toISOString(),started=performance.now(),sources=[];
const nativeFetch=globalThis.fetch;
globalThis.fetch=async (url,options)=>{
  if(!String(url).startsWith('./'))return nativeFetch(url,options);
  try{return new Response(await readFile(new URL('../public/'+String(url).slice(2),import.meta.url)));}
  catch(error){if(error.code==='ENOENT')return new Response(null,{status:404});throw error;}
};
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const data=await loadRegion({sample,bbox,buildingSource:'osm',decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode),onTiming:event=>sources.push(event)});
const settings={size:150,resolution:12,exaggeration:1.5,trees:false,estimatedTunnels:true};
const timing=createProcessingTiming();
timing.mark('initialization','Preparant el motor de geometria…');
const api=await Module();api.setup();
let stage,firstTerrainPreviewMilliseconds;
const result=buildModel(data,settings,message=>timing.mark(stage,message),api,timing.detail,{
  stage:(next,message)=>{stage=next;timing.mark(next,message);},
  parts:phase=>{if(phase==='terrain')firstTerrainPreviewMilliseconds??=performance.now()-started;}
});
const worker=timing.finish(),totalMilliseconds=performance.now()-started;
const audit=result.categories.map(auditPart).map(({id,errors})=>({id,errors}));
const report={schemaVersion:1,environment:'node',startedAt,selection:{name,bbox:data.meta.bbox},settings,
  data:{vectorFeatures:data.features.length,demTiles:data.dem.length,buildingSource:'osm',terrainProvider:data.meta.terrain?.provider??'sample'},
  sources,worker,firstTerrainPreviewMilliseconds,totalMilliseconds,peakProcessRSSBytes:process.resourceUsage().maxRSS*1024,
  result:{scale:result.scale,triangles:result.triangles,buildings:result.buildingCount,trees:result.treeCount,audit}};
await mkdir('output',{recursive:true});
await writeFile(`output/temps-${name}.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({name,totalMilliseconds,firstTerrainPreviewMilliseconds,peakProcessRSSBytes:report.peakProcessRSSBytes,stages:worker.stages,audit}));
if(audit.some(part=>part.errors.length))process.exitCode=1;
