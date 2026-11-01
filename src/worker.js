import {buildModel,updateVegetation} from './geometry.js';
import {threeMF,stlZip} from './export.js';
import {groupMaterials} from './materials.js';
import {splitModel,tileArchive} from './mesh-tiles.js';
import Module from 'manifold-3d';
import wasmURL from 'manifold-3d/manifold.wasm?url';
import {printOptions} from './print-options.js';
let current,api;
const progress=message=>self.postMessage({type:'progress',message});
self.onmessage=async({data})=>{try{
  if(data.type==='import-dem'||data.type==='import-buildings'){
    const decoder=await import('./local-import.js'),value=data.type==='import-dem'?await decoder.importDEM(data.buffer,data.name):decoder.importBuildings(data.text,data.name);
    self.postMessage({type:'imported',kind:data.type,value},value.values?[value.values.buffer]:[]);return;
  }
  if(data.type==='build'||data.type==='vegetation'){current=data.type==='build'?buildModel(data.region,data.options,progress):updateVegetation(current,data.options,progress);self.postMessage({type:'model',model:current,vegetation:data.type==='vegetation'});}
  if(data.type==='export'){
    if(!current)throw Error('Genera primer el model.');const grouped=groupMaterials(current,data.materialCount,data.assignments),model={...grouped,provenance:{...grouped.provenance,printing:printOptions(data.printing)}};let bytes,archive=false;
    if(data.split&&(model.width>200||model.height>200)){progress('Preparant els talls de les peces…');if(!api){api=await Module({locateFile:()=>wasmURL});api.setup();}bytes=tileArchive(splitModel(model,api,200,progress),data.format);archive=true;}
    else bytes=data.format==='stl'?stlZip(model):threeMF(model,{bambu:data.format==='bambu'});
    self.postMessage({type:'download',format:data.format,archive,bytes},[bytes.buffer]);
  }
}catch(e){self.postMessage({type:'error',message:e.message,detail:e.stack});}};
