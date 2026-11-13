import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadRegion,loadBuildingLayer,loadBoundaryLayer,applyBuildingLayer,defaultBuildingSource} from './sources.js';
import {BOUNDARY_LEVELS,BOUNDARY_SAMPLES,DEFAULT_BOUNDARY_WIDTHS,MIN_BOUNDARY_WIDTH,MAX_BOUNDARY_WIDTH,
  activeBoundaries,boundaryPattern,validBoundaryWidth} from './relief-boundary-options.js';
import {inCatalonia} from './buildings.js';
import {createPlaceMap,MAX_PROJECT_SCALE} from './place-map.js';
import {createPlaceSearchScheduler} from './place-search.js';
import {PURE_RELIEF_RESOLUTIONS} from './pure-relief-mesh.js';
import {MAX_RELIEF_TRAIL_STROKES,RELIEF_TRAIL_WIDTH_MM,sameReliefTrailStrokes,validReliefTrailWidth} from './relief-trails.js';
import {MAX_GPX_BYTES,USER_ROUTE_WIDTH_MM,parseUserRouteGPX} from './relief-user-route.js';
import {MAX_RELIEF_PINS,RELIEF_PIN_SPACING_MM} from './relief-pin-holes.js';
import {pinProjection,pinFitsTile} from './relief-pin-placement.js';
import {smoothTerrainNormals} from './terrain-normals.js';
import {CATEGORIES,PALETTES,defaultAssignments,RELIEF_MATERIALS,RELIEF_PALETTES,defaultReliefAssignments,reliefMaterialId} from './materials.js';
import {pieceDimensions,tilePlan,validPrintCuts,scaledBBox,physicalBBox,selectionPose,isPanoramicSize,PURE_SCALE_RANGE,PANORAMIC_SCALE_RANGE} from './selection.js';
import {BAMBU_PROJECT_BED_MM,DEFAULT_BASE_THICKNESS_MM,validBaseThickness,fitsBambuProject,printExportFormat} from './print-settings.js';
import {bindPrintCutEditor} from './print-cut-editor.js';
import './print-cut-editor.css';
import {initPiecePicker,bindPieceDimensions} from './piece-picker.js';
import {CURATED_EXAMPLES,CURATED_EXAMPLE_DETAIL,localizeExample} from './curated-examples.js';
import {initExampleCarousel,initExampleGallery} from './example-carousel.js';
import {readProjects,saveProject,deleteProject,exportProjectLibrary,importProjectLibrary} from './project-library.js';
import {exampleLink,isSharedLink,projectLink,readExampleLink,readProjectLink} from './project-link.js';
import {cutGuideSegments} from './cut-guides.js';
import {regionLimitMessage} from './region-limits.js';
import {initDialogs} from './dialogs.js';
import {prependReleases,releasesAfter} from './release-history.js';
import changelog from '../CHANGELOG.md?raw';
import {formatNumber,getLocale,initI18n,onLocaleChange,t,translateEngineMessage} from './i18n.js';
import {createPreviewOrbit} from './preview-orbit.js';
import {createPreviewPins} from './preview-pins.js';
import {trackWorkshopEvent,workshopMode,workshopSize} from './analytics.js';
import {createBuildingUpdateScheduler} from './building-update-scheduler.js';
import {createProjectBrushHistory} from './project-brush-history.js';
import {withoutLastGesture} from './brush-coverage.js';
import {TERRAIN_REMOTE} from './source-options.js';
import {buildRequest} from './build-request.js';
import {DEFAULT_PLACE,recommendedPlace} from './recommended-places.js';
import './style.css';
import './ui-tokens.css';
import './usability.css';
import './example-carousel.css';
import './mobile-workshop.css';
import './mobile-onboarding.css';
import './tour-welcome.css';
import {createWorkshopGuide} from './workshop-guide.js';
import {bindFieldCommit,committedFieldValue} from './field-commit.js';
import './workshop-guide.css';
const $=s=>document.querySelector(s),view=$('#viewport'),worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
const text=(key,params)=>t('runtime.'+key,params);
const boundaryControls=BOUNDARY_LEVELS.map(level=>{
  const row=document.createElement('div'),toggleLabel=document.createElement('label'),enabled=document.createElement('input');
  const name=document.createElement('span'),fields=document.createElement('div'),select=document.createElement('select');
  const widthField=document.createElement('label'),width=document.createElement('input'),unit=document.createElement('span');
  const patternLabel=document.createElement('span'),widthLabel=document.createElement('span');
  row.className='boundary-control-row';
  toggleLabel.className='check-row';
  enabled.type='checkbox';
  enabled.setAttribute('role','switch');
  enabled.className='boundary-switch';
  name.id='boundary-name-'+level;
  name.dataset.i18n='runtime.boundary.'+level;
  toggleLabel.append(enabled,name);
  fields.className='boundary-control-fields';
  select.id='boundary-'+level;
  patternLabel.id='boundary-pattern-label-'+level;
  widthLabel.id='boundary-width-label-'+level;
  patternLabel.className=widthLabel.className='sr-only';
  patternLabel.dataset.i18n='runtime.boundary.pattern';
  widthLabel.dataset.i18n='runtime.boundary.width';
  select.setAttribute('aria-labelledby',name.id+' '+patternLabel.id);
  for(const [style,sample] of Object.entries(BOUNDARY_SAMPLES)){
    const option=new Option(sample,style);
    option.dataset.i18nAria='runtime.boundary.'+style;
    select.add(option);
  }
  select.value=boundaryPattern(level);
  width.type='number';
  width.min=MIN_BOUNDARY_WIDTH;
  width.max=MAX_BOUNDARY_WIDTH;
  width.step='.1';
  width.value=width.defaultValue=DEFAULT_BOUNDARY_WIDTHS[level];
  width.setAttribute('aria-labelledby',name.id+' '+widthLabel.id);
  widthField.className='boundary-width-field';
  unit.textContent='mm';
  unit.className='unit';
  unit.setAttribute('aria-hidden','true');
  widthField.append(width,unit);
  fields.append(patternLabel,select,widthLabel,widthField);
  row.append(toggleLabel,fields);
  $('#relief-boundary-controls').append(row);
  select.disabled=width.disabled=true;
  const changed=()=>requestReliefUpdate(statusMessage('pending.boundaries'));
  enabled.onchange=()=>{
    select.disabled=width.disabled=!enabled.checked;
    changed();
  };
  select.onchange=changed;
  bindFieldCommit(width,()=>{
    const before=Number(width.defaultValue);
    const next=width.valueAsNumber;
    width.value=width.defaultValue=validBoundaryWidth(next)?Math.round(next*10)/10:width.defaultValue;
    if(Number(width.value)!==before)changed();
  });
  return {level,enabled,select,width};
});
function boundarySettings(){
  const boundaryStyles={},boundaryPatterns={},boundaryWidths={};
  for(const {level,enabled,select,width}of boundaryControls){
    boundaryStyles[level]=enabled.checked?select.value:'off';
    boundaryPatterns[level]=select.value;
    boundaryWidths[level]=Number(width.defaultValue);
  }
  return {boundaryStyles,boundaryPatterns,boundaryWidths};
}
function setBoundarySettings({boundaryStyles,boundaryPatterns,boundaryWidths}={}){
  const active=activeBoundaries(boundaryStyles);
  for(const {level,enabled,select,width}of boundaryControls){
    enabled.checked=active.includes(level);
    select.value=boundaryPattern(level,boundaryStyles,boundaryPatterns);
    width.value=width.defaultValue=boundaryWidths?.[level]??DEFAULT_BOUNDARY_WIDTHS[level];
    select.disabled=width.disabled=!enabled.checked;
  }
}
const boundaryKey=options=>JSON.stringify(activeBoundaries(options?.boundaryStyles)
  .map(level=>[level,options.boundaryStyles[level],options.boundaryWidths?.[level]??DEFAULT_BOUNDARY_WIDTHS[level]]));
const statusMessage=(key,params)=>()=>text(key,typeof params==='function'?params():params);
const baseMessage=key=>()=>t(key);
const messageText=message=>typeof message==='function'?message():translateEngineMessage(message);
const narrowWorkshop=matchMedia('(max-width: 900px)'),layout=$('.app-layout');
const workshopNav=$('#mobile-workshop'),workshopButtons=[...workshopNav.querySelectorAll('button')];
const placeLocation=$('#place-location');
function arrangeTerritory(){
  const panel=$('#panel-place'),focused=document.activeElement;
  if(narrowWorkshop.matches)panel.prepend(placeLocation);
  else panel.before(placeLocation);
  if(placeLocation.contains(focused))focused.focus({preventScroll:true});
}
arrangeTerritory();
function showWorkshopPanel(panel,{focus=false}={}){
  if(panel!=='preview'&&!$('#viewer-edit-panel').hidden)showViewerTools(false);
  const previous=layout.dataset.mobilePanel||'preview';
  const button=workshopButtons.find(item=>item.dataset.mobilePanel===panel);
  if(narrowWorkshop.matches&&panel!==previous){
    const departing=previous==='settings'?$('#workshop-settings'):previous==='export'?$('#workshop-export'):null;
    focus||=!!departing?.contains(document.activeElement);
    if(previous==='settings')endVegetationEditing();
    if(previous==='export')setFormatMenu(false);
  }
  layout.dataset.mobilePanel=panel;
  for(const item of workshopButtons){
    const key=item.dataset.mobilePanel;
    item.setAttribute(key==='preview'?'aria-pressed':'aria-expanded',String(key===panel));
  }
  if(focus&&narrowWorkshop.matches){
    const target=panel==='settings'?$('.sidebar-left .section-toggle[aria-expanded=true]'):
      panel==='export'?$('.sidebar-right .section-toggle[aria-expanded=true]'):button;
    (target||button).focus({preventScroll:true});
  }
}
for(const button of workshopButtons)button.onclick=()=>{
  const panel=button.dataset.mobilePanel;
  if(panel==='settings'&&layout.dataset.mobilePanel!=='settings'&&!$('.sidebar-left .section-toggle[aria-expanded=true]')){
    openStep('place',{focus:true});
    return;
  }
  showWorkshopPanel(layout.dataset.mobilePanel===panel?'preview':panel,{focus:true});
};
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!event.defaultPrevented&&!workshopGuide.current()&&narrowWorkshop.matches&&!workshopNav.hidden&&
      layout.dataset.mobilePanel!=='preview'&&!document.querySelector('dialog[open]')){
    event.preventDefault();
    showWorkshopPanel('preview',{focus:true});
  }
});
let region,model,busy=false,selection,dirty=false,buildingSourceDirty=false,needsBuild=false,placeName='',strokes=[],brush='navigate',pendingVegetation=false,timer,job,drawing=false,lastPoint,gesture=0;
let brushHistory=createProjectBrushHistory();
let trailHistory=createProjectBrushHistory({breakOnClipped:true}),routeHistory=createProjectBrushHistory({breakOnClipped:true});
let trailStrokes=[],drawnRouteStrokes=[],pendingTrailFrame=null,pendingRouteFrame=null,lineStrokeStart=0;
let userRoute=null,pins=[],nextPinId=1,selectedPinId=null,removedPin=null,pinPointer=null;
let pendingBrushFrame=null,transportTimer=null,reliefTimer=null;
let exportFormat='bambu';
let baseThickness=DEFAULT_BASE_THICKNESS_MM,cutPreviewFrame=null,cutChangedDuringDrag=false;
const cutSettings=new Map(),sizeKey=(width,height)=>`${width}x${height}`;
const printCuts=(width,height)=>cutSettings.get(sizeKey(width,height))??{};
const printPlan=(width,height)=>tilePlan(width,height,printCuts(width,height));
const cutEditor=bindPrintCutEditor($('#print-cuts-fields'),{
  text,formatNumber,onChange:applyPrintCuts,onCommit:()=>{
    if(cutChangedDuringDrag)trackWorkshopEvent('ajusta_talls',{peces:printPlan(...size()).tiles.length});
    cutChangedDuringDrag=false;
    if(pins.length)refreshPinMarkers();
  }
});
let pendingFullRegion=null,lastValidBuildings=null,recoveryNotice='';
let pendingCadastralBuild=false;
let stagedBuild=null;
let modelCatalogPlace=null,pendingCatalogPlace;
let processingRun,lastProcessingReport;
function finishProcessing(error){
  if(!processingRun)return;
  const {started,awaitingBuildings,...report}=processingRun;
  lastProcessingReport={...report,status:error?(report.result?'partial':'error'):'complete',error:error?.message,
    totalMilliseconds:performance.now()-started};
  processingRun=null;
  $('#download-processing').disabled=false;
}
function downloadFile(blob,filename){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;
  link.download=filename;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}
$('#download-processing').onclick=()=>{
  if(!lastProcessingReport)return;
  const blob=new Blob([JSON.stringify(lastProcessingReport,null,2)+'\n'],{type:'application/json'});
  downloadFile(blob,'relleu-obert-informe-'+lastProcessingReport.startedAt.replaceAll(':','-')+'.json');
};
let contextLost=false;
let landscapeMaterials={count:4,assignments:defaultAssignments(4)};
let reliefMaterials={count:6,assignments:defaultReliefAssignments(6)};
let selectedSize=null,exampleSelection=null,regularPureRelief=false;
let selectedPose,tooLargeRegion=false,pendingBuildingLayer=null,icgcAvailable=true,buildingSourceExplicit=false;
const size=()=>pieceDimensions(selectedSize);
const resizeForm=$('#piece-resize-form'),resizeFields=$('#piece-resize-fields'),resizeApply=$('#piece-resize-apply');
const resizeWidth=$('#piece-resize-width'),resizeHeight=$('#piece-resize-height');
const resizeDimensions=bindPieceDimensions(resizeForm,resizeWidth,resizeHeight);
function syncResizeAction(){
  resizeApply.disabled=!selectedSize||resizeDimensions.read()===selectedSize;
}
resizeForm.addEventListener('input',syncResizeAction);
const panoramicSelected=()=>!!selectedSize&&isPanoramicSize(...size());
function pendingPieceSize(){
  if(!model)return false;
  const [width,height]=size();
  return width!==model.width||height!==model.height;
}
const pureSelected=()=>$('#mode-relief').checked;
const fieldNumber=id=>Number(committedFieldValue($('#'+id)));
const LANDSCAPE_RESOLUTIONS={24:36,36:64,56:96};
const isPure=m=>!!m?.provenance.options.pureRelief;
const canUpdateVegetation=()=>!!model&&pureSelected()===isPure(model);
const brushHasGeometry=()=>isPure(model)||!model?.provenance.treeRepresentation?.omittedBelowThreshold;
const canPaint=()=>canUpdateVegetation()&&!busy&&!needsBuild&&reliefTimer===null&&$('#trees').checked&&brushHasGeometry();
const canEditRelief=()=>isPure(model)&&pureSelected()&&!busy&&!needsBuild&&reliefTimer===null&&!pendingVegetation;
const canPaintTrails=()=>canEditRelief()&&$('#relief-trails').checked;
const trailBrush=()=>brush.startsWith('trail-');
const routeBrush=()=>brush.startsWith('route-');
const lineBrush=()=>trailBrush()||routeBrush();
const lineStrokes=()=>routeBrush()?drawnRouteStrokes:trailStrokes;
const canPlacePin=canEditRelief;
const canPaintWithBrush=()=>brush==='pin'||routeBrush()?canEditRelief():trailBrush()?canPaintTrails():canPaint();
const trailWidthControl=$('#relief-trail-width'),trailEraserControl=$('#trail-eraser-radius');
const reliefTrailWidth=()=>{
  const value=Number(committedFieldValue(trailWidthControl));
  return validReliefTrailWidth(value)?value:RELIEF_TRAIL_WIDTH_MM;
};
const vegetation=()=>({trees:$('#trees').checked,density:2.5,brushDensity:Number($('#density').value),treeType:$('#tree-type').value,strokes,
  ...(pureSelected()?{vegetationHeight:fieldNumber('vegetation-height'),vegetationNoise:fieldNumber('vegetation-noise')}:{})});
let currentStatus='',currentBadge='';
const placeSearch=$('#place-search'),searchResults=$('#search-results'),searchForm=$('#search-form');
let activePlaceResult=null;
const searchSubmit=searchForm.querySelector('[type="submit"]');
const searchIcon=$('#search-icon'),searchSpinner=$('#search-spinner');
const searchPending=baseMessage('status.searching'),searchChoose=baseMessage('status.chooseResult'),searchEmpty=baseMessage('status.noResults');
const placeSearchScheduler=createPlaceSearchScheduler({run:searchPlace,setPending(pending){
  searchIcon.hidden=pending;
  searchSpinner.hidden=!pending;
  searchResults.setAttribute('aria-busy',String(pending));
}});
const say=(message,error=false)=>{currentStatus=message;$('#status').textContent=messageText(message);$('#status').classList.toggle('error',error);};
const badge=message=>{currentBadge=message;$('#model-badge').textContent=messageText(message);$('#model-badge').hidden=!message;};
const workLabels={
  relief:'status.workRelief',vegetation:'status.workVegetation',buildings:'status.workBuildings',
  transport:'status.workTransport',accessory:'status.workAccessory',export:'status.workExport'
};
function lock(value){
  busy=value;
  const updating=value||pendingVegetation,workPending=updating||reliefTimer!==null;
  const waterLocked=updating&&!(value&&job==='relief');
  syncStepActions(workPending);
  $('#model-mode').disabled=updating;
  $('#streams').disabled=waterLocked;
  $('#stream-width').disabled=waterLocked||!$('#streams').checked;
  $('#relief-trails').disabled=waterLocked||drawing;
  trailWidthControl.disabled=updating||drawing||!$('#relief-trails').checked;
  trailEraserControl.disabled=trailWidthControl.disabled;
  for(const {enabled,select,width}of boundaryControls){
    enabled.disabled=updating;
    select.disabled=width.disabled=updating||!enabled.checked;
  }
  syncRouteSettings(updating||drawing);
  $('#exag').disabled=value&&job==='build';
  $('#detail').disabled=updating||drawing;
  for(const id of ['road-rise','rail-rise','trail-width','estimated-tunnels','major-profiles','model-scale','new-project'])$('#'+id).disabled=updating;
  lockBuildingControls(updating);
  placeMap.setLocked(updating,!narrowWorkshop.matches);
  placeSearch.disabled=searchSubmit.disabled=updating;
  if(updating)cancelPlaceSearch();
  resizeFields.disabled=workPending||drawing;
  syncPrintSettings(workPending||drawing);
  syncExport(workPending||!model);
  $('#share-project').disabled=workPending||drawing||!selectedSize||!selectedPose||tooLargeRegion;
  syncVegetationControls(workPending);
  view.setAttribute('aria-busy',String(workPending));
  $('#work-indicator').hidden=!workPending;
  $('#work-label').textContent=drawing?text('status.brushFinish'):
    value?(stagedBuild?.label||text(workLabels[job]||'status.workModel')):
    text(pendingVegetation?'status.workBrush':workLabels.relief);
  view.classList.toggle('is-working',workPending&&!drawing);
  if(workPending&&!drawing)$('#brush-cursor').hidden=true;
  editButtons();
  syncOrbitControl();
  syncViewerTools();
  updateWorkshopGuide();
}
function markDirty(){
  dirty=!!region&&!sameBounds(selection,region.meta.bbox);
  if(dirty||model&&selectedPose.rotation!==model.provenance.options.selectionPose?.rotation)requireBuild(statusMessage('pending.selection'));
}
const preferredScaleStops=[500,1000,2000,5000,10000,15000];
let scaleStops=[...preferredScaleStops,MAX_PROJECT_SCALE];
const sameBounds=(a,b)=>a&&b&&a.every((value,i)=>Math.abs(value-b[i])<1e-9);
function syncSelectionInfo(){
  if(!selectedPose)return;
  const [lat,lon]=selectedPose.center;
  const km=value=>formatNumber(value/1000,{minimumFractionDigits:2,maximumFractionDigits:2});
  $('#selection-info').textContent=`${km(selectedPose.widthM)} × ${km(selectedPose.heightM)} km · ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}
const placeMap=createPlaceMap($('#place-map'),{
  onChange(bbox,center,pose){
    if(exampleSelection&&(pose.rotation!==exampleSelection.rotation||!sameBounds(exampleSelection.bbox,bbox))){
      exampleSelection=null;
      placeName='';
    }
    selection=bbox;
    selectedPose=pose;
    syncBuildingSources(bbox);
    syncSelectionInfo();
    scaleHint();
    buildingControls();
    if(region)markDirty();
  },
  onName(name){placeName=name;}
});
narrowWorkshop.addEventListener('change',()=>{
  arrangeTerritory();
  placeMap.setLocked(busy||pendingVegetation,!narrowWorkshop.matches);
  workshopGuide.update();
});
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,6000);camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;view.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=35;controls.maxDistance=2200;
const previewOrbit=createPreviewOrbit(),orbitOffset=new THREE.Vector3(),orbitPointers=new Set();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)'),orbitButton=$('#preview-orbit');
let orbitEnabled=!reducedMotion.matches;
function setOrbitEnabled(enabled){
  if(!enabled&&orbitEnabled)previewOrbit.pause(performance.now(),0);
  orbitEnabled=enabled;
  orbitButton.setAttribute('aria-checked',String(enabled));
  orbitButton.querySelector('span[aria-hidden]').textContent=enabled?text('status.orbitOn'):text('status.orbitOff');
  orbitButton.title=enabled?text('status.orbitStop'):text('status.orbitStart');
}
setOrbitEnabled(orbitEnabled);
orbitButton.onclick=()=>setOrbitEnabled(!orbitEnabled);
reducedMotion.addEventListener('change',event=>setOrbitEnabled(!event.matches));
renderer.domElement.addEventListener('pointerdown',event=>{
  if(event.button!==1)orbitPointers.add(event.pointerId);
});
function releaseOrbitPointer(event){
  if(orbitPointers.delete(event.pointerId)&&!orbitPointers.size)previewOrbit.pause(performance.now());
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(type,releaseOrbitPointer,true);
window.addEventListener('blur',()=>{
  if(!orbitPointers.size)return;
  orbitPointers.clear();
  previewOrbit.pause(performance.now());
});
scene.add(new THREE.HemisphereLight(0xffffff,0x798269,2.5));const light=new THREE.DirectionalLight(0xfff6df,3.3);light.position.set(-170,-160,400);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-350,right:350,top:350,bottom:-350,far:1200});light.shadow.normalBias=.2;scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(2500,2500),new THREE.ShadowMaterial({opacity:.13}));ground.position.z=-.5;ground.receiveShadow=true;scene.add(ground);
const group=new THREE.Group();scene.add(group);let seams,seamModel,seamPlanKey;
function home(){
  const bounds=new THREE.Box3().setFromObject(group);
  const preview=stagedBuild?.preview;
  if(preview?.piece){
    bounds.expandByPoint(new THREE.Vector3(-preview.width/2,-preview.height/2,0));
    bounds.expandByPoint(new THREE.Vector3(preview.width/2,preview.height/2,0));
  }
  const sphere=bounds.isEmpty()?new THREE.Sphere(new THREE.Vector3(0,0,10),110):bounds.getBoundingSphere(new THREE.Sphere());
  const distance=sphere.radius/Math.sin(THREE.MathUtils.degToRad(camera.fov)/2)*1.15/Math.min(1,camera.aspect);
  controls.maxDistance=Math.max(2200,distance);
  camera.zoom=1;
  camera.updateProjectionMatrix();
  controls.target.copy(sphere.center);
  camera.position.copy(new THREE.Vector3(.75,-1,.85).normalize().multiplyScalar(distance).add(sphere.center));
  controls.update();
}
new ResizeObserver(()=>{const w=view.clientWidth,h=view.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(view);
const renderWorkshop=time=>{
  orbitOffset.subVectors(camera.position,controls.target);
  const horizontal=Math.hypot(orbitOffset.x,orbitOffset.y);
  const motion=previewOrbit.step(time,Math.atan2(orbitOffset.z,horizontal),
    orbitEnabled&&!!model&&!stagedBuild?.preview&&!orbitPointers.size&&brush==='navigate'&&!previewPins.interacting());
  if(motion){
    const distance=orbitOffset.length(),heading=Math.atan2(orbitOffset.y,orbitOffset.x)+motion.turn;
    const radius=distance*Math.cos(motion.elevation);
    camera.position.copy(controls.target).add(orbitOffset.set(radius*Math.cos(heading),radius*Math.sin(heading),distance*Math.sin(motion.elevation)));
  }
  controls.update();
  previewPins.render(!stagedBuild?.preview);
  renderer.render(scene,camera);
};
home();
function syncOrbitControl(){orbitButton.disabled=!model||contextLost;}
renderer.domElement.addEventListener('webglcontextlost',event=>{
  event.preventDefault();
  contextLost=true;
  renderer.setAnimationLoop(null);
  previewPins.render(false);
  syncOrbitControl();
  say(statusMessage('status.previewRecovering'),true);
});
renderer.domElement.addEventListener('webglcontextrestored',()=>{
  contextLost=false;
  if(model||stagedBuild?.preview)renderer.setAnimationLoop(renderWorkshop);
  syncOrbitControl();
  say(statusMessage('status.previewRecovered'));
});
const shownMaterialMode=()=>stagedBuild?.preview?stagedBuild.pureRelief:model?isPure(model):pureSelected();
function materialProfile(pure){
  const settings=pure?reliefMaterials:landscapeMaterials;
  const palettes=pure?RELIEF_PALETTES:PALETTES;
  const categories=pure?RELIEF_MATERIALS:CATEGORIES;
  const categoryId=pure?reliefMaterialId:id=>id;
  const index=id=>categories.findIndex(category=>category.id===categoryId(id));
  return {settings,palettes,categories,categoryId,index,color:id=>palettes[settings.count][settings.assignments[index(id)]]};
}
const reliefLineColors=Object.fromEntries(RELIEF_MATERIALS.filter(({id})=>['trails','boundaries','route'].includes(id)).map(({id,color})=>[id,color]));
const previewColor=(pure,id)=>pure&&Object.hasOwn(reliefLineColors,id)?reliefLineColors[id]:materialProfile(pure).color(id);
function recolor(updateLegend=true){
  const pure=shownMaterialMode(),{color}=materialProfile(pure);
  for(const mesh of group.children){
    const fill=pure&&reliefLineColors[mesh.name]||color(mesh.name);
    if(fill)mesh.material.color.set(fill);
  }
  if(updateLegend)legend();
  metrics();
}
function legend(){
  const root=$('#material-legend'),picker=$('#material-count'),pure=shownMaterialMode();
  const {settings,palettes,categories,categoryId,color}=materialProfile(pure);
  const mode=pure?'relief':'landscape';
  if(picker.dataset.mode!==mode||picker.dataset.locale!==getLocale()){
    picker.replaceChildren(...Object.keys(palettes).map(count=>new Option(
      count==='1'?text('material.monochrome'):text('material.count',{count:formatNumber(Number(count))}),count)));
    picker.dataset.mode=mode;
    picker.dataset.locale=getLocale();
  }
  picker.value=String(settings.count);
  root.replaceChildren();
  categories.forEach((category,i)=>{
    const row=document.createElement('div'),swatch=document.createElement('i');
    const label=document.createElement('span'),select=document.createElement('select');
    const absent=model&&!stagedBuild?.preview&&!model.categories.some(part=>categoryId(part.id)===category.id);
    row.className='material-row'+(absent?' absent':'');
    swatch.style.setProperty('--swatch',color(category.id));
    const categoryName=text('material.'+(pure&&category.id==='terrain'?'relief':category.id));
    label.textContent=categoryName;
    select.setAttribute('aria-label',text('material.for',{category:categoryName}));
    for(let j=0;j<settings.count;j++)select.add(new Option(text('material.slot',{number:formatNumber(j+1)}),String(j)));
    select.value=settings.assignments[i];
    select.onchange=()=>{
      settings.assignments[i]=Number(select.value);
      swatch.style.setProperty('--swatch',color(category.id));
      recolor(false);
    };
    row.append(swatch,label,select);
    root.appendChild(row);
  });
}
function metrics(){
  if(!model)return;
  const pure=isPure(model),{settings,index}=materialProfile(pure);
  const vegetationValue=pure?formatNumber((model.provenance.treeRepresentation?.areaMM2??0)/100,{maximumFractionDigits:1}):formatNumber(model.treeCount);
  const vegetationLabel=pure?text('metrics.texture'):text('metrics.vegetation');
  const used=new Set(model.categories.map(part=>settings.assignments[index(part.id)])).size;
  const buildings=formatNumber(model.buildingCount);
  $('#metrics').innerHTML=`<div><strong>${model.width.toFixed(0)} × ${model.height.toFixed(0)}</strong><span>${text('metrics.size')}</span></div><div><strong>1:${formatNumber(model.scale)}</strong><span>${text('metrics.scale')}</span></div><div><strong>${vegetationValue}</strong><span>${vegetationLabel}</span></div><div><strong>${used} / ${settings.count}</strong><span>${text('metrics.usedMaterials')}</span></div><div><strong>${buildings}</strong><span>${text('metrics.buildings')}</span></div><div><strong>×${formatNumber(model.provenance.verticalExaggeration)}</strong><span>${text('metrics.exaggeration')}</span></div><div class="metric-wide"><strong>${formatNumber(model.triangles)}</strong><span>${text('metrics.triangles')}</span></div>`;
}
function dispose(mesh){mesh.geometry.dispose();mesh.material.dispose();group.remove(mesh);}
function addModelMesh(part){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(part.vertices,3));
  geometry.setIndex(new THREE.BufferAttribute(part.faces,1));
  geometry.computeVertexNormals();
  const pure=stagedBuild?.pureRelief??isPure(model);
  const smoothGround=!pure&&['terrain','forest','grass'].includes(part.id);
  if(smoothGround)smoothTerrainNormals(part.vertices,part.faces,geometry.getAttribute('normal').array);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:previewColor(pure,part.id)??part.color,roughness:.85,flatShading:!pure&&!smoothGround}));
  mesh.name=part.id;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
  return mesh;
}
const stageLabels={terrain:'runtime.material.relief',transport:'section.transport',buildings:'section.buildings',vegetation:'section.vegetation'};
function showBuildProgress(progress){
  if(!stagedBuild)return;
  if(!stagedBuild.progress)say('');
  stagedBuild.progress=progress;
  const {stage,step,totalSteps,completed,total,message}=progress;
  const count=Number.isFinite(completed)&&total>0
    ?`${formatNumber(completed)} / ${formatNumber(total)} · ${Math.floor(completed*100/total)} %`:'';
  const phase=step>0&&totalSteps>0?text('status.stepCount',{step:formatNumber(step),total:formatNumber(totalSteps)}):'';
  const label=[phase,stageLabels[stage]&&t(stageLabels[stage]),count,translateEngineMessage(message)].filter(Boolean).join(' · ');
  stagedBuild.label=label;
  if($('#work-label').textContent!==label)$('#work-label').textContent=label;
}
function showCatalogPlace(place){
  $('#catalog-place-summary').hidden=!place;
  if(!place)return;
  const {title,category,description}=localizeExample(place);
  $('#catalog-place-title').textContent=title;
  $('#catalog-place-kind').textContent=t(place.pureRelief===false?'example.modeComplete':'example.modeRelief')+' · '+category;
  $('#catalog-place-description').textContent=description;
}
function showBuildPreview({categories,width,height,mode,piece}){
  if(!stagedBuild||!categories.length)return;
  const first=!stagedBuild.preview;
  if(first){
    stagedBuild.camera={position:camera.position.clone(),target:controls.target.clone(),zoom:camera.zoom,maxDistance:controls.maxDistance};
    endVegetationEditing();
    $('#welcome').hidden=true;
    $('.preview-toolbar').hidden=false;
    showCatalogPlace(pendingCatalogPlace);
    if(!contextLost)renderer.setAnimationLoop(renderWorkshop);
  }
  if(first||mode!=='append')for(const mesh of [...group.children])dispose(mesh);
  for(const part of categories)addModelMesh(part);
  group.position.set(-width/2,-height/2,0);
  if(seams)seams.visible=false;
  stagedBuild.preview={width,height,piece};
  if(first)legend();
  const refit=first&&needsCameraFit(width,height,stagedBuild.bbox,stagedBuild.pose);
  if(refit)home();
  if(first&&processingRun)processingRun.firstTerrainPreviewMilliseconds=performance.now()-processingRun.started;
}
function needsCameraFit(width,height,bbox,pose){
  return !model||model.width!==width||model.height!==height||
    JSON.stringify(model.provenance.bbox)!==JSON.stringify(bbox)||
    JSON.stringify(model.provenance.options.selectionPose)!==JSON.stringify(pose);
}
function restoreBuildPreview(){
  const saved=stagedBuild?.camera;
  stagedBuild=null;
  pendingCatalogPlace=undefined;
  showCatalogPlace(modelCatalogPlace);
  if(!saved)return;
  if(model)display(model,null,false);
  else{
    for(const mesh of [...group.children])dispose(mesh);
    $('.preview-toolbar').hidden=true;
    renderer.setAnimationLoop(null);
  }
  camera.position.copy(saved.position);
  controls.target.copy(saved.target);
  controls.maxDistance=saved.maxDistance;
  camera.zoom=saved.zoom;
  camera.updateProjectionMatrix();
  controls.update();
}
function display(m,changedCategories=null,refit=true){
  for(const mesh of [...group.children])if(!changedCategories||changedCategories.includes(mesh.name))dispose(mesh);
  for(const part of m.categories)if(!changedCategories||changedCategories.includes(part.id))addModelMesh(part);
  group.position.set(-m.width/2,-m.height/2,0);recolor();tiling();if(refit)home();
  showModelNotes(m);
  refreshPinMarkers();
  if(!brushHasGeometry()&&brush!=='navigate')selectNavigate();
}
function showModelNotes(m){
  const budget=m.provenance.vegetationBudget;
  const budgetNote=$('#vegetation-budget-note');
  budgetNote.hidden=!budget||(budget.eligibleAutomatic<=budget.limit&&!budget.automaticReduced&&!budget.manualDropped);
  if(budget)budgetNote.textContent=budget.manualDropped?text('vegetation.budgetManual'):text('vegetation.budgetLimit',{count:formatNumber(budget.limit)});
  const list=document.createElement('ul');for(const message of m.warnings){const li=document.createElement('li');li.textContent=translateEngineMessage(message);list.appendChild(li);}$('#warnings').replaceChildren(list);
}
function shownPrintPlan(){
  return printPlan(...(model?[model.width,model.height]:size()));
}
function syncPrintSettings(locked=busy||pendingVegetation||reliefTimer!==null||drawing){
  $('#print-panel').hidden=!selectedSize;
  $('#pin-depth').disabled=locked;
  if(!selectedSize)return;
  const [width,height]=size(),cuts=printCuts(width,height),plan=printPlan(width,height);
  $('#print-cuts-reset').disabled=!cuts.columns&&!cuts.rows;
  $('#print-cuts-fields').disabled=$('#print-base-fields').disabled=locked;
  syncBaseAction();
  cutEditor.update({width,height,plan,cuts});
  const summary=$('#print-cuts-summary'),pending=pendingPieceSize();
  const description=text(pending?'print.pendingCuts':plan.tiles.length===1?'print.onePiece':'print.grid',
    {columns:formatNumber(plan.cols),rows:formatNumber(plan.rows),count:formatNumber(plan.tiles.length)});
  if(summary.textContent!==description)summary.textContent=description;
}
function syncBaseAction(){
  const input=$('#print-base');
  $('#print-base-apply').disabled=!validBaseThickness(input.valueAsNumber)||input.valueAsNumber===baseThickness;
}
function describeTiling(){
  if(!selectedSize)return;
  const [draftWidth,draftHeight]=size();
  const pending=$('#piece-resize-pending');
  pending.hidden=!pendingPieceSize();
  pending.textContent=pending.hidden?'':text('tiling.pending',{width:formatNumber(draftWidth/10),height:formatNumber(draftHeight/10)});
  const [w,h]=model?[model.width,model.height]:[draftWidth,draftHeight],plan=shownPrintPlan();
  const split=plan.tiles.length>1;
  const fits=fitsBambuProject(plan),format=printExportFormat(exportFormat,plan);
  $('[data-format="bambu"]').hidden=!fits;
  $('[data-format="bambu-zip"]').hidden=!split;
  showExportFormat(format);
  const mm=value=>formatNumber(value,{maximumFractionDigits:1});
  const count=formatNumber(plan.tiles.length);
  const first=plan.tiles[0];
  const uniform=plan.tiles.every(tile=>Math.abs(tile.width-first.width)<1e-6&&Math.abs(tile.height-first.height)<1e-6);
  $('#tiling-summary').textContent=split?(uniform?text('tiling.pieces',{count,width:mm(first.width),height:mm(first.height)}):text('print.customPieces',{count})):
    text('tiling.piece',{width:mm(w),height:mm(h)});
  const hint=!fits?text('print.bedLimit',{limit:mm(BAMBU_PROJECT_BED_MM)}):
    split?(format==='bambu'?text('tiling.bambu',{count}):text('tiling.zip')):text(format==='stl'?'tiling.stl':'tiling.checkFilaments');
  $('#export-hint').textContent=model&&needsBuild?text('tiling.pendingDownload',{hint}):hint;
}
function tiling(){
  describeTiling();
  const plan=model&&shownPrintPlan(),show=plan&&plan.tiles.length>1;
  const planKey=show&&JSON.stringify([plan.xCuts,plan.yCuts]);
  if(seams&&(!show||seamModel!==model||seamPlanKey!==planKey)){
    scene.remove(seams);seams.geometry.dispose();seams.material.dispose();seams=null;
  }
  if(show&&!stagedBuild?.preview&&!seams){
    const geo=new THREE.BufferGeometry();
    const positions=cutGuideSegments(model,plan),distances=new Float32Array(positions.length/3);
    // Keep the dash phase along each cut, even across separate terrain faces.
    for(let i=0;i<positions.length;i+=6){
      const axis=positions[i]===positions[i+3]?1:0;
      distances[i/3]=positions[i+axis];
      distances[i/3+1]=positions[i+3+axis];
    }
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geo.setAttribute('lineDistance',new THREE.BufferAttribute(distances,1));
    // Keep guides legible through trees and buildings. Their vertices still
    // follow the actual surface and move with the relief when the view turns.
    seams=new THREE.LineSegments(geo,new THREE.LineDashedMaterial({color:0x20392e,dashSize:5,gapSize:3,transparent:true,opacity:.95,depthTest:false,depthWrite:false}));
    seams.position.set(-model.width/2,-model.height/2,.04);
    seams.renderOrder=5;
    scene.add(seams);
    seamModel=model;
    seamPlanKey=planKey;
  }
  if(seams)seams.visible=!stagedBuild?.preview;
}
const pavementMode=new URLSearchParams(location.search).get('paviment');
const surfaceRoads=pavementMode==='antic'?undefined:pavementMode==='rasant'?'independent':pavementMode==='regional'?'regional':'grade-first';
function modelOptions(){const [widthMM,heightMM]=size(),pureRelief=pureSelected(),detail=Number($('#detail').value);return {pureRelief,surfaceRoads:pureRelief?undefined:surfaceRoads,streams:$('#streams').checked,streamWidth:Number($('#stream-width').value),reliefTrails:pureRelief&&$('#relief-trails').checked,reliefTrailWidth:pureRelief?reliefTrailWidth():RELIEF_TRAIL_WIDTH_MM,trailStrokes:pureRelief?trailStrokes:[],drawnRouteStrokes:pureRelief?drawnRouteStrokes:[],userRoute:pureRelief?userRoute:null,...(pureRelief?boundarySettings():{}),size:Math.max(widthMM,heightMM),widthMM,heightMM,baseThickness,exaggeration:fieldNumber('exag'),resolution:pureRelief?PURE_RELIEF_RESOLUTIONS[detail]:LANDSCAPE_RESOLUTIONS[detail],roadRise:Number($('#road-rise').value),railRise:Number($('#rail-rise').value),trailWidth:Number($('#trail-width').value),estimatedTunnels:!pureRelief&&$('#estimated-tunnels').checked,majorRoads:!pureRelief&&$('#major-profiles').checked,smoothProfiles:true,targetScale:null,selectionPose:selectedPose,buildingMode:pureRelief?'none':$('#building-mode').value,maxBuildingHeight:fieldNumber('building-height'),...vegetation()};}

function configurationKey(o){return JSON.stringify([!!o.pureRelief,o.widthMM,o.heightMM,o.baseThickness,o.exaggeration,o.resolution,o.streams,o.streamWidth,!!o.reliefTrails,o.reliefTrailWidth??RELIEF_TRAIL_WIDTH_MM,o.trailStrokes??[],o.drawnRouteStrokes??[],o.userRoute??null,boundaryKey(o),o.roadRise??0,o.railRise??0,o.trailWidth??1,o.estimatedTunnels??true,o.majorRoads??false,o.targetScale,o.selectionPose?.center,o.selectionPose?.widthM,o.selectionPose?.heightM,o.selectionPose?.rotation,o.buildingMode,o.maxBuildingHeight]);}
function sameLoadedCrop(options,{includeMode=true}={}){
  const old=model?.provenance.options;
  if(!old||dirty||includeMode&&options.pureRelief!==!!old.pureRelief)return false;
  const a=options.selectionPose,b=old.selectionPose;
  return ['widthMM','heightMM','targetScale'].every(key=>options[key]===old[key])&&a&&b&&
    ['widthM','heightM','rotation'].every(key=>Math.abs(a[key]-b[key])<1e-6)&&
    a.center.every((value,index)=>Math.abs(value-b.center[index])<1e-10);
}
const sameTerrainFrame=options=>sameLoadedCrop(options)&&options.resolution===model.provenance.options.resolution;
const reliefKeys=['baseThickness','exaggeration','streams','streamWidth','reliefTrails','reliefTrailWidth','trailStrokes','drawnRouteStrokes','userRoute'];
function sameReliefField(key,options,old){
  if(key==='reliefTrails')return options[key]===!!old[key];
  if(key==='reliefTrailWidth')return options[key]===(old[key]??RELIEF_TRAIL_WIDTH_MM);
  if(key==='userRoute')return JSON.stringify(options[key])===JSON.stringify(old[key]??null);
  if(key==='trailStrokes'||key==='drawnRouteStrokes')return sameReliefTrailStrokes(options[key],old[key]??[]);
  return options[key]===old[key];
}
function sameTerrain(options,includeTransport=true){
  const old=model?.provenance.options;
  const keys=includeTransport?[...reliefKeys,'roadRise','railRise','trailWidth','estimatedTunnels','majorRoads']:reliefKeys;
  return sameTerrainFrame(options)&&(!options.pureRelief||boundaryKey(options)===boundaryKey(old))&&
    keys.every(key=>sameReliefField(key,options,old));
}
const canUpdateElevation=options=>!!region&&!tooLargeRegion&&sameTerrainFrame(options);
const canUpdateRelief=options=>options.pureRelief&&canUpdateElevation(options);
function cancelReliefUpdate(){
  clearTimeout(reliefTimer);
  reliefTimer=null;
}
function requestReliefUpdate(message,allowLandscape=false){
  cancelReliefUpdate();
  const options=modelOptions();
  if(!(allowLandscape?canUpdateElevation(options):canUpdateRelief(options))){requireBuild(message);return;}
  if(options.pureRelief){needsBuild=false;badge('');}
  say('');
  reliefTimer=setTimeout(flushReliefUpdate,options.pureRelief?150:250);
  lock(busy);
}
async function flushReliefUpdate(){
  if(busy||pendingVegetation||drawing){reliefTimer=setTimeout(flushReliefUpdate,100);return;}
  reliefTimer=null;
  const options=modelOptions();
  if(!canUpdateElevation(options)){lock(false);return;}
  if(!options.pureRelief){
    const previous=model.provenance.options;
    if(['exaggeration','streams','streamWidth','baseThickness'].some(key=>options[key]!==previous[key]))generate();
    else lock(false);
    return;
  }
  if(!canUpdateRelief(options)){lock(false);return;}
  if(sameTerrain(options,false)){
    needsBuild=false;badge('');lock(false);say(statusMessage('status.reliefReady'));return;
  }
  job='relief';
  lock(true);
  try{
    const changes=Object.fromEntries(reliefKeys.map(key=>[key,options[key]]));
    let boundaryLayer;
    if(boundaryKey(options)!==boundaryKey(model.provenance.options)){
      Object.assign(changes,boundarySettings());
      say('Carregant les fronteres i els límits…');
      boundaryLayer=await loadBoundaryLayer(region,options.boundaryStyles,options.selectionPose.widthM*1000/options.widthMM);
    }
    worker.postMessage({type:'relief',options:changes,boundaryLayer});
  }catch(error){recoverRelief(error);}
}
function recoverRelief(error){
  if(reliefTimer===null&&canUpdateRelief(modelOptions())){
    const {exaggeration,streams,streamWidth,reliefTrails,reliefTrailWidth:previousTrailWidth,baseThickness:previousBase}=model.provenance.options;
    baseThickness=previousBase;
    $('#print-base').value=baseThickness;
    $('#exag').value=exaggeration;
    syncExaggerationLabel();
    $('#streams').checked=streams;
    $('#stream-width').value=streamWidth;
    $('#relief-trails').checked=!!reliefTrails;
    trailWidthControl.value=previousTrailWidth??RELIEF_TRAIL_WIDTH_MM;
    trailStrokes=(model.provenance.options.trailStrokes??[]).slice();
    drawnRouteStrokes=(model.provenance.options.drawnRouteStrokes??[]).slice();
    userRoute=model.provenance.options.userRoute??null;
    setBoundarySettings(model.provenance.options);
    needsBuild=false;
    badge('');
  }
  lock(false);
  say(statusMessage('status.keepModel',()=>({error:messageText(error.uiMessage??error.message)})),true);
  flushTrees();
}
function syncBuildingSources(bbox){
  const available=inCatalonia(bbox),select=$('#building-source');select.querySelector('[value=icgc]').disabled=!available;
  if(available!==icgcAvailable){const before=select.value;if(!buildingSourceExplicit||select.value==='icgc'&&!available)select.value=defaultBuildingSource(bbox);if(region&&before!==select.value)buildingSourceDirty=true;icgcAvailable=available;}
}
function buildingInfo(){sourceSummary();const info=$('#building-info');if(isPure(model)){info.textContent=text('building.pureInfo');return;}const b=region.meta.buildings;if(region.meta.buildingSource==='osm3d'){info.textContent=b.roofSourceUnavailable?text('building.roofMissing'):text('building.osmOriginal');return;}info.textContent=b.officialCount?text('building.icgcDetails',{official:formatNumber(b.officialCount),osm:formatNumber(b.osmRetained)}):b.provider==='GeoJSON local'?text('building.localDetails',{count:formatNumber(b.count)}):b.partCount!=null?text('building.cadastreDetails',{parts:formatNumber(b.partCount),count:formatNumber(b.count)}):'OpenStreetMap via OpenFreeMap.';}
async function generate(autoTransport=false){
  if(busy||pendingVegetation||drawing||tooLargeRegion||!selection||!selectedSize)return;
  cancelReliefUpdate();
  if(processingRun)finishProcessing(Error('La generació següent ha substituït l’actualització pendent.'));
  clearTimeout(transportTimer);transportTimer=null;
  scheduler.cancel();
  if(!model){
    $('#welcome').hidden=true;
    showWorkshopPanel('preview');
  }
  job=autoTransport?'transport':'build';lock(true);pendingVegetation=false;pendingBuildingLayer=null;pendingFullRegion=null;pendingCadastralBuild=false;recoveryNotice='';
  pendingBrushFrame=null;pendingTrailFrame=null;pendingRouteFrame=null;
  const options=modelOptions(),requestedName=placeName||text('status.region');
  pendingCatalogPlace=CURATED_EXAMPLES.find(example=>example.id===exampleSelection?.id&&
    (example.pureRelief!==false)===options.pureRelief)??null;
  const panoramic=isPanoramicSize(options.widthMM,options.heightMM);
  const reload=dirty||!region||options.pureRelief!==isPure(model)||panoramic!==isPanoramicSize(model?.width,model?.height);
  const defaultCenter=recommendedPlace(DEFAULT_PLACE).center;
  const atDefaultCenter=options.pureRelief&&selectedPose?.center.every((value,i)=>Math.abs(value-defaultCenter[i])<1e-5);
  const useSample=recommendedPlace(exampleSelection?.id)?.id||(atDefaultCenter?DEFAULT_PLACE:false);
  const applied=model?.provenance.options;
  const transportOnly=!options.pureRelief&&autoTransport&&!reload&&!buildingSourceDirty&&sameTerrain(options,false)&&options.trailWidth===(applied.trailWidth??1)&&
    ['buildingMode','maxBuildingHeight','trees','treeType'].every(key=>options[key]===applied[key]);
  if(transportOnly){
    say(statusMessage('status.transportUpdating'));
    worker.postMessage({type:'transport',options:{roadRise:options.roadRise,railRise:options.railRise,estimatedTunnels:options.estimatedTunnels,majorRoads:options.majorRoads}});
    return;
  }
  const incremental=!options.pureRelief&&!reload&&sameTerrain(options);
  if(!incremental){pendingBrushFrame=brushHistory.prepare(options,strokes);options.strokes=pendingBrushFrame.strokes;}
  if(options.pureRelief){
    pendingTrailFrame=trailHistory.prepare(options,trailStrokes);
    pendingRouteFrame=routeHistory.prepare(options,drawnRouteStrokes);
    options.trailStrokes=pendingTrailFrame.strokes;
    options.drawnRouteStrokes=pendingRouteFrame.strokes;
  }
  if(!incremental){
    const {strokes:brushStrokes,trailStrokes:trailPoints,drawnRouteStrokes:routePoints,...settings}=options;
    processingRun={started:performance.now(),startedAt:new Date().toISOString(),schemaVersion:1,
      appVersion:$('#version-open').textContent.trim(),environment:'browser',
      selection:{name:requestedName,bbox:selection.slice(),mapZoom:placeMap.map.getZoom(),sample:useSample||null},
      settings:{...settings,brushStrokeCount:brushStrokes.length,trailPointCount:trailPoints.length,routePointCount:routePoints.length,requestedBuildingSource:options.pureRelief?null:$('#building-source').value},
      reusedRegion:!reload,sources:[]};
  }
  try{
    if(reload){
      say(baseMessage('status.loadingTerrain'));
      const source=$('#building-source').value;
      pendingCadastralBuild=!options.pureRelief&&source==='catastre';
      pendingFullRegion=await loadRegion({sample:useSample,bbox:selection,pureRelief:options.pureRelief,panoramic,buildingSource:pendingCadastralBuild?'osm':source,buildingFallbacks:[lastValidBuildings?.source,defaultBuildingSource(selection),'osm'].filter(Boolean),onTiming:event=>processingRun?.sources.push(event)},say);
      pendingFullRegion.meta.name=requestedName;recoveryNotice=pendingFullRegion.recovery?.notice||'';
    }
    if(incremental){job='buildings';lock(true);}
    if(!options.pureRelief&&!reload&&buildingSourceDirty){
      const source=$('#building-source').value;
      pendingBuildingLayer=await loadProjectBuildings(region,source,options,()=>incremental&&sameTerrain(options));
    }
    if(incremental){
      job='buildings';const layer=pendingBuildingLayer?{features:pendingBuildingLayer.features,meta:{...region.meta,buildings:pendingBuildingLayer.metadata,buildingSource:pendingBuildingLayer.source,sourceWarnings:[...(region.terrainWarnings||[]),...pendingBuildingLayer.warnings],localSources:{...region.meta.localSources,buildings:null}}}:{};
      needsBuild=tooLargeRegion||dirty||configurationKey(options)!==configurationKey(modelOptions());say(baseMessage('status.updatingBuildings'));worker.postMessage({type:'buildings',layer,options});
    }else{
      if(pendingBuildingLayer){
        pendingFullRegion=applyBuildingLayer({...region,meta:{...region.meta},features:[...region.features]},pendingBuildingLayer);
        pendingBuildingLayer=null;
      }
      const target=pendingFullRegion||region;
      let boundaryLayer;
      if(activeBoundaries(options.boundaryStyles).length){
        say('Carregant les fronteres i els límits…');
        const started=performance.now();
        boundaryLayer=await loadBoundaryLayer(target,options.boundaryStyles,options.selectionPose.widthM*1000/options.widthMM);
        processingRun.sources.push({phase:'source.boundaries',milliseconds:performance.now()-started,
          ok:!boundaryLayer.metadata?.failed.length});
      }
      needsBuild=false;say(baseMessage('status.building'));
      const {meta,features,dem,bridgeDem}=target;
      processingRun.data={bbox:meta.bbox,vectorFeatures:features.length,demTiles:dem.length,
        extraBridgeTiles:bridgeDem?.length??0,terrainProvider:meta.terrain?.provider??(useSample?'sample':null),buildingSource:meta.buildingSource,
        ...(options.pureRelief?{demZoom:meta.terrain?.zoom,demSampleSize:meta.terrain?.sampleSize,coverage:meta.coverage}:{})};
      processingRun.workerStartMilliseconds=performance.now()-processingRun.started;
      stagedBuild={bbox:meta.bbox,pose:options.selectionPose,pureRelief:options.pureRelief};
      worker.postMessage(buildRequest({...target,boundaryLayer},options));
    }
  }catch(e){pendingVegetation=false;recoverBuildings(e);}
}

function acceptBuildings(){
  lastValidBuildings={source:region.meta.buildingSource,mode:model.provenance.options.buildingMode,height:model.provenance.options.maxBuildingHeight};
}
function recoverBuildings(error){
  if(job==='build')trackWorkshopEvent('error_generacio',{mode:workshopMode(pureSelected())});
  finishProcessing(error);
  clearBuildingPreview();
  restoreBuildPreview();
  pendingFullRegion=null;pendingBuildingLayer=null;pendingBrushFrame=null;pendingTrailFrame=null;pendingRouteFrame=null;pendingCadastralBuild=false;
  if(job==='transport'&&model){
    const applied=model.provenance.options;
    $('#road-rise').value=applied.roadRise;
    $('#rail-rise').value=applied.railRise;
    $('#trail-width').value=applied.trailWidth??1;
    $('#estimated-tunnels').checked=applied.estimatedTunnels;
    $('#major-profiles').checked=!!applied.majorRoads;
  }
  if(lastValidBuildings){
    const prior=lastValidBuildings;if(prior.source!=='local')$('#building-source').value=prior.source;
    $('#building-mode').value=prior.mode;$('#building-height').value=prior.height;
    buildingSourceDirty=false;
  }
  needsBuild=!model||!sameTerrain(modelOptions())||configurationKey(model.provenance.options)!==configurationKey(modelOptions());
  buildingControls();badge(needsBuild?statusMessage('pending.selection'):'');lock(false);
  if(!model){
    $('#welcome').hidden=false;
    showWorkshopPanel('settings');
  }
  say(model?statusMessage('status.keepBuildingSettings',()=>({error:messageText(error.uiMessage??error.message)})):error.uiMessage??error.message,true);
}

function updateTrees(){
  if(!canUpdateElevation(modelOptions())){
    requireBuild(statusMessage('pending.selection'));
    return;
  }
  pendingVegetation=true;lock(busy);clearTimeout(timer);
  if(!drawing){say(statusMessage('status.brushWait'));timer=setTimeout(flushTrees,170);}
}
function flushTrees(){
  if(!pendingVegetation||drawing||busy)return;
  pendingVegetation=false;
  if(!canUpdateElevation(modelOptions())){requireBuild(statusMessage('pending.selection'));return;}
  job='vegetation';lock(true);worker.postMessage({type:'vegetation',options:vegetation()});
}
let buildingsSettle=null,buildingsToken=0;
let previewRequest=null,previewSerial=0;
function clearBuildingPreview(){
  if(!previewRequest)return;
  if(previewRequest.mesh)dispose(previewRequest.mesh);
  if(previewRequest.original)previewRequest.original.visible=true;
  previewRequest=null;
}
function flushBuildingPreview(request){
  if(request!==previewRequest||request.working||!request.next||!request.isCurrent())return;
  request.working=true;
  worker.postMessage({type:'preview-buildings',id:request.id,options:request.options,...request.next});
  request.next=null;
}
function loadProjectBuildings(targetRegion,source,options,isCurrent){
  if(source!=='catastre'||!model||!isCurrent())return loadBuildingLayer(targetRegion,{source},say);
  const request={id:++previewSerial,options,isCurrent};
  previewRequest=request;
  return loadBuildingLayer(targetRegion,{source,onBatch:batch=>{
    if(processingRun?.awaitingBuildings)processingRun.cadastralBlocks.push({completed:batch.completed,total:batch.total,availableFeatures:batch.features.length,atMilliseconds:performance.now()-processingRun.started});
    if(previewRequest!==request||!isCurrent())return;
    if(batch.completed<batch.total){
      request.next=batch;
      flushBuildingPreview(request);
    }else request.next=null;
  }},say);
}
function showBuildingPreview(data){
  const request=previewRequest;
  if(!request||data.id!==request.id)return;
  request.working=false;
  if(!request.isCurrent()){clearBuildingPreview();return;}
  if(data.part){
    if(request.mesh)dispose(request.mesh);
    request.original??=group.children.find(mesh=>mesh.name==='buildings');
    if(request.original)request.original.visible=false;
    request.mesh=data.part.faces.length?addModelMesh(data.part):null;
    badge(statusMessage('status.cadastrePreview',()=>({completed:formatNumber(data.completed),total:formatNumber(data.total)})));
  }
  flushBuildingPreview(request);
}
async function autoBuildings(state,token){
  job='buildings';lock(true);
  const targetRegion=region,source=$('#building-source').value,options=modelOptions();
  let loaded=null;
  if(buildingSourceDirty){
    const report=processingRun?.awaitingBuildings?processingRun:null,start=performance.now();
    try{loaded=await loadProjectBuildings(targetRegion,source,options,()=>scheduler.isCurrent(token)&&region===targetRegion&&sameTerrain(options));}
    catch(e){
      report?.sources.push({phase:'source.cadastral-blocks',milliseconds:performance.now()-start,ok:false});
      recoverBuildings(e);throw e;
    }
    report?.sources.push({phase:'source.cadastral-blocks',milliseconds:performance.now()-start,ok:true});
  }
  if(!scheduler.isCurrent(token)||region!==targetRegion||!sameTerrain(options)){
    if(processingRun?.awaitingBuildings)finishProcessing(Error('S’ha interromput l’actualització pendent d’edificis.'));
    clearBuildingPreview();lock(false);return;
  }
  if(loaded)pendingBuildingLayer=loaded;
  const layer=pendingBuildingLayer?{features:pendingBuildingLayer.features,meta:{...region.meta,buildings:pendingBuildingLayer.metadata,buildingSource:pendingBuildingLayer.source,sourceWarnings:[...(region.terrainWarnings||[]),...pendingBuildingLayer.warnings],localSources:{...region.meta.localSources,buildings:null}}}:{};
  needsBuild=tooLargeRegion||dirty;say(baseMessage('status.updatingBuildings'));buildingsToken=token;
  worker.postMessage({type:'buildings',layer,options,measureBuildings:!!processingRun?.awaitingBuildings});
  return new Promise((resolve,reject)=>{buildingsSettle={resolve,reject};});
}
const scheduler=createBuildingUpdateScheduler({delay:300,canAutoUpdate:()=>!pureSelected()&&!!model&&!!region&&!tooLargeRegion&&sameTerrain(modelOptions()),isBusy:()=>busy||pendingVegetation||drawing,run:autoBuildings});
function requestBuildingsAuto(message){
  const phase=scheduler.notify();
  if(phase==='manual'||phase==='disposed'){requireBuild(message);return;}
  needsBuild=true;badge(statusMessage('pending.changes'));say(phase==='queued'?statusMessage('status.buildingsQueued'):statusMessage('status.buildingsAuto'));lock(busy);
}
function settleBuildings(error){
  if(!buildingsSettle)return;const {resolve,reject}=buildingsSettle;buildingsSettle=null;buildingsToken=0;
  if(error)reject(error);else resolve();
}
worker.onmessage=({data})=>{
  if(data.type==='building-preview'){showBuildingPreview(data);return;}
  if(data.type==='build-progress'){showBuildProgress(data);return;}
  if(data.type==='build-preview'){showBuildPreview(data);return;}
  if(data.type==='progress'&&!stagedBuild?.label)say(data.message);
  if(data.type==='model'){
    clearBuildingPreview();
    let startCadastre=false;
    if(!data.vegetation&&!data.buildings&&pendingBrushFrame){strokes=brushHistory.accept(pendingBrushFrame,strokes);pendingBrushFrame=null;}
    if(!data.vegetation&&!data.buildings&&pendingTrailFrame){trailStrokes=trailHistory.accept(pendingTrailFrame,trailStrokes);pendingTrailFrame=null;}
    if(!data.vegetation&&!data.buildings&&pendingRouteFrame){drawnRouteStrokes=routeHistory.accept(pendingRouteFrame,drawnRouteStrokes);pendingRouteFrame=null;}
    if(pendingFullRegion&&!data.vegetation&&!data.buildings){
      region=pendingFullRegion;pendingFullRegion=null;buildingSourceDirty=false;
      startCadastre=pendingCadastralBuild;
      pendingCadastralBuild=false;
      if(!data.model.provenance.options.pureRelief&&region.meta.buildingSource!=='local')$('#building-source').value=region.meta.buildingSource;
    }
    if(!data.vegetation){
      dirty=!sameBounds(selection,region.meta.bbox);
      const options=modelOptions();
      const anotherReliefUpdate=data.relief&&reliefTimer!==null&&canUpdateRelief(options);
      needsBuild=tooLargeRegion||dirty||!anotherReliefUpdate&&configurationKey(data.model.provenance.options)!==configurationKey(options);
    }
    if(data.buildings&&buildingsToken&&!scheduler.isCurrent(buildingsToken)){
      settleBuildings();lock(false);scheduler.flush();return;
    }
    const changed=data.changedCategories??(data.buildings?['buildings','trees','roads','railways']:data.vegetation?['trees']:null);
    if(changed)data.model.categories=[...model.categories.filter(part=>!changed.includes(part.id)),...data.model.categories];
    if(data.buildings){
      if(pendingBuildingLayer){applyBuildingLayer(region,pendingBuildingLayer);pendingBuildingLayer=null;}
      region.meta={...region.meta,localSources:data.model.provenance.localSources};
      buildingSourceDirty=false;
    }
    const refit=!changed&&!stagedBuild?.preview&&needsCameraFit(data.model.width,data.model.height,data.model.provenance.bbox,data.model.provenance.options.selectionPose);
    stagedBuild=null;
    if(!model){
      $('#welcome').hidden=true;
      $('.preview-toolbar').hidden=false;
      if(!contextLost)renderer.setAnimationLoop(renderWorkshop);
    }
    model=data.model;
    if(pendingCatalogPlace!==undefined){
      modelCatalogPlace=pendingCatalogPlace;
      pendingCatalogPlace=undefined;
    }
    showCatalogPlace(modelCatalogPlace);
    if(!data.vegetation){if(!isPure(model))acceptBuildings();buildingInfo();buildingControls();}
    const displayStarted=performance.now();
    display(model,changed,refit);
    if(job==='build'&&!data.buildings)trackWorkshopEvent('genera_model',{
      mode:workshopMode(isPure(model)),mida:workshopSize(model.width,model.height)
    });
    if(processingRun&&data.timing){
      const report=processingRun;
      if(data.buildings)report.buildingWorker=data.timing;
      else report.worker=data.timing;
      (report.displayMilliseconds??=[]).push(performance.now()-displayStarted);
      report.result={widthMM:model.width,heightMM:model.height,scale:model.scale,triangles:model.triangles,buildings:model.buildingCount,
        trees:model.treeCount,vegetationAreaMM2:model.provenance.treeRepresentation?.areaMM2,buildingSource:model.provenance.buildingSource,warnings:model.warnings,
        coverageCells:model.provenance.coverageCells,surfaceRoads:model.provenance.surfaceRoads};
      if(startCadastre){report.awaitingBuildings=true;report.cadastralBlocks=[];}
      else finishProcessing();
    }
    badge(needsBuild?statusMessage('pending.changes'):'');
    lock(false);
    const profiles=model.provenance.majorRoads;
    const surface=model.provenance.surfaceRoads;
    let profileNotice='';
    if(!data.buildings&&!data.vegetation){
      const notice=(key,params)=>()=>text(key,params?.())+(narrowWorkshop.matches?'':' '+text('status.viewNotes'));
      if(surface?.mode==='regional'&&(surface.applied||surface.eligible||surface.error))profileNotice=surface.applied?
        notice('status.pavementApplied',()=>({count:formatNumber(surface.accepted)})):
        notice('status.pavementNotApplied');
      else if(profiles?.enabled&&!profiles.applied)profileNotice=notice('status.profilesNotApplied');
    }
    say(recoveryNotice||(needsBuild?baseMessage('status.pendingChanges'):profileNotice||(data.vegetation?baseMessage('status.vegetationUpdated'):data.relief?statusMessage('status.reliefUpdated'):isPure(model)?statusMessage('status.reliefReady'):data.changedCategories?statusMessage('status.transportUpdated'):data.buildings?baseMessage('status.buildingsUpdated'):baseMessage('status.modelReady'))));
    recoveryNotice='';settleBuildings();flushTrees();scheduler.flush();
    if(startCadastre){
      $('#building-source').value='catastre';
      buildingSourceDirty=true;
      buildingControls();
      requestBuildingsAuto(statusMessage('pending.cadastre'));
    }
  }
  if(data.type==='error'){
    if(job==='relief'){recoverRelief(Error(data.message));console.error(data.detail);return;}
    if(processingRun&&data.timing)processingRun[processingRun.awaitingBuildings?'buildingWorker':'worker']=data.timing;
    pendingVegetation=false;
    if(job==='build'||job==='buildings'||job==='transport')recoverBuildings(Error(data.message));
    else{
      lock(false);say(()=>translateEngineMessage(data.message),true);
      if(job==='export'){
        feedback('export-feedback',()=>translateEngineMessage(data.message));
        if(/^Forat \d+ rebutjat:/.test(data.message)){
          showViewerTools(true,{pane:'pins'});
          const id=Number(data.message.match(/^Forat (\d+)/)?.[1]);selectPin(id);
          feedback('pin-feedback',()=>translateEngineMessage(data.message));
        }
      }
    }
    settleBuildings(Error(data.message));console.error(data.detail);
  }
  if(data.type==='download'){const zipped=data.archive||data.format==='stl',blob=new Blob([data.bytes],{type:zipped?'application/zip':'model/3mf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=data.filename||`relleu-obert-${data.archive?'peces-':data.plateCount?'plaques-':''}${data.format}${zipped?'.zip':'.3mf'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);lock(false);say(data.accessory?statusMessage('status.exportAccessory'):data.archive?statusMessage('status.exportArchive'):data.plateCount?statusMessage(data.plateCount===1?'status.exportPlateOne':'status.exportPlates',()=>({count:formatNumber(data.plateCount)})):statusMessage('status.exportReady'));flushTrees();scheduler.flush();}
  if(data.type==='download'&&!data.accessory)trackWorkshopEvent('descarrega_model',{
    mode:workshopMode(isPure(model)),
    format:data.archive&&data.format==='bambu'?'bambu-zip':data.format,
    peces:shownPrintPlan().tiles.length
  });
};
worker.onerror=event=>{
  const error=Error('No s’ha pogut actualitzar la maqueta: '+event.message);
  error.uiMessage=statusMessage('status.modelError',()=>({error:translateEngineMessage(event.message)}));
  if(job==='relief'){recoverRelief(error);return;}
  pendingVegetation=false;
  if(job==='build'||job==='buildings'||job==='transport')recoverBuildings(error);
  else{lock(false);say(error.uiMessage,true);}
  settleBuildings(error);
};
function cancelPlaceSearch(){
  placeSearchScheduler.cancel();
  clearPlaceSearchResults();
}
function clearPlaceSearchResults(){
  searchResults.replaceChildren();
  activatePlaceResult(null);
  placeSearch.setAttribute('aria-expanded','false');
  if(currentStatus===searchPending||currentStatus===searchChoose||currentStatus===searchEmpty)say('');
}
function activatePlaceResult(option){
  activePlaceResult?.setAttribute('aria-selected','false');
  activePlaceResult=option;
  if(option){
    option.setAttribute('aria-selected','true');
    placeSearch.setAttribute('aria-activedescendant',option.id);
  }else placeSearch.removeAttribute('aria-activedescendant');
}
async function searchPlace(query,signal){
  clearPlaceSearchResults();
  say(searchPending);
  try{
    const results=await placeMap.search(query,signal);
    if(signal.aborted)return;
    if(results===null){say(baseMessage('status.regionChosen'));return;}
    for(const [index,result] of results.entries()){
      const button=document.createElement('button');
      button.type='button';
      button.id=`place-result-${index}`;
      button.tabIndex=-1;
      button.setAttribute('role','option');
      button.setAttribute('aria-selected','false');
      button.textContent=result.label;
      button.onclick=()=>{
        placeMap.choose(result);
        placeSearch.value=result.label;
        cancelPlaceSearch();
        say(baseMessage('status.regionChosen'));
      };
      searchResults.appendChild(button);
    }
    if(results.length){
      placeSearch.setAttribute('aria-expanded','true');
      activatePlaceResult(searchResults.firstElementChild);
    }
    say(results.length?searchChoose:searchEmpty);
  }catch(error){
    if(!signal.aborted)say(error.messageKey?baseMessage(error.messageKey):error.message,true);
  }
}
function schedulePlaceSearch(event){
  clearPlaceSearchResults();
  placeSearchScheduler.schedule(event.isComposing||placeSearch.disabled?'':placeSearch.value.trim());
}
placeSearch.oninput=placeSearch.oncompositionend=schedulePlaceSearch;
placeSearch.oncompositionstart=cancelPlaceSearch;
document.addEventListener('pointerdown',event=>{
  if((activePlaceResult||!searchSpinner.hidden)&&!searchForm.contains(event.target))cancelPlaceSearch();
},true);
placeSearch.onkeydown=event=>{
  if(event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  if(event.key==='Escape'&&(activePlaceResult||!searchSpinner.hidden)){
    event.preventDefault();
    cancelPlaceSearch();
    return;
  }
  if(!activePlaceResult)return;
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();
    const next=event.key==='ArrowDown'?activePlaceResult.nextElementSibling:activePlaceResult.previousElementSibling;
    if(next){
      activatePlaceResult(next);
      next.scrollIntoView({block:'nearest'});
    }
  }else if(event.key==='Enter'){
    event.preventDefault();
    activePlaceResult.click();
  }
};
searchForm.onsubmit=event=>{
  event.preventDefault();
  if(narrowWorkshop.matches)placeSearch.blur();
  placeSearchScheduler.start(placeSearch.disabled?'':placeSearch.value.trim());
};
const panoramicPilotId='pirineus-eix';
const legacyReliefPilotId='pirineus-relleu';
const legacyAnetoIds=[legacyReliefPilotId,'aneto-llacs'];
const panoramicPilotAvailable=()=>panoramicSelected()&&Math.max(...size())>=900;
function syncModelModeCopy(panoramic=panoramicSelected(),pure=pureSelected()){
  $('#transport-title').textContent=t(pure?'ui.tools.waterTrails':'ui.tools.waterWays');
  const range=(panoramic?PANORAMIC_SCALE_RANGE:PURE_SCALE_RANGE).map(stop=>'1:'+formatNumber(stop)).join('–');
  $('#model-mode-note').textContent=text(panoramic?'mode.panoramic':pure?'mode.relief':'mode.complete',{range});
  $('#vegetation-label').textContent=pure?text('vegetation.labelRelief'):text('vegetation.labelComplete');
  $('#brush-density-label').textContent=pure?text('vegetation.brushIntensity'):text('vegetation.brushDensity');
  $('#clear-brush').textContent=pure?text('vegetation.resetTexture'):text('vegetation.resetTrees');
  $('#vegetation-brush-note').textContent=pure?text('vegetation.paintRelief'):
    text('vegetation.paintComplete');
}
function syncModelMode(){
  const panoramic=panoramicSelected(),pure=panoramic||regularPureRelief;
  $('#mode-relief').checked=pure;
  $('#mode-landscape').checked=!pure;
  $('#mode-landscape').disabled=panoramic;
  $('#relief-texture-settings').hidden=!pure;
  $('#relief-trail-settings').hidden=!pure;
  $('#print-pins-link').hidden=!pure;
  syncViewerTools();
  $('#landscape-transport-settings').hidden=pure;
  $('#relief-boundary-settings').hidden=!pure;
  $('#tree-type').hidden=$('label[for="tree-type"]').hidden=pure;
  syncModelModeCopy(panoramic,pure);
  document.querySelector('[data-step="buildings"]').hidden=pure;
  buildingControls();
  if(!panoramicPilotAvailable()&&exampleSelection?.id===panoramicPilotId)exampleSelection=null;
  legend();
}
function applyPureRelief(){
  cancelReliefUpdate();
  if(!panoramicSelected())regularPureRelief=pureSelected();
  syncModelMode();
  const pure=pureSelected();
  scheduler.cancel();
  clearTimeout(transportTimer);
  transportTimer=null;
  endVegetationEditing();
  const curated=CURATED_EXAMPLES.find(example=>example.id===exampleSelection?.id);
  if(curated?(curated.pureRelief??true)!==pure:!pure&&exampleSelection?.id===legacyReliefPilotId){
    exampleSelection=null;
    placeName='';
  }
  placeMap.setPureRelief(pure);
  scaleHint();
  openStep('place');
  requireBuild(statusMessage('pending.mode'));
}
$('#model-mode').onchange=()=>{
  const applyHere=sameLoadedCrop(modelOptions(),{includeMode:false});
  applyPureRelief();
  if(applyHere&&sameLoadedCrop(modelOptions(),{includeMode:false}))generate();
};
for(const id of ['streams','stream-width'])$('#'+id).onchange=()=>requestReliefUpdate(statusMessage('pending.streams'),true);
const requestTrailUpdate=()=>requestReliefUpdate(statusMessage('pending.reliefTrails'));
function syncRouteSettings(locked){
  $('#route-import').disabled=$('#route-remove').disabled=locked;
  $('#route-remove').hidden=!userRoute;
  const out=userRoute&&model?.provenance.options.userRoute?.name===userRoute.name&&model.provenance.userRouteInCrop===false;
  $('#route-summary').textContent=out?text('route.outside',{name:userRoute.name}):userRoute?.name??text('route.empty');
}
$('#route-import').onclick=()=>$('#route-file').click();
$('#route-remove').onclick=()=>{
  userRoute=null;
  syncRouteSettings(false);
  requestReliefUpdate(statusMessage('pending.reliefTrails'));
};
$('#route-file').onchange=async event=>{
  const file=event.target.files[0];
  event.target.value='';
  if(!file)return;
  try{
    if(file.size>MAX_GPX_BYTES)throw Error('El fitxer GPX supera el límit d’1,5 MB.');
    const route=parseUserRouteGPX(await file.text(),file.name.replace(/\.gpx$/i,''));
    if(!pureSelected())return;
    userRoute=route;
    trackWorkshopEvent('usa_eina',{eina:'importa_gpx'});
    syncRouteSettings(busy);
    requestReliefUpdate(statusMessage('pending.reliefTrails'));
  }catch(error){say(translateEngineMessage(error.message),true);}
};
$('#relief-trails').onchange=()=>{
  if(!$('#relief-trails').checked&&trailBrush())endVegetationEditing();
  requestTrailUpdate();
};
bindFieldCommit(trailWidthControl,before=>{
  if(!validReliefTrailWidth(trailWidthControl.valueAsNumber))trailWidthControl.value=before;
  if(trailWidthControl.valueAsNumber!==Number(before))requestTrailUpdate();
});
trailEraserControl.onchange=()=>{
  if(!trailEraserControl.checkValidity()||!trailEraserControl.value)trailEraserControl.value=trailEraserControl.defaultValue;
};
function setExampleRegion(id,name,bbox,rotation){
  placeMap.setRotation(rotation);
  exampleSelection={id,bbox:selectionPose(bbox,rotation).bbox,rotation};
  placeName=name;
  placeSearch.value='';
  cancelPlaceSearch();
  placeMap.setRegion(bbox);
}
function syncWelcomeCopy(){
  if(!selectedSize)return;
  $('#welcome-title').textContent=text('mode.position');
  $('#welcome-instruction .desktop-copy').textContent=text('mode.chooseDesktop');
  $('#welcome-instruction .mobile-copy').textContent=text('mode.chooseMobile');
}
function selectPieceSize(preset){
  const dimensions=pieceDimensions(preset);
  if(!dimensions)return;
  const firstSize=!selectedSize;
  const [width,height]=dimensions;
  selectedSize=preset;
  resizeWidth.value=width/10;
  resizeHeight.value=height/10;
  resizeDimensions.validate();
  syncResizeAction();
  resizeForm.hidden=false;
  $('#piece-choice').hidden=true;
  workshopNav.hidden=false;
  syncWelcomeCopy();
  $('#new-project').hidden=false;
  for(const toggle of document.querySelectorAll('.sidebar-left .section-toggle'))toggle.disabled=false;
  syncModelMode();
  placeMap.setSize(width,height,pureSelected());
  openStep('place',{focus:true});
  syncPrintSettings();
  tiling();
  workshopGuide.update();
  if(firstSize)projectSnapshot=projectFingerprint();
}
initPiecePicker($('#piece-choice'),selectPieceSize);
function selectCuratedExample(example,{keepLink=false}={}){
  const {id,center,width,height,scale,rotation,pureRelief=true}=example;
  if(busy||pendingVegetation||drawing)return;
  if(!keepLink)clearSharedLink();
  brushHistory=createProjectBrushHistory();
  trailHistory=createProjectBrushHistory({breakOnClipped:true});
  routeHistory=createProjectBrushHistory({breakOnClipped:true});
  strokes=[];trailStrokes=[];drawnRouteStrokes=[];userRoute=null;pins=[];
  nextPinId=1;selectedPinId=null;removedPin=null;
  showViewerTools(false);
  setPinFeedback('');
  regularPureRelief=pureRelief;
  selectPieceSize(`${width/10}x${height/10}`);
  applyPureRelief();
  const range=panoramicSelected()?PANORAMIC_SCALE_RANGE:pureSelected()?PURE_SCALE_RANGE:[100,MAX_PROJECT_SCALE];
  const bbox=scaledBBox(center,width,height,scale,range);
  setExampleRegion(id,localizeExample(example).title,bbox,rotation);
  const exaggeration=$('#exag'),streams=$('#streams'),trees=$('#trees');
  exaggeration.value=example.exaggeration??exaggeration.defaultValue;
  streams.checked=streams.defaultChecked;
  $('#relief-trails').checked=false;
  trailWidthControl.value=RELIEF_TRAIL_WIDTH_MM;
  setBoundarySettings();
  trees.checked=example.trees??trees.defaultChecked;
  $('#detail').value=CURATED_EXAMPLE_DETAIL;
  const streamWidth=$('#stream-width');
  if(example.streamWidth!==undefined)streamWidth.value=example.streamWidth;
  else streamWidth.selectedIndex=Math.max(0,[...streamWidth.options].findIndex(option=>option.defaultSelected));
  baseThickness=DEFAULT_BASE_THICKNESS_MM;
  $('#print-base').value=baseThickness;
  if(pureRelief){
    const count=example.materialCount??6;
    reliefMaterials={count,assignments:defaultReliefAssignments(count)};
  }else{
    if(example.materialCount!==undefined){
      const count=example.materialCount;
      landscapeMaterials={count,assignments:defaultAssignments(count)};
    }
    if(example.buildingSource){
      const source=$('#building-source');
      buildingSourceDirty||=source.value!==example.buildingSource;
      source.value=example.buildingSource;
      buildingSourceExplicit=false;
    }
    $('#building-mode').value=$('#building-mode option[selected]').value;
    $('#building-height').value=$('#building-height').defaultValue;
    buildingControls();
  }
  syncExaggerationLabel();
  syncPrintSettings();
  legend();
  projectSnapshot=projectFingerprint();
  generate();
}
initExampleCarousel($('#example-carousel'),CURATED_EXAMPLES,example=>switchProject(()=>selectCuratedExample(example)));
function commitResize(){
  if(!selectedSize||busy||drawing||pendingVegetation||reliefTimer!==null)return;
  const preset=resizeDimensions.read();
  const dimensions=pieceDimensions(preset);
  if(!dimensions||preset===selectedSize)return;
  const previous=modelOptions(),name=placeName;
  const applyHere=sameLoadedCrop(previous);
  scheduler.cancel();
  clearTimeout(transportTimer);
  transportTimer=null;
  selectedSize=preset;
  syncResizeAction();
  syncModelMode();
  const limited=placeMap.resizePiece(...dimensions,pureSelected());
  placeName=name;
  const options=modelOptions();
  brushHistory.resize(previous,options,strokes);
  trailHistory.resize(previous,options,trailStrokes);
  routeHistory.resize(previous,options,drawnRouteStrokes);
  scaleHint();
  if(!limited&&!dirty&&!buildingSourceDirty&&model&&configurationKey(options)===configurationKey(model.provenance.options)){
    needsBuild=false;
    badge('');
    say(baseMessage('status.modelReady'));
    lock(false);
    return;
  }
  if(applyHere&&!tooLargeRegion){generate();return;}
  if(!workshopGuide.current())openStep('place',{focus:true});
  requireBuild(statusMessage('pending.resize'));
  if(!tooLargeRegion)say(limited?statusMessage('status.resizeLimited'):statusMessage('status.resizeApply'));
}
resizeForm.onsubmit=event=>{
  event.preventDefault();
  commitResize();
};
resizeForm.addEventListener('focusout',event=>{
  if(!resizeForm.contains(event.relatedTarget))setTimeout(commitResize,0);
});
$('#new-project').onclick=()=>switchProject(reloadWithoutSharedLink);
$('#reset').onclick=()=>{previewOrbit.pause(performance.now());home();};
$('#top').onclick=()=>{setOrbitEnabled(false);home();const distance=camera.position.distanceTo(controls.target);camera.position.copy(controls.target).add(new THREE.Vector3(0,-.01,distance));controls.update();};
function requireBuild(message){needsBuild=true;badge(tooLargeRegion?statusMessage('status.areaLarge'):message);say(tooLargeRegion?()=>$('#scale-info').textContent:()=>messageText(message)+'.',tooLargeRegion);lock(busy);}
const localizedRegionLimit=max=>[
  text('scale.capacity'),
  max?text('scale.suggest',{scale:formatNumber(max)}):'',
  text('scale.reduce')
].filter(Boolean).join(' ');
function scaleHint(){
  if(!selectedSize){lock(busy);return;}
  const [width,height]=size();
  const limit=selectedPose
    ?Math.abs(selectedPose.center[0])>70?text('scale.latitude'):
      pureSelected()&&selectedPose.bbox.some((value,index)=>Math.abs(value)>(index%2?70:180))?text('scale.bounds'):
      pureSelected()?'':regionLimitMessage(selectedPose,width,height,localizedRegionLimit)
    :'';
  tooLargeRegion=!!limit;
  const info=$('#scale-info');
  info.hidden=!limit;
  info.classList.toggle('error',!!limit);
  info.textContent=limit;
  const range=$('#model-scale');
  range.setAttribute('aria-invalid',String(tooLargeRegion));
  if(selectedPose){
    showScaleStops(placeMap.getScaleLimit(selectedPose.center));
    const denominator=selectedPose.widthM*1000/width;
    const upper=scaleStops.findIndex(stop=>stop>=denominator);
    let position=upper===-1?scaleStops.length-1:upper;
    if(upper>0){
      const lower=scaleStops[upper-1];
      position=upper-1+Math.log(denominator/lower)/Math.log(scaleStops[upper]/lower);
    }
    range.value=position;
    const label='1:'+formatNumber(Math.round(denominator));
    $('#scale-value').textContent=label;
    range.setAttribute('aria-valuetext',label);
  }
  lock(busy);
}
const scaleInput=$('#model-scale');
function showScaleStops(limit){
  const ticks=$('#scale-ticks');
  const panoramic=panoramicSelected(),pure=pureSelected();
  const preferred=panoramic?[PANORAMIC_SCALE_RANGE[0],100000,150000,200000,300000,400000,450000]:
    pure?[...new Set([PURE_SCALE_RANGE[0],...preferredScaleStops,20000,30000,50000,100000,150000,200000,300000,400000])]:preferredScaleStops;
  const next=[...preferred.filter(stop=>stop<limit),limit];
  if(ticks.children.length&&next.join()===scaleStops.join()&&ticks.dataset.locale===getLocale())return;
  scaleStops=next;
  ticks.dataset.locale=getLocale();
  scaleInput.max=scaleStops.length-1;
  ticks.replaceChildren();
  const labelledStops=panoramic?[200000,400000]:pure?[30000,100000]:[2000,10000];
  for(const [index,stop] of scaleStops.entries()){
    const mark=document.createElement('span');
    if(index===0||index===scaleStops.length-1||labelledStops.includes(stop))mark.textContent=formatNumber(stop);
    ticks.append(mark);
  }
}
function applyScale(index){
  if(!selectedPose||Math.abs(selectedPose.center[0])>70||busy||pendingVegetation)return;
  const denominator=scaleStops[Math.min(scaleStops.length-1,Math.max(0,index))];
  if(Math.abs(selectedPose.widthM*1000/size()[0]-denominator)>.001)placeMap.setScale(denominator);
  scaleHint();
}
scaleInput.oninput=()=>applyScale(Math.round(Number(scaleInput.value)));
scaleInput.onkeydown=event=>{
  const value=Number(scaleInput.value);
  const stops={ArrowLeft:Math.ceil(value-1e-6)-1,ArrowDown:Math.ceil(value-1e-6)-1,
    ArrowRight:Math.floor(value+1e-6)+1,ArrowUp:Math.floor(value+1e-6)+1,Home:0,End:scaleStops.length-1};
  if(!(event.key in stops))return;
  event.preventDefault();
  applyScale(stops[event.key]);
};
function sourceSummary(){
  const provider=({icgc:'ICGC',osm:'OpenStreetMap',osm3d:text('source.osmRoof'),catastre:text('source.cadastre')})[$('#building-source').value]??text('source.unknown');
  $('#terrain-source-name').textContent=text('source.remote',{provider:region?.meta?.terrain?.provider||TERRAIN_REMOTE});
  const source=text('source.remote',{provider});
  $('#building-source-name').textContent=pureSelected()?'—':buildingSourceDirty?text('source.pending',{source}):source;
}
const stepNext={place:'vegetation',vegetation:'transport',transport:'buildings'};
function syncStepActions(updating){
  const invalid=!selection||tooLargeRegion,pending=needsBuild||!model;
  for(const button of document.querySelectorAll('[data-step-action]')){
    const step=button.dataset.stepAction;
    const autoApplying=transportTimer!==null||(busy&&job==='transport');
    const next=!pureSelected()||step!=='transport'?stepNext[step]:null;
    const build=pending&&!autoApplying&&(step==='place'||pureSelected()&&step==='transport'||!!model&&['transport','buildings'].includes(step));
    button.hidden=!button.closest('.config-section').classList.contains('is-open')||(!build&&!next);
    const label=build?(step==='place'||!model?text('mode.generate'):step==='buildings'&&sameTerrain(modelOptions())?text('mode.applyBuildings'):text('mode.apply')) :
      next?`${next==='transport'?t(pureSelected()?'ui.tools.waterTrails':'ui.tools.waterWays'):t('section.'+next)} →`:'';
    if(button.textContent!==label)button.textContent=label;
    button.classList.toggle('is-build',build);
    button.disabled=updating||invalid&&(build||step==='place')||!selectedSize;
  }
}
function openStep(id,{focus=false}={}){
  if(!selectedSize)return;
  if(id!=='vegetation'&&$('#step-vegetation').getAttribute('aria-expanded')==='true')endVegetationEditing();
  if(!$('#viewer-edit-panel').hidden)showViewerTools(false);
  for(const toggle of document.querySelectorAll('.sidebar-left .section-toggle')){
    const open=toggle.id==='step-'+id;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.closest('.config-section').classList.toggle('is-open',open);
    toggle.querySelector('i').textContent=open?'−':'+';
    document.getElementById(toggle.getAttribute('aria-controls')).hidden=!open;
  }
  placeLocation.hidden=id!=='place';
  syncStepActions(busy||pendingVegetation||reliefTimer!==null);
  if(id)showWorkshopPanel('settings',{focus});
  if(focus&&!narrowWorkshop.matches)$('#step-'+id).focus({preventScroll:true});
}
for(const toggle of document.querySelectorAll('.sidebar-left .section-toggle'))toggle.onclick=()=>openStep(!narrowWorkshop.matches&&toggle.getAttribute('aria-expanded')==='true'?null:toggle.closest('.config-section').dataset.step);
for(const button of document.querySelectorAll('[data-step-action]'))button.onclick=()=>{
  const step=button.dataset.stepAction;
  if(button.classList.contains('is-build')){$('#step-'+step).focus({preventScroll:true});generate();}
  else if(stepNext[step])openStep(stepNext[step],{focus:true});
};
function syncExaggerationLabel(){
  $('#exag-value').textContent='×'+formatNumber(Number($('#exag').value));
}
$('#exag').oninput=()=>{
  syncExaggerationLabel();
};
bindFieldCommit($('#exag'),()=>requestReliefUpdate(statusMessage('pending.relief'),true));
$('#detail').onchange=()=>{
  if(busy||pendingVegetation||drawing)return;
  if(!tooLargeRegion&&sameLoadedCrop(modelOptions())){generate();return;}
  cancelReliefUpdate();
  clearTimeout(transportTimer);
  transportTimer=null;
  scheduler.cancel();
  requireBuild(statusMessage('pending.detail'));
};
for(const id of ['road-rise','rail-rise','trail-width','estimated-tunnels','major-profiles'])$('#'+id).onchange=requestTransport;
function requestTransport(){
  if(pureSelected()||isPure(model))return;
  clearTimeout(transportTimer);
  transportTimer=null;
  if(!tooLargeRegion&&sameTerrain(modelOptions(),false)){
    const apply=()=>{
      if(busy||pendingVegetation||drawing){transportTimer=setTimeout(apply,150);return;}
      transportTimer=null;
      if(tooLargeRegion||!sameTerrain(modelOptions(),false)){
        requireBuild(statusMessage('pending.transport'));
        return;
      }
      if(configurationKey(modelOptions())===configurationKey(model.provenance.options)&&!buildingSourceDirty){
        needsBuild=false;
        badge('');
        say(baseMessage('status.modelReady'));
        lock(false);
        return;
      }
      generate(true);
    };
    transportTimer=setTimeout(apply,250);
    requireBuild(statusMessage('pending.transportQueued'));
  }else requireBuild(statusMessage('pending.transport'));
}
$('#building-source').onchange=()=>{
  trackWorkshopEvent('canvia_font_edificis',{font:$('#building-source').value});
  buildingSourceExplicit=true;buildingSourceDirty=true;buildingControls();
  requestBuildingsAuto(statusMessage('pending.buildingsSource'));
};
function lockBuildingControls(updating=busy||pendingVegetation){
  $('#building-source').disabled=$('#building-mode').disabled=updating;
  $('#building-height').disabled=updating||$('#building-mode').value!=='limited';
}
function buildingControls(){sourceSummary();lockBuildingControls();$('#building-source-hint').textContent=$('#building-source').value==='catastre'?text('building.cadastreHint'):$('#building-source').value==='osm3d'?text('building.osmHint'):'';const mode=$('#building-mode').value;$('#building-mode-hint').textContent=({limited:text('building.limited'),source:$('#building-source').value==='osm3d'?text('building.roofShape'):text('building.roofFlat'),flat:text('building.flat'),none:text('building.none')})[mode];}
$('#building-mode').onchange=()=>{buildingControls();requestBuildingsAuto(statusMessage('pending.buildings'));};
const buildingHeight=$('#building-height');
bindFieldCommit(buildingHeight,before=>{
  if(!buildingHeight.value||!buildingHeight.validity.valid)buildingHeight.value=before;
  if(buildingHeight.valueAsNumber!==Number(before))requestBuildingsAuto(statusMessage('pending.buildingHeight'));
});
$('#material-count').onchange=()=>{
  const count=Number($('#material-count').value),pure=shownMaterialMode();
  if(count!==materialProfile(pure).settings.count)
    trackWorkshopEvent('canvia_materials',{mode:workshopMode(pure),materials:count});
  if(pure)reliefMaterials={count,assignments:defaultReliefAssignments(count)};
  else landscapeMaterials={count,assignments:defaultAssignments(count)};
  recolor();
};
$('#density').oninput=()=>{$('#density-value').textContent='×'+formatNumber(Number($('#density').value));};$('#trees').onchange=()=>{
  if(!$('#trees').checked&&!trailBrush())endVegetationEditing();
  updateTrees();
};$('#tree-type').onchange=updateTrees;
const textureSliders=[['vegetation-height',' mm'],['vegetation-noise','%']];
function syncTextureLabel(id,unit){
  const slider=$('#'+id),value=formatNumber(Number(slider.value))+unit;
  $('#'+id+'-value').textContent=value;
  slider.setAttribute('aria-valuetext',value);
}
for(const [id,unit] of textureSliders){
  $('#'+id).oninput=()=>syncTextureLabel(id,unit);
  bindFieldCommit($('#'+id),updateTrees);
  syncTextureLabel(id,unit);
}
const formatOptions=[...document.querySelectorAll('#export-options [data-format]')];
function showExportFormat(format){
  for(const option of formatOptions)option.setAttribute('aria-pressed',String(option.dataset.format===format));
  $('#export-model').textContent=formatOptions.find(option=>option.dataset.format===format).querySelector('[data-format-label]').textContent+' ↓';
}
function selectExportFormat(format){
  exportFormat=format;
  showExportFormat(selectedSize?printExportFormat(format,shownPrintPlan()):format);
}
function setFormatMenu(open,{focus=false}={}){
  $('#export-options').hidden=!open;
  $('#export-formats').setAttribute('aria-expanded',String(open));
  if(focus){
    const target=open?formatOptions.find(option=>option.getAttribute('aria-pressed')==='true'):$('#export-formats');
    target.focus();
  }
}
function syncExport(disabled){
  $('#mobile-workshop [data-mobile-panel=export]').disabled=!selectedSize;
  $('#export-model').disabled=disabled;
  $('#export-formats').disabled=disabled;
  if(disabled)setFormatMenu(false);
  describeTiling();
}
function exportModel(){
  if($('#export-model').disabled)return;
  feedback('export-feedback','');
  job='export';
  lock(true);
  say(baseMessage('status.exporting'));
  const {count,assignments}=isPure(model)?reliefMaterials:landscapeMaterials;
  worker.postMessage({type:'export',format:exportFormat,cuts:printCuts(model.width,model.height),materialCount:count,assignments,pins:isPure(model)?pins:[]});
}
$('#export-model').onclick=exportModel;
$('#export-formats').onclick=()=>setFormatMenu($('#export-options').hidden,{focus:true});
for(const option of formatOptions)option.onclick=()=>{
  selectExportFormat(option.dataset.format);
  setFormatMenu(false,{focus:true});
  tiling();
  exportModel();
};
document.addEventListener('click',event=>{
  if(!event.target.closest('.download-control'))setFormatMenu(false);
});
$('.download-control').addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!$('#export-options').hidden){
    event.preventDefault();
    setFormatMenu(false,{focus:true});
  }
});
const infoToggles=[...document.querySelectorAll('.info-panel .section-toggle')];
for(const toggle of infoToggles)toggle.onclick=()=>{
  const opening=toggle.getAttribute('aria-expanded')==='false';
  for(const button of infoToggles){
    const open=opening&&button===toggle;
    button.setAttribute('aria-expanded',String(open));
    button.closest('.info-panel').classList.toggle('is-open',open);
    document.getElementById(button.getAttribute('aria-controls')).hidden=!open;
    button.querySelector('i').textContent=open?'−':'+';
  }

};
$('#print-base').oninput=syncBaseAction;
function commitBase(){
  if(!selectedSize)return;
  const input=$('#print-base'),value=input.valueAsNumber;
  if(!validBaseThickness(value))input.value=baseThickness;
  else if(value!==baseThickness){
    baseThickness=value;
    if(model)requestReliefUpdate(statusMessage('print.pendingBase'),true);
  }
  syncBaseAction();
}
bindFieldCommit($('#print-base'),commitBase);
$('#print-base-form').onsubmit=event=>{
  event.preventDefault();
  commitBase();
};
function applyPrintCuts(cuts,dragging=false){
  if(!selectedSize||$('#print-cuts-fields').disabled)return;
  const [width,height]=size();
  if(!validPrintCuts(cuts,width,height))return;
  const previous=printPlan(width,height);
  cutSettings.set(sizeKey(width,height),cuts);
  const next=printPlan(width,height);
  const changed=previous.xCuts.join()!==next.xCuts.join()||previous.yCuts.join()!==next.yCuts.join();
  syncPrintSettings();
  if(dragging){
    cutChangedDuringDrag||=changed;
    if(cutPreviewFrame!==null)return;
    cutPreviewFrame=requestAnimationFrame(()=>{
      cutPreviewFrame=null;
      tiling();
    });
  }else{
    if(changed)trackWorkshopEvent('ajusta_talls',{peces:next.tiles.length});
    if(cutPreviewFrame!==null)cancelAnimationFrame(cutPreviewFrame);
    cutPreviewFrame=null;
    tiling();
    if(pins.length)refreshPinMarkers();
  }
}
$('#print-cuts-reset').onclick=()=>applyPrintCuts({});
function syncVegetationControls(updating){
  const pure=pureSelected(),enabled=$('#trees').checked;
  $('#trees').disabled=updating;
  $('#tree-type').disabled=updating||!enabled;
  for(const id of ['vegetation-height','vegetation-noise'])$('#'+id).disabled=!enabled||busy&&job==='build';
  const note=$('#tree-scale-note');
  note.hidden=!pure&&(!enabled||!canUpdateVegetation()||!model.provenance.treeRepresentation?.omittedBelowThreshold);
  note.textContent=pure?text('vegetation.flatRelief'):text('vegetation.flatComplete');
  const paintDisabled=updating||!canPaint();
  for(const button of document.querySelectorAll('[data-brush]')){
    const mode=button.dataset.brush;
    const reliefBrush=mode==='pin'||mode.startsWith('route-')||mode.startsWith('trail-');
    button.disabled=mode!=='navigate'&&(reliefBrush?updating||drawing||!(mode.startsWith('trail-')?canPaintTrails():canEditRelief()):paintDisabled);
  }
}
function editButtons(){
  $('#undo-brush').disabled=$('#clear-brush').disabled=!strokes.length||busy||pendingVegetation||drawing||needsBuild||!canUpdateVegetation()||!$('#trees').checked;
  $('#undo-trail').disabled=$('#clear-trails').disabled=!trailStrokes.length||drawing||!canPaintTrails();
  $('#undo-route').disabled=$('#clear-route').disabled=!drawnRouteStrokes.length||drawing||!canEditRelief();
}
const viewerToolsPanel=$('#viewer-edit-panel'),viewerToolsOpen=$('#viewer-tools-open');
const viewerToolTabs=[...document.querySelectorAll('[data-viewer-tool]')];
const viewerToolPanes=[...document.querySelectorAll('[data-viewer-pane]')];
let viewerTool='trails';
function syncViewerTools(){
  const pure=pureSelected(),visible=!viewerToolsPanel.hidden;
  $('#viewer-tools-content').hidden=!pure;
  $('#viewer-tools-unavailable').hidden=pure;
  viewerToolsOpen.setAttribute('aria-expanded',String(visible));
  $('#enable-trails').hidden=$('#relief-trails').checked;
  $('#enable-trails').disabled=busy||drawing||needsBuild||reliefTimer!==null;
  $('#pin-coordinates-form').querySelector('button').disabled=!canPlacePin();
  $('#pin-coordinates').disabled=!canPlacePin();
  for(const control of document.querySelectorAll('#pin-list button, #pin-list select, #undo-pin'))control.disabled=busy||drawing;
  previewPins.setDisabled(busy||drawing);
  const state=$('#viewer-tool-status');
  state.textContent=pure&&(!isPure(model)||needsBuild)?text('tools.pending'):
    brush==='pin'?text('pin.placeHint'):trailBrush()?text('tools.trailActive'):
    routeBrush()?text('tools.routeActive'):'';
  for(const tab of viewerToolTabs)tab.setAttribute('aria-pressed',String(tab.dataset.viewerTool===viewerTool));
  for(const pane of viewerToolPanes)pane.hidden=pane.dataset.viewerPane!==viewerTool;
}
function showViewerTools(open,{pane,focus=false}={}){
  if((!open||pane&&pane!==viewerTool)&&['pin','trail-add','trail-erase','route-add','route-erase'].includes(brush))selectNavigate();
  viewerToolsPanel.hidden=!open;
  if(pane)viewerTool=pane;
  if(open&&narrowWorkshop.matches)showWorkshopPanel('preview');
  syncViewerTools();
  if(workshopGuide.current()==='tools')workshopGuide.update();
  if(focus)(open?$('#viewer-edit-title'):viewerToolsOpen).focus({preventScroll:true});
}
viewerToolsOpen.onclick=()=>showViewerTools(viewerToolsPanel.hidden,{focus:true});
function closeViewerToolFromUser(){
  if(narrowWorkshop.matches&&workshopGuide.current()==='transport'){
    showViewerTools(false);
    openStep('transport');
    $('#trail-tools-link').focus();
  }else showViewerTools(false,{focus:true});
}
$('#viewer-tools-close').onclick=closeViewerToolFromUser;
$('#print-pins-link').onclick=()=>showViewerTools(true,{pane:'pins',focus:true});
$('#trail-tools-link').onclick=()=>showViewerTools(true,{pane:'trails',focus:true});
for(const tab of viewerToolTabs)tab.onclick=()=>showViewerTools(true,{pane:tab.dataset.viewerTool});
$('#enable-trails').onclick=()=>{
  $('#relief-trails').checked=true;
  requestTrailUpdate();
};
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||event.defaultPrevented||viewerToolsPanel.hidden||document.querySelector('dialog[open]'))return;
  event.preventDefault();
  if(brush!=='navigate'){
    selectNavigate();
    viewerToolTabs.find(tab=>tab.dataset.viewerTool===viewerTool)?.focus({preventScroll:true});
  }else closeViewerToolFromUser();
});
$('#undo-brush').onclick=()=>{strokes=withoutLastGesture(strokes);editButtons();updateTrees();};$('#clear-brush').onclick=()=>{strokes=[];editButtons();updateTrees();};$('#brush-radius').oninput=()=>$('#brush-value').textContent=formatNumber(Number($('#brush-radius').value))+' mm';
$('#undo-trail').onclick=()=>{trailStrokes=withoutLastGesture(trailStrokes);requestTrailUpdate();};
$('#clear-trails').onclick=()=>{trailStrokes=[];requestTrailUpdate();};
$('#undo-route').onclick=()=>{drawnRouteStrokes=withoutLastGesture(drawnRouteStrokes);requestTrailUpdate();};
$('#clear-route').onclick=()=>{drawnRouteStrokes=[];requestTrailUpdate();};
function setBrush(button){
  if(!button)return;
  finishStroke();brush=button.dataset.brush;
  const navigating=brush==='navigate';
  controls.enabled=navigating;
  document.querySelectorAll('[data-brush]').forEach(x=>{
    const selected=x.dataset.brush===brush;
    x.classList.toggle('selected',selected);
    x.setAttribute('aria-pressed',String(selected));
  });
  syncViewerHint();
  syncViewerTools();
  $('#brush-cursor').hidden=true;
}
function syncViewerHint(){
  const navigating=brush==='navigate';
  $('#viewer-hint .desktop-copy').textContent=text(brush==='pin'?'pin.placeHint':navigating?'viewer.navigateDesktop':'viewer.paintDesktop');
  $('#viewer-hint .mobile-copy').textContent=text(brush==='pin'?'pin.placeHint':navigating?'viewer.navigateMobile':'viewer.paintMobile');
}
function selectNavigate(){setBrush(document.querySelector('[data-brush="navigate"]'));}
function endVegetationEditing(){finishStroke();if(brush!=='navigate')selectNavigate();else $('#brush-cursor').hidden=true;}
document.querySelectorAll('[data-brush]').forEach(b=>b.onclick=()=>setBrush(b));
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
const brushGround=new Set(['terrain','forest','grass','rock','snow']);
const brushSurfaces=new Set([...brushGround,'water','inland-water']);

const pinRay=new THREE.Raycaster();
const previewPins=createPreviewPins(view,scene,camera,{onSelect:selectPin,onRemove:id=>removePin(id,true)});
function setPinFeedback(key,params){
  feedback('pin-feedback',key?statusMessage(key,params):'');
}
function selectPin(id){
  selectedPinId=id;
  previewPins.select(id);
  for(const button of document.querySelectorAll('[data-pin-select]'))
    button.setAttribute('aria-pressed',String(Number(button.dataset.pinSelect)===id));
}
function removePin(id,fromPreview=false){
  if(busy||drawing)return;
  const index=pins.findIndex(pin=>pin.id===id);
  if(index<0)return;
  const [pin]=pins.splice(index,1);
  removedPin={pin,index};
  if(selectedPinId===id)selectedPinId=null;
  setPinFeedback('tools.holeRemoved',{number:formatNumber(id)});
  refreshPinMarkers();
  if(!fromPreview)$('#undo-pin').focus();
  else if(!previewPins.focus(pins[Math.min(index,pins.length-1)]?.id))viewerToolsOpen.focus({preventScroll:true});
}
function pinProblem(pin,x,y,hit){
  if(x<0||y<0||x>model.width||y>model.height)return 'pin.outside';
  if(!pinFitsTile(x,y,shownPrintPlan()))return 'pin.edge';
  if(!hit||hit.face.normal.z<=0||['water','inland-water'].includes(hit.object.name))return 'pin.landOnly';
  if(hit.point.z<pin.depth+1)return 'pin.thin';
  return '';
}
function pinSurface(x,y){
  if(x<0||y<0||x>model.width||y>model.height)return null;
  group.updateMatrixWorld(true);
  const top=group.children.reduce((z,mesh)=>{
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    return Math.max(z,mesh.geometry.boundingBox.max.z);
  },0)+1;
  pinRay.ray.origin.set(x-model.width/2,y-model.height/2,top);
  pinRay.ray.direction.set(0,0,-1);
  return pinRay.intersectObjects(group.children)[0];
}
function refreshPinMarkers(){
  const focusedMarker=previewPins.focusedId();
  previewPins.clear();
  const list=$('#pin-list');
  const focusedId=document.activeElement?.closest('[data-pin-row]')?.dataset.pinRow;
  const focusedKind=document.activeElement?.tagName;
  if(!isPure(model)){
    list.replaceChildren();
    $('#viewer-pin-count').hidden=true;
    $('#undo-pin').hidden=true;
    return;
  }
  const {project}=pinProjection(model);
  const locations=pins.map(pin=>({pin,xy:project([pin.lon,pin.lat])}));
  const rows=locations.map(({pin,xy:[x,y]})=>{
    const hit=pinSurface(x,y);
    const overlap=locations.some(other=>other.pin!==pin&&Math.hypot(other.xy[0]-x,other.xy[1]-y)<RELIEF_PIN_SPACING_MM);
    const problem=pinProblem(pin,x,y,hit)||(overlap?'pin.overlap':'');
    const row=document.createElement('li'),choose=document.createElement('button'),depth=document.createElement('select'),remove=document.createElement('button');
    const number=formatNumber(pin.id);
    const label=text('tools.holeNumber',{number}),removeLabel=text('pin.removeName',{number});
    if(hit)previewPins.add(pin.id,hit.point,{number,label,removeLabel});
    row.dataset.pinRow=String(pin.id);
    choose.dataset.pinSelect=String(pin.id);
    choose.type=remove.type='button';
    choose.className=remove.className='quiet-button';
    choose.textContent=label;
    choose.onclick=()=>selectPin(pin.id);
    depth.setAttribute('aria-label',text('tools.holeDepth',{number}));
    depth.replaceChildren(...[7,8,9].map(value=>new Option(formatNumber(value)+' mm',value)));
    depth.value=pin.depth;
    depth.onchange=()=>{pin.depth=Number(depth.value);selectPin(pin.id);refreshPinMarkers();};
    remove.textContent=text('pin.remove');
    remove.setAttribute('aria-label',removeLabel);
    remove.onclick=()=>removePin(pin.id);
    row.append(choose,depth,remove);
    if(problem){
      const note=document.createElement('span');note.className='hint pin-problem';note.textContent=text(problem);row.append(note);
    }
    return row;
  });
  list.replaceChildren(...rows);
  const oldRow=rows.find(row=>row.dataset.pinRow===focusedId);
  oldRow?.querySelector(focusedKind==='SELECT'?'select':'button')?.focus({preventScroll:true});
  $('#viewer-pin-count').textContent=formatNumber(pins.length);
  $('#viewer-pin-count').hidden=!pins.length;
  $('#undo-pin').hidden=!removedPin;
  selectPin(selectedPinId);
  previewPins.render(!contextLost&&!stagedBuild?.preview);
  previewPins.focus(focusedMarker);
}
$('#undo-pin').onclick=()=>{
  if(!removedPin||pins.length>=MAX_RELIEF_PINS)return;
  const {pin,index}=removedPin;removedPin=null;pins.splice(index,0,pin);
  selectedPinId=pin.id;setPinFeedback('tools.holeAdded',{number:formatNumber(pin.id)});refreshPinMarkers();
  $('#pin-list [data-pin-select="'+pin.id+'"]')?.focus({preventScroll:true});
};
function addPin(lon,lat,hit){
  if(pins.length>=MAX_RELIEF_PINS){setPinFeedback('pin.limit',{count:MAX_RELIEF_PINS});return false;}
  const {project}=pinProjection(model),[x,y]=project([lon,lat]),depth=Number($('#pin-depth').value);
  const problem=pinProblem({depth},x,y,hit??pinSurface(x,y));
  if(problem){setPinFeedback(problem);return false;}
  if(pins.some(pin=>{
    const [px,py]=project([pin.lon,pin.lat]);
    return Math.hypot(x-px,y-py)<RELIEF_PIN_SPACING_MM;
  })){setPinFeedback('pin.overlap');return false;}
  const id=nextPinId++;
  removedPin=null;
  pins.push({id,lon,lat,depth});
  trackWorkshopEvent('usa_eina',{eina:'marca_punt'});
  selectedPinId=id;
  setPinFeedback('tools.holeAdded',{number:formatNumber(id)});
  refreshPinMarkers();
  return true;
}
function placePin(event){
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  ray.setFromCamera(pointer,camera);
  const [hit]=ray.intersectObjects(group.children);
  if(!hit){setPinFeedback('pin.landOnly');return;}
  const x=hit.point.x+model.width/2,y=hit.point.y+model.height/2;
  const [lon,lat]=pinProjection(model).unproject([x,y]);
  addPin(lon,lat,hit);
}
$('#pin-coordinates-form').onsubmit=event=>{
  event.preventDefault();
  if(!canPlacePin())return;
  const input=$('#pin-coordinates'),parts=input.value.trim().split(/\s*,\s*/);
  const [lat,lon]=parts.map(Number);
  if(parts.length!==2||parts.some(part=>!part)||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){
    setPinFeedback('tools.invalidCoordinates');return;
  }
  if(addPin(lon,lat))input.value='';
};
function paint(event){
  if(brush==='navigate'||brush==='pin'||!canPaintWithBrush()||pendingVegetation&&!drawing)return;
  const trails=lineBrush(),erase=brush.endsWith('erase');
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  ray.setFromCamera(pointer,camera);
  const textureMesh=mesh=>isPure(model)&&mesh.name==='trees';
  const trailMesh=mesh=>trails&&(mesh.name==='trails'||mesh.name==='route');
  const [hit]=ray.intersectObjects(group.children.filter(mesh=>brushSurfaces.has(mesh.name)||textureMesh(mesh)||trailMesh(mesh)));
  const cursor=$('#brush-cursor');
  cursor.hidden=!hit||!(brushGround.has(hit.object.name)||textureMesh(hit.object)||trailMesh(hit.object))||hit.face.normal.z<=0;
  if(cursor.hidden){if(trails)lastPoint=null;return;}
  const radius=routeBrush()?(erase?3:USER_ROUTE_WIDTH_MM/2):trails?
    (erase?Math.max(2,Math.min(12,trailEraserControl.valueAsNumber||3)):reliefTrailWidth()/2):Number($('#brush-radius').value);
  const p=hit.point;
  const screen=p.clone().project(camera),edge=p.clone().add(new THREE.Vector3(radius,0,0)).project(camera);
  const diameter=Math.max(8,Math.abs(edge.x-screen.x)*rect.width);
  Object.assign(cursor.style,{left:(event.clientX-rect.left)+'px',top:(event.clientY-rect.top)+'px',width:diameter+'px',height:diameter+'px'});
  cursor.classList.toggle('erase',erase);
  if(!drawing)return;
  const x=p.x+model.width/2,y=p.y+model.height/2;
  if(lastPoint&&Math.hypot(x-lastPoint.x,y-lastPoint.y)<Math.max(trails ? .25 : 0,radius*.45))return;
  if(trails){
    const path=lineStrokes();
    if(path.length>=MAX_RELIEF_TRAIL_STROKES){say(statusMessage('trail.pointLimit'));return;}
    const breakBefore=!lastPoint&&path.length>lineStrokeStart;
    path.push({mode:erase?'erase':'add',x,y,radius,gesture,...(breakBefore?{breakBefore:true}:{})});
    lastPoint={x,y};
    return;
  }
  strokes.push({mode:brush,x,y,radius,gesture,density:Number($('#density').value)});
  lastPoint={x,y};
  updateTrees();
}
function finishStroke(){
  if(!drawing)return;
  drawing=false;lastPoint=null;
  if(lineBrush()&&lineStrokes().length>lineStrokeStart){
    const eina={'trail-add':'dibuixa_sender','trail-erase':'esborra_sender','route-add':'dibuixa_ruta','route-erase':'esborra_ruta'}[brush];
    trackWorkshopEvent('usa_eina',{eina});
    requestTrailUpdate();
  }else if(pendingVegetation)updateTrees();
  else lock(busy);
}
renderer.domElement.addEventListener('pointerdown',event=>{
  if(brush==='navigate'||event.button!==0||drawing||pendingVegetation||!canPaintWithBrush())return;
  if(brush==='pin'){
    pinPointer={id:event.pointerId,x:event.clientX,y:event.clientY};
    renderer.domElement.setPointerCapture(event.pointerId);
    return;
  }
  drawing=true;gesture++;lastPoint=null;
  lineStrokeStart=lineStrokes().length;
  renderer.domElement.setPointerCapture(event.pointerId);
  if(lineBrush())lock(busy);
  paint(event);
});
renderer.domElement.addEventListener('pointermove',paint);
renderer.domElement.addEventListener('pointerup',event=>{
  if(pinPointer?.id===event.pointerId){
    const start=pinPointer;pinPointer=null;
    if(brush==='pin'&&canPlacePin()&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<=8)placePin(event);
  }
  finishStroke();
});
renderer.domElement.addEventListener('pointercancel',()=>{pinPointer=null;finishStroke();});
renderer.domElement.addEventListener('lostpointercapture',finishStroke);
renderer.domElement.addEventListener('pointerleave',()=>$('#brush-cursor').hidden=true);
const projectRestoreKey='relleu-obert.open-project';
const projectControls={
  detail:'detail',streams:'streams',streamWidth:'stream-width',reliefTrails:'relief-trails',reliefTrailWidth:'relief-trail-width',exaggeration:'exag',
  roadRise:'road-rise',railRise:'rail-rise',trailWidth:'trail-width',estimatedTunnels:'estimated-tunnels',majorRoads:'major-profiles',
  buildingSource:'building-source',buildingMode:'building-mode',maxBuildingHeight:'building-height',
  trees:'trees',treeType:'tree-type',brushDensity:'density',brushRadius:'brush-radius',
  vegetationHeight:'vegetation-height',vegetationNoise:'vegetation-noise'
};
function captureProject({includeAnnotations=true}={}){
  const options={exportFormat,split:printPlan(...size()).tiles.length>1,...boundarySettings()};
  for(const [key,id] of Object.entries(projectControls)){
    const control=$('#'+id);
    options[key]=control.type==='checkbox'?control.checked:
      ['buildingSource','buildingMode','treeType'].includes(key)?control.value:Number(control.value);
  }
  const settings={sizePreset:selectedSize,pose:selectedPose,pureRelief:pureSelected(),exampleId:exampleSelection?.id,
    materials:landscapeMaterials,reliefMaterials,options,print:{baseThickness,cuts:printCuts(...size())}};
  if(!includeAnnotations)return {...settings,mapZoom:placeMap.map.getZoom()};
  return {...settings,placeName:placeName||undefined,
    strokes:brushHistory.prepare(modelOptions(),strokes).strokes,
    ...(pureSelected()?{trailStrokes:trailHistory.prepare(modelOptions(),trailStrokes).strokes,
      drawnRouteStrokes:routeHistory.prepare(modelOptions(),drawnRouteStrokes).strokes,userRoute,pins}:{})};
}
const feedbackMessages=new Map();
function feedback(id,message){feedbackMessages.set(id,message);$('#'+id).textContent=messageText(message);}
const shareDialog=$('#share-project-dialog'),shareLink=$('#share-project-link'),shareCopy=$('#share-project-copy');
let sharedExampleId;
function openShareDialog(example){
  sharedExampleId=example?.id;
  feedback('share-project-title',()=>example?t('ui.share.exampleName',{name:localizeExample(example).title}):t('ui.share.open'));
  $('#share-project-note').hidden=!!example;
  $('#share-example-note').hidden=!example;
  shareLink.setAttribute('aria-describedby',example?'share-example-note':'share-project-note');
  feedback('share-project-feedback','');
  try{
    shareLink.value=example?exampleLink(location.href,example.id):
      projectLink(location.href,captureProject({includeAnnotations:false}));
    shareCopy.disabled=false;
  }catch{
    shareLink.value='';
    shareCopy.disabled=true;
    feedback('share-project-feedback',statusMessage('share.unavailable'));
  }
  shareDialog.showModal();
}
$('#share-project').onclick=()=>openShareDialog();
shareLink.onclick=()=>shareLink.select();
shareCopy.onclick=async()=>{
  if(sharedExampleId)trackWorkshopEvent('copia_enllac_galeria',{exemple:sharedExampleId});
  else trackWorkshopEvent('copia_enllac');
  try{
    await navigator.clipboard.writeText(shareLink.value);
    feedback('share-project-feedback',statusMessage('share.copied'));
  }catch{
    shareLink.focus();
    shareLink.select();
    feedback('share-project-feedback',statusMessage('share.manual'));
  }
};
function clearSharedLink(){
  if(isSharedLink(location.hash)){
    const url=new URL(location.href);
    url.hash='';
    history.replaceState(history.state,'',url);
  }
}
function reloadWithoutSharedLink(){
  clearSharedLink();
  location.reload();
}
window.addEventListener('hashchange',event=>{
  const next=new URL(event.newURL),previous=new URL(event.oldURL);
  if(!isSharedLink(next.hash)&&!isSharedLink(previous.hash))return;
  if(isSharedLink(next.hash)){
    try{readExampleLink(next.hash)??readProjectLink(next.hash);}catch{
      history.replaceState(history.state,'',previous);
      say(statusMessage('share.invalid'),true);
      return;
    }
  }
  history.replaceState(history.state,'',previous);
  switchProject(()=>{
    history.replaceState(history.state,'',next);
    location.reload();
  });
});
const projectSwitchDialog=$('#switch-project-dialog');
let projectSnapshot=null,pendingProjectAction=null;
function projectFingerprint(){
  return selectedSize&&selectedPose?JSON.stringify(captureProject()):null;
}
function switchProject(action){
  if(!selectedSize||projectFingerprint()===projectSnapshot){action();return;}
  pendingProjectAction=action;
  $('#switch-project-name').value=placeName.slice(0,100);
  $('#switch-project-error').hidden=true;
  projectSwitchDialog.showModal();
  $('#switch-project-name').select();
}
function continueProjectSwitch(){
  const action=pendingProjectAction;
  pendingProjectAction=null;
  projectSwitchDialog.close();
  action?.();
}
projectSwitchDialog.addEventListener('close',()=>{if(!projectSwitchDialog.open)pendingProjectAction=null;});
$('#discard-project').onclick=continueProjectSwitch;
$('#switch-project-form').onsubmit=event=>{
  event.preventDefault();
  try{
    saveProject(localStorage,{name:$('#switch-project-name').value,settings:captureProject()});
    continueProjectSwitch();
  }catch(error){
    const message=$('#switch-project-error');message.textContent=translateEngineMessage(error.message);message.hidden=false;
  }
};
function renderProjectGallery(preserveConfirm=false){
  const list=$('#project-list');
  const confirmations=new Set(preserveConfirm?[...list.querySelectorAll('[data-confirm="true"]')].map(button=>button.dataset.projectId):[]);
  list.replaceChildren();
  $('#save-project').hidden=!selectedSize||tooLargeRegion||busy||drawing||pendingVegetation;
  $('#project-backup').disabled=true;
  const projects=readProjects(localStorage);
  $('#project-backup').disabled=projects.length===0;
  for(const project of projects){
    const row=document.createElement('div'),name=document.createElement('strong');
    row.className='project-row';
    name.textContent=project.name;
    const open=document.createElement('button'),remove=document.createElement('button');
    open.type=remove.type='button';
    open.className='secondary';open.textContent=text('project.open');
    open.setAttribute('aria-label',text('project.openName',{name:project.name}));
    remove.className='quiet-button';remove.dataset.projectId=project.id;
    const showRemoveState=confirm=>{
      remove.dataset.confirm=String(confirm);
      remove.textContent=text(confirm?'project.confirm':'project.remove');
      remove.setAttribute('aria-label',text(confirm?'project.confirmName':'project.removeName',{name:project.name}));
    };
    showRemoveState(confirmations.has(project.id));
    open.disabled=busy||drawing||pendingVegetation;
    open.onclick=()=>switchProject(()=>{
      try{
        sessionStorage.setItem(projectRestoreKey,project.id);
        reloadWithoutSharedLink();
      }catch(error){feedback('project-feedback',error.message);}
    });
    remove.onclick=()=>{
      if(remove.dataset.confirm!=='true'){
        showRemoveState(true);
        feedback('project-feedback',statusMessage('project.confirmNotice'));
        return;
      }
      try{
        deleteProject(localStorage,project.id);
        renderProjectGallery();
        feedback('project-feedback',statusMessage('project.removed'));
      }catch(error){feedback('project-feedback',error.message);}
    };
    row.append(name,open,remove);list.append(row);
  }
  if(!list.children.length)list.textContent=text('project.empty');
}
function restoreProject(){
  const id=sessionStorage.getItem(projectRestoreKey);
  if(!id)return;
  sessionStorage.removeItem(projectRestoreKey);
  const project=readProjects(localStorage).find(item=>item.id===id);
  if(!project)throw Error(text('project.notFound'));
  applyProjectSettings(project.settings,project.name);
}
function applyProjectSettings(settings,name=''){
  const {sizePreset,pose,pureRelief,materials,reliefMaterials:savedReliefMaterials,options,print,historical,
    placeName:savedPlace,exampleId,mapZoom,strokes:savedStrokes,trailStrokes:savedTrails,
    drawnRouteStrokes:savedDrawnRoute,userRoute:savedRoute,pins:savedPins}=settings;
  userRoute=savedRoute??null;
  nextPinId=Math.max(0,...(savedPins??[]).map(pin=>pin.id??0))+1;
  pins=(savedPins??[]).map(pin=>({...pin,id:pin.id??nextPinId++}));
  setBoundarySettings(options);
  if(print){
    baseThickness=print.baseThickness;
    $('#print-base').value=baseThickness;
    cutSettings.set(sizeKey(...pieceDimensions(sizePreset)),print.cuts);
  }
  regularPureRelief=pureRelief&&!isPanoramicSize(...pieceDimensions(sizePreset));
  selectPieceSize(sizePreset);
  placeMap.setRotation(pose.rotation);
  placeMap.setRegion(physicalBBox(pose.center,pose.widthM/1000,pose.heightM/1000),mapZoom);
  placeName=savedPlace||name;
  const knownExample=CURATED_EXAMPLES.some(example=>example.id===exampleId)||legacyAnetoIds.includes(exampleId)||
    (exampleId===panoramicPilotId&&panoramicPilotAvailable());
  if(knownExample||recommendedPlace(exampleId)){
    exampleSelection={id:exampleId,bbox:selection,rotation:pose.rotation};
  }
  for(const [key,controlId] of Object.entries(projectControls)){
    const control=$('#'+controlId);
    if(control.type==='checkbox')control.checked=options[key];
    else control.value=options[key];
  }
  if($('#building-source').selectedOptions[0]?.disabled)$('#building-source').value=defaultBuildingSource(selection);
  buildingSourceExplicit=true;
  landscapeMaterials=materials;
  reliefMaterials=savedReliefMaterials??{count:6,assignments:defaultReliefAssignments(6)};
  selectExportFormat(options.exportFormat);
  const frame=brushHistory.prepare(modelOptions(),[]);
  strokes=brushHistory.accept({...frame,strokes:savedStrokes},[]);
  const trailFrame=trailHistory.prepare(modelOptions(),[]);
  trailStrokes=trailHistory.accept({...trailFrame,strokes:savedTrails??[]},[]);
  const routeFrame=routeHistory.prepare(modelOptions(),[]);
  drawnRouteStrokes=routeHistory.accept({...routeFrame,strokes:savedDrawnRoute??[]},[]);
  for(const stroke of [...strokes,...trailStrokes,...drawnRouteStrokes])gesture=Math.max(gesture,stroke.gesture??0);
  syncExaggerationLabel();$('#density').oninput();$('#brush-radius').oninput();
  for(const [id,unit] of textureSliders)syncTextureLabel(id,unit);
  legend();tiling();buildingControls();
  requireBuild(statusMessage(historical?'pending.projectCurrentData':'pending.project'));
  projectSnapshot=projectFingerprint();
}
initDialogs();
const projectDialog=$('#projects-dialog'),gallerySections=[...projectDialog.querySelectorAll('.gallery-sections button')];
const galleryBody=$('#gallery-body');
function showGallerySection(active){
  for(const button of gallerySections){
    button.setAttribute('aria-pressed',String(button===active));
    document.getElementById(button.getAttribute('aria-controls')).hidden=button!==active;
  }
  const saved=active.getAttribute('aria-controls')==='gallery-saved';
  for(const id of ['gallery-search-field','gallery-filters','gallery-example-status'])$('#'+id).hidden=saved;
  galleryBody.scrollTop=0;
  if(!saved)return;
  feedback('project-feedback','');
  try{renderProjectGallery();}catch(error){feedback('project-feedback',error.message);}
}
for(const button of gallerySections)button.onclick=()=>showGallerySection(button);
$('#projects-open').onclick=({currentTarget})=>{
  feedback('gallery-feedback','');
  showGallerySection(gallerySections[0]);
  currentTarget.focus({preventScroll:true});
  projectDialog.showModal();
  $('#gallery-search').select();
};
initExampleGallery(projectDialog,CURATED_EXAMPLES,example=>{
  if(busy||pendingVegetation||drawing||reliefTimer!==null){
    feedback('gallery-feedback',statusMessage('project.wait'));
    return;
  }
  switchProject(()=>{
    projectDialog.close();
    selectCuratedExample(example);
    showWorkshopPanel('preview',{focus:true});
  });
},openShareDialog);
$('#gallery-credits').append($('#example-carousel .example-credits').cloneNode(true));
const projectImportFile=$('#project-import-file'),projectImport=$('#project-import');
const maxProjectBackupBytes=16*1024*1024;
$('#project-backup').onclick=()=>{
  try{
    const json=exportProjectLibrary(localStorage);
    downloadFile(new Blob([json],{type:'application/json'}),'relleu-obert-projectes.json');
    feedback('project-feedback',statusMessage('project.downloaded'));
  }catch(error){feedback('project-feedback',error.message);}
};
projectImport.onclick=()=>projectImportFile.click();
projectImportFile.onchange=async()=>{
  const file=projectImportFile.files[0];
  projectImportFile.value='';
  if(!file||projectImport.disabled)return;
  if(file.size>maxProjectBackupBytes){
    feedback('project-feedback',statusMessage('project.importTooLarge'));
    return;
  }
  projectImport.disabled=true;
  try{
    const json=await file.text().catch(()=>null);
    if(json===null){
      feedback('project-feedback',statusMessage('project.importReadError'));
      return;
    }
    const {added,skipped}=importProjectLibrary(localStorage,json);
    renderProjectGallery();
    feedback('project-feedback',statusMessage('project.imported',()=>({added:formatNumber(added),skipped:formatNumber(skipped)})));
  }catch(error){
    feedback('project-feedback',error instanceof SyntaxError?statusMessage('project.importInvalid'):error.message);
  }finally{projectImport.disabled=false;}
};
$('#save-project').onsubmit=event=>{
  event.preventDefault();
  if(!selectedSize||tooLargeRegion||busy||drawing||pendingVegetation)return;
  try{
    const input=$('#project-name');
    saveProject(localStorage,{name:input.value,settings:captureProject()});
    projectSnapshot=projectFingerprint();
    input.value='';
    renderProjectGallery();
    feedback('project-feedback',statusMessage('project.saved'));
  }catch(error){feedback('project-feedback',error.message);}
};
$('#release-list').innerHTML=[['0.23.56','L’Umami propi d’ortogra.fi compta visites i obertures de la galeria, sense recollir el lloc ni els ajustos de la maqueta.'],['0.23.2','Botó de Galeria de maquetes amb vora i selector d’idioma desplegable a la dreta.'],['0.23.1','La capa d’edificis es prepara i s’integra amb menys unions de polígons.'],['0.23.0','Consolidació del taller, la galeria i l’exportació per plaques, amb les millores de relleu i ponts de la sèrie 0.22.'],['0.22.43','Els ponts curts poden deixar pas sobre els canals. El càlcul prioritza els creuaments d’aigua i reparteix els ponts pel retall.'],['0.22.42','Galeria amb carrusel, cerca d’exemples i projectes desats. La badia de Tamariu té fitxa pròpia.'],['0.22.41','El mar i el punt més baix dels retalls interiors queden a 5 mm de la base en Relleu pur.'],['0.22.40','La pantalla inicial adapta la taula, el selector i el carrusel a l’espai del panell.'],['0.22.39','Relleu pur fins a 1:500.000 també en formats quadrats i rectangulars.'],['0.22.38','Més espai entre el selector de mides i el carrusel a la pantalla inicial.'],['0.22.37','Amplada i fondària editables directament a La teva maqueta, amb els límits de mida a la vista.'],['0.22.36','El panell dret de les maquetes del catàleg mostra el lloc, el tipus i la descripció de la fitxa.'],['0.22.35','Exageració vertical, rius i vegetació de Relleu pur s’apliquen sobre el retall carregat.'],['0.22.34','Taller mòbil amb mides i exemples tàctils, visor en directe i panells inferiors d’ajustos i exportació.'],['0.22.33','El carrusel recull els 28 retalls del catàleg amb imatges estàtiques i generació directa. El motor recupera les vies ordinàries si falla la integració dels perfils suaus.'],['0.22.32','Textura forestal més discreta i regulable, vores de tessel·la corregides i cobertes obertes quan hi ha dades.'],['0.22.31','Barcelona, Girona i Cardona s’afegeixen al carrusel com a exemples de Model complet amb imatges estàtiques i generació automàtica.'],['0.22.30','Fitxes flotants, controls laterals i un retall més ampli del Cap de Creus.'],['0.22.29','Montserrat, Sant Maurici i els volcans del Croscat i Santa Margarida al carrusel.'],['0.22.28','Vegetació contínua i editable sobre el bosc en Relleu pur.'],['0.22.26','Controls de vegetació i pinzell de capçades o textura en Relleu pur.'],['0.22.25','Carrusel lent en bucle, fitxes ampliables i generació directa dels exemples.'],['0.22.24','Control de gir separat, amb indicació visible d’activat o desactivat.'],['0.22.23','Carrusel inicial amb tres exemples de Relleu pur i imatges estàtiques.'],['0.22.22','Tamariu com a punt de partida, gir suau al visor i cota del mar corregida amb el MET5.'],['0.22.21','Tria d’un a sis filaments i assignació per capa en Relleu pur.'],['0.22.20','Mars i oceans cartografiats, plans i blaus fins a la base, en Relleu pur.'],['0.22.19','Peces panoràmiques a escala sobre la taula, en dues files a partir de 61 cm.'],['0.22.18','Format panoràmic en Relleu pur i previsualització del terreny per peces.'],['0.22.17','Canvi de mida al mateix projecte, conservant el territori i els ajustos.'],['0.22.16','Retalls a la mateixa escala amb ombrejat suau i una sola mida rectangular predefinida.'],['0.22.15','Previsualització de mides i talls sobre una taula i enllaç al changelog a la capçalera.'],['0.22.14','Un sol 3MF amb diverses plaques de Bambu i ZIP de peces opcional.'],['0.22.13','Filament per peça al 3MF de Bambu Studio.'],['0.22.12','Senders més estrets i aigua continental de superfície.'],['0.22.11','Més trams amb paviment independent i secció plana fins a la vora.'],['0.22.10','Paviment independent per defecte i trams recuperats entre cruïlles.'],['0.22.9','Primera prova de paviment nou en retalls reals.'],['0.22.8','Cupó de 120 × 120 mm amb vies sinuoses, cruïlla i pont.'],['0.22.7','Cupó de túnel amb dues boques i rasant compartida amb els accessos.'],['0.22.6','Cupó de pont amb dos enllaços sense graó i una via inferior.'],['0.22.5','Rasant contínua a la corba del cupó de paviment.'],['0.22.4','Cupó de paviment amb corba i cruïlla en T sense graó.'],['0.22.3','Cupó de paviment amb secció plana, excavació i reblert.'],['0.22.2','Perfils de vies recuperats quan falten cotes fora de la maqueta.'],['0.22.1','Perfils de calçada sobre túnels verificats i amplada estimada de les autopistes de sentit únic.'],['0.22.0','Versió de consolidació dels perfils viaris, ponts i túnels.'],['0.21.9','Signatura d’ortogra.fi al peu de pàgina.'],['0.21.8','Recuperació de ponts amb fragments solapats entre tessel·les.'],['0.21.7','Recuperació de túnels estimats amb poca coberta.'],['0.21.6','Transicions de vies amb més traçat disponible quan l’enllaç inicial falla.'],['0.21.5','Mides de 10 a 50 cm i guies discontínues de tall sobre el relleu.'],['0.21.4','Unió de paviment més robusta per a vies principals i ferrocarrils.'],['0.21.3','Perfils suaus amb MET5 acotats al retall i recuperació selectiva d’unions.'],['0.21.2','Corregida la càrrega de relleu amb el MET5.'],['0.21.1','MET5 de l’ICGC com a font preferent quan cobreix el retall.'],['0.21.0','Auditoria d’exportacions de control per altura i suavitzat intermedi de vies principals i ferrocarrils.'],['0.20.1','Rasants ferroviàries suavitzades segons l’escala i accessos amb canvis de pendent més progressius.'],['0.20.0','Galeria local per desar i recuperar els ajustos i traços d’una maqueta.'],['0.19.25','Capçades còniques més altes i prova conjunta dels Rasos de Peguera i la Gallina Pelada.'],['0.19.24','Capçades automàtiques d’alta muntanya al Model complet i densitat segons la cota a Relleu pur.'],['0.19.23','Capçades arrodonides en retalls baixos i progressivament còniques en retalls d’alta muntanya.'],['0.19.22','Boscos cartografiats i capçades a escala en Relleu pur.'],['0.19.21','Aigua cartografiada fora de l’Aneto en Relleu pur i controls d’orientació del mapa ajustats.'],['0.19.20','Selector segmentat de mode i rius i rierols amb amplada mínima configurable.'],['0.19.19','Modes Paisatge complet i Relleu pur a Territori, llacs plans i més detall al Paisatge complet.'],['0.19.18','Contorns de neu i roca interpolats, cobertura de l’Aneto més fina i més resolució amb detall Equilibrat i Alt.'],['0.19.17','Relleu pur amb una malla més fina, tessel·les d’elevació més detallades i talls de peces sobre una malla comuna.'],['0.19.16','Mode Relleu pur fins a 1:100.000, amb mostra de l’Aneto i cobertura de sòl nu i neu o gel. Perfils suaus activats per defecte.'],['0.19.15','Unions viàries més ràpides, amplades segons escala i transicions més suaus als accessos.'],['0.19.14','Informe JSON de temps de generació amb retall, ajustos i durada de cada fase.'],['0.19.13','Guies de tall sobre el relleu i descàrrega de la maqueta visible quan el mapa té canvis pendents.'],['0.19.12','Progrés per fases i previsualització de relleu, vies, edificis i vegetació mentre es genera la maqueta.'],['0.19.11','Un enllaç, túnel o edifici amb geometria defectuosa pot quedar omès amb un avís mentre es genera la resta de la maqueta.'],['0.19.10','Els taulers procedimentals recuperen la continuïtat entre tessel·les i les cotes dels estreps fora del retall.'],['0.19.9','Transicions entre perfils suaus i vies sobre el terreny. Segon retall ferroviari verificat.'],['0.19.8','Perfils experimentals de vies principals i ferrocarrils. Projecte nou sobre Territori i compàs al mapa.'],['0.19.7','Catastre per blocs, amb vista provisional i avisos dels elements amb dades contradictòries.'],['0.19.6','Mides proporcionals al centre, generació des de Territori i límit d’escala d’1:20.000.'],['0.19.5','Inici guiat, exemples a Territori i escala sincronitzada amb el mapa. El retall es gira des de la cantonada.'],['0.19.4','Els ajustos de vies reutilitzen el terreny i els edificis. Es conserven els traços del pinzell i la vista.'],['0.19.3','Ajustos de vies automàtics, descàrrega ancorada amb selector de format i ferrocarrils arran de carretera per defecte.'],['0.19.2','Sis passos amb accions al costat del títol. Els traços del pinzell es conserven en canviar de retall durant la sessió. Avís quan falta espai per enllaçar un pont al límit de la maqueta.'],['0.19.1','Corregits el graó de les boques girades i els plecs dels enllaços en revolts. Controls 3MF nous i proposta navegable de flux per etapes RO-053, pendent de revisió abans d’integrar-la.'],['0.19.0','Continuïtat i amplada de la calçada revisades als enllaços amb ponts i túnels. Marc exterior retirat del menú i ajornat per a un desenvolupament posterior.'],['0.18.2','Primera optimització de les vies principals: màscares de pilars calculades només quan calen i reutilitzades. El control de 3 km passa de 189,3 a 56,6 s amb els mateixos 14 perfils. Prototip encara desactivat; controls 3MF disponibles al repositori i cas de detall baix pendent.'],['0.18.1','Túnels activats per defecte, sostre parabòlic i paviment de camí. Envolupant de vies principals preparada com a prototip, pendent d’optimitzar abans d’activar-la.'],['0.18.0','Ferrocarrils amb material propi i realç de +0,5 o +1 mm sobre els camins. Millora dels portals de túnels estimats. Nova font OSM de cobertes i parts originals, amb formes paramètriques quan hi ha dades i preservació del mode limitat pla.'],['0.17.0','Pilars adaptats a l’escala, suports auxiliars i avisos de llums. Túnels estimats amb obertures reals, en una opció experimental desactivada per defecte. Exemples automàtics, marc negre i plaques ajornades.'],['0.16.0','Ponts procedimentals a partir de la cartografia i el relleu, amb pilars i connexions. Perfils estimats entre extrems, diferenciats de les dades específiques de Rajadell. El viaducte es conserva en moure, ampliar o girar el retall.'],['0.15.1','Rajadell es conserva en retalls ampliats o desplaçats: els detalls del pont es carreguen per ubicació, també fora del botó d’exemple. Memòria cau acotada i reintent de lectures fallides. Generalització procedimental en curs.'],['0.15.0','Pilars simplificats que eviten camins i edificis, i enllaços suaus del viaducte amb la carretera. Conjunt unit abans de mostrar-lo i exportar-lo. Realç opcional dels camins de 0,5 o 1 mm de maqueta. Suports i enllaços estimats, pendents de laminat.'],['0.14.0','Primer viaducte amb superfície 3D de l’ICGC a la mostra de Manresa, separada del terreny i conservada al 3MF. Gruix simplificat, sense pilars mesurats. Llibre d’estil per a contribucions i tasques delegades. Túnel pendent de dades suficients.'],['0.13.1','Base corregida: la cota més baixa del relleu queda a 5 mm. Es conserven el desnivell, l’exageració i una referència vertical comuna a totes les capes. A la costa, el mar també queda a 5 mm.'],['0.13.0','Catastre amb consultes per quadrants i recuperació de la font anterior en fallar. Sidebars homogenis, marc coherent amb la seva exportació i sense canvis de zoom. Viaducte de l’Eix Diagonal com a mostra inicial, Tamariu al catàleg. Fletxa del nord retirada i rosa ajornada.'],['0.12.0','Vista de presentació amb taula i llum, render a demanda i retorn al taller. Fonts remotes amb resum clar i fitxers propis dins d’opcions avançades. Proves de sòlids per preparar infraestructures; ponts i coves reals pendents.'],['0.11.0','Catastre buit vàlid, pinzell amb cobertura per gest i retorn a navegació, edificis automàtics i complements independents: marc, placa educativa i fletxa del nord. Cobertes reals en estudi.'],['0.10.0','Catastre amb espera i reintent fitats, errors entenedors i model conservat en fallar. Preparació del sistema d’idiomes, només amb català disponible. Propostes de marc imprimible, etiquetes, rosa dels vents i escena realista.'],['0.9.0','Pinzell aleatori, fonts d’edificis explícites i parts del Catastre. Edificis actualitzats sense reconstruir terreny, i primeres cobertes amb atributs de la font.'],['0.8.0','Vegetació repartida per tota la zona verda, pinzell amb prioritat al límit, densitat per traç i exportació sense selectors de broquet ni tipus de filament. Estudi de parts d’edificis, cobertes, ponts i túnels.'],['0.7.0','Sidebars reorganitzats, escala en un sol camp, orientació al mapa, arbres proporcionats a l’escala i límits de càrrega coherents. Historial de tasques validades separat.'],['0.6.0','Menús sempre visibles amb scroll intern, estadístiques al sidebar, V4V i favicon, transicions, marc visual, retall girat, opcions de filament/broquet i importació local GeoTIFF/GeoJSON.'],['0.5.0','Apartats replegables, controls dins del preview i selecció per escala horitzontal fixa. Diagnòstic dels blocs d’edificis de Tamariu.'],['0.4.2','Lectura numèrica directa del relleu WebP/PNG, sense canvas, i diagnòstics de les tessel·les per investigar els pics intermitents.'],['0.4.1','Cobertes horitzontals: el límit d’altura es mesura sobre el punt més alt del terreny dins de la petjada.'],['0.4.0','Camins amb unions arrodonides, edificis limitats a 5 m per defecte o sense volum, i pinzell amb indicador de treball i un càlcul per traç.'],['0.3.0','Mapa i cerca de llocs, layout d’escriptori estable, 1–8 materials, vegetació editable i exportació en peces.'],['0.2.0','Edificis ICGC, relleu corregit, capçades variades i exportació per a Bambu Studio.'],['0.1.0','Primera maqueta de Tamariu generada al navegador amb costa vectorial i exportació 3D.']].map(([v,text])=>`<article class="release-entry" lang="ca"><div><strong>v${v}</strong><time>${v==='0.23.56'?'12/11/2026':['0.23.2','0.23.1','0.23.0','0.22.43','0.22.42','0.22.41','0.22.40','0.22.39','0.22.38','0.22.37','0.22.36','0.22.35','0.22.34','0.22.33'].includes(v)?'05/11/2026':['0.22.32','0.22.31','0.22.30','0.22.29','0.22.28','0.22.26','0.22.25','0.22.24','0.22.23','0.22.22','0.22.21','0.22.20','0.22.19','0.22.18','0.22.17','0.22.16','0.22.15','0.22.14','0.22.13','0.22.12','0.22.11','0.22.10','0.22.9','0.22.8','0.22.7','0.22.6','0.22.5','0.22.4','0.22.3','0.22.2','0.22.1','0.22.0','0.21.9','0.21.8','0.21.7','0.21.6','0.21.5'].includes(v)?'04/11/2026':['0.21.4','0.21.3','0.21.2','0.21.1','0.21.0','0.20.1','0.20.0','0.19.25','0.19.24','0.19.23','0.19.22','0.19.21','0.19.20','0.19.19','0.19.18','0.19.17','0.19.16','0.19.15','0.19.14','0.19.13','0.19.12','0.19.11','0.19.10','0.19.9','0.19.8','0.19.7','0.19.6','0.19.5','0.19.4','0.19.3','0.19.2'].includes(v)?'03/11/2026':['0.19.1','0.19.0','0.18.2','0.18.1','0.18.0','0.17.0','0.16.0','0.15.1','0.15.0','0.14.0','0.13.1','0.13.0','0.12.0','0.11.0'].includes(v)?'02/11/2026':v==='0.1.0'?'31/10/2026':'01/11/2026'}</time></div><p>${text}</p></article>`).join('');
$('#release-list').insertAdjacentHTML('afterbegin',`<article class="release-entry"><div><strong>v0.23.3</strong><time datetime="2026-11-05">05/11/2026</time></div><p data-i18n="history.translationRelease">${t('history.translationRelease')}</p></article>`);
$('#release-list').insertAdjacentHTML('afterbegin',`<article class="release-entry"><div><strong>v0.23.4</strong><time datetime="2026-11-05">05/11/2026</time></div><p data-i18n="history.galleryGrid">${t('history.galleryGrid')}</p></article>`);
$('#release-list').insertAdjacentHTML('afterbegin',`<article class="release-entry"><div><strong>v0.23.5</strong><time datetime="2026-11-05">05/11/2026</time></div><p data-i18n="guide.release">${t('guide.release')}</p></article>`);
$('#release-list').insertAdjacentHTML('afterbegin',`<article class="release-entry"><div><strong>v0.23.6</strong><time datetime="2026-11-05">05/11/2026</time></div><p data-i18n="history.tenerifeFrame">${t('history.tenerifeFrame')}</p></article>`);
$('#release-list').insertAdjacentHTML('afterbegin',`<article class="release-entry"><div><strong>v0.23.7</strong><time datetime="2026-11-05">05/11/2026</time></div><p data-i18n="history.0.23.7">${t('history.0.23.7')}</p></article>`);
$('#release-list').insertAdjacentHTML('afterbegin',`<article class="release-entry"><div><strong>v0.23.8</strong><time datetime="2026-11-06">06/11/2026</time></div><p data-i18n="history.0.23.8">${t('history.0.23.8')}</p></article>`);
$('#release-list').insertAdjacentHTML('afterbegin',`<article class="release-entry"><div><strong>v0.23.9</strong><time datetime="2026-11-06">06/11/2026</time></div><p data-i18n="history.0.23.9">${t('history.0.23.9')}</p></article>`);
$('#release-list').insertAdjacentHTML('afterbegin',`<article class="release-entry"><div><strong>v0.23.10</strong><time datetime="2026-11-06">06/11/2026</time></div><p data-i18n="history.0.23.10">${t('history.0.23.10')}</p></article>`);
$('#release-list').insertAdjacentHTML('afterbegin',`<article class="release-entry"><div><strong>v0.23.11</strong><time datetime="2026-11-06">06/11/2026</time></div><p data-i18n="history.0.23.11">${t('history.0.23.11')}</p></article>`);
$('#release-list').insertAdjacentHTML('afterbegin',`<article class="release-entry"><div><strong>v0.23.12</strong><time datetime="2026-11-06">06/11/2026</time></div><p data-i18n="history.0.23.12">${t('history.0.23.12')}</p></article>`);
$('#release-list').insertAdjacentHTML('afterbegin',`<article class="release-entry"><div><strong>v0.23.13</strong><time datetime="2026-11-06">06/11/2026</time></div><p data-i18n="history.0.23.13">${t('history.0.23.13')}</p></article>`);
$('#release-list').insertAdjacentHTML('afterbegin',`<article class="release-entry"><div><strong>v0.23.14</strong><time datetime="2026-11-06">06/11/2026</time></div><p data-i18n="history.0.23.14">${t('history.0.23.14')}</p></article>`);
// The earlier summaries include translations maintained by the locale dictionaries.
prependReleases($('#release-list'),releasesAfter(changelog,'0.23.14'));
$('#copy-lightning').onclick=async()=>{try{await navigator.clipboard.writeText('aptswim903@walletofsatoshi.com');feedback('copy-status',statusMessage('copy.done'));}catch{feedback('copy-status',statusMessage('copy.manual'));}};
for(const toggle of document.querySelectorAll('.sidebar-left .section-toggle'))toggle.disabled=true;
function refreshWorkshopLanguage(){
  syncWelcomeCopy();
  syncModelModeCopy();
  syncViewerHint();
  syncSelectionInfo();
  setOrbitEnabled(orbitEnabled);
  syncExaggerationLabel();
  $('#density').oninput();
  $('#brush-radius').oninput();
  for(const [id,unit] of textureSliders)syncTextureLabel(id,unit);
  showCatalogPlace(stagedBuild?.preview?pendingCatalogPlace:modelCatalogPlace);
  if(model&&region){buildingInfo();showModelNotes(model);}
  buildingControls();
  legend();metrics();
  syncPrintSettings();
  syncRouteSettings(busy||drawing||pendingVegetation);
  syncViewerTools();
  if(pins.length)refreshPinMarkers();
  workshopGuide.update();
  selectExportFormat(exportFormat);
  scaleHint();
  $('#status').textContent=messageText(currentStatus);
  $('#model-badge').textContent=messageText(currentBadge);
  if(stagedBuild?.progress)showBuildProgress(stagedBuild.progress);
  for(const [id,message] of feedbackMessages)$('#'+id).textContent=messageText(message);
  if(projectDialog.open&&!$('#gallery-saved').hidden){
    try{renderProjectGallery(true);}catch(error){feedback('project-feedback',error.message);}
  }
}
function showTourOutput(id){
  showWorkshopPanel('export');
  const panel=id&&document.getElementById(id);
  if(panel?.hidden)$('[aria-controls="'+id+'"]').click();
}
const guideLayers={vegetation:'vegetation',transport:'transport',buildings:'buildings'};
const guideOutputs={piece:'info-print',materials:'info-materials',data:'info-data'};
const buildForGuide=()=>busy&&job==='build';
const guideModelReady=()=>!!model&&!needsBuild&&!busy;
const slowGuideBuildDelay=30_000;
let guideBuildTimer=null,slowGuideBuild=false;
function updateWorkshopGuide(){
  if(!buildForGuide()||workshopGuide.current()!=='territory'){
    clearTimeout(guideBuildTimer);
    guideBuildTimer=null;
    slowGuideBuild=false;
  }else if(guideBuildTimer===null&&!slowGuideBuild){
    guideBuildTimer=setTimeout(()=>{
      guideBuildTimer=null;
      if(!buildForGuide()||workshopGuide.current()!=='territory')return;
      slowGuideBuild=true;
      workshopGuide.update();
    },slowGuideBuildDelay);
  }
  workshopGuide.update();
}
const workshopGuide=createWorkshopGuide($('#workshop-guide'),{
  fallbackFocus:$('#help-open'),
  getSteps:()=>['size','territory','vegetation','transport',...(pureSelected()?[]:['buildings']),
    'tools','piece','materials','data','download','preview'],
  canAdvance:step=>step==='size'?!!selectedSize:step==='territory'?guideModelReady():true,
  autoAdvance:step=>step==='size'?!!selectedSize:step==='territory'&&guideModelReady(),
  titleKey:step=>step==='transport'&&pureSelected()?'guide.workshop.transport.reliefTitle':undefined,
  instructionKey:step=>step==='territory'&&buildForGuide()?(slowGuideBuild?'guide.workshop.territory.slow':'guide.workshop.territory.wait'):
    step==='territory'&&guideModelReady()?'guide.workshop.territory.existing':
    step==='transport'&&pureSelected()?'guide.workshop.transport.relief':
    step==='tools'&&pureSelected()?'guide.workshop.tools.relief':
    step==='preview'&&narrowWorkshop.matches?'guide.workshop.preview.touch':
    step==='size'&&selectedSize?'guide.workshop.size.existing':undefined,
  onStep(step){
    if(step==='size'){
      if(selectedSize)showTourOutput('info-print');
      else showWorkshopPanel('preview');
    }else if(step==='territory'){
      openStep('place');
      updateWorkshopGuide();
    }
    else if(Object.hasOwn(guideLayers,step))openStep(guideLayers[step]);
    else if(step==='tools'||step==='preview')showWorkshopPanel('preview');
    else showTourOutput(guideOutputs[step]);
  },
  targets(step){
    if(step==='size')return [selectedSize?resizeForm:$('.piece-setup-controls')];
    if(step==='territory'){
      if(buildForGuide())return [view];
      return [$('#panel-place'),placeLocation,$('[data-step-action="place"].is-build'),$('#status')];
    }
    if(Object.hasOwn(guideLayers,step)){
      const controls=$('#panel-'+guideLayers[step]);
      if(step==='transport'&&!viewerToolsPanel.hidden)
        return [controls,viewerToolsPanel,renderer.domElement];
      return step==='vegetation'?[controls,renderer.domElement]:[controls];
    }
    if(step==='tools')return viewerToolsPanel.hidden?[viewerToolsOpen]:
      [viewerToolsOpen,viewerToolsPanel,...(pureSelected()?[renderer.domElement,previewPins.element]:[])];
    if(step==='preview')return [view];
    return [step==='download'?$('.download-panel'):document.getElementById(guideOutputs[step])];
  }
});
function startWorkshopTour(returnFocus){
  workshopGuide.start({step:'size',returnFocus});
  updateWorkshopGuide();
}
$('#welcome-guide').onclick=()=>startWorkshopTour($('#welcome-guide'));
$('#start-workshop-guide').onclick=()=>{
  $('#help-dialog').close();
  openWorkshopWelcome($('#help-open'));
};
const welcomeTour=$('#workshop-welcome'),welcomeTourKey='relleu-obert.workshop-welcome';
const welcomeExamples=['tamariu','montserrat','amsterdam-singelgracht'].map(id=>CURATED_EXAMPLES.find(example=>example.id===id));
let welcomeExampleIndex=0,welcomeTourOpener;
function showWelcomeExample(index){
  welcomeExampleIndex=(index+welcomeExamples.length)%welcomeExamples.length;
  const example=welcomeExamples[welcomeExampleIndex],image=$('#welcome-tour-image');
  const {title,description}=localizeExample(example);
  image.src=example.image;
  image.alt=description;
  $('#welcome-tour-example-name').textContent=title;
  $('#welcome-tour-example-position').textContent=formatNumber(welcomeExampleIndex+1)+' / '+formatNumber(welcomeExamples.length);
  if(!reducedMotion.matches){
    for(const animation of image.getAnimations())animation.cancel();
    image.animate([{opacity:.55},{opacity:1}],{duration:180,easing:'ease-out'});
  }
}
function openWorkshopWelcome(opener){
  welcomeTourOpener=opener;
  showWelcomeExample(0);
  welcomeTour.showModal();
}
$('#tour-open').onclick=()=>openWorkshopWelcome($('#tour-open'));
for(const button of welcomeTour.querySelectorAll('[data-welcome-slide]')){
  button.onclick=()=>showWelcomeExample(welcomeExampleIndex+Number(button.dataset.welcomeSlide));
}
welcomeTour.addEventListener('close',()=>{try{localStorage.setItem(welcomeTourKey,'seen');}catch{}});
$('#welcome-start-tour').onclick=()=>{
  welcomeTour.close();
  startWorkshopTour(welcomeTourOpener);
};
onLocaleChange(refreshWorkshopLanguage);
initI18n();
const openingSharedLink=isSharedLink(location.hash);
try{
  if(openingSharedLink){
    const example=readExampleLink(location.hash);
    if(example)selectCuratedExample(example,{keepLink:true});
    else{
      applyProjectSettings(readProjectLink(location.hash));
      generate();
    }
  }else restoreProject();
}catch(error){say(openingSharedLink?statusMessage('share.invalid'):error.message,true);}
let firstWorkshopVisit=true;
try{firstWorkshopVisit=!localStorage.getItem(welcomeTourKey);}catch{}
if(firstWorkshopVisit&&!selectedSize&&!openingSharedLink)openWorkshopWelcome($('#welcome-guide'));
