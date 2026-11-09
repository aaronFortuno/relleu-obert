import test from 'node:test';
import assert from 'node:assert/strict';
import {createLandmarkLoader} from '../src/landmarks.js';
import {catalogueBridgeItem} from '../src/catalogue-bridges.js';
import {applyCatalogueRailways} from '../src/catalogue-railways.js';

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
  const entry=tower({properties:{terrainBaseElevation:59.9}}),requests=[];
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
  assert.equal(model.terrainBaseElevation,59.9);
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
      collection(tower(),tower({id:'other',properties:{mesh:'models/other/r1/print.glb',anchorElevation:48.2}}));
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
  assert.equal(complete.models[1].anchorElevation,48.2);
  assert.deepEqual(complete.models[0].faces,Uint32Array.from(faces));
  assert.deepEqual(complete.warnings,[]);
  assert.deepEqual([catalogueCalls,meshCalls,otherCalls],[2,2,1]);
});

test('bridge metadata is required and future model types do not affect buildings',async()=>{
  const axis=[[2.189,41.403,600],[2.189,41.405,607]];
  const deckRows=axis.map(([lon,lat,z])=>[[lon-.0001,lat,z],[lon+.0001,lat,z]]);
  const bridge={anchorElevation:603,verticalDatum:'NGF-IGN69',ref:'A75',roadClass:'motorway',sourceFeatureIds:['1','2'],
    width:32,depth:4.2,length:200,spans:[100,100],axis,deckRows,pylonIndexCount:3,upperIndexCount:6,
    stayDiameter:4.5,pierSection:{along:9,across:16},supportFeatureIds:['42'],supportBuildingIds:['icgc-808434','icgc-808442']};
  const load=createLandmarkLoader(catalogue,url=>url!==catalogue?glb():collection(
    tower(),tower({id:'bridge',properties:{kind:'bridge',bridge}}),
    tower({id:'incomplete',properties:{kind:'bridge',bridge:{...bridge,spans:[100,90]}}}),
    tower({id:'unknown-support',properties:{kind:'bridge',bridge:{...bridge,supportBuildingIds:['unverified-42']}}}),
    tower({id:'terrain',properties:{kind:'terrain',mesh:'ignored.glb'}})));
  const {models,warnings}=await load(crop);
  assert.deepEqual(models.map(m=>m.kind),['building','bridge']);
  assert.deepEqual(models[1].bridge,bridge);
  assert.deepEqual(catalogueBridgeItem(models[1]).supportFeatureIds,['42','icgc-808434','icgc-808442']);
  assert.equal(warnings.length,1);
});

test('pure terrain loads only the intersecting landform sidecar and rejects an unsafe cutter',async()=>{
  const data='models/arch/r1/terrain.json',url=new URL(data,catalogue).href,requests=[];
  const arch=tower({id:'arch',properties:{kind:'landform',landform:{data,verticalDatum:'EGM08D595',minimumWidth:10}}});
  const grid={side:5,step:5,elevations:Array(25).fill(900)};
  const cutter={vertices:vertices.map((v,i)=>i%3===1?v+890:v),faces};
  const load=createLandmarkLoader(catalogue,target=>{
    requests.push(target);
    return target===catalogue?collection(tower(),arch):Response.json({grid,void:cutter});
  });
  const first=await load(crop,['landform']);
  assert.deepEqual(first.models.map(m=>m.id),['arch']);
  assert.deepEqual(first.warnings,[]);
  assert.deepEqual(first.models[0].cutter.faces,Uint32Array.from(cutter.faces));
  assert.deepEqual(requests,[catalogue,url]);

  const invalid=createLandmarkLoader(catalogue,target=>target===catalogue?collection(arch):
    Response.json({grid,void:{...cutter,faces:[...cutter.faces.slice(0,-1),99]}}));
  const rejected=await invalid(crop,['landform']);
  assert.deepEqual(rejected.models,[]);
  assert.equal(rejected.warnings.length,1);
});

const railwayProfile={data:'models/railway/r1/route.json'};
const railwayEntry=tower({id:'rack-railway',properties:{name:'Rack railway',kind:'railway',railway:railwayProfile}});
const railwayAsset=new URL(railwayProfile.data,catalogue).href;
const railwayData={version:1,replace:['123'],paths:[
  {id:'approach',structure:'surface',width:3,points:[[2.184,41.406,1000],[2.185,41.406,1010]]},
  {id:'span',structure:'bridge',width:3,points:[[2.185,41.406,1010],[2.186,41.406,1020]]},
  {id:'bore',structure:'tunnel',width:3,points:[[2.186,41.406],[2.187,41.406]]},
]};
const transport=(id,properties={})=>({id,properties:{sourceLayer:'transportation',class:'rail',...properties},
  geometry:{type:'LineString',coordinates:[[2.184,41.406],[2.185,41.406]]}});

test('railway sidecar replaces only listed active rails in both transport sources',async()=>{
  const requests=[];
  const load=createLandmarkLoader(catalogue,url=>{
    requests.push(url);
    if(url===catalogue)return collection(railwayEntry);
    assert.equal(url,railwayAsset);
    return Response.json(railwayData);
  });
  assert.deepEqual(await load(crop,['landform']),{models:[],warnings:[]});
  assert.deepEqual(await load([4,41,5,42]),{models:[],warnings:[]});
  const {models,warnings}=await load(crop,['railway']);
  assert.deepEqual(warnings,[]);
  assert.deepEqual(requests,[catalogue,railwayAsset]);
  assert.deepEqual(models[0].railway,railwayProfile);
  const listed=transport(123),siding=transport(456),old=transport(123,{subclass:'abandoned'}),road=transport(123,{class:'primary'});
  const input={singularModels:models,features:[listed,siding,old,road],bridgeFeatures:[listed,siding]};
  const result=applyCatalogueRailways(input);
  assert.deepEqual(result.features.slice(0,3),[siding,old,road]);
  assert.deepEqual(result.bridgeFeatures,[siding]);
  assert.deepEqual(input.features,[listed,siding,old,road]);
  assert.deepEqual(input.bridgeFeatures,[listed,siding]);
  assert.deepEqual(result.features.slice(3).map(feature=>[
    feature.id,feature.properties.brunnel,feature.properties.catalogueRailway,feature.properties.width,feature.geometry.coordinates,
  ]),railwayData.paths.map(path=>[
    'rack-railway:'+path.id,path.structure==='surface'?undefined:path.structure,'rack-railway',path.width,path.points,
  ]));
});

test('invalid and oversized railway assets keep general transport geometry',async()=>{
  const [first]=railwayData.paths;
  const invalidResponses=[
    Response.json({...railwayData,paths:[first,{...first,structure:'tunnel'}]}),
    Response.json({...railwayData,paths:[{...first,points:[[2.184,41.406],[2.185,41.406,1010]]}]}),
    Response.json({...railwayData,replace:[123]}),
    Response.json({...railwayData,paths:[{...first,points:[[3,42,1000],[3.1,42,1010]]}]}),
    new Response(new Uint8Array(256*1024+1)),
  ];
  for(const response of invalidResponses){
    const load=createLandmarkLoader(catalogue,url=>url===catalogue?collection(railwayEntry):response);
    const {models,warnings}=await load(crop);
    assert.deepEqual(models,[]);
    assert.match(warnings[0],/Es conserva la geometria/);
    const data={features:[transport(123)],singularModels:models};
    assert.strictEqual(applyCatalogueRailways(data),data);
  }
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
      tower({id:'bad-anchor',properties:{anchor:[2.17,41.4]}}),
      tower({id:'bad-railway',properties:{kind:'railway',railway:{data:'../route.json'}}}));
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
