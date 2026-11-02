import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGestureCoverage,withoutLastGesture} from '../src/brush-coverage.js';
import {buildModel,updateVegetation} from '../src/geometry.js';

test('cobertura: entrades extremes no creen bucles i cercles repetits no s’acumulen',()=>{
  assert.throws(()=>createGestureCoverage(Number.MIN_VALUE),RangeError);
  const c=createGestureCoverage();
  assert.equal(c.addCircle(1e100,0,5),false);
  assert.equal(c.addCircle(0,0,1e100),false);
  assert.equal(c.addCircle(20,20,5),true);
  for(let i=0;i<10000;i++)assert.equal(c.addCircle(20,20,5),false);
  assert(c.covers(20,20));assert(!c.covers(1e100,0));
});

test('cobertura de gest: cercles afegits cobreixen l’interior i no l’exterior',()=>{
  const c=createGestureCoverage();
  assert.equal(c.covers(10,10),false);
  c.addCircle(10,10,5);
  assert.equal(c.covers(10,10),true);
  assert.equal(c.covers(14.9,10),true);
  assert.equal(c.covers(15.1,10),false);
  assert.equal(c.covers(10,-10),false);
  c.addCircle(30,30,2);
  assert.equal(c.covers(31,30),true);
  assert.equal(c.covers(20,20),false);
  assert.throws(()=>createGestureCoverage(0),RangeError);
  assert.throws(()=>createGestureCoverage(NaN),RangeError);
});

test('la cobertura ignora cercles invàlids i és determinista',()=>{
  const a=createGestureCoverage(),b=createGestureCoverage(8);
  for(const c of [a,b]){c.addCircle(NaN,0,5);c.addCircle(0,0,0);c.addCircle(5,5,4);}
  for(const [x,y]of [[5,5],[8,8],[0,0],[50,50]])assert.equal(a.covers(x,y),b.covers(x,y));
});

test('desfés de gest sencer: treu tots els traços de l’últim gest',()=>{
  const strokes=[{gesture:1,mode:'add'},{gesture:1,mode:'add'},{gesture:2,mode:'erase'},{gesture:2,mode:'erase'}];
  assert.deepEqual(withoutLastGesture(strokes),strokes.slice(0,2));
  assert.deepEqual(withoutLastGesture(withoutLastGesture(strokes)),[]);
  assert.deepEqual(withoutLastGesture([{mode:'add'},{mode:'add'}]),[{mode:'add'}]);
  assert.deepEqual(withoutLastGesture([]),[]);
  assert.equal(strokes.length,4);
});

const bbox=[0,0,.01,.01],forest={type:'Feature',properties:{sourceLayer:'landcover',class:'wood'},geometry:{type:'Polygon',coordinates:[[[0,0],[.01,0],[.01,.01],[0,.01],[0,0]]]}},region={meta:{bbox},features:[forest],dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4)}]};
const base=buildModel(region,{size:50,resolution:2,density:2.5});
const dab=(x,y,gesture,radius=5)=>({mode:'add',x,y,radius,gesture,density:1});
const manualOf=strokes=>updateVegetation(base,{strokes}).provenance.vegetationBudget.manual;
const treesOf=strokes=>updateVegetation(base,{strokes}).categories.find(c=>c.id==='trees').vertices;

test('mateix centre repetit dins del mateix gest no afegeix més arbres',()=>{
  const one=manualOf([dab(25,25,1)]),twice=manualOf([dab(25,25,1),dab(25,25,1)]);
  assert(one>0);assert.equal(twice,one);
  assert.deepEqual(treesOf([dab(25,25,1),dab(25,25,1)]),treesOf([dab(25,25,1)]));
});

test('un gest nou sí que pot afegir sobre una zona ja pintada',()=>{
  const one=manualOf([dab(25,25,1)]),twoGestures=manualOf([dab(25,25,1),dab(25,25,2)]);
  assert(twoGestures>one,`${twoGestures} <= ${one}`);
});

test('camí d’anada i tornada dins del mateix gest no repopula la zona coberta',()=>{
  const out=manualOf([dab(15,25,1),dab(35,25,1)]),back=manualOf([dab(15,25,1),dab(35,25,1),dab(15,25,1)]);
  assert(out>0);assert.equal(back,out);
  const backNewGesture=manualOf([dab(15,25,1),dab(35,25,1),dab(15,25,2)]);
  assert(backNewGesture>back,`${backNewGesture} <= ${back}`);
});

test('traços solapats del mateix gest editen la unió, no la suma',()=>{
  const same=manualOf([dab(22,25,1,6),dab(28,25,1,6)]),separate=manualOf([dab(22,25,1,6),dab(28,25,2,6)]);
  assert(same>0);assert(separate>same,`${separate} <= ${same}`);
  assert.deepEqual(treesOf([dab(22,25,1,6),dab(28,25,1,6)]),treesOf([dab(22,25,1,6),dab(28,25,1,6)]));
});

test('traços antics sense gest conserven el comportament per traç',()=>{
  const legacy={mode:'add',x:25,y:25,radius:5,density:1};
  const one=manualOf([legacy]),two=manualOf([legacy,{...legacy}]);
  assert(one>0);assert(two>one,`${two} <= ${one}`);
});

test('esborrar dins d’un gest és determinista i respecta el radi',()=>{
  const strokes=[dab(25,25,1),{mode:'erase',x:25,y:25,radius:3,gesture:2}];
  const a=updateVegetation(base,{strokes}),b=updateVegetation(base,{strokes});
  assert.deepEqual(a.categories.find(c=>c.id==='trees').vertices,b.categories.find(c=>c.id==='trees').vertices);
  const noErase=manualOf([dab(25,25,1)]);
  assert(a.provenance.vegetationBudget.manual<noErase);
  assert(a.provenance.vegetationBudget.manual>0);
});

test('valors per defecte i rang de la interfície de densitat',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const input=html.match(/<input id="density"[^>]*>/)[0];
  assert.match(input,/min="\.25"/);assert.match(input,/max="2"/);assert.match(input,/step="\.25"/);assert.match(input,/value="\.5"/);
  assert.match(html,/<output id="density-value">×0,5<\/output>/);
});
