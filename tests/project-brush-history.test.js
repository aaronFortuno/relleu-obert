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

test('resizing the same rotated territory stages scaled strokes without replacing the current frame',()=>{
  const history=createProjectBrushHistory();
  const enlarged={...rotated,widthMM:300,heightMM:300};
  history.accept(history.prepare(rotated,[]),[]);
  const current=[stroke];
  history.resize(rotated,enlarged,current);
  const candidate=history.prepare(enlarged,current);
  assert.deepEqual(candidate.strokes,[{...stroke,x:90,y:140,radius:10}]);
  assert.deepEqual(history.prepare(rotated,current).strokes,[stroke]);
  assert.deepEqual(history.accept(candidate,current),candidate.strokes);
});

test('a narrower draft or generated model keeps outside strokes for an expanded frame',()=>{
  const history=createProjectBrushHistory();
  const narrower={...frame,widthMM:100,selectionPose:{...frame.selectionPose,widthM:1000}};
  const enlarged={...frame,widthMM:300,heightMM:300};
  const outside={...stroke,x:10,gesture:2};
  history.accept(history.prepare(frame,[]),[]);
  const current=[stroke,outside];
  history.resize(frame,narrower,current);
  const narrowerCandidate=history.prepare(narrower,current);
  assert.deepEqual(narrowerCandidate.strokes,[{...stroke,x:20}]);

  history.resize(narrower,enlarged,current);
  assert.deepEqual(history.prepare(enlarged,current).strokes,[
    {...stroke,x:90,y:140,radius:10},{...outside,x:20,y:140,radius:10}
  ]);
  const resized=history.accept(narrowerCandidate,current);
  resized.push({...stroke,mode:'erase',x:40,gesture:3});
  history.resize(narrower,frame,resized);
  assert.deepEqual(history.prepare(frame,resized).strokes,[stroke,outside,{...stroke,mode:'erase',x:65,gesture:3}]);
});

test('an ordinary move does not transfer strokes from a resized frame',()=>{
  const history=createProjectBrushHistory();
  const enlarged={...frame,widthMM:300,heightMM:300};
  const moved={...enlarged,selectionPose:{...enlarged.selectionPose,center:[41.8,1.8]}};
  history.accept(history.prepare(frame,[]),[]);
  const current=[stroke];
  history.resize(frame,enlarged,current);
  history.resize(enlarged,moved,current);
  assert.deepEqual(history.prepare(moved,current).strokes,[]);
  assert.deepEqual(history.prepare(enlarged,current).strokes,[{...stroke,x:90,y:140,radius:10}]);
});

test('a capped radius never replaces the original radius when resizing again',()=>{
  const history=createProjectBrushHistory();
  const large={...frame,widthMM:450,heightMM:450};
  const medium={...frame,widthMM:300,heightMM:300};
  history.accept(history.prepare(frame,[]),[]);
  const current=[{...stroke,radius:12}];
  history.resize(frame,large,current);
  const resized=history.accept(history.prepare(large,current),current);
  assert.equal(resized[0].radius,30);
  history.resize(large,medium,resized);
  assert.equal(history.prepare(medium,resized).strokes[0].radius,24);
});
