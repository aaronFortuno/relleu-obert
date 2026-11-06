import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync,strFromU8,unzipSync} from 'fflate';
import {createUrbanHistory,urbanSelection} from '../src/urban-history.js';
import {selectionPose} from '../src/selection.js';

test('the Catalonia archive loads only the selected cells and separates missing coverage from empty land',async()=>{
  const archive=unzipSync(await readFile(new URL('../datasets/icgc-urban-2009-2024.zip',import.meta.url)));
  const mask=await readFile(new URL('../public/data/historical/urban-coverage.json.gz',import.meta.url));
  const requested=[];
  const history=createUrbanHistory(async file=>{
    requested.push(file);
    const bytes=file==='urban-coverage.json.gz'?mask:archive[file.replace(/^icgc-urban-v1\//,'')];
    return JSON.parse(strFromU8(file.endsWith('.gz')?gunzipSync(bytes):bytes));
  });
  const {area,mask:coverage}=await history.load();
  const girona=urbanSelection(coverage,selectionPose([2.8,41.968,2.839,42.006]));
  assert.equal(girona.partial,false);
  assert.equal(girona.keys.length,4);
  const initial=await history.edition(area,2009,girona);
  const latest=await history.edition(area,2024,girona);
  assert.ok(Math.abs(initial.urbanHa-502.28)<.02);
  assert.ok(Math.abs(latest.urbanHa-521.08)<.02);
  assert.equal(requested.length,10);
  await history.edition(area,2009,girona);
  assert.equal(requested.length,10);
  const coast=urbanSelection(coverage,selectionPose([3.196,41.91,3.219,41.926],20));
  assert.equal(coast.partial,true);
  assert.equal(urbanSelection(coverage,selectionPose([1.894,42.48,1.899,42.485])),null);
  const mountains=urbanSelection(coverage,selectionPose([1.375,42.614,1.384,42.622]));
  assert.equal(mountains.partial,false);
  assert.equal((await history.edition(area,2024,mountains)).urbanHa,0);
});
