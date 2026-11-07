import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {fromUrl} from 'geotiff';
import {zlibSync} from 'fflate';
import {
  ALPS_COVERAGE,ALPS_COVERAGE_FILE,FUJI_COVERAGE,FUJI_COVERAGE_FILE,GEIRANGER_COVERAGE,GEIRANGER_COVERAGE_FILE,
  LAVAREDO_COVERAGE,LAVAREDO_COVERAGE_FILE
} from '../src/relief-coverage.js';

const source='https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/';
const degreeId=(value,negative,positive,digits)=>`${value<0?negative:positive}${String(Math.abs(value)).padStart(digits,'0')}`;

export async function prepareRegionalWorldCover({bbox:[west,south,east,north],width,height},file){
  const columnsPerDegree=width/(east-west),rowsPerDegree=height/(north-south);
  const coverage=new Uint8Array(width*height);
  for(let latitude=Math.floor(south/3)*3;latitude<north;latitude+=3){
    for(let longitude=Math.floor(west/3)*3;longitude<east;longitude+=3){
      const tile=degreeId(latitude,'S','N',2)+degreeId(longitude,'W','E',3);
      const w=Math.max(west,longitude),s=Math.max(south,latitude);
      const e=Math.min(east,longitude+3),n=Math.min(north,latitude+3);
      const left=Math.round((w-west)*columnsPerDegree),top=Math.round((north-n)*rowsPerDegree);
      const columns=Math.round((e-west)*columnsPerDegree)-left;
      const rows=Math.round((north-s)*rowsPerDegree)-top;
      const url=`${source}ESA_WorldCover_10m_2021_v200_${tile}_Map.tif`;
      const signal=AbortSignal.timeout(30000);
      const tiff=await fromUrl(url,{allowFullFile:false},signal);
      try{
        // Use nearest-neighbour resampling on the TIFF's internal overviews.
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
  if(!coverage.includes(60))throw Error('La cobertura no conté sòl nu o vegetació escassa.');
  const bytes=zlibSync(coverage);
  if(bytes.length>250000)throw Error('La cobertura comprimida supera els 250 kB.');
  await writeFile(new URL('../public/'+file,import.meta.url),bytes);
  console.log(`${file} · ${bytes.length} bytes · neu o gel: ${coverage.includes(70)?'sí':'no'}`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const areas={
    alps:[ALPS_COVERAGE,ALPS_COVERAGE_FILE],lavaredo:[LAVAREDO_COVERAGE,LAVAREDO_COVERAGE_FILE],
    fuji:[FUJI_COVERAGE,FUJI_COVERAGE_FILE],geiranger:[GEIRANGER_COVERAGE,GEIRANGER_COVERAGE_FILE]
  };
  const ids=process.argv.slice(2);
  if(!ids.length||ids.some(id=>!Object.hasOwn(areas,id)))throw Error('Tria un retall: '+Object.keys(areas).join(', '));
  for(const id of ids)await prepareRegionalWorldCover(...areas[id]);
}
