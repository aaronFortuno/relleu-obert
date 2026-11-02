// Offline preparation of the bundled ICGC sample; the app itself remains static.
// Obtain the source ZIP linked in work/RO-033-IMPLEMENTACIO.md, unzip its main
// IFC to output/full280110.ifc, then: node scripts/prepare-infrastructure.mjs
import {readFile,writeFile} from 'node:fs/promises';import proj4 from 'proj4';import earcut from 'earcut';
const s=await readFile('output/full280110.ifc','utf8'),entities=new Map([...s.matchAll(/^#(\d+)=(.*);\s*$/gm)].map(m=>[+m[1],m[2].trim()]));
const refs=e=>[...e.matchAll(/#(\d+)/g)].map(m=>+m[1]),get=(id,type)=>{const e=entities.get(id);if(!e?.startsWith(type+'('))throw Error('Unexpected '+id+': '+e);return e;};
const proj=proj4('+proj=utm +zone=31 +ellps=GRS80 +units=m +no_defs','EPSG:4326');
const source=JSON.parse(await readFile('public/data/eix-diagonal.json','utf8')),bbox=source.bbox;
const items=[];
for(const [id,rhs]of entities)if(rhs.startsWith('IFCBUILDINGELEMENTPROXY')&&/,'tpn',/.test(rhs)){
 const shape=refs(rhs).find(r=>entities.get(r)?.startsWith('IFCPRODUCTDEFINITIONSHAPE'));
 const rep=refs(get(shape,'IFCPRODUCTDEFINITIONSHAPE'))[0],brep=refs(get(rep,'IFCSHAPEREPRESENTATION')).find(r=>entities.get(r)?.startsWith('IFCFACETEDBREP'));
 if(!brep)throw Error('Unsupported representation');
 const shell=refs(get(brep,'IFCFACETEDBREP'))[0],verts=[],faces=[],lookup=new Map();
 for(const fid of refs(get(shell,'IFCCLOSEDSHELL'))){
  const bounds=refs(get(fid,'IFCFACE'));if(bounds.length!==1)throw Error('Face holes unsupported');
  const bound=get(bounds[0],'IFCFACEOUTERBOUND'),loop=refs(bound)[0],ids=refs(get(loop,'IFCPOLYLOOP'));
  if(bound.endsWith('.F.)'))ids.reverse();
  const points=ids.map(pid=>get(pid,'IFCCARTESIANPOINT').match(/\(\((.*)\)\)/)[1].split(',').map(Number));
  const normal=[0,0,0];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];normal[0]+=(a[1]-b[1])*(a[2]+b[2]);normal[1]+=(a[2]-b[2])*(a[0]+b[0]);normal[2]+=(a[0]-b[0])*(a[1]+b[1]);}
  const axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),axes=[0,1,2].filter(i=>i!==axis);
  const ix=earcut(points.flatMap(p=>axes.map(k=>p[k])));
  const local=ids.map((pid,i)=>{if(!lookup.has(pid)){lookup.set(pid,verts.length/3);verts.push(...points[i]);}return lookup.get(pid);});
  // earcut preserves input winding; orient against the supplied IFC face normal.
  for(let i=0;i<ix.length;i+=3){let [a,b,c]=ix.slice(i,i+3);const A=points[a],B=points[b],C=points[c],u=B.map((v,k)=>v-A[k]),v=C.map((v,k)=>v-A[k]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(cross.reduce((n,v,k)=>n+v*normal[k],0)<0)[b,c]=[c,b];faces.push(local[a],local[b],local[c]);}
 }
 const coordinates=[];for(let i=0;i<verts.length;i+=3)coordinates.push([...proj.forward(verts.slice(i,i+2)),verts[i+2]]);
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of coordinates)for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}
 if(max[0]<bbox[0]||min[0]>bbox[2]||max[1]<bbox[1]||min[1]>bbox[3])continue;
 // This IFC uses IFCCLOSEDSHELL for open deck surfaces: never assume it is
 // already a printable solid. Keep its measured top and identify the outline.
 const edges=new Map();for(let i=0;i<faces.length;i+=3){
  const [a,b,c]=faces.slice(i,i+3).map(v=>coordinates[v]);
  if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<0)[faces[i+1],faces[i+2]]=[faces[i+2],faces[i+1]];
  for(let k=0;k<3;k++){const a=faces[i+k],b=faces[i+(k+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}
 }
 const next=new Map([...edges.values()]),outlines=[];
 while(next.size){const first=next.keys().next().value,loop=[first];let n=first;do{const q=next.get(n);if(q===undefined)throw Error('Open outline');next.delete(n);loop.push(q);n=q;}while(n!==first);outlines.push(loop.map(i=>coordinates[i]));}
 console.log({id,min,max,vertices:coordinates.length,triangles:faces.length/3,outlines:outlines.length});
 items.push({id:'ifc-'+id,coordinates,faces,outlines});
}
await writeFile('public/data/eix-diagonal-decks.json',JSON.stringify({provider:'ICGC · Referencial Topogràfic Territorial',source:'https://datacloud.icgc.cat/datacloud/topografia-territorial/ifc/topografia-territorial-v1r0-full280110-2024.zip',sheet:'280110',year:2024,license:'CC BY 4.0',verticalDatum:'Orthometric heights, Alicante; not transformed to the DEM vertical datum',representation:'Measured IFC topographic deck surfaces; printable thickness 0.6 mm; no measured piers or engineering interior',items}));
