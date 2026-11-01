import * as THREE from 'three';
export function createPreviewFrame(width,height,style='black'){
  if(style==='none')return null;
  const colors={black:'#292e2a',white:'#e7e5dc',wood:'#9b744d'};
  if(!colors[style]||![width,height].every(v=>Number.isFinite(v)&&v>0))throw Error('Marc de previsualització invàlid.');
  const group=new THREE.Group(),rim=6,gap=.5,outerW=width+2*(gap+rim),outerH=height+2*(gap+rim),z=2.5;
  const pieces=[[outerW,rim,0,-(height/2+gap+rim/2)],[outerW,rim,0,height/2+gap+rim/2],[rim,height+2*gap,-(width/2+gap+rim/2),0],[rim,height+2*gap,width/2+gap+rim/2,0]];
  for(const [w,h,x,y]of pieces){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,5),new THREE.MeshStandardMaterial({color:colors[style],roughness:style==='wood'?.9:.68}));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
  group.name='preview-frame';return group;
}
