// OpenMapTiles transport classes are distinct from a road tagged class=track.
// Only semantic railway tags select this layer; no geometry-based guessing.
const TYPES=new Set(['rail','light_rail','subway','tram','narrow_gauge','monorail','funicular']);
export function isInactiveRailway(p={}){
  return ['abandoned','disused','razed','construction','proposed'].includes(p.railway)||['abandoned','disused','razed','construction','proposed'].includes(p.subclass)&&(['rail','transit'].includes(p.class)||TYPES.has(p.class));
}
export function isRailway(properties={}){
  const p=properties;
  if(isInactiveRailway(p))return false;
  return TYPES.has(p.class)||TYPES.has(p.railway)||(p.class==='transit'&&TYPES.has(p.subclass));
}
export function railwayOptions(options={}){
  const railRise=options.railRise??0;
  if(![0,.5,1].includes(railRise))throw Error('Relleu dels ferrocarrils invàlid.');
  return {railRise};
}
export function railwayWidthMetres(properties={}){
  const width=Number(properties.width);
  return Number.isFinite(width)&&width>=.5&&width<=40?width:properties.subclass==='tram'||properties.railway==='tram'?3:5;
}
