// Superfícies de tauler (TOP, no sòlids) estimades per a ponts MVT
// (sourceLayer=transportation, brunnel=bridge; túnels exclosos). Les cotes
// s'interpolen linealment per distància acumulada entre les elevacions DEM
// dels dos extrems de l'eix; els interiors no són cotes mesurades. Funció
// pura i síncrona: sense xarxa ni DOM. El bbox filtra per intersecció i mai
// retalla el perfil: el mateix pont té les mateixes cotes en qualsevol retall.

import {isRailway,isInactiveRailway,railwayWidthMetres} from './railways.js';
import {roadWidthMetres,roadMinimumWidthMM} from './transport-width.js';
const LAT_METRES=111320;
const MAX_FEATURES=50000,MAX_BRIDGES=200,MAX_AXIS_POINTS=1000;
const MAX_FRAGMENTS=1000,MAX_TOTAL_POINTS=20000,MAX_LINE_POINTS=2000;

// Una línia amb qualsevol punt invàlid (no finit o fora de lon/lat) es
// rebutja sencera: mai se salta el punt i s'uneixen les vores sobre un buit.
function cleanLine(line){
  if(!Array.isArray(line))return null;
  const points=[];
  for(const p of line){
    if(!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))return null;
    if(Math.abs(p[0])>180||Math.abs(p[1])>90)return null;
    const last=points[points.length-1];
    if(!last||Math.abs(p[0]-last[0])>1e-9||Math.abs(p[1]-last[1])>1e-9)points.push([p[0],p[1]]);
  }
  return points.length>=2?points:null;
}

function lineKey(points){
  return points.map(p=>`${p[0].toFixed(6)},${p[1].toFixed(6)}`).join(';');
}

function endKey(p){
  return `${Math.round(p[0]*1e5)},${Math.round(p[1]*1e5)}`; // graella ~1 m
}

function widthFromProperties(props,warnings,label){
  if(props.width!==undefined&&props.width!==null&&props.width!==''){
    const raw=Number(props.width);
    if(!Number.isFinite(raw)||raw<.5||raw>60)
      warnings.push(`Pont ${label}: amplada «${props.width}» rebutjada; s'usa una estimació de carrils o classe.`);
  }
  return isRailway(props)?railwayWidthMetres(props):roadWidthMetres(props);
}

const groupOf=props=>JSON.stringify([String(props.class??''),String(props.layer??0),String(props.name??''),String(props.ref??''),String(props.oneway??''),props.railway??'',props.subclass??'',isRailway(props)?railwayWidthMetres(props):roadWidthMetres(props)]);

// MVT tiles include a buffer. Two copies of one way can overlap by tens of
// metres without sharing a vertex at the seam. Work in metres for matching.
const SEAM_TOLERANCE=1, MIN_SEAM_OVERLAP=3;
function seamPath(points,kx){
  const xy=points.map(([x,y])=>[x*kx,y*LAT_METRES]),stations=[0];
  for(let i=1;i<xy.length;i++)stations.push(stations[i-1]+Math.hypot(xy[i][0]-xy[i-1][0],xy[i][1]-xy[i-1][1]));
  return {points,xy,stations,length:stations.at(-1)};
}

function nearestStation(point,path){
  let nearest={distance:Infinity};
  for(let i=1;i<path.xy.length;i++){
    const a=path.xy[i-1],b=path.xy[i],dx=b[0]-a[0],dy=b[1]-a[1],length=path.stations[i]-path.stations[i-1];
    if(!length)continue;
    const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(length*length)));
    const distance=Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy);
    if(distance<nearest.distance)nearest={distance,station:path.stations[i-1]+t*length};
  }
  return nearest;
}

function stationPoint(path,station){
  const next=path.stations.findIndex(s=>s>=station);
  if(next<0)return path.xy.at(-1);
  if(next===0)return path.xy[0];
  const t=(station-path.stations[next-1])/(path.stations[next]-path.stations[next-1]);
  return path.xy[next-1].map((v,i)=>v+(path.xy[next][i]-v)*t);
}

function overlapTail(left,right){
  const start=nearestStation(right.xy[0],left),end=nearestStation(left.xy.at(-1),right);
  if(start.distance>SEAM_TOLERANCE||end.distance>SEAM_TOLERANCE||
      left.length-start.station<MIN_SEAM_OVERLAP||end.station<MIN_SEAM_OVERLAP||
      start.station<MIN_SEAM_OVERLAP||right.length-end.station<MIN_SEAM_OVERLAP)return null;
  const length=left.length-start.station;
  if(Math.abs(length-end.station)>2*SEAM_TOLERANCE)return null;
  // Both oriented overlap intervals must follow the same geometry. An
  // intersection, reversed traversal or same-ID fork is insufficient.
  for(let i=1;i<8;i++){
    const fraction=i/8,a=stationPoint(left,start.station+fraction*length),b=stationPoint(right,fraction*end.station);
    if(Math.hypot(a[0]-b[0],a[1]-b[1])>SEAM_TOLERANCE)return null;
  }
  return right.points.filter((_,i)=>right.stations[i]>end.station+SEAM_TOLERANCE);
}

function joinTileOverlaps(fragments){
  const byIdentity=new Map();
  for(const fragment of fragments){
    const key=JSON.stringify([fragment.group,fragment.id]);
    if(!byIdentity.has(key))byIdentity.set(key,[]);
    byIdentity.get(key).push(fragment);
  }
  const result=[];
  for(const group of byIdentity.values()){
    // A single stable feature ID normally appears once per tile. Keep
    // anomalous groups bounded before doing pairwise geometric checks.
    if(group.length<2||group.length>32){result.push(...group);continue;}
    const parts=group.map(f=>{
      const reversed=f.points.slice().reverse(),points=lineKey(f.points)<lineKey(reversed)?f.points:reversed;
      return {...f,points};
    }).sort((a,b)=>lineKey(a.points).localeCompare(lineKey(b.points)));
    const kx=LAT_METRES*Math.cos(parts[0].points[0][1]*Math.PI/180);
    while(parts.length>1){
      const paths=parts.map(f=>[seamPath(f.points,kx),seamPath(f.points.slice().reverse(),kx)]),candidates=[];
      for(let a=0;a<parts.length;a++)for(let b=a+1;b<parts.length;b++){
        for(const left of [0,1])for(const right of [0,1]){
          const tail=overlapTail(paths[a][left],paths[b][right]);
          if(tail?.length)candidates.push({a,b,endA:1-left,endB:right,points:[...paths[a][left].points,...tail]});
        }
      }
      const ends=new Map();
      for(const {a,b,endA,endB}of candidates)for(const key of [2*a+endA,2*b+endB])ends.set(key,(ends.get(key)||0)+1);
      const join=candidates.find(({a,b,endA,endB})=>ends.get(2*a+endA)===1&&ends.get(2*b+endB)===1);
      if(!join)break;
      parts[join.a]={...parts[join.a],points:join.points};
      parts.splice(join.b,1);
    }
    result.push(...parts);
  }
  return result;
}

// Join only compatible route/level/width fragments at unambiguous degree-2
// endpoints. A width change stays explicit instead of inheriting A.props.
function joinFragments(fragments){
  const groups=new Map();
  for(const f of fragments){
    const key=f.group;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(f);
  }
  const merged=[];
  for(const group of groups.values()){
    const frags=group.map(f=>({points:f.points.slice(),ids:[f.id],props:f.props,group:f.group}));
    let changed=true;
    while(changed){
      changed=false;
      const ends=new Map();
      frags.forEach((f,i)=>{
        ends.set(endKey(f.points[0]),(ends.get(endKey(f.points[0]))||[]).concat([[i,0]]));
        ends.set(endKey(f.points[f.points.length-1]),(ends.get(endKey(f.points[f.points.length-1]))||[]).concat([[i,1]]));
      });
      for(const list of ends.values()){
        if(list.length!==2)continue; // grau 3+ (bifurcació) o extrem lliure: no s'hi toca
        const [a,b]=list;
        if(a[0]===b[0])continue;
        const A=frags[a[0]],B=frags[b[0]];
        let points,ids;
        if(a[1]===1&&b[1]===0){points=A.points.concat(B.points.slice(1));ids=A.ids.concat(B.ids);}
        else if(a[1]===1&&b[1]===1){const r=B.points.slice().reverse();points=A.points.concat(r.slice(1));ids=A.ids.concat(B.ids.slice().reverse());}
        else if(a[1]===0&&b[1]===0){const r=A.points.slice().reverse();points=r.concat(B.points.slice(1));ids=A.ids.slice().reverse().concat(B.ids);}
        else{points=B.points.concat(A.points.slice(1));ids=B.ids.concat(A.ids);}
        const keep=frags.filter((_,i)=>i!==a[0]&&i!==b[0]);
        keep.push({points:cleanLine(points)||points,ids,props:A.props,group:A.group});
        frags.length=0;frags.push(...keep);
        changed=true;
        break;
      }
    }
    merged.push(...frags);
  }
  return merged;
}

export function generateProceduralBridgeItems(features,elevationAt,{scale=.1,minWidthMM,bbox}={}){
  if(!Array.isArray(features))throw Error('Les entitats d’entrada han de ser un array.');
  if(typeof elevationAt!=='function')throw Error('Cal un callback elevationAt(lon,lat).');
  if(!Number.isFinite(scale)||scale<=0)throw Error('Escala invàlida.');
  if(minWidthMM!==undefined&&(!Number.isFinite(minWidthMM)||minWidthMM<=0))throw Error('Amplada mínima invàlida.');
  if(bbox!==undefined&&(!Array.isArray(bbox)||bbox.length!==4||!bbox.every(Number.isFinite)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3]))throw Error('Bbox invàlid.');
  const warnings=[];
  let input=features;
  if(input.length>MAX_FEATURES){
    warnings.push(`Entrada limitada a ${MAX_FEATURES} entitats (${input.length} rebudes).`);
    input=input.slice(0,MAX_FEATURES);
  }
  const seen=new Set(),fragments=[];
  let totalPoints=0,droppedFragments=0;
  input.forEach((f,index)=>{
    const props=f?.properties||{};
    if(props.sourceLayer!=='transportation'||props.brunnel!=='bridge'||isInactiveRailway(props))return;
    const g=f?.geometry||{};
    const lines=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'&&Array.isArray(g.coordinates)?g.coordinates:[];
    for(const line of lines){
      if(fragments.length>=MAX_FRAGMENTS||totalPoints>=MAX_TOTAL_POINTS){droppedFragments++;continue;}
      if(Array.isArray(line)&&line.length>MAX_LINE_POINTS){
        warnings.push(`Pont ${f.id??index} omès: línia de ${line.length} punts superior al límit de ${MAX_LINE_POINTS}.`);
        continue; // Never invent a new endpoint and interpolate a false vertical profile.
      }
      const points=cleanLine(line);
      if(!points){if(Array.isArray(line)&&line.length)warnings.push(`Geometria de pont invàlida o massa curta (${f.id??index}).`);continue;}
      if(totalPoints+points.length>MAX_TOTAL_POINTS){droppedFragments++;continue;}
      const group=groupOf(props); // route/width identity before deduplicating
      const key=group+'|'+lineKey(points),reverse=group+'|'+lineKey(points.slice().reverse());
      if(seen.has(key)||seen.has(reverse))continue; // duplicat del mateix grup, també en ordre invers
      seen.add(key);
      totalPoints+=points.length;
      fragments.push({points,class:String(props.class??''),layer:props.layer??null,name:String(props.name??''),id:f.id??props['@id']??`f${index}`,props,group});
    }
  });
  if(droppedFragments)warnings.push(`Pressupost d'unió aplicat: ${droppedFragments} fragments omesos (límits de ${MAX_FRAGMENTS} fragments i ${MAX_TOTAL_POINTS} punts).`);
  const axes=joinFragments(joinTileOverlaps(fragments));
  // Orientació canònica per coordenades d'extrems: invertir l'ordre dels
  // fragments d'entrada no pot canviar la posició dels pilars entre retalls.
  for(const axis of axes){
    const first=axis.points[0],last=axis.points[axis.points.length-1];
    if(last[0]<first[0]||(last[0]===first[0]&&last[1]<first[1])){axis.points.reverse();axis.ids.reverse();}
  }
  // El bbox filtra per intersecció ABANS del pressupost de ponts: eixos
  // aliens a l'àrea mai descarten ponts de dins. Mai es retalla el perfil.
  const inBBox=bbox?axes.filter(axis=>{
    let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;
    for(const [lon,lat] of axis.points){if(lon<w)w=lon;if(lon>e)e=lon;if(lat<s)s=lat;if(lat>n)n=lat;}
    return!(e<bbox[0]||w>bbox[2]||n<bbox[1]||s>bbox[3]);
  }):axes;
  inBBox.sort((a,b)=>a.points[0][0]-b.points[0][0]||a.points[0][1]-b.points[0][1]||a.points.length-b.points.length||a.group.localeCompare(b.group));
  if(inBBox.length>MAX_BRIDGES){
    warnings.push(`Pressupost de ${MAX_BRIDGES} ponts aplicat: ${inBBox.length-MAX_BRIDGES} eixos omesos.`);
    inBBox.length=MAX_BRIDGES;
  }
  const items=[];
  inBBox.forEach((axis,order)=>{
    const id=`proc-bridge-${String(order+1).padStart(4,'0')}`;
    let points=axis.points;
    if(points.length>MAX_AXIS_POINTS){
      warnings.push(`Pont ${id}: eix reduït de ${points.length} a ${MAX_AXIS_POINTS} punts.`);
      const step=(points.length-1)/(MAX_AXIS_POINTS-1);
      points=Array.from({length:MAX_AXIS_POINTS},(_,i)=>points[Math.round(i*step)]);
    }
    const [lon0,lat0]=points[0],[lon1,lat1]=points[points.length-1];
    let z0,z1;
    try{z0=elevationAt(lon0,lat0);z1=elevationAt(lon1,lat1);}
    catch{warnings.push(`Pont ${id} omès: el DEM ha fallat a un extrem.`);return;}
    if(![z0,z1].every(v=>Number.isFinite(v)&&v>-500&&v<9000)){
      warnings.push(`Pont ${id} omès: elevació d’extrem no vàlida (${z0}, ${z1}).`);
      return;
    }
    const railway=isRailway(axis.props);
    const sourceWidthMetres=widthFromProperties(axis.props,warnings,id);
    const minimumMM=minWidthMM??(railway ? .44 : roadMinimumWidthMM(axis.props,scale));
    const widthMetres=Math.max(sourceWidthMetres,minimumMM/scale);
    const latRef=points[0][1],kx=LAT_METRES*Math.cos(latRef*Math.PI/180);
    const xy=points.map(([lon,lat])=>[lon*kx,lat*LAT_METRES]);
    const distance=[0];
    for(let i=1;i<xy.length;i++)distance.push(distance[i-1]+Math.hypot(xy[i][0]-xy[i-1][0],xy[i][1]-xy[i-1][1]));
    const total=distance[distance.length-1];
    if(total<1e-6){warnings.push(`Pont ${id} omès: eix de longitud nul·la.`);return;}
    const directions=[];
    for(let i=1;i<xy.length;i++){
      const dx=xy[i][0]-xy[i-1][0],dy=xy[i][1]-xy[i-1][1],length=Math.hypot(dx,dy);
      directions.push([dx/length,dy/length]);
    }
    const half=widthMetres/2,coordinates=[];
    for(let i=0;i<xy.length;i++){
      const before=directions[Math.max(0,i-1)],after=directions[Math.min(i,directions.length-1)];
      const dot=before[0]*after[0]+before[1]*after[1];
      if(dot<-.5){warnings.push(`Pont ${id} omès: revolt massa tancat per a un offset fiable.`);return;}
      const nx=-(before[1]+after[1])/(1+dot),ny=(before[0]+after[0])/(1+dot); // miter limitat (|miter|≤2)
      const z=z0+(z1-z0)*distance[i]/total;
      coordinates.push([(xy[i][0]+nx*half)/kx,(xy[i][1]+ny*half)/LAT_METRES,z],[(xy[i][0]-nx*half)/kx,(xy[i][1]-ny*half)/LAT_METRES,z]);
    }
    const faces=[];
    for(let i=0;i<xy.length-1;i++){const a=2*i;faces.push(a,a+1,a+3,a,a+3,a+2);} // normal +Z coherent
    const ring=[];
    for(let i=0;i<xy.length;i++)ring.push(2*i+1);
    for(let i=xy.length-1;i>=0;i--)ring.push(2*i);
    ring.push(1);
    items.push({
      id,
      coordinates,
      faces,
      outlines:[ring.map(k=>coordinates[k])],
      axis:points,
      estimated:true,
      widthMetres,
      sourceWidthMetres,
      roadClass:axis.props.class,
      ref:axis.props.ref,
      name:axis.props.name,
      oneway:axis.props.oneway,
      railway,
      elevationMethod:'linear-dem-endpoints',
      sourceFeatureIds:axis.ids,
    });
  });
  return {items,warnings};
}
