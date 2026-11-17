import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECT_LIBRARY_KEY,deleteProject,exportProjectLibrary,importProjectLibrary,readProjects,saveProject} from '../src/project-library.js';
import {defaultAssignments} from '../src/materials.js';
import {defaultBoundaryStyles,DEFAULT_BOUNDARY_PATTERNS,DEFAULT_BOUNDARY_WIDTHS} from '../src/relief-boundary-options.js';
import {exampleLink,isSharedLink,projectLink,readExampleLink,readProjectLink} from '../src/project-link.js';

const settings={
  sizePreset:'15x20',pose:{center:[42.165671,1.751211],widthM:3000,heightM:4000,rotation:-37.5},pureRelief:false,
  materials:{count:4,assignments:defaultAssignments(4)},strokes:[
    {mode:'add',x:20,y:40,radius:5,gesture:1,density:.5},
    {mode:'erase',x:70,y:90,radius:8,gesture:2,density:1}
  ],
  options:{detail:36,streams:true,streamWidth:1.5,reliefTrails:false,reliefTrailWidth:.42,boundaryStyles:defaultBoundaryStyles(),exaggeration:1.5,roadRise:.5,railRise:1,trailWidth:1.5,
    boundaryPatterns:DEFAULT_BOUNDARY_PATTERNS,boundaryWidths:DEFAULT_BOUNDARY_WIDTHS,
    estimatedTunnels:true,majorRoads:true,buildingSource:'catastre',buildingMode:'limited',maxBuildingHeight:5,
    trees:true,treeType:'mixed',brushDensity:.5,brushRadius:5,vegetationHeight:1.3,vegetationNoise:65,split:false,exportFormat:'bambu'},
  placeName:'Rasos de Peguera'
};
function memoryStorage(){
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}
const firstDate=new Date('2026-11-03T12:00:00Z'),secondDate=new Date('2026-11-03T12:01:00Z');
const fences=[
  {points:[[1.75,42.16],[1.751,42.16],[1.751,42.161]],widthMM:1,heightMM:2,closed:false},
  {points:[[1.752,42.164],[1.753,42.164],[1.753,42.165]],widthMM:1.2,heightMM:3,closed:true}
];
const horizontalSurfaces=[
  {points:[[1.75,42.16],[1.751,42.16],[1.751,42.161]],reference:'mean',offsetMM:0,material:'roads'},
  {points:[[1.752,42.164],[1.753,42.164],[1.753,42.165]],reference:'min',offsetMM:1.25,material:'grass'}
];
const objects=[{shape:'cylinder',position:[1.75,42.16],widthMM:4,depthMM:6,heightMM:8,rotation:45}];

test('objects preserve editable geographic anchors and dimensions in local backups',()=>{
  const source=memoryStorage(),target=memoryStorage();
  const saved=saveProject(source,{name:'Objectes',settings:{...settings,objects}},firstDate);
  assert.deepEqual(saved.settings.objects,objects);
  saved.settings.objects[0].position[0]=0;
  assert.deepEqual(readProjects(source)[0].settings.objects,objects);
  importProjectLibrary(target,exportProjectLibrary(source));
  assert.deepEqual(readProjects(target)[0].settings.objects,objects);
  const pure=saveProject(source,{name:'Mode canviat',settings:{...settings,pureRelief:true,objects}},secondDate);
  assert.deepEqual(pure.settings.objects,objects);
  const before=exportProjectLibrary(source);
  assert.throws(()=>saveProject(source,{name:'Invàlid',settings:{...settings,objects:[{...objects[0],heightMM:-2}]}},secondDate));
  assert.equal(exportProjectLibrary(source),before);
});

test('project links preserve the crop and print settings while dropping private annotations',()=>{
  const {placeName,strokes,...publicSettings}=settings;
  const shared={...publicSettings,pureRelief:true,mapZoom:10.625,
    exampleId:'example',sizePreset:'100x20',
    pose:{center:[42.165671234567,1.751211234567],widthM:150000,heightM:30000,rotation:-37.5},
    reliefMaterials:{count:2,assignments:[0,1,0,1,0,1,0,0,1]},
    print:{baseThickness:7,cuts:{columns:[210,220,230,240,100],rows:[200]}}};
  const url=new URL(projectLink('https://example.test/relleu-obert/?debug=1#old',{
    ...shared,placeName,strokes,trailStrokes:strokes,drawnRouteStrokes:strokes,userRoute:{name:'private'},pins:[{id:1}],fences,horizontalSurfaces,objects
  }));
  assert.equal(url.pathname,'/relleu-obert/');
  assert.equal(url.search,'');
  assert.match(url.hash,/^#maqueta=1\.[A-Za-z0-9_-]+$/);
  assert.equal(isSharedLink(url.hash),true);
  assert.deepEqual(readProjectLink(url.hash),{...shared,strokes:[]});
});

test('gallery links resolve a public example and keep the application path',()=>{
  const url=new URL(exampleLink('https://example.test/relleu-obert/?debug=1#old','tamariu'));
  assert.equal(url.href,'https://example.test/relleu-obert/#exemple=tamariu');
  assert.equal(isSharedLink(url.hash),true);
  assert.equal(isSharedLink('#about'),false);
  assert.equal(readExampleLink(url.hash).id,'tamariu');
  assert.equal(readExampleLink('#maqueta=1.invalid'),null);
  assert.equal(readProjectLink(url.hash),null);
  assert.throws(()=>readExampleLink('#exemple=private-project'));
  assert.throws(()=>exampleLink(url.href,'../tamariu'));
});

test('unknown, oversized and malformed links fail before settings are used',()=>{
  assert.equal(readProjectLink('#about'),null);
  for(const hash of ['#maqueta=2.eyJ9','#maqueta=1.','#maqueta=1.%3D',
    '#maqueta=1.'+'A'.repeat(2049),'#maqueta=1.e30']){
    assert.throws(()=>readProjectLink(hash));
  }
  assert.throws(()=>projectLink('https://example.test/',{...settings,mapZoom:19}));
  assert.throws(()=>projectLink('https://example.test/',{...settings,mapZoom:15,pose:{...settings.pose,rotation:900}}));
});

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
    options:{...settings.options,streamWidth:0,split:true},strokes:[]};
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

test('trail brush edits and width travel with a pure relief project backup',()=>{
  const from=memoryStorage(),to=memoryStorage();
  const trailStrokes=[
    {mode:'add',x:25,y:30,radius:.5,gesture:1},
    {mode:'add',x:125,y:30,radius:.5,gesture:1,breakBefore:true},
    {mode:'erase',x:25,y:30,radius:3,gesture:2}
  ];
  const relief={...settings,pureRelief:true,trailStrokes,options:{...settings.options,reliefTrails:true,reliefTrailWidth:1}};
  saveProject(from,{name:'Camins editats',settings:relief},firstDate);
  importProjectLibrary(to,exportProjectLibrary(from));
  const restored=readProjects(to)[0].settings;
  assert.deepEqual(restored.trailStrokes,trailStrokes);
  assert.equal(restored.drawnRouteStrokes,undefined);
  assert.equal(restored.options.reliefTrailWidth,1);
  assert.throws(()=>saveProject(from,{name:'Error',settings:{...relief,trailStrokes:[{...trailStrokes[0],x:200}]}}),/no és vàlida/);
  assert.throws(()=>saveProject(from,{name:'Error',settings:{...relief,options:{...relief.options,reliefTrailWidth:4}}}),/no és vàlida/);
});

test('saved projects store pure relief assignments separately from landscape materials',()=>{
  const storage=memoryStorage();
  const reliefMaterials={count:3,assignments:[0,0,2,1,2,1]};
  const mixed={...settings,pureRelief:true,reliefMaterials,options:{...settings.options,reliefTrails:true,
    boundaryStyles:{...defaultBoundaryStyles(),national:'dash-dot',county:'dotted'},
    boundaryPatterns:{...DEFAULT_BOUNDARY_PATTERNS,national:'dash-dot',county:'dotted'}}};
  saveProject(storage,{name:'Relleu amb tres filaments',settings:mixed},firstDate);
  assert.deepEqual(readProjects(storage)[0].settings,{...mixed,reliefMaterials:{count:3,assignments:[...reliefMaterials.assignments,2,2,1]}});
  assert.throws(()=>saveProject(storage,{name:'Invàlid',settings:{...mixed,
    reliefMaterials:{...reliefMaterials,count:7}}}),/no és vàlida/);
});

test('project backup restores distinct drawn and GPX routes and geographically anchored pin holes',()=>{
  const source=memoryStorage(),target=memoryStorage();
  const userRoute={name:'Ruta curta',paths:[[[1.75,42.16],[1.751,42.165]]]};
  const drawnRouteStrokes=[{mode:'add',x:25,y:30,radius:.5,gesture:1},{mode:'add',x:125,y:30,radius:.5,gesture:1}];
  const pins=[{lon:1.75,lat:42.16,depth:8,id:5},{lon:1.75,lat:42.165,depth:7}];
  const saved={...settings,pureRelief:true,drawnRouteStrokes,userRoute,pins};
  saveProject(source,{name:'Ruta i forats',settings:saved},firstDate);
  importProjectLibrary(target,exportProjectLibrary(source));
  assert.deepEqual(readProjects(target)[0].settings,saved);
  assert.throws(()=>saveProject(source,{name:'Forat invàlid',settings:{...saved,pins:[{...pins[0],depth:10}]}}));
  assert.throws(()=>saveProject(source,{name:'Forat duplicat',settings:{...saved,pins:[pins[0],{...pins[1],id:5}]}}));
  assert.throws(()=>saveProject(source,{name:'Identificador invàlid',settings:{...saved,pins:[{...pins[0],id:0}]}}));
  assert.throws(()=>saveProject(source,{name:'Ruta invàlida',settings:{...saved,drawnRouteStrokes:[{...drawnRouteStrokes[0],x:200}]}}));
  assert.throws(()=>saveProject(source,{name:'Mode invàlid',settings:{...settings,drawnRouteStrokes}}));
});

test('local projects keep geographically anchored fences through a mode change and a backup',()=>{
  const source=memoryStorage(),destination=memoryStorage(),input=structuredClone(fences);
  const project=saveProject(source,{name:'Institut',settings:{...settings,fences:input}},firstDate);
  assert.deepEqual(project.settings.fences,fences);
  input[0].points[0][0]=0;
  const complete=readProjects(source)[0];
  assert.deepEqual(complete.settings.fences,fences);
  const relief=saveProject(source,
    {id:complete.id,name:complete.name,settings:{...complete.settings,pureRelief:true}},secondDate);
  assert.deepEqual(importProjectLibrary(destination,exportProjectLibrary(source)),{added:1,skipped:0});
  assert.deepEqual(readProjects(destination),[relief]);
  assert.deepEqual(relief.settings.fences,fences);
  assert.deepEqual(saveProject(destination,{name:'Sense tanques',settings:{...settings,fences:[]}}).settings,settings);
});

test('malformed fence records cannot overwrite the local project catalog',()=>{
  const storage=memoryStorage();
  saveProject(storage,{name:'Institut',settings:{...settings,fences}},firstDate);
  const backup=exportProjectLibrary(storage);
  for(const fence of [{...fences[0],widthMM:-1},{...fences[0],heightMM:'2'},
    {...fences[0],points:[[181,42],[1.751,42]]},{...fences[1],points:fences[1].points.slice(0,2)}]){
    const invalid={...settings,fences:[fence]},damaged=JSON.parse(backup);
    damaged.projects[0].settings=invalid;
    assert.throws(()=>saveProject(storage,{name:'Tanca invàlida',settings:invalid}),/no és vàlida/);
    assert.throws(()=>importProjectLibrary(storage,JSON.stringify(damaged)),SyntaxError);
    assert.equal(exportProjectLibrary(storage),backup);
  }
});

test('horizontal surfaces retain their geographic footprint, selected levels and materials in backups',()=>{
  const source=memoryStorage(),destination=memoryStorage(),input=structuredClone(horizontalSurfaces);
  const project=saveProject(source,{name:'Pati',settings:{...settings,horizontalSurfaces:input}},firstDate);
  assert.deepEqual(project.settings.horizontalSurfaces,horizontalSurfaces);
  input[0].points[0][0]=0;
  const complete=readProjects(source)[0];
  assert.deepEqual(complete.settings.horizontalSurfaces,horizontalSurfaces);
  const relief=saveProject(source,{
    id:complete.id,name:complete.name,settings:{...complete.settings,pureRelief:true}
  },secondDate);
  assert.deepEqual(importProjectLibrary(destination,exportProjectLibrary(source)),{added:1,skipped:0});
  assert.deepEqual(readProjects(destination),[relief]);
  assert.deepEqual(relief.settings.horizontalSurfaces,horizontalSurfaces);
  assert.deepEqual(saveProject(destination,{
    name:'Sense superfícies',settings:{...settings,horizontalSurfaces:[]}
  }).settings,settings);
});

test('invalid horizontal surface settings leave existing projects and backups intact',()=>{
  const storage=memoryStorage(),[surface]=horizontalSurfaces;
  saveProject(storage,{name:'Pati',settings:{...settings,horizontalSurfaces}},firstDate);
  const backup=exportProjectLibrary(storage);
  const malformed=[
    {...surface,reference:'manual'},{...surface,offsetMM:21},{...surface,offsetMM:'0'},
    {...surface,material:'buildings'},{...surface,points:surface.points.slice(0,2)},
    {...surface,points:[...surface.points,surface.points[0]]},
    {...surface,points:[[181,42],...surface.points.slice(1)]},
    {...surface,points:[[1.75,91],...surface.points.slice(1)]}
  ];
  for(const horizontalSurfaces of [...malformed.map(record=>[record]),Array(13).fill(surface)]){
    const invalid={...settings,horizontalSurfaces},damaged=JSON.parse(backup);
    damaged.projects[0].settings=invalid;
    assert.throws(()=>saveProject(storage,{name:'Superfície invàlida',settings:invalid}),/no és vàlida/);
    assert.throws(()=>importProjectLibrary(storage,JSON.stringify(damaged)),SyntaxError);
    assert.equal(exportProjectLibrary(storage),backup);
  }
});

test('older projects use the default trail width and texture controls, and new choices persist',()=>{
  const storage=memoryStorage(),{trailWidth,reliefTrails,vegetationHeight,vegetationNoise,...options}=settings.options;
  const old=saveProject(storage,{name:'Anterior',settings:{...settings,options}},firstDate);
  const stored=JSON.parse(storage.getItem(PROJECT_LIBRARY_KEY));
  delete stored.projects[0].settings.options.trailWidth;
  delete stored.projects[0].settings.options.reliefTrails;
  delete stored.projects[0].settings.options.boundaryStyles;
  delete stored.projects[0].settings.options.boundaryPatterns;
  delete stored.projects[0].settings.options.boundaryWidths;
  delete stored.projects[0].settings.options.vegetationHeight;
  delete stored.projects[0].settings.options.vegetationNoise;
  storage.setItem(PROJECT_LIBRARY_KEY,JSON.stringify(stored));
  const restored=readProjects(storage)[0].settings.options;
  assert.deepEqual([restored.trailWidth,restored.vegetationHeight,restored.vegetationNoise],[1,.8,45]);
  assert.equal(restored.reliefTrails,false);
  assert.deepEqual(restored.boundaryStyles,defaultBoundaryStyles());
  assert.deepEqual(restored.boundaryPatterns,DEFAULT_BOUNDARY_PATTERNS);
  assert.deepEqual(restored.boundaryWidths,DEFAULT_BOUNDARY_WIDTHS);
  saveProject(storage,{id:old.id,name:old.name,settings},secondDate);
  const updated=readProjects(storage)[0].settings.options;
  assert.deepEqual([updated.trailWidth,updated.vegetationHeight,updated.vegetationNoise],[trailWidth,vegetationHeight,vegetationNoise]);
});

test('boundary controls preserve an inactive level’s pattern and width, and migrate legacy active styles',()=>{
  const storage=memoryStorage(),boundaryStyles={...defaultBoundaryStyles(),national:'dashed'};
  const boundaryPatterns={...DEFAULT_BOUNDARY_PATTERNS,national:'dashed',municipality:'dotted'};
  const boundaryWidths={...DEFAULT_BOUNDARY_WIDTHS,municipality:2.2};
  const options={...settings.options,boundaryStyles,boundaryPatterns,boundaryWidths};
  saveProject(storage,{name:'Límits',settings:{...settings,pureRelief:true,options}},firstDate);
  assert.deepEqual(readProjects(storage)[0].settings.options,options);
  for(const width of [.1,12,'2.2',null]){
    assert.throws(()=>saveProject(storage,{name:'Invàlid',settings:{...settings,options:{...options,
      boundaryWidths:{...boundaryWidths,municipality:width}}}}),/no és vàlida/);
  }
  const stored=JSON.parse(storage.getItem(PROJECT_LIBRARY_KEY)),savedOptions=stored.projects[0].settings.options;
  delete savedOptions.boundaryPatterns;
  delete savedOptions.boundaryWidths;
  storage.setItem(PROJECT_LIBRARY_KEY,JSON.stringify(stored));
  const migrated=readProjects(storage)[0].settings.options;
  assert.deepEqual(migrated.boundaryStyles,boundaryStyles);
  assert.deepEqual(migrated.boundaryPatterns,{...DEFAULT_BOUNDARY_PATTERNS,national:'dashed'});
  assert.deepEqual(migrated.boundaryWidths,DEFAULT_BOUNDARY_WIDTHS);
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
