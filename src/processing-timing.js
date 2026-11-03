// Measure elapsed time on the same clock. Stage totals are exclusive.
// Geometry diagnostics are nested and must not be added to those totals.
export function createProcessingTiming(clock=()=>performance.now()){
  const start=clock(),stages=[],operations=[],diagnostics=[];
  let stage,operation;
  const close=(entry,list,now)=>{
    if(entry)list.push({...entry,milliseconds:now-entry.startMilliseconds});
  };
  return {
    mark(name,message){
      const now=clock()-start;
      if(stage?.phase!==name){
        close(stage,stages,now);
        stage={phase:name,startMilliseconds:now};
      }
      if(operation?.phase!==name||operation?.message!==message){
        close(operation,operations,now);
        operation={phase:name,message,startMilliseconds:now};
      }
    },
    detail(event){
      if(event.event==='end')diagnostics.push({atMilliseconds:clock()-start,...event});
    },
    elapsed:()=>clock()-start,
    finish(){
      const now=clock()-start;
      const result={milliseconds:now,stages:stages.slice(),operations:operations.slice(),diagnostics:diagnostics.slice()};
      close(stage,result.stages,now);
      close(operation,result.operations,now);
      return result;
    }
  };
}
