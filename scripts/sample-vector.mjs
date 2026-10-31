// Optional fixture refresh; the deployed application never executes this script.
import {mkdir, writeFile} from 'node:fs/promises';
const bbox=[3.196,41.910,3.219,41.926], z=14,n=2**z;
const tile=(lon,lat)=>[(lon+180)/360*n,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n];
const a=tile(bbox[0],bbox[3]),b=tile(bbox[2],bbox[1]);
const tj=await(await fetch('https://tiles.openfreemap.org/planet')).json();
await mkdir('public/data',{recursive:true});const tiles=[];
for(let x=Math.floor(a[0]);x<=Math.floor(b[0]);x++)for(let y=Math.floor(a[1]);y<=Math.floor(b[1]);y++){
  const dem=`${z}-${x}-${y}.webp`,vector=`${z}-${x}-${y}.pbf`;
  for(const [url,file] of [[`https://tiles.mapterhorn.com/${z}/${x}/${y}.webp`,dem],[tj.tiles[0].replace('{z}',z).replace('{x}',x).replace('{y}',y),vector]]){
    const r=await fetch(url,{headers:{'User-Agent':'RelleuObertPrototype/0.1 (local educational terrain test)'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(url+' '+r.status);await writeFile('public/data/'+file,new Uint8Array(await r.arrayBuffer()));console.log(file);
  }tiles.push({z,x,y,dem,vector});
}
await writeFile('public/data/tamariu.json',JSON.stringify({name:'Tamariu · Palafrugell',bbox,date:new Date().toISOString(),vectorSource:tj.tiles[0],tiles,credits:'© OpenStreetMap contributors (ODbL), © OpenMapTiles, OpenFreeMap. Elevations: Mapterhorn; see SOURCES.md.'},null,2));
