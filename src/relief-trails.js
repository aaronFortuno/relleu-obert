import {lineBuffer} from './roads.js';
import {reliefStreamStrips} from './relief-streams.js';

const classes=new Set(['path','footway','track','bridleway','steps']);
const nonTrails=new Set(['cycleway','sidewalk','crossing']);

export const isReliefTrail=({class:kind,subclass,brunnel,location,foot,access}={})=>
  classes.has(kind)&&!nonTrails.has(subclass)&&!['tunnel','bridge'].includes(brunnel)&&
  location!=='underground'&&foot!=='no'&&access!=='private';

export const RELIEF_TRAIL_WIDTH_MM=.42;
const MAX_SEGMENTS=5000;

export function prepareReliefTrails(features,project,{width,height,resolution}){
  const candidates=[],seen=new Set(),radius=RELIEF_TRAIL_WIDTH_MM/2;
  for(const {properties,geometry:g} of features){
    if(!g||!isReliefTrail(properties))continue;
    const lines=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];
    for(const line of lines){
      if(line.length<2||!line.every(([lon,lat])=>Number.isFinite(lon)&&Number.isFinite(lat)))continue;
      const points=line.map(project),fragments=[];
      let fragment=[];
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i];
        if(Math.max(a[0],b[0])<-radius||Math.min(a[0],b[0])>width+radius||
            Math.max(a[1],b[1])<-radius||Math.min(a[1],b[1])>height+radius){
          fragment=[];continue;
        }
        if(!fragment.length){fragment.push(a);fragments.push(fragment);}
        fragment.push(b);
      }
      for(const path of fragments){
        const keys=path.map(point=>point.map(value=>Math.round(value*1000)).join(','));
        const forward=keys.join(';'),reverse=keys.reverse().join(';'),key=forward<reverse?forward:reverse;
        if(seen.has(key))continue;
        seen.add(key);
        const length=path.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-path[i][0],p[1]-path[i][1]),0);
        if(length>=RELIEF_TRAIL_WIDTH_MM)candidates.push({path,length});
      }
    }
  }
  candidates.sort((a,b)=>b.length-a.length);
  let remaining=MAX_SEGMENTS,count=0;
  const polygons=[];
  for(const {path}of candidates){
    const segments=path.length-1;
    if(segments>remaining)continue;
    const buffer=lineBuffer(path,radius,[width,height]);
    if(!buffer.length)continue;
    polygons.push(buffer);remaining-=segments;count++;
  }
  return {strips:reliefStreamStrips(polygons,width,height,resolution),count,omitted:candidates.length-count};
}
