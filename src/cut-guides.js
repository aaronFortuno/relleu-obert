import {tilePlan} from './selection.js';

const surfaceLayers=new Set(['terrain','water','inland-water','forest','grass','roads','railways','rock','snow']);

// Intersect the actual top triangles with the same planes used by the export.
// The renderer overlays the resulting surface lines so trees cannot hide them.
export function cutGuideSegments({width,height,categories},plan=tilePlan(width,height)){
  const cuts=[...plan.xCuts.map(x=>[0,x]),...plan.yCuts.map(y=>[1,y])];
  const segments=[];
  if(!cuts.length)return new Float32Array();
  for(const {id,vertices,faces} of categories){
    if(!surfaceLayers.has(id))continue;
    for(let i=0;i<faces.length;i+=3){
      const a=faces[i]*3,b=faces[i+1]*3,c=faces[i+2]*3;
      const normalZ=(vertices[b]-vertices[a])*(vertices[c+1]-vertices[a+1])-(vertices[b+1]-vertices[a+1])*(vertices[c]-vertices[a]);
      if(normalZ<=0)continue;
      for(const [axis,cut] of cuts){
        const u=vertices[a+axis],v=vertices[b+axis],w=vertices[c+axis];
        // Half-open interval also avoids drawing an edge twice when two
        // neighbouring triangles share an edge on the cut plane.
        if(cut<Math.min(u,v,w)||cut>=Math.max(u,v,w))continue;
        const start=segments.length;
        for(const [p,q] of [[a,b],[b,c],[c,a]]){
          const pAxis=vertices[p+axis],qAxis=vertices[q+axis];
          if((pAxis>cut)===(qAxis>cut))continue;
          const t=(cut-pAxis)/(qAxis-pAxis);
          for(let k=0;k<3;k++)segments.push(vertices[p+k]+(vertices[q+k]-vertices[p+k])*t);
        }
        if(segments.length!==start+6||
            segments[start]===segments[start+3]&&segments[start+1]===segments[start+4]&&segments[start+2]===segments[start+5])segments.length=start;
      }
    }
  }
  return new Float32Array(segments);
}
