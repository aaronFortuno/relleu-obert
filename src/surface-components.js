import {partComponents,rawEdges} from './solid-audit.js';
import {polygonOps} from './polygon-ops.js';

function bounds(part,triangles){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  const vertex=i=>{
    if(!Number.isInteger(i)||i<0||i*3+2>=part.vertices.length)throw Error('Índex invàlid en una capa de superfície.');
    for(let k=0;k<3;k++){const v=part.vertices[i*3+k];if(!Number.isFinite(v))throw Error('Coordenada no finita en una capa de superfície.');min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);}
  };
  if(triangles)for(const t of triangles)for(let k=0;k<3;k++)vertex(part.faces[t*3+k]);
  else for(let i=0;i<part.vertices.length/3;i++)vertex(i);
  return {min,max};
}
const intersects=(a,b)=>a.min.every((v,k)=>v<=b.max[k]+.001&&a.max[k]>=b.min[k]-.001);
function extract(part,triangles){
  // Preserve original vertex/triangle order while compacting indices. Distant
  // grid prisms must not be reordered by an unrelated nearby boolean.
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

function positiveArea(ring){
  if(ring.length<3)return false;
  const a=ring[0];let twice=0;
  for(let i=1;i<ring.length-1;i++)twice+=(ring[i][0]-a[0])*(ring[i+1][1]-a[1])-(ring[i][1]-a[1])*(ring[i+1][0]-a[0]);
  return twice!==0;
}
function intersectsFootprint(part,triangles,footprint){
  if(!Array.isArray(footprint))throw Error('Petjada de tallador invàlida.');
  if(!footprint.length)return false;
  for(const t of triangles){
    const ring=[0,1,2].map(k=>Array.from(part.vertices.subarray(part.faces[t*3+k]*3,part.faces[t*3+k]*3+2)));
    if(!positiveArea(ring))continue;
    ring.push(ring[0]);
    if(polygonOps().intersection([[ring]],footprint).some(p=>positiveArea(p[0])))return true;
  }
  return false;
}

// Boolean output may contain a closed tetrahedron whose distinct indices have
// collapsed to at most three EXACT Float32 XYZ positions. It cannot enclose
// volume. Remove only this proven case, never a small signed-volume threshold:
// a positive sliver at large world coordinates must survive unchanged.
export function removeCollapsedSurfaceComponents(parts){
  let count=0;const byCategory=Object.create(null),cleaned=parts.map(part=>{
    const keep=[];let removed=0;
    for(const component of partComponents(part.faces)){
      const positions=new Set();
      for(const t of component){for(let k=0;k<3;k++){
        const i=part.faces[t*3+k]*3;positions.add(`${part.vertices[i]},${part.vertices[i+1]},${part.vertices[i+2]}`);
      }if(positions.size>3)break;}
      let collapsed=false;
      if(positions.size<=3){
        const faces=new Uint32Array(component.flatMap(t=>Array.from(part.faces.subarray(t*3,t*3+3)))),edges=rawEdges(faces);
        collapsed=!edges.boundary&&!edges.nonManifold&&!edges.orientationConflicts;
      }
      if(collapsed){removed++;continue;}
      for(const t of component)keep.push(t);
    }
    if(!removed)return part;
    count+=removed;byCategory[part.id]=(byCategory[part.id]||0)+removed;
    return keep.length?extract(part,keep):{...part,vertices:new Float32Array(0),faces:new Uint32Array(0)};
  });
  return {parts:cleaned,count,byCategory};
}

// Select whole closed components near any cutter, not the complete regional
// material. Existing boolean limits then apply only to these local candidates.
// No input is mutated. restore reattaches untouched components in their source
// order and retains protected layers by identity; it can add a new local id.
// Optional footprints must conservatively cover their corresponding cutter's
// XY projection. A cutter without one always retains its AABB candidates.
export function selectSurfaceComponents(surfaceParts,cutters,{categories=[],footprints=[]}={}){
  if(!Array.isArray(surfaceParts)||!Array.isArray(cutters)||!(Array.isArray(categories)||categories instanceof Set))throw Error('Calen capes, talladors i categories de superfície vàlids.');
  const allowed=new Set(categories),cutterBounds=cutters.map(p=>bounds(p)),selected=[],kept=new Map();let considered=0,candidates=0,footprintExcluded=0;
  for(const part of surfaceParts){
    if(!allowed.has(part.id))continue;
    if(!(part.vertices instanceof Float32Array)||!(part.faces instanceof Uint32Array)||part.vertices.length%3||part.faces.length%3)throw Error('Format de capa invàlid per seleccionar components de superfície.');
    const touching=[],outside=[];
    for(const component of partComponents(part.faces)){
      considered++;
      const componentBounds=bounds(part,component),nearby=cutterBounds.map((c,i)=>intersects(componentBounds,c)?i:-1).filter(i=>i>=0);
      const hit=nearby.some(i=>footprints[i]==null||intersectsFootprint(part,component,footprints[i])),list=hit?touching:outside;
      if(nearby.length&&!hit)footprintExcluded++;
      for(const t of component)list.push(t);
      if(list===touching)candidates++;
    }
    if(touching.length){selected.push(outside.length?extract(part,touching):part);if(outside.length)kept.set(part.id,extract(part,outside));}
  }
  const selectedIds=new Set(selected.map(p=>p.id));
  const restore=localParts=>{
    if(!Array.isArray(localParts))throw Error('Cal una llista de capes locals per restaurar la superfície.');
    const byId=new Map(localParts.map(p=>[p.id,combine(kept.get(p.id),p)])),parts=surfaceParts.map(p=>{
      const replacement=byId.get(p.id);byId.delete(p.id);
      return replacement?(selectedIds.has(p.id)?replacement:combine(p,replacement)):p;
    });
    parts.push(...byId.values());return parts;
  };
  return {selected,restore,considered,candidates,footprintExcluded};
}
