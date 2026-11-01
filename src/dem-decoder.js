import {decode as decodePNG} from 'fast-png';
import {decodeTerrarium} from './terrarium.js';

const pngSignature=[137,80,78,71,13,10,26,10];
export function elevationFormat(bytes){
  if(pngSignature.every((n,i)=>bytes[i]===n))return 'png';
  if(bytes.length>=12&&String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP')return 'webp';
  throw Error('La tessel·la d’elevació no és un PNG o WebP vàlid.');
}

// Elevation RGB channels are numbers, not display colours. Never read them
// through a canvas: privacy noise or colour conversion can change the heights.
export async function decodeDEMTile(input,tile,webpDecoder){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input),format=elevationFormat(bytes);
  if(format==='webp'&&typeof webpDecoder!=='function')throw Error('No s’ha carregat el descodificador WebP d’elevació.');
  const raster=format==='webp'?await webpDecoder(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)):decodePNG(bytes,{checkCrc:true});
  const {width,height,data}=raster,channels=format==='webp'?4:raster.channels;
  if(!Number.isInteger(width)||width<2||width>2048||width!==height||![3,4].includes(channels)||(format==='png'&&raster.depth!==8)||data.length!==width*height*channels)throw Error('La tessel·la d’elevació ha de ser quadrada, RGB/RGBA de 8 bits i de mida admesa.');
  let rgba=data;
  if(channels===3){
    rgba=new Uint8Array(width*height*4);const transparent=raster.transparency;
    for(let i=0;i<width*height;i++){const r=data[i*3],g=data[i*3+1],b=data[i*3+2];rgba.set([r,g,b,transparent?.length===3&&transparent[0]===r&&transparent[1]===g&&transparent[2]===b?0:255],i*4);}
  }
  const elev=decodeTerrarium(rgba);let min=Infinity,max=-Infinity,valid=0;
  for(const value of elev)if(Number.isFinite(value)){valid++;min=Math.min(min,value);max=Math.max(max,value);}
  const digest=globalThis.crypto?.subtle?await crypto.subtle.digest('SHA-256',bytes):null;
  const sha256=digest?Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''):null;
  return {...tile,size:width,elev,decoding:{format,codec:format==='webp'?'libwebp-wasm':'fast-png',sha256,width,height,validSamples:valid,invalidSamples:elev.length-valid,minMeters:valid?min:null,maxMeters:valid?max:null}};
}
