import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {buildModel,updateBuildings,updateVegetation} from '../src/geometry.js';
import {isRailway,railwayOptions} from '../src/railways.js';
import {CATEGORIES,PALETTES,defaultAssignments,normalizeAssignments,groupMaterials} from '../src/materials.js';
import {threeMF} from '../src/export.js';
import {unzipSync,strFromU8} from 'fflate';
import {topSampler} from '../src/bridge-completion.js';
import {auditPart} from '../src/solid-audit.js';
import {polygonTester} from '../src/polygon-index.js';

const api=await Module();api.setup();
const line=(id,coordinates,properties)=>({type:'Feature',id,properties:{sourceLayer:'transportation',...properties},geometry:{type:'LineString',coordinates}});
function data(features,values=new Float32Array(121)){
 return {meta:{bbox:[0,0,.01,.01]},features,localDEM:{width:11,height:11,epsg:4326,affine:[.001,0,0,0,.001,0],pixelIsArea:false,values,metadata:{}}};
}
const options={size:100,widthMM:100,heightMM:100,resolution:10,trees:false};
const minmax=(p,axis=2)=>{let min=Infinity,max=-Infinity;for(let i=axis;i<p.vertices.length;i+=3){min=Math.min(min,p.vertices[i]);max=Math.max(max,p.vertices[i]);}return [min,max];};
const part=(m,id)=>m.categories.find(p=>p.id===id);
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);

test('rail semantics select rail/transit/railway tags without treating a dirt track as railway',()=>{
 for(const p of [{class:'rail'},{class:'light_rail'},{class:'transit',subclass:'tram'},{class:'transit',subclass:'subway'},{railway:'light_rail'}])assert.equal(isRailway(p),true);
 for(const p of [{class:'track'},{class:'path'},{class:'transit',subclass:'bus'},{class:'rail',subclass:'abandoned'},{railway:'disused'}])assert.equal(isRailway(p),false);
 assert.deepEqual(railwayOptions(),{railRise:0});for(const railRise of [-1,.25,2,NaN])assert.throws(()=>railwayOptions({railRise}),/ferrocarrils/);
});

test('nine road/rail rise combinations produce separate physical heights independent of exaggeration',()=>{
 const region=data([line('road',[[.001,.003],[.009,.003]],{class:'primary'}),line('rail',[[.001,.007],[.009,.007]],{class:'rail'})]);
 for(const roadRise of [0,.5,1])for(const railRise of [0,.5,1]){
  const m=buildModel(region,{...options,roadRise,railRise,exaggeration:5});
  near(minmax(part(m,'roads'))[1],5+roadRise);near(minmax(part(m,'railways'))[1],5+roadRise+railRise);
  assert.equal(m.provenance.railways.surfaceRiseMM,roadRise+railRise);assert.equal(m.provenance.railways.incrementMM,railRise);
  const rail=part(m,'railways'),[y0,y1]=minmax(rail,1);assert(y1-y0>=.4399,'minimum platform width must survive small scales');
 }
 const defaultRise=buildModel(region,{...options,roadRise:.5});
 near(minmax(part(defaultRise,'railways'))[1],minmax(part(defaultRise,'roads'))[1]);
});

test('rail crossings occupy their own ground surface and do not duplicate the road footprint',()=>{
 const region=data([line('road',[[.001,.005],[.009,.005]],{class:'primary'}),line('rail',[[.005,.001],[.005,.009]],{class:'transit',subclass:'tram'})]),m=buildModel(region,{...options,roadRise:.5,railRise:1});
 assert(m.context.railPoly.length);assert(m.context.roadOnlyPoly.length);
 assert(m.context.containsRoad([50,50]));assert(m.context.containsRoad([50,70]));
 // Both category surfaces remain at their own intended level at a crossing.
 near(minmax(part(m,'roads'))[1],5.5);near(minmax(part(m,'railways'))[1],6.5);
});

function upperSurface(mesh,minimum=-Infinity){
 const points=Array.from({length:mesh.vertices.length/3},(_,i)=>Array.from(mesh.vertices.subarray(i*3,i*3+3)));
 const upward=[];
 for(let i=0;i<mesh.faces.length;i+=3){
  const face=Array.from(mesh.faces.subarray(i,i+3)),[a,b,c]=face.map(index=>points[index]);
  if(Math.min(a[2],b[2],c[2])>=minimum&&(b[0]-a[0])*(c[1]-a[1])>(b[1]-a[1])*(c[0]-a[0]))upward.push(...face);
 }
 return topSampler(points,upward);
}

test('railway grade is unchanged by road crossings and cuts or fills a hillside',()=>{
 const values=new Float32Array(121);
 for(let y=0;y<11;y++)for(let x=0;x<11;x++)values[y*11+x]=100+y*4+x+[0,-3,-9,-13,4,24,15,-5,-6,-3,0][x];
 const tracks=[line('west',[[0,.005],[.003,.005]],{class:'rail',width:8}),line('east',[[.003,.005],[.01,.005]],{class:'rail',width:8})];
 const road=line('crossing',[[.005,0],[.005,.01]],{class:'primary'});
 const solo=buildModel(data(tracks,values),options),crossed=buildModel(data([...tracks,road],values),options);
 const rail=part(crossed,'railways'),top=upperSurface(rail),base=upperSurface(part(crossed,'terrain'));
 const roads=polygonTester(crossed.context.roadOnlyPoly);
 assert.equal(crossed.provenance.railways.profiles,1,'two adjacent mapped fragments must share one grade');
 assert.deepEqual(rail.vertices,part(solo,'railways').vertices);
 assert.deepEqual(rail.faces,part(solo,'railways').faces);
 assert(roads([50,49])&&!roads([50,50])&&roads([50,51]));
 assert(top(30,50)>crossed.context.ground(30,50)+.5,'the rail should span the hollow');
 assert(top(50,50)<crossed.context.ground(50,50)-.5,'the rail should cut through the hill');
 const start=top(0,50),end=top(100,50);
 for(const x of [0,15,30,50,75,100]){
  near(top(x,49.8),top(x,50.2));
  near(top(x,50),start+(end-start)*x/100);
  near(base(x,50),top(x,50)-.65);
 }
 for(const mesh of crossed.categories)assert.deepEqual(auditPart(mesh).errors,[]);
 const upgraded=buildModel(data([...tracks,road],values),{...options,surfaceRoads:'independent',majorRoads:true,smoothProfiles:true},()=>{},api);
 assert.deepEqual(part(upgraded,'railways').vertices,rail.vertices);
 assert.deepEqual(part(upgraded,'railways').faces,rail.faces);
 assert(part(upgraded,'roads')?.faces.length);
});

test('a folded rail axis leaves the terrain and does not remove another railway',()=>{
 const curve=line('curve',[[.001,.007],[.005,.008],[.009,.007]],{class:'rail'});
 const invalid=line('fold',[[.002,.002],[.005,.002],[.003,.002]],{class:'rail'});
 const model=buildModel(data([curve,invalid]),options);
 const containsRail=polygonTester(model.context.railPoly);
 assert.equal(model.provenance.railways.profiles,1);
 assert.deepEqual(model.provenance.railways.omissions.map(o=>o.sourceFeatureIds),[['fold']]);
 assert(containsRail([50,80])&&!containsRail([40,20]));
 near(upperSurface(part(model,'terrain'),4.5)(40,20),5);
 assert.deepEqual(auditPart(part(model,'railways')).errors,[]);
});

test('a mapped railway tunnel never becomes a raised line over the mountain',()=>{
 const m=buildModel(data([line('underground',[[.001,.005],[.009,.005]],{class:'rail',brunnel:'tunnel'})]),{...options,railRise:1});
 assert.equal(part(m,'railways'),undefined);assert.equal(m.context.railPoly.length,0);
 assert.equal(part(m,'roads'),undefined);
 const absent=buildModel(data([line('abandoned',[[.001,.005],[.009,.005]],{class:'rail',subclass:'abandoned'})]),options);
 assert.equal(part(absent,'roads'),undefined);assert.equal(part(absent,'railways'),undefined);
});

test('railway viaducts lift their top platform while keeping underside, pier heights and source profile',()=>{
 const values=new Float32Array(121);for(let y=0;y<11;y++)values.set([50,40,30,20,10,0,10,20,30,40,50],y*11);
 const region=data([line('rail-bridge',[[.001,.005],[.009,.005]],{class:'transit',subclass:'tram',brunnel:'bridge',width:8})],values);
 let reference;
 for(const railRise of [0,.5,1]){
  const m=buildModel(region,{...options,roadRise:.5,railRise},()=>{},api),bridge=m.context.bridges[0],detail=m.provenance.infrastructure.completion.details[0];
  assert.equal(bridge.railway,true);assert.equal(bridge.category,8);assert(part(m,'railways'));assert.equal(part(m,'roads'),undefined);
  assert(detail.piers.length>0);assert.equal(detail.connectedComponents,1);assert.equal(detail.railway,true);
  const centre=bridge.axis[Math.floor(bridge.axis.length/2)],under=bridge.top(...centre)-bridge.thickness;
  const r={under,piers:detail.piers.map(p=>({ring:p.ring,topRing:p.topRing})),z:bridge.top(...centre)};
  if(reference){near(r.under,reference.under);near(r.z-reference.z,railRise);assert.deepEqual(r.piers,reference.piers);}else reference=r;
  assert.equal(m.provenance.infrastructure.deckProfiles[0].surfaceRiseMM,.5+railRise);
  const incremental=updateBuildings(m,{features:region.features,meta:region.meta},{maxBuildingHeight:3});
  assert.strictEqual(part(incremental,'railways').vertices,part(m,'railways').vertices);
  assert.deepEqual(incremental.provenance.railways,m.provenance.railways);
 }
});

test('incremental buildings and vegetation preserve railway buffers, provenance and bridge geometry',()=>{
 const region=data([line('rail',[[.001,.007],[.009,.007]],{class:'rail'})]),m=buildModel(region,{...options,railRise:.5});
 const a=updateBuildings(m,{features:region.features,meta:region.meta},{maxBuildingHeight:3}),b=updateVegetation(a,{trees:false,density:.5});
 assert.strictEqual(part(a,'railways').vertices,part(m,'railways').vertices);assert.strictEqual(part(b,'railways').vertices,part(m,'railways').vertices);
 assert.deepEqual(b.provenance.railways,m.provenance.railways);
 const zip=unzipSync(threeMF(groupMaterials(b,4),{bambu:true})),p=JSON.parse(strFromU8(zip['Metadata/provenance.json']));assert.deepEqual(p.railways,m.provenance.railways);
});

test('nine semantic categories preserve all triangles with 1/2/4/8 filaments and migrate old assignments',()=>{
 const categories=CATEGORIES.map((c,i)=>({...c,vertices:new Float32Array([i,0,0,i+1,0,0,i,1,0]),faces:new Uint32Array([0,1,2])}));assert.equal(categories.length,9);
 for(const n of [1,2,4,8]){
  const defaults=defaultAssignments(n);assert.equal(defaults.length,9);assert.equal(PALETTES[n].length,n);
  const m=groupMaterials({categories,provenance:{}},n);assert.equal(m.parts.length,n);assert.equal(m.parts.reduce((s,p)=>s+p.faces.length,0),27);
  const old=defaults.slice(0,8),snapshot=old.slice(),migrated=normalizeAssignments(n,old);assert.deepEqual(old,snapshot);assert.equal(migrated[8],old[3]);
  assert.equal(groupMaterials({categories,provenance:{}},n,old).parts.reduce((s,p)=>s+p.faces.length,0),27);
 }
 const custom=defaultAssignments(8);assert.equal(custom[8],custom[2]);assert.notEqual(custom[8],custom[3]);
 custom[8]=7;const model=groupMaterials({categories:[categories[8]],provenance:{}},8,custom);assert.equal(model.parts[0].id,'material-8');
 for(const invalid of [[0],[0,0,0,0,0,0,0,0,0,0],Array(9).fill(4)])assert.throws(()=>normalizeAssignments(4,invalid),/assignació/);
});


test('a known deck matched to railway data preserves its original XYZ and underside',()=>{
 const values=new Float32Array(121);for(let y=0;y<11;y++)values.set([50,40,30,20,10,0,10,20,30,40,50],y*11);
 const coordinates=[[.001,.0047,40],[.009,.0047,40],[.009,.0053,40],[.001,.0053,40]],deck={id:'surveyed-rail',coordinates,faces:[0,1,2,0,2,3],outlines:[[...coordinates,coordinates[0]]],axis:[[.001,.005],[.009,.005]]};
 const region={...data([line('mapped-rail',[[.001,.005],[.009,.005]],{class:'rail',brunnel:'bridge'})],values),infrastructure:{items:[deck]}};
 const snapshot=structuredClone(deck),low=buildModel(region,{...options,roadRise:.5,railRise:0},()=>{},api),high=buildModel(region,{...options,roadRise:.5,railRise:1},()=>{},api);
 assert.deepEqual(deck,snapshot);assert.equal(high.provenance.infrastructure.knownCount,1);assert.equal(high.provenance.infrastructure.proceduralCount,0);
 const a=low.context.bridges[0],b=high.context.bridges[0];assert.equal(b.railway,true);near(minmax(a.mesh)[0],minmax(b.mesh)[0]);near(minmax(b.mesh)[1]-minmax(a.mesh)[1],1);
 assert.equal(high.provenance.infrastructure.railwayPrintableThicknessMM,2.1);
});
