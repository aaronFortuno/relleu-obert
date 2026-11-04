import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8,unzipSync} from 'fflate';
import {XMLParser} from 'fast-xml-parser';
import {bambuPlateProject,stlZip,threeMF} from '../src/export.js';
import {defaultReliefAssignments,groupMaterials,groupReliefMaterials,normalizeReliefAssignments,
  RELIEF_MATERIALS,RELIEF_PALETTES} from '../src/materials.js';
import {tileArchive} from '../src/mesh-tiles.js';
import {tilePlan} from '../src/selection.js';

const categories=RELIEF_MATERIALS.map((material,i)=>({...material,
  vertices:new Float32Array([i,0,0,i+1,0,0,i,1,0]),faces:new Uint32Array([0,1,2])}));
const provenance={name:'Control de materials',options:{pureRelief:true}};
const model={categories,provenance};

test('explicit pure relief exports group geometry for every count and native models keep their categories',()=>{
  assert.deepEqual(groupMaterials(model).parts,categories);
  for(let count=1;count<=6;count++){
    const grouped=groupMaterials(model,count);
    assert.deepEqual(grouped.parts.map(part=>part.color),RELIEF_PALETTES[count]);
    assert.equal(grouped.materialsUsed,count);
    assert.equal(grouped.parts.reduce((sum,part)=>sum+part.faces.length,0),categories.length*3);
    assert(grouped.parts.every(part=>part.faces.every(index=>index<part.vertices.length/3)));
  }
  assert.deepEqual([...groupMaterials(model,1).parts[0].faces],Array.from({length:18},(_,i)=>i));
  assert.equal(groupMaterials(model,6).parts[0].vertices,categories[0].vertices);
  const custom=defaultReliefAssignments(4);
  custom[1]=3;
  assert.deepEqual(normalizeReliefAssignments(4,custom),custom);
  assert.match(groupReliefMaterials(model,4,custom).parts[3].name,/Sòl nu/);
  assert.throws(()=>normalizeReliefAssignments(4,[0,0,0,0,0,4]),/assignació/);
});

test('native pure relief plates use one project-wide filament palette when each has different layers',()=>{
  const [terrain,rock,snow,inland,forest,sea]=categories;
  const tileGeometry=[[terrain,snow,inland],[terrain,rock,forest,sea]];
  const count=4,assignments=defaultReliefAssignments(count);
  const project=groupReliefMaterials({parts:tileGeometry.flat(),provenance},count,assignments,{paletteOnly:true});
  assert(project.parts.every(part=>part.vertices===undefined&&part.faces===undefined));
  const pieces=tilePlan(400,200).tiles.map((tile,i)=>groupReliefMaterials({
    tile,width:tile.width,height:tile.height,parts:tileGeometry[i],provenance
  },count,assignments));
  const zip=unzipSync(bambuPlateProject(project,pieces));
  const projectConfig=JSON.parse(strFromU8(zip['Metadata/project_settings.config']));
  assert.deepEqual(projectConfig.filament_colour,RELIEF_PALETTES[count].map(color=>color.toUpperCase()));
  const parser=new XMLParser({ignoreAttributes:false});
  const {config}=parser.parse(strFromU8(zip['Metadata/model_settings.config']));
  assert.equal(config.plate.length,2);
  const extruders=config.object.map(object=>[object.part].flat().map(part=>
    Number(part.metadata.find(entry=>entry['@_key']==='extruder')['@_value'])));
  assert.deepEqual(extruders,[[1,2,4],[1,2,3]]);
  assert.doesNotMatch(strFromU8(zip['3D/3dmodel.model']),/\bpaint_color=/);

  const zip3mf=unzipSync(tileArchive(pieces,'3mf'));
  const tileFiles=unzipSync(zip3mf[pieces[0].tile.name+'.3mf']);
  const tileXml=strFromU8(tileFiles['3D/3dmodel.model']);
  assert.match(tileXml,/#f7f8faFF/);
  assert.doesNotMatch(tileXml,/#5d855fFF/);
  const zipStl=unzipSync(stlZip(pieces[0]));
  assert.deepEqual(Object.keys(zipStl).filter(name=>name.endsWith('.stl')),
    ['material-1.stl','material-2.stl','material-4.stl']);
  const mono=unzipSync(threeMF(groupMaterials(model,1),{bambu:true}));
  assert.deepEqual(JSON.parse(strFromU8(mono['Metadata/project_settings.config'])).filament_colour,['#ABA397']);
});
