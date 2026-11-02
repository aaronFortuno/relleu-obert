import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {RECOMMENDED_PLACES,placeSelection} from '../src/recommended-places.js';
import {SIZE_PRESETS} from '../src/selection.js';
import {tileList} from '../src/sources.js';
test('all recommended rectangular selections keep geographic aspect and stay inside their included tile coverage',async()=>{
 for(const place of RECOMMENDED_PLACES){
  const meta=JSON.parse(await readFile(new URL('../public/data/'+place.file,import.meta.url),'utf8'));
  assert(meta.labelTitle);
  for(const [w,h]of Object.values(SIZE_PRESETS)){
   const b=placeSelection(place.id,w,h),lat=(b[1]+b[3])/2;
   const ratio=(b[2]-b[0])*Math.cos(lat*Math.PI/180)/(b[3]-b[1]);
   assert(Math.abs(ratio-w/h)<1e-8);
   assert(Math.abs(lat-place.center[0])<1e-8);assert(Math.abs((b[0]+b[2])/2-place.center[1])<1e-8);
   for(const tile of tileList(b))assert(meta.tiles.some(t=>t.z===tile.z&&t.x===tile.x&&t.y===tile.y));
  }
 }
});
