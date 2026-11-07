import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import decode,{init} from '@jsquash/webp/decode.js';
import {strFromU8,unzipSync} from 'fflate';
import Module from 'manifold-3d';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {scaledBBox,selectionPose,tilePlan} from '../src/selection.js';
import {buildRequest} from '../src/build-request.js';
import {buildModel,makeProjection,updatePureRelief} from '../src/geometry.js';
import {auditPart} from '../src/solid-audit.js';
import {coordinateTransform} from '../src/local-raster.js';
import {withTerrainTiles} from '../src/catalogue-terrain.js';
import {splitModel} from '../src/mesh-tiles.js';
import {threeMF,bambuPlateProject} from '../src/export.js';

const args=process.argv.slice(2),local=args.find(arg=>arg.startsWith('file:')),export3MF=args.includes('--3mf');
const generalTerrain=args.includes('--relleu-general');
const catalogue=local&&new URL(local),nativeFetch=globalThis.fetch;
const tileRequests=[];
if(catalogue)globalThis.fetch=async (url,options)=>{
  const prefix='https://raw.githubusercontent.com/aaronFortuno/open-place-models/main/',target=String(url);
  if(target.startsWith(prefix)){
    const path=target.slice(prefix.length);
    if(path.endsWith('.tif'))tileRequests.push(path);
    return new Response(await readFile(new URL(path,catalogue)));
  }
  return nativeFetch(url,options);
};
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const api=await Module();api.setup();
const decodeElevation=async(blob,tile)=>decodeDEMTile(await blob.arrayBuffer(),tile,decode);
const center=[41.61224924,1.78678352],out='output/foradada';
const {forward:utmToWorld}=coordinateTransform(25831),seam=398945,north=4607438;
const seamCenter=utmToWorld([seam,north]).reverse();
const cases=[{name:'complet',size:100,scale:2000,rotation:35,resolution:56,pureRelief:false},
  {name:'complet-obert',size:100,scale:10000,rotation:-17,resolution:36,pureRelief:false},
  {name:'relleu',size:100,scale:10000,rotation:-29,resolution:240,pureRelief:true},
  {name:'montserrat',size:100,scale:2000,rotation:24,resolution:36,pureRelief:false,center:seamCenter},
  {name:'montserrat-relleu',size:100,scale:10000,rotation:-19,resolution:240,pureRelief:true,center:seamCenter}];

// Inspect the coordinates actually sent to the slicer, including 3MF rounding.
function* exportedParts(bytes){
  const xml=strFromU8(unzipSync(bytes)['3D/3dmodel.model']);
  for(const [,name,body] of xml.matchAll(/<object id="\d+" name="([^"]+)"[^>]*><mesh>(.*?)<\/mesh><\/object>/gs)){
    const vertices=[],faces=[];
    for(const [,x,y,z] of body.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g))vertices.push(+x,+y,+z);
    for(const [,a,b,c] of body.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"\/>/g))faces.push(+a,+b,+c);
    yield {id:name,vertices:Float32Array.from(vertices),faces:Uint32Array.from(faces)};
  }
}

function checkPassage(parts,source,model,project,offset=[0,0]){
  const {originMeters,minimumSurfaceMM}=model.provenance.verticalReference;
  const zScale=model.provenance.verticalExaggeration*1000/model.scale;
  const [lon,lat]=source.anchor,k=111320*Math.cos(lat*Math.PI/180),a=74*Math.PI/180;
  const at=(s,elevation,lateral=0)=>{
    const [x,y]=project([lon+(16+s*Math.sin(a)+lateral*Math.cos(a))/k,lat-(3-s*Math.cos(a)+lateral*Math.sin(a))/111320]);
    return [x-offset[0],y-offset[1],minimumSurfaceMM+(elevation-originMeters)*zScale];
  };
  // Start and finish beyond the cutter. In r1 the east cap blocked every
  // through ray even though an axial segment inside the cavity was clear.
  const samples=[896,897,898,899].flatMap(elevation=>[-1,0,1].map(lateral=>[elevation,lateral]));
  let apertureHits=0,roofHits=0,portalHits=0;
  for(const part of parts){
    const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});mesh.merge();
    const solid=new api.Manifold(mesh);
    try{
      assert.equal(solid.status(),'NoError',part.id);
      for(const [z,lateral] of samples)apertureHits+=solid.rayCast(at(-14,z,lateral),at(32,z,lateral)).length;
      for(const end of [-14,32])portalHits+=solid.rayCast(at(end,896),at(end,960)).length;
      roofHits+=solid.rayCast(at(7,898),at(7,960)).length;
    }finally{solid.delete();}
  }
  return {rays:samples.length,apertureHits,portalHits,roofHits};
}

function checkSeam(region,model,project){
  const overview=region.singularModels.find(m=>m.id==='montserrat');
  assert(overview,'El catàleg ha de carregar els sectors de Montserrat.');
  const [west,east]=overview.tiles;
  assert.deepEqual(overview.tiles.map(t=>t.id),['foradada-nord','agulles-nord']);
  if(catalogue)assert.equal(new Set(tileRequests).size,2);
  assert.equal(west.bounds[2],east.bounds[0]);
  const {height:rows,width:cols,values}=west.raster;
  let maxSourceDifferenceM=0,maxSeamSampleDifferenceM=0,maxGroundDifferenceMM=null;
  const sample=withTerrainTiles(()=>0,[overview]);
  for(let row=0;row<rows;row++)maxSourceDifferenceM=Math.max(maxSourceDifferenceM,
    Math.abs(values[row*cols+cols-1]-east.raster.values[row*east.raster.width]));
  for(let delta=-40;delta<=40;delta+=2){
    const left=utmToWorld([seam-.001,north+delta]),right=utmToWorld([seam+.001,north+delta]);
    maxSeamSampleDifferenceM=Math.max(maxSeamSampleDifferenceM,Math.abs(sample(...left)-sample(...right)));
    if(model.context?.ground)maxGroundDifferenceMM=Math.max(maxGroundDifferenceMM,
      Math.abs(model.context.ground(...project(left))-model.context.ground(...project(right))));
  }
  assert.equal(maxSourceDifferenceM,0);
  assert(maxSeamSampleDifferenceM<.05,'Discontinuïtat en les cotes dels sectors.');
  if(maxGroundDifferenceMM!==null)assert(maxGroundDifferenceMM<.05,'Discontinuïtat en la malla del retall.');
  return {tiles:overview.tiles.map(({id,byteLength})=>({id,byteLength})),rows,maxSourceDifferenceM,maxSeamSampleDifferenceM,maxGroundDifferenceMM};
}

await mkdir(out,{recursive:true});
for(const test of cases.filter(({name})=>!args.some(arg=>cases.some(entry=>entry.name===arg))||args.includes(name))){
  const {name,size,scale,rotation,resolution,pureRelief}=test,width=size,height=size,pose=selectionPose(scaledBBox(test.center??center,width,height,scale),rotation);
  const detailSectors=name.startsWith('montserrat')&&!generalTerrain;
  tileRequests.length=0;
  const region=await loadRegion({sample:false,bbox:pose.bbox,selectionCorners:pose.corners,
    ...(detailSectors?{detailSectors}:{}),pureRelief,buildingSource:'osm',decodeElevation});
  if(!detailSectors){
    assert.equal(tileRequests.length,0,'La càrrega normal ha d’ometre els GeoTIFF del pilot.');
    assert.equal(region.meta.detailTerrain,undefined);
  }
  const terrainControl=name==='complet-obert';
  // Keep the wider Full Model control focused on the resolution gate. The
  // close Full Model control exercises the same cavity with all layers active.
  if(terrainControl){region.features=[];region.bridgeFeatures=[];}
  const source=region.singularModels.find(model=>model.id==='roca-foradada');
  assert(source,'El catàleg ha de carregar el relleu singular.');
  const allLayers=name==='complet';
  const request=structuredClone(buildRequest(region,{size:width,widthMM:width,heightMM:height,selectionPose:pose,resolution,
    pureRelief,exaggeration:1,trees:allLayers,buildingMode:'source',majorRoads:allLayers,surfaceRoads:allLayers?'regional':undefined}));
  const started=performance.now();
  const model=buildModel(request.region,request.options,undefined,api);
  const modelBuildMS=performance.now()-started,processPeakRSSBytes=process.resourceUsage().maxRSS*1024;
  const previewTriangles=model.categories.reduce((sum,part)=>sum+part.faces.length/3,0);
  const previewBytes=model.categories.reduce((sum,part)=>sum+part.vertices.byteLength+part.faces.byteLength,0);
  const {project}=makeProjection(region.meta.bbox,width,request.options);
  const audit=model.parts.map(auditPart).map(({id,errors,triangles})=>({id,errors,triangles}));
  const bytes=export3MF?threeMF(model,{bambu:true}):null,basename=`${out}/roca-foradada-r2-${name}${generalTerrain?'-relleu-general':''}`;
  const report={...test,terrainControl,detailSectors,modelBuildMS,processPeakRSSBytes,previewTriangles,previewBytes,
    terrain:region.meta.terrain.provider,source:model.provenance.catalogueLandforms,
    omissions:model.provenance.catalogueLandformOmissions,warnings:model.warnings.filter(w=>w.includes('Foradada')),audit,...checkPassage(bytes?exportedParts(bytes):model.parts,source,model,project)};
  if(detailSectors)report.seam=checkSeam(region,model,project);
  console.log(JSON.stringify(report));
  assert(report.source?.some(entry=>entry.id===source.id&&entry.revision==='r2'));
  assert(audit.every(part=>!part.errors.length));
  assert.equal(report.apertureHits,0,'La cavitat ha de travessar la roca.');
  assert.equal(report.portalHits,0,'Els dos extrems de la prova han de començar a l’aire lliure.');
  assert(report.roofHits>0,'La cavitat ha de conservar la volta.');
  if(bytes)await writeFile(`${basename}-1-${scale}.3mf`,bytes);
  if(pureRelief&&!name.startsWith('montserrat')){
    const updated=updatePureRelief(model,{exaggeration:1.25,baseThickness:6});
    report.updated=checkPassage(updated.parts,source,updated,project);
    assert.equal(report.updated.apertureHits,0);
    assert(report.updated.roofHits>0);
    const pieces=splitModel(model,api,tilePlan(width,height,{columns:[50,50]}));
    report.pieces=pieces.map(piece=>checkPassage(piece.parts,source,piece,project,[piece.tile.x0,piece.tile.y0]));
    assert(report.pieces.every(piece=>piece.apertureHits===0));
    assert(pieces.every(piece=>piece.parts.every(part=>!auditPart(part).errors.length)));
    if(export3MF)await writeFile(`${basename}-dues-peces.3mf`,bambuPlateProject(model,pieces));
  }
  await writeFile(`${basename}.json`,JSON.stringify(report,null,2)+'\n');
}
