import assert from 'node:assert/strict';
import test from 'node:test';
import {reliefCrownTaper,reliefForestTrees,reliefTreePart} from '../src/relief-forest-trees.js';
import {auditPart} from '../src/solid-audit.js';
import {buildModel,makeProjection,updateVegetation} from '../src/geometry.js';
import {groupReliefMaterials} from '../src/materials.js';
import {splitPureRelief} from '../src/pure-relief-mesh.js';
import {physicalBBox,selectionPose} from '../src/selection.js';

const resolution=4;
const grid={width:40,height:40,resolution,
  heights:Float64Array.from({length:25},(_,i)=>10+i%5),diagonals:new Uint8Array(16)};

test('absolute maximum elevation blends a rounded crown into a taller cone',()=>{
  const tree={x:20,y:20,ground:10,radius:.25,rotation:0,heightFactor:1};
  const heights=[400,1400,2500].map(elevation=>{
    const part=reliefTreePart({...grid,trees:[tree],crownTaper:reliefCrownTaper(elevation)},
      {left:0,bottom:0,right:4,top:4});
    const audit=auditPart(part);
    assert.deepEqual(audit.errors,[]);
    assert.equal(audit.dimensions[0],.5);
    return audit.bbox.max[2];
  });
  assert(heights[0]<heights[1]&&heights[1]<heights[2]);
  assert(Math.abs(heights[2]-(10+.25*1.56*1.5))<1e-6);
});

test('pure relief crowns use geographic scale and close below the terrain surface',()=>{
  assert.deepEqual(reliefForestTrees(grid,()=>true,.01),[]);
  const scale=.05,trees=reliefForestTrees(grid,()=>true,scale);
  assert(trees.length>0);
  assert.deepEqual(reliefForestTrees(grid,()=>true,scale),trees);
  for(const {x,radius,ground} of trees){
    assert(radius*2>=.45&&radius*2<=.65);
    assert(Math.abs(ground-(10+x/10))<1e-8);
  }
  const part=reliefTreePart({...grid,trees},{left:0,bottom:0,right:4,top:4});
  assert.deepEqual(auditPart(part).errors,[]);
  assert(part.vertices[2]<trees[0].ground);
});

test('pure relief thins crowns with local absolute elevation independent of exaggeration',()=>{
  const level=new Float64Array(25).fill(5),base={...grid,heights:level};
  const dense=reliefForestTrees({...base,originMeters:1900},()=>true,.05);
  const sparse=reliefForestTrees({...base,originMeters:2350},()=>true,.05);
  assert(sparse.length>0&&sparse.length<dense.length/2);
  assert.equal(reliefForestTrees({...base,originMeters:2450},()=>true,.05).length,0);
  assert.deepEqual(reliefForestTrees({...base,originMeters:2350,exaggeration:3},()=>true,.05),sparse);
});

test('pure relief crowns stay clear of water and print cuts',()=>{
  const grid={width:300,height:40,resolution,heights:new Float64Array(25).fill(10),
    diagonals:new Uint8Array(16),
    lakeWeights:Float32Array.from({length:25},(_,i)=>i%5<2?1:-1),
    streamStrips:[[],[],[[[[175,0],[185,0],[185,40],[175,40],[175,0]]]],[]]};
  const trees=reliefForestTrees(grid,()=>true,.05);
  assert(trees.length>0);
  for(const {x,radius} of trees){
    assert(x-radius>112.5);
    assert(Math.abs(x-150)>=radius);
    assert(x+radius<175||x-radius>185);
  }
  const left=reliefTreePart({...grid,trees},{left:0,bottom:0,right:2,top:4});
  const right=reliefTreePart({...grid,trees},{left:2,bottom:0,right:4,top:4});
  assert.deepEqual(auditPart(left).errors,[]);
  assert.deepEqual(auditPart(right).errors,[]);
  assert.equal(left.vertices.length+right.vertices.length,trees.length*42*3);
});

function brushFixture(width,height,scale,extraOptions={}){
  const bbox=physicalBBox([0,0],width*scale/1e6,height*scale/1e6);
  const dem=[{x:0,y:0,z:0,size:2,elev:Float32Array.of(100,100,100,100)}];
  const options={size:Math.max(width,height),widthMM:width,heightMM:height,selectionPose:selectionPose(bbox),
    pureRelief:true,resolution:12,brushDensity:.5,...extraOptions};
  const {unproject}=makeProjection(bbox,options.size,options);
  const polygon=(x0,y0,x1,y1)=>({geometry:{type:'Polygon',coordinates:[[
    [x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]
  ].map(unproject)]}});
  return {data:{meta:{bbox},dem},options,polygon,unproject};
}

test('at 1:10,000 the brush adds editable crowns on unwooded land with the forest filament',()=>{
  const {data,options}=brushFixture(100,100,10000);
  const initial=buildModel(data,options);
  const add={mode:'add',x:45,y:46,radius:8,gesture:1};
  const round=updateVegetation(initial,{strokes:[add,add],treeType:'round'});
  const tall=updateVegetation(round,{treeType:'tall'});
  assert.equal(round.scale,10000);
  assert.equal(round.provenance.treeRepresentation.manualStyle,'crowns');
  assert.equal(round.categories.find(part=>part.id==='terrain'),initial.categories[0]);
  assert.equal(tall.reliefGrid.heights,initial.reliefGrid.heights);
  assert(round.treeCount>0);
  assert.equal(round.treeCount,updateVegetation(initial,{strokes:[add]}).treeCount);
  assert.equal(tall.treeCount,round.treeCount);
  const crowns=round.categories.find(part=>part.id==='trees');
  assert.deepEqual(auditPart(crowns).errors,[]);
  assert(auditPart(tall.categories.find(part=>part.id==='trees')).bbox.max[2]>auditPart(crowns).bbox.max[2]);
  assert.equal(round.parts.find(part=>part.id==='forest').vertices,crowns.vertices);
  assert.equal(groupReliefMaterials(round,6).parts.find(part=>part.id==='material-5').vertices,crowns.vertices);
  const erased=updateVegetation(round,{strokes:[add,{...add,mode:'erase',gesture:2}]});
  assert.equal(erased.treeCount,0);
  assert(!erased.categories.some(part=>part.id==='trees'));
  const disabled=updateVegetation(round,{trees:false});
  assert.equal(disabled.treeCount,0);
  assert.equal(updateVegetation(disabled,{trees:true}).treeCount,round.treeCount);
});

test('painted texture skips mapped water and print cuts in a panoramic model',()=>{
  const {data,options,polygon,unproject}=brushFixture(510,100,450000,{streams:false});
  data.lakes=[polygon(90,20,110,80)];
  data.oceans=[polygon(300,-2,520,102)];
  data.waterways=[{properties:{waterway:'stream'},geometry:{type:'LineString',coordinates:[[80,50],[220,50]].map(unproject)}}];
  const strokes=[100,170,310].map((x,i)=>({mode:'add',x,y:50,radius:14,gesture:i+1,density:1}));
  const initial=buildModel(data,options);
  const model=updateVegetation(initial,{strokes});
  assert.equal(model.provenance.treeRepresentation.manualStyle,'texture');
  assert.equal(initial.treeCount,0);
  assert(model.treeCount>0);
  assert.equal(model.categories.find(part=>part.id==='water'),initial.categories.find(part=>part.id==='water'));
  for(const tree of model.reliefGrid.trees){
    const {x,y,radius,texture}=tree;
    assert(texture&&radius>=.27&&radius<=.3&&x+radius<300&&Math.abs(x-170)>=radius&&
      (x>220||Math.abs(y-50)>.225+radius)&&(x+radius<90||x-radius>110),JSON.stringify(tree));
  }
  const crowns=model.categories.find(part=>part.id==='trees');
  assert.deepEqual(auditPart(crowns).errors,[]);
  for(const [i,{ground}] of model.reliefGrid.trees.entries()){
    const tip=crowns.vertices[(i*42+41)*3+2];
    assert(tip-ground>=.24&&tip-ground<=.31);
  }
  const pieces=splitPureRelief(model,250);
  assert.equal(pieces.length,3);
  assert.equal(pieces.reduce((n,piece)=>n+(piece.parts.find(part=>part.id==='forest')?.faces.length??0),0),crowns.faces.length);
  assert(!pieces[2].parts.some(part=>part.id==='forest'));
});
