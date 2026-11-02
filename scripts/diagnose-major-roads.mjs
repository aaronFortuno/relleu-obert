// RO-051 prototype only: never enabled by the published UI in v0.18.1.
import {readFile,writeFile} from 'node:fs/promises';
import {freemem} from 'node:os';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {buildModel} from '../src/geometry.js';
import {physicalBBox} from '../src/selection.js';
import {auditPart} from '../src/solid-audit.js';
import {threeMF} from '../src/export.js';
if(process.argv.includes('--help')){
 console.log('node --max-old-space-size=1536 scripts/diagnose-major-roads.mjs [km=3] [mm=150] [detail=12] [--trace] [--icgc] [--tunnels] [--verify] [--export=output/control.3mf]\nRO-051 opt-in prototype; run alone, with at least 4 GB free.');process.exit(0);
}
const [km=3,mm=150,resolution=12]=process.argv.slice(2).filter(v=>!v.startsWith('--')).map(Number);
if(![km,mm,resolution].every(Number.isFinite)||km<=0||mm<50||mm>450||!Number.isInteger(resolution)||resolution<2||resolution>100)throw Error('Arguments invàlids. Consulta --help.');
if(freemem()/2**30<4)throw Error('Calen almenys 4 GB lliures per iniciar el diagnòstic.');
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const api=await Module();api.setup();
globalThis.fetch=async url=>new Response(await readFile(new URL('../public/'+String(url).replace(/^\.\//,''),import.meta.url)));
const buildingSource=process.argv.includes('--icgc')?'icgc':'osm',estimatedTunnels=process.argv.includes('--tunnels');
const data=await loadRegion({sample:'eix-diagonal',buildingSource,decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode)});
const centre=km===1.5||km===2.4?[41.71792,1.78391]:[41.72213,1.779785],start=Date.now();
console.log({km,mm,resolution,buildingSource,estimatedTunnels,majorRoads:true,initialFreeGB:freemem()/2**30});
const trace=process.argv.includes('--trace')?event=>console.log('RO051_TIMING '+JSON.stringify({...event,elapsedMS:Date.now()-start,rssMB:process.memoryUsage().rss/2**20})):null;
const model=buildModel({...data,meta:{...data.meta,bbox:physicalBBox(centre,km,km)}},{size:mm,widthMM:mm,heightMM:mm,resolution,trees:false,majorRoads:true,estimatedTunnels},message=>console.log(Math.round((Date.now()-start)/1000)+'s',message),api,trace);
const seconds=(Date.now()-start)/1000;
const audit=process.argv.includes('--verify')?model.categories.map(auditPart).map(({id,errors,triangles})=>({id,errors,triangles})):undefined;
const exportPath=process.argv.find(v=>v.startsWith('--export='))?.slice(9);
const exportError=exportPath&&!model.provenance.majorRoads.applied?'No s’exporta un control RO-051 que ha recuperat els camins anteriors.':undefined;
if(exportPath&&!exportError)await writeFile(exportPath,threeMF(model));
console.log('RO051_RESULT '+JSON.stringify({seconds,buildingSource,estimatedTunnels,major:{applied:model.provenance.majorRoads.applied,count:model.provenance.majorRoads.count,omissions:model.provenance.majorRoads.omissions,error:model.provenance.majorRoads.error},completion:model.provenance.infrastructure?.completion?.details.map(p=>({id:p.id,piers:p.piers.length,unsupported:p.maxUnsupportedSpanMM})),tunnels:model.provenance.tunnels,audit,exportPath:exportError?undefined:exportPath,exportError}));
if(exportError||audit?.some(p=>p.errors.length))process.exitCode=1;
