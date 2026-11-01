import test from 'node:test';
import assert from 'node:assert/strict';
import {treeSampler,fitTrees,MAX_TREES} from '../src/vegetation-budget.js';
import {buildModel,updateVegetation} from '../src/geometry.js';

test('saturation retains reproducible vegetation across the whole area instead of stopping at a row',()=>{
  const sample=()=>{const s=treeSampler();for(let y=0;y<200;y++)for(let x=0;x<200;x++)s.add({x,y});return s;};
  const a=sample(),b=sample();assert.equal(a.seen,40000);assert.equal(a.values.length,MAX_TREES);assert.deepEqual(a.values,b.values);
  const quadrants=[0,0,0,0];for(const p of a.values)quadrants[(p.x>=100?1:0)+(p.y>=100?2:0)]++;
  for(const n of quadrants)assert(n>2500&&n<3500,`Uneven quadrant: ${n}`);
});

test('painted trees take capacity from automatic trees; latest paint remains possible even at the manual limit',()=>{
  const automatic=Array.from({length:MAX_TREES},(_,x)=>({x,y:0})),manual=[{x:999,y:999}];
  const result=fitTrees(automatic,manual);assert.equal(result.placements.length,MAX_TREES);assert(result.placements.includes(manual[0]));assert.equal(result.automaticReduced,1);
  const painted=Array.from({length:MAX_TREES+2},(_,x)=>({x,y:1})),full=fitTrees(automatic,painted);
  assert.equal(full.automatic,0);assert.equal(full.manualDropped,2);assert(!full.placements.includes(painted[0]));assert(full.placements.includes(painted.at(-1)));
});

const bbox=[0,0,.01,.01],forest={type:'Feature',properties:{sourceLayer:'landcover',class:'wood'},geometry:{type:'Polygon',coordinates:[[[0,0],[.01,0],[.01,.01],[0,.01],[0,0]]]}},region={meta:{bbox},features:[forest],dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4)}]};
test('a saturated forest still accepts paint without recomputing automatic candidates',()=>{
  const base=buildModel(region,{size:200,resolution:2,density:5}),cache=base.context.vegetationCache;
  assert.equal(base.treeCount,MAX_TREES);assert(base.provenance.vegetationBudget.eligibleAutomatic>MAX_TREES);
  const dense=updateVegetation(base,{brushDensity:5,strokes:[{mode:'add',x:100,y:175,radius:5,density:5}]});
  assert.strictEqual(dense.context.vegetationCache,cache);assert(dense.provenance.vegetationBudget.manual>0);assert.equal(dense.treeCount,MAX_TREES);assert(dense.provenance.vegetationBudget.automaticReduced>0);
  assert.strictEqual(dense.categories.find(c=>c.id==='terrain').vertices,base.categories.find(c=>c.id==='terrain').vertices);
});
test('brush density preserves the forest and previously painted strokes',()=>{
  const base=buildModel(region,{size:50,resolution:2,density:2.5}),cache=base.context.vegetationCache;
  const add={mode:'add',x:25,y:25,radius:5,density:.25};
  const sparse=updateVegetation(base,{brushDensity:.25,strokes:[add]}),dense=updateVegetation(base,{brushDensity:5,strokes:[{...add,density:5}]});
  assert.strictEqual(base.context.vegetationCache,cache);assert(sparse.provenance.vegetationBudget.manual>0);assert(dense.provenance.vegetationBudget.manual>sparse.provenance.vegetationBudget.manual);
  assert(dense.treeCount>sparse.treeCount);
  const futureOnly=updateVegetation(base,{brushDensity:5,strokes:[add]});
  assert.deepEqual(futureOnly.categories.find(c=>c.id==='trees').vertices,sparse.categories.find(c=>c.id==='trees').vertices);
  const unchanged=updateVegetation(base,{brushDensity:5});assert.deepEqual(unchanged.categories.find(c=>c.id==='trees').vertices,base.categories.find(c=>c.id==='trees').vertices);
  assert.strictEqual(dense.categories.find(c=>c.id==='terrain').vertices,base.categories.find(c=>c.id==='terrain').vertices);
  assert.throws(()=>updateVegetation(base,{brushDensity:Infinity}),/pinzell/);
});
