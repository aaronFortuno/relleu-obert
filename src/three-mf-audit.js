import {strFromU8,unzipSync} from 'fflate';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {auditPart} from './solid-audit.js';

const MiB=1024**2;
export const MAX_3MF_AUDIT_BYTES=8*MiB;
const MAX_TRIANGLES=100_000,MAX_VERTICES=200_000,MAX_PARTS=16;
const MODEL='3D/3dmodel.model',CONFIG='Metadata/model_settings.config',PROJECT='Metadata/project_settings.config';
const entries=new Map([[MODEL,12*MiB],[CONFIG,256*1024],[PROJECT,256*1024],['_rels/.rels',64*1024],['[Content_Types].xml',64*1024]]);
const parser=new XMLParser({ignoreAttributes:false,parseTagValue:false,processEntities:false});
const many=value=>value==null?[]:Array.isArray(value)?value:[value];
const attr=(node,name)=>node?.['@_'+name];
const integer=value=>typeof value==='string'&&/^\d+$/.test(value)&&Number.isSafeInteger(Number(value))?Number(value):null;
const decimal=value=>typeof value==='string'&&value.trim()?Number(value):NaN;
const paintFor=i=>i<2?((i+1)*4).toString(16).toUpperCase():(12+(i-2)*16).toString(16).toUpperCase().padStart(2,'0');
const metadata=(node,key)=>many(node?.metadata).filter(item=>attr(item,'key')===key).map(item=>attr(item,'value'));

function xml(files,path){
  if(!files[path])throw Error('Falta '+path+'.');
  const text=strFromU8(files[path]);
  if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text)||XMLValidator.validate(text)!==true)throw Error('XML invàlid a '+path+'.');
  return parser.parse(text);
}

function byId(nodes,label,errors){
  const result=new Map();
  for(const node of nodes){
    const id=integer(attr(node,'id'));
    if(!id||result.has(id))errors.push(label+' amb identificador absent, invàlid o duplicat.');
    else result.set(id,node);
  }
  return result;
}

function meshReport(mesh,id,name){
  const coords=many(mesh.vertices?.vertex),triangles=many(mesh.triangles?.triangle);
  const vertices=new Float32Array(coords.length*3),faces=new Uint32Array(triangles.length*3);
  for(let i=0;i<coords.length;i++)for(const [j,key] of ['x','y','z'].entries())vertices[i*3+j]=decimal(attr(coords[i],key));
  for(let i=0;i<triangles.length;i++)for(const [j,key] of ['v1','v2','v3'].entries()){
    const index=integer(attr(triangles[i],key));
    faces[i*3+j]=index!==null&&index<coords.length?index:0xffffffff;
  }
  return auditPart({id,name,vertices,faces});
}

export function auditThreeMF(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length>MAX_3MF_AUDIT_BYTES)throw Error('Cal un 3MF de fins a 8 MiB comprimits.');
  const found=new Set();
  const files=unzipSync(bytes,{filter:({name,originalSize})=>{
    if(!entries.has(name))return false;
    if(found.has(name)||originalSize>entries.get(name))throw Error('Entrada repetida o massa gran: '+name+'.');
    found.add(name);
    return true;
  }});
  const model=xml(files,MODEL).model,rels=xml(files,'_rels/.rels').Relationships,types=xml(files,'[Content_Types].xml').Types;
  if(!model||!rels||!types)throw Error('El paquet no conté l’estructura esperada de Relleu Obert.');
  const errors=[],parts=[],overlapCandidates=[];
  const bambuMarker=attr(model,'xmlns:BambuStudio')||many(model.metadata).some(item=>
    attr(item,'name')==='BambuStudio:3mfVersion'||attr(item,'name')==='RelleuObert:Generator');
  const report={schemaVersion:1,dialect:files[CONFIG]||files[PROJECT]||bambuMarker?'bambu':'3mf-core',
    valid:false,errors,parts,overlapCandidates,
    scope:'Malla indexada i assignació de materials de Relleu Obert. Els encavalcaments de caixes són candidats, sense mesura d’intersecció. No simula el laminador.'};
  if(attr(model,'unit')!=='millimeter')errors.push('La unitat del model ha de ser el mil·límetre.');
  if(!many(rels.Relationship).some(r=>attr(r,'Target')==='/'+MODEL&&attr(r,'Type')==='http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel'))
    errors.push('Falta la relació principal del model 3MF.');
  if(!many(types.Default).some(t=>attr(t,'Extension')==='model'&&attr(t,'ContentType')==='application/vnd.ms-package.3dmanufacturing-3dmodel+xml'))
    errors.push('Falta el tipus de contingut del model 3MF.');

  const objects=byId(many(model.resources?.object),'Objecte 3MF',errors);
  const materials=byId(many(model.resources?.basematerials),'Grup de materials',errors);
  const meshes=[...objects].filter(([,object])=>object.mesh);
  if(!meshes.length||meshes.length>MAX_PARTS)throw Error('Calen entre 1 i '+MAX_PARTS+' peces de malla.');
  const triangles=meshes.reduce((sum,[,object])=>sum+many(object.mesh.triangles?.triangle).length,0);
  const vertices=meshes.reduce((sum,[,object])=>sum+many(object.mesh.vertices?.vertex).length,0);
  if(triangles>MAX_TRIANGLES||vertices>MAX_VERTICES)throw Error('Malla massa gran per a l’auditoria de controls.');
  const items=many(model.build?.item),assemblyId=integer(attr(items[0],'objectid')),assembly=objects.get(assemblyId);
  const components=many(assembly?.components?.component),componentIds=components.map(c=>integer(attr(c,'objectid')));
  const meshIds=new Set(meshes.map(([id])=>id));
  if(items.length!==1||!assembly||assembly.mesh||objects.size!==meshes.length+1||
    components.length!==meshes.length||new Set(componentIds).size!==meshes.length||componentIds.some(id=>!meshIds.has(id)))
    errors.push('La llista de muntatge ha de referenciar cada peça de malla exactament una vegada.');
  if(items.some(item=>attr(item,'transform'))||components.some(component=>attr(component,'transform')))
    errors.push('L’auditoria de controls només admet peces amb coordenades compartides sense transformació.');

  let filaments=[],configuredParts=new Map();
  if(report.dialect==='bambu'){
    if(!files[PROJECT])throw Error('Falta '+PROJECT+'.');
    const config=xml(files,CONFIG).config;
    const project=JSON.parse(strFromU8(files[PROJECT]));
    filaments=Array.isArray(project?.filament_colour)?project.filament_colour:[];
    const configObjects=many(config?.object);
    if(configObjects.length!==1||integer(attr(configObjects[0],'id'))!==assemblyId)errors.push('Bambu: l’objecte de configuració no correspon al muntatge.');
    configuredParts=byId(many(configObjects[0]?.part),'Peça Bambu',errors);
    if(configuredParts.size!==meshes.length||[...configuredParts.keys()].some(id=>!meshIds.has(id)))
      errors.push('Bambu: la configuració ha de referenciar exactament totes les peces de malla.');
    if(filaments.length!==meshes.length)errors.push('Bambu: el nombre de colors de filament no correspon al nombre de peces.');
    const instances=many(config?.plate).flatMap(plate=>many(plate.model_instance));
    if(instances.length!==1||metadata(instances[0],'object_id').length!==1||integer(metadata(instances[0],'object_id')[0])!==assemblyId)
      errors.push('Bambu: la instància de la safata no correspon al muntatge.');
  }

  const assigned=new Set();
  for(const [id,object] of meshes){
    const name=attr(object,'name')||'Peça '+id,groupId=integer(attr(object,'pid')),index=integer(attr(object,'pindex'));
    const group=many(materials.get(groupId)?.base),base=index===null?undefined:group[index],color=attr(base,'displaycolor');
    const partErrors=[],geometry=meshReport(object.mesh,id,name);
    if(!base||!/^#[\da-f]{8}$/i.test(color??'')||index>=meshes.length)partErrors.push('Material 3MF absent o invàlid.');
    const assignment=groupId+':'+index;
    if(assigned.has(assignment))partErrors.push('Assignació de material repetida.');
    assigned.add(assignment);
    const faces=many(object.mesh.triangles?.triangle);
    if(faces.some(face=>['pid','p1','p2','p3'].some(key=>attr(face,key)!==undefined)))partErrors.push('El triangle redefineix el material assignat a la peça.');
    let extruder=null,paint=null;
    if(report.dialect==='bambu'){
      const config=metadata(configuredParts.get(id),'extruder');
      extruder=integer(config[0]);
      if(config.length!==1||index===null||extruder!==index+1)partErrors.push('Bambu: extrusor inconsistent amb el material 3MF.');
      if(!color||typeof filaments[extruder-1]!=='string'||filaments[extruder-1].toUpperCase()!==color.slice(0,7).toUpperCase())
        partErrors.push('Bambu: color de filament inconsistent amb el material 3MF.');
      if(index!==null&&index<meshes.length){
        paint=paintFor(index);
        const mismatches=faces.reduce((sum,face)=>sum+(attr(face,'paint_color')?.toUpperCase()!==paint),0);
        if(mismatches)partErrors.push('Bambu: '+mismatches+' triangles tenen el codi de color incorrecte o absent.');
      }
    }
    if(geometry.empty)partErrors.push('La peça no conté triangles.');
    parts.push({id,name,material:{groupId,index,color:color??null,extruder,paint},geometry,errors:partErrors});
  }
  for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
    const a=parts[i],b=parts[j],box=a.geometry.bbox,other=b.geometry.bbox;
    if(box&&other&&box.min.every((min,axis)=>Math.max(min,other.min[axis])+1e-5<Math.min(box.max[axis],other.max[axis])))
      overlapCandidates.push([a.id,b.id]);
  }
  report.valid=errors.length===0&&parts.every(part=>!part.errors.length&&!part.geometry.errors.length);
  return report;
}
