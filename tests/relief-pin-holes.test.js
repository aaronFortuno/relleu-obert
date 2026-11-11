import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {auditPart} from '../src/solid-audit.js';
import {applyReliefPinHoles} from '../src/relief-pin-holes.js';
import {buildModel} from '../src/geometry.js';
import {splitPureRelief} from '../src/pure-relief-mesh.js';
import {physicalBBox,tilePlan} from '../src/selection.js';
import {locateReliefPins,pinProjection} from '../src/relief-pin-placement.js';

const api=await Module();
api.setup();

function solidBox(size,origin=[0,0,0]){
  const box=api.Manifold.cube(size);
  try{return box.translate(origin);}finally{box.delete();}
}

function part(id,solid){
  const mesh=solid.getMesh();
  return {id,name:id,color:'#907B5F',vertices:new Float32Array(mesh.vertProperties),faces:new Uint32Array(mesh.triVerts)};
}

function box(id,size,origin){
  const solid=solidBox(size,origin);
  try{return part(id,solid);}finally{solid.delete();}
}

function hits(part,from,to){
  const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});
  mesh.merge();
  const solid=new api.Manifold(mesh);
  try{return solid.rayCast(from,to).map(hit=>hit.position[2]);}finally{solid.delete();}
}

test('drills a vertical one millimetre blind hole from the real top across two material layers',()=>{
  const piece={width:20,height:20,parts:[box('terrain',[20,20,7]),box('forest',[20,20,5],[0,0,7])]};
  const pin={x:10,y:10,depth:8};
  const {piece:drilled,accepted,rejected}=applyReliefPinHoles(piece,[pin],api);
  assert.deepEqual(accepted,[{...pin,zTop:12,zBottom:4}]);
  assert.deepEqual(rejected,[]);
  assert.deepEqual(drilled.parts.map(part=>part.id),['terrain','forest']);
  const area=32*.5*.5*Math.sin(2*Math.PI/32)/2;
  for(const [i,material]of drilled.parts.entries()){
    const audit=auditPart(material),before=auditPart(piece.parts[i]);
    assert.deepEqual(audit.errors,[]);
    assert(Math.abs(before.signedVolume-audit.signedVolume-area*(i?5:3))<.0001);
    assert.notStrictEqual(material,piece.parts[i]);
  }
  assert.deepEqual(hits(drilled.parts[0],[10,10,14],[10,10,-1]),[4,0]);
  assert.deepEqual(hits(drilled.parts[1],[10,10,14],[10,10,-1]),[]);
  assert.deepEqual(hits(drilled.parts[1],[10.51,10,14],[10.51,10,-1]),[12,7]);
});

test('the floor and print-piece edge margins are checked before replacing any geometry',()=>{
  const piece={width:20,height:20,parts:[box('terrain',[20,20,7.5])]};
  const pins=[{x:10,y:10,depth:7},{x:19.2,y:10,depth:8},{x:10,y:10,depth:6}];
  const result=applyReliefPinHoles(piece,pins,api);
  assert.strictEqual(result.piece,piece);
  assert.deepEqual(result.accepted,[]);
  assert.deepEqual(result.rejected.map(({reason})=>reason).sort(),['edge','invalid','thin-base']);
});

test('a pin through an existing cavity is rejected and a nearby valid pin leaves the cavity intact',()=>{
  const body=solidBox([20,20,14]),cavity=solidBox([2,2,2],[9,9,6]),shell=body.subtract(cavity);
  let terrain;
  try{terrain=part('terrain',shell);}finally{shell.delete();cavity.delete();body.delete();}
  const piece={width:20,height:20,parts:[terrain]};
  const risky={x:10,y:10,depth:9},good={x:4,y:4,depth:8},crowded={x:5,y:4,depth:7};
  const result=applyReliefPinHoles(piece,[risky,good,crowded],api);
  assert.deepEqual(result.accepted,[{...good,zTop:14,zBottom:6}]);
  assert.deepEqual(result.rejected,[{pin:risky,reason:'unsupported'},{pin:crowded,reason:'overlap'}]);
  assert.deepEqual(auditPart(result.piece.parts[0]).errors,[]);
  assert.deepEqual(hits(result.piece.parts[0],[10,10,15],[10,10,-1]),hits(terrain,[10,10,15],[10,10,-1]));
});

test('the bore cuts native trail and terrain layers after a fractional print split',()=>{
  const bbox=physicalBBox([0,0],10,3.75),[w,s,e,n]=bbox,y=(s+n)/2;
  const terrainRaster={epsg:4326,width:2,height:2,values:new Float32Array(4).fill(100),affine:[e-w,0,w,0,n-s,s]};
  const trails=[{properties:{class:'path'},geometry:{type:'LineString',coordinates:[[w,y],[e,y]]}}];
  const model=buildModel({meta:{bbox},terrainRaster,trails},{
    size:400,widthMM:400,heightMM:150,pureRelief:true,resolution:12,baseThickness:12,reliefTrails:true
  });
  const plan=tilePlan(400,150,{columns:[193,207]});
  const [piece]=splitPureRelief(model,plan);
  const pin={x:90,y:75,depth:8};
  const pins=[pin,{...pin,x:192.5},{...pin,x:270},{...pin,x:450}].map(({x,y,depth})=>{
    const [lon,lat]=pinProjection(model).unproject([x,y]);
    return {lon,lat,depth};
  });
  const [left,right]=locateReliefPins(model,pins,plan);
  assert.deepEqual(right,[{x:77,y:75,depth:8,id:3}]);
  const result=applyReliefPinHoles(piece,left,api);
  assert.deepEqual(result.rejected.map(({reason})=>reason),['edge']);
  assert.equal(result.accepted.length,1);
  const [{zBottom,zTop}]=result.accepted;
  assert(Math.abs(zTop-12.2)<1e-5&&Math.abs(zBottom-4.2)<1e-5);
  for(const material of result.piece.parts)assert.deepEqual(auditPart(material).errors,[]);
  for(const material of result.piece.parts){
    const channel=hits(material,[pin.x,pin.y,14],[pin.x,pin.y,zBottom+.1]);
    assert.deepEqual(channel,[],`Obstrucció dins la perforació a la capa ${material.id}`);
  }
});
