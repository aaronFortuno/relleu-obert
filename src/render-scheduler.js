// Keep OrbitControls damping animated, then stop drawing while the scene is idle.
export function createDemandRenderer({requestFrame=cb=>requestAnimationFrame(cb),cancelFrame=id=>cancelAnimationFrame(id),update,render,onError=()=>{},onSlow=()=>{},maxFrames=240,sampleSize=30,slowThreshold=50}){
  if(!Number.isInteger(maxFrames)||maxFrames<1||maxFrames>600||!Number.isInteger(sampleSize)||sampleSize<3||sampleSize>120||!Number.isFinite(slowThreshold)||slowThreshold<=0||typeof update!=='function'||typeof render!=='function')throw Error('Planificador de vista invàlid.');
  let active=false,disposed=false,frame=null,inside=false,dirty=false,remaining=0,lastFrame=null,intervals=[],reported=false;
  function queue(){if(active&&!disposed&&frame===null)frame=requestFrame(tick);}
  function tick(timestamp){
    frame=null;if(!active||disposed)return;
    inside=true;dirty=false;remaining--;
    try{
      if(Number.isFinite(timestamp)){
        if(lastFrame!==null&&!reported){intervals.push(timestamp-lastFrame);if(intervals.length>=sampleSize){const sorted=intervals.slice().sort((a,b)=>a-b);if(sorted[Math.ceil(sorted.length*.95)-1]>slowThreshold){reported=true;onSlow();}intervals=[];}}
        lastFrame=timestamp;
      }
      const changed=!!update();render();if((changed||dirty)&&remaining>0)queue();
    }
    catch(e){stop();onError(e);}
    finally{inside=false;}
  }
  function invalidate(){if(!active||disposed)return;dirty=true;if(!inside){if(frame===null)lastFrame=null;remaining=maxFrames;queue();}}
  function start(){if(disposed)return;active=true;intervals=[];reported=false;lastFrame=null;invalidate();}
  function stop(){active=false;if(frame!==null)cancelFrame(frame);frame=null;dirty=false;}
  function dispose(){stop();disposed=true;}
  return {start,stop,invalidate,dispose,pending:()=>frame!==null};
}
