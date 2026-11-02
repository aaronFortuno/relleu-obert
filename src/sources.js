import {VectorTile} from '@mapbox/vector-tile';
import Pbf from 'pbf';
import {inCatalonia,fetchOfficialBuildings,combineBuildings} from './buildings.js';
import {loadTerrain,oceanTilePredicate} from './terrain-provider.js';
import {regionTileCount,MAX_REGION_TILES} from './region-limits.js';
import {loadBuildingsRecoverably} from './building-recovery.js';
import {recommendedPlace} from './recommended-places.js';

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
async function decodeDEM(blob,t){
  const decoder=await import('./dem-browser.js');return decoder.decodeDEM(blob,t);
}
export const defaultBuildingSource=bbox=>inCatalonia(bbox)?'icgc':'osm';
const buildingLayers=new WeakMap();
export async function loadBuildingLayer(region,{source=defaultBuildingSource(region.meta.bbox),localBuildings}={},progress=()=>{}){
  if(localBuildings)return {features:localBuildings.features,metadata:localBuildings.metadata,source:'local',warnings:['Els edificis del GeoJSON local substitueixen tota la capa: els que faltin al fitxer no es completen automàticament.']};
  if(source==='auto')source=defaultBuildingSource(region.meta.bbox);
  let cache=buildingLayers.get(region);if(!cache){cache=new Map();buildingLayers.set(region,cache);}if(cache.has(source))return cache.get(source);
  const vectors=region.vectorFeatures||region.features,osm=vectors.filter(f=>f.properties.sourceLayer==='building');let result;
  if(source==='osm')result={features:osm,metadata:{provider:'OpenStreetMap · OpenFreeMap',count:osm.length},warnings:[]};
  else if(source==='icgc'){
    if(!inCatalonia(region.meta.bbox))throw Error('ICGC: font disponible només dins de l’àmbit català. Tria OpenStreetMap.');
    progress('Carregant la capa d’edificis de l’ICGC…');
    const base=(import.meta.env?.BASE_URL||'./')+'data/',official=region.meta.officialBuildings?await(await get(base+region.meta.officialBuildings)).json():await fetchOfficialBuildings(region.meta.bbox);
    if(!official.features.length)throw Error('ICGC: no hi ha edificis disponibles. Pots triar OpenStreetMap.');
    const combined=combineBuildings(osm,official);result={features:combined.features,metadata:combined.metadata,warnings:[]};
  }else if(source==='catastre'){
    progress('Carregant edificis i parts del Catastre…');const {fetchCadastralBuildings}=await import('./cadastre.js');result=await fetchCadastralBuildings(region.meta.bbox,fetch,{onProgress:progress});
  }else throw Error('Font d’edificis desconeguda.');
  result={...result,source};cache.set(source,result);return result;
}
export function applyBuildingLayer(region,layer){
  region.features=[...(region.vectorFeatures||region.features).filter(f=>f.properties.sourceLayer!=='building'),...layer.features];
  region.meta={...region.meta,buildings:layer.metadata,buildingSource:layer.source,sourceWarnings:[...(region.terrainWarnings||[]),...layer.warnings],localSources:{...region.meta.localSources,buildings:layer.source==='local'?layer.metadata:null}};
  return region;
}
export async function loadRegion({sample=true,bbox,buildingSource,decodeElevation=decodeDEM,localDEM,localBuildings,buildingFallbacks=[]},progress=()=>{}){
  const base=(import.meta.env?.BASE_URL||'./')+'data/';
  if(typeof sample==='string'&&!recommendedPlace(sample))throw Error('Exemple desconegut.');
  let meta=sample?await(await get(base+(recommendedPlace(sample)?.file||'tamariu.json'))).json():{name:'Regió seleccionada',bbox,tiles:tileList(bbox),date:new Date().toISOString()};
  if(sample&&bbox)meta={...meta,bbox};
  let template;if(!sample)template=(await(await get('https://tiles.openfreemap.org/planet')).json()).tiles[0];
  let features=[],dem=[],terrainWarnings=[...(meta.sourceWarnings||[])];
  // Sequential tile pairs keep resource use and public-service load bounded.
  for(let i=0;i<meta.tiles.length;i++){
    const t=meta.tiles[i];progress(`Carregant dades ${i+1}/${meta.tiles.length}…`);
    const vectorURL=sample?base+t.vector:template.replace('{z}',t.z).replace('{x}',t.x).replace('{y}',t.y);
    features.push(...readVector(new Uint8Array(await(await get(vectorURL)).arrayBuffer()),t));
    if(sample&&!localDEM)dem.push(await decodeElevation(await(await get(base+t.dem)).blob(),t));
  }
  if(!sample&&!localDEM){const terrain=await loadTerrain(meta.bbox,decodeElevation,fetch,progress,oceanTilePredicate(features,meta.bbox));dem=terrain.tiles;meta.terrain=terrain.metadata;terrainWarnings=terrain.warnings;}
  if(localDEM){meta.terrain=localDEM.metadata;terrainWarnings.push('MDT GeoTIFF local: altituds en metres, datum vertical de la font sense transformar. No es completen buits amb relleu inventat.');}
  meta.elevationDecoding=localDEM?{method:'numeric GeoTIFF raster; no canvas readback',file:localDEM.metadata}:{method:'binary RGB; no canvas readback',tiles:dem.map(t=>({z:t.z,x:t.x,y:t.y,...t.decoding}))};
  meta.localSources={dem:localDEM?.metadata||null,buildings:localBuildings?.metadata||null};
  const region={meta,features,vectorFeatures:features,terrainWarnings,dem,localDEM};
  const layer=await loadBuildingsRecoverably(source=>loadBuildingLayer(region,{source,localBuildings},progress),buildingSource||defaultBuildingSource(meta.bbox),localBuildings?[]:buildingFallbacks);
  if(layer.recovery){region.recovery=layer.recovery;region.meta={...region.meta,buildingRecovery:layer.recovery};}
  return applyBuildingLayer(region,layer);
}
