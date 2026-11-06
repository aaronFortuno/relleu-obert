import {writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {polygonOps} from '../src/polygon-ops.js';

// All three editions have records in the 36 municipalities covered by the series.
const layer='https://ide.amb.cat/geoserveispi/rest/services/Hosted/SHP_Municipis/FeatureServer/0/query';
const params=new URLSearchParams({f:'geojson',where:'1=1',outFields:'codi_ine',outSR:4326,
  geometryPrecision:6,orderByFields:'codi_ine ASC'});
const response=await fetch(`${layer}?${params}`,{signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error(`AMB HTTP ${response.status}`);
const data=await response.json();
if(data.type!=='FeatureCollection'||data.properties?.exceededTransferLimit||data.features?.length!==36||
  new Set(data.features.map(f=>f.properties.codi_ine)).size!==36)throw Error('Incomplete AMB municipal boundary.');

const ops=polygonOps(1e-9),tilesPerDegree=16;
function ringArea(ring){
  const [x,y]=ring[0];
  let twice=0;
  for(let i=1;i<ring.length;i++){
    const [a,b]=ring[i-1],[c,d]=ring[i];
    twice+=(a-x)*(d-y)-(b-y)*(c-x);
  }
  return Math.abs(twice)/2;
}
// Adjacent municipal geometries leave centimetre-wide slivers along their
// shared edges. Drop only holes below about 100 m² in this coverage mask.
const coverage=ops.union(...data.features.map(({geometry})=>geometry.coordinates))
  .map(([outer,...holes])=>[outer,...holes.filter(ring=>ringArea(ring)>1e-8)]);
const bbox=[Infinity,Infinity,-Infinity,-Infinity];
for(const polygon of coverage)for(const ring of polygon)for(const [x,y] of ring){
  bbox[0]=Math.min(bbox[0],x);bbox[1]=Math.min(bbox[1],y);
  bbox[2]=Math.max(bbox[2],x);bbox[3]=Math.max(bbox[3],y);
}
const [w,s,e,n]=bbox,partial={};
for(let x=Math.floor(w*tilesPerDegree);x<Math.ceil(e*tilesPerDegree);x++){
  for(let y=Math.floor(s*tilesPerDegree);y<Math.ceil(n*tilesPerDegree);y++){
    const a=x/tilesPerDegree,b=y/tilesPerDegree,c=(x+1)/tilesPerDegree,d=(y+1)/tilesPerDegree;
    const cell=ops.intersection(coverage,[[[a,b],[c,b],[c,d],[a,d],[a,b]]]);
    if(cell.length)partial[`${x}-${y}`]=cell;
  }
}
const mask={tilesPerDegree,bbox,full:[],partial,source:layer};
const bytes=gzipSync(JSON.stringify(mask),{level:9});
await writeFile(new URL('../public/data/historical/amb-urban-coverage.json.gz',import.meta.url),bytes);
console.log(`AMB coverage: 36 municipalities, ${Object.keys(partial).length} cells, ${bytes.length} B`);
