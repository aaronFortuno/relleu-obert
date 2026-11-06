import test from 'node:test';
import assert from 'node:assert/strict';
import {fitWaterBridge,fitMainWaterBridge} from '../src/bridge-water.js';
import {generateProceduralBridgeItems} from '../src/procedural-bridges.js';
import {buildModel,makeProjection} from '../src/geometry.js';
import {physicalBBox} from '../src/selection.js';
import {auditPart} from '../src/solid-audit.js';

const axis=[[0,0],[5,0],[10,0]];
const rows=(start,end=start)=>axis.map(([x])=>[[x,-1,start+(end-start)*x/10],[x,1,start+(end-start)*x/10]]);
const water=(x,y)=>x>=2&&x<=8?4.7+.03*Math.abs(y):null;
const flat=()=>5;

test('a low canal bridge clears the water across its width while touching both dry banks',()=>{
  const result=fitWaterBridge(axis,rows(5),flat,water);
  assert(result);
  assert.equal(result.thicknessMM,.4);
  assert.equal(result.minimumClearanceMM,.25);
  for(const z of result.heights){
    assert(z-result.thicknessMM-water(5,1)>=.25);
    assert(z-result.thicknessMM<flat());
  }
});

test('existing clear decks, shore-parallel ways and excessive lifts retain the original profile',()=>{
  assert.equal(fitWaterBridge(axis,rows(8),flat,water),null);
  assert.equal(fitWaterBridge(axis,rows(5),flat,()=>4.7),null);
  assert.equal(fitWaterBridge(axis,rows(5),flat,(x,y)=>water(x,y)==null?null:7),null);
});

test('a mapped motorway bridge keeps its long crossing clear of water and raised land',()=>{
  const mainAxis=[[0,0],[40,0],[80,0]];
  const mainRows=mainAxis.map(([x])=>[[x,-2,5],[x,2,5]]);
  const land=(x,y)=>x>=55&&x<=61&&y>1?5.4:5;
  const river=(x,y)=>x>=30&&x<=48?4.8+.1*Math.abs(y):null;
  const options={maxGrade:.12,inModel:()=>true};
  assert.equal(fitWaterBridge(mainAxis,mainRows,land,river),null);
  const fitted=fitMainWaterBridge(mainAxis,mainRows,land,river,options);
  assert(fitted);
  assert.equal(fitted.rows[0][0][2],5);
  assert.equal(fitted.rows.at(-1)[0][2],5);
  for(const [i,section] of fitted.rows.entries()){
    assert.equal(section[0][2],section[1][2]);
    const [x,y,z]=section[1],wet=river(x,y);
    if(wet!==null)assert(z-fitted.thicknessMM-wet>=.25);
    else assert(z>=land(x,y));
    if(i>0)assert(Math.abs(z-fitted.rows[i-1][1][2])<=(x-fitted.rows[i-1][1][0])*.12+1e-8);
  }
  assert.equal(fitMainWaterBridge(mainAxis,mainRows,land,()=>null,options),null);
  assert.equal(fitMainWaterBridge([[0,0],[0,0]],mainRows,land,river,options),null);
});

test('full model keeps the canal below a solid deck with a road approach on each bank',()=>{
  const bbox=physicalBBox([0,0],1,1);
  const {unproject}=makeProjection(bbox,100);
  const waterRing=[[48,40],[52,40],[52,60],[48,60],[48,40]].map(unproject);
  const road=(id,left,right,brunnel)=>({id,properties:{sourceLayer:'transportation',class:'residential',brunnel},
    geometry:{type:'LineString',coordinates:[[left,50],[right,50]].map(unproject)}});
  const [west,south,east,north]=bbox,side=11;
  // Keep a lower point away from the bridge so the water surface can sit
  // below the banks without hitting the minimum elevation of the model.
  const localDEM={width:side,height:side,epsg:4326,affine:[(east-west)/10,0,west,0,(north-south)/10,south],
    pixelIsArea:false,metadata:{},values:Float32Array.from({length:side**2},(_,i)=>i===0?0:5)};
  const features=[road('bridge',47,53,'bridge'),road('west',40,47),road('east',53,60),
    {properties:{sourceLayer:'water',class:'river'},geometry:{type:'Polygon',coordinates:[waterRing]}}];
  const model=buildModel({meta:{bbox},localDEM,features},{size:100,resolution:12,trees:false});
  const [bridge]=model.context.bridges;
  assert.equal(model.provenance.infrastructure.shortWaterCrossings,1);
  assert.equal(bridge.approaches.plans.length,2);
  assert(bridge.top(50,50)-bridge.thickness-model.context.terrain.waterAt(50,50)>=.25);
  assert.deepEqual(auditPart(bridge.mesh).errors,[]);
});

test('the budget reserves short mapped water crossings at both ends of a dense retall',()=>{
  const features=Array.from({length:260},(_,i)=>({
    id:i,properties:{sourceLayer:'transportation',brunnel:'bridge',class:'path'},
    geometry:{type:'LineString',coordinates:[[i*.001,0],[i*.001,.0001]]},
  }));
  const {items,warnings}=generateProceduralBridgeItems(features,()=>100,{
    crossesWater:axis=>axis[0][0]===0||axis[0][0]===259*.001,
  });
  const ids=items.flatMap(item=>item.sourceFeatureIds);
  assert.equal(items.length,200);
  assert(ids.includes(0)&&ids.includes(259));
  assert(ids.some(id=>id>240&&id<259));
  assert(warnings.some(message=>message.includes('60 eixos omesos')));
});
