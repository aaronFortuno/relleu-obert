import {physicalBBox} from './selection.js';
export const DEFAULT_PLACE='eix-diagonal';
export const RECOMMENDED_PLACES=[
  {id:'eix-diagonal',name:'Viaducte de l’Eix Diagonal (Bages)',labelTitle:'Eix Diagonal',center:[41.71792,1.78391],bbox:physicalBBox([41.71792,1.78391],1.5,1.5),file:'eix-diagonal.json'},
  {id:'tamariu',name:'Badia (Tamariu, Baix Empordà)',labelTitle:'Badia de Tamariu',center:[41.918,3.2075],bbox:physicalBBox([41.918,3.2075],1.78112,1.78112),file:'tamariu.json'}
];
export const recommendedPlace=id=>RECOMMENDED_PLACES.find(p=>p.id===id);
export function placeSelection(id,width=150,height=150){
  const place=recommendedPlace(id);
  if(!place||![width,height].every(v=>Number.isFinite(v)&&v>0))throw Error('Selecció d’exemple invàlida.');
  const span=(place.bbox[3]-place.bbox[1])*111.32;
  return physicalBBox(place.center,span*Math.min(1,width/height),span*Math.min(1,height/width));
}
