import {polygonOps} from './polygon-ops.js';
import {polygonTester} from './polygon-index.js';
import {lineBuffer} from './roads.js';
import {planSurfaceRoad} from './surface-road.js';
import {compatibleTransport} from './transport-network.js';

const pc=polygonOps(),epsilon=1e-5,portalMarginMM=8;
const limits={sources:1000,candidates:256,groupSize:16,groupAttempts:24,stations:2000,overlapChecks:4000,
  partialCandidates:48,partialAttempts:32,partialStations:640,slicesPerSource:2};
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const point=p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]);
const overlapsBox=(a,b)=>a[0]<=b[2]&&b[0]<=a[2]&&a[1]<=b[3]&&b[1]<=a[3];
const keyOf=([x,y])=>`${x},${y}`;
const expand=([x0,y0,x1,y1],by)=>[x0-by,y0-by,x1+by,y1+by];

function bounds(points){
  const result=[Infinity,Infinity,-Infinity,-Infinity];
  for(const [x,y] of points){
    result[0]=Math.min(result[0],x);result[1]=Math.min(result[1],y);
    result[2]=Math.max(result[2],x);result[3]=Math.max(result[3],y);
  }
  return result;
}

function clipSegment(a,b,box){
  let start=0,end=1;
  for(let i=0;i<2;i++){
    const delta=b[i]-a[i];
    if(!delta){if(a[i]<box[i]||a[i]>box[i+2])return null;continue;}
    const left=(box[i]-a[i])/delta,right=(box[i+2]-a[i])/delta;
    start=Math.max(start,Math.min(left,right));end=Math.min(end,Math.max(left,right));
    if(end<=start)return null;
  }
  const at=t=>t===0?a:t===1?b:a.map((v,i)=>v+(b[i]-v)*t);
  return [at(start),at(end)];
}

function clippedAxes(points,box){
  const paths=[];
  for(let i=1;i<points.length;i++){
    const segment=clipSegment(points[i-1],points[i],box);
    if(!segment||distance(...segment)<=epsilon)continue;
    const previous=paths.at(-1);
    if(previous&&distance(previous.at(-1),segment[0])<=epsilon)previous.push(segment[1]);
    else paths.push(segment);
  }
  return paths;
}

function stitchGroup(input){
  const routes=input.slice();
  for(;;){
    const nodes=new Map();
    for(const [i,route] of routes.entries())for(const [j,p] of route.points.entries()){
      const key=keyOf(p),edges=nodes.get(key)||[];
      edges.push({i,j});nodes.set(key,edges);
    }
    let joined=false;
    for(const edges of nodes.values()){
      if(edges.length!==2)continue;
      const [{i,j},{i:k,j:l}]=edges,a=routes[i],b=routes[k];
      if(i===k||(j!==0&&j!==a.points.length-1)||(l!==0&&l!==b.points.length-1)||
          Math.abs(a.width-b.width)>epsilon||(a.layer??0)!==(b.layer??0)||!compatibleTransport(a,b))continue;
      if((a.oneway||0)*(j===0?-1:1)!==(b.oneway||0)*(l===0?1:-1))continue;
      const left=j===0?a.points.slice().reverse():a.points,right=l===0?b.points:b.points.slice().reverse();
      const p=left.at(-2),q=left.at(-1),r=right[1];
      const alignment=((q[0]-p[0])*(r[0]-q[0])+(q[1]-p[1])*(r[1]-q[1]))/(distance(p,q)*distance(q,r));
      if(!(alignment>.5))continue;
      routes[i]={...a,points:[...left,...right.slice(1)],sourceFeatureIds:[...new Set([...a.sourceFeatureIds,...b.sourceFeatureIds])]};
      routes.splice(k,1);joined=true;break;
    }
    if(!joined)return routes;
  }
}

function sourceFragments(routes,box){
  const fragments=new Map();
  for(const route of routes){
    for(const points of clippedAxes(route.points,expand(box,1.5*route.width))){
      const keys=points.map(p=>p.map(v=>Math.round(v/epsilon)).join(','));
      const forward=keys.join(';'),reverse=keys.reverse().join(';');
      const orientation=forward<reverse?1:-1;
      const key=JSON.stringify([route.width,route.layer??0,route.class,route.ref,route.name,
        (route.oneway||0)*orientation,orientation===1?forward:reverse]);
      const duplicate=fragments.get(key);
      if(duplicate)duplicate.sourceFeatureIds=[...new Set([...duplicate.sourceFeatureIds,...route.sourceFeatureIds])];
      else fragments.set(key,{...route,points});
    }
  }
  return [...fragments.values()];
}

function axisSampler(points){
  const stations=[0];
  for(let i=1;i<points.length;i++)stations.push(stations[i-1]+distance(points[i-1],points[i]));
  const length=stations.at(-1);
  const at=station=>{
    let low=0,high=stations.length-1;
    while(high-low>1){
      const mid=(low+high)>>1;
      if(stations[mid]<=station)low=mid;
      else high=mid;
    }
    const a=points[low],b=points[high],step=stations[high]-stations[low],t=(station-stations[low])/step;
    return {p:a.map((v,i)=>v+t*(b[i]-v)),normal:[(a[1]-b[1])/step,(b[0]-a[0])/step]};
  };
  const slice=(from,to)=>[at(from).p,...points.filter((_,i)=>stations[i]>from+epsilon&&stations[i]<to-epsilon),at(to).p];
  return {stations,length,at,slice};
}

function blockedBends(points,width,stations){
  const stationsAtBends=[];
  for(let i=1;i<points.length-1;i++){
    const [a,b,c]=points.slice(i-1,i+2),before=stations[i]-stations[i-1],after=stations[i+1]-stations[i];
    const dot=((b[0]-a[0])*(c[0]-b[0])+(b[1]-a[1])*(c[1]-b[1]))/(before*after);
    const trim=Math.min(1.5*width,.35*before,.35*after);
    // Keep tight corners as legacy and leave the pilot enough room to round
    // all remaining turns without overlapping its inside carriageway edge.
    if(dot<.5||trim<=(width/2+.01)*Math.sqrt(Math.max(0,(1-dot)/(1+dot))))stationsAtBends.push(stations[i]);
  }
  return stationsAtBends;
}

function clearWindows(entry,box,insideLand,blockers){
  const {points,width}=entry.route,{stations,length,at,slice}=axisSampler(points);
  const side=width/2+.28,minLength=Math.max(12,width*4),stepCount=Math.min(1600,Math.ceil(length/.65));
  if(length<minLength||!stepCount)return [];
  const blocked=polygonTester(blockers.flat()),bends=blockedBends(points,width,stations),windows=[];
  const isClear=station=>{
    if(bends.some(s=>Math.abs(s-station)<Math.max(1,width)))return false;
    const {p,normal}=at(station);
    return [-side,0,side].every(offset=>{
      const q=p.map((v,i)=>v+offset*normal[i]);
      return q[0]>.15&&q[0]<box[2]-.15&&q[1]>.15&&q[1]<box[3]-.15&&insideLand(q)&&!blocked(q);
    });
  };
  let start=null,last=null;
  for(let i=0;i<=stepCount;i++){
    const station=length*i/stepCount;
    if(i!==stepCount&&isClear(station)){
      start??=station;last=station;continue;
    }
    if(start===null)continue;
    const from=start+.65,to=last-.65;
    if(to-from>=minLength)windows.push({entry,from,to,length:to-from,points:slice(from,to),blockers});
    start=null;
  }
  return windows;
}

// Candidate planning only. The caller keeps legacy roads until both the
// replacement pavements and their common terrain interface have been built.
export function planRegionalSurfaceRoads(terrain,{rise,thickness,blockedMask=[],blockedIds=new Set()}={}){
  const result={routes:[],mask:[],fillMask:[],partialMask:[],replacedPieces:new Set(),metadata:{mode:'regional',applied:false,
    eligible:0,accepted:0,fullAccepted:0,partialAccepted:0,partialLengthMM:0,groups:[],partialGroups:[],
    omissions:[],omissionCounts:{},junctionCount:0,stations:0,limits}};
  const {metadata,replacedPieces}=result;
  const omit=(reason,ids,detail,count=ids.length)=>{
    metadata.omissionCounts[reason]=(metadata.omissionCounts[reason]||0)+count;
    if(metadata.omissions.length<64)metadata.omissions.push({reason,sourceFeatureIds:ids,detail,count});
  };
  const {transport,roadPieces,rect,proj:{width,height}}=terrain,box=[0,0,width,height];
  if(transport.length>limits.sources||roadPieces.length>limits.sources){
    omit('source-budget',[],'El retall supera el pressupost de fonts del paviment regional.',Math.max(transport.length,roadPieces.length));
    return result;
  }

  // Vector tiles may assign one ID to several unrelated lines in a
  // MultiLineString. Each source footprint belongs to one projected line.
  const sources=roadPieces.map(({id,polys},key)=>({key,id,polys,box:bounds(polys.flat(2))}));
  const visible=sources.filter(entry=>overlapsBox(entry.box,box));
  const protectedKeys=new Set([...blockedIds].map(String));
  const structures=[];
  for(const route of transport){
    if(sources[route.roadPiece])sources[route.roadPiece].route=route;
    if(!['bridge','tunnel'].includes(route.brunnel)||!route.points?.length||!route.points.every(point))continue;
    const radius=(Number.isFinite(route.width)?route.width/2:0)+portalMarginMM;
    structures.push({route,radius,box:expand(bounds(route.points),radius)});
  }

  const eligible=[];
  for(const entry of visible){
    const route=entry.route;
    if(!route||route.railway||route.brunnel||route.sourceFeatureIds.some(id=>protectedKeys.has(String(id)))){
      omit('legacy-source',[entry.id],'Font protegida o estructural.');continue;
    }
    if(!Array.isArray(route.points)||route.points.length>1024||!route.points.every(point)||
        !Number.isFinite(route.width)||route.width<=0){
      omit('axis-budget',[entry.id],'Traçat invàlid o fora del pressupost.');continue;
    }
    const paths=clippedAxes(route.points,expand(box,1.5*route.width));
    if(paths.length!==1||paths[0].length>128){
      omit('axis-budget',[entry.id],'No hi ha un eix visible dins del pressupost.');continue;
    }
    const [points]=paths;
    entry.route={...route,points};
    entry.length=points.slice(1).reduce((sum,p,i)=>sum+distance(points[i],p),0);
    eligible.push(entry);
  }
  metadata.eligible=eligible.length;
  eligible.sort((a,b)=>b.length-a.length||a.key-b.key);
  const candidates=eligible.slice(0,limits.candidates);
  for(const entry of eligible.slice(limits.candidates))omit('candidate-budget',[entry.id],'S’ha assolit el límit de candidats.');

  const sourceMask=entry=>entry.mask??=(entry.polys.length>2048?null:pc.intersection(pc.union(entry.polys),rect));
  const structureMask=entry=>entry.mask??=(entry.route.points.length>128?null:
    pc.intersection(pc.union(lineBuffer(entry.route.points,entry.radius,[width,height])),rect));
  let overlapChecks=0;
  const collides=(a,b)=>{
    if(!a||!b)return true;
    if(!a.length||!b.length)return false;
    if(++overlapChecks>limits.overlapChecks)throw Error('S’ha assolit el pressupost de comprovacions de solapament.');
    return pc.intersection(a,b).length>0;
  };

  const pending=new Set(candidates),groups=[];
  for(const first of candidates){
    if(!pending.delete(first))continue;
    const group=[first];
    for(const member of group)for(const other of pending){
      if(!overlapsBox(member.box,other.box))continue;
      let touches;
      try{touches=collides(sourceMask(member),sourceMask(other));}
      catch{touches=true;}
      if(touches){pending.delete(other);group.push(other);}
    }
    groups.push(group);
  }

  let attempts=0;
  for(const group of groups){
    const ids=group.map(entry=>entry.id),groupKeys=new Set(group.map(entry=>entry.key));
    if(group.length>limits.groupSize){omit('complex-network',ids,'La xarxa local supera el nombre de fonts admès.');continue;}
    if(attempts>=limits.groupAttempts||metadata.stations>=limits.stations||overlapChecks>=limits.overlapChecks){
      omit('planning-budget',ids,'S’ha assolit el pressupost de planificació regional.');continue;
    }
    try{
      const axes=stitchGroup(sourceFragments(group.map(entry=>entry.route),box));
      if(axes.length>2||axes.some(axis=>axis.points.length>128)){
        omit('complex-network',ids,'El grup no es pot reduir a un eix o una cruïlla en T.');continue;
      }
      attempts++;
      const ownMasks=group.map(sourceMask);
      if(ownMasks.some(mask=>!mask?.length)){
        omit('unusable-footprint',ids,'No s’ha pogut delimitar tota la cobertura original del grup.');continue;
      }
      const oldMask=pc.union(...ownMasks),oldBox=bounds(oldMask.flat(2));
      const external=visible.filter(entry=>!groupKeys.has(entry.key)&&!replacedPieces.has(entry.key));
      const protectedOverlap=(mask,maskBox)=>collides(mask,blockedMask)||
        structures.some(entry=>overlapsBox(entry.box,maskBox)&&collides(mask,structureMask(entry)));
      const externalOverlap=(mask,maskBox)=>external.some(entry=>overlapsBox(entry.box,maskBox)&&collides(mask,sourceMask(entry)));
      if(protectedOverlap(oldMask,oldBox)||externalOverlap(oldMask,oldBox)){
        omit('protected-overlap',ids,'El traçat original toca vies, taulers o portals amb tractament propi.');continue;
      }
      const plan=planSurfaceRoad(axes,terrain,rise,thickness),newBox=bounds(plan.mask.flat(2));
      if((axes.length===2&&plan.junctionCount!==1)||protectedOverlap(plan.mask,newBox)||externalOverlap(plan.mask,newBox)||
          collides(plan.mask,result.mask)){
        omit('unsafe-replacement',ids,'La calçada nova no queda aïllada de la resta de vies.');continue;
      }
      const stations=plan.routes.reduce((sum,route)=>sum+route.profile.stations.length,0);
      if(metadata.stations+stations>limits.stations){omit('planning-budget',ids,'S’ha assolit el límit de seccions.');continue;}
      const combined=pc.union(result.mask,plan.mask);
      result.mask=combined;result.fillMask=combined;result.routes.push(...plan.routes);
      for(const entry of group)replacedPieces.add(entry.key);
      metadata.stations+=stations;metadata.junctionCount+=plan.junctionCount;
      metadata.groups.push({sourceFeatureIds:[...new Set(ids)],fragments:group.length,routes:plan.routes.length,junctions:plan.junctionCount,stations});
    }catch(error){omit('rejected-group',ids,error.message);}
  }

  // A dense group can keep its legacy junctions and still get a new profile
  // on independent internal stretches. The actual filleted mask, rather than
  // the sampled corridor, is authoritative for overlap checks.
  const insideLand=polygonTester(terrain.land),windows=[];
  for(const entry of candidates.filter(entry=>!replacedPieces.has(entry.key)).slice(0,limits.partialCandidates)){
    const boxAlongAxis=expand(bounds(entry.route.points),entry.route.width*1.5+.5);
    try{
      const blockers=[blockedMask,result.mask,
        ...visible.filter(other=>other!==entry&&!replacedPieces.has(other.key)&&overlapsBox(other.box,boxAlongAxis)).map(sourceMask),
        ...structures.filter(other=>overlapsBox(other.box,boxAlongAxis)).map(structureMask)];
      if(blockers.some(mask=>!mask))continue;
      windows.push(...clearWindows(entry,box,insideLand,blockers));
    }catch(error){omit('partial-analysis',[entry.id],error.message);}
  }
  windows.sort((a,b)=>b.length-a.length||a.entry.key-b.entry.key||a.from-b.from);
  const partialSources=new Map();
  let partialAttempts=0,partialStations=0;
  for(const window of windows){
    const {entry,points,length,from,to,blockers}=window,count=partialSources.get(entry.key)||0;
    if(count>=limits.slicesPerSource)continue;
    if(partialAttempts>=limits.partialAttempts||metadata.stations>=limits.stations||
        partialStations>=limits.partialStations||overlapChecks>=limits.overlapChecks)break;
    partialAttempts++;
    try{
      const plan=planSurfaceRoad([{...entry.route,points}],terrain,rise,thickness);
      if(blockers.some(mask=>collides(plan.mask,mask))||collides(plan.mask,result.mask))continue;
      const [route]=plan.routes,stations=route.profile.stations.length;
      if(metadata.stations+stations>limits.stations||partialStations+stations>limits.partialStations)continue;
      const combined=pc.union(result.mask,plan.mask),partialMask=pc.union(result.partialMask,plan.mask);
      const transitionMM=Math.min(3,length/4);
      result.mask=combined;result.fillMask=combined;result.partialMask=partialMask;
      result.routes.push({...route,transitionMM});
      partialSources.set(entry.key,count+1);
      metadata.stations+=stations;partialStations+=stations;metadata.partialLengthMM+=length;
      const ends=[route.profile.stations[0].centre,route.profile.stations.at(-1).centre];
      metadata.partialGroups.push({sourceFeatureIds:entry.route.sourceFeatureIds,sourcePiece:entry.key,
        fromMM:from,toMM:to,lengthMM:length,ends,transitionMM,stations});
    }catch(error){omit('partial-rejected',[entry.id],error.message);}
  }
  metadata.fullAccepted=replacedPieces.size;
  metadata.partialAccepted=partialSources.size;
  metadata.accepted=metadata.fullAccepted+metadata.partialAccepted;
  metadata.applied=metadata.accepted>0;
  metadata.overlapChecks=overlapChecks;
  return result;
}
