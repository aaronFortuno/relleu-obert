import {VectorTile} from '@mapbox/vector-tile';
import Pbf from 'pbf';
import {inCatalonia,fetchOfficialBuildings,combineBuildings} from './buildings.js';
import {loadTerrain,loadBridgeTerrain,oceanTilePredicate} from './terrain-provider.js';
import {loadReliefCoverage,RELIEF_COVERAGE_SOURCE} from './relief-coverage.js';
import {extendBridgeTiles} from './bridge-tile-coverage.js';
import {regionTileCount,MAX_REGION_TILES} from './region-limits.js';
import {loadBuildingsRecoverably} from './building-recovery.js';
import {recommendedPlace} from './recommended-places.js';
import {loadInfrastructureOverrides} from './infrastructure-registry.js';
import {fetchOSMBuildings} from './roof-sources.js';

export {lonLatTile} from './elevation.js';
import {lonLatTile} from './elevation.js';
export function tileList(bbox,z=14){
  if(regionTileCount(bbox,z)>MAX_REGION_TILES)throw Error('L’àrea seleccionada supera la capacitat actual de càrrega. Redueix la mida de la peça, tria una escala més detallada o apropa el mapa.');
  const a=lonLatTile(bbox[0],bbox[3],z),b=lonLatTile(bbox[2],bbox[1],z),out=[];
  for(let x=Math.floor(a[0]);x<=Math.floor(b[0]);x++)for(let y=Math.floor(a[1]);y<=Math.floor(b[1]);y++)out.push({z,x,y});
  return out;
}
export function readVector(bytes,{x,y,z}){
  const tile=new VectorTile(new Pbf(bytes)),features=[];
  for(const name of ['water','landcover','landuse','transportation','building']){
    const layer=tile.layers[name];if(!layer)continue;
    for(let i=0;i<layer.length;i++){const f=layer.feature(i).toGeoJSON(x,y,z);f.properties.sourceLayer=name;features.push(f);}
  }return features;
}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(25000),cache:url.endsWith('/planet')?'no-cache':'default'});if(!r.ok)throw Error(`No s’ha pogut carregar ${url.includes('openfreemap')?'la cartografia d’OpenFreeMap':'la mostra local'} (${r.status}). Torna-ho a provar més tard.`);return r;}
const infrastructureJSON=async name=>(await get((import.meta.env?.BASE_URL||'./')+'data/'+name)).json();
async function decodeDEM(blob,t){
  const decoder=await import('./dem-browser.js');return decoder.decodeDEM(blob,t);
}
export const defaultBuildingSource=bbox=>inCatalonia(bbox)?'icgc':'osm';
const buildingLayers=new WeakMap();
export async function loadBuildingLayer(region,{source=defaultBuildingSource(region.meta.bbox),localBuildings,onBatch}={},progress=()=>{}){
  if(localBuildings)return {features:localBuildings.features,metadata:localBuildings.metadata,source:'local',warnings:['Els edificis del GeoJSON local substitueixen tota la capa: els que faltin al fitxer no es completen automàticament.']};
  if(source==='auto')source=defaultBuildingSource(region.meta.bbox);
  let cache=buildingLayers.get(region);if(!cache){cache=new Map();buildingLayers.set(region,cache);}if(cache.has(source))return cache.get(source);
  const vectors=region.vectorFeatures||region.features,osm=vectors.filter(f=>f.properties.sourceLayer==='building');let result;
  if(source==='osm')result={features:osm,metadata:{provider:'OpenStreetMap · OpenFreeMap',count:osm.length},warnings:[]};
  else if(source==='osm3d'){
    try{result=await fetchOSMBuildings(region.meta.bbox,fetch,{onProgress:progress});}
    catch(error){result={features:osm,metadata:{provider:'OpenStreetMap · OpenFreeMap (alternativa sense cobertes originals)',count:osm.length,roofSourceUnavailable:true},warnings:[error.message+' Es conserven els edificis OSM disponibles; les cobertes sense atributs es mostren planes.']};}
  }else if(source==='icgc'){
    if(!inCatalonia(region.meta.bbox))throw Error('ICGC: font disponible només dins de l’àmbit català. Tria OpenStreetMap.');
    progress('Carregant la capa d’edificis de l’ICGC…');
    const base=(import.meta.env?.BASE_URL||'./')+'data/',official=region.meta.officialBuildings?await(await get(base+region.meta.officialBuildings)).json():await fetchOfficialBuildings(region.meta.bbox);
    if(!official.features.length)throw Error('ICGC: no hi ha edificis disponibles. Pots triar OpenStreetMap.');
    const combined=combineBuildings(osm,official);result={features:combined.features,metadata:combined.metadata,warnings:[]};
  }else if(source==='catastre'){
    progress('Carregant edificis i parts del Catastre…');const {fetchCadastralBuildings}=await import('./cadastre.js');result=await fetchCadastralBuildings(region.meta.bbox,fetch,{onProgress:progress,onBatch});
  }else throw Error('Font d’edificis desconeguda.');
  result={...result,source};if(!result.metadata?.roofSourceUnavailable)cache.set(source,result);return result;
}
export function applyBuildingLayer(region,layer){
  region.features=[...(region.vectorFeatures||region.features).filter(f=>f.properties.sourceLayer!=='building'),...layer.features];
  region.meta={...region.meta,buildings:layer.metadata,buildingSource:layer.source,sourceWarnings:[...(region.terrainWarnings||[]),...layer.warnings],localSources:{...region.meta.localSources,buildings:layer.source==='local'?layer.metadata:null}};
  return region;
}
export async function loadRegion({sample=true,bbox,buildingSource,decodeElevation=decodeDEM,localDEM,localBuildings,buildingFallbacks=[],onTiming,pureRelief=false},progress=()=>{}){
  async function time(phase,run,details={}){
    if(!onTiming)return run();
    const start=performance.now();
    let ok=false;
    try{
      const result=await run();
      ok=true;
      return result;
    }finally{
      onTiming({phase,milliseconds:performance.now()-start,ok,...details});
    }
  }
  if(pureRelief){
    if(!Array.isArray(bbox)||bbox.length!==4||!bbox.every(Number.isFinite)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3]||
      bbox[0]<-180||bbox[2]>180||bbox[1]<-70||bbox[3]>70||bbox[2]-bbox[0]>2||bbox[3]-bbox[1]>1)
      throw Error('Retall fora dels límits de Relleu pur.');
    const terrain=await time('source.terrain',()=>loadTerrain(bbox,decodeElevation,fetch,progress,undefined,{zooms:[14,13,12,11,10],maxTiles:16}));
    let coverage=[];
    const warnings=terrain.warnings.slice();
    progress('Carregant la cobertura de sòl nu i neu o gel…');
    try{
      coverage=await time('source.relief-coverage',()=>loadReliefCoverage(bbox));
      if(coverage.length){
        warnings.push('ESA WorldCover 2021: gris per sòl nu o amb vegetació escassa i blanc per neu o gel cartografiat.');
        const [w,s,e,n]=coverage[0].bbox;
        if(bbox[0]<w||bbox[1]<s||bbox[2]>e||bbox[3]>n)warnings.push('Fora del retall cartografiat del pilot, el relleu es mostra en un color neutre.');
      }else warnings.push('Aquest retall és fora de la cobertura de colors del pilot de l’Aneto.');
    }catch{warnings.push('No s’ha pogut carregar la cobertura de sòl nu i neu o gel. Es mostra el relleu en un color neutre.');}
    const meta={bbox,name:'Relleu pur',date:new Date().toISOString(),terrain:terrain.metadata,tiles:terrain.tiles.map(({z,x,y})=>({z,x,y})),
      coverage:{...RELIEF_COVERAGE_SOURCE,available:!!coverage.length,tiles:coverage.map(t=>t.tile)},
      buildings:{count:0},buildingSource:null,sourceWarnings:warnings,pureRelief:true};
    return {meta,features:[],dem:terrain.tiles,coverage,terrainWarnings:warnings};
  }
  const base=(import.meta.env?.BASE_URL||'./')+'data/';
  if(typeof sample==='string'&&!recommendedPlace(sample))throw Error('Exemple desconegut.');
  let meta=sample?await time('source.catalog',async()=>(await get(base+(recommendedPlace(sample)?.file||'tamariu.json'))).json(),{provider:'sample'}):{name:'Regió seleccionada',bbox,tiles:tileList(bbox),date:new Date().toISOString()};
  if(sample&&bbox)meta={...meta,bbox};
  let template;
  if(!sample)template=await time('source.catalog',async()=>(await(await get('https://tiles.openfreemap.org/planet')).json()).tiles[0],{provider:'OpenFreeMap'});
  let features=[],dem=[],bridgeDem=[],bridgeFeatures=[],incompleteBridgeIds=[],terrainWarnings=[...(meta.sourceWarnings||[])];
  const vectorEntries=[];
  // Sequential tile pairs keep resource use and public-service load bounded.
  for(let i=0;i<meta.tiles.length;i++){
    const t=meta.tiles[i];progress(`Carregant dades ${i+1}/${meta.tiles.length}…`);
    const vectorURL=sample?base+t.vector:template.replace('{z}',t.z).replace('{x}',t.x).replace('{y}',t.y);
    const tile={z:t.z,x:t.x,y:t.y};
    const bytes=await time('source.vector-fetch',async()=>(await get(vectorURL)).arrayBuffer(),{tile});
    const vectors=await time('source.vector-decode',()=>readVector(new Uint8Array(bytes),t),{tile,bytes:bytes.byteLength});
    features.push(...vectors);
    if(!sample)vectorEntries.push({tile:t,features:vectors});
    if(sample&&!localDEM)dem.push(await time('source.terrain',async()=>decodeElevation(await(await get(base+t.dem)).blob(),t),{tile,provider:'sample'}));
  }
  if(!sample&&!localDEM){
    const terrain=await time('source.terrain',()=>loadTerrain(meta.bbox,decodeElevation,fetch,progress,oceanTilePredicate(features,meta.bbox)));dem=terrain.tiles;meta.terrain=terrain.metadata;terrainWarnings=terrain.warnings;
    const bridgeDeadline=AbortSignal.timeout(16000);
    const fetchBridge=(url,options)=>fetch(url,{...options,signal:AbortSignal.any([bridgeDeadline,options.signal])});
    const extension=await time('source.bridge-vector',()=>extendBridgeTiles(vectorEntries,meta.bbox,async t=>{
      progress('Completant traçats de ponts fora del retall…');
      const url=template.replace('{z}',t.z).replace('{x}',t.x).replace('{y}',t.y);
      const response=await fetchBridge(url,{signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw Error(`HTTP ${response.status}`);
      return readVector(new Uint8Array(await response.arrayBuffer()),t);
    }));
    bridgeFeatures=extension.features;incompleteBridgeIds=[...extension.missing];
    const extra=await time('source.bridge-terrain',()=>loadBridgeTerrain(extension.tiles,terrain,decodeElevation,fetchBridge),{tiles:extension.tiles.length});
    bridgeDem=extra.tiles;
    if(incompleteBridgeIds.length||extra.failed)terrainWarnings.push('No s’ha pogut completar tota la cartografia de ponts i el relleu dels estreps fora del retall.');
    if(extension.tiles.length||incompleteBridgeIds.length)meta.bridgeCoverage={vectorTiles:extension.tiles,demTiles:bridgeDem.map(({z,x,y})=>({z,x,y})),incompleteBridgeIds,demFailures:extra.failed};
  }
  if(localDEM){meta.terrain=localDEM.metadata;terrainWarnings.push('MDT GeoTIFF local: altituds en metres, datum vertical de la font sense transformar. No es completen buits amb relleu inventat.');}
  meta.elevationDecoding=localDEM?{method:'numeric GeoTIFF raster; no canvas readback',file:localDEM.metadata}:{method:'binary RGB; no canvas readback',tiles:dem.map(t=>({z:t.z,x:t.x,y:t.y,...t.decoding}))};
  meta.localSources={dem:localDEM?.metadata||null,buildings:localBuildings?.metadata||null};
  let infrastructure=null;
  try{infrastructure=await time('source.infrastructure',()=>loadInfrastructureOverrides(meta.bbox,infrastructureJSON));}
  catch(error){terrainWarnings.push('No s’han pogut carregar els detalls específics dels ponts; s’ha omès aquesta millora. '+error.message);}
  const region={meta,features,vectorFeatures:features,terrainWarnings,dem,bridgeDem,bridgeFeatures,incompleteBridgeIds,localDEM,infrastructure};
  const layer=await loadBuildingsRecoverably(source=>time('source.buildings',()=>loadBuildingLayer(region,{source,localBuildings},progress),{provider:localBuildings?'local':source}),buildingSource||defaultBuildingSource(meta.bbox),localBuildings?[]:buildingFallbacks);
  if(layer.recovery){region.recovery=layer.recovery;region.meta={...region.meta,buildingRecovery:layer.recovery};}
  return applyBuildingLayer(region,layer);
}
