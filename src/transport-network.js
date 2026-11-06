import {isRailway} from './railways.js';

const EPS=1e-7;
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const direction=(a,b)=>{const d=distance(a,b);return d>EPS?[(b[0]-a[0])/d,(b[1]-a[1])/d]:[0,0];};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const point=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]);
const text=value=>typeof value==='string'||typeof value==='number'?String(value).trim().normalize('NFKC'):'';
const nameOf=value=>text(value).toLocaleLowerCase('ca');
const classOf=properties=>{
  const value=text(properties.class);
  return (value==='motorway'||value==='trunk'||value==='primary')&&[true,1,'1','yes'].includes(properties.ramp)?value+'_link':value;
};
const refs=value=>text(value).toUpperCase().split(/[;,]/).map(v=>v.trim().replace(/\s+/g,'')).filter(Boolean).sort();
const shares=(a,b)=>a.some(value=>b.includes(value));

export function transportIdentity(properties={},id=null){
  properties??={};
  const ids=[...(Array.isArray(properties.sourceFeatureIds)?properties.sourceFeatureIds:[]),...(id==null?[]:[id])];
  const sourceFeatureIds=[...new Map(ids.filter(v=>v!=null).map(v=>[String(v),v])).values()];
  const rawLayer=properties.layer,layer=rawLayer==null||rawLayer===''?null:Number(rawLayer);
  const rawOneway=properties.oneway,oneway=rawOneway===-1||rawOneway==='-1'?-1:[true,1,'1','yes','true'].includes(rawOneway)?1:0;
  return {sourceFeatureIds,ref:refs(properties.ref).join(';'),name:nameOf(properties.name),class:classOf(properties),layer:Number.isFinite(layer)?layer:null,railway:typeof properties.railway==='boolean'?properties.railway:isRailway(properties),oneway};
}

function identity(value={}){value??={};return transportIdentity(value.properties?{...value.properties,...value}:value,value.id??null);}
function relationship(a,b){
  const left=identity(a),right=identity(b),leftRefs=refs(left.ref),rightRefs=refs(right.ref);
  const sharedID=shares(left.sourceFeatureIds.map(String),right.sourceFeatureIds.map(String));
  const sharedRef=leftRefs.length>0&&rightRefs.length>0&&shares(leftRefs,rightRefs);
  const sharedName=!!left.name&&left.name===right.name;
  return {left,right,sharedID,sharedRef,sharedName,leftRefs,rightRefs};
}

// Identity is a prerequisite, never evidence that an interior map crossing is
// a junction. continuationRoute separately restricts changes to line endpoints.
export function compatibleTransport(a,b){
  const {left,right,sharedID,sharedRef,sharedName,leftRefs,rightRefs}=relationship(a,b);
  if(left.railway!==right.railway)return false;
  if(leftRefs.length&&rightRefs.length&&!sharedRef)return false;
  if(left.name&&right.name&&!sharedName&&!sharedRef&&!sharedID)return false;
  const strong=sharedID||sharedRef||sharedName;
  if(left.class&&right.class&&left.class!==right.class&&!strong)return false;
  if(left.layer!=null&&right.layer!=null&&left.layer!==right.layer&&!strong)return false;
  return true;
}

function rank(a,b){const r=relationship(a,b);return r.sharedID?3:r.sharedRef?2:r.sharedName?1:0;}
function stableKey(line,points){
  const i=identity(line);
  return JSON.stringify([i.ref,i.name,i.class,i.layer,i.railway,i.sourceFeatureIds.map(String).sort(),Number(line.width)||0,points]);
}

// Physical continuation is bidirectional even on a one-way road: a bridge has
// two abutments. one-way metadata is retained, rather than used to lose one end.
export function continuationRoute(end,outward,lines,routeIdentity,maxLength,{allowStructures=false,maxStartDistanceMM=.15}={}){
  if(!point(end)||!point(outward)||!Number.isFinite(maxLength)||maxLength<=0||!Number.isFinite(maxStartDistanceMM)||maxStartDistanceMM<0)
    throw Error('Configuració de continuïtat viària invàlida.');
  const heading=direction([0,0],outward);
  if(!heading[0]&&!heading[1])return {points:[],segments:[]};
  const radius=maxLength+maxStartDistanceMM+EPS;
  const [west,south,east,north]=[end[0]-radius,end[1]-radius,end[0]+radius,end[1]+radius];
  const entries=[];
  for(const [index,line]of lines.entries()){
    if(!line||!Array.isArray(line.points)||line.points.length<2)continue;
    if(!allowStructures&&line.brunnel)continue;
    // A route cannot leave the distance budget. Test the whole line's
    // bounds since an interior segment can repair a generalized junction.
    let xmin=Infinity,ymin=Infinity,xmax=-Infinity,ymax=-Infinity;
    for(const p of line.points){
      if(!point(p)){xmin=Infinity;break;}
      xmin=Math.min(xmin,p[0]);xmax=Math.max(xmax,p[0]);
      ymin=Math.min(ymin,p[1]);ymax=Math.max(ymax,p[1]);
    }
    if(xmin===Infinity||xmin>east||xmax<west||ymin>north||ymax<south)continue;
    if(!compatibleTransport(routeIdentity,line))continue;
    const points=line.points.map(p=>p.slice(0,2)).filter((p,i,a)=>!i||distance(p,a[i-1])>EPS);
    if(points.length<2)continue;
    entries.push({index,line,points,key:stableKey(line,points)});
  }
  const visited=new Set(),points=[end.slice(0,2)],segments=[];let length=0,currentIdentity=routeIdentity,currentHeading=heading,completedEntry=null;
  function candidate(entry,reversed){
    if(visited.has(entry.index))return null;
    const a=reversed?entry.points.at(-1):entry.points[0],b=reversed?entry.points.at(-2):entry.points[1],edge=direction(a,b),alignment=dot(currentHeading,edge),current=points.at(-1);
    if(alignment<=.15||dot(currentHeading,[b[0]-current[0],b[1]-current[1]])<=EPS)return null;
    const edgeLength=distance(a,b),along=dot([current[0]-a[0],current[1]-a[1]],edge);
    // A generalized endpoint may be a little inside the first segment. Never
    // project onto a distant interior part of another line to create a junction.
    const nearEndpoint=distance(current,a)<=maxStartDistanceMM+EPS;
    const projected=[a[0]+edge[0]*along,a[1]+edge[1]*along];
    const nearProjection=along>=0&&along<=Math.min(edgeLength,maxStartDistanceMM)+EPS&&distance(current,projected)<=maxStartDistanceMM+EPS;
    if((!nearEndpoint&&!nearProjection)||!compatibleTransport(currentIdentity,entry.line))return null;
    const path=reversed?entry.points.slice().reverse():entry.points;
    return {entry,path,alignment,distance:distance(current,a),rank:rank(routeIdentity,entry.line)+rank(currentIdentity,entry.line),key:entry.key+(reversed?'|reverse':'|forward')};
  }
  function projectedContinuation(){
    // Generalized tiles can end one surface line just inside the next. This
    // repair is available only AFTER following a complete mapped line, never
    // to start a route at an arbitrary interior crossing or to bridge levels.
    if(!completedEntry||completedEntry.line.brunnel)return null;
    const current=points.at(-1),previous=identity(completedEntry.line),candidates=new Map(),limit=Math.min(.15,maxStartDistanceMM);
    for(const entry of entries){
      if(visited.has(entry.index)||entry.line.brunnel||!compatibleTransport(currentIdentity,entry.line))continue;
      const nextIdentity=identity(entry.line);
      if(previous.layer!=null&&nextIdentity.layer!=null&&previous.layer!==nextIdentity.layer)continue;
      // An unnamed overlapping carriageway is not evidence that a known
      // named/ref route continues through its interior. Do not discard the
      // route evidence merely because an anonymous line is "compatible".
      const keepsIdentity=known=>{
        const r=relationship(known,entry.line);
        return (!r.leftRefs.length||r.sharedRef||r.sharedID)&&(!r.left.name||r.sharedName||r.sharedRef||r.sharedID);
      };
      if(!keepsIdentity(routeIdentity)||!keepsIdentity(currentIdentity))continue;
      for(const reversed of [false,true]){
        const path=reversed?entry.points.slice().reverse():entry.points,key=stableKey(entry.line,path);
        for(let i=1;i<path.length;i++){
          const a=path[i-1],b=path[i],edge=direction(a,b),alignment=dot(currentHeading,edge),length=distance(a,b);
          if(alignment<=.995)continue;
          const along=dot([current[0]-a[0],current[1]-a[1]],edge);
          if(along<0||along>length)continue;
          const projected=[a[0]+edge[0]*along,a[1]+edge[1]*along],separation=distance(current,projected),tail=path.slice(i);
          if(separation>limit+EPS||!tail.some(p=>distance(projected,p)>EPS))continue;
          const before=candidates.get(key);
          if(!before||separation<before.distance-EPS)candidates.set(key,{entry,path:[current.slice(),projected,...tail],alignment,distance:separation,key,estimatedRepair:true});
        }
      }
    }
    // Even a nearer candidate is not sufficient evidence at an ambiguous join.
    return candidates.size===1?[...candidates.values()][0]:null;
  }
  for(let step=0;step<200&&length<maxLength-EPS;step++){
    const candidates=entries.flatMap(entry=>[candidate(entry,false),candidate(entry,true)]).filter(Boolean);
    candidates.sort((a,b)=>b.rank-a.rank||b.alignment-a.alignment||a.distance-b.distance||a.key.localeCompare(b.key));
    const next=candidates[0]??projectedContinuation();if(!next)break;
    visited.add(next.entry.index);currentIdentity=identity(next.entry.line);
    for(const target of next.path.slice(1)){
      const from=points.at(-1),d=distance(from,target);if(d<=EPS)continue;
      const usable=Math.min(d,maxLength-length),to=usable<d?[from[0]+(target[0]-from[0])*usable/d,from[1]+(target[1]-from[1])*usable/d]:target.slice();
      segments.push({from:from.slice(),to:to.slice(),line:next.entry.line,...(next.estimatedRepair?{estimatedRepair:true}:{})});points.push(to);length+=usable;currentHeading=direction(from,to);
      if(length>=maxLength-EPS)return {points,segments};
    }
    completedEntry=next.entry;
  }
  return segments.length?{points,segments}:{points:[],segments:[]};
}
