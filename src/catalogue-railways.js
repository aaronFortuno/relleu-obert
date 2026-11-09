import {isRailway} from './railways.js';

const validStructures=new Set(['surface','bridge','tunnel']);
const finiteIn=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;

export function decodeRailway(route){
  const {version,replace,paths}=route??{};
  const reject=()=>{throw Error('Dades de ferrocarril singular invàlides.');};
  if(version!==1||!Array.isArray(replace)||replace.length>128||
      !replace.every(id=>typeof id==='string'&&/^\d{1,18}$/.test(id))||new Set(replace).size!==replace.length||
      !Array.isArray(paths)||!paths.length||paths.length>128)reject();
  const ids=new Set();
  let totalPoints=0;
  for(const path of paths){
    const {id,structure,width,points}=path??{};
    if(typeof id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(id)||ids.has(id)||
        !validStructures.has(structure)||!finiteIn(width,.5,40)||
        !Array.isArray(points)||points.length<2||points.length>1000)reject();
    const dimensions=points[0]?.length;
    if((dimensions!==2&&dimensions!==3)||!points.every((point,i)=>
      Array.isArray(point)&&point.length===dimensions&&finiteIn(point[0],-180,180)&&finiteIn(point[1],-85,85)&&
      (dimensions===2||finiteIn(point[2],-500,9000))&&
      (!i||point[0]!==points[i-1][0]||point[1]!==points[i-1][1])))reject();
    ids.add(id);
    totalPoints+=points.length;
    if(totalPoints>10000)reject();
  }
  return {replace,paths};
}

export function applyCatalogueRailways(data){
  const models=(data.singularModels??[]).filter(model=>
    model.kind==='railway'&&model.paths?.length&&Array.isArray(model.replace));
  if(!models.length)return data;
  const replaced=new Set(models.flatMap(model=>model.replace));
  const keep=feature=>!(replaced.has(String(feature.id))&&feature.properties?.sourceLayer==='transportation'&&
    isRailway(feature.properties)&&
    ['LineString','MultiLineString'].includes(feature.geometry?.type));
  const railwayFeatures=models.flatMap(model=>model.paths.map(({id,structure,width,points})=>({
    type:'Feature',
    id:`${model.id}:${id}`,
    properties:{sourceLayer:'transportation',class:'rail',subclass:'narrow_gauge',name:model.name,width,
      catalogueRailway:model.id,...(structure==='surface'?{}:{brunnel:structure})},
    geometry:{type:'LineString',coordinates:points},
  })));
  return {...data,features:[...data.features.filter(keep),...railwayFeatures],
    ...(data.bridgeFeatures?{bridgeFeatures:data.bridgeFeatures.filter(keep)}:{})};
}
