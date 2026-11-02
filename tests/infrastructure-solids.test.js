import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {bridgeDeck,tunnelVoid,projectInfrastructurePath} from '../src/infrastructure-solids.js';
import {auditPart} from '../src/solid-audit.js';
import {makeProjection,deckSurfaceSolid} from '../src/geometry.js';
import {readFile} from 'node:fs/promises';
const api=await Module();api.setup();
function check(mesh,volume){
 const audit=auditPart(mesh);assert.deepEqual(audit.errors,[]);assert(audit.closed);
 const s=new api.Manifold(new api.Mesh({numProp:3,vertProperties:mesh.vertices,triVerts:mesh.faces}));
 try{assert.equal(s.status(),'NoError');if(volume!=null)assert(Math.abs(s.volume()-volume)<1e-3);return s.boundingBox();}finally{s.delete();}
}
test('a level or sloped deck retains its own profile and open air below',()=>{
 for(const rise of [0,10]){
  const p=bridgeDeck([[0,0,20],[100,0,20+rise]],6,.6),bbox=check(p,360);
  assert(Math.abs(bbox.min[2]-19.4)<1e-5);assert.equal(bbox.max[2],20+rise);
 }
});
test('curved decks use width-aware joins and stay closed',()=>{
 const p=bridgeDeck([[0,0,20],[40,0,22],[60,20,23],[60,50,25]],4,.6);
 check(p);assert(p.vertices.every(Number.isFinite));
 assert.throws(()=>bridgeDeck([[0,0,0],[10,0,0],[0,0,0]],4,.6),/Corba/);
});
test('a tunnel cutter keeps its floor/profile with a known section and two end faces',()=>{
 const bbox=check(tunnelVoid([[0,0,8],[100,0,10]],6,4),2400);
 assert.deepEqual(bbox.min,[0,-3,8]);assert.deepEqual(bbox.max,[100,3,14]);
 assert.throws(()=>tunnelVoid([[0,0,0],[1,0,0]],0,4));
 assert.throws(()=>bridgeDeck([[0,0,NaN],[1,0,0]],4,1));
});
test('XYZ uses the terrain origin/exaggeration and respects the rotated projection',()=>{
 const projection=makeProjection([1,41,1.01,41.01],150,{widthMM:150,heightMM:150,selectionPose:{center:[41.005,1.005],widthM:1500,heightM:1500,rotation:30}});
 const path=projectInfrastructurePath([[1.005,41.005,230],[1.006,41.006,240]],projection,{originMeters:220,minimumSurfaceMM:5},1.5);
 assert.deepEqual(path[0],[75,75,6.5]);assert.equal(path[1][2],8);
 assert.throws(()=>projectInfrastructurePath([[1,41],[1.01,41.01]],projection,{originMeters:220,minimumSurfaceMM:5},1.5),/XYZ/);
});

test('surveyed IFC deck surfaces become closed printable solids, also cropped and rotated',async()=>{
 const data=JSON.parse(await readFile(new URL('../public/data/eix-diagonal-decks.json',import.meta.url))),meta=JSON.parse(await readFile(new URL('../public/data/eix-diagonal.json',import.meta.url)));
 assert.equal(data.items.length,4);assert.equal(data.sheet,'280110');
 for(const pose of [null,{center:[41.718,1.7835],widthM:600,heightM:600,rotation:25}]){
  const projection=makeProjection(meta.bbox,150,pose?{widthMM:150,heightMM:150,selectionPose:pose}:{});
  for(const item of data.items){const p=deckSurfaceSolid(item,projection,{originMeters:220,minimumSurfaceMM:5},1.5);
   if(!p.faces.length)continue;
   const bbox=check(p);assert(bbox.min[0]>=-1e-3&&bbox.min[1]>=-1e-3);assert(bbox.max[0]<=150.001&&bbox.max[1]<=150.001);
  }
 }
});
