import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import Module from 'manifold-3d';
import {XMLParser} from 'fast-xml-parser';
import {strFromU8,unzipSync} from 'fflate';
import {buildModel,makeProjection} from '../src/geometry.js';
import {physicalBBox} from '../src/selection.js';
import {loadMet5} from '../src/met5.js';
import {readVector,tileList} from '../src/sources.js';
import {topSampler} from '../src/bridge-completion.js';
import {threeMF} from '../src/export.js';
import {auditThreeMF} from '../src/three-mf-audit.js';

const sizeMM=100,toleranceMM=.002;
const cases={
  'mataro-sud':{name:'Mataró sud',centre:[41.52689,2.41078],sideM:230,road:284829752,paths:[612760890],expectFill:true},
  'palamos':{name:'Palamós',centre:[41.85444845,3.11919635],sideM:100,road:827880792,paths:[14762580822]}
};
const directory=new URL('../output/road-class-coupons/',import.meta.url);
await mkdir(directory,{recursive:true});

async function request(url){
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error(`HTTP ${response.status} · ${url}`);
  return response;
}

async function snapshot(key,bbox){
  const file=new URL(`input-${key}.json`,directory);
  try{return JSON.parse(await readFile(file));}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const dem=await loadMet5(bbox);
  assert(dem,'El retall ha d’estar cobert pel MET5.');
  const {tiles:[template]}=await (await request('https://tiles.openfreemap.org/planet')).json();
  const features=[];
  for(const tile of tileList(bbox)){
    const url=template.replace('{x}',tile.x).replace('{y}',tile.y).replace('{z}',tile.z);
    const bytes=await (await request(url)).arrayBuffer();
    features.push(...readVector(new Uint8Array(bytes),tile,['transportation','water','waterway']));
  }
  const data={meta:{bbox,terrain:dem.metadata,vectorTemplate:template},features,
    terrainRaster:{...dem.raster,values:Array.from(dem.raster.values)}};
  await writeFile(file,JSON.stringify(data));
  return data;
}

const inside=([x,y],margin=0)=>[x,y].every(v=>v>=margin&&v<=sizeMM-margin);
function visibleLength(line,project){
  const points=line.map(project);
  let length=0;
  for(let i=1;i<points.length;i++){
    const [x,y]=points[i-1],[u,v]=points[i],span=Math.hypot(u-x,v-y),steps=Math.max(1,Math.ceil(span/2));
    for(let j=0;j<steps;j++)if(inside([x+(u-x)*(j+.5)/steps,y+(v-y)*(j+.5)/steps]))length+=span/steps;
  }
  return length;
}

function selectLines(data,id,project){
  return data.features.filter(f=>f.id===id&&f.properties.sourceLayer==='transportation'&&!f.properties.brunnel)
    .flatMap(f=>(f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates).map(coordinates=>({
      feature:{...f,geometry:{type:'LineString',coordinates}},length:visibleLength(coordinates,project)
    }))).filter(line=>line.length>0).sort((a,b)=>b.length-a.length);
}

function meshSamplers(bytes){
  const {model}=new XMLParser({ignoreAttributes:false}).parse(strFromU8(unzipSync(bytes)['3D/3dmodel.model']));
  return new Map(model.resources.object.filter(o=>o.mesh).map(object=>{
    const points=object.mesh.vertices.vertex.map(v=>['x','y','z'].map(key=>Number(v['@_'+key])));
    const top=[],bottom=[];
    for(const face of object.mesh.triangles.triangle){
      const ids=['v1','v2','v3'].map(key=>Number(face['@_'+key])),[a,b,c]=ids.map(id=>points[id]);
      const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      if(area>0)top.push(...ids);
      else if(area<0)bottom.push(...ids);
    }
    return [object['@_name'],{top:topSampler(points,top),bottom:topSampler(points,bottom)}];
  }));
}

const api=await Module();api.setup();
for(const key of process.argv.slice(2).length?process.argv.slice(2):Object.keys(cases)){
  const config=cases[key];assert(config,`Cupó desconegut: ${key}`);
  const {name,centre,sideM,road,paths,expectFill}=config;
  const bbox=physicalBBox(centre,sideM/1000,sideM/1000);
  const data=await snapshot(key,bbox);
  const proj=makeProjection(bbox,sizeMM,{widthMM:sizeMM,heightMM:sizeMM});
  const [carriageway]=selectLines(data,road,proj.project);
  const trails=paths.flatMap(id=>selectLines(data,id,proj.project).map(line=>line.feature));
  assert(carriageway&&trails.length,'Falten vies cartografiades dins del retall.');
  const features=[carriageway.feature,...trails,...data.features.filter(f=>['water','waterway'].includes(f.properties.sourceLayer))];
  const settings={surfaceRoads:'classified-coupon',size:sizeMM,widthMM:sizeMM,heightMM:sizeMM,resolution:48,
    exaggeration:1,baseThickness:5,roadRise:0,buildingMode:'none',trees:false};
  const terrainRaster={...data.terrainRaster,values:Float32Array.from(data.terrainRaster.values)};
  const model=buildModel({meta:{...data.meta,name,bbox},terrainRaster,features},settings,()=>{},api);
  const bytes=threeMF(model,{bambu:true}),audit=auditThreeMF(bytes);
  assert(audit.valid,JSON.stringify(audit));
  const meshes=meshSamplers(bytes),terrain=meshes.get('Terreny'),pavement=meshes.get('Camins i carreteres');
  assert(terrain&&pavement);
  const {ground,terrain:{transport}}=model.context;
  const {profiles}=model.provenance.surfaceRoads;
  assert.deepEqual(profiles.map(profile=>profile.featureIds),[[road]]);
  const {width}=transport.find(route=>route.sourceFeatureIds.includes(road));
  const stations=profiles[0].stations.slice(1,-1).filter(({centre})=>inside(centre,width));
  assert(stations.length>25,'El tram de calçada és massa curt.');
  const discrepancies=[],fills=[],crossfalls=[],midpointCrossfalls=[],seams=[];
  for(const {centre,normal,heightMM} of stations){
    const tops=[-.4,0,.4].map(fraction=>{
      const point=centre.map((v,i)=>v+normal[i]*width*fraction);
      const top=pavement.top(...point),bottom=pavement.bottom(...point),foundation=terrain.top(...point);
      assert([top,bottom,foundation].every(Number.isFinite),`Falta paviment o suport a ${point}: ${[top,bottom,foundation]}.`);
      assert(Math.abs(top-heightMM)<toleranceMM,`La calçada exportada perd la rasant a ${point}.`);
      discrepancies.push(top-ground(...point));
      fills.push(bottom-ground(...point));
      seams.push(Math.abs(bottom-foundation));
      return top;
    });
    crossfalls.push(Math.max(...tops)-Math.min(...tops));
  }
  for(let i=1;i<stations.length;i++){
    const a=stations[i-1],b=stations[i];
    if(b.distanceMM-a.distanceMM>1)continue;
    const tops=[-.4,0,.4].map(fraction=>{
      const point=a.centre.map((v,j)=>(v+b.centre[j]+(a.normal[j]+b.normal[j])*width*fraction)/2);
      return pavement.top(...point);
    });
    assert(tops.every(Number.isFinite),'Falta la superfície entre dues seccions consecutives.');
    midpointCrossfalls.push(Math.max(...tops)-Math.min(...tops));
  }
  const trailErrors=[],trailHeights=[];
  for(const {geometry:{coordinates}} of trails){
    const points=coordinates.map(proj.project);
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],steps=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])));
      for(let j=0;j<steps;j++){
        const point=a.map((v,k)=>v+(b[k]-v)*(j+.5)/steps);
        if(!inside(point,1))continue;
        const z=pavement.top(...point);
        assert(Number.isFinite(z),`Falta un sender exportat a ${point}.`);
        trailHeights.push(z);trailErrors.push(Math.abs(z-ground(...point)));
      }
    }
  }
  const summary={key,centre,sideM,sizeMM,terrainProvider:data.meta.terrain.provider,road,roadClass:carriageway.feature.properties.class,
    paths,roadSections:stations.length,trailSamples:trailErrors.length,maxCrossfallMM:Math.max(...crossfalls),
    maxMidpointCrossfallMM:Math.max(...midpointCrossfalls),
    maxPavementFoundationGapMM:Math.max(...seams),maxCutMM:-Math.min(...discrepancies),maxFillMM:Math.max(0,...fills),
    maxTrailTerrainErrorMM:Math.max(...trailErrors),trailHeightRangeMM:Math.max(...trailHeights)-Math.min(...trailHeights),
    parts:audit.parts.map(({name,material,geometry})=>({name,extruder:material.extruder,triangles:geometry.triangles,closed:geometry.closed}))};
  console.log(JSON.stringify(summary));
  assert(trailErrors.length>10&&summary.trailHeightRangeMM>.1,'El sender ha de mostrar un desnivell mesurable.');
  assert(summary.maxCutMM>.1,'La carretera ha de mostrar una excavació mesurable.');
  if(expectFill)assert(summary.maxFillMM>.1,'La carretera ha de mostrar un reblert mesurable.');
  assert(midpointCrossfalls.length&&summary.maxMidpointCrossfallMM<.03,'El pendent transversal entre seccions és excessiu.');
  assert(Math.max(summary.maxCrossfallMM,summary.maxPavementFoundationGapMM,summary.maxTrailTerrainErrorMM)<toleranceMM);
  await writeFile(new URL(`${key}.3mf`,directory),bytes);
  await writeFile(new URL(`${key}-mesures.json`,directory),JSON.stringify(summary,null,2)+'\n');
}
