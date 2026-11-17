import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {buildFenceMesh} from '../src/fence-mesh.js';
import {withPrintableFences} from '../src/fence-export.js';
import {splitModel} from '../src/mesh-tiles.js';
import {CATEGORIES,groupMaterials} from '../src/materials.js';
import {bambuPlateProject} from '../src/export.js';
import {auditPart} from '../src/solid-audit.js';
import {strFromU8,unzipSync} from 'fflate';

const api=await Module();api.setup();
function box(id,dimensions,at=[0,0,0]){
  const cube=api.Manifold.cube(dimensions),solid=cube.translate(at);
  try{
    const mesh=solid.getMesh();
    return {...CATEGORIES.find(p=>p.id===id),vertices:new Float32Array(mesh.vertProperties),faces:new Uint32Array(mesh.triVerts)};
  }finally{solid.delete();cube.delete();}
}
function volumeOverlap(a,b){
  const solid=part=>new api.Manifold(new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces}));
  const x=solid(a),y=solid(b),intersection=x.intersect(y);
  try{return intersection.volume();}finally{intersection.delete();x.delete();y.delete();}
}
test('partitions printed colours across a plate cut and joins the wall to intersecting buildings',()=>{
  const terrain=box('terrain',[24,20,5]),building=box('buildings',[3,5,4],[2,5,5]);
  const model={width:24,height:20,categories:[terrain,building],provenance:{options:{}}};
  const wall=buildFenceMesh([{points:[[1,8],[23,8]],widthMM:1.2,heightMM:2.4,closed:false}],
    {width:24,height:20,proj:{project:point=>point},ground:()=>5,api});
  const result=withPrintableFences(model,wall,api);
  const [ground,built]=result.parts;
  assert.equal(auditPart(built).components,1);
  assert.ok(Math.abs(volumeOverlap(ground,built))<1e-6,'different filaments must not overlap');
  assert.deepEqual(auditPart(ground).errors,[]);
  assert.deepEqual(auditPart(built).errors,[]);
  assert.equal(auditPart(terrain).signedVolume,2400,'export leaves the source unchanged');
  const pieces=splitModel(result,api,{cols:2,rows:1,tiles:[0,12].map((x,i)=>
    ({name:'Piece '+(i+1),row:1,col:i+1,x0:x,x1:x+12,y0:0,y1:20,width:12,height:20}))})
    .map(piece=>groupMaterials({...piece,categories:undefined},4));
  for(const piece of pieces){
    const part=piece.parts.find(p=>p.id==='built');
    assert.deepEqual(auditPart(part).errors,[]);
    assert.ok(auditPart(part).bbox.max[2]>7);
  }
  const parts=pieces[0].parts;
  const archive=unzipSync(bambuPlateProject({...result,parts},pieces));
  assert.equal((strFromU8(archive['Metadata/model_settings.config']).match(/subtype="normal_part"/g)||[]).length,4);
});
