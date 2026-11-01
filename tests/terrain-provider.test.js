import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTerrain,oceanTilePredicate} from '../src/terrain-provider.js';
test('a missing Mapterhorn tile uses the second provider instead of stopping on 404',async()=>{
  const urls=[],r=await loadTerrain([3.201,41.918,3.202,41.919],async(blob,t)=>({...t,size:2,elev:new Float32Array(4)}),async url=>{urls.push(url);return url.includes('mapterhorn')?{ok:false,status:404}:{ok:true,blob:async()=>({})};});
  assert(r.metadata.provider.includes('Mapzen'));assert(r.warnings.length);assert(urls.some(u=>u.includes('amazonaws')));assert(r.tiles.length);
});
test('failed sources do not become a zero-height invented landscape',async()=>{await assert.rejects(loadTerrain([3.201,41.918,3.202,41.919],async()=>{},async()=>({ok:false,status:404})),/cap de les dues fonts/);});
test('missing tiles are flat only when the requested region is completely covered by an ocean polygon',async()=>{
  const bbox=[3.201,42.918,3.202,42.919],ocean={type:'Feature',properties:{sourceLayer:'water',class:'ocean'},geometry:{type:'Polygon',coordinates:[[[3,42],[4,42],[4,44],[3,44],[3,42]]]}},predicate=oceanTilePredicate([ocean],bbox);
  const r=await loadTerrain(bbox,async()=>{throw Error('Must not decode absent ocean tiles');},async()=>({ok:false,status:404}),()=>{},predicate);
  assert(r.metadata.oceanTiles>0);assert(r.tiles.every(t=>t.elev.every(v=>v===0)));
  const pool={...ocean,properties:{sourceLayer:'water',class:'swimming_pool'}};
  await assert.rejects(loadTerrain(bbox,async()=>{},async()=>({ok:false,status:404}),()=>{},oceanTilePredicate([pool],bbox)),/cap de les dues fonts/);
});
