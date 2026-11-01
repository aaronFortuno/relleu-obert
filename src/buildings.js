import {polygonOps} from './polygon-ops.js';
const pc=polygonOps(1e-10);
export const ICGC_BUILDINGS='https://geoserveis.icgc.cat/vector01/rest/services/topografia_territorial/MapServer/10';
export const inCatalonia=b=>b[0]>=.15&&b[2]<=3.4&&b[1]>=40.48&&b[3]<=42.9;
const polys=f=>f.geometry?.type==='Polygon'?[f.geometry.coordinates]:f.geometry?.type==='MultiPolygon'?f.geometry.coordinates:[];
const ringArea=r=>Math.abs(r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2);
const area=m=>m.reduce((s,p)=>s+ringArea(p[0])-p.slice(1).reduce((s,r)=>s+ringArea(r),0),0);
const bounds=f=>{const p=polys(f).flat(2);return [Math.min(...p.map(p=>p[0])),Math.min(...p.map(p=>p[1])),Math.max(...p.map(p=>p[0])),Math.max(...p.map(p=>p[1]))];};
export function officialBuilding(f){
  const h=Number(f.properties.altura),valid=Number.isFinite(h)&&h>0&&h<=1200;
  return {...f,id:`icgc-${f.properties.OBJECTID}`,properties:{sourceLayer:'building',render_height:valid?h:6,height_estimated:!valid,provider:'ICGC RTT',official_id:f.properties.OBJECTID}};
}
export async function fetchOfficialBuildings(bbox,fetcher=fetch){
  const features=[],ids=new Set(),pageSize=1000;
  for(let offset=0;offset<10000;offset+=pageSize){
    const params=new URLSearchParams({f:'geojson',where:"tipus = 'edi' AND (estat IS NULL OR estat NOT IN ('prj', 'cns', 'rui'))",geometry:bbox.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'OBJECTID,tipus,estat,altura',returnGeometry:'true',returnZ:'false',orderByFields:'OBJECTID',resultRecordCount:String(pageSize),resultOffset:String(offset)});
    const response=await fetcher(ICGC_BUILDINGS+'/query?'+params,{signal:AbortSignal.timeout(25000)});
    if(!response.ok)throw Error(`ICGC: error ${response.status} en carregar edificacions.`);
    const data=await response.json();if(data.error||!Array.isArray(data.features))throw Error('ICGC: la resposta no conté geometries vàlides.');
    for(const f of data.features)if(polys(f).length&&!ids.has(f.properties.OBJECTID)){features.push(officialBuilding(f));ids.add(f.properties.OBJECTID);}
    if(data.features.length<pageSize)return {type:'FeatureCollection',features,metadata:{provider:'ICGC · Referencial Topogràfic Territorial',url:ICGC_BUILDINGS,license:'CC BY 4.0',retrievedAt:new Date().toISOString()}};
  }
  throw Error('La consulta ICGC supera 10.000 elements. Selecciona una regió més petita.');
}
export function combineBuildings(features,official){
  const reference=official.features.map(f=>({f,bbox:bounds(f),poly:polys(f)}));let replaced=0,retained=0;
  const result=[];
  for(const f of features){
    if(f.properties.sourceLayer!=='building'){result.push(f);continue;}
    const keep=[];
    // Vector tiles can group hundreds of independent buildings in a MultiPolygon.
    // Replace matching footprints individually, never the entire grouped feature.
    for(const poly of polys(f)){
      const single={...f,geometry:{type:'Polygon',coordinates:poly}},b=bounds(single),p=[poly],a=area(p);
      if(reference.some(r=>r.bbox[0]<=b[2]&&r.bbox[2]>=b[0]&&r.bbox[1]<=b[3]&&r.bbox[3]>=b[1]&&area(pc.intersection(p,r.poly))>a*.05))replaced++;
      else{keep.push(poly);retained++;}
    }
    if(keep.length)result.push({...f,geometry:{type:'MultiPolygon',coordinates:keep}});
  }
  return {features:[...result,...official.features],metadata:{...official.metadata,officialCount:official.features.length,osmRetained:retained,osmReplaced:replaced}};
}
