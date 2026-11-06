import {isInactiveRailway,isRailway} from './railways.js';

const layers=new Set(['railways','urban']);
const identifier=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
export const isHistoricalYear=value=>Number.isSafeInteger(value)&&value>=1000&&value<=2100;
export const validHistoricalChoice=value=>!!value&&identifier(value.areaId)&&isHistoricalYear(value.year);
const bboxValid=box=>Array.isArray(box)&&box.length===4&&box.every(Number.isFinite)&&
  box[0]>=-180&&box[2]<=180&&box[1]>=-90&&box[3]<=90&&box[0]<box[2]&&box[1]<box[3];
const contains=(outer,inner)=>outer[0]<=inner[0]&&outer[1]<=inner[1]&&outer[2]>=inner[2]&&outer[3]>=inner[3];
const area=([w,s,e,n])=>(e-w)*(n-s);
const validSource=source=>source&&[source.name,source.license].every(s=>typeof s==='string'&&s.trim())&&
  typeof source.url==='string'&&URL.canParse(source.url)&&new URL(source.url).protocol==='https:';

export function parseHistoricalCatalog(data){
  if(!Array.isArray(data?.areas))throw Error('Invalid historical catalogue.');
  const ids=new Set();
  return data.areas.map(entry=>{
    const {id,bbox,layer,label,center,widthM,source,editions}=entry??{};
    if(!identifier(id)||ids.has(id)||!bboxValid(bbox)||!layers.has(layer)||!validSource(source)||
      typeof label!=='string'||!label.trim()||!Array.isArray(editions)||!editions.length||
      !editions.every(e=>isHistoricalYear(e?.year)&&typeof e.file==='string'&&/^[a-z0-9][a-z0-9-]*\.geojson$/.test(e.file))||
      new Set(editions.map(e=>e.year)).size!==editions.length||
      center!=null&&(!Array.isArray(center)||center.length!==2||!center.every(Number.isFinite)||
        !contains(bbox,[center[1],center[0],center[1],center[0]])||!Number.isFinite(widthM)||widthM<=0))throw Error('Invalid historical catalogue entry.');
    ids.add(id);
    return {id,bbox,layer,label,center,widthM,source,editions:editions.slice().sort((a,b)=>a.year-b.year)};
  });
}

export function matchHistoricalArea(areas,bbox){
  if(!bboxValid(bbox))return null;
  return areas.filter(entry=>entry.editions.length>=2&&contains(entry.bbox,bbox))
    .sort((a,b)=>area(a.bbox)-area(b.bbox)||a.id.localeCompare(b.id))[0]??null;
}

const rail=f=>f.properties?.sourceLayer==='transportation'&&(isRailway(f.properties)||isInactiveRailway(f.properties));
const building=f=>f.properties?.sourceLayer==='building';
const position=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Math.abs(p[0])<=180&&Number.isFinite(p[1])&&Math.abs(p[1])<=90;
const path=(line,min)=>Array.isArray(line)&&line.length>=min&&line.every(position);
const ring=line=>path(line,4)&&line[0][0]===line.at(-1)[0]&&line[0][1]===line.at(-1)[1];
const list=(values,valid)=>Array.isArray(values)&&values.length>0&&values.every(valid);
const line=points=>path(points,2);
const polygon=rings=>list(rings,ring);
const validGeometry={LineString:line,MultiLineString:lines=>list(lines,line),Polygon:polygon,MultiPolygon:polygons=>list(polygons,polygon)};

export function parseHistoricalEdition(data,{id,layer},year){
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Invalid historical edition.');
  const types=layer==='railways'?['LineString','MultiLineString']:['Polygon','MultiPolygon'];
  return data.features.map((f,index)=>{
    const {geometry:g,properties:p}=f??{};
    if(f?.type!=='Feature'||!types.includes(g?.type)||!validGeometry[g.type](g.coordinates))throw Error('Invalid historical geometry.');
    return {type:'Feature',id:`historical-${id}-${year}-${index}`,geometry:g,properties:layer==='railways'?
      {sourceLayer:'transportation',class:'rail',railway:['rail','narrow_gauge','tram','light_rail','subway'].includes(p?.railway)?p.railway:'rail',name:typeof p?.name==='string'?p.name:undefined}:
      {sourceLayer:'building',historical_urban:true}};
  });
}

export function createHistoricalCatalog(read){
  const cache=new Map();
  function load(file,parse){
    if(!cache.has(file)){
      const pending=Promise.resolve().then(()=>read(file)).then(parse);
      cache.set(file,pending);
      pending.catch(()=>cache.delete(file));
    }
    return cache.get(file);
  }
  return {areas:()=>load('index.json',parseHistoricalCatalog),edition:(entry,year)=>{
    const edition=entry?.editions.find(e=>e.year===year);
    if(!edition)throw Error('Historical year not available.');
    return load(edition.file,data=>parseHistoricalEdition(data,entry,year));
  }};
}

// The base region remains current and reusable. Each run replaces only the
// documented layer, including a verified empty edition after a closure.
export function applyHistoricalEdition(region,entry,year,features,coverage){
  if((!coverage&&!contains(entry.bbox,region.meta.bbox))||!entry.editions.some(e=>e.year===year))throw Error('Historical edition does not cover this selection.');
  const railway=entry.layer==='railways',replace=railway?rail:building;
  const historical={areaId:entry.id,place:entry.label,layer:entry.layer,year,source:entry.source,...coverage,
    method:railway?'historic railway alignments on current terrain':'historical urban land-cover polygons on current terrain'};
  return {...region,features:[...region.features.filter(f=>!replace(f)),...features],
    ...(railway?{bridgeFeatures:region.bridgeFeatures?.filter(f=>!rail(f)),
      infrastructure:region.infrastructure?{...region.infrastructure,items:region.infrastructure.items?.filter(item=>!item.railway)}:region.infrastructure}:{}),
    meta:{...region.meta,historical,...(!railway?{buildings:{provider:entry.source.name,count:0},buildingSource:'historical-urban'}:{})}};
}
