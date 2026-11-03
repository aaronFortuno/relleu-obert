// Estimated platforms above an intact DEM. These are not surveyed road/deck
// elevations. Only unambiguous surface motorway/trunk axes are considered.
import {isInactiveRailway,isRailway,railwayWidthMetres} from './railways.js';
import {polygonOps} from './polygon-ops.js';
import {lineBuffer} from './roads.js';
import {polygonTester} from './polygon-index.js';
import {roadWidthMetres} from './transport-width.js';

const METRES=111320;
const LIMITS={features:50000,fragments:256,inputPoints:10000,linePoints:2000,items:80,stations:3000,axisStations:1200};
const MAJOR_CLASSES=['motorway','trunk','motorway_link','trunk_link'];
const key=p=>`${p[0].toFixed(7)},${p[1].toFixed(7)}`;
const endKey=p=>`${p[0].toFixed(6)},${p[1].toFixed(6)}`;
const slope=(a,b)=>(b[1]-a[1])/(b[0]-a[0]);
const isLink=p=>p.ramp===1||p.ramp==='1'||p.ramp===true||String(p.class??'').endsWith('_link');
const linesOf=g=>g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'&&Array.isArray(g.coordinates)?g.coordinates:[];

function cleanLine(line){
  if(!Array.isArray(line)||line.length<2||line.length>LIMITS.linePoints)return null;
  const points=[];
  for(const p of line){
    if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>85)return null;
    if(!points.length||key(p)!==key(points.at(-1)))points.push(p.slice(0,2));
  }
  return points.length>1?points:null;
}
function classOf(p){
  const c=String(p.class??'');
  if(c==='motorway'||c==='trunk')return isLink(p)?`${c}_link`:c;
  return MAJOR_CLASSES.includes(c)?c:null;
}
function widthOf(p,c){
  return roadWidthMetres({...p,class:c});
}
export function majorRoadWidthMetres(properties={}){
  const c=classOf(properties);
  return c&&!isRailway(properties)?widthOf(properties,c):null;
}

function joinFragments(fragments,degree){
  const groups=new Map(),out=[];
  for(const f of fragments){if(!groups.has(f.group))groups.set(f.group,[]);groups.get(f.group).push(f);}
  for(const group of groups.values()){
    let work=group.slice(),changed=true;
    while(changed){
      changed=false;const ends=new Map();
      for(let i=0;i<work.length;i++)for(const end of [0,1]){
        const p=work[i].points[end?work[i].points.length-1:0],k=endKey(p);
        if(!ends.has(k))ends.set(k,[]);ends.get(k).push([i,end]);
      }
      for(const [k,pair]of ends){
        if(pair.length!==2||pair[0][0]===pair[1][0]||(degree.get(`${work[pair[0][0]].network}|${k}`)||0)>2)continue;
        const [[i,a],[j,b]]=pair,A=work[i],B=work[j],p=a?A.points:A.points.slice().reverse(),q=b?B.points.slice().reverse():B.points;
        const u=p.at(-2),v=p.at(-1),w=q[1],dot=(v[0]-u[0])*(w[0]-v[0])+(v[1]-u[1])*(w[1]-v[1]);
        if(dot<0)continue;
        work=work.filter((_,n)=>n!==i&&n!==j);work.push({...A,points:p.concat(q.slice(1)),ids:[...A.ids,...B.ids]});changed=true;break;
      }
    }
    out.push(...work);
  }
  for(const f of out){if(key(f.points[0])>key(f.points.at(-1)))f.points.reverse();f.ids=[...new Set(f.ids)].sort((a,b)=>String(a).localeCompare(String(b)));}
  return out.sort((a,b)=>key(a.points[0]).localeCompare(key(b.points[0]))||a.group.localeCompare(b.group));
}

function resample(points,step){
  // Bounding-box reference latitude is unchanged by collinear fragment splits.
  const lat=(Math.min(...points.map(p=>p[1]))+Math.max(...points.map(p=>p[1])))/2,kx=METRES*Math.cos(lat*Math.PI/180),lengths=[0];
  for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot((points[i][0]-points[i-1][0])*kx,(points[i][1]-points[i-1][1])*METRES));
  const length=lengths.at(-1);if(length<step*3||Math.ceil(length/step)+1>LIMITS.axisStations)return null;
  const stations=[];for(let d=0;d<length;d+=step)stations.push(d);
  if(length-stations.at(-1)<step*.25)stations.pop();stations.push(length);
  let index=1;
  const coordinates=stations.map(d=>{while(index<lengths.length-1&&lengths[index]<d)index++;const a=points[index-1],b=points[index],t=(d-lengths[index-1])/(lengths[index]-lengths[index-1]);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];});
  return {stations,coordinates,length};
}
function offsets(points){
  const directions=[];
  for(let i=1;i<points.length;i++){const dx=points[i][0]-points[i-1][0],dy=points[i][1]-points[i-1][1],length=Math.hypot(dx,dy);if(length<1e-9)return null;directions.push([dx/length,dy/length]);}
  const normals=[];
  for(let i=0;i<points.length;i++){
    const a=directions[Math.max(0,i-1)],b=directions[Math.min(i,directions.length-1)],dot=a[0]*b[0]+a[1]*b[1];
    if(dot<.5)return null;
    normals.push([-(a[1]+b[1])/(1+dot),(a[0]+b[0])/(1+dot)]);
  }
  return normals;
}
function upperEnvelope(stations,floors){
  const hull=[];
  for(let i=0;i<stations.length;i++){
    const p=[stations[i],floors[i]];
    while(hull.length>1&&slope(hull.at(-2),hull.at(-1))<slope(hull.at(-1),p)-1e-12)hull.pop();
    hull.push(p);
  }
  let index=1;
  const elevations=stations.map(s=>{while(index<hull.length-1&&hull[index][0]<s)index++;const a=hull[index-1],b=hull[index];return a[1]+(b[1]-a[1])*(s-a[0])/(b[0]-a[0]);});
  return {elevations,hull};
}
function limitedSlopeMajorant(stations,floors,maxGrade){
  const result=floors.slice();
  for(let i=1;i<result.length;i++)result[i]=Math.max(result[i],result[i-1]-maxGrade*(stations[i]-stations[i-1]));
  for(let i=result.length-2;i>=0;i--)result[i]=Math.max(result[i],result[i+1]-maxGrade*(stations[i+1]-stations[i]));
  return result;
}

// Average the continuous envelope over a centred window. Linear extensions
// at both ends preserve the terminal tangent when the envelope is straight.
// A constant lift covers the rounding deficit without adding slope breaks.
function roundEnvelope(stations,elevations,radius){
  const areas=[0];
  for(let i=1;i<stations.length;i++)areas.push(areas[i-1]+(stations[i]-stations[i-1])*(elevations[i-1]+elevations[i])/2);
  const last=stations.length-1;
  function integral(at,i){
    while(i<last-1&&stations[i+1]<at)i++;
    const dx=at-stations[i],grade=(elevations[i+1]-elevations[i])/(stations[i+1]-stations[i]);
    return {area:areas[i]+dx*(elevations[i]+grade*dx/2),index:i};
  }
  let before=0,after=0;
  const smoothed=stations.map(at=>{
    const left=integral(at-radius,before),right=integral(at+radius,after);
    before=left.index;after=right.index;
    return (right.area-left.area)/(2*radius);
  });
  const lift=Math.max(0,...elevations.map((height,i)=>height-smoothed[i]));
  return smoothed.map(height=>height+lift);
}

function roundedProfile(stations,envelope,sectionMinima,scale,maxLiftMetres,railway){
  const baseRadius=24;
  // At coarse scales the original window can occupy barely a millimetre.
  // Aim for a visible curve, keeping the window local to the mapped axis.
  const targetRadius=railway?baseRadius:Math.max(baseRadius,Math.min(120,stations.at(-1)/5,4/scale));
  const radii=targetRadius===baseRadius?[baseRadius]:[targetRadius,(targetRadius+baseRadius)/2,baseRadius];
  for(const radius of radii){
    const elevations=roundEnvelope(stations,envelope,radius);
    // If extra smoothing would lift the road too far, try a shorter window.
    // The final candidate still goes through the normal grade and lift checks.
    if(radius===baseRadius||elevations.every((z,i)=>z-sectionMinima[i]<=maxLiftMetres+1e-8))return {elevations,radius};
  }
}

function straightRailProfile(stations,floors,minima,length,maxGrade,maxLift){
  const start=floors[0],grade=(floors.at(-1)-start)/length;
  if(Math.abs(grade)>maxGrade+1e-8)return null;
  const line=stations.map(at=>start+at*grade);
  const lift=Math.max(0,...floors.map((height,i)=>height-line[i]));
  const elevations=line.map(height=>height+lift);
  return elevations.some((height,i)=>height-minima[i]>maxLift+1e-8)?null:elevations;
}
function axisCrossings(axis,otherLines){
  const points=[],seen=new Set();
  for(let i=1;i<axis.length;i++)for(const line of otherLines)for(let j=1;j<line.length;j++){
    const a=axis[i-1],b=axis[i],c=line[j-1],d=line[j],dx=b[0]-a[0],dy=b[1]-a[1],ex=d[0]-c[0],ey=d[1]-c[1],det=dx*ey-dy*ex;
    if(Math.abs(det)<1e-12)continue;
    const t=((c[0]-a[0])*ey-(c[1]-a[1])*ex)/det,u=((c[0]-a[0])*dy-(c[1]-a[1])*dx)/det;
    if(t< -1e-8||t>1+1e-8||u< -1e-8||u>1+1e-8)continue;
    const p=[a[0]+t*dx,a[1]+t*dy],k=p.map(v=>v.toFixed(6)).join(',');
    if(!seen.has(k)){seen.add(k);points.push(p);}
  }
  return points;
}

// Retain the ordinary surface on the mapped ends so the ramps can land
// before a junction. A profile leaving the crop needs no such landing.
export function reserveProfileEnds(item,projection){
  const path=item.axisXYZ.map(projection.project),{stations}=item,last=stations.length-1;
  const ends=[null,null],limits=[0,last];
  for(const end of [0,1]){
    const edge=end?last:0,[x,y]=path[edge];
    if(x<0||y<0||x>projection.width||y>projection.height)continue;
    const reserve=Math.min(item.lengthMetres/3,Math.max(60,12/projection.scale,item.endpointLiftMetres[end]/item.maxGrade*2));
    let index=edge;
    while(Math.abs(stations[index]-stations[edge])<reserve&&index!==(end?0:last))index+=end?-1:1;
    limits[end]=index;
    ends[end]=end?path.slice(index):path.slice(0,index+1).reverse();
  }
  const [first,final]=limits;
  if(final<=first)return null;
  if(!ends.some(Boolean))return {...item,terminalRoutes:ends};
  const coordinates=item.coordinates.slice(2*first,2*final+2),faces=[];
  for(let i=0;i<coordinates.length-2;i+=2)faces.push(i,i+1,i+3,i,i+3,i+2);
  const left=coordinates.filter((_,i)=>i%2),right=coordinates.filter((_,i)=>i%2===0).reverse();
  return {...item,coordinates,faces,outlines:[[...left,...right,left[0]]],axis:item.axisXYZ.slice(first,final+1),terminalRoutes:ends};
}

/**
 * generateMajorRoadItems(features,elevationAt,{projection,bbox?,...})
 * -> {items,metadata,warnings}. No mutation or ground sampler is returned.
 *
 * A station's floor is the maximum of original DEM samples on its axis and
 * BOTH rendered edges. Optional renderedElevationAt adds the original generated
 * model's elevations as constraints without changing any source DEM arrays.
 * Endpoint anchors remain fixed unless allowEndpointLift explicitly permits a
 * slope-limited upward majorant. It never excavates or reshapes DEM.
 * Item coordinates/axisXYZ are absolute geographic XYZ metres, ready for the
 * existing deckSurfaceSolid pipeline. Each section is level across its width.
 * Cropping happens later; a bbox only selects COMPLETE original axes.
 * Only obstacle checks are restricted to the physical model ROI: optional
 * `roi` is an XY MultiPolygon, otherwise projection.width/height define the
 * model rectangle. Geographic bbox is never used as a rotated/physical ROI.
 *
 * Clearance is a road-TOP estimate, not air below the printable slab. Support
 * planning must subtract that slab thickness and avoid mapped obstacles.
 */
export function generateMajorRoadItems(features,elevationAt,options={}){
  const {projection,bbox,stationMetres=10,minRoadWidthMM=.44,maxLiftMetres=12,maxItems=LIMITS.items,allowCrossing,renderedElevationAt,allowEndpointLift=false}=options;
  const smooth=options.smoothProfiles===true;
  if(!Array.isArray(features)||typeof elevationAt!=='function'||typeof projection?.project!=='function'||typeof projection?.unproject!=='function'||!Number.isFinite(projection.scale)||projection.scale<=0||![stationMetres,minRoadWidthMM,maxLiftMetres].every(v=>Number.isFinite(v)&&v>0)||stationMetres<5||stationMetres>30||minRoadWidthMM>2||maxLiftMetres>30||!Number.isInteger(maxItems)||maxItems<1||maxItems>LIMITS.items||allowCrossing!==undefined&&typeof allowCrossing!=='function'||renderedElevationAt!==undefined&&typeof renderedElevationAt!=='function'||typeof allowEndpointLift!=='boolean'||bbox!==undefined&&(!Array.isArray(bbox)||bbox.length!==4||!bbox.every(Number.isFinite)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3]))throw Error('Configuració de plataformes viàries invàlida.');
  let roi=options.roi;
  if(roi===undefined&&[projection.width,projection.height].every(v=>Number.isFinite(v)&&v>0))roi=[[[[0,0],[projection.width,0],[projection.width,projection.height],[0,projection.height],[0,0]]]];
  if(roi!==undefined&&(!Array.isArray(roi)||roi.some(poly=>!Array.isArray(poly)||!poly.length||poly.some(r=>!Array.isArray(r)||r.length<4||r.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))))))throw Error('ROI física de plataformes viàries invàlida.');
  const inROI=roi===undefined?()=>true:polygonTester(roi);
  const warnings=[],omissions=[],fragments=[],seen=new Set(),degree=new Map(),degreeSeen=new Set(),water=[],crossingObstacles=[];
  let inputPoints=0,dropped=0,obstaclePoints=0,obstacleOverflow=false,roadObstaclePoints=0,roadObstacleOverflow=false;
  const fail=(ids,reason)=>omissions.push({sourceFeatureIds:ids,reason});
  if(features.length>LIMITS.features)warnings.push(`Plataformes viàries: entrada limitada a ${LIMITS.features} entitats.`);
  for(const [index,f]of features.slice(0,LIMITS.features).entries()){
    const p=f?.properties||{},g=f?.geometry;
    if(p.sourceLayer==='water'){
      const polys=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'&&Array.isArray(g.coordinates)?g.coordinates:[];
      for(const poly of polys)if(Array.isArray(poly)&&poly.length&&poly.every(r=>Array.isArray(r)&&r.length>=4&&r.every(q=>Array.isArray(q)&&q.length>=2&&q.slice(0,2).every(Number.isFinite))))water.push(poly.map(r=>r.map(projection.project)));
      continue;
    }
    if(p.sourceLayer!=='transportation'||isInactiveRailway(p))continue;
    const railway=isRailway(p),structure=['bridge','tunnel'].includes(p.brunnel);
    if(railway||structure||smooth){
      for(const raw of linesOf(g)){
        const points=cleanLine(raw);if(!points)continue;
        const onlyRail=!railway&&!structure;
        if(onlyRail){
          if(roadObstaclePoints+points.length>LIMITS.inputPoints){roadObstacleOverflow=true;continue;}
          roadObstaclePoints+=points.length;
        }else{
          if(obstaclePoints+points.length>LIMITS.inputPoints){obstacleOverflow=true;continue;}
          obstaclePoints+=points.length;
        }
        const width=isRailway(p)?railwayWidthMetres(p):roadWidthMetres(p);
        const xy=points.map(projection.project);
        crossingObstacles.push({id:f.id??index,feature:f,onlyRail,type:railway?'ferrocarril':p.brunnel==='tunnel'?'túnel':structure?'pont':'carretera',lines:[xy],radius:Math.max(minRoadWidthMM,width*projection.scale)/2});
      }
      if(structure||railway&&!smooth)continue;
    }
    const c=railway?'rail':classOf(p)||(smooth&&p.class==='primary'?'primary':null),level=String(p.layer??0);
    const sourceWidth=railway?railwayWidthMetres(p):widthOf(p,c);
    for(const line of linesOf(g)){
      const points=cleanLine(line);if(!points){if(c)fail([f.id??index],'traçat invàlid o pressupost de punts superat');continue;}
      const network=railway?'rail|'+level:level;
      const dkey=network+'|'+points.map(endKey).join(';'),reverse=network+'|'+points.slice().reverse().map(endKey).join(';');
      if(!degreeSeen.has(dkey)&&!degreeSeen.has(reverse)){
        degreeSeen.add(dkey);for(const q of [points[0],points.at(-1)]){const k=network+'|'+endKey(q);degree.set(k,(degree.get(k)||0)+1);}
      }
      if(!c)continue;
      const group=JSON.stringify([c,level,p.ref??'',p.name??'',p.oneway??'',sourceWidth]),k=group+'|'+points.map(key).join(';'),r=group+'|'+points.slice().reverse().map(key).join(';');
      if(seen.has(k)||seen.has(r))continue;seen.add(k);
      if(fragments.length>=LIMITS.fragments||inputPoints+points.length>LIMITS.inputPoints){dropped++;continue;}
      inputPoints+=points.length;fragments.push({points,ids:[f.id??index],props:p,class:c,level,network,group,railway,sourceWidth});
    }
  }
  const pc=polygonOps(),items=[];let stationCount=0,considered=0;
  for(const f of joinFragments(fragments,degree)){
    if(obstacleOverflow||f.railway&&roadObstacleOverflow){fail(f.ids,'pressupost d’obstacles superat; no s’acrediten els creuaments');continue;}
    const sourceWidthMetres=f.sourceWidth,widthMetres=Math.max(sourceWidthMetres,minRoadWidthMM/projection.scale),half=widthMetres/2;
    if(bbox){
      // Miter length is at most 1/cos(30deg), because sharper bends are rejected.
      const radius=half/Math.cos(Math.PI/6),xs=f.points.map(p=>p[0]),ys=f.points.map(p=>p[1]),latMargin=radius/METRES,lonMargin=latMargin/Math.cos(Math.max(...ys.map(Math.abs))*Math.PI/180);
      if(Math.max(...xs)+lonMargin<bbox[0]||Math.min(...xs)-lonMargin>bbox[2]||Math.max(...ys)+latMargin<bbox[1]||Math.min(...ys)-latMargin>bbox[3])continue;
    }
    if(++considered>maxItems){dropped++;continue;}
    const sampled=resample(f.points,stationMetres);if(!sampled){fail(f.ids,'longitud insuficient o pressupost d’estacions superat');continue;}
    const {stations,coordinates:axisCoordinates,length}=sampled,xy=axisCoordinates.map(projection.project),normals=offsets(xy);
    if(!normals||!xy.every(q=>q.every(Number.isFinite))){fail(f.ids,'revolt massa tancat o projecció invàlida');continue;}
    if(stationCount+stations.length>LIMITS.stations){dropped++;continue;}
    const edgeCoordinates=xy.map((p,i)=>[-1,1].map(sign=>projection.unproject([p[0]+normals[i][0]*half*projection.scale*sign,p[1]+normals[i][1]*half*projection.scale*sign])));
    // Reject folded offsets before producing crossing faces at small scales.
    const quadCross=(a,b,c)=>(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
    let folded=false;
    for(let i=0;i<xy.length-1;i++){
      const a=edgeCoordinates[i][0],b=edgeCoordinates[i][1],c=edgeCoordinates[i+1][1],d=edgeCoordinates[i+1][0],crosses=[quadCross(a,b,c),quadCross(b,c,d),quadCross(c,d,a),quadCross(d,a,b)];
      if(crosses.some(v=>v>=0)){folded=true;break;}
    }
    if(folded){fail(f.ids,'amplada representada incompatible amb el radi de corba');continue;}
    const sourceElevations=[],sourceFloors=[],sectionMinima=[],renderedElevations=[],renderedFloors=[];let invalid=false;
    try{
      for(let i=0;i<stations.length;i++){
        const heights=[elevationAt(...axisCoordinates[i]),...edgeCoordinates[i].map(p=>elevationAt(...p))];
        if(!heights.every(z=>Number.isFinite(z)&&z>=-500&&z<=9000)){invalid=true;break;}
        sourceElevations.push(heights[0]);sourceFloors.push(Math.max(...heights));sectionMinima.push(Math.min(...heights));
        if(renderedElevationAt){
          const represented=[renderedElevationAt(...axisCoordinates[i]),...edgeCoordinates[i].map(p=>renderedElevationAt(...p))];
          if(!represented.every(z=>Number.isFinite(z)&&z>=-500&&z<=9000)){invalid=true;break;}
          renderedElevations.push(represented[0]);renderedFloors.push(Math.max(...represented));
        }
      }
    }catch{invalid=true;}
    if(invalid){fail(f.ids,'DEM absent o cota no vàlida a l’eix o les vores');continue;}
    const maxGrade=f.railway ? .04 : isLink(f.props) ? .16 : .12;
    const originalConstraintFloors=sourceFloors.map((z,i)=>Math.max(z,renderedElevationAt?renderedFloors[i]:z));
    const constraintFloors=allowEndpointLift?limitedSlopeMajorant(stations,originalConstraintFloors,maxGrade):originalConstraintFloors.slice();
    const {elevations:envelope,hull}=upperEnvelope(stations,constraintFloors);
    const railLine=f.railway?straightRailProfile(stations,originalConstraintFloors,sectionMinima,length,maxGrade,maxLiftMetres):null;
    const rounded=smooth&&!railLine?roundedProfile(stations,envelope,sectionMinima,projection.scale,maxLiftMetres,f.railway):null;
    const elevations=railLine||rounded?.elevations||envelope;
    const maxObservedGrade=Math.max(...elevations.slice(1).map((z,i)=>Math.abs(z-elevations[i])/(stations[i+1]-stations[i])));
    if(maxObservedGrade>maxGrade+1e-8){fail(f.ids,`pendent de l’envolupant ${(maxObservedGrade*100).toFixed(2)}% superior al límit ${(maxGrade*100).toFixed(0)}%`);continue;}
    const maximumLiftMetres=Math.max(...elevations.map((z,i)=>z-sourceElevations[i])),maximumSectionLiftMetres=Math.max(...elevations.map((z,i)=>z-sectionMinima[i]));
    if(maximumSectionLiftMetres>maxLiftMetres+1e-8){fail(f.ids,`separació del DEM de ${maximumSectionLiftMetres.toFixed(2)} m superior al límit de ${maxLiftMetres} m; no s’inventa un viaducte sobre una vall profunda`);continue;}
    const coordinates=[],faces=[];
    for(let i=0;i<stations.length;i++)coordinates.push([...edgeCoordinates[i][1],elevations[i]],[...edgeCoordinates[i][0],elevations[i]]);
    for(let i=0;i<stations.length-1;i++){const a=2*i;faces.push(a,a+1,a+3,a,a+3,a+2);}
    const outline=[];for(let i=0;i<stations.length;i++)outline.push(coordinates[2*i+1]);for(let i=stations.length-1;i>=0;i--)outline.push(coordinates[2*i]);outline.push(outline[0]);
    const footprint=[[outline.map(p=>projection.project(p))]];
    const visibleFootprint=roi===undefined?footprint:pc.intersection(footprint,roi);
    if(water.length&&visibleFootprint.length&&pc.intersection(visibleFootprint,water).length){fail(f.ids,'plataforma coincident amb aigua; requereix un pont identificat');continue;}
    // Grade-separation tags are not elevations. An estimated interior crossing
    // cannot safely cover rail/bridge/tunnel geometry. Keep short endpoint
    // connection zones available for the bridge/tunnel approach planner.
    const guard=Math.min(Math.max(stationMetres,widthMetres),length/4);
    let first=0,last=stations.length-1;
    while(first<stations.length-1&&stations[first]<guard)first++;
    while(last>0&&stations[last]>length-guard)last--;
    const crossingChecks=[];
    if(last>first&&crossingObstacles.length){
      const interior=[];
      for(let i=first;i<=last;i++)interior.push(coordinates[2*i+1]);
      for(let i=last;i>=first;i--)interior.push(coordinates[2*i]);
      interior.push(interior[0]);
      const originalMask=[[interior.map(p=>projection.project(p))]],mask=roi===undefined?originalMask:pc.intersection(originalMask,roi);let rejected=null;
      for(const obstacle of crossingObstacles){
        if(obstacle.onlyRail&&!f.railway||f.ids.includes(obstacle.id))continue;
        if(!mask.length)break;
        obstacle.polygons??=lineBuffer(obstacle.lines[0],obstacle.radius);
        const overlap=pc.intersection(mask,obstacle.polygons);if(!overlap.length)continue;
        let crossingPoints=axisCrossings(xy.slice(first,last+1),obstacle.lines).filter(inROI);
        if(!crossingPoints.length)crossingPoints=overlap.map(poly=>{const r=poly[0].slice(0,-1);return [r.reduce((n,p)=>n+p[0],0)/r.length,r.reduce((n,p)=>n+p[1],0)/r.length];});
        for(const pointXY of crossingPoints){
          let allowed=false;try{allowed=allowCrossing?.(obstacle.feature,pointXY)===true;}catch{}
          if(!allowed){rejected=obstacle;break;}
          crossingChecks.push({featureId:obstacle.id,pointXY,allowed:true});
        }
        if(rejected)break;
      }
      if(rejected){fail(f.ids,`creuament interior amb ${rejected.type} ${rejected.id} sense cota acreditada; layer no és una altitud`);continue;}
    }
    let meanLiftMetres=0;for(let i=1;i<stations.length;i++)meanLiftMetres+=((elevations[i]-sourceElevations[i])+(elevations[i-1]-sourceElevations[i-1]))*(stations[i]-stations[i-1])/2;
    const id=`estimated-major-road-${f.ids.map(String).join('-')}-${key(f.points[0]).replaceAll(',','_')}`;
    items.push({id,coordinates,faces,outlines:[outline],axis:f.points,axisXYZ:axisCoordinates.map((p,i)=>[...p,elevations[i]]),sourceFeatureIds:f.ids,railway:f.railway,estimated:true,mainRoad:true,elevationMethod:railLine?'rail-endpoint-grade':smooth?'rounded-upper-envelope-dem':'upper-envelope-dem',smoothingRadiusMetres:rounded?.radius,roadClass:f.class,ref:f.props.ref,name:f.props.name,oneway:f.props.oneway,layer:f.level,widthMetres,sourceWidthMetres,stations,sourceElevations,sourceFloors,renderedElevations,renderedFloors,originalConstraintFloors,constraintFloors,elevations,hullAnchors:hull,lengthMetres:length,maxGrade,maximumGrade:maxObservedGrade,maximumLiftMetres,maximumSectionLiftMetres,meanLiftMetres:meanLiftMetres/length,minimumFloorClearanceMetres:Math.min(...elevations.map((z,i)=>z-sourceFloors[i])),minimumConstraintClearanceMetres:Math.min(...elevations.map((z,i)=>z-constraintFloors[i])),endpointLiftMetres:[elevations[0]-sourceFloors[0],elevations.at(-1)-sourceFloors.at(-1)],crossingChecks});
    stationCount+=stations.length;
  }
  if(dropped)warnings.push(`Plataformes viàries: ${dropped} eixos/fragments omesos pels límits de ${maxItems} eixos, ${LIMITS.fragments} fragments, ${LIMITS.inputPoints} punts i ${LIMITS.stations} estacions.`);
  for(const omission of omissions)warnings.push(`Carretera ${omission.sourceFeatureIds.join(', ')} omesa: ${omission.reason}.`);
  if(items.length)warnings.push(smooth?'Vies principals i ferroviàries amb perfils suavitzats i suports estimats a partir del relleu.':'Carreteres principals amb envolupant superior del DEM i suports estimats; es conserva el relleu. No són cotes constructives mesurades.');
  return {items,warnings,metadata:{estimated:true,method:'upper-envelope-dem',reference:renderedElevationAt?'source-and-generated-terrain':'source-dem',terrainModified:false,obstacleScope:roi===undefined?'complete-axis':'physical-roi',allowEndpointLift,classes:[...MAJOR_CLASSES],count:items.length,stationCount,omitted:omissions.length+dropped,omissions,stationMetres,minRoadWidthMM,maxLiftMetres,maximumGrade:.12,maximumLinkGrade:.16,maximumSourceLiftMetres:items.length?Math.max(...items.map(i=>i.maximumSectionLiftMetres)):0,minimumFloorClearanceMetres:items.length?Math.min(...items.map(i=>i.minimumFloorClearanceMetres)):0,crossingChecks:items.flatMap(item=>item.crossingChecks.map(check=>({itemId:item.id,...check}))),budgets:{...LIMITS,maxItems},floorMethod:'maximum original DEM on axis/both edges, and optional unchanged generated-terrain elevations',clearanceReference:'road TOP minus original DEM; subtract printable slab thickness before support planning',source:'original source axes and DEM; estimated upper envelope, no measured road alignment'}};
}
