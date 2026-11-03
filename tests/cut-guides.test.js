import test from 'node:test';
import assert from 'node:assert/strict';
import {cutGuideSegments} from '../src/cut-guides.js';

const vertices=new Float32Array([0,0,5,300,0,35,300,300,95,0,300,65]);
const surface={id:'terrain',vertices,faces:new Uint32Array([0,1,2,0,2,3])};

test('cut guides intersect the same split planes as export and follow the slope',()=>{
  const segments=cutGuideSegments({width:300,height:300,categories:[
    surface,{...surface,id:'buildings',vertices:vertices.map((v,i)=>i%3===2?v+25:v)},
    {...surface,faces:new Uint32Array([2,1,0,3,2,0])}
  ]});
  assert.equal(segments.length,24);
  for(let i=0;i<segments.length;i+=6){
    assert((segments[i]===150&&segments[i+3]===150)||(segments[i+1]===150&&segments[i+4]===150));
    for(const j of [i,i+3])assert.equal(segments[j+2],5+segments[j]/10+segments[j+1]/5);
  }
});

test('one piece needs no guide, and an edge on the cut is emitted once',()=>{
  assert.equal(cutGuideSegments({width:200,height:200,categories:[surface]}).length,0);
  const sharedEdge={...surface,vertices:new Float32Array([150,0,5,150,200,20,300,100,40,0,100,20]),
    faces:new Uint32Array([0,2,1,0,1,3])};
  const segments=cutGuideSegments({width:300,height:200,categories:[sharedEdge]});
  assert.equal(segments.length,6);
  assert.deepEqual(Array.from(segments),[150,0,5,150,200,20]);
});
