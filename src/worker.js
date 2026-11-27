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
import {buildFenceMesh} from './fence-mesh.js';
import {withPrintableFences} from './fence-export.js';
import {applyHorizontalSurfaces} from './horizontal-surfaces.js';
import {applyBasicObjects} from './basic-objects.js';
import {normalizeFences} from './fence-settings.js';
import {normalizeHorizontalSurfaces} from './horizontal-surface-settings.js';
import {normalizeBasicObjects} from './basic-object-settings.js';
import Module from 'manifold-3d';
import wasmURL from 'manifold-3d/manifold.wasm?url';
import {createProcessingTiming} from './processing-timing.js';
import {generationErrorReason} from './generation-error.js';
let current,api,fencePart=null,horizontalState=null,horizontalSurfaces=[],fences=[],objects=[],objectState=null;
const surfaceModel=()=>horizontalState?.model??current;
const visibleModel=()=>objectState?.model??surfaceModel();
async function computeObjects(model,edits){
  if(!model?.context||!edits?.length)return null;
  if(!api){api=await Module({locateFile:()=>wasmURL});api.setup();}
  return applyBasicObjects(model,edits,api);
}
async function refreshObjects(){
  try{
    objectState=await computeObjects(surfaceModel(),objects);
    return {objectLevels:objectState?.levels??[]};
  }catch(error){
    objectState=null;
    return {objectLevels:[],objectError:{code:error.code}};
  }
}
function contourTargets(){
  const ctx=current?.context;
  return ctx?.buildingMask?.flatMap(polygon=>polygon.map(ring=>{
    const points=ring.slice(0,-1);
    return {points:points.map(point=>ctx.proj.unproject(point)),heights:points.map(point=>ctx.ground(...point)),closed:true};
  }))??[];
}
async function computeFences(model,fences,ground){
  if(!model?.context||!fences?.length)return null;
  if(!api){api=await Module({locateFile:()=>wasmURL});api.setup();}
  return buildFenceMesh(fences,{...model.context,ground:ground??model.context.ground,api});
}
async function refreshFences(model){
  try{
    fencePart=await computeFences(model,fences,horizontalState?.ground);
    return {fencePart:fencePreview(fencePart)};
  }catch(error){
    fencePart=null;
    return {fencePart,fenceError:error.message};
  }
}
const fencePreview=mesh=>mesh&&{vertices:mesh.vertices,faces:mesh.faces};
const horizontalError=error=>({code:error.code,index:error.surfaceIndex});
async function computeHorizontal(model,edits){
  if(!model?.context||!edits?.length)return null;
  if(!api){api=await Module({locateFile:()=>wasmURL});api.setup();}
  return applyHorizontalSurfaces(model,edits,api);
}
async function refreshHorizontal(model){
  try{
    horizontalState=await computeHorizontal(model,horizontalSurfaces);
    return {horizontalLevels:horizontalState?.levels??[]};
  }catch(error){
    horizontalState=null;
    return {horizontalLevels:[],horizontalError:horizontalError(error)};
  }
}
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
function postChangedModel(previous,next,flags={},type='model'){
  const changedCategories=new Set();
  for(const part of previous.categories)if(!next.categories.includes(part))changedCategories.add(part.id);
  for(const part of next.categories)if(!previous.categories.includes(part))changedCategories.add(part.id);
  const categories=next.categories.filter(part=>changedCategories.has(part.id));
  self.postMessage({type,model:{...next,parts:undefined,reliefGrid:undefined,categories},
    changedCategories:[...changedCategories],contourTargets:contourTargets(),...flags});
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
  if(data.type==='annotations'){
    // Calculate a history target completely before replacing the accepted state.
    const nextSurfaces=normalizeHorizontalSurfaces(data.horizontalSurfaces);
    const nextPlacements=normalizeBasicObjects(data.objects);
    const nextWalls=normalizeFences(data.fences);
    const before=visibleModel();
    const surfacesChanged=JSON.stringify(nextSurfaces)!==JSON.stringify(horizontalSurfaces);
    const objectsChanged=surfacesChanged||JSON.stringify(nextPlacements)!==JSON.stringify(objects);
    const fencesChanged=surfacesChanged||JSON.stringify(nextWalls)!==JSON.stringify(fences);
    const nextSurface=surfacesChanged?await computeHorizontal(current,nextSurfaces):horizontalState;
    const nextObjects=objectsChanged?await computeObjects(nextSurface?.model??current,nextPlacements):objectState;
    const nextFences=fencesChanged?await computeFences(current,nextWalls,nextSurface?.ground):fencePart;
    horizontalSurfaces=nextSurfaces;objects=nextPlacements;fences=nextWalls;
    horizontalState=nextSurface;objectState=nextObjects;fencePart=nextFences;
    postChangedModel(before,visibleModel(),{
      horizontalLevels:nextSurface?.levels??[],objectLevels:nextObjects?.levels??[],fencePart:fencePreview(nextFences)
    },'annotations');
    return;
  }
  if(data.type==='horizontal'){
    const before=visibleModel(),next=await computeHorizontal(current,data.horizontalSurfaces);
    const placed=await computeObjects(next?.model??current,objects);
    const walls=await computeFences(current,fences,next?.ground);
    horizontalSurfaces=data.horizontalSurfaces;
    horizontalState=next;objectState=placed;fencePart=walls;
    postChangedModel(before,visibleModel(),{horizontalLevels:next?.levels??[],objectLevels:placed?.levels??[],fencePart:fencePreview(walls)},'horizontal');
    return;
  }
  if(data.type==='objects'){
    const before=visibleModel(),next=await computeObjects(surfaceModel(),data.objects);
    objects=data.objects;objectState=next;
    postChangedModel(before,visibleModel(),{objectLevels:next?.levels??[]},'objects');
    return;
  }
  if(data.type==='fences'){
    // Keep the last valid wall when an edit fails.
    fencePart=await computeFences(current,data.fences,horizontalState?.ground);
    fences=data.fences;
    self.postMessage({type:'fences',part:fencePreview(fencePart)});
    return;
  }
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
    const before=visibleModel();
    const observer=data.type==='build'?buildObserver(timing,data.options.pureRelief):null;
    const needsSolidEngine=data.region?.singularModels?.length||!data.options.pureRelief&&(data.options.surfaceRoads||data.options.estimatedTunnels||data.options.majorRoads||data.region?.infrastructure?.items?.length||data.region?.features?.some(f=>f.properties?.sourceLayer==='transportation'&&f.properties.brunnel==='bridge'));
    if(observer&&!api&&needsSolidEngine){timing.mark('initialization','Preparant el motor de geometria…');progress('Preparant el motor de geometria…');api=await Module({locateFile:()=>wasmURL});api.setup();}
    current=observer?buildModel(data.region,data.options,observer.progress,api,timing.detail,observer):updateVegetation(current,data.options,progress);
    if(observer){
      fences=data.fences??[];
      horizontalSurfaces=data.horizontalSurfaces??[];
      objects=data.objects??[];
      const horizontal=await refreshHorizontal(current),placed=await refreshObjects(),walls=await refreshFences(current),model=visibleModel();
      self.postMessage({type:'model',model:{...model,parts:undefined,reliefGrid:undefined},timing:timing.finish(),contourTargets:contourTargets(),...walls,...horizontal,...placed});
    }else if((horizontalSurfaces.length||objects.length)&&current.context){
      const horizontal=await refreshHorizontal(current),placed=await refreshObjects();
      postChangedModel(before,visibleModel(),{vegetation:true,...horizontal,...placed,...await refreshFences(current)});
    }else{
      self.postMessage({type:'model',model:{...current,parts:undefined,reliefGrid:undefined,categories:current.categories.filter(p=>p.id==='trees')},vegetation:true});
    }
  }
  if(data.type==='relief'){
    const before=current;
    current=updatePureRelief(current,data.options,progress,data.boundaryLayer);
    postChangedModel(before,current,{relief:true});
  }
  if(data.type==='buildings'){
    const before=visibleModel();
    const report=message=>{timing?.mark('buildings',message);progress(message);};
    current=updateBuildings(current,data.layer,data.options,report);
    if((horizontalSurfaces.length||objects.length)&&current.context){
      const horizontal=await refreshHorizontal(current),placed=await refreshObjects();
      postChangedModel(before,visibleModel(),{buildings:true,timing:timing?.finish(),...horizontal,...placed,...await refreshFences(current)});
    }else self.postMessage({type:'model',model:{...current,parts:undefined,categories:current.categories.filter(p=>['buildings','trees','roads','railways'].includes(p.id))},buildings:true,timing:timing?.finish(),contourTargets:contourTargets()});
  }
  if(data.type==='transport'){
    if(!api&&(data.options.estimatedTunnels||data.options.majorRoads)){
      progress('Preparant les infraestructures…');
      api=await Module({locateFile:()=>wasmURL});api.setup();
    }
    const before=visibleModel();
    current=updateTransport(current,data.options,progress,api);
    const horizontal=await refreshHorizontal(current),placed=await refreshObjects();
    postChangedModel(before,visibleModel(),{...horizontal,...placed,...await refreshFences(current)});
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
    const modelWithSurfaces=visibleModel();
    let source=current.provenance.options?.userRoute?{...modelWithSurfaces,
      provenance:{...current.provenance,options:{...current.provenance.options,userRoute:undefined}}}:modelWithSurfaces;
    if(!pureRelief&&fencePart){
      try{source=withPrintableFences(source,fencePart,api);}
      catch(error){throw Error('FENCE_EXPORT_FAILED',{cause:error});}
    }
    const pinTiles=pureRelief&&data.pins?.length?locateReliefPins(current,data.pins,plan):[];
    if(pinTiles.some(pins=>pins.length)){
      progress('Preparant els forats per a xinxetes…');
      if(!api){api=await Module({locateFile:()=>wasmURL});api.setup();}
    }
    let bytes,archive=false,plateCount;
    const split=plan.tiles.length>1;
    if(split||current.reliefGrid&&isPanoramicSize(current.width,current.height)){
      const nativeEditCut=!pureRelief&&(!!fencePart||!!horizontalState?.levels.some(Boolean)||!!objectState?.levels.some(Boolean));
      let model=pureRelief||nativeEditCut?source:groupMaterials(source,materialCount,assignments);
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
      if(nativeEditCut){
        pieces=pieces.map(piece=>groupMaterials({...piece,categories:undefined},materialCount,assignments));
        const byId=new Map(pieces.flatMap(piece=>piece.parts).map(part=>[part.id,part]));
        const palette=groupMaterials({...source,categories:[],parts:[]},materialCount,assignments);
        const order=id=>materialCount===4?['terrain','water','built','green'].indexOf(id):Number(id.slice(9));
        model={...palette,parts:[...byId.values()].sort((a,b)=>order(a.id)-order(b.id)).map(({id,name,color})=>({id,name,color}))};
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
}catch(e){self.postMessage({type:'error',message:e.message,detail:e.stack,timing:timing?.finish(),
  ...(data.type==='horizontal'?{horizontalError:horizontalError(e)}:{}),
  ...(data.type==='objects'?{objectError:{code:e.code}}:{}),
  ...(data.type==='build'?{diagnosticReason:generationErrorReason(e)}:{})});}};
