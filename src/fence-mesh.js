import earcut from 'earcut';
import {lineBuffer} from './roads.js';
import {polygonOps} from './polygon-ops.js';
import {normalizeFences} from './fence-settings.js';

const polygons=polygonOps(1e-6,{recoverMillimetreUnions:true});
const EMBED_MM=.45;
const MAX_EDGE_MM=4;
const MIN_EDGE_MM=.18;
const MAX_GROUND_ERROR_MM=.12;

function mergeFootprints(items){
  // A hierarchy avoids merging small batches into a growing outline until
  // every stroke in the project has been processed.
  while(items.length>30){
    const next=[];
    for(let i=0;i<items.length;i+=30)next.push(polygons.union(...items.slice(i,i+30)));
    items=next;
  }
  return polygons.union(...items);
}

function polygonMesh(rings,ground,rise){
  const xy=[],heights=[],holes=[],active=new Set(),edges=new Map(),queue=[];
  function vertex(x,y){
    const z=ground(x,y);
    if(!Number.isFinite(z))throw Error('No hi ha una cota de terreny vàlida per a la tanca.');
    const id=heights.length;
    xy.push(x,y);heights.push(Math.max(0,z));
    return id;
  }
  for(const ring of rings){
    const open=[];
    for(const coordinate of ring.slice(0,-1)){
      const x=Math.fround(coordinate[0]),y=Math.fround(coordinate[1]);
      if(!open.length||x!==open.at(-1)[0]||y!==open.at(-1)[1])open.push([x,y]);
    }
    if(open.length>1&&open[0][0]===open.at(-1)[0]&&open[0][1]===open.at(-1)[1])open.pop();
    if(open.length<3){if(!xy.length)return null;continue;}
    if(xy.length)holes.push(xy.length/2);
    for(const [x,y]of open)vertex(x,y);
  }
  const triangulation=earcut(xy,holes);
  const key=(a,b)=>a<b?a+':'+b:b+':'+a;
  function enqueue(edge){
    edge.queued=true;
    let i=queue.length;
    queue.push(edge);
    while(i>0){const p=(i-1)>>1;if(queue[p].length>=edge.length)break;queue[i]=queue[p];i=p;}
    queue[i]=edge;
  }
  function popEdge(){
    const edge=queue[0],last=queue.pop();
    if(queue.length){
      let i=0;
      while(i*2+1<queue.length){
        let j=i*2+1;
        if(j+1<queue.length&&queue[j+1].length>queue[j].length)j++;
        if(last.length>=queue[j].length)break;
        queue[i]=queue[j];i=j;
      }
      queue[i]=last;
    }
    edge.queued=false;
    return edge;
  }
  function attach(a,b,face){
    const k=key(a,b);
    let edge=edges.get(k);
    if(!edge){
      const length=Math.hypot(xy[b*2]-xy[a*2],xy[b*2+1]-xy[a*2+1]);
      edge={a,b,length,faces:new Set()};
      if(length>MIN_EDGE_MM){
        const x=Math.fround((xy[a*2]+xy[b*2])/2),y=Math.fround((xy[a*2+1]+xy[b*2+1])/2);
        const z=ground(x,y);
        if(!Number.isFinite(z))throw Error('No hi ha una cota de terreny vàlida per a la tanca.');
        if(length>MAX_EDGE_MM||Math.abs(Math.max(0,z)-(heights[a]+heights[b])/2)>MAX_GROUND_ERROR_MM)
          edge.mid=[x,y,Math.max(0,z)];
      }
      edges.set(k,edge);
    }
    edge.faces.add(face);
    if(edge.mid&&!edge.queued)enqueue(edge);
  }
  function addFace(a,b,c){
    const face=[a,b,c];active.add(face);
    attach(a,b,face);attach(b,c,face);attach(c,a,face);
  }
  for(let t=0;t<triangulation.length;t+=3){
    const [a,b,c]=triangulation.slice(t,t+3);
    const area=(xy[b*2]-xy[a*2])*(xy[c*2+1]-xy[a*2+1])-(xy[b*2+1]-xy[a*2+1])*(xy[c*2]-xy[a*2]);
    if(area>0)addFace(a,b,c);
    else if(area<0)addFace(a,c,b);
  }
  // Split both faces at once to keep a conforming mesh. Longest first also
  // avoids the quadratic subdivision of a long, narrow and almost flat wall.
  while(queue.length){
    const edge=popEdge();
    if(!edge.faces.size)continue;
    const m=heights.length,[x,y,z]=edge.mid;
    xy.push(x,y);heights.push(z);
    for(const face of [...edge.faces]){
      active.delete(face);
      for(let i=0;i<3;i++)edges.get(key(face[i],face[(i+1)%3])).faces.delete(face);
      const start=face.findIndex((a,i)=>
        a===edge.a&&face[(i+1)%3]===edge.b||a===edge.b&&face[(i+1)%3]===edge.a);
      const a=face[start],b=face[(start+1)%3],c=face[(start+2)%3];
      addFace(a,m,c);addFace(m,b,c);
    }
  }
  if(!active.size)return null;
  const border=[...edges.values()].filter(edge=>edge.faces.size===1),topSize=active.size*3;
  const n=heights.length,vertices=new Float32Array(n*6),faces=new Uint32Array(topSize*2+border.length*6);
  for(let i=0;i<n;i++){
    const coords=[xy[i*2],xy[i*2+1]],z=heights[i];
    vertices.set([...coords,z+rise],i*3);
    vertices.set([...coords,Math.max(0,z-EMBED_MM)],(n+i)*3);
  }
  let offset=0;
  for(const face of active){const [a,b,c]=face;faces.set(face,offset);faces.set([c+n,b+n,a+n],topSize+offset);offset+=3;}
  offset=topSize*2;
  for(const edge of border){
    const face=edge.faces.values().next().value,a=edge.a,b=edge.b;
    if(face[(face.indexOf(a)+1)%3]===b)faces.set([a,a+n,b+n,a,b+n,b],offset);
    else faces.set([b,b+n,a+n,b,a+n,a],offset);
    offset+=6;
  }
  return {vertices,faces};
}

function combine(meshes){
  if(meshes.length===1)return meshes[0];
  const vertices=new Float32Array(meshes.reduce((total,p)=>total+p.vertices.length,0));
  const faces=new Uint32Array(meshes.reduce((total,p)=>total+p.faces.length,0));
  let v=0,f=0;
  for(const mesh of meshes){
    vertices.set(mesh.vertices,v);
    for(const index of mesh.faces)faces[f++]=index+v/3;
    v+=mesh.vertices.length;
  }
  return {vertices,faces};
}

function unionMeshes(meshes,api){
  if(!api?.Manifold||!api?.Mesh)throw Error('Cal el motor de geometria per unir tanques superposades.');
  const parts=[];
  let union;
  try{
    for(const {vertices,faces}of meshes){
      const solid=new api.Manifold(new api.Mesh({numProp:3,vertProperties:vertices,triVerts:faces}));
      parts.push(solid);
      if(solid.status()!=='NoError')throw Error('No s’ha pogut tancar la malla de la tanca.');
    }
    union=api.Manifold.union(parts);
    if(union.status()!=='NoError'||!(union.volume()>0))throw Error('No s’han pogut unir les tanques superposades.');
    const mesh=union.getMesh(),vertices=new Float32Array(mesh.numVert*3);
    for(let i=0;i<mesh.numVert;i++)
      for(let d=0;d<3;d++)vertices[i*3+d]=mesh.vertProperties[i*mesh.numProp+d];
    return {vertices,faces:new Uint32Array(mesh.triVerts)};
  }finally{
    union?.delete();
    for(const solid of parts)solid.delete();
  }
}

// Sample the model's ground in print-space and clip at the crop before
// extruding. Tile cuts subsequently clip this same indexed solid for export.
export function buildFenceMesh(fences,{proj,ground,width,height,api}){
  const groups=new Map(),rect=[[[[0,0],[width,0],[width,height],[0,height],[0,0]]]];
  for(const {points,widthMM,heightMM,closed}of normalizeFences(fences)){
    const line=points.map(point=>proj.project(point));
    if(closed)line.push(line[0]);
    const footprint=lineBuffer(line,widthMM/2,[width,height]);
    if(!footprint.length)continue;
    const sameHeight=groups.get(heightMM)??[];
    sameHeight.push(...footprint);
    groups.set(heightMM,sameHeight);
  }
  const clipped=[...groups].map(([rise,outlines])=>[rise,polygons.intersection(mergeFootprints(outlines),rect)])
    .filter(([,footprint])=>footprint.length);
  const meshes=clipped.flatMap(([rise,footprint])=>footprint.map(rings=>polygonMesh(rings,ground,rise))).filter(Boolean);
  if(!meshes.length)return null;
  const overlap=clipped.some(([,footprint],i)=>clipped.slice(0,i)
    .some(([,other])=>polygons.intersection(footprint,other).length));
  return {...(overlap&&meshes.length>1?unionMeshes(meshes,api):combine(meshes)),
    footprint:clipped.length===1?clipped[0][1]:mergeFootprints(clipped.map(([,footprint])=>footprint))};
}
