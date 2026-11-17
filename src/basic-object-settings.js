export const BASIC_OBJECT_SHAPES=Object.freeze(['box','cylinder','sphere']);
export const MAX_BASIC_OBJECTS=32;
export const MIN_BASIC_OBJECT_SIZE_MM=.8;
export const MAX_BASIC_OBJECT_SIZE_MM=80;

export function normalizeBasicObjects(objects){
  const invalid=()=>Error('La configuració dels objectes no és vàlida.');
  if(!Array.isArray(objects)||objects.length>MAX_BASIC_OBJECTS)throw invalid();
  return Array.from(objects,item=>{
    const {shape,position,widthMM,depthMM,heightMM,rotation}=item??{};
    if(!BASIC_OBJECT_SHAPES.includes(shape)||!Array.isArray(position)||position.length!==2||
      !position.every(Number.isFinite)||Math.abs(position[0])>180||Math.abs(position[1])>90||
      ![widthMM,depthMM,heightMM].every(v=>Number.isFinite(v)&&v>=MIN_BASIC_OBJECT_SIZE_MM&&v<=MAX_BASIC_OBJECT_SIZE_MM)||
      !Number.isFinite(rotation)||rotation < -180||rotation>180)throw invalid();
    return {shape,position:[...position],widthMM,depthMM,heightMM,rotation};
  });
}
