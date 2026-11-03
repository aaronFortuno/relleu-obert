import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {freemem} from 'node:os';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {buildModel} from '../src/geometry.js';
import {physicalBBox} from '../src/selection.js';
import {auditPart} from '../src/solid-audit.js';
import {threeMF} from '../src/export.js';

const cases={
  guardiola:{center:[41.68075,1.754],km:[1.5,3],bridges:[317898440],tunnels:[317900732]},
  millau:{center:[44.0797,3.0226],km:[1.5,3],bridges:[42968122,42968132],tunnels:[]},
  rail:{center:[41.724,1.788],km:[.4,.8],bridges:[],tunnels:[]}
};
const [name,extent]=process.argv.slice(2),scenario=cases[name],km=Number(extent);
if(!scenario?.km.includes(km))throw Error('Ús: diagnose-transport-battery.mjs guardiola|millau 1.5|3, o rail 0.4|0.8');
if(freemem()/2**30<2.5)throw Error('Calen almenys 2,5 GiB lliures.');
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
  if(!String(url).startsWith('./'))return nativeFetch(url,options);
  try{return new Response(await readFile(new URL('../public/'+String(url).slice(2),import.meta.url)));}
  catch(error){if(error.code==='ENOENT')return new Response(null,{status:404});throw error;}
};
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const bbox=physicalBBox(scenario.center,km,km),started=performance.now();
const data=await loadRegion({sample:false,bbox,buildingSource:'osm',
  decodeElevation:async(blob,tile)=>decodeDEMTile(await blob.arrayBuffer(),tile,decode)});
const options={size:150,resolution:36,exaggeration:1.5,trees:false,majorRoads:true,smoothProfiles:true,estimatedTunnels:true};
const api=await Module();api.setup();
const built=performance.now(),model=buildModel(data,options,()=>{},api);
const {majorRoads,tunnels,infrastructure}=model.provenance;
const matches=(expected,items)=>expected.map(id=>({id,present:items.some(item=>item.sourceFeatureIds?.includes(id))}));
const audit=model.categories.map(auditPart).map(({id,errors,triangles})=>({id,errors,triangles}));
const report={name,center:scenario.center,km,scale:model.scale,bbox,options,terrain:data.meta.terrain,
  timings:{sourcesMs:built-started,buildMs:performance.now()-built},
  checks:{bridges:matches(scenario.bridges,infrastructure?.deckProfiles||[]),tunnels:matches(scenario.tunnels,tunnels?.profiles||[])},
  major:{applied:majorRoads?.applied,omissions:majorRoads?.omissions,error:majorRoads?.error,
    profiles:(majorRoads?.profiles||[]).map(p=>({ids:p.sourceFeatureIds,class:p.roadClass,railway:p.railway,method:p.elevationMethod,
      maximumGrade:p.maximumGrade,largestGradeChange:largestGradeChange(p)}))},
  tunnels:{applied:tunnels?.applied,count:tunnels?.count,omissions:tunnels?.omissions,error:tunnels?.error},
  decks:(infrastructure?.deckProfiles||[]).filter(p=>!p.mainRoad),
  continuity:model.provenance.transportContinuity,
  audit,warnings:model.warnings};
const path='output/transport-battery/'+name+'-'+km;
await mkdir('output/transport-battery',{recursive:true});
await writeFile(path+'.json',JSON.stringify(report,null,2)+'\n');
if(audit.every(part=>!part.errors.length))await writeFile(path+'.3mf',threeMF(model,{bambu:true}));
else process.exitCode=1;
console.log(JSON.stringify({name,km,scale:model.scale,checks:report.checks,profiles:report.major.profiles.length,
  railwayProfiles:report.major.profiles.filter(p=>p.railway).length,omissions:report.major.omissions?.length,timings:report.timings,
  audit:audit.every(part=>!part.errors.length),path}));

function largestGradeChange({stations,elevations}){
  let previous,max=0;
  for(let i=1;i<stations.length;i++){
    const grade=(elevations[i]-elevations[i-1])/(stations[i]-stations[i-1]);
    if(previous!==undefined)max=Math.max(max,Math.abs(grade-previous));
    previous=grade;
  }
  return max;
}
