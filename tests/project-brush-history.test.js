import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectBrushHistory} from '../src/project-brush-history.js';

const frame={widthMM:150,heightMM:150,selectionPose:{center:[41.7,1.8],widthM:1500,heightM:1500,rotation:0}};
const rotated={...frame,selectionPose:{...frame.selectionPose,rotation:25}};
const stroke={x:45,y:70,radius:5,mode:'add',gesture:1,density:.5};

test('a failed change of frame leaves the active brush edits and its next rebuild intact',()=>{
  const history=createProjectBrushHistory();
  history.accept(history.prepare(frame,[]),[]);
  const current=[stroke];
  const failed=history.prepare({...frame,widthMM:200},current);
  assert.deepEqual(failed.strokes,[]);
  const retry=history.prepare({...frame,roadRise:1},current);
  assert.deepEqual(retry.strokes,[stroke]);
  assert.deepEqual(history.accept(retry,current),[stroke]);
});

test('accepting another frame isolates its edits and returning restores the original strokes',()=>{
  const history=createProjectBrushHistory();
  history.accept(history.prepare(frame,[]),[]);
  const current=[stroke];
  const next=history.accept(history.prepare(rotated,current),current);
  assert.deepEqual(next,[]);
  next.push({...stroke,x:10,mode:'erase'});
  const restored=history.accept(history.prepare(frame,next),next);
  assert.deepEqual(restored,[stroke]);
  assert.deepEqual(history.prepare(rotated,restored).strokes,next);
});
