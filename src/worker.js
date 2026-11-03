import {buildModel,updateVegetation,updateBuildings,updateTransport,previewBuildingLayer} from './geometry.js';
import {threeMF,stlZip} from './export.js';
import {groupMaterials} from './materials.js';
import {splitModel,tileArchive} from './mesh-tiles.js';
import Module from 'manifold-3d';
import wasmURL from 'manifold-3d/manifold.wasm?url';
let current,api;
const progress=message=>self.postMessage({type:'progress',message});
const BUILD_STAGES=['terrain','transport','buildings','vegetation'];
function buildObserver(){
  let stage='terrain',lastMessage,lastUpdate=-Infinity;
  const report=(next,message,completed,total)=>{
    const now=performance.now();
    if(next===stage&&message===lastMessage&&now-lastUpdate<150&&completed!==total)return;
    if(next===stage&&message===lastMessage&&completed==null&&total==null)return;
    stage=next;lastMessage=message;lastUpdate=now;
    self.postMessage({type:'build-progress',stage,step:BUILD_STAGES.indexOf(stage)+1,totalSteps:BUILD_STAGES.length,completed,total,message});
  };
  return {
    stage:report,
    progress:message=>report(stage,message),
    parts:(stage,parts,{width,height},mode='replace')=>{
      const categories=parts.filter(part=>part.faces.length);
      if(categories.length||mode==='replace')self.postMessage({type:'build-preview',stage,mode,categories,width,height});
    }
  };
}
self.onmessage=async({data})=>{try{
  if(data.type==='preview-buildings'){
    let part;
    try{part=previewBuildingLayer(current,data.features,data.options);}
    catch{ /* A preview failure leaves the previous layer visible. */ }
    self.postMessage({type:'building-preview',id:data.id,completed:data.completed,total:data.total,part});
    return;
  }
  if(data.type==='import-dem'||data.type==='import-buildings'){
    const decoder=await import('./local-import.js'),value=data.type==='import-dem'?await decoder.importDEM(data.buffer,data.name):decoder.importBuildings(data.text,data.name);
    self.postMessage({type:'imported',kind:data.type,value},value.values?[value.values.buffer]:[]);return;
  }
  if(data.type==='build'||data.type==='vegetation'){
    const observer=data.type==='build'?buildObserver():null;
    if(observer&&!api&&(data.options.estimatedTunnels||data.options.majorRoads||data.region.infrastructure?.items?.length||data.region.features?.some(f=>f.properties?.sourceLayer==='transportation'&&f.properties.brunnel==='bridge'))){observer.progress('Preparant el motor de geometria…');api=await Module({locateFile:()=>wasmURL});api.setup();}
    current=observer?buildModel(data.region,data.options,observer.progress,api,null,observer):updateVegetation(current,data.options,progress);self.postMessage({type:'model',model:{...current,parts:undefined,categories:data.type==='vegetation'?current.categories.filter(p=>p.id==='trees'):current.categories},vegetation:data.type==='vegetation'});
  }
  if(data.type==='buildings'){current=updateBuildings(current,data.layer,data.options,progress);self.postMessage({type:'model',model:{...current,parts:undefined,categories:current.categories.filter(p=>['buildings','trees','roads','railways'].includes(p.id))},buildings:true});}
  if(data.type==='transport'){
    if(!api&&(data.options.estimatedTunnels||data.options.majorRoads)){
      progress('Preparant les infraestructures…');
      api=await Module({locateFile:()=>wasmURL});api.setup();
    }
    const next=updateTransport(current,data.options,progress,api);
    const changedCategories=new Set();
    for(const part of current.categories)if(!next.categories.includes(part))changedCategories.add(part.id);
    for(const part of next.categories)if(!current.categories.includes(part))changedCategories.add(part.id);
    current=next;
    self.postMessage({type:'model',model:{...current,parts:undefined,categories:current.categories.filter(p=>changedCategories.has(p.id))},changedCategories:[...changedCategories]});
  }
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
