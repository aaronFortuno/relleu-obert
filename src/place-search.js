export function createPlaceSearchScheduler({run,setPending}){
  let timer=null,request=null;
  function clearDelay(){
    clearTimeout(timer);
    timer=null;
  }
  function cancel(){
    clearDelay();
    request?.abort();
    request=null;
    setPending(false);
  }
  async function start(query){
    clearDelay();
    if(request)return;
    if(!query){setPending(false);return;}
    const active=new AbortController();
    request=active;
    setPending(true);
    try{await run(query,active.signal);}
    finally{
      if(request===active){
        request=null;
        setPending(false);
      }
    }
  }
  function schedule(query){
    cancel();
    if(!query)return;
    setPending(true);
    timer=setTimeout(()=>start(query),1000);
  }
  return {start,schedule,cancel};
}
