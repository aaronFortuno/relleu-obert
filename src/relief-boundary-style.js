import {lineBuffer} from './roads.js';

// Lengths along the centreline in printed mm. Round caps extend by a
// radius on either side, so even the shortest gap stays visibly open.
const patterns={solid:null,dashed:[2.4,1.3],dotted:[.08,1.2],'dash-dot':[2.4,1.3,.08,1.3]};
const EPS=1e-5,MAX_SOURCE_SEGMENTS=120000,MAX_STROKE_SEGMENTS=12000;

function visibleInterval(a,b,width,height,margin){
  let enter=0,exit=1;
  for(const [axis,limit]of [width,height].entries()){
    const delta=b[axis]-a[axis];
    if(delta===0){
      if(a[axis]<-margin||a[axis]>limit+margin)return null;
      continue;
    }
    const t0=(-margin-a[axis])/delta,t1=(limit+margin-a[axis])/delta;
    enter=Math.max(enter,Math.min(t0,t1));
    exit=Math.min(exit,Math.max(t0,t1));
    if(enter>=exit)return null;
  }
  return [enter,exit];
}

export function boundaryStrokePolygons(lines,project,{width,height,style,lineWidth=.54}){
  if(!Object.hasOwn(patterns,style)||![width,height,lineWidth].every(v=>Number.isFinite(v)&&v>0)||lineWidth>10)
    throw Error('Estil o amplada de frontera invàlids.');
  const radius=lineWidth/2,pattern=patterns[style]?.map(length=>length*Math.max(1,lineWidth/.54));
  const period=pattern?.reduce((sum,length)=>sum+length,0);
  const polygons=[],seen=new Set();
  let examined=0,generated=0;
  for(const line of lines){
    if(!Array.isArray(line)||line.length<2)continue;
    examined+=line.length-1;
    if(examined>MAX_SOURCE_SEGMENTS)throw Error('La frontera supera el límit de segments cartografiats.');
    if(!line.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])))continue;
    const keys=line.map(([lon,lat])=>lon+','+lat),forward=keys.join(';'),reverse=keys.reverse().join(';');
    const key=forward<reverse?forward:reverse;
    if(seen.has(key))continue;
    seen.add(key);
    const points=line.map(p=>project(p));
    if(reverse<forward)points.reverse();
    if(!points.every(p=>Number.isFinite(p?.[0])&&Number.isFinite(p?.[1])))continue;

    let station=0,previousEnd=-Infinity,path=[];
    const flush=()=>{
      if(path.length<2)return;
      const buffer=lineBuffer(path,radius,[width,height]);
      if(buffer.length)polygons.push(buffer);
      path=[];
    };
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
      if(length<=EPS)continue;
      const start=station;
      station+=length;
      // Keep cap geometry outside the real cut. In particular, an off-map
      // approach can affect phase but does not generate off-map dashes.
      const visible=visibleInterval(a,b,width,height,radius+EPS);
      if(!visible)continue;
      const from=start+length*visible[0],to=start+length*visible[1];
      const pointAt=s=>s===start?a:s===station?b:[a[0]+dx*(s-start)/length,a[1]+dy*(s-start)/length];
      const emit=(lo,hi)=>{
        if(hi-lo<=EPS)return;
        if(++generated>MAX_STROKE_SEGMENTS)throw Error('La frontera supera el límit de segments imprimibles.');
        if(Math.abs(lo-previousEnd)>EPS)flush();
        if(!path.length)path.push(pointAt(lo));
        path.push(pointAt(hi));
        previousEnd=hi;
      };
      if(!pattern){
        emit(from,to);
        continue;
      }
      // Measure phase from the original line start, including every
      // preceding off-map segment, before the plate cuts are made.
      const first=Math.floor(from/period),last=Math.floor(to/period);
      if(!Number.isSafeInteger(last)||last-first>MAX_STROKE_SEGMENTS)
        throw Error('La frontera supera el límit de segments imprimibles.');
      for(let cycle=first;cycle<=last;cycle++){
        let cursor=cycle*period;
        for(let step=0;step<pattern.length;step+=2){
          const end=cursor+pattern[step];
          emit(Math.max(from,cursor),Math.min(to,end));
          cursor=end+pattern[step+1];
        }
      }
    }
    flush();
  }
  return polygons;
}
