import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECT_LIBRARY_KEY,deleteProject,exportProjectLibrary,importProjectLibrary,readProjects,saveProject} from '../src/project-library.js';
import {defaultAssignments} from '../src/materials.js';

const settings={
  sizePreset:'15x20',pose:{center:[42.165671,1.751211],widthM:3000,heightM:4000,rotation:-37.5},pureRelief:false,
  materials:{count:4,assignments:defaultAssignments(4)},strokes:[
    {mode:'add',x:20,y:40,radius:5,gesture:1,density:.5},
    {mode:'erase',x:70,y:90,radius:8,gesture:2,density:1}
  ],
  options:{detail:36,streams:true,streamWidth:1.5,exaggeration:1.5,roadRise:.5,railRise:1,trailWidth:1.5,
    estimatedTunnels:true,majorRoads:true,buildingSource:'catastre',buildingMode:'limited',maxBuildingHeight:5,
    trees:true,treeType:'mixed',brushDensity:.5,brushRadius:5,vegetationHeight:1.3,vegetationNoise:65,split:false,exportFormat:'bambu'},
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
  const custom={...settings,sizePreset:'40x45',options:{...settings.options,split:true,exportFormat:'bambu-zip'},
    strokes:[{mode:'add',x:399,y:449,radius:5}]};
  saveProject(storage,{name:'Personalitzada',settings:custom},firstDate);
  assert.deepEqual(readProjects(storage)[0].settings,custom);
  for(const sizePreset of ['9x45','40x51','40.5x45'])
    assert.throws(()=>saveProject(storage,{name:'Invàlida',settings:{...custom,sizePreset}}),/no és vàlida/);
});

test('project backups preserve a historical edition and reject malformed choices',()=>{
  const from=memoryStorage(),to=memoryStorage(),historical={areaId:'carrilet-vall-aro',year:1960};
  const historicalSettings={...settings,historical};
  saveProject(from,{name:'Carrilet',settings:historicalSettings},firstDate);
  assert.deepEqual(importProjectLibrary(to,exportProjectLibrary(from)),{added:1,skipped:0});
  assert.deepEqual(readProjects(to)[0].settings.historical,historical);
  for(const invalid of [{areaId:'../index',year:1960},{areaId:historical.areaId,year:'1960'}]){
    assert.throws(()=>saveProject(from,{name:'Invàlida',settings:{...settings,historical:invalid}}),/no és vàlida/);
  }
});

test('panoramic projects preserve dimensions, mode and scales larger than the regular range',()=>{
  const storage=memoryStorage();
  const panoramic={...settings,sizePreset:'100x20',pureRelief:true,
    pose:{...settings.pose,widthM:450000,heightM:90000},
    options:{...settings.options,split:true},strokes:[]};
  saveProject(storage,{name:'Serralada',settings:panoramic},firstDate);
  assert.deepEqual(readProjects(storage)[0].settings,panoramic);
  assert.throws(()=>saveProject(storage,{name:'Complet',settings:{...panoramic,pureRelief:false}}),/no és vàlida/);
  assert.throws(()=>saveProject(storage,{name:'Escala insuficient',settings:{...panoramic,pose:{...panoramic.pose,widthM:49900}}}),/no és vàlida/);
});

test('project backups transfer manual cuts and base thickness and reject inconsistent plans',()=>{
  const from=memoryStorage(),to=memoryStorage();
  const print={baseThickness:7.5,cuts:{columns:[300,300,200],rows:[200]}};
  const panorama={...settings,sizePreset:'80x20',pureRelief:true,
    pose:{...settings.pose,widthM:40000,heightM:10000},strokes:[],print};
  saveProject(from,{name:'Panorama',settings:panorama},firstDate);
  assert.deepEqual(importProjectLibrary(to,exportProjectLibrary(from)),{added:1,skipped:0});
  assert.deepEqual(readProjects(to)[0].settings.print,print);
  for(const invalid of [{...print,baseThickness:7.1},{...print,cuts:{columns:[300,200]}}]){
    assert.throws(()=>saveProject(from,{name:'Invàlid',settings:{...panorama,print:invalid}}),/no és vàlida/);
  }
});

test('a square pure relief project at 1:500,000 can be saved and restored',()=>{
  const storage=memoryStorage();
  const square={...settings,sizePreset:'20x20',pureRelief:true,
    pose:{center:[47.63,9.37],widthM:100000,heightM:100000,rotation:0}};
  saveProject(storage,{name:'Bodensee',settings:square},firstDate);
  assert.deepEqual(readProjects(storage)[0].settings,square);
  assert.throws(()=>saveProject(storage,{name:'Model complet',settings:{...square,pureRelief:false}}),/no és vàlida/);
});

test('saved projects store pure relief assignments separately from landscape materials',()=>{
  const storage=memoryStorage();
  const reliefMaterials={count:3,assignments:[0,0,2,1,2,1]};
  const mixed={...settings,pureRelief:true,reliefMaterials};
  saveProject(storage,{name:'Relleu amb tres filaments',settings:mixed},firstDate);
  assert.deepEqual(readProjects(storage)[0].settings,mixed);
  assert.throws(()=>saveProject(storage,{name:'Invàlid',settings:{...mixed,
    reliefMaterials:{...reliefMaterials,count:7}}}),/no és vàlida/);
});

test('older projects use the default trail width and texture controls, and new choices persist',()=>{
  const storage=memoryStorage(),{trailWidth,vegetationHeight,vegetationNoise,...options}=settings.options;
  const old=saveProject(storage,{name:'Anterior',settings:{...settings,options}},firstDate);
  const stored=JSON.parse(storage.getItem(PROJECT_LIBRARY_KEY));
  delete stored.projects[0].settings.options.trailWidth;
  delete stored.projects[0].settings.options.vegetationHeight;
  delete stored.projects[0].settings.options.vegetationNoise;
  storage.setItem(PROJECT_LIBRARY_KEY,JSON.stringify(stored));
  const restored=readProjects(storage)[0].settings.options;
  assert.deepEqual([restored.trailWidth,restored.vegetationHeight,restored.vegetationNoise],[1,.8,45]);
  saveProject(storage,{id:old.id,name:old.name,settings},secondDate);
  const updated=readProjects(storage)[0].settings.options;
  assert.deepEqual([updated.trailWidth,updated.vegetationHeight,updated.vegetationNoise],[trailWidth,vegetationHeight,vegetationNoise]);
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

test('a catalog backup restores project identity, settings, and brush strokes on another browser',()=>{
  const source=memoryStorage(),destination=memoryStorage();
  const complete=saveProject(source,{name:'Vessant girat',settings},firstDate);
  const relief=saveProject(source,{name:'Relleu amb materials',settings:{...settings,pureRelief:true,
    reliefMaterials:{count:3,assignments:[0,0,2,1,2,1]}}},secondDate);
  const backup=exportProjectLibrary(source);
  assert.deepEqual(importProjectLibrary(destination,backup),{added:2,skipped:0});
  assert.deepEqual(readProjects(destination),[relief,complete]);
  assert.equal(exportProjectLibrary(destination),backup);
});

test('restoring merges into the catalog, keeps the local version, and can be retried',()=>{
  const source=memoryStorage(),destination=memoryStorage();
  const shared=saveProject(source,{name:'Original',settings},firstDate);
  importProjectLibrary(destination,exportProjectLibrary(source));
  const local=saveProject(destination,{id:shared.id,name:'Versió local',settings},secondDate);
  const other=saveProject(source,{name:local.name,settings},secondDate);
  const backup=exportProjectLibrary(source);
  assert.deepEqual(importProjectLibrary(destination,backup),{added:1,skipped:1});
  assert.deepEqual(readProjects(destination),[local,other]);
  assert.deepEqual(importProjectLibrary(destination,backup),{added:0,skipped:2});
  assert.deepEqual(readProjects(destination),[local,other]);
});

test('incompatible, corrupt, or oversized-for-storage backups do not partially replace a catalog',()=>{
  const source=memoryStorage(),destination=memoryStorage();
  const local=saveProject(destination,{name:'Local',settings},firstDate);
  saveProject(source,{name:'Primer',settings},firstDate);
  saveProject(source,{name:'Segon',settings},secondDate);
  const backup=exportProjectLibrary(source),data=JSON.parse(backup);
  const [first,second]=data.projects;
  for(const invalid of ['{',JSON.stringify({...data,format:'diagnostics'}),JSON.stringify({...data,version:2}),
    JSON.stringify({...data,projects:[first,first]}),
    JSON.stringify({...data,projects:[first,{...second,settings:{...settings,strokes:[null]}}]})]){
    assert.throws(()=>importProjectLibrary(destination,invalid),SyntaxError);
    assert.deepEqual(readProjects(destination),[local]);
  }
  const full={...destination,setItem(){throw new DOMException('quota','QuotaExceededError');}};
  assert.throws(()=>importProjectLibrary(full,backup),/prou espai/);
  assert.deepEqual(readProjects(destination),[local]);
});
