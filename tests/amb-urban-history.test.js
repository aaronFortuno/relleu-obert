import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createAmbUrbanHistory} from '../src/amb-urban-history.js';
import {urbanSelection} from '../src/urban-history.js';
import {physicalBBox,selectionPose} from '../src/selection.js';

const read=async name=>JSON.parse(gunzipSync(await readFile(new URL(`../datasets/historical/${name}`,import.meta.url))));
const pose=(center,km,angle=0)=>selectionPose(physicalBBox(center,km,km),angle);

test('AMB editions cover metropolitan selections and distinguish the edge of their domain',async()=>{
  const {area,mask}=await createAmbUrbanHistory(read).load();
  assert.deepEqual(area.editions.map(({year})=>year),[1956,1977,1990]);
  assert.equal(urbanSelection(mask,pose(area.center,4.5,24)).partial,false);
  assert.equal(urbanSelection(mask,pose([41.387,2.218],4.5)).partial,true);
  assert.equal(urbanSelection(mask,pose([41.539,2.447],2)),null);
});

test('AMB requests the selected edition and trims its polygons to the rotated selection',async()=>{
  const requests=[];
  const provider=createAmbUrbanHistory(read,async url=>{
    requests.push(url);
    if(url.searchParams.get('returnIdsOnly'))return Response.json({objectIdFieldName:'objectid',objectIds:[4]});
    return Response.json({type:'FeatureCollection',features:[{type:'Feature',properties:{objectid:4,us77:'rma'},
      geometry:{type:'Polygon',coordinates:[[[2.05,41.3],[2.16,41.3],[2.16,41.4],[2.05,41.4],[2.05,41.3]]]}}]});
  });
  const {area,mask}=await provider.load();
  const selection=urbanSelection(mask,pose(area.center,2,24));
  const result=await provider.edition(area,1977,selection);
  assert.equal(requests.length,2);
  assert.ok(requests.every(url=>url.pathname.endsWith('/FeatureServer/1/query')));
  assert.equal(requests[0].searchParams.get('geometry'),selection.bbox.join(','));
  assert.match(requests[0].searchParams.get('where'),/^us77 IN \(/);
  assert.equal(result.features.length,1);
  assert.equal(result.features[0].properties.historical_urban,true);
  assert.ok(Math.abs(result.urbanHa-400)<2);
  await assert.rejects(provider.edition(area,1965,selection),/does not cover/);
  assert.equal(requests.length,2);
});
