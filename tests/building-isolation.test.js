import test from 'node:test';
import assert from 'node:assert/strict';
import {buildModel,updateBuildings} from '../src/geometry.js';

const footprint=x=>[[x,.003],[x+.001,.003],[x+.001,.004],[x,.004],[x,.003]];
const building=(id,x,height=9)=>({
  id,properties:{sourceLayer:'building',render_height:height},
  geometry:{type:'Polygon',coordinates:[footprint(x)]}
});
const valid=building('house',.002);
const other=building('other',.006);
const malformed={
  ...building('bad',.004),
  geometry:{type:'MultiPolygon',coordinates:[[footprint(.004)],[[[.005,.003],[NaN,.003],[.005,.004],[.005,.003]]]]}
};
const duplicate=building('house',.002,18);
const region={meta:{bbox:[0,0,.01,.01]},features:[],dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4)}]};
const options={size:60,resolution:3,trees:false,buildingMode:'source'};
const features=[malformed,valid,duplicate,other];

test('one malformed building and one duplicate preserve the relief and the valid buildings',()=>{
  const model=buildModel({...region,features},options);
  assert.equal(model.buildingCount,2);
  assert.deepEqual(model.provenance.buildingVolumes.map(b=>b.id),['house','other']);
  assert(model.context.containsBuilding([15,21]));
  assert(!model.context.containsBuilding([27,21]),'the usable fragment of a rejected entity must not leave a footprint');
  assert(model.warnings.some(w=>w.includes('Edificis omesos per geometria invàlida: 1')));
  assert(model.warnings.some(w=>w.includes('Còpies d’edificis omeses: 1')));
  assert(model.categories.find(part=>part.id==='terrain')?.faces.length);
});

test('an incremental building layer recovers without rebuilding terrain, also when buildings are hidden',()=>{
  const base=buildModel(region,options),updated=updateBuildings(base,{features});
  assert.equal(updated.buildingCount,2);
  assert.equal(updated.context.ground,base.context.ground);
  const hidden=updateBuildings(updated,{}, {buildingMode:'none'});
  assert.equal(hidden.buildingCount,0);
  assert.equal(hidden.context.containsBuilding([15,21]),false);
  assert(hidden.context.buildingGeometry.obstacleMask.length>0);
});

test('dense building unions keep courtyards, overlaps and clipped obstacles',()=>{
  const square=(x,y,w)=>[[x,y],[x+w,y],[x+w,y+w],[x,y+w],[x,y]];
  const withRings=(id,coordinates)=>({...building(id,0),geometry:{type:'Polygon',coordinates}});
  const dense=Array.from({length:320},(_,i)=>withRings(`dense-${i}`,
    [square(.0003+(i%20)*.0004,.0003+Math.floor(i/20)*.0004,.00022)]));
  const courtyard=withRings('courtyard',[square(.0085,.007,.001),square(.0088,.0073,.0004).reverse()]);
  const overlap=withRings('overlap',[square(.00046,.00035,.00022)]);
  const clipped=withRings('clipped',[square(-.00025,.008,.0006)]);
  const features=[...dense,courtyard,overlap,clipped,dense[0],malformed];
  const base=buildModel(region,options),updated=updateBuildings(base,{features});
  const {project}=updated.context.proj,contains=updated.context.containsBuilding;
  assert.equal(updated.buildingCount,323);
  assert.deepEqual(updated.provenance.buildingVolumes.slice(-3).map(b=>b.id),['courtyard','overlap','clipped']);
  assert(contains(project([.0086,.0071])));
  assert(!contains(project([.009,.0075])));
  assert(contains(project([.0005,.0004])));
  assert(contains(project([.0001,.0082])));
  assert(!contains(project([.0006,.0082])));
  const hidden=updateBuildings(updated,{}, {buildingMode:'none'});
  assert.deepEqual(hidden.context.buildingGeometry.obstacleMask,updated.context.buildingGeometry.obstacleMask);
  assert(!hidden.context.containsBuilding(project([.0001,.0082])));
});

test('a waterfront footprint still uses exact clipping for narrow canals and open water',()=>{
  const ring=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
  const water=(...bounds)=>({properties:{sourceLayer:'water',class:'river'},
    geometry:{type:'Polygon',coordinates:[ring(...bounds)]}});
  const narrow=water(.00245,.00325,.00255,.00375),open=water(.0045,.0005,.0095,.0095);
  const model=buildModel({...region,features:[narrow,open,valid,other]}, {...options,resolution:10});
  const {containsBuilding,proj:{project}}=model.context;
  assert.equal(model.buildingCount,1);
  assert(containsBuilding(project([.0023,.0035])));
  assert(!containsBuilding(project([.0025,.0035])));
  assert(!containsBuilding(project([.0065,.0035])));
});
