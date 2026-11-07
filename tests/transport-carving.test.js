import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {carveIndependentTransportDecks,carveTransportDecks} from '../src/transport-carving.js';
import {selectSurfaceComponents} from '../src/surface-components.js';
import {auditPart} from '../src/solid-audit.js';
const api=await Module();api.setup();
function box(id,x0=0,x1=100,z0=0,z1=10,y0=0,y1=80){return {id,name:id,color:'#123456',vertices:new Float32Array([x0,y0,z0,x1,y0,z0,x1,y1,z0,x0,y1,z0,x0,y0,z1,x1,y0,z1,x1,y1,z1,x0,y1,z1]),faces:new Uint32Array([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,2,3,7,2,7,6,0,4,7,0,7,3,1,2,6,1,6,5])};}
const deck=()=>box('estimated-road-deck',20,80,9.5,10.2,35,45);
function solid(part){const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});mesh.merge();return new api.Manifold(mesh);}
function combine(parts){
  const vertices=new Float32Array(parts.reduce((n,p)=>n+p.vertices.length,0)),faces=new Uint32Array(parts.reduce((n,p)=>n+p.faces.length,0));let v=0,f=0;
  for(const p of parts){vertices.set(p.vertices,v);for(let i=0;i<p.faces.length;i++)faces[f+i]=p.faces[i]+v/3;v+=p.vertices.length;f+=p.faces.length;}
  return {...parts[0],vertices,faces};
}

test('road material replaces only deck volume; original relief outside the deck remains exact',()=>{
  const original=box('terrain'),source=[original],before=structuredClone(original),cutter=deck(),result=carveTransportDecks(source,[{mesh:cutter}],api);
  assert.equal(result.metadata.applied,true,result.warnings.join(' '));assert.deepEqual(original,before);assert.equal(result.metadata.count,1);assert.deepEqual(auditPart(result.parts[0]).errors,[]);
  const prior=solid(original),after=solid(result.parts[0]),road=solid(cutter),owned=[];
  try{
    const common=after.intersect(road);owned.push(common);assert(common.volume()<1e-6,'deck and remaining substrate overlap');
    const added=after.subtract(prior);owned.push(added);assert(added.volume()<1e-6,'substrate must not gain any volume');
    const removed=prior.subtract(after);owned.push(removed);assert(Math.abs(removed.volume()-300)<.001);
    const outside=removed.subtract(road);owned.push(outside);assert(outside.volume()<1e-6,'relief changed outside the deck volume');
    for(const [x,y]of [[10,40],[90,40],[50,20],[50,60]]){
      const oldHeights=prior.rayCast([x,y,12],[x,y,-1]).map(h=>h.position[2]),newHeights=after.rayCast([x,y,12],[x,y,-1]).map(h=>h.position[2]);
      assert.deepEqual(newHeights,oldHeights);assert.deepEqual(newHeights,[10,0]);
    }
  }finally{for(const s of owned)s.delete();prior.delete();after.delete();road.delete();}
  assert(Math.abs(result.metadata.removedMM3.terrain-300)<.001);
});

test('transport carves four substrate categories and preserves every protected layer by identity',()=>{
  const substrate=['terrain','forest','grass','roads'].map((id,i)=>box(id,i*25,(i+1)*25)),protectedParts=['railways','water','inland-water','buildings','trees','other'].map(id=>box(id));
  const cutter=box('deck',10,90,9.5,10.2,35,45),result=carveTransportDecks([...substrate,...protectedParts],[cutter],api);
  assert.equal(result.metadata.applied,true,result.warnings.join(' '));assert.equal(result.metadata.excavatedCandidateComponents,4);
  const road=solid(cutter);try{
    for(const p of result.parts.filter(p=>substrate.some(s=>s.id===p.id))){
      assert.deepEqual(auditPart(p).errors,[]);const s=solid(p),common=s.intersect(road);try{assert(common.volume()<1e-6);assert(result.metadata.removedMM3[p.id]>0);}finally{common.delete();s.delete();}
    }
  }finally{road.delete();}
  for(const p of protectedParts)assert.strictEqual(result.parts.find(q=>q.id===p.id),p);
});

test('empty deck lists are a no-op; failed geometry or limits roll back every original buffer',()=>{
  const source=[box('terrain')],before=structuredClone(source);assert.strictEqual(carveTransportDecks(source,[],null).parts,source);
  for(const [candidate,engine,limits]of [[deck(),null,{}],[deck(),api,{maxVoidTriangles:1}],[deck(),api,{maxTriangles:1}],[{...deck(),vertices:new Float32Array([NaN,0,0])},api,{}]]){
    const result=carveTransportDecks(source,[candidate],engine,limits);assert.strictEqual(result.parts,source);assert.equal(result.metadata.applied,false);assert.equal(result.metadata.count,0);
    assert.match(result.warnings[0],/taulers.*carretera/);assert.doesNotMatch(result.warnings[0],/túnel/);
  }
  assert.deepEqual(source,before);
});

test('independent cuts recover the valid roads on both sides of a rejected slab',()=>{
  const source=box('terrain'),left=box('left',8,30,9.5,10.2,10,15),right=box('right',60,85,9.5,10.2,10,15);
  const malformed=box('broken',40,50,9.5,10.2,10,15);
  malformed.faces=malformed.faces.slice(3);
  const result=carveIndependentTransportDecks([source],[left,malformed,right],api);
  assert.equal(result.metadata.method,'independent-cuts');
  assert.equal(result.metadata.count,2);
  assert.deepEqual(result.rejected.map(part=>part.id),['broken']);
  assert.deepEqual(auditPart(result.parts[0]).errors,[]);
  const ground=solid(result.parts[0]);
  try{
    const top=x=>ground.rayCast([x,12,12],[x,12,0]).map(hit=>hit.position[2])[0];
    assert.equal(top(20),9.5);assert.equal(top(45),10);assert.equal(top(75),9.5);
  }finally{ground.delete();}
});

test('shared selection restores source ordering and can append a new local material',()=>{
  const far=box('terrain',200,210),near=box('terrain'),sourcePart=combine([far,near]),protectedPart=box('railways'),source=[sourcePart,protectedPart];
  const selection=selectSurfaceComponents(source,[deck()],{categories:['terrain']});assert.equal(selection.considered,2);assert.equal(selection.candidates,1);assert.equal(selection.selected.length,1);
  assert(selection.selected[0].vertices.every((v,i)=>v===near.vertices[i]));
  const added=box('roads',30,40,9.5,10.2),restored=selection.restore([...selection.selected,added]);
  assert(restored[0].vertices.length===sourcePart.vertices.length&&restored[0].vertices.every((v,i)=>v===sourcePart.vertices[i]),'source vertex ordering changed');
  assert(restored[0].faces.length===sourcePart.faces.length&&restored[0].faces.every((v,i)=>v===sourcePart.faces[i]),'source triangle ordering changed');
  assert.strictEqual(restored[1],protectedPart);assert.strictEqual(restored[2],added);
});

test('over ten thousand distant prisms bypass booleans and retain exact buffer order',()=>{
  const near=box('terrain'),count=10001,farParts=Array.from({length:count},(_,i)=>box('terrain',1000+i*2,1001+i*2)),far=combine(farParts),sourcePart=combine([near,far]),source=[sourcePart];
  const beforeVertices=new Float32Array(sourcePart.vertices),beforeFaces=new Uint32Array(sourcePart.faces),result=carveTransportDecks(source,[deck()],api,{maxComponents:1});
  assert.equal(result.metadata.applied,true,result.warnings.join(' '));assert.equal(result.metadata.consideredComponents,count+1);assert.equal(result.metadata.excavatedCandidateComponents,1);
  assert(sourcePart.vertices.length===beforeVertices.length&&sourcePart.vertices.every((v,i)=>v===beforeVertices[i]),'source vertices changed');
  assert(sourcePart.faces.length===beforeFaces.length&&sourcePart.faces.every((v,i)=>v===beforeFaces[i]),'source triangles changed');
  assert(result.parts[0].vertices.length>=far.vertices.length&&result.parts[0].vertices.subarray(0,far.vertices.length).every((v,i)=>v===far.vertices[i]),'distant vertices changed');
  assert(result.parts[0].faces.length>=far.faces.length&&result.parts[0].faces.subarray(0,far.faces.length).every((v,i)=>v===far.faces[i]),'distant triangles changed');
});
