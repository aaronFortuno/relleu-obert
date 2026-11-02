import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {buildModel} from '../src/geometry.js';
import {physicalBBox} from '../src/selection.js';

const api=await Module();api.setup();
const M=111320,geo=([x,y])=>[x/M,y/M];
const close=(actual,expected,label)=>assert(Math.abs(actual-expected)<.003,`${label}: ${actual} != ${expected}`);
function line(id,points,brunnel){
  return {id,properties:{sourceLayer:'transportation',class:'primary',ref:'C-052',name:'Peer connection control',width:6,...(brunnel?{brunnel}:{})},geometry:{type:'LineString',coordinates:points.map(geo)}};
}
function deck(id,sourceID,a,b,altitude){
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length*3,ny=dx/length*3;
  const coordinates=[[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny]].map(p=>[...geo(p),altitude]);
  return {id,coordinates,faces:[0,1,3,0,3,2],outlines:[[coordinates[1],coordinates[3],coordinates[2],coordinates[0],coordinates[1]]],axis:[geo(a),geo(b)],sourceFeatureIds:[sourceID],roadClass:'primary',ref:'C-052',name:'Peer connection control',estimated:false};
}
function region(features,decks,elevation=()=>100){
  const size=41,step=50,values=new Float32Array(size*size);
  for(let j=0;j<size;j++)for(let i=0;i<size;i++)values[j*size+i]=elevation(-1000+i*step,-1000+j*step);
  return {meta:{name:'RO-052 peer structures',bbox:physicalBBox([0,0],1,1)},localDEM:{width:size,height:size,epsg:4326,affine:[step/M,0,-1000/M,0,step/M,-1000/M],pixelIsArea:false,values,metadata:{}},features,infrastructure:{provider:'Synthetic surveyed tops',items:decks}};
}
const options={size:100,widthMM:100,heightMM:100,resolution:20,exaggeration:1,trees:false,majorRoads:false};
function build(data,extra={}){
  const source=structuredClone(data.infrastructure.items),dem=data.localDEM.values.slice(),model=buildModel(data,{...options,...extra},()=>{},api);
  assert.deepEqual(data.infrastructure.items,source,'surveyed deck XYZ changed');assert(data.localDEM.values.every((v,i)=>v===dem[i]),'source terrain changed');
  assert.equal(model.width,100);assert.equal(model.height,100);close(model.context.scale,.1,'scale');return model;
}
function roadProbe(model){
  const part=model.categories.find(p=>p.id==='roads');assert(part?.faces.length);
  const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});mesh.merge();const solid=new api.Manifold(mesh);
  assert.equal(solid.status(),'NoError');
  return {delete:()=>solid.delete(),top:(x,y)=>{const hits=solid.rayCast([x,y,30],[x,y,-1]);return hits.length?Math.max(...hits.map(h=>h.position[2])):null;}};
}
function insetEdges(section){
  const centre=section.left.map((v,i)=>(v+section.right[i])/2);
  return [section.left,section.right].map(p=>{const length=Math.hypot(centre[0]-p[0],centre[1]-p[1]);return [p[0]+(centre[0]-p[0])/length*.002,p[1]+(centre[1]-p[1])/length*.002,p[2]];});
}

test('a bridge approach lands on its connected peer bridge rather than the terrain below',()=>{
  const a=deck('deck-a','bridge-a',[-300,0],[-100,0],130),b=deck('deck-b','bridge-b',[-100,0],[100,0],120);
  const model=build(region([line('before',[[-500,0],[-300,0]]),line('bridge-a',[[-300,0],[-100,0]],'bridge'),line('bridge-b',[[-100,0],[100,0]],'bridge'),line('after',[[100,0],[450,0]])],[a,b]));
  const bridge=model.context.bridges.find(p=>p.id==='deck-a'),plan=bridge.approaches.plans.find(p=>p.targetFeatureIds?.includes('bridge-b'));
  assert(plan,'the bridge-to-bridge connection was not constructed');close(plan.endZ,7,'peer landing height');
  for(const p of [plan.sections.at(-1).left,plan.sections.at(-1).right]){
    close(p[2],7,'peer landing edge');assert(model.context.ground(p[0],p[1])<5.001,'the control terrain should remain at 5 mm');
  }
  const probe=roadProbe(model);try{for(const p of insetEdges(plan.sections.at(-1)))close(probe.top(p[0],p[1]),7,'actual road material at peer landing');}finally{probe.delete();}
});

test('a crossing bridge with the same route reference is not an interior landing target',()=>{
  const a=deck('deck-a','bridge-a',[-300,0],[-100,0],130),crossing=deck('crossed-deck','crossing', [50,-100],[50,100],200);
  const model=build(region([line('before',[[-500,0],[-300,0]]),line('bridge-a',[[-300,0],[-100,0]],'bridge'),line('surface-after',[[-100,0],[450,0]]),line('crossing',[[50,-100],[50,100]],'bridge')],[a,crossing]));
  const bridge=model.context.bridges.find(p=>p.id==='deck-a'),plan=bridge.approaches.plans.find(p=>p.targetFeatureIds?.includes('surface-after'));
  assert(plan,'the mapped surface continuation was lost');assert(!plan.targetFeatureIds.includes('crossing'));close(plan.endZ,5,'surface landing height');
  for(const section of plan.sections)for(const side of ['left','right'])assert(section[side][2]<=8.003,'the approach jumped up to the 15 mm crossing bridge');
  const end=plan.sections.at(-1),centre=end.left.map((v,i)=>(v+end.right[i])/2);assert(centre[0]>55.5,'the control must extend beyond the interior crossing');
  const probe=roadProbe(model);try{close(probe.top(centre[0],centre[1]),5,'actual road material after crossing');}finally{probe.delete();}
});

test('a direct bridge-to-tunnel connection retains both pavement edges and source deck XYZ',()=>{
  const a=deck('direct-deck','bridge-direct',[-100,0],[100,0],103),elevation=x=>x>=100&&x<=300?100+60*(1-Math.abs(x-200)/100):100;
  const model=build(region([line('before',[[-450,0],[-100,0]]),line('bridge-direct',[[-100,0],[100,0]],'bridge'),line('tunnel-direct',[[100,0],[200,0],[300,0]],'tunnel'),line('after',[[300,0],[450,0]])],[a],elevation),{estimatedTunnels:true});
  assert.equal(model.provenance.tunnels.applied,true,model.warnings.join(' '));
  const tunnel=model.provenance.tunnels.profiles.find(p=>p.sourceFeatureIds.includes('tunnel-direct'));assert(tunnel);
  const mouth=tunnel.portalConnections.find(p=>p.targetFeatureIds?.includes('bridge-direct'));assert(mouth,'the mouth did not retain its mapped bridge identity');
  assert.equal(mouth.routing,'mapped');close(mouth.widthMM,.6,'mouth pavement width');
  for(const p of [mouth.left,mouth.right])close(p[2],5.3,'portal edge must meet the measured bridge top');
  const bridge=model.context.bridges.find(p=>p.id==='direct-deck'),plan=bridge.approaches.plans.find(p=>p.targetFeatureIds?.includes('tunnel-direct'));
  assert(plan,'the direct bridge-to-tunnel approach was not constructed');
  const junction=model.context.proj.project(geo([100,0])),probe=roadProbe(model);
  try{
    for(const offset of [-.28,0,.28]){
      const values=[-.025,0,.025].map(dx=>probe.top(junction[0]+dx,junction[1]+offset));
      assert(values.every(v=>v!=null),'road material disappears at the direct structural junction');
      assert(Math.max(...values)-Math.min(...values)<.015,`step at the bridge/tunnel junction: ${values}`);
    }
    for(const p of insetEdges(mouth))close(probe.top(p[0],p[1]),p[2],'actual road material at tunnel mouth');
  }finally{probe.delete();}
});
