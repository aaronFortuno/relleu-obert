import {polygonOps} from './polygon-ops.js';
import {projectInfrastructurePath} from './infrastructure-solids.js';
import {compatibleTransport} from './transport-network.js';

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
  const matches=[];
  for(const [branchIndex,branch] of roads.entries()){
    for(const [mainIndex,main] of roads.entries()){
      if(mainIndex===branchIndex)continue;
      for(const end of [0,branch.points.length-1]){
        const point=branch.points[end];
        for(let index=1;index<main.points.length-1;index++){
          if(distance(point,main.points[index])<=epsilon)matches.push({branchIndex,mainIndex,end,index});
        }
      }
    }
  }
  if(!matches.length)return [];
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

function centreline(points,width,pad,structureEnds=[]){
  const fixed=new Map();
  for(const end of structureEnds){
    const i=points.indexOf(end);
    if(i>0&&i<points.length-1){
      const before=tangent(points[i-1],end),after=tangent(end,points[i+1]);
      fixed.set(end,tangent([0,0],[before[0]+after[0],before[1]+after[1]]));
    }
  }
  const bends=points.map((p,i)=>i&&i<points.length-1&&!fixed.has(p)?roundCorner(points[i-1],p,points[i+1],width):null);
  const stations=[];
  const append=(centre,direction,inPad)=>{
    const prev=stations.at(-1),step=prev?distance(prev.centre,centre):0;
    if(prev&&step<=epsilon){prev.inPad||=inPad;return;}
    stations.push({distanceMM:(prev?.distanceMM??0)+step,centre,normal:normal(fixed.get(centre)??direction),inPad});
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
      for(let k=0;k<=count;k++)append(k===0?a:k===count?b:move(a,vector(a,b),k/count),direction,inPad);
    }
    for(const sample of bends[i+1]?.points??[])append(sample.point,sample.direction,false);
    if(stations.length>1600)throw Error('El pilot supera el límit de seccions de paviment.');
  }
  return stations;
}

// Monotone cubic interpolation rounds changes of grade without introducing
// crests, hollows or extra flats. A constant junction span forces zero slope
// at both of its transitions.
function applyGrade(stations,ground,rise,junctionHeight,connection,gradeWindow,maxGrade){
  const knots=[];
  const span=stations.at(-1).distanceMM-stations[0].distanceMM;
  const radius=gradeWindow?Math.min(gradeWindow,span/2):0;
  const elevations=radius?stations.map(s=>ground(...s.centre)+rise):null;
  const heightAt=station=>{
    let low=0,high=stations.length-1;
    while(high-low>1){
      const mid=(low+high)>>1;
      if(stations[mid].distanceMM<=station)low=mid;
      else high=mid;
    }
    const from=stations[low].distanceMM,to=stations[high].distanceMM;
    return elevations[low]+(elevations[high]-elevations[low])*(station-from)/(to-from);
  };
  for(const [i,station] of stations.entries()){
    const previous=stations[i-1],next=stations[i+1];
    if(!previous||!next||station.inPad&&(!previous.inPad||!next.inPad)||
        !station.inPad&&station.distanceMM-knots.at(-1).distanceMM>=Math.max(2.5,radius/2)){
      const distanceMM=station.distanceMM;
      let heightMM=station.inPad?junctionHeight:ground(...station.centre)+rise;
      // A symmetric filter retains constant grade and the two landing heights.
      const range=Math.min(radius,distanceMM-stations[0].distanceMM,stations.at(-1).distanceMM-distanceMM);
      if(!station.inPad&&range>0){
        heightMM=0;
        for(let offset=-4;offset<=4;offset++)heightMM+=heightAt(distanceMM+offset*range/4)/9;
      }
      knots.push({distanceMM,heightMM,inPad:station.inPad});
    }
  }
  if(maxGrade){
    const first=knots.findIndex(knot=>knot.inPad),last=knots.findLastIndex(knot=>knot.inPad);
    for(const [start,step] of [[first,-1],[last,1]])for(let i=start+step;i>=0&&i<knots.length;i+=step){
      const adjacent=knots[i-step],knot=knots[i];
      // Reserve one third of the grade limit for the cubic transitions.
      const limit=(2/3)*maxGrade*Math.abs(knot.distanceMM-adjacent.distanceMM);
      knot.heightMM=adjacent.heightMM+Math.max(-limit,Math.min(limit,knot.heightMM-adjacent.heightMM));
    }
  }
  if(connection)knots[connection.end?knots.length-1:0].heightMM=connection.height;
  const intervals=knots.slice(1).map((b,i)=>{
    const a=knots[i],length=b.distanceMM-a.distanceMM;
    return {length,grade:(b.heightMM-a.heightMM)/length};
  });
  const slopes=knots.map((_,i)=>{
    const a=intervals[i-1],b=intervals[i];
    if(!a||!b)return (a??b).grade;
    if(a.grade*b.grade<=0)return 0;
    const w1=2*b.length+a.length,w2=b.length+2*a.length;
    const slope=(w1+w2)/(w1/a.grade+w2/b.grade);
    return maxGrade?Math.max(-maxGrade,Math.min(maxGrade,slope)):slope;
  });
  if(connection){
    const interval=intervals[connection.end?intervals.length-1:0],adjacent=interval.grade;
    const slope=connection.grade;
    // In a short terminal interval a small nonmonotonic change is preferable
    // to a kink at the deck. 4/27 is the peak of the cubic endpoint term.
    const smallTurn=connection.flexible&&Math.abs(slope)*interval.length*4/27<=.15;
    if(!smallTurn&&Math.abs(slope)>epsilon&&(slope*adjacent<=0||Math.abs(slope)>3*Math.abs(adjacent)))
      throw Error('El pendent de l’estructura no es pot enllaçar suaument amb la calçada.');
    slopes[connection.end?slopes.length-1:0]=slope;
  }
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

function planRoute({points,width,sourceFeatureIds,gradeWindow},pad,{rect,ground},rise,structure){
  const stations=centreline(points,width,pad,structure?.flexible?structure.ends:undefined),half=width/2;
  const junctionHeight=pad?(pad.heightMM??ground(...points[pad.index])+rise):null;
  let start=-1,end=-1;
  if(structure){
    start=stations.findIndex(s=>distance(s.centre,structure.ends[0])<=epsilon);
    end=stations.findIndex(s=>distance(s.centre,structure.ends[1])<=epsilon);
    if(start<=0||end<=start||end>=stations.length-1)throw Error('Falten seccions als dos extrems de l’estructura.');
    if(stations.slice(start,end+1).some(s=>s.inPad))throw Error('El pla de la cruïlla envaeix l’estructura.');
    const origin=stations[start].distanceMM,span=stations[end].distanceMM-origin;
    const [first,last]=structure.heights,grade=(last-first)/span;
    const flexible=structure.flexible;
    applyGrade(stations.slice(0,start+1),ground,rise,junctionHeight,{end:true,height:first,grade,flexible},gradeWindow);
    applyGrade(stations.slice(end),ground,rise,junctionHeight,{end:false,height:last,grade,flexible},gradeWindow);
    for(const s of stations.slice(start,end+1))s.heightMM=first+(s.distanceMM-origin)*grade;
  }else applyGrade(stations,ground,rise,junctionHeight,undefined,gradeWindow,pad?.maxGrade);
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
      const stationAt=planarTop(triangle,indices.map(j=>j===0||j===3?a.distanceMM:b.distanceMM));
      for(const polygon of clipped)patches.push({polygon,top,stationAt,startMM:a.distanceMM,endMM:b.distanceMM,
        structural:start>=0&&i>start&&i<=end});
      if(a.inPad&&b.inPad&&clipped.length)padPolygons.push(clipped);
    }
  }
  const mask=patches.length?pc.union(...patches.map(p=>[p.polygon])):[];
  if(area(patches.map(p=>p.polygon))-area(mask)>1e-6)throw Error('La calçada del pilot es creua amb ella mateixa.');
  const insideJunction=stations.filter(s=>s.inPad);
  const profile={featureIds:sourceFeatureIds,stations:stations.map(({inPad,...section})=>section)};
  if(insideJunction.length)profile.junctionIntervalMM=[insideJunction[0].distanceMM,insideJunction.at(-1).distanceMM];
  if(structure)profile[structure.kind+'IntervalMM']=[stations[start].distanceMM,stations[end].distanceMM];
  return {patches,mask,profile,pad:padPolygons.length?pc.union(...padPolygons):[]};
}

function connectStructure(road,roads,{minimumAlignment=.999999}={}){
  const ends=[road.points[0],road.points.at(-1)];
  const headings=[tangent(...road.points.slice(0,2)),tangent(...road.points.slice(-2))];
  const groundRoads=roads.filter(r=>r!==road);
  const approaches=ends.map((point,index)=>{
    const matches=groundRoads.filter(r=>compatibleTransport(road,r)&&
      (distance(r.points[0],point)<=epsilon||distance(r.points.at(-1),point)<=epsilon));
    if(matches.length!==1)throw Error('L’estructura ha de tenir una continuació de superfície a cada extrem.');
    const [approach]=matches;
    const points=distance(approach.points[index?0:approach.points.length-1],point)<=epsilon?
      approach.points:approach.points.slice().reverse();
    const direction=index?tangent(points[0],points[1]):tangent(points.at(-2),points.at(-1));
    if(Math.abs(road.width-approach.width)>epsilon||dot(direction,headings[index])<minimumAlignment)
      throw Error('El pilot requereix la mateixa amplada i direcció de calçada als enllaços.');
    return {road:approach,points};
  });
  if(approaches[0].road===approaches[1].road)throw Error('L’estructura necessita dos accessos independents.');
  const axis={...road,points:[...approaches[0].points.slice(0,-1),...road.points,...approaches[1].points.slice(1)],
    sourceFeatureIds:[...approaches[0].road.sourceFeatureIds,...road.sourceFeatureIds,...approaches[1].road.sourceFeatureIds]};
  return {axis,ends,otherRoads:groundRoads.filter(r=>approaches.every(a=>a.road!==r))};
}

function planLevelCrossing(roads,bridge,terrain,rise,reason){
  const {axis,otherRoads}=connectStructure(bridge,roads,{minimumAlignment:.8});
  const [lower]=otherRoads;
  if(otherRoads.length!==1||lower.railway||lower.brunnel||Math.abs(lower.layer??0)>epsilon)
    throw Error('La cruïlla a nivell requereix dues carreteres i una única via inferior de superfície.');
  const hits=[];
  for(let j=1;j<bridge.points.length;j++){
    const a=bridge.points[j-1],u=vector(a,bridge.points[j]);
    for(let i=1;i<lower.points.length;i++){
      const c=lower.points[i-1],v=vector(c,lower.points[i]),delta=vector(a,c),det=cross(u,v);
      if(Math.abs(det)<=epsilon)continue;
      const t=cross(delta,v)/det,s=cross(delta,u)/det;
      if(t>=-epsilon&&t<=1+epsilon&&s>=-epsilon&&s<=1+epsilon){
        const point=move(a,u,t);
        if(!hits.some(hit=>distance(hit.point,point)<=epsilon))hits.push({point,upperSegment:axis.points.indexOf(a),lowerSegment:i-1});
      }
    }
  }
  if(hits.length!==1)throw Error('La cruïlla a nivell requereix un únic creuament dins del tram del pont.');
  const {point,upperSegment,lowerSegment}=hits[0];
  const addNode=(route,i)=>{
    const points=route.points.slice();
    const existing=[i,i+1].find(j=>distance(points[j],point)<=epsilon);
    const index=existing??i+1;
    points.splice(index,existing===undefined?0:1,point);
    if(index===0||index===points.length-1||dot(tangent(points[index-1],point),tangent(point,points[index+1]))<.999999)
      throw Error('La cruïlla a nivell necessita quatre accessos rectes a tocar del node.');
    return {...route,points,index};
  };
  const network=[addNode(axis,upperSegment),addNode(lower,lowerSegment)];
  const directions=network.map(({points,index})=>tangent(points[index-1],point));
  const sine=Math.abs(cross(...directions)),cosine=Math.abs(dot(...directions));
  if(sine<.5)throw Error('La cruïlla a nivell requereix un angle mínim de 30°.');
  const pads=network.map(({index,width},i)=>({index,length:(network[1-i].width+cosine*width)/(2*sine)+.25}));
  // Sample the lower axis on both sides so a DEM spike at the overlap does not set the level.
  const radius=Math.min(Math.max(3,pads[1].length),distance(point,network[1].points[pads[1].index-1]),
    distance(point,network[1].points[pads[1].index+1]));
  const heightMM=rise+[-1,-.5,.5,1].reduce((sum,offset)=>sum+terrain.ground(...move(point,directions[1],offset*radius))/4,0);
  const maxGrade=.12;
  const planned=network.map((route,i)=>planRoute(route,{...pads[i],heightMM,maxGrade},terrain,rise));
  if(overlapsOutsideJunction(planned,pads).length)throw Error('Les calçades es tornen a creuar fora de la cruïlla a nivell.');
  const mask=pc.union(...planned.map(route=>route.mask));
  if(area(pc.difference(mask,terrain.land))>1e-6)throw Error('La cruïlla a nivell només es pot construir sobre terra ferma.');
  return {mask,fillMask:mask,routes:planned,junctionCount:1,crossing:{point,heightMM,maxGrade,
    axes:network.map(({width},i)=>({direction:directions[i],widthMM:width,padLengthMM:pads[i].length})),reason}};
}

// Same-level overlap is only valid within the flat area shared by the T.
function overlapsOutsideJunction(planned,pads){
  const overlaps=[];
  for(const [i,a] of planned.entries())for(let j=i+1;j<planned.length;j++){
    const b=planned[j],overlap=pc.intersection(a.mask,b.mask);
    const atJunction=pads[i]&&pads[j];
    if(atJunction&&area(overlap)<=epsilon)throw Error('Les dues calçades s’han de tocar al node de la cruïlla.');
    const outside=atJunction?pc.difference(overlap,pc.intersection(a.pad,b.pad)):overlap;
    if(area(outside)>1e-6)overlaps.push({i,j,outside});
  }
  return overlaps;
}

function planOverpass(roads,terrain,rise,thickness,flexible){
  const tagged=roads.filter(road=>road.brunnel==='bridge'),[bridge]=tagged,[deck]=terrain.deckItems;
  if(roads.length<4||tagged.length!==1||!flexible&&bridge.points.length!==2||terrain.deckItems.length!==1||
      !deck.estimated||deck.axis.length!==bridge.points.length||deck.coordinates.length!==2*deck.axis.length||
      !deck.sourceFeatureIds.some(id=>bridge.sourceFeatureIds.includes(id)))
    throw Error('El pilot necessita un pont cartografiat amb un tauler estimat.');
  const {axis,ends,otherRoads}=connectStructure(bridge,roads,{minimumAlignment:flexible ? .96 : undefined});
  const deckAxis=deck.axis.map(terrain.proj.project);
  const vertices=projectInfrastructurePath(deck.coordinates,terrain.proj,terrain.verticalReference,terrain.exaggeration);
  const heights=[vertices[0][2]+rise,vertices.at(-2)[2]+rise];
  if(distance(deckAxis[0],ends[1])<=epsilon){deckAxis.reverse();heights.reverse();}
  if(deckAxis.some((p,i)=>distance(p,bridge.points[i])>epsilon)||
      Math.abs(deck.widthMetres*terrain.proj.scale-bridge.width)>1e-4)
    throw Error('L’eix i el tauler del pont han de compartir traçat i amplada.');
  const network=[axis,...otherRoads],pads=junctionOf(network);
  const planned=network.map((road,i)=>planRoute(road,pads[i],terrain,rise,i===0?{kind:'bridge',ends,heights,flexible}:null));
  const elevated=planned[0].patches.filter(p=>p.structural);
  if(!elevated.length)throw Error('El tauler del cupó ha de quedar dins del retall.');
  const deckMask=pc.union(...elevated.map(p=>[p.polygon]));
  const crossings=overlapsOutsideJunction(planned,pads);
  if(!crossings.length||crossings.some(({i,outside})=>i!==0||area(pc.difference(outside,deckMask))>1e-6))
    throw Error('La via inferior només pot creuar la superior sota el tauler.');
  const bounds=({polygon:[ring]})=>{
    const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
    return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  };
  const belowBounds=crossings.flatMap(({j})=>planned[j].patches.map(patch=>({patch,bounds:bounds(patch)})));
  let minimumClearanceMM=Infinity;
  for(const a of elevated){
    const [x0,y0,x1,y1]=bounds(a);
    for(const {patch:b,bounds:[bx0,by0,bx1,by1]} of belowBounds){
      if(x0>=bx1||bx0>=x1||y0>=by1||by0>=y1)continue;
      for(const polygon of pc.intersection([a.polygon],[b.polygon]))for(const ring of polygon)for(const [x,y] of ring)
        minimumClearanceMM=Math.min(minimumClearanceMM,a.top(x,y)-thickness-b.top(x,y));
    }
  }
  if(!Number.isFinite(minimumClearanceMM)||minimumClearanceMM<.8)
    throw Error('El tauler no deixa els 0,8 mm de llum mínima sobre la via inferior.');
  return {planned,junctionCount:pads.length?1:0,structure:{id:deck.id,sourceFeatureIds:bridge.sourceFeatureIds,
    spanMM:planned[0].profile.bridgeIntervalMM[1]-planned[0].profile.bridgeIntervalMM[0],minimumClearanceMM}};
}

// Surface routes can share one T and one mapped bridge. The tunnel pilot
// uses one mapped structure and its two approaches.
export function planSurfaceRoad(roads,terrain,rise,thickness,{crossingFallback=false}={}){
  const routes=roads.map(road=>({...road,points:road.points.filter((p,i,all)=>!i||distance(p,all[i-1])>epsilon)}));
  if(routes.some(r=>r.points.length<2||r.points.length>128))
    throw Error('El traçat del cupó ha de tenir entre 2 i 128 punts diferents.');
  if(routes.some(r=>r.brunnel==='bridge')){
    try{
      const {planned,structure,junctionCount}=planOverpass(routes,terrain,rise,thickness,crossingFallback);
      const mask=pc.union(...planned.map(p=>p.mask));
      if(area(pc.difference(mask,terrain.land))>1e-6)throw Error('El cupó de pont ha de quedar sobre el terreny.');
      const fillMask=pc.union(...planned.flatMap(route=>route.patches.filter(p=>!p.structural).map(p=>[p.polygon])));
      return {mask,fillMask,routes:planned,junctionCount,structure};
    }catch(error){
      const bridges=routes.filter(r=>r.brunnel==='bridge');
      if(!crossingFallback||routes.length!==4||bridges.length!==1||routes.some(r=>r.railway||r.brunnel==='tunnel')||
          terrain.deckItems.some(item=>!item.estimated))throw error;
      return planLevelCrossing(routes,bridges[0],terrain,rise,error.message);
    }
  }
  const underground=routes.filter(r=>r.brunnel==='tunnel');
  if(underground.length){
    const [tunnel]=underground;
    if(routes.length!==3||underground.length!==1||tunnel.points.length!==2)
      throw Error('El pilot necessita un túnel recte cartografiat amb dos accessos.');
    const {axis,ends}=connectStructure(tunnel,routes),heights=ends.map(p=>terrain.ground(...p)+rise);
    const route=planRoute(axis,null,terrain,rise,{kind:'tunnel',ends,heights});
    if(!route.mask.length||area(pc.difference(route.mask,terrain.land))>1e-6)
      throw Error('El cupó de túnel ha de quedar sobre el terreny.');
    const fillMask=pc.union(...route.patches.filter(p=>!p.structural).map(p=>[p.polygon]));
    return {mask:route.mask,fillMask,routes:[route],junctionCount:0,tunnel:{sourceFeatureIds:tunnel.sourceFeatureIds}};
  }
  const pads=junctionOf(routes);
  const planned=routes.map((route,i)=>planRoute(route,pads[i],terrain,rise));
  if(overlapsOutsideJunction(planned,pads).length)throw Error('Hi ha calçades que se solapen fora del pla de la cruïlla.');
  const mask=pc.union(...planned.map(p=>p.mask));
  if(!mask.length||area(pc.difference(mask,terrain.land))>1e-6)
    throw Error('El tram del cupó ha de quedar sobre el terreny i dins de la peça.');
  return {mask,fillMask:mask,routes:planned,junctionCount:pads.length?1:0};
}
