import test from 'node:test';
import assert from 'node:assert/strict';
import {extendBridgeTiles} from '../src/bridge-tile-coverage.js';

const point=(x,y,z=14)=>[x/2**z*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y/2**z)))*180/Math.PI];
const bridge=(id,a,b)=>({id,properties:{sourceLayer:'transportation',brunnel:'bridge'},geometry:{type:'LineString',coordinates:[a,b]}});
const tile={z:14,x:8329,y:5952};
const p=(x,y)=>point(tile.x+x,tile.y+y);
const start=bridge(12,p(.4,.5),p(1.02,.5));
const east={...tile,x:tile.x+1};
const [w,s]=p(.45,.6),[e,n]=p(.55,.4),bbox=[w,s,e,n];
test('bridge tile coverage follows the same way only and keeps the region tiles separate',async()=>{
  const continuation=bridge(12,p(.97,.5),p(1.5,.5)),unrelated=bridge(13,p(.97,.6),p(1.5,.6));
  const queries=[];
  const result=await extendBridgeTiles([{tile,features:[start]}],bbox,async t=>{
    queries.push(t);return [continuation,unrelated];
  });
  assert.deepEqual(queries,[east]);
  assert.deepEqual(result.features,[continuation]);
  assert.deepEqual(result.tiles,[east]);
  assert.equal(result.missing.size,0);
});
test('failed or budgeted bridge lookups flag only the incomplete way',async()=>{
  const initial=[{tile,features:[start,bridge(13,p(.4,.5),p(.7,.5))]}];
  for(const limit of [0,1]){
    let requests=0;
    const result=await extendBridgeTiles(initial,bbox,async()=>{requests++;throw Error('unavailable');},{limit});
    assert.deepEqual([...result.missing],[12]);
    assert.equal(requests,limit);
    assert.equal(result.features.length,0);
  }
});
