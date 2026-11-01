import test from 'node:test';
import assert from 'node:assert/strict';
import {parseScaleInput,scaledBBox,selectionPose} from '../src/selection.js';
import {regionTileCount,maxRegionScale,regionLimitMessage,MAX_REGION_TILES} from '../src/region-limits.js';
import {tileList} from '../src/sources.js';
import {treeDimensions} from '../src/tree-scale.js';
import {buildModel} from '../src/geometry.js';
test('one scale field accepts suggestions, custom values and Catalan thousands without a second control',()=>{
  for(const text of ['','Segons el mapa','auto'])assert.equal(parseScaleInput(text),null);
  for(const text of ['1000','1:1000','1:1.000'])assert.equal(parseScaleInput(text),1000);
  assert.equal(parseScaleInput('1:50.000'),50000);assert.equal(parseScaleInput('1:1500,5'),1500.5);
  for(const text of ['1:0','1:100001','abc','1:'])assert.throws(()=>parseScaleInput(text));
});
test('large scales are checked against the same load budget as the sources, with actionable limits',()=>{
  for(const center of [[41.918,3.2075],[65,10],[0,0]])for(const [w,h]of [[150,150],[150,200],[400,400]])for(const rotation of [0,45,90]){
    const max=maxRegionScale(center,w,h,rotation);assert(max>=100&&max<=100000);
    const small=selectionPose(scaledBBox(center,w,h,max),rotation);assert(regionTileCount(small.bbox)<=MAX_REGION_TILES);assert.equal(regionLimitMessage(small,w,h),'');assert.equal(tileList(small.bbox).length,regionTileCount(small.bbox));
    const large=selectionPose(scaledBBox(center,w,h,100000),rotation);assert(regionLimitMessage(large,w,h).includes('capacitat'));assert.throws(()=>tileList(large.bbox),/capacitat actual/);
  }
  assert.equal(regionTileCount([0,0,Infinity,1]),Infinity);
});
test('procedural crowns scale in real metres instead of keeping a fixed printed diameter',()=>{
  const near=treeDimensions(.1),far=treeDimensions(.05);assert.equal(near.radius/far.radius,2);assert.equal(near.radius/.1,far.radius/.05);assert(near.visible);assert(!treeDimensions(.01).visible);
});
test('tiny crowns are omitted explicitly while forest colour and terrain remain exportable',()=>{
  const bbox=scaledBBox([0,0],150,150,100000),forest={type:'Feature',properties:{sourceLayer:'landcover',class:'wood'},geometry:{type:'Polygon',coordinates:[[[bbox[0],bbox[1]],[bbox[2],bbox[1]],[bbox[2],bbox[3]],[bbox[0],bbox[3]],[bbox[0],bbox[1]]]]}};
  const model=buildModel({meta:{bbox},features:[forest],dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4)}]},{size:150,resolution:2,trees:true});assert.equal(model.treeCount,0);assert(model.categories.some(c=>c.id==='forest'));assert(model.categories.some(c=>c.id==='terrain'));assert(model.warnings.some(w=>w.includes('massa petits')));assert.equal(model.provenance.treeRepresentation.omittedBelowThreshold,true);
});
