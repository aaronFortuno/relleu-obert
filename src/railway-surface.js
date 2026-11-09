import {sourceFragments,stitchGroup} from './regional-surface-roads.js';

const cross=([x,y],[u,v])=>x*v-y*u;
const delta=(a,b)=>[b[0]-a[0],b[1]-a[1]];

export function surfaceRailAxes(routes,width,height){
  const tracks=routes.filter(route=>route.railway&&!['bridge','tunnel'].includes(route.brunnel));
  const profiled=tracks.filter(route=>route.elevations).map(route=>({...route,
    points:route.points.map(([x,y],i)=>[x,y,route.elevations[i]])}));
  const box=[0,0,width,height];
  return [...stitchGroup(sourceFragments(profiled,box)),
    ...stitchGroup(sourceFragments(tracks.filter(route=>!route.elevations),box))];
}

// Estimate one constant grade along the joined axis. The terrain between the
// anchors decides where to cut or fill, never the elevation of the platform.
export function railwaySections({points,width},ground,exaggeration,minimumSurfaceMM,rise,projectElevation){
  if(points[0].length===3&&projectElevation)return corridorSections({points,width},()=>
    (_,i)=>Math.max(minimumSurfaceMM,projectElevation(points[i][2]))+rise);
  return corridorSections({points,width},span=>{
    const start=ground(...points[0]),end=ground(...points.at(-1));
    const limit=.04*exaggeration,grade=Math.max(-limit,Math.min(limit,(end-start)/span));
    const startZ=Math.max(minimumSurfaceMM-Math.min(0,span*grade),(start+end-span*grade)/2)+rise;
    return distance=>startZ+distance*grade;
  });
}

export function corridorSections({points,width},profile){
  const distances=[0],normals=[];
  for(let i=1;i<points.length;i++){
    const [dx,dy]=delta(points[i-1],points[i]),length=Math.hypot(dx,dy);
    distances.push(distances.at(-1)+length);
    normals.push([-dy/length,dx/length]);
  }
  const height=profile(distances.at(-1));
  return points.map(([x,y],i)=>{
    const before=normals[Math.max(0,i-1)],after=normals[Math.min(i,normals.length-1)];
    const [nx,ny]=[before[0]+after[0],before[1]+after[1]];
    const miter=nx*before[0]+ny*before[1];
    if(miter<.5)throw Error('El gir de la via és massa tancat.');
    const dx=nx*width/(2*miter),dy=ny*width/(2*miter),z=height(distances[i],i);
    return {left:[x+dx,y+dy,z],right:[x-dx,y-dy,z]};
  });
}

export function corridorPatches(sections){
  const patches=[];
  for(let i=1;i<sections.length;i++){
    const a=sections[i-1],b=sections[i];
    for(const [p,q,r] of [[a.right,b.right,b.left],[a.right,b.left,a.left]]){
      const u=delta(p,q),v=delta(p,r),det=cross(u,v);
      if(det<=1e-8)throw Error('Les seccions del paviment es pleguen.');
      const top=(x,y)=>{
        const w=[x-p[0],y-p[1]];
        return p[2]+(cross(w,v)*(q[2]-p[2])+cross(u,w)*(r[2]-p[2]))/det;
      };
      const ring=[p,q,r,p].map(([x,y])=>[x,y]);
      patches.push({polygon:[ring],top});
    }
  }
  return patches;
}
