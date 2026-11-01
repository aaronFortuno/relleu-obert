import test from 'node:test';
import assert from 'node:assert/strict';
import {treeMesh,buildModel} from '../src/geometry.js';
import {createTerrainField} from '../src/elevation.js';
test('every varied crown embeds in the same triangular terrain used by the model',()=>{
  const field=createTerrainField({width:10,height:10,resolution:2,at:(x,y)=>3+x*x/2+y*y/4});
  for(const [x,y]of [[1,1],[4,1],[6,8],[9,9]])for(const rz of [.6,.85,1.1]){
    const ground=field.sample(x,y),m=treeMesh({x,y,ground,rx:.65,ry:.8,rz,rotation:1.2,phase:.9});
    const centre=m.vertices.filter((_,i)=>i%3===2&&Math.abs(m.vertices[i-2]-x)<1e-5&&Math.abs(m.vertices[i-1]-y)<1e-5);
    assert(Math.min(...centre)<ground-.15);assert(Math.max(...centre)>ground+.5);
    const edges=new Map();for(let i=0;i<m.faces.length;i+=3)for(let j=0;j<3;j++){const a=m.faces[i+j],b=m.faces[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');edges.set(key,(edges.get(key)||0)+1);}assert([...edges.values()].every(n=>n===2));
  }
});
const bbox=[0,0,.01,.01],forest={type:'Feature',properties:{sourceLayer:'landcover',class:'wood'},geometry:{type:'Polygon',coordinates:[[[0,0],[.01,0],[.01,.01],[0,.01],[0,0]]]}},data={meta:{bbox},features:[forest],dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4).fill(0)}]};
test('higher density adds trees, the result is reproducible, and crown heights vary',()=>{
  const options={size:50,resolution:2,density:3},sparse=buildModel(data,{...options,density:.5}),dense=buildModel(data,options),repeat=buildModel(data,options);
  assert(dense.treeCount>sparse.treeCount*3);assert.equal(dense.treeCount,repeat.treeCount);
  const a=dense.parts.find(p=>p.id==='green'),b=repeat.parts.find(p=>p.id==='green');assert.deepEqual(a.vertices,b.vertices);
  const crowns=dense.categories.find(p=>p.id==='trees'),above=new Set();for(let i=2;i<crowns.vertices.length;i+=3)if(crowns.vertices[i]>3.6)above.add(crowns.vertices[i].toFixed(3));assert(above.size>10);
  assert.equal(dense.provenance.options.density,3);
});
test('invalid density is rejected rather than producing an unbounded generation loop',()=>{assert.throws(()=>buildModel(data,{density:Infinity}),/rang/);assert.throws(()=>buildModel(data,{density:0}),/rang/);});
test('unrelated buildings from the rest of a vector tile do not alter the selected region',()=>{
  const outside={type:'Feature',properties:{sourceLayer:'building',render_height:9},geometry:{type:'Polygon',coordinates:[[[20,20],[20.1,20],[20.1,20.1],[20,20.1],[20,20]]]}};
  const options={size:50,resolution:2,density:.5},a=buildModel(data,options),b=buildModel({...data,features:[forest,outside]},options);
  assert.equal(a.treeCount,b.treeCount);assert.equal(b.buildingCount,0);assert.deepEqual(a.parts.find(p=>p.id==='green').vertices,b.parts.find(p=>p.id==='green').vertices);
});
