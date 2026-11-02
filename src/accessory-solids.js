export function finiteRange(value,min,max,label){
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error(`${label}: tria un valor entre ${min} i ${max} mm.`);
  return value;
}
export function accessoryColor(value='#314e3a'){
  if(!/^#[0-9a-f]{6}$/i.test(value))throw Error('Color del complement invàlid.');
  return value;
}
export function translateSolid(solid,offset){try{return solid.translate(offset);}finally{solid.delete();}}
export function solidPart(solid,id,name,color){
  if(solid.status()!=='NoError'||solid.numTri()===0||solid.volume()<=0)throw Error('El complement no forma un sòlid vàlid.');
  const mesh=solid.getMesh(),vertices=new Float32Array(mesh.numVert*3);
  for(let i=0;i<mesh.numVert;i++)for(let k=0;k<3;k++)vertices[i*3+k]=mesh.vertProperties[i*mesh.numProp+k];
  return {id,name,color:accessoryColor(color),vertices,faces:new Uint32Array(mesh.triVerts),offset:[0,0,0]};
}
// All temporary solids belong to this call; exported arrays are independent copies.
export function joinedPart(api,build,id,name,color){
  const owned=[];let joined;
  try{build(s=>{owned.push(s);return s;});joined=api.Manifold.union(owned);return solidPart(joined,id,name,color);}
  finally{joined?.delete();for(const s of owned)s.delete();}
}
