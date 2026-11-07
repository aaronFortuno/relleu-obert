import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {strFromU8,unzipSync} from 'fflate';
import {Surface,buildModel,updateBuildings} from '../src/geometry.js';
import {buildRequest} from '../src/build-request.js';
import {scaledBBox,selectionPose} from '../src/selection.js';
import {auditPart} from '../src/solid-audit.js';
import {threeMF} from '../src/export.js';

const anchor=[2.18,41.4],centre=[anchor[1],anchor[0]];
const geo=([east,north])=>[anchor[0]+east/(111320*Math.cos(anchor[1]*Math.PI/180)),anchor[1]+north/111320];
const rectangle=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
const footprint={type:'Polygon',coordinates:[rectangle(-8,-5,8,5).map(geo)]};
const roof=new Surface();
roof.polygon([rectangle(-8,-5,8,5)],x=>x<0?14:20);
const shell=roof.solid(()=>0);
const vertices=Float32Array.from(shell.vertices,(_,i)=>i%3===0?shell.vertices[i]:i%3===1?shell.vertices[i+1]:-shell.vertices[i-1]);
const landmark={id:'test-tower',name:'Test tower',revision:'r1',height:20,anchor,footprint,vertices,faces:shell.faces,
  license:'CC-BY-4.0',attribution:'Test author',sources:[],replacement:{featureIds:['icgc-tower'],families:['cadastre-tower']}};
const polygon=(w,s,e,n)=>[rectangle(w,s,e,n).map(geo)];
const neighbour=polygon(24,-10,31,0);
const feature=(id,polygons,properties={})=>({id,type:'Feature',geometry:{type:'MultiPolygon',coordinates:polygons},
  properties:{sourceLayer:'building',render_height:8,...properties}});
const sources={
  icgc:[feature('icgc-tower',[polygon(0,-5,17,5),neighbour])],
  catastre:[feature('catastre-part',[polygon(-5,-5,8,12)],{family:'cadastre-tower'}),feature('house',[neighbour])],
  osm:[feature('osm-tower',[polygon(-8,-5,8,5)]),feature('house',[neighbour])]
};
function generate({source='icgc',denominator=2000,rotation=0,center=centre,models=[landmark],api}={}){
  const pose=selectionPose(scaledBBox(center,100,100,denominator),rotation);
  const region={meta:{bbox:pose.bbox,buildingSource:source},features:sources[source],
    dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4)}],singularModels:models};
  const message=structuredClone(buildRequest(region,{size:100,widthMM:100,heightMM:100,targetScale:denominator,
    selectionPose:pose,resolution:4,trees:false,majorRoads:false,buildingMode:'source'}));
  return buildModel(message.region,message.options,undefined,api);
}
const tower=model=>model.provenance.buildingVolumes.find(v=>v.id===landmark.id);
const buildings=model=>model.categories.find(part=>part.id==='buildings');
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.002,`${actual} vs ${expected}`);

test('catalogue solid replaces each source without removing nearby polygons on the same feature',()=>{
  const initial=generate(),ground=initial.categories.find(part=>part.id==='terrain').vertices;
  let model=initial;
  for(const [source,features] of Object.entries(sources)){
    model=updateBuildings(model,{features,meta:{...model.context.meta,buildingSource:source}});
    assert.equal(model.buildingCount,2,source);
    assert.equal(tower(model)?.roofShape,'catalogue',source);
    assert.equal(tower(model).landmark.revision,'r1');
    assert.equal(model.provenance.buildingSource,source);
    assert.strictEqual(model.categories.find(part=>part.id==='terrain').vertices,ground);
  }
  const files=unzipSync(threeMF(model,{bambu:true}));
  assert.equal(JSON.parse(strFromU8(files['Metadata/provenance.json'])).buildingVolumes.find(v=>v.id===landmark.id).landmark.attribution,'Test author');
});

test('catalogue solid projects from its geographic anchor at different scales and rotations',()=>{
  for(const [denominator,rotation] of [[2000,0],[2000,90],[5000,37]]){
    const model=generate({denominator,rotation}),{proj,ground}=model.context;
    near(tower(model).roof-ground(50,50),20000/denominator);
    const [x,y]=proj.project(geo([8,5]));
    const coordinates=buildings(model).vertices;
    assert.ok(Array.from({length:coordinates.length/3},(_,i)=>i*3).some(i=>
      Math.abs(coordinates[i]-x)<.002&&Math.abs(coordinates[i+1]-y)<.002&&Math.abs(coordinates[i+2]-tower(model).roof)<.002));
  }
});

test('height limit flattens the catalogue roof and hiding buildings removes the solid',()=>{
  const model=generate();
  const limited=updateBuildings(model,{}, {buildingMode:'limited',maxBuildingHeight:5});
  near(tower(limited).roof-limited.context.ground(50,50),2.5);
  assert.equal(tower(limited).roofShape,'flat');
  assert.equal(tower(updateBuildings(model,{}, {buildingMode:'none'})),undefined);
  assert.equal(updateBuildings(model,{}, {buildingMode:'none'}).buildingCount,0);
});

test('surveyed base replaces surface elevations locally and anchors the catalogue roof',()=>{
  const terrainBaseElevation=-10;
  const model=generate({rotation:37,models:[{...landmark,kind:'building',terrainBaseElevation}]});
  const {proj,ground,verticalReference:{originMeters,minimumSurfaceMM}}=model.context;
  const height=z=>originMeters+(z-minimumSurfaceMM)/(proj.scale*1.5);
  near(height(ground(...proj.project(anchor))),terrainBaseElevation);
  near(height(ground(...proj.project(geo([70,0])))),0);
  near(tower(model).roof,ground(...proj.project(anchor))+20*proj.scale);
  assert.equal(tower(model).landmark.terrainBaseElevation,terrainBaseElevation);
});

test('rotated boundary closes the mesh and invalid catalogue meshes leave original buildings intact',async()=>{
  const api=await Module();
  api.setup();
  const edge=geo([99,0]),model=generate({center:[edge[1],edge[0]],rotation:3,api,source:'osm'});
  assert.equal(tower(model)?.roofShape,'catalogue');
  assert.equal(auditPart(buildings(model)).closed,true);
  assert.ok(auditPart(buildings(model)).bbox.min[0]>=-.001);
  const invalid=generate({models:[{...landmark,kind:'building',terrainBaseElevation:-10,faces:landmark.faces.slice(3)}]});
  assert.equal(tower(invalid),undefined);
  assert.equal(invalid.buildingCount,2);
  near(invalid.context.verticalReference.originMeters,0);
});
