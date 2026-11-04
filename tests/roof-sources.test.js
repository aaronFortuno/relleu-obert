import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {parseOSMBuildings,fetchOSMBuildings} from '../src/roof-sources.js';
import {roofProfile} from '../src/building-roofs.js';import {buildModel,makeProjection} from '../src/geometry.js';import {loadBuildingLayer} from '../src/sources.js';import {auditPart} from '../src/solid-audit.js';import {unzipSync,strFromU8} from 'fflate';import {threeMF} from '../src/export.js';
const box=(x=0,y=0,s=.001)=>[{lon:x,lat:y},{lon:x+s,lat:y},{lon:x+s,lat:y+s},{lon:x,lat:y+s},{lon:x,lat:y}];
const way=(id,tags={},geometry=box())=>({type:'way',id,tags:{building:'yes',height:'10',...tags},geometry});

test('original roof attributes, explicit metric height and estimated levels remain distinct',()=>{
 const r=parseOSMBuildings({elements:[way(1,{'roof:shape':'gabled','roof:height':'3','roof:direction':'N',height:'12 m'}),way(2,{'building:levels':'2',height:undefined},box(.002))]});
 assert.equal(r.features[0].properties['roof:shape'],'gabled');assert.equal(r.features[0].properties.render_height,12);assert.equal(r.features[0].properties.height_estimated,false);assert.equal(r.features[1].properties.render_height,6);assert.equal(r.features[1].properties.height_estimated,true);assert.equal(r.metadata.roofAttributeCount,1);assert.equal(r.features[0].properties.roofSource.element,'way/1');
});

test('multipolygon members join closed outer rings and retain courtyards; incomplete geometry is omitted',()=>{
 const outer=box(),hole=box(.0002,.0002,.0002),r=parseOSMBuildings({elements:[{type:'relation',id:5,tags:{type:'multipolygon',building:'yes',height:'8'},members:[{type:'way',ref:1,role:'outer',geometry:outer.slice(0,3)},{type:'way',ref:2,role:'outer',geometry:outer.slice(2)},{type:'way',ref:3,role:'inner',geometry:hole}]},way(6,{},box().slice(0,3))]});
 assert.equal(r.features.length,1);assert.equal(r.features[0].geometry.coordinates[0].length,2);assert(r.warnings.some(w=>w.includes('6')));assert.throws(()=>parseOSMBuildings({elements:[],remark:'runtime timeout'}),/incompleta/);
});

test('mapped parts replace only their occupied parent footprint, without duplicating the envelope',()=>{
 const r=parseOSMBuildings({elements:[way(1),way(2,{'building:part':'yes',height:'15','roof:shape':'pyramidal','roof:height':'3'},box(0,0,.0005))]});
 const parent=r.features.find(f=>f.id==='osm-way-1'),part=r.features.find(f=>f.id==='osm-way-2');assert(parent&&part);assert.equal(part.properties.family,parent.id);assert.equal(parent.geometry.coordinates[0][0].length,7);
 const full=parseOSMBuildings({elements:[way(1),way(2,{'building:part':'yes'})]});assert.equal(full.features.length,1);assert.equal(full.features[0].id,'osm-way-2');
});

test('remote requests cache successful bounded queries, retry providers sequentially and retry failures later',async()=>{
 let calls=0;const urls=[];const fetcher=async u=>{urls.push(u);calls++;return calls===1?new Response('',{status:503}):new Response(JSON.stringify({elements:[way(1)]}));};
 const opts={endpoints:['https://one.invalid/interpreter','https://two.invalid/interpreter'],timeoutMS:100};
 const a=await fetchOSMBuildings([0,0,.001,.001],fetcher,opts),b=await fetchOSMBuildings([0,0,.001,.001],fetcher,opts);assert.strictEqual(a,b);assert.equal(calls,2);assert(urls[0].includes('out%20meta%20geom'));assert(urls[0].includes('timeout%3A8'));
 let failures=0;const bad=async()=>{failures++;return new Response('',{status:429});};for(let i=0;i<2;i++)await assert.rejects(()=>fetchOSMBuildings([0,0,.001,.001],bad,opts),/HTTP 429/);assert.equal(failures,4);
 await assert.rejects(()=>fetchOSMBuildings([0,0,1,1],fetcher,opts),/16 km/);assert.equal(calls,2);
});

test('timeouts abort and oversized results fail without retaining a poisoned cache',async()=>{
 let aborts=0;const fetcher=async(_,o)=>new Promise((resolve,reject)=>{o.signal.addEventListener('abort',()=>{aborts++;reject(Error('cancelled'));});});
 await assert.rejects(()=>fetchOSMBuildings([0,0,.001,.001],fetcher,{endpoints:['https://one.invalid'],timeoutMS:100}),/cancelled/);assert.equal(aborts,1);
 await assert.rejects(()=>fetchOSMBuildings([0,0,.001,.001],async()=>new Response('{}',{headers:{'content-length':'6000001'}}),{endpoints:['https://one.invalid'],timeoutMS:100}),/gran/);
});

test('osm3d unavailability preserves base OSM buildings, reports fallback and remains retryable',async()=>{
 const prior=globalThis.fetch,base={meta:{bbox:[0,0,.001,.001]},features:[{...way(1),properties:{sourceLayer:'building'}}]};let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('',{status:503});};
 try{for(let i=0;i<2;i++){const r=await loadBuildingLayer(base,{source:'osm3d'});assert.strictEqual(r.features[0],base.features[0]);assert.equal(r.metadata.roofSourceUnavailable,true);assert(r.warnings.some(w=>w.includes('planes')));}assert.equal(calls,4);}finally{globalThis.fetch=prior;}
});

test('an empty osm3d response keeps base footprints and distinguishes absent data from a failed request',async()=>{
 const prior=globalThis.fetch,base={meta:{bbox:[0,0,.001,.001]},features:[{...way(1),properties:{sourceLayer:'building'}}]};let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({elements:[]});};
 try{
  const layer=await loadBuildingLayer(base,{source:'osm3d'});
  assert.strictEqual(layer.features[0],base.features[0]);
  assert.equal(layer.metadata.count,1);
  assert.equal(layer.metadata.roofSourceEmpty,true);
  assert.equal(layer.metadata.roofSourceUnavailable,undefined);
  assert(layer.warnings.some(w=>w.includes('coberta plana')));
  assert.strictEqual(await loadBuildingLayer(base,{source:'osm3d'}),layer);
  const empty=await loadBuildingLayer({...base,features:[]},{source:'osm3d'});
  assert.deepEqual(empty.features,[]);
  assert.deepEqual(empty.warnings,[]);
  assert.equal(calls,1);
 }finally{globalThis.fetch=prior;}
});

test('roof angle and mapped orientation give pitched roofs; hipped, pyramidal and round use bounded partitions',()=>{
 const outline=[[0,0],[10,0],[10,6],[0,6],[0,0]],g=roofProfile({'roof:shape':'gabled','roof:angle':'45','roof:orientation':'along'},outline,1,12);assert.equal(g.shape,'gabled');assert(Math.abs(g.heightMM-3)<1e-8);assert.equal(g.factor(5,3),1);
 for(const shape of ['hipped','pyramidal','round']){const p=roofProfile({'roof:shape':shape,'roof:height':2},outline,1,10);assert(p.parts.length<=12);assert.equal(p.factor(5,3),1);assert.equal(p.factor(5,0),0);}
 assert.equal(roofProfile({'roof:shape':'skillion','roof:height':2},outline,1,10).parts,null);assert.equal(roofProfile({'roof:shape':'gabled','roof:height':2,min_height:9},outline,1,10).parts,null);
});

test('Torre Glòries fixture produces a non-conical dome from actual source parameters and keeps limited mode flat',async()=>{
 const fixture=JSON.parse(await readFile('public/data/osm3d-glories.json')),r=parseOSMBuildings(fixture),f=r.features[0];assert.equal(f.id,'osm-way-44213122');assert.equal(f.properties.render_height,144.4);assert.equal(f.properties['roof:height'],'68');assert.equal(f.properties['roof:shape'],'dome');
 const bbox=[2.1892,41.4020,2.1907,41.4037],proj=makeProjection(bbox,100),outline=f.geometry.coordinates[0][0].map(proj.project),profile=roofProfile(f.properties,outline,proj.scale,144.4);assert.equal(profile.shape,'dome');assert.equal(profile.parts.length,144);
 const center=outline.slice(0,-1).reduce((c,p)=>[c[0]+p[0]/(outline.length-1),c[1]+p[1]/(outline.length-1)],[0,0]),edge=outline[0],mid=center.map((v,i)=>(v+edge[i])/2);assert(profile.factor(...mid)>.7,'a dome must rise above the straight cone interpolation');
 const dem={width:2,height:2,epsg:4326,affine:[.003,0,2.188,0,.003,41.401],pixelIsArea:false,values:new Float32Array(4),metadata:{}},data={meta:{bbox,buildings:r.metadata},features:r.features,localDEM:dem};
 const limited=buildModel(data,{size:100,resolution:3,trees:false}),source=buildModel(data,{size:100,resolution:3,trees:false,buildingMode:'source'});assert.equal(limited.provenance.buildingVolumes[0].roofShape,'flat');assert.equal(source.provenance.buildingVolumes[0].roofShape,'dome');
 const part=source.categories.find(c=>c.id==='buildings');assert.deepEqual(auditPart(part).errors,[]);assert(Math.max(...part.vertices.filter((_,i)=>i%3===2))>60);
 const p=JSON.parse(strFromU8(unzipSync(threeMF(source))['Metadata/provenance.json']));assert.equal(p.buildingVolumes[0].roofShape,'dome');assert.equal(p.buildings.license,'ODbL 1.0');
});

test('invalid source direction/angle never becomes an invented pitched roof, and min_height stays explicit',()=>{
 const outline=[[0,0],[10,0],[10,6],[0,6],[0,0]];
 for(const raw of ['bad',361,-1])assert.equal(roofProfile({'roof:shape':'gabled','roof:height':2,'roof:direction':raw},outline,1,10).parts,null);
 assert.equal(roofProfile({'roof:shape':'gabled','roof:angle':89},outline,1,10).parts,null);
 const p=roofProfile({'roof:shape':'flat',min_height:'6'},outline,1,12);assert.equal(p.baseOffsetMM,6);assert.equal(p.shape,'flat');
});

test('incomplete relations and oversized query sentinels cannot silently erase valid buildings',()=>{
 const r=parseOSMBuildings({elements:[way(8),{type:'relation',id:9,tags:{type:'multipolygon',building:'yes'},members:[{type:'way',ref:100,role:'outer'}]}]});
 assert.equal(r.features.length,1);assert(r.warnings.some(w=>w.includes('9')));
 assert.throws(()=>parseOSMBuildings({elements:Array.from({length:1501},(_,i)=>way(i))}),/incompleta|límit/);
});

test('a suspended part preserves its tagged lower boundary in source mode and is grounded in limited mode',async()=>{
 const r=parseOSMBuildings({elements:[way(3,{height:'12',min_height:'6','building:part':'yes','roof:shape':'flat'})]}),data={meta:{bbox:[0,0,.001,.001]},features:r.features,localDEM:{width:2,height:2,epsg:4326,affine:[.002,0,0,0,.002,0],pixelIsArea:false,values:new Float32Array(4),metadata:{}}};
 const source=buildModel(data,{size:100,resolution:2,trees:false,buildingMode:'source'}),limited=buildModel(data,{size:100,resolution:2,trees:false});
 const min=model=>Math.min(...model.categories.find(c=>c.id==='buildings').vertices.filter((_,i)=>i%3===2));
 assert(min(source)>10);assert(min(limited)<5);assert.equal(source.provenance.buildingVolumes[0].baseOffsetMM,6*source.context.scale);
});


test('invalid request budgets do not reach the network',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('network');};
 for(const timeoutMS of [NaN,Infinity,1.5,0,12001])await assert.rejects(()=>fetchOSMBuildings([0,0,.001,.001],fetcher,{timeoutMS}),/pressupost/);
 await assert.rejects(()=>fetchOSMBuildings([200,0,200.001,.001],fetcher),/regió invàlida/);assert.equal(calls,0);
});
