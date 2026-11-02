import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {generateProceduralTunnelVoids} from '../src/procedural-tunnels.js';
import {carveTerrainTunnels} from '../src/tunnel-operations.js';
import {makeProjection} from '../src/geometry.js';
import {auditPart,signedVolume} from '../src/solid-audit.js';
import {splitModel} from '../src/mesh-tiles.js';
const api=await Module();api.setup();
function box(id,x0,x1,z0,z1){return {id,name:id,color:'#123456',vertices:new Float32Array([x0,0,z0,x1,0,z0,x1,120,z0,x0,120,z0,x0,0,z1,x1,0,z1,x1,120,z1,x0,120,z1]),faces:new Uint32Array([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,2,3,7,2,7,6,0,4,7,0,7,3,1,2,6,1,6,5])};}
const parts=()=>[box('terrain',0,200,0,20),box('forest',200,300,0,20),box('roads',300,400,0,20)];
const projection=makeProjection([0,0,.004,.0012],400,{widthMM:400,heightMM:120});
const tunnels=()=>generateProceduralTunnelVoids([{id:'test',properties:{sourceLayer:'transportation',class:'trunk',brunnel:'tunnel'},geometry:{type:'LineString',coordinates:[[-.00001,.0006],[.00401,.0006]]}}],()=>100,{enabled:true,projection,verticalReference:{originMeters:100,minimumSurfaceMM:5},ground:()=>20}).items;
function solid(part){const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});mesh.merge();return new api.Manifold(mesh);}
function hits(parts,origin,end){let total=0;for(const p of parts){const s=solid(p);try{total+=s.rayCast(origin,end).length;}finally{s.delete();}}return total;}

test('estimated cutter opens both portals through every terrain colour, preserves base and input',()=>{
  const source=parts(),before=structuredClone(source),bores=tunnels();assert.equal(bores.length,1);
  const r=carveTerrainTunnels(source,bores,api);assert.equal(r.metadata.applied,true);assert.deepEqual(source,before);
  assert.equal(hits(r.parts,[-2,60,8],[402,60,8]),0);assert(hits(r.parts,[-2,20,8],[402,20,8])>0);
  for(const p of r.parts){assert.deepEqual(auditPart(p).errors,[]);const s=solid(p);try{const base=s.trimByPlane([0,0,-1],-2.5);try{const expected=(p.id==='terrain'?200:100)*120*2.5;assert(Math.abs(base.volume()-expected)<.1);}finally{base.delete();}}finally{s.delete();}}
  assert(Object.values(r.metadata.removedMM3).every(v=>v>0));
});

test('partition after excavation keeps the underpass open at the seam of both 200 mm pieces',()=>{
  const r=carveTerrainTunnels(parts(),tunnels(),api),model={parts:r.parts,width:400,height:120,provenance:{name:'Tunnel control'}};
  const tiles=splitModel(model,api,200);assert.equal(tiles.length,2);
  for(const t of tiles){assert.equal(hits(t.parts,[-2,60,8],[202,60,8]),0);for(const p of t.parts)assert.deepEqual(auditPart(p).errors,[]);}
});

test('partition omits a zero-volume tangent but keeps a very thin positive-volume layer',()=>{
  const terrain=box('terrain',0,400,0,5),thin=box('thin',199.99,200.01,5,5.001),model={parts:[terrain,thin],width:400,height:120,provenance:{name:'thin seam'}};
  const before=model.parts.reduce((sum,p)=>sum+auditPart(p).signedVolume,0),tiles=splitModel(model,api,200);
  let total=0;
  for(const t of tiles){const p=t.parts.find(p=>p.id==='thin');assert(p,'thin layer must survive on both sides');assert(auditPart(p).signedVolume>0);for(const part of t.parts){assert.deepEqual(auditPart(part).errors,[]);total+=auditPart(part).signedVolume;}}
  assert(Math.abs(total-before)<.01);
  const adjacent=splitModel({parts:[box('left',0,200,0,10),box('right',200,400,0,10)],width:400,height:120,provenance:{}},api,200);
  assert.deepEqual(adjacent.map(t=>t.parts.map(p=>p.id)),[['left'],['right']]);
});

test('protected buildings, trees, water and arbitrary other categories are never excavated',()=>{
  const protectedParts=['buildings','trees','water','inland-water','bridge-special'].map(id=>box(id,0,400,0,20)),source=[...parts(),...protectedParts];
  const r=carveTerrainTunnels(source,tunnels(),api);assert.equal(r.metadata.applied,true);
  for(const p of protectedParts)assert.strictEqual(r.parts.find(q=>q.id===p.id),p);
});

test('surface railway material is excavated too, while building buffers remain protected',()=>{
  const railway=box('railways',0,400,0,20),building=box('buildings',0,400,0,20),r=carveTerrainTunnels([railway,building],tunnels(),api);
  assert.equal(r.metadata.applied,true);assert.strictEqual(r.parts[1],building);
  assert.equal(hits([r.parts[0]],[-2,60,8],[402,60,8]),0);assert.deepEqual(auditPart(r.parts[0]).errors,[]);
  assert(r.metadata.removedMM3.railways>0);
});

test('no-op avoids unions; a failure rolls back every layer atomically and reports it',()=>{
  const source=parts();assert.strictEqual(carveTerrainTunnels(source,[],null).parts,source);
  const bad=carveTerrainTunnels(source,tunnels(),null);assert.strictEqual(bad.parts,source);assert.equal(bad.metadata.applied,false);assert.match(bad.warnings[0],/conserva el terreny/);
  const capped=carveTerrainTunnels(source,tunnels(),api,{maxVoidTriangles:1});assert.strictEqual(capped.parts,source);assert.equal(capped.metadata.applied,false);
});

test('only components beside a cutter enter booleans; over ten thousand distant prisms remain exact',()=>{
  const near=box('terrain',0,400,0,20),count=10001,farVertices=new Float32Array(count*24),farFaces=new Uint32Array(count*36);
  for(let i=0;i<count;i++){
    const p=box('terrain',1000+i*2,1001+i*2,0,20);farVertices.set(p.vertices,i*24);
    for(let j=0;j<p.faces.length;j++)farFaces[i*36+j]=p.faces[j]+i*8;
  }
  const vertices=new Float32Array(near.vertices.length+farVertices.length),faces=new Uint32Array(near.faces.length+farFaces.length);
  vertices.set(near.vertices);vertices.set(farVertices,near.vertices.length);faces.set(near.faces);
  for(let i=0;i<farFaces.length;i++)faces[near.faces.length+i]=farFaces[i]+8;
  const source={...near,vertices,faces},before=structuredClone(source),r=carveTerrainTunnels([source],tunnels(),api);
  assert.equal(r.metadata.applied,true);assert.equal(r.metadata.consideredComponents,count+1);assert.equal(r.metadata.excavatedCandidateComponents,1);
  assert.deepEqual({...source,vertices:null,faces:null},{...before,vertices:null,faces:null});
  assert(source.vertices.length===before.vertices.length&&source.vertices.every((v,i)=>v===before.vertices[i]),'source vertex buffers changed');
  assert(source.faces.length===before.faces.length&&source.faces.every((v,i)=>v===before.faces[i]),'source face buffers changed');
  // Report a compact failure; rendering a diff of 600k numbers can itself
  // exhaust the test process before it reports the actual regression.
  assert(r.parts[0].vertices.length>=farVertices.length&&r.parts[0].vertices.subarray(0,farVertices.length).every((v,i)=>v===farVertices[i]),'distant vertex buffers changed');
  assert(r.parts[0].faces.length>=farFaces.length&&r.parts[0].faces.subarray(0,farFaces.length).every((v,i)=>v===farFaces[i]),'distant face buffers changed');
  const removed=signedVolume(source.vertices,source.faces)-signedVolume(r.parts[0].vertices,r.parts[0].faces);
  assert(Math.abs(removed-r.metadata.removedMM3.terrain)<.01);
  assert.equal(hits(r.parts,[-2,60,8],[402,60,8]),0);
});
