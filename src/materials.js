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
export function groupMaterials(model,count=4,assignments=defaultAssignments(count)){
  assignments=normalizeAssignments(count,assignments);
  const palette=PALETTES[count];
  const groups=palette.map((color,i)=>({id:count===4?['terrain','water','built','green'][i]:`material-${i+1}`,name:`Material ${i+1}`,color,vertices:[],faces:[],labels:[]}));
  for(const part of model.categories||model.parts){const index=CATEGORIES.findIndex(c=>c.id===part.id);if(index<0)throw Error('Categoria desconeguda.');const group=groups[assignments[index]],offset=group.vertices.length/3;for(const v of part.vertices)group.vertices.push(v);for(const i of part.faces)group.faces.push(i+offset);if(part.faces.length)group.labels.push(part.name);}
  const parts=groups.filter(p=>p.faces.length).map(p=>({...p,name:p.labels.join(' · '),vertices:new Float32Array(p.vertices),faces:new Uint32Array(p.faces)}));
  return {...model,parts,materialCount:count,materialsUsed:parts.length,provenance:{...model.provenance,materials:{requested:count,assignments,colors:palette}}};
}
