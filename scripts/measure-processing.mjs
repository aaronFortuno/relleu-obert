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
import {threeMF} from '../src/export.js';
import {tileArchive} from '../src/mesh-tiles.js';
import {PURE_RELIEF_RESOLUTIONS,splitPureRelief} from '../src/pure-relief-mesh.js';

const name=process.argv[2];
const mountainCentres={'peguera':[42.14193,1.76436],'gallina':[42.1835,1.7435],'gallina-complet':[42.1835,1.7435]};
const mountain=Object.hasOwn(mountainCentres,name);
if(!mountain&&!['tamariu','millau','rajadell-pure','aneto-forest','aneto-lakes','aneto-lakes-pure','aneto20','aneto40'].includes(name))
  throw Error('Ús: node --max-old-space-size=512 scripts/measure-processing.mjs tamariu|millau|rajadell-pure|aneto-forest|aneto-lakes|aneto-lakes-pure|aneto20|aneto40|peguera|gallina|gallina-complet');
if(freemem()/2**30<2.5)throw Error('Calen almenys 2,5 GiB lliures.');
const rajadell=name==='rajadell-pure',forestAlpine=name==='aneto-forest',alpine=name==='aneto-lakes-pure'||forestAlpine;
const sample=rajadell?'eix-diagonal':name==='tamariu',landscapeLakes=name==='aneto-lakes',
  pureRelief=rajadell||alpine||['aneto20','aneto40','peguera','gallina'].includes(name);
const extent=rajadell?1.5:alpine?3:pureRelief?Number(name.slice(5)):null;
const bbox=mountain?physicalBBox(mountainCentres[name],3,3):rajadell?physicalBBox([41.71792,1.78391],extent,extent):pureRelief||landscapeLakes
  ?physicalBBox(forestAlpine?[42.629,.58]:[42.635,.65],extent??3,extent??3)
  :sample?physicalBBox([41.918,3.2075],.65,.65):physicalBBox([44.0797,3.0226],3,3);
const startedAt=new Date().toISOString(),started=performance.now(),sources=[];
const nativeFetch=globalThis.fetch;
globalThis.fetch=async (url,options)=>{
  if(!String(url).startsWith('./'))return nativeFetch(url,options);
  try{return new Response(await readFile(new URL('../public/'+String(url).slice(2),import.meta.url)));}
  catch(error){if(error.code==='ENOENT')return new Response(null,{status:404});throw error;}
};
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const data=await loadRegion({sample,bbox,pureRelief,buildingSource:'osm',decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode),onTiming:event=>sources.push(event)});
const settings={size:pureRelief&&!rajadell&&!alpine&&!mountain?extent*10:150,
  resolution:rajadell||alpine||mountain&&pureRelief?PURE_RELIEF_RESOLUTIONS[36]:pureRelief?PURE_RELIEF_RESOLUTIONS[56]:landscapeLakes||mountain?96:12,
  exaggeration:1.5,trees:pureRelief||mountain,estimatedTunnels:!pureRelief,pureRelief};
const timing=createProcessingTiming();
timing.mark('initialization','Preparant el motor de geometria…');
const api=pureRelief?null:await Module();api?.setup();
let stage,firstTerrainPreviewMilliseconds;
const result=buildModel(data,settings,message=>timing.mark(stage,message),api,timing.detail,{
  stage:(next,message)=>{stage=next;timing.mark(next,message);},
  parts:phase=>{if(phase==='terrain')firstTerrainPreviewMilliseconds??=performance.now()-started;}
});
const worker=timing.finish(),totalMilliseconds=performance.now()-started;
const audit=result.categories.map(auditPart).map(({id,errors})=>({id,errors}));
const report={schemaVersion:1,environment:'node',startedAt,selection:{name,bbox:data.meta.bbox},settings,
  data:{vectorFeatures:data.features.length,demTiles:data.dem.length,buildingSource:data.meta.buildingSource,terrainProvider:data.meta.terrain?.provider??'sample',demZoom:data.meta.terrain?.zoom,demSampleSize:data.meta.terrain?.sampleSize,coverage:data.meta.coverage},
  sources,worker,firstTerrainPreviewMilliseconds,totalMilliseconds,peakProcessRSSBytes:process.resourceUsage().maxRSS*1024,
  result:{scale:result.scale,triangles:result.triangles,buildings:result.buildingCount,trees:result.treeCount,
    coverageCells:result.provenance.coverageCells,forestSamples:result.provenance.forestSamples,
    treeRepresentation:result.provenance.treeRepresentation,streamCount:result.provenance.streamCount,audit}};
await mkdir('output',{recursive:true});
await writeFile(`output/temps-${name}.json`,JSON.stringify(report,null,2)+'\n');
if(name==='aneto20'&&audit.every(part=>!part.errors.length))await writeFile('output/aneto-20km.3mf',threeMF(result,{bambu:true}));
if(name==='aneto-lakes-pure'&&audit.every(part=>!part.errors.length))await writeFile('output/aneto-llacs-rius.3mf',threeMF(result,{bambu:true}));
if(rajadell&&audit.every(part=>!part.errors.length))await writeFile('output/rajadell-boscos.3mf',threeMF(result,{bambu:true}));
if(forestAlpine&&audit.every(part=>!part.errors.length))await writeFile('output/aneto-boscos.3mf',threeMF(result,{bambu:true}));
if(mountain&&audit.every(part=>!part.errors.length))await writeFile(`output/${name}-vegetacio.3mf`,threeMF(result,{bambu:true}));
if(name==='aneto40'&&audit.every(part=>!part.errors.length)){
  const pieces=splitPureRelief(result,200,()=>{});
  if(pieces.length!==4||pieces.some(piece=>piece.parts.some(part=>auditPart(part).errors.length)))
    throw Error('La partició del pilot no ha superat l’auditoria.');
  await writeFile('output/aneto-40km-peces.zip',tileArchive(pieces,'bambu'));
}
console.log(JSON.stringify({name,totalMilliseconds,firstTerrainPreviewMilliseconds,peakProcessRSSBytes:report.peakProcessRSSBytes,stages:worker.stages,audit}));
if(audit.some(part=>part.errors.length))process.exitCode=1;
