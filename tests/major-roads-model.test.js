import test from 'node:test';import assert from 'node:assert/strict';import Module from 'manifold-3d';
import {buildModel,updateBuildings,updateVegetation,updateTransport} from '../src/geometry.js';
import {auditPart} from '../src/solid-audit.js';import {threeMF} from '../src/export.js';import {unzipSync,strFromU8} from 'fflate';
const api=await Module();api.setup();
function region(roadClass='motorway'){
  const values=new Float32Array(121);for(let y=0;y<11;y++)for(let x=0;x<11;x++)values[y*11+x]=100+4*Math.sin(x*Math.PI/2)+y*.2;
  return {meta:{bbox:[0,0,.01,.01]},localDEM:{width:11,height:11,epsg:4326,affine:[.001,0,0,0,.001,0],pixelIsArea:false,values,metadata:{}},features:[{type:'Feature',id:'main-road',properties:{sourceLayer:'transportation',class:roadClass},geometry:{type:'LineString',coordinates:[[.0001,.005],[.0099,.005]]}}]};
}
const options={size:100,resolution:6,trees:false,estimatedTunnels:false,majorRoads:true};
test('a major road keeps its flat platform only when the crossing bore is opened and clear',()=>{
  const data=region(),{values}=data.localDEM;
  for(let y=0;y<11;y++)values.set([0,10,20,30,40,50,40,30,20,10,0],y*11);
  data.features[0].geometry.coordinates=[[.005,0],[.005,.01]];
  const bore={id:'hill-bore',properties:{sourceLayer:'transportation',class:'trunk',brunnel:'tunnel'},
    geometry:{type:'LineString',coordinates:[[.001,.005],[.009,.005]]}};
  data.features.push(bore);
  const config={...options,resolution:12,smoothProfiles:true,estimatedTunnels:true};
  const opened=buildModel(data,config,()=>{},api);
  assert.equal(opened.provenance.tunnels.applied,true);
  assert.equal(opened.provenance.majorRoads.applied,true);
  assert(opened.provenance.majorRoads.tunnelCrossings.some(c=>c.featureId===bore.id&&c.minimumClearanceMM>.6));
  const platform=opened.context.bridges.find(bridge=>bridge.mainRoad);
  assert(Math.abs(platform.top(49.8,50)-platform.top(50.2,50))<.00001);

  bore.geometry.coordinates[0]=[-.01,.005]; // outside DEM, so the bore cannot open
  const fallback=buildModel(data,config,()=>{},api);
  assert.equal(fallback.provenance.tunnels.count,0);
  assert.equal(fallback.provenance.majorRoads.applied,false);
  assert.match(fallback.provenance.majorRoads.error,/no s’ha pogut obrir la volta/);
  assert(fallback.categories.find(p=>p.id==='roads')?.faces.length);
  for(const model of [opened,fallback])for(const part of model.categories)assert.deepEqual(auditPart(part).errors,[]);
});

test('updating transport keeps the MET5 window when the mapped axis extends outside it',()=>{
  const {localDEM,...data}=region();
  data.terrainRaster={...localDEM,width:13,height:13,affine:[.001,0,-.001,0,.001,-.001],values:new Float32Array(169).fill(100)};
  data.features[0].geometry.coordinates=[[-.01,.005],[.02,.005]];
  const initial=buildModel(data,{...options,smoothProfiles:true},()=>{},api);
  const updated=updateTransport(initial,{roadRise:.5});
  assert.equal(initial.provenance.majorRoads.count,1);
  assert.equal(updated.provenance.majorRoads.count,1);
  assert.strictEqual(updated.context.ground,initial.context.ground);
});
test('surface rail platforms remain independent of the major road setting',()=>{
  const data=region('rail');
  const initial=buildModel(data,{...options,majorRoads:false,smoothProfiles:true},()=>{},api);
  const updated=updateTransport(initial,{majorRoads:true});
  assert.equal(updated.context.ground,initial.context.ground);
  assert.equal(updated.provenance.majorRoads.applied,false);
  assert.equal(updated.provenance.railways.profiles,1);
  const rail=model=>model.categories.find(part=>part.id==='railways');
  assert.deepEqual(updated.provenance.railways,initial.provenance.railways);
  assert.deepEqual(rail(updated).vertices,rail(initial).vertices);
  assert(!updated.categories.some(part=>part.id==='roads'));
  for(const part of updated.categories)assert.deepEqual(auditPart(part).errors,[]);
});
test('upper-envelope platforms retain the exact terrain heights, a level cross-section and supported free spans',()=>{
  const data=region(),before=data.localDEM.values.slice(),raw=buildModel(data,{...options,majorRoads:false},()=>{},api),model=buildModel(data,options,()=>{},api);
  assert.equal(model.provenance.majorRoads.applied,true);assert.equal(model.provenance.majorRoads.count,1);assert.equal(model.provenance.majorRoads.terrainModified,false);
  assert(data.localDEM.values.every((v,i)=>v===before[i]),'source DEM changed');
  for(let x=0;x<=100;x+=5)for(let y=0;y<=100;y+=5)assert.equal(model.context.ground(x,y),raw.context.ground(x,y),'the terrain height field changed');
  const bridge=model.context.bridges.find(b=>b.mainRoad);assert(bridge);
  for(const x of [20,40,60,80])assert(Math.abs(bridge.top(x,49.8)-bridge.top(x,50.2))<1e-5,'carriageway has a cross-slope');
  const detail=model.provenance.infrastructure.completion.details.find(b=>b.mainRoad);assert(detail);assert(detail.piers.length>0);assert(detail.maxUnsupportedSpanMM<=10);
  for(const part of model.categories)assert.deepEqual(auditPart(part).errors,[]);
});
test('secondary roads retain terrain-following behaviour and incremental updates retain platform geometry/provenance',()=>{
  const published=buildModel(region(),{...options,majorRoads:undefined},()=>{},api);assert.equal(published.provenance.majorRoads.enabled,false);assert.equal(published.provenance.majorRoads.applied,false);
  const secondary=buildModel(region('secondary'),options,()=>{},api);assert.equal(secondary.provenance.majorRoads.applied,false);
  const data=region(),model=buildModel(data,options,()=>{},api),changed=updateBuildings(model,{features:data.features,meta:data.meta},{maxBuildingHeight:3}),vegetation=updateVegetation(changed,{trees:false});
  assert.strictEqual(vegetation.context.ground,model.context.ground);assert.strictEqual(vegetation.categories.find(p=>p.id==='roads').vertices,model.categories.find(p=>p.id==='roads').vertices);
  assert.deepEqual(vegetation.provenance.majorRoads,model.provenance.majorRoads);
  const zip=unzipSync(threeMF(vegetation)),p=JSON.parse(strFromU8(zip['Metadata/provenance.json']));assert.equal(p.majorRoads.applied,true);assert.equal(p.majorRoads.profiles[0].sourceFeatureIds[0],'main-road');assert.equal(p.majorRoads.terrainModified,false);
});
test('a failed platform material replacement restores terrain-following roads atomically',()=>{
  const broken={Mesh:api.Mesh,Manifold:class{constructor(){throw Error('injected material failure');}}};
  const fallback=buildModel(region(),options,()=>{},broken);assert.equal(fallback.provenance.majorRoads.applied,false);assert(fallback.warnings.some(w=>w.includes('injected material failure')));assert(fallback.categories.find(p=>p.id==='roads')?.faces.length);
});

test('building footprint edits reuse the exact deferred road masks while rechecking new obstacles',()=>{
  const data=region(),events=[],model=buildModel(data,options,()=>{},api,event=>events.push(event));
  const computed=()=>events.filter(e=>e.phase==='major.support-obstacles'&&e.event==='end').length;
  assert.equal(model.provenance.majorRoads.applied,true);assert.equal(computed(),1);
  const bridge=model.context.bridges.find(b=>b.mainRoad),originalMask=bridge.supportRoadPoly();
  const building={id:'new-building',properties:{sourceLayer:'building',render_height:6},geometry:{type:'Polygon',coordinates:[[[.001,.001],[.002,.001],[.002,.002],[.001,.002],[.001,.001]]]}};
  const changed=updateBuildings(model,{features:[...data.features,building],meta:data.meta},{});
  assert.equal(changed.buildingCount,1);assert.notEqual(changed.context.bridgeCache.key,model.context.bridgeCache.key);
  assert.strictEqual(changed.context.bridges.find(b=>b.mainRoad).supportRoadPoly(),originalMask);
  assert.equal(computed(),1,'building edits recomputed the unchanged road union');
  assert.equal(changed.provenance.majorRoads.applied,true);assert.strictEqual(changed.context.ground,model.context.ground);
});
