import {readFile} from 'node:fs/promises';
import decode,{init} from '@jsquash/webp/decode.js';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {physicalBBox} from '../src/selection.js';
import {generateProceduralBridgeItems} from '../src/procedural-bridges.js';
import {sampleHeight} from '../src/elevation.js';

await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const nativeFetch=globalThis.fetch;
let vectorSource;
globalThis.fetch=(url,opts)=>{
  if(String(url).startsWith('./'))return Promise.resolve(new Response(null,{status:404}));
  if(String(url).endsWith('.pbf'))vectorSource??=new URL(url).pathname.split('/').slice(0,-3).join('/');
  return nativeFetch(url,opts);
};
const ids=new Set([42968122,42968132]),centre=[44.0797,3.0226];
const mesh=process.argv.includes('--mesh');
const profiles=process.argv.includes('--profiles');
const resolution=Number(process.argv.find(arg=>arg.startsWith('--detail='))?.slice(9)??12);
const requestedKm=process.argv.find(arg=>arg.startsWith('--km='))?.slice(5);
let api,buildModel,auditPart;
if(mesh){
  const {default:Module}=await import('manifold-3d');
  api=await Module();api.setup();
  ({buildModel}=await import('../src/geometry.js'));
  ({auditPart}=await import('../src/solid-audit.js'));
}
for(const km of requestedKm?[Number(requestedKm)]:[3,1.4]){
  const bbox=physicalBBox(centre,km,km);
  const data=await loadRegion({sample:false,bbox,buildingSource:'osm',decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode)});
  const at=(lon,lat)=>sampleHeight([...data.dem,...data.bridgeDem],lon,lat);
  const ways=[...data.features,...data.bridgeFeatures].filter(f=>ids.has(f.id)&&f.properties.brunnel==='bridge'&&!data.incompleteBridgeIds.includes(f.id));
  const {items,warnings}=generateProceduralBridgeItems(ways,at,{bbox,scale:150/(1000*km)});
  const fragments=ways.flatMap(({id,geometry})=>{
    const lines=geometry.type==='MultiLineString'?geometry.coordinates:[geometry.coordinates];
    return lines.map(line=>({id,ends:[line[0],line.at(-1)].map(point=>{
      try{return {point,metres:at(...point)};}
      catch(error){return {point,error:error.message};}
    })}));
  });
  const decks=items.map(i=>({ids:i.sourceFeatureIds,ends:[i.axis[0],i.axis.at(-1)],elevations:[at(...i.axis[0]),at(...i.axis.at(-1))]}));
  let model;
  if(mesh){
    const result=buildModel(data,{size:150,resolution,trees:false,estimatedTunnels:true,majorRoads:profiles,smoothProfiles:profiles},()=>{},api);
    const stats=result.provenance.infrastructure?.completion?.details||[];
    model={decks:result.context.bridges.filter(b=>b.sourceFeatureIds?.some(id=>ids.has(id))).map(b=>{
      const detail=stats.find(d=>d.id===b.id);
      return {id:b.id,sourceFeatureIds:b.sourceFeatureIds,joins:detail.approaches.length,piers:detail.piers.length,unsupported:detail.maxUnsupportedSpanMM,unconnected:detail.unconnectedEnds};
    }),profiles:profiles?result.provenance.majorRoads:undefined,audit:result.categories.map(auditPart).map(({id,errors})=>({id,errors}))};
    if(model.decks.length!==2||model.audit.some(a=>a.errors.length))process.exitCode=1;
  }
  console.log(JSON.stringify({centre,km,resolution,vectorSource,tiles:data.meta.tiles.length,dem:data.dem.length,coverage:data.meta.bridgeCoverage,fragments,decks,model,warnings},null,2));
}
