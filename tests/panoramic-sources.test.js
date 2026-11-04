import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildRequest} from '../src/build-request.js';
import {loadRegion} from '../src/sources.js';
import {physicalBBox,selectionPose} from '../src/selection.js';

const bbox=selectionPose(physicalBBox([42.8,.75],450,90),15).bbox;
const decode=async(_,tile)=>({...tile,size:2,elev:new Float32Array(4).fill(700)});

test('bundled Tamariu sea polygons reach the worker in both pure relief formats',async t=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async value=>{
    const url=String(value);
    if(url.startsWith('./data/'))return new Response(await readFile(new URL('../public/'+url.slice(2),import.meta.url)));
    if(url.startsWith('https://tiles.mapterhorn.com/'))return new Response('elevation');
    throw Error('Unexpected request '+url);
  };
  t.after(()=>{globalThis.fetch=previous;});
  const catalog=JSON.parse(await readFile(new URL('../public/data/tamariu.json',import.meta.url),'utf8'));
  for(const panoramic of [false,true]){
    const region=await loadRegion({bbox:catalog.bbox,sample:'tamariu',pureRelief:true,panoramic,decodeElevation:decode});
    assert(region.oceans.length>0);
    assert(region.oceans.every(({properties,geometry})=>properties.class==='ocean'&&['Polygon','MultiPolygon'].includes(geometry.type)));
    assert(region.lakes.some(({properties})=>properties.class==='swimming_pool'));
    assert(region.lakes.every(({properties})=>properties.class!=='ocean'));
    assert.equal(region.meta.oceans.count,region.oceans.length);
    assert.equal(region.meta.oceans.provider,'OpenStreetMap · OpenFreeMap');
    assert.equal(region.meta.oceans.zoom,14);
    const request=structuredClone(buildRequest(region,{pureRelief:true}));
    assert.deepEqual(request.region.oceans,region.oceans);
  }
});

test('standard pure relief recovers missing elevation over verified open sea',async t=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async value=>{
    const url=String(value);
    if(url.startsWith('./data/'))return new Response(await readFile(new URL('../public/'+url.slice(2),import.meta.url)));
    return new Response(null,{status:404});
  };
  t.after(()=>{globalThis.fetch=previous;});
  const region=await loadRegion({bbox:physicalBBox([41.912,3.217],.1,.1),sample:'tamariu',pureRelief:true,
    decodeElevation:()=>assert.fail('Missing elevation tiles cannot be decoded')});
  assert.equal(region.meta.terrain.oceanTiles,1);
  assert.equal(region.dem.length,1);
  assert(region.dem[0].elev.every(height=>height===0));
});

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
