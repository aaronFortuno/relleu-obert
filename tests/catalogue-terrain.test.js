import test from 'node:test';
import assert from 'node:assert/strict';
import {writeArrayBuffer} from 'geotiff';
import {coordinateTransform} from '../src/local-raster.js';
import {createLandmarkLoader} from '../src/landmarks.js';
import {terrainTilesInCrop,withTerrainTiles} from '../src/catalogue-terrain.js';

const epsg=25831,{forward}=coordinateTransform(epsg),datum='EGM08D595',origin=[398000,4607000];
const absolute=(x,y)=>[origin[0]+x,origin[1]+y];
const world=(x,y)=>forward(absolute(x,y));
const bounds=(w,s,e,n)=>[...absolute(w,s),...absolute(e,n)];
const quadrilateral=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n]].map(([x,y])=>world(x,y));
const envelope=corners=>[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1])),
  Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1]))];

function tileFixture(id,w){
  const step=2,columns=11,rows=11;
  const values=Float32Array.from({length:columns*rows},(_,i)=>800+w+i%columns*step);
  const bytes=writeArrayBuffer(values,{width:columns,height:rows,BitsPerSample:[32],SampleFormat:[3],SamplesPerPixel:1,
    ModelPixelScale:[step,step,0],ModelTiepoint:[0,0,0,...absolute(w,20),0],GTModelTypeGeoKey:1,GTRasterTypeGeoKey:2,
    ProjectedCSTypeGeoKey:epsg,VerticalUnitsGeoKey:9001});
  return {bytes,entry:{id,bounds:bounds(w,0,w+20,20),step,data:`models/test/${id}.tif`,byteLength:bytes.byteLength}};
}

test('rotated crops do not fetch tiles that only intersect their bounding box',()=>{
  const diamond=[[20,0],[40,20],[20,40],[0,20]].map(([x,y])=>world(x,y));
  const index={epsg,tiles:[{id:'inside',bounds:bounds(15,15,25,25)},{id:'corner',bounds:bounds(32,32,40,40)}]};
  assert.deepEqual(terrainTilesInCrop(index,envelope(diamond),diamond).map(tile=>tile.id),['inside']);
  assert.equal(terrainTilesInCrop(index,envelope(diamond)).length,2);
});

test('the catalogue fetches only needed GeoTIFFs and blends at the outer edge, including an unavailable neighbour',async()=>{
  const catalogue='https://example.org/catalog.geojson',west=tileFixture('west',0),east=tileFixture('east',20);
  const footprint=quadrilateral(-5,-5,45,25),requests=[];
  const index={type:'FeatureCollection',schemaVersion:1,features:[{type:'Feature',id:'massif',bbox:envelope(footprint),
    geometry:{type:'Polygon',coordinates:[[...footprint,footprint[0]]]},properties:{kind:'terrain-overview',name:'Massif',revision:'r1',height:1250,
      anchor:world(20,10),mesh:'models/test/print.glb',attribution:'Example',license:'CC-BY-4.0',sources:[],
      terrainTiles:{epsg,verticalDatum:datum,tiles:[west.entry,east.entry]}}}]};
  let missingEast=true;
  const load=createLandmarkLoader(catalogue,url=>{
    requests.push(url);
    if(url===catalogue)return Response.json(index);
    if(url.endsWith('/west.tif'))return new Response(west.bytes);
    assert(url.endsWith('/east.tif'));
    return missingEast?new Response(null,{status:503}):new Response(east.bytes);
  });
  const crop=quadrilateral(5,5,19,15),crossing=quadrilateral(5,5,35,15);
  const first=await load(envelope(crop),['terrain-overview'],crop);
  assert.deepEqual(requests,[catalogue,'https://example.org/models/test/west.tif']);
  assert.deepEqual(first.warnings,[]);
  const base=()=>100;
  const oneTile=withTerrainTiles(base,first.models);
  // The indexed neighbour keeps the shared seam internal even if the crop
  // ends on the west side and has no reason to fetch the eastern GeoTIFF.
  assert(oneTile(...world(19,10))>750);
  assert.equal(oneTile(...world(-1,10)),100);
  const partial=await load(envelope(crossing),undefined,crossing);
  assert.equal(partial.warnings.length,1);
  assert.equal(withTerrainTiles(base,partial.models)(...world(20,10)),100);

  missingEast=false;
  const complete=await load(envelope(crossing),undefined,crossing);
  assert.deepEqual(complete.warnings,[]);
  assert.deepEqual(complete.models[0].tiles.map(tile=>tile.id),['west','east']);
  const mosaic=withTerrainTiles(base,complete.models);
  const left=mosaic(...world(19.999,10)),right=mosaic(...world(20.001,10));
  assert(left>750&&right>750&&Math.abs(right-left)<.01);
  assert.equal(mosaic(...world(41,10)),100);
});
