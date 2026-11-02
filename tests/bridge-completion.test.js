import test from 'node:test';import assert from 'node:assert/strict';import Module from 'manifold-3d';
import {topSampler,continuation,planApproaches,planPiers,stripSolid,columnSolid} from '../src/bridge-completion.js';
import {auditPart} from '../src/solid-audit.js';
import {readFile} from 'node:fs/promises';
const api=await Module();api.setup();
function solid(p){assert.deepEqual(auditPart(p).errors,[]);const m=new api.Manifold(new api.Mesh({numProp:3,vertProperties:p.vertices,triVerts:p.faces}));assert.equal(m.status(),'NoError');return m;}
const rectangle=(x0,y0,x1,y1)=>[[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]];
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
 const {plans,missed}=planApproaches({axis,points,faces,roads,ground,containsDeck,roadRise:.5,widthMM:200,heightMM:100,roadWidth:1});assert.equal(plans.length,2);assert.deepEqual(missed,[]);
 for(const p of plans){assert(p.length>10);assert.equal(p.grade,0);for(const side of ['left','right']){const end=p.sections.at(-1)[side];assert(Math.abs(end[2]-ground(end[0],end[1])-.5)<1e-9);}const s=solid(stripSolid(p.sections,.6));s.delete();}
});
test('road continuation preserves the main route at a branch and does not use a tunnel',()=>{
 const lines=[{points:[[10,10],[20,10]],class:'trunk'},{points:[[20,10],[30,10]],class:'trunk'},{points:[[20,10],[20,20]],class:'path'},{points:[[30,10],[40,10]],class:'trunk',brunnel:'tunnel'}];
 assert.deepEqual(continuation([10,10],[1,0],lines,'trunk',50),[[10,10],[20,10],[30,10]]);
 const sample=topSampler([[0,0,10],[10,0,20],[0,10,10]],[0,1,2]);assert.equal(sample(2,2),12);assert.equal(sample(20,20),null);
});
test('Rajadell uses the twelve spans of the engineering drawing, not the incomplete prose summary',async()=>{
 const data=JSON.parse(await readFile(new URL('../public/data/eix-diagonal-layouts.json',import.meta.url))),layout=data.items['ifc-127512'];
 assert.equal(layout.spansMetres.length,12);assert.equal(layout.spansMetres.reduce((a,b)=>a+b),740);
 const options={axis:[[10,50],[84,50]],top:()=>14,ground:()=>5,containsDeck:([x,y])=>x>=10&&x<=84&&y>=47&&y<=53,blocked:[],scale:.1,widthMM:100,heightMM:100,layout};
 const result=planPiers(options);assert.equal(result.piers.length,11);assert.equal(result.omitted,0);assert.deepEqual(result.piers.map(p=>p.sourceStationMetres),layout.stationsMetres);
 for(const p of result.piers){assert(Math.abs(p.station-p.sourceStationMetres*.1)<1e-8);assert.equal(p.longitudinalAdjustmentMM,0);}
 assert.throws(()=>planPiers({...options,layout:{...layout,spansMetres:[35,50,70,70,100,70,70,70,70,50,35]}}),/projecte/);
});
