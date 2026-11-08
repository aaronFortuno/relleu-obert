import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {unzipSync,strFromU8} from 'fflate';
import {buildModel,updateBuildings,updateTransport} from '../src/geometry.js';
import {threeMF} from '../src/export.js';
import {physicalBBox,selectionPose} from '../src/selection.js';

const api=await Module();api.setup();
const M=111320,geo=(x,y=0)=>[x/M,y/M];
const close=(actual,expected,tolerance,label)=>assert(Math.abs(actual-expected)<=tolerance,`${label}: ${actual} != ${expected}`);
const width=section=>Math.hypot(section.left[0]-section.right[0],section.left[1]-section.right[1]);
const centre=section=>section.left.map((v,i)=>(v+section.right[i])/2);

function chain(){
  const size=41,step=50,values=new Float32Array(size*size);
  const height=x=>x>=-300&&x<=-100?20*Math.abs(x+200)/100:x>=100&&x<=300?20+60*(1-Math.abs(x-200)/100):20;
  for(let j=0;j<size;j++)for(let i=0;i<size;i++)values[j*size+i]=height(-1000+i*step);
  const line=(id,xs,brunnel)=>({type:'Feature',id,properties:{sourceLayer:'transportation',class:'primary',ref:'C-052',name:'Continuity control',width:6,...(brunnel?{brunnel}:{})},geometry:{type:'LineString',coordinates:xs.map(x=>geo(x))}});
  const coordinates=[[-300,3],[-300,-3],[-100,3],[-100,-3]].map(([x,y])=>[...geo(x,y),25]);
  const deck={id:'surveyed-control',coordinates,faces:[0,1,3,0,3,2],outlines:[[coordinates[1],coordinates[3],coordinates[2],coordinates[0],coordinates[1]]],axis:[geo(-300),geo(-100)],sourceFeatureIds:['bridge'],roadClass:'primary',ref:'C-052',name:'Continuity control',estimated:false};
  return {meta:{name:'RO-052 connected surface, bridge and tunnel',bbox:physicalBBox([0,0],1,1)},
    localDEM:{width:size,height:size,epsg:4326,affine:[step/M,0,-1000/M,0,step/M,-1000/M],pixelIsArea:false,values,metadata:{}},
    infrastructure:{provider:'Synthetic measured-top control',items:[deck]},
    features:[line('before',[-450,-300]),line('bridge',[-300,-100],'bridge'),line('between',[-100,100]),line('tunnel',[100,200,300],'tunnel'),line('after',[300,450])]};
}

test('initial build streams relief, roads and buildings without changing final geometry',()=>{
  const data=chain();
  const polygon=(id,sourceLayer,x,y,w)=>({id,properties:{sourceLayer,class:'grass',render_height:7},
    geometry:{type:'Polygon',coordinates:[[[x,y],[x+w,y],[x+w,y+w],[x,y+w],[x,y]].map(([x,y])=>geo(x,y))]}});
  data.features.push(polygon('green','landcover',-400,100,200),polygon('house','building',200,200,20));
  const events=[],observer={
    stage:(stage,message,completed,total)=>events.push({stage,message,completed,total}),
    parts:(stage,parts,dimensions,mode='replace')=>events.push({stage,mode,ids:parts.filter(p=>p.faces.length).map(p=>p.id),width:dimensions.width})
  };
  const options={size:100,resolution:12,trees:true};
  const model=buildModel(data,options,()=>{},api,null,observer);
  const plain=buildModel(data,options,()=>{},api);
  const frames=events.filter(e=>e.ids);
  assert.deepEqual([...new Set(events.map(e=>e.stage))],['terrain','transport','buildings','vegetation']);
  assert(frames[0].ids.includes('terrain')&&!frames[0].ids.includes('roads'));
  assert(frames.some(e=>e.stage==='transport'&&e.ids.includes('roads')));
  assert(frames.some(e=>e.stage==='buildings'&&e.mode==='append'&&e.ids.includes('buildings')));
  assert(frames.some(e=>e.stage==='vegetation'&&e.mode==='append'&&e.ids.includes('trees')));
  assert(events.some(e=>e.stage==='buildings'&&e.completed===1&&e.total===1));
  assert.deepEqual(model.categories.map(p=>p.id),plain.categories.map(p=>p.id));
  for(const [index,part] of model.categories.entries()){
    const expected=plain.categories[index];
    assert(part.faces.length===expected.faces.length&&part.faces.every((v,i)=>v===expected.faces[i]),part.id+' faces changed');
    assert(part.vertices.length===expected.vertices.length&&part.vertices.every((v,i)=>v===expected.vertices[i]),part.id+' vertices changed');
  }
});

test('a defective bridge mesh and a malformed line preserve the other transport and terrain',()=>{
  const data=chain(),[valid]=data.infrastructure.items;
  data.infrastructure.items.unshift({...valid,id:'invalid-deck',faces:[-1,1,2]});
  data.features.push({...data.features[0],id:'invalid-way',geometry:{type:'LineString',coordinates:[geo(0),null]}});
  const model=buildModel(data,{size:100,resolution:12,trees:false},()=>{},api);
  assert.deepEqual(model.context.bridges.map(b=>b.id),[valid.id]);
  assert(model.categories.find(p=>p.id==='roads')?.faces.length);
  assert(model.categories.find(p=>p.id==='terrain')?.faces.length);
  assert(model.warnings.some(w=>w.includes('invalid-deck')));
  assert(model.warnings.some(w=>w.includes('invalid-way')));
});

test('transport updates reuse the original substrate and keep painted trees and newer buildings',()=>{
  const data=chain();
  const strokes=[{mode:'add',x:25,y:25,radius:5,density:1,gesture:1}];
  const options={size:100,resolution:12,estimatedTunnels:false,trees:true,strokes};
  const initial=buildModel(data,options,()=>{},api);
  const building={type:'Feature',id:'new-building',properties:{sourceLayer:'building',render_height:5},
    geometry:{type:'Polygon',coordinates:[[[200,200],[215,200],[215,215],[200,215],[200,200]].map(([x,y])=>geo(x,y))]}};
  const edited=updateBuildings(initial,{features:[building]});
  assert(edited.provenance.vegetationBudget.manual>0);
  assert.equal(edited.buildingCount,1);
  const part=(model,id)=>model.categories.find(category=>category.id===id);

  const raised=updateTransport(edited,{roadRise:.5});
  assert.equal(raised.context.ground,edited.context.ground);
  assert.equal(part(raised,'terrain'),part(edited,'terrain'));
  assert.equal(part(raised,'buildings'),part(edited,'buildings'));
  assert.notEqual(part(raised,'roads'),part(edited,'roads'));
  assert.deepEqual(raised.provenance.options.strokes,strokes);
  assert.deepEqual(raised.context.placements,edited.context.placements);

  const opened=updateTransport(raised,{estimatedTunnels:true});
  assert.equal(opened.provenance.tunnels.applied,true);
  assert.equal(opened.context.ground,initial.context.ground);
  const closed=updateTransport(opened,{estimatedTunnels:false,roadRise:0});
  assert.equal(closed.provenance.tunnels.applied??false,false);
  assert.equal(part(closed,'terrain'),part(edited,'terrain'));
  assert.equal(part(closed,'buildings'),part(edited,'buildings'));
  assert.deepEqual(closed.context.placements,edited.context.placements);
  assert.throws(()=>updateTransport(opened,{roadRise:2}),/Relleu dels camins/);
  assert.equal(opened.provenance.tunnels.applied,true);
});

// Read the geometry actually stored in the exported file, including six-place
// coordinate rounding, rather than trusting its metadata or live source arrays.
function exportedMeshes(bytes){
  const files=unzipSync(bytes),xml=strFromU8(files['3D/3dmodel.model']),parts=[];
  assert.match(xml,/<model unit="millimeter"/);
  for(const mesh of xml.matchAll(/<mesh><vertices>([\s\S]*?)<\/vertices><triangles>([\s\S]*?)<\/triangles><\/mesh>/g)){
    const vertices=[],faces=[];
    for(const p of mesh[1].matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g))vertices.push(Number(p[1]),Number(p[2]),Number(p[3]));
    for(const p of mesh[2].matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"[^>]*\/>/g))faces.push(Number(p[1]),Number(p[2]),Number(p[3]));
    parts.push({vertices:new Float32Array(vertices),faces:new Uint32Array(faces)});
  }
  return parts;
}

function pavementProbe(part,label){
  assert(part?.faces.length,`${label}: road material missing`);
  const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});mesh.merge();
  const solid=new api.Manifold(mesh);assert.equal(solid.status(),'NoError',`${label}: road mesh is invalid`);
  return {delete:()=>solid.delete(),top:([x,y])=>{
    const hits=solid.rayCast([x,y,100],[x,y,-1]);
    return hits.length?Math.max(...hits.map(hit=>hit.position[2])):null;
  }};
}

function checkStrip(probe,p,tangent,expectedZ,label){
  const normal=[-tangent[1],tangent[0]];
  // Six real metres at scale 0.1 give 0.6 mm of PAVEMENT. Probe just inside
  // both sides, then outside. A wider bore must not create a wider road.
  for(const offset of [-.28,0,.28]){
    const q=[p[0]+normal[0]*offset,p[1]+normal[1]*offset],z=probe.top(q);
    assert.notEqual(z,null,`${label}: gap inside carriageway at offset ${offset}`);
    close(z,expectedZ(q,offset),.003,`${label}: surface height at offset ${offset}`);
  }
  for(const offset of [-.34,.34]){
    const q=[p[0]+normal[0]*offset,p[1]+normal[1]*offset],z=probe.top(q);
    assert(z==null||z<expectedZ(q,offset)-.05,`${label}: road widens beyond 0.6 mm at ${offset}`);
  }
}

function checkSeam(probe,section,tangent,label){
  const p=centre(section),normal=[-tangent[1],tangent[0]];
  for(const offset of [-.28,0,.28]){
    const q=[p[0]+normal[0]*offset,p[1]+normal[1]*offset];
    const before=probe.top([q[0]-tangent[0]*.025,q[1]-tangent[1]*.025]);
    const on=probe.top(q),after=probe.top([q[0]+tangent[0]*.025,q[1]+tangent[1]*.025]);
    assert(before!=null&&on!=null&&after!=null,`${label}: pavement disappears at a seam`);
    assert(Math.abs(before-on)<.01&&Math.abs(after-on)<.01,`${label}: step at seam (${before}, ${on}, ${after})`);
  }
}

function verify(model,data,physical,label){
  assert.equal(model.width,physical.widthMM);assert.equal(model.height,physical.heightMM);
  close(model.context.scale,.1,1e-10,`${label}: geographic scale changed`);
  assert.equal(model.scale,10000);
  assert.equal(model.provenance.tunnels.applied,true,`${label}: tunnel was not carved`);
  assert.equal(model.provenance.tunnels.count,1);
  const tunnel=model.provenance.tunnels.profiles.find(p=>p.sourceFeatureIds.includes('tunnel'));assert(tunnel);
  close(tunnel.carriagewayWidthMM,.6,1e-9,`${label}: tunnel carriageway`);
  close(tunnel.widthMM,1.2,1e-9,`${label}: minimum bore width`);
  assert.equal(tunnel.portalConnections.length,2);
  for(const portal of tunnel.portalConnections){
    close(width(portal),.6,.0002,`${label}: portal pavement width`);
    assert.equal(portal.routing,'mapped',`${label}: portal ignored its mapped road`);
    for(const side of ['left','right'])close(portal[side][2],model.context.ground(portal[side][0],portal[side][1]),.0002,`${label}: portal ${side} does not meet the exterior`);
  }
  const bridge=model.context.bridges.find(p=>p.id==='surveyed-control');assert(bridge);
  assert.equal(bridge.approaches.plans.length,2,`${label}: both bridge abutments need an approach`);
  for(const plan of bridge.approaches.plans){
    for(const section of plan.sections)close(width(section),.6,.0002,`${label}: bridge approach pavement width`);
    for(const side of ['left','right']){
      const start=plan.sections[0][side],end=plan.sections.at(-1)[side];
      close(start[2],bridge.top(start[0],start[1]),.0002,`${label}: approach/deck ${side}`);
      close(end[2],model.context.ground(end[0],end[1]),.0002,`${label}: approach/surface ${side}`);
    }
  }
  for(const part of model.categories)for(let i=0;i<part.vertices.length;i+=3){
    assert(part.vertices[i]>=-.001&&part.vertices[i]<=physical.widthMM+.001,`${label}: geometry outside physical width`);
    assert(part.vertices[i+1]>=-.001&&part.vertices[i+1]<=physical.heightMM+.001,`${label}: geometry outside physical height`);
  }
  const exported=exportedMeshes(threeMF(model,{bambu:true}));assert.equal(exported.length,model.parts.length);
  const exportedRoads=exported[model.parts.findIndex(p=>p.id==='built')];
  const live=pavementProbe(model.categories.find(p=>p.id==='roads'),`${label}/live`),saved=pavementProbe(exportedRoads,`${label}/3mf`);
  const a=model.context.proj.project(geo(0)),b=model.context.proj.project(geo(10)),d=Math.hypot(b[0]-a[0],b[1]-a[1]),tangent=[(b[0]-a[0])/d,(b[1]-a[1])/d];
  try{
    for(const [kind,probe]of [['live',live],['3mf',saved]]){
      for(const x of [-400,0,400]){
        const p=model.context.proj.project(geo(x));
        checkStrip(probe,p,tangent,q=>model.context.ground(...q),`${label}/${kind}/surface ${x}`);
      }
      const p=model.context.proj.project(geo(-200));
      checkStrip(probe,p,tangent,q=>bridge.top(...q),`${label}/${kind}/bridge`);
      const interior=tunnel.pathMM.find(q=>Math.hypot(q[0]-model.context.proj.project(geo(200))[0],q[1]-model.context.proj.project(geo(200))[1])<.001);assert(interior);
      checkStrip(probe,interior,tangent,()=>interior[2],`${label}/${kind}/tunnel`);
      for(const portal of tunnel.portalConnections){
        checkSeam(probe,portal,tangent,`${label}/${kind}/portal ${portal.end}`);
        const p=centre(portal);
        checkStrip(probe,p,tangent,q=>model.context.ground(...q),`${label}/${kind}/portal ${portal.end}`);
      }
      for(const plan of bridge.approaches.plans){
        checkSeam(probe,plan.sections[0],tangent,`${label}/${kind}/approach-deck`);
        checkSeam(probe,plan.sections.at(-1),tangent,`${label}/${kind}/approach-surface`);
      }
    }
  }finally{live.delete();saved.delete();}
}

for(const [label,widthMM,heightMM,rotation]of [['square',100,100,0],['rotated rectangle',100,120,25]])test(`one carriageway stays continuous through bridge and tunnel, also in 3MF: ${label}`,()=>{
  const data=chain(),before=data.localDEM.values.slice(),deck=structuredClone(data.infrastructure.items[0]);
  const pose=selectionPose(physicalBBox([0,0],widthMM/100,heightMM/100),rotation),physical={size:widthMM,widthMM,heightMM,selectionPose:pose};
  data.meta.bbox=pose.bbox;
  const model=buildModel(data,{...physical,resolution:20,exaggeration:1,trees:false,estimatedTunnels:true,majorRoads:false},()=>{},api);
  verify(model,data,physical,label);
  assert(data.localDEM.values.every((v,i)=>v===before[i]),'source DEM changed');
  assert.deepEqual(data.infrastructure.items[0],deck,'surveyed deck was altered');
});

test('a principal road cuts and fills without introducing steps at a bridge or tunnel',()=>{
  const data=chain(),{values,width}=data.localDEM;
  for(let y=0;y<width;y++){
    values[y*width+12]+=20+(y-20)*2; // x = -400 m, crest on a side slope
    values[y*width+28]-=8;  // x = 400 m, hollow after the tunnel
  }
  const model=buildModel(data,{size:100,resolution:20,exaggeration:1,trees:false,estimatedTunnels:true,
    majorRoads:true,surfaceRoads:'grade-first'},()=>{},api);
  const {majorRoads,tunnels}=model.provenance;
  assert.equal(majorRoads.count,3,JSON.stringify(majorRoads.omissions));
  assert.equal(tunnels.count,1,model.warnings.join(' '));
  const bridge=model.context.bridges.find(b=>b.id==='surveyed-control');
  assert.equal(bridge.approaches.plans.length,2,JSON.stringify(bridge.approaches.missed));
  const probe=pavementProbe(model.categories.find(p=>p.id==='roads'),'grade-first');
  const point=x=>model.context.proj.project(geo(x));
  try{
    const cut=point(-400),fill=point(400);
    assert(probe.top(cut)<model.context.ground(...cut)-1);
    assert(probe.top(fill)>model.context.ground(...fill)+.5);
    for(const p of [cut,fill]){
      checkStrip(probe,p,[1,0],()=>probe.top(p),'grade-first transverse section');
      const [x,y]=p,z=probe.top(p);
      close(probe.top([x-1,y])+probe.top([x+1,y]),2*z,.003,'linear grade through DEM crest or hollow');
    }
    for(const approach of bridge.approaches.plans){
      checkSeam(probe,approach.sections[0],[1,0],'grade-first deck');
      checkSeam(probe,approach.sections.at(-1),[1,0],'grade-first surface landing');
    }
    for(const portal of tunnels.profiles[0].portalConnections)checkSeam(probe,portal,[1,0],'grade-first tunnel portal');
  }finally{probe.delete();}
});
