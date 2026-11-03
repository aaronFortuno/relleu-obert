// Shared carriageway policy for surface roads, estimated decks and tunnel
// pavement. It is distinct from surveyed structural outlines and bore size.
const WIDTHS=new Map([
  ['motorway',14],['trunk',10],['primary',10],['secondary',8],['tertiary',6],
  ['minor',5],['residential',5],['unclassified',4.5],['living_street',4.5],
  ['service',3.5],['track',3],['path',2],['footway',2],['cycleway',2.5],['steps',1.5]
]);
const isLink=p=>p.ramp===1||p.ramp==='1'||p.ramp===true||String(p.class??'').endsWith('_link');
const MAIN_ROADS=new Set(['motorway','trunk','primary']);
const SECONDARY_ROADS=new Set(['secondary','tertiary']);
const DETAIL_FLOOR_MM=.44;
export const MIN_ROAD_WIDTH_MM=.36;

export function roadWidthMetres(properties={}){
  const width=Number(properties.width),lanes=Number(properties.lanes);
  if(Number.isFinite(width)&&width>=.5&&width<=60)return width;
  // Decimal lane widths must compare equal to an explicit width such as 9.6;
  // avoid a 9.600000000000001 group splitting a three-lane continuation.
  if(Number.isInteger(lanes)&&lanes>=1&&lanes<=12)return Math.min(lanes*32,384)/10;
  return isLink(properties)?7:WIDTHS.get(properties.class)??4;
}

export function roadMinimumWidthMM(properties={},scale){
  if(!Number.isFinite(scale)||scale<=0)throw Error('Escala o amplada mínima de calçada invàlida.');
  if(isLink(properties)||MAIN_ROADS.has(properties.class))return DETAIL_FLOOR_MM;
  const distantFloor=SECONDARY_ROADS.has(properties.class) ? .40 : MIN_ROAD_WIDTH_MM;
  // At and below 1:10,000 keep the close-view floor. Taper it continuously
  // towards 1:20,000 to keep small ways from looking like main roads.
  const distance=Math.max(0,Math.min(1,(.1-scale)/.05));
  return DETAIL_FLOOR_MM+(distantFloor-DETAIL_FLOOR_MM)*distance;
}

export function roadWidthMM(properties,scale,{minimumMM=roadMinimumWidthMM(properties,scale)}={}){
  if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(minimumMM)||minimumMM<=0)
    throw Error('Escala o amplada mínima de calçada invàlida.');
  return Math.max(minimumMM,roadWidthMetres(properties)*scale);
}
