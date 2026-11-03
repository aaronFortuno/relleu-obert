import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchCadastralBuildings,parseCadastreGML,cadastreQuery} from '../src/cadastre.js';
import {loadBuildingsRecoverably} from '../src/building-recovery.js';
const bbox=[3.1967,41.91,3.2183,41.926];
const exception=text=>`<ows:ExceptionReport xmlns:ows="urn:ows"><ows:Exception exceptionCode="NoApplicableCode"><ows:ExceptionText><![CDATA[${text}]]></ows:ExceptionText></ows:Exception></ows:ExceptionReport>`;
function gml(kind,ids=[]){return `<FeatureCollection>${ids.map(id=>`<featureMember><${kind} id="${id}"><geometry><BuildingGeometry><geometry><Surface srsName="EPSG::25831"><patches><PolygonPatch><exterior><LinearRing><posList>517000 4640700 517010 4640700 517010 4640710 517000 4640710 517000 4640700</posList></LinearRing></exterior></PolygonPatch></patches></Surface></geometry></BuildingGeometry></geometry><numberOfFloorsAboveGround>2</numberOfFloorsAboveGround></${kind}></featureMember>`).join('')}</FeatureCollection>`;}
test('area rejection is classified from the service text, distinct from generic errors',()=>{
 assert.throws(()=>parseCadastreGML(exception('Area of extension out of limits')),e=>e.code==='CADASTRE_LIMIT'&&/Area/.test(e.serviceDetail));
 assert.throws(()=>parseCadastreGML(exception('Database unavailable')),e=>e.code==='CADASTRE_SERVICE');
});
test('a rejected parent becomes four sections per kind, valid empties retained and duplicates removed',async()=>{
 let active=0,peak=0,calls=0;const [west,south]=cadastreQuery(bbox).bbox;
 const result=await fetchCadastralBuildings(bbox,async url=>{
   calls++;active++;peak=Math.max(active,peak);
   try{
    await new Promise(r=>setTimeout(r,2));const p=new URL(url).searchParams,b=p.get('bbox').split(',').map(Number),kind=p.get('typenames')==='BU.BUILDING'?'Building':'BuildingPart';
    const large=(b[2]-b[0])*(b[3]-b[1])>1e6;
    const empty=b[0]===west&&b[1]===south;
    return new Response(large?exception('Area of extension out of limits'):gml(kind,empty?[]:kind==='Building'?['A']:['A_part1']));
   }finally{active--;}
 });
 assert.equal(calls,10);assert.equal(peak,2);assert.equal(result.features.length,1);
 assert.deepEqual(result.metadata.query,{requests:10,subdivisions:2,duplicates:4});
 assert.equal(result.metadata.buildingCount,1);assert.equal(result.metadata.partCount,1);
});
test('one bad section rejects the complete result; unknown service errors are not subdivided',async()=>{
 let calls=0;
 await assert.rejects(()=>fetchCadastralBuildings(bbox,async()=>{calls++;return new Response(exception('Database unavailable'));}),/Database/);
 assert.equal(calls,1);
 let small=0;
 await assert.rejects(()=>fetchCadastralBuildings(bbox,async url=>{
  const b=new URL(url).searchParams.get('bbox').split(',').map(Number);
  return new Response((b[2]-b[0])*(b[3]-b[1])>1e6?exception('Area of extension out of limits'):++small===2?exception('Database unavailable'):gml('Building',['A']));
 }),/Database/);
});
test('permanent area rejection has a finite recursion budget',async()=>{
 let calls=0;
 await assert.rejects(()=>fetchCadastralBuildings(bbox,async()=>{calls++;return new Response(exception('Area of extension out of limits'));}),/ExceptionReport/);
 assert(calls<=21,'at most the first kind’s 1+4+16 nodes');
});
test('conflicting IDs are excluded without dropping unrelated buildings',async()=>{
 let child=0;
 const result=await fetchCadastralBuildings(bbox,async url=>{
  const params=new URL(url).searchParams,b=params.get('bbox').split(',').map(Number);
  if(params.get('typenames')==='BU.BUILDINGPART')return new Response(gml('BuildingPart'));
  return new Response((b[2]-b[0])*(b[3]-b[1])>1e6?exception('Area of extension out of limits'):gml('Building',['A','B']).replace('>2</numberOfFloors',`>${++child}</numberOfFloors`));
 });
 assert.deepEqual(result.features.map(f=>f.id),['B']);
 assert.deepEqual(result.metadata.query.conflictingIds,[{kind:'Building',id:'A'}]);
 assert(result.warnings.some(message=>message.includes('1 element omès')));
});
test('quadrants publish coherent snapshots and retract conflicting parts',async()=>{
 const batches=[];
 let child=0;
 const result=await fetchCadastralBuildings(bbox,async url=>{
  if(new URL(url).searchParams.get('typenames')==='BU.BUILDING')return new Response(gml('Building',['A','B']));
  return new Response(gml('BuildingPart',['A_part1','C_part1']).replace('>2</numberOfFloors',`>${++child}</numberOfFloors`));
 },{onBatch:batch=>batches.push(batch)});
 assert.deepEqual(batches.map(batch=>batch.completed),[1,2,3,4]);
 assert.deepEqual(batches[0].features.map(f=>f.id),['A_part1','C_part1','B']);
 assert.deepEqual(batches[1].features.map(f=>f.id),['C_part1','B']);
 assert.deepEqual(batches.at(-1).features,result.features);
 assert.equal(result.metadata.query.requests,8);
});
test('a conflict within one response is quarantined too',async()=>{
 const result=await fetchCadastralBuildings(bbox,async url=>new Response(
  new URL(url).searchParams.get('typenames')==='BU.BUILDING'
    ?gml('Building',['A','A','B']).replace('>2</numberOfFloors','>3</numberOfFloors')
    :gml('BuildingPart')
 ));
 assert.deepEqual(result.features.map(f=>f.id),['B']);
});
test('full-region fallback is explicit, uses the actual selected source and keeps diagnostic provenance',async()=>{
 const calls=[];
 const load=async source=>{calls.push(source);if(source==='catastre')throw Error('service down');return {source,warnings:[],features:[]};};
 const layer=await loadBuildingsRecoverably(load,'catastre',['catastre','icgc','osm']);
 assert.deepEqual(calls,['catastre','icgc']);assert.equal(layer.source,'icgc');assert.equal(layer.recovery.reason,'service down');assert(layer.warnings.some(x=>/ICGC/.test(x)));
 await assert.rejects(()=>loadBuildingsRecoverably(async()=>{throw Error('all down');},'icgc',['osm']),/all down/);
});
