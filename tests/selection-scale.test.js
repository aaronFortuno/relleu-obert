import test from 'node:test';
import assert from 'node:assert/strict';
import {pieceDimensions,scaledBBox,validateScale,tilePlan,selectionPose,coveringSelectionBox,isPanoramicSize,PURE_SCALE_RANGE,PANORAMIC_SCALE_RANGE} from '../src/selection.js';
import {makeProjection,buildModel} from '../src/geometry.js';
import {threeMF} from '../src/export.js';
import {unzipSync,strFromU8} from 'fflate';
import {lonLatTile} from '../src/elevation.js';
const close=(a,b,tolerance=1e-6)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test('changing aspect covers the selected territory around the same centre and rotation',()=>{
  const bbox=scaledBBox([41.918,3.2075],200,200,7500);
  const original=selectionPose(bbox,35);
  for(const [width,height] of [[400,400],[200,150],[150,200]]){
    const resized=selectionPose(coveringSelectionBox(original,width,height),original.rotation);
    close(resized.center[0],original.center[0]);close(resized.center[1],original.center[1]);
    close(resized.widthM/width,resized.heightM/height);
    close(Math.min(resized.widthM,resized.heightM),1500);
    for(let i=0;i<4;i++)assert(i<2?resized.bbox[i]<=original.bbox[i]+1e-9:resized.bbox[i]>=original.bbox[i]-1e-9);
    if(width===height)resized.bbox.forEach((value,i)=>close(value,original.bbox[i],1e-9));
  }
});
test('standard sizes use whole centimetres between 10 and 50 and split only above 25 cm',()=>{
  assert.deepEqual(pieceDimensions('10x10'),[100,100]);
  assert.deepEqual(pieceDimensions('50x41'),[500,410]);
  for(const invalid of ['9x10','21x51','12.5x18','040x20','__proto__'])assert.equal(pieceDimensions(invalid),null);
  for(const [width,height,count] of [[250,250,1],[400,200,2],[400,450,4],[500,500,4]]){
    const {tiles}=tilePlan(width,height);
    assert.equal(tiles.length,count);
    assert(tiles.every(tile=>tile.width<=250&&tile.height<=250));
    assert.equal(tiles.reduce((area,tile)=>area+tile.width*tile.height,0),width*height);
  }
});
test('panoramic sizes accept either orientation and a short side of up to 20 cm',()=>{
  for(const [preset,expected] of [['100x20',[1000,200]],['10x51',[100,510]],['20x100',[200,1000]]]){
    const dimensions=pieceDimensions(preset);
    assert.deepEqual(dimensions,expected);
    assert.equal(isPanoramicSize(...dimensions),true);
  }
  for(const invalid of ['101x20','20x101','100x21','51x50','9x51','010x100'])assert.equal(pieceDimensions(invalid),null);
  assert.equal(isPanoramicSize(...pieceDimensions('50x50')),false);
  assert.deepEqual(tilePlan(1000,200).tiles.map(({width,height})=>[width,height]),Array(4).fill([250,200]));
});

test('panoramic scales span 1:50,000 to 1:500,000 without changing the normal validator',()=>{
  for(const scale of [50000,450000,500000]){
    assert.equal(validateScale(scale,PANORAMIC_SCALE_RANGE),scale);
    const pose=selectionPose(scaledBBox([42.8,.75],1000,200,scale,PANORAMIC_SCALE_RANGE),15);
    close(pose.widthM,scale);
    close(pose.heightM,scale*.2);
  }
  for(const scale of [49999,500001])assert.throws(()=>validateScale(scale,PANORAMIC_SCALE_RANGE),/escala/);
  assert.throws(()=>validateScale(450000),/escala/);
});

test('both geometry modes accept a 50 cm model side',()=>{
  const bbox=scaledBBox([0,0],500,400,20000);
  const data={meta:{bbox},features:[],dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4).fill(50)}]};
  for(const pureRelief of [false,true]){
    const options={size:500,widthMM:500,heightMM:400,resolution:4,trees:false,pureRelief};
    const model=buildModel(data,options);
    assert.equal(model.width,500);
    assert.equal(model.height,400);
    assert.throws(()=>buildModel(data,{...options,widthMM:510}),/rang admès|format panoràmic/);
  }
});
test('pure relief uses 1:500,000 for regular squares and rectangles',()=>{
  const center=[47.63,9.37],denominator=500000;
  for(const [widthMM,heightMM,rotation] of [[200,200,0],[200,150,20],[500,500,45]]){
    const pose=selectionPose(scaledBBox(center,widthMM,heightMM,denominator,PURE_SCALE_RANGE),rotation);
    close(pose.widthM,widthMM*500);
    close(pose.heightM,heightMM*500);
    const data={meta:{bbox:pose.bbox},dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4).fill(50)}]};
    const model=buildModel(data,{widthMM,heightMM,selectionPose:pose,resolution:12,pureRelief:true,trees:false});
    assert.deepEqual([model.width,model.height,model.scale],[widthMM,heightMM,denominator]);
  }
  assert.throws(()=>validateScale(500001,PURE_SCALE_RANGE),/escala/);
});
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
