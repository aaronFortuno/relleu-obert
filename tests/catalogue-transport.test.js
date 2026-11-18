import test from 'node:test';
import assert from 'node:assert/strict';
import {applyBuildingTransportReplacements,validTransportReplacement} from '../src/catalogue-transport.js';
import {generateProceduralBridgeItems} from '../src/procedural-bridges.js';

const anchor=[2.18,41.4],kx=111320*Math.cos(anchor[1]*Math.PI/180);
const geo=([x,y,z])=>[anchor[0]+x/kx,anchor[1]+y/111320,...(z===undefined?[]:[z])];
const rectangle=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]].map(geo);
const box=(w,s,e,n)=>[...geo([w,s]),...geo([e,n])];
const model={id:'fort',kind:'building',bbox:box(-20,-8,20,8),
  footprint:{type:'Polygon',coordinates:[rectangle(-20,-8,20,8)]},
  replacement:{transport:[{featureId:'618920730',bbox:box(-15,-5,15,5)}]}};
// This pure helper receives the result of a successful geometry admission.
const accepted=(value=model)=>[{model:value,prepared:{fragments:[{solid:{faces:Uint32Array.of(0,1,2)}}]}}];
const line=(coordinates,id=618920730,properties={})=>({type:'Feature',id,
  properties:{sourceLayer:'transportation',class:'path',brunnel:'bridge',...properties},
  geometry:{type:'LineString',coordinates:coordinates.map(geo)}});
const aggregate=(...lines)=>({...line([]),geometry:{type:'MultiLineString',coordinates:lines.map(l=>l.map(geo))}});
const data=(...features)=>({features,meta:{bbox:box(-100,-100,100,100)}});
function nearPoint(actual,expected){
  assert.equal(actual.length,expected.length);
  actual.forEach((v,i)=>assert(Math.abs(v-expected[i])<1e-10,`coordinate${i}: ${v} vs ${expected[i]}`));
}

test('one scoped model removes only its bridge from a three-bridge aggregated ID in both sources',()=>{
  const own=[[-10,0],[10,0]],west=[[-90,60],[-70,60]],east=[[70,-60],[90,-60]],
    bridges=aggregate(own,west,east),access=line([[-35,0],[-10,0]],618920730,{brunnel:undefined}),
    unrelated=line(own,42),original={...data(bridges,access,unrelated),bridgeFeatures:[bridges]},snapshot=structuredClone(original);
  const result=applyBuildingTransportReplacements(original,accepted());
  assert.deepEqual(original,snapshot,'Source arrays and coordinates must remain immutable');
  assert.deepEqual(result.features[0].geometry.coordinates,[west.map(geo),east.map(geo)]);
  assert.deepEqual(result.bridgeFeatures[0].geometry.coordinates,[west.map(geo),east.map(geo)]);
  assert.strictEqual(result.features[1],access,'The non-bridge access sharing the ID survives');
  assert.strictEqual(result.features[2],unrelated,'An unlisted bridge sharing the same location survives');
  assert.deepEqual(result.meta.catalogueTransportReplacements,[{modelId:'fort',...model.replacement.transport[0]}]);
  assert.equal(generateProceduralBridgeItems([result.features[0]],()=>100).items.length,2);
});

test('a long bridge is split at scope boundaries, retaining its unmodelled ends and XYZ interpolation',()=>{
  const original=data(line([[-60,0,90],[60,0,102]])),result=applyBuildingTransportReplacements(original,accepted());
  const lines=result.features[0].geometry.coordinates;
  assert.equal(result.features[0].geometry.type,'MultiLineString');
  assert.equal(lines.length,2);
  nearPoint(lines[0][0],geo([-60,0,90]));nearPoint(lines[0].at(-1),geo([-15,0,94.5]));
  nearPoint(lines[1][0],geo([15,0,97.5]));nearPoint(lines[1].at(-1),geo([60,0,102]));
});

test('the footprint, geographic scope and ID are all required; tangent contact cannot erase a bridge',()=>{
  const tangent=line([[-30,0],[0,24]]),boundary=line([[-18,8],[18,8]]),outsideScope=line([[-10,6],[10,6]]),
    away=line([[-10,40],[10,40]]),unlisted=line([[-10,0],[10,0]],'42');
  const original=data(tangent,boundary,outsideScope,away,unlisted);
  assert.strictEqual(applyBuildingTransportReplacements(original,accepted()),original);
});

test('open courtyard and gaps between footprint components keep their transport',()=>{
  const withCourt={...model,replacement:{transport:[{featureId:'618920730',bbox:model.bbox}]},
    footprint:{type:'Polygon',coordinates:[rectangle(-20,-8,20,8),rectangle(-4,-2,4,2).reverse()]}};
  const result=applyBuildingTransportReplacements(data(line([[-15,0],[15,0]])),accepted(withCourt));
  const points=result.features[0].geometry.coordinates;
  assert.equal(result.features[0].geometry.type,'LineString');
  nearPoint(points[0],geo([-4,0]));nearPoint(points.at(-1),geo([4,0]));
  const split={...withCourt,footprint:{type:'MultiPolygon',coordinates:[
    [rectangle(-20,-8,-4,8)],[rectangle(4,-8,20,8)]]}};
  const gap=applyBuildingTransportReplacements(data(line([[-15,0],[15,0]])),accepted(split));
  nearPoint(gap.features[0].geometry.coordinates[0],geo([-4,0]));
  nearPoint(gap.features[0].geometry.coordinates.at(-1),geo([4,0]));
});

test('malformed opt-ins, absent admission and malformed source lines preserve the original source',()=>{
  const original=data(line([[-10,0],[10,0]]));
  assert.strictEqual(applyBuildingTransportReplacements(original,[]),original);
  assert.strictEqual(applyBuildingTransportReplacements(original,[{model,prepared:null}]),original);
  const invalid={...model,replacement:{transport:[{featureId:618920730,bbox:model.bbox}]}};
  assert.equal(validTransportReplacement(invalid.replacement.transport,'building',invalid.bbox),false);
  assert.strictEqual(applyBuildingTransportReplacements(original,accepted(invalid)),original);
  const malformed={...original.features[0],geometry:{type:'LineString',coordinates:[[2.18,41.4],[NaN,41.4]]}};
  const source=data(malformed);
  assert.strictEqual(applyBuildingTransportReplacements(source,accepted()),source);
});

test('a deliberate sub-metre cut is not rejoined by the procedural bridge seam tolerance',()=>{
  const small={...model,replacement:{transport:[{featureId:'618920730',bbox:box(-.05,-2,.05,2)}]}};
  const result=applyBuildingTransportReplacements(data(line([[-20,0],[20,0]])),accepted(small));
  const generated=generateProceduralBridgeItems(result.features,()=>100);
  assert.equal(generated.items.length,2,'The source must not reconnect through the explicitly removed part');
  assert(generated.items.every(item=>item.axis.every(p=>Math.abs(p[0]-anchor[0])>=.049/kx)));
});

test('only scopes that actually removed source geometry are recorded in provenance',()=>{
  const scoped={...model,replacement:{transport:[...model.replacement.transport,
    {featureId:'618920730',bbox:box(-15,6,15,7)}]}};
  const result=applyBuildingTransportReplacements(data(line([[-10,0],[10,0]])),accepted(scoped));
  assert.equal(result.meta.catalogueTransportReplacements.length,1);
  assert.equal(result.features.length,0);
});

test('cut ends survive continuation joins that inherit an unmodified neighbouring fragment',()=>{
  const small={...model,replacement:{transport:[{featureId:'618920730',bbox:box(-.05,-2,.05,2)}]}};
  const original=data(line([[-30,0],[-10,0]],'1'),line([[10,0],[30,0]],'2'),line([[-10,0],[10,0]]));
  const replaced=applyBuildingTransportReplacements(original,accepted(small));
  for(const features of [replaced.features,replaced.features.slice().reverse()]){
    const generated=generateProceduralBridgeItems(features,()=>100);
    assert.equal(generated.items.length,2,'Continuations must not reconnect through a deliberate cut');
    assert(generated.items.every(item=>item.axis.every(p=>Math.abs(p[0]-anchor[0])>=.049/kx)));
  }
});
