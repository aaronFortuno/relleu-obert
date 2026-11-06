import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import polygonClipping from 'polygon-clipping';

// Offline publisher tool. No decoder dependency or ICGC connection is added to the browser app.
const decoderPackage='https://registry.npmjs.org/flatgeobuf/-/flatgeobuf-4.6.1.tgz';
const decoderChecksum='oj1QaFZ91dxI+HdX/t4iu7sdMOz1y2wKDLdNvz+5n70WQ1qpMC19P4mjvS/j4tcllYlYioKCGPIKF3uR9RGuOg==';
const origin='https://datacloud.icgc.cat';
const source={name:'Institut Cartogràfic i Geològic de Catalunya · Cobertes del sòl',url:'https://www.icgc.cat/ca/Geoinformacio-i-mapes/Mapes/Mapa-de-cobertes-del-sol-de-Catalunya',license:'CC BY 4.0'};
const pilot={id:'avinyo-urban',label:'Avinyó',bbox:[1.95,41.846,1.996,41.88],center:[41.863,1.973],widthM:2000};
const labels=new Map([[341,'Casc urbà'],[342,'Eixample'],[343,'Zones urbanes laxes'],[344,'Edificacions aïllades en l’espai rural'],[345,'Àrees residencials aïllades'],[347,'Zones industrials, comercials o de serveis']]);
const out=new URL('../public/data/historical/',import.meta.url);
const args=process.argv.slice(2);
const years=[2009,2018,2024];
const extracting=args[0]==='--extract'&&args.length===7&&years.includes(Number(args[2]));
const probing=args[0]==='--probe'&&args.length===5;
const windowArgs=extracting?args.slice(3):probing?args.slice(1):null;
const window=windowArgs?.map(Number);
const [w,s,e,n]=window??pilot.bbox;
if(args.length&&(!window||!window.every(Number.isFinite)||!windowArgs.every(value=>value.trim())||
  w< -180||e>180||s< -90||n>90||e<=w||n<=s||e-w>.12||n-s>.12)){
  throw Error('Use --probe W S E N or --extract FILE YEAR W S E N (up to 0.12° per side)');
}
const rect={minX:w,minY:s,maxX:e,maxY:n},clipRing=[[w,s],[e,s],[e,n],[w,n],[w,s]];

const decoderResponse=await fetch(decoderPackage,{signal:AbortSignal.timeout(15000)});
if(!decoderResponse.ok)throw Error(`Cannot download preparation decoder: HTTP ${decoderResponse.status}`);
const bytes=Buffer.from(await decoderResponse.arrayBuffer());
if(createHash('sha512').update(bytes).digest('base64')!==decoderChecksum)throw Error('Preparation decoder integrity mismatch');
const decoder=spawnSync('tar',['-xOf','-','package/dist/flatgeobuf-geojson.min.js'],{input:bytes});
if(decoder.status!==0||!decoder.stdout?.length)throw Error('Cannot extract the FlatGeobuf decoder (tar required)');

let totalRead=0;
let rangeCount=0;
const rangeWithoutCors=new Set();
async function fetchRange(url,options){
  if(new URL(url).origin!==origin||!new Headers(options?.headers).has('range'))throw Error('Only indexed requests to ICGC are permitted');
  const headers=new Headers(options.headers);
  if(probing)headers.set('Origin','https://relleu.ortogra.fi');
  const response=await fetch(url,{...options,headers,signal:AbortSignal.timeout(18000)});
  rangeCount++;
  const allowed=response.headers.get('access-control-allow-origin');
  if(probing&&!['*','https://relleu.ortogra.fi'].includes(allowed))rangeWithoutCors.add(url);
  const length=Number(response.headers.get('content-length'));
  if(response.status!==206||!length||length>16e6||(totalRead+=length)>64e6){
    await response.body?.cancel();
    throw Error(`ICGC did not return a bounded range: HTTP ${response.status}`);
  }
  return response;
}
const exports={};
runInNewContext(decoder.stdout.toString(),{exports,module:{exports},fetch:fetchRange,Headers,TextDecoder,TextEncoder,Uint8Array,ArrayBuffer,DataView,ReadableStream,Request,Response},{filename:'flatgeobuf-geojson-4.6.1.js',timeout:1000});
const {deserialize}=exports;

const round=v=>Math.round(v*1e7)/1e7;
function normalizeRing(ring){
  const clean=[];
  for(const point of ring){
    const [x,y]=point.map(round),last=clean.at(-1);
    if(!last||last[0]!==x||last[1]!==y)clean.push([x,y]);
  }
  return clean.length>=4?clean:null;
}

if(!window)await mkdir(out,{recursive:true});
const editions=[];
for(const year of extracting?[Number(args[2])]:years){
  const features=[];
  totalRead=rangeCount=0;
  const started=performance.now();
  const url=`${origin}/datacloud/cobertes-sol/fgb_unzip/cobertes-sol-v1r0-${year}.fgb`;
  const verify=header=>{
    if(header.crs?.code!==4326||!header.indexNodeSize||!header.columns?.some(column=>column.name==='nivell_2'))throw Error(`Unexpected ICGC metadata for ${year}`);
  };
  for await(const feature of deserialize(url,{rect,headerMetaFn:verify})){
    const coverClass=feature.properties.nivell_2,description=labels.get(coverClass);
    if(!description)continue;
    const {geometry}=feature;
    if(!['Polygon','MultiPolygon'].includes(geometry.type))throw Error(`Unexpected land cover geometry in ${year}`);
    const coordinates=polygonClipping.intersection(geometry.coordinates,[clipRing]).flatMap(([outer,...holes])=>{
      const clean=normalizeRing(outer);
      return clean?[[clean,...holes.map(normalizeRing).filter(Boolean)]]:[];
    });
    if(!coordinates.length)continue;
    // Indexed download batches may arrive in a different order each run.
    const id=createHash('sha256').update(JSON.stringify([coverClass,coordinates])).digest('hex').slice(0,16);
    features.push({type:'Feature',id:`icgc-${year}-${id}`,properties:{sourceLayer:'landuse',class:coverClass===347?'industrial':'residential',coverClass,description},geometry:{type:'MultiPolygon',coordinates}});
  }
  features.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  if(new Set(features.map(feature=>feature.id)).size!==features.length)throw Error(`Duplicate clipped polygons in ${year}`);
  if(window){
    if(extracting)await writeFile(args[1],JSON.stringify({type:'FeatureCollection',bbox:window,edition:year,features})+'\n',{flag:'wx'});
    console.log(JSON.stringify({bbox:window,year,features:features.length,rangeCount,bytes:totalRead,
      milliseconds:Math.round(performance.now()-started),...(probing?{cors:!rangeWithoutCors.has(url)}:{})}));
    continue;
  }
  if(!features.length)throw Error(`No urban features in ${year}`);
  const file=`${pilot.id}-${year}.geojson`;
  await writeFile(new URL(file,out),JSON.stringify({type:'FeatureCollection',features})+'\n');
  editions.push({year,file});
  console.log(`${pilot.id} · ${year}: ${features.length} polígons font · ${totalRead} bytes llegits`);
}

if(!window){
  const index=new URL('index.json',out);
  const previous=await readFile(index,'utf8').then(JSON.parse,error=>{if(error.code==='ENOENT')return {areas:[]};throw error;});
  await writeFile(index,JSON.stringify({areas:[...previous.areas.filter(area=>area.id!==pilot.id),{...pilot,source,layer:'urban',editions}]},null,2)+'\n');
}
