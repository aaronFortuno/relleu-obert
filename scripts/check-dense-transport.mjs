import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {freemem} from 'node:os';
import {createHash} from 'node:crypto';
import Module from 'manifold-3d';
import {strFromU8,unzipSync} from 'fflate';
import {buildModel} from '../src/geometry.js';
import {physicalBBox,selectionPose} from '../src/selection.js';
import {compatibleTransport} from '../src/transport-network.js';
import {followsTerrain} from '../src/transport-width.js';
import {planSurfaceRoad} from '../src/surface-road.js';
import {threeMF} from '../src/export.js';
import {auditModel} from '../src/solid-audit.js';
import {auditThreeMF} from '../src/three-mf-audit.js';

const mode=process.argv[2]??'regional';
assert(['regional','independent'].includes(mode),'Tria regional o independent.');
const label=process.argv[3];
assert(!label||/^[a-z0-9-]+$/.test(label),'Etiqueta de sortida invàlida.');
const rotationOption=process.argv[4];
assert(!rotationOption||rotationOption==='--gir45','El control admet --gir45.');
const rotation=rotationOption?45:0;
const minimumFreeGiB=rotation?2.2:2.5;
if(freemem()/2**30<minimumFreeGiB)throw Error(`Calen almenys ${minimumFreeGiB.toLocaleString('ca')} GiB lliures per iniciar el control.`);
const filename=rotation?`hospitalet-gir45-1-5000-${mode}`:mode;
const directory=new URL(`../output/hospitalet-xarxa${label?'-'+label:''}/`,import.meta.url);
const source=JSON.parse(await readFile(new URL('../output/hospitalet2-repro/region.json',import.meta.url)));
const tiles=list=>list?.map(({elev,...tile})=>({...tile,elev:Float32Array.from(elev,value=>value??NaN)}));
const centre=[41.35131,2.05543],sideM=rotation?400:550,sizeMM=sideM/5;
const selection=physicalBBox(centre,sideM/1000,sideM/1000);
const pose=rotation?selectionPose(selection,rotation):undefined;
const bbox=pose?.bbox??selection;
assert(bbox[0]>=source.meta.bbox[0]&&bbox[1]>=source.meta.bbox[1]&&bbox[2]<=source.meta.bbox[2]&&bbox[3]<=source.meta.bbox[3]);
const name=rotation?'L’Hospitalet · xarxa viària · gir de 45°':'L’Hospitalet · xarxa viària';
const region={...source,meta:{...source.meta,bbox,name},dem:tiles(source.dem),bridgeDem:tiles(source.bridgeDem),
  terrainRaster:{...source.terrainRaster,values:Float32Array.from(source.terrainRaster.values,value=>value??NaN)}};
const settings={size:sizeMM,widthMM:sizeMM,heightMM:sizeMM,resolution:rotation?28:36,exaggeration:1.5,baseThickness:5,
  ...(pose?{selectionPose:pose}:{}),
  surfaceRoads:mode,streams:true,streamWidth:1,estimatedTunnels:true,majorRoads:true,smoothProfiles:true,
  buildingMode:'limited',maxBuildingHeight:5,trees:false};
const api=await Module();api.setup();
const started=performance.now();
const model=buildModel(region,settings,()=>{},api);
const milliseconds=Math.round(performance.now()-started);
const audit=auditModel(model);
const {terrain,bridges,ground,proj}=model.context;
const {surfaceRoads,majorRoads,infrastructure,tunnels}=model.provenance;
const inside=([x,y])=>x>0&&x<proj.width&&y>0&&y<proj.height;
const delta=(a,b)=>[b[0]-a[0],b[1]-a[1]];
const cross=([x,y],[u,v])=>x*v-y*u;
const distance=(a,b)=>Math.hypot(...delta(a,b));
const roadKey=route=>[route.class,route.railway,route.brunnel,route.sourceFeatureIds.join(','),JSON.stringify(route.points)].join('|');
const routes=[...new Map(terrain.transport.map(route=>[roadKey(route),route])).values()];

function crossingPoints(a,b){
  const hits=[];
  for(let i=1;i<a.length;i++)for(let j=1;j<b.length;j++){
    const u=delta(a[i-1],a[i]),v=delta(b[j-1],b[j]),det=cross(u,v);
    if(Math.abs(det)<1e-8)continue;
    const d=delta(a[i-1],b[j-1]),t=cross(d,v)/det,s=cross(d,u)/det;
    if(t< -1e-6||t>1+1e-6||s< -1e-6||s>1+1e-6)continue;
    const point=a[i-1].map((p,k)=>p+t*u[k]);
    if([a[0],a.at(-1),b[0],b.at(-1)].some(p=>distance(p,point)<.01))continue;
    if(inside(point)&&!hits.some(p=>distance(p,point)<.01))hits.push(point);
  }
  return hits;
}

const decks=terrain.deckItems.filter(deck=>deck.estimated&&!deck.railway&&deck.axis?.length>1);
const candidateRoad=route=>!route.railway&&!route.brunnel&&!followsTerrain(route.properties);
const pilotNetworks=new Map();
function trial(deck){
  const axis=deck.axis.map(proj.project),ends=[axis[0],axis.at(-1)];
  const peers=routes.filter(route=>route.sourceFeatureIds.some(id=>deck.sourceFeatureIds.includes(id)));
  if(!peers.length||peers.every(route=>followsTerrain(route.properties)))return null;
  const crossed=routes.flatMap(route=>{
    if(peers.includes(route))return [];
    const points=crossingPoints(axis,route.points);
    return points.length?[{route,points}]:[];
  });
  if(!crossed.length)return null;
  const upper={...peers[0],points:axis,width:deck.widthMetres*proj.scale,sourceFeatureIds:deck.sourceFeatureIds};
  const approaches=ends.map(end=>routes.filter(route=>!peers.includes(route)&&candidateRoad(route)&&compatibleTransport(upper,route)&&
    [route.points[0],route.points.at(-1)].some(p=>distance(p,end)<1e-5)));
  const mixed=crossed.map(({route,points})=>({ids:route.sourceFeatureIds,class:route.class,ramp:!!route.properties.ramp,railway:route.railway,
    structure:route.brunnel,path:followsTerrain(route.properties),points:points.map(p=>proj.unproject(p))}));
  const report={id:deck.id,ids:deck.sourceFeatureIds,ramp:!!deck.ramp,approaches:approaches.map(list=>list.map(route=>route.sourceFeatureIds)),mixed};
  if(crossed.some(({route})=>!candidateRoad(route)))return {...report,status:'protected-neighbour'};
  if(approaches.some(list=>list.length!==1)||approaches[0][0]===approaches[1][0])return {...report,status:'ambiguous-approaches'};
  const network=[upper,approaches[0][0],approaches[1][0],...crossed.map(({route})=>route)];
  try{
    const plan=planSurfaceRoad(network.map(route=>({...route,gradeWindow:Math.max(6,30*proj.scale)})),{...terrain,deckItems:[deck]},0,.65,{crossingFallback:true});
    if(plan.structure)pilotNetworks.set(deck.id,{deck,network});
    return {...report,status:plan.structure?'overpass':'at-grade',minimumClearanceMM:plan.structure?.minimumClearanceMM};
  }catch(error){return {...report,status:'planner-rejected',reason:error.message};}
}

function roadSurfaces(roads,point){
  const pointAt=index=>roads.vertices.subarray(index*3,index*3+3),hits=[];
  for(let i=0;i<roads.faces.length;i+=3){
    const [a,b,c]=Array.from(roads.faces.subarray(i,i+3),pointAt),u=delta(a,b),v=delta(a,c),det=cross(u,v);
    if(Math.abs(det)<1e-10)continue;
    const d=delta(a,point),s=cross(d,v)/det,t=cross(u,d)/det;
    if(s< -1e-6||t< -1e-6||s+t>1.000001)continue;
    const z=a[2]+s*(b[2]-a[2])+t*(c[2]-a[2]),up=det>0;
    if(!hits.some(hit=>hit.up===up&&Math.abs(hit.z-z)<1e-5))hits.push({z,up});
  }
  return hits.sort((a,b)=>a.z-b.z);
}

function measureProbes(){
  const probes=[
    {name:'ramal sobre camí de vianants',bridge:428252022,under:1351597090,coordinate:[2.05429089,41.35260264]},
    {name:'ramal sobre calçada',bridge:1647439892,under:3586195772,coordinate:[2.05656050,41.35261208]},
    {name:'bifurcació al final de tauler',bridge:501496622,under:961983332,coordinate:[2.05243707,41.34892305]}
  ];
  const roads=model.categories.find(part=>part.id==='roads');
  return probes.map(p=>{
    const point=proj.project(p.coordinate),deck=bridges.find(b=>b.sourceFeatureIds?.includes(p.bridge));
    const completion=infrastructure?.completion?.details.find(item=>item.id===deck?.id);
    const [x,y]=point,top=deck?.top(x,y)??null;
    const hits=roadSurfaces(roads,point);
    const bottom=top===null?null:top-deck.thickness;
    const lower=top===null?undefined:hits.filter(hit=>hit.up&&hit.z<top-.01).at(-1);
    return {...p,inCrop:inside(point),deckId:deck?.id,topMM:top,terrainMM:ground(x,y),
      deckClearanceOverTerrainMM:top===null?null:top-deck.thickness-ground(x,y),
      deckClearanceOverRoadMM:lower?bottom-lower.z:null,roadSurfaces:hits,
      joins:completion?.approaches.map(a=>a.targetFeatureIds),missed:completion?.unconnectedEnds,
      unsupportedSpans:completion?.unsupportedSpans.length};
  });
}

const visible=routes.filter(route=>route.points.some(inside)||crossingPoints(route.points,terrain.rect[0][0]).length);
const counts={mainRoads:0,ramps:0,otherRoads:0,paths:0,railways:0};
for(const route of visible){
  if(route.railway)counts.railways++;
  else if(followsTerrain(route.properties))counts.paths++;
  else if(route.properties.ramp)counts.ramps++;
  else if(route.class==='motorway'||route.class==='trunk')counts.mainRoads++;
  else counts.otherRoads++;
}
const trials=decks.map(trial).filter(Boolean),completion=infrastructure?.completion?.details??[];
const report={mode,centre,sideM,sizeMM,rotation,scale:1000/proj.scale,settings,milliseconds,counts,
  terrain:region.meta.terrain?.provider,triangles:audit.triangles,parts:audit.parts.map(({name,triangles,closed,errors})=>({name,triangles,closed,errors})),
  pavement:{coverage:surfaceRoads?.coverage,fragments:surfaceRoads?.accepted,omissions:surfaceRoads?.omissionCounts},
  major:{applied:majorRoads?.count,attempted:majorRoads?.attempted,error:majorRoads?.error,recoveryPass:majorRoads?.recoveryPass,omissions:majorRoads?.omissions,
    replacement:majorRoads?.materialReplacement,profiles:majorRoads?.profiles?.map(({id,sourceFeatureIds,maximumGrade})=>({id,sourceFeatureIds,maximumGrade}))},
  tunnels:tunnels?.profiles?.length??0,
  bridges:{mapped:completion.filter(d=>!d.mainRoad).length,joins:completion.filter(d=>!d.mainRoad).reduce((n,d)=>n+d.approaches.length,0),
    missed:completion.filter(d=>!d.mainRoad).reduce((n,d)=>n+d.unconnectedEnds.length,0),unsupported:completion.filter(d=>d.unsupportedSpans.length).map(d=>d.id)},
  probes:measureProbes(),pilot:trials};
await mkdir(directory,{recursive:true});
if(!audit.valid)await writeFile(new URL(`${filename}.json`,directory),JSON.stringify(report,null,2)+'\n');
assert(audit.valid,JSON.stringify(report.parts));
const bytes=threeMF(model,{bambu:true});
const xml=strFromU8(unzipSync(bytes)['3D/3dmodel.model']);
const resources=xml.indexOf('<resources>');
assert(resources>=0);
report.geometryHash=createHash('sha256').update(xml.slice(resources)).digest('hex');
await writeFile(new URL(`${filename}.json`,directory),JSON.stringify(report,null,2)+'\n');
await writeFile(new URL(`${filename}.3mf`,directory),bytes);
console.log(JSON.stringify({mode,milliseconds,counts,triangles:audit.triangles,pavement:report.pavement,bridges:report.bridges,
  majorProfiles:report.major.applied,materialReplacement:report.major.replacement,majorError:report.major.error,
  pilot:trials.reduce((out,t)=>({...out,[t.status]:(out[t.status]??0)+1}),{})}));

if(mode==='regional'&&!rotation){
  const target=trials.find(item=>item.ids.includes(1647439892));
  const {deck,network}=pilotNetworks.get(target?.id)??{};
  assert(network,'El cupó de dues calçades inferiors ha de superar la planificació local.');
  const features=network.map(route=>({type:'Feature',id:route.sourceFeatureIds[0],properties:route.properties,
    geometry:{type:'LineString',coordinates:route.points.map(proj.unproject)}}));
  features.push(...region.features.filter(f=>['water','waterway'].includes(f.properties.sourceLayer)));
  const detail=buildModel({...region,features,bridgeFeatures:[],incompleteBridgeIds:[],infrastructure:{items:[deck]}},
    {...settings,surfaceRoads:'crossing-coupon',estimatedTunnels:false,majorRoads:false,buildingMode:'none'},()=>{},api);
  const detailAudit=auditModel(detail),plan=detail.provenance.surfaceRoads;
  assert(detailAudit.valid,JSON.stringify(detailAudit.parts.map(p=>[p.name,p.errors])));
  assert(plan.bridge?.minimumClearanceMM>=.8);
  const pavement=detail.categories.find(part=>part.id==='roads');
  const lowerClearances=target.mixed.map(({points})=>points.map(point=>{
    const hits=roadSurfaces(pavement,detail.context.proj.project(point));
    assert(hits.length===4&&!hits[0].up&&hits[1].up&&!hits[2].up&&hits[3].up,'Falta un nivell de calçada al cupó de detall.');
    return hits[2].z-hits[1].z;
  }));
  assert(lowerClearances.flat().every(value=>value>=.8));
  const upper=plan.profiles.find(profile=>profile.bridgeIntervalMM);
  const steps=upper.bridgeIntervalMM.flatMap(end=>{
    const {centre,normal}=upper.stations.find(station=>Math.abs(station.distanceMM-end)<1e-6);
    const tangent=[normal[1],-normal[0]],width=network[0].width;
    return [-.35,0,.35].map(across=>{
      const heights=[-.04,-.02,.02,.04].map(offset=>{
        const point=centre.map((value,i)=>value+normal[i]*width*across+tangent[i]*offset);
        return roadSurfaces(pavement,point).filter(hit=>hit.up).at(-1)?.z;
      });
      assert(heights.every(Number.isFinite),'Falta calçada en un enllaç del tauler.');
      return Math.abs(2*heights[1]-heights[0]-(2*heights[2]-heights[3]));
    });
  });
  const maxStepMM=Math.max(...steps);
  assert(maxStepMM<.005,`Graó a l’enllaç del tauler: ${maxStepMM} mm.`);
  const measurement={id:target.id,bridge:target.ids,lower:target.mixed.map(route=>route.ids),
    clearanceMM:plan.bridge.minimumClearanceMM,lowerClearances,maxStepMM,triangles:detailAudit.triangles};
  const detailBytes=threeMF(detail,{bambu:true}),exportAudit=auditThreeMF(detailBytes);
  assert(exportAudit.valid,JSON.stringify(exportAudit));
  await writeFile(new URL('ramal-dues-calcades.json',directory),JSON.stringify(measurement,null,2)+'\n');
  await writeFile(new URL('ramal-dues-calcades.3mf',directory),detailBytes);
  console.log(JSON.stringify(measurement));
}
