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
  const json=new XMLParser({removeNSPrefix:true,ignoreAttributes:false,parseTagValue:false,processEntities:false}).parse(text);
  if('ExceptionReport' in json){
    const reports=array(json.ExceptionReport?.Exception),detail=reports.flatMap(e=>array(e.ExceptionText)).map(value).filter(v=>typeof v==='string').join(' ').slice(0,400);
    const limit=/area of extension out of limits|too many (?:features|elements)|maximum.*(?:features|elements)/i.test(detail);
    throw Object.assign(Error(`Catastre: el servei ha retornat un error (ExceptionReport)${detail?': '+detail:'. Redueix la regió o torna-ho a provar més tard.'}`),{code:limit?'CADASTRE_LIMIT':'CADASTRE_SERVICE',serviceDetail:detail});
  }
  if(!('FeatureCollection' in json))throw Error('Catastre: el servei no ha retornat geometries. Prova una regió més petita.');
  // A valid WFS empty answer can be a bare or self-closing FeatureCollection; the parser then yields '' instead of an object.
  const raw=json.FeatureCollection;
  if(Array.isArray(raw)||raw!=null&&typeof raw!=='object'&&String(raw).trim()!=='')throw Error('Catastre: contingut de la col·lecció de geometries no admès.');
  const collection=raw||{};
  for(const key of Object.keys(collection))if(!key.startsWith('@_')&&!['featureMember','member','boundedBy'].includes(key))throw Error('Catastre: contenidor de geometries no admès.');
  if(collection['@_next']!=null||collection['@_previous']!=null||collection['@_truncated']!=null)throw Error('Catastre: resposta incompleta: el servei indica paginació o truncament. Redueix la regió o torna-ho a provar.');
  const members=array(collection.featureMember??collection.member);
  if(members.length>=5000||number(collection['@_numberMatched'])>=5000||number(collection['@_numberOfFeatures'])>=5000)throw Object.assign(Error('Catastre: consulta massa gran. Redueix la regió.'),{code:'CADASTRE_LIMIT'});
  const counts=[collection['@_numberMatched'],collection['@_numberReturned'],collection['@_numberOfFeatures']].map(number);
  if(counts.some(n=>Number.isFinite(n)&&n!==members.length))throw Error('Catastre: resposta incompleta: el recompte del servei no coincideix amb les geometries rebudes. Redueix la regió o torna-ho a provar.');
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
const CADASTRE_TIMEOUT=45000,sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wfsGet(url,fetcher,{retries=1,backoff=()=>sleep(1500),deadline=Infinity,signal}={}){
  const maxRetries=Math.min(1,Math.max(0,Number.isFinite(+retries)?Math.floor(+retries):1));
  for(let attempt=0;;attempt++){
    try{
      if(Date.now()>=deadline)throw Object.assign(Error('Catastre: temps total de consulta esgotat; no es retornen dades parcials.'),{permanent:true});
      signal?.throwIfAborted();
      const timeout=AbortSignal.timeout(Math.max(1,Math.min(CADASTRE_TIMEOUT,Math.ceil(deadline-Date.now()))));
      const response=await fetcher(url,{signal:signal?AbortSignal.any([signal,timeout]):timeout});
      if(!response.ok)throw Object.assign(Error(`Catastre: error ${response.status} en carregar edificis. Pots triar una altra font.`),{permanent:true});
      if(Number(response.headers?.get('content-length'))>20_000_000)throw Object.assign(Error('Catastre: resposta massa gran.'),{permanent:true});
      return new TextDecoder('windows-1252').decode(await response.arrayBuffer());
    }catch(e){
      if(signal?.aborted)throw signal.reason;
      if(e?.permanent)throw e;
      if(attempt<maxRetries){await backoff(attempt);continue;}
      if(e?.name==='TimeoutError'||e?.name==='AbortError')throw Error(`Catastre: el servei del Catastro no ha respost en ${CADASTRE_TIMEOUT/1000} s (${maxRetries+1} intents). Torna-ho a provar d’aquí a una estona; si persisteix, redueix la regió o tria la font ICGC o OpenStreetMap.`);
      throw Error(`Catastre: no s’ha pogut connectar amb el servei del Catastro (${e?.message||'error de xarxa'}). Comprova la connexió a internet i torna-ho a provar.`);
    }
  }
}
export async function fetchCadastralBuildings(bbox,fetcher=fetch,options={}){
  const query=cadastreQuery(bbox),datasets=[],diagnostics={requests:0,subdivisions:0,duplicates:0},deadline=Date.now()+180000,controller=new AbortController();
  let active=0,received=0,receivedVertices=0;const waiting=[];
  async function request(url){
    if(active>=2)await new Promise(resolve=>waiting.push(resolve));else active++;
    try{controller.signal.throwIfAborted();return await wfsGet(url,fetcher,{...options,deadline,signal:controller.signal});}
    finally{if(waiting.length)waiting.shift()();else active--;}
  }
  const maxRequests=42; // two kinds × (1 + 4 + 16); at most two connections
  async function section(box,kind,depth=0){
    if(++diagnostics.requests>maxRequests)throw Error('Catastre: límit de consultes assolit; no es retornen dades parcials.');
    const params=new URLSearchParams({service:'wfs',version:'2.0.0',request:'getfeature',typenames:'BU.'+kind.toUpperCase(),bbox:box.join(','),srsname:'EPSG::'+query.epsg});
    try{
      const features=parseCadastreGML(await request(CADASTRE_URL+'?'+params),{kind,epsg:query.epsg});
      received+=features.length;
      for(const f of features)for(const polygon of f.geometry.coordinates)for(const ring of polygon)receivedVertices+=ring.length;
      if(received>20000||receivedVertices>600000)throw Error('Catastre: el conjunt de zones supera el pressupost de dades. Redueix la regió.');
      return features;
    }
    catch(e){
      if(e.code!=='CADASTRE_LIMIT'||depth>=2)throw e;
      diagnostics.subdivisions++;options.onProgress?.('Catastre: dividint la consulta en zones més petites…');
      const [w,s,east,n]=box,x=(w+east)/2,y=(s+n)/2;
      return (await Promise.all([[w,s,x,y],[x,s,east,y],[w,y,x,n],[x,y,east,n]].map(sub=>section(sub,kind,depth+1)))).flat();
    }
  }
  try{for(const kind of ['Building','BuildingPart']){
    const unique=new Map();
    for(const f of await section(query.bbox,kind)){
      const previous=unique.get(f.id);
      if(previous){
        if(JSON.stringify(previous)!==JSON.stringify(f))throw Error('Catastre: un element duplicat té geometries o atributs contradictoris; no es retornen dades parcials.');
        diagnostics.duplicates++;
      }else {unique.set(f.id,f);if(unique.size>10000)throw Error('Catastre: massa elements en el conjunt de zones. Redueix la regió.');}
    }
    datasets.push([...unique.values()]);
  }}catch(e){controller.abort(e);throw e;}
  const [buildings,parts]=datasets,features=cadastralVolumes(buildings,parts),warnings=['Catastre: parts de volum, no habitatges identificats. Altures estimades a partir de plantes; no conté formes de coberta. La font substitueix tota la capa d’edificis, sense afegir-hi les envolupants ICGC.'];
  if(!features.length)warnings.push('Catastre: el servei no ha retornat volums d’edificis sobre rasant per a aquesta àrea (dada absent, no prova d’absència real). El terreny i la resta del model es generen sense edificis; si l’àrea n’hauria de tenir, tria la font ICGC o OpenStreetMap.');
  return {features,metadata:{provider:'Dirección General del Catastro · INSPIRE BU',url:CADASTRE_URL,license:CADASTRE_LICENSE,retrievedAt:new Date().toISOString(),buildingCount:buildings.length,partCount:parts.length,query:diagnostics,zeroFloorPartsOmitted:parts.filter(p=>p.properties.above_ground_floors===0).length,count:features.length,heightMethod:'floors × 3m or 6m fallback; estimates, not measured heights',roofData:false},warnings};
}
