import {zipSync,strToU8} from 'fflate';
import {threeMF,binarySTL} from './export.js';
import {frameSegments} from './printable-frame.js';
import {labelParts} from './printable-label.js';
import {compassParts,modelNorth} from './compass.js';
import {accessoryColor} from './accessory-solids.js';
export function accessoryGeometry(kind,model,options={},api){
  if(!model||![model.width,model.height].every(v=>Number.isFinite(v)&&v>0))throw Error('Genera primer la maqueta.');
  const bed=options.bed??180;
  if(!Number.isFinite(bed)||bed<50||bed>450)throw Error('Mida útil del llit entre 50 i 450 mm.');
  const color=accessoryColor(options.color||'#314e3a');let result;
  if(kind==='marc')result=frameSegments({...options,width:model.width,height:model.height,segmentMax:bed});
  else if(kind==='placa')result=labelParts(options,api);
  else if(kind==='nord'){
    const {rotation}=modelNorth(model),pose=model.provenance?.options?.selectionPose;
    result=compassParts({...options,rotation,sx:pose?model.width/pose.widthM:1,sy:pose?model.height/pose.heightM:1},api);
  }else throw Error('Complement desconegut.');
  if(result.outer.some(v=>v>bed+1e-5)&&kind!=='marc')throw Error('El complement supera la mida útil del llit.');
  result.segments=result.segments.map(p=>({...p,color}));return result;
}
export function accessoryArchive(kind,model,options={},api){
  const result=accessoryGeometry(kind,model,options,api),files={},manifest={kind,units:'millimeters',parameters:result.parameters,model:{width:model.width,height:model.height,name:model.provenance?.name,bbox:model.provenance?.bbox,selectionPose:model.provenance?.options?.selectionPose},displayRotation:result.displayRotation,parts:[]};
  for(const p of result.segments){
    const filename=kind+'-'+p.id,part={...p,color:accessoryColor(p.color)};
    const provenance={...manifest.model,units:'millimeters',accessory:{kind,parameters:result.parameters,assemblyOffset:p.offset||[0,0,0]}};
    files[filename+'.3mf']=threeMF({parts:[part],provenance},{bambu:true});files[filename+'.stl']=binarySTL(part);
    manifest.parts.push({id:p.id,name:p.name,file:filename,translation:p.offset||[0,0,0]});
  }
  files['muntatge.json']=strToU8(JSON.stringify(manifest,null,2));
  if(kind==='marc'){
    const [w,h]=result.outer,origin=-(result.parameters.clearance+result.parameters.rim);
    const rectangles=result.segments.map((p,i)=>{
      const xs=[],ys=[];for(let k=0;k<p.vertices.length;k+=3){xs.push(p.vertices[k]);ys.push(p.vertices[k+1]);}
      const x=p.offset[0]-origin+Math.min(...xs),y=h-(p.offset[1]-origin+Math.max(...ys)),dx=Math.max(...xs)-Math.min(...xs),dy=Math.max(...ys)-Math.min(...ys);
      return `<rect x="${x}" y="${y}" width="${dx}" height="${dy}" fill="#ddd" stroke="#333" stroke-width=".3"/><text x="${x+dx/2}" y="${y+dy/2+1}" text-anchor="middle" font-size="3">${i+1}</text>`;
    });
    const hole=result.segments.length===1?`<rect x="${result.parameters.rim}" y="${result.parameters.rim}" width="${result.opening[0]}" height="${result.opening[1]}" fill="white" stroke="#333" stroke-width=".3"/>`:'';
    files['muntatge.svg']=strToU8(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -10 ${w+10} ${h+25}"><text x="0" y="-3" font-size="4">Part superior del model</text>${rectangles.join('')}${hole}</svg>`);
    files['PECES.txt']=strToU8(manifest.parts.map((p,i)=>`${i+1}. ${p.name}: ${p.file}.3mf (o .stl)`).join('\n'));
  }
  files['LLEGEIX-ME.txt']=strToU8(`Relleu Obert · ${kind}\nComplements independents en mm: cada 3MF és una peça d’un sol material, amb un STL equivalent. Imprimeix una sola de les dues versions.\nNo s’han canviat el terreny, l’escala ni els materials de la maqueta.\nMarc: els trams, si n’hi ha, s’uneixen a topall; les translacions de muntatge són a muntatge.json, en els eixos del model. Part superior no equival sempre a nord. Tolerància configurable, ajust físic pendent de provar.\nPlaca: tipografia de traç simple en MAJÚSCULES amb accents. Imprimeix-la plana; la variant lateral indica col·locació vertical posterior, no una impressió vertical.\nNord: alineeu el disc amb els eixos del model segons la direcció de muntatge.json; no és una brúixola magnètica.\nComprova dimensions, laminat i llegibilitat abans d’imprimir.\n`);
  return {bytes:zipSync(files,{level:1}),result,manifest};
}
