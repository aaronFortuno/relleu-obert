import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchOfficialBoundaries,isNationalBoundary,joinNationalBoundaryLines} from '../src/relief-boundary-source.js';
import {loadBoundaryLayer} from '../src/sources.js';

test('live style changes and enabling another level reuse the successful boundary queries',async()=>{
  const region={meta:{bbox:[2,41.6,2.05,41.65]}},requests=[],original=globalThis.fetch;
  globalThis.fetch=async url=>{requests.push(String(url));return Response.json({type:'FeatureCollection',features:[]});};
  try{
    await loadBoundaryLayer(region,{county:'solid'},10000);
    await loadBoundaryLayer(region,{county:'dotted',municipality:'cross'},10000);
    await loadBoundaryLayer(region,{county:'dashed'},10000);
    await loadBoundaryLayer(region,{},10000);
    assert.equal(requests.length,2);
    assert(requests[0].includes('/8/query'));
    assert(requests[1].includes('/2/query'));
  }finally{globalThis.fetch=original;}
});

const bbox=[1,41,2,42];
const square=(id,west,east)=>({type:'Feature',id,properties:{},geometry:{type:'Polygon',
  coordinates:[[[west,40.9],[east,40.9],[east,41.6],[east,42.1],[west,42.1],[west,41.6],[west,40.9]]]}});
const collection={type:'FeatureCollection',features:[square(1,.9,1.5),square(2,1.5,2.1)]};

test('the vector tile classifier keeps land state boundaries and excludes other levels',()=>{
  assert(isNationalBoundary({admin_level:2,maritime:0}));
  assert(isNationalBoundary({admin_level:'2'}));
  for(const properties of [{admin_level:2,maritime:1},{admin_level:4,maritime:0},{maritime:0},undefined])
    assert(!isNationalBoundary(properties));
});

test('state border tile padding and duplicate segments are removed before the line is stitched',()=>{
  const first=[[-10,20],[-2,20],[2,20]],second=[[-2,20],[2,20],[10,20]];
  const stitched=joinNationalBoundaryLines([
    {tile:{x:1,y:1,z:2},lines:[first,[...first].reverse()]},
    {tile:{x:2,y:1,z:2},lines:[second]}
  ]);
  assert.equal(stitched.length,1);
  assert.deepEqual(stitched[0].map(([x,y])=>[Math.round(x),Math.round(y)]),[[-10,20],[-2,20],[0,20],[2,20],[10,20]]);
  const quantized=joinNationalBoundaryLines([
    {tile:{x:1,y:1,z:2},lines:[first]},
    {tile:{x:2,y:1,z:2},lines:[second.map(([x,y])=>[x,y+.00000015])]}
  ]);
  assert.equal(quantized.length,1);
  const discontinuous=joinNationalBoundaryLines([
    {tile:{x:1,y:1,z:2},lines:[first]},
    {tile:{x:2,y:1,z:2},lines:[second.map(([x,y])=>[x,y+.001])]}
  ]);
  assert.equal(discontinuous.length,2);
});

test('official polygons become clipped shared lines without outer outlines or crop edges',async()=>{
  const fetcher=async raw=>{
    const url=new URL(raw);
    assert(url.pathname.endsWith('/8/query'));
    assert.equal(url.searchParams.get('geometry'),bbox.join(','));
    assert.equal(url.searchParams.get('outSR'),'4326');
    return Response.json(collection);
  };
  const result=await fetchOfficialBoundaries(bbox,{levels:['county'],scale:10000,fetcher});
  assert.deepEqual(result.lines,{province:[],county:[[[1.5,41],[1.5,41.6],[1.5,42]]],municipality:[]});
  assert.deepEqual(result.warnings,[]);
  assert.equal(result.metadata.sourceScale,5000);
  assert.equal(result.metadata.license,'CC BY 4.0');
});

test('a failed level preserves successful layers and scopes queries to Catalonia',async()=>{
  const seen=[];
  const fetcher=async raw=>{
    const [,layer]=new URL(raw).pathname.match(/\/(\d+)\/query$/);
    seen.push(Number(layer));
    if(layer==='16')return new Response(null,{status:503});
    return Response.json(collection);
  };
  const result=await fetchOfficialBoundaries(bbox,{levels:['province','municipality'],scale:120000,fetcher});
  assert.deepEqual(seen.sort((a,b)=>a-b),[4,16]);
  assert.deepEqual(result.metadata.failed,['province']);
  assert.equal(result.lines.municipality.length,1);
  assert.equal(result.warnings.length,1);
  const outside=await fetchOfficialBoundaries([4,41,5,42],{fetcher:()=>assert.fail('unneeded request')});
  assert.equal(outside.metadata.available,false);
});

test('oversized or partial data fail per level and a cancelled request is aborted',async()=>{
  const oversized=new Response('{}',{headers:{'content-length':'5000000'}});
  const result=await fetchOfficialBoundaries(bbox,{levels:['county','municipality'],fetcher:async raw=>
    raw.includes('/9/')?oversized:Response.json({...collection,exceededTransferLimit:true})});
  assert.deepEqual(result.metadata.failed,['county','municipality']);
  const signal=AbortSignal.abort();
  await assert.rejects(fetchOfficialBoundaries(bbox,{signal,fetcher:()=>assert.fail('cancelled request')}),{name:'AbortError'});
});
