import test from 'node:test';
import assert from 'node:assert/strict';
import {scaledBBox,validateScale,tilePlan} from '../src/selection.js';
import {makeProjection,buildModel} from '../src/geometry.js';
import {threeMF} from '../src/export.js';
import {unzipSync,strFromU8} from 'fflate';
import {lonLatTile} from '../src/elevation.js';
const close=(a,b,tolerance=1e-6)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test('fixed scales preserve horizontal scale, dimensions and coordinates at different latitudes',()=>{
  for(const lat of [0,41.918,65])for(const [widthMM,heightMM]of [[150,150],[150,200],[200,150],[400,400]])for(const scale of [1000,1500,2000,7345]){
    const bbox=scaledBBox([lat,3.2075],widthMM,heightMM,scale),proj=makeProjection(bbox,Math.max(widthMM,heightMM),{widthMM,heightMM});
    close(1000/proj.scale,scale);close(proj.width,widthMM);close(proj.height,heightMM);
    const corner=proj.project([bbox[2],bbox[3]]);close(corner[0],widthMM);close(corner[1],heightMM);
    const center=proj.unproject([widthMM/2,heightMM/2]);close(center[0],3.2075);close(center[1],lat);
    for(const tile of tilePlan(widthMM,heightMM).tiles){close((tile.x1-tile.x0)/proj.scale,tile.width*scale/1000);close((tile.y1-tile.y0)/proj.scale,tile.height*scale/1000);}
  }
});
test('invalid scale or centre does not silently become a different selection',()=>{
  for(const scale of [0,99,100001,NaN,Infinity,''])assert.throws(()=>validateScale(scale),/escala/);
  assert.equal(validateScale(1500.5),1500.5);
  assert.throws(()=>scaledBBox([75,3],150,200,1000),/Centre/);
});
test('rectangular model and 3MF retain target scale independently of vertical exaggeration',()=>{
  const bbox=scaledBBox([41.918,3.2075],150,200,1000),[x,y]=lonLatTile(3.2075,41.918,14).map(Math.floor);
  const data={meta:{bbox,name:'Scale fixture'},features:[],dem:[{x,y,z:14,size:2,elev:new Float32Array(4).fill(50)}]};
  for(const exaggeration of [1,3]){
    const model=buildModel(data,{size:200,widthMM:150,heightMM:200,targetScale:1000,exaggeration,resolution:3,trees:false});
    assert.equal(model.scale,1000);assert.equal(model.provenance.options.targetScale,1000);assert.equal(model.provenance.verticalExaggeration,exaggeration);
    const vertices=model.categories[0].vertices;let maxX=0,maxY=0,maxZ=0;for(let i=0;i<vertices.length;i+=3){maxX=Math.max(maxX,vertices[i]);maxY=Math.max(maxY,vertices[i+1]);maxZ=Math.max(maxZ,vertices[i+2]);}
    close(maxX,150);close(maxY,200);close(maxZ,5,1e-4); // flat terrain is normalized regardless of its absolute altitude
    const archive=unzipSync(threeMF(model));const xml=strFromU8(archive['3D/3dmodel.model']);assert.match(xml,/unit="millimeter"/);assert.match(xml,/x="150/);assert.match(xml,/y="200/);
  }
  assert.throws(()=>buildModel(data,{size:200,widthMM:150,heightMM:200,targetScale:2000,resolution:3,trees:false}),/escala demanada/);
  const decimal=buildModel({...data,meta:{bbox:scaledBBox([41.918,3.2075],150,200,1500.5)}},{size:200,widthMM:150,heightMM:200,targetScale:1500.5,resolution:3,trees:false});assert.equal(decimal.scale,1500.5);
});
