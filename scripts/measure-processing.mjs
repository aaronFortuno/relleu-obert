import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {freemem} from 'node:os';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {buildModel} from '../src/geometry.js';
import {physicalBBox,scaledBBox,selectionPose} from '../src/selection.js';
import {CURATED_EXAMPLES} from '../src/curated-examples.js';
import {DEFAULT_BASE_THICKNESS_MM} from '../src/print-settings.js';
import {polygonTester} from '../src/polygon-index.js';
import {createProcessingTiming} from '../src/processing-timing.js';
import {auditPart} from '../src/solid-audit.js';
import {threeMF} from '../src/export.js';
import {tileArchive} from '../src/mesh-tiles.js';
import {PURE_RELIEF_RESOLUTIONS,splitPureRelief} from '../src/pure-relief-mesh.js';

const name=process.argv[2];
const galleryAmsterdam=name==='amsterdam'?CURATED_EXAMPLES.find(example=>example.id==='amsterdam-singelgracht'):null;
const variant=process.argv[3];
if(galleryAmsterdam&&variant&&!['--balanced','--centre'].includes(variant))throw Error('Amsterdam admet --balanced o --centre.');
const centreControl=galleryAmsterdam&&variant==='--centre',balanced=galleryAmsterdam&&variant==='--balanced';
const amsterdam=centreControl?{...galleryAmsterdam,width:100,height:100}:galleryAmsterdam;
const mountainCentres={'peguera':[42.14193,1.76436],'gallina':[42.1835,1.7435],'gallina-complet':[42.1835,1.7435],
  'peguera-gallina':[42.165671,1.751211]};
const mountain=Object.hasOwn(mountainCentres,name);
const combined=name==='peguera-gallina';
if(!amsterdam&&!mountain&&!['tamariu','millau','rajadell-pure','aneto-forest','aneto-lakes','aneto-lakes-pure','aneto20','aneto40'].includes(name))
  throw Error('Ús: node --max-old-space-size=512 scripts/measure-processing.mjs amsterdam|tamariu|millau|rajadell-pure|aneto-forest|aneto-lakes|aneto-lakes-pure|aneto20|aneto40|peguera|gallina|gallina-complet|peguera-gallina');
if(freemem()/2**30<2.5)throw Error('Calen almenys 2,5 GiB lliures.');
if(amsterdam)console.log(`Control d’Amsterdam · PID ${process.pid} · ${amsterdam.width} mm · detall ${balanced?'equilibrat':'alt'}`);
const rajadell=name==='rajadell-pure',forestAlpine=name==='aneto-forest',alpine=name==='aneto-lakes-pure'||forestAlpine;
const sample=rajadell?'eix-diagonal':name==='tamariu',landscapeLakes=name==='aneto-lakes',
  pureRelief=rajadell||alpine||combined||['aneto20','aneto40','peguera','gallina'].includes(name);
const extent=rajadell?1.5:alpine?3:pureRelief?Number(name.slice(5)):null;
const pose=amsterdam?selectionPose(scaledBBox(amsterdam.center,amsterdam.width,amsterdam.height,amsterdam.scale),amsterdam.rotation):null;
const bbox=pose?.bbox??(mountain?physicalBBox(mountainCentres[name],combined?6:3,combined?6:3):rajadell?physicalBBox([41.71792,1.78391],extent,extent):pureRelief||landscapeLakes
  ?physicalBBox(forestAlpine?[42.629,.58]:[42.635,.65],extent??3,extent??3)
  :sample?physicalBBox([41.918,3.2075],.65,.65):physicalBBox([44.0797,3.0226],3,3));
const startedAt=new Date().toISOString(),started=performance.now(),sources=[];
const nativeFetch=globalThis.fetch;
globalThis.fetch=async (url,options)=>{
  if(!String(url).startsWith('./'))return nativeFetch(url,options);
  try{return new Response(await readFile(new URL('../public/'+String(url).slice(2),import.meta.url)));}
  catch(error){if(error.code==='ENOENT')return new Response(null,{status:404});throw error;}
};
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
let lastProgress;
const progress=message=>{
  if(amsterdam&&message!==lastProgress)console.log(`${((performance.now()-started)/1000).toFixed(1)} s · ${message}`);
  lastProgress=message;
};
const data=await loadRegion({sample,bbox,pureRelief,buildingSource:'osm',decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode),onTiming:event=>sources.push(event)},progress);
const settings=amsterdam?{size:amsterdam.width,widthMM:amsterdam.width,heightMM:amsterdam.height,
  selectionPose:pose,resolution:balanced?64:96,exaggeration:1.5,baseThickness:DEFAULT_BASE_THICKNESS_MM,pureRelief:false,
  streams:true,streamWidth:1,roadRise:0,railRise:0,trailWidth:1,surfaceRoads:'regional',estimatedTunnels:true,
  majorRoads:true,smoothProfiles:true,trees:true,density:2.5,treeType:'mixed',buildingMode:'source'}:
  {size:combined?300:pureRelief&&!rajadell&&!alpine&&!mountain?extent*10:150,
  resolution:rajadell||alpine||mountain&&pureRelief?PURE_RELIEF_RESOLUTIONS[36]:pureRelief?PURE_RELIEF_RESOLUTIONS[56]:landscapeLakes||mountain?96:12,
  exaggeration:1.5,trees:pureRelief||mountain,estimatedTunnels:!pureRelief,pureRelief};
const timing=createProcessingTiming();
timing.mark('initialization','Preparant el motor de geometria…');
const api=pureRelief?null:await Module();api?.setup();
let stage,firstTerrainPreviewMilliseconds;
const result=buildModel(data,settings,message=>{timing.mark(stage,message);progress(message);},api,timing.detail,{
  stage:(next,message)=>{if(next!==stage)progress(message);stage=next;timing.mark(next,message);},
  parts:phase=>{
    if(phase!=='terrain'||firstTerrainPreviewMilliseconds!==undefined)return;
    firstTerrainPreviewMilliseconds=performance.now()-started;
    progress('Primer relleu disponible.');
  }
});
const worker=timing.finish(),totalMilliseconds=performance.now()-started;
const audit=result.categories.map(auditPart).map(({id,errors})=>({id,errors}));
let transport;
if(amsterdam){
  const {bridges,terrain,ground,waterPoly,proj}=result.context;
  const isWater=polygonTester(waterPoly);
  const waterAt=terrain.waterAt??((x,y)=>isWater([x,y])?ground(x,y)-.3:null);
  const channels=[];
  for(const bridge of bridges){
    if(!bridge.estimated||bridge.mainRoad)continue;
    let minimum=Infinity;
    for(let i=1;i<bridge.axis.length;i++){
      const [x,y]=bridge.axis[i-1],[u,v]=bridge.axis[i];
      const steps=Math.max(1,Math.ceil(Math.hypot(u-x,v-y)/.1));
      for(let j=0;j<=steps;j++){
        const a=x+(u-x)*j/steps,b=y+(v-y)*j/steps;
        const water=waterAt(a,b);
        if(water==null)continue;
        const top=bridge.top(a,b);
        if(top!=null)minimum=Math.min(minimum,top-bridge.thickness-water);
      }
    }
    if(Number.isFinite(minimum))channels.push({id:bridge.id,sourceFeatureIds:bridge.sourceFeatureIds,
      minimumClearanceMM:minimum,joins:bridge.approaches.plans.length,axisEnds:[bridge.axis[0],bridge.axis.at(-1)].map(proj.unproject)});
  }
  const {infrastructure,majorRoads,surfaceRoads}=result.provenance;
  transport={mappedBridges:bridges.filter(bridge=>bridge.estimated&&!bridge.mainRoad).length,channels,
    bridgeCompletion:infrastructure?.completion&&{piers:infrastructure.completion.piers,connections:infrastructure.completion.connections},
    majorRoads:majorRoads?.count,surfaceRoads:surfaceRoads?.accepted,
    warnings:result.warnings.filter(warning=>/pont|tauler|pressupost|paviment/i.test(warning))};
}
let forestElevationBands;
if(combined){
  const {forestWeights,heights,trees,originMeters,exaggeration}=result.reliefGrid;
  const bands=[{belowMetres:1950},{belowMetres:2200},{belowMetres:2450},{belowMetres:null}];
  forestElevationBands=bands.map(band=>({...band,forestSamples:0,trees:0}));
  const mmPerMetre=1000/result.scale,bandAt=z=>{
    const metres=originMeters+(z-5)/(mmPerMetre*exaggeration);
    return forestElevationBands.find(band=>band.belowMetres===null||metres<band.belowMetres);
  };
  forestWeights?.forEach((value,i)=>{if(value>0)bandAt(heights[i]).forestSamples++;});
  for(const tree of trees??[])bandAt(tree.ground).trees++;
}
const report={schemaVersion:1,environment:'node',startedAt,selection:{name,bbox:data.meta.bbox},settings,
  data:{vectorFeatures:data.features.length,demTiles:data.dem.length,buildingSource:data.meta.buildingSource,terrainProvider:data.meta.terrain?.provider??'sample',demZoom:data.meta.terrain?.zoom,demSampleSize:data.meta.terrain?.sampleSize,coverage:data.meta.coverage},
  sources,worker,firstTerrainPreviewMilliseconds,totalMilliseconds,peakProcessRSSBytes:process.resourceUsage().maxRSS*1024,
  result:{scale:result.scale,triangles:result.triangles,buildings:result.buildingCount,trees:result.treeCount,
    coverageCells:result.provenance.coverageCells,forestSamples:result.provenance.forestSamples,
    treeRepresentation:result.provenance.treeRepresentation,forestElevationBands,streamCount:result.provenance.streamCount,audit,transport}};
await mkdir('output',{recursive:true});
const suffix=centreControl?'-centre':balanced?'-equilibrat':'';
await writeFile(`output/temps-${name}${suffix}.json`,JSON.stringify(report,null,2)+'\n');
if(name==='aneto20'&&audit.every(part=>!part.errors.length))await writeFile('output/aneto-20km.3mf',threeMF(result,{bambu:true}));
if(name==='aneto-lakes-pure'&&audit.every(part=>!part.errors.length))await writeFile('output/aneto-llacs-rius.3mf',threeMF(result,{bambu:true}));
if(rajadell&&audit.every(part=>!part.errors.length))await writeFile('output/rajadell-boscos.3mf',threeMF(result,{bambu:true}));
if(forestAlpine&&audit.every(part=>!part.errors.length))await writeFile('output/aneto-boscos.3mf',threeMF(result,{bambu:true}));
if(mountain&&!combined&&audit.every(part=>!part.errors.length))await writeFile(`output/${name}-vegetacio.3mf`,threeMF(result,{bambu:true}));
if((name==='aneto40'||combined)&&audit.every(part=>!part.errors.length)){
  const pieces=splitPureRelief(result,200,()=>{});
  if(pieces.length!==4||pieces.some(piece=>piece.parts.some(part=>auditPart(part).errors.length)))
    throw Error('La partició del pilot no ha superat l’auditoria.');
  await writeFile(combined?'output/peguera-gallina-peces.zip':'output/aneto-40km-peces.zip',tileArchive(pieces,'bambu'));
}
console.log(JSON.stringify({name,totalMilliseconds,firstTerrainPreviewMilliseconds,peakProcessRSSBytes:report.peakProcessRSSBytes,stages:worker.stages,audit}));
if(audit.some(part=>part.errors.length))process.exitCode=1;
