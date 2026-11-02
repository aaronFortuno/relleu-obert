import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {generateProceduralTunnelVoids} from '../src/procedural-tunnels.js';
import {carveTerrainTunnels} from '../src/tunnel-operations.js';
import {makeProjection} from '../src/geometry.js';
import {auditPart} from '../src/solid-audit.js';
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

test('no-op avoids unions; a failure rolls back every layer atomically and reports it',()=>{
  const source=parts();assert.strictEqual(carveTerrainTunnels(source,[],null).parts,source);
  const bad=carveTerrainTunnels(source,tunnels(),null);assert.strictEqual(bad.parts,source);assert.equal(bad.metadata.applied,false);assert.match(bad.warnings[0],/conserva el terreny/);
  const capped=carveTerrainTunnels(source,tunnels(),api,{maxVoidTriangles:1});assert.strictEqual(capped.parts,source);assert.equal(capped.metadata.applied,false);
});
