// Numeric Terrarium RGB encoding, independent of maps, rendering and the DOM.
export function decodeTerrarium(rgba){
  const result=new Float32Array(rgba.length/4);
  for(let i=0;i<result.length;i++){
    const h=rgba[i*4]*256+rgba[i*4+1]+rgba[i*4+2]/256-32768;
    result[i]=rgba[i*4+3]!==255||h < -12000||h > 9000?NaN:h;
  }
  return result;
}
