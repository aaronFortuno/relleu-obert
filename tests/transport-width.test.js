import test from 'node:test';
import assert from 'node:assert/strict';
import {roadWidthMetres,roadWidthMM} from '../src/transport-width.js';

test('carriageways use explicit metres before whole lane counts, then a common class estimate',()=>{
  assert.equal(roadWidthMetres({class:'motorway',width:'6',lanes:4}),6);
  assert.equal(roadWidthMetres({class:'trunk',lanes:'3'}),9.6);
  assert.equal(roadWidthMetres({class:'primary',width:9000,lanes:2}),6.4);
  assert.equal(roadWidthMetres({class:'primary',lanes:'2;3'}),10);
  assert.equal(roadWidthMetres({class:'primary',lanes:1.5}),10);
  assert.equal(roadWidthMetres({class:'trunk',lanes:12}),38.4);
  assert.equal(roadWidthMetres({class:'trunk',width:60}),60);
  assert.equal(roadWidthMetres({class:'trunk',width:.5}),.5);
});

test('one route keeps the same carriageway width in surface, bridge and tunnel tags',()=>{
  for(const [properties,expected]of [[{class:'motorway'},14],[{class:'trunk'},10],[{class:'primary'},10],[{class:'secondary'},10],[{class:'tertiary'},10],[{class:'path'},4],[{class:'trunk',ramp:1},7],[{class:'motorway_link'},7],[{class:'primary',width:6},6]]){
    for(const brunnel of [undefined,'bridge','tunnel'])assert.equal(roadWidthMetres({...properties,brunnel}),expected);
  }
  assert(Math.abs(roadWidthMM({class:'trunk',width:6},.1)-.6)<1e-12);
  assert.equal(roadWidthMM({class:'trunk',width:6},.05),.44);
  assert.equal(roadWidthMM({class:'trunk'},.05),.5);
  assert.equal(roadWidthMM({class:'trunk'},.02,{minimumMM:.6}),.6);
});

test('invalid measured widths do not invent a zero-width carriageway; scale/minimum errors are explicit',()=>{
  for(const width of [null,'',0,-1,Infinity,NaN,'6 ft','6;8',61])assert.equal(roadWidthMetres({class:'trunk',width}),10);
  for(const roadClass of ['unknown','toString','__proto__'])assert.equal(roadWidthMetres({class:roadClass}),4);
  for(const scale of [0,-1,NaN,Infinity])assert.throws(()=>roadWidthMM({},scale),/invàlida/);
  for(const minimumMM of [0,-1,NaN,Infinity])assert.throws(()=>roadWidthMM({},.1,{minimumMM}),/invàlida/);
});
