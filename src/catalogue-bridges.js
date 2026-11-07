import {auditPart} from './solid-audit.js';
import {splitModel} from './mesh-tiles.js';
import {uniteMaterials} from './solid-operations.js';
import {projectInfrastructurePath} from './infrastructure-solids.js';

const positive=(value,max)=>Number.isFinite(value)&&value>0&&value<=max;
const featureIds=(ids,min)=>Array.isArray(ids)&&ids.length>=min&&ids.length<=32&&
  ids.every(id=>typeof id==='string'&&/^\d{1,18}$/.test(id));
const xyz=point=>Array.isArray(point)&&point.length===3&&point.every(Number.isFinite)&&
  Math.abs(point[0])<=180&&Math.abs(point[1])<=90&&point[2]>=-500&&point[2]<=9000;

export function validBridgeProfile(profile){
  if(!profile)return false;
  const {anchorElevation,verticalDatum,ref,roadClass,sourceFeatureIds,width,depth,length,spans,axis,deckRows,
    pylonIndexCount,upperIndexCount,stayDiameter,pierSection,supportFeatureIds,maxPierAdjustment}=profile;
  return Number.isFinite(anchorElevation)&&anchorElevation>=-500&&anchorElevation<=9000&&
    [verticalDatum,ref,roadClass].every(v=>typeof v==='string'&&v.length>0&&v.length<=80)&&
    featureIds(sourceFeatureIds,1)&&(supportFeatureIds===undefined||featureIds(supportFeatureIds,0))&&
    positive(width,100)&&positive(depth,30)&&positive(length,10000)&&positive(stayDiameter,20)&&
    Array.isArray(spans)&&spans.length>=2&&spans.length<=40&&spans.every(span=>positive(span,length))&&
    Math.abs(spans.reduce((sum,span)=>sum+span,0)-length)<.01&&
    Array.isArray(axis)&&axis.length>=2&&axis.length<=256&&axis.every(xyz)&&
    Array.isArray(deckRows)&&deckRows.length===axis.length&&deckRows.every(row=>Array.isArray(row)&&row.length===2&&row.every(xyz))&&
    Number.isSafeInteger(pylonIndexCount)&&pylonIndexCount>0&&pylonIndexCount%3===0&&
    Number.isSafeInteger(upperIndexCount)&&upperIndexCount>=pylonIndexCount&&upperIndexCount%3===0&&
    positive(pierSection?.along,100)&&positive(pierSection?.across,100)&&
    (maxPierAdjustment===undefined||positive(maxPierAdjustment,25));
}

export function catalogueBridgeItem(model){
  const b=model.bridge;
  if(b.upperIndexCount>=model.faces.length||auditPart(model).errors.length)throw Error('Malla de viaducte invàlida.');
  const coordinates=b.deckRows.flat(),faces=[];
  for(let i=0;i<coordinates.length-2;i+=2)faces.push(i,i+1,i+3,i,i+3,i+2);
  const stationsMetres=[];
  for(const span of b.spans.slice(0,-1))stationsMetres.push((stationsMetres.at(-1)??0)+span);
  return {id:model.id,coordinates,faces,outlines:model.footprint.type==='Polygon'?[model.footprint.coordinates[0]]:[],
    axis:b.axis,ref:b.ref,roadClass:b.roadClass,widthMetres:b.width,sourceFeatureIds:b.sourceFeatureIds,
    elevationMethod:'catalogue-absolute',catalogue:{id:model.id,name:model.name,revision:model.revision,license:model.license,
      spatialDataLicense:model.spatialDataLicense,attribution:model.attribution,sources:model.sources,verticalDatum:b.verticalDatum},
    layout:{lengthMetres:b.length,spansMetres:b.spans,stationsMetres,sectionMetres:b.pierSection,
      maxLongitudinalAdjustmentMetres:b.maxPierAdjustment},supportFeatureIds:b.supportFeatureIds,catalogueModel:model};
}

export function catalogueBridgeUpper(item,proj,verticalReference,exaggeration,lift,api,material){
  const model=item.catalogueModel,{bridge:b}=model;
  const includeStays=b.stayDiameter*proj.scale>=.42;
  const faces=model.faces.subarray(0,includeStays?b.upperIndexCount:b.pylonIndexCount);
  let verticesCount=0;
  for(const index of faces)verticesCount=Math.max(verticesCount,index+1);
  const [lon,lat]=model.anchor,k=111320*Math.cos(lat*Math.PI/180),coordinates=[];
  for(let i=0;i<verticesCount*3;i+=3)coordinates.push([lon+model.vertices[i]/k,
    lat-model.vertices[i+2]/111320,b.anchorElevation+model.vertices[i+1]]);
  const positions=projectInfrastructurePath(coordinates,proj,verticalReference,exaggeration);
  const vertices=Float32Array.from(positions.flatMap(([x,y,z])=>[x,y,z+lift]));
  const mesh={...material,vertices,faces};
  const tile={x0:0,y0:0,x1:proj.width,y1:proj.height,width:proj.width,height:proj.height,name:model.name};
  const modelBox={width:proj.width,height:proj.height,provenance:{name:model.name}};
  const plan={cols:1,rows:1,tiles:[tile]};
  // Stays and mast legs overlap at their anchors. Unite before capping the crop.
  const united=uniteMaterials({...modelBox,parts:[mesh]},api);
  const [piece]=splitModel(united,api,plan);
  return {parts:piece.parts,staysIncluded:includeStays&&piece.parts.length>0};
}
