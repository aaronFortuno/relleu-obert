import {writeFile} from 'node:fs/promises';
import {strToU8,zlibSync} from 'fflate';
import {lonLatTile,readVector} from '../src/sources.js';
import {ANETO_WATERWAY_FILE,RELIEF_WATERWAY_SOURCE} from '../src/relief-waterways.js';

const bounds=RELIEF_WATERWAY_SOURCE.bounds;
const get=async url=>{
  const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('HTTP '+response.status+' · '+url);
  return response;
};
const catalog=await(await get('https://tiles.openfreemap.org/planet')).json(),template=catalog.tiles[0];
const kinds=new Set(['river','stream','canal','ditch','drain']);
const [w,s,e,n]=bounds,z=13;
const [left,top]=lonLatTile(w,n,z).map(Math.floor),[right,bottom]=lonLatTile(e,s,z).map(Math.floor);
const [anetoX,anetoY]=lonLatTile(.65,42.635,z).map(Math.floor),jobs=[];
for(let x=left;x<=right;x++)for(let y=top;y<=bottom;y++){
  if(Math.abs(x-anetoX)<=1&&Math.abs(y-anetoY)<=1){
    for(let dx=0;dx<=1;dx++)for(let dy=0;dy<=1;dy++)jobs.push({z:z+1,x:x*2+dx,y:y*2+dy});
  }else jobs.push({z,x,y});
}
function tileBounds({z,x,y}){
  const span=2**z,lon=i=>i/span*360-180,lat=i=>Math.atan(Math.sinh(Math.PI*(1-2*i/span)))*180/Math.PI;
  return [Math.max(w,lon(x)),Math.max(s,lat(y+1)),Math.min(e,lon(x+1)),Math.min(n,lat(y))];
}
function clippedLine(line,[w,s,e,n]){
  const parts=[];
  let current;
  for(let i=1;i<line.length;i++){
    const [x,y]=line[i-1],[u,v]=line[i],dx=u-x,dy=v-y;
    let start=0,end=1;
    for(const [p,q] of [[-dx,x-w],[dx,e-x],[-dy,y-s],[dy,n-y]]){
      if(!p){if(q<0){start=1;end=0;break;}}
      else if(p<0)start=Math.max(start,q/p);
      else end=Math.min(end,q/p);
    }
    if(start>=end){current=null;continue;}
    const point=t=>[x+dx*t,y+dy*t].map(c=>Math.round(c*1e7)/1e7);
    if(!current||start>0){current=[point(start)];parts.push(current);}
    const b=point(end),a=current.at(-1);
    if(a[0]!==b[0]||a[1]!==b[1])current.push(b);
    if(end<1)current=null;
  }
  return parts.filter(part=>part.length>1);
}
const results=[];
for(let i=0;i<jobs.length;i+=6)await Promise.all(jobs.slice(i,i+6).map(async(tile,j)=>{
  const url=template.replace('{z}',tile.z).replace('{x}',tile.x).replace('{y}',tile.y),response=await get(url);
  const features=readVector(new Uint8Array(await response.arrayBuffer()),tile,['waterway']),box=tileBounds(tile);
  results[i+j]=features.flatMap(feature=>{
    const {class:kind,name,intermittent,brunnel}=feature.properties;
    if(!kinds.has(kind)||brunnel==='tunnel')return [];
    const {type,coordinates}=feature.geometry,lines=type==='LineString'?[coordinates]:type==='MultiLineString'?coordinates:[];
    return lines.flatMap(line=>clippedLine(line,box)).map(points=>{
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
      return {type:'Feature',bbox:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],
        properties:{sourceLayer:'waterway',class:kind,name,intermittent},geometry:{type:'LineString',coordinates:points}};
    });
  });
}));
const features=results.flat(),data={type:'FeatureCollection',bbox:bounds,attribution:'© OpenStreetMap contributors · OpenFreeMap · ODbL',source:template,features};
await writeFile(new URL('../public/'+ANETO_WATERWAY_FILE,import.meta.url),zlibSync(strToU8(JSON.stringify(data))));
console.log(features.length+' trams de rius i rierols.');
