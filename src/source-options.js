const BUILDING_PROVIDERS={icgc:'ICGC',osm:'OpenStreetMap',catastre:'Catastre · parts (Espanya)'};
export const TERRAIN_REMOTE='Mapterhorn / Mapzen';
export function buildingProviderLabel(source){return Object.hasOwn(BUILDING_PROVIDERS,source)?BUILDING_PROVIDERS[source]:'Font desconeguda';}
export function describeSources({terrainProvider=null,terrainWasLocal=false,buildingSource='osm',localDEM=null,localBuildings=null,pendingTerrain=false,pendingBuildings=false}){
  const terrain=localDEM
    ?{label:`Fitxer propi · ${localDEM.metadata.file}`,pending:pendingTerrain}
    :{label:`${!terrainWasLocal&&terrainProvider||TERRAIN_REMOTE} (font remota)`,pending:pendingTerrain};
  const buildings=localBuildings
    ?{label:`Fitxer propi · ${localBuildings.metadata.file}`,pending:pendingBuildings}
    :{label:`${buildingProviderLabel(buildingSource)} (font remota)`,pending:pendingBuildings};
  return {terrain,buildings};
}
export function clearLocalDecision({hadDEM=false,hadBuildings=false}){
  if(hadDEM)return 'reload';
  if(hadBuildings)return 'buildings';
  return 'none';
}
