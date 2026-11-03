import test from 'node:test';import assert from 'node:assert/strict';import Module from 'manifold-3d';
import {topSampler,continuation,planApproaches,planPiers,stripSolid,columnSolid,deferredObstacleMask} from '../src/bridge-completion.js';
import {auditPart} from '../src/solid-audit.js';
import {readFile} from 'node:fs/promises';
import {transportIdentity} from '../src/transport-network.js';
const api=await Module();api.setup();
function solid(p){assert.deepEqual(auditPart(p).errors,[]);const m=new api.Manifold(new api.Mesh({numProp:3,vertProperties:p.vertices,triVerts:p.faces}));assert.equal(m.status(),'NoError');return m;}
const rectangle=(x0,y0,x1,y1)=>[[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]];

test('road masks are deferred for ground-level platforms and reused for elevated piers and later edits',()=>{
 const mask=rectangle(38,45,48,55),options={axis:[[10,50],[90,50]],ground:()=>5,containsDeck:([x,y])=>x>=10&&x<=90&&y>=49.5&&y<=50.5,scale:.05,widthMM:100,heightMM:100};let calls=0;
 const deferred=deferredObstacleMask(()=>{calls++;return mask;});
 const resting=planPiers({...options,top:()=>5,blocked:[deferred]});assert.equal(resting.piers.length,0);assert.equal(calls,0,'ground-level platforms constructed an unused mask');
 const elevated={...options,top:()=>14},expected=planPiers({...elevated,blocked:[mask]});assert(expected.piers.length>0);
 assert.deepEqual(planPiers({...elevated,blocked:[deferred]}),expected);assert.equal(calls,1);
 assert.deepEqual(planPiers({...elevated,blocked:[deferred,rectangle(0,0,1,1)]}),expected);assert.equal(calls,1,'a later edit reconstructed the unchanged road mask');
});
test('piers embed in sloping ground, touch the deck and avoid complete road/building footprints',()=>{
 const axis=[[10,50],[90,50]],top=()=>14,ground=(x,y)=>5+x*.01,containsDeck=([x,y])=>x>=10&&x<=90&&y>=47&&y<=53;
 const blocked=[rectangle(26,47,37,53),rectangle(56,47,67,53)];
 const result=planPiers({axis,top,ground,containsDeck,blocked,scale:.1,widthMM:100,heightMM:100});assert(result.piers.length>5);assert(result.omitted>0);
 for(const p of result.piers){const guard=p.diameter/2+.25;assert(p.center[0]<=26-guard||p.center[0]>=37+guard);assert(p.center[0]<=56-guard||p.center[0]>=67+guard);const s=solid(columnSolid(p.ring,ground,top));try{assert(s.boundingBox().max[2]>14);assert(s.boundingBox().min[2]<ground(...p.center));}finally{s.delete();}}
 assert.deepEqual(planPiers({axis,top,ground,containsDeck,blocked,scale:.1,widthMM:100,heightMM:100}),result);
});
test('an approach follows the mapped road and its full end width meets the raised terrain',()=>{
 const points=[[60,47,12],[140,47,12],[140,53,12],[60,53,12]],faces=[0,1,2,0,2,3],axis=[[60,50],[140,50]];axis.roadClass='trunk';
 const roads=[{points:[[60,50],[30,50]],class:'trunk'},{points:[[140,50],[170,50]],class:'trunk'}],ground=(x,y)=>10.5+.02*(y-50),containsDeck=([x,y])=>x>=60&&x<=140&&y>=47&&y<=53;
 const destinationBreaks=()=>[.5-1e-7,.25];
 const {plans,missed}=planApproaches({axis,points,faces,roads,ground,containsDeck,destinationBreaks,roadRise:.5,widthMM:200,heightMM:100,roadWidth:1});assert.equal(plans.length,2);assert.deepEqual(missed,[]);
 for(const p of plans){assert(p.length>10);assert.equal(p.grade,0);for(const side of ['left','right']){const end=p.sections.at(-1)[side];assert(Math.abs(end[2]-ground(end[0],end[1])-.5)<1e-9);}const s=solid(stripSolid(p.sections,.6));s.delete();}
});
test('road continuation preserves the main route at a branch and does not use a tunnel',()=>{
 const lines=[{points:[[10,10],[20,10]],class:'trunk'},{points:[[20,10],[30,10]],class:'trunk'},{points:[[20,10],[20,20]],class:'path'},{points:[[30,10],[40,10]],class:'trunk',brunnel:'tunnel'}];
 assert.deepEqual(continuation([10,10],[1,0],lines,'trunk',50),[[10,10],[20,10],[30,10]]);
 const sample=topSampler([[0,0,10],[10,0,20],[0,10,10]],[0,1,2]);assert.equal(sample(2,2),12);assert.equal(sample(20,20),null);
});

test('a folded pavement omits only its own approach',()=>{
 const points=[[40,49,10],[60,49,10],[60,51,10],[40,51,10]],axis=[[40,50],[60,50]];
 axis.identity=transportIdentity({class:'trunk',ref:'C-1'});
 const road=points=>({points,class:'trunk',ref:'C-1',width:1});
 const result=planApproaches({axis,points,faces:[0,1,2,0,2,3],
   roads:[road([[40,50],[10,50]]),road([[60,50],[60.1,50.25],[59.1,54.25],[90,58.25]])],
   ground:()=>10,containsDeck:([x,y])=>x>=40&&x<=60&&y>=49&&y<=51,
   widthMM:100,heightMM:100,roadWidth:1,forceConnections:true});
 assert.equal(result.plans.length,1);
 assert(result.plans[0].sections.at(-1).centre[0]<40);
 assert.match(result.missed[0].error,/es pleguen o es creuen/);
 const mesh=solid(result.plans[0].mesh);mesh.delete();
});

test('a main road access does not reverse its slope to follow a short landing triangle',()=>{
 const axis=[[40,50],[60,50]];axis.roadClass='primary';
 const points=[[40,49.5,10],[60,49.5,10],[60,50.5,10],[40,50.5,10]];
 const ground=x=>9+(x-60)*.02;
 const {plans}=planApproaches({axis,points,faces:[0,1,2,0,2,3],roads:[{points:[[60,50],[90,50]],class:'primary'}],
   ground,containsDeck:([x,y])=>x>=40&&x<=60&&Math.abs(y-50)<=.5,widthMM:100,heightMM:100,roadWidth:1,forceConnections:true});
 assert.equal(plans.length,1);
 const [approach]=plans;
 assert.equal(approach.endGrade,0);
 assert.equal(approach.sections.at(-1).centre[2],ground(approach.sections.at(-1).centre[0]));
 assert(approach.sections.every((s,i,a)=>!i||s.centre[2]<=a[i-1].centre[2]+1e-10));
});

test('a grade-limited access uses a nearby landing with gentler curvature',()=>{
 const axis=[[40,50],[60,50]],points=[[40,49.5,5.5],[60,49.5,5.5],[60,50.5,5.5],[40,50.5,5.5]];
 axis.identity=transportIdentity({class:'primary',ref:'C-1'});
 const terminal={...axis.identity,points:[[60,50],[90,50]],width:1};
 const {plans,missed}=planApproaches({axis,points,faces:[0,1,2,0,2,3],roads:[],ground:()=>5,
   terminalRoads:[null,terminal],containsDeck:([x,y])=>x>=40&&x<=60&&Math.abs(y-50)<=.5,
   widthMM:100,heightMM:100,roadWidth:1,maxGrade:.15,forceConnections:true});
 assert.deepEqual(missed,[]);
 assert.equal(plans.length,1);
 const [approach]=plans;
 assert(approach.length>6);
 assert.equal(approach.endZ,5);
 assert.equal(approach.endGrade,0);
 assert.deepEqual(auditPart(approach.mesh).errors,[]);
});

test('an unresolved approach distinguishes a crop boundary from a short mapped route',()=>{
 const axis=[[40,50],[99,50]];axis.roadClass='trunk';axis.identity=transportIdentity({class:'trunk',ref:'C-1'});
 const options={axis,points:[[40,49.5,6],[99,49.5,6],[99,50.5,6],[40,50.5,6]],faces:[0,1,2,0,2,3],ground:()=>5,containsDeck:([x,y])=>x>=40&&x<=99&&Math.abs(y-50)<=.5,widthMM:100,heightMM:100,roadWidth:1};
 const plan=(end,widthMM=100)=>planApproaches({...options,widthMM,roads:[{points:[[99,50],[end,50]],class:'trunk',ref:'C-1',width:1}]});
 const cropped=plan(115);
 assert.equal(cropped.plans.length,0);
 const failure=cropped.missed.find(end=>end?.reason==='no gentle join');
 assert.equal(failure?.clippedByCrop,true);assert(failure.available<failure.minimum);
 const short=plan(99.7).missed.find(end=>end?.reason==='no gentle join');
 assert.equal(short?.clippedByCrop,false);
 const expanded=plan(115,120);
 assert.equal(expanded.plans.length,1);assert.equal(expanded.plans[0].sections.at(-1).centre[2],5);
});

test('a coplanar surveyed deck tapers continuously into its mapped carriageway without a width jump',()=>{
 const points=[[40,49,10],[60,49,10],[60,51,10],[40,51,10]],faces=[0,1,2,0,2,3],axis=[[40,50],[60,50]];axis.roadClass='trunk';axis.identity=transportIdentity({class:'trunk',ref:'C-1'});
 const roads=[{points:[[40,50],[10,50]],class:'trunk',ref:'C-1',width:.6},{points:[[60,50],[90,50]],class:'trunk',ref:'C-1',width:.6}];
 const result=planApproaches({axis,points,faces,roads,ground:()=>10,containsDeck:([x,y])=>x>=40&&x<=60&&y>=49&&y<=51,widthMM:100,heightMM:100,roadWidth:.6,scale:.1});
 assert.equal(result.plans.length,2);
 for(const p of result.plans){const first=p.sections[0],last=p.sections.at(-1),w=s=>Math.hypot(s.left[0]-s.right[0],s.left[1]-s.right[1]);assert(Math.abs(w(first)-2)<1e-5);assert(Math.abs(w(last)-.6)<1e-6);assert.equal(last.left[2],10);assert.equal(last.right[2],10);assert(p.sections.every(s=>w(s)>=.6-1e-6&&w(s)<=2+1e-5));const mesh=solid(stripSolid(p.sections,.6));mesh.delete();}
});

test('an identified approach keeps the mapped endpoint bend and avoids a nearer road with another reference',()=>{
 const points=[[40,49.7,12],[60,49.7,12],[60,50.3,12],[40,50.3,12]],faces=[0,1,2,0,2,3],axis=[[40,50],[60,50]];axis.roadClass='trunk';axis.identity=transportIdentity({class:'trunk',ref:'C-1'});
 const roads=[{points:[[60,50],[61,51],[90,51]],class:'trunk',ref:'C-1',width:.6},{points:[[60.01,50],[90,50]],class:'trunk',ref:'C-2',width:1.2}];
 const result=planApproaches({axis,points,faces,roads,ground:()=>10.5,containsDeck:([x,y])=>x>=40&&x<=60&&y>=49.7&&y<=50.3,widthMM:100,heightMM:100,roadWidth:.6,scale:.1});
 assert.equal(result.plans.length,1);const p=result.plans[0];assert.equal(p.endWidthMM,.6);
 const centres=p.sections.map(s=>s.left.map((v,k)=>(v+s.right[k])/2));assert(centres.some(q=>Math.hypot(q[0]-60,q[1]-50)<1e-6),'the endpoint was shortcut');assert(centres.at(-1)[1]>50.9,'another route absorbed the join');
 const pavement=solid(stripSolid(p.sections,.6));try{assert(pavement.volume()>0,'the retained first bend must form a printable solid');}finally{pavement.delete();}
});
test('Rajadell uses the twelve spans of the engineering drawing, not the incomplete prose summary',async()=>{
 const data=JSON.parse(await readFile(new URL('../public/data/eix-diagonal-layouts.json',import.meta.url))),layout=data.items['ifc-127512'];
 assert.equal(layout.spansMetres.length,12);assert.equal(layout.spansMetres.reduce((a,b)=>a+b),740);
 const options={axis:[[10,50],[84,50]],top:()=>14,ground:()=>5,containsDeck:([x,y])=>x>=10&&x<=84&&y>=47&&y<=53,blocked:[],scale:.1,widthMM:100,heightMM:100,layout};
 const result=planPiers(options);assert.equal(result.piers.length,11);assert.equal(result.omitted,0);assert.deepEqual(result.piers.map(p=>p.sourceStationMetres),layout.stationsMetres);
 for(const p of result.piers){assert(Math.abs(p.station-p.sourceStationMetres*.1)<1e-8);assert.equal(p.longitudinalAdjustmentMM,0);}
 assert.throws(()=>planPiers({...options,layout:{...layout,spansMetres:[35,50,70,70,100,70,70,70,70,50,35]}}),/projecte/);
});

test('narrow decks retain a printable body with a tapered head, without placing it on a lower road',()=>{
 const options={axis:[[10,50],[90,50]],top:()=>14,ground:()=>5,containsDeck:([x,y])=>x>=10&&x<=90&&y>=49.7&&y<=50.3,blocked:[rectangle(38,45,48,55)],scale:.05,widthMM:100,heightMM:100};
 const result=planPiers(options);assert(result.piers.length>=14);assert(result.omitted>0);
 for(const p of result.piers){
  assert.equal(p.acrossMM,.8);assert(p.topRing.every(options.containsDeck));
  assert(p.ring.some(q=>!options.containsDeck(q)),'the body may extend below the sides of a narrow deck');
  assert(p.center[0]<=38-.65||p.center[0]>=48+.65);
  const s=solid(columnSolid(p.ring,options.ground,options.top,p.topRing));
  try{assert(s.boundingBox().max[2]>14);assert(s.boundingBox().min[2]<5);}finally{s.delete();}
 }
});

test('a wide print supplements the surveyed layout with explicit auxiliary piers and a bounded free span',async()=>{
 const data=JSON.parse(await readFile(new URL('../public/data/eix-diagonal-layouts.json',import.meta.url))),layout=data.items['ifc-127512'];
 const result=planPiers({axis:[[10,50],[232,50]],top:()=>20,ground:()=>5,containsDeck:([x,y])=>x>=10&&x<=232&&y>=47&&y<=53,blocked:[],scale:.3,widthMM:250,heightMM:100,layout});
 assert.equal(result.piers.filter(p=>p.sourceStationMetres!=null).length,11);
 assert(result.auxiliaryPiers>0);assert(result.piers.length>11);
 assert.equal(result.maxSpanMM,10);assert(result.maxUnsupportedSpanMM<=10);assert.deepEqual(result.unsupportedSpans,[]);
 for(const p of result.piers.filter(p=>p.auxiliary))assert.equal(p.sourceStationMetres,undefined);
});

test('a completely obstructed or subminimum deck reports the remaining unsupported span',()=>{
 for(const [halfWidth,blocked]of [[3,[rectangle(8,45,92,55)]],[.12,[]]]){
  const r=planPiers({axis:[[10,50],[90,50]],top:()=>14,ground:()=>5,containsDeck:([x,y])=>x>=10&&x<=90&&Math.abs(y-50)<=halfWidth,blocked,scale:.05,widthMM:100,heightMM:100});
  assert.equal(r.piers.length,0);assert(r.omitted>0);assert(r.maxUnsupportedSpanMM>70);assert(r.unsupportedSpans.length);
 }
});
