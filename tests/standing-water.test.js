import test from 'node:test';
import assert from 'node:assert/strict';
import {buildModel} from '../src/geometry.js';
import {topSampler} from '../src/bridge-completion.js';
import {threeMF} from '../src/export.js';
import {groupMaterials} from '../src/materials.js';
import {auditPart} from '../src/solid-audit.js';
import {isStandingWater,shorelineLevel} from '../src/standing-water.js';
import {auditThreeMF} from '../src/three-mf-audit.js';

const box=(x0,y0,x1,y1,kind)=>({type:'Feature',properties:{sourceLayer:'water',class:kind},
  geometry:{type:'Polygon',coordinates:[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]}});
const localDEM={epsg:4326,width:2,height:2,affine:[.01,0,0,0,-.01,.01],pixelIsArea:false,
  values:new Float32Array([100,140,100,140]),metadata:{provider:'synthetic'}};

function sampleSurface(part,direction=1){
  const {vertices,faces}=part;
  const points=Array.from({length:vertices.length/3},(_,i)=>vertices.subarray(i*3,i*3+3));
  const surfaceFaces=[];
  for(let i=0;i<faces.length;i+=3){
    const triangle=faces.subarray(i,i+3),[a,b,c]=Array.from(triangle,index=>points[index]);
    const cross=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(cross*direction>0)surfaceFaces.push(...triangle);
  }
  return topSampler(points,surfaceFaces);
}

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
  const data={meta:{bbox:[0,0,.01,.01]},
    features:[box(.001,.002,.003,.004,'lake'),box(.003,.002,.005,.004,'lake'),
      box(.006,.002,.007,.004,'lake'),box(.008,.002,.009,.004,'river')],
    localDEM};
  const model=buildModel(data,{size:100,resolution:8,trees:false});
  const water=model.categories.find(part=>part.id==='inland-water');
  const top=sampleSurface(water),first=top(20,30),second=top(65,30);
  assert(first>0&&second>first);
  assert.equal(top(40,30),first);
  assert.equal(top(68,31),second);
  assert(top(88,30)>top(82,30));
  assert.deepEqual(auditPart(water).errors,[]);
});

test('a mapped stream below grid resolution retains a printable width and can be hidden',()=>{
  const stream={type:'Feature',properties:{sourceLayer:'waterway',class:'stream'},
    geometry:{type:'LineString',coordinates:[[.001,.005],[.009,.005]]}};
  const data={meta:{bbox:[0,0,.01,.01]},features:[stream],localDEM};
  const model=options=>buildModel(data,{size:100,resolution:8,trees:false,...options}).categories.find(part=>part.id==='inland-water');
  const water=auditPart(model({})),wide=auditPart(model({streamWidth:2}));
  assert.deepEqual(water.errors,[]);
  assert(Math.abs(water.bbox.max[1]-water.bbox.min[1]-.45)<.001);
  assert(Math.abs(wide.bbox.max[1]-wide.bbox.min[1]-.90)<.001);
  assert.equal(model({streams:false}),undefined);
});

test('inland water at a cut rests on solid terrain, while the sea reaches the first layers',()=>{
  const stream={type:'Feature',properties:{sourceLayer:'waterway',class:'stream'},
    geometry:{type:'LineString',coordinates:[[-.001,.007],[.011,.007]]}};
  const data={meta:{bbox:[0,0,.01,.01]},localDEM,
    features:[box(-.001,.002,.004,.004,'lake'),box(.007,.003,.011,.004,'river'),
      box(-.001,-.001,.006,.001,'ocean'),box(.006,-.001,.011,.001,'sea'),stream]};
  const model=buildModel(data,{size:100,resolution:8,trees:false});
  const find=id=>model.categories.find(part=>part.id===id);
  const water=find('inland-water'),top=sampleSurface(water),bottom=sampleSurface(water,-1),bed=sampleSurface(find('terrain'));
  const seaBase=sampleSurface(find('water'),-1);
  assert.equal(seaBase(20,5),0);
  assert.equal(seaBase(80,5),0);
  for(const point of [[0,30],[37,35],[0,70],[30,70],[100,70],[99,35]]){
    const z=top(...point),base=bottom(...point);
    assert(Number.isFinite(z)&&Number.isFinite(base),`falta la secció d’aigua a ${point}`);
    assert(Math.abs(z-base-.65)<1e-5);
    assert(Math.abs(bed(...point)-base)<1e-5);
  }

  const report=auditThreeMF(threeMF(groupMaterials(model,8),{bambu:true}),{heightMm:.2});
  assert(report.valid);
  assert(report.parts.some(part=>part.name==='Aigües interiors'&&part.geometry.bbox.min[2]>.2));
  assert.deepEqual(report.heightQuery.parts.map(part=>part.name).sort(),['Mar','Terreny']);
});
