export const BUILDING_MODES=['limited','source','flat','none'];
export function buildingOptions(options={}){
  const {buildingMode='limited',maxBuildingHeight=5}=options;
  const valid=Number.isFinite(maxBuildingHeight)&&maxBuildingHeight>=1&&maxBuildingHeight<=1200;
  if(!BUILDING_MODES.includes(buildingMode)||buildingMode==='limited'&&!valid)throw Error('Configuració d’edificis invàlida: altura màxima entre 1 i 1.200 m.');
  return {buildingMode,maxBuildingHeight:valid?maxBuildingHeight:5};
}
export function buildingRise(height,scale,options){
  const {buildingMode,maxBuildingHeight}=buildingOptions(options);
  if(buildingMode==='none')return 0;
  if(buildingMode==='flat')return .12;
  const metres=Number.isFinite(height)&&height>0&&height<=1200?height:6;
  return (buildingMode==='limited'?Math.min(metres,maxBuildingHeight):metres)*scale;
}
