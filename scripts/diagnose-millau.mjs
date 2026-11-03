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
for(const km of [3,1.4]){
  const bbox=physicalBBox(centre,km,km);
  const data=await loadRegion({sample:false,bbox,buildingSource:'osm',decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode)});
  const at=(lon,lat)=>sampleHeight(data.dem,lon,lat);
  const ways=data.features.filter(f=>ids.has(f.id)&&f.properties.brunnel==='bridge');
  const {items,warnings}=generateProceduralBridgeItems(ways,at,{bbox,scale:150/(1000*km)});
  const fragments=ways.flatMap(({id,geometry})=>{
    const lines=geometry.type==='MultiLineString'?geometry.coordinates:[geometry.coordinates];
    return lines.map(line=>({id,ends:[line[0],line.at(-1)].map(point=>{
      try{return {point,metres:at(...point)};}
      catch(error){return {point,error:error.message};}
    })}));
  });
  console.log(JSON.stringify({centre,km,vectorSource,tiles:data.meta.tiles.length,dem:data.dem.length,fragments,
    decks:items.map(i=>({ids:i.sourceFeatureIds,ends:[i.axis[0],i.axis.at(-1)]})),warnings},null,2));
}
