import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {unzipSync,strFromU8} from 'fflate';
import {readFile} from 'node:fs/promises';
import decode,{init} from '@jsquash/webp/decode.js';
import {buildModel,updateBuildings,updateVegetation} from '../src/geometry.js';
import {threeMF} from '../src/export.js';
import {generateProceduralTunnelVoids} from '../src/procedural-tunnels.js';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {prepareElevationTiles,sampleHeight} from '../src/elevation.js';
import {physicalBBox} from '../src/selection.js';
const api=await Module();api.setup();
// Iterate serialized tags directly. Materializing every RegExp match and then
// flat-mapping hundreds of thousands of captured strings needlessly held
// several copies of high-detail meshes in memory during this regression.
function exportedMeshes(xml){
  const result=[];
  for(const m of xml.matchAll(/<mesh><vertices>([\s\S]*?)<\/vertices><triangles>([\s\S]*?)<\/triangles><\/mesh>/g)){
    const vertexTags=/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g,triangleTags=/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"[^>]*\/>/g;
    let vertexCount=0,triangleCount=0;for(const _ of m[1].matchAll(vertexTags))vertexCount++;for(const _ of m[2].matchAll(triangleTags))triangleCount++;
    const vertices=new Float32Array(vertexCount*3),faces=new Uint32Array(triangleCount*3);let i=0;
    for(const v of m[1].matchAll(vertexTags)){vertices[i++]=Number(v[1]);vertices[i++]=Number(v[2]);vertices[i++]=Number(v[3]);}
    i=0;for(const t of m[2].matchAll(triangleTags)){faces[i++]=Number(t[1]);faces[i++]=Number(t[2]);faces[i++]=Number(t[3]);}
    result.push({vertices,faces});
  }
  return result;
}
function hitCount(parts,start,end){let n=0;for(const p of parts){if(!p.faces.length)continue;const mesh=new api.Mesh({numProp:3,vertProperties:p.vertices,triVerts:p.faces});mesh.merge();const solid=new api.Manifold(mesh);try{n+=solid.rayCast(start,end).length;}finally{solid.delete();}}return n;}
const tunnel={id:'hill-tunnel',properties:{sourceLayer:'transportation',class:'trunk',brunnel:'tunnel'},geometry:{type:'LineString',coordinates:[[.001,.005],[.009,.005]]}};
function hill(){const values=new Float32Array(121);for(let y=0;y<11;y++)values.set([0,10,20,30,40,50,40,30,20,10,0],y*11);return {meta:{name:'Synthetic hill',bbox:[0,0,.01,.01]},features:[tunnel],localDEM:{width:11,height:11,epsg:4326,affine:[.001,0,0,0,.001,0],pixelIsArea:false,values,metadata:{}}};}

test('model opt-in excavates preview/export, and incremental buildings/vegetation preserve the cavity and metadata',()=>{
  const data=hill(),options={size:100,resolution:20,trees:false},off=buildModel(data,options,()=>{},api),on=buildModel(data,{...options,estimatedTunnels:true},()=>{},api);
  assert.equal(off.provenance.tunnels.enabled,false);assert.equal(on.provenance.tunnels.applied,true);assert.equal(on.provenance.tunnels.count,1);
  assert(hitCount(off.categories,[0,50,6.6],[100,50,6.6])>0);assert.equal(hitCount(on.categories,[0,50,6.6],[100,50,6.6]),0);
  const changed=updateBuildings(on,{features:data.features,meta:data.meta},{maxBuildingHeight:3});
  const vegetation=updateVegetation(changed,{trees:false,density:.5});
  assert.deepEqual(vegetation.provenance.tunnels,on.provenance.tunnels);
  assert.strictEqual(vegetation.categories.find(p=>p.id==='terrain').vertices,on.categories.find(p=>p.id==='terrain').vertices);
  assert.equal(hitCount(vegetation.categories,[0,50,6.6],[100,50,6.6]),0);
  const files=unzipSync(threeMF(on,{bambu:true})),xml=strFromU8(files['3D/3dmodel.model']),provenance=JSON.parse(strFromU8(files['Metadata/provenance.json']));
  assert.deepEqual(provenance.tunnels,on.provenance.tunnels);
  // Parse the actual serialized mesh, including six-decimal export rounding.
  const exported=exportedMeshes(xml);
  assert.equal(exported.length,on.parts.length);assert.equal(hitCount(exported,[0,50,6.6],[100,50,6.6]),0);
});

test('missing tunnel DEM keeps terrain and reports omission instead of blocking a model',()=>{
  const data=hill();data.features=[{...tunnel,geometry:{type:'LineString',coordinates:[[-.01,.005],[.009,.005]]}}];
  const model=buildModel(data,{size:100,resolution:12,trees:false,estimatedTunnels:true},()=>{},api);
  assert.equal(model.provenance.tunnels.count,0);assert.equal(model.provenance.tunnels.omitted,1);assert(model.warnings.some(w=>/DEM als extrems originals/.test(w)));
  assert(hitCount(model.categories,[0,50,6.6],[100,50,6.6])>0);
});

test('raised surface roads do not seal either estimated portal',()=>{
  const data=hill();data.localDEM.values=Float32Array.from(data.localDEM.values,v=>v*2);
  data.features.push({id:'raised-road',properties:{sourceLayer:'transportation',class:'trunk'},geometry:{type:'LineString',coordinates:[[0,.005],[.01,.005]]}});
  const model=buildModel(data,{size:100,resolution:20,trees:false,estimatedTunnels:true,roadRise:1},()=>{},api);
  assert.equal(model.provenance.tunnels.applied,true);assert.equal(model.provenance.tunnels.count,1);
  assert.equal(hitCount(model.categories,[0,50,8],[100,50,8]),0,'raised road must not leave portal caps');
});

test('Rajadell integrated estimated tunnel has an open centreline through real terrain and land cover',async()=>{
  await init(await WebAssembly.compile(await readFile('node_modules/@jsquash/webp/codec/dec/webp_dec.wasm')));const prior=globalThis.fetch;
  try{
    globalThis.fetch=async url=>new Response(await readFile(new URL('../public/'+String(url).replace(/^\.\//,''),import.meta.url)));
    const data=await loadRegion({sample:'eix-diagonal',buildingSource:'osm',decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode)});
    for(const [km,mm,resolution]of [[1.5,150,24],[1.5,150,36],[1.5,150,56],[3,300,36]]){
      const selected=km===1.5?data:{...data,meta:{...data.meta,bbox:physicalBBox([41.72213,1.779785],km,km)}};
      const model=buildModel(selected,{size:mm,resolution,trees:false,estimatedTunnels:true},()=>{},api);
      assert.equal(model.provenance.tunnels.applied,true,`${km} km/${mm} mm/res${resolution}`);
      const main=model.provenance.tunnels.profiles.find(t=>t.sourceFeatureIds.includes(1820235140));assert(main);
      const path=main.pathMM.map(([x,y,z])=>[x,y,z+main.heightMM/2]);
      for(let i=1;i<path.length;i++)assert.equal(hitCount(model.categories,path[i-1],path[i]),0,`${km} km/${mm} mm/res${resolution}, segment ${i}: tunnel centreline blocked`);
      assert(main.portalExtensionMM.every(v=>v<=Math.min(8,100*model.context.scale)+1e-9));
      assert(main.portalRampGrades.every(v=>Math.abs(v)<=.25||main.portalAdjustmentMM.every(v=>v===0)));
      if(resolution!==24)assert(main.portalAdjustmentMM.some(v=>v>0),'the portal ramp correction must be explicit');
      assert(main.portalAdjustmentMetres.every(v=>Math.abs(v)<=25));
      // Check the actual serialized geometry, not only provenance or live buffers.
      const files=unzipSync(threeMF(model,{bambu:true})),xml=strFromU8(files['3D/3dmodel.model']),exported=exportedMeshes(xml);
      assert.equal(exported.length,model.parts.length);
      for(let i=1;i<path.length;i++)assert.equal(hitCount(exported,path[i-1],path[i]),0,`serialized ${km} km/res${resolution} tunnel segment ${i}`);
    }
    const tooSmall=buildModel({...data,meta:{...data.meta,bbox:physicalBBox([41.72213,1.779785],3,3)}},{size:150,resolution:36,trees:false,estimatedTunnels:true},()=>{},api);
    assert(!tooSmall.provenance.tunnels.profiles?.some(t=>t.sourceFeatureIds.includes(1820235140)));
    assert(tooSmall.provenance.tunnels.omissions.some(t=>t.id.includes('1820235140')&&/coberta/.test(t.reason)),'a physically oversized opening must not be forced through a low model hill');
  }finally{globalThis.fetch=prior;}
});
