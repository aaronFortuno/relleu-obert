import {lineBuffer} from './roads.js';
import {reliefStreamStrips} from './relief-streams.js';
import {polygonOps} from './polygon-ops.js';

const classes=new Set(['path','footway','track','bridleway','steps']);
const nonTrails=new Set(['cycleway','sidewalk','crossing']);

export const isReliefTrail=({class:kind,subclass,brunnel,location,foot,access}={})=>
  classes.has(kind)&&!nonTrails.has(subclass)&&!['tunnel','bridge'].includes(brunnel)&&
  location!=='underground'&&foot!=='no'&&access!=='private';

export const RELIEF_TRAIL_WIDTH_MM=.42;
export const MAX_RELIEF_TRAIL_STROKES=4000;
export const validReliefTrailWidth=value=>Number.isFinite(value)&&value>=.3&&value<=3;
const MAX_SEGMENTS=5000;
const pc=polygonOps();

export function prepareReliefTrails(features,project,{width,height,resolution},trailWidth=RELIEF_TRAIL_WIDTH_MM){
  if(!validReliefTrailWidth(trailWidth))throw Error('L’amplada dels senders ha de ser entre 0,3 i 3 mm.');
  const candidates=[],seen=new Set(),radius=trailWidth/2;
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

function brushFootprint(points,radius,bounds){
  if(points.length>1)return lineBuffer(points,radius,bounds);
  const [x,y]=points[0],sides=Math.max(12,Math.ceil(Math.PI/Math.acos(Math.max(-1,1-.01/radius))));
  const ring=Array.from({length:sides},(_,i)=>{
    const angle=i*Math.PI*2/sides;
    return [x+radius*Math.cos(angle),y+radius*Math.sin(angle)];
  });
  return [[ring.concat([ring[0]])]];
}

export function editReliefTrailStrips(base,{width,height,resolution},trailWidth,strokes){
  if(!validReliefTrailWidth(trailWidth)||!Array.isArray(strokes)||strokes.length>MAX_RELIEF_TRAIL_STROKES)
    throw Error('L’edició de senders supera el rang admès.');
  if(!strokes.length)return {mapped:base,drawn:[]};
  const strips=base.length?base.slice():Array.from({length:resolution},()=>[]);
  const drawn=Array.from({length:resolution},()=>[]);
  let points=[],previous=null;
  const applyStroke=()=>{
    if(!points.length)return;
    const erase=previous.mode==='erase',radius=erase?previous.radius:trailWidth/2;
    const edit=reliefStreamStrips([brushFootprint(points,radius,[width,height])],width,height,resolution);
    for(const [i,mask]of edit.entries()){
      if(!mask.length)continue;
      if(erase){
        if(strips[i].length)strips[i]=pc.difference(strips[i],mask);
        if(drawn[i].length)drawn[i]=pc.difference(drawn[i],mask);
      }else drawn[i]=drawn[i].length?pc.union(drawn[i],mask):mask;
    }
    points=[];
  };
  for(const stroke of strokes){
    if(!stroke||!['add','erase'].includes(stroke.mode)||
        !Number.isFinite(stroke.x)||stroke.x<-.01||stroke.x>width+.01||
        !Number.isFinite(stroke.y)||stroke.y<-.01||stroke.y>height+.01||
        !Number.isFinite(stroke.radius)||stroke.radius<.001||stroke.radius>30||
        (stroke.gesture!=null&&(!Number.isSafeInteger(stroke.gesture)||stroke.gesture<0))||
        (stroke.breakBefore!=null&&typeof stroke.breakBefore!=='boolean'))
      throw Error('El traç de sender no és vàlid.');
    if(previous&&(stroke.breakBefore||stroke.gesture==null||stroke.gesture!==previous.gesture||
        stroke.mode!==previous.mode||(stroke.mode==='erase'&&stroke.radius!==previous.radius)))applyStroke();
    const last=points.at(-1);
    if(!last||Math.hypot(last[0]-stroke.x,last[1]-stroke.y)>1e-5)points.push([stroke.x,stroke.y]);
    previous=stroke;
  }
  applyStroke();
  return {mapped:strips.some(strip=>strip.length)?strips:[],drawn:drawn.some(strip=>strip.length)?drawn:[]};
}

export function sameReliefTrailStrokes(a,b){
  return a===b||(a.length===b.length&&a.every((stroke,i)=>{
    const other=b[i];
    return stroke===other||!!stroke&&!!other&&stroke.x===other.x&&stroke.y===other.y&&stroke.radius===other.radius&&
      stroke.mode===other.mode&&stroke.gesture===other.gesture&&!!stroke.breakBefore===!!other.breakBefore;
  }));
}
