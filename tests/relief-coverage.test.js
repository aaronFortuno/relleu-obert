import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  ANETO_COVERAGE_FILE,PYRENEES_COVERAGE,PYRENEES_COVERAGE_FILE,loadReliefCoverage
} from '../src/relief-coverage.js';

const readAsset=async path=>new Response(await readFile(new URL(path,new URL('../public/',import.meta.url))));

test('the Pyrenees overview covers the panoramic cut and keeps Aneto samples at higher resolution',async()=>{
  const rasters=await loadReliefCoverage([-2.53,41.73,3.70,43.77],readAsset);
  assert.deepEqual(rasters.map(({tile})=>tile),['N42E000','Pirineus']);
  const overview=rasters[1];
  assert.deepEqual(overview.bbox,PYRENEES_COVERAGE.bbox);
  assert.equal(overview.values.length,1512*504);
  assert.deepEqual([...new Set(overview.values)].sort((a,b)=>a-b),[0,60,70]);
  const bytes=await (await readAsset(PYRENEES_COVERAGE_FILE)).arrayBuffer();
  assert(bytes.byteLength<=250000);
});

test('an Aneto cut uses only the detailed asset and a distant cut requests no data',async()=>{
  const requests=[];
  const fetcher=path=>{requests.push(path);return readAsset(path);};
  const rasters=await loadReliefCoverage([.55,42.55,.75,42.7],fetcher);
  assert.equal(rasters.length,1);
  assert.deepEqual(requests,['./'+ANETO_COVERAGE_FILE]);
  assert.deepEqual(await loadReliefCoverage([4,43,5,44],fetcher),[]);
  assert.equal(requests.length,1);
});

test('the detailed mask survives a missing overview and total failure is reported',async()=>{
  const bbox=[-2.53,41.73,3.70,43.77];
  const missing=()=>new Response(null,{status:404});
  const rasters=await loadReliefCoverage(bbox,path=>path.endsWith(PYRENEES_COVERAGE_FILE)?missing():readAsset(path));
  assert.deepEqual(rasters.map(({tile})=>tile),['N42E000']);
  await assert.rejects(loadReliefCoverage(bbox,missing),/WorldCover: HTTP 404/);
});
