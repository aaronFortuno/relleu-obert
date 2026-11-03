import {lonLatTile} from './elevation.js';
import {polygonOps} from './polygon-ops.js';
import {regionTileCount} from './region-limits.js';
function tilesAt(bbox,z){const a=lonLatTile(bbox[0],bbox[3],z),b=lonLatTile(bbox[2],bbox[1],z),out=[];for(let x=Math.floor(a[0]);x<=Math.floor(b[0]);x++)for(let y=Math.floor(a[1]);y<=Math.floor(b[1]);y++)out.push({z,x,y});return out;}
export function oceanTilePredicate(features,bbox){
  const pc=polygonOps(1e-10),polygons=[];
  for(const f of features)if(f.properties.sourceLayer==='water'&&f.properties.class==='ocean')polygons.push(...(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[]));
  if(!polygons.length)return ()=>false;
  const ocean=pc.union(polygons),rectangle=(w,s,e,n)=>[[[[w,s],[e,s],[e,n],[w,n],[w,s]]]];
  return t=>{
    const n=2**t.z,lat=y=>Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI,w=Math.max(bbox[0],t.x/n*360-180),e=Math.min(bbox[2],(t.x+1)/n*360-180),s=Math.max(bbox[1],lat(t.y+1)),north=Math.min(bbox[3],lat(t.y));
    return w<e&&s<north&&pc.difference(rectangle(w,s,e,north),ocean).length===0;
  };
}
const providers=[
  {provider:'Mapterhorn',url:t=>`https://tiles.mapterhorn.com/${t.z}/${t.x}/${t.y}.webp`},
  {provider:'Mapzen Terrain Tiles · AWS',url:t=>`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${t.z}/${t.x}/${t.y}.png`}
];

export async function loadBridgeTerrain(vectorTiles,terrain,decode,fetcher=fetch){
  if(!vectorTiles.length)return {tiles:[],failed:0};
  const z=terrain.metadata.zoom,provider=providers.find(p=>p.provider===terrain.metadata.provider);
  const loaded=new Set(terrain.tiles.map(t=>`${t.x}/${t.y}`)),tiles=[];
  let failed=0;
  for(const v of vectorTiles){
    const factor=2**(v.z-z),t={z,x:Math.floor(v.x/factor),y:Math.floor(v.y/factor)},key=`${t.x}/${t.y}`;
    if(loaded.has(key))continue;
    loaded.add(key);
    try{
      const r=await fetcher(provider.url(t),{signal:AbortSignal.timeout(8000)});
      if(!r.ok)throw Error(`HTTP ${r.status}`);
      const decoded=await decode(await r.blob(),t);
      if(!decoded.elev.some(Number.isFinite))throw Error('DEM buit.');
      tiles.push(decoded);
    }catch{failed++;}
  }
  return {tiles,failed};
}

function resizeElevation(tile,maximumSide){
  if(tile.size<=maximumSide)return tile;
  const {size,elev}=tile,values=new Float32Array(maximumSide**2),ratio=size/maximumSide;
  const indexes=Array.from({length:maximumSide},(_,i)=>(i+.5)*ratio-.5);
  const valid=h=>Number.isFinite(h)&&h>=-12000&&h<=9000;
  for(let y=0;y<maximumSide;y++)for(let x=0;x<maximumSide;x++){
    const sx=indexes[x],sy=indexes[y],ix=Math.floor(sx),iy=Math.floor(sy),a=sx-ix,b=sy-iy;
    const row=iy*size+ix;
    const nw=elev[row],ne=elev[row+1],sw=elev[row+size],se=elev[row+size+1];
    const index=y*maximumSide+x;
    if(valid(nw)&&valid(ne)&&valid(sw)&&valid(se)){
      values[index]=(nw*(1-a)+ne*a)*(1-b)+(sw*(1-a)+se*a)*b;
      continue;
    }
    let total=0,weighted=0;
    for(const [h,w] of [[nw,(1-a)*(1-b)],[ne,a*(1-b)],[sw,(1-a)*b],[se,a*b]]){
      if(valid(h)){total+=w;weighted+=h*w;}
    }
    values[index]=total?weighted/total:NaN;
  }
  return {...tile,size:maximumSide,elev:values};
}

export async function loadTerrain(bbox,decode,fetcher=fetch,progress=()=>{},isOcean=()=>false,{zooms=[14,12],maxTiles=Infinity,maxSamples=Infinity}={}){
  const attempts=zooms.filter(z=>maxTiles===Infinity||regionTileCount(bbox,z)<=maxTiles).map(z=>({z,coordinates:tilesAt(bbox,z)}))
    .flatMap(({z,coordinates})=>providers.map(p=>({...p,z,coordinates})));
  const failures=[];
  for(const attempt of attempts){
    try{
      const maximumSide=Math.floor(Math.sqrt(maxSamples/attempt.coordinates.length));
      const tiles=[];let oceanTiles=0;for(const t of attempt.coordinates){
        progress(`Carregant relleu ${tiles.length+1}/${attempt.coordinates.length} · ${attempt.provider}…`);
        const r=await fetcher(attempt.url(t),{signal:AbortSignal.timeout(15000)});if(!r.ok){if(r.status===404&&isOcean(t)){tiles.push({...t,size:512,elev:new Float32Array(512*512)});oceanTiles++;continue;}throw Error(`HTTP ${r.status}`);}
        const decoded=await decode(await r.blob(),t);
        if(!decoded.elev.some(Number.isFinite)){if(isOcean(t)){tiles.push({...t,size:512,elev:new Float32Array(512*512)});oceanTiles++;continue;}throw Error('La font no conté altituds vàlides.');}
        tiles.push(resizeElevation(decoded,maximumSide));
      }
      return {tiles,metadata:{provider:attempt.provider,zoom:attempt.z,fallback:failures.length>0,oceanTiles,...(maxSamples<Infinity?{sampleSize:tiles[0]?.size}:{})},warnings:[...(failures.length?[`S’ha utilitzat ${attempt.provider}${attempt.z<14?' amb menys detall':''} perquè la font inicial de relleu no estava disponible per a aquesta àrea.`]:[]),...(oceanTiles?['Les zones íntegrament marines sense dades d’altitud es representen al nivell del mar; no s’hi representa la batimetria.']:[])]};
    }catch(e){failures.push(`${attempt.provider}: ${e.message}`);}
  }
  throw Error('No s’ha pogut obtenir relleu d’aquesta regió amb cap de les dues fonts. Prova una àrea més petita o torna-ho a intentar més tard.');
}
