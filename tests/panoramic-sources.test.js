import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRegion} from '../src/sources.js';
import {physicalBBox,selectionPose} from '../src/selection.js';

const bbox=selectionPose(physicalBBox([42.8,.75],450,90),15).bbox;
const decode=async(_,tile)=>({...tile,size:2,elev:new Float32Array(4).fill(700)});

test('the coast-to-coast envelope uses bounded terrain and vector loads in panoramic relief',async t=>{
  const previous=globalThis.fetch,requests=[];
  let active=0,peak=0;
  globalThis.fetch=async value=>{
    const url=String(value);
    requests.push(url);
    if(url.startsWith('https://tiles.mapterhorn.com/')){
      active++;
      peak=Math.max(peak,active);
      await new Promise(resolve=>setImmediate(resolve));
      active--;
      return new Response('elevation');
    }
    if(url==='https://tiles.openfreemap.org/planet')
      return Response.json({tiles:['https://vectors.invalid/{z}/{x}/{y}.pbf']});
    if(url.startsWith('https://vectors.invalid/'))return new Response(new Uint8Array());
    return new Response(null,{status:503});
  };
  t.after(()=>{globalThis.fetch=previous;});

  await assert.rejects(loadRegion({bbox,pureRelief:true,decodeElevation:decode}),/límits de Relleu pur/);
  await assert.rejects(loadRegion({bbox,panoramic:true,decodeElevation:decode}),/només es pot generar en Relleu pur/);
  assert.equal(requests.length,0);
  const region=await loadRegion({bbox,panoramic:true,pureRelief:true,decodeElevation:decode});
  assert.equal(region.meta.panoramic,true);
  assert.equal(region.meta.terrain.zoom,10);
  assert.equal(region.dem.length,136);
  assert.equal(peak,4);
  assert.equal(region.meta.forests.zoom,9);
  assert.equal(region.meta.forests.tileCount,45);
  assert.equal(region.meta.forests.failures,0);
  assert.equal(region.meta.buildingSource,null);
  assert.deepEqual(region.features,[]);
});

test('panoramic terrain retries a coarser zoom instead of flattening unverified land',async t=>{
  const previous=globalThis.fetch,requests=[];
  globalThis.fetch=async value=>{
    const url=String(value);
    requests.push(url);
    if(url.startsWith('https://tiles.mapterhorn.com/9/'))return new Response('elevation');
    return new Response(null,{status:404});
  };
  t.after(()=>{globalThis.fetch=previous;});
  const region=await loadRegion({bbox,panoramic:true,pureRelief:true,decodeElevation:decode});
  assert.equal(region.meta.terrain.zoom,9);
  assert.equal(region.meta.terrain.fallback,true);
  assert.equal(region.meta.terrain.oceanTiles,0);
  assert.equal(region.dem.length,45);
  assert(region.dem.every(tile=>tile.elev.every(height=>height===700)));
  assert.equal(requests.filter(url=>url==='https://tiles.openfreemap.org/planet').length,1);
});
