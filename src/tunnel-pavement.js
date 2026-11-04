import {bridgeDeck} from './infrastructure-solids.js';
import {auditPart,partComponents} from './solid-audit.js';
import {CATEGORIES} from './materials.js';
import {stripSolid} from './bridge-completion.js';

function sectionPavement(sections,thickness){
  const mesh=stripSolid(sections,thickness);
  if(sections[0]?.across)return mesh;
  // Use the same diagonal as the bore's bottom strip. Crossfall varies along
  // a curved portal, so the opposite diagonal could leave a tiny terrain film.
  for(let i=0;i<sections.length-1;i++){
    const left=i*4+2,right=i*4+3,nextLeft=left+4,nextRight=right+4;
    mesh.faces.set([left,right,nextLeft,right,nextRight,nextLeft],i*24+12);
  }
  return mesh;
}

// The useful tunnel floor is path.z. Material is placed entirely BELOW it;
// neither the opening nor the protected minimum base becomes thinner.
export function tunnelPavements(tunnels){
  return tunnels.filter(t=>t.pavementCategory!=null).map(t=>{
    const thickness=t.pavementThicknessMM,base=t.minimumBaseMM;
    if(!['roads','railways'].includes(t.pavementCategory)||!Number.isFinite(thickness)||thickness<.1||thickness>1.65||!Number.isFinite(base)||base<1||!Array.isArray(t.path)||t.path.some(p=>p[2]-thickness<base-1e-6))
      throw Error('El paviment del túnel tallaria la base mínima o té una configuració invàlida.');
    const category=CATEGORIES.find(p=>p.id===t.pavementCategory);
    const width=t.carriagewayWidthMM??t.widthMM;
    if(!Number.isFinite(width)||width<=0||width>t.widthMM+1e-6)throw Error('Amplada de calçada del túnel invàlida.');
    if(t.pavementSections&&(!Array.isArray(t.pavementSections)||t.pavementSections.length!==t.path.length||t.pavementSections.some(s=>(s.across||[s.left,s.right]).some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||p[2]-thickness<base-1e-6))))throw Error('Seccions de paviment del túnel invàlides.');
    return {...category,...(t.pavementSections?sectionPavement(t.pavementSections,thickness):bridgeDeck(t.path,width,thickness)),tunnelId:t.id,thicknessMM:thickness,carriagewayWidthMM:width};
  });
}

function fromSolid(template,solid){
  const status=solid.status(),volume=solid.volume();
  if(status!=='NoError'||!Number.isFinite(volume)||volume<0)throw Error(`Paviment de túnel invàlid (${status}).`);
  if(!volume||!solid.numTri())return {...template,vertices:new Float32Array(0),faces:new Uint32Array(0)};
  const mesh=solid.getMesh(),vertices=new Float32Array(mesh.numVert*3);
  for(let v=0;v<mesh.numVert;v++)for(let k=0;k<3;k++)vertices[v*3+k]=mesh.vertProperties[v*mesh.numProp+k];
  const part={...template,vertices,faces:new Uint32Array(mesh.triVerts)},audit=auditPart(part);
  if(audit.errors.length)throw Error(`El paviment del túnel no supera l’auditoria: ${audit.errors.join(' ')}`);
  return part;
}

// Clip to the ORIGINAL excavatable substrate, including the model boundary.
// These same closed solids replace other substrate materials before being
// appended to roads/railways, within the caller's atomic transaction.
function checked(solid){
  const status=solid.status(),volume=solid.volume();
  if(status!=='NoError'||!Number.isFinite(volume)||volume<0)throw Error(`Operació de túnels invàlida (${status}; volum ${volume}).`);
  return solid;
}

// Only ORIGINAL raw input components are imported separately, using the same
// positive-volume guards as uniteMaterials. No Boolean output is decomposed
// and re-imported: its inner shells stay attached to their parent solid.
function nativeInputs(parts,api,own,{maxTriangles,maxComponents,aggregateTriangles=false,aggregateComponents=false}){
  const groups=new Map();let totalTriangles=0,totalComponents=0;
  for(const part of parts){
    if(typeof part.id!=='string'||!part.id.trim())throw Error('Identificador de material absent.');
    if(!(part.vertices instanceof Float32Array)||!(part.faces instanceof Uint32Array)||part.vertices.length%3||part.faces.length%3)throw Error('Format indexat invàlid en una entrada de túnels.');
    for(const value of part.vertices)if(!Number.isFinite(value))throw Error('Coordenada no finita en una entrada de túnels.');
    for(const index of part.faces)if(index>=part.vertices.length/3)throw Error('Índex fora de rang en una entrada de túnels.');
    let group=groups.get(part.id);
    if(!group)groups.set(part.id,group={part,solids:[],triangles:0,components:0});
    else if(group.part.color!==part.color)throw Error(`El material «${part.id}» té colors conflictius.`);
    const components=partComponents(part.faces);group.triangles+=part.faces.length/3;group.components+=components.length;
    totalTriangles+=part.faces.length/3;totalComponents+=components.length;
    if(group.triangles>maxTriangles||group.components>maxComponents)throw Error(`El material «${part.id}» supera el límit de triangles o components.`);
    if(aggregateTriangles&&totalTriangles>maxTriangles||aggregateComponents&&totalComponents>maxComponents)
      throw Error('El conjunt d’entrades dels túnels supera el límit total de triangles o components.');
    for(const triangles of components){
      const indices=[...new Set(triangles.flatMap(t=>Array.from(part.faces.subarray(t*3,t*3+3))))],map=new Map(indices.map((v,i)=>[v,i]));
      const vertices=new Float32Array(indices.length*3),faces=new Uint32Array(triangles.length*3);
      indices.forEach((v,i)=>vertices.set(part.vertices.subarray(v*3,v*3+3),i*3));
      triangles.forEach((t,i)=>{for(let k=0;k<3;k++)faces[i*3+k]=map.get(part.faces[t*3+k]);});
      const mesh=new api.Mesh({numProp:3,vertProperties:vertices,triVerts:faces});mesh.merge();
      const solid=own(new api.Manifold(mesh));checked(solid);
      if(solid.volume()<=0)throw Error('Un component original dels túnels no té volum positiu.');
      group.solids.push(solid);
    }
  }
  for(const group of groups.values())group.solid=group.solids.length>1?checked(own(api.Manifold.union(group.solids))):group.solids[0]??null;
  return {groups,totalTriangles,totalComponents};
}

function withNativeTunnelSolids(pavements,substrate,api,limits,openings,consume){
  if(!api?.Manifold||!api?.Mesh)throw Error('Cal injectar l’API de manifold-3d ja inicialitzada.');
  const {maxTriangles=2_000_000,maxComponents=10_000,maxVoidTriangles=200_000}=limits;
  for(const [name,value,max]of [['maxTriangles',maxTriangles,2_000_000],['maxComponents',maxComponents,10_000],['maxVoidTriangles',maxVoidTriangles,200_000]])
    if(!Number.isSafeInteger(value)||value<1||value>max)throw Error(`Límit ${name} invàlid (1–${max}).`);
  const owned=[],own=s=>(owned.push(s),s),union=solids=>solids.length>1?checked(own(api.Manifold.union(solids))):solids[0]??null;
  try{
    // Enforce the existing aggregate mask limits before constructing the
    // components of the first source category that exceeds the budget.
    const source=nativeInputs(substrate,api,own,{maxTriangles,maxComponents,aggregateTriangles:true,aggregateComponents:true});
    const original=union([...source.groups.values()].map(g=>g.solid).filter(Boolean));
    const bores=nativeInputs(openings.map(p=>({...p,id:'tunnel-openings',color:'#000000'})),api,own,{maxTriangles:maxVoidTriangles,maxComponents});
    const bore=bores.groups.get('tunnel-openings')?.solid??null;
    const floors=nativeInputs(pavements,api,own,{maxTriangles:maxVoidTriangles,maxComponents,aggregateTriangles:true}),clipped=new Map();
    if(original)for(const [id,group]of floors.groups){
      if(!group.solid)continue;
      let floor=checked(own(group.solid.intersect(original)));
      if(bore)floor=checked(own(floor.subtract(bore)));
      clipped.set(id,{part:group.part,solid:floor});
    }
    const rail=clipped.get('railways'),road=clipped.get('roads');
    if(rail&&road)road.solid=checked(own(road.solid.subtract(rail.solid)));
    let cutterTriangles=bores.totalTriangles,cutterComponents=bores.totalComponents;
    for(const floor of clipped.values()){
      cutterTriangles+=floor.solid.numTri();
      if(!floor.solid.numTri())continue;
      const components=floor.solid.decompose();try{cutterComponents+=components.length;}finally{for(const component of components)component.delete();}
    }
    if(cutterTriangles>maxVoidTriangles||cutterComponents>maxComponents)throw Error('Els talladors dels túnels superen el límit de triangles o components.');
    return consume({source:source.groups,bore,clipped,own,union});
  }finally{for(const solid of owned)solid.delete();}
}

export function clipTunnelPavements(pavements,substrate,api,limits={},openings=[]){
  if(!pavements.length||!substrate.length)return [];
  return withNativeTunnelSolids(pavements,substrate,api,limits,openings,({clipped})=>[...clipped.values()].map(({part,solid})=>fromSolid(part,solid)).filter(p=>p.faces.length));
}

// Keep clipping, excavation and the final material union in WASM. In
// particular, neither a floor nor an excavated material is rounded to Float32
// and split into standalone shells before all Boolean operations are done.
export function carveTunnelMaterials(substrate,openings,pavements,api,limits={}){
  return withNativeTunnelSolids(pavements,substrate,api,limits,openings,({source,bore,clipped,own,union})=>{
    const floors=[...clipped.values()].filter(g=>g.solid.numTri()),voidSolid=union([bore,...floors.map(g=>g.solid)].filter(Boolean)),parts=[],removed=Object.create(null);
    const ids=new Set([...source.keys(),...clipped.keys()]);
    for(const id of ids){
      const input=source.get(id),floor=clipped.get(id),template=input?.part??floor.part;
      let solid=input?.solid??null;
      // The same colour already owns its existing pavement. Subtracting that
      // floor and immediately adding it back creates a needless, nearly
      // coplanar portal seam before the final Float32 conversion. Remove
      // the bore and OTHER floors only; their material replacement is real.
      const cutter=floor?union([bore,...floors.filter(g=>g.part.id!==id).map(g=>g.solid)].filter(Boolean)):voidSolid;
      if(solid&&cutter){const before=solid.volume();solid=checked(own(solid.subtract(cutter)));removed[id]=before-solid.volume();}
      if(floor?.solid.numTri())solid=union([solid,floor.solid].filter(Boolean));
      parts.push(solid?fromSolid(template,solid):{...template,vertices:new Float32Array(0),faces:new Uint32Array(0)});
    }
    return {parts,removed,pavements:floors.map(g=>({category:g.part.id,thicknessMM:g.part.thicknessMM}))};
  });
}
