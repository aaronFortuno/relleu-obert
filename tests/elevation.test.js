import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeTerrarium,prepareElevationTiles,sampleHeight,createTerrainField} from '../src/elevation.js';
import {buildModel} from '../src/geometry.js';
test('Terrarium numeric bytes are decoded exactly; transparent and no-data samples stay invalid',()=>{
  const h=decodeTerrarium(new Uint8ClampedArray([128,12,128,255,0,0,0,255,255,255,255,255,128,2,0,0]));
  assert.equal(h[0],12.5);assert(h.slice(1).every(Number.isNaN));
});
test('isolated kilometre spikes and invalid samples are repaired, not exported as needles',()=>{
  const elev=new Float32Array(25).fill(100);elev[12]=8000;elev[6]=NaN;
  const {tiles,diagnostics}=prepareElevationTiles([{x:0,y:0,z:0,size:5,elev}]);
  assert.equal(tiles[0].elev[12],100);assert.equal(tiles[0].elev[6],100);assert.equal(diagnostics.repaired,2);assert.equal(diagnostics.spikes,1);
  assert.equal(elev[12],8000); // Original source remains untouched.
});
test('ordinary steep cliffs are preserved',()=>{
  const elev=new Float32Array(25).fill(100);elev[12]=550;
  const p=prepareElevationTiles([{x:0,y:0,z:0,size:5,elev}]);assert.equal(p.tiles[0].elev[12],550);assert.equal(p.diagnostics.repaired,0);
});
test('bilinear elevation reads neighbouring tiles at a shared edge',()=>{
  const a={z:1,x:0,y:1,size:2,elev:new Float32Array(4).fill(10)},b={z:1,x:1,y:1,size:2,elev:new Float32Array(4).fill(30)};
  assert.equal(sampleHeight([a,b],0,-30),20);
});
test('generated terrain uses triangle planes rather than the original nonlinear altitude',()=>{
  const f=createTerrainField({width:10,height:10,resolution:2,at:(x,y)=>x*x+y*y});
  assert.equal(f.sample(1,1),10); // Same two planar faces used by the visible mesh.
  assert.notEqual(f.sample(1,1),2);assert.equal(f.sample(5,5),50);
  assert.throws(()=>createTerrainField({width:10,height:10,resolution:2,at:()=>NaN}),/invàlida/);
});
test('inland water keeps its local altitude rather than becoming a sea-level pit',()=>{
  const f={type:'Feature',properties:{sourceLayer:'water',class:'swimming_pool'},geometry:{type:'Polygon',coordinates:[[[.002,.002],[.004,.002],[.004,.004],[.002,.004],[.002,.002]]]}},
    terrainRaster={epsg:4326,width:2,height:2,values:Float32Array.of(100,160,100,160),affine:[.01,0,0,0,.01,0]},
    m=buildModel({meta:{bbox:[0,0,.01,.01]},features:[f],terrainRaster},{size:50,resolution:2,trees:false});
  const water=m.parts.find(p=>p.id==='water');let max=0;for(let i=2;i<water.vertices.length;i+=3)max=Math.max(max,water.vertices[i]);assert(Math.abs(max-(m.context.ground(15,15)-.3))<1e-5);
});

test('inland absolute elevation is removed while relief differences and negative elevations remain',()=>{
 const region=h=>({meta:{bbox:[0,0,.001,.001]},features:[],dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4).fill(h)}]});
 for(const h of [0,350,-400])for(const exaggeration of [1,3]){
  const model=buildModel(region(h),{size:150,resolution:2,trees:false,exaggeration});
  assert.equal(model.context.ground(0,0),5);assert.equal(model.context.ground(150,150),5);
  assert.equal(model.context.verticalReference.originMeters,h);
 }
});

test('vertical exaggeration affects relative relief, with one common origin recorded in provenance',()=>{
 for(const shift of [0,350])for(const exaggeration of [1,3]){
  const localDEM={epsg:4326,width:2,height:2,affine:[.001,0,0,0,-.001,.001],pixelIsArea:false,values:new Float32Array([100,120,140,160].map(h=>h+shift)),metadata:{provider:'synthetic'}};
  const m=buildModel({meta:{bbox:[0,0,.001,.001]},features:[],dem:[],localDEM},{size:100,resolution:2,trees:false,exaggeration});
  assert(Math.abs(m.context.ground(0,100)-5)<1e-6);
  assert(Math.abs(m.context.ground(100,0)-(5+60*m.context.scale*exaggeration))<1e-6);
  assert.equal(m.provenance.verticalReference.originMeters,100+shift);
 }
});
