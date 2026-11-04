import {buildModel,updateVegetation,updateBuildings,updateTransport,previewBuildingLayer} from './geometry.js';
import {bambuPlateProject,threeMF,stlZip} from './export.js';
import {groupMaterials} from './materials.js';
import {splitModel,tileArchive} from './mesh-tiles.js';
import {splitPureRelief} from './pure-relief-mesh.js';
import {MAX_PRINT_TILE_MM} from './selection.js';
import Module from 'manifold-3d';
import wasmURL from 'manifold-3d/manifold.wasm?url';
import {createProcessingTiming} from './processing-timing.js';
let current,api;
const progress=message=>self.postMessage({type:'progress',message});
const BUILD_STAGES=['terrain','transport','buildings','vegetation'];
function buildObserver(timing,pureRelief){
  const stages=pureRelief?['terrain']:BUILD_STAGES;
  let stage='terrain',lastMessage,lastUpdate=-Infinity;
  const report=(next,message,completed,total)=>{
    timing.mark(next,message);
    const now=performance.now();
    if(next===stage&&message===lastMessage&&now-lastUpdate<150&&completed!==total)return;
    if(next===stage&&message===lastMessage&&completed==null&&total==null)return;
    stage=next;lastMessage=message;lastUpdate=now;
    self.postMessage({type:'build-progress',stage,step:stages.indexOf(stage)+1,totalSteps:stages.length,completed,total,message});
  };
  return {
    stage:report,
    progress:message=>report(stage,message),
    parts:(stage,parts,{width,height},mode='replace')=>{
      const categories=parts.filter(part=>part.faces.length);
      if(!pureRelief&&(categories.length||mode==='replace'))self.postMessage({type:'build-preview',stage,mode,categories,width,height});
    }
  };
}
self.onmessage=async({data})=>{
const timing=data.type==='build'||data.measureBuildings?createProcessingTiming():null;
try{
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
    const observer=data.type==='build'?buildObserver(timing,data.options.pureRelief):null;
    if(observer&&!data.options.pureRelief&&!api&&(data.options.surfaceRoads||data.options.estimatedTunnels||data.options.majorRoads||data.region.infrastructure?.items?.length||data.region.features?.some(f=>f.properties?.sourceLayer==='transportation'&&f.properties.brunnel==='bridge'))){timing.mark('initialization','Preparant el motor de geometria…');progress('Preparant el motor de geometria…');api=await Module({locateFile:()=>wasmURL});api.setup();}
    current=observer?buildModel(data.region,data.options,observer.progress,api,timing.detail,observer):updateVegetation(current,data.options,progress);self.postMessage({type:'model',model:{...current,parts:undefined,reliefGrid:undefined,categories:data.type==='vegetation'?current.categories.filter(p=>p.id==='trees'):current.categories},vegetation:data.type==='vegetation',timing:timing?.finish()});
  }
  if(data.type==='buildings'){
    const report=message=>{timing?.mark('buildings',message);progress(message);};
    current=updateBuildings(current,data.layer,data.options,report);
    self.postMessage({type:'model',model:{...current,parts:undefined,categories:current.categories.filter(p=>['buildings','trees','roads','railways'].includes(p.id))},buildings:true,timing:timing?.finish()});
  }
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
    if(!current)throw Error('Genera primer el model.');
    const model=groupMaterials(current,data.materialCount,data.assignments),format=data.format==='bambu-zip'?'bambu':data.format;
    let bytes,archive=false,plateCount;
    if(model.width>MAX_PRINT_TILE_MM||model.height>MAX_PRINT_TILE_MM){
      progress('Preparant els talls de les peces…');
      let pieces=model.reliefGrid&&splitPureRelief(model,MAX_PRINT_TILE_MM,progress);
      if(!pieces){
        if(!api){api=await Module({locateFile:()=>wasmURL});api.setup();}
        pieces=splitModel(model,api,MAX_PRINT_TILE_MM,progress);
      }
      if(data.format==='bambu'){
        progress('Preparant el projecte amb les plaques de Bambu Studio…');
        bytes=bambuPlateProject(model,pieces);plateCount=pieces.length;
      }else{
        bytes=tileArchive(pieces,format);archive=true;
      }
    }
    else bytes=format==='stl'?stlZip(model):threeMF(model,{bambu:format==='bambu'});
    self.postMessage({type:'download',format,archive,plateCount,bytes},[bytes.buffer]);
  }
}catch(e){self.postMessage({type:'error',message:e.message,detail:e.stack,timing:timing?.finish()});}};
