import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadRegion} from './sources.js';
import './style.css';
const $=s=>document.querySelector(s),view=$('#viewport'),status=$('#status'),worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
let region,model,busy=false,currentSample=true;
function say(message,error=false){status.textContent=message;status.classList.toggle('error',error);}
function lock(value){busy=value;for(const id of ['generate','sample','live','export-3mf','export-standard','export-stl','building-source'])$('#'+id).disabled=value||(!model&&id.startsWith('export'));}
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,3000);camera.up.set(0,0,1);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;view.appendChild(renderer.domElement);}catch{say('Aquest navegador no ha pogut iniciar la vista 3D. Prova un navegador amb WebGL.',true);throw Error('WebGL no disponible');}
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=70;controls.maxDistance=900;
scene.add(new THREE.HemisphereLight(0xffffff,0x798269,2.5));const light=new THREE.DirectionalLight(0xfff6df,3.3);light.position.set(-110,-80,250);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-200;light.shadow.camera.right=200;light.shadow.camera.top=200;light.shadow.camera.bottom=-200;light.shadow.normalBias=.2;scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.ShadowMaterial({opacity:.13}));ground.position.z=-.5;ground.receiveShadow=true;scene.add(ground);let group=new THREE.Group();scene.add(group);
const home=()=>{const bounds=new THREE.Box3().setFromObject(group),sphere=bounds.isEmpty()?new THREE.Sphere(new THREE.Vector3(0,0,10),110):bounds.getBoundingSphere(new THREE.Sphere());const distance=sphere.radius/Math.sin(THREE.MathUtils.degToRad(camera.fov)/2)*1.15/Math.min(1,camera.aspect);camera.zoom=1;camera.updateProjectionMatrix();controls.target.copy(sphere.center);camera.position.copy(new THREE.Vector3(.75,-1,.85).normalize().multiplyScalar(distance).add(sphere.center));controls.update();};home();
const resize=new ResizeObserver(()=>{const w=view.clientWidth,h=view.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();});resize.observe(view);
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
function display(m){
  scene.remove(group);group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});group=new THREE.Group();
  for(const p of m.parts){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(p.vertices,3));geometry.setIndex(new THREE.BufferAttribute(p.faces,1));geometry.computeVertexNormals();const material=new THREE.MeshStandardMaterial({color:p.color,roughness:.85,metalness:0,flatShading:true});const mesh=new THREE.Mesh(geometry,material);mesh.name=p.id;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
  group.position.set(-m.width/2,-m.height/2,0);scene.add(group);home();
  $('#export-3mf').textContent=`3MF per a Bambu · ${m.parts.length} material${m.parts.length===1?'':'s'}`;
  document.querySelectorAll('[data-layer]').forEach(b=>{const exists=m.parts.some(p=>p.id===b.dataset.layer);b.disabled=!exists;b.classList.remove('off');});
  $('#metrics').innerHTML=`<div><strong>${m.width.toFixed(0)} × ${m.height.toFixed(0)} mm</strong>Mida de la peça</div><div><strong>1:${m.scale.toLocaleString('ca')}</strong>Escala horitzontal</div><div><strong>${m.treeCount.toLocaleString('ca')}</strong>Volums de vegetació</div><div><strong>${m.parts.length}</strong>Materials</div>`;
  const list=document.createElement('ul');for(const text of m.warnings){const li=document.createElement('li');li.textContent=text;list.appendChild(li);}$('#warnings').replaceChildren(list);
}
function generate(){if(!region||busy)return;lock(true);say('Construint la maqueta al teu navegador…');worker.postMessage({type:'build',region,options:{size:Number($('#size').value),exaggeration:Number($('#exag').value),trees:$('#trees').checked,density:Number($('#density').value),resolution:Number($('#detail').value)}});}
worker.onmessage=({data})=>{
  if(data.type==='progress')say(data.message);
  if(data.type==='model'){model=data.model;display(model);lock(false);say(`Maqueta preparada · ${model.triangles.toLocaleString('ca')} triangles · revisa les limitacions abans d’imprimir.`);}
  if(data.type==='error'){lock(false);say(data.message,true);console.error(data.detail);}
  if(data.type==='download'){const blob=new Blob([data.bytes],{type:data.format==='stl'?'application/zip':'model/3mf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`relleu-obert-${data.format==='stl'?'stl.zip':data.format==='bambu'?'bambu.3mf':'model.3mf'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);lock(false);say(data.format==='bambu'?'Fitxer amb assignacions de material. Obre’l com a projecte i revisa els filaments i el laminat.':'Fitxer preparat. Importa les parts juntes i assigna els filaments al laminador.');}
};
worker.onerror=e=>{lock(false);say('No s’ha pogut generar la maqueta: '+e.message,true);};
async function load(sample=true){
  if(busy)return;lock(true);say('Carregant el territori…');let bbox;
  try{
    if(!sample){const lat=Number($('#lat').value),lon=Number($('#lon').value),span=Number($('#span').value);if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(span)||Math.abs(lat)>70||Math.abs(lon)>179.8||span<.3||span>3)throw Error('Introdueix coordenades vàlides (latitud entre −70 i 70) i una amplada de 0,3 a 3 km.');const dy=span/2/111.32,dx=dy/Math.cos(lat*Math.PI/180);bbox=[lon-dx,lat-dy,lon+dx,lat+dy];}
    const next=await loadRegion({sample,bbox,buildingSource:$('#building-source').value},say);region=next;currentSample=sample;$('#location').textContent=region.meta.name;$('#sample').classList.toggle('active',sample);$('#building-info').textContent=region.meta.buildings.officialCount?`ICGC: ${region.meta.buildings.officialCount} elements oficials; ${region.meta.buildings.osmRetained} fragments OSM complementaris.`:region.meta.sourceWarnings.find(w=>w.includes('edificis ICGC'))||'Edificis d’OpenStreetMap via OpenFreeMap.';lock(false);generate();
  }catch(e){lock(false);say(e.message,true);}
}
$('#size').oninput=()=>$('#size-value').textContent=$('#size').value+' mm';$('#exag').oninput=()=>$('#exag-value').textContent='×'+Number($('#exag').value).toLocaleString('ca');
$('#density').oninput=()=>$('#density-value').textContent='×'+Number($('#density').value).toLocaleString('ca');
$('#building-source').onchange=()=>load(currentSample);
$('#sample').onclick=()=>load(true);$('#live').onclick=()=>load(false);$('#generate').onclick=generate;$('#reset').onclick=home;$('#top').onclick=()=>{camera.position.set(0,-.01,370);controls.target.set(0,0,0);controls.update();};
for(const[button,format]of [['export-3mf','bambu'],['export-standard','3mf'],['export-stl','stl']])$('#'+button).onclick=()=>{lock(true);say('Preparant el fitxer al teu navegador…');worker.postMessage({type:'export',format});};
document.querySelectorAll('[data-layer]').forEach(button=>button.onclick=()=>{const mesh=group.children.find(o=>o.name===button.dataset.layer);if(mesh){mesh.visible=!mesh.visible;button.classList.toggle('off',!mesh.visible);}});
load(true);
