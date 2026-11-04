import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {XMLParser} from 'fast-xml-parser';
import {strFromU8,unzipSync} from 'fflate';
import Module from 'manifold-3d';
import {topSampler} from '../src/bridge-completion.js';
import {threeMF} from '../src/export.js';
import {buildModel} from '../src/geometry.js';
import {auditThreeMF} from '../src/three-mf-audit.js';

const footprintM=200,footprintMM=60,roadWidthM=12;
const longitudeSpan=footprintM/111320,latitudeSpan=footprintM/111320,demSide=11;
const roadId='hillside-road';
const terrainRiseM={longitudinal:3,lateral:100};
const terrainZ=(u,v)=>100+terrainRiseM.longitudinal*u+terrainRiseM.lateral*v;
const values=Float32Array.from({length:demSide**2},(_,i)=>terrainZ(
  (i%demSide)/(demSide-1),Math.floor(i/demSide)/(demSide-1)));
const fixture={
  meta:{name:'Cupó de carretera en vessant',bbox:[0,0,longitudeSpan,latitudeSpan]},
  localDEM:{width:demSide,height:demSide,epsg:4326,
    affine:[longitudeSpan/(demSide-1),0,0,0,latitudeSpan/(demSide-1),0],pixelIsArea:false,values,metadata:{}},
  features:[{id:roadId,type:'Feature',properties:{sourceLayer:'transportation',class:'primary',width:roadWidthM},
    geometry:{type:'LineString',coordinates:[[0,latitudeSpan/2],[longitudeSpan,latitudeSpan/2]]}}]
};
const options={size:footprintMM,widthMM:footprintMM,heightMM:footprintMM,resolution:10,
  exaggeration:1,trees:false,roadRise:0,majorRoads:false,estimatedTunnels:false,surfaceRoads:true};
const toleranceMM=1e-4,overlapToleranceMM3=.0003;

function exportedMeshes(bytes){
  const files=unzipSync(bytes),parser=new XMLParser({ignoreAttributes:false});
  const {model}=parser.parse(strFromU8(files['3D/3dmodel.model']));
  const meshes=model.resources.object.filter(object=>object.mesh);
  return new Map(meshes.map(object=>{
    const {vertices,triangles}=object.mesh;
    return [object['@_name'],{
      vertices:new Float32Array(vertices.vertex.flatMap(vertex=>['x','y','z'].map(key=>Number(vertex[`@_${key}`])))),
      faces:new Uint32Array(triangles.triangle.flatMap(triangle=>['v1','v2','v3'].map(key=>Number(triangle[`@_${key}`]))))
    }];
  }));
}

function surfaceSampler({vertices,faces},upward){
  const points=Array.from({length:vertices.length/3},(_,i)=>vertices.subarray(i*3,i*3+3));
  const selected=[];
  for(let i=0;i<faces.length;i+=3){
    const ids=faces.subarray(i,i+3),[a,b,c]=Array.from(ids,index=>points[index]);
    const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(upward?area>0:area<0)selected.push(...ids);
  }
  return topSampler(points,selected);
}

function checkMaterialContact(api,terrain,road){
  const solid=part=>new api.Manifold(new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces}));
  const ground=solid(terrain),pavement=solid(road);
  try{
    assert.equal(ground.status(),'NoError');
    assert.equal(pavement.status(),'NoError');
    const common=ground.intersect(pavement),combined=ground.add(pavement);
    try{
      assert.equal(common.status(),'NoError');
      assert.equal(combined.status(),'NoError');
      const components=combined.decompose();
      try{return {overlapMM3:common.volume(),unionComponents:components.length};}
      finally{components.forEach(component=>component.delete());}
    }finally{common.delete();combined.delete();}
  }finally{ground.delete();pavement.delete();}
}

const api=await Module();api.setup();
const model=buildModel(fixture,options,()=>{},api);
const pilot=model.provenance.surfaceRoads;
assert.equal(pilot?.applied,true,JSON.stringify({pilot,warnings:model.warnings}));
assert.equal(pilot.featureId,roadId);
assert.equal(pilot.pavementThicknessMM,.65);
const expectedWidthMM=roadWidthM*footprintMM/footprintM;
assert(Math.abs(pilot.widthMM-expectedWidthMM)<toleranceMM);

const directory=new URL('../output/surface-road/',import.meta.url);
await mkdir(directory,{recursive:true});
const coupon=new URL('cupo-carretera-vessant.3mf',directory);
await writeFile(coupon,threeMF(model,{bambu:true}));
const bytes=await readFile(coupon),audit=auditThreeMF(bytes),meshes=exportedMeshes(bytes);
assert.equal(audit.dialect,'bambu');
assert(audit.valid,JSON.stringify(audit));
assert.equal(audit.parts.length,2);
assert(audit.parts.every(part=>part.geometry.closed&&part.geometry.components===1));
assert.equal(new Set(audit.parts.map(part=>part.material.extruder)).size,2);

const terrain=meshes.get('Terreny'),road=meshes.get('Camins i carreteres');
assert(terrain&&road,'Calen materials separats per al terreny i la calçada.');
const {min,max}=audit.parts.find(part=>part.name==='Camins i carreteres').geometry.bbox;
const [west,downhill]=min,[east,uphill]=max;
assert(Math.abs(west)<toleranceMM&&Math.abs(east-footprintMM)<toleranceMM);
assert(Math.abs(uphill-downhill-expectedWidthMM)<toleranceMM);

const pavementTop=surfaceSampler(road,true),pavementBottom=surfaceSampler(road,false);
const terrainTop=surfaceSampler(terrain,true),{originMeters,minimumSurfaceMM}=model.provenance.verticalReference;
const naturalGround=(x,y)=>minimumSurfaceMM+(terrainZ(x/footprintMM,y/footprintMM)-originMeters)*footprintMM/footprintM;
const sections=[.05,.25,.5,.75,.95].map(position=>{
  const xMM=position*footprintMM;
  const downhillZ=pavementTop(xMM,downhill),uphillZ=pavementTop(xMM,uphill);
  assert(Number.isFinite(downhillZ)&&Number.isFinite(uphillZ),`Falten vores de calçada a x=${xMM}.`);
  assert(Math.abs(downhillZ-uphillZ)<toleranceMM,`La calçada té pendent transversal a x=${xMM}.`);
  const fillMM=downhillZ-naturalGround(xMM,downhill),cutMM=naturalGround(xMM,uphill)-uphillZ;
  assert(Math.abs(fillMM-.9)<toleranceMM&&Math.abs(cutMM-.9)<toleranceMM,
    `El desmunt i el terraplè han de fer 0,90 mm a x=${xMM}.`);
  const interfaceSamples=[.025,.05,.25,.5,.75,.95].map(fraction=>{
    const y=downhill+fraction*(uphill-downhill),top=pavementTop(xMM,y);
    const bottom=pavementBottom(xMM,y),support=terrainTop(xMM,y);
    assert([top,bottom,support].every(Number.isFinite),`Falta suport sota la calçada a ${xMM}, ${y}.`);
    const gap=bottom-support;
    assert(Math.abs(gap)<toleranceMM,`Separació o solapament a la interfície a ${xMM}, ${y}: ${gap} mm.`);
    assert(Math.abs(top-bottom-pilot.pavementThicknessMM)<toleranceMM);
    return {interfaceErrorMM:Math.abs(gap),raisedTerrainMM:support-naturalGround(xMM,y)};
  });
  const [nearEdge,insideEdge]=interfaceSamples;
  assert(nearEdge.raisedTerrainMM>=.2&&insideEdge.raisedTerrainMM>=.15,
    `Falta el terraplè de suport al costat baix a x=${xMM}.`);
  const outsideTerrainErrorMM=Math.max(...[downhill-3,downhill-.1,uphill+.1,uphill+3].map(y=>{
    const actual=terrainTop(xMM,y);
    assert(Number.isFinite(actual),`Falta terreny fora de la calçada a ${xMM}, ${y}.`);
    return Math.abs(actual-naturalGround(xMM,y));
  }));
  assert(outsideTerrainErrorMM<toleranceMM,`El relleu de fora de la calçada ha canviat a x=${xMM}.`);
  return {xMM,downhillZ,uphillZ,cutMM,fillMM,raisedTerrainAt2_5PercentMM:nearEdge.raisedTerrainMM,
    raisedTerrainAt5PercentMM:insideEdge.raisedTerrainMM,outsideTerrainErrorMM,
    interfaceErrorMM:Math.max(...interfaceSamples.map(sample=>sample.interfaceErrorMM))};
});
const longitudinalGrade=(sections.at(-1).uphillZ-sections[0].uphillZ)/(sections.at(-1).xMM-sections[0].xMM);
assert(Math.abs(longitudinalGrade-.015)<toleranceMM,'El cupó ha de conservar el pendent longitudinal de l’1,5 %.');

const {overlapMM3,unionComponents}=checkMaterialContact(api,terrain,road);
// Two triangulations of the common surface can diverge slightly after export rounds vertices to six decimals.
assert(Math.abs(overlapMM3)<overlapToleranceMM3,`Intersecció volumètrica entre materials: ${overlapMM3} mm³.`);
assert.equal(unionComponents,1,'La calçada i el relleu han de formar un únic cos en contacte.');
const report={fixture:{footprintM,footprintMM,roadWidthM,terrainSlope:{
    longitudinal:terrainRiseM.longitudinal/footprintM,lateral:terrainRiseM.lateral/footprintM}},
  pilot,longitudinalGrade,sections,overlapMM3,overlapToleranceMM3,unionComponents,parts:audit.parts.map(({name,material,geometry})=>({name,
    extruder:material.extruder,triangles:geometry.triangles,closed:geometry.closed,volumeMM3:geometry.signedVolume}))};
await writeFile(new URL('diagnostic.json',directory),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
