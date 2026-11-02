import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {archedTunnelVoid,parabolicTunnelSection,tunnelVoid} from '../src/infrastructure-solids.js';
import {tunnelPavements,clipTunnelPavements} from '../src/tunnel-pavement.js';
import {carveTerrainTunnels} from '../src/tunnel-operations.js';
import {auditPart,partComponents,signedVolume} from '../src/solid-audit.js';
import {generateProceduralTunnelVoids} from '../src/procedural-tunnels.js';
const api=await Module();api.setup();
function box(id,x0=0,x1=100,z0=0,z1=20){return {id,name:id,color:'#123456',vertices:new Float32Array([x0,0,z0,x1,0,z0,x1,80,z0,x0,80,z0,x0,0,z1,x1,0,z1,x1,80,z1,x0,80,z1]),faces:new Uint32Array([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,2,3,7,2,7,6,0,4,7,0,7,3,1,2,6,1,6,5])};}
function tunnel(category='roads',path=[[-1,40,5],[101,40,7]],id='test'){
  return {id,...archedTunnelVoid(path,8,6),path,widthMM:8,heightMM:6,sectionProfile:'estimated-parabolic-arch',sectionMM:parabolicTunnelSection(8,6),pavementCategory:category,pavementThicknessMM:.3,minimumBaseMM:2.5};
}
function solid(p){const mesh=new api.Mesh({numProp:3,vertProperties:p.vertices,triVerts:p.faces});mesh.merge();return new api.Manifold(mesh);}
function hits(parts,a,b){let count=0;for(const p of parts){if(!p.faces.length)continue;const s=solid(p);try{count+=s.rayCast(a,b).length;}finally{s.delete();}}return count;}
function overlap(a,b){const A=solid(a),B=solid(b);let common;try{common=A.intersect(B);assert.equal(common.status(),'NoError');return common.volume();}finally{common?.delete();A.delete();B.delete();}}
function allocationTracker(){
  const live=new Set(),Native=api.Manifold;let created=0;
  const track=s=>{created++;live.add(s);const remove=s.delete.bind(s);s.delete=()=>{assert(live.delete(s),'temporary solid deleted twice');remove();};return s;};
  const engine={...api,Manifold:new Proxy(Native,{construct(Target,args){return track(new Target(...args));},get(Target,key){if(key==='union')return (...args)=>track(Target.union(...args));return Reflect.get(Target,key);}})};
  return {engine,get created(){return created;},get live(){return live.size;}};
}

test('procedural estimates declare the actual parabola, pavement category and base allowance',()=>{
  const projection={width:100,height:80,scale:.1,project:([x,y])=>[x*10000,y*10000]},options={enabled:true,projection,ground:()=>20,verticalReference:{originMeters:100,minimumSurfaceMM:5}};
  const feature=cls=>({id:cls,properties:{sourceLayer:'transportation',brunnel:'tunnel',class:cls},geometry:{type:'LineString',coordinates:[[-.0001,.004],[.0101,.004]]}});
  for(const [cls,category]of [['trunk','roads'],['rail','railways']]){
    const generated=generateProceduralTunnelVoids([feature(cls)],()=>100,options);assert.equal(generated.items.length,1,generated.warnings.join(' '));
    const item=generated.items[0];assert.equal(generated.metadata.section,'estimated-parabolic-arch');assert.equal(item.sectionProfile,generated.metadata.section);
    assert.deepEqual(item.sectionMM,parabolicTunnelSection(item.widthMM,item.heightMM));assert.equal(item.pavementCategory,category);assert.equal(item.pavementThicknessMM,.3);assert.equal(item.minimumBaseMM,2.5);
    assert.deepEqual(auditPart(item).errors,[]);
  }
  const low=generateProceduralTunnelVoids([feature('trunk')],()=>100,{...options,verticalReference:{originMeters:100,minimumSurfaceMM:2.9}});
  assert.equal(low.items.length,0);assert.match(low.warnings[0],/paviment.*base/);
});
test('parabolic cutter keeps the analytical rectangular API and a closed rising curved section',()=>{
  const section=parabolicTunnelSection(8,6);assert.equal(section.length,19);
  assert.deepEqual(section[2],[4,3.3000000000000003]);assert.deepEqual(section[10],[0,6]);
  for(const path of [[[-1,40,5],[101,40,7]],[[-1,20,5],[40,20,6],[70,45,6.5],[101,45,7]]]){
    const t=tunnel('roads',path),p=tunnelPavements([t])[0];
    for(const part of [t,p]){assert.deepEqual(auditPart(part).errors,[]);const s=solid(part);try{assert.equal(s.status(),'NoError');assert(s.volume()>0);}finally{s.delete();}}
    for(let i=0;i<path.length;i++){
      const n=section.length,roof=t.vertices[(i*n+10)*3+2];assert(Math.abs(roof-path[i][2]-6)<1e-5);
      for(let k=0;k<4;k++)assert(Math.abs(p.vertices[(i*4+k)*3+2]-(path[i][2]+(k<2?-.3:0)))<1e-5);
    }
  }
  const rectangular=solid(tunnelVoid([[0,0,5],[100,0,7]],8,6));try{assert.equal(rectangular.volume(),4800);}finally{rectangular.delete();}
  for(const segments of [7,9,34])assert.throws(()=>parabolicTunnelSection(8,6,{segments}),/invàlida/);
});

test('raycasts verify crown, lower lateral clearance and rising road pavement without colour overlaps',()=>{
  const source=[box('terrain',0,50),box('forest',50,100),{...box('roads',150,160),color:'#987654'}],before=structuredClone(source),t=tunnel();
  const result=carveTerrainTunnels(source,[t],api);assert.equal(result.metadata.applied,true,result.warnings.join(' '));assert.deepEqual(source,before);
  const floor=result.parts.find(p=>p.id==='roads');assert.equal(floor.color,'#987654');
  // A ray follows the slope all the way from outside the first portal to
  // outside the last. The crown is open higher than the lateral shoulders.
  const ray=(across,height)=>hits(result.parts,[-2,40+across,5-2/102+height*6],[102,40+across,7+2/102+height*6]);
  assert.equal(ray(0,.9),0);assert.equal(ray(3.2,.6),0);assert(ray(3.2,.85)>0);assert(ray(0,.01)===0);
  assert(hits([floor],[50,40,5.6],[50,40,6.1])>0,'road material must occupy the floor');
  for(const p of result.parts){assert.deepEqual(auditPart(p).errors,[]);if(p.id!=='roads')assert(overlap(p,floor)<1e-6);}
  // The replaced pavement is wholly above the unchanged 2.5 mm base.
  for(const p of result.parts){const s=solid(p);let base;try{
    base=s.trimByPlane([0,0,-1],-2.5);const expected=(p.id==='roads'?10:50)*80*2.5;assert(Math.abs(base.volume()-expected)<.01);
  }finally{base?.delete();s.delete();}}
  assert.equal(result.metadata.profiles[0].sectionProfile,'estimated-parabolic-arch');assert.equal(result.metadata.profiles[0].pavementCategory,'roads');
});

test('pavement clipping preserves model bounds and railway priority at an overlapping estimated floor',()=>{
  const result=carveTerrainTunnels([box('terrain')],[tunnel('roads'),tunnel('railways',undefined,'rail')],api);
  assert.equal(result.metadata.applied,true,result.warnings.join(' '));
  const rail=result.parts.find(p=>p.id==='railways'),road=result.parts.find(p=>p.id==='roads');assert(rail?.faces.length);assert(!road?.faces.length);
  assert.equal(result.metadata.profiles[1].pavementCategory,'railways');
  for(let i=0;i<rail.vertices.length;i+=3){assert(rail.vertices[i]>=-1e-5&&rail.vertices[i]<=100.00001);assert(rail.vertices[i+1]>=0&&rail.vertices[i+1]<=80);}
  assert(overlap(result.parts.find(p=>p.id==='terrain'),rail)<1e-6);
});

test('a pavement never seals the free opening of another tunnel at a nearby elevation',()=>{
  const upper=tunnel('roads',[[-1,40,5],[101,40,5]],'upper'),lower=tunnel('railways',[[-1,40,4.8],[101,40,4.8]],'lower');
  const result=carveTerrainTunnels([box('terrain')],[upper,lower],api);assert.equal(result.metadata.applied,true,result.warnings.join(' '));
  assert.equal(hits(result.parts,[-2,40,4.9],[102,40,4.9]),0,'the upper floor must not obstruct the lower opening');
  for(const p of result.parts){assert.deepEqual(auditPart(p).errors,[]);assert(overlap(p,lower)<1e-6,'material enters the lower free opening');}
});

test('a closed interior cavity retains its inward shell and floor material without reimporting Boolean components',()=>{
  const t=tunnel('roads',[[20,40,5],[80,40,5]],'closed-interior'),source=[box('terrain')],result=carveTerrainTunnels(source,[t],api);
  assert.equal(result.metadata.applied,true,result.warnings.join(' '));assert.equal(result.metadata.materialization,'single-final-float32-per-material');
  const terrain=result.parts.find(p=>p.id==='terrain'),road=result.parts.find(p=>p.id==='roads'),cutter=solid(t);
  try{
    const total=result.parts.reduce((sum,p)=>sum+signedVolume(p.vertices,p.faces),0);
    assert(Math.abs(total-(160000-cutter.volume()))<.01,'the only lost total volume must be the actual cavity');
  }finally{cutter.delete();}
  const shellVolumes=partComponents(terrain.faces).map(c=>signedVolume(terrain.vertices,new Uint32Array(c.flatMap(i=>Array.from(terrain.faces.subarray(i*3,i*3+3))))));
  assert(shellVolumes.some(v=>v<0),'the enclosed cavity needs its original inward-oriented shell');
  assert(Math.abs(signedVolume(road.vertices,road.faces)-144)<.001,'the floor volume must remain assigned to roads');
  assert(overlap(terrain,road)<1e-6);assert.equal(hits(result.parts,[30,40,8],[70,40,8]),0);assert.equal(hits(result.parts,[10,40,8],[90,40,8]),2);
  assert.equal(hits([road],[50,40,4.6],[50,40,5.1]),2);
  for(const p of result.parts)assert.deepEqual(auditPart(p).errors,[]);
});

test('the native tunnel transaction releases every temporary solid on success and injected Boolean/materialization failures',()=>{
  for(const failure of [null,'subtract','getMesh']){
    const live=new Set(),Native=api.Manifold;let failed=false;
    const track=s=>{
      live.add(s);const remove=s.delete.bind(s);s.delete=()=>{assert(live.delete(s),'temporary solid deleted twice');remove();};
      for(const op of ['intersect','subtract']){const call=s[op].bind(s);s[op]=(...args)=>{
        if(failure===op&&!failed){failed=true;throw Error(`injected ${op}`);}
        return track(call(...args));
      };}
      const decompose=s.decompose.bind(s);s.decompose=()=>decompose().map(track);
      const getMesh=s.getMesh.bind(s);s.getMesh=(...args)=>{if(failure==='getMesh'&&!failed){failed=true;throw Error('injected getMesh');}return getMesh(...args);};
      return s;
    };
    const engine={...api,Manifold:new Proxy(Native,{construct(Target,args){return track(new Target(...args));},get(Target,key){if(key==='union')return (...args)=>track(Target.union(...args));return Reflect.get(Target,key);}})};
    const source=[box('terrain')],before=structuredClone(source),result=carveTerrainTunnels(source,[tunnel()],engine);
    assert.equal(result.metadata.applied,!failure,result.warnings.join(' '));assert.equal(live.size,0,`temporary solid leak after ${failure??'success'}`);assert.deepEqual(source,before);
    if(failure){assert(failed);assert.strictEqual(result.parts,source);assert.match(result.warnings[0],/injected/);}
  }
});

test('aggregate substrate budgets reject the exceeding category before allocating any of its solids',()=>{
  for(const limits of [{maxTriangles:12},{maxComponents:1}]){
    const tracker=allocationTracker(),source=[box('terrain',0,50),box('forest',50,100)],before=structuredClone(source),result=carveTerrainTunnels(source,[tunnel()],tracker.engine,limits);
    assert.equal(result.metadata.applied,false);assert.strictEqual(result.parts,source);assert.match(result.warnings[0],/límit total/);
    assert.equal(tracker.created,1,'the exceeding second source category must never reach a Manifold constructor');
    assert.equal(tracker.live,0,'the accepted first category must also be released');assert.deepEqual(source,before);
  }
});

test('aggregate pavement triangle budget rejects the exceeding material before allocating its solids',()=>{
  const tracker=allocationTracker(),source=[box('terrain')],floors=[box('roads',0,100,4.7,5),box('railways',0,100,4.7,5)],before=structuredClone({source,floors});
  assert.throws(()=>clipTunnelPavements(floors,source,tracker.engine,{maxVoidTriangles:12}),/límit total/);
  assert.equal(tracker.created,2,'only the source and first pavement material may be constructed');assert.equal(tracker.live,0);
  assert.deepEqual({source,floors},before);
});

test('a thin pavement cannot eat the protected base; floor or boolean failure rolls back every source buffer',()=>{
  const source=[box('terrain')],tooLow=tunnel('roads',[[-1,40,2.7],[101,40,2.7]]);
  const rejected=carveTerrainTunnels(source,[tooLow],api);assert.strictEqual(rejected.parts,source);assert.equal(rejected.metadata.applied,false);assert.match(rejected.warnings[0],/base mínima/);
  for(const limits of [{maxVoidTriangles:1},{maxTriangles:1}]){
    const result=carveTerrainTunnels(source,[tunnel()],api,limits);assert.strictEqual(result.parts,source);assert.equal(result.metadata.applied,false);assert(result.warnings.length);
  }
});
