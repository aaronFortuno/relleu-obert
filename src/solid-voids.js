// RO-024 fases 3–4: subtracció d'un MATEIX buit unionat de TOTES les capes
// del model, sobre còpies, amb l'API de manifold-3d ja inicialitzada injectada.
// Les capes del model s'uneixen abans DINS de cada material (uniteMaterials);
// mai no s'uneixen ids de material diferents. Les peces de buit són talladors
// geomètrics (no materials): es validen i s'unionen en un sol sòlid que es
// resta de cada capa. Resultats buids permesos (capa amb arrays tipats buits).
// No s'usa encara a la UI ni a l'exportació normal.
import {auditPart} from './solid-audit.js';
import {uniteMaterials} from './solid-operations.js';

const label=part=>part?.name??part?.id??'(sense nom)';

// Manifold a partir d'una peça indexada, amb estat explícit. En cas d'error
// (també si status() llança) el sòlid es destrueix abans de propagar.
function manifoldOf(api,part,what){
  const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});
  mesh.merge();
  const solid=new api.Manifold(mesh);let accepted=false;
  try{
    const status=solid.status();
    if(status!=='NoError')throw Error(`${what} no forma un sòlid vàlid (${status}).`);
    accepted=true;return solid;
  }finally{if(!accepted)solid.delete();}
}

// Malha del sòlid a arrays tipats independents; el cridador segueix essent
// l'amo del sòlid i l'ha de destruir.
function typedPart(part,solid){
  const mesh=solid.getMesh(),vertices=new Float32Array(mesh.numVert*3);
  for(let v=0;v<mesh.numVert;v++)for(let k=0;k<3;k++)vertices[v*3+k]=mesh.vertProperties[v*mesh.numProp+k];
  return {...part,vertices,faces:new Uint32Array(mesh.triVerts)};
}

// Torna un model nou; ni el model, ni voidParts, ni les opcions es modifiquen.
// Tots els sòlids WASM temporals es destrueixen en l'èxit i en qualsevol error.
export function subtractVoids(model,voidParts,api,{maxTriangles=2_000_000,maxComponents=10_000,maxVoidTriangles=200_000,finishCutters=[]}={}){
  if(!api?.Manifold||!api?.Mesh)throw Error('Cal injectar l’API de manifold-3d ja inicialitzada.');
  if(!Array.isArray(model?.parts))throw Error('Cal un model amb llista de peces.');
  if(!Array.isArray(voidParts)||!Array.isArray(finishCutters))throw Error('Cal una llista de peces de buit (pot ser buida).');
  for(const [n,v,max]of [['maxTriangles',maxTriangles,2_000_000],['maxComponents',maxComponents,10_000],['maxVoidTriangles',maxVoidTriangles,200_000]])
    if(!Number.isSafeInteger(v)||v<1||v>max)throw Error(`Límit ${n} invàlid (1–${max}).`);
  // Validació i unió dels buits amb el mateix criteri que les capes (fites de
  // complexitat pròpies); la unió del model queda delegada a uniteMaterials.
  // Els talladors no són materials: un sol id imposa el pressupost total,
  // encara que el fitxer original utilitzi ids o colors diferents.
  const inputCutters=[...voidParts,...finishCutters];
  if(inputCutters.reduce((n,p)=>n+(p?.faces?.length??0)/3,0)>maxVoidTriangles)
    throw Error(`Els talladors superen el límit de ${maxVoidTriangles} triangles.`);
  const cutterGroups=[voidParts,finishCutters].filter(group=>group.length).map(group=>
    uniteMaterials({parts:group.map((p,i)=>({...p,name:`Buit ${i+1}`,color:'#000000',id:'buit'}))},
      api,{maxTriangles:maxVoidTriangles,maxComponents}).parts);
  const owned=[]; // tot sòlid temporal creat aquí; es destrueix al finally
  const own=s=>(owned.push(s),s);
  try{
    const voidSolids=cutterGroups.flat().filter(p=>p.faces.length).map(p=>own(manifoldOf(api,p,'El buit')));
    for(const voidSolid of voidSolids){
      const status=voidSolid.status();
      if(status!=='NoError')throw Error(`El buit unionat no és vàlid (${status}).`);
      const volume=voidSolid.volume();
      if(!Number.isFinite(volume)||volume<=0)throw Error('El buit unionat té un volum no positiu o no finit.');
    }
    const united=uniteMaterials(model,api,{maxTriangles,maxComponents});
    const out=[],removed=Object.create(null);
    for(const part of united.parts){
      if(!voidSolids.length||!part.faces.length){ // capa buida o buit absent: còpia independent
        out.push({...part,vertices:new Float32Array(part.vertices),faces:new Uint32Array(part.faces)});
        continue;
      }
      const input=own(manifoldOf(api,part,`La capa «${label(part)}»`));
      const before=input.volume();
      let diff=input;
      for(const cutter of voidSolids){
        diff=own(diff.subtract(cutter));
        const status=diff.status();
        if(status!=='NoError')throw Error(`No es pot restar el buit de la capa «${label(part)}» (${status}).`);
      }
      const volume=diff.volume();
      if(!Number.isFinite(volume)||volume<0)throw Error(`La resta de la capa «${label(part)}» ha produït un volum no finit o negatiu.`);
      removed[part.id]=before-volume;
      if(!volume||!diff.numTri()){ // material totalment eliminat: capa buida conservada
        out.push({...part,vertices:new Float32Array(0),faces:new Uint32Array(0)});
        continue;
      }
      const next=typedPart(part,diff),audit=auditPart(next);
      if(audit.errors.length)throw Error(`La resta de la capa «${label(part)}» no supera l’auditoria: ${audit.errors.join(' ')}`);
      out.push(next);
    }
    const result={...united,parts:out};
    if('triangles' in united)result.triangles=out.reduce((n,p)=>n+p.faces.length/3,0);
    result.voids={parts:inputCutters.length,triangles:cutterGroups.flat().reduce((n,p)=>n+p.faces.length/3,0),removed};
    return result;
  }finally{for(const s of owned)s.delete();}
}
