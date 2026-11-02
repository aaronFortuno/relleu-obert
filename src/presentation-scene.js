import * as THREE from 'three';

const TABLE_COLOR=0xb98a5e,BACKGROUND_COLOR=0xe9e7e2,FILL_COLOR=0xffffff,FILL_INTENSITY=1.2;
const TABLE_THICKNESS=20,CAMERA_DIRECTION=new THREE.Vector3(.7,-1,.55).normalize();

// Mode «Presentació»: reorganitza l'escena existent (mateixes malles de `group`,
// mai clonades ni alliberades) i la restaura en sortir. Nucli sense UI; la
// integració amb main.js, render a demanda i pèrdua de context queda fora.
export function createPresentationMode({scene,camera,renderer,controls,group,light,ground,getSeams,getFrame,onReset,onStatus}){
  if(!scene||!camera||!renderer||!controls||!group)throw new Error('createPresentationMode: calen scene, camera, renderer, controls i group');
  const seamsOf=typeof getSeams==='function'?getSeams:()=>null;
  const frameOf=typeof getFrame==='function'?getFrame:()=>null;
  let active=false,disposed=false,snapshot=null,cameraSnapshot=null,seamsRecord=null,table=null,fill=null;

  const validate=model=>{
    if(!model||!Number.isFinite(model.width)||!Number.isFinite(model.height)||model.width<=0||model.height<=0)
      throw new Error('Mode presentació: dimensions del model no vàlides');
  };
  const ownChildren=()=>[table,fill].filter(Boolean);

  function snapshotState(){
    snapshot={
      background:scene.background,
      groundVisible:ground?ground.visible:null,
      lightPosition:light?light.position.clone():null,
      lightIntensity:light?light.intensity:null,
      lightTarget:light?light.target.position.clone():null,
      shadowCamera:light?{left:light.shadow.camera.left,right:light.shadow.camera.right,top:light.shadow.camera.top,bottom:light.shadow.camera.bottom,near:light.shadow.camera.near,far:light.shadow.camera.far}:null,
      pixelRatio:renderer.getPixelRatio(),
      shadowsEnabled:renderer.shadowMap.enabled,
      controls:{
        target:controls.target.clone(),
        minDistance:controls.minDistance,maxDistance:controls.maxDistance,
        minPolarAngle:controls.minPolarAngle,maxPolarAngle:controls.maxPolarAngle,
      },
    };
    cameraSnapshot={
      position:camera.position.clone(),
      up:camera.up.clone(),
      quaternion:camera.quaternion.clone(),
      zoom:camera.zoom,fov:camera.fov,near:camera.near,far:camera.far,
    };
  }

  function boundsSphere(){
    const bounds=new THREE.Box3().setFromObject(group),frame=frameOf();
    if(frame)bounds.union(new THREE.Box3().setFromObject(frame));
    return bounds.isEmpty()?new THREE.Sphere(new THREE.Vector3(0,0,10),110):bounds.getBoundingSphere(new THREE.Sphere());
  }

  function placeCamera(){
    const sphere=boundsSphere();
    const distance=sphere.radius/Math.sin(THREE.MathUtils.degToRad(camera.fov)/2)*1.15/Math.min(1,camera.aspect);
    camera.zoom=1;
    camera.position.copy(CAMERA_DIRECTION).multiplyScalar(distance).add(sphere.center);
    camera.lookAt(sphere.center);
    camera.updateProjectionMatrix();
    controls.target.copy(sphere.center);
    controls.update?.();
  }

  function sizeTable(model){
    if(table&&table.geometry.parameters.width===model.width*2&&table.geometry.parameters.height===model.height*2)return;
    const geometry=new THREE.BoxGeometry(model.width*2,model.height*2,TABLE_THICKNESS);
    if(table){table.geometry.dispose();table.geometry=geometry;}
    else{
      table=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:TABLE_COLOR,roughness:.9}));
      table.receiveShadow=true;
      scene.add(table);
    }
    table.position.set(0,0,-TABLE_THICKNESS/2);
  }

  function updateLighting(model){
    const size=Math.max(model.width,model.height);
    if(light){light.position.set(-size*.8,-size*.7,size*1.6);light.target.position.set(0,0,0);Object.assign(light.shadow.camera,{left:-size*1.2,right:size*1.2,top:size*1.2,bottom:-size*1.2});light.shadow.camera.updateProjectionMatrix();}
    fill?.position.set(size*.9,size*.8,size*.5);
  }

  function restoreSeams(){
    if(seamsRecord&&seamsRecord.object.parent)seamsRecord.object.visible=seamsRecord.visible;
    seamsRecord=null;
  }

  function disposeOwn(){
    if(table){scene.remove(table);table.geometry.dispose();table.material.dispose();table=null;}
    if(fill){scene.remove(fill);fill.dispose?.();fill=null;}
  }

  function restoreState({updateControls=true}={}){
    if(!snapshot)return;
    let restoreError;
    scene.background=snapshot.background;
    if(ground&&snapshot.groundVisible!==null)ground.visible=snapshot.groundVisible;
    restoreSeams();
    if(light){
      light.position.copy(snapshot.lightPosition);
      light.intensity=snapshot.lightIntensity;
      light.target.position.copy(snapshot.lightTarget);
      Object.assign(light.shadow.camera,snapshot.shadowCamera);
      light.shadow.camera.updateProjectionMatrix();
    }
    try{renderer.setPixelRatio(snapshot.pixelRatio);}catch(e){restoreError=e;}
    renderer.shadowMap.enabled=snapshot.shadowsEnabled;
    controls.target.copy(snapshot.controls.target);
    controls.minDistance=snapshot.controls.minDistance;
    controls.maxDistance=snapshot.controls.maxDistance;
    controls.minPolarAngle=snapshot.controls.minPolarAngle;
    controls.maxPolarAngle=snapshot.controls.maxPolarAngle;
    if(updateControls){const damping=controls.enableDamping;controls.enableDamping=false;try{controls.update?.();}catch(e){restoreError??=e;}finally{controls.enableDamping=damping;}}
    if(cameraSnapshot){
      camera.position.copy(cameraSnapshot.position);
      camera.up.copy(cameraSnapshot.up);
      camera.quaternion.copy(cameraSnapshot.quaternion);
      camera.zoom=cameraSnapshot.zoom;
      camera.fov=cameraSnapshot.fov;
      camera.near=cameraSnapshot.near;
      camera.far=cameraSnapshot.far;
      camera.updateProjectionMatrix();
    }else onReset?.();
    snapshot=null;
    if(restoreError)throw restoreError;
  }

  function hideSeams(){
    const seams=seamsOf();
    if(seams===seamsRecord?.object){if(seams)seams.visible=false;return;}
    restoreSeams();
    seamsRecord=seams?{object:seams,visible:seams.visible}:null;
    if(seams)seams.visible=false;
  }

  function enter(model){
    if(disposed)throw new Error('Mode presentació alliberat');
    if(active)return false;
    validate(model);
    snapshotState();
    try{
      scene.background=new THREE.Color(BACKGROUND_COLOR);
      if(ground)ground.visible=false;
      hideSeams();
      const size=Math.max(model.width,model.height);
      if(light){
        light.position.set(-size*.8,-size*.7,size*1.6);
        light.target.position.set(0,0,0);
        Object.assign(light.shadow.camera,{left:-size*1.2,right:size*1.2,top:size*1.2,bottom:-size*1.2});
        light.shadow.camera.updateProjectionMatrix();
      }
      renderer.setPixelRatio(Math.min(renderer.getPixelRatio(),2));
      fill=new THREE.DirectionalLight(FILL_COLOR,FILL_INTENSITY);
      fill.position.set(size*.9,size*.8,size*.5);
      fill.castShadow=false;
      scene.add(fill);
      sizeTable(model);
      placeCamera();
    }catch(error){
      try{restoreState({updateControls:false});}finally{disposeOwn();cameraSnapshot=null;}
      throw error;
    }
    active=true;
    onStatus?.('enter');
    return true;
  }

  function exit(){
    if(!active)return false;
    try{restoreState();}finally{disposeOwn();active=false;snapshot=null;}
    onStatus?.('exit');
    return true;
  }

  function refreshBounds(model,{resetCamera=false}={}){
    if(!active||disposed)return false;
    validate(model);
    updateLighting(model);
    sizeTable(model);
    hideSeams();
    if(resetCamera){
      cameraSnapshot=null;
      placeCamera();
    }
    onStatus?.('refresh');
    return true;
  }

  function dispose(){
    if(disposed)return;
    if(active)exit();
    disposeOwn();
    snapshot=null;
    cameraSnapshot=null;
    seamsRecord=null;
    disposed=true;
  }

  return {enter,exit,refreshBounds,isActive:()=>active,dispose};
}
