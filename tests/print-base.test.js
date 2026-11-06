import test from 'node:test';
import assert from 'node:assert/strict';
import {buildModel,updatePureRelief} from '../src/geometry.js';
import {auditPart} from '../src/solid-audit.js';
import {physicalBBox} from '../src/selection.js';
import {generateProceduralTunnelVoids} from '../src/procedural-tunnels.js';

const bbox=physicalBBox([0,0],10,10);
const [w,s,e,n]=bbox;
const terrainRaster={epsg:4326,width:2,height:2,values:Float32Array.of(0,80,0,80),affine:[e-w,0,w,0,n-s,s]};
const outline=[[[w,s],[(w+e)/2,s],[(w+e)/2,n],[w,n],[w,s]]];
const sea={geometry:{type:'Polygon',coordinates:outline},properties:{sourceLayer:'water',class:'ocean'}};
const coast={meta:{bbox},terrainRaster,features:[sea],oceans:[sea]};
const options={size:100,resolution:8,trees:false};

test('full model changes the terrain datum and the solid sea together, leaving the underside at zero',()=>{
  const standard=buildModel(coast,options);
  for(const baseThickness of [2,12.5,30]){
    const model=buildModel(coast,{...options,baseThickness});
    assert.equal(model.provenance.options.baseThickness,baseThickness);
    assert.equal(model.provenance.verticalReference.seaLevelMM,baseThickness);
    assert.equal(model.context.ground(0,50),baseThickness);
    const relief=({context})=>context.ground(100,50)-context.ground(0,50);
    assert(Math.abs(relief(model)-relief(standard))<1e-6);
    const water=auditPart(model.categories.find(part=>part.id==='water'));
    assert.deepEqual(water.errors,[]);
    assert.equal(water.bbox.min[2],0);
    assert.equal(water.bbox.max[2],baseThickness);
  }
});

test('cached pure relief gives the same geometry as a rebuild after a base change',()=>{
  const settings={...options,pureRelief:true};
  const original=buildModel(coast,settings);
  const changes={baseThickness:9.5,exaggeration:2};
  const updated=updatePureRelief(original,changes);
  const rebuilt=buildModel(coast,{...settings,...changes});
  assert.equal(updated.reliefVegetationContext.metres,original.reliefVegetationContext.metres);
  assert.equal(updated.provenance.verticalReference.minimumSurfaceMM,9.5);
  assert.equal(updated.provenance.verticalReference.seaLevelMM,9.5);
  assert.equal(Math.min(...updated.reliefGrid.heights),9.5);
  assert.deepEqual(updated.categories,rebuilt.categories);
  assert.throws(()=>updatePureRelief(original,{baseThickness:1.5}),/gruix de la base/);
});

test('a lake at the lowest point does not recess below the configured base',()=>{
  const lake={...sea,properties:{sourceLayer:'water',class:'lake'}};
  const flat={...terrainRaster,values:Float32Array.of(80,80,80,80)};
  const model=buildModel({meta:{bbox},terrainRaster:flat,features:[lake]},{...options,baseThickness:2});
  const water=auditPart(model.categories.find(part=>part.id==='inland-water'));
  assert.deepEqual(water.errors,[]);
  assert.equal(water.bbox.max[2],2);
  assert(water.bbox.min[2]>0);
});

test('an estimated opening that begins at the lowest elevation preserves the solid base',()=>{
  const tunnel={id:'hill',properties:{sourceLayer:'transportation',class:'trunk',brunnel:'tunnel'},
    geometry:{type:'LineString',coordinates:[[-.0001,.005],[.0101,.005]]}};
  const projection={width:100,height:100,scale:.09,project:([x,y])=>[x*10000,y*10000]};
  const result=generateProceduralTunnelVoids([tunnel],()=>100,{enabled:true,projection,
    verticalReference:{originMeters:100,minimumSurfaceMM:12.5},minimumVoidFloorMM:12.5,
    ground:(x)=>12.5+Math.max(0,6-Math.abs(x-50)/5)});
  assert.equal(result.items.length,1,JSON.stringify(result.metadata.omissions));
  const bore=auditPart(result.items[0]);
  assert.deepEqual(bore.errors,[]);
  assert.equal(bore.bbox.min[2],12.5);
});
