export const DEFAULT_BASE_THICKNESS_MM=5;
export const MIN_BASE_THICKNESS_MM=2;
export const MAX_BASE_THICKNESS_MM=30;
export const BAMBU_PROJECT_BED_MM=256;

export function validBaseThickness(value){
  return Number.isFinite(value)&&value>=MIN_BASE_THICKNESS_MM&&value<=MAX_BASE_THICKNESS_MM&&Number.isInteger(value*2);
}

export function fitsBambuProject(plan){
  return plan.tiles.every(({width,height})=>width<=BAMBU_PROJECT_BED_MM&&height<=BAMBU_PROJECT_BED_MM);
}

export function printExportFormat(requested,plan){
  const split=plan.tiles.length>1;
  if(requested==='bambu-zip'&&!split)requested='bambu';
  if(requested==='bambu'&&!fitsBambuProject(plan))return split?'bambu-zip':'3mf';
  return requested;
}
