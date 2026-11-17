import test from 'node:test';
import assert from 'node:assert/strict';
import {snapToContours} from '../src/contour-snap.js';

const project=p=>p;
const square=[[0,0],[100,0],[100,100],[0,100]];
test('snaps to a nearby corner before the edge, without changing the source',()=>{
  const result=snapToContours([5,2],[square],{project});
  assert.deepEqual(result,{point:[0,0],kind:'vertex',screen:[0,0]});
  result.point[0]=500;
  assert.equal(square[0][0],0);
});
test('projects onto the closest edge and returns its geographic position',()=>{
  const result=snapToContours([81,47],[[[3,40],[4,40],[4,41],[3,41]]],{
    project:([lon,lat])=>[(lon-3)*80,(lat-40)*100]});
  assert.equal(result.kind,'edge');
  assert.deepEqual(result.point,[4,40.47]);
  assert.deepEqual(result.screen,[80,47]);
  assert.deepEqual(result.edge,[[80,0],[80,100]]);
});
test('does not close open fences or join disconnected or hidden contours',()=>{
  const a=[[0,0],[100,0],[100,100]];
  assert.equal(snapToContours([50,50],[{points:a,closed:false}],{project}),null);
  assert.equal(snapToContours([50,50],[[[0,0],[0,5]],[[100,100],[100,95]]],{project}),null);
  assert.equal(snapToContours([50,0],[square],{project:p=>p[0]===100?null:p}),null);
});
test('uses pixels consistently as the projection zoom changes',()=>{
  const big=snapToContours([198,80],[[[0,0],[100,0],[100,100]]],{project:p=>p.map(v=>v*2)});
  assert.equal(big.kind,'edge');
  assert.deepEqual(big.point,[100,40]);
  assert.equal(snapToContours([120,60],[square],{project}),null);
});
test('ignores malformed input, empty geometry and zero tolerances',()=>{
  for(const contours of [[],null,[null],[[[NaN,2],[1,2]]]])
    assert.equal(snapToContours([20,20],contours,{project}),null);
  assert.equal(snapToContours([5,0],[square],{project,tolerance:0}),null);
  assert.equal(snapToContours([NaN,0],[square],{project}),null);
});
test('interpolates longitude across the date line along the short arc',()=>{
  const result=snapToContours([50,2],[{points:[[179,20],[-179,20]],closed:false}],{
    project:([lon])=>[lon===179?0:100,0]});
  assert.equal(result.kind,'edge');
  assert.deepEqual(result.point,[180,20]);
});
