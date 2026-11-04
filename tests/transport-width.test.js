import test from 'node:test';
import assert from 'node:assert/strict';
import {roadWidthMetres,roadWidthMM} from '../src/transport-width.js';
import {generateProceduralTunnelVoids} from '../src/procedural-tunnels.js';
import {buildModel} from '../src/geometry.js';

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
  for(const [properties,expected]of [[{class:'motorway'},14],[{class:'motorway',oneway:1},10],[{class:'trunk'},10],[{class:'primary'},10],[{class:'secondary'},8],[{class:'tertiary'},6],[{class:'path'},1],[{class:'trunk',ramp:1},7],[{class:'motorway_link'},7],[{class:'primary',width:6},6]]){
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

test('footpaths use their own narrower width and multiplier across scales',()=>{
  const path={class:'path'},secondary={class:'secondary'};
  for(const scale of [.05,.075,.1])assert.equal(roadWidthMM(path,scale),.30);
  assert.equal(roadWidthMM(path,.5),.5);
  assert.equal(roadWidthMetres({class:'path',subclass:'footway'}),1.5);
  assert.equal(roadWidthMetres({class:'path',width:.35}),.35);
  assert(Math.abs(roadWidthMM(path,.05,{trailWidth:.75})-.225)<1e-12);
  assert(Math.abs(roadWidthMM({class:'path',width:3},.15,{trailWidth:2})-.9)<1e-12);
  for(const props of [secondary,{class:'path',subclass:'cycleway'},{class:'cycleway'},{class:'track'}])
    assert.equal(roadWidthMM(props,.05,{trailWidth:2}),roadWidthMM(props,.05));
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
    enabled:true,projection,ground,trailWidth:2,verticalReference:{originMeters:100,minimumSurfaceMM:5}
  });
  assert.equal(result.items.length,1,result.warnings.join(' '));
  assert.equal(result.items[0].carriagewayWidthMM,roadWidthMM(properties,.05,{trailWidth:2}));
  assert.equal(result.items[0].widthMM,1.2);
});

test('a model rebuild changes trail geometry independently of ordinary road geometry',()=>{
  const extent=.02;
  const features=['path','secondary'].map((roadClass,i)=>({id:roadClass,
    properties:{sourceLayer:'transportation',class:roadClass},
    geometry:{type:'LineString',coordinates:[[0,extent*(i+1)/3],[extent,extent*(i+1)/3]]}}));
  const region={meta:{bbox:[0,0,extent,extent]},features,
    localDEM:{width:2,height:2,epsg:4326,affine:[extent,0,0,0,extent,0],pixelIsArea:false,
      values:new Float32Array(4).fill(100),metadata:{}}};
  const model=trailWidth=>buildModel(region,{size:100,resolution:8,trees:false,trailWidth});
  const defaultModel=model(1),wideModel=model(2);
  assert.equal(defaultModel.context.terrain.transport[0].width,.30);
  assert.equal(wideModel.context.terrain.transport[0].width,.60);
  assert.equal(wideModel.context.terrain.transport[1].width,defaultModel.context.terrain.transport[1].width);
  assert(!defaultModel.context.containsRoad([50,100/3+.23]));
  assert(wideModel.context.containsRoad([50,100/3+.23]));
});

test('invalid measured widths do not invent a zero-width carriageway; scale/minimum errors are explicit',()=>{
  for(const width of [null,'',0,-1,Infinity,NaN,'6 ft','6;8',61])assert.equal(roadWidthMetres({class:'trunk',width}),10);
  for(const roadClass of ['unknown','toString','__proto__'])assert.equal(roadWidthMetres({class:roadClass}),4);
  for(const scale of [0,-1,NaN,Infinity])assert.throws(()=>roadWidthMM({},scale),/invàlida/);
  for(const minimumMM of [0,-1,NaN,Infinity])assert.throws(()=>roadWidthMM({},.1,{minimumMM}),/invàlida/);
});
