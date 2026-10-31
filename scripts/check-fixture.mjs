import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {readVector} from '../src/sources.js';
import {buildModel} from '../src/geometry.js';
import {threeMF,stlZip} from '../src/export.js';
// Optional local QA using a caller-provided installation of sharp for WebP decoding.
if(!process.argv[2])throw Error('Pass the absolute path to an installed sharp module.');
const sharp=createRequire(import.meta.url)(process.argv[2]);
const meta=JSON.parse(await readFile('public/data/tamariu.json','utf8')),features=[],dem=[];
for(const t of meta.tiles){features.push(...readVector(await readFile('public/data/'+t.vector),t));const {data,info}=await sharp(await readFile('public/data/'+t.dem)).raw().toBuffer({resolveWithObject:true}),elev=new Float32Array(info.width*info.height);for(let i=0;i<elev.length;i++)elev[i]=data[i*info.channels]*256+data[i*info.channels+1]+data[i*info.channels+2]/256-32768;dem.push({...t,size:info.width,elev});}
console.time('fixture');const model=buildModel({meta,features,dem},{size:160,resolution:24},message=>console.log(new Date().toISOString(),message));console.timeEnd('fixture');
for(const p of model.parts){if(!Array.from(p.vertices).every(Number.isFinite))throw Error('Non-finite coordinates');console.log(p.id,p.faces.length/3,'triangles');}
await mkdir('output',{recursive:true});await writeFile('output/tamariu.3mf',threeMF(model));await writeFile('output/tamariu-stl.zip',stlZip(model));await writeFile('output/provenance.json',JSON.stringify(model.provenance,null,2));console.log('Trees',model.treeCount,'Buildings',model.buildingCount);
