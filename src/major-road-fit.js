import {projectInfrastructurePath} from './infrastructure-solids.js';
import {topSampler} from './bridge-completion.js';
import {polygonOps} from './polygon-ops.js';

function projectedTriangles(item,projection,verticalReference,exaggeration,lift=0){
  if(!Array.isArray(item?.faces)||item.faces.length%3||item.faces.some(i=>!Number.isSafeInteger(i)||i<0||i>=item.coordinates?.length))throw Error('Triangles de font XYZ invàlids.');
  const points=projectInfrastructurePath(item.coordinates,projection,verticalReference,exaggeration).map(p=>[p[0],p[1],p[2]+lift]),triangles=[];
  for(let i=0;i<item.faces.length;i+=3){
    const [a,b,c]=item.faces.slice(i,i+3).map(j=>points[j]),det=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(det)<1e-12)continue;
    const top=(x,y)=>{const u=((x-a[0])*(c[1]-a[1])-(y-a[1])*(c[0]-a[0]))/det,v=((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/det;return a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]);};
    const contains=([x,y])=>{const u=((x-a[0])*(c[1]-a[1])-(y-a[1])*(c[0]-a[0]))/det,v=((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/det;return u>=-1e-7&&v>=-1e-7&&u+v<=1.0000001;};
    triangles.push({top,contains,poly:[[a.slice(0,2),b.slice(0,2),c.slice(0,2),a.slice(0,2)]],box:[Math.min(a[0],b[0],c[0]),Math.min(a[1],b[1],c[1]),Math.max(a[0],b[0],c[0]),Math.max(a[1],b[1],c[1])]});
  }
  return triangles;
}

// Fit an estimated road TOP above the intact generated terrain. Source XYZ,
// profile grades and the terrain remain unchanged: the caller applies the
// returned uniform millimetre offset before any requested decorative road rise.
//
// `patches` must clip its MultiPolygon input against land/ROI and partition it
// on the ORIGINAL terrain triangles. Intersecting each source triangle with
// that field makes top-ground affine on each patch, so checking ALL patch
// vertices includes interior terrain peaks, not merely the road outline.
export function fitMajorRoadItem(item,{projection,verticalReference,exaggeration,ground,patches,maxLiftMetres=12}={}){
  if(typeof projection?.project!=='function'||!Number.isFinite(projection?.scale)||projection.scale<=0||!Number.isFinite(exaggeration)||exaggeration<=0||typeof ground!=='function'||typeof patches!=='function'||!Number.isFinite(maxLiftMetres)||maxLiftMetres<=0||maxLiftMetres>30||!Array.isArray(item?.coordinates)||!Array.isArray(item?.faces)||!item.faces.length||item.faces.length%3||item.faces.some(i=>!Number.isSafeInteger(i)||i<0||i>=item.coordinates.length))throw Error('Configuració d’ajust de carretera invàlida.');
  const points=projectInfrastructurePath(item.coordinates,projection,verticalReference,exaggeration),top=topSampler(points,item.faces),seen=new Set();
  let minimumDifference=Infinity,maximumDifference=-Infinity,samples=0;
  for(let i=0;i<item.faces.length;i+=3){
    const triangle=item.faces.slice(i,i+3).map(index=>points[index].slice(0,2));
    const area=(triangle[1][0]-triangle[0][0])*(triangle[2][1]-triangle[0][1])-(triangle[1][1]-triangle[0][1])*(triangle[2][0]-triangle[0][0]);
    if(Math.abs(area)<1e-12)continue;
    const ring=[...triangle,triangle[0].slice()];
    for(const polygon of patches([[ring]])){
      if(!Array.isArray(polygon)||polygon.some(r=>!Array.isArray(r)))throw Error('Partició del terreny invàlida en ajustar la carretera.');
      for(const r of polygon)for(const p of r){
        if(!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite))throw Error('Vèrtex del terreny invàlid en ajustar la carretera.');
        const key=p[0]+','+p[1];if(seen.has(key))continue;seen.add(key);
        const z=top(p[0],p[1]),base=ground(p[0],p[1]);
        if(!Number.isFinite(z)||!Number.isFinite(base))throw Error('Altitud del terreny o plataforma invàlida en ajustar la carretera.');
        const difference=z-base;
        minimumDifference=Math.min(minimumDifference,difference);maximumDifference=Math.max(maximumDifference,difference);samples++;
      }
    }
  }
  if(!samples)return {accepted:false,present:false,adjustmentMM:0,maximumPrintedLiftMetres:0,samples:0,reason:'plataforma fora del terreny o retall seleccionat'};
  const adjustmentMM=minimumDifference<0?-minimumDifference+.0001:0;
  const maximumPrintedLiftMetres=(maximumDifference+adjustmentMM)/(projection.scale*exaggeration);
  if(maximumPrintedLiftMetres>maxLiftMetres+1e-8)return {accepted:false,present:true,adjustmentMM,maximumPrintedLiftMetres,samples,reason:`separació del terreny generat de ${maximumPrintedLiftMetres.toFixed(2)} m superior al límit de ${maxLiftMetres} m`};
  return {accepted:true,present:true,adjustmentMM,maximumPrintedLiftMetres,samples};
}

// Validate an authorised crossing against actual known source XYZ surfaces.
// Decorative rise raises both tops, while undersides remain sourceTop-.6 mm.
// A railway source has an additional top rise, reducing usable air only when
// the proposed road is ABOVE it; the railway underside does not move.
// Triangle/triangle overlays catch edge collisions hidden by a safe centreline.
export function knownBridgeClearance(item,fit,knownItems,{projection,verticalReference,exaggeration,roadRise=0,railRise=0,minimumClearanceMM=.8}={}){
  if(!Array.isArray(knownItems)||typeof projection?.project!=='function'||!Number.isFinite(projection?.scale)||projection.scale<=0||!Number.isFinite(exaggeration)||exaggeration<=0||!Number.isFinite(roadRise)||roadRise<0||roadRise>1||![0,.5,1].includes(railRise)||!Number.isFinite(minimumClearanceMM)||minimumClearanceMM<0||minimumClearanceMM>5)throw Error('Configuració de llum entre infraestructures invàlida.');
  let checkedCrossings=0,minimumObserved=Infinity,pairCount=0;
  const failure=reason=>({accepted:false,minimumClearanceMM:Number.isFinite(minimumObserved)?minimumObserved:null,checkedCrossings,reason});
  if(fit?.accepted!==true||!Number.isFinite(fit?.adjustmentMM)||fit.adjustmentMM<0)return failure('ajust de carretera no acreditat');
  const checks=item?.crossingChecks||[];
  if(!Array.isArray(checks))return failure('llista de creuaments invàlida');
  if(!checks.length)return {accepted:true,minimumClearanceMM:null,checkedCrossings:0};
  try{
    const proposed=projectedTriangles(item,projection,verticalReference,exaggeration,fit.adjustmentMM),known=knownItems.map(source=>({source,triangles:projectedTriangles(source,projection,verticalReference,exaggeration)})),pc=polygonOps(),thickness=.6+roadRise;
    for(const check of checks){
      checkedCrossings++;
      if(!Array.isArray(check.pointXY)||check.pointXY.length!==2||!check.pointXY.every(Number.isFinite))return failure('punt de creuament invàlid');
      const covering=known.filter(k=>k.triangles.some(t=>t.contains(check.pointXY)));
      if(!covering.length)return failure(`cap font XYZ real cobreix el creuament ${check.featureId}`);
      let orientation=null;
      for(const source of covering){
        let minDiff=Infinity,maxDiff=-Infinity,overlapCount=0;
        for(const a of proposed)for(const b of source.triangles){
          if(a.box[0]>=b.box[2]||a.box[2]<=b.box[0]||a.box[1]>=b.box[3]||a.box[3]<=b.box[1])continue;
          if(++pairCount>100000)return failure('pressupost de comprovació de creuaments superat');
          for(const polygon of pc.intersection([a.poly],[b.poly]))for(const ring of polygon)for(const [x,y]of ring){
            const diff=a.top(x,y)-b.top(x,y);if(!Number.isFinite(diff))return failure('cota XYZ de creuament invàlida');
            minDiff=Math.min(minDiff,diff);maxDiff=Math.max(maxDiff,diff);overlapCount++;
          }
        }
        if(!overlapCount)return failure(`la font XYZ no té superfície comuna amb la carretera al creuament ${check.featureId}`);
        const aboveThickness=thickness+(source.source.railway?railRise:0);
        const clearance=minDiff>=0?minDiff-aboveThickness:maxDiff<=0?-maxDiff-thickness:-aboveThickness;
        minimumObserved=Math.min(minimumObserved,clearance);
        const relation=minDiff>=aboveThickness+minimumClearanceMM-1e-8?'above':maxDiff<=-thickness-minimumClearanceMM+1e-8?'below':null;
        if(!relation)return failure(`llum de ${clearance.toFixed(3)} mm insuficient o canvi de sobre/sota al creuament ${check.featureId}; mínim ${minimumClearanceMM} mm`);
        if(orientation&&orientation!==relation)return failure(`canvi de sobre/sota entre les fonts XYZ del creuament ${check.featureId}`);
        orientation=relation;
      }
    }
    return {accepted:true,minimumClearanceMM:minimumObserved,checkedCrossings};
  }catch(error){return failure(`no es pot acreditar el creuament amb la font XYZ: ${error.message}`);}
}
