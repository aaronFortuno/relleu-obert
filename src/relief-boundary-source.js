import {lonLatTile} from './elevation.js';

export const ICGC_BOUNDARY_SOURCE={
  provider:'ICGC · Divisions administratives',
  url:'https://geoserveis.icgc.cat/vector01/rest/services/divisions_administratives_wfs/MapServer',
  license:'CC BY 4.0',
  attribution:'© Institut Cartogràfic i Geològic de Catalunya',
  coverage:'Catalunya'
};

const bounds=[.064865,40.514980,3.335501,42.884386];
const firstLayer={province:14,county:8,municipality:2};
const layerScales=[5000,50000,100000,250000,500000,1000000];
const maxBytes=4*1024*1024,maxEdges=120000;
const resolution=1e7;
const pointKey=p=>p.map(v=>Math.round(v*resolution)).join(',');
const overlaps=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
const bboxValid=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[0]<b[2]&&b[1]<b[3];

export const isNationalBoundary=({admin_level,maritime}={})=>
  Number(admin_level)===2&&Number(maritime??0)===0;

function clipSegment(a,b,box){
  let from=0,to=1;
  for(let axis=0;axis<2;axis++){
    const d=b[axis]-a[axis];
    if(!d){
      if(a[axis]<box[axis]||a[axis]>box[axis+2])return null;
      continue;
    }
    const first=(box[axis]-a[axis])/d,last=(box[axis+2]-a[axis])/d;
    from=Math.max(from,Math.min(first,last));
    to=Math.min(to,Math.max(first,last));
    if(to<=from)return null;
  }
  return [from,to].map(t=>a.slice(0,2).map((v,i)=>v+(b[i]-v)*t));
}

function stitchEdges(edges){
  const nodes=new Map();
  for(const edge of edges)for(const key of edge.keys){
    if(!nodes.has(key))nodes.set(key,[]);
    nodes.get(key).push(edge);
  }
  const seen=new Set(),lines=[];
  function walk(edge,start){
    const line=[];
    while(!seen.has(edge)){
      seen.add(edge);
      const index=edge.keys.indexOf(start),end=edge.keys[1-index];
      if(!line.length)line.push(edge.points[index]);
      line.push(edge.points[1-index]);
      const next=nodes.get(end);
      if(next.length!==2)break;
      start=end;
      edge=next[0]===edge?next[1]:next[0];
    }
    lines.push(line);
  }
  // Finish at junctions; a separate pass recovers isolated closed loops.
  for(const [key,connections]of nodes)if(connections.length!==2)
    for(const edge of connections)if(!seen.has(edge))walk(edge,key);
  for(const edge of edges)if(!seen.has(edge))walk(edge,edge.keys[0]);
  return lines;
}

export function joinNationalBoundaryLines(tiles){
  const edges=new Map();
  for(const {tile:{x,y,z},lines}of tiles){
    const box=[x,y,x+1,y+1],n=2**z;
    for(const line of lines){
      // Vector tile segments are straight in Mercator coordinates.
      const projected=line.map(([lon,lat])=>lonLatTile(lon,lat,z).map(v=>Math.round(v*1e10)/1e10));
      for(let i=1;i<projected.length;i++){
        const segment=clipSegment(projected[i-1],projected[i],box);
        if(!segment)continue;
        const points=segment.map(([x,y])=>[x/n*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI]);
        const keys=points.map((point,index)=>{
          const atSeam=segment[index].some(value=>Math.abs(value-Math.round(value))<1e-9);
          // Adjacent tiles quantize their padded geometry separately.
          // A tenth of a metre is enough to absorb small seam roundoff.
          return atSeam?'seam:'+point.map(value=>Math.round(value*1e6)).join(','):pointKey(point);
        });
        if(keys[0]===keys[1])continue;
        const key=keys.slice().sort().join('|');
        if(!edges.has(key))edges.set(key,{points,keys});
      }
    }
  }
  // Do not guess a connection when the tile endpoints disagree.
  return stitchEdges(edges.values());
}

function internalBoundaryLines(features,bbox){
  const edges=new Map();
  let examined=0;
  for(const [index,feature]of features.entries()){
    const geometry=feature?.geometry;
    const polygons=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:null;
    if(!Array.isArray(polygons))throw Error('Geometria administrativa invàlida.');
    const owner=feature.id??feature.properties?.OBJECTID??index;
    for(const polygon of polygons)for(const ring of polygon)for(let i=1;i<ring.length;i++){
      if(++examined>maxEdges)throw Error('S’ha superat el límit de segments administratius.');
      const a=ring[i-1],b=ring[i];
      if(![a,b].every(p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite)))
        throw Error('Coordenades administratives invàlides.');
      const points=clipSegment(a,b,bbox);
      if(!points)continue;
      const keys=points.map(pointKey);
      if(keys[0]===keys[1])continue;
      const key=keys.slice().sort().join('|'),previous=edges.get(key);
      if(!previous)edges.set(key,{points,keys,owner,shared:false});
      else if(previous.owner!==owner)previous.shared=true;
    }
  }
  // Each interior boundary belongs to two different polygons. This leaves
  // out coastlines and the outer edge of ICGC's coverage.
  return stitchEdges([...edges.values()].filter(edge=>edge.shared));
}

async function boundedJSON(response){
  if(!response.ok)throw Error(`HTTP ${response.status}.`);
  if(Number(response.headers.get('content-length'))>maxBytes)throw Error('La resposta supera els 4 MiB.');
  if(!response.body){return response.json();}
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let bytes=0,body='';
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>maxBytes){
        await reader.cancel();
        throw Error('La resposta supera els 4 MiB.');
      }
      body+=decoder.decode(value,{stream:true});
    }
    return JSON.parse(body+decoder.decode());
  }finally{reader.releaseLock();}
}

export async function fetchOfficialBoundaries(bbox,{levels=Object.keys(firstLayer),scale=50000,signal,fetcher=fetch}={}){
  if(!bboxValid(bbox)||!Number.isFinite(scale)||scale<=0||!Array.isArray(levels)||levels.some(level=>!Object.hasOwn(firstLayer,level)))
    throw Error('Consulta de divisions administratives invàlida.');
  const requested=[...new Set(levels)],warnings=[],lines={province:[],county:[],municipality:[]},failed=[];
  const available=overlaps(bbox,bounds);
  const metadata={...ICGC_BOUNDARY_SOURCE,available,failed};
  signal?.throwIfAborted();
  if(!requested.length||!available)return {lines,warnings,metadata};
  const layerIndex=layerScales.findLastIndex(denominator=>denominator<=Math.max(5000,scale));
  metadata.sourceScale=layerScales[layerIndex];
  const timeout=AbortSignal.timeout(9000);
  const requestSignal=signal?AbortSignal.any([signal,timeout]):timeout;
  // ArcGIS returns whole polygons even for a tiny query. Keep generalization
  // below 0.03 printed mm where possible, with a floor of about 11 cm on land.
  const offset=Math.max(.000001,.03*scale/111_320_000);
  const params=new URLSearchParams({f:'geojson',where:'1=1',geometry:bbox.join(','),
    geometryType:'esriGeometryEnvelope',spatialRel:'esriSpatialRelIntersects',inSR:'4326',outSR:'4326',
    outFields:'OBJECTID',returnGeometry:'true',geometryPrecision:'7',maxAllowableOffset:offset.toFixed(8)});
  const responses=await Promise.allSettled(requested.map(async level=>{
    const response=await fetcher(`${ICGC_BOUNDARY_SOURCE.url}/${firstLayer[level]+layerIndex}/query?${params}`,{signal:requestSignal});
    const data=await boundedJSON(response);
    if(data.type!=='FeatureCollection'||!Array.isArray(data.features)||data.exceededTransferLimit||data.properties?.exceededTransferLimit)
      throw Error('Resposta administrativa invàlida o incompleta.');
    return internalBoundaryLines(data.features,bbox);
  }));
  signal?.throwIfAborted();
  for(const [i,response]of responses.entries()){
    const level=requested[i];
    if(response.status==='fulfilled')lines[level]=response.value;
    else failed.push(level);
  }
  if(failed.length)warnings.push('No s’han pogut carregar tots els límits administratius de l’ICGC. Es conserven les capes disponibles.');
  return {lines,warnings,metadata};
}
