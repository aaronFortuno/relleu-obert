import test from 'node:test';
import assert from 'node:assert/strict';
import {transportIdentity,compatibleTransport,continuationRoute} from '../src/transport-network.js';

const line=(points,properties={})=>({points,class:'trunk',width:.6,...properties});
const route={ref:'C-25',class:'trunk',railway:false};

test('transport identities retain source, route and direction metadata without treating road tracks as rail',()=>{
  const result=transportIdentity({sourceFeatureIds:[7,7],ref:' c-25 ; E 9 ',name:'  EIX Transversal ',class:'trunk',layer:'1',oneway:'-1'},8);
  assert.deepEqual(result,{sourceFeatureIds:[7,8],ref:'C-25;E9',name:'eix transversal',class:'trunk',layer:1,railway:false,oneway:-1});
  assert.equal(transportIdentity({class:'track'}).railway,false);
  assert.equal(transportIdentity({class:'rail'}).railway,true);
  assert.equal(transportIdentity({class:'trunk'}).layer,null);
});

test('known route conflicts and road/rail conflicts are incompatible, while split source IDs can continue',()=>{
  assert(!compatibleTransport({...route,sourceFeatureIds:[7]},{...route,ref:'C-16',sourceFeatureIds:[7]}));
  assert(!compatibleTransport(route,{...route,railway:true}));
  assert(compatibleTransport({...route,sourceFeatureIds:[7]},{...route,sourceFeatureIds:[8],layer:1}));
  assert(!compatibleTransport({class:'trunk',name:'Eix A'},{class:'trunk',name:'Eix B'}));
  assert(!compatibleTransport({class:'trunk',layer:0},{class:'trunk',layer:1}));
});

test('ramp tags and explicit link classes identify the same connected road without conflating a mainline',()=>{
  for(const base of ['motorway','trunk']){
    for(const ramp of [true,1,'1']){
      const tagged=transportIdentity({class:base,ramp},'source-fragment'),explicit=transportIdentity({class:base+'_link'},'platform-fragment');
      assert.equal(tagged.class,base+'_link');assert(compatibleTransport(tagged,explicit));
    }
    assert(!compatibleTransport({class:base},{class:base+'_link'}),'mainline and ramp were joined without route evidence');
  }
  const source=line([[0,0],[10,0]],{id:'source',properties:{class:'trunk',ramp:1}});
  const explicit=line([[10,0],[20,0]],{id:'different-source-id',class:'trunk_link'});
  const unrelated=line([[10,0],[30,0]],{id:'mainline',class:'trunk'});
  const result=continuationRoute([0,0],[1,0],[unrelated,source,explicit],{class:'trunk_link'},20);
  assert.deepEqual(result.points,[[0,0],[10,0],[20,0]]);
  assert.deepEqual(result.segments.map(s=>s.line.id),['source','different-source-id']);
  assert.deepEqual(continuationRoute([10,0],[1,0],[unrelated],{class:'trunk_link'},20),{points:[],segments:[]});
});

test('one connected route retains every segment width and clips at the exact length budget',()=>{
  const a=line([[0,0],[10,0]],{...route,width:.6}),b=line([[10,0],[20,0]],{...route,width:1}),source=[a,b],before=JSON.stringify(source);
  const result=continuationRoute([0,0],[1,0],source,route,15);
  assert.deepEqual(result.points,[[0,0],[10,0],[15,0]]);
  assert.deepEqual(result.segments.map(s=>[s.from,s.to,s.line.width]),[[[0,0],[10,0],.6],[[10,0],[15,0],1]]);
  assert.strictEqual(result.segments[0].line,a);assert.strictEqual(result.segments[1].line,b);
  assert.equal(JSON.stringify(source),before);
});

test('a matching reference beats a nearer branch and input order does not affect the route',()=>{
  const wrong=line([[0,0],[20,0]],{ref:'C-16'}),unknown=line([[0,0],[30,0]]),right=line([[.08,0],[10,.02]],route),next=line([[10,.02],[20,.02]],route);
  const a=continuationRoute([0,0],[1,0],[wrong,unknown,right,next],route,50),b=continuationRoute([0,0],[1,0],[next,right,unknown,wrong],route,50);
  assert.deepEqual(a.points,[[0,0],[10,.02],[20,.02]]);assert.deepEqual(b.points,a.points);
  assert(a.segments.every(s=>s.line.ref==='C-25'));
});

test('an explicit route name outranks an unnamed nearer continuation',()=>{
  const named=line([[.1,0],[10,.02]],{name:'Eix transversal'}),unnamed=line([[0,0],[20,0]]);
  const result=continuationRoute([0,0],[1,0],[unnamed,named],{class:'trunk',name:'EIX TRANSVERSAL'},30);
  assert.deepEqual(result.points,[[0,0],[10,.02]]);assert.strictEqual(result.segments[0].line,named);
});

test('an interior crossing or interior vertex cannot turn into a connection to another line',()=>{
  const cross=line([[0,-10],[0,0],[0,10]],route);
  assert.deepEqual(continuationRoute([0,0],[0,1],[cross],route,30),{points:[],segments:[]});
  const a=line([[-10,0],[0,0],[10,0]],route),branch=line([[0,0],[0,10]],route);
  const result=continuationRoute([-10,0],[1,0],[a,branch],route,30);
  assert.deepEqual(result.points,[[-10,0],[0,0],[10,0]]);assert.equal(result.segments.length,2);
});

test('only near-endpoint projection repairs generalization and a distant interior projection stays disconnected',()=>{
  const a=line([[0,0],[10,0]],route);
  assert.deepEqual(continuationRoute([.1,.04],[1,0],[a],route,20).points,[[.1,.04],[10,0]]);
  assert.deepEqual(continuationRoute([5,.04],[1,0],[a],route,20),{points:[],segments:[]});
  assert.deepEqual(continuationRoute([.1,.04],[1,0],[a],route,20,{maxStartDistanceMM:.05}),{points:[],segments:[]});
});

test('a completed surface route repairs one almost-collinear generalized continuation and retains its source',()=>{
  // Real projected MVT coordinates at the north continuation of Rajadell.
  const a=line([[60.38289,113.13618],[58.68906,119.28709],[57.39641,124.7248]],{sourceFeatureIds:[1820330462]});
  const b=line([[58.77821,119.01966],[57.21811,125.48251],[55.65801,131.94536]],{sourceFeatureIds:[1556025770]});
  const heading=[a.points[1][0]-a.points[0][0],a.points[1][1]-a.points[0][1]];
  const result=continuationRoute(a.points[0],heading,[a,b],{class:'trunk'},40);
  assert.deepEqual(result.points.slice(0,3),a.points);
  assert.deepEqual(result.points.at(-1),b.points.at(-1));
  assert.equal(result.points.length,6,'the projected junction or the mapped bend was skipped');
  const projected=result.points[3];
  assert(Math.hypot(projected[0]-a.points.at(-1)[0],projected[1]-a.points.at(-1)[1])<.005);
  const repairs=result.segments.filter(s=>s.estimatedRepair);
  assert.equal(repairs.length,3);assert(repairs.every(s=>s.line===b));
  assert(repairs.every(s=>s.line.sourceFeatureIds[0]===1556025770));
  assert.deepEqual(continuationRoute(a.points[0],heading,[b,a],{class:'trunk'},40).points,result.points);
  assert.deepEqual(continuationRoute(a.points.at(-1),heading,[b],{class:'trunk'},40),{points:[],segments:[]},'an arbitrary interior start was accepted');
});

test('projected surface repair requires a unique aligned continuation and rejects levels, refs and structures',()=>{
  const a=line([[0,0],[10,0]],{sourceFeatureIds:['a']});
  const b=line([[5,.04],[20,.04]],{sourceFeatureIds:['b']});
  const c=line([[6,.08],[21,.08]],{sourceFeatureIds:['c']});
  const run=lines=>continuationRoute([0,0],[1,0],lines,{class:'trunk'},30,{allowStructures:true});
  const baseline=run([a]).points;
  assert.deepEqual(run([a,b,c]).points,baseline,'ambiguous interior candidates were resolved arbitrarily');
  assert.deepEqual(run([c,b,a]).points,baseline);
  assert.deepEqual(run([a,line([[10,-10],[10,10]],{sourceFeatureIds:['cross']})]).points,baseline,'a transverse crossing became a continuation');
  assert.deepEqual(run([{...a,ref:'C-1'},{...b,ref:'C-2'}]).points,baseline,'contradictory refs were repaired');
  assert.deepEqual(run([{...a,ref:'C-1',layer:0},{...b,ref:'C-1',layer:1}]).points,baseline,'interior levels were repaired');
  assert.deepEqual(run([a,{...b,brunnel:'bridge'}]).points,baseline,'an interior bridge was repaired');
  assert.deepEqual(run([{...a,brunnel:'bridge'},b]).points,baseline,'repair was started from a bridge');
  assert.deepEqual(continuationRoute([0,0],[1,0],[a,b],{class:'trunk'},30,{maxStartDistanceMM:.02}).points,baseline,'a tighter distance limit was ignored');
  const duplicate={...b,points:b.points.map(p=>p.slice())};
  const unique=run([a,b]),deduplicated=run([a,duplicate,b]);
  assert.deepEqual(deduplicated.points,unique.points,'the same mapped continuation was counted as an ambiguous fork');
  assert(unique.segments.some(s=>s.estimatedRepair));
});

test('structure peers are opt-in, and a one-way physical road remains reachable from either end',()=>{
  const a=line([[0,0],[10,0]],{...route,brunnel:'bridge',oneway:1}),b=line([[10,0],[20,0]],{...route,brunnel:'tunnel',oneway:1});
  assert.deepEqual(continuationRoute([0,0],[1,0],[a,b],route,30),{points:[],segments:[]});
  assert.deepEqual(continuationRoute([0,0],[1,0],[a,b],route,30,{allowStructures:true}).points,[[0,0],[10,0],[20,0]]);
  assert.deepEqual(continuationRoute([20,0],[-1,0],[a,b],route,30,{allowStructures:true}).points,[[20,0],[10,0],[0,0]]);
});
