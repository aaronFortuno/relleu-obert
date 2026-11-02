import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {generateProceduralTunnelVoids} from '../src/procedural-tunnels.js';
import {makeProjection,buildModel} from '../src/geometry.js';
import {selectionPose,physicalBBox} from '../src/selection.js';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {prepareElevationTiles,sampleHeight} from '../src/elevation.js';
import {auditPart} from '../src/solid-audit.js';

const feature=(points,props={},id='a')=>({type:'Feature',id,properties:{sourceLayer:'transportation',brunnel:'tunnel',class:'trunk',...props},geometry:{type:'LineString',coordinates:points}});
const line=[[-.00001,.0006],[.00401,.0006]],projection=makeProjection([0,0,.004,.0012],400,{widthMM:400,heightMM:120});
const options={enabled:true,projection,verticalReference:{originMeters:100,minimumSurfaceMM:5},exaggeration:1.5,ground:()=>20};
const flat=()=>100;

test('estimated tunnels require explicit opt-in and never use layer as altitude',()=>{
  assert.deepEqual(generateProceduralTunnelVoids([feature(line)],flat).items,[]);
  const a=generateProceduralTunnelVoids([feature(line,{layer:-1})],flat,options),b=generateProceduralTunnelVoids([feature(line,{layer:-100})],flat,options);
  assert.equal(a.items.length,1);assert.deepEqual(a.items[0].path,b.items[0].path);
  assert.equal(a.metadata.estimated,true);assert.match(a.warnings[0],/no són geometries mesurades/);
  assert(a.items[0].widthMM>=1.2&&a.items[0].heightMM>=1.2);
  assert.deepEqual(a.items[0].originalPath.map(p=>p[2]),[4.85,4.85]);
  assert(a.items[0].path[0][0]<a.items[0].originalPath[0][0]);
  assert(a.items[0].path.at(-1)[0]>a.items[0].originalPath.at(-1)[0]);
  assert.deepEqual(auditPart(a.items[0]).errors,[]);
});

test('tunnel fragments join only at unambiguous endpoints with the same class/level/name',()=>{
  const left=feature([line[0],[.002,.0006]],{name:'T'},'left'),right=feature([[.002,.0006],line[1]],{name:'T'},'right');
  const a=generateProceduralTunnelVoids([right,left,{...left,geometry:{type:'LineString',coordinates:left.geometry.coordinates.slice().reverse()}}],flat,options);
  assert.equal(a.items.length,1);assert.equal(a.items[0].originalPath.length,3);assert.deepEqual(a.items[0].sourceFeatureIds.slice().sort(),['left','right']);
  const split=generateProceduralTunnelVoids([left,{...right,properties:{...right.properties,layer:-2}}],flat,options);
  // Separate levels must not merge into the otherwise valid full-length bore.
  // Both artificial middle endpoints are buried in this synthetic hill.
  assert.equal(split.items.length,0);assert.equal(split.metadata.omitted,2);
  assert(split.warnings.every(w=>/tots dos portals/.test(w)));
});

test('bridge/surface features are excluded; invalid or missing DEM affects only one tunnel',()=>{
  const good=feature(line,{},'good'),bad=feature(line.map(([x,y])=>[x,y+.0002]),{},'bad');
  const r=generateProceduralTunnelVoids([good,bad,feature(line,{brunnel:'bridge'},'bridge')],(lon,lat)=>lat>.0007?NaN:100,options);
  assert.equal(r.items.length,1);assert.deepEqual(r.items[0].sourceFeatureIds,['good']);assert.equal(r.metadata.omitted,1);
  assert.equal(generateProceduralTunnelVoids([good],()=>{throw Error('missing');},options).items.length,0);
  assert.equal(generateProceduralTunnelVoids([feature([[0,0],[NaN,0]])],flat,options).items.length,0);
});

test('base thickness, water and open intermediate trenches reject unsafe estimated bores',()=>{
  const f=[feature(line)];
  const base=generateProceduralTunnelVoids(f,()=>90,options);assert.equal(base.items.length,0);assert.match(base.warnings[0],/base/);
  const waterMask=[[[[180,50],[220,50],[220,70],[180,70],[180,50]]]];
  const wet=generateProceduralTunnelVoids(f,flat,{...options,waterMask});assert.equal(wet.items.length,0);assert.match(wet.warnings[0],/aigua/);
  const valley=generateProceduralTunnelVoids(f,flat,{...options,ground:x=>x>180&&x<220?5:20});
  assert.equal(valley.items.length,0);assert.match(valley.warnings[0],/contínua/);
  assert.equal(generateProceduralTunnelVoids(f,flat,{...options,ground:()=>5}).items.length,0);
});

test('cropped/rotated views use the original DEM endpoints and keep the same absolute profile',()=>{
  const pose=selectionPose(physicalBBox([.0006,.002],.2,.2),25),small=makeProjection(pose.bbox,100,{widthMM:100,heightMM:100,selectionPose:pose});
  const calls=[];const elevation=(lon,lat)=>(calls.push([lon,lat]),100+lon*10);
  const r=generateProceduralTunnelVoids([feature(line)],elevation,{...options,projection:small});
  assert.equal(r.items.length,1);assert.deepEqual(calls,line);
  const item=r.items[0];
  for(let i=0;i<item.originalPath.length;i++){
    const p=item.originalPath[i],absolute=100+(p[2]+.15-5)/(small.scale*1.5);
    assert(Math.abs(absolute-(100+line[i][0]*10))<1e-10);
  }
});

test('processing budgets are explicit and invalid options fail before geometry',()=>{
  const features=Array.from({length:26},(_,i)=>feature(line.map(([x,y])=>[x,y+(i-13)*.00001]),{name:String(i)},i));
  const r=generateProceduralTunnelVoids(features,flat,{...options,maxTunnels:3});
  assert.equal(r.items.length,3);assert(r.warnings.some(w=>/límit de 3 eixos/.test(w)));
  const big=feature(Array.from({length:1001},(_,i)=>[i*.000001,.0006]));
  assert.equal(generateProceduralTunnelVoids([big],flat,options).items.length,0);
  for(const bad of [{maxTunnels:25},{minBaseMM:0},{minOpeningMM:.1},{exaggeration:NaN}])assert.throws(()=>generateProceduralTunnelVoids(features,flat,{...options,...bad}),/invàlida/);
});

test('real Rajadell MVT/DEM fixture generates an explicitly estimated main tunnel, without remote data',async()=>{
  await init(await WebAssembly.compile(await readFile('node_modules/@jsquash/webp/codec/dec/webp_dec.wasm')));
  const api=await Module();api.setup();const prior=globalThis.fetch;
  try{
    globalThis.fetch=async url=>new Response(await readFile(new URL('../public/'+String(url).replace(/^\.\//,''),import.meta.url)));
    const data=await loadRegion({sample:'eix-diagonal',buildingSource:'osm',decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode)});
    const model=buildModel(data,{size:150,resolution:24,trees:false},()=>{},api),prepared=prepareElevationTiles(data.dem);
    const r=generateProceduralTunnelVoids(data.features,(lon,lat)=>sampleHeight(prepared.tiles,lon,lat),{enabled:true,projection:model.context.proj,verticalReference:model.context.verticalReference,ground:model.context.ground,waterMask:model.context.waterPoly});
    const main=r.items.find(t=>t.sourceFeatureIds.includes(1820235140));
    assert(main,JSON.stringify(r.warnings));assert.equal(main.estimated,true);assert(main.maximumRoofCoverMM>.3);assert.deepEqual(auditPart(main).errors,[]);
  }finally{globalThis.fetch=prior;}
});
