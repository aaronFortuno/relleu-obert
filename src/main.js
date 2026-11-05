import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadRegion,loadBuildingLayer,applyBuildingLayer,defaultBuildingSource} from './sources.js';
import {inCatalonia} from './buildings.js';
import {createPlaceMap,MAX_PROJECT_SCALE,PURE_SCALE_RANGE} from './place-map.js';
import {PURE_RELIEF_RESOLUTIONS} from './pure-relief-mesh.js';
import {smoothTerrainNormals} from './terrain-normals.js';
import {CATEGORIES,PALETTES,defaultAssignments,RELIEF_MATERIALS,RELIEF_PALETTES,defaultReliefAssignments,reliefMaterialId} from './materials.js';
import {pieceDimensions,tilePlan,MAX_PRINT_TILE_MM,scaledBBox,physicalBBox,selectionPose,isPanoramicSize,PANORAMIC_SCALE_RANGE} from './selection.js';
import {initPiecePicker,bindPieceDimensions} from './piece-picker.js';
import {CURATED_EXAMPLES} from './curated-examples.js';
import {initExampleCarousel} from './example-carousel.js';
import {readProjects,saveProject,deleteProject} from './project-library.js';
import {cutGuideSegments} from './cut-guides.js';
import {regionLimitMessage} from './region-limits.js';
import {initDialogs} from './dialogs.js';
import {initI18n,t} from './i18n.js';
import {createPresentationMode} from './presentation-scene.js';
import {createDemandRenderer} from './render-scheduler.js';
import {createPreviewOrbit} from './preview-orbit.js';
import {createBuildingUpdateScheduler} from './building-update-scheduler.js';
import {createProjectBrushHistory} from './project-brush-history.js';
import {withoutLastGesture} from './brush-coverage.js';
import {describeSources} from './source-options.js';
import {buildRequest} from './build-request.js';
import {RECOMMENDED_PLACES,DEFAULT_PLACE,recommendedPlace,placeSelection} from './recommended-places.js';
import './style.css';
import './ui-tokens.css';
import './usability.css';
import './example-carousel.css';
import './mobile-workshop.css';
import './mobile-onboarding.css';
const $=s=>document.querySelector(s),view=$('#viewport'),worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
const narrowWorkshop=matchMedia('(max-width: 900px)'),layout=$('.app-layout');
const workshopNav=$('#mobile-workshop'),workshopButtons=[...workshopNav.querySelectorAll('button')];
function arrangeTerritory(){
  const options=$('#place-mode-options');
  const focused=options.contains(document.activeElement)?document.activeElement:null;
  if(narrowWorkshop.matches)$('.map-caption').after(options);
  else $('#search-form').before(options);
  focused?.focus({preventScroll:true});
}
arrangeTerritory();
narrowWorkshop.addEventListener('change',arrangeTerritory);
function showWorkshopPanel(panel,{focus=false}={}){
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
  if(event.key==='Escape'&&!event.defaultPrevented&&narrowWorkshop.matches&&!workshopNav.hidden&&
      layout.dataset.mobilePanel!=='preview'&&!document.querySelector('dialog[open]')){
    event.preventDefault();
    showWorkshopPanel('preview',{focus:true});
  }
});
let region,model,busy=false,selection,dirty=false,buildingSourceDirty=false,needsBuild=false,placeName='Regió seleccionada',strokes=[],brush='navigate',pendingVegetation=false,timer,job,drawing=false,lastPoint,gesture=0;
const brushHistory=createProjectBrushHistory();
let pendingBrushFrame=null,transportTimer=null,reliefTimer=null;
let exportFormat='bambu';
let pendingFullRegion=null,lastValidBuildings=null,recoveryNotice='';
let pendingCadastralBuild=false;
let stagedBuild=null;
let processingRun,lastProcessingReport;
function finishProcessing(error){
  if(!processingRun)return;
  const {started,awaitingBuildings,...report}=processingRun;
  lastProcessingReport={...report,status:error?(report.result?'partial':'error'):'complete',error:error?.message,
    totalMilliseconds:performance.now()-started};
  processingRun=null;
  $('#download-processing').disabled=false;
}
$('#download-processing').onclick=()=>{
  if(!lastProcessingReport)return;
  const blob=new Blob([JSON.stringify(lastProcessingReport,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;
  link.download='relleu-obert-temps-'+lastProcessingReport.startedAt.replaceAll(':','-')+'.json';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
};
let presentationMode,demandRenderer;let contextLost=false,presentationReduced=false;
let landscapeMaterials={count:4,assignments:defaultAssignments(4)};
let reliefMaterials={count:6,assignments:defaultReliefAssignments(6)};
let selectedSize=null,exampleSelection=null,regularPureRelief=false;
let selectedPose,tooLargeRegion=false,pendingBuildingLayer=null,icgcAvailable=true,buildingSourceExplicit=false;
const size=()=>pieceDimensions(selectedSize);
const panoramicSelected=()=>!!selectedSize&&isPanoramicSize(...size());
function pendingPieceSize(){
  if(!model)return false;
  const [width,height]=size();
  return width!==model.width||height!==model.height;
}
const needsCuts=(width,height)=>Math.max(width,height)>MAX_PRINT_TILE_MM;
const pureSelected=()=>$('#mode-relief').checked;
const LANDSCAPE_RESOLUTIONS={24:36,36:64,56:96};
const isPure=m=>!!m?.provenance.options.pureRelief;
const canUpdateVegetation=()=>!!model&&pureSelected()===isPure(model);
const brushHasGeometry=()=>isPure(model)||!model?.provenance.treeRepresentation?.omittedBelowThreshold;
const canPaint=()=>canUpdateVegetation()&&!busy&&!needsBuild&&reliefTimer===null&&$('#trees').checked&&brushHasGeometry();
const vegetation=()=>({trees:$('#trees').checked,density:2.5,brushDensity:Number($('#density').value),treeType:$('#tree-type').value,strokes,
  ...(pureSelected()?{vegetationHeight:Number($('#vegetation-height').value),vegetationNoise:Number($('#vegetation-noise').value)}:{})});
const say=(message,error=false)=>{$('#status').textContent=message;$('#status').classList.toggle('error',error);};
const badge=message=>{$('#model-badge').textContent=message;$('#model-badge').hidden=!message;};
const workLabels={
  relief:'Actualitzant el relleu carregat…',vegetation:'Actualitzant la vegetació…',
  buildings:'Actualitzant els edificis…',transport:'Actualitzant les vies…',
  accessory:'Preparant el complement…',export:'Preparant el fitxer…'
};
function lock(value){
  busy=value;
  const updating=value||pendingVegetation,workPending=updating||reliefTimer!==null;
  const waterLocked=updating&&!(value&&job==='relief');
  syncStepActions(workPending);
  $('#model-mode').disabled=updating;
  $('#streams').disabled=waterLocked;
  $('#stream-width').disabled=waterLocked||!$('#streams').checked;
  $('#exag').disabled=value&&job==='build'&&pureSelected();
  for(const id of ['road-rise','rail-rise','trail-width','estimated-tunnels','major-profiles','building-source',
    'building-mode','model-scale','recommended-place','new-project'])$('#'+id).disabled=updating;
  $('#building-height').disabled=updating||$('#building-mode').value!=='limited';
  placeMap.setLocked(updating);
  $('#piece-resize-open').disabled=workPending||drawing;
  syncExport(workPending||!model);
  syncVegetationControls(workPending);
  view.setAttribute('aria-busy',String(workPending));
  $('#work-indicator').hidden=!workPending;
  $('#work-label').textContent=drawing?'Acaba el traç per aplicar-lo':
    value?(stagedBuild?.label||workLabels[job]||'Generant el model…'):
    pendingVegetation?'Aplicant el traç de vegetació…':workLabels.relief;
  view.classList.toggle('is-working',workPending&&!drawing);
  if(workPending&&!drawing)$('#brush-cursor').hidden=true;
  editButtons();
  syncPresentationUI();
}
function markDirty(){
  dirty=!!region&&!sameBounds(selection,region.meta.bbox);
  if(dirty||model&&selectedPose.rotation!==model.provenance.options.selectionPose?.rotation)requireBuild('Selecció pendent de generar');
}
const preferredScaleStops=[500,1000,2000,5000,10000];
let scaleStops=[...preferredScaleStops,MAX_PROJECT_SCALE];
const sameBounds=(a,b)=>a&&b&&a.every((value,i)=>Math.abs(value-b[i])<1e-9);
const placeMap=createPlaceMap($('#place-map'),{
  onChange(bbox,center,pose){
    if(exampleSelection&&(pose.rotation!==exampleSelection.rotation||!sameBounds(exampleSelection.bbox,bbox))){
      exampleSelection=null;
      $('#recommended-place').value='';
      placeName='Regió seleccionada';
    }
    selection=bbox;
    selectedPose=pose;
    syncBuildingSources(bbox);
    const [lat,lon]=pose.center;
    $('#selection-info').textContent=`${(pose.widthM/1000).toFixed(2)} × ${(pose.heightM/1000).toFixed(2)} km · ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    scaleHint();
    if(region)markDirty();
  },
  onName(name){placeName=name;}
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
  orbitButton.querySelector('span').textContent=enabled?'Activat':'Desactivat';
  orbitButton.title=enabled?'Atura el gir automàtic':'Activa el gir automàtic';
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
const group=new THREE.Group();scene.add(group);let seams,seamModel;
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
new ResizeObserver(()=>{const w=view.clientWidth,h=view.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();invalidateView();}).observe(view);
const renderWorkshop=time=>{
  orbitOffset.subVectors(camera.position,controls.target);
  const horizontal=Math.hypot(orbitOffset.x,orbitOffset.y);
  const motion=previewOrbit.step(time,Math.atan2(orbitOffset.z,horizontal),
    orbitEnabled&&!!model&&!stagedBuild?.preview&&!orbitPointers.size&&brush==='navigate');
  if(motion){
    const distance=orbitOffset.length(),heading=Math.atan2(orbitOffset.y,orbitOffset.x)+motion.turn;
    const radius=distance*Math.cos(motion.elevation);
    camera.position.copy(controls.target).add(orbitOffset.set(radius*Math.cos(heading),radius*Math.sin(heading),distance*Math.sin(motion.elevation)));
  }
  controls.update();
  renderer.render(scene,camera);
};
home();
function invalidateView(){if(presentationMode?.isActive()&&!contextLost)demandRenderer?.invalidate();}
function syncPresentationUI(){const button=$('#presentation-toggle');if(!button)return;const active=!!presentationMode?.isActive();button.disabled=!model||busy||pendingVegetation||drawing||contextLost;button.setAttribute('aria-pressed',String(active));$('#presentation-note').hidden=!active;orbitButton.hidden=active;orbitButton.disabled=!model||contextLost;}
function refreshPresentation(m,resetCamera=false){if(m&&presentationMode?.isActive()){presentationMode.refreshBounds(m,{resetCamera});invalidateView();}syncPresentationUI();}
function leavePresentation(error){demandRenderer?.stop();try{presentationMode?.exit();}catch(e){error??=e;}if(!contextLost)renderer.setAnimationLoop(renderWorkshop);syncPresentationUI();say(error?'No s’ha pogut mantenir la vista de presentació: '+error.message:'Vista de treball recuperada.',!!error);}
presentationMode=createPresentationMode({scene,camera,renderer,controls,group,light,ground,getSeams:()=>seams,onReset:home});
demandRenderer=createDemandRenderer({update:()=>controls.update(),render:()=>renderer.render(scene,camera),onError:leavePresentation,onSlow:()=>{if(!presentationMode.isActive()||presentationReduced)return;presentationReduced=true;renderer.shadowMap.enabled=false;renderer.setPixelRatio(1);say('Vista simplificada per mantenir una navegació fluida. El model es conserva.');invalidateView();}});
controls.addEventListener('change',invalidateView);
$('#presentation-toggle').onclick=()=>{if(!model||busy||pendingVegetation||drawing||contextLost)return;try{if(presentationMode.isActive()){leavePresentation();return;}endVegetationEditing();renderer.setAnimationLoop(null);presentationMode.enter(model);presentationReduced=false;demandRenderer.start();syncPresentationUI();say('Vista de presentació activada.');}catch(e){leavePresentation(e);}};
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;demandRenderer.stop();renderer.setAnimationLoop(null);syncPresentationUI();say('La previsualització està recuperant-se. El model numèric es conserva.',true);});
renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;if(presentationMode.isActive()){presentationMode.refreshBounds(stagedBuild?.preview||model);demandRenderer.start();}else if(model||stagedBuild?.preview)renderer.setAnimationLoop(renderWorkshop);syncPresentationUI();say('Previsualització recuperada.');});
const shownMaterialMode=()=>stagedBuild?.preview?stagedBuild.pureRelief:model?isPure(model):pureSelected();
function materialProfile(pure){
  const settings=pure?reliefMaterials:landscapeMaterials;
  const palettes=pure?RELIEF_PALETTES:PALETTES;
  const categories=pure?RELIEF_MATERIALS:CATEGORIES;
  const categoryId=pure?reliefMaterialId:id=>id;
  const index=id=>categories.findIndex(category=>category.id===categoryId(id));
  return {settings,palettes,categories,categoryId,index,color:id=>palettes[settings.count][settings.assignments[index(id)]]};
}
function recolor(updateLegend=true){
  const {color}=materialProfile(shownMaterialMode());
  for(const mesh of group.children){const fill=color(mesh.name);if(fill)mesh.material.color.set(fill);}
  if(updateLegend)legend();
  metrics();
  invalidateView();
}
function legend(){
  const root=$('#material-legend'),picker=$('#material-count'),pure=shownMaterialMode();
  const {settings,palettes,categories,categoryId,color}=materialProfile(pure);
  const mode=pure?'relief':'landscape';
  if(picker.dataset.mode!==mode){
    picker.replaceChildren(...Object.keys(palettes).map(count=>new Option(
      count==='1'?'1 material · impressió monocroma':count+' materials',count)));
    picker.dataset.mode=mode;
  }
  picker.value=String(settings.count);
  root.replaceChildren();
  categories.forEach((category,i)=>{
    const row=document.createElement('div'),swatch=document.createElement('i');
    const label=document.createElement('span'),select=document.createElement('select');
    const absent=model&&!stagedBuild?.preview&&!model.categories.some(part=>categoryId(part.id)===category.id);
    row.className='material-row'+(absent?' absent':'');
    swatch.style.setProperty('--swatch',color(category.id));
    label.textContent=category.name;
    select.setAttribute('aria-label','Material de '+category.name);
    for(let j=0;j<settings.count;j++)select.add(new Option('Mat. '+(j+1),String(j)));
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
  const vegetationValue=pure?((model.provenance.treeRepresentation?.areaMM2??0)/100).toLocaleString('ca',{maximumFractionDigits:1}):model.treeCount.toLocaleString('ca');
  const vegetationLabel=pure?'Superfície amb textura · cm²':'Volums de vegetació';
  const used=new Set(model.categories.map(part=>settings.assignments[index(part.id)])).size;
  $('#metrics').innerHTML=`<div><strong>${model.width.toFixed(0)} × ${model.height.toFixed(0)}</strong><span>Mida final · mm</span></div><div><strong>1:${model.scale.toLocaleString('ca')}</strong><span>Escala horitzontal</span></div><div><strong>${vegetationValue}</strong><span>${vegetationLabel}</span></div><div><strong>${used} / ${settings.count}</strong><span>Materials amb geometria</span></div><div><strong>${model.buildingCount.toLocaleString('ca')}</strong><span>Fragments d’edificis</span></div><div><strong>×${Number(model.provenance.verticalExaggeration).toLocaleString('ca')}</strong><span>Exageració vertical</span></div><div class="metric-wide"><strong>${model.triangles.toLocaleString('ca')}</strong><span>Triangles · complexitat de la malla</span></div>`;
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
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:materialProfile(pure).color(part.id)??part.color,roughness:.85,flatShading:!pure&&!smoothGround}));
  mesh.name=part.id;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
  return mesh;
}
const stageLabels={terrain:'Relleu',transport:'Vies',buildings:'Edificis',vegetation:'Vegetació'};
function showBuildProgress({stage,step,totalSteps,completed,total,message}){
  if(!stagedBuild)return;
  if(!stagedBuild.label)say('');
  const count=Number.isFinite(completed)&&total>0
    ?`${completed.toLocaleString('ca')} / ${total.toLocaleString('ca')} · ${Math.floor(completed*100/total)} %`:'';
  const phase=step>0&&totalSteps>0?`Pas ${step} de ${totalSteps}`:'';
  const label=[phase,stageLabels[stage],count,message].filter(Boolean).join(' · ');
  stagedBuild.label=label;
  if($('#work-label').textContent!==label)$('#work-label').textContent=label;
}
function showBuildPreview({categories,width,height,mode,piece}){
  if(!stagedBuild||!categories.length)return;
  const first=!stagedBuild.preview;
  if(first){
    stagedBuild.camera={position:camera.position.clone(),target:controls.target.clone(),zoom:camera.zoom,maxDistance:controls.maxDistance};
    endVegetationEditing();
    $('#welcome').hidden=true;
    $('.preview-toolbar').hidden=false;
    if(!contextLost&&!presentationMode.isActive())renderer.setAnimationLoop(renderWorkshop);
  }
  if(first||mode!=='append')for(const mesh of [...group.children])dispose(mesh);
  for(const part of categories)addModelMesh(part);
  group.position.set(-width/2,-height/2,0);
  if(seams)seams.visible=false;
  stagedBuild.preview={width,height,piece};
  if(first)legend();
  const refit=first&&needsCameraFit(width,height,stagedBuild.bbox,stagedBuild.pose);
  if(refit)home();
  refreshPresentation(stagedBuild.preview,refit);
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
  invalidateView();
}
function display(m,changedCategories=null,refit=true){
  for(const mesh of [...group.children])if(!changedCategories||changedCategories.includes(mesh.name))dispose(mesh);
  for(const part of m.categories)if(!changedCategories||changedCategories.includes(part.id))addModelMesh(part);
  group.position.set(-m.width/2,-m.height/2,0);recolor();tiling();if(refit)home();refreshPresentation(m,refit);
  const budget=m.provenance.vegetationBudget;
  const budgetNote=$('#vegetation-budget-note');
  budgetNote.hidden=!budget||(budget.eligibleAutomatic<=budget.limit&&!budget.automaticReduced&&!budget.manualDropped);
  if(budget)budgetNote.textContent=budget.manualDropped?'Els traços nous substitueixen els més antics quan s’arriba al límit.':'Límit de '+budget.limit.toLocaleString('ca')+' volums. El pinzell té prioritat.';
  if(!brushHasGeometry()&&brush!=='navigate')selectNavigate();
  const list=document.createElement('ul');for(const message of m.warnings){const li=document.createElement('li');li.textContent=message;list.appendChild(li);}$('#warnings').replaceChildren(list);
}
function describeTiling(){
  if(!selectedSize)return;
  const [draftWidth,draftHeight]=size();
  const pending=$('#piece-resize-pending');
  pending.hidden=!pendingPieceSize();
  pending.textContent=pending.hidden?'':`${draftWidth/10} × ${draftHeight/10} cm pendents de generar`;
  const [w,h]=model?[model.width,model.height]:[draftWidth,draftHeight],plan=tilePlan(w,h);
  const split=plan.tiles.length>1;
  $('[data-format="bambu-zip"]').hidden=!split;
  if(!split&&exportFormat==='bambu-zip')selectExportFormat('bambu');
  const mm=value=>value.toLocaleString('ca',{maximumFractionDigits:1});
  $('#tiling-summary').textContent=split?`${plan.tiles.length} peces de ${mm(plan.tiles[0].width)} × ${mm(plan.tiles[0].height)} mm`:`Una peça de ${mm(w)} × ${mm(h)} mm`;
  const hint=split?(exportFormat==='bambu'?`Obre el 3MF com a projecte amb ${plan.tiles.length} plaques de referència de 256 × 256 mm.`:'El ZIP inclou les peces i el plànol de muntatge.'):
    exportFormat==='stl'?'Revisa els STL al laminador.':'Obre el 3MF com a projecte i comprova els filaments i el laminat.';
  $('#export-hint').textContent=model&&needsBuild?`Es descarregarà la maqueta de la vista. ${hint}`:hint;
}
function tiling(){
  describeTiling();
  const show=model&&needsCuts(model.width,model.height);
  if(seams&&(!show||seamModel!==model)){
    scene.remove(seams);seams.geometry.dispose();seams.material.dispose();seams=null;
  }
  if(show&&!stagedBuild?.preview&&!seams){
    const geo=new THREE.BufferGeometry();
    const positions=cutGuideSegments(model),distances=new Float32Array(positions.length/3);
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
  }
  if(seams&&!presentationMode?.isActive())seams.visible=!stagedBuild?.preview;
  refreshPresentation(stagedBuild?.preview||model);
}
const regionalPavementEnabled=new URLSearchParams(location.search).get('paviment')!=='antic';
function modelOptions(){const [widthMM,heightMM]=size(),pureRelief=pureSelected(),detail=Number($('#detail').value);return {pureRelief,surfaceRoads:!pureRelief&&regionalPavementEnabled?'regional':undefined,streams:$('#streams').checked,streamWidth:Number($('#stream-width').value),size:Math.max(widthMM,heightMM),widthMM,heightMM,exaggeration:Number($('#exag').value),resolution:pureRelief?PURE_RELIEF_RESOLUTIONS[detail]:LANDSCAPE_RESOLUTIONS[detail],roadRise:Number($('#road-rise').value),railRise:Number($('#rail-rise').value),trailWidth:Number($('#trail-width').value),estimatedTunnels:!pureRelief&&$('#estimated-tunnels').checked,majorRoads:!pureRelief&&$('#major-profiles').checked,smoothProfiles:true,targetScale:null,selectionPose:selectedPose,buildingMode:pureRelief?'none':$('#building-mode').value,maxBuildingHeight:Number($('#building-height').value),...vegetation()};}
function configurationKey(o){return JSON.stringify([!!o.pureRelief,o.widthMM,o.heightMM,o.exaggeration,o.resolution,o.streams,o.streamWidth,o.roadRise??0,o.railRise??0,o.trailWidth??1,o.estimatedTunnels??true,o.majorRoads??false,o.targetScale,o.selectionPose?.center,o.selectionPose?.widthM,o.selectionPose?.heightM,o.selectionPose?.rotation,o.buildingMode,o.maxBuildingHeight]);}
function sameTerrainFrame(options){
  const old=model?.provenance.options;
  if(!old||dirty||options.pureRelief!==!!old.pureRelief)return false;
  const a=options.selectionPose,b=old.selectionPose;
  return ['widthMM','heightMM','resolution','targetScale'].every(key=>options[key]===old[key])&&a&&b&&
    ['widthM','heightM','rotation'].every(key=>Math.abs(a[key]-b[key])<1e-6)&&
    a.center.every((value,index)=>Math.abs(value-b.center[index])<1e-10);
}
const reliefKeys=['exaggeration','streams','streamWidth'];
function sameTerrain(options,includeTransport=true){
  const old=model?.provenance.options;
  const keys=includeTransport?[...reliefKeys,'roadRise','railRise','trailWidth','estimatedTunnels','majorRoads']:reliefKeys;
  return sameTerrainFrame(options)&&keys.every(key=>options[key]===old[key]);
}
const canUpdateRelief=options=>options.pureRelief&&!tooLargeRegion&&sameTerrainFrame(options);
function cancelReliefUpdate(){
  clearTimeout(reliefTimer);
  reliefTimer=null;
}
function requestReliefUpdate(message){
  cancelReliefUpdate();
  const options=modelOptions();
  if(!canUpdateRelief(options)){requireBuild(message);return;}
  needsBuild=false;
  badge('');
  say('');
  reliefTimer=setTimeout(flushReliefUpdate,150);
  lock(busy);
}
function flushReliefUpdate(){
  if(busy||pendingVegetation||drawing){reliefTimer=setTimeout(flushReliefUpdate,100);return;}
  reliefTimer=null;
  const options=modelOptions();
  if(!canUpdateRelief(options)){lock(false);return;}
  if(sameTerrain(options,false)){
    needsBuild=false;badge('');lock(false);say('Relleu preparat per descarregar.');return;
  }
  job='relief';
  lock(true);
  const changes=Object.fromEntries(reliefKeys.map(key=>[key,options[key]]));
  worker.postMessage({type:'relief',options:changes});
}
function recoverRelief(error){
  if(reliefTimer===null&&canUpdateRelief(modelOptions())){
    const {exaggeration,streams,streamWidth}=model.provenance.options;
    $('#exag').value=exaggeration;
    syncExaggerationLabel();
    $('#streams').checked=streams;
    $('#stream-width').value=streamWidth;
    needsBuild=false;
    badge('');
  }
  lock(false);
  say(error.message+' S’ha conservat la darrera maqueta.',true);
  flushTrees();
}
function syncBuildingSources(bbox){
  const available=inCatalonia(bbox),select=$('#building-source');select.querySelector('[value=icgc]').disabled=!available;
  if(available!==icgcAvailable){const before=select.value;if(!buildingSourceExplicit||select.value==='icgc'&&!available)select.value=defaultBuildingSource(bbox);if(region&&before!==select.value)buildingSourceDirty=true;icgcAvailable=available;}
}
function buildingInfo(){sourceSummary();if(isPure(model)){$('#building-info').textContent='Relleu pur · cobertura del sòl.';return;}const b=region.meta.buildings;if(region.meta.buildingSource==='osm3d'){$('#building-info').textContent=b.roofSourceUnavailable?'Cobertes originals no disponibles; alternativa OSM simplificada.':'OpenStreetMap original · cobertes i parts segons dades disponibles.';return;}$('#building-info').textContent=b.officialCount?'ICGC: '+b.officialCount+' elements; '+b.osmRetained+' fragments OSM complementaris.':b.provider==='GeoJSON local'?'GeoJSON local: '+b.count+' elements.':b.partCount!=null?'Catastre: '+b.partCount+' parts consultades; '+b.count+' volums sobre rasant. Altures estimades; sense dades de coberta.':'OpenStreetMap via OpenFreeMap.';}
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
  pendingBrushFrame=null;
  const options=modelOptions(),requestedName=placeName;
  const panoramic=isPanoramicSize(options.widthMM,options.heightMM);
  const reload=dirty||!region||options.pureRelief!==isPure(model)||panoramic!==isPanoramicSize(model?.width,model?.height);
  const defaultCenter=recommendedPlace(DEFAULT_PLACE).center;
  const atDefaultCenter=options.pureRelief&&selectedPose?.center.every((value,i)=>Math.abs(value-defaultCenter[i])<1e-5);
  const useSample=recommendedPlace(exampleSelection?.id)?.id||(atDefaultCenter?DEFAULT_PLACE:false);
  const applied=model?.provenance.options;
  const transportOnly=!options.pureRelief&&autoTransport&&!reload&&!buildingSourceDirty&&sameTerrain(options,false)&&options.trailWidth===(applied.trailWidth??1)&&
    ['buildingMode','maxBuildingHeight','trees','treeType'].every(key=>options[key]===applied[key]);
  if(transportOnly){
    say('Actualitzant les vies sobre el terreny actual…');
    worker.postMessage({type:'transport',options:{roadRise:options.roadRise,railRise:options.railRise,estimatedTunnels:options.estimatedTunnels,majorRoads:options.majorRoads}});
    return;
  }
  const incremental=!options.pureRelief&&!reload&&sameTerrain(options);
  if(!incremental){pendingBrushFrame=brushHistory.prepare(options,strokes);options.strokes=pendingBrushFrame.strokes;}
  if(!incremental){
    const {strokes:brushStrokes,...settings}=options;
    processingRun={started:performance.now(),startedAt:new Date().toISOString(),schemaVersion:1,
      appVersion:$('#version-open').textContent.trim(),environment:'browser',
      selection:{name:requestedName,bbox:selection.slice(),mapZoom:placeMap.map.getZoom(),sample:useSample||null},
      settings:{...settings,brushStrokeCount:brushStrokes.length,requestedBuildingSource:options.pureRelief?null:$('#building-source').value},
      reusedRegion:!reload,sources:[]};
  }
  try{
    if(reload){
      say(t('status.loadingTerrain'));
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
      needsBuild=tooLargeRegion||dirty||configurationKey(options)!==configurationKey(modelOptions());say(t('status.updatingBuildings'));worker.postMessage({type:'buildings',layer,options});
    }else{
      if(pendingBuildingLayer){
        pendingFullRegion=applyBuildingLayer({...region,meta:{...region.meta},features:[...region.features]},pendingBuildingLayer);
        pendingBuildingLayer=null;
      }
      const target=pendingFullRegion||region;
      needsBuild=false;say(t('status.building'));
      const {meta,features,dem,bridgeDem}=target;
      processingRun.data={bbox:meta.bbox,vectorFeatures:features.length,demTiles:dem.length,
        extraBridgeTiles:bridgeDem?.length??0,terrainProvider:meta.terrain?.provider??(useSample?'sample':null),buildingSource:meta.buildingSource,
        ...(options.pureRelief?{demZoom:meta.terrain?.zoom,demSampleSize:meta.terrain?.sampleSize,coverage:meta.coverage}:{})};
      processingRun.workerStartMilliseconds=performance.now()-processingRun.started;
      stagedBuild={bbox:meta.bbox,pose:options.selectionPose,pureRelief:options.pureRelief};
      worker.postMessage(buildRequest(target,options));
    }
  }catch(e){pendingVegetation=false;recoverBuildings(e);}
}

function acceptBuildings(){
  lastValidBuildings={source:region.meta.buildingSource,mode:model.provenance.options.buildingMode,height:model.provenance.options.maxBuildingHeight};
}
function recoverBuildings(error){
  finishProcessing(error);
  clearBuildingPreview();
  restoreBuildPreview();
  pendingFullRegion=null;pendingBuildingLayer=null;pendingBrushFrame=null;pendingCadastralBuild=false;
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
  buildingControls();badge(needsBuild?'Selecció pendent de generar':'');lock(false);
  if(!model){
    $('#welcome').hidden=false;
    showWorkshopPanel('settings');
  }
  say(error.message+(model?' S’han conservat el model i els ajustos d’edificis anteriors.':''),true);
}

function updateTrees(){if(!canUpdateVegetation())return;pendingVegetation=true;lock(busy);clearTimeout(timer);if(!drawing){say('Aplicant els canvis de vegetació… Espera abans de començar un altre traç.');timer=setTimeout(flushTrees,170);}}
function flushTrees(){if(!pendingVegetation||drawing||busy||!canUpdateVegetation())return;pendingVegetation=false;job='vegetation';lock(true);worker.postMessage({type:'vegetation',options:vegetation()});}
let buildingsSettle=null,buildingsToken=0;
let previewRequest=null,previewSerial=0;
function clearBuildingPreview(){
  if(!previewRequest)return;
  if(previewRequest.mesh)dispose(previewRequest.mesh);
  if(previewRequest.original)previewRequest.original.visible=true;
  previewRequest=null;
  invalidateView();
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
    badge(`Catastre · vista provisional ${data.completed}/${data.total}`);
    invalidateView();
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
  needsBuild=tooLargeRegion||dirty;say(t('status.updatingBuildings'));buildingsToken=token;
  worker.postMessage({type:'buildings',layer,options,measureBuildings:!!processingRun?.awaitingBuildings});
  return new Promise((resolve,reject)=>{buildingsSettle={resolve,reject};});
}
const scheduler=createBuildingUpdateScheduler({delay:300,canAutoUpdate:()=>!pureSelected()&&!!model&&!!region&&!tooLargeRegion&&sameTerrain(modelOptions()),isBusy:()=>busy||pendingVegetation||drawing,run:autoBuildings});
function requestBuildingsAuto(message){
  const phase=scheduler.notify();
  if(phase==='manual'||phase==='disposed'){requireBuild(message);return;}
  needsBuild=true;badge('Canvis pendents de generar');say(phase==='queued'?'Edificis en cua: s’actualitzaran automàticament en acabar el càlcul actual.':'Edificis pendents d’actualització automàtica…');lock(busy);
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
    if(!data.vegetation){if(!isPure(model))acceptBuildings();buildingInfo();buildingControls();}
    const displayStarted=performance.now();
    display(model,changed,refit);
    if(processingRun&&data.timing){
      const report=processingRun;
      if(data.buildings)report.buildingWorker=data.timing;
      else report.worker=data.timing;
      (report.displayMilliseconds??=[]).push(performance.now()-displayStarted);
      report.result={widthMM:model.width,heightMM:model.height,scale:model.scale,triangles:model.triangles,buildings:model.buildingCount,
        trees:model.treeCount,vegetationAreaMM2:model.provenance.treeRepresentation?.areaMM2,buildingSource:region.meta.buildingSource,warnings:model.warnings,
        coverageCells:model.provenance.coverageCells,surfaceRoads:model.provenance.surfaceRoads};
      if(startCadastre){report.awaitingBuildings=true;report.cadastralBlocks=[];}
      else finishProcessing();
    }
    badge(needsBuild?'Canvis pendents de generar':'');
    lock(false);
    const profiles=model.provenance.majorRoads;
    const surface=model.provenance.surfaceRoads;
    let profileNotice='';
    if(!data.buildings&&!data.vegetation){
      const details=narrowWorkshop.matches?'':' Consulta «Dades i limitacions».';
      if(surface?.mode==='regional'&&(surface.applied||surface.eligible||surface.error))profileNotice=surface.applied?
        `Paviment nou aplicat a ${surface.accepted} fragments.${details}`:
        'Paviment nou sense aplicar al retall.'+details;
      else if(profiles?.enabled&&!profiles.applied)profileNotice='Perfils suaus no aplicats en aquest retall.'+details;
    }
    say(recoveryNotice||(needsBuild?t('status.pendingChanges'):profileNotice||(data.vegetation?t('status.vegetationUpdated'):data.relief?'Relleu actualitzat amb les dades carregades.':isPure(model)?'Relleu preparat per descarregar.':data.changedCategories?'Vies actualitzades.':data.buildings?t('status.buildingsUpdated'):t('status.modelReady'))));
    recoveryNotice='';settleBuildings();flushTrees();scheduler.flush();
    if(startCadastre){
      $('#building-source').value='catastre';
      buildingSourceDirty=true;
      buildingControls();
      requestBuildingsAuto('Catastre pendent d’actualitzar');
    }
  }
  if(data.type==='error'){
    if(job==='relief'){recoverRelief(Error(data.message));console.error(data.detail);return;}
    if(processingRun&&data.timing)processingRun[processingRun.awaitingBuildings?'buildingWorker':'worker']=data.timing;
    pendingVegetation=false;
    if(job==='build'||job==='buildings'||job==='transport')recoverBuildings(Error(data.message));
    else{lock(false);say(data.message,true);}
    settleBuildings(Error(data.message));console.error(data.detail);
  }
  if(data.type==='download'){const zipped=data.archive||data.format==='stl',blob=new Blob([data.bytes],{type:zipped?'application/zip':'model/3mf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=data.filename||`relleu-obert-${data.archive?'peces-':data.plateCount?'plaques-':''}${data.format}${zipped?'.zip':'.3mf'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);lock(false);say(data.accessory?'Complement preparat en 3MF i STL. Comprova’n el laminat i les mides.':data.archive?'Peces preparades amb els talls tancats. Consulta el plànol de muntatge del ZIP.':data.plateCount?`Projecte de Bambu Studio preparat amb ${data.plateCount} plaques.`:'Fitxer preparat. Comprova els filaments i el laminat abans d’imprimir.');flushTrees();scheduler.flush();}
};
worker.onerror=event=>{
  const error=Error('No s’ha pogut actualitzar la maqueta: '+event.message);
  if(job==='relief'){recoverRelief(error);return;}
  pendingVegetation=false;
  if(job==='build'||job==='buildings'||job==='transport')recoverBuildings(error);
  else{lock(false);say(error.message,true);}
  settleBuildings(error);
};
$('#search-form').onsubmit=async e=>{e.preventDefault();const input=$('#place-search'),text=input.value.trim();if(!text)return;if(narrowWorkshop.matches)input.blur();$('#search-results').replaceChildren();try{say(t('status.searching'));const results=await placeMap.search(text);if(results===null){say(t('status.regionChosen'));return;}for(const result of results){const b=document.createElement('button');b.type='button';b.textContent=result.label;b.onclick=()=>{placeMap.choose(result);input.value=result.label;$('#search-results').replaceChildren();say(t('status.regionChosen'));};$('#search-results').appendChild(b);}say(results.length?t('status.chooseResult'):t('status.noResults'));}catch(error){say(error.message,true);}};
const reliefPilot={id:'pirineus-relleu',name:'Pirineus · sector de l’Aneto',center:[42.635,.65]};
const alpineLakes={id:'aneto-llacs',name:'Llacs glacials de l’Aneto',center:reliefPilot.center};
const panoramicPilot={id:'pirineus-eix',name:'Pirineus · eix de la serralada',center:[42.8,.75]};
const panoramicPilotAvailable=()=>panoramicSelected()&&Math.max(...size())>=900;
for(const place of [...RECOMMENDED_PLACES,alpineLakes,reliefPilot])$('#recommended-place').add(new Option(place.name,place.id));
for(const [pure,label] of [[true,'Relleu pur'],[false,'Model complet']]){
  const options=document.createElement('optgroup');
  options.label=label+' · exemples del catàleg';
  for(const {id,title,pureRelief=true} of CURATED_EXAMPLES){
    if(pureRelief===pure)options.append(new Option(title,id));
  }
  if(options.children.length)$('#recommended-place').append(options);
}
const panoramicOption=new Option(panoramicPilot.name,panoramicPilot.id);
panoramicOption.hidden=panoramicOption.disabled=true;
$('#recommended-place').add(panoramicOption);
function syncModelMode(){
  const panoramic=panoramicSelected(),pure=panoramic||regularPureRelief;
  $('#mode-relief').checked=pure;
  $('#mode-landscape').checked=!pure;
  $('#mode-landscape').disabled=panoramic;
  $('#model-mode-note').textContent=panoramic?'Format panoràmic · només Relleu pur · 1:50.000–1:500.000.':
    pure?'Relleu, aigua i cobertura del sòl · 1:10.000–1:100.000.':'Relleu, aigua, vies, edificis i vegetació.';
  $('#relief-texture-settings').hidden=!pure;
  $('#vegetation-label').textContent=pure?'Vegetació simulada':'Afegir arbres amb volum';
  $('#tree-type').hidden=$('label[for="tree-type"]').hidden=pure;
  $('#brush-density-label').textContent=pure?'Intensitat del pinzell':'Densitat del pinzell';
  $('#clear-brush').textContent=pure?'Restableix la textura':'Restableix els arbres';
  $('#vegetation-brush-note').textContent=pure?'Pinta o esborra la textura. Els canvis s’apliquen en aixecar el pinzell.':
    'Pinta sobre el terreny. En aixecar el pinzell s’aplica tot el traç. La densitat afecta només els traços nous.';
  for(const step of ['transport','buildings'])document.querySelector(`[data-step="${step}"]`).hidden=pure;
  panoramicOption.hidden=panoramicOption.disabled=!panoramicPilotAvailable();
  if(panoramicOption.disabled&&exampleSelection?.id===panoramicPilot.id){
    exampleSelection=null;
    $('#recommended-place').value='';
  }
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
  if(curated?(curated.pureRelief??true)!==pure:!pure&&exampleSelection?.id===reliefPilot.id){
    exampleSelection=null;
    $('#recommended-place').value='';
    placeName='Regió seleccionada';
  }
  placeMap.setPureRelief(pure);
  scaleHint();
  openStep('place');
  requireBuild('Mode de maqueta pendent de generar');
}
$('#model-mode').onchange=applyPureRelief;
for(const id of ['streams','stream-width'])$('#'+id).onchange=()=>requestReliefUpdate('Cursos d’aigua pendents de generar');
$('#recommended-place').onchange=()=>{
  const id=$('#recommended-place').value;
  const curated=CURATED_EXAMPLES.find(example=>example.id===id);
  if(curated){selectCuratedExample(curated);return;}
  const place=[reliefPilot,alpineLakes,panoramicPilot].find(example=>example.id===id)||recommendedPlace(id);
  if(!place){exampleSelection=null;placeName='Regió seleccionada';return;}
  if(place===reliefPilot&&!pureSelected()){
    $('#mode-relief').checked=true;
    applyPureRelief();
  }
  const dimensions=size();
  let rotation=0;
  let bbox;
  if(place===panoramicPilot){
    if(!panoramicPilotAvailable())return;
    const [width,height]=dimensions;
    rotation=width>height?15:105;
    const denominator=450000000/Math.max(width,height);
    bbox=scaledBBox(place.center,...dimensions,denominator,PANORAMIC_SCALE_RANGE);
  }else if(panoramicSelected()){
    const scale=place===reliefPilot?PURE_SCALE_RANGE[1]:PANORAMIC_SCALE_RANGE[0];
    bbox=scaledBBox(place.center,...dimensions,scale,PANORAMIC_SCALE_RANGE);
  }else{
    bbox=place===reliefPilot||place===alpineLakes
      ?scaledBBox(place.center,...dimensions,place===reliefPilot?PURE_SCALE_RANGE[1]:MAX_PROJECT_SCALE)
      :placeSelection(place.id,...dimensions);
  }
  setExampleRegion(place.id,place.name,bbox,rotation);
};
function setExampleRegion(id,name,bbox,rotation){
  placeMap.setRotation(rotation);
  exampleSelection={id,bbox:selectionPose(bbox,rotation).bbox,rotation};
  placeName=name;
  $('#recommended-place').value=id;
  $('#place-search').value='';
  $('#search-results').replaceChildren();
  placeMap.setRegion(bbox);
}
function selectPieceSize(preset){
  const dimensions=pieceDimensions(preset);
  if(!dimensions)return;
  const [width,height]=dimensions;
  selectedSize=preset;
  $('#piece-choice').hidden=true;
  workshopNav.hidden=false;
  $('#welcome-title').textContent='Situa la maqueta';
  $('#welcome-instruction .desktop-copy').textContent='Tria el retall i genera el model des de Territori.';
  $('#welcome-instruction .mobile-copy').textContent='Mou el mapa i prem «Genera el model».';
  $('#new-project').hidden=false;
  $('#piece-resize-open').hidden=false;
  for(const toggle of document.querySelectorAll('.sidebar-left .section-toggle'))toggle.disabled=false;
  syncModelMode();
  placeMap.setSize(width,height,pureSelected());
  openStep('place',{focus:true});
  tiling();
}
initPiecePicker($('#piece-choice'),selectPieceSize);
function selectCuratedExample({id,title,center,width,height,scale,rotation,pureRelief=true}){
  if(busy||pendingVegetation||drawing)return;
  regularPureRelief=pureRelief;
  selectPieceSize(`${width/10}x${height/10}`);
  applyPureRelief();
  const range=panoramicSelected()?PANORAMIC_SCALE_RANGE:pureSelected()?PURE_SCALE_RANGE:[100,MAX_PROJECT_SCALE];
  const bbox=scaledBBox(center,width,height,scale,range);
  setExampleRegion(id,title,bbox,rotation);
  const exaggeration=$('#exag'),streams=$('#streams');
  exaggeration.value=exaggeration.defaultValue;
  streams.checked=streams.defaultChecked;
  for(const id of ['detail','stream-width']){
    const select=$('#'+id);
    select.selectedIndex=Math.max(0,[...select.options].findIndex(option=>option.defaultSelected));
  }
  syncExaggerationLabel();
  generate();
}
initExampleCarousel($('#example-carousel'),CURATED_EXAMPLES,selectCuratedExample);
const resizeDialog=$('#piece-resize-dialog');
const resizeWidth=$('#piece-resize-width'),resizeHeight=$('#piece-resize-height');
const resizeDimensions=bindPieceDimensions($('#piece-resize-form'),resizeWidth,resizeHeight);
$('#piece-resize-open').onclick=()=>{
  if(!selectedSize||busy||drawing||pendingVegetation)return;
  const [width,height]=size();
  resizeWidth.value=width/10;
  resizeHeight.value=height/10;
  resizeDimensions.validate();
  resizeDialog.showModal();
};
$('#piece-resize-form').onsubmit=event=>{
  event.preventDefault();
  if(!selectedSize||busy||drawing||pendingVegetation)return;
  const preset=resizeDimensions.read();
  const dimensions=pieceDimensions(preset);
  if(!dimensions)return;
  resizeDialog.close();
  if(preset===selectedSize)return;
  const previous=modelOptions(),name=placeName;
  scheduler.cancel();
  clearTimeout(transportTimer);
  transportTimer=null;
  selectedSize=preset;
  syncModelMode();
  const limited=placeMap.resizePiece(...dimensions,pureSelected());
  placeName=name;
  const options=modelOptions();
  brushHistory.resize(previous,options,strokes);
  openStep('place',{focus:true});
  scaleHint();
  if(!limited&&!dirty&&!buildingSourceDirty&&model&&configurationKey(options)===configurationKey(model.provenance.options)){
    needsBuild=false;
    badge('');
    say(t('status.modelReady'));
    lock(false);
    return;
  }
  requireBuild('Mida pendent de generar');
  if(!tooLargeRegion)say(limited?'El retall s’ha ajustat al límit d’escala. Prem «Genera el model» per aplicar la mida nova.':'Prem «Genera el model» per aplicar la mida nova.');
};
$('#new-project').onclick=()=>window.location.reload();
$('#reset').onclick=()=>{previewOrbit.pause(performance.now());home();};
$('#top').onclick=()=>{setOrbitEnabled(false);home();const distance=camera.position.distanceTo(controls.target);camera.position.copy(controls.target).add(new THREE.Vector3(0,-.01,distance));controls.update();};
function requireBuild(message){needsBuild=true;badge(tooLargeRegion?'Àrea massa gran':message);say(tooLargeRegion?$('#scale-info').textContent:message+'.',tooLargeRegion);lock(busy);}
function scaleHint(){
  if(!selectedSize){lock(busy);return;}
  const [width,height]=size();
  const limit=selectedPose
    ?Math.abs(selectedPose.center[0])>70?'Tria un centre entre 70° sud i 70° nord.':
      panoramicSelected()&&selectedPose.bbox.some((value,index)=>Math.abs(value)>(index%2?70:180))?'Allunya el retall del meridià de 180° i dels paral·lels de 70°.':
      pureSelected()?'':regionLimitMessage(selectedPose,width,height)
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
    const label='1:'+Math.round(denominator).toLocaleString('ca');
    $('#scale-value').textContent=label;
    range.setAttribute('aria-valuetext',label);
  }
  lock(busy);
}
const scaleInput=$('#model-scale');
function showScaleStops(limit){
  const ticks=$('#scale-ticks');
  const preferred=panoramicSelected()?[PANORAMIC_SCALE_RANGE[0],100000,200000,300000,400000,450000]:
    pureSelected()?[PURE_SCALE_RANGE[0],20000,30000,50000,75000]:preferredScaleStops;
  const next=[...preferred.filter(stop=>stop<limit),limit];
  if(ticks.children.length&&next.join()===scaleStops.join())return;
  scaleStops=next;
  scaleInput.max=scaleStops.length-1;
  ticks.replaceChildren();
  for(const [index,stop] of scaleStops.entries()){
    const mark=document.createElement('span');
    if(index===0||index===scaleStops.length-1||index%2===0&&(!pureSelected()||index<scaleStops.length-2))mark.textContent=stop.toLocaleString('ca');
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
  const sources=describeSources({terrainProvider:region?.meta?.terrain?.provider,buildingSource:$('#building-source').value,pendingBuildings:buildingSourceDirty});
  $('#terrain-source-name').textContent=sources.terrain.label;
  $('#building-source-name').textContent=pureSelected()?'—':sources.buildings.label+(sources.buildings.pending?' · pendent d’actualitzar':'');
}
const stepNext={place:['vegetation','Vegetació'],vegetation:['transport','Vies'],transport:['buildings','Edificis']};
function syncStepActions(updating){
  const invalid=!selection||tooLargeRegion,pending=needsBuild||!model;
  for(const button of document.querySelectorAll('[data-step-action]')){
    const step=button.dataset.stepAction;
    const autoApplying=transportTimer!==null||(busy&&job==='transport');
    const next=!pureSelected()||step==='place'?stepNext[step]:null;
    const build=pending&&!autoApplying&&(step==='place'||!!model&&['transport','buildings'].includes(step));
    button.hidden=!button.closest('.config-section').classList.contains('is-open')||(!build&&!next);
    const label=build?(step==='place'?'Genera el model':step==='buildings'&&model&&sameTerrain(modelOptions())?'Aplica edificis':'Aplica al model') :next?`${next[1]} →`:'';
    if(button.textContent!==label)button.textContent=label;
    button.classList.toggle('is-build',build);
    button.disabled=updating||invalid&&(build||step==='place')||!selectedSize;
  }
}
function openStep(id,{focus=false}={}){
  if(!selectedSize)return;
  if(id!=='vegetation'&&$('#step-vegetation').getAttribute('aria-expanded')==='true')endVegetationEditing();
  for(const toggle of document.querySelectorAll('.sidebar-left .section-toggle')){
    const open=toggle.id==='step-'+id;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.closest('.config-section').classList.toggle('is-open',open);
    toggle.querySelector('i').textContent=open?'−':'+';
    document.getElementById(toggle.getAttribute('aria-controls')).hidden=!open;
  }
  syncStepActions(busy||pendingVegetation||reliefTimer!==null);
  if(id)showWorkshopPanel('settings',{focus});
  if(focus&&!narrowWorkshop.matches)$('#step-'+id).focus({preventScroll:true});
}
for(const toggle of document.querySelectorAll('.sidebar-left .section-toggle'))toggle.onclick=()=>openStep(!narrowWorkshop.matches&&toggle.getAttribute('aria-expanded')==='true'?null:toggle.closest('.config-section').dataset.step);
for(const button of document.querySelectorAll('[data-step-action]'))button.onclick=()=>{
  const step=button.dataset.stepAction;
  if(button.classList.contains('is-build')){$('#step-'+step).focus({preventScroll:true});generate();}
  else if(stepNext[step])openStep(stepNext[step][0],{focus:true});
};
function syncExaggerationLabel(){
  $('#exag-value').textContent='×'+Number($('#exag').value).toLocaleString('ca');
}
$('#exag').oninput=()=>{
  syncExaggerationLabel();
  requestReliefUpdate('Relleu pendent de generar');
};
$('#detail').onchange=()=>{
  cancelReliefUpdate();
  requireBuild('Detall pendent de generar');
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
        requireBuild('Canvis de vies pendents de generar');
        return;
      }
      if(configurationKey(modelOptions())===configurationKey(model.provenance.options)&&!buildingSourceDirty){
        needsBuild=false;
        badge('');
        say(t('status.modelReady'));
        lock(false);
        return;
      }
      generate(true);
    };
    transportTimer=setTimeout(apply,250);
    requireBuild('Actualització de vies en cua');
  }else requireBuild('Canvis de vies pendents de generar');
}
$('#building-source').onchange=()=>{buildingSourceExplicit=true;buildingSourceDirty=true;buildingControls();requestBuildingsAuto('Capa d’edificis pendent d’actualitzar');};
function buildingControls(){sourceSummary();$('#building-source-hint').textContent=$('#building-source').value==='catastre'?'Parts i altures estimades · menys de 4 km². Sense dades de teulada.':$('#building-source').value==='osm3d'?'Petjades originals; les cobertes depenen de les dades cartografiades.':'';const mode=$('#building-mode').value;$('#building-height').disabled=mode!=='limited';$('#building-mode-hint').textContent=({limited:'Coberta plana sobre el punt més alt de la petjada; al costat baix es pot veure més façana.',source:$('#building-source').value==='osm3d'?'Forma, altura i direcció de coberta quan les dades les aporten. Si falten, es conserva una coberta plana.':'Aquesta font aporta altures, però no formes de teulada: les cobertes es mantenen planes.',flat:'Petjades de color, sense volum.',none:'Es conserva el relleu actual; no es reconstrueix el paisatge històric.'})[mode];}
$('#building-mode').onchange=()=>{buildingControls();requestBuildingsAuto('Edificis pendents de generar');};$('#building-height').oninput=()=>{buildingControls();requestBuildingsAuto('Altura dels edificis pendent de generar');};
$('#material-count').onchange=()=>{
  const count=Number($('#material-count').value);
  if(shownMaterialMode())reliefMaterials={count,assignments:defaultReliefAssignments(count)};
  else landscapeMaterials={count,assignments:defaultAssignments(count)};
  recolor();
};
$('#density').oninput=()=>{$('#density-value').textContent='×'+Number($('#density').value).toLocaleString('ca');};$('#trees').onchange=()=>{
  if(!$('#trees').checked)endVegetationEditing();
  if(canUpdateVegetation())updateTrees();else lock(busy);
};$('#tree-type').onchange=updateTrees;
const textureSliders=[['vegetation-height',' mm'],['vegetation-noise','%']];
for(const [id,unit] of textureSliders){
  const slider=$('#'+id);
  slider.oninput=()=>{
    const value=Number(slider.value).toLocaleString('ca')+unit;
    $('#'+id+'-value').textContent=value;
    slider.setAttribute('aria-valuetext',value);
    updateTrees();
  };
  slider.oninput();
}
const formatOptions=[...document.querySelectorAll('#export-options [data-format]')];
function selectExportFormat(format){
  exportFormat=format;
  for(const option of formatOptions)option.setAttribute('aria-pressed',String(option.dataset.format===format));
  $('#export-model').textContent=formatOptions.find(option=>option.dataset.format===format).textContent+' ↓';
}
function setFormatMenu(open,{focus=false}={}){
  $('#export-options').hidden=!open;
  $('#export-formats').setAttribute('aria-expanded',String(open));
  if(focus){
    const target=open?formatOptions.find(option=>option.dataset.format===exportFormat):$('#export-formats');
    target.focus();
  }
}
function syncExport(disabled){
  $('#mobile-workshop [data-mobile-panel=export]').disabled=!model;
  $('#export-model').disabled=disabled;
  $('#export-formats').disabled=disabled;
  if(disabled)setFormatMenu(false);
  describeTiling();
}
function exportModel(){
  if($('#export-model').disabled)return;
  job='export';
  lock(true);
  say(t('status.exporting'));
  const {count,assignments}=isPure(model)?reliefMaterials:landscapeMaterials;
  worker.postMessage({type:'export',format:exportFormat,materialCount:count,assignments});
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
function syncVegetationControls(updating){
  const pure=pureSelected(),enabled=$('#trees').checked;
  $('#trees').disabled=updating;
  $('#tree-type').disabled=updating||!enabled;
  for(const id of ['vegetation-height','vegetation-noise'])$('#'+id).disabled=!enabled||busy&&job==='build';
  const note=$('#tree-scale-note');
  note.hidden=!pure&&(!enabled||!canUpdateVegetation()||!model.provenance.treeRepresentation?.omittedBelowThreshold);
  note.textContent=pure?'El color del bosc es manté quan desactives la textura.':'A aquesta escala es manté la superfície del bosc. Les capçades serien massa petites per imprimir-les.';
  const paintDisabled=updating||!canPaint();
  for(const button of document.querySelectorAll('[data-brush]'))button.disabled=button.dataset.brush!=='navigate'&&paintDisabled;
}
function editButtons(){$('#undo-brush').disabled=$('#clear-brush').disabled=!strokes.length||busy||pendingVegetation||drawing||needsBuild||!canUpdateVegetation()||!$('#trees').checked;}
$('#undo-brush').onclick=()=>{strokes=withoutLastGesture(strokes);editButtons();updateTrees();};$('#clear-brush').onclick=()=>{strokes=[];editButtons();updateTrees();};$('#brush-radius').oninput=()=>$('#brush-value').textContent=$('#brush-radius').value+' mm';
function setBrush(button){
  if(!button)return;
  finishStroke();brush=button.dataset.brush;
  const navigating=brush==='navigate';
  controls.enabled=navigating;
  document.querySelectorAll('[data-brush]').forEach(x=>{x.classList.toggle('selected',x===button);x.setAttribute('aria-pressed',String(x===button));});
  $('#viewer-hint .desktop-copy').textContent=navigating?'Arrossega per girar · Roda per apropar · Botó dret per desplaçar':'Fes clic o arrossega sobre el terreny · Desfés per anul·lar un traç';
  $('#viewer-hint .mobile-copy').textContent=navigating?'Un dit per girar. Amb dos dits pots fer zoom i desplaçar la maqueta.':'Passa el dit pel terreny. Prem «Desfés» per anul·lar un traç.';
  $('#brush-cursor').hidden=true;
}
function selectNavigate(){setBrush(document.querySelector('[data-brush="navigate"]'));}
function endVegetationEditing(){finishStroke();if(brush!=='navigate')selectNavigate();else $('#brush-cursor').hidden=true;}
document.querySelectorAll('[data-brush]').forEach(b=>b.onclick=()=>setBrush(b));
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
const brushGround=new Set(['terrain','forest','grass','rock','snow']);
const brushSurfaces=new Set([...brushGround,'water','inland-water']);
function paint(event){
  if(brush==='navigate'||!canPaint()||pendingVegetation&&!drawing)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  ray.setFromCamera(pointer,camera);
  const textureMesh=mesh=>isPure(model)&&mesh.name==='trees';
  const [hit]=ray.intersectObjects(group.children.filter(mesh=>brushSurfaces.has(mesh.name)||textureMesh(mesh)));
  const cursor=$('#brush-cursor');
  cursor.hidden=!hit||!(brushGround.has(hit.object.name)||textureMesh(hit.object))||hit.face.normal.z<=0;
  if(cursor.hidden)return;
  const p=hit.point,radius=Number($('#brush-radius').value);
  const screen=p.clone().project(camera),edge=p.clone().add(new THREE.Vector3(radius,0,0)).project(camera);
  const diameter=Math.max(8,Math.abs(edge.x-screen.x)*rect.width);
  Object.assign(cursor.style,{left:(event.clientX-rect.left)+'px',top:(event.clientY-rect.top)+'px',width:diameter+'px',height:diameter+'px'});
  cursor.classList.toggle('erase',brush==='erase');
  if(!drawing)return;
  const x=p.x+model.width/2,y=p.y+model.height/2;
  if(lastPoint&&Math.hypot(x-lastPoint.x,y-lastPoint.y)<radius*.45)return;
  strokes.push({mode:brush,x,y,radius,gesture,density:Number($('#density').value)});
  lastPoint={x,y};
  updateTrees();
}
function finishStroke(){if(!drawing)return;drawing=false;lastPoint=null;if(pendingVegetation)updateTrees();else lock(busy);}
renderer.domElement.addEventListener('pointerdown',e=>{if(brush!=='navigate'&&e.button===0&&!pendingVegetation&&canPaint()){drawing=true;gesture++;lastPoint=null;renderer.domElement.setPointerCapture(e.pointerId);paint(e);}});renderer.domElement.addEventListener('pointermove',paint);renderer.domElement.addEventListener('pointerup',finishStroke);renderer.domElement.addEventListener('pointercancel',finishStroke);renderer.domElement.addEventListener('lostpointercapture',finishStroke);renderer.domElement.addEventListener('pointerleave',()=>$('#brush-cursor').hidden=true);
const projectRestoreKey='relleu-obert.open-project';
const projectControls={
  detail:'detail',streams:'streams',streamWidth:'stream-width',exaggeration:'exag',
  roadRise:'road-rise',railRise:'rail-rise',trailWidth:'trail-width',estimatedTunnels:'estimated-tunnels',majorRoads:'major-profiles',
  buildingSource:'building-source',buildingMode:'building-mode',maxBuildingHeight:'building-height',
  trees:'trees',treeType:'tree-type',brushDensity:'density',brushRadius:'brush-radius',
  vegetationHeight:'vegetation-height',vegetationNoise:'vegetation-noise'
};
function captureProject(){
  const options={exportFormat,split:needsCuts(...size())};
  for(const [key,id] of Object.entries(projectControls)){
    const control=$('#'+id);
    options[key]=control.type==='checkbox'?control.checked:
      ['buildingSource','buildingMode','treeType'].includes(key)?control.value:Number(control.value);
  }
  return {sizePreset:selectedSize,pose:selectedPose,pureRelief:pureSelected(),placeName,
    exampleId:exampleSelection?.id,materials:landscapeMaterials,reliefMaterials,options,
    strokes:brushHistory.prepare(modelOptions(),strokes).strokes};
}
function renderProjectGallery(){
  const list=$('#project-list');
  list.replaceChildren();
  $('#save-project').hidden=!selectedSize||tooLargeRegion||busy||drawing||pendingVegetation;
  for(const project of readProjects(localStorage)){
    const row=document.createElement('div'),name=document.createElement('strong');
    row.className='project-row';
    name.textContent=project.name;
    const open=document.createElement('button'),remove=document.createElement('button');
    open.type=remove.type='button';
    open.className='secondary';open.textContent='Obre';
    remove.className='quiet-button';remove.textContent='Elimina';
    open.setAttribute('aria-label','Obre '+project.name);
    remove.setAttribute('aria-label','Elimina '+project.name);
    open.disabled=busy||drawing||pendingVegetation;
    open.onclick=()=>{
      try{
        sessionStorage.setItem(projectRestoreKey,project.id);
        location.reload();
      }catch(error){$('#project-feedback').textContent=error.message;}
    };
    remove.onclick=()=>{
      if(remove.dataset.confirm!=='true'){
        remove.dataset.confirm='true';
        remove.textContent='Confirma';
        remove.setAttribute('aria-label','Confirma que vols eliminar '+project.name);
        $('#project-feedback').textContent='Prem «Confirma» per eliminar aquest projecte.';
        return;
      }
      try{
        deleteProject(localStorage,project.id);
        renderProjectGallery();
        $('#project-feedback').textContent='Projecte eliminat.';
      }catch(error){$('#project-feedback').textContent=error.message;}
    };
    row.append(name,open,remove);list.append(row);
  }
  if(!list.children.length)list.textContent='Encara no hi ha cap projecte desat.';
}
function restoreProject(){
  const id=sessionStorage.getItem(projectRestoreKey);
  if(!id)return;
  sessionStorage.removeItem(projectRestoreKey);
  const project=readProjects(localStorage).find(item=>item.id===id);
  if(!project)throw Error('El projecte ja no existeix a la galeria.');
  const {sizePreset,pose,pureRelief,materials,reliefMaterials:savedReliefMaterials,options,placeName:savedPlace,exampleId,strokes:savedStrokes}=project.settings;
  regularPureRelief=pureRelief&&!isPanoramicSize(...pieceDimensions(sizePreset));
  selectPieceSize(sizePreset);
  placeMap.setRotation(pose.rotation);
  placeMap.setRegion(physicalBBox(pose.center,pose.widthM/1000,pose.heightM/1000));
  placeName=savedPlace||project.name;
  const visibleExample=exampleId&&[...$('#recommended-place').options].some(option=>option.value===exampleId&&!option.disabled);
  if(visibleExample||recommendedPlace(exampleId)){
    exampleSelection={id:exampleId,bbox:selection,rotation:pose.rotation};
    if(visibleExample)$('#recommended-place').value=exampleId;
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
  for(const stroke of strokes)gesture=Math.max(gesture,stroke.gesture??0);
  syncExaggerationLabel();$('#density').oninput();$('#brush-radius').oninput();
  for(const [id] of textureSliders)$('#'+id).oninput();
  legend();tiling();buildingControls();
  requireBuild('Projecte carregat. Genera el model');
}
initI18n();initDialogs();
$('#projects-open').addEventListener('click',()=>{
  $('#project-feedback').textContent='';
  try{renderProjectGallery();}catch(error){$('#project-feedback').textContent=error.message;}
});
$('#save-project').onsubmit=event=>{
  event.preventDefault();
  if(!selectedSize||tooLargeRegion||busy||drawing||pendingVegetation)return;
  try{
    const input=$('#project-name');
    saveProject(localStorage,{name:input.value,settings:captureProject()});
    input.value='';
    renderProjectGallery();
    $('#project-feedback').textContent='Projecte desat en aquest navegador.';
  }catch(error){$('#project-feedback').textContent=error.message;}
};
$('#release-list').innerHTML=[['0.22.35','Exageració vertical, rius i vegetació de Relleu pur s’apliquen sobre el retall carregat.'],['0.22.34','Taller mòbil amb mides i exemples tàctils, visor en directe i panells inferiors d’ajustos i exportació.'],['0.22.33','El carrusel recull els 28 retalls del catàleg amb imatges estàtiques i generació directa. El motor recupera les vies ordinàries si falla la integració dels perfils suaus.'],['0.22.32','Textura forestal més discreta i regulable, vores de tessel·la corregides i cobertes obertes quan hi ha dades.'],['0.22.31','Barcelona, Girona i Cardona s’afegeixen al carrusel com a exemples de Model complet amb imatges estàtiques i generació automàtica.'],['0.22.30','Fitxes flotants, controls laterals i un retall més ampli del Cap de Creus.'],['0.22.29','Montserrat, Sant Maurici i els volcans del Croscat i Santa Margarida al carrusel.'],['0.22.28','Vegetació contínua i editable sobre el bosc en Relleu pur.'],['0.22.26','Controls de vegetació i pinzell de capçades o textura en Relleu pur.'],['0.22.25','Carrusel lent en bucle, fitxes ampliables i generació directa dels exemples.'],['0.22.24','Control de gir separat, amb indicació visible d’activat o desactivat.'],['0.22.23','Carrusel inicial amb tres exemples de Relleu pur i imatges estàtiques.'],['0.22.22','Tamariu com a punt de partida, gir suau al visor i cota del mar corregida amb el MET5.'],['0.22.21','Tria d’un a sis filaments i assignació per capa en Relleu pur.'],['0.22.20','Mars i oceans cartografiats, plans i blaus fins a la base, en Relleu pur.'],['0.22.19','Peces panoràmiques a escala sobre la taula, en dues files a partir de 61 cm.'],['0.22.18','Format panoràmic en Relleu pur i previsualització del terreny per peces.'],['0.22.17','Canvi de mida al mateix projecte, conservant el territori i els ajustos.'],['0.22.16','Retalls a la mateixa escala amb ombrejat suau i una sola mida rectangular predefinida.'],['0.22.15','Previsualització de mides i talls sobre una taula i enllaç al changelog a la capçalera.'],['0.22.14','Un sol 3MF amb diverses plaques de Bambu i ZIP de peces opcional.'],['0.22.13','Filament per peça al 3MF de Bambu Studio.'],['0.22.12','Senders més estrets i aigua continental de superfície.'],['0.22.11','Més trams amb paviment independent i secció plana fins a la vora.'],['0.22.10','Paviment independent per defecte i trams recuperats entre cruïlles.'],['0.22.9','Primera prova de paviment nou en retalls reals.'],['0.22.8','Cupó de 120 × 120 mm amb vies sinuoses, cruïlla i pont.'],['0.22.7','Cupó de túnel amb dues boques i rasant compartida amb els accessos.'],['0.22.6','Cupó de pont amb dos enllaços sense graó i una via inferior.'],['0.22.5','Rasant contínua a la corba del cupó de paviment.'],['0.22.4','Cupó de paviment amb corba i cruïlla en T sense graó.'],['0.22.3','Cupó de paviment amb secció plana, excavació i reblert.'],['0.22.2','Perfils de vies recuperats quan falten cotes fora de la maqueta.'],['0.22.1','Perfils de calçada sobre túnels verificats i amplada estimada de les autopistes de sentit únic.'],['0.22.0','Versió de consolidació dels perfils viaris, ponts i túnels.'],['0.21.9','Signatura d’ortogra.fi al peu de pàgina.'],['0.21.8','Recuperació de ponts amb fragments solapats entre tessel·les.'],['0.21.7','Recuperació de túnels estimats amb poca coberta.'],['0.21.6','Transicions de vies amb més traçat disponible quan l’enllaç inicial falla.'],['0.21.5','Mides de 10 a 50 cm i guies discontínues de tall sobre el relleu.'],['0.21.4','Unió de paviment més robusta per a vies principals i ferrocarrils.'],['0.21.3','Perfils suaus amb MET5 acotats al retall i recuperació selectiva d’unions.'],['0.21.2','Corregida la càrrega de relleu amb el MET5.'],['0.21.1','MET5 de l’ICGC com a font preferent quan cobreix el retall.'],['0.21.0','Auditoria d’exportacions de control per altura i suavitzat intermedi de vies principals i ferrocarrils.'],['0.20.1','Rasants ferroviàries suavitzades segons l’escala i accessos amb canvis de pendent més progressius.'],['0.20.0','Galeria local per desar i recuperar els ajustos i traços d’una maqueta.'],['0.19.25','Capçades còniques més altes i prova conjunta dels Rasos de Peguera i la Gallina Pelada.'],['0.19.24','Capçades automàtiques d’alta muntanya al Model complet i densitat segons la cota a Relleu pur.'],['0.19.23','Capçades arrodonides en retalls baixos i progressivament còniques en retalls d’alta muntanya.'],['0.19.22','Boscos cartografiats i capçades a escala en Relleu pur.'],['0.19.21','Aigua cartografiada fora de l’Aneto en Relleu pur i controls d’orientació del mapa ajustats.'],['0.19.20','Selector segmentat de mode i rius i rierols amb amplada mínima configurable.'],['0.19.19','Modes Paisatge complet i Relleu pur a Territori, llacs plans i més detall al Paisatge complet.'],['0.19.18','Contorns de neu i roca interpolats, cobertura de l’Aneto més fina i més resolució amb detall Equilibrat i Alt.'],['0.19.17','Relleu pur amb una malla més fina, tessel·les d’elevació més detallades i talls de peces sobre una malla comuna.'],['0.19.16','Mode Relleu pur fins a 1:100.000, amb mostra de l’Aneto i cobertura de sòl nu i neu o gel. Perfils suaus activats per defecte.'],['0.19.15','Unions viàries més ràpides, amplades segons escala i transicions més suaus als accessos.'],['0.19.14','Informe JSON de temps de generació amb retall, ajustos i durada de cada fase.'],['0.19.13','Guies de tall sobre el relleu i descàrrega de la maqueta visible quan el mapa té canvis pendents.'],['0.19.12','Progrés per fases i previsualització de relleu, vies, edificis i vegetació mentre es genera la maqueta.'],['0.19.11','Un enllaç, túnel o edifici amb geometria defectuosa pot quedar omès amb un avís mentre es genera la resta de la maqueta.'],['0.19.10','Els taulers procedimentals recuperen la continuïtat entre tessel·les i les cotes dels estreps fora del retall.'],['0.19.9','Transicions entre perfils suaus i vies sobre el terreny. Segon retall ferroviari verificat.'],['0.19.8','Perfils experimentals de vies principals i ferrocarrils. Projecte nou sobre Territori i compàs al mapa.'],['0.19.7','Catastre per blocs, amb vista provisional i avisos dels elements amb dades contradictòries.'],['0.19.6','Mides proporcionals al centre, generació des de Territori i límit d’escala d’1:20.000.'],['0.19.5','Inici guiat, exemples a Territori i escala sincronitzada amb el mapa. El retall es gira des de la cantonada.'],['0.19.4','Els ajustos de vies reutilitzen el terreny i els edificis. Es conserven els traços del pinzell i la vista.'],['0.19.3','Ajustos de vies automàtics, descàrrega ancorada amb selector de format i ferrocarrils arran de carretera per defecte.'],['0.19.2','Sis passos amb accions al costat del títol. Els traços del pinzell es conserven en canviar de retall durant la sessió. Avís quan falta espai per enllaçar un pont al límit de la maqueta.'],['0.19.1','Corregits el graó de les boques girades i els plecs dels enllaços en revolts. Controls 3MF nous i proposta navegable de flux per etapes RO-053, pendent de revisió abans d’integrar-la.'],['0.19.0','Continuïtat i amplada de la calçada revisades als enllaços amb ponts i túnels. Marc exterior retirat del menú i ajornat per a un desenvolupament posterior.'],['0.18.2','Primera optimització de les vies principals: màscares de pilars calculades només quan calen i reutilitzades. El control de 3 km passa de 189,3 a 56,6 s amb els mateixos 14 perfils. Prototip encara desactivat; controls 3MF disponibles al repositori i cas de detall baix pendent.'],['0.18.1','Túnels activats per defecte, sostre parabòlic i paviment de camí. Envolupant de vies principals preparada com a prototip, pendent d’optimitzar abans d’activar-la.'],['0.18.0','Ferrocarrils amb material propi i realç de +0,5 o +1 mm sobre els camins. Millora dels portals de túnels estimats. Nova font OSM de cobertes i parts originals, amb formes paramètriques quan hi ha dades i preservació del mode limitat pla.'],['0.17.0','Pilars adaptats a l’escala, suports auxiliars i avisos de llums. Túnels estimats amb obertures reals, en una opció experimental desactivada per defecte. Exemples automàtics, marc negre i plaques ajornades.'],['0.16.0','Ponts procedimentals a partir de la cartografia i el relleu, amb pilars i connexions. Perfils estimats entre extrems, diferenciats de les dades específiques de Rajadell. El viaducte es conserva en moure, ampliar o girar el retall.'],['0.15.1','Rajadell es conserva en retalls ampliats o desplaçats: els detalls del pont es carreguen per ubicació, també fora del botó d’exemple. Memòria cau acotada i reintent de lectures fallides. Generalització procedimental en curs.'],['0.15.0','Pilars simplificats que eviten camins i edificis, i enllaços suaus del viaducte amb la carretera. Conjunt unit abans de mostrar-lo i exportar-lo. Realç opcional dels camins de 0,5 o 1 mm de maqueta. Suports i enllaços estimats, pendents de laminat.'],['0.14.0','Primer viaducte amb superfície 3D de l’ICGC a la mostra de Manresa, separada del terreny i conservada al 3MF. Gruix simplificat, sense pilars mesurats. Llibre d’estil per a contribucions i tasques delegades. Túnel pendent de dades suficients.'],['0.13.1','Base corregida: la cota més baixa del relleu queda a 5 mm. Es conserven el desnivell, l’exageració i una referència vertical comuna a totes les capes. A la costa, el mar també queda a 5 mm.'],['0.13.0','Catastre amb consultes per quadrants i recuperació de la font anterior en fallar. Sidebars homogenis, marc coherent amb la seva exportació i sense canvis de zoom. Viaducte de l’Eix Diagonal com a mostra inicial, Tamariu al catàleg. Fletxa del nord retirada i rosa ajornada.'],['0.12.0','Vista de presentació amb taula i llum, render a demanda i retorn al taller. Fonts remotes amb resum clar i fitxers propis dins d’opcions avançades. Proves de sòlids per preparar infraestructures; ponts i coves reals pendents.'],['0.11.0','Catastre buit vàlid, pinzell amb cobertura per gest i retorn a navegació, edificis automàtics i complements independents: marc, placa educativa i fletxa del nord. Cobertes reals en estudi.'],['0.10.0','Catastre amb espera i reintent fitats, errors entenedors i model conservat en fallar. Preparació del sistema d’idiomes, només amb català disponible. Propostes de marc imprimible, etiquetes, rosa dels vents i escena realista.'],['0.9.0','Pinzell aleatori, fonts d’edificis explícites i parts del Catastre. Edificis actualitzats sense reconstruir terreny, i primeres cobertes amb atributs de la font.'],['0.8.0','Vegetació repartida per tota la zona verda, pinzell amb prioritat al límit, densitat per traç i exportació sense selectors de broquet ni tipus de filament. Estudi de parts d’edificis, cobertes, ponts i túnels.'],['0.7.0','Sidebars reorganitzats, escala en un sol camp, orientació al mapa, arbres proporcionats a l’escala i límits de càrrega coherents. Historial de tasques validades separat.'],['0.6.0','Menús sempre visibles amb scroll intern, estadístiques al sidebar, V4V i favicon, transicions, marc visual, retall girat, opcions de filament/broquet i importació local GeoTIFF/GeoJSON.'],['0.5.0','Apartats replegables, controls dins del preview i selecció per escala horitzontal fixa. Diagnòstic dels blocs d’edificis de Tamariu.'],['0.4.2','Lectura numèrica directa del relleu WebP/PNG, sense canvas, i diagnòstics de les tessel·les per investigar els pics intermitents.'],['0.4.1','Cobertes horitzontals: el límit d’altura es mesura sobre el punt més alt del terreny dins de la petjada.'],['0.4.0','Camins amb unions arrodonides, edificis limitats a 5 m per defecte o sense volum, i pinzell amb indicador de treball i un càlcul per traç.'],['0.3.0','Mapa i cerca de llocs, layout d’escriptori estable, 1–8 materials, vegetació editable i exportació en peces.'],['0.2.0','Edificis ICGC, relleu corregit, capçades variades i exportació per a Bambu Studio.'],['0.1.0','Primera maqueta de Tamariu generada al navegador amb costa vectorial i exportació 3D.']].map(([v,text])=>`<article class="release-entry"><div><strong>v${v}</strong><time>${['0.22.35','0.22.34','0.22.33'].includes(v)?'05/11/2026':['0.22.32','0.22.31','0.22.30','0.22.29','0.22.28','0.22.26','0.22.25','0.22.24','0.22.23','0.22.22','0.22.21','0.22.20','0.22.19','0.22.18','0.22.17','0.22.16','0.22.15','0.22.14','0.22.13','0.22.12','0.22.11','0.22.10','0.22.9','0.22.8','0.22.7','0.22.6','0.22.5','0.22.4','0.22.3','0.22.2','0.22.1','0.22.0','0.21.9','0.21.8','0.21.7','0.21.6','0.21.5'].includes(v)?'04/11/2026':['0.21.4','0.21.3','0.21.2','0.21.1','0.21.0','0.20.1','0.20.0','0.19.25','0.19.24','0.19.23','0.19.22','0.19.21','0.19.20','0.19.19','0.19.18','0.19.17','0.19.16','0.19.15','0.19.14','0.19.13','0.19.12','0.19.11','0.19.10','0.19.9','0.19.8','0.19.7','0.19.6','0.19.5','0.19.4','0.19.3','0.19.2'].includes(v)?'03/11/2026':['0.19.1','0.19.0','0.18.2','0.18.1','0.18.0','0.17.0','0.16.0','0.15.1','0.15.0','0.14.0','0.13.1','0.13.0','0.12.0','0.11.0'].includes(v)?'02/11/2026':v==='0.1.0'?'31/10/2026':'01/11/2026'}</time></div><p>${text}</p></article>`).join('');
$('#copy-lightning').onclick=async()=>{try{await navigator.clipboard.writeText('aptswim903@walletofsatoshi.com');$('#copy-status').textContent='Adreça copiada';}catch{$('#copy-status').textContent='Selecciona i copia l’adreça.';}};
for(const toggle of document.querySelectorAll('.sidebar-left .section-toggle'))toggle.disabled=true;
legend();tiling();buildingControls();scaleHint();
try{restoreProject();}catch(error){say(error.message,true);}
