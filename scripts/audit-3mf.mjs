import {open} from 'node:fs/promises';
import {auditThreeMF,MAX_3MF_AUDIT_BYTES} from '../src/three-mf-audit.js';

const paths=process.argv.slice(2);
if(!paths.length){
  console.error('Ús: node scripts/audit-3mf.mjs control.3mf [altre-control.3mf …]');
  process.exitCode=2;
}else{
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
      const report=auditThreeMF(bytes);
      reports.push({file:path,...report});
      if(!report.valid)process.exitCode=1;
    }catch(error){
      reports.push({file:path,valid:false,errors:[error.message]});
      process.exitCode=1;
    }finally{await file?.close();}
  }
  console.log(JSON.stringify(reports,null,2));
}
