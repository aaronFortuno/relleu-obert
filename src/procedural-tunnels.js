// RO-034: explicitly enabled, estimated tunnels. MVT supplies plan geometry,
// not measured portals, elevations or sections. Keep original endpoints until
// after the DEM profile is evaluated; crop only the resulting terrain solid.
import {sweepSection,parabolicTunnelSection} from './infrastructure-solids.js';
import {polygonOps} from './polygon-ops.js';
import {isRailway,railwayWidthMetres} from './railways.js';
import {roadWidthMetres,roadWidthMM} from './transport-width.js';
import {transportIdentity} from './transport-network.js';
import earcut from 'earcut';

const MAX_FEATURES=50000,MAX_FRAGMENTS=256,MAX_POINTS=10000,MAX_LINE_POINTS=1000;
const key=p=>p.map(v=>v.toFixed(6)).join(',');
const inside=(p,projection)=>p[0]>=0&&p[1]>=0&&p[0]<=projection.width&&p[1]<=projection.height;
function sweptFootprints(path,width,projection){
  const directions=[];
  for(let i=1;i<path.length;i++){
    const dx=path[i][0]-path[i-1][0],dy=path[i][1]-path[i-1][1],length=Math.hypot(dx,dy);
    if(length<1e-5)throw Error('El traçat té trams de longitud horitzontal nul·la.');
    directions.push([dx/length,dy/length]);
  }
  const sections=path.map((p,i)=>{
    const before=directions[Math.max(0,i-1)],after=directions[Math.min(i,directions.length-1)],dot=before[0]*after[0]+before[1]*after[1];
    if(dot<-.5)throw Error('Corba massa tancada per generar una infraestructura fiable.');
    const nx=-(before[1]+after[1])/(1+dot)*width/2,ny=(before[0]+after[0])/(1+dot)*width/2;
    return {left:[p[0]+nx,p[1]+ny],right:[p[0]-nx,p[1]-ny]};
  });
  const polygons=[];
  for(let i=1;i<sections.length;i++){
    const a=sections[i-1],b=sections[i];
    // The swept solid uses mitered sections, not round line-buffer joins.
    // Test its actual projected triangles, including the outer miter corner.
    for(const triangle of [[a.right,a.left,b.left],[a.right,b.left,b.right]]){
      if(Math.max(...triangle.map(p=>p[0]))<0||Math.min(...triangle.map(p=>p[0]))>projection.width||Math.max(...triangle.map(p=>p[1]))<0||Math.min(...triangle.map(p=>p[1]))>projection.height)continue;
      const [p,q,r]=triangle;if((q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])===0)continue;
      polygons.push([[...triangle,triangle[0]]]);
    }
  }
  return polygons;
}
function join(fragments){
  const groups=new Map();
  for(const f of fragments){if(!groups.has(f.group))groups.set(f.group,[]);groups.get(f.group).push(f);}
  const out=[];
  for(const group of groups.values()){
    let changed=true;
    while(changed){
      changed=false;const ends=new Map();
      group.forEach((f,i)=>{for(const end of [0,1]){const k=key(f.points[end?f.points.length-1:0]);if(!ends.has(k))ends.set(k,[]);ends.get(k).push([i,end]);}});
      for(const pair of ends.values()){
        if(pair.length!==2||pair[0][0]===pair[1][0])continue;
        const [[i,a],[j,b]]=pair,A=group[i],B=group[j];
        const p=a?A.points:A.points.slice().reverse(),q=b?B.points.slice().reverse():B.points;
        group.splice(Math.max(i,j),1);group.splice(Math.min(i,j),1);
        group.push({...A,points:p.concat(q.slice(1)),ids:[...A.ids,...B.ids]});changed=true;break;
      }
    }
    out.push(...group);
  }
  for(const f of out)if(key(f.points[0])>key(f.points.at(-1)))f.points.reverse();
  return out.sort((a,b)=>key(a.points[0]).localeCompare(key(b.points[0])));
}

const MIN_ROOF_COVER_MM=.3;

function sampleRoofCover(path,distances,projection,ground,width,height,step){
  const samples=[];
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    const steps=Math.min(256,Math.max(2,Math.ceil(length/step)));
    for(let j=0;j<=steps;j++){
      const t=j/steps,p=a.map((v,k)=>v+(b[k]-v)*t);
      if(!inside(p,projection))continue;
      if(samples.length>=4096)return null;
      let roof=Infinity;
      try{
        for(const across of [0,-.5,.5,-.8,.8,-1,1]){
          const offset=across*width/2,q=[p[0]-dy/length*offset,p[1]+dx/length*offset];
          if(inside(q,projection))roof=Math.min(roof,ground(...q)-p[2]-height*(1-.45*across**2));
        }
      }catch{return null;}
      if(!Number.isFinite(roof))return null;
      samples.push({station:distances[i-1]+length*t,roof});
    }
  }
  return samples;
}

function coveredRoof(samples,minLength){
  if(!samples?.length)return null;
  const covered=samples.filter(sample=>sample.roof>=MIN_ROOF_COVER_MM);
  const first=covered[0]?.station,last=covered.at(-1)?.station;
  if(first===undefined||last-first<minLength)return null;
  const interior=samples.filter(sample=>sample.station>=first&&sample.station<=last);
  const minimum=Math.min(...interior.map(sample=>sample.roof));
  if(minimum<MIN_ROOF_COVER_MM)return null;
  return {first,last,minimum,maximum:Math.max(...covered.map(sample=>sample.roof))};
}

function requiredLowering(samples,minLength){
  let best=-Infinity;
  for(let i=0;i<(samples?.length??0);i++){
    let minimum=samples[i].roof;
    for(let j=i+1;j<samples.length;j++){
      minimum=Math.min(minimum,samples[j].roof);
      if(samples[j].station-samples[i].station>=minLength){best=Math.max(best,minimum);break;}
    }
  }
  return MIN_ROOF_COVER_MM+.02-best;
}

/**
 * generateProceduralTunnelVoids(features, elevationAt, {
 *   enabled:false, projection, verticalReference, exaggeration:1.5,
 *   ground:(x,y)=>modelTerrainZ, waterMask:[], minBaseMM:2.5,
 *   minOpeningMM:1.2, maxTunnels:24
 * }) -> {items, warnings, metadata}
 * Items contain a closed Float32/Uint32 cutter plus path/section/source IDs.
 */
export function generateProceduralTunnelVoids(features,elevationAt,options={}){
  const {enabled=false,projection,verticalReference,exaggeration=1.5,ground,waterMask=[],minBaseMM=2.5,minOpeningMM=1.2,maxTunnels=24,surfaceRiseMM=0,railSurfaceRiseMM=surfaceRiseMM,surfaceAt,surfaceBreaks,portalRoute,sharedPavement}=options;
  const pavementThicknessMM=sharedPavement?.thicknessMM??.3,sectionProfile='estimated-parabolic-arch';
  const warnings=[],metadata={enabled:enabled===true,estimated:true,method:sharedPavement?'shared-surface-road-grade':'linear-dem-with-generated-surface-portal-ramps',section:sectionProfile,sectionWallHeightRatio:.55,sectionRoofSegments:16,pavementThicknessMM,minimumBaseMM:minBaseMM,minimumOpeningMM:minOpeningMM,count:0,omitted:0,omissions:[]};
  if(!enabled)return {items:[],warnings,metadata};
  if(enabled!==true||!Array.isArray(features)||typeof elevationAt!=='function'||typeof ground!=='function'||typeof projection?.project!=='function'||![projection?.scale,projection?.width,projection?.height,verticalReference?.originMeters,verticalReference?.minimumSurfaceMM,exaggeration,minBaseMM,minOpeningMM,surfaceRiseMM,railSurfaceRiseMM].every(Number.isFinite)||projection.scale<=0||projection.width<=0||projection.height<=0||exaggeration<=0||minBaseMM<1||minOpeningMM<.8||minOpeningMM>5||surfaceRiseMM<0||surfaceRiseMM>1||railSurfaceRiseMM<0||railSurfaceRiseMM>2||!Number.isSafeInteger(maxTunnels)||maxTunnels<1||maxTunnels>24)
    throw Error('Configuració de túnels experimentals invàlida.');
  if(surfaceAt!=null&&typeof surfaceAt!=='function'||surfaceBreaks!=null&&typeof surfaceBreaks!=='function'||portalRoute!=null&&typeof portalRoute!=='function')throw Error('Connexió de portals invàlida.');
  if(sharedPavement&&(![sharedPavement.top,sharedPavement.exposed].every(f=>typeof f==='function')||
      !Number.isFinite(pavementThicknessMM)||pavementThicknessMM<.1||pavementThicknessMM>1.65))
    throw Error('Paviment compartit del túnel invàlid.');
  const fragments=[],seen=new Set();let totalPoints=0,dropped=0;
  const fail=(id,why)=>{metadata.omitted++;metadata.omissions.push({id,reason:why});warnings.push(`Túnel ${id} omès: ${why}`);};
  if(features.length>MAX_FEATURES)warnings.push(`Túnels: entrada limitada a ${MAX_FEATURES} entitats.`);
  for(const [index,f]of features.slice(0,MAX_FEATURES).entries()){
    const props=f?.properties||{},g=f?.geometry;if(props.sourceLayer!=='transportation'||props.brunnel!=='tunnel')continue;
    const lines=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];
    if(!Array.isArray(lines))continue;
    for(const line of lines){
      const id=f.id??index;
      if(fragments.length>=MAX_FRAGMENTS||totalPoints+(line?.length||0)>MAX_POINTS){dropped++;continue;}
      if(!Array.isArray(line)||line.length<2||line.length>MAX_LINE_POINTS||!line.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=85)){fail(id,'traçat invàlid o fora del pressupost de punts.');continue;}
      const points=line.map(p=>p.slice(0,2)).filter((p,i,a)=>!i||key(p)!==key(a[i-1]));if(points.length<2){fail(id,'longitud nul·la.');continue;}
      const sourceWidth=isRailway(props)?railwayWidthMetres(props):roadWidthMetres(props);
      const group=JSON.stringify([props.class,props.layer,props.name,props.ref,props.oneway,sourceWidth]),k=group+'|'+points.map(key).join(';'),r=group+'|'+points.slice().reverse().map(key).join(';');
      if(seen.has(k)||seen.has(r))continue;seen.add(k);totalPoints+=points.length;
      fragments.push({points,ids:[id],props,group});
    }
  }
  if(dropped)warnings.push(`Túnels: ${dropped} fragments omesos pel pressupost de ${MAX_FRAGMENTS} fragments/${MAX_POINTS} punts.`);
  const items=[];let considered=0;
  for(const f of join(fragments)){
    const id='estimated-tunnel-'+f.ids.map(String).sort().join('-');
    if(f.points.length>MAX_LINE_POINTS){fail(id,'l’eix unit supera el pressupost de punts.');continue;}
    const xy=f.points.map(projection.project);
    if(!xy.every(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite))){fail(id,'projecció invàlida.');continue;}
    const railway=isRailway(f.props),widthMetres=railway?railwayWidthMetres(f.props):roadWidthMetres(f.props);
    const carriagewayWidthMM=railway?Math.max(.44,widthMetres*projection.scale):roadWidthMM(f.props,projection.scale);
    const heightMetres=f.props.class==='path'?3:5;
    const widthMM=Math.max(minOpeningMM,carriagewayWidthMM),heightMM=Math.max(minOpeningMM,heightMetres*projection.scale*exaggeration);
    let footprints;try{footprints=sweptFootprints(xy,widthMM,projection);}catch(error){fail(id,error.message);continue;}
    if(!footprints.length)continue;
    if(++considered>maxTunnels){dropped++;continue;}
    if(waterMask.length&&footprints.some(p=>polygonOps().intersection([p],waterMask).length)){fail(id,'el traçat coincideix amb aigua; no es perfora un pas subaquàtic estimat.');continue;}
    const distances=[0];for(let i=1;i<xy.length;i++)distances.push(distances.at(-1)+Math.hypot(xy[i][0]-xy[i-1][0],xy[i][1]-xy[i-1][1]));
    const length=distances.at(-1);if(length<widthMM*2){fail(id,'massa curt per a la secció imprimible a aquesta escala.');continue;}
    let z0,z1;
    try{z0=elevationAt(...f.points[0]);z1=elevationAt(...f.points.at(-1));}catch{fail(id,'falten dades DEM als extrems originals.');continue;}
    if(![z0,z1].every(z=>Number.isFinite(z)&&z>=-500&&z<=9000)){fail(id,'cota DEM invàlida.');continue;}
    const modelZ=z=>verticalReference.minimumSurfaceMM+(z-verticalReference.originMeters)*projection.scale*exaggeration-.15;
    const startZ=modelZ(z0),endZ=modelZ(z1),path=xy.map(([x,y],i)=>[x,y,sharedPavement?
      sharedPavement.top(x,y):startZ+(endZ-startZ)*distances[i]/length]);
    if(path.some(p=>!Number.isFinite(p[2]))){fail(id,'la rasant compartida no cobreix l’eix del túnel.');continue;}
    const floorMargin=Math.min(...path.map(p=>p[2]))-pavementThicknessMM-minBaseMM;
    if(floorMargin<0){fail(id,'la cota del paviment tallaria el gruix mínim de base.');continue;}
    let loweringMM=0;
    let coverSamples=sampleRoofCover(path,distances,projection,ground,widthMM,heightMM,1);
    let covered=coveredRoof(coverSamples,minOpeningMM);
    if(!sharedPavement&&!covered&&coverSamples&&inside(path[0],projection)&&inside(path.at(-1),projection)){
      // At coarse print scales the minimum printable bore can exceed the
      // clearance of the DEM-derived grade. Try only a small, uniform offset.
      coverSamples=sampleRoofCover(path,distances,projection,ground,widthMM,heightMM,.25);
      const shift=requiredLowering(coverSamples,minOpeningMM);
      if(shift>0&&shift<=Math.min(.75,12*projection.scale*exaggeration,floorMargin)){
        const shifted=coverSamples.map(sample=>({...sample,roof:sample.roof+shift}));
        covered=coveredRoof(shifted,minOpeningMM);
        if(covered){for(const point of path)point[2]-=shift;loweringMM=shift;}
      }
    }
    const surfaceRise=railway?railSurfaceRiseMM:surfaceRiseMM;
    const pavementSurface=(x,y,line=null)=>typeof surfaceAt==='function'?surfaceAt(x,y,railway,f.props,line):ground(x,y)+surfaceRise;
    const normalizeFractions=values=>{
      const sorted=[-.5,0,.5,...values].map(v=>Math.abs(v)<1e-10?0:Math.abs(v-.5)<1e-10?.5:Math.abs(v+.5)<1e-10?-.5:v).sort((a,b)=>b-a);
      return sorted.filter((v,i)=>!i||Math.abs(v-sorted[i-1])>1e-10);
    };
    const fractionsAt=(centre,normal,line)=>{
      const extra=surfaceBreaks?surfaceBreaks({centre,normal,widthMM:carriagewayWidthMM,railway,properties:f.props,line}):[];
      if(!Array.isArray(extra)||extra.length>1024||extra.some(v=>!Number.isFinite(v)||v<-.500000001||v>.500000001))throw Error('Perfil transversal del portal invàlid.');
      return normalizeFractions(extra.map(v=>Math.max(-.5,Math.min(.5,v))));
    };
    // Explicit experimental policy: generalized MVT endpoints need not match
    // the DEM's portal. Allow at most 8 printed mm AND 100 real metres.
    const maxExtension=Math.min(8,100*projection.scale);
    const extend=(a,b)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy),outward=[-dx/d,-dy/d];
      let result=null;try{result=typeof portalRoute==='function'?portalRoute({point:a.slice(0,2),outward,properties:f.props,sourceFeatureIds:[...f.ids],maxLengthMM:maxExtension}):null;}catch{}
      let route=Array.isArray(result)?result:result?.points;
      const routeSegments=Array.isArray(result?.segments)?result.segments:[];
      const mapped=Array.isArray(route)&&route.length>=2&&route.length<=1000&&route.every(p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite))&&Math.hypot(route[0][0]-a[0],route[0][1]-a[1])<.15;
      if(!mapped)route=[a.slice(0,2),[a[0]+outward[0]*maxExtension,a[1]+outward[1]*maxExtension]];
      else route=[a.slice(0,2),...route.slice(1)];
      const samples=[];let station=0;
      for(let i=1;i<route.length&&station<maxExtension-1e-6;i++){
        const before=route[i-1],after=route[i],length=Math.hypot(after[0]-before[0],after[1]-before[1]);if(length<1e-6)continue;
        const segment=routeSegments[i-1],line=mapped&&segment&&Array.isArray(segment.from)&&Array.isArray(segment.to)&&Math.hypot(segment.from[0]-before[0],segment.from[1]-before[1])<.15&&Math.hypot(segment.to[0]-after[0],segment.to[1]-after[1])<.15?segment.line??null:null;
        const usable=Math.min(length,maxExtension-station),steps=Math.ceil(usable/.25);
        for(let j=1;j<=steps;j++){const distance=station+usable*j/steps,t=usable*j/steps/length;samples.push({xy:[before[0]+(after[0]-before[0])*t,before[1]+(after[1]-before[1])*t],distance,direction:[(after[0]-before[0])/length,(after[1]-before[1])/length],line});}
        station+=usable;
      }
      const finish=(sample,z,adjustment,edgeZ)=>{
        const selected=samples.filter(s=>s.distance<=sample.distance+1e-8),extension=selected.map(s=>[...s.xy,a[2]+(z-a[2])*s.distance/sample.distance]);
        return {p:extension.at(-1),points:extension,distances:selected.map(s=>s.distance),distance:sample.distance,adjustment,grade:(z-a[2])/sample.distance,edgeZ,mapped,line:sample.line};
      };
      if(sharedPavement){
        const points=[],distances=[];
        for(const sample of samples){
          const {xy:[x,y],direction:[ux,uy],distance}=sample,z=sharedPavement.top(x,y);
          if(!Number.isFinite(z))return null;
          points.push([x,y,z]);distances.push(distance);
          const exposed=[-.499,0,.499].every(t=>sharedPavement.exposed([x-uy*t*widthMM,y+ux*t*widthMM]));
          if(exposed)return {points,distances,distance,adjustment:0,grade:(z-a[2])/distance,mapped,line:sample.line};
        }
        return null;
      }
      let ramp=null;
      for(const sample of samples){
        const {distance,direction:[ux,uy]}=sample,p=[...sample.xy,a[2]-(b[2]-a[2])/d*distance];
        if(!inside(p,projection))return finish(sample,p[2],0,null);
        let surface=-Infinity;
        let edgeZ,profileZ;
        try{
          edgeZ=[-carriagewayWidthMM/2,carriagewayWidthMM/2].map(offset=>{const q=[p[0]-uy*offset,p[1]+ux*offset];return inside(q,projection)?pavementSurface(q[0],q[1],sample.line):p[2];});
          profileZ=fractionsAt(p.slice(0,2),[-uy,ux],sample.line).map(t=>{const q=[p[0]-uy*carriagewayWidthMM*t,p[1]+ux*carriagewayWidthMM*t];return inside(q,projection)?pavementSurface(q[0],q[1],sample.line):p[2];});
          for(const offset of [0,-widthMM/2,widthMM/2,-carriagewayWidthMM/2,carriagewayWidthMM/2]){const q=[p[0]-uy*offset,p[1]+ux*offset];if(inside(q,projection))surface=Math.max(surface,pavementSurface(q[0],q[1],sample.line));}
        }
        catch{return null;}
        if(!Number.isFinite(surface))return null;
        // The coarse generated road can sit above the original DEM portal.
        // Preserve the bore profile, and connect its short entrance to the
        // rendered surface with an explicit estimated ramp. A 25% physical
        // grade / 25 m vertical correction ceiling avoids drilling arbitrarily
        // deep or cutting a long trench merely to force an opening.
        const capZ=pavementSurface(p[0],p[1],sample.line),adjustment=capZ-p[2],grade=(capZ-a[2])/distance;
        if(Math.abs(grade)<=.25&&Math.abs(adjustment)/(projection.scale*exaggeration)<=25&&profileZ.every(z=>Number.isFinite(z)&&Math.abs((z-a[2])/distance)<=.25&&Math.abs(z-p[2])/(projection.scale*exaggeration)<=25)){
          const candidate=finish(sample,capZ,adjustment,edgeZ);
          if(!ramp)ramp=candidate;
          if(Math.abs(adjustment)<.05)return candidate;
        }
      }
      // Prefer the original constant-grade profile whenever it can reach
      // daylight within the budget. The ramp is only a fallback for a mesh
      // portal buried by interpolation, not a reason to move every entrance.
      return ramp;
    };
    const first=extend(path[0],path[1]),last=extend(path.at(-1),path.at(-2));
    if(!first||!last){fail(id,'no es poden obrir tots dos portals amb una prolongació curta del perfil.');continue;}
    const extended=[...first.points.slice().reverse(),...path,...last.points],extension=[first.distance,last.distance],portalAdjustmentMM=[first.adjustment,last.adjustment],portalRampGrades=[first.grade,last.grade];
    const directionAt=i=>{
      const unit=(a,b)=>{const l=Math.hypot(b[0]-a[0],b[1]-a[1]);return [(b[0]-a[0])/l,(b[1]-a[1])/l];};
      const before=unit(extended[Math.max(0,i-1)],extended[Math.max(1,i)]),after=unit(extended[Math.min(i,extended.length-2)],extended[Math.min(i+1,extended.length-1)]),dot=before[0]*after[0]+before[1]*after[1];
      if(dot<-.5)throw Error('Corba massa tancada al portal estimat.');
      return [-(before[1]+after[1])/(1+dot),(before[0]+after[0])/(1+dot)];
    };
    let pavementSections,pavementFractions;
    try{
      const fractions=[-.5,0,.5];
      for(const [portal,i]of [[first,0],[last,extended.length-1]])if(portal.edgeZ)fractions.push(...fractionsAt(extended[i].slice(0,2),directionAt(i),portal.line));
      pavementFractions=normalizeFractions(fractions);
      pavementSections=extended.map((p,i)=>{
        const n=directionAt(i),across=pavementFractions.map(t=>{
          const x=p[0]+n[0]*carriagewayWidthMM*t,y=p[1]+n[1]*carriagewayWidthMM*t;
          const z=sharedPavement?sharedPavement.top(x,y):p[2];
          if(!Number.isFinite(z))throw Error('La rasant compartida no cobreix tota l’amplada del túnel.');
          return [x,y,z];
        });
        return {left:across[0],right:across.at(-1),centre:across[pavementFractions.indexOf(0)],across};
      });
    }
    catch(error){fail(id,error.message);continue;}
    // Match both outer road edges; the opening will use these SAME crossfalls
    // so neither a terrain film nor a pavement lip remains inside the portal.
    for(const [portal,indexes]of [[first,Array.from({length:first.points.length},(_,i)=>i)],[last,Array.from({length:last.points.length},(_,i)=>extended.length-1-i)]]){
      if(!portal.edgeZ)continue;
      const endpoint=extended[indexes[0]],section=pavementSections[indexes[0]],target=section.across.map(p=>inside(p,projection)?pavementSurface(p[0],p[1],portal.line):endpoint[2]);
      for(const [j,i]of indexes.entries()){const t=portal.distances[portal.points.length-1-j]/portal.distance,blend=t*t*(3-2*t);
        for(let k=0;k<target.length;k++)pavementSections[i].across[k][2]+=(target[k]-endpoint[2])*blend;
      }
    }
    try{footprints=sweptFootprints(extended,widthMM,projection);}catch(error){fail(id,error.message);continue;}
    if(waterMask.length&&footprints.some(p=>polygonOps().intersection([p],waterMask).length)){fail(id,'la prolongació del portal coincideix amb aigua.');continue;}
    if(pavementSections.some(s=>s.across.some(p=>p[2]-pavementThicknessMM<minBaseMM))){fail(id,'la cota del paviment tallaria el gruix mínim de base.');continue;}
    if(!covered){
      fail(id,'el relleu no acredita una coberta contínua sobre l’obertura estimada.');continue;
    }
    try{
      const uniqueAcross=values=>values.sort((a,b)=>a-b).filter((v,i,a)=>!i||Math.abs(v-a[i-1])>1e-9);
      const sectionMM=parabolicTunnelSection(widthMM,heightMM),bottomAcross=uniqueAcross([-widthMM/2,...pavementFractions.map(t=>t*carriagewayWidthMM),widthMM/2]),roofAcross=uniqueAcross([...sectionMM.slice(2).map(p=>p[0]),...bottomAcross]).reverse();
      const boreSectionMM=[...bottomAcross.map(x=>[x,0]),...roofAcross.map(x=>[x,heightMM*(.55+.45*(1-(x/(widthMM/2))**2))])];
      if(boreSectionMM.length>2048||2*boreSectionMM.length*(extended.length-1)+2*(boreSectionMM.length-2)>200000)throw Error('El perfil transversal i el traçat del túnel superen el pressupost de 200000 triangles.');
      const mesh=sweepSection(extended,boreSectionMM,{maxSectionPoints:2048}),pavementCategory=railway?'railways':'roads';
      const floorAt=(section,x)=>{
        if(x>=carriagewayWidthMM/2)return section.left[2];if(x<=-carriagewayWidthMM/2)return section.right[2];
        for(let k=1;k<pavementFractions.length;k++){
          const left=pavementFractions[k-1]*carriagewayWidthMM,right=pavementFractions[k]*carriagewayWidthMM;
          if(x<=left&&x>=right){const t=(left-x)/(left-right);return section.across[k-1][2]*(1-t)+section.across[k][2]*t;}
        }
        throw Error('Perfil transversal del túnel incomplet.');
      };
      for(const [i,p]of extended.entries())for(const [j,[across,height]]of boreSectionMM.entries()){
        mesh.vertices[(i*boreSectionMM.length+j)*3+2]=height+floorAt(pavementSections[i],across);
      }
      // A piecewise transverse profile can make either cap concave. Rebuild
      // each cap from its actual (across,Z) contour after applying crossfall.
      const sideFaces=(extended.length-1)*boreSectionMM.length*6,faces=Array.from(mesh.faces.subarray(0,sideFaces));
      for(const index of [0,extended.length-1]){
        const section=boreSectionMM.map(([across,height])=>[across,height+floorAt(pavementSections[index],across)-extended[index][2]]),triangles=earcut(section.flat()),offset=index*boreSectionMM.length;
        for(let i=0;i<triangles.length;i+=3){let [a,b,c]=triangles.slice(i,i+3);const A=section[a],B=section[b],C=section[c];
          if((B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0])<0)[b,c]=[c,b];
          faces.push(...(index?[offset+a,offset+b,offset+c]:[c,b,a]));
        }
      }
      mesh.faces=new Uint32Array(faces);
      const extensionMetres=extension.map(d=>d/projection.scale);
      const portalAdjustmentMetres=portalAdjustmentMM.map(d=>d/(projection.scale*exaggeration));
      const portalRouting=[first,last].map(p=>p.mapped?'mapped':'estimated-axis-extension'),portalConnections=[0,extended.length-1].map((index,i)=>{const {left,right,centre,across}=pavementSections[index];return {end:i?'end':'start',routing:portalRouting[i],left,right,centre,across,widthMM:carriagewayWidthMM,targetFeatureIds:[first,last][i].line?.sourceFeatureIds??[]};});
      const roadIdentity=transportIdentity(f.props);roadIdentity.sourceFeatureIds=[...new Set(f.ids)];
      items.push({id,...mesh,path:extended,originalPath:path,roadIdentity,sourceFeatureIds:[...new Set(f.ids)],sourceEndpoints:[[...f.points[0],z0],[...f.points.at(-1),z1]],estimated:true,elevationMethod:metadata.method,sectionProfile,sectionMM,boreSectionMM,pavementCategory,pavementThicknessMM,pavementSections,pavementFractions,minimumBaseMM:minBaseMM,widthMM,carriagewayWidthMM,heightMM,widthMetres,heightMetres,portalRouting,portalConnections,portalAdjustmentMM,portalAdjustmentMetres,maximumPortalAdjustmentMetres:25,portalRampGrades,maximumPortalRampGrade:.25,portalExtensionMM:extension,portalExtensionMetres:extensionMetres,maximumRoofCoverMM:covered.maximum,minimumCoveredRoofMM:covered.minimum,coveredIntervalMM:[covered.first,covered.last],loweringMM,footprints});
      if(portalRouting.some(p=>p!=='mapped'))warnings.push(`Túnel ${id}: prolongació estimada de l’eix als portals sense una continuació cartogràfica compatible acreditada.`);
      if(loweringMM)warnings.push(`Túnel ${id}: rasant estimada rebaixada ${(loweringMM/(projection.scale*exaggeration)).toFixed(1)} m per conservar la coberta i la secció imprimible.`);
      if(portalAdjustmentMM.some(d=>Math.abs(d)>.05))warnings.push(`Túnel ${id}: cotes dels portals ajustades ${portalAdjustmentMetres.map(m=>m.toFixed(1)).join(' / ')} m al terreny de la maqueta; perfil estimat, no mesurat.`);
      if(extension.some((d,i)=>extensionMetres[i]>25||d>length*.4))warnings.push(`Túnel ${id}: portals prolongats ${extensionMetres.map(m=>m.toFixed(0)).join(' / ')} m de manera estimada per arribar a superfície. No són boques mesurades; comprova aquesta aproximació.`);
    }catch(error){fail(id,error.message);}
  }
  if(considered>maxTunnels)warnings.push(`Túnels: límit de ${maxTunnels} eixos per regió; ${considered-maxTunnels} omesos.`);
  metadata.count=items.length;
  if(items.length)warnings.unshift(`${items.length} túnels experimentals amb traçat cartogràfic, cotes DEM i secció estimada; no són geometries mesurades. Revisa portals, sostre i laminat.`);
  return {items,warnings,metadata};
}
