import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {polygonOps} from '../src/polygon-ops.js';
import {lineBuffer} from '../src/roads.js';
import {buildModel,inMulti,makeProjection} from '../src/geometry.js';
import {buildingRise} from '../src/building-options.js';
const pc=polygonOps();
const buffered=(line,r=1)=>pc.union(...lineBuffer(line,r));
test('round road joins fill the outer corner while preserving width',()=>{
  for(const sign of [-1,1]){const b=buffered([[0,0],[10,0],[10,sign*10]]);assert(inMulti([10.6,-sign*.6],b));assert(!inMulti([10.8,-sign*.8],b));assert(inMulti([-0.8,0],b));assert(!inMulti([-1.1,0],b));assert.equal(b.length,1);assert.equal(b[0].length,1);}
});
test('hairpins, repeated points and closed paths remain finite and connected',()=>{
  for(const line of [[[0,0],[10,0],[10,0],[1,.1]],[[0,0],[10,0],[10,10],[0,10],[0,0]]]){const b=buffered(line);assert.equal(b.length,1);assert(b.flat(3).every(Number.isFinite));assert(inMulti([10,0],b));}assert.deepEqual(lineBuffer([[30,30],[40,30]],1,[10,10]),[]);
});
test('small building heights keep geographic scale without the old 0.6 mm floor',()=>{assert.equal(buildingRise(3,.02,{buildingMode:'source'}),.06);assert.equal(buildingRise(30,.02,{maxBuildingHeight:5}),.1);assert.equal(buildingRise(3,.02,{maxBuildingHeight:5}),.06);assert.throws(()=>buildingRise(8,.02,{maxBuildingHeight:0}),/invàlida/);});
const bbox=[0,0,.001,.001],building={type:'Feature',properties:{sourceLayer:'building',render_height:40},geometry:{type:'Polygon',coordinates:[[[.0001,.0001],[.0009,.0001],[.0009,.0009],[.0001,.0009],[.0001,.0001]]]}},forest={...building,properties:{sourceLayer:'landcover',class:'wood'}};
const data={meta:{bbox},features:[building],dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array([0,800,0,800])}]};
test('the building cap holds at every vertex on steep exaggerated terrain and yields closed solids',async()=>{
  const api=await Module();api.setup();
  for(const exaggeration of [1,3]){const m=buildModel(data,{size:100,resolution:4,exaggeration,trees:false,maxBuildingHeight:5}),part=m.categories.find(p=>p.id==='buildings'),cap=5*makeProjection(bbox,100).scale;
    for(let i=0;i<part.vertices.length;i+=3){const [x,y,z]=part.vertices.slice(i,i+3);assert(z-m.context.ground(x,y)<=cap+1e-4);}
    const solid=new api.Manifold(new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces}));assert.equal(solid.status(),'NoError');assert(solid.volume()>0);solid.delete();assert.equal(m.provenance.options.maxBuildingHeight,5);
  }
});
test('footprint mode hugs terrain and hiding buildings restores the terrain and vegetation footprint',()=>{
  const flat=buildModel(data,{size:100,resolution:2,trees:false,buildingMode:'flat'}),p=flat.categories.find(p=>p.id==='buildings');for(let i=0;i<p.vertices.length;i+=3)assert(p.vertices[i+2]-flat.context.ground(p.vertices[i],p.vertices[i+1])<=.1201);
  const opts={size:50,resolution:2,density:.25},withForest={...data,features:[forest,building]},none=buildModel(withForest,{...opts,buildingMode:'none'}),natural=buildModel({...data,features:[forest]},opts),limited=buildModel(withForest,opts);
  assert.equal(none.buildingCount,0);assert(!none.categories.some(p=>p.id==='buildings'));assert.equal(none.treeCount,natural.treeCount);assert(none.treeCount>limited.treeCount);assert.deepEqual(none.categories.find(p=>p.id==='terrain').vertices,natural.categories.find(p=>p.id==='terrain').vertices);
});
