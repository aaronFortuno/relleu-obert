// Explicit development refresh; never executed by the published application.
import {writeFile} from 'node:fs/promises';
import {tileList} from '../src/sources.js';
import {fetchOfficialBuildings} from '../src/buildings.js';
import {recommendedPlace} from '../src/recommended-places.js';
const place=recommendedPlace('eix-diagonal');
const r=await fetch('https://tiles.openfreemap.org/planet',{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('OpenFreeMap '+r.status);
const template=(await r.json()).tiles[0],tiles=[];
for(const tile of tileList(place.bbox)){
  const dem=`${tile.z}-${tile.x}-${tile.y}.webp`,vector=`${tile.z}-${tile.x}-${tile.y}.pbf`;
  for(const [url,file]of [[`https://tiles.mapterhorn.com/${tile.z}/${tile.x}/${tile.y}.webp`,dem],[template.replace('{z}',tile.z).replace('{x}',tile.x).replace('{y}',tile.y),vector]]){
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(file+': '+response.status);
    await writeFile(new URL('../public/data/'+file,import.meta.url),new Uint8Array(await response.arrayBuffer()));
  }
  tiles.push({...tile,dem,vector});
}
const official=await fetchOfficialBuildings(place.bbox);
await writeFile('public/data/eix-diagonal-buildings-icgc.geojson',JSON.stringify(official));
await writeFile('public/data/eix-diagonal.json',JSON.stringify({name:place.name,labelTitle:place.labelTitle,bbox:place.bbox,date:new Date().toISOString(),vectorSource:template,tiles,officialBuildings:'eix-diagonal-buildings-icgc.geojson',credits:'© OpenStreetMap contributors (ODbL), OpenMapTiles, OpenFreeMap. Elevations: Mapterhorn. Edificis: ICGC CC BY 4.0.',sourceWarnings:['Els ponts i túnels encara no es reconstrueixen en 3D. Aquesta mostra serveix per preparar-ne el desenvolupament.']},null,2));
console.log({place:place.name,tiles:tiles.length,buildings:official.features.length});
