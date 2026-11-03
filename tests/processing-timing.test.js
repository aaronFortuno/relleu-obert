import test from 'node:test';
import assert from 'node:assert/strict';
import {createProcessingTiming} from '../src/processing-timing.js';

test('stage and operation times partition the run and nested spans remain separate',()=>{
  let now=100;
  const trace=createProcessingTiming(()=>now);
  trace.mark('terrain','Heights');
  now=120;
  trace.mark('terrain','Heights');
  trace.detail({event:'end',phase:'nested operation',milliseconds:10});
  now=130;
  trace.mark('terrain','Surface');
  now=140;
  trace.mark('transport','Roads');
  now=165;
  const result=trace.finish();
  assert.equal(result.milliseconds,65);
  assert.deepEqual(result.stages.map(stage=>stage.milliseconds),[40,25]);
  assert.deepEqual(result.operations.map(operation=>operation.milliseconds),[30,10,25]);
  assert.equal(result.diagnostics[0].milliseconds,10);
  assert.deepEqual(trace.finish(),result);
});
