import assert from 'node:assert/strict';
import test from 'node:test';
import {coverageSkins} from '../src/relief-contours.js';
import {auditPart} from '../src/solid-audit.js';

test('forest contour fans that touch at one point get independent side walls',()=>{
  const grid={width:100,height:100,resolution:2,heights:new Float64Array(9).fill(10),
    diagonals:new Uint8Array(4).fill(1),
    forestWeights:new Float32Array([-1,-1,1,-1,0,-1,1,-1,-1])};
  const skins=coverageSkins(grid,{left:0,bottom:0,right:2,top:2});
  assert.deepEqual(auditPart(skins[0]).errors,[]);
  const forest=auditPart(skins[4]);
  assert.deepEqual(forest.errors,[]);
  assert.equal(forest.components,2);
});
