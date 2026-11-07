import {mkdir,writeFile} from 'node:fs/promises';
import {fromUrl} from 'geotiff';
import {coordinateTransform,localRasterSampler} from '../src/local-raster.js';
import {loadMet5} from '../src/met5.js';
import {reliefDiagonals,reliefParts} from '../src/pure-relief-mesh.js';
import {auditPart} from '../src/solid-audit.js';
import {threeMF} from '../src/export.js';

const source='https://datacloud.icgc.cat/datacloud/model-elevacions-terreny/tif_unzip/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023.tif';
const directory='output/cavall-bernat-detall';
const center=[1.8227,41.6007],projection=coordinateTransform(25831);
const [east,north]=projection.inverse(center);
const toLonLat=(x,y)=>projection.forward([east+x,north+y]);
const radius=115,innerRadius=80;
const width=150,extent=300,denominator=2000,exaggeration=1,resolution=240;
const baseMM=5,step=extent/resolution,stride=resolution+1;

const lowCorners=[[-215,-215],[-215,215],[215,-215],[215,215]].map(([x,y])=>toLonLat(x,y));
const xs=lowCorners.map(p=>p[0]),ys=lowCorners.map(p=>p[1]);
const met5=await loadMet5([Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]);
const reference=localRasterSampler(met5.raster);
const low=(x,y)=>reference(...toLonLat(x,y));

const tiff=await fromUrl(source,{allowFullFile:false,maxRanges:0,blockSize:32768,cacheSize:64},AbortSignal.timeout(25000));
const image=await tiff.getImage(),[originX,originY]=image.getOrigin(),[dx,dy]=image.getResolution();
if(dx!==.5||dy!==-.5||image.getGeoKeys().ProjectedCSTypeGeoKey!==25831||image.getSamplesPerPixel()!==1)
  throw Error('El COG no correspon al MDT de 50 cm en EPSG:25831.');
const col0=Math.floor((east-radius-originX)/dx)-2,row0=Math.floor((north+radius-originY)/dy)-2;
const col1=Math.ceil((east+radius-originX)/dx)+2,row1=Math.ceil((north-radius-originY)/dy)+2;
const values=await image.readRasters({window:[col0,row0,col1,row1],samples:[0],interleave:true,signal:AbortSignal.timeout(30000)});
const noData=image.getGDALNoData();
for(let i=0;i<values.length;i++)if(values[i]===noData)values[i]=NaN;
const detailed=localRasterSampler({values,width:col1-col0,height:row1-row0,epsg:25831,pixelIsArea:image.pixelIsArea(),
  affine:[dx,0,originX+dx*col0,0,dy,originY+dy*row0]});
const high=(x,y)=>detailed(...toLonLat(x,y));

// Align the local patch to the common terrain on the overlap, away from the needle.
const offsets=Array.from({length:49},(_,i)=>{
  const a=i*2*Math.PI/49,r=(innerRadius+radius)/2,x=r*Math.cos(a),y=r*Math.sin(a);
  return low(x,y)-high(x,y);
}).sort((a,b)=>a-b);
const alignmentM=offsets[24];
const hybrid=(x,y)=>{
  const r=Math.hypot(x,y);
  if(r>=radius)return low(x,y);
  const value=high(x,y)+alignmentM;
  if(r<=innerRadius)return value;
  const t=(r-innerRadius)/(radius-innerRadius),weight=t*t*(3-2*t);
  return value+(low(x,y)-value)*weight;
};

await mkdir(directory,{recursive:true});
const results=[];
for(const rotation of [0,35]){
  const a=rotation*Math.PI/180,cos=Math.cos(a),sin=Math.sin(a);
  const coord=(col,row)=>{
    const x=col*step-extent/2,y=row*step-extent/2;
    return [cos*x+sin*y,-sin*x+cos*y];
  };
  const terrain=(sample)=>Float64Array.from({length:stride**2},(_,i)=>sample(...coord(i%stride,Math.floor(i/stride))));
  const referenceHeights=terrain(low),patchedHeights=terrain(hybrid);
  const minimum=referenceHeights.reduce((a,b)=>Math.min(a,b),Infinity);
  let rimDifferenceM=0;
  for(let i=0;i<stride;i++)for(const index of [i,resolution*stride+i,i*stride,i*stride+resolution]){
    rimDifferenceM=Math.max(rimDifferenceM,Math.abs(referenceHeights[index]-patchedHeights[index]));
  }
  if(rimDifferenceM>1e-7)throw Error('El pedaç modifica la vora del retall.');
  for(const [id,heights,at] of [['met5',referenceHeights,low],['met50cm-pedac',patchedHeights,hybrid]]){
    if(rotation&&id==='met5')continue;
    let centralPeakM=-Infinity,peakAt;
    for(let i=0;i<heights.length;i++){
      const [x,y]=coord(i%stride,Math.floor(i/stride));
      if(Math.hypot(x,y)<=20&&heights[i]>centralPeakM){
        centralPeakM=heights[i];
        peakAt=toLonLat(x,y);
      }
    }
    const diagonals=reliefDiagonals(heights,resolution,(col,row)=>at(...coord(col+.5,row+.5)));
    const z=Float64Array.from(heights,elevation=>baseMM+(elevation-minimum)*width/extent*exaggeration);
    if(z.some(value=>!Number.isFinite(value)||value<=0))throw Error('El pedaç travessa la base o conté buits.');
    const parts=reliefParts({width,height:width,resolution,heights:z,diagonals});
    const audit=auditPart(parts[0]);
    if(audit.errors.length)throw Error(audit.errors.join('; '));
    const filename=`cavall-bernat-${id}-gir${rotation}.3mf`;
    const provenance={name:'Cavall Bernat · '+id,center,denominator,rotation,exaggeration,step,verticalOriginMeters:minimum,
      baseThicknessMM:baseMM,source:'Institut Cartogràfic i Geològic de Catalunya',license:'CC-BY-4.0',
      terrainSources:id==='met5'?[met5.metadata.url]:[met5.metadata.url,source],...(id==='met5'?{}:{alignmentM,radius,innerRadius})};
    await writeFile(directory+'/'+filename,threeMF({parts,provenance},{bambu:true}));
    results.push({filename,rotation,centralPeakM,peakAt,triangles:audit.triangles,heightMM:audit.dimensions[2],
      rimDifferenceM,closed:audit.closed,verticalOriginMeters:minimum});
  }
}
const report={center,source,window:[col0,row0,col1,row1],denominator,extent,width,exaggeration,resolution,step,
  alignmentM,overlapOffsetRangeM:[offsets[0],offsets.at(-1)],innerRadius,radius,results};
await writeFile(directory+'/mesures.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
