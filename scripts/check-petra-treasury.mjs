import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import Module from 'manifold-3d';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {createLandmarkLoader} from '../src/landmarks.js';
import {buildModel,makeProjection} from '../src/geometry.js';
import {scaledBBox,selectionPose} from '../src/selection.js';
import {buildRequest} from '../src/build-request.js';
import {auditPart} from '../src/solid-audit.js';

const [capture,catalogue,variant='detail']=process.argv.slice(2);
assert(capture&&catalogue,'Passa la captura local de terreny i vectors i l’arrel del catàleg.');
const cases={
  detail:{scale:500,widthMM:170,heightMM:160,rotation:0,resolution:32},
  relief:{scale:1000,widthMM:130,heightMM:110,rotation:27,resolution:36,buildingMode:'none'},
  crop:{scale:1000,widthMM:78,heightMM:90,rotation:-25,resolution:35,offset:35}
};
assert(Object.hasOwn(cases,variant));
const {scale,widthMM,heightMM,rotation,resolution,buildingMode='source',offset=0}=cases[variant];
const loadJSON=async file=>JSON.parse(await readFile(join(capture,file),'utf8'));
const id='petra-treasury';
const index=JSON.parse(await readFile(join(catalogue,'catalog.geojson'),'utf8'));
const {properties:{anchor:[lon,lat]}}=index.features.find(feature=>feature.id===id);
const k=111320*Math.cos(lat*Math.PI/180),radians=65*Math.PI/180;
const east=Math.sin(radians),north=Math.cos(radians);
const map=(across,forward)=>[lon+(-north*across+east*forward)/k,lat+(east*across+north*forward)/111320];
const center=map(offset,0).reverse();
const pose=selectionPose(scaledBBox(center,widthMM,heightMM,scale),rotation);
const load=createLandmarkLoader('https://catalogue.example/catalog.geojson',async url=>
  new Response(await readFile(resolve(catalogue,new URL(url).pathname.slice(1)))));
const {models,warnings}=await load(pose.bbox);
assert.deepEqual(warnings,[]);
const source=models.find(model=>model.id===id);
assert(source);
const dem=await Promise.all((await loadJSON('terrain-tiles.json')).map(async tile=>
  decodeDEMTile(await readFile(join(capture,`${tile.z}-${tile.x}-${tile.y}.png`)),tile)));
const features=await loadJSON('vector.json');
const region={meta:{bbox:pose.bbox,buildingSource:'openfreemap',terrain:{provider:'Mapzen Terrain Tiles · AWS'}},
  dem,features,singularModels:[source]};
const options={size:widthMM,widthMM,heightMM,targetScale:scale,selectionPose:pose,resolution,buildingMode,
  trees:false,majorRoads:false,estimatedTunnels:false,exaggeration:1,baseThickness:5};
const request=buildRequest(region,options),api=await Module();
api.setup();
const model=buildModel(request.region,request.options,undefined,api);
const applied=model.provenance.catalogueLandforms?.find(entry=>entry.id===id);
assert(applied,JSON.stringify(model.provenance.catalogueLandformOmissions));
const {project}=makeProjection(region.meta.bbox,widthMM,options);
const {originMeters,minimumSurfaceMM}=model.provenance.verticalReference;
const at=(across,height,forward)=>[...project(map(across,forward)),minimumSurfaceMM+(1011+height-originMeters)*1000/model.scale];
const rays={
  doorway:[at(0,5,12),at(0,5,-7.8)],
  back:[at(0,5,-7.8),at(0,5,-11)],
  column:[at(2.9,6,12),at(2.9,6,-2)],
  urn:[at(0,38.9,12),at(0,38.9,-4)],
  cliff:[at(0,40,0),at(0,46,0)],
  floor:[at(0,3,10),at(0,-2,10)]
};
const hits=Object.fromEntries(Object.keys(rays).map(key=>[key,0]));
for(const part of model.parts.filter(part=>part.faces.length)){
  assert.deepEqual(auditPart(part).errors,[],part.id);
  const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});
  mesh.merge();
  const solid=new api.Manifold(mesh);
  try{
    assert.equal(solid.status(),'NoError',part.id);
    for(const [key,ray] of Object.entries(rays))hits[key]+=solid.rayCast(...ray).length;
  }finally{solid.delete();}
}
assert.equal(hits.doorway,0,JSON.stringify(hits));
for(const key of ['back','column','urn','cliff','floor'])assert(hits[key]>0,JSON.stringify(hits));
if(variant==='detail'){
  const baseline=buildModel({...request.region,singularModels:[]},request.options,undefined,api);
  assert(baseline.buildingCount>1,'The source contains both the mapped Treasury and nearby buildings');
  assert.equal(model.buildingCount,baseline.buildingCount-1,'Remove only the matching mapped Treasury polygon');
}
if(variant==='crop'){
  const outside=at(-11,6,0);
  assert(outside[0]<0||outside[1]<0||outside[0]>widthMM||outside[1]>heightMM,'The crop crosses the monument');
}
console.log(JSON.stringify({variant,scale:model.scale,rotation,triangles:model.triangles,
  buildings:model.buildingCount,removedMM3:Math.round(applied.removedMM3),hits}));
