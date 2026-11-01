import test from 'node:test';
import assert from 'node:assert/strict';
import {threeMF} from '../src/export.js';
import {unzipSync,strFromU8} from 'fflate';
test('Bambu dialect includes matching part IDs, filament colours, extruders and painted triangles',()=>{
  const parts=['terrain','water','built','green'].map((id,i)=>({id,name:id,color:['#c6b38d','#8dc5ca','#eee9dc','#4e8966'][i],vertices:new Float32Array([0,0,0,1,0,0,0,1,0]),faces:new Uint32Array([0,1,2])}));
  const files=unzipSync(threeMF({parts,provenance:{name:'Test'}},{bambu:true})),model=strFromU8(files['3D/3dmodel.model']),settings=strFromU8(files['Metadata/model_settings.config']),project=JSON.parse(strFromU8(files['Metadata/project_settings.config']));
  assert.equal(project.filament_colour.length,4);assert.equal(project.filament_colour[1],'#8DC5CA');
  for(let i=0;i<4;i++){assert(settings.includes(`<part id="${i+2}"`));assert(settings.includes(`key="extruder" value="${i+1}"`));}
  for(const paint of ['4','8','0C','1C'])assert(model.includes(`paint_color="${paint}"`));
  assert(model.includes('RelleuObert:Generator'));assert(!('printer_model' in project));assert(!('machine_start_gcode' in project));
});
