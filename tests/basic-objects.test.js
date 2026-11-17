import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {applyBasicObjects} from '../src/basic-objects.js';
import {normalizeBasicObjects} from '../src/basic-object-settings.js';
import {CATEGORIES} from '../src/materials.js';
import {auditPart} from '../src/solid-audit.js';
import {splitModel} from '../src/mesh-tiles.js';

const api=await Module();api.setup();
const object=(shape='box',position=[10,10],more={})=>({shape,position,widthMM:4,depthMM:4,heightMM:5,rotation:0,...more});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-4,`${a} ≠ ${b}`);
function layer(id,lo,hi){
  const solid=api.Manifold.cube(hi.map((v,i)=>v-lo[i])).translate(lo);
  try{const mesh=solid.getMesh();return {...CATEGORIES.find(p=>p.id===id),vertices:new Float32Array(mesh.vertProperties),faces:new Uint32Array(mesh.triVerts)};}
  finally{solid.delete();}
}
function modelOf(...categories){
  const model={width:24,height:20,categories,parts:categories,provenance:{options:{baseThickness:5}}};
  Object.defineProperty(model,'context',{value:{width:24,height:20,proj:{project:p=>p},ground:()=>5}});
  return model;
}
function solidOf(part){const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});mesh.merge();return new api.Manifold(mesh);}
test('primitive shapes are seated, watertight and do not overlap the ground material',()=>{
  const source=modelOf(layer('terrain',[0,0,0],[24,20,5]));
  for(const shape of ['box','cylinder','sphere']){
    const {model,levels}=applyBasicObjects(source,[object(shape)],api);
    close(levels[0].baseMM,4.8);close(levels[0].topMM,9.8);
    assert.equal(source.categories.length,1);assert.equal(model.context,source.context);
    for(const part of model.categories)assert.deepEqual(auditPart(part).errors,[],part.id);
    const earth=solidOf(model.parts.find(p=>p.id==='terrain')),built=solidOf(model.parts.find(p=>p.id==='buildings'));
    const overlap=earth.intersect(built);
    try{close(overlap.volume(),0);assert.ok(built.volume()>1);}finally{overlap.delete();earth.delete();built.delete();}
  }
});
test('objects seat on a roof, preserve its base and remain closed after a rotated crop and print split',()=>{
  const source=modelOf(layer('terrain',[0,0,0],[24,20,5]),layer('buildings',[7,7,5],[13,13,12]));
  const {model,levels}=applyBasicObjects(source,[object(),object('cylinder',[23,15],{rotation:45})],api);
  close(levels[0].baseMM,11.8);close(levels[0].topMM,16.8);
  const built=model.parts.find(p=>p.id==='buildings');
  assert.deepEqual(auditPart(built).errors,[]);close(auditPart(built).bbox.max[0],24);
  const plan={cols:2,rows:1,tiles:[0,12].map((x,i)=>({name:'Tile '+i,row:1,col:i+1,x0:x,x1:x+12,y0:0,y1:20,width:12,height:20}))};
  for(const piece of splitModel(model,api,plan))for(const part of piece.parts)assert.deepEqual(auditPart(part).errors,[],part.id);
  assert.equal(applyBasicObjects(source,[],api).model,source);
});
test('a hillside supports a level object, invalid placement rolls back, and wholly outside objects are skipped',()=>{
  const earth=layer('terrain',[0,0,0],[24,20,1]);
  for(let i=2;i<earth.vertices.length;i+=3)if(earth.vertices[i])earth.vertices[i]=5+earth.vertices[i-2]*.5;
  const source=modelOf(earth),before=source.categories[0].vertices.slice();
  const {model,levels}=applyBasicObjects(source,[object('box'),object('box',[35,10])],api);
  close(levels[0].baseMM,9.8);assert.equal(levels[1],null);
  assert.deepEqual(auditPart(model.parts.find(p=>p.id==='buildings')).errors,[]);
  assert.deepEqual(source.categories[0].vertices,before);
  const water=modelOf(layer('water',[0,0,0],[24,20,7]));
  assert.throws(()=>applyBasicObjects(water,[object()],api),{code:'OBJECT_NO_SUPPORT',objectIndex:0});
});
test('object settings copy coordinates and reject unsafe dimensions and counts',()=>{
  const original=object(),copy=normalizeBasicObjects([original]);
  copy[0].position[0]=0;assert.equal(original.position[0],10);
  for(const value of [{shape:'unknown'},{widthMM:NaN},{depthMM:.1},{heightMM:81},{rotation:181},{position:[0,100]}])
    assert.throws(()=>normalizeBasicObjects([object('box',[10,10],value)]));
  assert.throws(()=>normalizeBasicObjects(Array(33).fill(object())));
});
test('a new object removes an intersecting tree as a whole instead of leaving a floating crown',()=>{
  const source=modelOf(layer('terrain',[0,0,0],[24,20,5]),layer('trees',[9,9,5],[11,11,14]));
  source.treeCount=1;
  const {model}=applyBasicObjects(source,[object('box')],api);
  assert.equal(model.treeCount,0);assert.ok(!model.categories.some(p=>p.id==='trees'));
  assert.equal(source.treeCount,1);assert.equal(source.categories.length,2);
});
