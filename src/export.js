import {zipSync,strToU8} from 'fflate';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function threeMF(model,{bambu=false}={}){
  const parts=model.parts,xml=['<?xml version="1.0" encoding="UTF-8"?>',`<model unit="millimeter" xml:lang="ca" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"${bambu?' xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p"':''}>`,`<metadata name="Title">Relleu Obert · ${esc(model.provenance.name||'Maqueta')}</metadata>`,`<metadata name="Description">${esc(JSON.stringify(model.provenance))}</metadata>`];
  // Bambu's importer gates project/material loading on this compatibility marker.
  // Preserve the actual generator separately; no printer or temperature preset is embedded.
  if(bambu)xml.push('<metadata name="Application">BambuStudio-02.00.00.00</metadata>','<metadata name="BambuStudio:3mfVersion">1</metadata>','<metadata name="Designer">Relleu Obert</metadata>','<metadata name="RelleuObert:Generator">Relleu Obert · Bambu-compatible dialect</metadata>');
  xml.push('<resources><basematerials id="1">');
  for(const p of parts)xml.push(`<base name="${esc(p.name)}" displaycolor="${p.color}FF"/>`);xml.push('</basematerials>');
  parts.forEach((p,i)=>{xml.push(`<object id="${i+2}" name="${esc(p.name)}" type="model" pid="1" pindex="${i}"><mesh><vertices>`);for(let j=0;j<p.vertices.length;j+=3)xml.push(`<vertex x="${p.vertices[j].toFixed(6)}" y="${p.vertices[j+1].toFixed(6)}" z="${p.vertices[j+2].toFixed(6)}"/>`);xml.push('</vertices><triangles>');const paint=i<2?((i+1)*4).toString(16).toUpperCase():(12+(i-2)*16).toString(16).toUpperCase().padStart(2,'0');for(let j=0;j<p.faces.length;j+=3)xml.push(`<triangle v1="${p.faces[j]}" v2="${p.faces[j+1]}" v3="${p.faces[j+2]}"${bambu?` paint_color="${paint}"`:''}/>`);xml.push('</triangles></mesh></object>');});
  const assembly=parts.length+2;xml.push(`<object id="${assembly}" name="Relleu Obert" type="model"><components>`);parts.forEach((p,i)=>xml.push(`<component objectid="${i+2}"/>`));xml.push(`</components></object></resources><build><item objectid="${assembly}"/></build></model>`);
  const files={'[Content_Types].xml':strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="config" ContentType="application/octet-stream"/><Default Extension="json" ContentType="application/json"/></Types>'),'_rels/.rels':strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),'3D/3dmodel.model':strToU8(xml.join('\n')),'Metadata/provenance.json':strToU8(JSON.stringify({...model.provenance,exportDialect:bambu?'bambu-compatible':'3mf-core'},null,2))};
  if(bambu){
    files['Metadata/project_settings.config']=strToU8(JSON.stringify({filament_colour:parts.map(p=>p.color.toUpperCase())}));
    const config=['<?xml version="1.0" encoding="UTF-8"?>',`<config><object id="${assembly}"><metadata key="name" value="Relleu Obert"/><metadata key="extruder" value="1"/>`];
    parts.forEach((p,i)=>config.push(`<part id="${i+2}" subtype="normal_part"><metadata key="name" value="${esc(p.name)}"/><metadata key="extruder" value="${i+1}"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/></part>`));
    config.push(`</object><plate><metadata key="plater_id" value="1"/><metadata key="locked" value="false"/><model_instance><metadata key="object_id" value="${assembly}"/><metadata key="instance_id" value="0"/><metadata key="identify_id" value="1"/></model_instance></plate></config>`);
    files['Metadata/model_settings.config']=strToU8(config.join('\n'));
  }
  return zipSync(files,{level:6});
}
export function binarySTL(part){
  const n=part.faces.length/3,buffer=new ArrayBuffer(84+n*50),v=new DataView(buffer);v.setUint32(80,n,true);for(let i=0;i<n;i++)for(let j=0;j<3;j++){const vertex=part.faces[i*3+j];for(let k=0;k<3;k++)v.setFloat32(84+i*50+12+j*12+k*4,part.vertices[vertex*3+k],true);}return new Uint8Array(buffer);
}
export function stlZip(model){const files={'LLEGEIX-ME.txt':strToU8('Relleu Obert · STL per material, amb coordenades compartides en mm.\nImporta tots els STL com a parts d’un mateix objecte i assigna els filaments.\nPrototip: comprova la reparació de malles i el laminat abans d’imprimir.\n© OpenStreetMap contributors / OpenMapTiles / OpenFreeMap; Mapterhorn.\n'), 'provenance.json':strToU8(JSON.stringify(model.provenance,null,2))};for(const p of model.parts)files[p.id+'.stl']=binarySTL(p);return zipSync(files,{level:6});}
