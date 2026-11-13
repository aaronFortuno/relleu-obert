import {validatedSettings} from './project-library.js';
import {CURATED_EXAMPLES} from './curated-examples.js';

const fragmentKey='#maqueta=';
const exampleKey='#exemple=';
const version='1.';
const maxEncodedLength=2048;

export const isSharedLink=hash=>hash.startsWith(fragmentKey)||hash.startsWith(exampleKey);

function linkURL(address,fragment){
  const url=new URL(address);
  url.search='';
  url.hash=fragment;
  return url.href;
}

export function exampleLink(address,id){
  const fragment=exampleKey+id;
  readExampleLink(fragment);
  return linkURL(address,fragment);
}

export function readExampleLink(hash){
  if(!hash.startsWith(exampleKey))return null;
  const id=hash.slice(exampleKey.length);
  const example=CURATED_EXAMPLES.find(item=>item.id===id);
  if(!example)throw Error('Unknown gallery example');
  return example;
}

function shareableSettings({sizePreset,pose,pureRelief,materials,reliefMaterials,options,print,exampleId,mapZoom}){
  if(!Number.isFinite(mapZoom)||mapZoom<4||mapZoom>18)throw Error('Invalid map zoom');
  // Start with an explicit list so a saved project cannot leak its name or annotations.
  const {strokes,...settings}=validatedSettings({
    sizePreset,pose,pureRelief,materials,reliefMaterials,options,print,exampleId,strokes:[]
  });
  return {...settings,mapZoom};
}

export function projectLink(address,configuration){
  const json=JSON.stringify(shareableSettings(configuration));
  const token=btoa(String.fromCharCode(...new TextEncoder().encode(json))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  if(token.length>maxEncodedLength)throw Error('Project link too long');
  return linkURL(address,fragmentKey+version+token);
}

export function readProjectLink(hash){
  if(!hash.startsWith(fragmentKey))return null;
  const value=hash.slice(fragmentKey.length);
  if(!value.startsWith(version))throw Error('Unsupported project link version');
  const token=value.slice(version.length);
  if(token.length>maxEncodedLength||!/^[A-Za-z0-9_-]+$/.test(token))throw Error('Invalid project link');
  const bytes=Uint8Array.from(atob(token.replaceAll('-','+').replaceAll('_','/')),char=>char.charCodeAt(0));
  const json=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  return {...shareableSettings(JSON.parse(json)),strokes:[]};
}
