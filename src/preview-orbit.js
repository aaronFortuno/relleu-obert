const radians=Math.PI/180;
const idleDelay=3500;
const rampSeconds=2;
const tiltCycle=24;

export function createPreviewOrbit(){
  let lastFrame,readyAt=0,direction=1,reverseOnResume=false;
  let phase=0,ramp=0;

  function pause(time,delay=idleDelay){
    readyAt=time+delay;
    reverseOnResume=true;
  }

  function step(time,elevation,allowed){
    // Avoid a jump after the tab or WebGL context has been suspended.
    const seconds=Math.min(0.1,Math.max(0,(time-(lastFrame??time))/1000));
    lastFrame=time;
    if(!allowed||time<readyAt){
      ramp=0;
      return null;
    }
    if(reverseOnResume){
      direction*=-1;
      reverseOnResume=false;
    }
    phase=(phase+seconds)%tiltCycle;
    ramp=Math.min(1,ramp+seconds/rampSeconds);
    const ease=ramp*ramp*(3-2*ramp);
    const target=(30+10*Math.sin(phase*2*Math.PI/tiltCycle))*radians;
    const maxTilt=4*radians*seconds*ease;
    const tilt=Math.max(-maxTilt,Math.min(maxTilt,target-elevation));
    return {turn:direction*3*radians*seconds*ease,elevation:elevation+tilt};
  }

  return {pause,step};
}
