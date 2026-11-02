import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {loadInfrastructureOverrides} from '../src/infrastructure-registry.js';import {loadRegion} from '../src/sources.js';
test('Rajadell override follows geographic intersection across zoom/pan, not the sample button',async()=>{
 let calls=0;const read=async name=>{calls++;return JSON.parse(await readFile(new URL('../public/data/'+name,import.meta.url)));};
 const large=await loadInfrastructureOverrides([1.774,41.71,1.794,41.726],read),zoom=await loadInfrastructureOverrides([1.781,41.716,1.786,41.720],read),pan=await loadInfrastructureOverrides([1.7815,41.717,1.787,41.721],read);
 assert.equal(large.items.length,4);for(const r of [zoom,pan]){const p=r.items.find(i=>i.id==='ifc-127512');assert(p);assert.strictEqual(p,large.items.find(i=>i.id==='ifc-127512'));assert.equal(r.layouts.items['ifc-127512'].stationsMetres.length,11);}
 assert.equal(calls,2);assert.equal(await loadInfrastructureOverrides([3.20,41.91,3.22,41.93],read),null);assert.equal(calls,2);
});
test('failed override reads are retryable and do not poison the cache',async()=>{
 let fail=true;const read=async name=>{if(fail)throw Error('temporary');return JSON.parse(await readFile(new URL('../public/data/'+name,import.meta.url)));};
 const bbox=[1.781,41.716,1.786,41.720];await assert.rejects(()=>loadInfrastructureOverrides(bbox,read),/temporary/);fail=false;assert((await loadInfrastructureOverrides(bbox,read)).items.length);
 await assert.rejects(()=>loadInfrastructureOverrides([2,42,1,41],read),/invàlid/);
});
test('live-region loading in Rajadell attaches the same bridge geometry after moving the map',async()=>{
 const old=globalThis.fetch;globalThis.fetch=async value=>{const url=String(value);if(url.endsWith('/planet'))return Response.json({tiles:['https://fixture/{z}-{x}-{y}.pbf']});const name=url.startsWith('https://fixture/')?url.slice('https://fixture/'.length):url.replace(/^\.\/data\//,'');return new Response(await readFile(new URL('../public/data/'+name,import.meta.url)));};
 try{for(const bbox of [[1.781,41.716,1.786,41.720],[1.7815,41.717,1.787,41.721]]){const r=await loadRegion({sample:false,bbox,buildingSource:'osm',localDEM:{metadata:{file:'test'}}});assert(r.features.length);assert(r.infrastructure.items.some(i=>i.id==='ifc-127512'));assert.equal(r.infrastructure.selection,'geographic override, independent of sample mode');}}
 finally{globalThis.fetch=old;}
});
