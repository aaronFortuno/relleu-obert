import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadRegion,loadBuildingLayer,applyBuildingLayer,defaultBuildingSource} from './sources.js';
import {inCatalonia} from './buildings.js';
import {createPlaceMap} from './place-map.js';
import {CATEGORIES,PALETTES,defaultAssignments} from './materials.js';
import {SIZE_PRESETS,tilePlan,parseScaleInput} from './selection.js';
import {regionLimitMessage} from './region-limits.js';
import {initDialogs} from './dialogs.js';
import {initI18n,t} from './i18n.js';
import {createPresentationMode} from './presentation-scene.js';
import {createDemandRenderer} from './render-scheduler.js';
import {initAccessoryUI} from './accessory-ui.js';
import {createBuildingUpdateScheduler} from './building-update-scheduler.js';
import {createPreviewFrame} from './preview-frame.js';
import {withoutLastGesture} from './brush-coverage.js';
import {describeSources,clearLocalDecision} from './source-options.js';
import {RECOMMENDED_PLACES,DEFAULT_PLACE,recommendedPlace,placeSelection} from './recommended-places.js';
import './style.css';
import './ui-tokens.css';
import './usability.css';
const $=s=>document.querySelector(s),view=$('#viewport'),worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
let region,model,busy=false,selection,dirty=false,sourceDirty=false,buildingSourceDirty=false,needsBuild=false,placeName=recommendedPlace(DEFAULT_PLACE).name,strokes=[],brush='navigate',pendingVegetation=false,timer,job,drawing=false,lastPoint,gesture=0;
let pendingFullRegion=null,lastValidBuildings=null,recoveryNotice='';
let accessoryUI,presentationMode,demandRenderer;let contextLost=false,presentationReduced=false;
let materialCount=4,assignments=defaultAssignments(4);
let targetScale=null,invalidScale=false,selectedPose,localDEM=null,localBuildings=null,rotationAngle=0,tooLargeRegion=false,pendingBuildingLayer=null,icgcAvailable=true,buildingSourceExplicit=false;
const size=()=>SIZE_PRESETS[$('#size-preset').value];
const vegetation=()=>({trees:$('#trees').checked,density:2.5,brushDensity:Number($('#density').value),treeType:$('#tree-type').value,strokes});
const say=(message,error=false)=>{$('#status').textContent=message;$('#status').classList.toggle('error',error);};
const badge=message=>{$('#model-badge').textContent=message;$('#model-badge').hidden=!message;};
function lock(value){busy=value;const updating=value||pendingVegetation;$('#generate').innerHTML=needsBuild&&model&&sameTerrain(modelOptions())?'Actualitzar els edificis <span>↗</span>':'Generar el model <span>↗</span>';$('#road-rise').disabled=updating;$('#building-source').disabled=updating;$('#building-mode').disabled=updating;$('#building-height').disabled=updating||$('#building-mode').value!=='limited';$('#model-scale').setAttribute('aria-invalid',String(invalidScale||tooLargeRegion));$('#generate').disabled=updating||!selection||invalidScale||tooLargeRegion;$('#rotate-left').disabled=updating||rotationAngle<=-90;$('#rotate-right').disabled=updating||rotationAngle>=90;$('#rotation-north').disabled=updating||rotationAngle===0;$('#sample').disabled=updating;$('#recommended-place').disabled=updating;for(const id of ['local-dem','local-buildings'])$('#'+id).disabled=updating;$('#clear-local-data').disabled=updating||(!localDEM&&!localBuildings);for(const id of ['export-3mf','export-standard','export-stl'])$('#'+id).disabled=updating||!model||needsBuild;for(const b of document.querySelectorAll('[data-brush]'))b.disabled=b.dataset.brush!=='navigate'&&(updating||needsBuild||!model||!$('#trees').checked||model?.provenance.treeRepresentation?.omittedBelowThreshold);view.setAttribute('aria-busy',String(updating));$('#work-indicator').hidden=!updating;$('#work-label').textContent=drawing?'Acaba el traç per aplicar-lo':value?(job==='vegetation'?'Actualitzant la vegetació…':job==='buildings'?'Actualitzant els edificis…':job==='accessory'?'Preparant el complement…':job==='export'?'Preparant el fitxer…':job==='import'?'Comprovant les dades locals…':'Generant el model…'):'Aplicant el traç de vegetació…';view.classList.toggle('is-working',updating&&!drawing);if(updating&&!drawing)$('#brush-cursor').hidden=true;editButtons();accessoryUI?.refresh(model,!updating&&!needsBuild,updating);syncPresentationUI();}
function markDirty(){dirty=!!region&&selection.some((v,i)=>Math.abs(v-region.meta.bbox[i])>1e-9);if(dirty)requireBuild('Selecció pendent de generar');}
const placeMap=createPlaceMap($('#place-map'),{onChange:(bbox,center,pose)=>{selection=bbox;selectedPose=pose;syncBuildingSources(bbox);const lat=(bbox[1]+bbox[3])/2,w=pose.widthM/1000,h=pose.heightM/1000;$('#selection-info').textContent=`${w.toFixed(2)} × ${h.toFixed(2)} km · ${lat.toFixed(4)}, ${((bbox[0]+bbox[2])/2).toFixed(4)}`;scaleHint();if(region)markDirty();},onName:name=>{placeName=name;$('#location').textContent=name;}});
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,6000);camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;view.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=35;controls.maxDistance=2200;
scene.add(new THREE.HemisphereLight(0xffffff,0x798269,2.5));const light=new THREE.DirectionalLight(0xfff6df,3.3);light.position.set(-170,-160,400);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-350,right:350,top:350,bottom:-350,far:1200});light.shadow.normalBias=.2;scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(2500,2500),new THREE.ShadowMaterial({opacity:.13}));ground.position.z=-.5;ground.receiveShadow=true;scene.add(ground);
const group=new THREE.Group();scene.add(group);let seams,previewFrame;
function home(){const bounds=new THREE.Box3().setFromObject(group).union(previewFrame?new THREE.Box3().setFromObject(previewFrame):new THREE.Box3()),sphere=bounds.isEmpty()?new THREE.Sphere(new THREE.Vector3(0,0,10),110):bounds.getBoundingSphere(new THREE.Sphere()),distance=sphere.radius/Math.sin(THREE.MathUtils.degToRad(camera.fov)/2)*1.15/Math.min(1,camera.aspect);camera.zoom=1;camera.updateProjectionMatrix();controls.target.copy(sphere.center);camera.position.copy(new THREE.Vector3(.75,-1,.85).normalize().multiplyScalar(distance).add(sphere.center));controls.update();}
new ResizeObserver(()=>{const w=view.clientWidth,h=view.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();invalidateView();}).observe(view);
const renderWorkshop=()=>{controls.update();renderer.render(scene,camera);};
renderer.setAnimationLoop(renderWorkshop);home();
function invalidateView(){if(presentationMode?.isActive()&&!contextLost)demandRenderer?.invalidate();}
function syncPresentationUI(){const button=$('#presentation-toggle');if(!button)return;button.disabled=!model||busy||pendingVegetation||drawing||contextLost;button.setAttribute('aria-pressed',String(!!presentationMode?.isActive()));$('#presentation-note').hidden=!presentationMode?.isActive();}
function refreshPresentation(m,resetCamera=false){if(m&&presentationMode?.isActive()){presentationMode.refreshBounds(m,{resetCamera});invalidateView();}syncPresentationUI();}
function leavePresentation(error){demandRenderer?.stop();try{presentationMode?.exit();}catch(e){error??=e;}if(!contextLost)renderer.setAnimationLoop(renderWorkshop);syncPresentationUI();say(error?'No s’ha pogut mantenir la vista de presentació: '+error.message:'Vista de treball recuperada.',!!error);}
presentationMode=createPresentationMode({scene,camera,renderer,controls,group,light,ground,getSeams:()=>seams,getFrame:()=>previewFrame,onReset:home});
demandRenderer=createDemandRenderer({update:()=>controls.update(),render:()=>renderer.render(scene,camera),onError:leavePresentation,onSlow:()=>{if(!presentationMode.isActive()||presentationReduced)return;presentationReduced=true;renderer.shadowMap.enabled=false;renderer.setPixelRatio(1);say('Vista simplificada per mantenir una navegació fluida. El model es conserva.');invalidateView();}});
controls.addEventListener('change',invalidateView);
$('#presentation-toggle').onclick=()=>{if(!model||busy||pendingVegetation||drawing||contextLost)return;try{if(presentationMode.isActive()){leavePresentation();return;}endVegetationEditing();renderer.setAnimationLoop(null);presentationMode.enter(model);presentationReduced=false;demandRenderer.start();syncPresentationUI();say('Vista de presentació activada.');}catch(e){leavePresentation(e);}};
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;demandRenderer.stop();renderer.setAnimationLoop(null);syncPresentationUI();say('La previsualització està recuperant-se. El model numèric es conserva.',true);});
renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;if(presentationMode.isActive()){presentationMode.refreshBounds(model);demandRenderer.start();}else renderer.setAnimationLoop(renderWorkshop);syncPresentationUI();say('Previsualització recuperada.');});
function recolor(){for(const mesh of group.children){const index=CATEGORIES.findIndex(c=>c.id===mesh.name);if(index>=0)mesh.material.color.set(PALETTES[materialCount][assignments[index]]);}legend();metrics();invalidateView();}
function legend(){const root=$('#material-legend');root.replaceChildren();CATEGORIES.forEach((category,i)=>{const row=document.createElement('div');row.className='material-row'+(model&&!model.categories.some(p=>p.id===category.id)?' absent':'');const swatch=document.createElement('i');swatch.style.setProperty('--swatch',PALETTES[materialCount][assignments[i]]);const label=document.createElement('span');label.textContent=category.name;const select=document.createElement('select');select.setAttribute('aria-label','Material de '+category.name);for(let j=0;j<materialCount;j++)select.add(new Option('Mat. '+(j+1),String(j)));select.value=assignments[i];select.onchange=()=>{assignments[i]=Number(select.value);recolor();};row.append(swatch,label,select);root.appendChild(row);});}
function metrics(){if(!model)return;const used=new Set(model.categories.map(p=>assignments[CATEGORIES.findIndex(c=>c.id===p.id)])).size;$('#metrics').innerHTML=`<div><strong>${model.width.toFixed(0)} × ${model.height.toFixed(0)}</strong><span>Mida final · mm</span></div><div><strong>1:${model.scale.toLocaleString('ca')}</strong><span>Escala horitzontal</span></div><div><strong>${model.treeCount.toLocaleString('ca')}</strong><span>Volums de vegetació</span></div><div><strong>${used} / ${materialCount}</strong><span>Materials amb geometria</span></div><div><strong>${model.buildingCount.toLocaleString('ca')}</strong><span>Fragments d’edificis</span></div><div><strong>×${Number(model.provenance.verticalExaggeration).toLocaleString('ca')}</strong><span>Exageració vertical</span></div><div class="metric-wide"><strong>${model.triangles.toLocaleString('ca')}</strong><span>Triangles · complexitat de la malla</span></div>`;}
function dispose(mesh){mesh.geometry.dispose();mesh.material.dispose();group.remove(mesh);}
function display(m,vegetationOnly=false,buildingsOnly=false,refit=true){
  if(!vegetationOnly&&!buildingsOnly)for(const mesh of [...group.children])dispose(mesh);else for(const mesh of [...group.children])if(mesh.name==='trees'||buildingsOnly&&['buildings','roads'].includes(mesh.name))dispose(mesh);
  for(const p of m.categories){if(vegetationOnly&&p.id!=='trees'||buildingsOnly&&!['trees','buildings','roads'].includes(p.id))continue;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(p.vertices,3));geometry.setIndex(new THREE.BufferAttribute(p.faces,1));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:p.color,roughness:.85,flatShading:true}));mesh.name=p.id;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
  group.position.set(-m.width/2,-m.height/2,0);recolor();tiling();updateFrame();if(!vegetationOnly&&!buildingsOnly&&refit)home();refreshPresentation(m,!vegetationOnly&&!buildingsOnly&&refit);
  const budget=m.provenance.vegetationBudget;$('#vegetation-budget-note').hidden=!budget||(budget.eligibleAutomatic<=budget.limit&&!budget.automaticReduced&&!budget.manualDropped);$('#vegetation-budget-note').textContent=budget?.manualDropped?'Límit d’arbres pintats: els traços nous substitueixen els més antics.':'Límit de 12.000 arbres, repartits per tot el model. El pinzell té prioritat sobre els arbres automàtics.';
  if(m.provenance.treeRepresentation?.omittedBelowThreshold&&brush!=='navigate')selectNavigate();$('#tree-scale-note').hidden=!m.provenance.treeRepresentation?.omittedBelowThreshold;$('#tree-scale-note').textContent='A aquesta escala els arbres serien massa petits per imprimir-los. Es manté la superfície del bosc.';const list=document.createElement('ul');for(const message of m.warnings){const li=document.createElement('li');li.textContent=message;list.appendChild(li);}$('#warnings').replaceChildren(list);
}
function updateFrame(){
  $('#frame-settings').hidden=$('#preview-frame').value==='none';
  let next=null;
  try{if(model)next=createPreviewFrame(model.width,model.height,$('#preview-frame').value,accessoryUI?.frameOptions());}
  catch(e){say(e.message,true);return;}
  if(previewFrame){scene.remove(previewFrame);for(const mesh of previewFrame.children){mesh.geometry.dispose();mesh.material.dispose();}previewFrame=null;}
  previewFrame=next;if(previewFrame)scene.add(previewFrame);
  refreshPresentation(model);
}
$('#preview-frame').onchange=updateFrame;
function tiling(){const [w,h]=size(),plan=tilePlan(w,h),split=$('#split-tiles').checked,description=split?`${plan.tiles.length} ${plan.tiles.length===1?'peça':'peces'} de ${plan.tiles[0].width.toFixed(0)} × ${plan.tiles[0].height.toFixed(0)} mm`:'Una sola peça';$('#tile-info').textContent=description+(split&&plan.tiles.length>1?' · mateixes escala i exageració.':'');$('#tiling-summary').textContent=needsBuild?'Canvis de mida o territori pendents de generar':description;$('#export-hint').textContent=split&&plan.tiles.length>1?'Descarregaràs un ZIP amb una maqueta per peça i el plànol de muntatge. Els talls no tenen encaixos.':'Obre el 3MF com a projecte i comprova els filaments i el laminat.';
  if(seams){scene.remove(seams);seams.geometry.dispose();seams.material.dispose();seams=null;}
  if(model&&split&&(model.width>200||model.height>200)){const p=tilePlan(model.width,model.height),v=[],z=-.2;for(let c=1;c<p.cols;c++){const x=c*model.width/p.cols-model.width/2;v.push(x,-model.height/2,z,x,model.height/2,z);}for(let r=1;r<p.rows;r++){const y=r*model.height/p.rows-model.height/2;v.push(-model.width/2,y,z,model.width/2,y,z);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));seams=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x466c4a,depthTest:false,transparent:true,opacity:.55}));seams.renderOrder=5;scene.add(seams);}
  refreshPresentation(model);
}
function modelOptions(){const [widthMM,heightMM]=size();return {size:Math.max(widthMM,heightMM),widthMM,heightMM,exaggeration:Number($('#exag').value),resolution:Number($('#detail').value),roadRise:Number($('#road-rise').value),targetScale,selectionPose:selectedPose,buildingMode:$('#building-mode').value,maxBuildingHeight:Number($('#building-height').value),...vegetation()};}
function configurationKey(o){return JSON.stringify([o.widthMM,o.heightMM,o.exaggeration,o.resolution,o.roadRise??0,o.targetScale,o.selectionPose?.center,o.selectionPose?.widthM,o.selectionPose?.heightM,o.selectionPose?.rotation,o.buildingMode,o.maxBuildingHeight]);}
function sameTerrain(options){
  const old=model?.provenance.options;if(!old||dirty||sourceDirty)return false;
  const a=options.selectionPose,b=old.selectionPose;return ['widthMM','heightMM','exaggeration','resolution','targetScale','roadRise'].every(k=>options[k]===old[k])&&a&&b&&['widthM','heightM','rotation'].every(k=>Math.abs(a[k]-b[k])<1e-6)&&a.center.every((v,i)=>Math.abs(v-b.center[i])<1e-10);
}
function syncBuildingSources(bbox){
  const available=inCatalonia(bbox),select=$('#building-source');select.querySelector('[value=icgc]').disabled=!available;
  if(available!==icgcAvailable){const before=select.value;if(!buildingSourceExplicit||select.value==='icgc'&&!available)select.value=defaultBuildingSource(bbox);if(region&&before!==select.value)buildingSourceDirty=true;icgcAvailable=available;}
}
function buildingInfo(){sourceSummary();const b=region.meta.buildings;$('#building-info').textContent=b.officialCount?'ICGC: '+b.officialCount+' elements; '+b.osmRetained+' fragments OSM complementaris.':b.provider==='GeoJSON local'?'GeoJSON local: '+b.count+' elements.':b.partCount!=null?'Catastre: '+b.partCount+' parts consultades; '+b.count+' volums sobre rasant. Altures estimades; sense dades de coberta.':'OpenStreetMap via OpenFreeMap.';}
async function generate(useSample=false){
  if(busy||pendingVegetation||drawing||(invalidScale||tooLargeRegion)&&!useSample)return;
  scheduler.cancel();
  if(useSample){
    const place=recommendedPlace(useSample===true?'tamariu':useSample);if(!place)return;
    buildingSourceExplicit=false;localDEM=null;localBuildings=null;$('#local-dem').value='';$('#local-buildings').value='';localDataInfo();rotationAngle=0;$('#rotation-value').textContent='Nord a dalt';placeMap.setRotation(0);$('#model-scale').value='';applyScale();placeMap.setRegion(placeSelection(place.id,...size()));placeName=place.name;$('#recommended-place').value=place.id;
  }
  job='build';lock(true);pendingVegetation=false;pendingBuildingLayer=null;pendingFullRegion=null;recoveryNotice='';
  const [w,h]=size();if(useSample||dirty||model?.width!==w||model?.height!==h)strokes=[];editButtons();
  try{
    const reload=useSample||dirty||sourceDirty||!region;
    if(reload){
      say(t('status.loadingTerrain'));
      pendingFullRegion=await loadRegion({sample:useSample,bbox:selection,buildingSource:useSample?'icgc':$('#building-source').value,localDEM,localBuildings,buildingFallbacks:[lastValidBuildings?.source,defaultBuildingSource(selection),'osm'].filter(Boolean)},say);
      pendingFullRegion.meta.name=placeName;recoveryNotice=pendingFullRegion.recovery?.notice||'';
    }
    const options=modelOptions(),incremental=!reload&&sameTerrain(options);
    if(incremental){job='buildings';lock(true);}
    if(!reload&&buildingSourceDirty){pendingBuildingLayer=await loadBuildingLayer(region,{source:$('#building-source').value,localBuildings},say);}
    if(incremental){
      job='buildings';const layer=pendingBuildingLayer?{features:pendingBuildingLayer.features,meta:{...region.meta,buildings:pendingBuildingLayer.metadata,buildingSource:pendingBuildingLayer.source,sourceWarnings:[...(region.terrainWarnings||[]),...pendingBuildingLayer.warnings],localSources:{...region.meta.localSources,buildings:localBuildings?.metadata||null}}}:{};
      needsBuild=invalidScale||tooLargeRegion||dirty||configurationKey(options)!==configurationKey(modelOptions());say(t('status.updatingBuildings'));worker.postMessage({type:'buildings',layer,options});
    }else{
      if(pendingBuildingLayer){
        pendingFullRegion=applyBuildingLayer({...region,meta:{...region.meta},features:[...region.features]},pendingBuildingLayer);
        pendingBuildingLayer=null;
      }
      const target=pendingFullRegion||region;
      needsBuild=false;say(t('status.building'));
      worker.postMessage({type:'build',region:{meta:target.meta,features:target.features,dem:target.dem,localDEM:target.localDEM,infrastructure:target.infrastructure},options});
    }
  }catch(e){recoverBuildings(e);}
}

function acceptBuildings(){
  lastValidBuildings={source:region.meta.buildingSource,mode:model.provenance.options.buildingMode,height:model.provenance.options.maxBuildingHeight,locals:localBuildings};
}
function recoverBuildings(error){
  pendingFullRegion=null;pendingBuildingLayer=null;
  if(lastValidBuildings){
    const prior=lastValidBuildings;if(prior.source!=='local')$('#building-source').value=prior.source;
    $('#building-mode').value=prior.mode;$('#building-height').value=prior.height;
    localBuildings=prior.locals;buildingSourceDirty=false;
    if(!localBuildings)$('#local-buildings').value='';localDataInfo();
  }
  needsBuild=!model||!sameTerrain(modelOptions())||configurationKey(model.provenance.options)!==configurationKey(modelOptions());
  buildingControls();badge(needsBuild?'Selecció pendent de generar':'');lock(false);
  say(error.message+(model?' S’han conservat el model i els ajustos d’edificis anteriors.':''),true);
}

function updateTrees(){pendingVegetation=true;lock(busy);clearTimeout(timer);if(!drawing){say('Aplicant els canvis de vegetació… Espera abans de començar un altre traç.');timer=setTimeout(flushTrees,170);}}
function flushTrees(){if(!pendingVegetation||drawing||busy||!model)return;pendingVegetation=false;job='vegetation';lock(true);worker.postMessage({type:'vegetation',options:vegetation()});}
let buildingsSettle=null,buildingsToken=0;
async function autoBuildings(state,token){
  job='buildings';lock(true);
  const targetRegion=region,source=$('#building-source').value,locals=localBuildings,options=modelOptions();
  let loaded=null;
  if(buildingSourceDirty){
    try{loaded=await loadBuildingLayer(targetRegion,{source,localBuildings:locals},say);}
    catch(e){recoverBuildings(e);throw e;}
  }
  if(!scheduler.isCurrent(token)||region!==targetRegion||localBuildings!==locals||!sameTerrain(options)){lock(false);return;}
  if(loaded)pendingBuildingLayer=loaded;
  const layer=pendingBuildingLayer?{features:pendingBuildingLayer.features,meta:{...region.meta,buildings:pendingBuildingLayer.metadata,buildingSource:pendingBuildingLayer.source,sourceWarnings:[...(region.terrainWarnings||[]),...pendingBuildingLayer.warnings],localSources:{...region.meta.localSources,buildings:locals?.metadata||null}}}:{};
  needsBuild=invalidScale||tooLargeRegion||dirty;say(t('status.updatingBuildings'));buildingsToken=token;
  worker.postMessage({type:'buildings',layer,options});
  return new Promise((resolve,reject)=>{buildingsSettle={resolve,reject};});
}
const scheduler=createBuildingUpdateScheduler({delay:300,canAutoUpdate:()=>!!model&&!!region&&!invalidScale&&!tooLargeRegion&&sameTerrain(modelOptions()),isBusy:()=>busy||pendingVegetation||drawing,run:autoBuildings});
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
  if(data.type==='progress')say(data.message);
  if(data.type==='imported'){if(data.kind==='import-dem'){localDEM=data.value;sourceDirty=true;}else{localBuildings=data.value;buildingSourceDirty=true;}lock(false);localDataInfo();buildingControls();requireBuild('Dades locals pendents de generar');scheduler.flush();}
  if(data.type==='model'){
    if(pendingFullRegion&&!data.vegetation&&!data.buildings){
      region=pendingFullRegion;pendingFullRegion=null;sourceDirty=false;buildingSourceDirty=false;
      if(region.meta.buildingSource!=='local')$('#building-source').value=region.meta.buildingSource;
      $('#location').textContent=region.meta.name;
    }
    if(!data.vegetation){dirty=selection.some((v,i)=>Math.abs(v-region.meta.bbox[i])>1e-9);needsBuild=invalidScale||tooLargeRegion||dirty||sourceDirty||configurationKey(data.model.provenance.options)!==configurationKey(modelOptions());}
if(data.buildings&&buildingsToken&&!scheduler.isCurrent(buildingsToken)){settleBuildings();lock(false);scheduler.flush();return;}if(data.vegetation||data.buildings){const replace=data.buildings?['buildings','trees','roads']:['trees'];data.model.categories=[...model.categories.filter(p=>!replace.includes(p.id)),...data.model.categories];}if(data.buildings){if(pendingBuildingLayer){applyBuildingLayer(region,pendingBuildingLayer);pendingBuildingLayer=null;}region.meta={...region.meta,localSources:data.model.provenance.localSources};buildingSourceDirty=false;buildingInfo();}const refit=!model||model.width!==data.model.width||model.height!==data.model.height||JSON.stringify(model.provenance.bbox)!==JSON.stringify(data.model.provenance.bbox)||JSON.stringify(model.provenance.options.selectionPose)!==JSON.stringify(data.model.provenance.options.selectionPose);model=data.model;if(!data.vegetation){acceptBuildings();buildingInfo();buildingControls();}display(model,data.vegetation,data.buildings,refit);badge(needsBuild?'Canvis pendents de generar':'');lock(false);say(recoveryNotice||(needsBuild?t('status.pendingChanges'):data.buildings?t('status.buildingsUpdated'):data.vegetation?t('status.vegetationUpdated'):t('status.modelReady')));recoveryNotice='';settleBuildings();flushTrees();scheduler.flush();}
  if(data.type==='error'){pendingVegetation=false;if(job==='build'||job==='buildings')recoverBuildings(Error(data.message));else{lock(false);say(data.message,true);}settleBuildings(Error(data.message));console.error(data.detail);}
  if(data.type==='download'){const zipped=data.archive||data.format==='stl',blob=new Blob([data.bytes],{type:zipped?'application/zip':'model/3mf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=data.filename||`relleu-obert-${data.archive?'peces-':''}${data.format}${zipped?'.zip':'.3mf'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);lock(false);say(data.accessory?'Complement preparat en 3MF i STL. Comprova’n el laminat i les mides.':data.archive?'Peces preparades amb els talls tancats. Consulta el plànol de muntatge del ZIP.':'Fitxer preparat. Comprova els filaments i el laminat abans d’imprimir.');flushTrees();scheduler.flush();}
};worker.onerror=e=>{pendingVegetation=false;lock(false);settleBuildings(Error(e.message));say('No s’ha pogut generar la maqueta: '+e.message,true);};
$('#search-form').onsubmit=async e=>{e.preventDefault();const text=$('#place-search').value.trim();if(!text)return;$('#search-results').replaceChildren();try{say(t('status.searching'));const results=await placeMap.search(text);for(const result of results){const b=document.createElement('button');b.type='button';b.textContent=result.label;b.onclick=()=>{placeMap.choose(result);$('#place-search').value=result.label;$('#search-results').replaceChildren();say(t('status.regionChosen'));};$('#search-results').appendChild(b);}say(results.length?t('status.chooseResult'):t('status.noResults'));}catch(error){say(error.message,true);}};
for(const place of RECOMMENDED_PLACES)$('#recommended-place').add(new Option(place.name,place.id));$('#recommended-place').value=DEFAULT_PLACE;$('#sample').onclick=()=>generate($('#recommended-place').value);$('#generate').onclick=()=>generate();$('#reset').onclick=home;$('#top').onclick=()=>{home();const distance=camera.position.distanceTo(controls.target);camera.position.copy(controls.target).add(new THREE.Vector3(0,-.01,distance));controls.update();};
function requireBuild(message){needsBuild=true;badge(tooLargeRegion?'Àrea massa gran':message);say(tooLargeRegion?$('#scale-info').textContent:invalidScale?'Revisa l’escala.':message+'.',invalidScale||tooLargeRegion);lock(busy);}
$('#size-preset').onchange=()=>{const [w,h]=size();placeMap.setSize(w,h);scaleHint();if(w>200||h>200)$('#split-tiles').checked=true;requireBuild('Mida pendent de generar');tiling();};$('#split-tiles').onchange=tiling;
function scaleHint(){
  const [w,h]=size(),limit=selectedPose?regionLimitMessage(selectedPose,w,h):'';tooLargeRegion=!!limit;
  if(!invalidScale){
    $('#scale-info').classList.toggle('error',tooLargeRegion);
    const area=selectedPose?`${selectedPose.widthM.toLocaleString('ca',{maximumFractionDigits:0})} × ${selectedPose.heightM.toLocaleString('ca',{maximumFractionDigits:0})} m de territori`:'';
    $('#scale-info').textContent=limit||(targetScale?`1 cm al model = ${(targetScale/100).toLocaleString('ca')} m reals. ${area}.`:area);
  }
  $('#map-hint').textContent=targetScale?'Mou el mapa per situar el retall. El zoom amplia la vista; la mida del territori es manté.':'Mou el mapa i fes zoom per triar el territori.';
  lock(busy);
}
function applyScale(){
  try{targetScale=parseScaleInput($('#model-scale').value);invalidScale=false;placeMap.setScale(targetScale);scaleHint();requireBuild('Escala pendent de generar');}
  catch(e){invalidScale=true;$('#scale-info').textContent=e.message;$('#scale-info').classList.add('error');requireBuild('Revisa l’escala');}
}
function localDataInfo(){$('#local-data-info').textContent=[localDEM?`Terreny propi: ${localDEM.metadata.file} · ${localDEM.width} × ${localDEM.height} cel·les`:null,localBuildings?`Edificis propis: ${localBuildings.metadata.file} · ${localBuildings.features.length} elements`:null].filter(Boolean).join(' / ')||'Cap fitxer local carregat.';$('#clear-local-data').disabled=busy||pendingVegetation||(!localDEM&&!localBuildings);}
function sourceSummary(){const s=describeSources({terrainProvider:region?.meta?.terrain?.provider,terrainWasLocal:!!region?.meta?.localSources?.dem,buildingSource:$('#building-source').value,localDEM,localBuildings,pendingTerrain:sourceDirty,pendingBuildings:buildingSourceDirty});$('#terrain-source-name').textContent=s.terrain.label+(s.terrain.pending?' · pendent de generar':'');$('#building-source-name').textContent=s.buildings.label+(s.buildings.pending?' · pendent d’actualitzar':'');}
for(const [id,type]of [['local-dem','import-dem'],['local-buildings','import-buildings']])$('#'+id).onchange=async()=>{
  const file=$('#'+id).files[0];if(!file||busy)return;
  try{if(file.size>(type==='import-dem'?100:30)*1024*1024)throw Error('El fitxer és massa gran. Retalla’l a l’àrea d’interès.');job='import';lock(true);say('Llegint i comprovant les dades locals…');worker.postMessage(type==='import-dem'?{type,name:file.name,buffer:await file.arrayBuffer()}:{type,name:file.name,text:await file.text()});}catch(e){lock(false);say(e.message,true);}
};
$('#clear-local-data').onclick=()=>{if(busy||(!localDEM&&!localBuildings))return;const decision=clearLocalDecision({hadDEM:!!localDEM,hadBuildings:!!localBuildings});localDEM=null;localBuildings=null;$('#local-dem').value='';$('#local-buildings').value='';if(decision==='buildings')buildingSourceDirty=true;else{sourceDirty=true;buildingSourceDirty=true;}localDataInfo();buildingControls();if(decision==='buildings')requestBuildingsAuto('Edificis pendents d’actualitzar');else requireBuild('Fonts pendents d’actualitzar');};
function rotateSelection(value){if(busy||pendingVegetation)return;rotationAngle=Math.max(-90,Math.min(90,value));placeMap.setRotation(rotationAngle);$('#rotation-value').textContent=rotationAngle===0?'Nord a dalt':`Retall girat ${Math.abs(rotationAngle)}° a ${rotationAngle<0?'l’esquerra':'la dreta'}`;requireBuild('Orientació pendent de generar');}
$('#rotate-left').onclick=()=>rotateSelection(rotationAngle-15);$('#rotate-right').onclick=()=>rotateSelection(rotationAngle+15);$('#rotation-north').onclick=()=>rotateSelection(0);
$('#model-scale').oninput=applyScale;$('#model-scale').onchange=()=>{if(!invalidScale)$('#model-scale').value=targetScale?'1:'+targetScale:'';};
document.querySelectorAll('.section-toggle').forEach(button=>button.onclick=()=>{
  const opening=button.getAttribute('aria-expanded')!=='true',vegetationOpen=$('#config-toggle-4').getAttribute('aria-expanded')==='true';
  if(vegetationOpen&&(button.id==='config-toggle-4'?!opening:opening))endVegetationEditing();
  for(const toggle of document.querySelectorAll('.section-toggle')){const open=toggle===button&&opening;toggle.setAttribute('aria-expanded',String(open));toggle.closest('.config-section').classList.toggle('is-open',open);toggle.querySelector('i').textContent=open?'−':'+';document.getElementById(toggle.getAttribute('aria-controls')).hidden=!open;}
});
$('#exag').oninput=()=>{$('#exag-value').textContent='×'+Number($('#exag').value).toLocaleString('ca');requireBuild('Relleu pendent de generar');};$('#detail').onchange=()=>requireBuild('Detall pendent de generar');$('#road-rise').onchange=()=>requireBuild('Relleu dels camins pendent de generar');$('#building-source').onchange=()=>{buildingSourceExplicit=true;buildingSourceDirty=true;if(localBuildings){localBuildings=null;$('#local-buildings').value='';localDataInfo();}buildingControls();requestBuildingsAuto('Capa d’edificis pendent d’actualitzar');};
function buildingControls(){sourceSummary();$('#building-source-hint').textContent=$('#building-source').value==='catastre'?'Parts i altures estimades · menys de 4 km². Sense dades de teulada.':'';const mode=$('#building-mode').value;$('#building-height').disabled=mode!=='limited';$('#building-mode-hint').textContent=({limited:'Coberta plana sobre el punt més alt de la petjada; al costat baix es pot veure més façana.',source:localBuildings?'Forma, altura i direcció de coberta quan el fitxer les aporta. Si falten, es conserva una coberta plana.':'Aquesta font aporta altures, però no formes de teulada: les cobertes es mantenen planes.',flat:'Petjades de color, sense volum.',none:'Es conserva el relleu actual; no es reconstrueix el paisatge històric.'})[mode];}
$('#building-mode').onchange=()=>{buildingControls();requestBuildingsAuto('Edificis pendents de generar');};$('#building-height').oninput=()=>{buildingControls();requestBuildingsAuto('Altura dels edificis pendent de generar');};
$('#material-count').onchange=()=>{materialCount=Number($('#material-count').value);assignments=defaultAssignments(materialCount);recolor();};
$('#density').oninput=()=>{$('#density-value').textContent='×'+Number($('#density').value).toLocaleString('ca');};$('#trees').onchange=updateTrees;$('#tree-type').onchange=updateTrees;
for(const [id,format]of [['export-3mf','bambu'],['export-standard','3mf'],['export-stl','stl']])$('#'+id).onclick=()=>{job='export';lock(true);say(t('status.exporting'));worker.postMessage({type:'export',format,materialCount,assignments,split:$('#split-tiles').checked});};
function editButtons(){$('#undo-brush').disabled=$('#clear-brush').disabled=!strokes.length||busy||pendingVegetation||drawing;}
$('#undo-brush').onclick=()=>{strokes=withoutLastGesture(strokes);editButtons();updateTrees();};$('#clear-brush').onclick=()=>{strokes=[];editButtons();updateTrees();};$('#brush-radius').oninput=()=>$('#brush-value').textContent=$('#brush-radius').value+' mm';
function setBrush(button){if(!button)return;finishStroke();brush=button.dataset.brush;controls.enabled=brush==='navigate';document.querySelectorAll('[data-brush]').forEach(x=>{x.classList.toggle('selected',x===button);x.setAttribute('aria-pressed',String(x===button));});$('#viewer-hint').textContent=brush==='navigate'?'Arrossega per girar · Roda per apropar · Botó dret per desplaçar':'Fes clic o arrossega sobre el terreny · Desfés per anul·lar un traç';$('#brush-cursor').hidden=true;}
function selectNavigate(){setBrush(document.querySelector('[data-brush="navigate"]'));}
function endVegetationEditing(){finishStroke();if(brush!=='navigate')selectNavigate();else $('#brush-cursor').hidden=true;}
document.querySelectorAll('[data-brush]').forEach(b=>b.onclick=()=>setBrush(b));
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
function paint(e){if(brush==='navigate'||!model||busy||needsBuild||pendingVegetation&&!drawing||!$('#trees').checked||model.provenance.treeRepresentation?.omittedBelowThreshold)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(group.children.filter(o=>['terrain','forest','grass'].includes(o.name)));const cursor=$('#brush-cursor');cursor.hidden=!hits.length;if(!hits.length)return;const p=hits[0].point,radius=Number($('#brush-radius').value),screen=p.clone().project(camera),edge=p.clone().add(new THREE.Vector3(radius,0,0)).project(camera);const diameter=Math.max(8,Math.abs(edge.x-screen.x)*rect.width);Object.assign(cursor.style,{left:(e.clientX-rect.left)+'px',top:(e.clientY-rect.top)+'px',width:diameter+'px',height:diameter+'px'});cursor.classList.toggle('erase',brush==='erase');if(!drawing)return;const x=p.x+model.width/2,y=p.y+model.height/2;if(lastPoint&&Math.hypot(x-lastPoint.x,y-lastPoint.y)<radius*.45)return;strokes.push({mode:brush,x,y,radius,gesture,density:Number($('#density').value)});lastPoint={x,y};updateTrees();}
function finishStroke(){if(!drawing)return;drawing=false;lastPoint=null;if(pendingVegetation)updateTrees();else lock(busy);}
renderer.domElement.addEventListener('pointerdown',e=>{if(brush!=='navigate'&&e.button===0&&!busy&&!pendingVegetation&&!needsBuild&&model&&$('#trees').checked&&!model.provenance.treeRepresentation?.omittedBelowThreshold){drawing=true;gesture++;lastPoint=null;renderer.domElement.setPointerCapture(e.pointerId);paint(e);}});renderer.domElement.addEventListener('pointermove',paint);renderer.domElement.addEventListener('pointerup',finishStroke);renderer.domElement.addEventListener('pointercancel',finishStroke);renderer.domElement.addEventListener('lostpointercapture',finishStroke);renderer.domElement.addEventListener('pointerleave',()=>$('#brush-cursor').hidden=true);
initI18n();initDialogs();
$('#release-list').innerHTML=[['0.15.1','Rajadell es conserva en retalls ampliats o desplaçats: els detalls del pont es carreguen per ubicació, també fora del botó d’exemple. Memòria cau acotada i reintent de lectures fallides. Generalització procedimental en curs.'],['0.15.0','Pilars simplificats que eviten camins i edificis, i enllaços suaus del viaducte amb la carretera. Conjunt unit abans de mostrar-lo i exportar-lo. Realç opcional dels camins de 0,5 o 1 mm de maqueta. Suports i enllaços estimats, pendents de laminat.'],['0.14.0','Primer viaducte amb superfície 3D de l’ICGC a la mostra de Manresa, separada del terreny i conservada al 3MF. Gruix simplificat, sense pilars mesurats. Llibre d’estil per a contribucions i tasques delegades. Túnel pendent de dades suficients.'],['0.13.1','Base corregida: la cota més baixa del relleu queda a 5 mm. Es conserven el desnivell, l’exageració i una referència vertical comuna a totes les capes. A la costa, el mar també queda a 5 mm.'],['0.13.0','Catastre amb consultes per quadrants i recuperació de la font anterior en fallar. Sidebars homogenis, marc coherent amb la seva exportació i sense canvis de zoom. Viaducte de l’Eix Diagonal com a mostra inicial, Tamariu al catàleg. Fletxa del nord retirada i rosa ajornada.'],['0.12.0','Vista de presentació amb taula i llum, render a demanda i retorn al taller. Fonts remotes amb resum clar i fitxers propis dins d’opcions avançades. Proves de sòlids per preparar infraestructures; ponts i coves reals pendents.'],['0.11.0','Catastre buit vàlid, pinzell amb cobertura per gest i retorn a navegació, edificis automàtics i complements independents: marc, placa educativa i fletxa del nord. Cobertes reals en estudi.'],['0.10.0','Catastre amb espera i reintent fitats, errors entenedors i model conservat en fallar. Preparació del sistema d’idiomes, només amb català disponible. Propostes de marc imprimible, etiquetes, rosa dels vents i escena realista.'],['0.9.0','Pinzell aleatori, fonts d’edificis explícites i parts del Catastre. Edificis actualitzats sense reconstruir terreny, i primeres cobertes amb atributs de la font.'],['0.8.0','Vegetació repartida per tota la zona verda, pinzell amb prioritat al límit, densitat per traç i exportació sense selectors de broquet ni tipus de filament. Estudi de parts d’edificis, cobertes, ponts i túnels.'],['0.7.0','Sidebars reorganitzats, escala en un sol camp, orientació al mapa, arbres proporcionats a l’escala i límits de càrrega coherents. Historial de tasques validades separat.'],['0.6.0','Menús sempre visibles amb scroll intern, estadístiques al sidebar, V4V i favicon, transicions, marc visual, retall girat, opcions de filament/broquet i importació local GeoTIFF/GeoJSON.'],['0.5.0','Apartats replegables, controls dins del preview i selecció per escala horitzontal fixa. Diagnòstic dels blocs d’edificis de Tamariu.'],['0.4.2','Lectura numèrica directa del relleu WebP/PNG, sense canvas, i diagnòstics de les tessel·les per investigar els pics intermitents.'],['0.4.1','Cobertes horitzontals: el límit d’altura es mesura sobre el punt més alt del terreny dins de la petjada.'],['0.4.0','Camins amb unions arrodonides, edificis limitats a 5 m per defecte o sense volum, i pinzell amb indicador de treball i un càlcul per traç.'],['0.3.0','Mapa i cerca de llocs, layout d’escriptori estable, 1–8 materials, vegetació editable i exportació en peces.'],['0.2.0','Edificis ICGC, relleu corregit, capçades variades i exportació per a Bambu Studio.'],['0.1.0','Primera maqueta de Tamariu generada al navegador amb costa vectorial i exportació 3D.']].map(([v,text])=>`<article class="release-entry"><div><strong>v${v}</strong><time>${['0.15.1','0.15.0','0.14.0','0.13.1','0.13.0','0.12.0','0.11.0'].includes(v)?'02/11/2026':v==='0.1.0'?'31/10/2026':'01/11/2026'}</time></div><p>${text}</p></article>`).join('');
$('#copy-lightning').onclick=async()=>{try{await navigator.clipboard.writeText('aptswim903@walletofsatoshi.com');$('#copy-status').textContent='Adreça copiada';}catch{$('#copy-status').textContent='Selecciona i copia l’adreça.';}};
accessoryUI=initAccessoryUI({onFrameChange:updateFrame,onDownload:(kind,options)=>{if(busy||needsBuild||pendingVegetation||!model)return;job='accessory';lock(true);say('Preparant el complement independent…');worker.postMessage({type:'accessory',kind,options});}});
legend();tiling();buildingControls();scaleHint();generate(DEFAULT_PLACE);
