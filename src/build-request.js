export function buildRequest(target,options){
  const {meta,features,dem,terrainRaster,localDEM,bridgeDem,bridgeFeatures,incompleteBridgeIds,
    infrastructure,coverage,lakes,waterways,waterAreas,forests,oceans}=target;
  return {type:'build',region:{meta,features,dem,terrainRaster,localDEM,bridgeDem,bridgeFeatures,
    incompleteBridgeIds,infrastructure,coverage,lakes,waterways,waterAreas,forests,oceans},options};
}
