import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPresentationMode} from '../src/presentation-scene.js';

const model={width:100,height:80};

test('nou model reajusta també les llums i la capsa de les ombres',()=>{
  const f=fixture();f.mode.enter(model);f.mode.refreshBounds({width:400,height:150});
  assert.equal(f.light.shadow.camera.right,480);assert.deepEqual(f.light.position.toArray(),[-320,-280,640]);
  const fill=f.scene.children.find(o=>o.isDirectionalLight&&o!==f.light);assert.deepEqual(fill.position.toArray(),[360,320,200]);f.mode.exit();
});
test('reemplaçar costures encara presents restaura també el préstec anterior',()=>{
  const f=fixture(),old=makeSeams(f.scene),next=makeSeams(f.scene);f.setSeams(old);f.mode.enter(model);
  f.setSeams(next);f.mode.refreshBounds(model);assert(old.visible);assert(!next.visible);f.mode.exit();assert(next.visible);
});
test('un error del renderer en sortir no deixa recursos propis ni mode actiu',()=>{
  const f=fixture(),baseline=new Set(f.scene.children),position=f.camera.position.clone();f.mode.enter(model);
  f.renderer.setPixelRatio=()=>{throw Error('renderer');};assert.throws(()=>f.mode.exit(),/renderer/);
  assert(!f.mode.isActive());assert.equal(ownChildren(f.scene,baseline).length,0);assert(f.ground.visible);assert(f.camera.position.equals(position));f.mode.dispose();
});

function fixture(){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,6000);
  camera.up.set(0,0,1);
  camera.position.set(150,-220,180);
  camera.lookAt(0,0,0);
  const renderer={pixelRatio:3,getPixelRatio(){return this.pixelRatio;},setPixelRatio(v){this.pixelRatio=v;},shadowMap:{enabled:true}};
  const controls={target:new THREE.Vector3(5,-7,3),minDistance:35,maxDistance:2200,minPolarAngle:0,maxPolarAngle:Math.PI*.49,update(){}};
  const light=new THREE.DirectionalLight(0xfff6df,3.3);
  light.position.set(-170,-160,400);
  light.castShadow=true;
  light.shadow.mapSize.set(2048,2048);
  Object.assign(light.shadow.camera,{left:-350,right:350,top:350,bottom:-350,far:1200});
  scene.add(light);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(2500,2500),new THREE.ShadowMaterial({opacity:.13}));
  scene.add(ground);
  const group=new THREE.Group();
  group.position.set(-50,-40,0);
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(100,80,10),new THREE.MeshStandardMaterial({color:0x123456}));
  mesh.name='terrain';
  group.add(mesh);
  scene.add(group);
  let seams=null,frame=null;
  const calls=[];
  const mode=createPresentationMode({scene,camera,renderer,controls,group,light,ground,
    getSeams:()=>seams,getFrame:()=>frame,
    onReset:()=>calls.push('reset'),onStatus:s=>calls.push(s)});
  return {scene,camera,renderer,controls,light,ground,group,mesh,mode,calls,setSeams:v=>{seams=v;},setFrame:v=>{frame=v;}};
}

function makeSeams(scene){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,1,1],3));
  const seams=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x466c4a}));
  scene.add(seams);
  return seams;
}

// Recursos propis del mode: fills de l’escena afegits després de la línia base.
function ownChildren(scene,baseline){
  return scene.children.filter(c=>!baseline.has(c));
}

function sceneState({scene,camera,renderer,controls,light,ground}){
  return {
    background:scene.background,
    groundVisible:ground.visible,
    lightPosition:light.position.toArray(),
    lightIntensity:light.intensity,
    lightTarget:light.target.position.toArray(),
    shadowCamera:[light.shadow.camera.left,light.shadow.camera.right,light.shadow.camera.top,light.shadow.camera.bottom,light.shadow.camera.far],
    mapSize:light.shadow.mapSize.toArray(),
    pixelRatio:renderer.getPixelRatio(),
    shadowsEnabled:renderer.shadowMap.enabled,
    cameraPosition:camera.position.toArray(),
    cameraUp:camera.up.toArray(),
    cameraQuaternion:camera.quaternion.toArray(),
    cameraZoom:camera.zoom,cameraFov:camera.fov,cameraNear:camera.near,cameraFar:camera.far,
    controlsTarget:controls.target.toArray(),
    controlsLimits:[controls.minDistance,controls.maxDistance,controls.minPolarAngle,controls.maxPolarAngle],
  };
}

test('enter/exit restaura tot l’estat tocat i elimina els recursos propis',()=>{
  const f=fixture(),before=sceneState(f),meshGeometry=f.mesh.geometry,meshMaterial=f.mesh.material;
  f.setSeams(makeSeams(f.scene));
  const frame=new THREE.Mesh(new THREE.BoxGeometry(120,100,2),new THREE.MeshBasicMaterial());
  f.scene.add(frame);
  f.setFrame(frame);
  const baseline=new Set(f.scene.children);
  assert.equal(f.mode.enter(model),true);
  assert.equal(f.mode.isActive(),true);
  // Estat modificat dins del mode
  assert(f.scene.background instanceof THREE.Color);
  assert.equal(f.ground.visible,false);
  assert.equal(f.renderer.getPixelRatio(),2); // pixelRatio limitat a 2
  assert.notDeepEqual(f.light.position.toArray(),before.lightPosition);
  assert.notDeepEqual(f.camera.position.toArray(),before.cameraPosition);
  assert.deepEqual(f.light.shadow.mapSize.toArray(),[2048,2048]); // mapa d’ombres intacte, ≤2048
  const own=ownChildren(f.scene,baseline);
  assert.equal(own.length,2,'només taula i llum de farciment');
  const table=own.find(o=>o.isMesh);
  assert(table,'la taula existeix');
  assert.deepEqual(table.position.toArray(),[0,0,-10]); // gruix 20 mm, cara superior a Z=0
  table.geometry.computeBoundingBox();
  const size=new THREE.Vector3();table.geometry.boundingBox.getSize(size);
  assert.deepEqual(size.toArray(),[200,160,20]); // amplada/alçada ×2, gruix 20
  const fill=own.find(o=>o.isDirectionalLight);
  assert(fill&&!fill.castShadow,'una sola llum de farciment pròpia sense ombres');
  assert.equal(f.mode.exit(),true);
  assert.equal(f.mode.isActive(),false);
  assert.deepEqual(sceneState(f),before); // restauració exacta de tot l’estat
  assert.equal(ownChildren(f.scene,baseline).length,0); // taula i farciment fora
  assert.equal(f.mesh.geometry,meshGeometry); // geometria prestada intacta, sense dispose
  assert.equal(f.mesh.material,meshMaterial);
  assert(f.mesh.geometry.attributes.position.count>0);
});

test('enter/exit/dispose són idempotents i no dupliquen recursos propis',()=>{
  const f=fixture(),baseline=new Set(f.scene.children);
  assert.equal(f.mode.enter(model),true);
  assert.equal(f.mode.enter(model),false); // segona entrada sense efecte
  assert.equal(ownChildren(f.scene,baseline).length,2); // taula + farciment, un de cada
  assert.equal(f.mode.exit(),true);
  assert.equal(f.mode.exit(),false); // segona sortida sense efecte
  f.mode.dispose();f.mode.dispose(); // repetible sense error
  assert.throws(()=>f.mode.enter(model),/alliberat/);
});

test('error durant enter reverteix tot l’estat modificat i no deixa recursos propis',()=>{
  const f=fixture(),before=sceneState(f);
  f.setSeams(makeSeams(f.scene));
  const baseline=new Set(f.scene.children);
  f.controls.update=()=>{throw new Error('fallada simulada');};
  assert.throws(()=>f.mode.enter(model),/fallada simulada/);
  assert.equal(f.mode.isActive(),false);
  assert.deepEqual(sceneState(f),before);
  assert.equal(ownChildren(f.scene,baseline).length,0);
  assert.equal(f.calls.filter(c=>c==='enter').length,0);
  // Després de la fallada es pot tornar a entrar netament
  f.controls.update=()=>{};
  assert.equal(f.mode.enter(model),true);
  assert.equal(f.mode.exit(),true);
  assert.deepEqual(sceneState(f),before);
});

test('dimensions invàlides fallen abans de tocar l’escena',()=>{
  const f=fixture(),before=sceneState(f);
  assert.throws(()=>f.mode.enter({width:0,height:80}),/no vàlides/);
  assert.throws(()=>f.mode.enter({width:100,height:Number.NaN}),/no vàlides/);
  assert.throws(()=>f.mode.enter(null),/no vàlides/);
  assert.deepEqual(sceneState(f),before);
  assert.equal(f.mode.isActive(),false);
});

test('refreshBounds escala la taula al nou model sense tocar group ni el model',()=>{
  const f=fixture(),groupPosition=f.group.position.clone(),meshGeometry=f.mesh.geometry;
  const fresh={width:200,height:150};
  const baseline=new Set(f.scene.children);
  f.mode.enter(model);
  const firstTable=ownChildren(f.scene,baseline).find(o=>o.isMesh);
  let disposed=false;
  firstTable.geometry.addEventListener('dispose',()=>{disposed=true;});
  assert.equal(f.mode.refreshBounds(fresh),true);
  assert(disposed,'la geometria pròpia vella s’allibera');
  const table=ownChildren(f.scene,baseline).find(o=>o.isMesh);
  table.geometry.computeBoundingBox();
  const size=new THREE.Vector3();table.geometry.boundingBox.getSize(size);
  assert.deepEqual(size.toArray(),[400,300,20]);
  assert.deepEqual(table.position.toArray(),[0,0,-10]);
  assert.deepEqual(fresh,{width:200,height:150},'el model no es muta');
  assert(f.group.position.equals(groupPosition),'group no es mou');
  assert.equal(f.mesh.geometry,meshGeometry);
  f.mode.exit();
});

test('refreshBounds incremental conserva la instantània; reset complet la invalida i exit crida onReset',()=>{
  const f=fixture(),before=sceneState(f);
  f.mode.enter(model);
  f.mode.refreshBounds({width:150,height:120}); // incremental: conserva vista i instantània
  f.mode.exit();
  assert.deepEqual(sceneState(f),before); // càmera del Taller restaurada exactament
  assert(!f.calls.includes('reset'));
  // Regeneració completa: la instantània antiga ja no és vàlida
  f.mode.enter(model);
  f.mode.refreshBounds({width:150,height:120},{resetCamera:true});
  const cameraAfterRefresh=f.camera.position.toArray();
  f.mode.exit();
  assert(f.calls.includes('reset'),'exit crida onReset (home) sense instantània');
  assert.deepEqual(f.camera.position.toArray(),cameraAfterRefresh); // la càmera no torna a la vista antiga
  assert.equal(f.scene.background,before.background); // la resta d’estat sí que es restaura
  assert.equal(f.ground.visible,before.groundVisible);
});

test('costures: s’amaguen en entrar, es restaura només l’objecte viu i es segueix el reemplaçament',()=>{
  const f=fixture();
  const oldSeams=makeSeams(f.scene);
  f.setSeams(oldSeams);
  f.mode.enter(model);
  assert.equal(oldSeams.visible,false);
  // display() substitueix les costures: la vella surt de l’escena, la nova és visible
  f.scene.remove(oldSeams);
  const newSeams=makeSeams(f.scene);
  f.setSeams(newSeams);
  f.mode.refreshBounds(model);
  assert.equal(newSeams.visible,false,'les costures noves també s’amaguen');
  f.mode.exit();
  assert.equal(newSeams.visible,true,'les costures vives es restauren');
  assert.equal(oldSeams.visible,false,'l’objecte mort substituït no es toca');
  // Sense costures (getSeams null) tot funciona igual
  const g=fixture();
  g.mode.enter(model);
  g.mode.refreshBounds(model);
  assert.equal(g.mode.exit(),true);
});

test('el marc es respecta tal qual i la taula no altera materials ni coordenades del grup',()=>{
  const f=fixture();
  const frame=new THREE.Mesh(new THREE.BoxGeometry(220,180,2),new THREE.MeshBasicMaterial());
  f.scene.add(frame);
  f.setFrame(frame);
  const colors=f.group.children.map(m=>m.material.color.getHex());
  f.mode.enter(model);
  assert.equal(frame.visible,true,'el marc real es manté visible');
  f.mode.refreshBounds({width:200,height:150});
  f.mode.exit();
  assert.deepEqual(f.group.children.map(m=>m.material.color.getHex()),colors);
  assert.equal(frame.visible,true);
});

test('dispose en mode actiu restaura l’escena i allibera només recursos propis',()=>{
  const f=fixture(),before=sceneState(f),meshGeometry=f.mesh.geometry;
  const baseline=new Set(f.scene.children);
  f.mode.enter(model);
  const table=ownChildren(f.scene,baseline).find(o=>o.isMesh);
  let disposedCount=0;
  table.geometry.addEventListener('dispose',()=>{disposedCount++;});
  f.mode.dispose();
  assert.equal(f.mode.isActive(),false);
  assert.deepEqual(sceneState(f),before);
  assert.equal(disposedCount,1);
  assert.equal(f.mesh.geometry,meshGeometry);
  assert(f.mesh.geometry.attributes.position.count>0,'la geometria prestada mai es fa dispose');
});
