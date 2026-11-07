import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {loadMet5} from '../src/met5.js';
import {readVector,tileList} from '../src/sources.js';

async function request(url){
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error(`HTTP ${response.status} · ${url}`);
  return response;
}

export async function roadCouponSnapshot(file,bbox){
  try{return JSON.parse(await readFile(file));}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const dem=await loadMet5(bbox);
  assert(dem,'El retall ha d’estar cobert pel MET5.');
  const {tiles:[template]}=await (await request('https://tiles.openfreemap.org/planet')).json();
  const features=[];
  for(const tile of tileList(bbox)){
    const url=template.replace('{x}',tile.x).replace('{y}',tile.y).replace('{z}',tile.z);
    const bytes=await (await request(url)).arrayBuffer();
    features.push(...readVector(new Uint8Array(bytes),tile,['transportation','water','waterway']));
  }
  const data={meta:{bbox,terrain:dem.metadata,vectorTemplate:template},features,
    terrainRaster:{...dem.raster,values:Array.from(dem.raster.values)}};
  await writeFile(file,JSON.stringify(data));
  return data;
}
