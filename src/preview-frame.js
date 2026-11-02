import * as THREE from 'three';
import {frameSegments} from './printable-frame.js';
export function createPreviewFrame(width,height,style='black',options={}){
  if(style==='none')return null;
  const colors={black:'#292e2a',white:'#e7e5dc',wood:'#9b744d'};
  const color=options.color||colors[style];
  if(!/^#[0-9a-f]{6}$/i.test(color)||![width,height].every(v=>Number.isFinite(v)&&v>0))throw Error('Marc de previsualització invàlid.');
  const group=new THREE.Group(),frame=frameSegments({width,height,clearance:options.clearance??.4,rim:options.rim??8,frameHeight:options.frameHeight??3,segmentMax:options.bed??450});
  for(const part of frame.segments){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(part.vertices,3));geometry.setIndex(new THREE.BufferAttribute(part.faces,1));geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:style==='wood'?.9:.68}));mesh.position.set(part.offset[0]-width/2,part.offset[1]-height/2,0);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  }
  group.name='preview-frame';return group;
}
