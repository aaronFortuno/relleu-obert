// RO-051 prototype only: never enabled by the published UI in v0.18.1.
import {readFile} from 'node:fs/promises';
import {freemem} from 'node:os';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {buildModel} from '../src/geometry.js';
import {physicalBBox} from '../src/selection.js';
if(process.argv.includes('--help')){
 console.log('node --max-old-space-size=1536 scripts/diagnose-major-roads.mjs [km=3] [mm=150] [detail=12]\nRO-051 opt-in prototype; run alone, with at least 4 GB free. May take several minutes at 3 km.');process.exit(0);
}
const [km=3,mm=150,resolution=12]=process.argv.slice(2).map(Number);
if(![km,mm,resolution].every(Number.isFinite)||km<=0||mm<50||mm>450||!Number.isInteger(resolution)||resolution<2||resolution>100)throw Error('Arguments invàlids. Consulta --help.');
if(freemem()/2**30<4)throw Error('Calen almenys 4 GB lliures per iniciar el diagnòstic.');
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const api=await Module();api.setup();
globalThis.fetch=async url=>new Response(await readFile(new URL('../public/'+String(url).replace(/^\.\//,''),import.meta.url)));
const data=await loadRegion({sample:'eix-diagonal',buildingSource:'osm',decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode)});
const centre=km===1.5||km===2.4?[41.71792,1.78391]:[41.72213,1.779785],start=Date.now();
console.log({km,mm,resolution,majorRoads:true,initialFreeGB:freemem()/2**30});
const model=buildModel({...data,meta:{...data.meta,bbox:physicalBBox(centre,km,km)}},{size:mm,widthMM:mm,heightMM:mm,resolution,trees:false,majorRoads:true},message=>console.log(Math.round((Date.now()-start)/1000)+'s',message),api);
console.log(JSON.stringify({seconds:(Date.now()-start)/1000,major:{applied:model.provenance.majorRoads.applied,count:model.provenance.majorRoads.count,omissions:model.provenance.majorRoads.omissions,error:model.provenance.majorRoads.error},completion:model.provenance.infrastructure?.completion?.details.map(p=>({id:p.id,piers:p.piers.length,unsupported:p.maxUnsupportedSpanMM}))},null,2));
