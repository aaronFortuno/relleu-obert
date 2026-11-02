// RO-034: explicitly enabled, estimated tunnels. MVT supplies plan geometry,
// not measured portals, elevations or sections. Keep original endpoints until
// after the DEM profile is evaluated; crop only the resulting terrain solid.
import {archedTunnelVoid,parabolicTunnelSection} from './infrastructure-solids.js';
import {lineBuffer} from './roads.js';
import {polygonOps} from './polygon-ops.js';
import {isRailway} from './railways.js';

const MAX_FEATURES=50000,MAX_FRAGMENTS=256,MAX_POINTS=10000,MAX_LINE_POINTS=1000;
const WIDTHS={motorway:14,trunk:10,primary:8,secondary:7,tertiary:6,rail:6,path:2,track:3};
const key=p=>p.map(v=>v.toFixed(6)).join(',');
const inside=(p,projection)=>p[0]>=0&&p[1]>=0&&p[0]<=projection.width&&p[1]<=projection.height;
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

/**
 * generateProceduralTunnelVoids(features, elevationAt, {
 *   enabled:false, projection, verticalReference, exaggeration:1.5,
 *   ground:(x,y)=>modelTerrainZ, waterMask:[], minBaseMM:2.5,
 *   minOpeningMM:1.2, maxTunnels:24
 * }) -> {items, warnings, metadata}
 * Items contain a closed Float32/Uint32 cutter plus path/section/source IDs.
 */
export function generateProceduralTunnelVoids(features,elevationAt,options={}){
  const {enabled=false,projection,verticalReference,exaggeration=1.5,ground,waterMask=[],minBaseMM=2.5,minOpeningMM=1.2,maxTunnels=24,surfaceRiseMM=0,railSurfaceRiseMM=surfaceRiseMM}=options;
  const pavementThicknessMM=.3,sectionProfile='estimated-parabolic-arch';
  const warnings=[],metadata={enabled:enabled===true,estimated:true,method:'linear-dem-with-generated-surface-portal-ramps',section:sectionProfile,sectionWallHeightRatio:.55,sectionRoofSegments:16,pavementThicknessMM,minimumBaseMM:minBaseMM,minimumOpeningMM:minOpeningMM,count:0,omitted:0,omissions:[]};
  if(!enabled)return {items:[],warnings,metadata};
  if(enabled!==true||!Array.isArray(features)||typeof elevationAt!=='function'||typeof ground!=='function'||typeof projection?.project!=='function'||![projection?.scale,projection?.width,projection?.height,verticalReference?.originMeters,verticalReference?.minimumSurfaceMM,exaggeration,minBaseMM,minOpeningMM,surfaceRiseMM,railSurfaceRiseMM].every(Number.isFinite)||projection.scale<=0||projection.width<=0||projection.height<=0||exaggeration<=0||minBaseMM<1||minOpeningMM<.8||minOpeningMM>5||surfaceRiseMM<0||surfaceRiseMM>1||railSurfaceRiseMM<0||railSurfaceRiseMM>2||!Number.isSafeInteger(maxTunnels)||maxTunnels<1||maxTunnels>24)
    throw Error('Configuració de túnels experimentals invàlida.');
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
      const group=JSON.stringify([props.class,props.layer,props.name]),k=group+'|'+points.map(key).join(';'),r=group+'|'+points.slice().reverse().map(key).join(';');
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
    const widthAttribute=Number(f.props.width),lanes=Number(f.props.lanes);
    const widthMetres=Number.isFinite(widthAttribute)&&widthAttribute>=1&&widthAttribute<=40?widthAttribute:Number.isInteger(lanes)&&lanes>=1&&lanes<=8?lanes*3.2:WIDTHS[f.props.class]??5;
    const heightMetres=f.props.class==='path'?3:5;
    const widthMM=Math.max(minOpeningMM,widthMetres*projection.scale),heightMM=Math.max(minOpeningMM,heightMetres*projection.scale*exaggeration);
    let footprints=lineBuffer(xy,widthMM/2,[projection.width,projection.height]);
    if(!footprints.length)continue;
    if(++considered>maxTunnels){dropped++;continue;}
    if(waterMask.length&&footprints.some(p=>polygonOps().intersection([p],waterMask).length)){fail(id,'el traçat coincideix amb aigua; no es perfora un pas subaquàtic estimat.');continue;}
    const distances=[0];for(let i=1;i<xy.length;i++)distances.push(distances.at(-1)+Math.hypot(xy[i][0]-xy[i-1][0],xy[i][1]-xy[i-1][1]));
    const length=distances.at(-1);if(length<widthMM*2){fail(id,'massa curt per a la secció imprimible a aquesta escala.');continue;}
    let z0,z1;
    try{z0=elevationAt(...f.points[0]);z1=elevationAt(...f.points.at(-1));}catch{fail(id,'falten dades DEM als extrems originals.');continue;}
    if(![z0,z1].every(z=>Number.isFinite(z)&&z>=-500&&z<=9000)){fail(id,'cota DEM invàlida.');continue;}
    const modelZ=z=>verticalReference.minimumSurfaceMM+(z-verticalReference.originMeters)*projection.scale*exaggeration-.15;
    const startZ=modelZ(z0),endZ=modelZ(z1),path=xy.map(([x,y],i)=>[x,y,startZ+(endZ-startZ)*distances[i]/length]);
    const surfaceRise=isRailway(f.props)?railSurfaceRiseMM:surfaceRiseMM;
    // Explicit experimental policy: generalized MVT endpoints need not match
    // the DEM's portal. Allow at most 8 printed mm AND 100 real metres.
    const maxExtension=Math.min(8,100*projection.scale);
    const extend=(a,b)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);
      let ramp=null;
      for(let distance=.25;distance<=maxExtension+.001;distance+=.25){
        const p=[a[0]-dx/d*distance,a[1]-dy/d*distance,a[2]-(b[2]-a[2])/d*distance];
        if(!inside(p,projection))return {p,distance,adjustment:0,grade:(p[2]-a[2])/distance};
        let surface=-Infinity;
        try{for(const offset of [0,-widthMM/2,widthMM/2]){const q=[p[0]-dy/d*offset,p[1]+dx/d*offset];if(inside(q,projection))surface=Math.max(surface,ground(...q)+surfaceRise);}}
        catch{return null;}
        if(!Number.isFinite(surface))return null;
        if(surface<p[2]+.05)return {p,distance,adjustment:0,grade:(p[2]-a[2])/distance};
        // The coarse generated road can sit above the original DEM portal.
        // Preserve the bore profile, and connect its short entrance to the
        // rendered surface with an explicit estimated ramp. A 25% physical
        // grade / 25 m vertical correction ceiling avoids drilling arbitrarily
        // deep or cutting a long trench merely to force an opening.
        const capZ=surface-.015,adjustment=capZ-p[2],grade=(capZ-a[2])/distance;
        if(!ramp&&Math.abs(grade)<=.25&&Math.abs(adjustment)/(projection.scale*exaggeration)<=25)
          ramp={p:[p[0],p[1],capZ],distance,adjustment,grade};
      }
      // Prefer the original constant-grade profile whenever it can reach
      // daylight within the budget. The ramp is only a fallback for a mesh
      // portal buried by interpolation, not a reason to move every entrance.
      return ramp;
    };
    const first=extend(path[0],path[1]),last=extend(path.at(-1),path.at(-2));
    if(!first||!last){fail(id,'no es poden obrir tots dos portals amb una prolongació curta del perfil.');continue;}
    const extended=[first.p,...path,last.p],extension=[first.distance,last.distance],portalAdjustmentMM=[first.adjustment,last.adjustment],portalRampGrades=[first.grade,last.grade];
    footprints=lineBuffer(extended,widthMM/2,[projection.width,projection.height]);
    if(waterMask.length&&footprints.some(p=>polygonOps().intersection([p],waterMask).length)){fail(id,'la prolongació del portal coincideix amb aigua.');continue;}
    if(extended.some(p=>p[2]-pavementThicknessMM<minBaseMM)){fail(id,'la cota del paviment tallaria el gruix mínim de base.');continue;}
    let cover=0,samples=0,badGround=false;const coverSamples=[];
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i],steps=Math.min(256,Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1)));
      const dx=b[0]-a[0],dy=b[1]-a[1],segmentLength=Math.hypot(dx,dy);
      for(let j=0;j<=steps;j++){const t=j/steps,p=a.map((v,k)=>v+(b[k]-v)*t);if(!inside(p,projection))continue;
        if(coverSamples.length>=4096){badGround=true;break;}
        let roof=Infinity;try{for(const across of [0,-.5,.5,-.8,.8,-1,1]){
          const offset=across*widthMM/2,q=[p[0]-dy/segmentLength*offset,p[1]+dx/segmentLength*offset];
          if(inside(q,projection))roof=Math.min(roof,ground(...q)-p[2]-heightMM*(.55+.45*(1-across*across)));
        }}catch{badGround=true;continue;}
        if(!Number.isFinite(roof)){badGround=true;continue;}samples++;
        cover=Math.max(cover,roof);coverSamples.push({station:distances[i-1]+(distances[i]-distances[i-1])*t,roof});
      }
    }
    const covered=coverSamples.filter(s=>s.roof>=.3),firstCovered=covered[0]?.station,lastCovered=covered.at(-1)?.station;
    const interior=coverSamples.filter(s=>s.station>=firstCovered&&s.station<=lastCovered);
    // Portal transitions can daylight; an interior valley must not turn a
    // purported tunnel into two unrelated bores joined by an open trench.
    if(badGround||!samples||cover<.3||lastCovered-firstCovered<minOpeningMM||interior.some(s=>s.roof<.3)){
      fail(id,'el relleu no acredita una coberta contínua sobre l’obertura estimada.');continue;
    }
    try{
      const mesh=archedTunnelVoid(extended,widthMM,heightMM),sectionMM=parabolicTunnelSection(widthMM,heightMM),pavementCategory=isRailway(f.props)?'railways':'roads';
      const extensionMetres=extension.map(d=>d/projection.scale);
      const portalAdjustmentMetres=portalAdjustmentMM.map(d=>d/(projection.scale*exaggeration));
      items.push({id,...mesh,path:extended,originalPath:path,sourceFeatureIds:[...new Set(f.ids)],sourceEndpoints:[[...f.points[0],z0],[...f.points.at(-1),z1]],estimated:true,elevationMethod:metadata.method,sectionProfile,sectionMM,pavementCategory,pavementThicknessMM,minimumBaseMM:minBaseMM,widthMM,heightMM,widthMetres,heightMetres,portalAdjustmentMM,portalAdjustmentMetres,maximumPortalAdjustmentMetres:25,portalRampGrades,maximumPortalRampGrade:.25,portalExtensionMM:extension,portalExtensionMetres:extensionMetres,maximumRoofCoverMM:cover,minimumCoveredRoofMM:Math.min(...interior.map(s=>s.roof)),footprints});
      if(portalAdjustmentMM.some(d=>Math.abs(d)>.05))warnings.push(`Túnel ${id}: cotes dels portals ajustades ${portalAdjustmentMetres.map(m=>m.toFixed(1)).join(' / ')} m al terreny de la maqueta; perfil estimat, no mesurat.`);
      if(extension.some((d,i)=>extensionMetres[i]>25||d>length*.4))warnings.push(`Túnel ${id}: portals prolongats ${extensionMetres.map(m=>m.toFixed(0)).join(' / ')} m de manera estimada per arribar a superfície. No són boques mesurades; comprova aquesta aproximació.`);
    }catch(error){fail(id,error.message);}
  }
  if(considered>maxTunnels)warnings.push(`Túnels: límit de ${maxTunnels} eixos per regió; ${considered-maxTunnels} omesos.`);
  metadata.count=items.length;
  if(items.length)warnings.unshift(`${items.length} túnels experimentals amb traçat cartogràfic, cotes DEM i secció estimada; no són geometries mesurades. Revisa portals, sostre i laminat.`);
  return {items,warnings,metadata};
}
