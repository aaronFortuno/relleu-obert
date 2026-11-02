// Planificador pur d’actualitzacions automàtiques d’edificis.
// Coalescència d’edicions ràpides, cua mentre hi ha un altre càlcul,
// sense reintents automàtics després d’un error ni aplicació de resultats obsolets.
export function createBuildingUpdateScheduler({delay=300,setTimeoutFn,clearTimeoutFn,canAutoUpdate=()=>false,isBusy=()=>false,run}={}){
  if(typeof run!=='function')throw Error('Cal una funció run per programar les actualitzacions d’edificis.');
  if(!(delay>0))throw Error('L’espera del programador ha de ser positiva.');
  const later=setTimeoutFn||((fn,ms)=>setTimeout(fn,ms));
  const cancelLater=clearTimeoutFn||((id)=>clearTimeout(id));
  let timer=null,state=null,queued=false,phase='idle',lastError=null,version=0,running=false,disposed=false;
  const clearTimer=()=>{if(timer!==null){cancelLater(timer);timer=null;}};
  async function start(){
    if(running||disposed||!state)return;
    running=true;queued=false;phase='running';
    const token=version,current=state;
    try{await run(current,token);}
    catch(error){
      running=false;lastError=error;
      if(queued&&state&&version!==token){phase='queued';queueMicrotask(()=>{if(!disposed&&!running&&phase==='queued')flush();});}
      else{queued=false;phase='error';}
      return;
    }
    running=false;lastError=null;
    if(disposed)return;
    if(queued)flush();else phase='idle';
  }
  function fire(){
    timer=null;
    if(disposed||!state)return;
    if(!canAutoUpdate()){phase='manual';return;}
    if(isBusy()){queued=true;phase='queued';return;}
    start();
  }
  function notify(next={}){
    if(disposed)return 'disposed';
    state=next;version++;lastError=null;
    if(running){queued=true;phase='queued';return phase;}
    if(!canAutoUpdate()){clearTimer();queued=false;phase='manual';return phase;}
    if(isBusy()){clearTimer();queued=true;phase='queued';return phase;}
    clearTimer();queued=false;phase='pending';
    timer=later(fire,delay);
    return phase;
  }
  function flush(){
    if(disposed||running||!state)return phase;
    if(phase==='error')return phase;
    if(!queued&&timer===null)return phase;
    if(!canAutoUpdate()){clearTimer();queued=false;phase='manual';return phase;}
    if(isBusy()){clearTimer();queued=true;phase='queued';return phase;}
    clearTimer();start();
    return phase;
  }
  function retry(){
    if(disposed||running||!state)return phase;
    lastError=null;
    if(!canAutoUpdate()){phase='manual';return phase;}
    if(isBusy()){queued=true;phase='queued';return phase;}
    clearTimer();start();
    return phase;
  }
  function cancel(){
    if(disposed)return;
    clearTimer();queued=false;state=null;version++;phase='idle';
  }
  function dispose(){
    disposed=true;clearTimer();queued=false;state=null;version++;phase='idle';
  }
  return {notify,flush,retry,cancel,dispose,
    status:()=>phase,
    error:()=>lastError,
    pending:()=>phase==='pending'||phase==='queued',
    isCurrent:token=>!disposed&&token===version};
}
