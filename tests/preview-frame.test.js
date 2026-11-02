import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPreviewFrame} from '../src/preview-frame.js';
import {frameSegments} from '../src/printable-frame.js';
test('preview assembles the same dimensions, height and color as the printable frame',()=>{
 const o={clearance:.7,rim:12,frameHeight:7,color:'#123456',bed:180};
 const frame=createPreviewFrame(150,200,'custom',o),expected=frameSegments({width:150,height:200,...o,segmentMax:o.bed});
 try{
  const b=new THREE.Box3().setFromObject(frame),size=b.getSize(new THREE.Vector3());
  assert(Math.abs(size.x-expected.outer[0])<1e-4);assert(Math.abs(size.y-expected.outer[1])<1e-4);assert.equal(size.z,7);
  assert(frame.children.every(m=>m.material.color.getHexString()==='123456'));
 }finally{for(const m of frame.children){m.geometry.dispose();m.material.dispose();}}
 assert.equal(createPreviewFrame(150,150,'none'),null);
});
