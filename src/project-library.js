import {normalizeAssignments} from './materials.js';
import {pieceDimensions} from './selection.js';
import {TRAIL_WIDTH_MULTIPLIERS} from './transport-width.js';

export const PROJECT_LIBRARY_KEY='relleu-obert.projects';
const VERSION=1;

const boolean=value=>typeof value==='boolean';
const range=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const oneOf=(...choices)=>value=>choices.includes(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const timestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));

const optionRules={
  detail:oneOf(24,36,56),streams:boolean,streamWidth:oneOf(1,1.5,2,3),
  exaggeration:value=>range(value,1,3),roadRise:oneOf(0,.5,1),railRise:oneOf(0,.5,1),trailWidth:oneOf(...TRAIL_WIDTH_MULTIPLIERS),
  estimatedTunnels:boolean,majorRoads:boolean,buildingSource:oneOf('osm','osm3d','icgc','catastre'),
  buildingMode:oneOf('limited','source','flat','none'),maxBuildingHeight:value=>range(value,1,1200),
  trees:boolean,treeType:oneOf('mixed','round','tall'),brushDensity:value=>range(value,.25,2),
  brushRadius:value=>Number.isInteger(value)&&range(value,2,12),split:boolean,exportFormat:oneOf('bambu','bambu-zip','3mf','stl')
};

function validatedSettings(settings){
  const invalid=()=>Error('La configuració del projecte desat no és vàlida.');
  if(!object(settings)||!pieceDimensions(settings.sizePreset)||!boolean(settings.pureRelief)||
    !object(settings.pose)||!object(settings.materials)||!object(settings.options)||!Array.isArray(settings.strokes))
    throw invalid();
  const {sizePreset,pureRelief,pose,materials,options,strokes,placeName,exampleId}=settings;
  const {center,widthM,heightM,rotation}=pose,[width,height]=pieceDimensions(sizePreset);
  if(!Array.isArray(center)||center.length!==2||!range(center[0],-70,70)||!range(center[1],-180,180)||
    !range(widthM,0.001,width*100.001)||!range(heightM,0.001,height*100.001)||!range(rotation,-180,180)||
    placeName!=null&&!text(placeName,300)||exampleId!=null&&!text(exampleId,100))throw invalid();
  const cleanedOptions={};
  for(const [key,valid] of Object.entries(optionRules)){
    const value=key==='trailWidth'&&!Object.hasOwn(options,key)?1:options[key];
    if(!valid(value))throw invalid();
    cleanedOptions[key]=value;
  }
  if(!oneOf(1,2,4,8)(materials.count)||!Array.isArray(materials.assignments))throw invalid();
  let assignments;
  try{assignments=normalizeAssignments(materials.count,Array.from(materials.assignments));}
  catch{throw invalid();}
  const cleanedStrokes=Array.from(strokes,stroke=>{
    if(!object(stroke))throw invalid();
    const {mode,x,y,radius,gesture,density}=stroke;
    if(!oneOf('add','erase')(mode)||!range(x,-.01,width+.01)||!range(y,-.01,height+.01)||
      !range(radius,.001,30)||gesture!=null&&(!Number.isSafeInteger(gesture)||gesture<0)||
      density!=null&&!range(density,.25,5))throw invalid();
    return {mode,x,y,radius,...(gesture!=null?{gesture}:{}),...(density!=null?{density}:{})};
  });
  return {sizePreset,pureRelief,pose:{center:center.slice(),widthM,heightM,rotation},
    materials:{count:materials.count,assignments},options:cleanedOptions,strokes:cleanedStrokes,
    ...(placeName!=null?{placeName}:{}),...(exampleId!=null?{exampleId}:{})};
}

export function readProjects(storage){
  let raw;
  try{raw=storage.getItem(PROJECT_LIBRARY_KEY);}
  catch{throw Error('No es pot accedir a la galeria local en aquest navegador.');}
  if(raw===null)return [];
  try{
    const data=JSON.parse(raw);
    if(!object(data)||data.version!==VERSION||!Array.isArray(data.projects))throw Error();
    const ids=new Set();
    return data.projects.map(project=>{
      if(!object(project)||!text(project.id,100)||ids.has(project.id)||!text(project.name,100)||
        !timestamp(project.createdAt)||!timestamp(project.updatedAt))throw Error();
      const {id,name,createdAt,updatedAt,settings}=project;
      ids.add(id);
      return {id,name,createdAt,updatedAt,settings:validatedSettings(settings)};
    });
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
