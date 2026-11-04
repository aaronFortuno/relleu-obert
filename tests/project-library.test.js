import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECT_LIBRARY_KEY,deleteProject,readProjects,saveProject} from '../src/project-library.js';
import {defaultAssignments} from '../src/materials.js';

const settings={
  sizePreset:'15x20',pose:{center:[42.165671,1.751211],widthM:3000,heightM:4000,rotation:-37.5},pureRelief:false,
  materials:{count:4,assignments:defaultAssignments(4)},strokes:[
    {mode:'add',x:20,y:40,radius:5,gesture:1,density:.5},
    {mode:'erase',x:70,y:90,radius:8,gesture:2,density:1}
  ],
  options:{detail:36,streams:true,streamWidth:1.5,exaggeration:1.5,roadRise:.5,railRise:1,
    estimatedTunnels:true,majorRoads:true,buildingSource:'catastre',buildingMode:'limited',maxBuildingHeight:5,
    trees:true,treeType:'mixed',brushDensity:.5,brushRadius:5,split:false,exportFormat:'bambu'},
  placeName:'Rasos de Peguera'
};
function memoryStorage(){
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}
const firstDate=new Date('2026-11-03T12:00:00Z'),secondDate=new Date('2026-11-03T12:01:00Z');

test('save and read preserve the settings with detached copies',()=>{
  const storage=memoryStorage(),input=structuredClone(settings);
  assert.deepEqual(readProjects(storage),[]);
  const saved=saveProject(storage,{name:'  Rasos de Peguera  ',settings:input},firstDate);
  assert.equal(saved.name,'Rasos de Peguera');
  assert.deepEqual(saved.settings,settings);
  assert.equal(saved.createdAt,firstDate.toISOString());
  assert.equal(saved.updatedAt,saved.createdAt);
  input.strokes[0].x=30;
  saved.settings.pose.center[0]=0;
  assert.deepEqual(readProjects(storage)[0].settings,settings);
});

test('custom centimetre dimensions round-trip and define the valid stroke area',()=>{
  const storage=memoryStorage();
  const custom={...settings,sizePreset:'40x45',strokes:[{mode:'add',x:399,y:449,radius:5}]};
  saveProject(storage,{name:'Personalitzada',settings:custom},firstDate);
  assert.deepEqual(readProjects(storage)[0].settings,custom);
  for(const sizePreset of ['9x45','40x51','40.5x45'])
    assert.throws(()=>saveProject(storage,{name:'Invàlida',settings:{...custom,sizePreset}}),/no és vàlida/);
});

test('updating retains identity and creation time, and deletion touches only the selected project',()=>{
  const storage=memoryStorage(),first=saveProject(storage,{name:'Primer',settings},firstDate);
  const second=saveProject(storage,{name:'Segon',settings},secondDate);
  const renamed=saveProject(storage,{id:first.id,name:'Revisió',settings},secondDate);
  assert.equal(renamed.id,first.id);
  assert.equal(renamed.createdAt,firstDate.toISOString());
  assert.equal(renamed.updatedAt,secondDate.toISOString());
  assert.deepEqual(readProjects(storage).map(item=>item.id),[first.id,second.id]);
  assert(deleteProject(storage,first.id));
  assert(!deleteProject(storage,first.id));
  assert.throws(()=>saveProject(storage,{id:first.id,name:'Esborrat',settings}),/ja no existeix/);
  assert.deepEqual(readProjects(storage),[second]);
});

test('invalid input and an unreadable version preserve existing storage',()=>{
  const storage=memoryStorage();
  saveProject(storage,{name:'Primer',settings},firstDate);
  const original=storage.getItem(PROJECT_LIBRARY_KEY);
  assert.throws(()=>saveProject(storage,{name:'Buit',settings:{...settings,pose:{...settings.pose,center:[91,0]}}}),/no és vàlida/);
  assert.equal(storage.getItem(PROJECT_LIBRARY_KEY),original);
  storage.setItem(PROJECT_LIBRARY_KEY,'{"version":2,"projects":[]}');
  assert.throws(()=>readProjects(storage),/no pot llegir/);
  assert.throws(()=>saveProject(storage,{name:'Segon',settings}),/no pot llegir/);
  assert.throws(()=>deleteProject(storage,'primer'),/no pot llegir/);
  assert.equal(storage.getItem(PROJECT_LIBRARY_KEY),'{"version":2,"projects":[]}');
});

test('disabled storage and quota failures report a useful error without a successful write',()=>{
  const storage=memoryStorage();
  const existing=saveProject(storage,{name:'Primer',settings},firstDate);
  const full={...storage,setItem(){throw new DOMException('quota','QuotaExceededError');}};
  assert.throws(()=>saveProject(full,{name:'Segon',settings}),/prou espai/);
  assert.deepEqual(readProjects(storage),[existing]);
  assert.throws(()=>readProjects({getItem(){throw Error('disabled');}}),/No es pot accedir/);
});
