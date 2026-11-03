import {unzlibSync} from 'fflate';

export const RELIEF_COVERAGE_SOURCE={
  provider:'ESA WorldCover 2021 v200',
  url:'https://esa-worldcover.org/en/data-access',
  citation:'https://doi.org/10.5281/zenodo.7254221',
  license:'CC BY 4.0',
  classes:{60:'Bare / sparse vegetation',70:'Snow and ice'}
};
export const ANETO_COVERAGE={bbox:[.30,42.36,1,42.91],width:2048,height:2048,tile:'N42E000'};
export const ANETO_COVERAGE_FILE='data/aneto-worldcover-2021-2048.bin.zlib';
export const ANETO_LAKE_BOUNDS=[.29,42.35,1.01,42.92];
export const ANETO_LAKE_FILE='data/aneto-lakes.geojson';
export const RELIEF_LAKE_SOURCE={
  provider:'OpenStreetMap · OpenFreeMap',license:'ODbL',
  attribution:'© OpenStreetMap contributors',url:'https://www.openstreetmap.org/copyright',
  bounds:ANETO_LAKE_BOUNDS
};

export async function loadReliefLakes(bbox,fetcher=fetch){
  const [w,s,e,n]=ANETO_LAKE_BOUNDS;
  if(bbox[0]>=e||bbox[2]<=w||bbox[1]>=n||bbox[3]<=s)return [];
  const base=import.meta.env?.BASE_URL||'./';
  const response=await fetcher(base+ANETO_LAKE_FILE,{signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error(`Llacs de l’Aneto: HTTP ${response.status}.`);
  const data=await response.json();
  if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('La cartografia de llacs és invàlida.');
  return data.features.filter(({geometry})=>{
    const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
    return polygons.some(([ring])=>{
      let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
      for(const [x,y] of ring){
        left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);
      }
      return left<bbox[2]&&right>bbox[0]&&bottom<bbox[3]&&top>bbox[1];
    });
  });
}

export async function loadReliefCoverage(bbox,fetcher=fetch){
  const {bbox:[w,s,e,n],width,height}=ANETO_COVERAGE;
  if(bbox[0]>=e||bbox[2]<=w||bbox[1]>=n||bbox[3]<=s)return [];
  const base=import.meta.env?.BASE_URL||'./';
  const response=await fetcher(base+ANETO_COVERAGE_FILE,{signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error(`WorldCover: HTTP ${response.status}.`);
  const values=unzlibSync(new Uint8Array(await response.arrayBuffer()));
  if(values.length!==width*height)throw Error('La cobertura WorldCover té una mida invàlida.');
  return [{...ANETO_COVERAGE,values}];
}
