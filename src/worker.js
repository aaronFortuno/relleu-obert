import {buildModel,updatePureRelief,updateVegetation,updateBuildings,updateTransport,previewBuildingLayer} from './geometry.js';
import {bambuPlateProject,threeMF,stlZip} from './export.js';
import {groupMaterials,groupReliefMaterials} from './materials.js';
import {splitModel,tileArchive} from './mesh-tiles.js';
import {splitPureRelief} from './pure-relief-mesh.js';
import {MAX_PRINT_TILE_MM,isPanoramicSize,tilePlan,validPrintCuts} from './selection.js';
import {printExportFormat} from './print-settings.js';
import {previewPieces} from './preview-pieces.js';
import {locateReliefPins} from './relief-pin-placement.js';
import {applyReliefPinHoles} from './relief-pin-holes.js';
import Module from 'manifold-3d';
import wasmURL from 'manifold-3d/manifold.wasm?url';
import {createProcessingTiming} from './processing-timing.js';
let current,api;
const progress=message=>self.postMessage({type:'progress',message});
const pinFailures={
  edge:'massa a prop d’una vora o d’un tall',overlap:'massa a prop d’un altre forat',
  'no-surface':'sense superfície', 'thin-base':'gruix insuficient',unsupported:'suport insuficient'
};
function perforatePiece(piece,pins){
  if(!pins?.length)return piece;
  const {piece:drilled,rejected}=applyReliefPinHoles(piece,pins,api);
  if(rejected.length){
    const {pin,reason}=rejected[0];
    throw Error(`Forat ${pin.id} rebutjat: ${pinFailures[reason]??'geometria incompatible'}.`);
  }
  return {...drilled,categories:undefined};
}
const BUILD_STAGES=['terrain','transport','buildings','vegetation'];
function postChangedModel(next,flags={}){
  const changedCategories=new Set();
  for(const part of current.categories)if(!next.categories.includes(part))changedCategories.add(part.id);
  for(const part of next.categories)if(!current.categories.includes(part))changedCategories.add(part.id);
  current=next;
  const categories=current.categories.filter(part=>changedCategories.has(part.id));
  self.postMessage({type:'model',model:{...current,parts:undefined,reliefGrid:undefined,categories},
    changedCategories:[...changedCategories],...flags});
}
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
  function sendPreview(stage,mode,categories,width,height,piece){
    const transfer=piece?categories.flatMap(part=>[part.vertices.buffer,part.faces.buffer]):[];
    self.postMessage({type:'build-preview',stage,mode,categories,width,height,piece},transfer);
  }
  return {
    stage:report,
    progress:message=>report(stage,message),
    parts:(stage,parts,{width,height},mode='replace',piece)=>{
      const categories=parts.filter(part=>part.faces.length);
      if(piece){sendPreview(stage,mode,categories,width,height,piece);return;}
      if(!pureRelief&&stage==='terrain'&&(width>MAX_PRINT_TILE_MM||height>MAX_PRINT_TILE_MM)){
        let first=true;
        for(const {parts,index,total} of previewPieces(categories,width,height)){
          if(parts.length){sendPreview(stage,first?'replace':'append',parts,width,height,{index,total});first=false;}
          report(stage,'Previsualització del relleu per peces',index,total);
        }
      }else if(!pureRelief&&(categories.length||mode==='replace'))sendPreview(stage,mode,categories,width,height);
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
    const needsSolidEngine=data.region?.singularModels?.length||!data.options.pureRelief&&(data.options.surfaceRoads||data.options.estimatedTunnels||data.options.majorRoads||data.region?.infrastructure?.items?.length||data.region?.features?.some(f=>f.properties?.sourceLayer==='transportation'&&f.properties.brunnel==='bridge'));
    if(observer&&!api&&needsSolidEngine){timing.mark('initialization','Preparant el motor de geometria…');progress('Preparant el motor de geometria…');api=await Module({locateFile:()=>wasmURL});api.setup();}
    current=observer?buildModel(data.region,data.options,observer.progress,api,timing.detail,observer):updateVegetation(current,data.options,progress);self.postMessage({type:'model',model:{...current,parts:undefined,reliefGrid:undefined,categories:data.type==='vegetation'?current.categories.filter(p=>p.id==='trees'):current.categories},vegetation:data.type==='vegetation',timing:timing?.finish()});
  }
  if(data.type==='relief'){
    postChangedModel(updatePureRelief(current,data.options,progress,data.boundaryLayer),{relief:true});
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
    postChangedModel(updateTransport(current,data.options,progress,api));
  }
  if(data.type==='accessory'){
    if(!current)throw Error('Genera primer el model.');
    if(data.kind!=='marc'&&!api){api=await Module({locateFile:()=>wasmURL});api.setup();}
    const {accessoryArchive}=await import('./accessory-export.js'),{bytes}=accessoryArchive(data.kind,current,data.options,api);
    self.postMessage({type:'download',format:'accessory',archive:true,accessory:data.kind,filename:'relleu-obert-'+data.kind+'.zip',bytes},[bytes.buffer]);return;
  }
  if(data.type==='export'){
    if(!current)throw Error('Genera primer el model.');
    const {materialCount,assignments,cuts={}}=data;
    if(!validPrintCuts(cuts,current.width,current.height))throw Error('La divisió de la maqueta no és vàlida.');
    const plan=tilePlan(current.width,current.height,cuts),requested=printExportFormat(data.format,plan);
    const format=requested==='bambu-zip'?'bambu':requested;
    const pureRelief=current.provenance?.options?.pureRelief;
    // Keep the geometry inside the crop in the printable file, without embedding the full GPX.
    const source=current.provenance.options?.userRoute?{...current,
      provenance:{...current.provenance,options:{...current.provenance.options,userRoute:undefined}}}:current;
    const pinTiles=pureRelief&&data.pins?.length?locateReliefPins(current,data.pins,plan):[];
    if(pinTiles.some(pins=>pins.length)){
      progress('Preparant els forats per a xinxetes…');
      if(!api){api=await Module({locateFile:()=>wasmURL});api.setup();}
    }
    let bytes,archive=false,plateCount;
    const split=plan.tiles.length>1;
    if(split||current.reliefGrid&&isPanoramicSize(current.width,current.height)){
      let model=pureRelief?source:groupMaterials(source,materialCount,assignments);
      progress('Preparant els talls de les peces…');
      let pieces=model.reliefGrid&&!model.provenance.catalogueLandforms?.length&&splitPureRelief(model,plan,progress);
      if(!pieces){
        if(!api){api=await Module({locateFile:()=>wasmURL});api.setup();}
        pieces=splitModel(model,api,plan,progress);
      }
      if(pureRelief){
        progress('Agrupant els filaments de les peces…');
        model=groupReliefMaterials({provenance:source.provenance,parts:pieces.flatMap(piece=>piece.parts)},
          materialCount,assignments,{paletteOnly:true});
        for(const [i,piece] of pieces.entries()){
          // Generic cuts retain the original model categories. Only group the cut geometry.
          pieces[i]=groupReliefMaterials({...perforatePiece(piece,pinTiles[i]),categories:undefined},materialCount,assignments);
        }
      }
      if(!split){
        bytes=format==='stl'?stlZip(pieces[0]):threeMF(pieces[0],{bambu:format==='bambu'});
      }else if(requested==='bambu'){
        progress('Preparant el projecte amb les plaques de Bambu Studio…');
        bytes=bambuPlateProject(model,pieces);plateCount=pieces.length;
      }else{
        bytes=tileArchive(pieces,format);archive=true;
      }
    }
    else{
      const model=groupMaterials(perforatePiece(source,pinTiles[0]),materialCount,assignments);
      bytes=format==='stl'?stlZip(model):threeMF(model,{bambu:format==='bambu'});
    }
    self.postMessage({type:'download',format,archive,plateCount,bytes},[bytes.buffer]);
  }
}catch(e){self.postMessage({type:'error',message:e.message,detail:e.stack,timing:timing?.finish()});}};
