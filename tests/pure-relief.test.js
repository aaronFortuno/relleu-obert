import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildModel,updatePureRelief,updateVegetation} from '../src/geometry.js';
import {loadRegion,mergeStandingWaterFragments} from '../src/sources.js';
import {auditPart} from '../src/solid-audit.js';
import {physicalBBox} from '../src/selection.js';
import {groupMaterials} from '../src/materials.js';
import {reliefDiagonals,reliefParts,splitPureRelief} from '../src/pure-relief-mesh.js';
import {reliefStreamPart,reliefStreamStrips} from '../src/relief-streams.js';
import {lineBuffer} from '../src/roads.js';
import {polygonTester} from '../src/polygon-index.js';

const bbox=physicalBBox([0,0],10,10);
const dem=[{z:0,x:0,y:0,size:2,elev:new Float32Array([100,200,500,650])}];
const options={size:100,pureRelief:true,resolution:12};

function rasterFixture(rows){
  const [w,s,e,n]=bbox,width=rows[0].length,height=rows.length;
  return {epsg:4326,width,height,values:Float32Array.from(rows.flat()),
    affine:[(e-w)/(width-1),0,w,0,(n-s)/(height-1),s]};
}

function mappedRectangle(x0,y0,x1,y1){
  const [w,s,e,n]=bbox,at=(x,y)=>[w+(e-w)*x,s+(n-s)*y];
  return {geometry:{type:'Polygon',coordinates:[[at(x0,y0),at(x1,y0),at(x1,y1),at(x0,y1),at(x0,y0)]]}};
}

test('nearly coincident stream buffers merge at the Montserrat confluence',()=>{
  const bounds=[200,120];
  const west=[[-17.48582,11.88459],[-14.69937,16.1192],[-10.3768,20.44303],[-5.28617,20.85396],
    [-2.07103,19.76409],[-.12409,19.54969],[1.55493,18.37047],[3.09105,18.54914],[4.26993,18.53127]];
  const east=[[1.98361,18.42407],[3.09105,18.54914],[4.51999,18.53127],[6.28832,19.03155],[7.43148,18.63847]];
  const strips=reliefStreamStrips([west,east].map(line=>lineBuffer(line,.225,bounds)),...bounds,384);
  const contains=polygonTester(strips[5]);
  assert.ok(contains([2.9,18.52]));
  assert.ok(!contains([2.9,18.9]));
});

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

test('regional land cover uses only printable raster detail and leaves the relief intact',()=>{
  const data={meta:{bbox},dem};
  const regional={bbox,width:2,height:2,overview:true,values:new Uint8Array([60,0,70,0])};
  const neutral=buildModel(data,options);
  const filtered=buildModel({...data,coverage:[regional]},options);
  assert.deepEqual(filtered.categories.map(part=>part.id),['terrain']);
  assert.deepEqual(filtered.reliefGrid.heights,neutral.reliefGrid.heights);
  assert.deepEqual(filtered.reliefGrid.diagonals,neutral.reliefGrid.diagonals);
  const adequate={...regional,width:64,height:64,values:new Uint8Array(64*64).fill(60)};
  assert(buildModel({...data,coverage:[adequate]},options).categories.some(part=>part.id==='rock'));
});

test('mapped sea remains 5 mm deep despite bathymetry beyond its footprint',()=>{
  const row=[-2500,-2500,-2500,60,120];
  const terrainRaster=rasterFixture([row,row,row]);
  const model=buildModel({meta:{bbox},terrainRaster,oceans:[mappedRectangle(0,0,.22,1)]},options);
  const raised=updatePureRelief(model,{exaggeration:3});
  for(const relief of [model,raised]){
    const {originMeters,seaLevelMM}=relief.provenance.verticalReference;
    assert.equal(originMeters,0);
    assert.equal(seaLevelMM,5);
    assert.equal(Math.min(...relief.reliefGrid.heights),5);
    const water=auditPart(relief.parts.find(part=>part.id==='water'));
    assert.deepEqual(water.errors,[]);
    assert.equal(water.bbox.min[2],0);
    assert.equal(water.bbox.max[2],5);
  }
  assert(Math.abs(Math.max(...model.reliefVegetationContext.metres)-120)<1e-8);
  assert(Math.max(...raised.reliefGrid.heights)>Math.max(...model.reliefGrid.heights));
});

test('an inland base uses the lowest remaining elevation after a lake is levelled',()=>{
  const flat=[100,100,100,100,100];
  const terrainRaster=rasterFixture([[-120,100,100,100,100],flat,[100,100,-400,100,100],flat,flat]);
  const data={meta:{bbox},terrainRaster},settings={...options,resolution:16};
  const unlevelled=buildModel(data,settings);
  const model=buildModel({...data,lakes:[mappedRectangle(.22,.22,.78,.78)]},settings);
  assert.equal(unlevelled.provenance.verticalReference.originMeters,-400);
  assert.equal(model.provenance.lakeCount,1);
  assert.equal(model.provenance.verticalReference.originMeters,-120);
  assert.equal(model.provenance.verticalReference.seaLevelMM,null);
  assert.equal(Math.min(...model.reliefGrid.heights),5);
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
  const reliefGrid={resolution:2,width:400,height:450,
    heights:new Float64Array([6,7,8,8,9,10,9,11,12]),
    diagonals:new Uint8Array([1,0,0,1]),
    scores:Float32Array.from([1,0,2,1,2,0,2,0,1].flatMap(kind=>[0,1,2].map(i=>+(i===kind)+i*.0001)))};
  const parts=reliefParts(reliefGrid);
  for(const part of parts)assert.deepEqual(auditPart(part).errors,[]);
  const snow=parts.find(part=>part.id==='snow');
  assert(snow.vertices.some((v,i)=>i%3<2&&v%(i%3===0?200:225)!==0),'colour boundaries must cross the inside of cells');
  const tiles=splitPureRelief({reliefGrid,width:400,height:450,provenance:{}});
  assert.equal(tiles.length,4);
  assert(tiles.every(({width,height})=>width===200&&height===225));
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
  const waterways=[{properties:{class:'stream'},geometry:{type:'LineString',
    coordinates:[at(.15,.75),at(.85,.75)]}}];
  const model=buildModel({meta:{bbox},dem,waterAreas,waterways},{...options,streamWidth:0});
  assert.equal(model.provenance.streamCount,0);
  assert.equal(model.provenance.flowingWaterAreaCount,1);
  const water=auditPart(model.parts.find(part=>part.id==='inland-water'));
  assert.deepEqual(water.errors,[]);
  assert(Math.abs(water.dimensions[1]-20)<.001);
  assert(water.dimensions[2]>.36);
  const widened=updatePureRelief(model,{streamWidth:1});
  assert.equal(widened.provenance.streamCount,1);
  assert.equal(updatePureRelief(widened,{streamWidth:0}).provenance.streamCount,0);
});

test('mapped forest stays green and its continuous texture scales proportionally',()=>{
  const [w,s,e,n]=bbox,at=(x,y)=>[w+(e-w)*x,s+(n-s)*y];
  const forests=[{geometry:{type:'Polygon',coordinates:[[at(.2,.2),at(.6,.2),at(.6,.6),at(.2,.6),at(.2,.2)]]}}];
  const data={meta:{bbox},dem,forests};
  const overview=buildModel(data,{...options,resolution:24});
  const local=buildModel(data,{...options,resolution:24,size:400});
  assert(overview.parts.some(part=>part.id==='forest'));
  const overviewTexture=overview.provenance.treeRepresentation,localTexture=local.provenance.treeRepresentation;
  assert(overviewTexture.areaMM2>0&&localTexture.areaMM2>overviewTexture.areaMM2);
  assert.equal(localTexture.heightRangeMM[1],overviewTexture.heightRangeMM[1]*4);
  for(const part of local.parts)assert.deepEqual(auditPart(part).errors,[]);
});

test('live pure-relief changes retain sampled terrain, strokes and printable water layers',()=>{
  const [w,s,e,n]=bbox,at=(x,y)=>[w+(e-w)*x,s+(n-s)*y];
  const rectangle=(x0,y0,x1,y1)=>({geometry:{type:'Polygon',coordinates:[[
    at(x0,y0),at(x1,y0),at(x1,y1),at(x0,y1),at(x0,y0)
  ]]}});
  const region={meta:{bbox},dem,oceans:[rectangle(0,0,.18,1)],lakes:[rectangle(.35,.22,.61,.43)],
    forests:[rectangle(.23,.46,.89,.91)],waterways:[{properties:{class:'stream'},
      geometry:{type:'LineString',coordinates:[at(.22,.67),at(.94,.67)]}}]};
  const settings={...options,size:400,resolution:24,streams:false};
  const stroke={mode:'erase',x:270,y:330,radius:14,density:.5};
  const initial=buildModel(region,settings);
  const painted=updateVegetation(initial,{strokes:[stroke],vegetationHeight:1.4});
  const flowing=updatePureRelief(painted,{streams:true,streamWidth:2});
  const raised=updatePureRelief(flowing,{exaggeration:2.5});
  const rebuilt=buildModel(region,{...settings,streams:true,streamWidth:2,exaggeration:2.5,strokes:[stroke],vegetationHeight:1.4});
  for(const id of ['terrain','forest','water'])assert.equal(flowing.categories.find(part=>part.id===id),painted.categories.find(part=>part.id===id));
  assert.equal(flowing.reliefGrid.heights,painted.reliefGrid.heights);
  for(const key of ['diagonals','lakeWeights','oceanWeights','forestWeights','streamStrips','vegetationTexture'])
    assert.equal(raised.reliefGrid[key],flowing.reliefGrid[key],key);
  assert.equal(raised.provenance.verticalReference.minimumSurfaceMM,5);
  assert.equal(raised.provenance.verticalReference.seaLevelMM,5);
  assert.equal(raised.provenance.lakeCount,1);
  assert.equal(raised.provenance.streamCount,1);
  assert.equal(raised.provenance.verticalExaggeration,2.5);
  assert.deepEqual(raised.provenance.options.strokes,[stroke]);
  assert.deepEqual(raised.categories.map(part=>part.id),rebuilt.categories.map(part=>part.id));
  const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
  for(const [index,part] of raised.categories.entries()){
    const expected=rebuilt.categories[index];
    for(const key of ['vertices','faces'])assert.equal(Buffer.compare(bytes(part[key]),bytes(expected[key])),0,part.id+' '+key);
  }
  const noStreams=updatePureRelief(raised,{streams:false});
  assert.equal(noStreams.provenance.streamCount,0);
  assert.equal(noStreams.categories.find(part=>part.id==='inland-water'),raised.reliefVegetationContext.lakePart);
  assert.equal(noStreams.categories.find(part=>part.id==='trees'),raised.categories.find(part=>part.id==='trees'));
  assert.equal(auditPart(noStreams.categories.find(part=>part.id==='water')).bbox.min[2],0);
  const pieces=splitPureRelief(raised,200);
  assert.equal(pieces.length,4);
  for(const piece of pieces)for(const part of piece.parts)assert.deepEqual(auditPart(part).errors,[]);
  const shorter=updateVegetation(raised,{vegetationHeight:.6});
  assert.equal(shorter.reliefGrid.heights,raised.reliefGrid.heights);
  assert.equal(shorter.provenance.options.vegetationHeight,.6);
  assert.throws(()=>updatePureRelief(shorter,{exaggeration:0}),/fora del rang/);
  assert.equal(shorter.provenance.verticalExaggeration,2.5);
});
