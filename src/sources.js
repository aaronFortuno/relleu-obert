import {VectorTile} from '@mapbox/vector-tile';
import Pbf from 'pbf';
import {inCatalonia,fetchOfficialBuildings,combineBuildings} from './buildings.js';
import {loadTerrain,oceanTilePredicate} from './terrain-provider.js';
import {regionTileCount,MAX_REGION_TILES} from './region-limits.js';

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
export async function loadRegion({sample=true,bbox,buildingSource='auto',decodeElevation=decodeDEM,localDEM,localBuildings},progress=()=>{}){
  const base=(import.meta.env?.BASE_URL||'./')+'data/';
  let meta=sample?await(await get(base+'tamariu.json')).json():{name:'Regió seleccionada',bbox,tiles:tileList(bbox),date:new Date().toISOString()};
  let template;if(!sample)template=(await(await get('https://tiles.openfreemap.org/planet')).json()).tiles[0];
  let features=[],dem=[],terrainWarnings=[];
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
  meta={...meta,sourceWarnings:terrainWarnings,buildings:{provider:'OpenStreetMap · OpenFreeMap'}};
  if(!localBuildings&&buildingSource!=='osm'&&(buildingSource==='icgc'||inCatalonia(meta.bbox))){
    progress('Carregant edificacions oficials de l’ICGC…');
    try{
      const official=sample&&meta.officialBuildings?await(await get(base+meta.officialBuildings)).json():await fetchOfficialBuildings(meta.bbox);
      if(!official.features.length)throw Error('ICGC: no hi ha edificacions retornades per a aquesta regió.');
      const combined=combineBuildings(features,official);features=combined.features;meta.buildings=combined.metadata;
    }catch(e){if(buildingSource==='icgc')throw e;meta.sourceWarnings.push(`No s’han pogut incorporar els edificis ICGC: ${e.message} Es mantenen els d’OpenStreetMap.`);}
  }
  meta.buildingSource=buildingSource;
  if(localBuildings){features=[...features.filter(f=>f.properties.sourceLayer!=='building'),...localBuildings.features];meta.buildings=localBuildings.metadata;meta.sourceWarnings.push('Els edificis del GeoJSON local substitueixen tota la capa d’edificis: els que faltin al fitxer no es completen automàticament.');}
  meta.localSources={dem:localDEM?.metadata||null,buildings:localBuildings?.metadata||null};
  return {meta,features,dem,localDEM};
}
