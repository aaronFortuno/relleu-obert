import test from 'node:test';
import assert from 'node:assert/strict';
import {bambuPlateProject,threeMF} from '../src/export.js';
import {tilePlan} from '../src/selection.js';
import {unzipSync,strFromU8} from 'fflate';
import {XMLParser} from 'fast-xml-parser';
test('Bambu dialect assigns filament per part without painting triangles',()=>{
  const parts=['terrain','water','built','green'].map((id,i)=>({id,name:id,color:['#c6b38d','#8dc5ca','#eee9dc','#4e8966'][i],vertices:new Float32Array([0,0,0,1,0,0,0,1,0]),faces:new Uint32Array([0,1,2])}));
  const files=unzipSync(threeMF({parts,provenance:{name:'Test'}},{bambu:true})),model=strFromU8(files['3D/3dmodel.model']),settings=strFromU8(files['Metadata/model_settings.config']),project=JSON.parse(strFromU8(files['Metadata/project_settings.config']));
  assert.equal(project.filament_colour.length,4);assert.equal(project.filament_colour[1],'#8DC5CA');
  for(let i=0;i<4;i++){assert(settings.includes(`<part id="${i+2}"`));assert(settings.includes(`key="extruder" value="${i+1}"`));}
  assert.doesNotMatch(model,/\bpaint_color=/);
  assert(model.includes('RelleuObert:Generator'));assert(!('printer_model' in project));assert(!('machine_start_gcode' in project));
});

test('a split Bambu project has one positioned assembly per plate and keeps filament slots shared',()=>{
  const [terrain,water]=['terrain','water'].map((id,i)=>({id,name:id,color:i?'#8dc5ca':'#c6b38d',
    vertices:new Float32Array([0,0,0,200,0,0,0,225,0]),faces:new Uint32Array([0,1,2])}));
  const model={parts:[terrain,water],provenance:{name:'Control de plaques'}};
  const tiles=tilePlan(400,450).tiles.map((tile,i)=>({tile,width:tile.width,height:tile.height,
    parts:i===1?[water]:i===2?[terrain,water]:[terrain]}));
  const files=unzipSync(bambuPlateProject(model,tiles)),parse=path=>new XMLParser({ignoreAttributes:false}).parse(strFromU8(files[path]));
  const {model:{resources,build}}=parse('3D/3dmodel.model'),{config}=parse('Metadata/model_settings.config');
  const project=JSON.parse(strFromU8(files['Metadata/project_settings.config']));
  assert.deepEqual(project.filament_colour,['#C6B38D','#8DC5CA']);
  assert.deepEqual(project.printable_area,['0x0','256x0','256x256','0x256']);
  assert.equal(config.plate.length,4);
  assert.equal(build.item.length,4);
  const value=(entries,key)=>entries.find(entry=>entry['@_key']===key)['@_value'];
  for(const [i,plate] of config.plate.entries()){
    assert.equal(value(plate.metadata,'plater_id'),String(i+1));
    const id=value(plate.model_instance.metadata,'object_id');
    const item=build.item[i],object=resources.object.find(entry=>entry['@_id']===id);
    assert.equal(item['@_objectid'],id);
    const coords=item['@_transform'].split(' ').slice(9).map(Number);
    assert.deepEqual(coords,[[28,15.5,0],[335.2,15.5,0],[28,-291.7,0],[335.2,-291.7,0]][i]);
    const components=[object.components.component].flat();
    assert.deepEqual([config.object[i].part].flat().map((part,index)=>{
      assert.equal(part['@_id'],components[index]['@_objectid']);
      return value(part.metadata,'extruder');
    }),tiles[i].parts.map(part=>part===terrain?'1':'2'));
  }
  assert.doesNotMatch(strFromU8(files['3D/3dmodel.model']),/\bpaint_color=/);
});
