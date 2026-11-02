// RO-024 fase 2: unió booleana de peces DINS de cada material (mateix id),
// sobre còpies, amb l'API de manifold-3d injectada. Mai s'uneixen ids
// diferents, encara que comparteixin color. No s'usa encara a l'aplicació.
import {partComponents,auditPart} from './solid-audit.js';

const label=part=>part?.name??part?.id??'(sense nom)';

function checkIndexedPart(part){
  if(!(part?.vertices instanceof Float32Array)||!(part?.faces instanceof Uint32Array))
    throw Error(`La capa «${label(part)}» no té el format esperat (vèrtexs Float32Array, cares Uint32Array).`);
  if(part.vertices.length%3||part.faces.length%3)
    throw Error(`La capa «${label(part)}» té longituds incorrectes (múltiples de 3).`);
  for(let i=0;i<part.vertices.length;i++)
    if(!Number.isFinite(part.vertices[i]))throw Error(`La capa «${label(part)}» té coordenades no finites.`);
  const nv=part.vertices.length/3;
  for(let i=0;i<part.faces.length;i++)
    if(part.faces[i]>=nv)throw Error(`La capa «${label(part)}» té índexs de vèrtex fora de rang.`);
}

// Construeix un Manifold per a UN component topològic independent de la peça
// crua: les caixes encavalcades concatenades en una mateixa peça indexada
// s'uneixen realment amb boolean. merge() solda vèrtexs duplicats; la peça
// d'entrada no es toca. En cas d'error es neteja el sòlid i es llança.
function componentManifold(api,part,triangles){
  const remap=new Map(),verts=[],faces=[];
  for(const t of triangles)for(let k=0;k<3;k++){
    const g=part.faces[t*3+k];
    let l=remap.get(g);
    if(l===undefined){l=remap.size;remap.set(g,l);verts.push(part.vertices[g*3],part.vertices[g*3+1],part.vertices[g*3+2]);}
    faces.push(l);
  }
  const mesh=new api.Mesh({numProp:3,vertProperties:new Float32Array(verts),triVerts:new Uint32Array(faces)});
  mesh.merge();
  const solid=new api.Manifold(mesh);let accepted=false;
  try{
    const status=solid.status(),volume=solid.volume();
    if(status!=='NoError'||!Number.isFinite(volume)||volume<=0)
      throw Error(`No es pot unir la capa «${label(part)}»: un component no forma un sòlid vàlid (${status}; volum ${volume}).`);
    accepted=true;return solid;
  }finally{if(!accepted)solid.delete();}
}

// Torna un model nou amb una peça per material; el model i les peces
// d'entrada no es modifiquen. Tots els sòlids WASM creats es destrueixen
// tant en l'èxit com en qualsevol error.
export function uniteMaterials(model,api,{maxTriangles=2_000_000,maxComponents=10_000}={}){
  if(!api?.Manifold||!api?.Mesh)throw Error('Cal injectar l’API de manifold-3d ja inicialitzada.');
  if(!Array.isArray(model?.parts))throw Error('Cal un model amb llista de peces.');
  for(const [n,v,max]of [['maxTriangles',maxTriangles,2_000_000],['maxComponents',maxComponents,10_000]])if(!Number.isSafeInteger(v)||v<1||v>max)throw Error(`Límit ${n} invàlid (1–${max}).`);
  const groups=new Map();
  for(const part of model.parts){
    if(typeof part?.id!=='string'||!part.id.trim())throw Error('Identificador de material absent.');
    checkIndexedPart(part);
    let g=groups.get(part.id);
    if(!g)groups.set(part.id,g={color:part.color,parts:[]});
    else if(g.color!==part.color)
      throw Error(`El material «${part.id}» té colors conflictius (${g.color} ≠ ${part.color}); no s’uneix.`);
    g.parts.push(part);
  }
  const out=[];
  for(const [id,g] of groups){
    const triangles=g.parts.reduce((n,p)=>n+p.faces.length/3,0);
    if(triangles>maxTriangles)throw Error(`El material «${id}» supera el límit de ${maxTriangles} triangles per unió (${triangles}).`);
    const owned=[];let joined;
    try{
      let components=0;
      for(const part of g.parts){
        if(!part.faces.length)continue; // capa buida: no aporta volum
        const comps=partComponents(part.faces);components+=comps.length;
        if(components>maxComponents)throw Error(`El material «${id}» supera el límit de ${maxComponents} components independents.`);
        for(const tris of comps)owned.push(componentManifold(api,part,tris));
      }
      if(!owned.length){ // material només amb capes buides: es conserva la primera, copiada
        out.push({...g.parts[0],vertices:new Float32Array(g.parts[0].vertices),faces:new Uint32Array(g.parts[0].faces)});
        continue;
      }
      joined=owned.length===1?owned.splice(0,1)[0]:api.Manifold.union(owned);
      if(joined.status()!=='NoError')throw Error(`No es pot unir el material «${id}» (${joined.status()}).`);
      const volume=joined.volume();if(!Number.isFinite(volume)||volume<=0)throw Error(`La unió del material «${id}» ha produït un volum no positiu o no finit.`);
      const mesh=joined.getMesh(),vertices=new Float32Array(mesh.numVert*3);
      for(let v=0;v<mesh.numVert;v++)for(let k=0;k<3;k++)vertices[v*3+k]=mesh.vertProperties[v*mesh.numProp+k];
      const part={...g.parts[0],vertices,faces:new Uint32Array(mesh.triVerts)},audit=auditPart(part);
      if(audit.errors.length)throw Error(`La unió del material «${id}» no supera l’auditoria: ${audit.errors.join(' ')}`);
      out.push(part);
    }finally{
      joined?.delete();
      for(const s of owned)s.delete();
    }
  }
  const result={...model,parts:out};
  if('triangles' in model)result.triangles=out.reduce((n,p)=>n+p.faces.length/3,0);
  return result;
}
