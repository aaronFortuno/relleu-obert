import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {XMLParser} from 'fast-xml-parser';
import {strFromU8,unzipSync} from 'fflate';
import Module from 'manifold-3d';
import {threeMF} from '../src/export.js';
import {buildModel} from '../src/geometry.js';
import {auditThreeMF} from '../src/three-mf-audit.js';

const sizeMM=120,sizeM=400,resolution=30,demSide=resolution+1;
const span=sizeM/111320,scale=sizeMM/sizeM;
const toleranceMM=1e-4,overlapToleranceMM3=.0015;
const roads=[
  {id:'upper-west',ref:'upper-route',width:12,axis:[[0,45],[9,52],[14,60],[24,60],[34,60],[45,57],[50,60],[56,60]]},
  {id:'upper-bridge',ref:'upper-route',width:12,brunnel:'bridge',layer:1,axis:[[56,60],[64,60]]},
  {id:'upper-east',ref:'upper-route',width:12,axis:[[64,60],[73,60],[83,67],[96,72],[108,63],[120,61]]},
  {id:'lower-road',ref:'lower-route',class:'secondary',width:12,axis:[[49,0],[50,16],[55,30],[60,42],[60,76],[66,91],[63,108],[55,120]]},
  {id:'branch-road',ref:'branch-route',class:'secondary',width:9,axis:[[18,0],[22,14],[29,27],[24,43],[24,60]]},
  {id:'scenic-road',ref:'scenic-route',class:'tertiary',width:8,axis:[[0,95],[11,102],[24,104],[35,112],[43,120]]}
];
const hills=[{x:19,y:36,rx:25,ry:27,height:17},{x:34,y:94,rx:28,ry:22,height:14},
  {x:98,y:79,rx:26,ry:30,height:20}];
const hillsAt=(x,y)=>hills.reduce((z,hill)=>z+hill.height*Math.max(0,
  1-((x-hill.x)/hill.rx)**2-((y-hill.y)/hill.ry)**2)**2,0);
function elevation(x,y){
  const hillsTaper=Math.max(0,Math.min(1,Math.max(48-x,x-72)/8));
  const valley=15*Math.max(0,1-Math.abs(x-60)/4);
  return 100+.15*x+.1*y+hillsAt(x,y)*hillsTaper-valley;
}
const fixture={
  meta:{name:'Cupó de xarxa viària amb corbes, cruïlla i pont',bbox:[0,0,span,span]},
  localDEM:{width:demSide,height:demSide,epsg:4326,affine:[span/resolution,0,0,0,span/resolution,0],
    pixelIsArea:false,metadata:{},values:Float32Array.from({length:demSide**2},(_,i)=>
      elevation((i%demSide)*sizeMM/resolution,Math.floor(i/demSide)*sizeMM/resolution))},
  features:roads.map(({id,axis,...properties})=>({type:'Feature',id,
    properties:{sourceLayer:'transportation',class:'primary',...properties},
    geometry:{type:'LineString',coordinates:axis.map(([x,y])=>[x*span/sizeMM,y*span/sizeMM])}}))
};

function readMeshes(bytes){
  const files=unzipSync(bytes),parser=new XMLParser({ignoreAttributes:false});
  const {model}=parser.parse(strFromU8(files['3D/3dmodel.model']));
  const geometry=model.resources.object.filter(object=>object.mesh);
  return new Map(geometry.map(object=>[object['@_name'],{
    vertices:Float32Array.from(object.mesh.vertices.vertex.flatMap(vertex=>['x','y','z'].map(key=>Number(vertex[`@_${key}`])))),
    faces:Uint32Array.from(object.mesh.triangles.triangle.flatMap(face=>['v1','v2','v3'].map(key=>Number(face[`@_${key}`]))))
  }]));
}

function layerProbe({vertices,faces}){
  const triangles=[];
  for(let i=0;i<faces.length;i+=3){
    const [a,b,c]=Array.from(faces.subarray(i,i+3),index=>vertices.subarray(index*3,index*3+3));
    const ux=b[0]-a[0],uy=b[1]-a[1],vx=c[0]-a[0],vy=c[1]-a[1],det=ux*vy-uy*vx;
    if(Math.abs(det)<=1e-12)continue;
    triangles.push({a,ux,uy,vx,vy,uz:b[2]-a[2],vz:c[2]-a[2],det,
      x0:Math.min(a[0],b[0],c[0])-toleranceMM,x1:Math.max(a[0],b[0],c[0])+toleranceMM,
      y0:Math.min(a[1],b[1],c[1])-toleranceMM,y1:Math.max(a[1],b[1],c[1])+toleranceMM});
  }
  return (x,y)=>{
    const hits=[];
    for(const {a,ux,uy,vx,vy,uz,vz,det,x0,x1,y0,y1} of triangles){
      if(x<x0||x>x1||y<y0||y>y1)continue;
      const dx=x-a[0],dy=y-a[1],u=(dx*vy-dy*vx)/det,v=(ux*dy-uy*dx)/det;
      if(u< -1e-6||v< -1e-6||u+v>1.000001)continue;
      const z=a[2]+u*uz+v*vz,up=det>0;
      if(!hits.some(hit=>hit.up===up&&Math.abs(hit.z-z)<toleranceMM))hits.push({z,up});
    }
    hits.sort((a,b)=>a.z-b.z);
    assert.equal(hits.length%2,0,`La malla no tanca el volum a ${x}, ${y}.`);
    return Array.from({length:hits.length/2},(_,i)=>{
      const low=hits[i*2],high=hits[i*2+1];
      assert(!low.up&&high.up&&high.z>low.z,`Orientació incorrecta de la malla a ${x}, ${y}.`);
      return {bottom:low.z,top:high.z};
    });
  };
}

function inspectMaterialContact(api,terrain,road){
  const solid=part=>new api.Manifold(new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces}));
  const ground=solid(terrain),pavement=solid(road);
  try{
    assert.equal(ground.status(),'NoError');
    assert.equal(pavement.status(),'NoError');
    const common=ground.intersect(pavement),assembly=ground.add(pavement);
    try{
      assert.equal(common.status(),'NoError');
      assert.equal(assembly.status(),'NoError');
      const overlapMM3=Math.abs(common.volume()),components=assembly.decompose();
      try{
        const volumes=components.map(component=>Math.abs(component.volume()));
        const assemblyComponents=volumes.filter(volume=>volume>overlapToleranceMM3).length;
        const roundingMM3=volumes.filter(volume=>volume<=overlapToleranceMM3).reduce((sum,volume)=>sum+volume,0);
        assert.equal(assemblyComponents,1,'Tots els trams de paviment han de quedar units a la base.');
        assert(overlapMM3<overlapToleranceMM3&&roundingMM3<overlapToleranceMM3,
          `Intersecció o fragments residuals de la unió: ${overlapMM3} / ${roundingMM3} mm³.`);
        return {overlapMM3,overlapToleranceMM3,assemblyComponents,roundingMM3};
      }finally{components.forEach(component=>component.delete());}
    }finally{common.delete();assembly.delete();}
  }finally{ground.delete();pavement.delete();}
}

const api=await Module();api.setup();
const model=buildModel(fixture,{size:sizeMM,widthMM:sizeMM,heightMM:sizeMM,resolution,exaggeration:1,
  trees:false,roadRise:0,majorRoads:false,estimatedTunnels:false,surfaceRoads:true},()=>{},api);
const pilot=model.provenance.surfaceRoads;
assert(pilot?.applied,JSON.stringify({pilot,warnings:model.warnings}));
assert.equal(pilot.pavementThicknessMM,.65);
assert.equal(pilot.junctionCount,1);
const bridge=pilot.bridge;
assert(bridge?.sourceFeatureIds.includes('upper-bridge')&&Math.abs(bridge.spanMM-8)<toleranceMM);
const directory=new URL('../output/surface-road/',import.meta.url);
await mkdir(directory,{recursive:true});
const file=new URL('cupo-xarxa-120.3mf',directory);
await writeFile(file,threeMF(model,{bambu:true}));
const bytes=await readFile(file),audit=auditThreeMF(bytes),meshes=readMeshes(bytes);
assert.equal(audit.dialect,'bambu');
assert(audit.valid,JSON.stringify(audit));
assert.equal(audit.parts.length,2);
assert.equal(new Set(audit.parts.map(part=>part.material.extruder)).size,2);
for(const {name,geometry} of audit.parts){
  assert(geometry.closed,`La malla de ${name} ha d’estar tancada.`);
  assert.equal(geometry.components,name==='Camins i carreteres'?3:1,`Nombre de cossos a ${name}.`);
}
const terrain=meshes.get('Terreny'),road=meshes.get('Camins i carreteres');
assert(terrain&&road);
const materials=inspectMaterialContact(api,terrain,road);
const terrainLayers=layerProbe(terrain),roadLayers=layerProbe(road);
function pavement(x,y){
  const layers=roadLayers(x,y);
  assert(layers.length>0,`Falta paviment a ${x}, ${y}.`);
  for(const {top,bottom} of layers)assert(Math.abs(top-bottom-.65)<toleranceMM,`Gruix del paviment a ${x}, ${y}.`);
  return layers;
}
function supportError(x,y,bottom){
  const ground=terrainLayers(x,y).at(-1);
  assert(ground&&Math.abs(ground.top-bottom)<toleranceMM,`Falta suport de terreny a ${x}, ${y}.`);
  return Math.abs(ground.top-bottom);
}

const shoulderSections=[56,64].flatMap(x=>[58.4,60,61.6].map(y=>{
  const delta=.01;
  const [beforeFar,beforeNear,afterNear,afterFar]=[-2,-1,1,2].map(step=>pavement(x+delta*step,y).at(-1).top);
  const gradeBefore=(beforeNear-beforeFar)/delta,gradeAfter=(afterFar-afterNear)/delta;
  const stepMM=Math.abs(beforeNear+delta*gradeBefore-(afterNear-delta*gradeAfter));
  assert(stepMM<toleranceMM,`La unió amb el tauler fa un graó de ${stepMM} mm a ${x}, ${y}.`);
  assert([gradeBefore,gradeAfter].every(grade=>Math.abs(grade-.045)<.006),`Canvi de pendent a ${x}, ${y}.`);
  const approachX=x===56?x-delta:x+delta;
  return {x,y,stepMM,gradeBefore,gradeAfter,supportErrorMM:supportError(approachX,y,pavement(approachX,y).at(-1).bottom)};
}));
const underpass=[58.21,60,61.79].flatMap(x=>[58.21,60,61.79].map(y=>{
  const layers=pavement(x,y);
  assert.equal(layers.length,2,`Calen dos nivells de calçada a ${x}, ${y}.`);
  const [lower,upper]=layers,clearanceMM=upper.bottom-lower.top;
  assert(clearanceMM>3.5,`El pont no deixa prou pas a ${x}, ${y}.`);
  return {x,y,lowerTop:lower.top,deckTop:upper.top,clearanceMM,supportErrorMM:supportError(x,y,lower.bottom)};
}));
const minimumMeasuredClearanceMM=Math.min(...underpass.map(sample=>sample.clearanceMM));
assert(Math.abs(minimumMeasuredClearanceMM-bridge.minimumClearanceMM)<.02,'El gàlib exportat difereix del calculat.');
const lowerSections=[57.8,58.4,60,61.6,62.2].map(y=>{
  const layers=pavement(60,y);
  assert.equal(layers.length,Math.abs(y-60)<1.8?2:1,`Nombre de nivells de calçada a 60, ${y}.`);
  return {y,top:layers[0].top,supportErrorMM:supportError(60,y,layers[0].bottom)};
});
const lowerGrades=lowerSections.slice(1).map(({y,top},i)=>(top-lowerSections[i].top)/(y-lowerSections[i].y));
assert(lowerGrades.every(grade=>Math.abs(grade-.03)<toleranceMM),'La via inferior perd la rasant en passar sota el pont.');

const junctionHeight=pavement(24,60)[0].top;
const junctionSamples=[22.8,24,25.2].flatMap(x=>[58.15,58.2,58.25].map(y=>{
  const layers=pavement(x,y);
  assert.equal(layers.length,1);
  const [{top,bottom}]=layers,deltaMM=Math.abs(top-junctionHeight);
  assert(deltaMM<toleranceMM,`La cruïlla en T fa un graó de ${deltaMM} mm a ${x}, ${y}.`);
  return {x,y,top,deltaMM,supportErrorMM:supportError(x,y,bottom)};
}));

const widthById=new Map(roads.map(({id,width})=>[id,width*scale]));
const sectionFractions=[-.45,0,.45],midpoint=(a,b)=>a.map((coordinate,i)=>(coordinate+b[i])/2);
function inspectProfile({featureIds,stations}){
  const widthMM=widthById.get(featureIds[0]);
  assert(widthMM&&featureIds.every(id=>widthById.get(id)===widthMM));
  const measured=[];
  for(const [i,station] of stations.entries()){
    const previous=stations[i-1];
    const sections=previous?[station,{centre:midpoint(previous.centre,station.centre),
      normal:midpoint(previous.normal,station.normal),between:true}]:[station];
    for(const {centre,normal,between=false} of sections){
      const [x,y]=centre;
      // Crossfall here is for the route surface, away from the mixed footprints at the junction and bridge.
      if((Math.abs(x-60)<6&&Math.abs(y-60)<5)||(Math.abs(x-24)<4&&Math.abs(y-60)<4))continue;
      const points=sectionFractions.map(fraction=>centre.map((value,j)=>value+fraction*widthMM*normal[j]));
      if(points.some(point=>point.some(coordinate=>coordinate<=.01||coordinate>=sizeMM-.01)))continue;
      const samples=points.map(([px,py])=>{
        const layers=pavement(px,py);
        assert.equal(layers.length,1,`Més d’una calçada inesperada a ${px}, ${py}.`);
        const [{top,bottom}]=layers;
        return {top,supportErrorMM:supportError(px,py,bottom)};
      });
      const heights=samples.map(sample=>sample.top);
      const crossfallMM=Math.max(...heights)-Math.min(...heights);
      const crossfallLimitMM=between ? .03 : toleranceMM;
      assert(crossfallMM<crossfallLimitMM,`Pendent transversal de ${crossfallMM} mm a ${x}, ${y}.`);
      measured.push({between,crossfallMM,supportErrorMM:Math.max(...samples.map(sample=>sample.supportErrorMM))});
    }
  }
  assert(measured.some(section=>section.between)&&measured.some(section=>!section.between),'Falten seccions de perfil.');
  return {featureIds,widthMM,sampleCount:measured.length,maximumSupportErrorMM:Math.max(...measured.map(section=>section.supportErrorMM)),
    maximumStationCrossfallMM:Math.max(...measured.filter(section=>!section.between).map(section=>section.crossfallMM)),
    maximumMidpointCrossfallMM:Math.max(...measured.filter(section=>section.between).map(section=>section.crossfallMM))};
}
const profiles=pilot.profiles.map(inspectProfile);
assert.deepEqual(profiles.flatMap(profile=>profile.featureIds).sort(),roads.map(road=>road.id).sort());
const report={fixture:{sizeMM,sizeM,resolution,roads,hills},bridge,shoulderSections,
  maximumShoulderStepMM:Math.max(...shoulderSections.map(section=>section.stepMM)),
  underpass,minimumMeasuredClearanceMM,lowerSections,lowerGrades,junctionSamples,
  maximumJunctionStepMM:Math.max(...junctionSamples.map(sample=>sample.deltaMM)),profiles,materials,
  parts:audit.parts.map(({name,material,geometry})=>({name,extruder:material.extruder,
    closed:geometry.closed,components:geometry.components,triangles:geometry.triangles,volumeMM3:geometry.signedVolume}))};
await writeFile(new URL('xarxa-120.json',directory),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({minimumMeasuredClearanceMM,maximumShoulderStepMM:report.maximumShoulderStepMM,
  maximumJunctionStepMM:report.maximumJunctionStepMM,profiles,materials,parts:report.parts}));
