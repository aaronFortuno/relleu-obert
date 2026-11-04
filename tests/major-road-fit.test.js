import test from 'node:test';
import assert from 'node:assert/strict';
import {fitMajorRoadItem,knownBridgeClearance,openedTunnelClearance} from '../src/major-road-fit.js';
import {topSampler} from '../src/bridge-completion.js';

const projection={scale:.1,project:p=>p.slice(0,2)},verticalReference={originMeters:100,minimumSurfaceMM:5};
const item={coordinates:[[0,0,100],[10,0,100],[10,10,100],[0,10,100]],faces:[0,1,2,0,2,3]};
const parameters={projection,verticalReference,exaggeration:1,ground:()=>5,patches:polys=>polys};
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);

// The peak lies strictly inside the first source face and off the road's
// perimeter/diagonal. Its fan describes a piecewise planar coarse DEM.
const peak=[6,3,5.8],coarsePoints=[...item.coordinates.map(p=>[p[0],p[1],5]),peak],coarseFaces=[0,1,4,1,2,4,2,0,4,0,2,3];
const coarseGround=topSampler(coarsePoints,coarseFaces);
const coarsePatches=polys=>{
  assert.equal(polys.length,1);assert.equal(polys[0].length,1);assert.deepEqual(polys[0][0][0],polys[0][0].at(-1));
  const [a,b,c]=polys[0][0],p=peak.slice(0,2);
  return b[0]===10&&b[1]===0?[[[a,b,p,a]],[[b,c,p,b]],[[c,a,p,c]]]:polys;
};

test('coarse DEM peak strictly inside a source face requires one uniform platform adjustment',()=>{
  const source=structuredClone(item),r=fitMajorRoadItem(item,{...parameters,ground:coarseGround,patches:coarsePatches});
  assert.equal(r.accepted,true);assert.equal(r.present,true);assert.equal(r.samples,5);
  close(r.adjustmentMM,.8001);close(r.maximumPrintedLiftMetres,8.001);assert.deepEqual(item,source);
  for(const p of coarsePoints)assert(5+r.adjustmentMM>=coarseGround(p[0],p[1]));
});

test('already exposed platforms retain the source offset and report real lift in metres',()=>{
  const flat=fitMajorRoadItem(item,parameters);assert.equal(flat.accepted,true);assert.equal(flat.adjustmentMM,0);assert.equal(flat.maximumPrintedLiftMetres,0);
  const raised={...item,coordinates:item.coordinates.map(p=>[p[0],p[1],110])},r=fitMajorRoadItem(raised,parameters);
  assert.equal(r.accepted,true);assert.equal(r.adjustmentMM,0);close(r.maximumPrintedLiftMetres,10);
});

test('a single scalar adjustment preserves longitudinal grades and all original source coordinates',()=>{
  const graded={...item,coordinates:item.coordinates.map(p=>[p[0],p[1],100+p[0]/10])},source=structuredClone(graded);
  const r=fitMajorRoadItem(graded,{...parameters,ground:coarseGround,patches:coarsePatches});assert.equal(r.accepted,true);assert(r.adjustmentMM>0);
  const before=(graded.coordinates[1][2]-graded.coordinates[0][2])*.1,after=(graded.coordinates[1][2]*.1+r.adjustmentMM)-(graded.coordinates[0][2]*.1+r.adjustmentMM);
  close(before,after);assert.deepEqual(graded,source);assert(!('coordinates' in r));
});

test('generated-terrain lift above twelve metres is rejected without mutating its source',()=>{
  const high={...item,coordinates:item.coordinates.map(p=>[p[0],p[1],113])},source=structuredClone(high),r=fitMajorRoadItem(high,parameters);
  assert.equal(r.accepted,false);assert.equal(r.present,true);close(r.maximumPrintedLiftMetres,13);assert.match(r.reason,/límit de 12/);assert.deepEqual(high,source);
  const lifted=fitMajorRoadItem(item,{...parameters,ground:coarseGround,patches:coarsePatches,maxLiftMetres:5});assert.equal(lifted.accepted,false);assert(lifted.adjustmentMM>0);assert.match(lifted.reason,/límit de 5/);
});

test('outside-ROI platforms are absent and never query the terrain',()=>{
  const r=fitMajorRoadItem(item,{...parameters,patches:()=>[],ground:()=>{throw Error('outside terrain queried');}});
  assert.equal(r.accepted,false);assert.equal(r.present,false);assert.equal(r.samples,0);assert.equal(r.adjustmentMM,0);assert.match(r.reason,/fora/);
});

test('vertical exaggeration changes conversion only, with no decorative road rise included',()=>{
  const r=fitMajorRoadItem(item,{...parameters,exaggeration:2,ground:coarseGround,patches:coarsePatches});
  assert.equal(r.accepted,true);close(r.adjustmentMM,.8001);close(r.maximumPrintedLiftMetres,4.0005);
});

test('an explicit model budget of thirty metres is accepted while twelve remains the default',()=>{
  const raised={...item,coordinates:item.coordinates.map(p=>[p[0],p[1],125])};
  assert.equal(fitMajorRoadItem(raised,parameters).accepted,false);
  const r=fitMajorRoadItem(raised,{...parameters,maxLiftMetres:30});assert.equal(r.accepted,true);close(r.maximumPrintedLiftMetres,25);
});

test('invalid configuration or patch samples fail before accepting an unverified road',()=>{
  for(const bad of [{projection:{scale:0}},{exaggeration:0},{maxLiftMetres:0},{maxLiftMetres:31},{ground:null},{patches:null}])assert.throws(()=>fitMajorRoadItem(item,{...parameters,...bad}),/invàlida/);
  assert.throws(()=>fitMajorRoadItem({...item,faces:[0,1,50]},parameters),/invàlida/);
  assert.throws(()=>fitMajorRoadItem(item,{...parameters,ground:()=>NaN}),/Altitud/);
  assert.throws(()=>fitMajorRoadItem(item,{...parameters,patches:()=>[[[[0,NaN],[1,0],[0,1],[0,NaN]]]]}),/Vèrtex/);
});

const crossing={...item,crossingChecks:[{featureId:'surveyed',pointXY:[5,5],allowed:true}]},fit={accepted:true,adjustmentMM:0};
const known=(left,right=left)=>({coordinates:[[0,4,left],[10,4,right],[10,6,right],[0,6,left]],faces:[0,1,2,0,2,3]});
const crossingParameters={projection,verticalReference,exaggeration:1};

test('known XYZ bridge clearance accepts a consistent above or below relation with real slab air',()=>{
  const above={...crossing,coordinates:crossing.coordinates.map(p=>[p[0],p[1],120])};
  const source=known(100),snapshot=structuredClone({above,source}),r=knownBridgeClearance(above,fit,[source],crossingParameters);
  assert.equal(r.accepted,true);assert.equal(r.checkedCrossings,1);close(r.minimumClearanceMM,1.4);assert.deepEqual({above,source},snapshot);
  const below={...crossing,coordinates:crossing.coordinates.map(p=>[p[0],p[1],80])},b=knownBridgeClearance(below,fit,[source],crossingParameters);
  assert.equal(b.accepted,true);close(b.minimumClearanceMM,1.4);
});

test('a close known deck is rejected, while the uniform source fit is included in clearance',()=>{
  const closeRoad={...crossing,coordinates:crossing.coordinates.map(p=>[p[0],p[1],110])};
  const r=knownBridgeClearance(closeRoad,fit,[known(100)],crossingParameters);assert.equal(r.accepted,false);close(r.minimumClearanceMM,.4);assert.match(r.reason,/insuficient/);
  const adjusted=knownBridgeClearance(closeRoad,{accepted:true,adjustmentMM:.5},[known(100)],crossingParameters);assert.equal(adjusted.accepted,true);close(adjusted.minimumClearanceMM,.9);
});

test('triangle overlays reject a sloped bridge edge collision even when its crossing centre is clear',()=>{
  const upper={...crossing,coordinates:crossing.coordinates.map(p=>[p[0],p[1],130])},sloped=known(90,130);
  // At the centre, source top difference is 2 mm (1.4 mm useful air).
  const r=knownBridgeClearance(upper,fit,[sloped],crossingParameters);assert.equal(r.accepted,false);assert(r.minimumClearanceMM<0);assert.match(r.reason,/insuficient|sobre\/sota/);
  const changing=known(90,150),b=knownBridgeClearance(upper,fit,[changing],crossingParameters);assert.equal(b.accepted,false);assert.match(b.reason,/sobre\/sota/);
});

test('decorative road rise consumes air while the underside remains source top minus point-six',()=>{
  const upper={...crossing,coordinates:crossing.coordinates.map(p=>[p[0],p[1],120])};
  const a=knownBridgeClearance(upper,fit,[known(100)],{...crossingParameters,roadRise:.5});assert.equal(a.accepted,true);close(a.minimumClearanceMM,.9);
  const b=knownBridgeClearance(upper,fit,[known(100)],{...crossingParameters,roadRise:1});assert.equal(b.accepted,false);close(b.minimumClearanceMM,.4);
});

test('railway top rise reduces clearance above a known rail deck while clearance below stays unchanged',()=>{
  const source={...known(100),railway:true},above={...crossing,coordinates:crossing.coordinates.map(p=>[p[0],p[1],114])};
  const baseline=knownBridgeClearance(above,fit,[source],crossingParameters);assert.equal(baseline.accepted,true);close(baseline.minimumClearanceMM,.8);
  const raised=knownBridgeClearance(above,fit,[source],{...crossingParameters,railRise:1});assert.equal(raised.accepted,false);close(raised.minimumClearanceMM,-.2);
  const half=knownBridgeClearance(above,fit,[source],{...crossingParameters,railRise:.5});assert.equal(half.accepted,false);close(half.minimumClearanceMM,.3);
  const below={...crossing,coordinates:crossing.coordinates.map(p=>[p[0],p[1],86])};
  for(const railRise of [0,.5,1]){const r=knownBridgeClearance(below,fit,[source],{...crossingParameters,railRise});assert.equal(r.accepted,true);close(r.minimumClearanceMM,.8);}
  const roadSource=knownBridgeClearance(above,fit,[known(100)],{...crossingParameters,railRise:1});assert.equal(roadSource.accepted,true);close(roadSource.minimumClearanceMM,.8);
});

test('railway clearance rise accepts only physical increments zero, point-five and one',()=>{
  for(const railRise of [NaN,-1,.25,2,'1'])assert.throws(()=>knownBridgeClearance(crossing,fit,[known(100)],{...crossingParameters,railRise}),/invàlida/);
});

test('crossings lacking a real XYZ footprint or a verified fit fail with an explicit reason',()=>{
  const elsewhere={...known(100),coordinates:known(100).coordinates.map(p=>[p[0]+20,p[1],p[2]])};
  const r=knownBridgeClearance(crossing,fit,[elsewhere],crossingParameters);assert.equal(r.accepted,false);assert.match(r.reason,/cap font XYZ/);
  assert.equal(knownBridgeClearance(crossing,{accepted:false,adjustmentMM:0},[known(100)],crossingParameters).accepted,false);
  const invalid={...known(100),coordinates:[[NaN,0,100]]};assert.equal(knownBridgeClearance(crossing,fit,[invalid],crossingParameters).accepted,false);
});
test('a flat carriageway is accepted only above an opened tunnel with clearance across its width',()=>{
  const surface=(a,b,c,d)=>({vertices:Float32Array.from([...a,...b,...c,...d]),faces:Uint32Array.from([0,1,2,0,2,3])});
  const deck=surface([0,3,8],[10,3,8],[10,7,8],[0,7,8]);
  const roof=surface([4,0,6],[6,0,6],[6,10,7],[4,10,7]);
  const bridge={mesh:deck,thickness:.6,approaches:{plans:[]},tunnelChecks:[{featureId:12,pointXY:[5,5]}]};
  const tunnel={...roof,sourceFeatureIds:[12]};
  const accepted=openedTunnelClearance(bridge,[tunnel]);
  assert.equal(accepted.accepted,true);
  close(accepted.results[0].minimumClearanceMM,.7);
  assert.equal(openedTunnelClearance(bridge,[]).accepted,false);
  // The crossing centre is clear, but the outside of the same bore is too high.
  const highEdge=surface([4,0,6],[6,0,6],[6,10,8.3],[4,10,8.3]);
  assert.match(openedTunnelClearance(bridge,[{...highEdge,sourceFeatureIds:[12]}]).reason,/separació insuficient/);
});
