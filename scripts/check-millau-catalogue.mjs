import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {scaledBBox,selectionPose} from '../src/selection.js';
import {buildRequest} from '../src/build-request.js';
import {buildModel} from '../src/geometry.js';
import {auditPart} from '../src/solid-audit.js';
import {threeMF} from '../src/export.js';

// Optional local catalogue for checks before pushing a model.
const args=process.argv.slice(2),local=args.find(arg=>arg.startsWith('file:'));
const catalogue=local&&new URL(local);
const nativeFetch=globalThis.fetch;
globalThis.fetch=async (url,options)=>{
  const target=String(url);
  if(catalogue&&target.startsWith('https://raw.githubusercontent.com/aaronFortuno/open-place-models/main/'))
    return new Response(await readFile(new URL(target.split('/main/')[1],catalogue)));
  if(target.startsWith('./data/'))return new Response(await readFile(new URL('../public/'+target.slice(2),import.meta.url)));
  return nativeFetch(url,options);
};
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const api=await Module();api.setup();
const decodeElevation=async(blob,tile)=>decodeDEMTile(await blob.arrayBuffer(),tile,decode);
const center=[44.07991,3.02244],scope=args.find(arg=>arg!==local&&!arg.startsWith('--'));
const full=args.includes('--totes-les-capes');
const cases=[
  {name:'complet',width:250,height:250,scale:10000,rotation:26},
  {name:'girat',width:180,height:180,scale:18000,rotation:34},
  {name:'parcial',width:130,height:130,scale:8500,rotation:-28}
].filter(test=>!scope||test.name===scope);
assert(cases.length,'Retall desconegut.');
const out='output/millau-catalogue';
await mkdir(out,{recursive:true});
for(const test of cases){
  const {name,width,height,scale,rotation}=test,pose=selectionPose(scaledBBox(center,width,height,scale),rotation);
  const region=await loadRegion({sample:false,bbox:pose.bbox,buildingSource:'osm',decodeElevation});
  // Lightweight control with real terrain, water and the motorway network.
  if(!full){
    region.features=region.features.filter(f=>f.properties.sourceLayer==='water'||
      f.properties.sourceLayer==='transportation'&&f.properties.class==='motorway');
    region.bridgeFeatures=region.bridgeFeatures.filter(f=>f.properties.class==='motorway');
  }
  const request=structuredClone(buildRequest(region,{size:Math.max(width,height),widthMM:width,heightMM:height,
    selectionPose:pose,resolution:full?36:12,exaggeration:full?1.5:1,buildingMode:full?'source':'none',
    trees:full,majorRoads:full,smoothProfiles:full,estimatedTunnels:full,...(full?{surfaceRoads:'regional'}:{})}));
  const model=buildModel(request.region,request.options,undefined,api);
  const infrastructure=model.provenance.infrastructure;
  const bridge=model.context.bridges.find(b=>b.catalogue?.id==='millau-viaduct');
  assert(bridge,'El model del catàleg no ha arribat al motor.');
  const stats=infrastructure.completion.details.find(d=>d.id===bridge.id);
  const source=infrastructure.catalogueBridges.find(b=>b.id===bridge.id);
  const joins=bridge.approaches.plans.map(p=>p.sections);
  const audit=model.parts.map(auditPart).map(({id,errors})=>({id,errors}));
  const duplicates=model.context.bridges.filter(b=>b!==bridge&&b.sourceFeatureIds?.some(id=>bridge.sourceFeatureIds.includes(String(id)))).length;
  const report={...test,full,terrain:region.meta.terrain.provider,source,piers:stats?.piers.map(p=>p.sourceStationMetres),
    joins:joins.length,unconnected:bridge.approaches.missed,duplicates,connectedComponents:stats?.connectedComponents,
    unsupported:stats?.maxUnsupportedSpanMM,warnings:model.warnings.filter(s=>/millau|viaduc|trams elevats/i.test(s)),audit};
  console.log(JSON.stringify(report));
  const basename=`${out}/millau-${name}${full?'-totes-les-capes':''}`;
  await writeFile(basename+'.json',JSON.stringify(report,null,2)+'\n');
  assert(source.upperGeometryIncluded);
  assert.equal(source.staysIncluded,scale<=10000);
  assert.equal(duplicates,0);
  assert.equal(stats?.piers.length,name==='parcial'?3:7);
  assert.equal(joins.length,name==='parcial'?0:2);
  if(name==='parcial')assert(bridge.approaches.missed.every(end=>end.clippedByCrop));
  assert.equal(stats.connectedComponents,1);
  assert(audit.every(part=>!part.errors.length));
  await writeFile(`${basename}-1-${scale}.3mf`,threeMF(model,{bambu:true}));
}
