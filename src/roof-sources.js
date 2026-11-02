import {polygonOps} from './polygon-ops.js';

const pc=polygonOps(1e-10),ENDPOINTS=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];
const MAX_BYTES=6_000_000,MAX_ELEMENTS=20000,MAX_FEATURES=1500,MAX_POINTS=40000,TTL=10*60*1000;
const cacheByFetcher=new WeakMap();
const pointKey=p=>p.map(v=>v.toFixed(8)).join(',');
const ringArea=r=>Math.abs(r.reduce((n,p,i)=>{const q=r[(i+1)%r.length];return n+p[0]*q[1]-q[0]*p[1];},0)/2);
const polygonArea=p=>ringArea(p[0])-p.slice(1).reduce((n,r)=>n+ringArea(r),0);
const contains=(p,r)=>{let yes=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const polygons=f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
const tagged=t=>t&&((t.building&&t.building!=='no')||(t['building:part']&&t['building:part']!=='no'));
export function osmMetres(value){return typeof value==='number'?value:typeof value==='string'&&/^\s*\d+(?:\.\d+)?\s*m?\s*$/.test(value)?parseFloat(value):NaN;}
function heightTags(tags){
  const exact=osmMetres(tags.height),levels=Number(tags['building:levels']),roof=osmMetres(tags['roof:height']);
  const levelHeight=Number.isFinite(levels)&&levels>0&&levels<=200?levels*3+(Number.isFinite(roof)&&roof>0?roof:0):6;
  const valid=Number.isFinite(exact)&&exact>0&&exact<=1200,min=osmMetres(tags.min_height);
  return {render_height:valid?exact:levelHeight,height_estimated:!valid,render_min_height:Number.isFinite(min)&&min>=0&&min<(valid?exact:levelHeight)?min:0,heightBasis:valid?'OSM height':'OSM building:levels × 3 m, or 6 m fallback'};
}
function closed(points){
  if(!Array.isArray(points)||points.length<4||points.length>5000||!points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=85)||pointKey(points[0])!==pointKey(points.at(-1))||ringArea(points)<1e-14)return null;
  return points;
}
function assemble(lines){
  const pending=lines.map(p=>p.slice()),rings=[];
  while(pending.length){let ring=pending.shift();for(let guard=0;pointKey(ring[0])!==pointKey(ring.at(-1))&&guard<lines.length;guard++){
    const k=pointKey(ring.at(-1)),matches=pending.map((p,i)=>({p,i,rev:pointKey(p.at(-1))===k})).filter(o=>pointKey(o.p[0])===k||o.rev);
    if(matches.length!==1)return null;const {p,i,rev}=matches[0];pending.splice(i,1);ring.push(...(rev?p.slice().reverse():p).slice(1));
  }if(!closed(ring))return null;rings.push(ring);}
  return rings;
}
/** Accepts Overpass out geom and OSM API map JSON; preserves source tags and IDs. */
export function parseOSMBuildings(data,{url='OpenStreetMap original data',retrievedAt=new Date().toISOString()}={}){
  if(!Array.isArray(data?.elements)||data.elements.length>MAX_ELEMENTS||data.elements.filter(e=>(e.type==='way'||e.type==='relation')&&tagged(e.tags)).length>MAX_FEATURES||data.remark)throw Error('OSM 3D: resposta incompleta o fora del límit d’entitats.');
  const nodes=new Map(data.elements.filter(e=>e.type==='node').map(e=>[e.id,[e.lon,e.lat]])),ways=new Map(data.elements.filter(e=>e.type==='way').map(e=>[e.id,e])),warnings=[],features=[],relationWays=new Set();let total=0;
  const geometry=e=>{const points=Array.isArray(e.geometry)?e.geometry.map(p=>[p?.lon,p?.lat]):Array.isArray(e.nodes)?e.nodes.map(id=>nodes.get(id)):null;return points&&points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=85)?points:null;};
  const add=(e,poly)=>{
    if(features.length>=MAX_FEATURES)throw Error('OSM 3D: més de 1.500 edificis; redueix la regió.');
    total+=poly.flat(2).length;if(total>MAX_POINTS)throw Error('OSM 3D: geometria massa extensa; redueix la regió.');
    const tags=Object.fromEntries(Object.entries(e.tags||{}).filter(([k,v])=>typeof v==='string'&&(k.startsWith('roof:')||k.startsWith('building:')||['height','min_height','building','name','source','source:geometry','wikidata'].includes(k))));
    features.push({type:'Feature',id:`osm-${e.type}-${e.id}`,properties:{...tags,sourceLayer:'building',provider:'OpenStreetMap original · ODbL',source_id:`${e.type}/${e.id}`,osm_version:e.version??null,...heightTags(tags),roofSource:{provider:'OpenStreetMap contributors',element:`${e.type}/${e.id}`,url:`https://www.openstreetmap.org/${e.type}/${e.id}`,method:'source roof parameters, not a surveyed mesh',retrievedAt}},geometry:{type:'MultiPolygon',coordinates:poly}});
  };
  for(const e of data.elements)if(e.type==='relation'&&tagged(e.tags)&&e.tags.type==='multipolygon'){
    const members=e.members||[],roles={outer:[],inner:[]};let valid=true;
    for(const m of members){if(m.type!=='way'||!['outer','inner',''].includes(m.role??'')){valid=false;break;}const g=geometry(m)||geometry(ways.get(m.ref)||{});if(!g||g.length<2||g.some(p=>!p)){valid=false;break;}roles[m.role==='inner'?'inner':'outer'].push(g);}
    const outer=valid?assemble(roles.outer):null,inner=valid?assemble(roles.inner):null;
    if(!outer?.length||!inner){warnings.push(`OSM 3D: relació ${e.id} omesa perquè els anells no són complets.`);continue;}
    const poly=outer.map(r=>[r]);for(const hole of inner){const owners=poly.filter(p=>contains(hole[0],p[0]));if(owners.length!==1){valid=false;break;}owners[0].push(hole);}
    if(!valid){warnings.push(`OSM 3D: relació ${e.id} amb pati ambigu omesa.`);continue;}
    add(e,poly);members.forEach(m=>relationWays.add(m.ref));
  }
  for(const e of data.elements)if(e.type==='way'&&tagged(e.tags)&&(!relationWays.has(e.id)||e.tags['building:part'])){const ring=closed(geometry(e));if(!ring){warnings.push(`OSM 3D: edifici ${e.id} amb geometria incompleta omès.`);continue;}add(e,[[ring]]);}
  // Replace only the footprint occupied by mapped parts. Keep any uncovered
  // portion of an outline; never erase a whole building because one part exists.
  const parts=features.filter(f=>f.properties['building:part']&&f.properties['building:part']!=='no');
  const result=[];
  for(const feature of features){
    if(parts.includes(feature)){result.push(feature);continue;}
    const base=polygons(feature),baseArea=base.reduce((n,p)=>n+polygonArea(p),0),children=parts.filter(part=>{
      const a=polygons(part).reduce((n,p)=>n+polygonArea(p),0);return a>0&&a<=baseArea*1.01&&pc.intersection(base,polygons(part)).reduce((n,p)=>n+polygonArea(p),0)>=a*.95;
    });
    if(!children.length){result.push(feature);continue;}
    children.forEach(part=>part.properties.family=feature.id);
    const rest=pc.difference(base,...children.map(polygons));
    if(rest.length)result.push({...feature,geometry:{type:'MultiPolygon',coordinates:rest}});
  }
  const explicit=result.filter(f=>f.properties['roof:shape']).length;
  if(result.length&&!explicit)warnings.push('OSM original: aquesta regió no conté atributs de forma de coberta; els edificis sense dades de coberta es mantenen plans.');
  return {features:result,warnings,metadata:{provider:'OpenStreetMap · cobertes i parts originals',url,license:'ODbL 1.0',retrievedAt,count:result.length,partCount:parts.length,roofAttributeCount:explicit,roofGeometry:'source parameters; not measured roof planes',heightEstimation:'3 m per mapped level only when height is absent'}};
}
function validateBBox(bbox){
  if(!Array.isArray(bbox)||bbox.length!==4||!bbox.every(Number.isFinite)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3]||Math.abs(bbox[0])>180||Math.abs(bbox[2])>180||Math.abs(bbox[1])>70||Math.abs(bbox[3])>70)throw Error('OSM 3D: regió invàlida.');
  const area=(bbox[2]-bbox[0])*111.32*Math.cos((bbox[1]+bbox[3])*Math.PI/360)*(bbox[3]-bbox[1])*111.32;
  if(area>16)throw Error('OSM 3D: selecciona una regió de com a màxim 16 km².');
}
async function readBounded(response){
  if(Number(response.headers.get('content-length'))>MAX_BYTES)throw Error('OSM 3D: resposta massa gran.');
  if(!response.body?.getReader){const text=await response.text();if(text.length>MAX_BYTES)throw Error('OSM 3D: resposta massa gran.');return JSON.parse(text);}
  const reader=response.body.getReader(),chunks=[];let length=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();throw Error('OSM 3D: resposta massa gran.');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
export async function fetchOSMBuildings(bbox,fetcher=fetch,{endpoints=ENDPOINTS,timeoutMS=10000,onProgress=()=>{}}={}){
  validateBBox(bbox);if(!Array.isArray(endpoints)||!endpoints.length||endpoints.length>2||!Number.isSafeInteger(timeoutMS)||timeoutMS<100||timeoutMS>12000)throw Error('OSM 3D: pressupost de consulta invàlid.');
  let cache=cacheByFetcher.get(fetcher);if(!cache){cache=new Map();cacheByFetcher.set(fetcher,cache);}
  const key=bbox.map(v=>v.toFixed(7)).join(',')+'|'+endpoints.join(',');const previous=cache.get(key);if(previous&&Date.now()-previous.time<TTL)return previous.promise;
  const promise=(async()=>{
    const box=[bbox[1],bbox[0],bbox[3],bbox[2]].join(','),query=`[out:json][timeout:8][maxsize:33554432];(way[building](${box});way["building:part"](${box});relation[building][type=multipolygon](${box});relation["building:part"][type=multipolygon](${box}););out meta geom ${MAX_FEATURES+1};`;
    let error;
    for(const endpoint of endpoints){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMS);
      try{
        onProgress('Carregant cobertes i parts originals d’OpenStreetMap…');
        const response=await fetcher(endpoint+'?data='+encodeURIComponent(query),{signal:controller.signal,headers:{Accept:'application/json'},credentials:'omit'});
        if(!response.ok)throw Error(`servei HTTP ${response.status}`);
        return parseOSMBuildings(await readBounded(response),{url:endpoint,retrievedAt:new Date().toISOString()});
      }catch(e){error=e;}finally{clearTimeout(timer);}
    }
    throw Error('OSM 3D: no s’han pogut obtenir les cobertes originals ('+(error?.message||'servei no disponible')+').');
  })();
  cache.set(key,{time:Date.now(),promise});while(cache.size>8)cache.delete(cache.keys().next().value);
  try{return await promise;}catch(e){if(cache.get(key)?.promise===promise)cache.delete(key);throw e;}
}
