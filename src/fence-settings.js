export const FENCE_MIN_WIDTH_MM=.8;
export const FENCE_MAX_WIDTH_MM=4;
export const FENCE_DEFAULT_WIDTH_MM=1.2;
export const FENCE_MIN_HEIGHT_MM=.6;
export const FENCE_MAX_HEIGHT_MM=8;
export const FENCE_DEFAULT_HEIGHT_MM=2.4;
export const MAX_FENCES=32;
export const MAX_FENCE_POINTS=128;

const coordinateInRange=(value,limit)=>Number.isFinite(value)&&Math.abs(value)<=limit;
const inRange=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const samePoint=(a,b)=>a[0]===b[0]&&a[1]===b[1];

// Coordinates are longitude and latitude. The closing point is represented
// by the flag rather than repeated, so point-by-point editing stays reversible.
export function normalizeFences(fences){
  const invalid=()=>Error('Les tanques no tenen un format vàlid.');
  if(!Array.isArray(fences)||fences.length>MAX_FENCES)throw invalid();
  return Array.from(fences,fence=>{
    const {points,widthMM,heightMM,closed}=fence??{};
    if(typeof closed!=='boolean'||!Array.isArray(points)||points.length<(closed?3:2)||points.length>MAX_FENCE_POINTS||
      !inRange(widthMM,FENCE_MIN_WIDTH_MM,FENCE_MAX_WIDTH_MM)||!inRange(heightMM,FENCE_MIN_HEIGHT_MM,FENCE_MAX_HEIGHT_MM))
      throw invalid();
    const clean=Array.from(points,point=>{
      if(!Array.isArray(point)||point.length!==2||!coordinateInRange(point[0],180)||!coordinateInRange(point[1],90))throw invalid();
      return [point[0],point[1]];
    });
    if(clean.some((p,i)=>i&&samePoint(p,clean[i-1]))||closed&&
      (samePoint(clean[0],clean.at(-1))||new Set(clean.map(p=>p.join(','))).size<3))
      throw invalid();
    return {points:clean,widthMM,heightMM,closed};
  });
}
