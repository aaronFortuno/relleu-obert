import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate';
import {threeMF} from '../src/export.js';
import {auditThreeMF,MAX_3MF_AUDIT_BYTES} from '../src/three-mf-audit.js';

const modelPath='3D/3dmodel.model',configPath='Metadata/model_settings.config',projectPath='Metadata/project_settings.config';
const parts=['terrè','bosc'].map((name,i)=>({
  id:name,name,color:i?'#396B4C':'#C6B38D',
  vertices:new Float32Array([0,0,0,1,0,0,0,1,0,0,0,1].map((v,j)=>j%3===0?v+i*.5:v)),
  faces:new Uint32Array([0,2,1,0,1,3,0,3,2,1,2,3])
}));
const encoded=bambu=>threeMF({parts,provenance:{name:'Control de material'}},{bambu});

function alter(path,replace){
  const files=unzipSync(encoded(true));
  files[path]=strToU8(replace(strFromU8(files[path])));
  return zipSync(files);
}

test('audits core and Bambu assembly and reports possible overlaps separately',()=>{
  for(const bambu of [false,true]){
    const report=auditThreeMF(encoded(bambu));
    assert.equal(report.valid,true);
    assert.equal(report.dialect,bambu?'bambu':'3mf-core');
    assert.deepEqual(report.overlapCandidates,[[2,3]]);
    assert.equal(report.parts[1].geometry.closed,true);
    assert.equal(report.parts[1].material.extruder,bambu?2:null);
    assert.equal(report.parts[1].material.paint,bambu?'8':null);
    assert.equal(Object.hasOwn(report,'heightQuery'),false);
  }
});

test('queries material at an exact model height, including coplanar faces and excluding empty gaps',()=>{
  const [terrain,trees]=parts;
  const separatedTrees={...trees,
    vertices:new Float32Array([...trees.vertices,...trees.vertices.map((v,i)=>i%3===2?v+2:v)]),
    faces:new Uint32Array([...trees.faces,...trees.faces.map(i=>i+4)])
  };
  const bytes=threeMF({parts:[terrain,separatedTrees],provenance:{name:'Control d’alçades'}},{bambu:true});
  const query=heightMm=>auditThreeMF(bytes,{heightMm}).heightQuery;
  assert.deepEqual(query(1.5).parts,[]);
  assert.deepEqual(query(.5).parts.map(part=>part.crossingTriangles),[3,3]);
  assert.deepEqual(query(0).parts.map(part=>part.crossingTriangles),[4,4]);
  const high=query(2.5);
  assert.equal(high.heightMm,2.5);
  assert.deepEqual(high.parts.map(part=>[part.name,part.material.extruder,part.crossingTriangles]),[['bosc',2,3]]);
  assert.throws(()=>auditThreeMF(bytes,{heightMm:Infinity}),/nombre finit/);
});

test('rejects a mismatched Bambu extruder, filament or paint even if all values exist',()=>{
  const paint=auditThreeMF(alter(modelPath,xml=>xml.replace('paint_color="4"','paint_color="8"')));
  assert.equal(paint.valid,false);
  assert.match(paint.parts[0].errors.join(' '),/1 triangles/);
  const extruder=auditThreeMF(alter(configPath,xml=>xml.replace('<part id="3" subtype="normal_part"><metadata key="name" value="bosc"/><metadata key="extruder" value="2"/>',
    '<part id="3" subtype="normal_part"><metadata key="name" value="bosc"/><metadata key="extruder" value="1"/>')));
  assert.equal(extruder.valid,false);
  assert.match(extruder.parts[1].errors.join(' '),/extrusor inconsistent/);
  const filament=auditThreeMF(alter(projectPath,json=>json.replace('#396B4C','#112233')));
  assert.equal(filament.valid,false);
  assert.match(filament.parts[1].errors.join(' '),/filament inconsistent/);
});

test('detects a repeated assembly reference and a non-closed mesh independently',()=>{
  const assembly=auditThreeMF(alter(modelPath,xml=>xml.replace('<component objectid="3"/>','<component objectid="2"/>')));
  assert.equal(assembly.valid,false);
  assert.match(assembly.errors.join(' '),/llista de muntatge/);
  const mesh=auditThreeMF(alter(modelPath,xml=>xml.replace(/<triangle[^>]+\/>/,'')));
  assert.equal(mesh.valid,false);
  assert.match(mesh.parts[0].geometry.errors.join(' '),/malla no tancada/);
  assert.deepEqual(mesh.parts[0].errors,[]);
});

test('rejects malformed XML, missing model and excessive input',()=>{
  assert.throws(()=>auditThreeMF(alter(modelPath,xml=>'<!DOCTYPE model>'+xml)),/XML invàlid/);
  assert.throws(()=>auditThreeMF(zipSync({data:strToU8('test')})),/Falta/);
  assert.throws(()=>auditThreeMF(new Uint8Array(MAX_3MF_AUDIT_BYTES+1)),/8 MiB/);
});

test('does not mistake a Bambu model with both configurations removed for core 3MF',()=>{
  const files=unzipSync(encoded(true));
  delete files[configPath];
  delete files[projectPath];
  assert.throws(()=>auditThreeMF(zipSync(files)),/Falta Metadata/);
});
