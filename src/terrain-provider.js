import {lonLatTile} from './elevation.js';
import {polygonOps} from './polygon-ops.js';
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

export async function loadTerrain(bbox,decode,fetcher=fetch,progress=()=>{},isOcean=()=>false){
  const attempts=[14,12].flatMap(z=>providers.map(p=>({...p,z})));
  const failures=[];
  for(const attempt of attempts){
    try{
      const tiles=[];let oceanTiles=0;for(const t of tilesAt(bbox,attempt.z)){
        progress(`Carregant relleu · ${attempt.provider}…`);
        const r=await fetcher(attempt.url(t),{signal:AbortSignal.timeout(15000)});if(!r.ok){if(r.status===404&&isOcean(t)){tiles.push({...t,size:512,elev:new Float32Array(512*512)});oceanTiles++;continue;}throw Error(`HTTP ${r.status}`);}
        const decoded=await decode(await r.blob(),t);
        if(!decoded.elev.some(Number.isFinite)){if(isOcean(t)){tiles.push({...t,size:512,elev:new Float32Array(512*512)});oceanTiles++;continue;}throw Error('La font no conté altituds vàlides.');}
        tiles.push(decoded);
      }
      return {tiles,metadata:{provider:attempt.provider,zoom:attempt.z,fallback:failures.length>0,oceanTiles},warnings:[...(failures.length?[`S’ha utilitzat ${attempt.provider}${attempt.z<14?' amb menys detall':''} perquè la font inicial de relleu no estava disponible per a aquesta àrea.`]:[]),...(oceanTiles?['Les zones íntegrament marines sense dades d’altitud es representen al nivell del mar; no s’hi representa la batimetria.']:[])]};
    }catch(e){failures.push(`${attempt.provider}: ${e.message}`);}
  }
  throw Error('No s’ha pogut obtenir relleu d’aquesta regió amb cap de les dues fonts. Prova una àrea més petita o torna-ho a intentar més tard.');
}
