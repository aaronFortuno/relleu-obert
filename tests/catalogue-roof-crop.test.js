import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import Module from 'manifold-3d';
import {makeProjection} from '../src/model-projection.js';
import {scaledBBox,selectionPose} from '../src/selection.js';
import {splitModel} from '../src/mesh-tiles.js';
import {auditPart} from '../src/solid-audit.js';

function decodeFixture(bytes){
  const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength));
  const primitive=gltf.meshes[0].primitives[0],binary=28+jsonLength;
  const values=(index,components)=>{
    const accessor=gltf.accessors[index],view=gltf.bufferViews[accessor.bufferView];
    const offset=binary+(view.byteOffset??0)+(accessor.byteOffset??0),count=accessor.count*components;
    return accessor.componentType===5126?Float32Array.from({length:count},(_,i)=>bytes.readFloatLE(offset+4*i)):
      Uint32Array.from({length:count},(_,i)=>bytes.readUInt16LE(offset+2*i));
  };
  return {vertices:values(primitive.attributes.POSITION,3),faces:values(primitive.indices,1)};
}

// Intersect the exported triangles themselves. A new Manifold can repair and
// retriangulate the mesh, so it is not an independent read-only oracle here.
function roofAt({vertices,faces},[x,y]){
  let roof=-Infinity;
  for(let i=0;i<faces.length;i+=3){
    const [a,b,c]=Array.from(faces.subarray(i,i+3),id=>vertices.subarray(3*id,3*id+3));
    const determinant=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(Math.abs(determinant)<1e-10)continue;
    const u=((x-a[0])*(c[1]-a[1])-(y-a[1])*(c[0]-a[0]))/determinant;
    const v=((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/determinant;
    if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)roof=Math.max(roof,a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]));
  }
  assert(Number.isFinite(roof),'The roof control must intersect the mesh');
  return roof;
}

test('cropping a catalogue roof preserves the original terraces and closes the cut',async()=>{
  const source=decodeFixture(await readFile(new URL('fixtures/santa-maria-roof-pre-cleanup.glb',import.meta.url)));
  const pose=selectionPose(scaledBBox([41.38402,2.1821],65,80,1000),-19);
  const projection=makeProjection(pose.bbox,65,{widthMM:65,heightMM:80,targetScale:1000,selectionPose:pose});
  const anchor=[2.18200335,41.38380355],longitudeMetres=111320*Math.cos(anchor[1]*Math.PI/180);
  // The reported vertical placement of the real partial-crop control. This
  // fixture needs no terrain or remote data to reproduce its triangulation.
  const reference=2.883572130250857,embed=reference-.3;
  const vertices=Float32Array.from(source.vertices);
  for(let i=0;i<vertices.length;i+=3){
    const [x,y]=projection.project([anchor[0]+source.vertices[i]/longitudeMetres,anchor[1]-source.vertices[i+2]/111320]);
    vertices[i]=x;vertices[i+1]=y;vertices[i+2]=Math.abs(source.vertices[i+1])<1e-5?embed:reference+source.vertices[i+1]*projection.scale;
  }
  const part={id:'buildings',name:'Catalogue roof regression',vertices,faces:source.faces};
  const beforeVertices=Buffer.from(vertices.buffer).slice(),beforeFaces=Buffer.from(source.faces.buffer).slice();
  const api=await Module();api.setup();
  const plan={cols:1,rows:1,tiles:[{name:'crop',x0:0,y0:0,x1:65,y1:80,width:65,height:80}]};
  const [tile]=splitModel({parts:[part],width:65,height:80,provenance:{}},api,plan);
  assert.equal(tile.parts.length,1);
  const clipped=tile.parts[0],audit=auditPart(clipped);
  assert.deepEqual(audit.errors,[]);assert(audit.closed&&audit.signedVolume>0);
  const controls=[
    [2.1820096392209547,41.383625359218755],
    [2.1819260211038847,41.38384525710492],
    [2.1821143705316923,41.383766677414016],
    [2.1820307524146223,41.383986575300185],
    [2.18221910184243,41.38390799560927],
  ];
  for(const location of controls){
    const point=projection.project(location),expected=roofAt(part,point),actual=roofAt(clipped,point);
    assert(Math.abs(actual-expected)<.01,`Roof changed by ${(actual-expected).toFixed(6)} mm at ${point}`);
  }
  assert(beforeVertices.equals(Buffer.from(vertices.buffer)),'Cropping must preserve input vertices');
  assert(beforeFaces.equals(Buffer.from(source.faces.buffer)),'Cropping must preserve input indices');
});
