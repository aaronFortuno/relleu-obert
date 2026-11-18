import test from 'node:test';
import assert from 'node:assert/strict';
import earcut from 'earcut';
import {buildModel,updateBuildings} from '../src/geometry.js';
import {scaledBBox,selectionPose} from '../src/selection.js';
import {auditPart} from '../src/solid-audit.js';

const anchor=[2.18,41.4],kx=111320*Math.cos(anchor[1]*Math.PI/180);
const geo=([x,y])=>[anchor[0]+x/kx,anchor[1]+y/111320];
const rectangle=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]].map(geo);
const bbox=(w,s,e,n)=>[...geo([w,s]),...geo([e,n])];
// An original closed bridge mesh: two piers and a connected deck, with a real
// open space below the central span. No external asset or Manifold required.
const section=[[-12,0],[-8,0],[-8,3],[8,3],[8,0],[12,0],[12,5],[-12,5]],
  cap=earcut(section.flat()),vertices=Float32Array.from([-3,3].flatMap(z=>section.flatMap(([x,y])=>[x,y,z]))),faces=[];
for(let i=0;i<cap.length;i+=3)faces.push(cap[i+2],cap[i+1],cap[i],cap[i]+8,cap[i+1]+8,cap[i+2]+8);
for(let i=0;i<8;i++){const j=(i+1)%8;faces.push(i,j,j+8,i,j+8,i+8);}
const model={id:'fort-with-bridge',kind:'building',name:'Fort with its own bridge',revision:'r1',
  anchor,bbox:bbox(-12,-3,12,3),footprint:{type:'Polygon',coordinates:[rectangle(-12,-3,12,3)]},height:5,
  vertices,faces:Uint32Array.from(faces),replacement:{transport:[{featureId:'618920730',bbox:bbox(-11,-2,11,2)}]}};
const own=[[-10,0],[10,0]],otherA=[[-35,30],[-15,30]],otherB=[[15,-30],[35,-30]],
  aggregate={id:618920730,properties:{sourceLayer:'transportation',class:'path',brunnel:'bridge'},
    geometry:{type:'MultiLineString',coordinates:[own,otherA,otherB].map(line=>line.map(geo))}},
  access={id:'access',properties:{sourceLayer:'transportation',class:'path'},
    geometry:{type:'LineString',coordinates:[[-35,0],[-10,0]].map(geo)}};
function generate(models=[model],options={}){
  const pose=selectionPose(scaledBBox([anchor[1],anchor[0]],100,100,1000),options.rotation??0);
  return buildModel({meta:{bbox:pose.bbox},features:[aggregate,access],bridgeFeatures:[aggregate],
    singularModels:models,dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4)}]},
  {size:100,widthMM:100,heightMM:100,targetScale:1000,selectionPose:pose,resolution:4,trees:false,
    majorRoads:false,buildingMode:'source',...options});
}
const axes=output=>output.context.bridges.map(bridge=>bridge.axis);

test('a real accepted building mesh replaces its bridge without suppressing two peers sharing the aggregate ID',()=>{
  assert.deepEqual(auditPart(model).errors,[]);
  const without=generate([{...model,replacement:undefined}]),withModel=generate();
  assert.equal(without.context.bridges.length,3);
  assert.equal(withModel.context.bridges.length,2);
  assert.equal(withModel.buildingCount,1);
  assert.equal(withModel.provenance.buildingVolumes[0].roofShape,'catalogue');
  assert.equal(withModel.provenance.catalogueTransportReplacements[0].featureId,'618920730');
  assert.deepEqual(axes(withModel),axes(without).filter(axis=>Math.abs(axis[0][1]-without.height/2)>1));
  assert(withModel.context.terrain.transport.some(route=>route.sourceFeatureIds.includes('access')));
  for(const part of withModel.categories)assert.deepEqual(auditPart(part).errors,[],part.id);
});

test('an invalid or rejected catalogue mesh cannot remove the procedural bridge',()=>{
  const invalid=generate([{...model,faces:model.faces.slice(3)}]);
  assert.equal(invalid.buildingCount,0);
  assert.equal(invalid.context.bridges.length,3);
  assert.equal(invalid.provenance.catalogueTransportReplacements,undefined);
  const disabled=generate([model],{buildingMode:'none'});
  assert.equal(disabled.context.bridges.length,3);
  assert.equal(disabled.buildingCount,0);
});

test('source, limited, hidden and source again rebuild only the opted-in context and restore the ordinary bridge',()=>{
  let current=generate();
  const initialTerrain=current.categories.find(part=>part.id==='terrain').vertices;
  for(const [buildingMode,bridges,count]of[['limited',3,1],['none',3,0],['source',2,1]]){
    current=updateBuildings(current,{}, {buildingMode,maxBuildingHeight:2});
    assert.equal(current.context.bridges.length,bridges,buildingMode);
    assert.equal(current.buildingCount,count,buildingMode);
    assert.equal(!!current.provenance.catalogueTransportReplacements,buildingMode==='source',buildingMode);
  }
  assert.deepEqual(current.categories.find(part=>part.id==='terrain').vertices,initialTerrain);
  const ordinary=generate([{...model,replacement:undefined}]),terrain=ordinary.categories.find(part=>part.id==='terrain').vertices;
  assert.strictEqual(updateBuildings(ordinary,{}, {buildingMode:'none'}).categories.find(part=>part.id==='terrain').vertices,terrain,
    'The established inexpensive building-only update is unchanged without opt-in');
});
