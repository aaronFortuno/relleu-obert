import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildModel} from '../src/geometry.js';
import {loadRegion,mergeStandingWaterFragments} from '../src/sources.js';
import {auditPart} from '../src/solid-audit.js';
import {physicalBBox} from '../src/selection.js';
import {groupMaterials} from '../src/materials.js';
import {reliefDiagonals,reliefParts,splitPureRelief} from '../src/pure-relief-mesh.js';
import {reliefStreamPart} from '../src/relief-streams.js';

const bbox=physicalBBox([0,0],10,10);
const dem=[{z:0,x:0,y:0,size:2,elev:new Float32Array([100,200,500,650])}];
const options={size:100,pureRelief:true,resolution:12};

test('pure relief builds solid coverage colours from mapped classes, independent of altitude',()=>{
  const model=buildModel({meta:{bbox},dem,coverage:[{bbox,width:2,height:2,values:new Uint8Array([60,70,70,60])}]},options);
  assert.deepEqual(model.categories.map(p=>p.id),['terrain','rock','snow']);
  assert.deepEqual(model.provenance.coverageCells,{bare:72,snow:72,total:144});
  assert.equal(model.scale,100000);
  for(const part of model.parts)assert.deepEqual(auditPart(part).errors,[]);
  assert.deepEqual(groupMaterials(model).parts.map(p=>p.color),model.categories.map(p=>p.color));
  const neutral=buildModel({meta:{bbox},dem},options);
  assert.deepEqual(neutral.categories.map(p=>p.id),['terrain']);
});

test('pure relief survives missing remote hydrography without loading full model layers',async()=>{
  const previous=globalThis.fetch,requests=[];
  globalThis.fetch=async url=>{
    requests.push(String(url));
    return String(url).startsWith('https://tiles.mapterhorn.com/')?new Response(new Uint8Array([1])):new Response(null,{status:503});
  };
  try{
    const data=await loadRegion({bbox,pureRelief:true,decodeElevation:async(_,tile)=>({...tile,size:2,elev:new Float32Array([100,100,100,100])})});
    assert(requests.some(url=>url==='https://tiles.openfreemap.org/planet'));
    assert(requests.every(url=>url.startsWith('https://tiles.mapterhorn.com/')||url==='https://tiles.openfreemap.org/planet'));
    assert.deepEqual(data.features,[]);
    assert.deepEqual(data.waterways,[]);
    assert.deepEqual(data.forests,[]);
    assert(data.meta.sourceWarnings.some(message=>message.includes('Es conserva el relleu')));
    assert.equal(data.meta.coverage.available,false);
    assert.equal(data.meta.buildingSource,null);
  }finally{globalThis.fetch=previous;}
});

test('pure relief loads the real Rajadell stream from the bundled sample',async()=>{
  const previous=globalThis.fetch,requests=[];
  globalThis.fetch=async url=>{
    requests.push(String(url));
    if(String(url).startsWith('./data/'))return new Response(await readFile(new URL('../public/'+String(url).slice(2),import.meta.url)));
    if(String(url).startsWith('https://tiles.mapterhorn.com/'))return new Response(new Uint8Array([1]));
    throw Error('Unexpected request '+url);
  };
  try{
    const data=await loadRegion({sample:'eix-diagonal',bbox:physicalBBox([41.71792,1.78391],1.5,1.5),pureRelief:true,
      decodeElevation:async(_,tile)=>({...tile,size:2,elev:new Float32Array([100,100,100,100])})});
    assert(data.waterways.some(feature=>feature.properties.name==='Riera de Rajadell'));
    assert(data.lakes.length);
    assert(data.forests.some(feature=>feature.properties.class==='wood'));
    assert.equal(data.meta.forests.provider,'OpenStreetMap · OpenFreeMap');
    assert(requests.some(url=>url.endsWith('.pbf')));
    assert(!requests.some(url=>url.includes('openfreemap')));
    assert.deepEqual(data.features,[]);
  }finally{globalThis.fetch=previous;}
});

test('adjacent tile fragments of the same lake merge into one footprint',()=>{
  const tile=(left,right)=>({type:'Feature',id:42,properties:{class:'lake'},geometry:{type:'Polygon',
    coordinates:[[[left,0],[right,0],[right,1],[left,1],[left,0]]]}});
  const lakes=mergeStandingWaterFragments([tile(0,1),tile(1,2)]);
  assert.equal(lakes.length,1);
  assert.equal(lakes[0].geometry.coordinates.length,1);
  assert.deepEqual(lakes[0].geometry.coordinates[0][0],[[0,0],[2,0],[2,1],[0,1],[0,0]]);
});

test('relief diagonals follow the measured centre and interpolated materials close across cuts',()=>{
  assert.equal(reliefDiagonals([0,10,10,0],1,()=>9)[0],1);
  assert.equal(reliefDiagonals([0,10,10,0],1,()=>1)[0],0);
  const reliefGrid={resolution:2,width:400,height:400,
    heights:new Float64Array([6,7,8,8,9,10,9,11,12]),
    diagonals:new Uint8Array([1,0,0,1]),
    scores:Float32Array.from([1,0,2,1,2,0,2,0,1].flatMap(kind=>[0,1,2].map(i=>+(i===kind)+i*.0001)))};
  const parts=reliefParts(reliefGrid);
  for(const part of parts)assert.deepEqual(auditPart(part).errors,[]);
  const snow=parts.find(part=>part.id==='snow');
  assert(snow.vertices.some((v,i)=>i%3<2&&v%200!==0),'colour boundaries must cross the inside of cells');
  const tiles=splitPureRelief({reliefGrid,width:400,height:400,provenance:{}},200,()=>{});
  assert.equal(tiles.length,4);
  for(const tile of tiles)for(const part of tile.parts)assert.deepEqual(auditPart(part).errors,[]);
  const seam=(tile,x)=>[...new Set(tile.parts.flatMap(({vertices})=>Array.from(
    {length:vertices.length/3},(_,i)=>vertices[i*3]===x&&vertices[i*3+2]>0
      ?vertices[i*3+1]+','+vertices[i*3+2]:null).filter(Boolean)))].sort();
  assert.deepEqual(seam(tiles[0],200),seam(tiles[1],0));
});

test('pure relief keeps separate mapped lake heights flat and closed across print cuts',()=>{
  const rect=(x0,y0,x1,y1)=>({geometry:{type:'Polygon',
    coordinates:[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]}});
  const [w,s,e,n]=bbox,at=(x,y)=>[w+(e-w)*x,s+(n-s)*y];
  const left=rect(...at(.14,.25),...at(.56,.52)),right=rect(...at(.68,.67),...at(.85,.88));
  const model=buildModel({meta:{bbox},dem,lakes:[left,right],
    coverage:[{bbox,width:2,height:2,values:new Uint8Array([60,70,70,60])}]},{...options,resolution:48,size:400});
  assert.equal(model.provenance.lakeCount,2);
  const water=model.parts.find(p=>p.id==='inland-water');
  const levels=new Set();
  for(let i=0;i<water.vertices.length;i+=6)levels.add(water.vertices[i+2]);
  assert.equal(levels.size,2);
  for(const part of model.parts)assert.deepEqual(auditPart(part).errors,[]);
  for(const piece of splitPureRelief(model,200,()=>{}))for(const part of piece.parts)
    assert.deepEqual(auditPart(part).errors,[]);
});

test('pure relief prints a stream narrower than a terrain cell, including both sides of a cut',()=>{
  const [w,s,e,n]=bbox,at=(x,y)=>[w+(e-w)*x,s+(n-s)*y];
  const waterways=[{properties:{sourceLayer:'waterway',class:'stream'},geometry:{type:'LineString',
    coordinates:[at(.1,.37),at(.9,.37)]}}];
  const data={meta:{bbox},dem,waterways};
  const rendered=multiplier=>buildModel(data,{...options,resolution:8,size:400,streamWidth:multiplier});
  const model=rendered(1),part=model.parts.find(p=>p.id==='inland-water');
  assert.equal(model.provenance.streamCount,1);
  assert(part);
  const audit=auditPart(part);
  assert.deepEqual(audit.errors,[]);
  assert(audit.dimensions[1]>=.449&&audit.dimensions[1]<.5);
  assert(audit.dimensions[2]>.36);
  const widened=auditPart(rendered(2).parts.find(p=>p.id==='inland-water'));
  assert(widened.dimensions[1]>=.899);
  assert(!buildModel(data,{...options,streams:false}).parts.some(p=>p.id==='inland-water'));
  const pieces=splitPureRelief(model,200,()=>{}).filter(piece=>piece.parts.some(p=>p.id==='inland-water'));
  assert.equal(pieces.length,2);
  for(const piece of pieces)assert.deepEqual(auditPart(piece.parts.find(p=>p.id==='inland-water')).errors,[]);
});

test('pure relief leaves a lake flat where a mapped stream crosses it',()=>{
  const [w,s,e,n]=bbox,at=(x,y)=>[w+(e-w)*x,s+(n-s)*y];
  const lake={geometry:{type:'Polygon',coordinates:[[at(.4,.3),at(.6,.3),at(.6,.7),at(.4,.7),at(.4,.3)]]}};
  const stream={properties:{sourceLayer:'waterway',class:'stream'},geometry:{type:'LineString',
    coordinates:[at(.1,.5),at(.9,.5)]}};
  const {reliefGrid}=buildModel({meta:{bbox},dem,lakes:[lake],waterways:[stream]},{...options,resolution:24});
  const part=reliefStreamPart(reliefGrid,{left:0,bottom:0,right:24,top:24});
  const xs=part.vertices.filter((_,i)=>i%3===0);
  assert(xs.some(x=>x<38)&&xs.some(x=>x>62));
  assert(!xs.some(x=>x>44&&x<56));
  assert.deepEqual(auditPart(part).errors,[]);
});

test('pure relief uses the mapped width of a flowing-water polygon without a centreline',()=>{
  const [w,s,e,n]=bbox,at=(x,y)=>[w+(e-w)*x,s+(n-s)*y];
  const waterAreas=[{geometry:{type:'Polygon',
    coordinates:[[at(.15,.35),at(.85,.35),at(.85,.55),at(.15,.55),at(.15,.35)]]}}];
  const model=buildModel({meta:{bbox},dem,waterAreas},options);
  const water=auditPart(model.parts.find(part=>part.id==='inland-water'));
  assert.deepEqual(water.errors,[]);
  assert(Math.abs(water.dimensions[1]-20)<.001);
  assert(water.dimensions[2]>.36);
});

test('mapped forest stays green at overview scale and gains canopies at print scale',()=>{
  const [w,s,e,n]=bbox,at=(x,y)=>[w+(e-w)*x,s+(n-s)*y];
  const forests=[{geometry:{type:'Polygon',coordinates:[[at(.2,.2),at(.6,.2),at(.6,.6),at(.2,.6),at(.2,.2)]]}}];
  const data={meta:{bbox},dem,forests};
  const overview=buildModel(data,{...options,resolution:24});
  const local=buildModel(data,{...options,resolution:24,size:400});
  assert(overview.parts.some(part=>part.id==='forest'));
  assert.equal(overview.treeCount,0);
  assert(overview.provenance.treeRepresentation.omittedBelowThreshold);
  assert(local.treeCount>0);
  for(const part of local.parts)assert.deepEqual(auditPart(part).errors,[]);
});
