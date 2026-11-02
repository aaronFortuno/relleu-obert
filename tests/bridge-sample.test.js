import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import decode,{init} from '@jsquash/webp/decode.js';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {buildModel,updateBuildings,updateVegetation} from '../src/geometry.js';
import {placeSelection} from '../src/recommended-places.js';
import {projectInfrastructurePath} from '../src/infrastructure-solids.js';
import Module from 'manifold-3d';
import {polygonOps} from '../src/polygon-ops.js';

test('Manresa keeps surveyed deck clearance, provenance, and geometry across layer updates',async()=>{
 await init(await WebAssembly.compile(await readFile('node_modules/@jsquash/webp/codec/dec/webp_dec.wasm')));
 const api=await Module();api.setup();
 const prior=globalThis.fetch;
 try{
  globalThis.fetch=async url=>new Response(await readFile(new URL('../public/'+String(url).replace(/^\.\//,''),import.meta.url)));
  const data=await loadRegion({sample:'eix-diagonal',bbox:placeSelection('eix-diagonal'),buildingSource:'icgc',decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode)});
  const model=buildModel(data,{size:150,widthMM:150,heightMM:150,resolution:24,trees:false,exaggeration:1.5},()=>{},api);
  assert.equal(model.provenance.infrastructure.count,4);
  assert.equal(model.provenance.infrastructure.printableThicknessMM,.6);
  const deck=data.infrastructure.items.find(p=>p.id==='ifc-127512');assert(deck);
  const points=projectInfrastructurePath(deck.coordinates,model.context.proj,model.context.verticalReference,1.5);
  const clearance=points.map(([x,y,z])=>z-.6-model.context.ground(x,y));
  assert(Math.max(...clearance)>2,'the deck must retain open air above the valley');
  const road=model.categories.find(p=>p.id==='roads');assert(road.faces.length);
  const completion=model.provenance.infrastructure.completion,large=completion.details.find(p=>p.id==='ifc-127512');
  assert.equal(completion.union,true);assert(large.piers.length>=6);assert.equal(large.approaches.length,2);assert.deepEqual(large.unconnectedEnds,[]);assert.equal(large.connectedComponents,1);
  for(const p of large.approaches)for(const side of ['left','right']){const end=p.sections.at(-1)[side];assert(Math.abs(end[2]-model.context.ground(end[0],end[1]))<1e-6);}
  const pc=polygonOps();for(const p of large.piers)for(const blocked of [model.context.roadPoly,model.context.buildingMask])if(blocked.length)assert.equal(pc.intersection([[p.ring.concat([p.ring[0]])]],blocked).length,0);
  const buildings=updateBuildings(model,{features:data.features,meta:data.meta},{maxBuildingHeight:3});
  assert.equal(buildings.provenance.infrastructure.count,4);
  assert.strictEqual(buildings.categories.find(p=>p.id==='roads').vertices,road.vertices);
  const vegetation=updateVegetation(buildings,{trees:false,density:.5});
  assert.strictEqual(vegetation.categories.find(p=>p.id==='roads').vertices,road.vertices);
  const [x,y]=large.piers[0].center,ring=[[x-.7,y-.7],[x+.7,y-.7],[x+.7,y+.7],[x-.7,y+.7],[x-.7,y-.7]].map(model.context.proj.unproject),house={type:'Feature',properties:{sourceLayer:'building',render_height:3},geometry:{type:'Polygon',coordinates:[ring]}};
  const changed=updateBuildings(model,{features:[...data.features,house],meta:data.meta});
  assert.strictEqual(changed.categories.find(p=>p.id==='terrain').vertices,model.categories.find(p=>p.id==='terrain').vertices);
  assert.notStrictEqual(changed.categories.find(p=>p.id==='roads').vertices,road.vertices);
  for(const s of changed.provenance.infrastructure.completion.details)for(const p of s.piers)assert.equal(pc.intersection([[p.ring.concat([p.ring[0]])]],changed.context.buildingMask).length,0);
  assert.equal(model.provenance.infrastructure.completion,completion);
  const raised=buildModel(data,{size:150,widthMM:150,heightMM:150,resolution:24,trees:false,exaggeration:1.5,roadRise:1},()=>{},api),highBridge=raised.provenance.infrastructure.completion.details.find(p=>p.id==='ifc-127512');
  assert.equal(highBridge.connectedComponents,1);assert.equal(highBridge.approaches.length,2);assert.equal(raised.provenance.infrastructure.printableThicknessMM,1.6);
  for(const p of highBridge.approaches)for(const side of ['left','right']){const end=p.sections.at(-1)[side];assert(Math.abs(end[2]-raised.context.ground(end[0],end[1])-1)<1e-6);}
 }finally{globalThis.fetch=prior;}
});
