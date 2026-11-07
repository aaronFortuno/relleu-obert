import {validBridgeProfile} from './catalogue-bridges.js';
import {decodeLandform,validLandformProfile} from './catalogue-landforms.js';

const catalogueLimit=512*1024,meshLimit=4*1024*1024;
const catalogueWarning='No s’ha pogut carregar el catàleg de models singulars.';
const meshWarning='No s’ha pogut carregar algun model singular. Es conserva la geometria de la cartografia general.';
const decoder=new TextDecoder('utf-8',{fatal:true});
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const label=value=>typeof value==='string'&&value.trim().length>0&&value.length<=1000;
const single=value=>Array.isArray(value)&&value.length===1;
const optionalIds=value=>value===undefined||Array.isArray(value)&&value.length<=32&&value.every(label);
const validBounds=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&
  b[0]>=-180&&b[0]<b[2]&&b[2]<=180&&b[1]>=-90&&b[1]<b[3]&&b[3]<=90;
const intersects=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];

function check(condition){
  if(!condition)throw Error('Dades de model singular invàlides.');
}

function inside([w,s,e,n],point){
  return Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&
    point[0]>=w-1e-8&&point[0]<=e+1e-8&&point[1]>=s-1e-8&&point[1]<=n+1e-8;
}

function validFootprint(geometry,bbox){
  const polygons=geometry?.type==='Polygon'?[geometry.coordinates]:
    geometry?.type==='MultiPolygon'?geometry.coordinates:null;
  return Array.isArray(polygons)&&polygons.length>0&&polygons.every(polygon=>
    Array.isArray(polygon)&&polygon.length>0&&polygon.every(ring=>
      Array.isArray(ring)&&ring.length>=4&&ring.every(point=>inside(bbox,point))&&
      ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1]));
}

function assetURL(path,directory,extension){
  check(label(path)&&path===path.trim()&&!/^(?:[a-z][a-z+.-]*:|[\\/])/i.test(path));
  const url=new URL(path,directory);
  check(url.href.startsWith(directory.href)&&!url.search&&!url.hash&&url.pathname.endsWith(extension));
  return url.href;
}

function readCatalogue(data,directory){
  check(data?.type==='FeatureCollection'&&data.schemaVersion===1&&Array.isArray(data.features));
  const entries=[],ids=new Set();
  let incomplete=false;
  for(const feature of data.features){
    try{
      const {type,id,bbox,geometry:footprint,properties}=feature;
      const {name,revision,anchor,mesh,height,attribution,license,sources,spatialDataLicense,replacement,bridge,landform,terrainBaseElevation,kind='building'}=properties;
      if(!['building','bridge','landform'].includes(kind))continue;
      check(type==='Feature'&&label(id)&&!ids.has(id)&&validBounds(bbox)&&inside(bbox,anchor)&&validFootprint(footprint,bbox));
      check([name,revision,mesh,attribution,license].every(label)&&Number.isFinite(height)&&height>0&&height<=1200&&
        Array.isArray(sources)&&sources.every(label)&&(spatialDataLicense===undefined||label(spatialDataLicense)));
      check(replacement===undefined||replacement&&typeof replacement==='object'&&!Array.isArray(replacement)&&
        optionalIds(replacement.featureIds)&&optionalIds(replacement.families));
      if(kind==='bridge')check(validBridgeProfile(bridge)&&footprint.type==='Polygon');
      if(kind==='landform')check(validLandformProfile(landform));
      if(terrainBaseElevation!==undefined)check(kind==='building'&&Number.isFinite(terrainBaseElevation)&&terrainBaseElevation>=-500&&terrainBaseElevation<=9000);
      const glb=assetURL(mesh,directory,'.glb');
      const url=kind==='landform'?assetURL(landform.data,directory,'.json'):glb;
      ids.add(id);
      entries.push({id,name,revision,bbox,anchor,footprint,height,attribution,license,sources,spatialDataLicense,replacement,kind,bridge,landform,url,
        ...(terrainBaseElevation===undefined?{}:{terrainBaseElevation})});
    }catch{
      incomplete=true;
    }
  }
  return {entries,incomplete};
}

async function fetchBytes(fetcher,url,limit){
  const response=await fetcher(url,{signal:AbortSignal.timeout(5000),redirect:'error'});
  if(!response.ok||Number(response.headers.get('content-length'))>limit){
    await response.body?.cancel();
    throw Error('Resposta de model singular invàlida.');
  }
  const reader=response.body?.getReader();
  check(reader);
  const chunks=[];
  let length=0;
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      length+=value.byteLength;
      if(length>limit){
        await reader.cancel();
        throw Error('La resposta de model singular supera el límit.');
      }
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);
  let offset=0;
  for(const chunk of chunks){
    bytes.set(chunk,offset);
    offset+=chunk.byteLength;
  }
  return bytes;
}

function access(gltf,index,type,componentTypes,minCount,maxCount,elements,byteLength){
  const accessor=gltf.accessors?.[index],bufferView=gltf.bufferViews?.[accessor?.bufferView];
  check(Array.isArray(gltf.accessors)&&Array.isArray(gltf.bufferViews)&&integer(index,0,gltf.accessors.length-1)&&
    integer(accessor?.bufferView,0,gltf.bufferViews.length-1)&&accessor.type===type&&
    componentTypes.includes(accessor.componentType)&&integer(accessor.count,minCount,maxCount)&&
    !accessor.normalized&&!accessor.sparse&&bufferView?.buffer===0);
  const componentBytes=accessor.componentType===5123?2:4,elementBytes=componentBytes*elements;
  const start=bufferView.byteOffset??0,offset=accessor.byteOffset??0;
  check(integer(start,0,byteLength)&&integer(bufferView.byteLength,1,byteLength-start)&&
    integer(offset,0,bufferView.byteLength)&&(bufferView.byteStride===undefined||bufferView.byteStride===elementBytes)&&
    (start+offset)%componentBytes===0&&offset+accessor.count*elementBytes<=bufferView.byteLength);
  return {count:accessor.count,componentBytes,offset:start+offset};
}

function decodeGLB(bytes){
  check(bytes.byteLength>=28);
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const u32=offset=>view.getUint32(offset,true);
  check(u32(0)===0x46546c67&&u32(4)===2&&u32(8)===bytes.byteLength&&u32(16)===0x4e4f534a);
  const jsonLength=u32(12),binHeader=20+jsonLength,binStart=binHeader+8;
  check(jsonLength>0&&jsonLength%4===0&&binStart<=bytes.byteLength&&u32(binHeader+4)===0x004e4942);
  const binLength=u32(binHeader);
  check(binLength%4===0&&binStart+binLength===bytes.byteLength);
  const gltf=JSON.parse(decoder.decode(bytes.subarray(20,binHeader)));
  const node=gltf?.nodes?.[0],scene=gltf?.scenes?.[0],mesh=gltf?.meshes?.[0],buffer=gltf?.buffers?.[0];
  // The print profile is a single mesh with coordinates already baked into its local axes.
  check(gltf?.asset?.version==='2.0'&&!(gltf.extensionsUsed?.length||gltf.extensionsRequired?.length)&&
    single(gltf.scenes)&&(gltf.scene??0)===0&&single(scene?.nodes)&&scene.nodes[0]===0&&
    single(gltf.nodes)&&node?.mesh===0&&!['matrix','translation','rotation','scale','children','skin','weights'].some(key=>Object.hasOwn(node,key))&&
    single(gltf.meshes)&&single(mesh?.primitives)&&single(gltf.buffers)&&buffer&&
    !Object.hasOwn(buffer,'uri')&&integer(buffer.byteLength,Math.max(1,binLength-3),binLength));
  const primitive=mesh.primitives[0];
  check((primitive.mode??4)===4&&!primitive.targets&&!primitive.extensions);
  const position=access(gltf,primitive.attributes?.POSITION,'VEC3',[5126],3,100000,3,buffer.byteLength);
  const index=access(gltf,primitive.indices,'SCALAR',[5123,5125],3,600000,1,buffer.byteLength);
  check(index.count%3===0);
  const vertices=new Float32Array(position.count*3),faces=new Uint32Array(index.count);
  for(let i=0;i<vertices.length;i++){
    const value=view.getFloat32(binStart+position.offset+i*4,true);
    check(Number.isFinite(value)&&Math.abs(value)<=10000);
    vertices[i]=value;
  }
  for(let i=0;i<faces.length;i++){
    const offset=binStart+index.offset+i*index.componentBytes;
    const value=index.componentBytes===2?view.getUint16(offset,true):u32(offset);
    check(value<position.count);
    faces[i]=value;
  }
  return {vertices,faces};
}

export function createLandmarkLoader(catalogueURL,fetcher=fetch){
  const catalogue=new URL(catalogueURL,globalThis.location?.href),directory=new URL('.',catalogue);
  const assets=new Map();
  let catalogueRequest;
  function assetRequest(url,kind){
    if(assets.has(url))return assets.get(url);
    const terrain=kind==='landform';
    const request=fetchBytes(fetcher,url,terrain?256*1024:meshLimit).then(bytes=>terrain?
      decodeLandform(JSON.parse(decoder.decode(bytes))):decodeGLB(bytes)).catch(error=>{
      if(assets.get(url)===request)assets.delete(url);
      throw error;
    });
    assets.set(url,request);
    if(assets.size>16)assets.delete(assets.keys().next().value);
    return request;
  }
  return async function load(bbox,kinds){
    const models=[],warnings=[];
    if(!validBounds(bbox))return {models,warnings};
    catalogueRequest??=fetchBytes(fetcher,catalogue.href,catalogueLimit)
      .then(bytes=>readCatalogue(JSON.parse(decoder.decode(bytes)),directory))
      .catch(error=>{catalogueRequest=undefined;throw error;});
    let catalogueData;
    try{catalogueData=await catalogueRequest;}
    catch{return {models,warnings:[catalogueWarning]};}
    const candidates=catalogueData.entries.filter(entry=>(!kinds||kinds.includes(entry.kind))&&intersects(entry.bbox,bbox));
    const results=await Promise.allSettled(candidates.slice(0,8).map(async ({url,...entry})=>({...entry,...await assetRequest(url,entry.kind)})));
    for(const result of results)if(result.status==='fulfilled')models.push(result.value);
    if(catalogueData.incomplete||models.length<candidates.length)warnings.push(meshWarning);
    return {models,warnings};
  };
}
