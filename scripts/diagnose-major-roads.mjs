// RO-051 prototype only: never enabled by the published UI in v0.18.1.
import {readFile,writeFile} from 'node:fs/promises';
import {freemem} from 'node:os';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {buildModel} from '../src/geometry.js';
import {physicalBBox,selectionPose} from '../src/selection.js';
import {auditPart} from '../src/solid-audit.js';
import {threeMF} from '../src/export.js';
if(process.argv.includes('--help')){
 console.log('node --max-old-space-size=1536 scripts/diagnose-major-roads.mjs [km=3] [mm=150] [detail=12] [--trace] [--icgc] [--tunnels] [--surface-roads] [--rotation=25] [--height-mm=200] [--verify] [--export=output/control.3mf]\nRO-051 is opt-in by default in this diagnostic; --surface-roads uses the published UI mode. Run alone, with at least 4 GB free.');process.exit(0);
}
const [km=3,mm=150,resolution=12]=process.argv.slice(2).filter(v=>!v.startsWith('--')).map(Number);
if(![km,mm,resolution].every(Number.isFinite)||km<=0||mm<50||mm>450||!Number.isInteger(resolution)||resolution<2||resolution>100)throw Error('Arguments invàlids. Consulta --help.');
if(freemem()/2**30<4)throw Error('Calen almenys 4 GB lliures per iniciar el diagnòstic.');
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const api=await Module();api.setup();
globalThis.fetch=async url=>new Response(await readFile(new URL('../public/'+String(url).replace(/^\.\//,''),import.meta.url)));
const buildingSource=process.argv.includes('--icgc')?'icgc':'osm',estimatedTunnels=process.argv.includes('--tunnels');
const majorRoads=!process.argv.includes('--surface-roads'),rotation=Number(process.argv.find(v=>v.startsWith('--rotation='))?.slice(11)??0),heightMM=Number(process.argv.find(v=>v.startsWith('--height-mm='))?.slice(12)??mm);
if(!Number.isFinite(rotation)||Math.abs(rotation)>180||!Number.isFinite(heightMM)||heightMM<50||heightMM>450)throw Error('Gir o altura física invàlids.');
const data=await loadRegion({sample:'eix-diagonal',buildingSource,decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode)});
const centreArgument=process.argv.find(v=>v.startsWith('--centre='))?.slice(9),centre=centreArgument?centreArgument.split(',').map(Number):km===1.5||km===2.4?[41.71792,1.78391]:[41.72213,1.779785],start=Date.now();
if(centre.length!==2||!centre.every(Number.isFinite)||Math.abs(centre[0])>85||Math.abs(centre[1])>180)throw Error('Centre invàlid. Cal latitud,longitud.');
console.log({km,mm,heightMM,rotation,centre,resolution,buildingSource,estimatedTunnels,majorRoads,initialFreeGB:freemem()/2**30});
const trace=process.argv.includes('--trace')?event=>console.log('RO051_TIMING '+JSON.stringify({...event,elapsedMS:Date.now()-start,rssMB:process.memoryUsage().rss/2**20})):null;
const bbox=physicalBBox(centre,km,km*heightMM/mm),pose=rotation||heightMM!==mm?selectionPose(bbox,rotation):undefined;
const model=buildModel({...data,meta:{...data.meta,bbox:pose?.bbox??bbox}},{size:mm,widthMM:mm,heightMM,resolution,trees:false,majorRoads,estimatedTunnels,...(pose?{selectionPose:pose}:{})},message=>console.log(Math.round((Date.now()-start)/1000)+'s',message),api,trace);
const seconds=(Date.now()-start)/1000;
const audit=process.argv.includes('--verify')?model.categories.map(auditPart).map(({id,errors,triangles})=>({id,errors,triangles})):undefined;
const exportPath=process.argv.find(v=>v.startsWith('--export='))?.slice(9);
const exportError=exportPath&&majorRoads&&!model.provenance.majorRoads.applied?'No s’exporta un control RO-051 que ha recuperat els camins anteriors.':exportPath&&audit?.some(p=>p.errors.length)?'No s’exporta un control que no supera l’auditoria.':undefined;
if(exportPath&&!exportError)await writeFile(exportPath,threeMF(model));
console.log('RO051_RESULT '+JSON.stringify({seconds,dimensions:[model.width,model.height],scale:model.scale,buildingSource,estimatedTunnels,major:{enabled:model.provenance.majorRoads.enabled,applied:model.provenance.majorRoads.applied,count:model.provenance.majorRoads.count,omissions:model.provenance.majorRoads.omissions,error:model.provenance.majorRoads.error},completion:model.provenance.infrastructure?.completion?.details.map(p=>({id:p.id,piers:p.piers.length,unsupported:p.maxUnsupportedSpanMM,connections:p.approaches.length,unconnectedEnds:p.unconnectedEnds})),continuity:model.provenance.transportContinuity,tunnels:model.provenance.tunnels,audit,exportPath:exportError?undefined:exportPath,exportError}));
if(exportError||audit?.some(p=>p.errors.length))process.exitCode=1;
