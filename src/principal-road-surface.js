import {sourceFragments,stitchGroup} from './regional-surface-roads.js';
import {corridorSections} from './railway-surface.js';
import {compatibleTransport} from './transport-network.js';
import {isPrincipalRoad} from './transport-width.js';

const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const direction=(from,to)=>{
  const length=distance(from,to);
  return [(to[0]-from[0])/length,(to[1]-from[1])/length];
};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const add=([x,y],[dx,dy],length)=>[x+dx*length,y+dy*length];
const rank={motorway:0,trunk:1,primary:2};

export const principalSurface=route=>!route.railway&&!['bridge','tunnel'].includes(route.brunnel)&&isPrincipalRoad(route.properties);

export function principalAxes(routes,bridges,{width,height,scale}){
  const axes=stitchGroup(sourceFragments(routes,[0,0,width,height]))
    .map(axis=>({...axis,anchors:[null,null]}))
    .sort((a,b)=>rank[a.class]-rank[b.class]||b.points.length-a.points.length);
  for(const bridge of bridges){
    if(bridge.railway||bridge.axis.length<2)continue;
    for(const end of [0,1]){
      const edge=end?bridge.axis.at(-1):bridge.axis[0],inner=end?bridge.axis.at(-2):bridge.axis[1];
      const outward=direction(inner,edge);
      const cap=add(edge,outward,-.05),inside=add(edge,outward,-.35),z=bridge.top(...cap),innerZ=bridge.top(...inside);
      if(z==null)continue;
      const grade=innerZ==null?0:(z-innerZ)/.3;
      const radius=Math.max(1,Math.min(4,bridge.roadWidth/2+20*scale));
      for(const axis of axes){
        if(!compatibleTransport(bridge.identity,axis))continue;
        for(const side of [0,1]){
          const point=side?axis.points.at(-1):axis.points[0],next=side?axis.points.at(-2):axis.points[1];
          const gap=distance(point,edge);
          if(gap>radius||gap>=(axis.anchors[side]?.gap??Infinity)||dot(outward,direction(point,next))<.55)continue;
          const offset=dot([point[0]-cap[0],point[1]-cap[1]],outward);
          axis.anchors[side]={bridgeId:bridge.id,mask:bridge.mask,gap,point,z:bridge.top(...point)??z+offset*grade};
        }
      }
    }
  }
  return axes;
}

export function principalSections(axis,{ground,exaggeration,verticalReference},rise,junctionAt){
  const points=[axis.points[0],axis.points.at(-1)];
  return corridorSections(axis,length=>{
    const fixed=points.map((point,i)=>axis.anchors[i]?.z??junctionAt(point,axis));
    const heights=points.map((point,i)=>fixed[i]??ground(...point)+rise);
    const maximum=.12*exaggeration*length;
    if(Math.abs(heights[1]-heights[0])>maximum){
      const direction=Math.sign(heights[1]-heights[0]);
      if(fixed[0]!=null&&fixed[1]==null)heights[1]=heights[0]+direction*maximum;
      else if(fixed[1]!=null&&fixed[0]==null)heights[0]=heights[1]-direction*maximum;
      else if(fixed[0]==null&&fixed[1]==null){
        const middle=(heights[0]+heights[1])/2;
        heights[0]=middle-direction*maximum/2;heights[1]=middle+direction*maximum/2;
      }
    }
    const minimum=verticalReference.minimumSurfaceMM+rise;
    for(let i=0;i<2;i++)if(fixed[i]==null)heights[i]=Math.max(minimum,heights[i]);
    return station=>heights[0]+(heights[1]-heights[0])*station/length;
  });
}
