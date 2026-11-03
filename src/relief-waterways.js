import {strFromU8,unzlibSync} from 'fflate';
import {ANETO_LAKE_BOUNDS} from './relief-coverage.js';

export const ANETO_WATERWAY_FILE='data/aneto-waterways.geojson.zlib';
export const RELIEF_WATERWAY_SOURCE={
  provider:'OpenStreetMap · OpenFreeMap',license:'ODbL',
  attribution:'© OpenStreetMap contributors',url:'https://www.openstreetmap.org/copyright',
  bounds:ANETO_LAKE_BOUNDS
};

const overlaps=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
export const overlapsWaterwayCoverage=bbox=>overlaps(bbox,ANETO_LAKE_BOUNDS);

export async function loadReliefWaterways(bbox,fetcher=fetch){
  if(!overlapsWaterwayCoverage(bbox))return [];
  const base=import.meta.env?.BASE_URL||'./';
  const response=await fetcher(base+ANETO_WATERWAY_FILE,{signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Rius de l’Aneto: HTTP '+response.status+'.');
  const data=JSON.parse(strFromU8(unzlibSync(new Uint8Array(await response.arrayBuffer()))));
  if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('La cartografia de rius és invàlida.');
  return data.features.filter(feature=>overlaps(bbox,feature.bbox));
}
