import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditHistory} from '../src/edit-history.js';

const empty=()=>({objects:[],fences:[],horizontalSurfaces:[]});

test('interleaved tools undo and redo in accepted order; peeking or a failed calculation does not commit',()=>{
  const history=createEditHistory(),initial=empty();
  history.reset(initial);
  const fence={...empty(),fences:[{points:[[1,2],[3,4]]}]};
  const object={...fence,objects:[{shape:'box',heightMM:4}]};
  const patio={...object,horizontalSurfaces:[{offsetMM:1}]};
  history.record(fence,'fence.add');history.record(object,'object.add');history.record(patio,'horizontal.add');
  assert.equal(history.undoLabel,'horizontal.add');
  assert.deepEqual(history.peekUndo(),object);
  assert.deepEqual(history.peekUndo(),object);
  assert.equal(history.undoLabel,'horizontal.add');
  assert.equal(history.commitUndo(),true);
  assert.equal(history.redoLabel,'horizontal.add');
  assert.deepEqual(history.peekUndo(),fence);
  history.commitUndo();
  assert.deepEqual(history.peekUndo(),initial);
  assert.deepEqual(history.peekRedo(),object);
  history.commitRedo();history.commitRedo();
  assert.equal(history.canRedo,false);
  assert.deepEqual(history.peekUndo(),object);
});

test('a new edit after undo drops redo; no-op settings preserve both redo and labels',()=>{
  const history=createEditHistory();history.reset({a:0,b:[]});
  history.record({b:[],a:1},'object.add');history.record({a:2,b:[]},'object.move');
  history.commitUndo();
  assert.equal(history.record({b:[],a:1},'ignored'),false);
  assert.equal(history.redoLabel,'object.move');
  assert.equal(history.record({a:3,b:[]},'object.resize'),true);
  assert.equal(history.canRedo,false);assert.equal(history.undoLabel,'object.resize');
  assert.deepEqual(history.peekUndo(),{a:1,b:[]});
});

test('twenty actions retain exactly twenty undo targets and reset establishes a new baseline',()=>{
  const history=createEditHistory();history.reset({n:0});
  for(let n=1;n<=27;n++)history.record({n},'object.move');
  assert.equal(history.length,20);
  let undoCount=0;
  while(history.canUndo){history.commitUndo();undoCount++;}
  assert.equal(undoCount,20);assert.equal(history.commitUndo(),false);
  assert.deepEqual(history.peekRedo(),{n:8});
  history.reset({n:100});
  assert.equal(history.length,0);assert.equal(history.canUndo,false);assert.equal(history.canRedo,false);
  assert.equal(history.peekUndo(),null);assert.equal(history.peekRedo(),null);
});

test('snapshots and returned targets cannot be changed through editor references',()=>{
  const history=createEditHistory(),baseline=empty();history.reset(baseline);
  baseline.objects.push({shape:'sphere'});
  const state={...empty(),fences:[{points:[[1,2],[3,4]]}]};
  history.record(state,'fence.add');state.fences[0].points[0][0]=9;
  const target=history.peekUndo();target.objects.push({shape:'cylinder'});
  assert.deepEqual(history.peekUndo(),empty());
  history.commitUndo();
  assert.equal(history.peekRedo().fences[0].points[0][0],1);
});

test('the byte budget evicts old snapshots and oversized or invalid data leave the previous history intact',()=>{
  const history=createEditHistory({maxBytes:80});history.reset({s:'0'.repeat(20)});
  history.record({s:'1'.repeat(20)},'object.add');history.record({s:'2'.repeat(20)},'object.move');
  assert.equal(history.length,1);assert.ok(history.bytes<=80);
  assert.deepEqual(history.peekUndo(),{s:'1'.repeat(20)});
  assert.throws(()=>history.record({s:'3'.repeat(100)},'oversized'),{code:'EDIT_HISTORY_TOO_LARGE'});
  for(const bad of [new Float32Array([1,2]),{v:Infinity},{v:undefined},{v:()=>1},new Date()])
    assert.throws(()=>history.record(bad),{code:'EDIT_HISTORY_INVALID'});
  const cyclic={};cyclic.self=cyclic;
  assert.throws(()=>history.reset(cyclic),{code:'EDIT_HISTORY_INVALID'});
  assert.equal(history.undoLabel,'object.move');
  assert.deepEqual(history.peekUndo(),{s:'1'.repeat(20)});
});

test('normalization is applied to detached data and a rejected candidate keeps the cursor and redo',()=>{
  const input={n:0},history=createEditHistory({normalize:state=>{
    if(state.n<0)throw Error('invalid candidate');
    state.n=Math.round(state.n);return state;
  }});
  history.reset(input);history.record({n:1.2},'object.move');history.record({n:2},'object.move');history.commitUndo();
  assert.throws(()=>history.record({n:-1}));
  assert.deepEqual(input,{n:0});assert.deepEqual(history.peekRedo(),{n:2});
  assert.equal(history.canUndo,true);assert.equal(history.length,2);
});
