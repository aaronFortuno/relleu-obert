import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {applyHorizontalSurfaces} from '../src/horizontal-surfaces.js';
import {CATEGORIES} from '../src/materials.js';
import {splitModel} from '../src/mesh-tiles.js';
import {auditPart} from '../src/solid-audit.js';

const api=await Module();api.setup();
const ground=x=>5+x*.5;
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-5,`${actual} ≠ ${expected}`);
const ring=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
const edit=(points,reference='mean',offsetMM=0,material='roads')=>({points,reference,offsetMM,material});

function layer(id,x0,y0,x1,y1,bottom,top){
  const cube=api.Manifold.cube([x1-x0,y1-y0,1]);
  try{
    const mesh=cube.getMesh(),vertices=new Float32Array(mesh.vertProperties);
    for(let i=0;i<vertices.length;i+=3){
      vertices[i]+=x0;vertices[i+1]+=y0;
      vertices[i+2]=(vertices[i+2]?top:bottom)(vertices[i],vertices[i+1]);
    }
    return {...CATEGORIES.find(c=>c.id===id),vertices,faces:new Uint32Array(mesh.triVerts)};
  }finally{cube.delete();}
}
function combine(parts){
  const vertices=[],faces=[];
  for(const part of parts){
    const offset=vertices.length/3;
    vertices.push(...part.vertices);faces.push(...part.faces.map(i=>i+offset));
  }
  return {...parts[0],vertices:new Float32Array(vertices),faces:new Uint32Array(faces)};
}
function modelOf(...parts){
  const model={width:24,height:20,categories:parts,parts,treeCount:2,provenance:{options:{baseThickness:5}}};
  Object.defineProperty(model,'context',{value:{width:24,height:20,proj:{project:p=>p},ground}});
  return model;
}
function solidOf(part){
  const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});
  mesh.merge();return new api.Manifold(mesh);
}
function hitHeights(solid,x,y){
  return solid.rayCast([x,y,40],[x,y,-1]).map(hit=>hit.position[2]).sort((a,b)=>b-a);
}

test('cuts and fills a 50% hillside with a flat, separate material above an intact base',()=>{
  const earth=layer('terrain',0,0,24,20,()=>0,x=>ground(x)-.6);
  const grove=layer('forest',0,0,24,20,x=>ground(x)-.6,ground);
  const treeInside=layer('trees',4,7,6,9,ground,x=>ground(x)+2);
  const treeOutside=layer('trees',15,7,16,9,ground,x=>ground(x)+2);
  const trees=combine([treeInside,treeOutside]);
  const source=modelOf(earth,grove,trees),original=JSON.stringify(earth.vertices);
  const {model,levels,ground:editedGround}=applyHorizontalSurfaces(source,[edit(ring(2,4,14,16))],api);
  assert.deepEqual(levels,[{levelMM:9,minMM:6,maxMM:12}]);
  assert.equal(source.treeCount,2);assert.equal(model.treeCount,1);
  assert.equal(JSON.stringify(earth.vertices),original);
  assert.equal(model.context,source.context);
  assert.equal(model.triangles,model.categories.reduce((n,p)=>n+p.faces.length/3,0));
  for(const part of model.categories)assert.deepEqual(auditPart(part).errors,[],part.id);
  const parts=Object.fromEntries(model.parts.map(p=>[p.id,solidOf(p)]));
  try{
    for(const [x,y] of [[3,7],[7,13],[12,8]]){
      close(editedGround(x,y),9);
      close(hitHeights(parts.roads,x,y)[0],9);
      close(hitHeights(parts.terrain,x,y)[0],hitHeights(parts.roads,x,y)[1]);
      close(hitHeights(parts.terrain,x,y).at(-1),0);
      assert.equal(hitHeights(parts.terrain,x,y).length,2);
      assert.equal(hitHeights(parts.forest,x,y).length,0);
    }
    close(hitHeights(parts.forest,19,3)[0],ground(19));close(editedGround(19,3),ground(19));
    assert.equal(hitHeights(parts.trees,5,8).length,0);
    assert.equal(hitHeights(parts.trees,15.5,8).length,2);
    for(const id of ['terrain','forest']){
      const overlap=parts[id].intersect(parts.roads);
      try{close(overlap.volume(),0);}finally{overlap.delete();}
    }
  }finally{for(const solid of Object.values(parts))solid.delete();}
});

test('clips outlines to the crop, uses its sampled extrema and preserves the base on negative offsets',()=>{
  const source=modelOf(layer('terrain',0,0,24,20,()=>0,ground));
  const {model,levels,ground:editedGround}=applyHorizontalSurfaces(source,[
    edit(ring(-3,3,8,7),'max',1,'grass'),edit(ring(9,3,14,7),'min',-8,'terrain'),edit(ring(-12,3,-5,7))
  ],api);
  assert.deepEqual(levels,[{levelMM:10,minMM:5,maxMM:9},{levelMM:5,minMM:9.5,maxMM:12},null]);
  close(editedGround(0,5),10);close(editedGround(12,5),5);
  const grass=model.parts.find(p=>p.id==='grass'),terrain=model.parts.find(p=>p.id==='terrain');
  assert.deepEqual(auditPart(grass).errors,[]);assert.deepEqual(auditPart(terrain).errors,[]);
  close(auditPart(grass).bbox.min[0],0);close(auditPart(terrain).bbox.min[2],0);
  const tiles=[0,6].map((x0,i)=>({name:'Piece '+(i+1),row:1,col:i+1,x0,x1:i?24:6,y0:0,y1:20,width:i?18:6,height:20}));
  const pieces=splitModel(model,api,{cols:2,rows:1,tiles});
  for(const piece of pieces){
    const finish=piece.parts.find(p=>p.id==='grass'),audit=auditPart(finish);
    assert.deepEqual(audit.errors,[]);close(audit.bbox.max[2],10);
  }
});

test('rejects bad outlines, overlapping surfaces and protected buildings instead of erasing them',()=>{
  const source=modelOf(layer('terrain',0,0,24,20,()=>0,ground),layer('buildings',18,8,20,10,ground,()=>30));
  const approach=ring(13,3,18,6);
  source.context.bridges=[{approaches:{plans:[{footprint:[[...approach,approach[0]]]}]}}];
  for(const [edits,code,surfaceIndex] of [
    [[edit([[2,2],[12,12],[2,12],[12,2]])],'HORIZONTAL_SURFACE_INVALID',0],
    [[edit(ring(2,2,10,10)),edit(ring(8,8,14,12))],'HORIZONTAL_SURFACE_OVERLAP',1],
    [[edit(ring(17,7,21,11))],'HORIZONTAL_SURFACE_CONFLICT',0],
    [[edit(ring(15,2,17,4))],'HORIZONTAL_SURFACE_CONFLICT',0]
  ])assert.throws(()=>applyHorizontalSurfaces(source,edits,api),{code,surfaceIndex});
});

test('a courtyard can meet a mapped building edge without cutting into its volume',()=>{
  const source=modelOf(layer('terrain',0,0,24,20,()=>0,ground),layer('buildings',18,8,20,10,ground,()=>30));
  const {model}=applyHorizontalSurfaces(source,[edit(ring(12,8,18,10))],api);
  assert.deepEqual(model.categories.find(part=>part.id==='buildings'),source.categories.find(part=>part.id==='buildings'));
  assert.deepEqual(auditPart(model.parts.find(part=>part.id==='roads')).errors,[]);
  assert.throws(()=>applyHorizontalSurfaces(source,[edit(ring(12,8,18.1,10))],api),{code:'HORIZONTAL_SURFACE_CONFLICT'});
});

test('joins over a formerly excavated patch and leaves distant grid patches intact',()=>{
  const terrain=combine([
    layer('terrain',0,0,8,20,()=>0,ground),
    layer('terrain',8,0,16,20,()=>0,()=>2),
    layer('terrain',16,0,24,20,()=>0,ground)
  ]);
  const {model}=applyHorizontalSurfaces(modelOf(terrain),[edit(ring(6,5,11,9),'mean',0,'terrain')],api);
  const sculpted=model.parts.find(p=>p.id==='terrain');
  assert.deepEqual(auditPart(sculpted).errors,[]);
  const solid=solidOf(sculpted);
  try{
    const inside=hitHeights(solid,10,7);
    assert.equal(inside.length,2);
    close(inside[0],9.25);close(inside[1],0);
    close(hitHeights(solid,21,8)[0],ground(21));
  }finally{solid.delete();}
});
