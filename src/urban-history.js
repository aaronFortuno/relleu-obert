import proj4 from 'proj4';
import {polygonOps} from './polygon-ops.js';
import {parseHistoricalEdition} from './historical-layers.js';

const operations=polygonOps(1e-9);
const equalArea=proj4('EPSG:4326','+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs');
const editionRoot='icgc-urban-v1/';
const rectangle=(w,s,e,n)=>[[[w,s],[e,s],[e,n],[w,n],[w,s]]];

function signedArea(ring,project){
  const points=project?ring.map(point=>project.forward(point)):ring;
  const [x0,y0]=points[0];
  let area=0;
  for(let i=1;i<points.length;i++){
    const [ax,ay]=points[i-1], [bx,by]=points[i];
    area+=(ax-x0)*(by-y0)-(bx-x0)*(ay-y0);
  }
  return Math.abs(area)/2;
}

function surface(polygons,project){
  return polygons.reduce((sum,[exterior,...holes])=>
    sum+signedArea(exterior,project)-holes.reduce((area,hole)=>area+signedArea(hole,project),0),0);
}

export function urbanSelection(mask,pose){
  if(!pose||!mask)return null;
  const [w,s,e,n]=pose.bbox;
  const [minX,minY,maxX,maxY]=mask.bbox;
  if(w>=maxX||e<=minX||s>=maxY||n<=minY)return null;
  const ring=[...pose.corners,pose.corners[0]];
  const crop=[ring],total=surface([crop]);
  const step=mask.tilesPerDegree;
  const keys=[];
  let area=0;
  for(let x=Math.floor(w*step);x<Math.ceil(e*step);x++){
    for(let y=Math.floor(s*step);y<Math.ceil(n*step);y++){
      const key=`${x}-${y}`;
      const coverage=mask.full.has(key)?rectangle(x/step,y/step,(x+1)/step,(y+1)/step):mask.partial[key];
      if(!coverage)continue;
      const covered=surface(operations.intersection(coverage,crop));
      if(covered<=1e-14)continue;
      keys.push(key);
      area+=covered;
    }
  }
  return keys.length?{crop,keys,partial:area<total*(1-1e-6)}:null;
}

export function createUrbanHistory(read,{
  root=editionRoot,maskFile='urban-coverage.json.gz',id='icgc-urban',label='Catalunya',exampleLabel='Girona',
  center=[41.987,2.8195],widthM=4200
}={}){
  const tiles=new Map();
  async function load(){
    const [index,mask]=await Promise.all([read(`${root}index.json`),read(maskFile)]);
    if(index.version!==1||index.tilesPerDegree!==mask.tilesPerDegree||!Array.isArray(mask.full)||!mask.partial||
      !Array.isArray(index.editions)||index.editions.length<2||index.editions.some(({year,tiles},i)=>
        !Number.isInteger(year)||year<1000||year>2100||!tiles||i>0&&year<=index.editions[i-1].year)||
      !index.attribution||!index.license||!URL.canParse(index.source)||new URL(index.source).protocol!=='https:'){
      throw Error('Invalid urban history index');
    }
    const area={id,label,exampleLabel,layer:'urban',bbox:mask.bbox,center,widthM,
      source:{name:index.attribution,url:index.source,license:index.license},editions:index.editions};
    return {area,mask:{...mask,full:new Set(mask.full)}};
  }

  function readTile(area,year,key){
    const file=`${root}${year}/${key}.json.gz`;
    const cached=tiles.get(file);
    if(cached){tiles.delete(file);tiles.set(file,cached);return cached;}
    const pending=read(file).then(data=>parseHistoricalEdition(data,area,year));
    tiles.set(file,pending);
    if(tiles.size>24)tiles.delete(tiles.keys().next().value);
    pending.catch(()=>{if(tiles.get(file)===pending)tiles.delete(file);});
    return pending;
  }

  async function edition(area,year,selection){
    const entry=area.editions.find(item=>item.year===year);
    if(!entry||!selection)throw Error('This edition does not cover the selection');
    const {crop,keys,partial}=selection;
    const batches=await Promise.all(keys.filter(key=>Object.hasOwn(entry.tiles,key)).map(key=>readTile(area,year,key)));
    const features=[];
    let squareMetres=0;
    for(const batch of batches){
      const polygons=[];
      for(const feature of batch){
        const clipped=operations.intersection(feature.geometry.coordinates,crop);
        if(!clipped.length)continue;
        polygons.push(clipped);
        features.push({...feature,id:`${area.id}-${year}-${features.length}`,geometry:{type:'MultiPolygon',coordinates:clipped}});
      }
      if(polygons.length)squareMetres+=surface(operations.union(...polygons),equalArea);
    }
    return {features,urbanHa:squareMetres/10000,partial};
  }

  return {load,edition};
}
