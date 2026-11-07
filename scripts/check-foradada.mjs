import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {scaledBBox,selectionPose,tilePlan} from '../src/selection.js';
import {buildRequest} from '../src/build-request.js';
import {buildModel,makeProjection,updatePureRelief} from '../src/geometry.js';
import {auditPart} from '../src/solid-audit.js';
import {splitModel} from '../src/mesh-tiles.js';
import {threeMF,bambuPlateProject} from '../src/export.js';

const args=process.argv.slice(2),local=args.find(arg=>arg.startsWith('file:'));
const catalogue=local&&new URL(local),nativeFetch=globalThis.fetch;
if(catalogue)globalThis.fetch=async (url,options)=>{
  const prefix='https://raw.githubusercontent.com/aaronFortuno/open-place-models/main/',target=String(url);
  if(target.startsWith(prefix))return new Response(await readFile(new URL(target.slice(prefix.length),catalogue)));
  return nativeFetch(url,options);
};
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const api=await Module();api.setup();
const decodeElevation=async(blob,tile)=>decodeDEMTile(await blob.arrayBuffer(),tile,decode);
const width=100,height=100,center=[41.61224924,1.78678352],out='output/foradada';
const cases=[{name:'complet',scale:2000,rotation:35,resolution:56,pureRelief:false},
  {name:'relleu',scale:10000,rotation:-29,resolution:240,pureRelief:true}];

function countHits(parts,start,end){
  let hits=0;
  for(const part of parts){
    const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});mesh.merge();
    const solid=new api.Manifold(mesh);
    try{
      assert.equal(solid.status(),'NoError',part.id);
      hits+=solid.rayCast(start,end).length;
    }finally{solid.delete();}
  }
  return hits;
}

function checkPassage(parts,source,model,project,offset=[0,0]){
  const {originMeters,minimumSurfaceMM}=model.provenance.verticalReference;
  const zScale=model.provenance.verticalExaggeration*1000/model.scale;
  const [lon,lat]=source.anchor,k=111320*Math.cos(lat*Math.PI/180),a=74*Math.PI/180;
  const at=(s,elevation)=>{
    const [x,y]=project([lon+(16+s*Math.sin(a))/k,lat-(3-s*Math.cos(a))/111320]);
    return [x-offset[0],y-offset[1],minimumSurfaceMM+(elevation-originMeters)*zScale];
  };
  const apertureHits=countHits(parts,at(-7,897),at(20,897));
  const roofHits=countHits(parts,at(-7,907),at(20,907));
  return {apertureHits,roofHits};
}

await mkdir(out,{recursive:true});
for(const test of cases.filter(({name})=>!args.some(arg=>cases.some(entry=>entry.name===arg))||args.includes(name))){
  const {name,scale,rotation,resolution,pureRelief}=test,pose=selectionPose(scaledBBox(center,width,height,scale),rotation);
  const region=await loadRegion({sample:false,bbox:pose.bbox,pureRelief,buildingSource:'osm',decodeElevation});
  const source=region.singularModels.find(model=>model.id==='roca-foradada');
  assert(source,'El catàleg ha de carregar el relleu singular.');
  const request=structuredClone(buildRequest(region,{size:width,widthMM:width,heightMM:height,selectionPose:pose,resolution,
    pureRelief,exaggeration:1,trees:true,buildingMode:'source',majorRoads:true,surfaceRoads:'regional'}));
  const model=buildModel(request.region,request.options,undefined,api);
  const {project}=makeProjection(region.meta.bbox,width,request.options);
  const audit=model.parts.map(auditPart).map(({id,errors,triangles})=>({id,errors,triangles}));
  const report={...test,terrain:region.meta.terrain.provider,source:model.provenance.catalogueLandforms,
    omissions:model.provenance.catalogueLandformOmissions,warnings:model.warnings.filter(w=>w.includes('Foradada')),audit,...checkPassage(model.parts,source,model,project)};
  console.log(JSON.stringify(report));
  assert(report.source.some(entry=>entry.id===source.id));
  assert(audit.every(part=>!part.errors.length));
  assert.equal(report.apertureHits,0,'La cavitat ha de travessar la roca.');
  assert(report.roofHits>0,'La cavitat ha de conservar la volta.');
  await writeFile(`${out}/roca-foradada-${name}-1-${scale}.3mf`,threeMF(model,{bambu:true}));
  if(pureRelief){
    const updated=updatePureRelief(model,{exaggeration:1.25,baseThickness:6});
    report.updated=checkPassage(updated.parts,source,updated,project);
    assert.equal(report.updated.apertureHits,0);
    assert(report.updated.roofHits>0);
    const pieces=splitModel(model,api,tilePlan(width,height,{columns:[50,50]}));
    report.pieces=pieces.map(piece=>checkPassage(piece.parts,source,piece,project,[piece.tile.x0,piece.tile.y0]));
    assert(report.pieces.every(piece=>piece.apertureHits===0));
    assert(pieces.every(piece=>piece.parts.every(part=>!auditPart(part).errors.length)));
    await writeFile(`${out}/roca-foradada-${name}-dues-peces.3mf`,bambuPlateProject(model,pieces));
  }
  await writeFile(`${out}/roca-foradada-${name}.json`,JSON.stringify(report,null,2)+'\n');
}
