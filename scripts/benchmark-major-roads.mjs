// Parent watchdog remains responsive while synchronous geometry blocks the child.
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {freemem,cpus,totalmem} from 'node:os';
import {fileURLToPath} from 'node:url';

const args=process.argv.slice(2),flag=(name,fallback)=>args.find(v=>v.startsWith(`--${name}=`))?.split('=').slice(1).join('=')??fallback;
if(args.includes('--help')){
  console.log('node scripts/benchmark-major-roads.mjs [km=3] [mm=150] [detail=12] --timeout=120 --output=output/ro051.json\nSequential, local fixture only; 1536 MB heap, >=4 GB initially, stop below 1.6 GB.');process.exit(0);
}
const timeout=Number(flag('timeout','120')),output=resolve(flag('output','output/ro051.json'));
if(!Number.isFinite(timeout)||timeout<=0)throw Error('Timeout invàlid.');
if(freemem()/2**30<4)throw Error('Calen almenys 4 GB lliures.');
mkdirSync(dirname(output),{recursive:true});
const start=Date.now(),report={date:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),node:process.version,cpu:cpus()[0]?.model,totalGB:totalmem()/2**30,arguments:args.filter(v=>!v.startsWith('--timeout=')&&!v.startsWith('--output=')),heapMB:1536,timeoutSeconds:timeout,minimumFreeGB:freemem()/2**30,events:[],progress:[],result:null};
const child=spawn(process.execPath,['--max-old-space-size=1536',fileURLToPath(new URL('./diagnose-major-roads.mjs',import.meta.url)),...report.arguments,'--trace'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
let pending='',stderr='',stopReason=null;
child.stdout.on('data',chunk=>{
  process.stdout.write(chunk);pending+=chunk;
  const lines=pending.split(/\r?\n/);pending=lines.pop();
  for(const line of lines){
    if(line.startsWith('RO051_TIMING '))report.events.push(JSON.parse(line.slice(13)));
    else if(line.startsWith('RO051_RESULT '))report.result=JSON.parse(line.slice(13));
    else if(/^\d+s /.test(line))report.progress.push({elapsedMS:Date.now()-start,message:line});
  }
});
child.stderr.on('data',chunk=>{stderr+=chunk;process.stderr.write(chunk);});
function stop(reason){if(!stopReason){stopReason=reason;child.kill();}}
const monitor=setInterval(()=>{
  const freeGB=freemem()/2**30;report.minimumFreeGB=Math.min(report.minimumFreeGB,freeGB);
  if(freeGB<1.6)stop('low-memory');
  else if(Date.now()-start>timeout*1000)stop('timeout');
},500);
child.on('error',error=>{stderr+=error.stack;});
child.on('close',(code,signal)=>{
  clearInterval(monitor);Object.assign(report,{wallSeconds:(Date.now()-start)/1000,exitCode:code,signal,stopReason,stderr});
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(`Report: ${output}; ${stopReason??'completed'}; ${report.wallSeconds}s; min free ${report.minimumFreeGB.toFixed(2)} GB`);
  process.exitCode=stopReason||code!==0||!report.result?1:0;
});
