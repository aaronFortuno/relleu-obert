import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {auditPart} from '../src/solid-audit.js';
import {uniteMaterials} from '../src/solid-operations.js';
import {subtractVoids} from '../src/solid-voids.js';
import {splitModel} from '../src/mesh-tiles.js';
const api=await Module();api.setup();

// Caixa tancada amb cares orientades cap enfora (volum signat positiu).
function box(x0,y0,z0,x1,y1,z1){
  return {vertices:new Float32Array([x0,y0,z0, x1,y0,z0, x1,y1,z0, x0,y1,z0, x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1]),
    faces:new Uint32Array([0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 2,3,7, 2,7,6, 0,4,7, 0,7,3, 1,2,6, 1,6,5])};
}
function concat(parts){
  const verts=[],faces=[];let base=0;
  for(const p of parts){verts.push(...p.vertices);for(const f of p.faces)faces.push(f+base);base+=p.vertices.length/3;}
  return {vertices:new Float32Array(verts),faces:new Uint32Array(faces)};
}
// Fixtura de control EXACTA 400×120×12 mm: base z0..5 íntegra + pis superior
// z5..12 en tres materials adjacents sense encavalcament (mateix pla, ids
// diferents: mai s'han d'unir). Terra: base sencera + meitat superior x0..200.
function controlModel(){
  return {width:400,height:120,triangles:0,provenance:{name:'Control túnel sintètic'},parts:[
    {id:'terra',name:'Terra',color:'#b59a6d',...concat([box(0,0,0,400,120,5),box(0,0,5,200,120,12)])},
    {id:'bosc',name:'Bosc',color:'#2f6b3a',...box(200,0,5,300,120,12)},
    {id:'carretera',name:'Carretera',color:'#555555',...box(300,0,5,400,120,12)}]};
}
// Forat x=-1..401, y58..62, z5..9: travessa el model sencer i obre dos portals.
const bore=()=>({id:'buit',name:'Pou de pas',color:'#000000',...box(-1,58,5,401,62,9)});
const TOTAL=400*120*12,BORE=400*4*4; // 576000 i 6400 mm³ dins del model

function solidOf(part){
  const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});
  mesh.merge();return new api.Manifold(mesh);
}
// Encerts de raig sobre totes les capes; cada sòlid es destrueix sempre.
function rayHits(parts,origin,end){
  const solids=parts.map(solidOf);let hits=0;
  try{for(const s of solids)hits+=s.rayCast(origin,end).length;}
  finally{for(const s of solids)s.delete();}
  return hits;
}
const partById=(model,id)=>model.parts.find(p=>p.id===id);
function volumeBelowZ5(part){ // volum del zoc z0..5 via tall pla; sense leaks
  const s=solidOf(part);
  try{const t=s.trimByPlane([0,0,-1],-5);try{return t.volume();}finally{t.delete();}}
  finally{s.delete();}
}
function hasVertex(part,x,y,z,eps=1e-2){
  const v=part.vertices;
  for(let i=0;i<v.length;i+=3)if(Math.abs(v[i]-x)<eps&&Math.abs(v[i+1]-y)<eps&&Math.abs(v[i+2]-z)<eps)return true;
  return false;
}

test('túnel: volum analític total i per color, capes tancades, entrada intacta',()=>{
  const model=controlModel(),voids=[bore()],options={maxVoidTriangles:1000};
  const beforeModel=structuredClone(model),beforeVoids=structuredClone(voids),beforeOptions={...options};
  const result=subtractVoids(model,voids,api,options);
  assert.deepEqual(model,beforeModel);
  assert.deepEqual(voids,beforeVoids);
  assert.deepEqual(options,beforeOptions);
  assert.equal(result.parts.length,3); // ids adjacents coplanars NO s'uneixen
  const vol={};
  for(const p of result.parts){
    const r=auditPart(p);
    assert.deepEqual(r.errors,[],`${p.id}: ${r.errors}`);
    assert.equal(r.closed,true);
    vol[p.id]=r.signedVolume;
  }
  assert(Math.abs(vol.terra-404800)<0.5,`terra ${vol.terra}`);       // 408000−3200
  assert(Math.abs(vol.bosc-82400)<0.5,`bosc ${vol.bosc}`);           // 84000−1600
  assert(Math.abs(vol.carretera-82400)<0.5,`ctra ${vol.carretera}`); // 84000−1600
  const total=Object.values(vol).reduce((a,b)=>a+b,0);
  assert(Math.abs(total-(TOTAL-BORE))<1,`total ${total}`);
  assert(Math.abs(result.voids.removed.terra-3200)<0.5);
  assert(Math.abs(result.voids.removed.bosc-1600)<0.5);
  // arrays independents de l'entrada
  for(const p of result.parts)assert(!model.parts.some(q=>q.vertices===p.vertices||q.faces===p.faces));
});

test('túnel: intersecció amb el buit zero i pas lliure de portal a portal (rayCast)',()=>{
  const result=subtractVoids(controlModel(),[bore()],api);
  const voidSolid=solidOf(bore());
  try{
    for(const p of result.parts){
      const s=solidOf(p);
      try{const inter=api.Manifold.intersection(s,voidSolid);try{assert(inter.volume()<1e-6,`${p.id}: intersecció ${inter.volume()}`);}finally{inter.delete();}}
      finally{s.delete();}
    }
  }finally{voidSolid.delete();}
  // raig per l'interior del forat (y=60, z=7, 2 mm de marge a cada paret): cap encert
  assert.equal(rayHits(result.parts,[-1,60,7],[401,60,7]),0);
  // raig de control fora del forat: ha de travessar material (maquinària del raig validada)
  assert(rayHits(result.parts,[-1,30,7],[401,30,7])>0);
});

test('túnel: el zoc z0..5 queda intacte abans i després de la resta',()=>{
  const united=uniteMaterials(controlModel(),api);
  const abans=volumeBelowZ5(partById(united,'terra'));
  const result=subtractVoids(controlModel(),[bore()],api);
  const despres=volumeBelowZ5(partById(result,'terra'));
  assert(Math.abs(abans-400*120*5)<0.5,`zoc abans ${abans}`);
  assert(Math.abs(despres-400*120*5)<0.5,`zoc després ${despres}`);
});

test('túnel: retall en dues peces de 200 conserva el pas sense tapes a la costura',()=>{
  const result=subtractVoids(controlModel(),[bore()],api);
  const tiles=splitModel(result,api,200);
  assert.equal(tiles.length,2);
  const [t1,t2]=tiles;
  assert.equal(t1.width,200);assert.equal(t2.width,200);
  // mateix pas lliure en coordenades locals de cada peça; cap tapa a x=200
  for(const t of tiles){
    assert.equal(rayHits(t.parts,[-1,60,7],[201,60,7]),0,`${t.tile.name}: pas obturat`);
    assert(rayHits(t.parts,[-1,30,7],[201,30,7])>0,`${t.tile.name}: control`);
  }
  // correspondència geomètrica a la costura x=200 malgrat la triangulació:
  // els quatre cantons del forat (y58/62, z5/9) presents a banda i banda
  const terra1=partById(t1,'terra'),bosc2=partById(t2,'bosc');
  for(const [y,z]of [[58,5],[58,9],[62,5],[62,9]]){
    assert(hasVertex(terra1,200,y,z),`peça 1 sense cantó (${y},${z}) a x=200`);
    assert(hasVertex(bosc2,0,y,z),`peça 2 sense cantó (${y},${z}) a x=0 local`);
  }
  // conservació del volum: suma de peces == model sencer restat
  const sum=tiles.flatMap(t=>t.parts).reduce((n,p)=>n+auditPart(p).signedVolume,0);
  assert(Math.abs(sum-(TOTAL-BORE))<1,`suma peces ${sum}`);
  // zoc intacte també dins de cada peça
  assert(Math.abs(volumeBelowZ5(partById(t1,'terra'))-200*120*5)<0.5);
  assert(Math.abs(volumeBelowZ5(partById(t2,'terra'))-200*120*5)<0.5);
});

test('túnel: capa buida conservada i material totalment eliminat queda com a capa buida',()=>{
  const model=controlModel();
  model.parts.push({id:'buida',name:'Buida',color:'#abcdef',vertices:new Float32Array(0),faces:new Uint32Array(0)});
  model.parts.push({id:'via',name:'Via dins del forat',color:'#777777',...box(100,58,5,120,62,9)});
  const result=subtractVoids(model,[bore()],api);
  const buida=partById(result,'buida'),via=partById(result,'via');
  assert(buida&&via,'capes presents al resultat');
  assert.equal(buida.vertices.length,0);assert(buida.vertices instanceof Float32Array);
  assert.equal(via.vertices.length,0);assert(via.faces instanceof Uint32Array);
  assert(Math.abs(result.voids.removed.via-20*4*4)<0.5);
});

test('túnel: diverses peces de buit s’unionen en un sol tallador per a totes les capes',()=>{
  const result=subtractVoids(controlModel(),[
    {...box(-1,58,5,200.5,62,9),id:'buit',name:'Tram oest',color:'#000000'},
    {...box(199.5,58,5,401,62,9),id:'buit',name:'Tram est',color:'#000000'}],api);
  let total=0;
  for(const p of result.parts){const r=auditPart(p);assert.deepEqual(r.errors,[]);total+=r.signedVolume;}
  assert(Math.abs(total-(TOTAL-BORE))<1,`total ${total}`);
  assert.equal(rayHits(result.parts,[-1,60,7],[401,60,7]),0);
});

test('túnel: límits invàlids, buit degenerat i coordenades no finites rebutjats',()=>{
  const model=controlModel();
  for(const key of ['maxTriangles','maxComponents','maxVoidTriangles'])
    for(const n of [NaN,Infinity,0,-1,1.5])assert.throws(()=>subtractVoids(model,[bore()],api,{[key]:n}),/invàlid/);
  assert.throws(()=>subtractVoids(model,[bore()],api,{maxVoidTriangles:6}),/límit de 6 triangles/);
  assert.throws(()=>subtractVoids(model,[{...box(-1,58,5,401,62,5),id:'buit'}],api),/volum|sòlid/); // buit pla
  const nan=bore();nan.vertices[0]=NaN;
  assert.throws(()=>subtractVoids(model,[nan],api),/no finites/);
  assert.throws(()=>subtractVoids(model,'no-llista',api),/llista de peces de buit/);
});

test('túnel: pressupost total dels talladors independent dels seus ids i colors',()=>{
  const voids=[{...bore(),id:'oest',color:'#111111'},{...bore(),id:'est',color:'#ffffff'}];
  assert.throws(()=>subtractVoids(controlModel(),voids,api,{maxVoidTriangles:12}),/límit de 12 triangles/);
  const result=subtractVoids(controlModel(),voids,api);
  assert.equal(rayHits(result.parts,[-1,60,7],[401,60,7]),0);
  assert(Math.abs(result.parts.reduce((n,p)=>n+auditPart(p).signedVolume,0)-(TOTAL-BORE))<1);
});

test('túnel: inspecció fallida del resultat de resta neteja també resultats i unions',()=>{
  for(const failure of ['status','volume']){
    const created=new Set(),deleted=new Set();
    const track=(s,result=false)=>{
      created.add(s);const destroy=s.delete.bind(s),subtract=s.subtract.bind(s);
      s.delete=()=>{assert(!deleted.has(s),'doble alliberament');deleted.add(s);destroy();};
      s.subtract=other=>track(subtract(other),true);
      if(result)s[failure]=()=>{throw Error('resultat injectat');};
      return s;
    };
    const Manifold=function(mesh){return track(new api.Manifold(mesh));};
    Manifold.union=parts=>track(api.Manifold.union(parts));
    assert.throws(()=>subtractVoids(controlModel(),[bore()],{...api,Manifold}),/resultat injectat/);
    assert(created.size>3);assert.deepEqual(deleted,created);
  }
});

test('túnel: fallades injectades (resta i volum) no deixen cap sòlid WASM viu',()=>{
  for(const fail of ['subtract','volume']){
    let created=0,deleted=0;
    const Manifold=function(mesh){
      const s=new api.Manifold(mesh);created++;
      const d=s.delete.bind(s);s.delete=()=>{deleted++;d();};
      if(fail==='subtract')s.subtract=()=>{throw Error('resta injectada');};
      else s.volume=()=>{throw Error('volum injectat');};
      return s;
    };
    Manifold.union=solids=>api.Manifold.union(solids);
    assert.throws(()=>subtractVoids(controlModel(),[bore()],{...api,Manifold}),/injecta/);
    assert(created>0);
    assert.equal(created,deleted,`${fail}: ${created} creats, ${deleted} destruïts`);
  }
});
