import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {buildFenceMesh} from '../src/fence-mesh.js';
import {FENCE_DEFAULT_HEIGHT_MM,FENCE_DEFAULT_WIDTH_MM,normalizeFences} from '../src/fence-settings.js';
import {auditPart} from '../src/solid-audit.js';
import {splitModel} from '../src/mesh-tiles.js';
import {polygonTester} from '../src/polygon-index.js';

const api=await Module();api.setup();
const fence=(points,options={})=>({widthMM:FENCE_DEFAULT_WIDTH_MM,heightMM:FENCE_DEFAULT_HEIGHT_MM,points,closed:false,...options});
const context={proj:{project:point=>point},width:24,height:24,ground:()=>5,api};
const build=(fences,changes={})=>buildFenceMesh(fences,{...context,...changes});

function audited(mesh,expectedComponents){
  assert.ok(mesh,'La tanca ha de tenir un volum.');
  const audit=auditPart(mesh);
  assert.deepEqual(audit.errors,[]);
  if(expectedComponents!==undefined)assert.equal(audit.components,expectedComponents);
  return audit;
}
function ray(mesh,x,y){
  const solid=new api.Manifold(new api.Mesh({numProp:3,vertProperties:mesh.vertices,triVerts:mesh.faces}));
  try{
    assert.equal(solid.status(),'NoError');
    return solid.rayCast([x,y,25],[x,y,0]).map(hit=>hit.position[2]);
  }finally{solid.delete();}
}

test('normalizes saved coordinates without modifying the input or accepting degenerate paths',()=>{
  const input=[fence([[2,2],[3,5]])];
  const copy=normalizeFences(input);
  copy[0].points[0][0]=4;
  assert.equal(input[0].points[0][0],2);
  assert.throws(()=>normalizeFences([fence([[2,2],[2,2]])]));
  assert.throws(()=>normalizeFences([fence([[2,2],[3,5],[2,2]],{closed:true})]));
  assert.throws(()=>normalizeFences([fence([[2,2],[180.1,5]])]));
  assert.throws(()=>normalizeFences([fence([[2,2],[3,5]],{widthMM:.25})]));
});

test('a closed fence is one solid, preserves the courtyard, and seals the final corner',()=>{
  const mesh=build([fence([[3,3],[14,3],[14,13],[3,13]],{closed:true})]);
  audited(mesh,1);
  assert.equal(ray(mesh,8,8).length,0,'El pati queda obert');
  assert.equal(ray(mesh,3,9).length,2,'L’últim tram ha de tancar el perímetre');
  assert.equal(ray(mesh,13.8,12.8).length,2,'La unió és contínua també a la cantonada');
});

test('two open portions preserve the gate and merge overlapping ends around a bend',()=>{
  const mesh=build([fence([[3,6],[8,6]]),fence([[11,6],[17,6],[17,13]]),fence([[17,12.5],[21,12.5]])]);
  audited(mesh,2);
  assert.equal(ray(mesh,9.5,6).length,0);
  for(const [x,y]of [[7,6],[12,6],[17,6],[17,12.5]])assert.equal(ray(mesh,x,y).length,2);
});

test('the wall follows the generated grade and overlaps its substrate past changes of slope',()=>{
  const ground=x=>5+.5*Math.max(0,x-6)+.8*Math.max(0,x-13);
  const mesh=build([fence([[1,5],[21,5]])],{ground});
  audited(mesh,1);
  for(const x of [2,5.9,6.1,10,12.9,13.1,17,20]){
    const [top,bottom]=ray(mesh,x,5.01);
    assert.ok(Math.abs(top-ground(x)-2.4)<.16,`coronament a x=${x}: ${top}`);
    assert.ok(bottom<ground(x)-.25,`ancoratge a x=${x}: ${bottom}`);
  }
});

test('clipping the region and splitting it into print pieces caps both halves',()=>{
  assert.equal(build([fence([[-20,-8],[-14,-9]])]),null);
  const mesh=build([fence([[-5,8],[29,8]])]);
  const whole=audited(mesh,1);
  assert.equal(whole.bbox.min[0],0);
  assert.equal(whole.bbox.max[0],24);
  const within=polygonTester(mesh.footprint);
  assert.equal(within([12,8]),true);
  assert.equal(within([-1,8]),false);
  const model={width:24,height:24,parts:[{id:'buildings',name:'Tanques',...mesh}],provenance:{}};
  const pieces=splitModel(model,api,{cols:2,rows:1,tiles:[
    {row:1,col:1,x0:0,x1:12,y0:0,y1:24,width:12,height:24},
    {row:1,col:2,x0:12,x1:24,y0:0,y1:24,width:12,height:24}
  ]});
  const audits=pieces.map(piece=>audited(piece.parts[0],1));
  assert.ok(Math.abs(audits.reduce((total,part)=>total+part.signedVolume,0)-whole.signedVolume)<1e-3);
  assert.ok(audits.every(part=>part.bbox.min[0]===0&&part.bbox.max[0]===12));
});

test('a taller crossing shares one watertight volume instead of intersecting shells',()=>{
  const mesh=build([fence([[3,10],[21,10]]),fence([[11,2],[11,20]],{heightMM:4})]);
  audited(mesh,1);
  const hits=ray(mesh,11.1,10.1);
  assert.equal(hits.length,2);
  assert.ok(Math.abs(hits[0]-9)<1e-5);
  assert.ok(Math.abs(hits[1]-4.55)<1e-5);
  const within=polygonTester(mesh.footprint);
  for(const point of [[5,10],[11,4],[11,10]])assert.equal(within(point),true);
  assert.equal(within([5,4]),false);
});
