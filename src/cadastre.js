import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {coordinateTransform} from './local-raster.js';
export const CADASTRE_URL='https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx';
export const CADASTRE_LICENSE='https://www.catastro.hacienda.gob.es/webinspire/documentos/Licencia.pdf';
const array=v=>v==null?[]:Array.isArray(v)?v:[v];
const value=v=>typeof v==='object'&&v!==null?v['#text']:v;
const number=v=>value(v)==null||String(value(v)).trim()===''?NaN:Number(value(v));
export const inCadastreArea=b=>b[0]>=-9.6&&b[2]<=4.5&&b[1]>=35.7&&b[3]<=43.9;
export function cadastreQuery(bbox){
  if(!bbox?.every(Number.isFinite)||!inCadastreArea(bbox)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3])throw Error('Catastre: àmbit de prova limitat a la península i les Balears, excloses les hisendes forals.');
  const [w,s,e,n]=bbox,area=(e-w)*111320*Math.cos((s+n)/2*Math.PI/180)*(n-s)*111320;
  if(area>4_000_000)throw Error('Catastre: selecciona una àrea de menys de 4 km² per carregar edificis i parts.');
  const zone=Math.max(29,Math.min(31,Math.floor(((w+e)/2+180)/6)+1)),epsg=25800+zone,t=coordinateTransform(epsg),corners=[[w,s],[e,s],[e,n],[w,n]].map(p=>t.inverse(p));
  return {epsg,bbox:[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1])),Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1]))]};
}
export function parseCadastreGML(text,{kind='BuildingPart',epsg=25831}={}){
  if(typeof text!=='string'||text.length>20_000_000||/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Catastre: resposta XML no admesa o massa gran.');
  if(!['Building','BuildingPart'].includes(kind)||XMLValidator.validate(text)!==true)throw Error('Catastre: XML de geometries invàlid.');
  const json=new XMLParser({removeNSPrefix:true,ignoreAttributes:false,parseTagValue:false,processEntities:false}).parse(text),collection=json.FeatureCollection;
  if(!collection||json.ExceptionReport)throw Error('Catastre: el servei no ha retornat geometries. Prova una regió més petita.');
  const members=array(collection.featureMember??collection.member);
  if(members.length>=5000||number(collection['@_numberMatched'])>=5000||number(collection['@_numberOfFeatures'])>=5000)throw Error('Catastre: consulta massa gran. Redueix la regió.');
  const transform=coordinateTransform(epsg),ids=new Set();let vertices=0;
  return members.map(member=>{
    const f=member[kind];if(!f)throw Error('Catastre: tipus de geometria inesperat.');
    const id=f['@_id'];if(typeof id!=='string'||!id||ids.has(id))throw Error('Catastre: identificadors absents o duplicats.');ids.add(id);
    const surfaces=array(f.geometry?.BuildingGeometry?.geometry?.Surface);
    if(!surfaces.length)throw Error('Catastre: geometria de superfície no admesa.');
    const coordinates=[];
    for(const surface of surfaces){
      if(Number(surface['@_srsName']?.match(/(\d+)$/)?.[1])!==epsg)throw Error('Catastre: sistema de coordenades inesperat.');
      const ring=node=>{
        const list=node?.LinearRing?.posList,raw=value(list);
        if(typeof raw!=='string'||Number(list['@_srsDimension']??2)!==2)throw Error('Catastre: anell de coordenades no admès.');
        const nums=raw.trim().split(/\s+/).map(Number);
        if(nums.length<8||nums.length%2||!nums.every(Number.isFinite)||list['@_count']!=null&&Number(list['@_count'])!==nums.length/2)throw Error('Catastre: anell de coordenades invàlid.');
        if((vertices+=nums.length/2)>300000)throw Error('Catastre: massa vèrtexs. Redueix la regió.');
        if(Math.hypot(nums[0]-nums.at(-2),nums[1]-nums.at(-1))>1e-6)throw Error('Catastre: anell no tancat.');
        const result=[];for(let i=0;i<nums.length;i+=2){const p=transform.forward([nums[i],nums[i+1]]);if(!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>70)throw Error('Catastre: coordenades fora de rang.');result.push(p);}return result;
      };
      const patches=array(surface.patches?.PolygonPatch);if(!patches.length)throw Error('Catastre: superfície sense polígons.');
      for(const p of patches)coordinates.push([ring(p.exterior),...array(p.interior).map(ring)]);
    }
    const floors=number(f.numberOfFloorsAboveGround),knownFloors=Number.isInteger(floors)&&floors>0&&floors<=100;
    return {type:'Feature',id,geometry:{type:'MultiPolygon',coordinates},properties:{sourceLayer:'building',provider:'Dirección General del Catastro · INSPIRE BU',source_id:id,family:id.replace(/_part[^_]*$/i,''),is_part:kind==='BuildingPart',above_ground_floors:Number.isFinite(floors)?floors:null,render_height:knownFloors?floors*3:6,height_estimated:true,height_method:knownFloors?'above-ground floors × 3m estimate':'6m fallback estimate',source_version:value(f.beginLifespanVersion)||null}};
  });
}
export function cadastralVolumes(buildings,parts){
  const families=new Set(parts.map(f=>f.properties.family));
  // Keep a coherent family: never extrude its envelope over its component parts.
  return [...parts.filter(f=>f.properties.above_ground_floors!==0),...buildings.filter(f=>!families.has(f.properties.family))];
}
export async function fetchCadastralBuildings(bbox,fetcher=fetch){
  const query=cadastreQuery(bbox),datasets=[];
  for(const kind of ['Building','BuildingPart']){
    const params=new URLSearchParams({service:'wfs',version:'2.0.0',request:'getfeature',typenames:'BU.'+kind.toUpperCase(),bbox:query.bbox.join(','),srsname:'EPSG::'+query.epsg});
    const response=await fetcher(CADASTRE_URL+'?'+params,{signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error(`Catastre: error ${response.status} en carregar edificis. Pots triar una altra font.`);
    if(Number(response.headers?.get('content-length'))>20_000_000)throw Error('Catastre: resposta massa gran.');
    const text=new TextDecoder('windows-1252').decode(await response.arrayBuffer());
    datasets.push(parseCadastreGML(text,{kind,epsg:query.epsg}));
  }
  const [buildings,parts]=datasets,features=cadastralVolumes(buildings,parts);
  if(!features.length)throw Error('Catastre: no hi ha edificis sobre rasant disponibles. Tria ICGC o OpenStreetMap.');
  return {features,metadata:{provider:'Dirección General del Catastro · INSPIRE BU',url:CADASTRE_URL,license:CADASTRE_LICENSE,retrievedAt:new Date().toISOString(),buildingCount:buildings.length,partCount:parts.length,zeroFloorPartsOmitted:parts.filter(p=>p.properties.above_ground_floors===0).length,count:features.length,heightMethod:'floors × 3m or 6m fallback; estimates, not measured heights',roofData:false},warnings:['Catastre: parts de volum, no habitatges identificats. Altures estimades a partir de plantes; no conté formes de coberta. La font substitueix tota la capa d’edificis, sense afegir-hi les envolupants ICGC.']};
}
