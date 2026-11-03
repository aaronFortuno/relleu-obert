import test from 'node:test';import assert from 'node:assert/strict';import Module from 'manifold-3d';
import {buildModel,updateBuildings,updateVegetation,updateTransport} from '../src/geometry.js';
import {auditPart} from '../src/solid-audit.js';import {threeMF} from '../src/export.js';import {unzipSync,strFromU8} from 'fflate';
import {topSampler} from '../src/bridge-completion.js';
const api=await Module();api.setup();
function region(roadClass='motorway'){
  const values=new Float32Array(121);for(let y=0;y<11;y++)for(let x=0;x<11;x++)values[y*11+x]=100+4*Math.sin(x*Math.PI/2)+y*.2;
  return {meta:{bbox:[0,0,.01,.01]},localDEM:{width:11,height:11,epsg:4326,affine:[.001,0,0,0,.001,0],pixelIsArea:false,values,metadata:{}},features:[{type:'Feature',id:'main-road',properties:{sourceLayer:'transportation',class:roadClass},geometry:{type:'LineString',coordinates:[[.0001,.005],[.0099,.005]]}}]};
}
const options={size:100,resolution:6,trees:false,estimatedTunnels:false,majorRoads:true};
test('smooth rail platforms are applied incrementally in the railway material',()=>{
  const data=region('rail');
  const initial=buildModel(data,{...options,majorRoads:false,smoothProfiles:true},()=>{},api);
  const updated=updateTransport(initial,{majorRoads:true});
  assert.equal(updated.context.ground,initial.context.ground);
  assert.equal(updated.provenance.majorRoads.applied,true);
  assert.equal(updated.provenance.majorRoads.profiles[0].elevationMethod,'rail-endpoint-grade');
  assert.equal(updated.provenance.infrastructure.completion.details[0].railway,true);
  assert(updated.categories.some(part=>part.id==='railways'));
  assert(!updated.categories.some(part=>part.id==='roads'));
  for(const part of updated.categories)assert.deepEqual(auditPart(part).errors,[]);
  const bridge=updated.context.bridges.find(b=>b.mainRoad);
  assert.equal(bridge.approaches.plans.length,2);
  const {vertices,faces}=updated.categories.find(part=>part.id==='railways');
  const points=Array.from({length:vertices.length/3},(_,i)=>Array.from(vertices.subarray(i*3,i*3+3)));
  const upwards=[];
  for(let i=0;i<faces.length;i+=3){
    const [a,b,c]=Array.from(faces.subarray(i,i+3),j=>points[j]);
    if((b[0]-a[0])*(c[1]-a[1])>(b[1]-a[1])*(c[0]-a[0]))upwards.push(...faces.subarray(i,i+3));
  }
  const top=topSampler(points,upwards);
  for(const {sections}of bridge.approaches.plans){
    const [startX,startY,startZ]=sections[0].centre;
    assert(Math.abs(startZ-bridge.top(startX,startY))<1e-6);
    const [x,y,z]=sections.at(-1).centre;
    assert(Math.abs(z-updated.context.ground(x,y))<1e-6);
    for(const offset of [-.001,.001]){
      const height=top(x+offset,y);
      assert(height!=null&&Math.abs(height-z)<.002,'the assembled rail mesh has a step at the landing');
    }
  }
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
