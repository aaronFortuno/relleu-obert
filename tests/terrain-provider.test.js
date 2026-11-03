import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTerrain,loadBridgeTerrain,oceanTilePredicate} from '../src/terrain-provider.js';
import {physicalBBox,selectionPose} from '../src/selection.js';

test('a wide rotated relief crop selects the highest zoom within the request budget',async()=>{
  const bbox=selectionPose(physicalBBox([42.635,.65],40,40),45).bbox;
  const result=await loadTerrain(bbox,async(_,tile)=>({...tile,size:2,elev:new Float32Array(4)}),
    async()=>({ok:true,blob:async()=>({})}),undefined,undefined,{zooms:[14,13,12,11],maxTiles:96});
  assert.equal(result.metadata.zoom,12);
  assert.equal(result.tiles.length,81);
});

test('the sample budget retains centred numeric elevations and ignores invalid pixels',async()=>{
  const original=Float32Array.from({length:16},(_,index)=>index);
  original[0]=NaN;
  const result=await loadTerrain([3.201,41.918,3.202,41.919],async(_,tile)=>({...tile,size:4,elev:original}),
    async()=>({ok:true,blob:async()=>({})}),undefined,undefined,{zooms:[12],maxSamples:4});
  assert.equal(result.metadata.sampleSize,2);
  assert.equal(result.tiles[0].size,2);
  assert.deepEqual([...result.tiles[0].elev],[Math.fround(10/3),4.5,10.5,12.5]);
  assert(Number.isNaN(original[0]));
});
test('a missing Mapterhorn tile uses the second provider instead of stopping on 404',async()=>{
  const urls=[],r=await loadTerrain([3.201,41.918,3.202,41.919],async(blob,t)=>({...t,size:2,elev:new Float32Array(4)}),async url=>{urls.push(url);return url.includes('mapterhorn')?{ok:false,status:404}:{ok:true,blob:async()=>({})};});
  assert(r.metadata.provider.includes('Mapzen'));assert(r.warnings.length);assert(urls.some(u=>u.includes('amazonaws')));assert(r.tiles.length);
});
test('failed sources do not become a zero-height invented landscape',async()=>{await assert.rejects(loadTerrain([3.201,41.918,3.202,41.919],async()=>{},async()=>({ok:false,status:404})),/cap de les dues fonts/);});
test('additional bridge elevations keep the selected provider and zoom, and fetch each tile once',async()=>{
  const terrain={metadata:{provider:'Mapzen Terrain Tiles · AWS',zoom:12},tiles:[{z:12,x:10,y:10}]},urls=[];
  const vectors=[{z:14,x:41,y:40},{z:14,x:44,y:40},{z:14,x:45,y:41},{z:14,x:48,y:40}];
  const result=await loadBridgeTerrain(vectors,terrain,async(_,t)=>({...t,elev:new Float32Array([100])}),async url=>{
    urls.push(url);return {ok:!url.endsWith('/12/10.png'),blob:async()=>({})};
  });
  assert.deepEqual(urls,[
    'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/11/10.png',
    'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/12/10.png'
  ]);
  assert.equal(result.failed,1);
  assert.equal(result.tiles[0].x,11);
  assert.equal(terrain.tiles.length,1);
});
test('missing tiles are flat only when the requested region is completely covered by an ocean polygon',async()=>{
  const bbox=[3.201,42.918,3.202,42.919],ocean={type:'Feature',properties:{sourceLayer:'water',class:'ocean'},geometry:{type:'Polygon',coordinates:[[[3,42],[4,42],[4,44],[3,44],[3,42]]]}},predicate=oceanTilePredicate([ocean],bbox);
  const r=await loadTerrain(bbox,async()=>{throw Error('Must not decode absent ocean tiles');},async()=>({ok:false,status:404}),()=>{},predicate);
  assert(r.metadata.oceanTiles>0);assert(r.tiles.every(t=>t.elev.every(v=>v===0)));
  const pool={...ocean,properties:{sourceLayer:'water',class:'swimming_pool'}};
  await assert.rejects(loadTerrain(bbox,async()=>{},async()=>({ok:false,status:404}),()=>{},oceanTilePredicate([pool],bbox)),/cap de les dues fonts/);
});
