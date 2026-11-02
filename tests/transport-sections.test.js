import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {crossSectionFractions,stripSectionSolid} from '../src/transport-sections.js';
import {auditPart} from '../src/solid-audit.js';
const api=await Module();api.setup();
const close=(a,b,label)=>assert(Math.abs(a-b)<1e-5,`${label}: ${a} != ${b}`);
function fractions(actual,expected){assert.equal(actual.length,expected.length);actual.forEach((v,i)=>assert(Math.abs(v-expected[i])<1e-12,`${actual} != ${expected}`));}
function checked(mesh,expectedVolume){
  const audit=auditPart(mesh);assert.deepEqual(audit.errors,[]);assert.equal(audit.components,1);
  const solid=new api.Manifold(new api.Mesh({numProp:3,vertProperties:mesh.vertices,triVerts:mesh.faces}));
  assert.equal(solid.status(),'NoError');assert(solid.volume()>0);
  if(expectedVolume!==undefined)close(solid.volume(),expectedVolume,'volume');
  return solid;
}

test('cross sections split at actual terrain grid lines and u=v diagonals, always retaining the centre',()=>{
  const field={fieldWidth:10,fieldHeight:10,resolution:2};
  fractions(crossSectionFractions({centre:[5,3],normal:[1,0],widthMM:10},field),[-.5,-.2,0,.3,.5]);
  fractions(crossSectionFractions({centre:[3,5],normal:[0,1],widthMM:10},field),[-.5,-.2,0,.3,.5]);
  fractions(crossSectionFractions({centre:[5,5],normal:[1,-1],widthMM:10},field),[-.5,-.25,0,.25,.5]);
  fractions(crossSectionFractions({centre:[5,5],normal:[1,1],widthMM:10},field),[-.5,0,.5]);
});

test('miter normals keep their true extent and the optional mesh adds its own triangle crease',()=>{
  fractions(crossSectionFractions({centre:[5,3],normal:[2,0],widthMM:10},{fieldWidth:10,fieldHeight:10,resolution:2}),[-.5,-.25,-.1,0,.15,.25,.5]);
  const points=[[0,0,5],[10,0,5],[10,10,6],[0,10,5]],faces=[0,1,2,0,2,3];
  fractions(crossSectionFractions({centre:[5,2],normal:[1,0],widthMM:10},{points,faces}),[-.5,-.3,0,.5]);
  fractions(crossSectionFractions({centre:[5,2],normal:[1,0],widthMM:10}),[-.5,0,.5]);
});

test('a centre-height kink remains an exact closed positive strip, without internal column walls',()=>{
  const sections=[0,10].map(x=>({across:[[x,1,5.2],[x,0,5],[x,-1,5.2]]})),before=JSON.stringify(sections),mesh=stripSectionSolid(sections,.3),solid=checked(mesh,6);
  try{
    assert.equal(mesh.vertices.length/3,12);assert.equal(mesh.faces.length/3,20);
    close(Math.max(...solid.rayCast([5,0,10],[5,0,0]).map(h=>h.position[2])),5,'centre height');
    close(Math.max(...solid.rayCast([5,.9,10],[5,.9,0]).map(h=>h.position[2])),5.18,'edge slope');
    const box=solid.boundingBox();assert.deepEqual(box.min.slice(0,2),[0,-1]);assert.deepEqual(box.max.slice(0,2),[10,1]);
    assert.equal(JSON.stringify(sections),before,'input section coordinates changed');
  }finally{solid.delete();}
});

test('the top uses RIGHT_i to LEFT_next, matching the bore diagonal on a warped cell',()=>{
  const sections=[{left:[0,1,5],right:[0,-1,5]},{left:[10,1,5],right:[10,-1,6]}],solid=checked(stripSectionSolid(sections,.3),6);
  try{close(Math.max(...solid.rayCast([5,0,10],[5,0,0]).map(h=>h.position[2])),5,'diagonal height');}
  finally{solid.delete();}
});

test('curved multi-column sections and reversed input remain one closed solid with the original width',()=>{
  const c=Math.SQRT1_2,m=Math.SQRT2-1,sections=[
    {across:[[0,1,5.2],[0,0,5],[0,-1,5.2]]},
    {across:[[10-m,1,5.4],[10,0,5.2],[10+m,-1,5.4]]},
    {across:[[20-c,10+c,5.6],[20,10,5.4],[20+c,10-c,5.6]]},
  ];
  for(const rows of [sections,sections.slice().reverse()]){
    const mesh=stripSectionSolid(rows,.3),solid=checked(mesh,(10+Math.sqrt(200))*2*.3);
    try{
      assert.equal(mesh.vertices.length/3,18);assert.equal(mesh.faces.length/3,32);
      for(const row of rows)for(const p of row.across)assert(Array.from(mesh.vertices).some((v,i)=>i%3===0&&v===Math.fround(p[0])&&mesh.vertices[i+1]===Math.fround(p[1])&&mesh.vertices[i+2]===Math.fround(p[2])),'a top coordinate moved');
    }finally{solid.delete();}
  }
});

test('invalid sections and Float32-collapsed columns are explicit errors, not discarded positive pieces',()=>{
  const good=[{across:[[0,1,5],[0,0,5],[0,-1,5]]},{across:[[10,1,5],[10,0,5],[10,-1,5]]}];
  for(const thickness of [0,-1,NaN,Infinity])assert.throws(()=>stripSectionSolid(good,thickness));
  assert.throws(()=>stripSectionSolid([],1));
  assert.throws(()=>stripSectionSolid([good[0],{left:[10,1,5],right:[10,-1,5]}],.3),/mateix nombre/);
  const collapsed=[0,10].map(x=>({across:[[x,100.3,5],[x,100.29999999,5],[x,99.7,5]]}));
  assert.throws(()=>stripSectionSolid(collapsed,.3),/col·lapsades en Float32/);
  const thin=[0,10].map(x=>({left:[x,1,1e8],right:[x,-1,1e8]}));
  assert.throws(()=>stripSectionSolid(thin,.3),/col·lapsat en Float32/);
  assert.throws(()=>crossSectionFractions({centre:[0,0],normal:[0,0],widthMM:1}),/invàlida/);
  assert.throws(()=>crossSectionFractions({centre:[0,0],normal:[1,0],widthMM:1},{resolution:0,fieldWidth:10,fieldHeight:10}),/invàlida/);
});
