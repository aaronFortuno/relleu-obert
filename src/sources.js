import {VectorTile} from '@mapbox/vector-tile';
import Pbf from 'pbf';
import {inCatalonia,fetchOfficialBuildings,combineBuildings} from './buildings.js';
import {loadTerrain,loadPreferredTerrain,loadBridgeTerrain,oceanTilePredicate} from './terrain-provider.js';
import {loadReliefCoverage,loadReliefLakes,RELIEF_COVERAGE_SOURCE,RELIEF_LAKE_SOURCE} from './relief-coverage.js';
import {extendBridgeTiles} from './bridge-tile-coverage.js';
import {regionTileCount,MAX_REGION_TILES} from './region-limits.js';
import {loadBuildingsRecoverably} from './building-recovery.js';
import {recommendedPlace} from './recommended-places.js';
import {loadInfrastructureOverrides} from './infrastructure-registry.js';
import {createLandmarkLoader,terrainTileSources} from './landmarks.js';
import {fetchOSMBuildings} from './roof-sources.js';
import {loadReliefWaterways,RELIEF_WATERWAY_SOURCE} from './relief-waterways.js';
import {isFlowingWater,isMarineWater,isStandingWater} from './standing-water.js';
import {polygonOps} from './polygon-ops.js';
import {MAX_MODEL_SIDE_MM,PURE_SCALE_RANGE} from './selection.js';

export {lonLatTile} from './elevation.js';
import {lonLatTile} from './elevation.js';
export function tileList(bbox,z=14,maxTiles=MAX_REGION_TILES){
  if(regionTileCount(bbox,z)>maxTiles)throw Error('L’àrea seleccionada supera la capacitat actual de càrrega. Redueix la mida de la peça, tria una escala més detallada o apropa el mapa.');
  const a=lonLatTile(bbox[0],bbox[3],z),b=lonLatTile(bbox[2],bbox[1],z),out=[];
  for(let x=Math.floor(a[0]);x<=Math.floor(b[0]);x++)for(let y=Math.floor(a[1]);y<=Math.floor(b[1]);y++)out.push({z,x,y});
  return out;
}
export function readVector(bytes,{x,y,z},layers=['water','waterway','landcover','landuse','transportation','building']){
  const tile=new VectorTile(new Pbf(bytes)),features=[];
  for(const name of layers){
    const layer=tile.layers[name];if(!layer)continue;
    for(let i=0;i<layer.length;i++){const f=layer.feature(i).toGeoJSON(x,y,z);f.properties.sourceLayer=name;features.push(f);}
  }return features;
}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(25000),cache:url.endsWith('/planet')?'no-cache':'default'});if(!r.ok)throw Error(`No s’ha pogut carregar ${url.includes('openfreemap')?'la cartografia d’OpenFreeMap':'la mostra local'} (${r.status}). Torna-ho a provar més tard.`);return r;}
const infrastructureJSON=async name=>(await get((import.meta.env?.BASE_URL||'./')+'data/'+name)).json();
const vectorCatalog='https://tiles.openfreemap.org/planet';
const vectorTemplate=async()=> (await(await get(vectorCatalog)).json()).tiles[0];
const singularCatalogue='https://raw.githubusercontent.com/aaronFortuno/open-place-models/main/catalog.geojson';
const loadSingularModels=createLandmarkLoader(singularCatalogue,(...args)=>fetch(...args));
const waterPolygonOps=polygonOps();

export function mergeStandingWaterFragments(lakes){
  const groups=new Map();
  for(const lake of lakes){
    const key=lake.id??lake.properties.id??lake;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(lake);
  }
  const merged=[];
  for(const fragments of groups.values()){
    const [first]=fragments;
    if(fragments.length===1){merged.push(first);continue;}
    try{
      let coordinates=[];
      for(let i=0;i<fragments.length;i+=8){
        const batch=fragments.slice(i,i+8).map(({geometry:g})=>g.type==='Polygon'?[g.coordinates]:g.coordinates);
        coordinates=waterPolygonOps.union(coordinates,...batch);
      }
      if(coordinates.length)merged.push({...first,geometry:{type:'MultiPolygon',coordinates}});
    }catch{/* Preserve the usable fragments if one has invalid geometry. */
      merged.push(...fragments);
    }
  }
  return merged;
}

async function loadReliefVectors(bbox,sample,progress,forestOnly,wide){
  const maxTiles=wide?48:MAX_REGION_TILES;
  const zoom=(wide?[14,13,12,11,10,9,8,7]:[14,13,12,11,10,9,8]).find(z=>regionTileCount(bbox,z)<=maxTiles);
  const tiles=tileList(bbox,zoom,maxTiles),base=(import.meta.env?.BASE_URL||'./')+'data/';
  const place=typeof sample==='string'?recommendedPlace(sample):null;
  const deadline=AbortSignal.timeout(wide?20000:12000);
  const request=async url=>{
    const response=await fetch(url,{signal:deadline});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    return response;
  };
  const read=async url=>new Uint8Array(await(await request(url)).arrayBuffer());
  let local=new Map();
  if(place){
    try{
      const catalog=await(await request(base+place.file)).json();
      local=new Map(catalog.tiles.map(t=>[`${t.z}/${t.x}/${t.y}`,base+t.vector]));
    }catch{/* Remote tiles can still cover this selection. */}
  }
  let template;
  const remote=async({z,x,y})=>{
    template??=request(vectorCatalog).then(response=>response.json()).then(catalog=>catalog.tiles[0]);
    return read((await template).replace('{z}',z).replace('{x}',x).replace('{y}',y));
  };
  const features=[],lakes=[],waterways=[],waterAreas=[],forests=[],oceans=[];
  const layers=forestOnly?['landcover','landuse']:['water','waterway','landcover','landuse'];
  let failures=0;
  for(let i=0;i<tiles.length;i+=4){
    progress(`Carregant la cartografia ${forestOnly?'de bosc':'d’aigua i bosc'} ${i+1}/${tiles.length}…`);
    const batch=await Promise.allSettled(tiles.slice(i,i+4).map(async t=>{
      const url=local.get(`${t.z}/${t.x}/${t.y}`);
      const bytes=url?await read(url).catch(()=>remote(t)):await remote(t);
      return readVector(bytes,t,layers);
    }));
    for(const result of batch){
      if(result.status==='fulfilled')features.push(...result.value);
      else failures++;
    }
  }
  for(const feature of features){
    const {properties,geometry:{type}}=feature;
    if(properties.sourceLayer==='waterway'&&(type==='LineString'||type==='MultiLineString'))waterways.push(feature);
    else if(type!=='Polygon'&&type!=='MultiPolygon')continue;
    else if(properties.sourceLayer==='water'){
      if(isMarineWater(properties))oceans.push(feature);
      else if(isStandingWater(properties))lakes.push(feature);
      else if(isFlowingWater(properties))waterAreas.push(feature);
    }else if(['landcover','landuse'].includes(properties.sourceLayer)&&['wood','forest'].includes(properties.class)){
      const {coordinates}=feature.geometry;
      const polygons=type==='Polygon'?[coordinates]:coordinates;
      if(polygons.some(([ring])=>{
        let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
        for(const [x,y] of ring){
          west=Math.min(west,x);south=Math.min(south,y);east=Math.max(east,x);north=Math.max(north,y);
        }
        return west<bbox[2]&&east>bbox[0]&&south<bbox[3]&&north>bbox[1];
      }))forests.push(feature);
    }
  }
  return {lakes:mergeStandingWaterFragments(lakes),waterways,waterAreas,forests,oceans,failures,zoom,tileCount:tiles.length};
}
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
    try{
      result=await fetchOSMBuildings(region.meta.bbox,fetch,{onProgress:progress});
      if(!result.features.length&&osm.length)result={
        features:osm,
        metadata:{...result.metadata,provider:'OpenStreetMap · OpenFreeMap (alternativa sense cobertes originals)',count:osm.length,roofSourceEmpty:true},
        warnings:[...result.warnings,'OpenStreetMap original no ha retornat edificis en aquest retall. Es conserven les petjades disponibles amb coberta plana.']
      };
    }
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
function reliefBounds(bbox,panoramic){
  if(!Array.isArray(bbox)||bbox.length!==4||!bbox.every(Number.isFinite))return null;
  const [west,south,east,north]=bbox;
  if(west>=east||south>=north||west< -180||east>180||south< -70||north>70)return null;
  const width=(east-west)*111.32*Math.cos((south+north)/2*Math.PI/180),height=(north-south)*111.32;
  const squareSide=MAX_MODEL_SIDE_MM*PURE_SCALE_RANGE[1]/1e6;
  // A rotated footprint may need a wider source envelope than its own sides.
  const maxAxis=panoramic?510.1:squareSide*Math.SQRT2+.5;
  const maxDiagonal=panoramic?600.1:2*squareSide+.5;
  if(Math.max(width,height)>maxAxis||Math.hypot(width,height)>maxDiagonal)return null;
  // Keep the smaller source budget for selections within the former 50 km square envelope.
  return {wide:panoramic||Math.max(width,height)>50*Math.SQRT2+.1};
}

// Catalogue sectors are opt-in for controlled comparisons. Keep the normal
// workshop on the general elevation source and the individual landforms.
export async function loadRegion({sample=true,bbox,selectionCorners,detailSectors=false,buildingSource,decodeElevation=decodeDEM,localDEM,localBuildings,buildingFallbacks=[],onTiming,pureRelief=false,panoramic=false},progress=()=>{}){
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
  if(panoramic&&!pureRelief)throw Error('El format panoràmic només es pot generar en Relleu pur.');
  if(pureRelief){
    const bounds=reliefBounds(bbox,panoramic);
    if(!bounds)throw Error(panoramic?'Retall fora dels límits del format panoràmic.':'Retall fora dels límits de Relleu pur.');
    const {wide}=bounds;
    const kinds=wide?[]:['landform'];
    if(detailSectors)kinds.push('terrain-overview');
    const singulars=kinds.length?time('source.singular-terrain',()=>loadSingularModels(bbox,kinds,selectionCorners)):null;
    const [w,s,e,n]=RELIEF_LAKE_SOURCE.bounds;
    const insidePilot=bbox[0]>=w&&bbox[1]>=s&&bbox[2]<=e&&bbox[3]<=n;
    let vectorsPromise,oceanProof;
    const loadVectors=()=>vectorsPromise??=time(insidePilot?'source.relief-forest':'source.relief-vectors',
      ()=>loadReliefVectors(bbox,sample,progress,insidePilot,wide));
    const isOcean=async tile=>{
      // Only request the cartography early when a DEM tile needs coastal proof.
      oceanProof??=loadVectors().then(vectors=>oceanTilePredicate(vectors.oceans,bbox)).catch(()=>()=>false);
      return (await oceanProof)(tile);
    };
    const terrain=await time('source.terrain',()=>loadPreferredTerrain(bbox,decodeElevation,fetch,progress,isOcean,{
      zooms:wide?[14,13,12,11,10,9,8]:[14,13,12,11,10],maxTiles:wide?144:96,maxSamples:8*1024**2,
      concurrency:wide?4:1
    }));
    let coverage=[],lakes=[],waterways=[],waterAreas=[],forests=[],oceans=[],vectorCoverage;
    const warnings=terrain.warnings.slice();
    progress('Carregant la cobertura de sòl nu i neu o gel…');
    try{
      coverage=await time('source.relief-coverage',()=>loadReliefCoverage(bbox));
      if(coverage.length){
        warnings.push('ESA WorldCover 2021: gris per sòl nu o amb vegetació escassa i blanc per neu o gel cartografiat.');
        if(!coverage.some(({bbox:[w,s,e,n]})=>bbox[0]>=w&&bbox[1]>=s&&bbox[2]<=e&&bbox[3]<=n))
          warnings.push('El color de sòl nu i neu o gel només cobreix part del retall.');
      }else warnings.push('Aquest retall és fora de la cobertura de sòl nu i neu o gel disponible.');
    }catch{warnings.push('No s’ha pogut carregar la cobertura de sòl nu i neu o gel.');}
    if(insidePilot){
      try{
        lakes=await time('source.relief-lakes',()=>loadReliefLakes(bbox));
        waterways=await time('source.relief-waterways',()=>loadReliefWaterways(bbox));
        if(lakes.length)warnings.push('Llacs i estanys del pilot de l’Aneto: © OpenStreetMap contributors, via OpenFreeMap. Cota estimada del model d’elevacions.');
      }catch{warnings.push('No s’ha pogut carregar tota la cartografia d’aigua local de l’Aneto.');}
    }
    const vectorLabel=insidePilot?'de bosc':'d’aigua i bosc';
    const vectorUnavailable=`No s’ha pogut carregar la cartografia ${vectorLabel}. Es conserva el relleu.`;
    try{
      const {failures,zoom,tileCount,...vectors}=await loadVectors();
      ({forests,oceans}=vectors);
      if(!insidePilot)({lakes,waterways,waterAreas}=vectors);
      const {provider,license,attribution,url}=RELIEF_WATERWAY_SOURCE;
      vectorCoverage={provider,license,attribution,url,zoom,tileCount,failures};
      if(failures===tileCount)warnings.push(vectorUnavailable);
      else if(failures)warnings.push(`Falten algunes tessel·les de cartografia ${vectorLabel}. Es mostren les dades disponibles.`);
      if(failures<tileCount&&zoom<14)warnings.push(`La cartografia ${vectorLabel} d’aquest retall ampli pot ometre els elements més petits.`);
    }catch{warnings.push(vectorUnavailable);}
    const {models:singularModels,warnings:singularWarnings}=(await singulars)??{models:[],warnings:[]};
    warnings.push(...singularWarnings);
    const detailTerrain=terrainTileSources(singularModels);
    const meta={bbox,name:'Relleu pur',date:new Date().toISOString(),terrain:terrain.metadata,tiles:terrain.tiles.map(({z,x,y})=>({z,x,y})),
      ...(detailTerrain.length?{detailTerrain}:{}),
      coverage:{...RELIEF_COVERAGE_SOURCE,available:!!coverage.length,tiles:coverage.map(t=>t.tile),
        rasters:coverage.map(({tile,bbox,width,height,overview})=>({tile,bbox,width,height,...(overview?{overview:true}:{})}))},
      lakes:{count:lakes.length,...(lakes.length?(insidePilot?RELIEF_LAKE_SOURCE:vectorCoverage):{})},
      waterways:{count:waterways.length,areaCount:waterAreas.length,...(waterways.length||waterAreas.length?(insidePilot?RELIEF_WATERWAY_SOURCE:vectorCoverage):{})},
      oceans:{count:oceans.length,...vectorCoverage},
      forests:{count:forests.length,...vectorCoverage},
      buildings:{count:0},buildingSource:null,sourceWarnings:warnings,pureRelief:true,...(panoramic?{panoramic:true}:{})};
    return {meta,features:[],dem:terrain.tiles,terrainRaster:terrain.raster,coverage,lakes,waterways,waterAreas,forests,oceans,terrainWarnings:warnings,singularModels};
  }
  const base=(import.meta.env?.BASE_URL||'./')+'data/';
  if(typeof sample==='string'&&!recommendedPlace(sample))throw Error('Exemple desconegut.');
  let meta=sample?await time('source.catalog',async()=>(await get(base+(recommendedPlace(sample)?.file||'tamariu.json'))).json(),{provider:'sample'}):{name:'Regió seleccionada',bbox,tiles:tileList(bbox),date:new Date().toISOString()};
  if(sample&&bbox)meta={...meta,bbox};
  const kinds=[];
  if(!localBuildings)kinds.push('building','bridge');
  if(!localDEM){
    kinds.push('landform');
    if(detailSectors)kinds.push('terrain-overview');
  }
  const singulars=kinds.length?time('source.singular-models',()=>loadSingularModels(meta.bbox,kinds,selectionCorners)):null;
  let template;
  if(!sample)template=await time('source.catalog',vectorTemplate,{provider:'OpenFreeMap'});
  let features=[],dem=[],terrainRaster,bridgeDem=[],bridgeFeatures=[],incompleteBridgeIds=[],terrainWarnings=[...(meta.sourceWarnings||[])];
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
    const ocean=oceanTilePredicate(features,meta.bbox);
    const terrain=await time('source.terrain',()=>loadPreferredTerrain(meta.bbox,decodeElevation,fetch,progress,ocean));
    dem=terrain.tiles;terrainRaster=terrain.raster;meta.terrain=terrain.metadata;terrainWarnings=terrain.warnings;
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
    const extra=await time('source.bridge-terrain',async()=>{
      if(!terrainRaster)return loadBridgeTerrain(extension.tiles,terrain,decodeElevation,fetchBridge);
      if(!extension.tiles.length&&!features.some(feature=>feature.properties?.sourceLayer==='transportation'))return {tiles:[],failed:0};
      try{
        const context=await loadTerrain(meta.bbox,decodeElevation,fetchBridge,progress,ocean);
        const exterior=await loadBridgeTerrain(extension.tiles,context,decodeElevation,fetchBridge);
        return {tiles:[...context.tiles,...exterior.tiles],failed:exterior.failed};
      }catch{return {tiles:[],failed:1};}
    },{tiles:extension.tiles.length});
    bridgeDem=extra.tiles;
    if(incompleteBridgeIds.length||extra.failed)terrainWarnings.push('No s’ha pogut completar tota la cartografia de ponts i el relleu dels estreps fora del retall.');
    if(extension.tiles.length||incompleteBridgeIds.length)meta.bridgeCoverage={vectorTiles:extension.tiles,demTiles:bridgeDem.map(({z,x,y})=>({z,x,y})),incompleteBridgeIds,demFailures:extra.failed};
  }
  if(localDEM){meta.terrain=localDEM.metadata;terrainWarnings.push('MDT GeoTIFF local: altituds en metres, datum vertical de la font sense transformar. No es completen buits amb relleu inventat.');}
  meta.elevationDecoding=localDEM?{method:'numeric GeoTIFF raster; no canvas readback',file:localDEM.metadata}:terrainRaster?{method:'numeric ArcGrid; no canvas readback'}:{method:'binary RGB; no canvas readback',tiles:dem.map(t=>({z:t.z,x:t.x,y:t.y,...t.decoding}))};
  meta.localSources={dem:localDEM?.metadata||null,buildings:localBuildings?.metadata||null};
  let infrastructure=null;
  try{infrastructure=await time('source.infrastructure',()=>loadInfrastructureOverrides(meta.bbox,infrastructureJSON));}
  catch(error){terrainWarnings.push('No s’han pogut carregar els detalls específics dels ponts; s’ha omès aquesta millora. '+error.message);}
  const {models:singularModels,warnings:singularWarnings}=(await singulars)??{models:[],warnings:[]};
  const detailTerrain=terrainTileSources(singularModels);
  if(detailTerrain.length)meta.detailTerrain=detailTerrain;
  terrainWarnings.push(...singularWarnings);
  const region={meta,features,vectorFeatures:features,terrainWarnings,dem,terrainRaster,bridgeDem,bridgeFeatures,incompleteBridgeIds,localDEM,infrastructure,singularModels};
  const layer=await loadBuildingsRecoverably(source=>time('source.buildings',()=>loadBuildingLayer(region,{source,localBuildings},progress),{provider:localBuildings?'local':source}),buildingSource||defaultBuildingSource(meta.bbox),localBuildings?[]:buildingFallbacks);
  if(layer.recovery){region.recovery=layer.recovery;region.meta={...region.meta,buildingRecovery:layer.recovery};}
  return applyBuildingLayer(region,layer);
}
