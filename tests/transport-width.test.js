import test from 'node:test';
import assert from 'node:assert/strict';
import {roadWidthMetres,roadWidthMM} from '../src/transport-width.js';
import {generateProceduralTunnelVoids} from '../src/procedural-tunnels.js';

test('carriageways use explicit metres before whole lane counts, then a common class estimate',()=>{
  assert.equal(roadWidthMetres({class:'motorway',width:'6',lanes:4}),6);
  assert.equal(roadWidthMetres({class:'motorway',oneway:1,lanes:3}),9.6);
  assert.equal(roadWidthMetres({class:'trunk',lanes:'3'}),9.6);
  assert.equal(roadWidthMetres({class:'primary',width:9000,lanes:2}),6.4);
  assert.equal(roadWidthMetres({class:'primary',lanes:'2;3'}),10);
  assert.equal(roadWidthMetres({class:'primary',lanes:1.5}),10);
  assert.equal(roadWidthMetres({class:'trunk',lanes:12}),38.4);
  assert.equal(roadWidthMetres({class:'trunk',width:60}),60);
  assert.equal(roadWidthMetres({class:'trunk',width:.5}),.5);
});

test('one route keeps the same carriageway width in surface, bridge and tunnel tags',()=>{
  for(const [properties,expected]of [[{class:'motorway'},14],[{class:'motorway',oneway:1},10],[{class:'trunk'},10],[{class:'primary'},10],[{class:'secondary'},8],[{class:'tertiary'},6],[{class:'path'},2],[{class:'trunk',ramp:1},7],[{class:'motorway_link'},7],[{class:'primary',width:6},6]]){
    for(const brunnel of [undefined,'bridge','tunnel']){
      assert.equal(roadWidthMetres({...properties,brunnel}),expected);
      assert.equal(roadWidthMM({...properties,brunnel},.05),roadWidthMM(properties,.05));
    }
  }
  assert(Math.abs(roadWidthMM({class:'trunk',width:6},.1)-.6)<1e-12);
  assert.equal(roadWidthMM({class:'trunk',width:6},.05),.44);
  assert.equal(roadWidthMM({class:'trunk'},.05),.5);
  assert.equal(roadWidthMM({class:'trunk'},.02,{minimumMM:.6}),.6);
});

test('coarse retalls preserve hierarchy by progressively narrowing small paths and secondary roads',()=>{
  const path={class:'path'},secondary={class:'secondary'};
  assert.equal(roadWidthMM(path,.1),.44);
  assert(Math.abs(roadWidthMM(path,.075)-.40)<1e-12);
  assert.equal(roadWidthMM(path,.05),.36);
  assert.equal(roadWidthMM(secondary,.05),.40);
  assert.equal(roadWidthMM({class:'primary'},.05),.50);
  assert.equal(roadWidthMM({class:'path',width:16},.05),.8);
  assert.equal(roadWidthMM(path,.05,{minimumMM:.44}),.44);
});

test('a narrow tunnel keeps its printable bore and the same pavement width as the path outside',()=>{
  const properties={sourceLayer:'transportation',class:'path',brunnel:'tunnel'};
  const geometry={type:'LineString',coordinates:[[.002,.004],[.008,.004]]};
  const projection={width:100,height:80,scale:.05,project:([x,y])=>[x*10000,y*10000]};
  const ground=x=>x>25&&x<75?20:5;
  const result=generateProceduralTunnelVoids([{id:'path',properties,geometry}],()=>100,{
    enabled:true,projection,ground,verticalReference:{originMeters:100,minimumSurfaceMM:5}
  });
  assert.equal(result.items.length,1,result.warnings.join(' '));
  assert.equal(result.items[0].carriagewayWidthMM,roadWidthMM(properties,.05));
  assert.equal(result.items[0].widthMM,1.2);
});

test('invalid measured widths do not invent a zero-width carriageway; scale/minimum errors are explicit',()=>{
  for(const width of [null,'',0,-1,Infinity,NaN,'6 ft','6;8',61])assert.equal(roadWidthMetres({class:'trunk',width}),10);
  for(const roadClass of ['unknown','toString','__proto__'])assert.equal(roadWidthMetres({class:roadClass}),4);
  for(const scale of [0,-1,NaN,Infinity])assert.throws(()=>roadWidthMM({},scale),/invàlida/);
  for(const minimumMM of [0,-1,NaN,Infinity])assert.throws(()=>roadWidthMM({},.1,{minimumMM}),/invàlida/);
});
