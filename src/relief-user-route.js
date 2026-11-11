import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {boundaryStrokePolygons} from './relief-boundary-style.js';
import {reliefStreamStrips} from './relief-streams.js';

export const MAX_GPX_BYTES=1_500_000;
export const USER_ROUTE_WIDTH_MM=1;
const MAX_POINTS=10_000,MAX_PATHS=256,MAX_NAME_LENGTH=120;
const array=value=>value==null?[]:Array.isArray(value)?value:[value];
const samePoint=(a,b)=>a[0]===b[0]&&a[1]===b[1];
const parser=new XMLParser({ignoreAttributes:false,ignoreDeclaration:true,ignorePiTags:true,
  removeNSPrefix:true,parseTagValue:false,processEntities:false});
const predefined={amp:'&',apos:"'",quot:'"',lt:'<',gt:'>'};
const readName=value=>{
  const text=typeof value==='string'?value:value?.['#text'];
  return typeof text==='string'?text.replace(/&(amp|apos|quot|lt|gt);/g,(_,key)=>predefined[key]).trim():'';
};

function validPoint(point){
  return Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&
    Math.abs(point[0])<=180&&Math.abs(point[1])<=90;
}

// Accept and detach the small JSON representation kept with saved projects.
export function normalizeUserRoute(route){
  if(route==null)return null;
  const {name,paths}=route;
  if(typeof name!=='string'||!name.trim()||name.length>MAX_NAME_LENGTH||
      !Array.isArray(paths)||!paths.length||paths.length>MAX_PATHS)
    throw Error('Les dades de la ruta GPX no són vàlides.');
  let count=0;
  const cleaned=Array.from(paths,path=>{
    if(!Array.isArray(path)||path.length<2)throw Error('Les dades de la ruta GPX no són vàlides.');
    count+=path.length;
    if(count>MAX_POINTS)throw Error('La ruta GPX supera el límit de 10.000 punts.');
    const points=Array.from(path,point=>{
      if(!validPoint(point))throw Error('La ruta GPX conté coordenades invàlides.');
      return point.slice();
    });
    if(points.every(point=>samePoint(point,points[0])))throw Error('Les dades de la ruta GPX no són vàlides.');
    return points;
  });
  return {name:name.trim(),paths:cleaned};
}

function gpxCoordinate(value){
  if(typeof value!=='string'||!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))return NaN;
  return Number(value);
}

export function parseUserRouteGPX(text,fallbackName='Ruta GPX'){
  if(typeof text!=='string'||!text.trim())throw Error('El fitxer GPX és buit.');
  if(text.length>MAX_GPX_BYTES||new TextEncoder().encode(text).byteLength>MAX_GPX_BYTES)
    throw Error('El fitxer GPX supera el límit d’1,5 MB.');
  if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('El fitxer GPX conté declaracions XML no admeses.');
  let document;
  try{
    if(XMLValidator.validate(text)!==true)throw Error();
    document=parser.parse(text);
    if(Object.keys(document).length!==1||!Object.hasOwn(document,'gpx')||Array.isArray(document.gpx))throw Error();
  }catch{
    throw Error('El fitxer no és un GPX vàlid.');
  }
  const {gpx}=document,tracks=array(gpx?.trk),routes=array(gpx?.rte);
  const sequences=[...tracks.flatMap(track=>array(track?.trkseg).map(segment=>array(segment?.trkpt))),
    ...routes.map(route=>array(route?.rtept))];
  if(sequences.length>MAX_PATHS)throw Error('La ruta GPX supera el límit de 256 trams.');
  const paths=[];
  let count=0;
  for(const sequence of sequences){
    count+=sequence.length;
    if(count>MAX_POINTS)throw Error('La ruta GPX supera el límit de 10.000 punts.');
    const path=[];
    for(const raw of sequence){
      const point=[gpxCoordinate(raw?.['@_lon']),gpxCoordinate(raw?.['@_lat'])];
      if(!validPoint(point))throw Error('La ruta GPX conté coordenades invàlides.');
      if(!path.length||!samePoint(point,path.at(-1)))path.push(point);
    }
    if(path.length>1)paths.push(path);
  }
  if(!paths.length)throw Error('El fitxer GPX no conté cap traçat amb almenys dos punts diferents.');
  const name=[gpx?.metadata?.name,gpx?.name,...tracks.map(track=>track?.name),...routes.map(route=>route?.name)]
    .map(readName).find(Boolean)||String(fallbackName??'').trim()||'Ruta GPX';
  return {name:name.slice(0,MAX_NAME_LENGTH),paths};
}

function antimeridianPaths(paths){
  const result=[];
  for(const path of paths){
    let fragment=[path[0]];
    for(const [index,point] of path.slice(1).entries()){
      const [lon,lat]=path[index],delta=point[0]-lon;
      if(Math.abs(delta)>180){
        const edge=lon>0?180:-180,wrappedDelta=delta+edge*2;
        const latitude=wrappedDelta?lat+(point[1]-lat)*(edge-lon)/wrappedDelta:point[1];
        fragment.push([edge,latitude]);result.push(fragment);
        fragment=[[-edge,latitude]];
      }
      fragment.push(point);
    }
    result.push(fragment);
  }
  return result;
}

export function prepareUserRouteStrips(route,project,{width,height,resolution},lineWidth=USER_ROUTE_WIDTH_MM){
  if(route==null)return [];
  if(!Number.isFinite(lineWidth)||lineWidth<.3||lineWidth>3)throw Error('L’amplada de la ruta GPX ha de ser entre 0,3 i 3 mm.');
  const {paths}=normalizeUserRoute(route);
  // The solid stroke clips to the projected crop before buffering. The normal
  // relief strips then keep the route on the same terrain across print cuts.
  const outlines=boundaryStrokePolygons(antimeridianPaths(paths),project,{width,height,style:'solid',lineWidth});
  const strips=reliefStreamStrips(outlines,width,height,resolution);
  return strips.some(column=>column.length)?strips:[];
}
