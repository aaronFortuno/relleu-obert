import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {readVector} from '../src/sources.js';
import {buildModel} from '../src/geometry.js';
import {threeMF,stlZip} from '../src/export.js';
import {combineBuildings} from '../src/buildings.js';
// Optional local QA using a caller-provided installation of sharp for WebP decoding.
if(!process.argv[2])throw Error('Pass the absolute path to an installed sharp module.');
const sharp=createRequire(import.meta.url)(process.argv[2]);
const meta=JSON.parse(await readFile('public/data/tamariu.json','utf8')),features=[],dem=[];
for(const t of meta.tiles){features.push(...readVector(await readFile('public/data/'+t.vector),t));const {data,info}=await sharp(await readFile('public/data/'+t.dem)).raw().toBuffer({resolveWithObject:true}),elev=new Float32Array(info.width*info.height);for(let i=0;i<elev.length;i++)elev[i]=data[i*info.channels]*256+data[i*info.channels+1]+data[i*info.channels+2]/256-32768;dem.push({...t,size:info.width,elev});}
let allFeatures=features;
if(meta.officialBuildings){const combined=combineBuildings(features,JSON.parse(await readFile('public/data/'+meta.officialBuildings)));allFeatures=combined.features;meta.buildings=combined.metadata;console.log('Buildings',combined.metadata);}
console.time('fixture');const model=buildModel({meta,features:allFeatures,dem},{size:160,resolution:24},message=>console.log(new Date().toISOString(),message));console.timeEnd('fixture');
const buildings=model.categories.find(p=>p.id==='buildings');let roofTriangles=0;
if(buildings)for(let i=0;i<buildings.faces.length;i+=3){const [a,b,c]=Array.from(buildings.faces.slice(i,i+3),id=>buildings.vertices.slice(id*3,id*3+3));if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>1e-7){roofTriangles++;if(Math.max(a[2],b[2],c[2])-Math.min(a[2],b[2],c[2])>1e-5)throw Error('A building roof is not horizontal.');}}
console.log('Horizontal building roof triangles verified',roofTriangles);
for(const p of model.parts){if(!Array.from(p.vertices).every(Number.isFinite))throw Error('Non-finite coordinates');let max=-Infinity,min=Infinity;for(let i=2;i<p.vertices.length;i+=3){max=Math.max(max,p.vertices[i]);min=Math.min(min,p.vertices[i]);}console.log(p.id,p.faces.length/3,'triangles; z range',min,max,'mm');}
await mkdir('output',{recursive:true});await writeFile('output/tamariu.3mf',threeMF(model));await writeFile('output/tamariu-bambu.3mf',threeMF(model,{bambu:true}));await writeFile('output/tamariu-stl.zip',stlZip(model));await writeFile('output/provenance.json',JSON.stringify(model.provenance,null,2));console.log('Trees',model.treeCount,'Buildings',model.buildingCount);
