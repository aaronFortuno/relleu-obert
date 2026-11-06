import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync,strFromU8} from 'fflate';
import {fetchArcgisPolygons} from '../src/historical-arcgis.js';
import {selectionPose} from '../src/selection.js';
import {createSioseUrbanHistory} from '../src/siose-urban-history.js';
import {urbanSelection} from '../src/urban-history.js';

const readMask=async name=>JSON.parse(strFromU8(gunzipSync(await readFile(new URL(`../datasets/historical/${name}`,import.meta.url)))));

test('the IGN mask includes mainland, both archipelagos and autonomous cities',async()=>{
  const {area,mask}=await createSioseUrbanHistory(readMask).load();
  assert.deepEqual(area.editions.map(({year})=>year),[2005,2014]);
  for(const [lon,lat] of [[-3.7,40.42],[-15.5,28.08],[4.12,39.96],[-5.333,35.89],[-2.95,35.287]]){
    assert.equal(urbanSelection(mask,selectionPose([lon-.003,lat-.003,lon+.003,lat+.003]))?.partial,false);
  }
  assert.equal(urbanSelection(mask,selectionPose([3.19,41.91,3.22,41.93],10))?.partial,true);
  for(const [lon,lat] of [[2.35,48.85],[-8.6,41.16],[-4,36]]){
    assert.equal(urbanSelection(mask,selectionPose([lon-.003,lat-.003,lon+.003,lat+.003])),null);
  }
});

test('SIOSE switches dates on the same clipped retall and caches verified geometry',async()=>{
  const bbox=[-3.71,40.41,-3.69,40.43];
  const responses=[];
  const history=createSioseUrbanHistory(readMask,async url=>{
    responses.push(url);
    if(url.searchParams.has('returnIdsOnly'))return Response.json({objectIdFieldName:'OBJECTID',objectIds:[42]});
    const left=url.pathname.includes('2005')?-3.70:-3.705;
    return Response.json({type:'FeatureCollection',features:[{type:'Feature',properties:{OBJECTID:42,CODIIGE:111},
      geometry:{type:'Polygon',coordinates:[[[left,40.40],[-3.68,40.40],[-3.68,40.44],[left,40.44],[left,40.40]]]}}]});
  });
  const {area,mask}=await history.load();
  const selection=urbanSelection(mask,selectionPose(bbox));
  const early=await history.edition(area,2005,selection);
  const late=await history.edition(area,2014,selection);
  assert.equal(early.features.length,1);
  assert.equal(early.features[0].properties.historical_urban,true);
  assert.ok(early.urbanHa>0&&late.urbanHa>early.urbanHa);
  assert.ok(Math.abs(Math.max(...early.features[0].geometry.coordinates[0][0].map(([x])=>x))-bbox[2])<1e-9);
  assert.deepEqual(await history.edition(area,2005,selection),early);
  assert.equal(responses.length,4);
});

test('the ArcGIS client distinguishes an empty retall from an incomplete page',async()=>{
  const bbox=[-3.71,40.41,-3.69,40.43],where='1=1',idField='OBJECTID';
  const url='https://example.com/0/query';
  const empty=await fetchArcgisPolygons(url,{bbox,where,idField,fetcher:async()=>Response.json({objectIdFieldName:idField,objectIds:null})});
  assert.deepEqual(empty.features,[]);
  await assert.rejects(fetchArcgisPolygons(url,{bbox,where,idField,fetcher:async request=>Response.json(request.searchParams.has('returnIdsOnly')
    ?{objectIdFieldName:idField,objectIds:[42]}:{type:'FeatureCollection',features:[]})}),/Incomplete ArcGIS geometry page/);
});
