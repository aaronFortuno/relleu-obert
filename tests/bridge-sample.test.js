import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import decode,{init} from '@jsquash/webp/decode.js';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {buildModel,updateBuildings,updateVegetation} from '../src/geometry.js';
import {placeSelection} from '../src/recommended-places.js';
import {projectInfrastructurePath} from '../src/infrastructure-solids.js';

test('Manresa keeps surveyed deck clearance, provenance, and geometry across layer updates',async()=>{
 await init(await WebAssembly.compile(await readFile('node_modules/@jsquash/webp/codec/dec/webp_dec.wasm')));
 const prior=globalThis.fetch;
 try{
  globalThis.fetch=async url=>new Response(await readFile(new URL('../public/'+String(url).replace(/^\.\//,''),import.meta.url)));
  const data=await loadRegion({sample:'eix-diagonal',bbox:placeSelection('eix-diagonal'),buildingSource:'icgc',decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode)});
  const model=buildModel(data,{size:150,widthMM:150,heightMM:150,resolution:24,trees:false,exaggeration:1.5});
  assert.equal(model.provenance.infrastructure.count,4);
  assert.equal(model.provenance.infrastructure.printableThicknessMM,.6);
  const deck=data.infrastructure.items.find(p=>p.id==='ifc-127512');assert(deck);
  const points=projectInfrastructurePath(deck.coordinates,model.context.proj,model.context.verticalReference,1.5);
  const clearance=points.map(([x,y,z])=>z-.6-model.context.ground(x,y));
  assert(Math.max(...clearance)>2,'the deck must retain open air above the valley');
  const road=model.categories.find(p=>p.id==='roads');assert(road.faces.length);
  const buildings=updateBuildings(model,{features:data.features,meta:data.meta},{maxBuildingHeight:3});
  assert.equal(buildings.provenance.infrastructure.count,4);
  assert.strictEqual(buildings.categories.find(p=>p.id==='roads').vertices,road.vertices);
  const vegetation=updateVegetation(buildings,{trees:false,density:.5});
  assert.strictEqual(vegetation.categories.find(p=>p.id==='roads').vertices,road.vertices);
 }finally{globalThis.fetch=prior;}
});
