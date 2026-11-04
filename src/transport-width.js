// Shared carriageway policy for surface roads, estimated decks and tunnel
// pavement. It is distinct from surveyed structural outlines and bore size.
const WIDTHS=new Map([
  ['motorway',14],['trunk',10],['primary',10],['secondary',8],['tertiary',6],
  ['minor',5],['residential',5],['unclassified',4.5],['living_street',4.5],
  ['service',3.5],['track',3],['path',2],['cycleway',2.5]
]);
const isLink=p=>p.ramp===1||p.ramp==='1'||p.ramp===true||String(p.class??'').endsWith('_link');
const MAIN_ROADS=new Set(['motorway','trunk','primary']);
const SECONDARY_ROADS=new Set(['secondary','tertiary']);
const TRAIL_WIDTHS=new Map([['path',1],['footway',1.5],['steps',1.5]]);
const trailClass=({class:roadClass,subclass})=>roadClass==='path'&&['cycleway','bridleway'].includes(subclass)?null:
  roadClass==='path'&&TRAIL_WIDTHS.has(subclass)?subclass:roadClass;
const DETAIL_FLOOR_MM=.44;
export const MIN_ROAD_WIDTH_MM=.36;
export const MIN_TRAIL_WIDTH_MM=.30;
export const TRAIL_WIDTH_MULTIPLIERS=Object.freeze([.75,1,1.5,2]);
export const roadWidthMultiplier=(properties,multiplier)=>TRAIL_WIDTHS.has(trailClass(properties))&&TRAIL_WIDTH_MULTIPLIERS.includes(multiplier)?multiplier:1;

export function mappedRoadWidthMetres(properties={}){
  const width=Number(properties.width),minimum=TRAIL_WIDTHS.has(trailClass(properties)) ? .25 : .5;
  return Number.isFinite(width)&&width>=minimum&&width<=60?width:null;
}

export function roadWidthMetres(properties={}){
  const width=mappedRoadWidthMetres(properties),lanes=Number(properties.lanes);
  if(width!==null)return width;
  // Decimal lane widths must compare equal to an explicit width such as 9.6;
  // avoid a 9.600000000000001 group splitting a three-lane continuation.
  if(Number.isInteger(lanes)&&lanes>=1&&lanes<=12)return Math.min(lanes*32,384)/10;
  if(isLink(properties))return 7;
  // A mapped one-way motorway is normally one carriageway. Using the full
  // class width for both axes can overlap adjacent pavement surfaces.
  if(properties.class==='motorway'&&[true,1,-1,'1','-1','yes','true'].includes(properties.oneway))return 10;
  return TRAIL_WIDTHS.get(trailClass(properties))??WIDTHS.get(properties.class)??4;
}

export function roadMinimumWidthMM(properties={},scale,{trailWidth=1}={}){
  if(!Number.isFinite(scale)||scale<=0)throw Error('Escala o amplada mínima de calçada invàlida.');
  if(TRAIL_WIDTHS.has(trailClass(properties)))return MIN_TRAIL_WIDTH_MM*roadWidthMultiplier(properties,trailWidth);
  if(isLink(properties)||MAIN_ROADS.has(properties.class))return DETAIL_FLOOR_MM;
  const distantFloor=SECONDARY_ROADS.has(properties.class) ? .40 : MIN_ROAD_WIDTH_MM;
  // At and below 1:10,000 keep the close-view floor. Taper it continuously
  // towards 1:20,000 to keep small ways from looking like main roads.
  const distance=Math.max(0,Math.min(1,(.1-scale)/.05));
  return DETAIL_FLOOR_MM+(distantFloor-DETAIL_FLOOR_MM)*distance;
}

export function roadWidthMM(properties={},scale,{trailWidth=1,minimumMM=roadMinimumWidthMM(properties,scale,{trailWidth})}={}){
  if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(minimumMM)||minimumMM<=0)
    throw Error('Escala o amplada mínima de calçada invàlida.');
  return Math.max(minimumMM,roadWidthMetres(properties)*roadWidthMultiplier(properties,trailWidth)*scale);
}
