import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECT_DRAFT_KEY,MAX_PROJECT_DRAFT_BYTES,readProjectDraft,writeProjectDraft,clearProjectDraft} from '../src/project-draft.js';
import {PROJECT_LIBRARY_KEY,validatedSettings} from '../src/project-library.js';
import {defaultAssignments} from '../src/materials.js';
import {defaultBoundaryStyles} from '../src/relief-boundary-options.js';

const now=new Date('2026-11-27T12:00:00Z');
const settings={
  sizePreset:'15x20',pureRelief:false,
  pose:{center:[42.16,1.75],widthM:3000,heightM:4000,rotation:27},
  materials:{count:4,assignments:defaultAssignments(4)},
  options:{detail:36,streams:true,streamWidth:1.5,reliefTrails:false,reliefTrailWidth:.42,
    boundaryStyles:defaultBoundaryStyles(),exaggeration:1.5,roadRise:.5,railRise:0,trailWidth:1,
    estimatedTunnels:true,majorRoads:true,buildingSource:'catastre',buildingMode:'source',maxBuildingHeight:5,
    trees:true,treeType:'mixed',brushDensity:.5,brushRadius:5,vegetationHeight:1.3,vegetationNoise:65,split:false,exportFormat:'bambu'},
  strokes:[{mode:'add',x:20,y:30,radius:5,gesture:1,density:.5}],
  fences:[{points:[[1.75,42.16],[1.751,42.16],[1.751,42.161]],closed:false,widthMM:1.2,heightMM:2}],
  horizontalSurfaces:[{points:[[1.75,42.16],[1.751,42.16],[1.751,42.161]],reference:'mean',offsetMM:.5,material:'roads'}],
  objects:[{shape:'cylinder',position:[1.75,42.16],widthMM:4,depthMM:5,heightMM:6,rotation:45}],
  print:{baseThickness:5,cuts:{}},placeName:'Prova de recuperació'
};
function memoryStorage(){
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
}

test('a local draft round-trips manual edits and settings without touching the saved library',()=>{
  const storage=memoryStorage(),input=structuredClone(settings);
  storage.setItem(PROJECT_LIBRARY_KEY,'existing catalog');
  assert.equal(readProjectDraft(storage),null);
  const result=writeProjectDraft(storage,input,{now});
  const expected={savedAt:now.toISOString(),settings:validatedSettings(settings)};
  assert.deepEqual(result,expected);
  input.objects[0].position[0]=0;
  result.settings.fences[0].heightMM=8;
  assert.deepEqual(readProjectDraft(storage),expected);
  const recovered=readProjectDraft(storage);
  recovered.settings.strokes[0].x=99;
  assert.deepEqual(readProjectDraft(storage),expected);
  assert.equal(storage.getItem(PROJECT_LIBRARY_KEY),'existing catalog');
  assert.equal(clearProjectDraft(storage),true);
  assert.equal(readProjectDraft(storage),null);
  assert.equal(clearProjectDraft(storage),false);
  assert.equal(storage.getItem(PROJECT_LIBRARY_KEY),'existing catalog');
});

test('only editable configuration is stored, and pure relief strokes remain recoverable',()=>{
  const storage=memoryStorage();
  writeProjectDraft(storage,{...settings,mesh:new Float32Array(500),history:{secret:true}},{now});
  const raw=storage.getItem(PROJECT_DRAFT_KEY);
  assert.equal(raw.includes('"mesh"'),false);assert.equal(raw.includes('"history"'),false);
  const pure={...settings,pureRelief:true,trailStrokes:[{mode:'add',x:10,y:20,radius:.3,gesture:1}],
    drawnRouteStrokes:[{mode:'erase',x:12,y:22,radius:.5,gesture:2}],pins:[{id:1,lon:1.75,lat:42.16,depth:8}]};
  writeProjectDraft(storage,pure,{now:now.getTime()});
  assert.deepEqual(readProjectDraft(storage).settings,validatedSettings(pure));
});

test('a corrupt or unsupported draft is left intact until explicitly discarded',()=>{
  const storage=memoryStorage();
  for(const raw of ['{broken','null',JSON.stringify({version:2,savedAt:now.toISOString(),settings}),
    JSON.stringify({version:1,savedAt:'2026-02-30T12:00:00.000Z',settings}),
    JSON.stringify({version:1,savedAt:now.toISOString(),settings:{}})]){
    storage.setItem(PROJECT_DRAFT_KEY,raw);
    assert.throws(()=>readProjectDraft(storage),{code:'DRAFT_INVALID'});
    assert.throws(()=>writeProjectDraft(storage,settings,{now}),{code:'DRAFT_INVALID'});
    assert.equal(storage.getItem(PROJECT_DRAFT_KEY),raw);
    assert.equal(clearProjectDraft(storage),true);
  }
});

test('invalid state and timestamps cannot overwrite a previous valid draft',()=>{
  const storage=memoryStorage();writeProjectDraft(storage,settings,{now});
  const original=storage.getItem(PROJECT_DRAFT_KEY);
  assert.throws(()=>writeProjectDraft(storage,{...settings,objects:[{...settings.objects[0],heightMM:-2}]},{now}),{code:'DRAFT_INVALID'});
  for(const value of [new Date(NaN),NaN,Infinity,'not a date',null])
    assert.throws(()=>writeProjectDraft(storage,settings,{now:value}),{code:'DRAFT_INVALID'});
  assert.equal(storage.getItem(PROJECT_DRAFT_KEY),original);
});

test('storage access and quota failures are reported without a false successful update',()=>{
  const storage=memoryStorage();writeProjectDraft(storage,settings,{now});
  const original=storage.getItem(PROJECT_DRAFT_KEY);
  for(const [name,code] of [['SecurityError','DRAFT_STORAGE'],['QuotaExceededError','DRAFT_QUOTA'],['NS_ERROR_DOM_QUOTA_REACHED','DRAFT_QUOTA']]){
    const failing={...storage,setItem(){throw Object.assign(new Error('blocked'),{name});}};
    assert.throws(()=>writeProjectDraft(failing,settings,{now}),{code});
    assert.equal(storage.getItem(PROJECT_DRAFT_KEY),original);
  }
  const blocked={getItem(){throw Error('denied');}};
  assert.throws(()=>readProjectDraft(blocked),{code:'DRAFT_STORAGE'});
  assert.throws(()=>writeProjectDraft(blocked,settings,{now}),{code:'DRAFT_STORAGE'});
  assert.throws(()=>clearProjectDraft(blocked),{code:'DRAFT_STORAGE'});
  assert.throws(()=>clearProjectDraft({...storage,removeItem(){throw Error('denied');}}),{code:'DRAFT_STORAGE'});
  assert.equal(storage.getItem(PROJECT_DRAFT_KEY),original);
});

test('a size limit rejects large settings before writing and does not destroy an oversized old draft',()=>{
  const storage=memoryStorage();writeProjectDraft(storage,settings,{now});
  const original=storage.getItem(PROJECT_DRAFT_KEY);
  const tooLarge={...settings,strokes:Array.from({length:32000},(_,gesture)=>({mode:'add',x:20,y:30,radius:5,gesture,density:.5}))};
  assert.throws(()=>writeProjectDraft(storage,tooLarge,{now}),{code:'DRAFT_TOO_LARGE'});
  assert.equal(storage.getItem(PROJECT_DRAFT_KEY),original);
  const oversized=' '.repeat(MAX_PROJECT_DRAFT_BYTES+1);
  storage.setItem(PROJECT_DRAFT_KEY,oversized);
  assert.throws(()=>readProjectDraft(storage),{code:'DRAFT_TOO_LARGE'});
  assert.throws(()=>writeProjectDraft(storage,settings,{now}),{code:'DRAFT_TOO_LARGE'});
  assert.equal(storage.getItem(PROJECT_DRAFT_KEY),oversized);
});
