import {zipSync,strToU8} from 'fflate';
import {BAMBU_PROJECT_BED_MM} from './print-settings.js';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function xmlBytes(...initial){
  const chunks=[];
  let lines=[],length=0;
  const flush=()=>{
    if(!lines.length)return;
    const bytes=strToU8((chunks.length?'\n':'')+lines.join('\n'));
    chunks.push(bytes);length+=bytes.length;lines=[];
  };
  const push=(...next)=>{
    lines.push(...next);
    if(lines.length>=4096)flush();
  };
  push(...initial);
  return {push,finish(){
    flush();
    if(chunks.length===1)return chunks[0];
    const bytes=new Uint8Array(length);
    let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    return bytes;
  }};
}
function modelXML(provenance,bambu){
  const xml=xmlBytes('<?xml version="1.0" encoding="UTF-8"?>',`<model unit="millimeter" xml:lang="ca" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"${bambu?' xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p"':''}>`,`<metadata name="Title">Relleu Obert · ${esc(provenance.name||'Maqueta')}</metadata>`,`<metadata name="Description">${esc(JSON.stringify(provenance))}</metadata>`);
  // Bambu's importer gates project/material loading on this compatibility marker.
  // Preserve the actual generator separately; no printer or temperature preset is embedded.
  if(bambu)xml.push('<metadata name="Application">BambuStudio-02.00.00.00</metadata>','<metadata name="BambuStudio:3mfVersion">1</metadata>','<metadata name="Designer">Relleu Obert</metadata>','<metadata name="RelleuObert:Generator">Relleu Obert · Bambu-compatible dialect</metadata>');
  return xml;
}
function writeMaterials(xml,parts){
  xml.push('<resources><basematerials id="1">');
  for(const p of parts)xml.push(`<base name="${esc(p.name)}" displaycolor="${p.color}FF"/>`);xml.push('</basematerials>');
}
function writeMesh(xml,part,id,index){
  xml.push(`<object id="${id}" name="${esc(part.name)}" type="model" pid="1" pindex="${index}"><mesh><vertices>`);
  for(let i=0;i<part.vertices.length;i+=3)
    xml.push(`<vertex x="${part.vertices[i].toFixed(6)}" y="${part.vertices[i+1].toFixed(6)}" z="${part.vertices[i+2].toFixed(6)}"/>`);
  xml.push('</vertices><triangles>');
  for(let i=0;i<part.faces.length;i+=3)
    xml.push(`<triangle v1="${part.faces[i]}" v2="${part.faces[i+1]}" v3="${part.faces[i+2]}"/>`);
  xml.push('</triangles></mesh></object>');
}
function modelFiles(xml,provenance,bambu){
  return {'[Content_Types].xml':strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="config" ContentType="application/octet-stream"/><Default Extension="json" ContentType="application/json"/></Types>'),'_rels/.rels':strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),'3D/3dmodel.model':xml.finish(),'Metadata/provenance.json':strToU8(JSON.stringify({...provenance,exportDialect:bambu?'bambu-compatible':'3mf-core'},null,2))};
}
const bambuPart=(part,id,extruder)=>`<part id="${id}" subtype="normal_part"><metadata key="name" value="${esc(part.name)}"/><metadata key="extruder" value="${extruder}"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/></part>`;

export function threeMF(model,{bambu=false}={}){
  const {parts,provenance}=model,xml=modelXML(provenance,bambu);
  writeMaterials(xml,parts);
  parts.forEach((part,index)=>writeMesh(xml,part,index+2,index));
  const assembly=parts.length+2;xml.push(`<object id="${assembly}" name="Relleu Obert" type="model"><components>`);parts.forEach((p,i)=>xml.push(`<component objectid="${i+2}"/>`));xml.push(`</components></object></resources><build><item objectid="${assembly}"/></build></model>`);
  const files=modelFiles(xml,provenance,bambu);
  if(bambu){
    files['Metadata/project_settings.config']=strToU8(JSON.stringify({filament_colour:parts.map(p=>p.color.toUpperCase())}));
    const config=['<?xml version="1.0" encoding="UTF-8"?>',`<config><object id="${assembly}"><metadata key="name" value="Relleu Obert"/><metadata key="extruder" value="1"/>`];
    parts.forEach((p,i)=>config.push(bambuPart(p,i+2,i+1)));
    config.push(`</object><plate><metadata key="plater_id" value="1"/><metadata key="locked" value="false"/><model_instance><metadata key="object_id" value="${assembly}"/><metadata key="instance_id" value="0"/><metadata key="identify_id" value="1"/></model_instance></plate></config>`);
    files['Metadata/model_settings.config']=strToU8(config.join('\n'));
  }
  return zipSync(files,{level:6});
}

export function bambuPlateProject(model,tiles){
  const bed=BAMBU_PROJECT_BED_MM,columns=Math.ceil(Math.sqrt(tiles.length)),pitch=bed*1.2;
  const provenance={...model.provenance,printPlates:tiles.map(({tile})=>tile)};
  const xml=modelXML(provenance,true),materials=new Map(model.parts.map((part,i)=>[part.id,i]));
  const objects=[],plates=[],build=[];
  let nextId=2;
  writeMaterials(xml,model.parts);
  for(const [i,{tile,parts,width,height}] of tiles.entries()){
    if(!parts.length||width>bed||height>bed)throw Error('Una peça no cap a la placa de referència de Bambu Studio.');
    const name=`Fila ${tile.row} · Columna ${tile.col}`,config=[],ids=[];
    for(const part of parts){
      const index=materials.get(part.id),id=nextId++;
      if(index===undefined)throw Error('Falta el filament d’una peça.');
      writeMesh(xml,part,id,index);
      config.push(bambuPart(part,id,index+1));
      ids.push(id);
    }
    const assembly=nextId++;
    xml.push(`<object id="${assembly}" name="${name}" type="model"><components>`);
    for(const id of ids)xml.push(`<component objectid="${id}"/>`);
    xml.push('</components></object>');
    objects.push(`<object id="${assembly}"><metadata key="name" value="${name}"/><metadata key="extruder" value="1"/>${config.join('')}</object>`);
    const plate=i+1;
    plates.push(`<plate><metadata key="plater_id" value="${plate}"/><metadata key="plater_name" value="${name}"/><metadata key="locked" value="false"/><model_instance><metadata key="object_id" value="${assembly}"/><metadata key="instance_id" value="0"/><metadata key="identify_id" value="${plate}"/></model_instance></plate>`);

    // Bambu reassigns instances by position on its virtual grid of beds.
    // The pitch includes a 20% gap. The meshes stay in tile-local coordinates.
    const x=(i%columns)*pitch+(bed-width)/2,y=-Math.floor(i/columns)*pitch+(bed-height)/2;
    build.push(`<item objectid="${assembly}" transform="1 0 0 0 1 0 0 0 1 ${x.toFixed(6)} ${y.toFixed(6)} 0" printable="1"/>`);
  }
  xml.push('</resources><build>',...build,'</build></model>');
  const files=modelFiles(xml,provenance,true);
  files['Metadata/project_settings.config']=strToU8(JSON.stringify({
    printable_area:['0x0',`${bed}x0`,`${bed}x${bed}`,`0x${bed}`],
    filament_colour:model.parts.map(part=>part.color.toUpperCase())
  }));
  files['Metadata/model_settings.config']=strToU8(['<?xml version="1.0" encoding="UTF-8"?>','<config>',...objects,...plates,'</config>'].join('\n'));
  return zipSync(files,{level:6});
}

export function binarySTL(part){
  const n=part.faces.length/3,buffer=new ArrayBuffer(84+n*50),v=new DataView(buffer);v.setUint32(80,n,true);for(let i=0;i<n;i++)for(let j=0;j<3;j++){const vertex=part.faces[i*3+j];for(let k=0;k<3;k++)v.setFloat32(84+i*50+12+j*12+k*4,part.vertices[vertex*3+k],true);}return new Uint8Array(buffer);
}
export function stlZip(model){const files={'LLEGEIX-ME.txt':strToU8('Relleu Obert · STL per material, amb coordenades compartides en mm.\nImporta tots els STL com a parts d’un mateix objecte i assigna els filaments.\nPrototip: comprova la reparació de malles i el laminat abans d’imprimir.\n© OpenStreetMap contributors / OpenMapTiles / OpenFreeMap; Mapterhorn.\n'), 'provenance.json':strToU8(JSON.stringify(model.provenance,null,2))};for(const p of model.parts)files[p.id+'.stl']=binarySTL(p);return zipSync(files,{level:6});}
