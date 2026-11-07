import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import Module from 'manifold-3d';
import {XMLParser} from 'fast-xml-parser';
import {strFromU8,unzipSync} from 'fflate';
import {buildModel} from '../src/geometry.js';
import {physicalBBox} from '../src/selection.js';
import {localRasterSampler} from '../src/local-raster.js';
import {generateProceduralBridgeItems} from '../src/procedural-bridges.js';
import {threeMF} from '../src/export.js';
import {auditThreeMF} from '../src/three-mf-audit.js';
import {roadCouponSnapshot} from './road-coupon-sources.mjs';

const centre=[41.52530,2.41143136],sideM=400,bbox=physicalBBox(centre,sideM/1000,sideM/1000);
const [bridgeID,...roadIDs]=[343867212,343867222,429180592,3066223302];
const directory=new URL('../output/road-class-coupons/',import.meta.url);
await mkdir(directory,{recursive:true});
const data=await roadCouponSnapshot(new URL('input-mataro-pas-inferior.json',directory),bbox);
const terrainRaster={...data.terrainRaster,values:Float32Array.from(data.terrainRaster.values)};
const byId=id=>data.features.filter(f=>f.id===id&&f.geometry.type==='LineString');
const bridgeParts=byId(bridgeID);
const {items}=generateProceduralBridgeItems(bridgeParts,localRasterSampler(terrainRaster),{bbox,scale:.3});
assert.equal(items.length,1,'Les tessel·les han de reconstruir un únic tauler cartografiat.');
const bridge={...bridgeParts[0],geometry:{type:'LineString',coordinates:items[0].axis}};
const surfaceRoads=roadIDs.map(id=>{
  const [road]=byId(id).sort((a,b)=>b.geometry.coordinates.length-a.geometry.coordinates.length);
  assert(road,`Falta la via cartografiada ${id}.`);
  return road;
});
const features=[bridge,...surfaceRoads,...data.features.filter(f=>['water','waterway'].includes(f.properties.sourceLayer))];
const api=await Module();api.setup();

function build(size){
  const model=buildModel({meta:{...data.meta,bbox,name:'Mataró sud · creuament de carreteres'},terrainRaster,features},{
    size,widthMM:size,heightMM:size,resolution:28,exaggeration:1,trees:false,buildingMode:'none',surfaceRoads:'crossing-coupon'
  },()=>{},api);
  const bytes=threeMF(model,{bambu:true}),audit=auditThreeMF(bytes);
  assert(audit.valid,JSON.stringify(audit));
  return {context:model.context,plan:model.provenance.surfaceRoads,bytes};
}

function exportedRoads(bytes){
  const {model}=new XMLParser({ignoreAttributes:false}).parse(strFromU8(unzipSync(bytes)['3D/3dmodel.model']));
  const {mesh}=model.resources.object.find(o=>o['@_name']==='Camins i carreteres');
  const vertProperties=Float32Array.from(mesh.vertices.vertex.flatMap(v=>['x','y','z'].map(key=>Number(v['@_'+key]))));
  const triVerts=Uint32Array.from(mesh.triangles.triangle.flatMap(f=>['v1','v2','v3'].map(key=>Number(f['@_'+key]))));
  const geometry=new api.Mesh({numProp:3,vertProperties,triVerts});geometry.merge();
  const solid=new api.Manifold(geometry);
  assert.equal(solid.status(),'NoError');
  return {dispose:()=>solid.delete(),
    heights:([x,y])=>[...new Set(solid.rayCast([x,y,1000],[x,y,0]).map(hit=>Math.round(hit.position[2]*1e6)/1e6))].sort((a,b)=>a-b)};
}

const mix=([x,y],[dx,dy],d)=>[x+dx*d,y+dy*d];
const normal=([x,y])=>[-y,x];
const offsets=[-.35,0,.35];
const detailed=build(120),small=build(50);
assert(detailed.plan.bridge?.minimumClearanceMM>=.8);
assert(small.plan.crossing?.reason.includes('0,8 mm'),small.plan.crossing?.reason??'El cupó petit ha de resoldre el creuament a nivell.');
assert.equal(small.context.bridges.length,0,'El tauler descartat s’ha tornat a afegir.');
const {point,heightMM,axes}=small.plan.crossing;
const location=small.context.proj.unproject(point),detailedPoint=detailed.context.proj.project(location);
const detailedRoads=exportedRoads(detailed.bytes),smallRoads=exportedRoads(small.bytes);
const clearance=[],bridgeSteps=[],crossingErrors=[],junctionSteps=[];
try{
  for(const x of [-.35,0,.35])for(const y of [-.35,0,.35]){
    const hits=detailedRoads.heights([detailedPoint[0]+x,detailedPoint[1]+y]);
    assert.equal(hits.length,4,'Hi ha d’haver dos cossos de calçada al pas inferior.');
    clearance.push(hits[2]-hits[1]);
  }
  const upper=detailed.plan.profiles.find(p=>p.bridgeIntervalMM);
  for(const seam of upper.bridgeIntervalMM){
    const section=upper.stations.find(p=>Math.abs(p.distanceMM-seam)<1e-6);
    const routeWidth=detailed.context.terrain.transport.find(r=>r.sourceFeatureIds.includes(bridgeID)).width;
    for(const across of offsets){
      const p=mix(section.centre,section.normal,across*routeWidth),tangent=[section.normal[1],-section.normal[0]];
      const heights=[-.04,-.02,.02,.04].map(d=>detailedRoads.heights(mix(p,tangent,d)).at(-1));
      assert(heights.every(Number.isFinite),'Falta paviment a l’enllaç del tauler.');
      bridgeSteps.push(Math.abs(2*heights[1]-heights[0]-(2*heights[2]-heights[3])));
    }
  }
  for(const {direction,widthMM,padLengthMM} of axes)for(const sign of [-1,1])for(const across of offsets){
    const p=mix(point,normal(direction),widthMM*across);
    const hit=smallRoads.heights(mix(p,direction,sign*padLengthMM*.9));
    assert.equal(hit.length,2,'La cruïlla a nivell ha de tenir un únic paviment.');
    crossingErrors.push(Math.abs(hit[1]-heightMM));
    const heights=[-.04,-.02,.02,.04].map(d=>smallRoads.heights(mix(p,direction,sign*(padLengthMM+d))).at(-1));
    assert(heights.every(Number.isFinite),'Falta un dels quatre accessos de la cruïlla.');
    junctionSteps.push(Math.abs(2*heights[1]-heights[0]-(2*heights[2]-heights[3])));
  }
}finally{detailedRoads.dispose();smallRoads.dispose();}
const report={centre,sideM,bridgeID,roadIDs,terrain:data.meta.terrain.provider,location,
  detailed:{sizeMM:120,scale:sideM*1000/120,minimumPlannedClearanceMM:detailed.plan.bridge.minimumClearanceMM,
    minimumProbedClearanceMM:Math.min(...clearance),maximumStepMM:Math.max(...bridgeSteps)},
  small:{sizeMM:50,scale:sideM*1000/50,reason:small.plan.crossing.reason,
    maximumGrade:Math.max(...small.plan.profiles.flatMap(({stations})=>stations.slice(1).map((b,i)=>{
      const a=stations[i];return Math.abs((b.heightMM-a.heightMM)/(b.distanceMM-a.distanceMM));
    }))),
    maximumHeightErrorMM:Math.max(...crossingErrors),maximumStepMM:Math.max(...junctionSteps)}};
assert(report.detailed.minimumProbedClearanceMM>=.8);
assert(report.small.maximumGrade<=small.plan.crossing.maxGrade+1e-6,'L’accés a la cruïlla supera el pendent de prova.');
assert(Math.max(report.detailed.maximumStepMM,report.small.maximumHeightErrorMM,report.small.maximumStepMM)<.005,JSON.stringify(report));
await writeFile(new URL('mataro-pas-inferior-120mm.3mf',directory),detailed.bytes);
await writeFile(new URL('mataro-cruilla-a-nivell-50mm.3mf',directory),small.bytes);
await writeFile(new URL('mataro-creuament-mesures.json',directory),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
