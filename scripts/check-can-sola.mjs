import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {buildModel,makeProjection} from '../src/geometry.js';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {scaledBBox,selectionPose} from '../src/selection.js';
import {buildRequest} from '../src/build-request.js';
import {auditPart} from '../src/solid-audit.js';

const args=process.argv.slice(2),catalogue=args.find(arg=>arg.startsWith('file:'));
const variant=args.find(arg=>arg!==catalogue)??'original';
const prefix='https://raw.githubusercontent.com/aaronFortuno/open-place-models/main/';
const fetchRemote=globalThis.fetch;
if(catalogue?.startsWith('file:'))globalThis.fetch=async(url,options)=>{
  const path=String(url);
  return path.startsWith(prefix)?new Response(await readFile(new URL(path.slice(prefix.length),catalogue))):fetchRemote(url,options);
};

const cases={
  original:{center:[41.5984767879759,1.750810427599323],scale:4047.251598728501,widthMM:200,heightMM:150,rotation:0,resolution:64,pureRelief:false},
  girat:{center:[41.599378,1.748989],scale:2000,widthMM:150,heightMM:150,rotation:34,resolution:36,pureRelief:false},
  relleu:{center:[41.599378,1.748989],scale:10000,widthMM:100,heightMM:100,rotation:-26,resolution:240,pureRelief:true}
};
assert(Object.hasOwn(cases,variant),'Tria original, girat o relleu.');
const {center,scale,widthMM,heightMM,rotation,resolution,pureRelief}=cases[variant];
const pose=selectionPose(scaledBBox(center,widthMM,heightMM,scale),rotation);
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const decodeElevation=async(blob,tile)=>decodeDEMTile(await blob.arrayBuffer(),tile,decode);
const region=await loadRegion({sample:false,bbox:pose.bbox,pureRelief,buildingSource:'icgc',decodeElevation});
const source=region.singularModels.find(model=>model.id==='balma-de-can-sola');
assert(source,'El catàleg ha de carregar la Balma de Can Solà.');
const options={size:widthMM,widthMM,heightMM,selectionPose:pose,resolution,pureRelief,
  trees:!pureRelief,density:2.5,buildingMode:'source',exaggeration:1,baseThickness:5,
  estimatedTunnels:!pureRelief,majorRoads:!pureRelief,smoothProfiles:true,surfaceRoads:pureRelief?undefined:'regional'};
const request=buildRequest(region,options),api=await Module();
api.setup();
const model=buildModel(request.region,request.options,undefined,api);
assert(model.provenance.catalogueLandforms?.some(entry=>entry.id===source.id),JSON.stringify(model.provenance.catalogueLandformOmissions));
const {project}=makeProjection(region.meta.bbox,widthMM,options);
const {originMeters,minimumSurfaceMM}=model.provenance.verticalReference,zScale=1000/model.scale;
const [lon,lat]=source.anchor,k=111320*Math.cos(lat*Math.PI/180);
const at=(east,south,z)=>[...project([lon+east/k,lat-south/111320]),minimumSurfaceMM+(z-originMeters)*zScale];
const rows=[
  {south:-8,front:-3.6,floor:567.8,depth:34},
  {south:1,front:-7.6,floor:566.5,depth:33},
  {south:11,front:-9,floor:565.5,depth:33}
].map(({south,front,floor,depth})=>{
  const east=front-.45*depth,z=floor+6.75,inside=at(east,south,z);
  return {south,rays:{
    mouth:[at(front+15,south,z),inside],
    back:[inside,at(front-depth-4,south,z)],
    roof:[inside,at(east,south,z+40)],
    floor:[inside,at(east,south,floor-8)]
  },hits:{mouth:0,back:0,roof:0,floor:0}};
});
for(const part of model.parts.filter(part=>part.faces.length)){
  assert.deepEqual(auditPart(part).errors,[],part.id);
  if(part.id==='trees')continue;
  const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});
  mesh.merge();
  const solid=new api.Manifold(mesh);
  try{
    assert.equal(solid.status(),'NoError',part.id);
    for(const {rays,hits} of rows)for(const key of Object.keys(hits))hits[key]+=solid.rayCast(...rays[key]).length;
  }finally{solid.delete();}
}
const checks=rows.map(({south,hits})=>({south,...hits}));
console.log(JSON.stringify({variant,scale:model.scale,rotation,terrain:region.meta.terrain.provider,
  revision:source.revision,triangles:model.triangles,checks}));
for(const {mouth,back,roof,floor,south} of checks){
  assert.equal(mouth,0,`La boca ha de ser oberta a ${south} m.`);
  assert(back>0&&roof>0&&floor>0,`Cal conservar la paret del fons, la coberta i el terra a ${south} m.`);
}
