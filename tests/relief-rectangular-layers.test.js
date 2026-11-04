import assert from 'node:assert/strict';
import test from 'node:test';
import {coverageSkins,vegetationSkin} from '../src/relief-contours.js';
import {sampleReliefMask} from '../src/relief-forest.js';
import {reliefVegetationTexture} from '../src/relief-vegetation-texture.js';
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
  const forest=sampleReliefMask([[box(14,-5,45,85)]],width,height,resolution,rows);
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

test('continuous vegetation follows sloping rectangular terrain across its horizontal print cut',()=>{
  const wooded={...grid,forestWeights:new Float32Array(grid.heights.length).fill(1)};
  wooded.vegetationTexture=reliefVegetationTexture(wooded,{scale:.1,waterPolygons:[]});
  const southTexture=vegetationSkin(wooded,south),northTexture=vegetationSkin(wooded,north);
  assert.deepEqual(auditPart(northTexture).errors,[]);
  assert.deepEqual(auditPart(southTexture).errors,[]);
  assert.deepEqual(seam(southTexture.vertices,40),seam(northTexture.vertices,0));
  assert.equal(northTexture.areaMM2,1600);
  const {vertices}=northTexture;
  for(let i=0;i<vertices.length;i+=6){
    const ground=heightAt(vertices[i],vertices[i+1]+40);
    assert(vertices[i+2]>ground&&Math.abs(vertices[i+5]-(ground-.06))<1e-6);
  }
});
