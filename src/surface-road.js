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


const move=(p,d,amount)=>p.map((v,i)=>v+d[i]*amount);
const snap=p=>p.map(v=>Math.round(v*1e4)/1e4);

function roundCorner(before,point,after,width){
  const incoming=tangent(before,point),outgoing=tangent(point,after);
  const angle=Math.atan2(cross(incoming,outgoing),dot(incoming,outgoing));
  if(Math.abs(angle)<=epsilon)return null;
  const trim=Math.min(1.5*width,.35*distance(before,point),.35*distance(point,after));
  const radius=trim/Math.tan(Math.abs(angle)/2);
  if(Math.abs(angle)>Math.PI/3||radius<=width/2+.01)
    throw Error('El radi de la corba és massa tancat per a la calçada del pilot.');
  const start=move(point,incoming,-trim),end=move(point,outgoing,trim);
  const side=Math.sign(angle),centre=move(start,normal(incoming),side*radius);
  const count=Math.max(2,Math.ceil(Math.abs(angle)/(Math.PI/120)),Math.ceil(radius*Math.abs(angle)/.5));
  return {start,end,points:Array.from({length:count},(_,i)=>{
    const a=angle*(i+1)/count,c=Math.cos(a),s=Math.sin(a);
    const d=[incoming[0]*c-incoming[1]*s,incoming[0]*s+incoming[1]*c];
    return {point:i+1===count?end:move(centre,normal(d),-side*radius),direction:d};
  })};
}

function centreline(points,width,pad){
  const bends=points.map((p,i)=>i&&i<points.length-1?roundCorner(points[i-1],p,points[i+1],width):null);
  const stations=[];
  const append=(centre,direction,inPad)=>{
    const prev=stations.at(-1),step=prev?distance(prev.centre,centre):0;
    if(prev&&step<=epsilon){prev.inPad||=inPad;return;}
    stations.push({distanceMM:(prev?.distanceMM??0)+step,centre,normal:normal(direction),inPad});
  };
  for(let i=0;i<points.length-1;i++){
    const direction=tangent(points[i],points[i+1]);
    const from=bends[i]?.end??points[i],to=bends[i+1]?.start??points[i+1];
    const startsAtPad=pad?.index===i,endsAtPad=pad?.index===i+1;
    const waypoints=[from];
    if(startsAtPad||endsAtPad){
      if(distance(from,to)<=pad.length+epsilon)throw Error('No hi ha espai per enllaçar amb la cruïlla.');
      waypoints.push(startsAtPad?move(from,direction,pad.length):move(to,direction,-pad.length));
    }
    waypoints.push(to);
    for(let j=1;j<waypoints.length;j++){
      const a=waypoints[j-1],b=waypoints[j],inPad=startsAtPad&&j===1||endsAtPad&&j===2;
      const count=Math.min(256,Math.max(1,Math.ceil(distance(a,b)/.65)));
      for(let k=0;k<=count;k++)append(k===count?b:move(a,vector(a,b),k/count),direction,inPad);
    }
    for(const sample of bends[i+1]?.points??[])append(sample.point,sample.direction,false);
    if(stations.length>1600)throw Error('El pilot supera el límit de seccions de paviment.');
  }
  return stations;
}

// Monotone cubic interpolation rounds changes of grade without introducing
// crests, hollows or extra flats. A constant junction span forces zero slope
// at both of its transitions.
function applyGrade(stations,ground,rise,junctionHeight){
  const knots=[];
  for(const [i,station] of stations.entries()){
    const previous=stations[i-1],next=stations[i+1];
    if(!previous||!next||station.inPad&&(!previous.inPad||!next.inPad)||
        !station.inPad&&station.distanceMM-knots.at(-1).distanceMM>=2.5){
      knots.push({distanceMM:station.distanceMM,heightMM:station.inPad?junctionHeight:ground(...station.centre)+rise});
    }
  }
  const intervals=knots.slice(1).map((b,i)=>{
    const a=knots[i],length=b.distanceMM-a.distanceMM;
    return {length,grade:(b.heightMM-a.heightMM)/length};
  });
  const slopes=knots.map((_,i)=>{
    const a=intervals[i-1],b=intervals[i];
    if(!a||!b)return (a??b).grade;
    if(a.grade*b.grade<=0)return 0;
    const w1=2*b.length+a.length,w2=b.length+2*a.length;
    return (w1+w2)/(w1/a.grade+w2/b.grade);
  });
  let index=0;
  for(const station of stations){
    while(index<intervals.length-1&&station.distanceMM>knots[index+1].distanceMM)index++;
    const a=knots[index],b=knots[index+1],{length}=intervals[index],t=(station.distanceMM-a.distanceMM)/length;
    const delta=b.heightMM-a.heightMM;
    station.heightMM=a.heightMM+t*t*(3-2*t)*delta+length*t*(1-t)*((1-t)*slopes[index]-t*slopes[index+1]);
  }
}

function planarTop([a,b,c],[za,zb,zc]){
  const u=vector(a,b),v=vector(a,c),det=cross(u,v);
  return (x,y)=>{
    const w=vector(a,[x,y]);
    return za+(cross(w,v)*(zb-za)+cross(u,w)*(zc-za))/det;
  };
}

function planRoute({points,width,sourceFeatureIds},pad,{rect,ground},rise){
  const stations=centreline(points,width,pad),half=width/2;
  applyGrade(stations,ground,rise,pad?ground(...points[pad.index])+rise:null);
  const patches=[],padPolygons=[];
  const edge=(station,sign)=>snap(move(station.centre,station.normal,sign*half));
  for(let i=1;i<stations.length;i++){
    const a=stations[i-1],b=stations[i];
    const ring=[edge(a,-1),edge(b,-1),edge(b,1),edge(a,1)];
    if(ring.some((p,j)=>cross(vector(p,ring[(j+1)%4]),vector(ring[(j+1)%4],ring[(j+2)%4]))<=0))
      throw Error('Les seccions de la corba se solapen.');
    const triangles=[[0,1,2],[0,2,3]],heights=[a.heightMM,b.heightMM,b.heightMM,a.heightMM];
    for(const indices of triangles){
      const triangle=indices.map(j=>ring[j]),top=planarTop(triangle,indices.map(j=>heights[j]));
      const clipped=pc.intersection([[triangle.concat([triangle[0]])]],rect);
      for(const polygon of clipped)patches.push({polygon,top});
      if(a.inPad&&b.inPad&&clipped.length)padPolygons.push(clipped);
    }
  }
  const mask=patches.length?pc.union(...patches.map(p=>[p.polygon])):[];
  if(area(patches.map(p=>p.polygon))-area(mask)>1e-6)throw Error('La calçada del pilot es creua amb ella mateixa.');
  const insideJunction=stations.filter(s=>s.inPad);
  const profile={featureIds:sourceFeatureIds,stations:stations.map(({inPad,...section})=>section)};
  if(insideJunction.length)profile.junctionIntervalMM=[insideJunction[0].distanceMM,insideJunction.at(-1).distanceMM];
  return {patches,mask,profile,pad:padPolygons.length?pc.union(...padPolygons):[]};
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
