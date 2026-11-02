// RO-024 fase 1: auditoria de peces indexades (vèrtexs XYZ + índexs de triangles).
// Cap reparació silenciosa: tot problema queda explicitat a la llista d'errors.
//
// Limitació de la topologia crua d'índexs: components i arestes es calculen
// sobre índexs, no sobre posicions. Dos vèrtexs amb la mateixa coordenada però
// índex diferent (sense soldar) compten com a topologia separada: una peça
// geomètricament tancada pot aparèixer amb arestes de vora i més components
// dels reals fins que una eina externa (p. ex. Manifold mesh.merge()) soldi
// els vèrtexs duplicats.

export function signedVolume(vertices,faces){
  let v6=0;
  for(let t=0;t+2<faces.length;t+=3){
    const a=faces[t]*3,b=faces[t+1]*3,c=faces[t+2]*3;
    const ax=vertices[a],ay=vertices[a+1],az=vertices[a+2];
    const bx=vertices[b],by=vertices[b+1],bz=vertices[b+2];
    const cx=vertices[c],cy=vertices[c+1],cz=vertices[c+2];
    v6+=ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx);
  }
  return v6/6;
}

// Recompte cru d'arestes per índexs: vora (una sola cara incident), no varietat
// (més de dues) i conflicte d'orientació (dues cares amb el mateix sentit).
export function rawEdges(faces){
  const edges=new Map();
  for(let t=0;t+2<faces.length;t+=3)for(let k=0;k<3;k++){
    const a=faces[t+k],b=faces[t+(k+1)%3],key=a<b?a+','+b:b+','+a;
    let e=edges.get(key);if(!e)edges.set(key,e={forward:0,reverse:0});
    if(a<b)e.forward++;else e.reverse++;
  }
  let boundary=0,nonManifold=0,orientationConflicts=0;
  for(const e of edges.values()){
    const total=e.forward+e.reverse;
    if(total===1)boundary++;
    else if(total>2)nonManifold++;
    else if(e.forward!==1)orientationConflicts++;
  }
  return {total:edges.size,boundary,nonManifold,orientationConflicts};
}

// Components connexos per adjacència d'índexs (unió-find sobre triangles).
// Torna una llista de llistes d'índexs de triangle; peça buida → [].
export function partComponents(faces){
  const n=Math.floor(faces.length/3);if(!n)return[];
  const parent=new Int32Array(n);for(let i=0;i<n;i++)parent[i]=i;
  const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  const owner=new Map();
  for(let t=0;t<n;t++)for(let k=0;k<3;k++){
    const v=faces[t*3+k],prev=owner.get(v);
    if(prev===undefined)owner.set(v,t);
    else{const ra=find(t),rb=find(prev);if(ra!==rb)parent[ra]=rb;}
  }
  const groups=new Map();
  for(let t=0;t<n;t++){const root=find(t);let g=groups.get(root);if(!g)groups.set(root,g=[]);g.push(t);}
  return [...groups.values()];
}

export function auditPart(part){
  const name=part?.name??part?.id??'(sense nom)',errors=[];
  const r={id:part?.id,name,errors,empty:false,finite:true,vertices:0,triangles:0,
    bbox:null,dimensions:null,signedVolume:null,orientation:'cap',edges:null,closed:false,components:0};
  if(!(part?.vertices instanceof Float32Array)||!(part?.faces instanceof Uint32Array)){
    errors.push('format no indexat: calen vèrtexs Float32Array XYZ i cares Uint32Array d’índexs.');return r;
  }
  const {vertices,faces}=part;
  if(vertices.length%3)errors.push(`la llista de vèrtexs (${vertices.length} components) no és múltiple de 3.`);
  if(faces.length%3)errors.push(`la llista d’índexs (${faces.length}) no és múltiple de 3.`);
  const nv=Math.floor(vertices.length/3),nt=Math.floor(faces.length/3);
  r.vertices=nv;r.triangles=nt;
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  let badCoord=0;
  for(let i=0;i<nv*3;i++){
    const v=vertices[i];
    if(!Number.isFinite(v)){badCoord++;r.finite=false;if(badCoord===1)errors.push(`coordenada no finita al vèrtex ${Math.floor(i/3)}.`);}
    else{const k=i%3;if(v<min[k])min[k]=v;if(v>max[k])max[k]=v;}
  }
  if(badCoord>1)errors.push(`${badCoord} components de coordenades no finites en total.`);
  if(!nt){r.empty=true;r.signedVolume=0;return r;} // buida, però les coordenades s’han comprovat
  let badIndex=0;
  for(let t=0;t<nt*3;t++)if(faces[t]>=nv){badIndex++;if(badIndex===1)errors.push(`índex de vèrtex fora de rang: ${faces[t]} amb ${nv} vèrtexs.`);}
  if(badIndex>1)errors.push(`${badIndex} índexs fora de rang en total.`);
  if(badIndex)return r; // sense correspondència fiable vèrtex-cara no seguim
  if(r.finite){r.bbox={min,max};r.dimensions=[max[0]-min[0],max[1]-min[1],max[2]-min[2]];}
  const idx=faces.subarray(0,nt*3),volume=signedVolume(vertices,idx);
  r.signedVolume=volume;
  r.orientation=volume>0?'positiva':volume<0?'negativa':'cap';
  if(!Number.isFinite(volume)||volume===0)errors.push('volum nul o no finit: no defineix un sòlid positiu.');
  if(volume<0)errors.push(`orientació negativa: volum signat ${volume}; cal invertir el sentit de les cares (no es repara automàticament).`);
  const edges=rawEdges(idx);r.edges=edges;
  if(edges.boundary)errors.push(`malla no tancada: ${edges.boundary} arestes de vora (topologia crua d’índexs; vèrtexs sense soldar hi apareixen com a vora).`);
  if(edges.nonManifold)errors.push(`${edges.nonManifold} arestes no varietat (més de dues cares incidents).`);
  if(edges.orientationConflicts)errors.push(`${edges.orientationConflicts} arestes amb orientació inconsistent entre cares.`);
  r.closed=!edges.boundary&&!edges.nonManifold&&!edges.orientationConflicts;
  r.components=partComponents(idx).length;
  return r;
}

export function auditModel(model){
  const parts=(model?.parts??[]).map(auditPart);
  return {parts,valid:parts.every(p=>!p.errors.length),materials:new Set(parts.map(p=>p.id)).size,
    triangles:parts.reduce((n,p)=>n+p.triangles,0)};
}
