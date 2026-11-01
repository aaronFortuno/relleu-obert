import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchOfficialBuildings,combineBuildings,officialBuilding} from '../src/buildings.js';
import {readFileSync} from 'node:fs';
const building=(id,x=0,h=8)=>({type:'Feature',properties:{OBJECTID:id,altura:h,sourceLayer:'building'},geometry:{type:'Polygon',coordinates:[[[x,0],[x+1,0],[x+1,1],[x,1],[x,0]]]}});
test('official footprints replace overlapping OSM buildings while retaining uncovered ones',()=>{
  const combined=combineBuildings([building(1),building(2,3)],{features:[officialBuilding(building(3))],metadata:{provider:'ICGC'}});
  assert.equal(combined.features.length,2);assert.equal(combined.metadata.osmReplaced,1);assert.equal(combined.metadata.osmRetained,1);
});
test('invalid official heights receive a marked estimate',()=>{
  for(const h of [-9999,Infinity,null,90000]){const f=officialBuilding(building(1,0,h));assert.equal(f.properties.render_height,6);assert(f.properties.height_estimated);}
  assert.equal(officialBuilding(building(1,0,9.5)).properties.render_height,9.5);
});
test('an official match replaces only one footprint in a grouped OSM MultiPolygon',()=>{
  const grouped={...building(1),geometry:{type:'MultiPolygon',coordinates:[building(1).geometry.coordinates,building(2,3).geometry.coordinates]}};
  const c=combineBuildings([grouped],{features:[officialBuilding(building(4))],metadata:{provider:'ICGC'}});
  assert.equal(c.metadata.osmReplaced,1);assert.equal(c.metadata.osmRetained,1);assert.equal(c.features[0].geometry.coordinates.length,1);assert.equal(c.features[0].geometry.coordinates[0][0][0][0],3);
});
test('official queries paginate, request real buildings and explicitly discard source Z coordinates',async()=>{
  let calls=0;
  const result=await fetchOfficialBuildings([3.196,41.91,3.219,41.926],async url=>{const u=new URL(url);assert.equal(u.searchParams.get('returnZ'),'false');assert(u.searchParams.get('where').includes("tipus = 'edi'"));assert.equal(u.searchParams.get('resultOffset'),String(calls*1000));const features=calls++===0?Array.from({length:1000},(_,i)=>building(i)): [building(1000)];return {ok:true,json:async()=>({features})};});
  assert.equal(result.features.length,1001);assert.equal(calls,2);
});
test('failed official query does not become a successful empty dataset',async()=>{
  await assert.rejects(fetchOfficialBuildings([3,41,3.01,41.01],async()=>({ok:true,json:async()=>({error:{message:'query failed'}})})),/vàlides/);
});
test('the Perica block already exists as one official polygon; combining preserves every source outline and courtyard',()=>{
  const official=JSON.parse(readFileSync(new URL('../public/data/tamariu-buildings-icgc.geojson',import.meta.url),'utf8'));
  const block=official.features.find(f=>f.id==='icgc-1074761');assert(block);assert.equal(block.geometry.type,'Polygon');assert.equal(block.geometry.coordinates.length,1);assert.equal(block.geometry.coordinates[0].length,29);
  const combined=combineBuildings([],official);assert.equal(combined.features.length,official.features.length);
  for(const f of official.features)assert.deepEqual(combined.features.find(g=>g.id===f.id).geometry,f.geometry);
  const courtyard=building('court');courtyard.geometry.coordinates.push([[.2,.2],[.2,.8],[.8,.8],[.8,.2],[.2,.2]]);
  const adjacent=building('next',1);const result=combineBuildings([],{features:[courtyard,adjacent]});
  assert.equal(result.features.length,2);assert.deepEqual(result.features[0].geometry,courtyard.geometry);assert.deepEqual(result.features[1].geometry,adjacent.geometry);
});
