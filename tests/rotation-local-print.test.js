import test from 'node:test';
import assert from 'node:assert/strict';
import {scaledBBox,selectionPose} from '../src/selection.js';
import {makeProjection,buildModel} from '../src/geometry.js';
import {importDEM,importBuildings} from '../src/local-import.js';
import {localRasterSampler,coordinateTransform} from '../src/local-raster.js';
import {writeArrayBuffer} from 'geotiff';
import {threeMF} from '../src/export.js';
import {unzipSync,strFromU8} from 'fflate';
import {readFile} from 'node:fs/promises';
import {loadRegion} from '../src/sources.js';
const close=(a,b,tol=1e-5)=>assert(Math.abs(a-b)<tol,`${a} != ${b}`);
test('rotated rectangular footprints round-trip, preserve scale and load all four corners',()=>{
  for(const lat of [0,41.918,65])for(const rotation of [-180,-45,0,35,90,180]){
    const pose=selectionPose(scaledBBox([lat,3.2075],150,200,1500),rotation),p=makeProjection(pose.bbox,200,{widthMM:150,heightMM:200,selectionPose:pose});
    close(1000/p.scale,1500);const expected=[[0,0],[150,0],[150,200],[0,200]];
    pose.corners.forEach((c,i)=>{const xy=p.project(c),ll=p.unproject(xy);close(xy[0],expected[i][0]);close(xy[1],expected[i][1]);close(ll[0],c[0]);close(ll[1],c[1]);assert(c[0]>=pose.bbox[0]&&c[0]<=pose.bbox[2]&&c[1]>=pose.bbox[1]&&c[1]<=pose.bbox[3]);});
  }
  assert.throws(()=>selectionPose([3,41,3.01,41.01],200),/gir/);
});
test('numeric GeoTIFF retains elevation and pixel-centre registration; outside/no-data fails',async()=>{
  const buffer=writeArrayBuffer(new Float32Array([10,20,30,40]),{width:2,height:2,ModelPixelScale:[.001,.001,0],ModelTiepoint:[0,0,0,3,42,0],GeographicTypeGeoKey:4326,GTRasterTypeGeoKey:1,SampleFormat:[3],BitsPerSample:[32],SamplesPerPixel:1});
  const dem=await importDEM(buffer,'mdt-test.tif'),sample=localRasterSampler(dem);
  assert.deepEqual(Array.from(dem.values),[10,20,30,40]);close(sample(3.0005,41.9995),10);close(sample(3.001,41.999),25);assert.throws(()=>sample(4,42),/cobreix/);
  const missing={...dem,values:new Float32Array([10,NaN,30,40])};assert.throws(()=>localRasterSampler(missing)(3.001,41.999),/sense dades/);
  assert.equal(dem.metadata.file,'mdt-test.tif');assert.equal(dem.metadata.epsg,4326);
});
test('UTM raster sampling uses projected coordinates and preserves source heights',()=>{
  const t=coordinateTransform(25831),[x,y]=t.inverse([3.2,41.9]),dem={width:2,height:2,epsg:25831,affine:[2,0,x-1,0,-2,y+1],pixelIsArea:true,values:new Float32Array([17,18,19,20])};
  close(localRasterSampler(dem)(3.2,41.9),17);assert.throws(()=>coordinateTransform(999999),/no admès/);
});
test('RGB images, unsupported compression and unknown CRS cannot become a local numeric DEM',async()=>{
  const meta={width:2,height:2,ModelPixelScale:[1,1,0],ModelTiepoint:[0,0,0,3,42,0],GeographicTypeGeoKey:4326};
  await assert.rejects(importDEM(writeArrayBuffer(new Uint8Array(12),{...meta,PhotometricInterpretation:2,SamplesPerPixel:3,BitsPerSample:[8,8,8]})),/banda/);
  await assert.rejects(importDEM(writeArrayBuffer(new Uint8Array(4),{...meta,Compression:7,SamplesPerPixel:1,BitsPerSample:[8]})),/compressió/);
  await assert.rejects(importDEM(writeArrayBuffer(new Uint8Array(4),{...meta,GeographicTypeGeoKey:32767,SamplesPerPixel:1,BitsPerSample:[8]})),/EPSG/);
});
test('local GeoJSON preserves courtyards and heights, reprojects UTM and refuses unsupported geometry',()=>{
  const ring=[[3.2,41.9],[3.201,41.9],[3.201,41.901],[3.2,41.901],[3.2,41.9]],hole=[[3.2002,41.9002],[3.2002,41.9004],[3.2004,41.9004],[3.2004,41.9002],[3.2002,41.9002]];
  const feature={type:'Feature',id:'house',properties:{height:'8.5 m'},geometry:{type:'Polygon',coordinates:[ring,hole]}};
  const source={type:'FeatureCollection',features:[feature]},a=importBuildings(JSON.stringify(source));assert.deepEqual(a.features[0].geometry.coordinates,[ring,hole]);assert.equal(a.features[0].properties.render_height,8.5);
  const t=coordinateTransform(25831),projected={...source,crs:{properties:{name:'urn:ogc:def:crs:EPSG::25831'}},features:[{...feature,geometry:{type:'Polygon',coordinates:[ring.map(p=>t.inverse(p))]}}]};const b=importBuildings(JSON.stringify(projected));close(b.features[0].geometry.coordinates[0][0][0],3.2);close(b.features[0].geometry.coordinates[0][0][1],41.9);
  assert.throws(()=>importBuildings(JSON.stringify({...source,features:[{...feature,geometry:{type:'Point',coordinates:[3,42]}}]})),/Polygon/);
});
test('rotated model uses local DEM, keeps horizontal dimensions and exports chosen print settings',()=>{
  const pose=selectionPose(scaledBBox([41.918,3.2075],150,200,1000),35),localDEM={width:4,height:4,epsg:4326,affine:[.01,0,3.19,0,-.01,41.94],pixelIsArea:true,values:new Float32Array(16).fill(20)};
  const model=buildModel({meta:{bbox:pose.bbox},features:[],dem:[],localDEM},{size:200,widthMM:150,heightMM:200,targetScale:1000,selectionPose:pose,resolution:3,trees:false});assert.equal(model.width,150);assert.equal(model.height,200);assert.equal(model.scale,1000);assert.equal(model.provenance.options.selectionPose.rotation,35);
  const files=unzipSync(threeMF(model,{bambu:true,printing:{filament:'PETG',nozzle:.6}})),settings=JSON.parse(strFromU8(files['Metadata/project_settings.config'])),meta=JSON.parse(strFromU8(files['Metadata/provenance.json']));assert.deepEqual(settings.nozzle_diameter,['0.6']);assert(settings.filament_type.every(x=>x==='PETG'));assert(!('printer_model'in settings));assert(!('nozzle_temperature'in settings));assert.equal(meta.printing.nozzle,.6);assert.equal(meta.printing.filament,'PETG');
  assert.throws(()=>threeMF(model,{printing:{nozzle:9}}),/broquet/);
});
test('local inputs replace the intended source layers and avoid downloading global elevation tiles',async()=>{
  const localBuildings=importBuildings(await readFile(new URL('../public/data/tamariu-buildings-icgc.geojson',import.meta.url),'utf8'),'test.geojson'),localDEM={metadata:{provider:'GeoTIFF local'}},previous=globalThis.fetch,requests=[];
  globalThis.fetch=async url=>{requests.push(String(url));assert(!String(url).endsWith('.webp'));assert(!String(url).startsWith('https:'));return new Response(await readFile(new URL('../public/'+String(url).replace(/^\.\//,''),import.meta.url)));};
  try{const data=await loadRegion({sample:true,localDEM,localBuildings,decodeElevation:()=>{throw Error('Global DEM should not decode.');}});assert.equal(data.localDEM,localDEM);assert.equal(data.meta.buildings.provider,'GeoJSON local');assert.equal(data.features.filter(f=>f.properties.sourceLayer==='building').length,632);assert.equal(data.meta.elevationDecoding.method,'numeric GeoTIFF raster; no canvas readback');assert.equal(requests.length,5);}finally{globalThis.fetch=previous;}
});
