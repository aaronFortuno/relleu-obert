export const CATEGORIES=[
  {id:'terrain',name:'Terreny',color:'#c6b38d'},
  {id:'water',name:'Mar',color:'#8dc5ca'},
  {id:'buildings',name:'Edificis',color:'#eee9dc'},
  {id:'roads',name:'Camins i carreteres',color:'#d8cbb1'},
  {id:'forest',name:'Sòl de bosc',color:'#5d855f'},
  {id:'trees',name:'Arbres',color:'#396b4c'},
  {id:'grass',name:'Prats i zones verdes',color:'#96aa76'},
  {id:'inland-water',name:'Aigües interiors',color:'#6da7b8'},
  {id:'railways',name:'Ferrocarrils',color:'#6f7476'}
];
export const PALETTES={1:['#c6b38d'],2:['#c6b38d','#8dc5ca'],4:['#c6b38d','#8dc5ca','#eee9dc','#4e8966'],8:CATEGORIES.slice(0,8).map(c=>c.color)};
export const RELIEF_MATERIALS=[
  {id:'terrain',name:'Relleu',color:'#aba397'},
  {id:'rock',name:'Sòl nu cartografiat',color:'#787d82'},
  {id:'snow',name:'Neu o gel cartografiat',color:'#f7f8fa'},
  CATEGORIES.find(category=>category.id==='inland-water'),
  CATEGORIES.find(category=>category.id==='forest'),
  CATEGORIES.find(category=>category.id==='water')
];
export const reliefMaterialId=id=>id==='trees'?'forest':id;
const nativeReliefColors=RELIEF_MATERIALS.map(category=>category.color);
const [ground,rock,snow,,forest,sea]=nativeReliefColors;
export const RELIEF_PALETTES={
  1:[ground],2:[ground,sea],3:[ground,sea,forest],
  4:[ground,sea,forest,snow],5:[ground,sea,forest,snow,rock],6:nativeReliefColors
};
const reliefAssignments={
  1:[0,0,0,0,0,0],
  2:[0,0,0,1,0,1],
  3:[0,0,0,1,2,1],
  4:[0,0,3,1,2,1],
  5:[0,4,3,1,2,1],
  6:[0,1,2,3,4,5]
};
export function defaultReliefAssignments(count){
  if(!Number.isInteger(count)||!Object.hasOwn(reliefAssignments,count))throw Error('Tria entre 1 i 6 materials.');
  return reliefAssignments[count].slice();
}
export function normalizeReliefAssignments(count,assignments=defaultReliefAssignments(count)){
  if(!Number.isInteger(count)||!Object.hasOwn(RELIEF_PALETTES,count)||!Array.isArray(assignments)||
     assignments.length!==RELIEF_MATERIALS.length||assignments.some(i=>!Number.isInteger(i)||i<0||i>=count))
    throw Error('L’assignació de materials del relleu no és vàlida.');
  return assignments.slice();
}

export function groupReliefMaterials(model,count=6,assignments,{paletteOnly=false}={}){
  assignments=normalizeReliefAssignments(count,assignments);
  const colors=RELIEF_PALETTES[count],groups=colors.map(()=>[]);
  for(const part of model.categories||model.parts){
    if(!part.faces.length)continue;
    const index=RELIEF_MATERIALS.findIndex(category=>category.id===reliefMaterialId(part.id));
    if(index<0)throw Error('Categoria de relleu desconeguda.');
    groups[assignments[index]].push(part);
  }
  const parts=groups.flatMap((group,index)=>{
    if(!group.length)return [];
    const name=[...new Set(group.map(part=>part.name))].join(' · ');
    const material={id:`material-${index+1}`,name,color:colors[index]};
    if(paletteOnly)return [material];
    if(group.length===1)return [{...group[0],...material}];
    return [{...material,...joinReliefMeshes(group)}];
  });
  return {...model,parts,materialCount:count,materialsUsed:parts.length,
    provenance:{...model.provenance,materials:{requested:count,assignments,colors}}};
}

function joinReliefMeshes(parts){
  const vertices=new Float32Array(parts.reduce((total,part)=>total+part.vertices.length,0));
  const faces=new Uint32Array(parts.reduce((total,part)=>total+part.faces.length,0));
  let vertexOffset=0,faceOffset=0;
  for(const part of parts){
    vertices.set(part.vertices,vertexOffset);
    const indexOffset=vertexOffset/3;
    for(const index of part.faces)faces[faceOffset++]=index+indexOffset;
    vertexOffset+=part.vertices.length;
  }
  return {vertices,faces};
}

export function nativeReliefParts(categories){
  const groups=new Map();
  for(const part of categories){
    if(!part.faces.length)continue;
    const id=reliefMaterialId(part.id),group=groups.get(id);
    if(group)group.push(part);else groups.set(id,[part]);
  }
  return [...groups].map(([id,group])=>{
    if(group.length===1&&group[0].id===id)return group[0];
    const material=RELIEF_MATERIALS.find(category=>category.id===id);
    return {...material,...(group.length===1?{vertices:group[0].vertices,faces:group[0].faces}:joinReliefMeshes(group))};
  });
}

export function defaultAssignments(count){
  if(count===1)return CATEGORIES.map(()=>0);
  if(count===2)return [0,1,0,0,0,0,0,1,0];
  if(count===4)return [0,1,2,2,3,3,3,1,2];
  if(count===8)return [0,1,2,3,4,5,6,7,2];
  throw Error('Tria 1, 2, 4 o 8 materials.');
}
// Old callers/configurations had eight categories. Their railway assignment
// inherits roads, preserving the existing four-colour preview and export.
export function normalizeAssignments(count,assignments=defaultAssignments(count)){
  if(!PALETTES[count]||!Array.isArray(assignments)||![8,9].includes(assignments.length)||assignments.some(i=>!Number.isInteger(i)||i<0||i>=count))throw Error('L’assignació de materials no és vàlida.');
  return assignments.length===8?[...assignments,assignments[3]]:assignments.slice();
}
export function groupMaterials(model,count,assignments){
  if(model.provenance?.options?.pureRelief){
    if(count!==undefined)return groupReliefMaterials(model,count,assignments);
    const parts=nativeReliefParts(model.categories||model.parts);
    return {...model,parts,materialCount:parts.length,materialsUsed:parts.length,
      provenance:{...model.provenance,materials:{requested:parts.length,colors:parts.map(p=>p.color)}}};
  }
  if(count===undefined)count=4;
  assignments=normalizeAssignments(count,assignments);
  const palette=PALETTES[count];
  const groups=palette.map((color,i)=>({id:count===4?['terrain','water','built','green'][i]:`material-${i+1}`,name:`Material ${i+1}`,color,vertices:[],faces:[],labels:[]}));
  for(const part of model.categories||model.parts){const index=CATEGORIES.findIndex(c=>c.id===part.id);if(index<0)throw Error('Categoria desconeguda.');const group=groups[assignments[index]],offset=group.vertices.length/3;for(const v of part.vertices)group.vertices.push(v);for(const i of part.faces)group.faces.push(i+offset);if(part.faces.length)group.labels.push(part.name);}
  const parts=groups.filter(p=>p.faces.length).map(p=>({...p,name:p.labels.join(' · '),vertices:new Float32Array(p.vertices),faces:new Uint32Array(p.faces)}));
  return {...model,parts,materialCount:count,materialsUsed:parts.length,provenance:{...model.provenance,materials:{requested:count,assignments,colors:palette}}};
}
