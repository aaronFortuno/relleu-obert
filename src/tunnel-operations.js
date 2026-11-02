import {subtractVoids} from './solid-voids.js';
import {partComponents} from './solid-audit.js';

// Call ONLY on the static surface layers, before adding buildings, trees,
// bridge decks and piers. Protected layers retain their original buffers.
const EXCAVATABLE=new Set(['terrain','roads','railways','forest','grass']);
function bounds(part,triangles){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  const vertex=i=>{
    if(!Number.isInteger(i)||i<0||i*3+2>=part.vertices.length)throw Error('Índex invàlid en una capa de túnels.');
    for(let k=0;k<3;k++){const v=part.vertices[i*3+k];if(!Number.isFinite(v))throw Error('Coordenada no finita en una capa de túnels.');min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);}
  };
  if(triangles)for(const t of triangles)for(let k=0;k<3;k++)vertex(part.faces[t*3+k]);
  else for(let i=0;i<part.vertices.length/3;i++)vertex(i);
  return {min,max};
}
const intersects=(a,b)=>a.min.every((v,k)=>v<=b.max[k]+.001&&a.max[k]>=b.min[k]-.001);
function extract(part,triangles){
  // Keep the source ordering while compacting indices. Encountering vertices
  // in triangle order would reorder even untouched, distant components.
  const ordered=triangles.slice().sort((a,b)=>a-b),used=new Set();
  for(const t of ordered)for(let k=0;k<3;k++)used.add(part.faces[t*3+k]);
  const indices=[...used].sort((a,b)=>a-b),remap=new Map(),vertices=new Float32Array(indices.length*3),faces=new Uint32Array(ordered.length*3);
  indices.forEach((g,i)=>{remap.set(g,i);vertices.set(part.vertices.subarray(g*3,g*3+3),i*3);});
  let i=0;for(const t of ordered)for(let k=0;k<3;k++)faces[i++]=remap.get(part.faces[t*3+k]);
  return {...part,vertices,faces};
}
function combine(a,b){
  if(!a?.faces.length)return b;if(!b?.faces.length)return a;
  const vertices=new Float32Array(a.vertices.length+b.vertices.length),faces=new Uint32Array(a.faces.length+b.faces.length),offset=a.vertices.length/3;
  vertices.set(a.vertices);vertices.set(b.vertices,a.vertices.length);faces.set(a.faces);
  for(let i=0;i<b.faces.length;i++)faces[a.faces.length+i]=b.faces[i]+offset;
  return {...a,vertices,faces};
}
export function carveTerrainTunnels(surfaceParts,tunnels,api,limits={}){
  if(!Array.isArray(surfaceParts)||!Array.isArray(tunnels))throw Error('Cal una llista de capes i túnels.');
  if(!tunnels.length)return {parts:surfaceParts,warnings:[],metadata:{applied:false,count:0}};
  try{
    const cutters=tunnels.map(t=>bounds(t)),selected=[],kept=new Map();let considered=0,candidates=0;
    for(const part of surfaceParts){
      if(!EXCAVATABLE.has(part.id))continue;
      if(!(part.vertices instanceof Float32Array)||!(part.faces instanceof Uint32Array)||part.vertices.length%3||part.faces.length%3)throw Error('Format de capa invàlid per excavar túnels.');
      const touching=[],outside=[];
      for(const component of partComponents(part.faces)){
        considered++;
        // Only closed components near any cutter need a boolean operation.
        // The high-detail terrain has thousands of independent grid prisms;
        // passing all of them to union would exceed the existing 10k guard.
        const componentBounds=bounds(part,component),list=cutters.some(c=>intersects(componentBounds,c))?touching:outside;
        for(const t of component)list.push(t);
        if(list===touching)candidates++;
      }
      if(touching.length){selected.push(outside.length?extract(part,touching):part);if(outside.length)kept.set(part.id,extract(part,outside));}
    }
    const cut=subtractVoids({parts:selected},tunnels,api,limits),byId=new Map(cut.parts.map(p=>[p.id,combine(kept.get(p.id),p)]));
    return {parts:surfaceParts.map(p=>byId.get(p.id)||p),warnings:[],metadata:{applied:true,count:tunnels.length,consideredComponents:considered,excavatedCandidateComponents:candidates,removedMM3:{...cut.voids.removed},profiles:tunnels.map(t=>({id:t.id,sourceFeatureIds:t.sourceFeatureIds,sourceEndpoints:t.sourceEndpoints,pathMM:t.path,estimated:true,elevationMethod:t.elevationMethod,widthMM:t.widthMM,heightMM:t.heightMM,portalAdjustmentMM:t.portalAdjustmentMM,portalAdjustmentMetres:t.portalAdjustmentMetres,maximumPortalAdjustmentMetres:t.maximumPortalAdjustmentMetres,portalRampGrades:t.portalRampGrades,maximumPortalRampGrade:t.maximumPortalRampGrade,portalExtensionMM:t.portalExtensionMM,portalExtensionMetres:t.portalExtensionMetres}))}};
  }catch(error){
    return {parts:surfaceParts,warnings:[`No s’han pogut obrir els túnels experimentals; es conserva el terreny anterior. ${error.message}`],metadata:{applied:false,count:0,error:error.message}};
  }
}
