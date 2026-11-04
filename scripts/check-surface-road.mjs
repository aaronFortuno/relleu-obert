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
const expectedWidthMM=roadWidthM*footprintMM/footprintM;
const dimensions={footprintM,footprintMM,roadWidthM,terrainSlope:{
  longitudinal:terrainRiseM.longitudinal/footprintM,lateral:terrainRiseM.lateral/footprintM}};

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
      try{
        const volumes=components.map(component=>Math.abs(component.volume()));
        const unionComponents=volumes.filter(volume=>volume>overlapToleranceMM3).length;
        const unionRoundingMM3=volumes.filter(volume=>volume<=overlapToleranceMM3).reduce((sum,volume)=>sum+volume,0);
        assert(unionRoundingMM3<overlapToleranceMM3,'La unió supera la tolerància volumètrica del control.');
        return {overlapMM3:common.volume(),unionComponents,unionRoundingMM3};
      }
      finally{components.forEach(component=>component.delete());}
    }finally{common.delete();combined.delete();}
  }finally{ground.delete();pavement.delete();}
}

const api=await Module();api.setup();
const directory=new URL('../output/surface-road/',import.meta.url);
await mkdir(directory,{recursive:true});

async function checkedExport(data,filename){
  const model=buildModel(data,options,()=>{},api),pilot=model.provenance.surfaceRoads;
  assert.equal(pilot?.applied,true,JSON.stringify({pilot,warnings:model.warnings}));
  assert.equal(pilot.pavementThicknessMM,.65);
  const coupon=new URL(filename,directory);
  await writeFile(coupon,threeMF(model,{bambu:true}));
  const bytes=await readFile(coupon),audit=auditThreeMF(bytes),meshes=exportedMeshes(bytes);
  assert.equal(audit.dialect,'bambu');
  assert(audit.valid,JSON.stringify(audit));
  assert.equal(audit.parts.length,2);
  assert(audit.parts.every(part=>part.geometry.closed&&part.geometry.components===1));
  assert.equal(new Set(audit.parts.map(part=>part.material.extruder)).size,2);
  const terrain=meshes.get('Terreny'),road=meshes.get('Camins i carreteres');
  assert(terrain&&road,'Calen materials separats per al terreny i la calçada.');

  const {overlapMM3,unionComponents,unionRoundingMM3}=checkMaterialContact(api,terrain,road);
  // The shared surface can diverge slightly after export rounds vertices to six decimals.
  assert(Math.abs(overlapMM3)<overlapToleranceMM3,`Intersecció volumètrica entre materials: ${overlapMM3} mm³.`);
  assert.equal(unionComponents,1,'La calçada i el relleu han de formar un únic cos en contacte.');
  const parts=audit.parts.map(({name,material,geometry})=>({name,extruder:material.extruder,
    triangles:geometry.triangles,closed:geometry.closed,volumeMM3:geometry.signedVolume}));
  return {model,pilot,terrain,road,bounds:audit.parts.find(part=>part.name==='Camins i carreteres').geometry.bbox,
    contact:{overlapMM3,overlapToleranceMM3,unionComponents,unionRoundingMM3,parts}};
}

const {model,pilot,terrain,road,bounds:{min,max},contact}=await checkedExport(fixture,'cupo-carretera-vessant.3mf');
assert.equal(pilot.featureId,roadId);
assert(Math.abs(pilot.widthMM-expectedWidthMM)<toleranceMM);
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

const report={fixture:dimensions,pilot,longitudinalGrade,sections,...contact};
await writeFile(new URL('diagnostic.json',directory),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));

const mainAxis=[[0,24],[13,24],[20,24],[30,24],[36,25.5],[42,29],[47,34],[60,45]];
const branchAxis=[[20,0],[20,24]];
const networkRoad=(id,axis)=>({...fixture.features[0],id,geometry:{type:'LineString',
  coordinates:axis.map(([x,y])=>[x*longitudeSpan/footprintMM,y*latitudeSpan/footprintMM])}});
const network={...fixture,meta:{...fixture.meta,name:'Cupó de carretera corba amb cruïlla en T'},
  features:[networkRoad('curved-road',mainAxis),networkRoad('branch-road',branchAxis)]};
const curved=await checkedExport(network,'cupo-corba-cruilla-rasant-suau.3mf');
assert.equal(curved.pilot.junctionCount,1);
assert.deepEqual([...curved.pilot.featureIds].sort(),['branch-road','curved-road']);
const networkTop=surfaceSampler(curved.road,true),networkBottom=surfaceSampler(curved.road,false);
const networkTerrainTop=surfaceSampler(curved.terrain,true);
function measurePavement(x,y){
  const top=networkTop(x,y),bottom=networkBottom(x,y),support=networkTerrainTop(x,y);
  assert([top,bottom,support].every(Number.isFinite),`Falta paviment o suport a ${x}, ${y}.`);
  assert(Math.abs(top-bottom-curved.pilot.pavementThicknessMM)<toleranceMM);
  const interfaceErrorMM=Math.abs(bottom-support);
  assert(interfaceErrorMM<toleranceMM,`La calçada no toca el suport a ${x}, ${y}.`);
  return {top,interfaceErrorMM};
}

const interpolatedCrossfallLimitMM=.02,gradeChangeLimit=.12;
const fractions=[-.499,-.25,0,.25,.499];
function sectionPoints({centre,normal}){
  return fractions.map(fraction=>centre.map((coordinate,index)=>coordinate+normal[index]*fraction*expectedWidthMM));
}
function measureSection({centre,normal,distanceMM,heightMM,midpoint=false}){
  const samples=sectionPoints({centre,normal}).map(point=>measurePavement(...point));
  const heights=samples.map(sample=>sample.top),crossfallMM=Math.max(...heights)-Math.min(...heights);
  const limit=midpoint?interpolatedCrossfallLimitMM:toleranceMM;
  assert(crossfallMM<limit,`El pendent transversal fa ${crossfallMM} mm a ${centre.join(', ')}.`);
  const centreZ=heights[2];
  if(!midpoint)assert(Math.abs(centreZ-heightMM)<toleranceMM,`La cota exportada difereix a ${centre.join(', ')}.`);
  return {centre,distanceMM,midpoint,centreZ,heights,crossfallMM,
    interfaceErrorMM:Math.max(...samples.map(sample=>sample.interfaceErrorMM))};
}

const insideCoupon=point=>point.every(coordinate=>coordinate>=toleranceMM&&coordinate<=footprintMM-toleranceMM);
const midpointVector=(a,b)=>a.map((coordinate,index)=>(coordinate+b[index])/2);
const measuredProfiles=curved.pilot.profiles.map(({featureIds,stations,junctionIntervalMM})=>{
  assert(stations.length>=2&&stations.every((station,index)=>!index||station.distanceMM>stations[index-1].distanceMM),
    'Les seccions del perfil han d’anar ordenades per distància.');
  const sections=stations.flatMap((station,index)=>{
    if(!index)return [station];
    const previous=stations[index-1];
    // Interpolate the full normal vector so both edge points are midpoints of the rendered strip edges.
    const between={midpoint:true,distanceMM:(previous.distanceMM+station.distanceMM)/2,
      centre:midpointVector(previous.centre,station.centre),normal:midpointVector(previous.normal,station.normal)};
    return [between,station];
  }).filter(section=>sectionPoints(section).every(insideCoupon)).map(measureSection);
  const grades=sections.slice(1).map((end,index)=>{
    const start=sections[index],spanMM=end.distanceMM-start.distanceMM;
    return {startX:start.centre[0],endX:end.centre[0],startMM:start.distanceMM,endMM:end.distanceMM,
      grade:(end.centreZ-start.centreZ)/spanMM};
  });
  const junctionTransitions=junctionIntervalMM?.map(distanceMM=>({distanceMM,
    gradeBefore:grades.find(({endMM})=>Math.abs(endMM-distanceMM)<toleranceMM)?.grade??null,
    gradeAfter:grades.find(({startMM})=>Math.abs(startMM-distanceMM)<toleranceMM)?.grade??null}));
  return {featureIds,junctionIntervalMM,junctionTransitions,sections,grades};
});
const measuredMain=measuredProfiles.find(({featureIds})=>featureIds.includes('curved-road'));
assert(measuredMain,'Falta el perfil de la calçada principal.');
const risingGrades=measuredMain.grades.filter(({startX,endX})=>Math.min(startX,endX)>=31&&Math.max(startX,endX)<=58);
assert(risingGrades.length>=8,'Falten mostres de rasant al tram ascendent de la corba.');
const minimumRisingGrade=Math.min(...risingGrades.map(({grade})=>grade));
assert(minimumRisingGrade>toleranceMM,`La rasant conté un replà o una baixada al tram ascendent (${minimumRisingGrade}).`);
const maximumAdjacentGradeChange=Math.max(...risingGrades.slice(1).map(({grade},index)=>Math.abs(grade-risingGrades[index].grade)));
assert(maximumAdjacentGradeChange<gradeChangeLimit,`Canvi de pendent abrupte al tram ascendent (${maximumAdjacentGradeChange}).`);
const risingSections=measuredMain.sections.filter(({centre:[x]})=>x>=31&&x<=58);
const risingDistanceMM=risingSections.at(-1).distanceMM-risingSections[0].distanceMM;
const risingHeightMM=risingSections.at(-1).centreZ-risingSections[0].centreZ;
const allSections=measuredProfiles.flatMap(({sections})=>sections);
const maximumStationCrossfallMM=Math.max(...allSections.filter(section=>!section.midpoint).map(section=>section.crossfallMM));
const maximumMidpointCrossfallMM=Math.max(...allSections.filter(section=>section.midpoint).map(section=>section.crossfallMM));

const junctionCentreZ=measurePavement(...branchAxis.at(-1)).top;
const seamY=branchAxis.at(-1)[1]-expectedWidthMM/2;
const seamSections=[18.4,20,21.6].map(x=>{
  const samples=[-.05,0,.05].map(offset=>measurePavement(x,seamY+offset));
  const heights=samples.map(sample=>sample.top),junctionDeltaMM=Math.max(...heights.map(z=>Math.abs(z-junctionCentreZ)));
  assert(junctionDeltaMM<toleranceMM,`La cruïlla fa un graó a x=${x}.`);
  return {x,seamY,heights,junctionDeltaMM,interfaceErrorMM:Math.max(...samples.map(sample=>sample.interfaceErrorMM))};
});
const intermediateGrade=(measurePavement(26,24).top-measurePavement(24,24).top)/2;
assert(intermediateGrade>toleranceMM,'El tram intermedi ha de conservar una rasant ascendent.');
const exits=[[.01,24],[59.99,44.99],[20,.01]].map(([x,y])=>measurePavement(x,y).top);

const {profiles:_,...curvedPilot}=curved.pilot;
const curvedReport={fixture:{...dimensions,mainAxis,branchAxis},pilot:curvedPilot,measuredProfiles,
  maximumStationCrossfallMM,maximumMidpointCrossfallMM,interpolatedCrossfallLimitMM,
  risingDistanceMM,risingHeightMM,minimumRisingGrade,maximumAdjacentGradeChange,gradeChangeLimit,
  junctionCentreZ,seamSections,maximumJunctionDeltaMM:Math.max(...seamSections.map(section=>section.junctionDeltaMM)),
  intermediateGrade,exits,...curved.contact};
await writeFile(new URL('corba-cruilla-rasant-suau.json',directory),JSON.stringify(curvedReport,null,2)+'\n');
console.log(JSON.stringify({curvedPilot,maximumStationCrossfallMM,maximumMidpointCrossfallMM,risingDistanceMM,
  risingHeightMM,minimumRisingGrade,maximumAdjacentGradeChange,...curved.contact}));
