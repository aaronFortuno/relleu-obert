// Shared carriageway policy for surface roads, estimated decks and tunnel
// pavement. It is distinct from surveyed structural outlines and bore size.
const WIDTHS=new Map([['motorway',14],['trunk',10],['primary',10],['secondary',10],['tertiary',10]]);
const isLink=p=>p.ramp===1||p.ramp==='1'||p.ramp===true||String(p.class??'').endsWith('_link');

export function roadWidthMetres(properties={}){
  const width=Number(properties.width),lanes=Number(properties.lanes);
  if(Number.isFinite(width)&&width>=.5&&width<=60)return width;
  // Decimal lane widths must compare equal to an explicit width such as 9.6;
  // avoid a 9.600000000000001 group splitting a three-lane continuation.
  if(Number.isInteger(lanes)&&lanes>=1&&lanes<=12)return Math.min(lanes*32,384)/10;
  return isLink(properties)?7:WIDTHS.get(properties.class)??4;
}

export function roadWidthMM(properties,scale,{minimumMM=.44}={}){
  if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(minimumMM)||minimumMM<=0)
    throw Error('Escala o amplada mínima de calçada invàlida.');
  return Math.max(minimumMM,roadWidthMetres(properties)*scale);
}
