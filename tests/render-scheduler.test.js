import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemandRenderer} from '../src/render-scheduler.js';
function harness(update=()=>false,extra={}){
 const frames=new Map();let next=0,renders=0;
 const scheduler=createDemandRenderer({requestFrame:cb=>{const id=next++;frames.set(id,cb);return id;},cancelFrame:id=>frames.delete(id),update,render:()=>renders++,...extra});
 return {scheduler,frames,renders:()=>renders,step:timestamp=>{const entries=[...frames];frames.clear();for(const [,cb]of entries)cb(timestamp);}};
}
test('invalidations coalesce, idle stops, and later changes restart drawing',()=>{
 const h=harness();h.scheduler.start();for(let i=0;i<10;i++)h.scheduler.invalidate();assert.equal(h.frames.size,1);
 h.step();assert.equal(h.renders(),1);assert(!h.scheduler.pending());h.scheduler.invalidate();h.step();assert.equal(h.renders(),2);
 h.scheduler.stop();h.scheduler.invalidate();assert.equal(h.frames.size,0);
});
test('damping and synchronous change events schedule frames without recursion',()=>{
 let h,steps=4;h=harness(()=>{if(--steps>0){h.scheduler.invalidate();return true;}return false;});
 h.scheduler.start();while(h.frames.size)h.step();assert.equal(h.renders(),4);assert(!h.scheduler.pending());
});
test('unsettled controls are bounded and dispose cancels pending frames permanently',()=>{
 const h=harness(()=>true,{maxFrames:3});h.scheduler.start();for(let i=0;i<5;i++)h.step();assert.equal(h.renders(),3);
 h.scheduler.invalidate();assert(h.scheduler.pending());h.scheduler.dispose();assert.equal(h.frames.size,0);h.scheduler.start();assert(!h.scheduler.pending());
});
test('render errors stop the queue and report the failure',()=>{
 let error;const h=harness(()=>{throw Error('context');},{onError:e=>error=e});h.scheduler.start();h.step();assert.equal(error.message,'context');assert(!h.scheduler.pending());
});
test('slow active frame windows report once, while idle gaps are not a slowdown',()=>{
 let reductions=0;const h=harness(()=>true,{onSlow:()=>reductions++,sampleSize:3,maxFrames:20});h.scheduler.start();
 for(let i=0;i<8;i++)h.step(i*80);assert.equal(reductions,1);h.scheduler.dispose();
 let idleReductions=0;const idle=harness(()=>false,{onSlow:()=>idleReductions++,sampleSize:3});idle.scheduler.start();idle.step(0);
 for(let i=1;i<=10;i++){idle.scheduler.invalidate();idle.step(i*1000);}assert.equal(idleReductions,0);
});
