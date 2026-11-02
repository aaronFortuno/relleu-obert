import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuildingUpdateScheduler} from '../src/building-update-scheduler.js';
function harness({canAutoUpdate=()=>true,isBusy=()=>false,run=async()=>{}}={}){
  const timers=[];let busy=isBusy,auto=canAutoUpdate,calls=[],failures=0;
  const scheduler=createBuildingUpdateScheduler({
    delay:300,
    setTimeoutFn:(fn,ms)=>{timers.push({fn,ms});return timers.length;},
    clearTimeoutFn:id=>{timers[id-1]=null;},
    canAutoUpdate:()=>auto(),
    isBusy:()=>busy(),
    run:async(state,token)=>{calls.push({state,token});if(failures>0){failures--;throw Error('fallada simulada');}await run(state,token);},
  });
  return {scheduler,calls,
    tick:()=>{const pending=timers.splice(0).filter(Boolean);assert(pending.length<=1,'com a molt un temporitzador actiu');for(const t of pending)t.fn();},
    timerCount:()=>timers.filter(Boolean).length,
    settle:async()=>{for(let i=0;i<20;i++)await Promise.resolve();},
    setBusy:value=>{busy=()=>value;},setAuto:value=>{auto=()=>value;},failNext:()=>{failures++;}};
}

test('una petició nova amb el mateix objecte d’estat sobreviu a una fallada anterior',async()=>{
  let rejectFirst;let first=true;
  const h=harness({run:()=>{if(first){first=false;return new Promise((_,reject)=>{rejectFirst=reject;});}}});
  const same={source:'catastre'};
  h.scheduler.notify(same);h.tick();await h.settle();
  h.scheduler.notify(same);rejectFirst(Error('fallada transitòria'));
  await h.settle();
  assert.equal(h.calls.length,2);assert.equal(h.scheduler.status(),'idle');
  h.scheduler.flush();await h.settle();assert.equal(h.calls.length,2);
});
test('debounce: una ràfega d’edicions executa una sola actualització amb l’estat més recent',async()=>{
  const h=harness();
  assert.equal(h.scheduler.notify({height:5}),'pending');
  h.scheduler.notify({height:7});h.scheduler.notify({height:9});
  assert.equal(h.calls.length,0);assert.equal(h.timerCount(),1);
  h.tick();await h.settle();
  assert.equal(h.calls.length,1);assert.deepEqual(h.calls[0].state,{height:9});
  assert.equal(h.scheduler.status(),'idle');assert.equal(h.scheduler.isCurrent(h.calls[0].token),true);
});
test('cua mentre hi ha un altre càlcul i buidatge en acabar, només amb l’estat nou',async()=>{
  const h=harness();h.setBusy(true);
  assert.equal(h.scheduler.notify({mode:'flat'}),'queued');
  h.scheduler.notify({mode:'source'});
  assert.equal(h.calls.length,0);assert.equal(h.scheduler.pending(),true);
  h.setBusy(false);h.scheduler.flush();await h.settle();
  assert.equal(h.calls.length,1);assert.deepEqual(h.calls[0].state,{mode:'source'});
  assert.equal(h.scheduler.status(),'idle');
});
test('error: estat error sense reintents automàtics, flush no repeteix i retry explícit funciona una vegada',async()=>{
  const h=harness();h.failNext();
  h.scheduler.notify({height:3});h.tick();await h.settle();
  assert.equal(h.scheduler.status(),'error');assert.match(h.scheduler.error().message,/fallada/);
  h.scheduler.flush();h.scheduler.flush();await Promise.resolve();
  assert.equal(h.calls.length,1);assert.equal(h.scheduler.status(),'error');
  h.scheduler.retry();await h.settle();
  assert.equal(h.calls.length,2);assert.equal(h.scheduler.status(),'idle');assert.equal(h.scheduler.error(),null);
});
test('una edició durant l’execució invalida el resultat anterior i encua només l’estat nou',async()=>{
  let release;let first=true;const h=harness({run:()=>first?(first=false,new Promise(resolve=>{release=resolve;})):Promise.resolve()});
  h.scheduler.notify({height:5});h.tick();await h.settle();
  assert.equal(h.scheduler.status(),'running');
  const staleToken=h.calls[0].token;
  h.scheduler.notify({height:8});
  assert.equal(h.scheduler.isCurrent(staleToken),false);assert.equal(h.scheduler.status(),'queued');
  release();await h.settle();
  assert.equal(h.calls.length,2);assert.deepEqual(h.calls[1].state,{height:8});
  assert.equal(h.scheduler.isCurrent(h.calls[0].token),false);assert.equal(h.scheduler.status(),'idle');
});
test('terreny brut o sense model: estat manual, mai no s’executa la via automàtica',async()=>{
  const h=harness();h.setAuto(false);
  assert.equal(h.scheduler.notify({source:'icgc'}),'manual');
  h.tick();h.scheduler.flush();h.scheduler.retry();await Promise.resolve();
  assert.equal(h.calls.length,0);assert.equal(h.scheduler.status(),'manual');
  h.setAuto(true);h.scheduler.notify({source:'icgc'});h.tick();await h.settle();
  assert.equal(h.calls.length,1);
});
test('cancel i dispose aturen temporitzadors pendents i impedeixen execucions posteriors',async()=>{
  const h=harness();
  h.scheduler.notify({height:4});assert.equal(h.timerCount(),1);
  h.scheduler.cancel();assert.equal(h.scheduler.status(),'idle');assert.equal(h.timerCount(),0);
  h.tick();await Promise.resolve();assert.equal(h.calls.length,0);
  h.scheduler.notify({height:6});h.scheduler.dispose();
  assert.equal(h.scheduler.notify({height:8}),'disposed');
  h.tick();h.scheduler.flush();h.scheduler.retry();await Promise.resolve();
  assert.equal(h.calls.length,0);assert.equal(h.scheduler.isCurrent(0),false);
});
test('sense solapament: una segona execució només comença quan acaba la primera',async()=>{
  let running=0,max=0;const h=harness({run:async()=>{running++;max=Math.max(max,running);await Promise.resolve();running--;}});
  h.scheduler.notify({height:5});h.tick();await Promise.resolve();
  h.scheduler.notify({height:6});
  await h.settle();
  assert.equal(max,1);assert.equal(h.calls.length,2);assert.equal(h.scheduler.status(),'idle');
});

test('cancel invalida el token d’una execució en vol i isCurrent retorna fals',async()=>{
  let release;const h=harness({run:()=>new Promise(resolve=>{release=resolve;})});
  h.scheduler.notify({height:5});h.tick();await h.settle();
  assert.equal(h.scheduler.status(),'running');
  const token=h.calls[0].token;
  assert.equal(h.scheduler.isCurrent(token),true);
  h.scheduler.cancel();
  assert.equal(h.scheduler.isCurrent(token),false);assert.equal(h.scheduler.status(),'idle');
  release();await h.settle();
  assert.equal(h.calls.length,1);assert.equal(h.scheduler.status(),'idle');assert.equal(h.scheduler.isCurrent(token),false);
  h.scheduler.notify({height:7});h.tick();await h.settle();
  assert.equal(h.calls.length,2);assert.deepEqual(h.calls[1].state,{height:7});
});
test('una edició nova encuada sobreviu a la fallada de l’execució anterior i s’executa una sola vegada',async()=>{
  let reject;let first=true;const h=harness({run:()=>first?(first=false,new Promise((_,rej)=>{reject=rej;})):Promise.resolve()});
  h.scheduler.notify({height:5});h.tick();await h.settle();
  assert.equal(h.scheduler.status(),'running');
  h.scheduler.notify({height:8});
  reject(Error('xarxa caiguda'));await h.settle();
  assert.equal(h.calls.length,2);assert.deepEqual(h.calls[1].state,{height:8});
  assert.equal(h.scheduler.status(),'idle');assert.equal(h.scheduler.error(),null);
});
test('una fallada sense cap edició nova no es reintenta mai automàticament',async()=>{
  let reject;const h=harness({run:()=>new Promise((_,rej)=>{reject=rej;})});
  h.scheduler.notify({height:5});h.tick();await h.settle();
  reject(Error('xarxa caiguda'));await h.settle();
  assert.equal(h.calls.length,1);assert.equal(h.scheduler.status(),'error');
  h.scheduler.flush();await h.settle();
  assert.equal(h.calls.length,1);assert.equal(h.scheduler.status(),'error');
});
