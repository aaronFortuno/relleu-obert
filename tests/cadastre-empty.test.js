import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCadastreGML,fetchCadastralBuildings} from '../src/cadastre.js';
import {loadBuildingLayer,applyBuildingLayer} from '../src/sources.js';
import {buildModel} from '../src/geometry.js';
import {threeMF} from '../src/export.js';
import {unzipSync,strFromU8} from 'fflate';
const ring='517000 4640700 517020 4640700 517020 4640720 517000 4640720 517000 4640700';
function gml(kind='BuildingPart',items=[{id:'A_part1',floors:2}]){return `<gml:FeatureCollection xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:b="urn:bu">${items.map(({id,floors})=>`<gml:featureMember><b:${kind} gml:id="${id}"><b:geometry><b:BuildingGeometry><b:geometry><gml:Surface srsName="urn:ogc:def:crs:EPSG::25831"><gml:patches><gml:PolygonPatch><gml:exterior><gml:LinearRing><gml:posList srsDimension="2" count="5">${ring}</gml:posList></gml:LinearRing></gml:exterior></gml:PolygonPatch></gml:patches></gml:Surface></b:geometry></b:BuildingGeometry></b:geometry>${floors==null?'':`<b:numberOfFloorsAboveGround>${floors}</b:numberOfFloorsAboveGround>`}</b:${kind}></gml:featureMember>`).join('')}</gml:FeatureCollection>`;}
const emptyAttrs='<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0" numberMatched="0" numberReturned="0" timeStamp="2026-11-01T00:00:00Z"/>';
const emptyBare='<gml:FeatureCollection xmlns:gml="http://www.opengis.net/gml/3.2"/>';
const emptyBarePair='<gml:FeatureCollection xmlns:gml="http://www.opengis.net/gml/3.2"></gml:FeatureCollection>';
test('a valid empty WFS FeatureCollection parses to zero features, self-closing with attributes or bare',()=>{
 for(const text of [emptyAttrs,emptyBare,emptyBarePair])for(const kind of ['Building','BuildingPart'])assert.deepEqual(parseCadastreGML(text,{kind}),[]);
});
test('an empty collection stays distinct from ExceptionReport, malformed XML and unexpected envelopes',()=>{
 assert.throws(()=>parseCadastreGML('<ExceptionReport/>'),/ExceptionReport/);
 assert.throws(()=>parseCadastreGML('<ows:ExceptionReport xmlns:ows="http://www.opengis.net/ows/1.1"><ows:Exception exceptionCode="InvalidParameterValue"><ows:ExceptionText>bbox</ows:ExceptionText></ows:Exception></ows:ExceptionReport>'),/ExceptionReport/);
 assert.throws(()=>parseCadastreGML('<bad>'),/XML/);
 assert.throws(()=>parseCadastreGML('<gml:Other xmlns:gml="http://www.opengis.net/gml/3.2"/>'),/no ha retornat geometries/);
 assert.throws(()=>parseCadastreGML('x'.repeat(20_000_001)),/massa gran/);
});
const bbox=[3.204,41.917,3.206,41.919];
const responder=(building,part)=>async url=>{const u=new URL(url);return new Response(u.searchParams.get('typenames')==='BU.BUILDING'?building:part);};
test('one empty kind never discards the other kind',async()=>{
 const fromParts=await fetchCadastralBuildings(bbox,responder(emptyAttrs,gml('BuildingPart',[{id:'A_part1',floors:2}])));
 assert.deepEqual(fromParts.features.map(f=>f.id),['A_part1']);assert.equal(fromParts.metadata.buildingCount,0);assert.equal(fromParts.metadata.partCount,1);
 const fromBuildings=await fetchCadastralBuildings(bbox,responder(gml('Building',[{id:'B'}]),emptyBare));
 assert.deepEqual(fromBuildings.features.map(f=>f.id),['B']);assert.equal(fromBuildings.metadata.buildingCount,1);assert.equal(fromBuildings.metadata.partCount,0);
});
test('both kinds empty or only zero-floor parts yield an empty layer with an informative warning, not an error',async()=>{
 const empty=await fetchCadastralBuildings(bbox,responder(emptyAttrs,emptyBarePair));
 assert.deepEqual(empty.features,[]);assert.equal(empty.metadata.count,0);assert.equal(empty.metadata.provider,'Dirección General del Catastro · INSPIRE BU');
 assert(empty.warnings.some(w=>/no ha retornat volums/.test(w)));
 const zeroFloor=await fetchCadastralBuildings(bbox,responder(emptyAttrs,gml('BuildingPart',[{id:'A_part1',floors:0}])));
 assert.deepEqual(zeroFloor.features,[]);assert.equal(zeroFloor.metadata.count,0);assert.equal(zeroFloor.metadata.partCount,1);assert.equal(zeroFloor.metadata.zeroFloorPartsOmitted,1);
 assert(zeroFloor.warnings.some(w=>/no ha retornat volums/.test(w)));
});
test('permanent failures on either kind still reject and are never confused with an empty answer',async()=>{
 await assert.rejects(()=>fetchCadastralBuildings(bbox,responder(emptyAttrs,'<ExceptionReport/>')),/ExceptionReport/);
 await assert.rejects(()=>fetchCadastralBuildings(bbox,responder('<not-xml',emptyAttrs)),/XML/);
 await assert.rejects(()=>fetchCadastralBuildings(bbox,async()=>new Response('',{status:503})),/503/);
});
const forest={type:'Feature',id:'forest',properties:{sourceLayer:'landcover',class:'wood'},geometry:{type:'Polygon',coordinates:[[[3.204,41.917],[3.206,41.917],[3.206,41.919],[3.204,41.919],[3.204,41.917]]]}};
const makeRegion=()=>({meta:{bbox},vectorFeatures:[forest],features:[forest],dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4)}],terrainWarnings:[]});
test('a successful empty result is cached as the chosen source, and the model exports without buildings',async()=>{
 const region=makeRegion(),previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;return responder(emptyAttrs,emptyAttrs)(url);};
 try{
  const layer=await loadBuildingLayer(region,{source:'catastre'});
  assert.equal(calls,2);assert.deepEqual(layer.features,[]);assert.equal(layer.source,'catastre');assert(layer.warnings.some(w=>/no ha retornat volums/.test(w)));
  assert.strictEqual(await loadBuildingLayer(region,{source:'catastre'}),layer);assert.equal(calls,2);
  applyBuildingLayer(region,layer);
  assert.deepEqual(region.features,[forest]);assert.equal(region.meta.buildingSource,'catastre');assert.equal(region.meta.buildings.count,0);
  const model=buildModel(region,{size:60,resolution:3,density:.5});
  assert.equal(model.buildingCount,0);
  const provenance=JSON.parse(strFromU8(unzipSync(threeMF(model))['Metadata/provenance.json']));
  assert.equal(provenance.buildingSource,'catastre');assert.equal(provenance.buildingVolumes.length,0);
 }finally{globalThis.fetch=previous;}
});
test('errors are never negatively cached: a failed load fetches again on the next attempt',async()=>{
 const region=makeRegion(),previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;if(calls<=2)throw new TypeError('fetch failed');return responder(emptyAttrs,emptyAttrs)(url);};
 try{
  await assert.rejects(()=>loadBuildingLayer(region,{source:'catastre'}),/no s’ha pogut connectar/);
  const layer=await loadBuildingLayer(region,{source:'catastre'});
  assert.equal(calls,4);assert.deepEqual(layer.features,[]);assert.equal(layer.source,'catastre');
 }finally{globalThis.fetch=previous;}
});
const bounded='<wfs:boundedBy xmlns:wfs="http://www.opengis.net/wfs/2.0"><gml:Envelope xmlns:gml="http://www.opengis.net/gml/3.2" srsName="urn:ogc:def:crs:EPSG::25831"><gml:lowerCorner>517000 4640700</gml:lowerCorner><gml:upperCorner>517020 4640720</gml:upperCorner></gml:Envelope></wfs:boundedBy>';
test('only a truly empty shape is accepted: text content, unknown containers and paging or truncation markers are rejected',()=>{
 assert.throws(()=>parseCadastreGML('<gml:FeatureCollection xmlns:gml="http://www.opengis.net/gml/3.2">garbage</gml:FeatureCollection>'),/no admès/);
 assert.throws(()=>parseCadastreGML('<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0"><wfs:SomethingElse/></wfs:FeatureCollection>'),/contenidor/);
 const paged=emptyAttrs.replace('/>',' next="https://example/next"/>');
 assert.throws(()=>parseCadastreGML(paged),/incompleta/);
 assert.throws(()=>parseCadastreGML(paged.replace(' next=',' truncated=')),/incompleta/);
 assert.throws(()=>parseCadastreGML('<ExceptionReport/>'),/ExceptionReport/);
});
test('declared counts must match the received members; a positive matched count with no members is incomplete, not no-buildings',()=>{
 assert.throws(()=>parseCadastreGML(emptyAttrs.replace('numberMatched="0"','numberMatched="12"')),/incompleta/);
 assert.throws(()=>parseCadastreGML(emptyAttrs.replace('numberReturned="0"','numberReturned="3"')),/incompleta/);
 assert.throws(()=>parseCadastreGML(gml().replace('<gml:FeatureCollection ','<gml:FeatureCollection numberMatched="0" ')),/incompleta/);
 const consistent=gml().replace('<gml:FeatureCollection ','<gml:FeatureCollection numberMatched="1" numberReturned="1" numberOfFeatures="1" ');
 assert.equal(parseCadastreGML(consistent).length,1);
});
test('boundedBy metadata is accepted in empty and populated collections, with ordinary members preserved',()=>{
 const emptyBounded='<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0" numberMatched="0" numberReturned="0">'+bounded+'</wfs:FeatureCollection>';
 assert.deepEqual(parseCadastreGML(emptyBounded),[]);
 const populated=gml().replace('<gml:featureMember>',bounded+'<gml:featureMember>');
 const [p]=parseCadastreGML(populated);assert.equal(p.id,'A_part1');assert.equal(p.properties.family,'A');
});
test('an incomplete paged answer rejects at fetch level and is never cached as empty',async()=>{
 const region=makeRegion(),previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;return new Response(calls===1?emptyAttrs.replace('/>',' next="https://example/next"/>'):emptyAttrs);};
 try{
  await assert.rejects(()=>loadBuildingLayer(region,{source:'catastre'}),/incompleta/);assert.equal(calls,1);
  const layer=await loadBuildingLayer(region,{source:'catastre'});
  assert.equal(calls,3);assert.deepEqual(layer.features,[]);assert.equal(layer.source,'catastre');
 }finally{globalThis.fetch=previous;}
});
