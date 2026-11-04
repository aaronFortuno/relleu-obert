import {polygonOps} from './polygon-ops.js';

const pc=polygonOps(),epsilon=1e-5;
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const vector=(a,b)=>b.map((v,i)=>v-a[i]);
const tangent=(a,b)=>vector(a,b).map(v=>v/distance(a,b));
const normal=([x,y])=>[-y,x];
const area=polys=>polys.reduce((total,poly)=>total+Math.abs(poly.reduce((sum,ring)=>
  sum+ring.slice(1).reduce((a,p,i)=>a+cross(ring[i],p),0)/2,0)),0);

function junctionOf(roads){
  if(roads.length===1)return [];
  const matches=[];
  for(const [branchIndex,branch] of roads.entries()){
    const mainIndex=1-branchIndex,main=roads[mainIndex];
    for(const end of [0,branch.points.length-1]){
      const point=branch.points[end];
      for(let index=1;index<main.points.length-1;index++){
        if(distance(point,main.points[index])<=epsilon)matches.push({branchIndex,mainIndex,end,index});
      }
    }
  }
  if(matches.length!==1)throw Error('La cruïlla del pilot ha de tenir un únic node compartit en T.');
  const {branchIndex,mainIndex,end,index}=matches[0];
  const main=roads[mainIndex],branch=roads[branchIndex],point=main.points[index];
  branch.points[end]=point;
  const before=tangent(main.points[index-1],point),after=tangent(point,main.points[index+1]);
  const away=tangent(point,branch.points[end===0?1:end-1]);
  const sine=Math.abs(cross(before,away)),cosine=Math.abs(dot(before,away));
  if(dot(before,after)<.999999||sine<.5)
    throw Error('La cruïlla del pilot requereix un eix principal recte al node i un angle mínim de 30°.');
  const pads=[];
  pads[mainIndex]={index,length:(branch.width+cosine*main.width)/(2*sine)+.25};
  pads[branchIndex]={index:end,length:(main.width+cosine*branch.width)/(2*sine)+.25};
  return pads;
}

function planRoute({points,width},pad,{rect,ground,proj,resolution},rise){
  const tangents=points.slice(1).map((p,i)=>tangent(points[i],p)),half=width/2;
  const sections=points.map((p,i)=>{
    const before=tangents[Math.max(0,i-1)],after=tangents[Math.min(tangents.length-1,i)];
    const alignment=dot(before,after);
    if(alignment<.5)throw Error('El radi de la corba és massa tancat per a la calçada del pilot.');
    const bisector=normal(before.map((v,j)=>(v+after[j])/(1+alignment)));
    const isBend=Math.abs(cross(before,after))>epsilon;
    // A horizontal band around each turn allows both rotated sections to
    // share their elevation, without twisting the surface between them.
    const collar=pad?.index===i?pad.length:isBend?half*(1+Math.abs(dot(bisector,before))):0;
    return {p,offset:bisector,z:ground(...p)+rise,collar,isJunction:pad?.index===i};
  });
  const patches=[],padPolygons=[],step=Math.min(proj.width,proj.height)/resolution;
  for(const [index,direction] of tangents.entries()){
    const a=sections[index],b=sections[index+1],length=distance(a.p,b.p),perpendicular=normal(direction);
    const at=s=>a.p.map((v,j)=>v+s*direction[j]);
    if(a.collar+b.collar>=length-epsilon)throw Error('No hi ha espai per aplanar la corba o la cruïlla.');
    const start=a.collar,end=length-b.collar;
    const count=Math.max(1,Math.min(256,Math.ceil((end-start)/step)));
    const stations=Array.from({length:count+1},(_,i)=>{
      const s=start+(end-start)*i/count,p=at(s);
      return {s,p,offset:perpendicular,z:i===0?a.z:i===count?b.z:ground(...p)+rise};
    });
    if(a.collar)stations.unshift({...a,s:0});
    else stations[0]={...a,s:0};
    if(b.collar)stations.push({...b,s:length});
    else stations[stations.length-1]={...b,s:length};
    const edge=(row,sign)=>row.p.map((v,j)=>v+sign*half*row.offset[j]);
    for(let i=1;i<stations.length;i++){
      const left=stations[i-1],right=stations[i];
      const ring=[edge(left,-1),edge(right,-1),edge(right,1),edge(left,1)];
      if(ring.some((p,j)=>cross(vector(p,ring[(j+1)%4]),vector(ring[(j+1)%4],ring[(j+2)%4]))<=0))
        throw Error('Les seccions de la corba se solapen.');
      const clipped=pc.intersection([[ring.concat([ring[0]])]],rect);
      if(!clipped.length)continue;
      const span=right.s-left.s,grade=(right.z-left.z)/span;
      const top=(x,y)=>{
        const s=dot(vector(left.p,[x,y]),direction);
        // Surface.polygon rounds XY. Pin the height at shared station edges.
        if(s<=1e-4)return left.z;
        if(s>=span-1e-4)return right.z;
        return left.z+grade*s;
      };
      for(const polygon of clipped)patches.push({polygon,top});
      if(left.isJunction||right.isJunction)padPolygons.push(clipped);
    }
  }
  const mask=patches.length?pc.union(...patches.map(p=>[p.polygon])):[];
  if(area(patches.map(p=>p.polygon))-area(mask)>1e-6)throw Error('La calçada del pilot es creua amb ella mateixa.');
  return {patches,mask,pad:padPolygons.length?pc.union(...padPolygons):[]};
}

// Initial surface pilot: one open polyline, or two surface routes meeting
// in one explicit T. Only the junction pad may be covered by both routes.
export function planSurfaceRoad(roads,terrain,rise){
  const routes=roads.map(road=>({...road,points:road.points.filter((p,i,all)=>!i||distance(p,all[i-1])>epsilon)}));
  if(routes.some(r=>r.points.length<2||r.points.length>128))
    throw Error('El traçat del cupó ha de tenir entre 2 i 128 punts diferents.');
  const pads=junctionOf(routes);
  const planned=routes.map((route,i)=>planRoute(route,pads[i],terrain,rise));
  if(planned.length===2){
    const [a,b]=planned,overlap=pc.intersection(a.mask,b.mask),pad=pc.intersection(a.pad,b.pad);
    if(area(overlap)<=epsilon||area(pc.difference(overlap,pad))>1e-6)
      throw Error('Les dues calçades s’han de tocar dins del pla de la cruïlla.');
  }
  const mask=pc.union(...planned.map(p=>p.mask));
  if(!mask.length||area(pc.difference(mask,terrain.land))>1e-6)
    throw Error('El tram del cupó ha de quedar sobre el terreny i dins de la peça.');
  return {mask,routes:planned,junctionCount:pads.length?1:0};
}
