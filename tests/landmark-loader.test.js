import test from 'node:test';
import assert from 'node:assert/strict';
import {createLandmarkLoader} from '../src/landmarks.js';

const catalogue='https://example.org/landmarks/catalog.geojson';
const mesh=new URL('models/tower/r1/print.glb',catalogue).href;
const otherMesh=new URL('models/other/r1/print.glb',catalogue).href;
const vertices=[-2,0,-1,2,0,-1,0,0,2,0,20,0];
const faces=[0,1,2,0,3,1,1,3,2,2,3,0];
const crop=[2,41,3,42];
const replacement={featureIds:['icgc-42'],families:['ref:42']};

function tower({id='tower',bbox=[2.18,41.4,2.2,41.41],properties={}}={}){
  const [w,s,e,n]=bbox;
  return {
    type:'Feature',id,bbox,
    geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]},
    properties:{name:'Tower',anchor:[(w+e)/2,(s+n)/2],revision:'r1',mesh:'models/tower/r1/print.glb',height:20,
      attribution:'Example contributor',license:'CC-BY-4.0',sources:['https://example.org/reference'],spatialDataLicense:'ODbL-1.0',
      replacement,...properties}
  };
}

const collection=(...features)=>new Response(JSON.stringify({type:'FeatureCollection',schemaVersion:1,features}));

function glb({wide=false,edit=()=>{},indices=faces}={}){
  const componentBytes=wide?4:2,positionBytes=vertices.length*4,indexBytes=indices.length*componentBytes;
  const gltf={asset:{version:'2.0'},scenes:[{nodes:[0]}],scene:0,nodes:[{mesh:0}],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],buffers:[{byteLength:positionBytes+indexBytes}],
    bufferViews:[{buffer:0,byteLength:positionBytes},{buffer:0,byteOffset:positionBytes,byteLength:indexBytes}],
    accessors:[{bufferView:0,componentType:5126,count:vertices.length/3,type:'VEC3'},
      {bufferView:1,componentType:wide?5125:5123,count:indices.length,type:'SCALAR'}]};
  edit(gltf);
  const json=new TextEncoder().encode(JSON.stringify(gltf)),jsonBytes=(json.length+3)&~3;
  const binStart=28+jsonBytes,binBytes=(positionBytes+indexBytes+3)&~3;
  const data=new Uint8Array(binStart+binBytes),view=new DataView(data.buffer);
  for(const [offset,value] of [[0,0x46546c67],[4,2],[8,data.length],[12,jsonBytes],[16,0x4e4f534a],
    [binStart-8,binBytes],[binStart-4,0x004e4942]])view.setUint32(offset,value,true);
  data.fill(0x20,20,20+jsonBytes);
  data.set(json,20);
  vertices.forEach((value,i)=>view.setFloat32(binStart+i*4,value,true));
  indices.forEach((value,i)=>wide?view.setUint32(binStart+positionBytes+i*4,value,true):
    view.setUint16(binStart+positionBytes+i*2,value,true));
  return new Response(data);
}

test('only intersecting landmarks load and concurrent requests share both caches',async()=>{
  const entry=tower(),requests=[];
  const load=createLandmarkLoader(catalogue,(url,{signal,redirect})=>{
    assert(signal instanceof AbortSignal);
    assert.equal(redirect,'error');
    requests.push(url);
    return url===catalogue?collection(entry,tower({id:'distant',bbox:[20,41,21,42],properties:{mesh:'distant.glb'}})):glb();
  });
  const [first,second]=await Promise.all([load(crop),load(crop)]);
  assert.deepEqual(first,second);
  assert.deepEqual(first.warnings,[]);
  assert.equal(first.models.length,1);
  const [model]=first.models;
  assert.equal(model.id,entry.id);
  assert.equal(model.revision,'r1');
  assert.equal(model.license,'CC-BY-4.0');
  assert.equal(model.spatialDataLicense,'ODbL-1.0');
  assert.deepEqual(model.replacement,replacement);
  assert.deepEqual(model.footprint,entry.geometry);
  assert.deepEqual(model.vertices,Float32Array.from(vertices));
  assert.deepEqual(model.faces,Uint32Array.from(faces));
  assert.deepEqual(await load([-2,41,-1,42]),{models:[],warnings:[]});
  assert.deepEqual(requests,[catalogue,mesh]);
});

test('catalogue and model failures can be retried while usable models remain available',async()=>{
  let catalogueCalls=0,meshCalls=0,otherCalls=0;
  const load=createLandmarkLoader(catalogue,url=>{
    if(url===catalogue)return ++catalogueCalls===1?new Response(null,{status:502}):
      collection(tower(),tower({id:'other',properties:{mesh:'models/other/r1/print.glb'}}));
    if(url===mesh)return ++meshCalls===1?new Response('broken GLB'):glb({wide:true});
    assert.equal(url,otherMesh);
    otherCalls++;
    return glb();
  });
  const failed=await load(crop);
  assert.deepEqual(failed.models,[]);
  assert.match(failed.warnings[0],/catàleg/);
  const partial=await load(crop);
  assert.deepEqual(partial.models.map(({id})=>id),['other']);
  assert.match(partial.warnings[0],/algun model singular/);
  const complete=await load(crop);
  assert.deepEqual(complete.models.map(({id})=>id),['tower','other']);
  assert.deepEqual(complete.models[0].faces,Uint32Array.from(faces));
  assert.deepEqual(complete.warnings,[]);
  assert.deepEqual([catalogueCalls,meshCalls,otherCalls],[2,2,1]);
});

test('bridge metadata is required and future model types do not affect buildings',async()=>{
  const axis=[[2.189,41.403,600],[2.189,41.405,607]];
  const deckRows=axis.map(([lon,lat,z])=>[[lon-.0001,lat,z],[lon+.0001,lat,z]]);
  const bridge={anchorElevation:603,verticalDatum:'NGF-IGN69',ref:'A75',roadClass:'motorway',sourceFeatureIds:['1','2'],
    width:32,depth:4.2,length:200,spans:[100,100],axis,deckRows,pylonIndexCount:3,upperIndexCount:6,
    stayDiameter:4.5,pierSection:{along:9,across:16}};
  const load=createLandmarkLoader(catalogue,url=>url!==catalogue?glb():collection(
    tower(),tower({id:'bridge',properties:{kind:'bridge',bridge}}),
    tower({id:'incomplete',properties:{kind:'bridge',bridge:{...bridge,spans:[100,90]}}}),
    tower({id:'terrain',properties:{kind:'terrain',mesh:'ignored.glb'}})));
  const {models,warnings}=await load(crop);
  assert.deepEqual(models.map(m=>m.kind),['building','bridge']);
  assert.deepEqual(models[1].bridge,bridge);
  assert.equal(warnings.length,1);
});

test('invalid entries cannot request unapproved URLs or carry replacement IDs of another type',async()=>{
  const requests=[];
  const load=createLandmarkLoader(catalogue,url=>{
    requests.push(url);
    if(url===mesh)return glb();
    assert.equal(url,catalogue);
    return collection(tower(),
      tower({id:'external',properties:{mesh:'https://unrelated.org/print.glb'}}),
      tower({id:'parent-directory',properties:{mesh:'../print.glb'}}),
      tower({id:'bad-replacement',properties:{replacement:{featureIds:[42]}}}),
      tower({id:'bad-anchor',properties:{anchor:[2.17,41.4]}}));
  });
  const {models,warnings}=await load(crop);
  assert.deepEqual(models.map(({id})=>id),['tower']);
  assert.equal(warnings.length,1);
  assert.deepEqual(requests,[catalogue,mesh]);
});

test('GLB rejects unsupported transforms, oversized accessors and indices outside the vertex array',async()=>{
  const responses=[
    glb({edit:gltf=>{gltf.nodes[0].translation=[10,0,0];}}),
    glb({edit:gltf=>{gltf.accessors[0].count=100001;}}),
    glb({indices:[0,1,4]})
  ];
  for(const response of responses){
    const load=createLandmarkLoader(catalogue,url=>url===catalogue?collection(tower()):response);
    const {models,warnings}=await load(crop);
    assert.deepEqual(models,[]);
    assert.equal(warnings.length,1);
  }
});

test('byte limits reject declared and streamed oversize responses before parsing',async()=>{
  const stated=new Response('small',{headers:{'content-length':'4194305'}});
  const load=createLandmarkLoader(catalogue,url=>url===catalogue?collection(tower()):stated);
  assert.deepEqual((await load(crop)).models,[]);
  let cancelled=false;
  const streamed=new Response(new ReadableStream({
    start(controller){controller.enqueue(new Uint8Array(512*1024+1));},
    cancel(){cancelled=true;}
  }));
  const unavailable=createLandmarkLoader(catalogue,()=>streamed);
  assert.match((await unavailable(crop)).warnings[0],/catàleg/);
  assert.equal(cancelled,true);
});
