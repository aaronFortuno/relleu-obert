import assert from 'node:assert/strict';
import test from 'node:test';
import Module from 'manifold-3d';
import {buildModel} from '../src/geometry.js';
import {topSampler} from '../src/bridge-completion.js';
import {auditPart} from '../src/solid-audit.js';
import {splitModel} from '../src/mesh-tiles.js';
import {uniteMaterials} from '../src/solid-operations.js';

const api=await Module();api.setup();
const extent=.002,size=100,side=11;
const road=(id,points)=>({id,properties:{sourceLayer:'transportation',class:'secondary',width:12,ref:id},
  geometry:{type:'LineString',coordinates:points.map(p=>p.map(v=>v*extent/size))}});
const fixture={
  meta:{bbox:[0,0,extent,extent]},
  localDEM:{width:side,height:side,epsg:4326,affine:[extent/10,0,0,0,extent/10,0],pixelIsArea:false,
    metadata:{},values:Float32Array.from({length:side**2},(_,i)=>100+Math.floor(i/side)*5+i%side)},
  features:[road('slope-road',[[-8,45],[108,45]]),road('crossing',[[48,29],[48,65]])]
};
const options={size,widthMM:size,heightMM:size,resolution:10,trees:false,estimatedTunnels:false};

function sampleTop(model,id){
  const {vertices,faces}=model.categories.find(part=>part.id===id);
  const points=Array.from({length:vertices.length/3},(_,i)=>vertices.subarray(3*i,3*i+3));
  const up=[];
  for(let i=0;i<faces.length;i+=3){
    const indices=faces.subarray(i,i+3),[a,b,c]=Array.from(indices,id=>points[id]);
    if((b[0]-a[0])*(c[1]-a[1])>(b[1]-a[1])*(c[0]-a[0]))up.push(...indices);
  }
  return topSampler(points,up);
}

test('a hillside road stays level across its approaches and both model cuts',()=>{
  const legacy=buildModel(fixture,options,()=>{},api);
  const regional=buildModel(fixture,{...options,surfaceRoads:'regional'},()=>{},api);
  const before=sampleTop(legacy,'roads'),after=sampleTop(regional,'roads');
  const info=regional.provenance.surfaceRoads;
  assert(info.applied,JSON.stringify(info));
  assert.equal(info.fullAccepted,0);
  assert.equal(info.partialGroups.filter(group=>group.sourceFeatureIds.includes('slope-road')).length,2);

  for(const x of [0,.2,8,20,35,60,75,92,99.8,100]){
    const beforeLeft=before(x,43),beforeRight=before(x,47);
    assert([beforeLeft,beforeRight].every(Number.isFinite),`Falta el camí original a x=${x}.`);
    assert(Math.abs(beforeLeft-beforeRight)>.5);
    const left=after(x,43),right=after(x,47);
    assert([left,right].every(Number.isFinite),`Falta la calçada al tall x=${x}.`);
    assert(Math.abs(left-right)<.001,`Desnivell transversal de ${left-right} mm a x=${x}.`);
  }

  const terrain=sampleTop(regional,'terrain'),ground=regional.context.ground;
  for(const x of [.2,99.8]){
    const downhill=terrain(x,42.6),uphill=terrain(x,47.4);
    assert([downhill,uphill].every(Number.isFinite));
    assert(downhill-ground(x,42.6)>.1,'La calçada ha de tenir reblert al costat baix.');
    assert(ground(x,47.4)-uphill>.1,'La calçada ha de retallar el terreny al costat alt.');
    assert(Math.abs(after(x,42.6)-downhill-.65)<.001);
    assert(Math.abs(after(x,47.4)-uphill-.65)<.001);
  }

  const crossingBefore=before(48,45),crossingAfter=after(48,45);
  assert([crossingBefore,crossingAfter].every(Number.isFinite));
  assert(Math.abs(crossingBefore-crossingAfter)<.0001);
  for(const part of regional.categories)assert.deepEqual(auditPart(part).errors,[]);
});

test('an oblique pavement and its foundation stay in contact and can be split into tiles',()=>{
  const features=[road('slope-road',[[-8,25],[108,65]]),fixture.features[1]];
  const model=buildModel({...fixture,features},{...options,surfaceRoads:'regional'},()=>{},api);
  const info=model.provenance.surfaceRoads;
  assert(info.applied,JSON.stringify(info));
  assert(info.coverage.replacedPercent>60);
  const tiles=splitModel(model,api,50);
  assert.equal(tiles.length,4);
  for(const tile of tiles)for(const part of tile.parts)assert.deepEqual(auditPart(part).errors,[]);

  const parts=model.categories.filter(part=>['terrain','roads'].includes(part.id));
  const {parts:united}=uniteMaterials({parts},api);
  const solids=united.map(part=>new api.Manifold(new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces})));
  const overlap=solids[0].intersect(solids[1]),joined=solids[0].add(solids[1]),components=joined.decompose();
  try{
    assert(overlap.volume()<.01,`Solapament entre materials: ${overlap.volume()} mm³`);
    assert.equal(components.filter(part=>part.volume()>.01).length,1);
  }finally{
    for(const part of [...components,joined,overlap,...solids])part.delete();
  }
});

test('a local mesh failure keeps the independent pavement on the other side of the crossing',()=>{
  let fail=true;
  const failingApi={...api,Mesh:class extends api.Mesh{
    constructor(mesh){
      if(fail){fail=false;throw Error('Fallada local injectada.');}
      super(mesh);
    }
  }};
  const model=buildModel(fixture,{...options,surfaceRoads:'regional'},()=>{},failingApi);
  const info=model.provenance.surfaceRoads;
  assert(info.applied,JSON.stringify(info));
  assert.equal(info.omissionCounts['mesh-rejected'],1);
  assert.equal(info.partialGroups.filter(group=>group.sourceFeatureIds.includes('slope-road')).length,1);
  const sample=sampleTop(model,'roads');
  const crossfalls=[0,size].map(x=>Math.abs(sample(x,43)-sample(x,47)));
  assert(crossfalls.some(value=>value<.001));
  assert(crossfalls.some(value=>value>.5));
  for(const part of model.categories)assert.deepEqual(auditPart(part).errors,[]);
});
