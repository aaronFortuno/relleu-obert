import test from 'node:test';
import assert from 'node:assert/strict';
import {buildModel} from '../src/geometry.js';
import {loadRegion} from '../src/sources.js';
import {auditPart} from '../src/solid-audit.js';
import {physicalBBox} from '../src/selection.js';
import {groupMaterials} from '../src/materials.js';

const bbox=physicalBBox([0,0],10,10);
const dem=[{z:0,x:0,y:0,size:2,elev:new Float32Array([100,200,500,650])}];
const options={size:100,pureRelief:true,resolution:12};

test('pure relief builds solid coverage colours from mapped classes, independent of altitude',()=>{
  const model=buildModel({meta:{bbox},dem,coverage:[{bbox,width:2,height:2,values:new Uint8Array([60,70,70,60])}]},options);
  assert.deepEqual(model.categories.map(p=>p.id),['terrain','rock','snow']);
  assert.deepEqual(model.provenance.coverageCells,{bare:72,snow:72,total:144});
  assert.equal(model.scale,100000);
  for(const part of model.parts)assert.deepEqual(auditPart(part).errors,[]);
  assert.deepEqual(groupMaterials(model).parts.map(p=>p.color),model.categories.map(p=>p.color));
  const neutral=buildModel({meta:{bbox},dem},options);
  assert.deepEqual(neutral.categories.map(p=>p.id),['terrain']);
});

test('pure relief fetches only elevations outside the pilot coverage',async()=>{
  const previous=globalThis.fetch,requests=[];
  globalThis.fetch=async url=>{requests.push(String(url));return new Response(new Uint8Array([1]));};
  try{
    const data=await loadRegion({bbox,pureRelief:true,decodeElevation:async(_,tile)=>({...tile,size:2,elev:new Float32Array([100,100,100,100])})});
    assert(requests.length>0&&requests.every(url=>url.startsWith('https://tiles.mapterhorn.com/')));
    assert.deepEqual(data.features,[]);
    assert.equal(data.meta.coverage.available,false);
    assert.equal(data.meta.buildingSource,null);
  }finally{globalThis.fetch=previous;}
});
