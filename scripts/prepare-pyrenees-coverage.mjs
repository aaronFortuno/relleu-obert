import {writeFile} from 'node:fs/promises';
import {fromUrl} from 'geotiff';
import {zlibSync} from 'fflate';
import {PYRENEES_COVERAGE,PYRENEES_COVERAGE_FILE} from '../src/relief-coverage.js';

const {bbox:[west,south,east,north],width,height}=PYRENEES_COVERAGE;
const columnsPerDegree=width/(east-west),rowsPerDegree=height/(north-south);
const coverage=new Uint8Array(width*height);
const source='https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/';

for(const latitude of [39,42]){
  for(const longitude of [-3,0,3]){
    const tile=`N${latitude}${longitude<0?'W':'E'}${String(Math.abs(longitude)).padStart(3,'0')}`;
    const w=Math.max(west,longitude),s=Math.max(south,latitude);
    const e=Math.min(east,longitude+3),n=Math.min(north,latitude+3);
    const columns=Math.round((e-w)*columnsPerDegree),rows=Math.round((n-s)*rowsPerDegree);
    const left=Math.round((w-west)*columnsPerDegree),top=Math.round((north-n)*rowsPerDegree);
    const url=`${source}ESA_WorldCover_10m_2021_v200_${tile}_Map.tif`;
    const signal=AbortSignal.timeout(30000);
    const tiff=await fromUrl(url,{allowFullFile:false},signal);
    try{
      // Request only the relevant window at the target resolution, using the internal overviews.
      const values=await tiff.readRasters({
        bbox:[w,s,e,n],width:columns,height:rows,interleave:true,resampleMethod:'nearest',signal
      });
      for(let row=0;row<rows;row++){
        for(let column=0;column<columns;column++){
          const value=values[row*columns+column];
          if(value===60||value===70)coverage[(top+row)*width+left+column]=value;
        }
      }
      console.log(tile,`${columns} × ${rows}`);
    }finally{
      await tiff.close();
    }
  }
}

if(!coverage.includes(60)||!coverage.includes(70))throw Error('La cobertura no conté les dues classes esperades.');
const bytes=zlibSync(coverage);
if(bytes.length>250000)throw Error('La cobertura comprimida supera els 250 kB.');
await writeFile(new URL('../public/'+PYRENEES_COVERAGE_FILE,import.meta.url),bytes);
console.log(`${PYRENEES_COVERAGE_FILE} · ${bytes.length} bytes`);
