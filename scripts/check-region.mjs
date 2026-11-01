// Optional integration check; pass an installed sharp module, latitude and longitude.
import {createRequire} from 'node:module';
import {loadRegion} from '../src/sources.js';
import {decodeTerrarium} from '../src/elevation.js';
import {buildModel} from '../src/geometry.js';
const sharp=createRequire(import.meta.url)(process.argv[2]),lat=Number(process.argv[3]),lon=Number(process.argv[4]),span=Number(process.argv[5]||1.8),dy=span/2/111.32,dx=dy/Math.cos(lat*Math.PI/180);
const decodeElevation=async(blob,t)=>{const{data,info}=await sharp(new Uint8Array(await blob.arrayBuffer())).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {...t,size:info.width,elev:decodeTerrarium(data)};};
const data=await loadRegion({sample:false,bbox:[lon-dx,lat-dy,lon+dx,lat+dy],decodeElevation},console.log);
console.log('Terrain',data.meta.terrain,'Buildings',data.meta.buildings,'Warnings',data.meta.sourceWarnings);
const model=buildModel(data,{resolution:12,trees:false},console.log);
console.log('Model',model.parts.map(p=>p.id),'buildings',model.buildingCount,'triangles',model.triangles);
