export const DEFAULT_BASE_THICKNESS_MM=5;
export const MIN_BASE_THICKNESS_MM=2;
export const MAX_BASE_THICKNESS_MM=30;
export const BAMBU_PROJECT_BED_MM=256;

export function validBaseThickness(value){
  return Number.isFinite(value)&&value>=MIN_BASE_THICKNESS_MM&&value<=MAX_BASE_THICKNESS_MM&&Number.isInteger(value*2);
}

// Whitespace separates pieces, leaving either decimal mark available.
export function parsePrintBands(text){
  const input=text.trim();
  if(!input)return undefined;
  const bands=input.split(/\s*\+\s*|\s+/);
  if(bands.some(band=>!/^\d{1,3}(?:[,.]\d)?$/.test(band)))return null;
  return bands.map(band=>Math.round(Number(band.replace(',','.'))*10));
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
