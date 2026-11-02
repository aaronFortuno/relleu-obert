import test from 'node:test';import assert from 'node:assert/strict';import {buildModel} from '../src/geometry.js';import {threeMF} from '../src/export.js';import {unzipSync,strFromU8} from 'fflate';
const data={meta:{bbox:[0,0,.01,.01]},features:[{type:'Feature',properties:{sourceLayer:'transportation',class:'primary'},geometry:{type:'LineString',coordinates:[[.001,.005],[.009,.005]]}}],dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4)}]};
test('road relief is a printed offset; bottom and natural terrain stay unchanged',()=>{
 for(const roadRise of [0,.5,1]){const m=buildModel(data,{size:100,resolution:4,trees:false,roadRise}),road=m.categories.find(p=>p.id==='roads'),zs=[...road.vertices].filter((v,i)=>i%3===2);assert.equal(Math.max(...zs),5+roadRise);assert(Math.abs(Math.min(...zs)-4.35)<1e-5);assert.equal(m.context.ground(50,50),5);
  const p=JSON.parse(strFromU8(unzipSync(threeMF(m))['Metadata/provenance.json']));assert.equal(p.options.roadRise,roadRise);
 }
 for(const roadRise of [-1,.1,NaN,Infinity])assert.throws(()=>buildModel(data,{size:100,resolution:4,roadRise}),/camins/);
});
