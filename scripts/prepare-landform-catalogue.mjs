import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {serialize,deserialize} from 'node:v8';
import Module from 'manifold-3d';
import decodeWebp,{init} from '@jsquash/webp/decode.js';
import encodeWebp,{init as initEncoder} from '@jsquash/webp/encode.js';
import {encode} from 'fast-png';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {buildModel} from '../src/geometry.js';
import {scaledBBox,selectionPose,isPanoramicSize,tilePlan,PANORAMIC_SCALE_RANGE,PURE_SCALE_RANGE} from '../src/selection.js';
import {PURE_RELIEF_RESOLUTIONS,splitPureRelief} from '../src/pure-relief-mesh.js';
import {groupReliefMaterials} from '../src/materials.js';
import {bambuPlateProject,threeMF} from '../src/export.js';
import {auditModel} from '../src/solid-audit.js';
import {CURATED_EXAMPLES} from '../src/curated-examples.js';
import {catalogueThumbnail} from './render-catalogue-thumbnail.mjs';

const cases={
  gibraltar:{name:'Estret de Gibraltar',center:[35.9985,-5.466],size:[250,250],scale:150000,coastal:true},
  'o-vao':{name:'Istme d’O Vao · A Lanzada',center:[42.4502,-8.8684],size:[250,200],scale:25000,coastal:true},
  tremp:{name:'Conca de Tremp i Montsec',center:[42.147,.925],size:[240,240],scale:100000},
  zumaia:{name:'Penya-segats de Zumaia',center:[43.2987,-2.267],size:[200,150],scale:10000,rotation:-25,coastal:true},
  pirineus:{name:'Pirineus · del Cantàbric a la Mediterrània',center:[42.8,.75],size:[1000,200],scale:450000,rotation:15,coastal:true},
  'ebre-meandres':{name:'Meandres de l’Ebre · Riba-roja i Flix',center:[41.244,.525],size:[240,160],scale:40000,river:true}
};
const [id,stage='model']=process.argv.slice(2);
const example=CURATED_EXAMPLES.find(example=>example.id===id);
const published=stage==='miniatura'||stage==='fonts'&&!Object.hasOwn(cases,id);
assert(published?example:Object.hasOwn(cases,id)&&['fonts','model'].includes(stage),
  'Ús: prepare-landform-catalogue.mjs <id> [fonts|model|miniatura]');
const chosen=published?{...cases[id],...example,name:example.title,size:[example.width,example.height]}:cases[id];
const {name,center,size:[widthMM,heightMM],scale,rotation=0,coastal,river,pureRelief=true}=chosen;
const panoramic=isPanoramicSize(widthMM,heightMM);
const range=panoramic?PANORAMIC_SCALE_RANGE:pureRelief?PURE_SCALE_RANGE:[100,20000];
const pose=selectionPose(scaledBBox(center,widthMM,heightMM,scale,range),rotation);
const directory=new URL('../output/cataleg-relleu/',import.meta.url);
await mkdir(directory,{recursive:true});
const cache=new URL(`${id}.v8`,directory);
let data;
try{
  const cached=deserialize(await readFile(cache));
  const matchingSource=!chosen.buildingSource||chosen.buildingSource===cached.meta.buildingSource;
  if(matchingSource&&pureRelief===!!cached.meta.pureRelief&&pose.bbox.every((value,index)=>value===cached.meta.bbox[index]))data=cached;
}
catch(error){
  if(error.code!=='ENOENT')throw error;
}
if(!data){
  const networkFetch=globalThis.fetch;
  globalThis.fetch=(url,options)=>{
    if(!String(url).startsWith('./'))return networkFetch(url,options);
    return readFile(new URL('../public/'+String(url).slice(2),import.meta.url)).then(bytes=>new Response(bytes),error=>{
      if(error.code!=='ENOENT')throw error;
      return new Response(null,{status:404});
    });
  };
  await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
  data=await loadRegion({sample:false,bbox:pose.bbox,pureRelief,panoramic,buildingSource:chosen.buildingSource,
    decodeElevation:async(blob,tile)=>decodeDEMTile(await blob.arrayBuffer(),tile,decodeWebp)},message=>console.log(id,message));
  await writeFile(cache,serialize(data));
}
console.log(id,'fonts',data.meta.terrain?.provider,'mar',data.oceans?.length,'aigua fluvial',data.waterAreas?.length);
if(stage==='fonts')process.exit(0);

const options={pureRelief,selectionPose:pose,targetScale:scale,widthMM,heightMM,size:Math.max(widthMM,heightMM),
  resolution:panoramic?240:192,exaggeration:1.5,baseThickness:5,streams:true,streamWidth:1,trees:false};
const resolutions=pureRelief?PURE_RELIEF_RESOLUTIONS:{24:36,36:64,56:96};
if(published)Object.assign(options,{resolution:resolutions[example.detail??36],
  exaggeration:example.exaggeration??1.5,streamWidth:example.streamWidth??1,trees:example.trees??true,
  vegetationHeight:.8,vegetationNoise:45});
const started=performance.now();
// Keep the original two-material panoramic specimen reproducible.
if(!published&&panoramic)options.streamWidth=0;
const region=!published&&panoramic?{...data,forests:[]}:data;
const api=pureRelief?null:await Module();
if(api){
  api.setup();
  Object.assign(options,{surfaceRoads:'regional',roadRise:0,railRise:0,trailWidth:1,estimatedTunnels:true,
    majorRoads:true,smoothProfiles:true,buildingMode:'limited',maxBuildingHeight:5});
}
const model=buildModel({...region,meta:{...region.meta,name}},options,message=>console.log(id,message),api);
const plan=tilePlan(widthMM,heightMM),split=plan.tiles.length>1;
if(stage==='miniatura'){
  const requireWebp=createRequire(import.meta.resolve('@jsquash/webp/encode.js'));
  const encoder=await requireWebp('wasm-feature-detect').simd()?'webp_enc_simd.wasm':'webp_enc.wasm';
  await initEncoder(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/enc/'+encoder,import.meta.url))));
  const thumbnail=catalogueThumbnail(model,plan,example.materialCount);
  const bytes=await encodeWebp(thumbnail,{quality:88});
  const filename=example.image.split('/').at(-1);
  await writeFile(new URL('../public/examples/'+filename,import.meta.url),new Uint8Array(bytes));
  console.log(id,filename,bytes.byteLength);
  process.exit(0);
}
const rawPieces=split?splitPureRelief(model,plan,message=>console.log(id,message)):[model];
const pieces=rawPieces.map(piece=>groupReliefMaterials(piece,2));
const audits=pieces.map(piece=>auditModel(piece));
for(const [index,audit] of audits.entries()){
  const errors=audit.parts.flatMap(part=>part.errors.map(error=>`${part.name}: ${error}`));
  assert(audit.valid,`Peça ${index+1}: ${errors.join(', ')}`);
}
const sea=model.categories.find(part=>part.id==='water');
if(coastal){
  assert(sea?.faces.length,'Falta el mar a la maqueta costanera.');
  assert(sea.vertices.some((value,index)=>index%3===2&&value===0),'El mar no arriba al fons de la base.');
}
if(panoramic&&coastal){
  const {oceanWeights,resolution}=model.reliefGrid;
  const quarter=resolution/4;
  assert(oceanWeights.some((weight,index)=>weight>0&&index%(resolution+1)<quarter),
    'Falta el mar a l’extrem occidental.');
  assert(oceanWeights.some((weight,index)=>weight>0&&index%(resolution+1)>resolution-quarter),
    'Falta el mar a l’extrem oriental.');
}
assert(!river||model.categories.some(p=>p.id==='inland-water'&&p.faces.length),'Falta l’aigua del riu.');
const summary={id,name,center,widthMM,heightMM,scale,rotation,exaggeration:options.exaggeration,terrain:data.meta.terrain,
  sourceWarnings:data.meta.sourceWarnings,verticalReference:model.provenance.verticalReference,sampling:model.provenance.reliefSampling,
  streams:model.provenance.streamCount,waterAreas:model.provenance.flowingWaterAreaCount,plates:pieces.length,
  triangles:audits.reduce((sum,a)=>sum+a.triangles,0),milliseconds:Math.round(performance.now()-started)};
const palette=split?groupReliefMaterials({provenance:model.provenance,parts:rawPieces.flatMap(piece=>piece.parts)},
  2,undefined,{paletteOnly:true}):null;
const bytes=split?bambuPlateProject(palette,pieces):threeMF(pieces[0],{bambu:true});
await writeFile(new URL(`${id}.3mf`,directory),bytes);
await writeFile(new URL(`${id}.json`,directory),JSON.stringify(summary,null,2)+'\n');
await writeFile(new URL(`${id}.png`,directory),preview(model.categories,widthMM,heightMM));
console.log(JSON.stringify(summary));

// Orthographic view of the same geometry used for export, for framing checks.
function preview(categories,widthMM,heightMM){
  const factor=640/Math.max(widthMM,heightMM),width=Math.ceil(widthMM*factor),height=Math.ceil(heightMM*factor);
  const zBuffer=new Float64Array(width*height).fill(-Infinity),pixels=new Uint8Array(width*height*3);
  for(const {id,vertices,faces} of categories){
    const water=id==='water'||id==='inland-water',color=water?[101,165,181]:[207,184,141];
    for(let i=0;i<faces.length;i+=3){
      const [a,b,c]=Array.from(faces.subarray(i,i+3),index=>vertices.subarray(index*3,index*3+3));
      const ux=(b[0]-a[0])*factor,uy=(b[1]-a[1])*factor,vx=(c[0]-a[0])*factor,vy=(c[1]-a[1])*factor;
      const det=ux*vy-uy*vx;
      if(det<1e-9)continue;
      const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0])*factor)),x1=Math.min(width-1,Math.floor(Math.max(a[0],b[0],c[0])*factor));
      const y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1])*factor)),y1=Math.min(height-1,Math.floor(Math.max(a[1],b[1],c[1])*factor));
      const dz=b[2]-a[2],ez=c[2]-a[2],nx=uy*ez-vy*dz,ny=vx*dz-ux*ez,nz=det/factor;
      const shade=water?1:.68+.38*Math.max(0,(-.4*nx+.45*ny+.8*nz)/Math.hypot(nx,ny,nz));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const u=x+.5-a[0]*factor,v=y+.5-a[1]*factor,s=(u*vy-v*vx)/det,t=(v*ux-u*uy)/det;
        if(s< -1e-6||t< -1e-6||s+t>1.000001)continue;
        const pixel=(height-1-y)*width+x,z=a[2]+s*dz+t*ez;
        if(z<zBuffer[pixel]-1e-7)continue;
        zBuffer[pixel]=z;
        for(let k=0;k<3;k++)pixels[3*pixel+k]=Math.round(color[k]*shade);
      }
    }
  }
  return encode({width,height,data:pixels,channels:3});
}
