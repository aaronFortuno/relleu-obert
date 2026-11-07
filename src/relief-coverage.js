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
export const PYRENEES_COVERAGE={bbox:[-2.55,41.7,3.75,43.8],width:1512,height:504,tile:'Pirineus',overview:true};
export const PYRENEES_COVERAGE_FILE='data/pirineus-worldcover-2021-1512x504.bin.zlib';
export const ALPS_COVERAGE={bbox:[5.4,43.5,16.8,48],width:2736,height:1080,tile:'Alps',overview:true};
export const ALPS_COVERAGE_FILE='data/alps-worldcover-2021-2736x1080.bin.zlib';
export const LAVAREDO_COVERAGE={bbox:[12.15,46.48,12.45,46.77],width:1440,height:1392,tile:'Lavaredo'};
export const LAVAREDO_COVERAGE_FILE='data/lavaredo-worldcover-2021-1440x1392.bin.zlib';
export const FUJI_COVERAGE={bbox:[138.4,35.1,139.05,35.63],width:1560,height:1272,tile:'Fuji'};
export const FUJI_COVERAGE_FILE='data/fuji-worldcover-2021-1560x1272.bin.zlib';
export const GEIRANGER_COVERAGE={bbox:[6.6,61.98,7.65,62.5],width:1260,height:624,tile:'Geiranger'};
export const GEIRANGER_COVERAGE_FILE='data/geiranger-worldcover-2021-1260x624.bin.zlib';
const LOCAL_RASTERS=[
  [ANETO_COVERAGE,ANETO_COVERAGE_FILE],
  [LAVAREDO_COVERAGE,LAVAREDO_COVERAGE_FILE],
  [FUJI_COVERAGE,FUJI_COVERAGE_FILE],
  [GEIRANGER_COVERAGE,GEIRANGER_COVERAGE_FILE],
  [PYRENEES_COVERAGE,PYRENEES_COVERAGE_FILE],
  [ALPS_COVERAGE,ALPS_COVERAGE_FILE]
];
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
  const intersects=({bbox:[w,s,e,n]})=>bbox[0]<e&&bbox[2]>w&&bbox[1]<n&&bbox[3]>s;
  const contains=({bbox:[w,s,e,n]})=>bbox[0]>=w&&bbox[1]>=s&&bbox[2]<=e&&bbox[3]<=n;
  // The sampler uses the first raster at each point. Keep detailed masks first.
  const rasters=LOCAL_RASTERS.filter(([raster])=>intersects(raster));
  const complete=rasters.findIndex(([raster])=>contains(raster));
  if(complete>=0)rasters.length=complete+1;
  const base=import.meta.env?.BASE_URL||'./';
  const results=await Promise.allSettled(rasters.map(async ([raster,file])=>{
    const response=await fetcher(base+file,{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error(`WorldCover: HTTP ${response.status}.`);
    const values=unzlibSync(new Uint8Array(await response.arrayBuffer()));
    if(values.length!==raster.width*raster.height)throw Error('La cobertura WorldCover té una mida invàlida.');
    return {...raster,values};
  }));
  const available=results.flatMap(result=>result.status==='fulfilled'?[result.value]:[]);
  if(results.length&&!available.length)throw results[0].reason;
  return available;
}
