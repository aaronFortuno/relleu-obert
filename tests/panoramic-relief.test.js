import test from 'node:test';
import assert from 'node:assert/strict';
import {buildModel,makeProjection} from '../src/geometry.js';
import {reliefGridSize,splitPureRelief} from '../src/pure-relief-mesh.js';
import {physicalBBox,selectionPose,tilePlan} from '../src/selection.js';

test('panoramic detail uses a comparable sampling step along both axes and lands on every seam',()=>{
  for(const [width,height] of [[1000,200],[200,1000],[770,130]]){
    const plan=tilePlan(width,height);
    const balanced=reliefGridSize(width,height,384,true),high=reliefGridSize(width,height,540,true);
    assert.ok(high.columns*high.rows>balanced.columns*balanced.rows);
    assert.ok(Math.abs(width/high.columns-height/high.rows)<.01);
    assert.ok(width/high.columns<=.65&&height/high.rows<=.65);
    assert.equal(high.columns%plan.cols,0);
    assert.equal(high.rows%plan.rows,0);
  }
});

test('a panoramic pure relief previews its pieces in order and exports matching elevations on shared edges',()=>{
  const widthMM=1000,heightMM=200,selection=selectionPose(physicalBBox([42.8,.75],450,90),15);
  const data={meta:{bbox:selection.bbox},features:[],dem:[{x:0,y:0,z:0,size:2,elev:Float32Array.of(250,800,500,1200)}]};
  const options={size:1000,widthMM,heightMM,selectionPose:selection,pureRelief:true,resolution:240,trees:false};
  const previews=[];
  const observer={stage(){},parts(stage,parts,dimensions,mode,piece){
    assert.equal(stage,'terrain');
    assert.deepEqual(dimensions,{width:1000,height:200});
    assert.equal(parts[0].id,'terrain');
    const x=parts[0].vertices.filter((_,i)=>i%3===0);
    previews.push({mode,index:piece.index,total:piece.total,left:x.reduce((a,b)=>Math.min(a,b)),right:x.reduce((a,b)=>Math.max(a,b))});
  }};
  const model=buildModel(data,options,undefined,undefined,undefined,observer);
  assert.equal(model.scale,450000);
  assert.equal(model.provenance.verticalReference.minimumSurfaceMM,5);
  assert.deepEqual(previews,Array.from({length:4},(_,i)=>({mode:i?'append':'replace',index:i+1,total:4,left:i*250,right:(i+1)*250})));
  const pieces=splitPureRelief(model,250);
  assert.equal(pieces.length,4);
  function edge(part,x){
    const values=[];
    for(let i=0;i<part.vertices.length;i+=3){
      const [px,y,z]=part.vertices.subarray(i,i+3);
      if(px===x&&z>0)values.push([y,z]);
    }
    return values.sort((a,b)=>a[0]-b[0]);
  }
  for(let i=1;i<pieces.length;i++){
    const left=edge(pieces[i-1].parts[0],250),right=edge(pieces[i].parts[0],0);
    assert.ok(left.length>100);
    assert.deepEqual(left,right);
  }
  assert.throws(()=>buildModel(data,{...options,heightMM:210}),/format panoràmic/);
  assert.throws(()=>buildModel(data,{...options,selectionPose:{...selection,widthM:510000,heightM:102000}}),/format panoràmic/);
});

test('mapped seas at both ends stay flat and reach the base through preview and print cuts',()=>{
  const widthMM=510,heightMM=100,selection=selectionPose(physicalBBox([42.8,.75],229.5,45),15);
  const options={size:widthMM,widthMM,heightMM,selectionPose:selection,pureRelief:true,resolution:24,trees:false};
  const {unproject}=makeProjection(selection.bbox,options.size,options);
  const ocean=(left,right)=>({type:'Feature',properties:{class:'ocean'},geometry:{type:'Polygon',
    coordinates:[[ [left,-10],[right,-10],[right,110],[left,110],[left,-10] ].map(unproject)]}});
  const oceans=[ocean(-10,185),ocean(325,520)];
  const dem=[{x:0,y:0,z:0,size:2,elev:Float32Array.of(800,800,800,800)}];
  const previewed=[];
  const observer={stage(){},parts(stage,parts,dimensions,mode,piece){
    if(parts.some(part=>part.id==='water'))previewed.push(piece.index);
  }};
  const model=buildModel({meta:{bbox:selection.bbox},dem,oceans},options,undefined,undefined,undefined,observer);
  assert.equal(model.provenance.verticalReference.originMeters,0);
  assert.equal(model.provenance.verticalReference.seaLevelMM,5);
  assert.deepEqual(previewed,[1,2,3]);
  const sea=model.parts.find(part=>part.id==='water');
  const land=model.parts.find(part=>part.id==='terrain');
  assert.deepEqual([...new Set(sea.vertices.filter((_,i)=>i%3===2))].sort(),[0,5]);
  assert.ok(land.vertices.every((value,i)=>i%3!==0||value>184&&value<326));
  const pieces=splitPureRelief(model,250);
  assert.equal(pieces.length,3);
  for(const piece of pieces){
    const {vertices}=piece.parts.find(part=>part.id==='water');
    assert.ok(vertices.some((value,i)=>i%3===2&&value===0));
    assert.ok(vertices.some((value,i)=>i%3===2&&value===5));
  }
});
