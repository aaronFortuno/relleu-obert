import {polygonOps} from './polygon-ops.js';
import {continuationRoute} from './transport-network.js';
import {crossSectionFractions,stripSectionSolid} from './transport-sections.js';
const pc=polygonOps(),dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const unit=(a,b)=>{const d=dist(a,b);return d>1e-8?[(b[0]-a[0])/d,(b[1]-a[1])/d]:[0,0];};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const key=p=>p.slice(0,2).map(v=>Math.round(v*1000)).join(',');
const mix=(a,b,t)=>a.map((v,k)=>v+(b[k]-v)*t);
export function topSampler(points,faces){
  const tris=[];for(let i=0;i<faces.length;i+=3){const [a,b,c]=faces.slice(i,i+3).map(j=>points[j]),det=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(det)>1e-12)tris.push({a,b,c,det});}
  return (x,y)=>{for(const {a,b,c,det}of tris){const u=((x-a[0])*(c[1]-a[1])-(y-a[1])*(c[0]-a[0]))/det,v=((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/det;if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)return a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]);}return null;};
}

// Walk the actual continuation network. A tunnel is deliberately not a surface
// approach; at branches prefer the same road class and the smoothest turn.
export function continuation(end,outward,lines,roadClass,maxLength,identity=null){
  if(identity){const route=continuationRoute(end,outward,lines,identity,maxLength,{allowStructures:true});const points=route.points;Object.defineProperty(points,'segments',{value:route.segments});return points;}
  const nodes=new Map();for(const line of lines)if(!line.brunnel)for(let i=1;i<line.points.length;i++)for(const [a,b]of [[line.points[i-1],line.points[i]],[line.points[i],line.points[i-1]]]){
    const k=key(a);if(!nodes.has(k))nodes.set(k,[]);nodes.get(k).push({from:a,to:b,class:line.class});
  }
  const starts=[];for(const edges of nodes.values())for(const e of edges){const d=dist(end,e.from),alignment=dot(outward,unit(e.from,e.to));if(d<2&&alignment>.35&&dot(outward,[e.to[0]-end[0],e.to[1]-end[1]])>0)starts.push({e,score:d+(1-alignment)*2+(e.class===roadClass?0:5)});}
  starts.sort((a,b)=>a.score-b.score);if(!starts.length)return [];
  const route=[end],visited=new Set();let edge=starts[0].e,direction=outward,length=0;
  if(dist(end,edge.from)>.001&&dot(outward,[edge.from[0]-end[0],edge.from[1]-end[1]])>0)route.push(edge.from);
  for(let i=0;i<200&&edge&&length<maxLength;i++){
    const last=route.at(-1),d=dist(last,edge.to);if(d>1e-5){route.push(edge.to);length+=d;direction=unit(last,edge.to);}
    visited.add(key(edge.from)+'/'+key(edge.to));
    let candidates=(nodes.get(key(edge.to))||[]).filter(e=>!visited.has(key(e.from)+'/'+key(e.to))&&dot(direction,unit(e.from,e.to))>.15);
    // Generalised vector tiles can end a branch on the middle of a nearby
    // segment without sharing a vertex. Stitch only same-class segments within
    // 0.15 mm, and keep following their mapped forward direction.
    if(!candidates.length)for(const edges of nodes.values())for(const e of edges){if(e.class!==roadClass)continue;const dx=e.to[0]-e.from[0],dy=e.to[1]-e.from[1],l=dx*dx+dy*dy;if(l<1e-8)continue;const t=((edge.to[0]-e.from[0])*dx+(edge.to[1]-e.from[1])*dy)/l;if(t<0||t>=.99)continue;const p=mix(e.from,e.to,t);if(dist(p,edge.to)<.15&&dot(direction,unit(e.from,e.to))>.5)candidates.push({from:edge.to,to:e.to,class:e.class});}
    candidates.sort((a,b)=>(dot(direction,unit(b.from,b.to))+(b.class===roadClass?2:0))-(dot(direction,unit(a.from,a.to))+(a.class===roadClass?2:0)));edge=candidates[0];
  }
  return route;
}

function resample(path,step,maxLength){
  const result=[{p:path[0],s:0,segment:0}];let total=0;
  for(let i=1;i<path.length&&total<maxLength;i++){
    const length=dist(path[i-1],path[i]);if(length<1e-6)continue;
    const usable=Math.min(length,maxLength-total),count=Math.ceil(usable/step);
    for(let j=1;j<=count;j++)result.push({p:mix(path[i-1],path[i],usable/length*j/count),s:total+usable*j/count,segment:i-1});total+=usable;
  }return result;
}
function atStation(samples,s){let lo=0,hi=samples.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(samples[mid].s<s)lo=mid;else hi=mid;}const a=samples[lo],b=samples[hi];return {p:mix(a.p,b.p,(s-a.s)/(b.s-a.s)),s,index:lo};}
function section(p,direction,width,z){const n=[-direction[1],direction[0]];return {left:[p[0]+n[0]*width/2,p[1]+n[1]*width/2,z],right:[p[0]-n[0]*width/2,p[1]-n[1]*width/2,z]};}
export function stripSolid(sections,thickness){
  if(sections[0]?.across)return stripSectionSolid(sections,thickness);
  const vertices=[],faces=[];for(const {left:l,right:r}of sections)vertices.push(r[0],r[1],r[2]-thickness,l[0],l[1],l[2]-thickness,...l,...r);
  for(let i=0;i<sections.length-1;i++)for(let k=0;k<4;k++){const a=i*4+k,b=i*4+(k+1)%4;faces.push(a,b,b+4,a,b+4,a+4);}
  const end=(sections.length-1)*4;faces.push(3,2,1,3,1,0,end,end+1,end+2,end,end+2,end+3);
  return {vertices:new Float32Array(vertices),faces:new Uint32Array(faces)};
}
export function columnSolid(ring,ground,top,topRing=ring){
  const vertices=ring.map(([x,y])=>[x,y,ground(x,y)-.25]).concat(topRing.map(([x,y])=>[x,y,top(x,y)+.08])).flat(),faces=[0,2,1,0,3,2,4,5,6,4,6,7];
  for(let i=0;i<4;i++){const j=(i+1)%4;faces.push(i,j,j+4,i,j+4,i+4);}return {vertices:new Float32Array(vertices),faces:new Uint32Array(faces)};
}
function footprint(sections){return [[sections.map(s=>s.right.slice(0,2)).concat(sections.slice().reverse().map(s=>s.left.slice(0,2)),[sections[0].right.slice(0,2)])]];}

// Resampling a straight segment must not independently rotate its crosscuts
// towards a nearby corner. Interpolate the actual offset boundaries between
// mapped vertices; the miter at each vertex preserves the original bend.
function approachNormals(samples){
  const nodes=[0];for(let i=1;i<samples.length-1;i++)if(samples[i].segment!==samples[i+1].segment)nodes.push(i);
  nodes.push(samples.length-1);
  const normals=nodes.map((index,i)=>{
    const before=unit(samples[nodes[Math.max(0,i-1)]].p,samples[index].p),after=unit(samples[index].p,samples[nodes[Math.min(nodes.length-1,i+1)]].p);
    const a=i?before:after,b=i<nodes.length-1?after:before,denominator=1+dot(a,b);
    if(denominator<.5)throw Error('Corba massa tancada per a l’enllaç.');
    return [-(a[1]+b[1])/denominator,(a[0]+b[0])/denominator];
  });
  let interval=1;
  return samples.map((sample,i)=>{
    while(interval<nodes.length-1&&nodes[interval]<i)interval++;
    const a=nodes[interval-1],b=nodes[interval],t=(sample.s-samples[a].s)/(samples[b].s-samples[a].s);
    return mix(normals[interval-1],normals[interval],t);
  });
}

// Geometry is an explicitly estimated PRINT adaptation. The surveyed deck
// surface is unchanged; connections follow mapped roads, with C1 Hermite Z.
export function planApproaches({axis,points,faces,containsDeck,roads,ground,roadRise=0,widthMM,heightMM,roadWidth=.44,scale=.1,destinationSurface=null,destinationBreaks=null,forceConnections=false}){
  const top=topSampler(points,faces),plans=[],missed=[],maxLength=Math.max(40,400*scale);
  for(const reverse of [false,true]){
    const path=reverse?axis.slice().reverse():axis,dir=unit(path[1],path[0]);
    let inside=null;for(const {p}of resample(path,.05,Math.max(widthMM,heightMM)*2))if(containsDeck(p)){inside=p;break;}
    if(!inside){missed.push('no interior');continue;}
    const continuationPath=continuation(path[0],dir,roads,axis.roadClass,maxLength,axis.identity);if(continuationPath.length<2){missed.push('no compatible mapped road');continue;}
    // Move from the mapped endpoint into the measured deck until a full width
    // transverse section exists, then overlap it by a small distance.
    let start=null,width=0,startZ=0;
    for(let d=.1;d<4;d+=.025){const p=[inside[0]-dir[0]*d,inside[1]-dir[1]*d],z=top(...p);if(z==null)continue;const n=[-dir[1],dir[0]],limit=Math.max(4,roadWidth);let left=0,right=0;
      while(left<limit&&containsDeck([p[0]+n[0]*(left+.025),p[1]+n[1]*(left+.025)]))left+=.025;
      while(right<limit&&containsDeck([p[0]-n[0]*(right+.025),p[1]-n[1]*(right+.025)]))right+=.025;
      const refine=(low,sign)=>{let high=low+.025;for(let i=0;i<16;i++){const mid=(low+high)/2;if(containsDeck([p[0]+sign*n[0]*mid,p[1]+sign*n[1]*mid]))low=mid;else high=mid;}return low;};
      if(left<limit)left=refine(left,1);if(right<limit)right=refine(right,-1);
      if(left+right>=.28&&Math.min(left,right)>.12){
        const capWidth=left+right,cap=[p[0]+n[0]*(left-right)/2,p[1]+n[1]*(left-right)/2],incoming=unit(cap,continuationPath[0]),outgoing=unit(continuationPath[0],continuationPath[1]),cosine=dot(incoming,outgoing);
        // The inside offset of a miter extends backwards by r*tan(angle/2).
        // Leave that corner room on the measured deck instead of folding the
        // first strip, while straight joins retain their original overlap.
        if(cosine<.999999&&(cosine<=-.5||dist(cap,continuationPath[0])<capWidth/2*Math.sqrt((1-cosine)/(1+cosine))+.1))continue;
        width=capWidth;start=cap;startZ=top(...start);break;
      }
    }
    if(!start||startZ==null||start[0]<0||start[1]<0||start[0]>widthMM||start[1]>heightMM){missed.push('outside or no cap');continue;}
    const inward=[start[0]-dir[0]*Math.max(width,1),start[1]-dir[1]*Math.max(width,1)],innerZ=top(...inward),grade=innerZ==null?0:(startZ-innerZ)/dist(start,inward);
    // Keep the mapped endpoint: dropping it shortcuts the first bend of a join.
    const route=[start,...continuationPath],samples=[];
    let clippedByCrop=false;
    for(const sample of resample(route,.2,maxLength)){
      const [x,y]=sample.p;
      if(x<0||y<0||x>widthMM||y>heightMM){clippedByCrop=true;break;}
      samples.push(sample);
    }
    const lineAt=sample=>continuationPath.segments?.[sample.segment-1]?.line;
    const landing=(sample,x=sample.p[0],y=sample.p[1])=>destinationSurface?destinationSurface(x,y,lineAt(sample)):ground(x,y);
    const firstExternal=samples.find(s=>s.segment>0)||samples[0];
    if(!forceConnections&&startZ<=landing(firstExternal)+roadRise+.03&&Math.abs(width-roadWidth)<.05)continue;
    const gap=Math.abs(startZ-landing(firstExternal)-roadRise),minimum=Math.max(width*2,2,gap/.12);let end=-1;
    for(let i=1;i<samples.length;i++){const sample=samples[i],{s}=sample,delta=landing(sample)+roadRise-(startZ+grade*s);if(s>=Math.max(width*2,2)&&(delta>=0||s>=minimum&&Math.abs(delta)/s<.15)){end=i;break;}}
    if(end<0){const last=samples.at(-1);missed.push({reason:'no gentle join',clippedByCrop,gap,grade,minimum,available:last?.s??0,finalDelta:last?landing(last)+roadRise-(startZ+grade*last.s):null});continue;}
    const selected=samples.slice(0,end+1),last=selected.at(-1),before=selected.at(-2),length=last.s,endZ=landing(last)+roadRise,endGrade=(landing(last)-landing(before))/(last.s-before.s);
    const terminal=continuationPath.segments?.[last.segment-1],endWidth=terminal?.line.width??roadWidth;
    const startDirection=unit(selected[0].p,selected[1].p),endDirection=unit(before.p,last.p);
    const fractions=crossSectionFractions({centre:start,normal:[-startDirection[1],startDirection[0]],widthMM:width},{points,faces});
    if(destinationBreaks)fractions.push(...destinationBreaks({centre:last.p,normal:[-endDirection[1],endDirection[0]],widthMM:endWidth,line:terminal?.line}));
    const normalized=fractions.map(v=>Math.abs(v)<1e-9?0:Math.abs(v-.5)<1e-9?.5:Math.abs(v+.5)<1e-9?-.5:v);
    const acrossFractions=normalized.filter((v,i,a)=>a.findIndex(q=>Math.abs(q-v)<1e-9)===i).sort((a,b)=>b-a);
    let normals;try{normals=approachNormals(selected);}catch{missed.push('no safe approach bend');continue;}
    const sections=selected.map(({p,s},i)=>{const t=s/length,z=(2*t**3-3*t*t+1)*startZ+(t**3-2*t*t+t)*length*grade+(-2*t**3+3*t*t)*endZ+(t**3-t*t)*length*endGrade,n=normals[i];
      const widthAt=width+(endWidth-width)*(t*t*(3-2*t));
      const across=acrossFractions.map(f=>{
        const q=[p[0]+n[0]*widthAt*f,p[1]+n[1]*widthAt*f,z],own=top(q[0],q[1]);
        q[2]+=(own==null?0:own-startZ)*(1-t)**3+(landing(selected[i],q[0],q[1])-landing(selected[i]))*t**3;return q;
      });
      return {left:across[0],right:across.at(-1),centre:across[acrossFractions.indexOf(0)],across};
    });
    if(sections.some(s=>[s.left,s.right].some(([x,y])=>x<0||y<0||x>widthMM||y>heightMM))){missed.push('approach outside crop');continue;}
    const routingRepairs=continuationPath.segments?.slice(0,last.segment).filter(e=>e.estimatedRepair).map(e=>({from:e.from,to:e.to,sourceFeatureIds:e.line.sourceFeatureIds}))||[];
    plans.push({sections,footprint:footprint(sections),length,grade,endGrade,startZ,endZ,startWidthMM:width,endWidthMM:endWidth,targetFeatureIds:terminal?.line.sourceFeatureIds,routingRepairs,estimated:true});
  }
  return {plans,missed};
}

// Keep expensive masks exact, but construct each only if a viable elevated
// pier candidate needs a collision query. The same mask survives later edits.
export function deferredObstacleMask(create){let mask;return ()=>mask??=create();}

export function planPiers({axis,top,containsDeck,ground,blocked=[],scale,widthMM,heightMM,layout,minimumClearanceMM=.8}){
  if(!Number.isFinite(minimumClearanceMM)||minimumClearanceMM<.25||minimumClearanceMM>.8)throw Error('Separació mínima de suport invàlida.');
  // A physical spacing ceiling is independent of map zoom. It is a modelling
  // heuristic, not a promise that a particular printer can bridge this span.
  const maxSpanMM=10,spacing=Math.min(maxSpanMM,Math.max(4,50*scale)),along=Math.max(.8,(layout?.sectionMetres?.along??2.5)*scale),across=Math.max(.8,(layout?.sectionMetres?.across??2.5)*scale),diameter=Math.max(along,across),fullLength=axis.slice(1).reduce((n,p,i)=>n+dist(p,axis[i]),0),samples=resample(axis,Math.max(.25,2*scale,fullLength/20000),fullLength),length=samples.at(-1)?.s||0,piers=[];let omitted=0;
  if(layout&&(!Number.isFinite(layout.lengthMetres)||layout.lengthMetres<=0||!Array.isArray(layout.spansMetres)||layout.spansMetres.some(v=>!Number.isFinite(v)||v<=0)||Math.abs(layout.spansMetres.reduce((a,b)=>a+b,0)-layout.lengthMetres)>.01||!Array.isArray(layout.stationsMetres)||layout.stationsMetres.length!==layout.spansMetres.length-1||layout.stationsMetres.some((v,i,a)=>!Number.isFinite(v)||v<=0||v>=layout.lengthMetres||i&&v<=a[i-1]||Math.abs(v-layout.spansMetres.slice(0,i+1).reduce((a,b)=>a+b,0))>.01)||!Number.isFinite(layout.sectionMetres?.along)||layout.sectionMetres.along<=0||!Number.isFinite(layout.sectionMetres?.across)||layout.sectionMetres.across<=0||Math.abs(length/(scale*layout.lengthMetres)-1)>.05))throw Error('La distribució de pilars no concorda amb la llargada del projecte.');
  const targets=layout?layout.stationsMetres.map(m=>({station:m/layout.lengthMetres*length,sourceMetres:m})):Array.from({length:Math.max(0,Math.ceil((length-spacing/3-spacing/2)/spacing))},(_,i)=>({station:spacing/2+i*spacing}));
  const collision=ring=>blocked.some(source=>{const mask=typeof source==='function'?source():source;return mask.length&&pc.intersection([[ring.concat([ring[0]])]],mask).length;});
  function place(station,sourceMetres,auxiliary=false){
    const maxShift=layout&&!auxiliary?(layout.maxLongitudinalAdjustmentMetres??3)*scale:2,offsets=layout&&!auxiliary?[0,.25,-.25,.5,-.5,1,-1].map(v=>v*maxShift):[0,.5,-.5,1,-1,1.5,-1.5,2,-2];
    for(const offset of offsets)for(const lateral of [0,.15,-.15,.3,-.3,.45,-.45,.6,-.6,.8,-.8,1,-1]){
      if(station+offset<0||station+offset>length)continue;
      const candidate=atStation(samples,station+offset),index=candidate.index,direction=unit(samples[Math.max(0,index-1)].p,samples[Math.min(samples.length-1,index+1)].p),x=candidate.p[0]-direction[1]*lateral,y=candidate.p[1]+direction[0]*lateral,z=top(x,y);if(z==null||z-ground(x,y)<minimumClearanceMM||piers.some(p=>dist(p.center,[x,y])<diameter*2))continue;
      const rectangle=(a,b,guard=0)=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>[x+direction[0]*u*(a/2+guard)-direction[1]*v*(b/2+guard),y+direction[1]*u*(a/2+guard)+direction[0]*v*(b/2+guard)]),ring=rectangle(along,across),clear=rectangle(along,across,.25);
      if(clear.some(p=>p[0]<=0||p[1]<=0||p[0]>=widthMM||p[1]>=heightMM)||collision(clear))continue;
      // Keep the printable foundation/body, but taper the head when the real
      // deck becomes narrower at a smaller model scale. Only the head must
      // fit the measured surface. The complete body footprint still avoids
      // all loaded obstacles, including its safety margin.
      let topRing=null,topAlongMM=along,topAcrossMM=across;
      for(const factor of [1,.85,.7,.55,.4]){
        const a=Math.max(.32,along*factor),b=Math.max(.32,across*factor),cap=rectangle(a,b);
        if(cap.every(p=>containsDeck(p)&&top(...p)!=null&&top(...p)-ground(...p)>=.25)){topRing=cap;topAlongMM=a;topAcrossMM=b;break;}
      }
      if(!topRing)continue;
      piers.push({center:[x,y],ring,topRing,diameter,alongMM:along,acrossMM:across,topAlongMM,topAcrossMM,station:candidate.s,sourceStationMetres:sourceMetres,longitudinalAdjustmentMM:candidate.s-station,lateralAdjustmentMM:lateral,auxiliary,estimated:true});return true;
    }
    return false;
  }
  for(const {station,sourceMetres}of targets)if(!place(station,sourceMetres))omitted++;
  const unsupported=()=>{
    const runs=[];let start=null,last=null;
    for(const sample of samples){
      const [x,y]=sample.p,z=top(x,y),inCrop=x>=0&&y>=0&&x<=widthMM&&y<=heightMM;
      const free=inCrop&&containsDeck(sample.p)&&z!=null&&z-ground(x,y)>.25&&!piers.some(p=>Math.abs(p.station-sample.s)<=p.topAlongMM/2);
      if(free){if(start==null)start=sample.s;last=sample.s;}
      else if(start!=null){runs.push({start,end:last,lengthMM:last-start});start=null;}
    }
    if(start!=null)runs.push({start,end:last,lengthMM:last-start});
    return runs;
  };
  // Fill long remaining gaps, including a surveyed layout whose real spans
  // become too long in a large print. Never move or replace its safe piers.
  for(const gap of unsupported())if(gap.lengthMM>maxSpanMM){
    const count=Math.ceil(gap.lengthMM/maxSpanMM)-1;
    for(let i=1;i<=count;i++)if(!place(gap.start+gap.lengthMM*i/(count+1),undefined,true))omitted++;
  }
  const gaps=unsupported(),maxUnsupportedSpanMM=gaps.reduce((n,g)=>Math.max(n,g.lengthMM),0),unsupportedSpans=gaps.filter(g=>g.lengthMM>maxSpanMM);
  piers.sort((a,b)=>a.station-b.station);
  return {piers,omitted,spacing:layout?null:spacing,diameter,maxSpanMM,maxUnsupportedSpanMM,unsupportedSpans,auxiliaryPiers:piers.filter(p=>p.auxiliary).length};
}
