import {normalizeAssignments,normalizeReliefAssignments} from './materials.js';
import {normalizeUserRoute} from './relief-user-route.js';
import {normalizeReliefPins} from './relief-pin-placement.js';
import {pieceDimensions,isPanoramicSize,validPrintCuts,PURE_SCALE_RANGE,PANORAMIC_SCALE_RANGE} from './selection.js';
import {validBaseThickness} from './print-settings.js';
import {TRAIL_WIDTH_MULTIPLIERS} from './transport-width.js';
import {RELIEF_VEGETATION_DEFAULTS,validVegetationHeight,validVegetationNoise} from './relief-vegetation-options.js';
import {validHistoricalChoice} from './historical-layers.js';
import {MAX_RELIEF_TRAIL_STROKES,RELIEF_TRAIL_WIDTH_MM,validReliefTrailWidth} from './relief-trails.js';
import {BOUNDARY_LEVELS,BOUNDARY_STYLES,BOUNDARY_SAMPLES,DEFAULT_BOUNDARY_WIDTHS,
  defaultBoundaryStyles,boundaryPattern,validBoundaryWidth} from './relief-boundary-options.js';

export const PROJECT_LIBRARY_KEY='relleu-obert.projects';
const VERSION=1;

const boolean=value=>typeof value==='boolean';
const range=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const oneOf=(...choices)=>value=>choices.includes(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const timestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));

const optionRules={
  detail:oneOf(24,36,56),streams:boolean,streamWidth:oneOf(0,1,1.5,2,3),reliefTrails:boolean,reliefTrailWidth:validReliefTrailWidth,
  exaggeration:value=>range(value,1,3),roadRise:oneOf(0,.5,1),railRise:oneOf(0,.5,1),trailWidth:oneOf(...TRAIL_WIDTH_MULTIPLIERS),
  estimatedTunnels:boolean,majorRoads:boolean,buildingSource:oneOf('osm','osm3d','icgc','catastre'),
  buildingMode:oneOf('limited','source','flat','none'),maxBuildingHeight:value=>range(value,1,1200),
  trees:boolean,treeType:oneOf('mixed','round','tall'),brushDensity:value=>range(value,.25,2),
  vegetationHeight:validVegetationHeight,vegetationNoise:validVegetationNoise,
  brushRadius:value=>Number.isInteger(value)&&range(value,2,12),split:boolean,exportFormat:oneOf('bambu','bambu-zip','3mf','stl')
};
const optionDefaults={trailWidth:1,reliefTrails:false,reliefTrailWidth:RELIEF_TRAIL_WIDTH_MM,...RELIEF_VEGETATION_DEFAULTS};

function validatedSettings(settings){
  const invalid=()=>Error('La configuració del projecte desat no és vàlida.');
  if(!object(settings)||!pieceDimensions(settings.sizePreset)||!boolean(settings.pureRelief)||
    !object(settings.pose)||!object(settings.materials)||!object(settings.options)||!Array.isArray(settings.strokes))
    throw invalid();
  const {sizePreset,pureRelief,pose,materials,reliefMaterials,options,strokes,trailStrokes,drawnRouteStrokes,userRoute,pins,print,historical,placeName,exampleId}=settings;
  const {center,widthM,heightM,rotation}=pose,[width,height]=pieceDimensions(sizePreset);
  const panoramic=isPanoramicSize(width,height);
  const [minScale,maxScale]=panoramic?PANORAMIC_SCALE_RANGE:[0,pureRelief?PURE_SCALE_RANGE[1]:100000];
  const validSpan=(metres,mm)=>range(metres,Math.max(.001,mm*(minScale-1)/1000),mm*(maxScale+1)/1000);
  if(panoramic&&!pureRelief)throw invalid();
  if(historical!==undefined&&(pureRelief||!validHistoricalChoice(historical)))throw invalid();
  if(print!==undefined&&(!object(print)||!validBaseThickness(print.baseThickness)||!validPrintCuts(print.cuts,width,height)))throw invalid();
  if(!Array.isArray(center)||center.length!==2||!range(center[0],-70,70)||!range(center[1],-180,180)||
    !validSpan(widthM,width)||!validSpan(heightM,height)||!range(rotation,-180,180)||
    placeName!=null&&!text(placeName,300)||exampleId!=null&&!text(exampleId,100))throw invalid();
  const cleanedOptions={};
  for(const [key,valid] of Object.entries(optionRules)){
    const value=Object.hasOwn(options,key)?options[key]:optionDefaults[key];
    if(!valid(value))throw invalid();
    cleanedOptions[key]=value;
  }
  const boundaryStyles=options.boundaryStyles??defaultBoundaryStyles();
  if(!object(boundaryStyles)||!BOUNDARY_LEVELS.every(level=>BOUNDARY_STYLES.includes(boundaryStyles[level])))throw invalid();
  cleanedOptions.boundaryStyles=Object.fromEntries(BOUNDARY_LEVELS.map(level=>[level,boundaryStyles[level]]));
  const {boundaryPatterns,boundaryWidths=DEFAULT_BOUNDARY_WIDTHS}=options;
  if(boundaryPatterns!==undefined&&(!object(boundaryPatterns)||
    !BOUNDARY_LEVELS.every(level=>Object.hasOwn(BOUNDARY_SAMPLES,boundaryPatterns[level]))))throw invalid();
  if(!object(boundaryWidths)||!BOUNDARY_LEVELS.every(level=>validBoundaryWidth(boundaryWidths[level])))throw invalid();
  cleanedOptions.boundaryPatterns=Object.fromEntries(BOUNDARY_LEVELS.map(level=>[level,boundaryPattern(level,boundaryStyles,boundaryPatterns)]));
  cleanedOptions.boundaryWidths=Object.fromEntries(BOUNDARY_LEVELS.map(level=>[level,boundaryWidths[level]]));
  if(!oneOf(1,2,4,8)(materials.count)||!Array.isArray(materials.assignments))throw invalid();
  let assignments,cleanedReliefMaterials;
  try{
    assignments=normalizeAssignments(materials.count,Array.from(materials.assignments));
    if(reliefMaterials!==undefined){
      if(!object(reliefMaterials)||!Array.isArray(reliefMaterials.assignments))throw invalid();
      cleanedReliefMaterials={count:reliefMaterials.count,
        assignments:normalizeReliefAssignments(reliefMaterials.count,reliefMaterials.assignments)};
    }
  }
  catch{throw invalid();}
  const cleanedStrokes=Array.from(strokes,stroke=>{
    if(!object(stroke))throw invalid();
    const {mode,x,y,radius,gesture,density}=stroke;
    if(!oneOf('add','erase')(mode)||!range(x,-.01,width+.01)||!range(y,-.01,height+.01)||
      !range(radius,.001,30)||gesture!=null&&(!Number.isSafeInteger(gesture)||gesture<0)||
      density!=null&&!range(density,.25,5))throw invalid();
    return {mode,x,y,radius,...(gesture!=null?{gesture}:{}),...(density!=null?{density}:{})};
  });
  function cleanLineStrokes(lineStrokes){
    if(lineStrokes===undefined)return undefined;
    if(!pureRelief||!Array.isArray(lineStrokes)||lineStrokes.length>MAX_RELIEF_TRAIL_STROKES)throw invalid();
    return Array.from(lineStrokes,stroke=>{
      if(!object(stroke))throw invalid();
      const {mode,x,y,radius,gesture,breakBefore}=stroke;
      if(!oneOf('add','erase')(mode)||!range(x,-.01,width+.01)||!range(y,-.01,height+.01)||
        !range(radius,.001,30)||!Number.isSafeInteger(gesture)||gesture<0||
        breakBefore!==undefined&&!boolean(breakBefore))throw invalid();
      return {mode,x,y,radius,gesture,...(breakBefore?{breakBefore:true}:{})};
    });
  }
  const cleanedTrails=cleanLineStrokes(trailStrokes),cleanedDrawnRoute=cleanLineStrokes(drawnRouteStrokes);
  let cleanedRoute,cleanedPins;
  try{
    if(!pureRelief&&(userRoute!=null||pins!==undefined))throw invalid();
    cleanedRoute=normalizeUserRoute(userRoute);
    if(pins!==undefined)cleanedPins=normalizeReliefPins(pins);
  }catch{throw invalid();}
  return {sizePreset,pureRelief,pose:{center:center.slice(),widthM,heightM,rotation},
    materials:{count:materials.count,assignments},options:cleanedOptions,strokes:cleanedStrokes,
    ...(cleanedTrails?{trailStrokes:cleanedTrails}:{}),
    ...(cleanedDrawnRoute?{drawnRouteStrokes:cleanedDrawnRoute}:{}),
    ...(cleanedRoute?{userRoute:cleanedRoute}:{}),...(cleanedPins?.length?{pins:cleanedPins}:{}),
    ...(print?{print:{baseThickness:print.baseThickness,cuts:Object.fromEntries(
      ['columns','rows'].filter(key=>print.cuts[key]!==undefined).map(key=>[key,[...print.cuts[key]]]))}}:{}),
    ...(cleanedReliefMaterials?{reliefMaterials:cleanedReliefMaterials}:{}),
    ...(historical?{historical:{areaId:historical.areaId,year:historical.year}}:{}),
    ...(placeName!=null?{placeName}:{}),...(exampleId!=null?{exampleId}:{})};
}

function validatedProjects(data){
  if(!object(data)||data.version!==VERSION||!Array.isArray(data.projects))throw Error();
  const ids=new Set();
  return data.projects.map(project=>{
    if(!object(project)||!text(project.id,100)||ids.has(project.id)||!text(project.name,100)||
      !timestamp(project.createdAt)||!timestamp(project.updatedAt))throw Error();
    const {id,name,createdAt,updatedAt,settings}=project;
    ids.add(id);
    return {id,name,createdAt,updatedAt,settings:validatedSettings(settings)};
  });
}

export function readProjects(storage){
  let raw;
  try{raw=storage.getItem(PROJECT_LIBRARY_KEY);}
  catch{throw Error('No es pot accedir a la galeria local en aquest navegador.');}
  if(raw===null)return [];
  try{
    return validatedProjects(JSON.parse(raw));
  }catch{
    throw Error('La galeria local conté dades que aquesta versió no pot llegir.');
  }
}

function writeProjects(storage,projects){
  try{storage.setItem(PROJECT_LIBRARY_KEY,JSON.stringify({version:VERSION,projects}));}
  catch(error){
    if(error?.name==='QuotaExceededError')throw Error('No hi ha prou espai al navegador per desar el projecte.');
    throw Error('No s’ha pogut actualitzar la galeria local.');
  }
}

export function exportProjectLibrary(storage){
  return JSON.stringify({format:PROJECT_LIBRARY_KEY,version:VERSION,projects:readProjects(storage)})+'\n';
}

export function importProjectLibrary(storage,json){
  let incoming;
  try{
    const backup=JSON.parse(json);
    if(backup?.format!==PROJECT_LIBRARY_KEY)throw Error();
    incoming=validatedProjects(backup);
  }catch{
    throw new SyntaxError('Còpia del catàleg incompatible.');
  }
  const projects=readProjects(storage);
  const ids=new Set(projects.map(project=>project.id));
  const added=incoming.filter(project=>!ids.has(project.id));
  if(added.length)writeProjects(storage,[...projects,...added]);
  return {added:added.length,skipped:incoming.length-added.length};
}

export function saveProject(storage,{id,name,settings},now=new Date()){
  name=typeof name==='string'?name.trim():'';
  if(!text(name,100))throw Error('Escriu un nom de projecte d’entre 1 i 100 caràcters.');
  const projects=readProjects(storage);
  const existing=id==null?null:projects.find(project=>project.id===id);
  if(id!=null&&!existing)throw Error('El projecte ja no existeix a la galeria.');
  const updatedAt=now.toISOString();
  const project={id:existing?.id??crypto.randomUUID(),name,createdAt:existing?.createdAt??updatedAt,
    updatedAt,settings:validatedSettings(settings)};
  writeProjects(storage,[project,...projects.filter(item=>item.id!==project.id)]);
  return project;
}

export function deleteProject(storage,id){
  const projects=readProjects(storage),remaining=projects.filter(project=>project.id!==id);
  if(remaining.length===projects.length)return false;
  writeProjects(storage,remaining);
  return true;
}
