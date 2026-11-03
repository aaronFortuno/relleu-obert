import {mkdir, readFile, writeFile} from 'node:fs/promises';
import proj4 from 'proj4';
import decode, {init} from '@jsquash/webp/decode.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {createElevationSampler, prepareElevationTiles} from '../src/elevation.js';
import {threeMF} from '../src/export.js';
import {reliefDiagonals, reliefParts} from '../src/pure-relief-mesh.js';
import {auditPart} from '../src/solid-audit.js';
import {loadTerrain} from '../src/terrain-provider.js';

const output='output/cavall-bernat';
const projection=proj4('WGS84','+proj=utm +zone=31 +ellps=GRS80 +units=m');
const center=[1.8227,41.6007], [east,north]=projection.forward(center);
const toLonLat=(x,y)=>projection.inverse([east+x,north+y]);
const wcs=new URL('https://geoserveis.icgc.cat/icc_mdt/wcs/service');
const gridBounds=[Math.floor((east-760)/5)*5,Math.floor((north-760)/5)*5,
  Math.ceil((east+760)/5)*5,Math.ceil((north+760)/5)*5];
wcs.search=new URLSearchParams({SERVICE:'WCS',VERSION:'1.0.0',REQUEST:'GetCoverage',
  COVERAGE:'met',CRS:'EPSG:25831',BBOX:gridBounds.join(','),RESX:'5',RESY:'5',FORMAT:'ArcGrid'});
await mkdir(output,{recursive:true});
const response=await fetch(wcs,{signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error('ICGC HTTP '+response.status);
const arcGrid=await response.text(),tokens=arcGrid.trim().split(/\s+/);
const header=Object.fromEntries(Array.from({length:6},(_,i)=>[tokens[2*i].toLowerCase(),Number(tokens[2*i+1])]));
const {ncols,nrows,xllcorner,yllcorner,cellsize,nodata_value}=header;
const raster=Float32Array.from(tokens.slice(12),Number);
if(![ncols,nrows,xllcorner,yllcorner,cellsize,nodata_value].every(Number.isFinite)||
   cellsize!==5||raster.length!==ncols*nrows)throw Error('ArcGrid ICGC invàlid.');
const icgc=(x,y)=>{
  const u=(east+x-xllcorner)/cellsize-.5,v=nrows-.5-(north+y-yllcorner)/cellsize;
  const i=Math.floor(u),j=Math.floor(v),s=u-i,t=v-j,k=j*ncols+i;
  const values=[raster[k],raster[k+1],raster[k+ncols],raster[k+ncols+1]];
  if(i<0||i>=ncols-1||j<0||j>=nrows-1||values.some(z=>!Number.isFinite(z)||z===nodata_value))
    throw Error('Mostra fora de cobertura ICGC.');
  return (values[0]*(1-s)+values[1]*s)*(1-t)+(values[2]*(1-s)+values[3]*s)*t;
};
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
const corners=[[-755,-755],[-755,755],[755,-755],[755,755]].map(p=>toLonLat(...p));
const axis=i=>corners.map(p=>p[i]);
const bbox=[Math.min(...axis(0)),Math.min(...axis(1)),Math.max(...axis(0)),Math.max(...axis(1))];
const terrain=await loadTerrain(bbox,async(blob,tile)=>decodeDEMTile(await blob.arrayBuffer(),tile,decode));
const sample=createElevationSampler(prepareElevationTiles(terrain.tiles).tiles);
const sources=[
  {id:'actual', name:terrain.metadata.provider, color:'#A45A39', at:(x,y)=>sample(...toLonLat(x,y))},
  {id:'icgc', name:'ICGC MET5', color:'#386C72', at:icgc}
];
const width=150, resolution=150, exaggeration=1.5;
const sections=[['O → E',0],['S → N',90],['SO → NE',45],['NO → SE',-45]];
const stats={center,wcs:String(wcs),terrain:terrain.metadata,
  tileHashes:terrain.tiles.map(({z,x,y,size,decoding})=>({z,x,y,size,sha256:decoding.sha256})),
  width,resolution,exaggeration,models:[],profiles:[]};
const svg=[];
const label=(x,y,value,extra='')=>'<text x="'+x+'" y="'+y+'" '+extra+'>'+value+'</text>';
for(const [row,denominator] of [2000,10000].entries()){
  const metres=width*denominator/1000,step=metres/resolution,scale=1000/denominator;
  for(const {id,name,at} of sources){
    const gridAt=(col,r)=>at(col*step-metres/2,r*step-metres/2);
    const heights=new Float64Array((resolution+1)**2);
    let minimum=Infinity,maximum=-Infinity,peakNearCentre=-Infinity;
    for(let j=0;j<=resolution;j++)for(let i=0;i<=resolution;i++){
      const z=gridAt(i,j);
      heights[j*(resolution+1)+i]=z;
      minimum=Math.min(minimum,z); maximum=Math.max(maximum,z);
      if(Math.hypot(i*step-metres/2,j*step-metres/2)<=20)peakNearCentre=Math.max(peakNearCentre,z);
    }
    const diagonals=reliefDiagonals(heights,resolution,(i,j)=>gridAt(i+.5,j+.5));
    for(let k=0;k<heights.length;k++)heights[k]=5+(heights[k]-minimum)*scale*exaggeration;
    const parts=reliefParts({width,height:width,resolution,heights,diagonals});
    const audit=auditPart(parts[0]);
    if(audit.errors.length)throw Error(audit.errors.join('; '));
    const file=id+'-'+denominator+'.3mf';
    await writeFile(output+'/'+file,threeMF({parts,provenance:{name:'Cavall Bernat · '+name,
      center,denominator,exaggeration,step,terrain:name,originMeters:minimum}},{bambu:true}));
    stats.models.push({file,source:name,denominator,step,minimum,maximum,peakNearCentre,centerElevation:at(0,0),
      triangles:audit.triangles,closed:audit.closed,dimensions:audit.dimensions});
  }
  svg.push(label(24,102+row*253,'1:'+denominator.toLocaleString('ca')+' · '+metres+' m de costat','font-weight="bold"'));
  for(const [column,[name,angle]] of sections.entries()){
    const a=angle*Math.PI/180, half=metres/2/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)));
    const x=24+column*290,y=142+row*253,w=257,h=145;
    const stations=Array.from({length:301},(_,i)=>-half+i*2*half/300);
    const curves=sources.map(source=>stations.map(d=>source.at(d*Math.cos(a),d*Math.sin(a))));
    const all=curves.flat(),lo=Math.floor(Math.min(...all)/50)*50,hi=Math.ceil(Math.max(...all)/50)*50;
    const points=values=>values.map((z,i)=>(x+i*w/300).toFixed(2)+','+(y+h-(z-lo)*h/(hi-lo)).toFixed(2)).join(' ');
    svg.push(label(x,y-8,name),
      '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="white" stroke="#ded9d1"/>',
      '<path d="M '+(x+w/2)+' '+y+' v '+h+'" stroke="#bcb7af" stroke-dasharray="4 4"/>',
      ...curves.map((v,i)=>'<polyline points="'+points(v)+'" fill="none" stroke="'+sources[i].color+'" stroke-width="2"/>'),
      label(x,y+h+21,lo+'–'+hi+' m d’altitud · '+Math.round(2*half)+' m de secció','font-size="13"'));
    stats.profiles.push({denominator,section:name,maximumDifference:Math.max(...curves[0].map((z,i)=>Math.abs(z-curves[1][i])))});
  }
}
await writeFile(output+'/perfils.svg','<svg xmlns="http://www.w3.org/2000/svg" width="1190" height="582" viewBox="0 0 1190 582" font-family="system-ui" font-size="16" fill="#292622"><rect width="1190" height="582" fill="#f8f6f2"/>'+
  label(24,39,'Cavall Bernat · seccions pel centre del retall','font-size="24" font-weight="bold"')+
  label(24,67,sources[0].name,'fill="'+sources[0].color+'"')+label(275,67,sources[1].name,'fill="'+sources[1].color+'"')+
  svg.join('')+'</svg>');
await writeFile(output+'/mesures.json',JSON.stringify(stats,null,2)+'\n');
console.log(JSON.stringify(stats,null,2));
