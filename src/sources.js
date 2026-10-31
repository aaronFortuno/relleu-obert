import {VectorTile} from '@mapbox/vector-tile';
import Pbf from 'pbf';

export const lonLatTile=(lon,lat,z=14)=>[(lon+180)/360*2**z,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**z];
export function tileList(bbox,z=14){
  const a=lonLatTile(bbox[0],bbox[3],z),b=lonLatTile(bbox[2],bbox[1],z),out=[];
  for(let x=Math.floor(a[0]);x<=Math.floor(b[0]);x++)for(let y=Math.floor(a[1]);y<=Math.floor(b[1]);y++)out.push({z,x,y});
  if(out.length>16)throw Error('Selecciona una zona més petita: màxim 16 tessel·les per prova.');return out;
}
export function readVector(bytes,{x,y,z}){
  const tile=new VectorTile(new Pbf(bytes)),features=[];
  for(const name of ['water','landcover','landuse','transportation','building']){
    const layer=tile.layers[name];if(!layer)continue;
    for(let i=0;i<layer.length;i++){const f=layer.feature(i).toGeoJSON(x,y,z);f.properties.sourceLayer=name;features.push(f);}
  }return features;
}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(`No s'han pogut carregar les dades (${r.status}). Torna-ho a provar més tard.`);return r;}
async function decodeDEM(blob,t){
  const image=await createImageBitmap(blob);const c=new OffscreenCanvas(image.width,image.height),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);image.close();
  const rgba=ctx.getImageData(0,0,c.width,c.height).data,elev=new Float32Array(c.width*c.height);
  for(let i=0;i<elev.length;i++)elev[i]=rgba[4*i]*256+rgba[4*i+1]+rgba[4*i+2]/256-32768;
  return {...t,size:c.width,elev};
}
export async function loadRegion({sample=true,bbox},progress=()=>{}){
  const base=import.meta.env.BASE_URL+'data/';
  let meta=sample?await(await get(base+'tamariu.json')).json():{name:'Regió seleccionada',bbox,tiles:tileList(bbox),date:new Date().toISOString()};
  let template;if(!sample)template=(await(await get('https://tiles.openfreemap.org/planet')).json()).tiles[0];
  const features=[],dem=[];
  // Sequential tile pairs keep resource use and public-service load bounded.
  for(let i=0;i<meta.tiles.length;i++){
    const t=meta.tiles[i];progress(`Carregant dades ${i+1}/${meta.tiles.length}…`);
    const vectorURL=sample?base+t.vector:template.replace('{z}',t.z).replace('{x}',t.x).replace('{y}',t.y);
    const demURL=sample?base+t.dem:`https://tiles.mapterhorn.com/${t.z}/${t.x}/${t.y}.webp`;
    features.push(...readVector(new Uint8Array(await(await get(vectorURL)).arrayBuffer()),t));
    dem.push(await decodeDEM(await(await get(demURL)).blob(),t));
  }
  return {meta,features,dem};
}
