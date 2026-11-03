import {writeFile} from 'node:fs/promises';
import {fromUrl} from 'geotiff';
import {zlibSync} from 'fflate';
import {ANETO_COVERAGE,ANETO_COVERAGE_FILE} from '../src/relief-coverage.js';

const {tile,bbox,width,height}=ANETO_COVERAGE;
const url=`https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_${tile}_Map.tif`;
const signal=AbortSignal.timeout(30000),tiff=await fromUrl(url,{allowFullFile:false},signal);
const values=await tiff.readRasters({bbox,width,height,interleave:true,resampleMethod:'nearest',signal});
const coverage=Uint8Array.from(values,value=>value===60||value===70?value:0);
if(!coverage.includes(60)||!coverage.includes(70))throw Error('La mostra no conté les dues classes esperades.');
await writeFile(new URL('../public/'+ANETO_COVERAGE_FILE,import.meta.url),zlibSync(coverage));
