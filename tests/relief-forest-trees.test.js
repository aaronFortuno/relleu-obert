import assert from 'node:assert/strict';
import test from 'node:test';
import {reliefCrownTaper,reliefForestTrees,reliefTreePart} from '../src/relief-forest-trees.js';
import {auditPart} from '../src/solid-audit.js';

const resolution=4;
const grid={width:40,height:40,resolution,
  heights:Float64Array.from({length:25},(_,i)=>10+i%5),diagonals:new Uint8Array(16)};

test('absolute maximum elevation blends a rounded crown into a taller cone',()=>{
  const tree={x:20,y:20,ground:10,radius:.25,rotation:0,heightFactor:1};
  const heights=[400,1400,2500].map(elevation=>{
    const part=reliefTreePart({...grid,trees:[tree],crownTaper:reliefCrownTaper(elevation)},
      {left:0,bottom:0,right:4,top:4});
    const audit=auditPart(part);
    assert.deepEqual(audit.errors,[]);
    assert.equal(audit.dimensions[0],.5);
    return audit.bbox.max[2];
  });
  assert(heights[0]<heights[1]&&heights[1]<heights[2]);
});

test('pure relief crowns use geographic scale and close below the terrain surface',()=>{
  assert.deepEqual(reliefForestTrees(grid,()=>true,.01),[]);
  const scale=.05,trees=reliefForestTrees(grid,()=>true,scale);
  assert(trees.length>0);
  assert.deepEqual(reliefForestTrees(grid,()=>true,scale),trees);
  for(const {x,radius,ground} of trees){
    assert(radius*2>=.45&&radius*2<=.65);
    assert(Math.abs(ground-(10+x/10))<1e-8);
  }
  const part=reliefTreePart({...grid,trees},{left:0,bottom:0,right:4,top:4});
  assert.deepEqual(auditPart(part).errors,[]);
  assert(part.vertices[2]<trees[0].ground);
});

test('pure relief thins crowns with local absolute elevation independent of exaggeration',()=>{
  const level=new Float64Array(25).fill(5),base={...grid,heights:level};
  const dense=reliefForestTrees({...base,originMeters:1900},()=>true,.05);
  const sparse=reliefForestTrees({...base,originMeters:2350},()=>true,.05);
  assert(sparse.length>0&&sparse.length<dense.length/2);
  assert.equal(reliefForestTrees({...base,originMeters:2450},()=>true,.05).length,0);
  assert.deepEqual(reliefForestTrees({...base,originMeters:2350,exaggeration:3},()=>true,.05),sparse);
});

test('pure relief crowns stay clear of water and print cuts',()=>{
  const grid={width:300,height:40,resolution,heights:new Float64Array(25).fill(10),
    diagonals:new Uint8Array(16),
    lakeWeights:Float32Array.from({length:25},(_,i)=>i%5<2?1:-1),
    streamStrips:[[],[],[[[[175,0],[185,0],[185,40],[175,40],[175,0]]]],[]]};
  const trees=reliefForestTrees(grid,()=>true,.05);
  assert(trees.length>0);
  for(const {x,radius} of trees){
    assert(x-radius>112.5);
    assert(Math.abs(x-150)>=radius);
    assert(x+radius<175||x-radius>185);
  }
  const left=reliefTreePart({...grid,trees},{left:0,bottom:0,right:2,top:4});
  const right=reliefTreePart({...grid,trees},{left:2,bottom:0,right:4,top:4});
  assert.deepEqual(auditPart(left).errors,[]);
  assert.deepEqual(auditPart(right).errors,[]);
  assert.equal(left.vertices.length+right.vertices.length,trees.length*42*3);
});
