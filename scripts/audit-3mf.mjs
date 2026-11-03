import {open} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {auditThreeMF,MAX_3MF_AUDIT_BYTES} from '../src/three-mf-audit.js';

let paths,heightMm;
try{
  const {values,positionals}=parseArgs({options:{z:{type:'string'}},allowPositionals:true});
  if(values.z!==undefined){
    heightMm=Number(values.z);
    if(!values.z.trim()||!Number.isFinite(heightMm))throw Error('L’alçada de consulta ha de ser un nombre finit en mil·límetres.');
  }
  if(!positionals.length)throw Error('Cal indicar almenys un 3MF de control.');
  paths=positionals;
}catch(error){
  console.error(error.message);
  console.error('Ús: node scripts/audit-3mf.mjs [--z=alçada_mm] control.3mf [altre-control.3mf …]');
  process.exitCode=2;
}
if(paths){
  const reports=[];
  for(const path of paths){
    let file;
    try{
      file=await open(path,'r');
      const {size}=await file.stat();
      if(size>MAX_3MF_AUDIT_BYTES)throw Error('El fitxer supera els 8 MiB comprimits.');
      const bytes=Buffer.alloc(size);
      let read=0;
      while(read<size){
        const {bytesRead}=await file.read(bytes,read,size-read,read);
        if(!bytesRead)throw Error('No s’ha pogut llegir tot el fitxer.');
        read+=bytesRead;
      }
      const report=auditThreeMF(bytes,{heightMm});
      reports.push({file:path,...report});
      if(!report.valid)process.exitCode=1;
    }catch(error){
      reports.push({file:path,valid:false,errors:[error.message]});
      process.exitCode=1;
    }finally{await file?.close();}
  }
  console.log(JSON.stringify(reports,null,2));
}
