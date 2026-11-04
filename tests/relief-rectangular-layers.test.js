import assert from 'node:assert/strict';
import test from 'node:test';
import {coverageSkins} from '../src/relief-contours.js';
import {sampleReliefForest} from '../src/relief-forest.js';
import {reliefForestTrees,reliefTreePart} from '../src/relief-forest-trees.js';
import {levelReliefLakes} from '../src/relief-lakes.js';
import {reliefStreamPart,reliefStreamStrips} from '../src/relief-streams.js';
import {auditPart} from '../src/solid-audit.js';

const resolution=4,rows=8,width=40,height=80,stride=resolution+1;
const box=(left,bottom,right,top)=>[[left,bottom],[right,bottom],[right,top],[left,top],[left,bottom]];
const heightAt=(x,y)=>8+x*.05+y*.1;
const grid={resolution,rows,width,height,diagonals:new Uint8Array(resolution*rows),
  heights:Float64Array.from({length:stride*(rows+1)},(_,i)=>heightAt(i%stride*10,Math.floor(i/stride)*10))};
const south={left:0,bottom:0,right:4,top:4},north={left:0,bottom:4,right:4,top:8};

function seam(vertices,y){
  const section=new Set();
  for(let i=0;i<vertices.length;i+=3)if(vertices[i+1]===y)section.add(`${vertices[i]}:${vertices[i+2]}`);
  return [...section].sort();
}

test('rectangular forest sampling and coverage match at the horizontal print cut',()=>{
  const forest=sampleReliefForest([[box(14,-5,45,85)]],width,height,resolution,rows);
  assert.equal(forest.weights.length,stride*(rows+1));
  assert.equal(forest.cells,27);
  assert(forest.weights[8*stride+2]>0);
  const forestGrid={...grid,forestWeights:forest.weights};
  const southForest=coverageSkins(forestGrid,south)[4],northForest=coverageSkins(forestGrid,north)[4];
  assert.deepEqual(auditPart(southForest).errors,[]);
  assert.deepEqual(auditPart(northForest).errors,[]);
  const seamSouth=seam(southForest.vertices,40);
  assert(seamSouth.length>0);
  assert.deepEqual(seamSouth,seam(northForest.vertices,0));
});

test('lakes can flatten terrain in rows beyond the column count',()=>{
  const heights=grid.heights.slice();
  const lake={geometry:{type:'Polygon',coordinates:[box(9,59,31,71)]}};
  const result=levelReliefLakes([lake],point=>point,heights,resolution,width,height,rows);
  assert.equal(result.count,1);
  assert.equal(heights[0],grid.heights[0]);
  assert(result.weights[6*stride+2]>0&&result.weights[7*stride+2]>0);
  assert.equal(heights[6*stride+2],heights[7*stride+2]);
});

test('a stream on a rectangular grid keeps the same height on both sides of a print cut',()=>{
  const streamStrips=reliefStreamStrips([[[box(12,15,14,65)]]],width,height,resolution);
  const streamGrid={...grid,streamStrips};
  const southStream=reliefStreamPart(streamGrid,south),northStream=reliefStreamPart(streamGrid,north);
  assert.deepEqual(auditPart(southStream).errors,[]);
  assert.deepEqual(auditPart(northStream).errors,[]);
  const seamSouth=seam(southStream.vertices,40);
  assert(seamSouth.length>0);
  assert.deepEqual(seamSouth,seam(northStream.vertices,0));
});

test('crowns interpolate the rectangular terrain and translate to tile-local coordinates',()=>{
  const trees=reliefForestTrees(grid,()=>true,.05);
  assert(trees.some(({y})=>y>70));
  for(const {x,y,ground} of trees)assert(Math.abs(ground-heightAt(x,y))<1e-8);
  const part=reliefTreePart({...grid,trees},north),audit=auditPart(part);
  assert.deepEqual(audit.errors,[]);
  assert(audit.bbox.min[1]>=0&&audit.bbox.max[1]<=40&&audit.bbox.max[1]>30);
});
