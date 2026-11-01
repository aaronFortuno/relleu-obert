import decodeWebp,{init} from '@jsquash/webp/decode.js';
import wasmURL from '@jsquash/webp/codec/dec/webp_dec.wasm?url';
import {decodeDEMTile} from './dem-decoder.js';

let configured=false;
async function webpPixels(bytes){
  if(!configured){await init({locateFile:()=>wasmURL});configured=true;}
  try{return await decodeWebp(bytes);}catch(error){configured=false;throw error;}
}
export async function decodeDEM(blob,tile){
  return decodeDEMTile(await blob.arrayBuffer(),tile,webpPixels);
}
