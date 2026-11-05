import {lonLatTile} from './elevation.js';
import {scaledBBox,selectionPose} from './selection.js';
export const VECTOR_ZOOM=14,MAX_REGION_TILES=16;
export function regionTileCount(bbox,z=VECTOR_ZOOM){
  const [w,s,e,n]=bbox;if(!bbox.every(Number.isFinite)||w>=e||s>=n||Math.abs(w)>180||Math.abs(e)>180||Math.abs(s)>70||Math.abs(n)>70)return Infinity;
  const a=lonLatTile(w,n,z),b=lonLatTile(e,s,z);return (Math.floor(b[0])-Math.floor(a[0])+1)*(Math.floor(b[1])-Math.floor(a[1])+1);
}
export function maxRegionScale(center,widthMM,heightMM,rotation=0){
  let low=100,high=100000;if(regionTileCount(selectionPose(scaledBBox(center,widthMM,heightMM,low),rotation).bbox)>MAX_REGION_TILES)return null;
  for(let i=0;i<28;i++){const mid=(low+high)/2,b=selectionPose(scaledBBox(center,widthMM,heightMM,mid),rotation).bbox;if(regionTileCount(b)<=MAX_REGION_TILES)low=mid;else high=mid;}
  return Math.floor(low/100)*100;
}
const defaultLimitMessage=max=>`L’àrea seleccionada supera la capacitat actual de càrrega.${max?` Per a aquesta mida i orientació, tria aproximadament 1:${max.toLocaleString('ca')} o una escala més detallada.`:''} També pots reduir la mida de la peça o apropar el mapa.`;
export function regionLimitMessage(pose,widthMM,heightMM,formatMessage=defaultLimitMessage){
  if(regionTileCount(pose.bbox)<=MAX_REGION_TILES)return '';
  return formatMessage(maxRegionScale(pose.center,widthMM,heightMM,pose.rotation));
}
