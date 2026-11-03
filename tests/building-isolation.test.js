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
