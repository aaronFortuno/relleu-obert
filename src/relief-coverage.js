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
