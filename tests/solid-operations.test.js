import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {auditPart,auditModel,partComponents,rawEdges} from '../src/solid-audit.js';
import {uniteMaterials} from '../src/solid-operations.js';
const api=await Module();api.setup();

// Caixa tancada amb cares orientades cap enfora (volum signat positiu).
function box(x0,y0,z0,x1,y1,z1){
  return {vertices:new Float32Array([x0,y0,z0, x1,y0,z0, x1,y1,z0, x0,y1,z0, x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1]),
    faces:new Uint32Array([0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 2,3,7, 2,7,6, 0,4,7, 0,7,3, 1,2,6, 1,6,5])};
}
const boxPart=(id,color,...boxes)=>{const p=concat(boxes);return {id,name:id,color,...p};};
function concat(parts){
  const verts=[],faces=[];let base=0;
  for(const p of parts){verts.push(...p.vertices);for(const f of p.faces)faces.push(f+base);base+=p.vertices.length/3;}
  return {vertices:new Float32Array(verts),faces:new Uint32Array(faces)};
}
// Terreny sintètic tancat: graella superior amb relleu, base a z=0 i laterals.
function terrain(n,step,fn){
  const g=n+1,verts=[];
  for(let j=0;j<g;j++)for(let i=0;i<g;i++)verts.push(i*step,j*step,fn(i*step,j*step));
  for(let j=0;j<g;j++)for(let i=0;i<g;i++)verts.push(i*step,j*step,0);
  const T=(i,j)=>j*g+i,B=(i,j)=>g*g+j*g+i,faces=[];
  for(let j=0;j<n;j++)for(let i=0;i<n;i++)
    faces.push(T(i,j),T(i+1,j),T(i+1,j+1), T(i,j),T(i+1,j+1),T(i,j+1),
               B(i,j),B(i+1,j+1),B(i+1,j), B(i,j),B(i,j+1),B(i+1,j+1));
  for(let i=0;i<n;i++)
    faces.push(T(i,0),B(i,0),B(i+1,0), T(i,0),B(i+1,0),T(i+1,0),
               T(i,n),B(i+1,n),B(i,n), T(i,n),T(i+1,n),B(i+1,n));
  for(let j=0;j<n;j++)
    faces.push(T(0,j),B(0,j+1),B(0,j), T(0,j),T(0,j+1),B(0,j+1),
               T(n,j),B(n,j),B(n,j+1), T(n,j),B(n,j+1),T(n,j+1));
  return {vertices:new Float32Array(verts),faces:new Uint32Array(faces)};
}
function manifoldOf(part){
  const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});
  mesh.merge();return new api.Manifold(mesh);
}
// API injectada que compta sòlids creats/destruïts; union pot fallar a demanda.
function trackingApi(fail){
  let created=0,deleted=0;
  const track=s=>{created++;const d=s.delete.bind(s);s.delete=()=>{deleted++;d();};return s;};
  const Manifold=function(mesh){return track(new api.Manifold(mesh));};
  Manifold.union=fail?()=>{throw Error('fallada injectada');}:solids=>track(api.Manifold.union(solids));
  return {api:{...api,Manifold},stats:()=>({created,deleted})};
}

test('auditoria: caixa tancada amb volum, dimensions, arestes i un component',()=>{
  const r=auditPart({id:'caixa',name:'Caixa',...box(0,0,0,10,10,10)});
  assert.deepEqual(r.errors,[]);
  assert.equal(r.closed,true);assert.equal(r.components,1);assert.equal(r.orientation,'positiva');
  assert(Math.abs(r.signedVolume-1000)<1e-3);
  assert.deepEqual(r.dimensions,[10,10,10]);
  assert.deepEqual(r.bbox.min,[0,0,0]);assert.deepEqual(r.bbox.max,[10,10,10]);
  assert.deepEqual(r.edges,{total:18,boundary:0,nonManifold:0,orientationConflicts:0});
});
test('auditoria: capa buida és vàlida',()=>{
  const r=auditPart({id:'buida',vertices:new Float32Array(0),faces:new Uint32Array(0)});
  assert.deepEqual(r.errors,[]);assert.equal(r.empty,true);assert.equal(r.signedVolume,0);
  const m=auditModel({parts:[{id:'a',vertices:new Float32Array(0),faces:new Uint32Array(0)}]});
  assert.equal(m.valid,true);
});

test('auditoria: una capa sense cares encara rebutja coordenades no finites i un volum nul no és sòlid',()=>{
  assert.match(auditPart({vertices:new Float32Array([NaN,0,0]),faces:new Uint32Array()}).errors.join(' '),/no finita/);
  assert.match(auditPart(box(0,0,0,10,10,0)).errors.join(' '),/volum nul/);
});

test('unió: límits no finits i material absent no desactiven les proteccions',()=>{
  const model={parts:[boxPart('a','#112233',box(0,0,0,10,10,10))]};
  for(const key of ['maxTriangles','maxComponents'])for(const n of [NaN,Infinity,0,-1,1.5])assert.throws(()=>uniteMaterials(model,api,{[key]:n}),/invàlid/);
  assert.throws(()=>uniteMaterials({parts:[{...model.parts[0],id:undefined}]},api),/Identificador/);
});

test('unió: una excepció durant la inspecció del component també allibera el sòlid',()=>{
  let deleted=0;
  const fake={Mesh:api.Mesh,Manifold:class {status(){throw Error('inspecció fallida');}delete(){deleted++;}}};
  assert.throws(()=>uniteMaterials({parts:[boxPart('a','#112233',box(0,0,0,1,1,1))]},fake),/inspecció fallida/);
  assert.equal(deleted,1);
});
test('auditoria: coordenades no finites, índexs fora de rang i format incorrecte, explícits',()=>{
  const nan=box(0,0,0,10,10,10);nan.vertices[3]=NaN;
  assert.match(auditPart({id:'x',...nan}).errors.join(' '),/no finita/);
  const bad=box(0,0,0,10,10,10);bad.faces[0]=99;
  const r=auditPart({id:'x',...bad});
  assert.match(r.errors.join(' '),/fora de rang/);assert.equal(r.closed,false);
  assert.match(auditPart({id:'x',vertices:[0,0,0],faces:[0,0,0]}).errors.join(' '),/format no indexat/);
  const odd={id:'x',vertices:new Float32Array(4),faces:new Uint32Array(2)};
  assert.match(auditPart(odd).errors.join(' '),/múltiple de 3/);
});
test('auditoria: winding invertit → orientació negativa explícita; cara oberta → arestes de vora',()=>{
  const rev=box(0,0,0,10,10,10);
  for(let i=0;i<rev.faces.length;i+=3){const t=rev.faces[i+1];rev.faces[i+1]=rev.faces[i+2];rev.faces[i+2]=t;}
  const r1=auditPart({id:'x',...rev});
  assert.equal(r1.orientation,'negativa');assert.match(r1.errors.join(' '),/orientació negativa/);
  const open=box(0,0,0,10,10,10);open.faces=open.faces.subarray(0,open.faces.length-3);
  const r2=auditPart({id:'x',...open});
  assert.equal(r2.closed,false);assert.match(r2.errors.join(' '),/no tancada/);assert(r2.edges.boundary>0);
});
test('auditoria: vèrtexs sense soldar compten com a components separats (limitació de topologia crua)',()=>{
  // Dues caixes adjacents concatenades: dos components tancats per índexs,
  // encara que comparteixin un pla geomètric de contacte.
  const p=concat([box(0,0,0,10,10,10),box(10,0,0,20,10,10)]);
  assert.equal(partComponents(p.faces).length,2);
  const r=auditPart({id:'x',...p});
  assert.equal(r.components,2);assert.equal(r.closed,true); // cada caixa és tancada per índexs
  const e=rawEdges(box(0,0,0,10,10,10).faces);
  assert.equal(e.boundary,0);
});
test('unió: caixes encavalcades concatenades en una mateixa peça s’uneixen de veritat',()=>{
  const tracked=trackingApi(false);
  const model={width:20,height:10,parts:[{id:'sólid',name:'Sólid',color:'#112233',...concat([box(0,0,0,10,10,10),box(5,0,0,15,10,10)])}]};
  const before=structuredClone(model);
  const result=uniteMaterials(model,tracked.api);
  assert.equal(result.parts.length,1);
  const r=auditPart(result.parts[0]);
  assert.deepEqual(r.errors,[]);
  assert(Math.abs(r.signedVolume-1500)<0.01,`volum ${r.signedVolume}`); // 1000+1000−500 d’encavalcament
  assert.equal(r.components,1);assert.equal(r.closed,true);
  assert(result.parts[0].vertices instanceof Float32Array&&result.parts[0].faces instanceof Uint32Array);
  assert.deepEqual(model,before); // entrada intacta
  assert.deepEqual(tracked.stats(),{created:3,deleted:3}); // dos components i resultat, tot netejat
});
test('unió: contactes coplanars i capa buida conservada',()=>{
  const model={parts:[
    {id:'sólid',name:'Sólid',color:'#112233',...concat([box(0,0,0,10,10,10),box(10,0,0,20,10,10)])},
    {id:'buida',name:'Buida',color:'#abcdef',vertices:new Float32Array(0),faces:new Uint32Array(0)}]};
  const result=uniteMaterials(model,api);
  assert.equal(result.parts.length,2);
  const r=auditPart(result.parts[0]);
  assert.deepEqual(r.errors,[]);assert(Math.abs(r.signedVolume-2000)<0.01);
  assert.deepEqual(result.parts[1].vertices.length,0);assert.deepEqual(result.parts[1].faces.length,0);
  assert.equal(result.parts[1].color,'#abcdef');
});
test('unió: pati/forat travessant conservat després de la unió',()=>{
  const outer=api.Manifold.cube([20,20,10]),rawInner=api.Manifold.cube([10,10,10]),inner=rawInner.translate([5,5,0]);rawInner.delete();
  const ring=outer.subtract(inner);outer.delete();inner.delete();
  const mesh=ring.getMesh();ring.delete();
  const ringPart={id:'anell',name:'Anell',color:'#999999',
    vertices:new Float32Array(mesh.numVert*3),faces:new Uint32Array(mesh.triVerts)};
  for(let v=0;v<mesh.numVert;v++)for(let k=0;k<3;k++)ringPart.vertices[v*3+k]=mesh.vertProperties[v*mesh.numProp+k];
  const model={parts:[ringPart,boxPart('anell','#999999',box(30,0,0,40,10,10))]};
  const result=uniteMaterials(model,api);
  assert.equal(result.parts.length,1);
  const r=auditPart(result.parts[0]);
  assert.deepEqual(r.errors,[]);
  // 3000 (anell amb pati) + 1000 (caixa disjunta); si el pati s’omplís serien 5000
  assert(Math.abs(r.signedVolume-4000)<0.5,`volum ${r.signedVolume}`);
  assert.equal(r.components,2);
  assert.deepEqual(r.bbox.max,[40,20,10]);
});
test('unió: mai ids diferents tot i mateix hex; colors conflictius per id rebutjats',()=>{
  const model={parts:[boxPart('a','#112233',box(0,0,0,10,10,10)),boxPart('b','#112233',box(5,0,0,15,10,10))]};
  const result=uniteMaterials(model,api);
  assert.equal(result.parts.length,2); // no s’uneixen materials diferents
  for(const p of result.parts)assert(Math.abs(auditPart(p).signedVolume-1000)<0.01);
  const conflict={parts:[boxPart('a','#112233',box(0,0,0,10,10,10)),boxPart('a','#445566',box(20,0,0,30,10,10))]};
  assert.throws(()=>uniteMaterials(conflict,api),/colors conflictius/);
});
test('unió: índexs invàlids, coordenades no finites i winding invertit rebutjats',()=>{
  const bad=boxPart('x','#112233',box(0,0,0,10,10,10));bad.faces[0]=99;
  assert.throws(()=>uniteMaterials({parts:[bad]},api),/fora de rang/);
  const nan=boxPart('x','#112233',box(0,0,0,10,10,10));nan.vertices[0]=NaN;
  assert.throws(()=>uniteMaterials({parts:[nan]},api),/no finites/);
  const rev=boxPart('x','#112233',box(0,0,0,10,10,10));
  for(let i=0;i<rev.faces.length;i+=3){const t=rev.faces[i+1];rev.faces[i+1]=rev.faces[i+2];rev.faces[i+2]=t;}
  assert.throws(()=>uniteMaterials({parts:[rev]},api),/sòlid vàlid/);
});
test('unió: fallada injectada → es destrueixen tots els sòlids WASM creats',()=>{
  const tracked=trackingApi(true);
  const model={parts:[boxPart('a','#112233',box(0,0,0,10,10,10),box(20,0,0,30,10,10))]};
  assert.throws(()=>uniteMaterials(model,tracked.api),/fallada injectada/);
  const s=tracked.stats();
  assert(s.created>0);assert.equal(s.created,s.deleted);
});
test('unió: límits de triangles i components explícits',()=>{
  const model={parts:[boxPart('a','#112233',box(0,0,0,10,10,10))]};
  assert.throws(()=>uniteMaterials(model,api,{maxTriangles:6}),/límit de 6 triangles/);
  const two={parts:[boxPart('a','#112233',box(0,0,0,10,10,10),box(20,0,0,30,10,10))]};
  assert.throws(()=>uniteMaterials(two,api,{maxComponents:1}),/límit de 1 components/);
});
test('unió: model sintètic amb terreny en pendent, bosc, carretera i edifici agrupats per material',()=>{
  const slope=(x,y)=>5+x*.35+y*.15;
  const t=terrain(4,10,slope);
  const model={width:40,height:40,triangles:0,provenance:{name:'Sintètica'},parts:[
    {id:'terreny',name:'Terreny',color:'#b59a6d',...t},
    boxPart('bosc','#2f6b3a',box(2,2,4,10,10,10),box(6,6,3,14,14,9)), // dues caixes encavalcades en una peça
    boxPart('bosc','#2f6b3a',box(24,24,4,30,30,10)),                    // segona peça del mateix material
    boxPart('carretera','#555555',box(0,18,0,40,22,6)),
    boxPart('edifici','#c0c0c0',box(20,2,4,30,12,12)),
    boxPart('edifici','#c0c0c0',box(19,1,12,31,13,15)),                 // contacte coplanar a z=12
  ]};
  const before=structuredClone(model);
  const result=uniteMaterials(model,api);
  assert.deepEqual(model,before);
  assert.equal(result.parts.length,4);
  const byId=Object.fromEntries(result.parts.map(p=>[p.id,auditPart(p)]));
  let expectedTerrain=0;
  for(let j=0;j<4;j++)for(let i=0;i<4;i++){
    const x=i*10,y=j*10;
    expectedTerrain+=100*(slope(x,y)+slope(x+10,y)+slope(x,y+10)+slope(x+10,y+10))/4;
  }
  assert(Math.abs(byId.terreny.signedVolume-expectedTerrain)<1,`terreny ${byId.terreny.signedVolume} vs ${expectedTerrain}`);
  assert(Math.abs(byId.bosc.signedVolume-904)<1,`bosc ${byId.bosc.signedVolume}`);       // 384+384−80+216
  assert(Math.abs(byId.carretera.signedVolume-960)<0.1);
  assert(Math.abs(byId.edifici.signedVolume-1232)<0.5,`edifici ${byId.edifici.signedVolume}`); // 800+432 coplanars
  for(const p of result.parts){
    const r=auditPart(p);
    assert.deepEqual(r.errors,[],`${p.id}: ${r.errors}`);assert.equal(r.closed,true);
    const s=manifoldOf(p);
    try{assert.equal(s.status(),'NoError');assert(s.volume()>0);}finally{s.delete();}
  }
  assert.equal(result.triangles,result.parts.reduce((n,p)=>n+p.faces.length/3,0));
});
