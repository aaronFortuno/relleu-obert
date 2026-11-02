import {buildModel,updateVegetation,updateBuildings} from './geometry.js';
import {threeMF,stlZip} from './export.js';
import {groupMaterials} from './materials.js';
import {splitModel,tileArchive} from './mesh-tiles.js';
import Module from 'manifold-3d';
import wasmURL from 'manifold-3d/manifold.wasm?url';
let current,api;
const progress=message=>self.postMessage({type:'progress',message});
self.onmessage=async({data})=>{try{
  if(data.type==='import-dem'||data.type==='import-buildings'){
    const decoder=await import('./local-import.js'),value=data.type==='import-dem'?await decoder.importDEM(data.buffer,data.name):decoder.importBuildings(data.text,data.name);
    self.postMessage({type:'imported',kind:data.type,value},value.values?[value.values.buffer]:[]);return;
  }
  if(data.type==='build'||data.type==='vegetation'){
    if(data.type==='build'&&!api&&(data.region.infrastructure?.items?.length||data.region.features?.some(f=>f.properties?.sourceLayer==='transportation'&&f.properties.brunnel==='bridge'))){progress('Preparant les unions dels viaductes…');api=await Module({locateFile:()=>wasmURL});api.setup();}
    current=data.type==='build'?buildModel(data.region,data.options,progress,api):updateVegetation(current,data.options,progress);self.postMessage({type:'model',model:{...current,parts:undefined,categories:data.type==='vegetation'?current.categories.filter(p=>p.id==='trees'):current.categories},vegetation:data.type==='vegetation'});
  }
  if(data.type==='buildings'){current=updateBuildings(current,data.layer,data.options,progress);self.postMessage({type:'model',model:{...current,parts:undefined,categories:current.categories.filter(p=>['buildings','trees','roads'].includes(p.id))},buildings:true});}
  if(data.type==='accessory'){
    if(!current)throw Error('Genera primer el model.');
    if(data.kind!=='marc'&&!api){api=await Module({locateFile:()=>wasmURL});api.setup();}
    const {accessoryArchive}=await import('./accessory-export.js'),{bytes}=accessoryArchive(data.kind,current,data.options,api);
    self.postMessage({type:'download',format:'accessory',archive:true,accessory:data.kind,filename:'relleu-obert-'+data.kind+'.zip',bytes},[bytes.buffer]);return;
  }
  if(data.type==='export'){
    if(!current)throw Error('Genera primer el model.');const model=groupMaterials(current,data.materialCount,data.assignments);let bytes,archive=false;
    if(data.split&&(model.width>200||model.height>200)){progress('Preparant els talls de les peces…');if(!api){api=await Module({locateFile:()=>wasmURL});api.setup();}bytes=tileArchive(splitModel(model,api,200,progress),data.format);archive=true;}
    else bytes=data.format==='stl'?stlZip(model):threeMF(model,{bambu:data.format==='bambu'});
    self.postMessage({type:'download',format:data.format,archive,bytes},[bytes.buffer]);
  }
}catch(e){self.postMessage({type:'error',message:e.message,detail:e.stack});}};
