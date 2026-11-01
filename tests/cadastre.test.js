import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCadastreGML,cadastralVolumes,cadastreQuery,fetchCadastralBuildings} from '../src/cadastre.js';
const ring='517000 4640700 517020 4640700 517020 4640720 517000 4640720 517000 4640700';
function gml(kind='BuildingPart',items=[{id:'A_part1',floors:2}],inner=false){return `<gml:FeatureCollection xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:b="urn:bu">${items.map(({id,floors})=>`<gml:featureMember><b:${kind} gml:id="${id}"><b:geometry><b:BuildingGeometry><b:geometry><gml:Surface srsName="urn:ogc:def:crs:EPSG::25831"><gml:patches><gml:PolygonPatch><gml:exterior><gml:LinearRing><gml:posList srsDimension="2" count="5">${ring}</gml:posList></gml:LinearRing></gml:exterior>${inner?`<gml:interior><gml:LinearRing><gml:posList srsDimension="2">517005 4640705 517005 4640710 517010 4640710 517010 4640705 517005 4640705</gml:posList></gml:LinearRing></gml:interior>`:''}</gml:PolygonPatch></gml:patches></gml:Surface></b:geometry></b:BuildingGeometry></b:geometry>${floors==null?'':`<b:numberOfFloorsAboveGround>${floors}</b:numberOfFloorsAboveGround>`}</b:${kind}></gml:featureMember>`).join('')}</gml:FeatureCollection>`;}
test('cadastral parts preserve IDs, holes and estimated heights and reproject metric coordinates',()=>{
 const [p]=parseCadastreGML(gml('BuildingPart',undefined,true));assert.equal(p.id,'A_part1');assert.equal(p.properties.family,'A');assert.equal(p.properties.render_height,6);assert(p.properties.height_estimated);assert.equal(p.geometry.coordinates[0].length,2);assert(Math.abs(p.geometry.coordinates[0][0][0][0]-3.205)<.01);
});
test('parts replace their family envelope; zero-floor parts never become six-metre buildings',()=>{
 const buildings=parseCadastreGML(gml('Building',[{id:'A'},{id:'B'},{id:'C'}]),{kind:'Building'}),parts=parseCadastreGML(gml('BuildingPart',[{id:'A_part1',floors:2},{id:'A_part2',floors:3},{id:'B_part1',floors:0}]));
 assert.deepEqual(cadastralVolumes(buildings,parts).map(p=>p.id),['A_part1','A_part2','C']);
});
test('bad or oversized responses, CRS, open rings and duplicate identifiers fail explicitly',()=>{
 for(const raw of ['<bad>', '<ExceptionReport/>','<!DOCTYPE a><a/>',gml().replace('EPSG::25831','EPSG::3857'),gml().replace(ring,ring.replace(/517000 4640700$/,'517001 4640700')),gml('BuildingPart',[{id:'A',floors:1},{id:'A',floors:1}])])assert.throws(()=>parseCadastreGML(raw));
 assert.throws(()=>cadastreQuery([3,41,3.1,41.1]),/4 km/);assert.throws(()=>cadastreQuery([10,48,10.01,48.01]),/àmbit/);
});
test('bounded WFS requests load both families and parts, and do not silently switch provider',async()=>{
 const calls=[],result=await fetchCadastralBuildings([3.204,41.917,3.206,41.919],async url=>{const u=new URL(url);calls.push(u);return new Response(gml(u.searchParams.get('typenames')==='BU.BUILDING'?'Building':'BuildingPart',u.searchParams.get('typenames')==='BU.BUILDING'?[{id:'A'}]:undefined));});
 assert.equal(calls.length,2);assert.equal(result.features.length,1);assert.equal(result.features[0].id,'A_part1');assert.equal(result.metadata.partCount,1);assert.equal(calls[0].searchParams.get('srsname'),'EPSG::25831');
 await assert.rejects(()=>fetchCadastralBuildings([3.204,41.917,3.206,41.919],async()=>new Response('',{status:503})),/503/);
});
