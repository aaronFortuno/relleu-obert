import {readFile,writeFile} from 'node:fs/promises';
import {fetchOfficialBuildings} from '../src/buildings.js';
const path='public/data/tamariu.json',meta=JSON.parse(await readFile(path));
const data=await fetchOfficialBuildings(meta.bbox);
if(!data.features.length)throw Error('No official buildings returned; fixture was not changed.');
await writeFile('public/data/tamariu-buildings-icgc.geojson',JSON.stringify(data));
meta.officialBuildings='tamariu-buildings-icgc.geojson';
await writeFile(path,JSON.stringify(meta,null,2));
console.log('ICGC fixture saved:',data.features.length,'polygons; retrieved',data.metadata.retrievedAt);
