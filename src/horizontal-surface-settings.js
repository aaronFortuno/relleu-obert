export const HORIZONTAL_SURFACE_REFERENCES=Object.freeze(['mean','min','max']);
export const HORIZONTAL_SURFACE_MATERIALS=Object.freeze(['roads','terrain','grass']);
export const MAX_HORIZONTAL_SURFACES=12;
export const MAX_HORIZONTAL_SURFACE_POINTS=64;
export const MIN_HORIZONTAL_SURFACE_OFFSET_MM=-20;
export const MAX_HORIZONTAL_SURFACE_OFFSET_MM=20;

const validCoordinate=(value,limit)=>Number.isFinite(value)&&Math.abs(value)<=limit;
const invalid=()=>Error('La configuració de les superfícies horitzontals no és vàlida.');

// Points use longitude and latitude. The surface is implicitly closed;
// project the vertices and check the polygon's shape in the geometry engine.
export function normalizeHorizontalSurfaces(surfaces){
  if(!Array.isArray(surfaces)||surfaces.length>MAX_HORIZONTAL_SURFACES)throw invalid();
  return Array.from(surfaces,surface=>{
    const {points,reference,offsetMM,material}=surface??{};
    if(!Array.isArray(points)||points.length<3||points.length>MAX_HORIZONTAL_SURFACE_POINTS||
      !HORIZONTAL_SURFACE_REFERENCES.includes(reference)||!HORIZONTAL_SURFACE_MATERIALS.includes(material)||
      !Number.isFinite(offsetMM)||offsetMM<MIN_HORIZONTAL_SURFACE_OFFSET_MM||offsetMM>MAX_HORIZONTAL_SURFACE_OFFSET_MM)
      throw invalid();
    const seen=new Set();
    const normalized=Array.from(points,point=>{
      if(!Array.isArray(point)||point.length!==2||!validCoordinate(point[0],180)||!validCoordinate(point[1],90))throw invalid();
      const [lon,lat]=point,key=lon+','+lat;
      if(seen.has(key))throw invalid();
      seen.add(key);
      return [lon,lat];
    });
    return {points:normalized,reference,offsetMM,material};
  });
}
