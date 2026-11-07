import assert from 'node:assert/strict';
import test from 'node:test';
import Module from 'manifold-3d';
import {buildModel,updateTransport} from '../src/geometry.js';
import {topSampler} from '../src/bridge-completion.js';
import {auditPart} from '../src/solid-audit.js';

const api=await Module();api.setup();
const extent=.002,side=11;
const toGeo=points=>points.map(p=>p.map(v=>v*extent/100));
const road=(id,points,ref,roadClass='secondary')=>({id,properties:{sourceLayer:'transportation',class:roadClass,width:12,ref},
  geometry:{type:'LineString',coordinates:toGeo(points)}});
const fixture={
  meta:{bbox:[0,0,extent,extent]},
  localDEM:{width:side,height:side,epsg:4326,affine:[extent/10,0,0,0,extent/10,0],
    pixelIsArea:false,metadata:{},values:Float32Array.from({length:side**2},(_,i)=>100+Math.floor(i/side)*5)},
  features:[
    road('west',[[0,24],[45,24]],'shared'),road('east',[[45,24],[100,24]],'shared'),
    {...road('other',[[5,70],[65,70]],'a'),geometry:{type:'MultiLineString',
      coordinates:[toGeo([[5,70],[65,70]]),toGeo([[0,39],[100,39]])]}},
    road('crossing',[[25,52],[25,90]],'b')
  ]
};
const options={size:100,widthMM:100,heightMM:100,resolution:10,trees:false,estimatedTunnels:false};
function roadTop(model){
  const {vertices,faces}=model.categories.find(part=>part.id==='roads');
  const points=Array.from({length:vertices.length/3},(_,i)=>vertices.subarray(i*3,i*3+3));
  const topFaces=[];
  for(let i=0;i<faces.length;i+=3){
    const [a,b,c]=Array.from(faces.subarray(i,i+3),id=>points[id]);
    if((b[0]-a[0])*(c[1]-a[1])>(b[1]-a[1])*(c[0]-a[0]))topFaces.push(...faces.subarray(i,i+3));
  }
  return topSampler(points,topFaces);
}

test('regional pavement stitches compatible fragments and leaves an untagged crossing in the ordinary layer',()=>{
  const legacy=buildModel(fixture,options,()=>{},api);
  const model=buildModel(fixture,{...options,surfaceRoads:'regional'},()=>{},api);
  assert(model.provenance.surfaceRoads.applied,JSON.stringify(model.provenance.surfaceRoads));
  assert.equal(model.provenance.surfaceRoads.fullAccepted,3);
  assert.equal(model.provenance.surfaceRoads.groups.length,2);
  assert.deepEqual(model.provenance.surfaceRoads.groups.find(group=>group.fragments===2).sourceFeatureIds.slice().sort(),['east','west']);
  const before=roadTop(legacy),after=roadTop(model);
  assert(Math.abs(before(45,23)-before(45,25))>.3);
  assert(Math.abs(after(45,23)-after(45,25))<.0001);
  assert(Math.abs(after(50,38)-after(50,40))<.0001);
  assert(Math.abs(before(25,70)-after(25,70))<.0001);
  const partial=model.provenance.surfaceRoads.partialGroups.find(group=>group.sourceFeatureIds.includes('other'));
  assert(partial,'Cal conservar un tram interior abans o després de la cruïlla.');
  const [start,end]=partial.ends,mid=start.map((v,i)=>(v+end[i])/2);
  assert(Math.abs(after(mid[0],mid[1]-1)-after(mid[0],mid[1]+1))<.001,'El tram interior ha de quedar pla de banda a banda.');
  for(const [x,y] of [start,end])for(const offset of [-1,0,1]){
    const heights=[-.02,-.01,.01,.02].map(dx=>after(x+dx,y+offset));
    assert(heights.every(Number.isFinite));
    const [farBefore,beforeEnd,afterEnd,farAfter]=heights;
    const step=Math.abs((2*beforeEnd-farBefore)-(2*afterEnd-farAfter));
    assert(step<.001,`Graó a ${x}, ${y+offset}: ${step} mm`);
  }
  for(const part of model.categories)assert.deepEqual(auditPart(part).errors,[]);
  const raised=updateTransport(model,{roadRise:.5},()=>{},api);
  assert.equal(raised.context.ground,model.context.ground);
  assert.equal(raised.provenance.surfaceRoads.accepted,model.provenance.surfaceRoads.accepted);
  assert(Math.abs(roadTop(raised)(45,24)-after(45,24)-.5)<.0001);
});

test('roads outside the plate do not exhaust the regional paving budget',()=>{
  const outside=Array.from({length:1001},(_,index)=>road(`outside-${index}`,[[103,10],[110,10]],'outside'));
  const model=buildModel({...fixture,features:[...outside,...fixture.features]},
    {...options,surfaceRoads:'regional'},()=>{},api);
  assert.equal(model.provenance.surfaceRoads.omissionCounts['source-budget'],undefined);
  assert.equal(model.provenance.surfaceRoads.fullAccepted,3);
});

test('a principal pavement crosses an ordinary road with its own level sections while reserving the railway crossing',()=>{
  const count=51;
  const features=[
    road('main',[[0,50],[100,50]],'A-1','motorway'),
    road('minor',[[30,20],[30,72]],'B-1'),
    road('rail',[[75,14],[75,86]],'','rail')
  ];
  const data={...fixture,features,localDEM:{...fixture.localDEM,width:count,height:count,
    affine:[extent/(count-1),0,0,0,extent/(count-1),0],values:Float32Array.from({length:count**2},(_,i)=>{
      const x=2*(i%count),y=2*Math.floor(i/count);
      return 100+x*.07+y+1.5*Math.cos(x*Math.PI/4);
    })}};
  const settings={...options,resolution:48};
  const before=buildModel(data,settings,()=>{},api);
  const model=buildModel(data,{...settings,surfaceRoads:'independent',majorRoads:true,smoothProfiles:true},()=>{},api);
  const {partialGroups}=model.provenance.surfaceRoads;
  const principal=partialGroups.filter(group=>group.independentGrade&&group.sourceFeatureIds.includes('main'));
  assert(principal.some(group=>group.ends[0][0]<30&&group.ends[1][0]>30));
  assert(!principal.some(group=>group.ends[0][0]<75&&group.ends[1][0]>75));
  const legacy=roadTop(before),top=roadTop(model);
  let legacyGrade=0;
  for(let x=22;x<=44;x++){
    assert(Math.abs(top(x,49)-top(x,51))<.001,`Crossfall at ${x}`);
    assert(Math.abs(top(x+1,50)-top(x,50))<.08,`Grade change at ${x}`);
    legacyGrade=Math.max(legacyGrade,Math.abs(legacy(x+1,50)-legacy(x,50)));
  }
  assert(legacyGrade>.14);
  assert(Math.abs(model.context.ground(30,49)-model.context.ground(30,51))>.6);
  assert(model.categories.find(part=>part.id==='railways').faces.length);
  for(const part of model.categories)assert.deepEqual(auditPart(part).errors,[]);
});
