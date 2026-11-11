import test from 'node:test';
import assert from 'node:assert/strict';
import {buildModel,updatePureRelief} from '../src/geometry.js';
import {reliefGridSize,splitPureRelief} from '../src/pure-relief-mesh.js';
import {selectReliefCentres} from '../src/relief-cells.js';
import {scaledBBox,selectionPose,tilePlan,PURE_SCALE_RANGE,PANORAMIC_SCALE_RANGE} from '../src/selection.js';
import {auditPart} from '../src/solid-audit.js';

test('Relleu pur keeps the same close rotated crop and uses its sampling budget along both axes',()=>{
  const width=200,height=120,scale=2000;
  const pose=selectionPose(scaledBBox([41.6,1.82],width,height,scale,PURE_SCALE_RANGE),24);
  const dem=[{z:0,x:0,y:0,size:2,elev:new Float32Array(4).fill(500)}];
  const model=buildModel({meta:{bbox:pose.bbox},dem},
    {size:width,widthMM:width,heightMM:height,selectionPose:pose,resolution:12,pureRelief:true,trees:false});
  assert.equal(model.scale,scale);
  assert.deepEqual(model.provenance.options.selectionPose,pose);
  const {columns,rows}=reliefGridSize(width,height,540,false);
  assert(columns*rows<=540**2);
  assert(Math.abs(width/columns-height/rows)<.002);
  assert(width/columns<width/540);
  assert.equal(PANORAMIC_SCALE_RANGE[0],50000);
});

test('sampled peaks refine the surface and match across a cut through the centre',()=>{
  const size=100,bbox=scaledBBox([41.6,1.82],size,size,10000);
  const [west,south,east,north]=bbox;
  const values=new Float32Array(49).fill(100);
  values[24]=150;
  const terrainRaster={epsg:4326,width:7,height:7,values,
    affine:[(east-west)/6,0,west,0,(south-north)/6,north]};
  const model=buildModel({meta:{bbox},terrainRaster},{size,resolution:3,pureRelief:true,trees:false});
  assert.equal(model.provenance.reliefSampling.refinedCells,1);
  assert(Math.abs(model.reliefGrid.centreHeights[4]-12.5)<1e-6);
  assert(Math.abs(updatePureRelief(model,{exaggeration:2}).reliefGrid.centreHeights[4]-15)<1e-6);
  const pieces=splitPureRelief(model,tilePlan(size,size,{columns:[50,50]}));
  for(const [index,piece]of pieces.entries()){
    const terrain=piece.parts.find(part=>part.id==='terrain');
    assert.deepEqual(auditPart(terrain).errors,[]);
    const xAtSeam=index?0:50;
    const vertices=terrain.vertices;
    assert(vertices.some((x,i)=>i%3===0&&x===xAtSeam&&vertices[i+1]===50&&vertices[i+2]===12.5));
  }
});

test('standing water excludes centre refinement and the budget selects the largest dry errors',()=>{
  const samples=new Float64Array(25).fill(1);
  samples[2]=5;samples[4]=4;samples[24]=7;
  const lake=new Float32Array(36);
  lake[4]=1;
  const refined=selectReliefCentres(samples,new Float64Array(36),new Uint8Array(25),5,1,null,lake);
  assert.equal(refined.count,2);
  assert.equal(refined.metres[2],5);
  assert.equal(refined.metres[24],7);
  assert(Number.isNaN(refined.metres[4]));
});
