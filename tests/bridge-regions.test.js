import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {buildModel} from '../src/geometry.js';
import {physicalBBox,selectionPose} from '../src/selection.js';
import {polygonOps} from '../src/polygon-ops.js';
import {uniteMaterials} from '../src/solid-operations.js';

await init(await WebAssembly.compile(await readFile('node_modules/@jsquash/webp/codec/dec/webp_dec.wasm')));
const api=await Module();api.setup();
async function region(bbox){
  const prior=globalThis.fetch;
  try{
    globalThis.fetch=async url=>new Response(await readFile(new URL('../public/'+String(url).replace(/^\.\//,''),import.meta.url)));
    return await loadRegion({sample:'eix-diagonal',bbox,buildingSource:'osm',decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode)});
  }finally{globalThis.fetch=prior;}
}

test('Rajadell retains original decks across small rotated, default and larger shifted physical crops',async()=>{
  let original;
  for(const [centre,km,angle,mm] of [
    [[41.7185,1.7837],.6,25,150],[[41.71792,1.78391],1.5,0,150],[[41.7188,1.7845],2,0,400],
  ]){
    const pose=selectionPose(physicalBBox(centre,km,km),angle),data=await region(pose.bbox);
    const item=data.infrastructure.items.find(p=>p.id==='ifc-127512');assert(item);
    if(original)assert.deepEqual(item.coordinates,original);else original=item.coordinates;
    const model=buildModel(data,{size:mm,widthMM:mm,heightMM:mm,resolution:16,selectionPose:pose,trees:false},()=>{},api);
    assert(model.context.bridges.some(b=>b.id===item.id));
    assert.equal(model.provenance.infrastructure.completion.union,true);
    assert.equal(model.provenance.verticalReference.minimumSurfaceMM,5);
    for(const part of model.categories)for(let i=0;i<part.vertices.length;i+=3){
      const [x,y,z]=part.vertices.subarray(i,i+3);
      assert([x,y,z].every(Number.isFinite));
      assert(x>=-.001&&x<=mm+.001&&y>=-.001&&y<=mm+.001,`outside crop: ${x},${y}, ${mm}`);
    }
  }
});

test('Rajadell without its prepared deck assets still generates elevated procedural bridges',async()=>{
  const data=await region(physicalBBox([41.71792,1.78391],1.5,1.5));data.infrastructure=null;
  const model=buildModel(data,{size:150,resolution:16,trees:false},()=>{},api),meta=model.provenance.infrastructure;
  assert.equal(meta.knownCount,0);assert(meta.proceduralCount>0);
  const bridge=model.context.bridges.find(b=>b.sourceFeatureIds?.some(id=>String(id)==='1820330482'));assert(bridge);
  assert.equal(bridge.estimated,true);assert.equal(bridge.elevationMethod,'linear-dem-endpoints');
  let clearance=-Infinity;
  for(let i=0;i<bridge.mesh.vertices.length;i+=3){const [x,y,z]=bridge.mesh.vertices.subarray(i,i+3);clearance=Math.max(clearance,z-model.context.ground(x,y));}
  assert(clearance>1,'the procedural deck must stay above the valley');
});

test('procedural bridge piers avoid a lower path and the complete underpass remains open',()=>{
  const values=new Float32Array(121);
  for(let y=0;y<11;y++)values.set([50,40,30,20,10,0,10,20,30,40,50],y*11);
  const line=(id,coordinates,properties)=>({type:'Feature',id,properties:{sourceLayer:'transportation',...properties},geometry:{type:'LineString',coordinates}});
  const data={meta:{bbox:[0,0,.01,.01]},localDEM:{width:11,height:11,epsg:4326,affine:[.001,0,0,0,.001,0],pixelIsArea:false,values,metadata:{}},features:[
    // A wide deck can carry the 0.8 mm minimum printable support.
    line('upper',[[.001,.005],[.009,.005]],{class:'primary',width:20,brunnel:'bridge',layer:1}),
    line('lower',[[.005,.003],[.005,.007]],{class:'path'}),
  ]};
  const model=buildModel(data,{size:100,resolution:12,trees:false},()=>{},api);
  assert.equal(model.provenance.infrastructure.proceduralCount,1);
  const detail=model.provenance.infrastructure.completion.details[0];assert(detail.piers.length);
  for(const pier of detail.piers)assert.equal(polygonOps().intersection([[pier.ring.concat([pier.ring[0]])]],model.context.roadPoly).length,0);
  const roads=uniteMaterials({parts:[model.categories.find(p=>p.id==='roads')]},api);
  const [x,y]=model.context.proj.project([.005,.005]);
  for(const part of roads.parts){
    const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});mesh.merge();
    const solid=new api.Manifold(mesh);
    try{assert.equal(solid.rayCast([x,y-20,6],[x,y+20,6]).length,0,'the lower path must not be sealed by the bridge');}
    finally{solid.delete();}
  }
});
