import test from 'node:test';
import assert from 'node:assert/strict';
import {buildModel,updateBuildings} from '../src/geometry.js';
import {loadBuildingLayer,applyBuildingLayer,defaultBuildingSource} from '../src/sources.js';
import {threeMF} from '../src/export.js';
import {unzipSync,strFromU8} from 'fflate';
const polygon=(id,ring,properties)=>({type:'Feature',id,properties,geometry:{type:'Polygon',coordinates:[ring]}});
const forest=polygon('forest',[[0,0],[.01,0],[.01,.01],[0,.01],[0,0]],{sourceLayer:'landcover',class:'wood'});
const house=polygon('A_part1',[[.004,.004],[.006,.004],[.006,.006],[.004,.006],[.004,.004]],{sourceLayer:'building',render_height:9,family:'A'});
const region={meta:{bbox:[0,0,.01,.01]},features:[forest],dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4)}]};
test('changing buildings preserves terrain/cover buffers and surviving crowns; height changes keep every crown',()=>{
 const base=buildModel(region,{size:60,resolution:3,density:.5}),added=updateBuildings(base,{features:[house],meta:{...region.meta,buildingSource:'catastre'}},{buildingMode:'limited',maxBuildingHeight:5});
 assert.equal(base.buildingCount,0);assert.equal(added.buildingCount,1);assert(added.treeCount<base.treeCount);assert(added.treeCount>0);
 for(const c of base.categories.filter(p=>p.id!=='trees'))assert.strictEqual(added.categories.find(p=>p.id===c.id).vertices,c.vertices);
 assert(added.context.placements.every(p=>base.context.placements.includes(p)));assert(!base.context.containsBuilding([30,30]));assert(added.context.containsBuilding([30,30]));
 const lowered=updateBuildings(added,{}, {maxBuildingHeight:2});assert.strictEqual(lowered.categories.find(p=>p.id==='trees').vertices,added.categories.find(p=>p.id==='trees').vertices);
 assert.equal(added.provenance.options.maxBuildingHeight,5);assert.equal(lowered.provenance.options.maxBuildingHeight,2);
 assert.throws(()=>updateBuildings(added,{}, {maxBuildingHeight:0}));assert.equal(added.provenance.options.maxBuildingHeight,5);
 const files=unzipSync(threeMF(lowered)),provenance=JSON.parse(strFromU8(files['Metadata/provenance.json']));assert.equal(provenance.buildingVolumes[0].id,'A_part1');assert.equal(provenance.buildingSource,'catastre');
});
test('building-source changes fetch only the requested layer and cache successful results',async()=>{
 const bbox=[3.2,41.91,3.21,41.92],osm={...house,id:'osm-house'},dem=[{}],r={meta:{bbox},vectorFeatures:[osm],features:[osm],dem,terrainWarnings:[]},previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;assert(String(url).includes('topografia_territorial'));return new Response(JSON.stringify({features:[{...house,properties:{OBJECTID:1,altura:7}}]}));};
 try{
  const icgc=await loadBuildingLayer(r,{source:'icgc'});assert.equal(calls,1);applyBuildingLayer(r,icgc);assert.strictEqual(r.dem,dem);assert.strictEqual(r.vectorFeatures[0],osm);
  const original=await loadBuildingLayer(r,{source:'osm'});assert.deepEqual(original.features,[osm]);assert.equal(calls,1);
  assert.strictEqual((await loadBuildingLayer(r,{source:'icgc'})).features,icgc.features);assert.equal(calls,1);
  assert.equal(defaultBuildingSource(bbox),'icgc');assert.equal(defaultBuildingSource([10,48,10.01,48.01]),'osm');
  await assert.rejects(()=>loadBuildingLayer({...r,meta:{bbox:[10,48,10.01,48.01]}},{source:'icgc'}),/àmbit català/);
 }finally{globalThis.fetch=previous;}
});
