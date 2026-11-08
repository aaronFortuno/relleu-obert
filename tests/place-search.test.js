import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlaceSearchScheduler} from '../src/place-search.js';

function setup(context){
  context.mock.timers.enable({apis:['setTimeout']});
  const requests=[];
  let pending=false;
  const search=createPlaceSearchScheduler({
    setPending(value){pending=value;},
    run(query,signal){return new Promise(resolve=>requests.push({query,signal,resolve}));}
  });
  return {search,requests,isPending:()=>pending,tick:ms=>context.mock.timers.tick(ms)};
}

test('la cerca espera un segon des de la darrera edició i manté el cercle durant la consulta',async context=>{
  const {search,requests,isPending,tick}=setup(context);
  search.schedule('Roca');
  assert.equal(isPending(),true);
  tick(900);
  search.schedule('Roca Foradada');
  tick(999);
  assert.equal(requests.length,0);
  assert.equal(isPending(),true);
  tick(1);
  assert.deepEqual(requests.map(({query})=>query),['Roca Foradada']);
  assert.equal(isPending(),true);
  requests[0].resolve();
  await Promise.resolve();
  assert.equal(isPending(),false);
});

test('enviar el formulari inicia una sola consulta immediata',async context=>{
  const {search,requests,isPending,tick}=setup(context);
  search.schedule('Montserrat');
  const active=search.start('Montserrat');
  await search.start('Montserrat');
  tick(1000);
  assert.deepEqual(requests.map(({query})=>query),['Montserrat']);
  assert.equal(requests[0].signal.aborted,false);
  assert.equal(isPending(),true);
  requests[0].resolve();
  await active;
  assert.equal(isPending(),false);
});

test('una resposta cancel·lada no pot apagar el cercle d’una cerca nova',async context=>{
  const {search,requests,isPending,tick}=setup(context);
  const previous=search.start('Roca');
  search.schedule('Roca Foradada');
  assert.equal(requests[0].signal.aborted,true);
  requests[0].resolve();
  await previous;
  assert.equal(isPending(),true);
  tick(1000);
  search.cancel();
  assert.equal(requests[1].signal.aborted,true);
  assert.equal(isPending(),false);
  requests[1].resolve();
});
