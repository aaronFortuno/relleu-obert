import test from 'node:test';
import assert from 'node:assert/strict';
import {buildModel} from '../src/geometry.js';
import {auditPart} from '../src/solid-audit.js';
import {isStandingWater,shorelineLevel} from '../src/standing-water.js';

test('standing water classification keeps waterways terrain-following',()=>{
  assert.equal(isStandingWater({class:'lake'}),true);
  assert.equal(isStandingWater({class:'lake',water:'river'}),false);
  assert.equal(isStandingWater({class:'river'}),false);
  assert.equal(isStandingWater({class:'ocean'}),false);
});

test('a cropped lake estimates its level from the actual shoreline',()=>{
  const shoreline=[[[0,2],[4,2],[4,8],[0,8],[0,2]]];
  assert.equal(shorelineLevel(shoreline,(x,y)=>x===0&&y>2&&y<8?30:15,10,10),15);
});

test('lake tile fragments form a single flat water surface, while rivers retain slope',()=>{
  const box=(x0,y0,x1,y1,kind)=>({type:'Feature',properties:{sourceLayer:'water',class:kind},
    geometry:{type:'Polygon',coordinates:[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]}});
  const data={meta:{bbox:[0,0,.01,.01]},
    features:[box(.001,.002,.003,.004,'lake'),box(.003,.002,.005,.004,'lake'),
      box(.006,.002,.007,.004,'lake'),box(.008,.002,.009,.004,'river')],
    localDEM:{epsg:4326,width:2,height:2,affine:[.01,0,0,0,-.01,.01],pixelIsArea:false,
      values:new Float32Array([100,140,100,140]),metadata:{provider:'synthetic'}}};
  const model=buildModel(data,{size:100,resolution:8,trees:false});
  const water=model.categories.find(part=>part.id==='inland-water');
  const first=new Set(),second=new Set(),river=new Set();
  for(let i=0;i<water.vertices.length;i+=3){
    const x=water.vertices[i],z=water.vertices[i+2];
    if(z>0)(x<55?first:x<75?second:river).add(z);
  }
  assert.equal(first.size,1);
  assert.equal(second.size,1);
  assert([...first][0]<[...second][0]);
  assert(river.size>1);
  assert.deepEqual(auditPart(water).errors,[]);
});

test('a mapped stream below grid resolution retains a printable width and can be hidden',()=>{
  const stream={type:'Feature',properties:{sourceLayer:'waterway',class:'stream'},
    geometry:{type:'LineString',coordinates:[[.001,.005],[.009,.005]]}};
  const data={meta:{bbox:[0,0,.01,.01]},features:[stream],
    localDEM:{epsg:4326,width:2,height:2,affine:[.01,0,0,0,-.01,.01],pixelIsArea:false,
      values:new Float32Array([100,140,100,140]),metadata:{provider:'synthetic'}}};
  const model=options=>buildModel(data,{size:100,resolution:8,trees:false,...options}).categories.find(part=>part.id==='inland-water');
  const water=auditPart(model({})),wide=auditPart(model({streamWidth:2}));
  assert.deepEqual(water.errors,[]);
  assert(Math.abs(water.bbox.max[1]-water.bbox.min[1]-.45)<.001);
  assert(Math.abs(wide.bbox.max[1]-wide.bbox.min[1]-.90)<.001);
  assert.equal(model({streams:false}),undefined);
});
