// The brush still uses model millimetres. Only reuse strokes for the same
// physical frame; keep other frames available for the rest of the session.
function frameKey({widthMM,heightMM,selectionPose:p}){
  return JSON.stringify([widthMM,heightMM,p?.center.map(n=>n.toFixed(9)),p?.widthM.toFixed(5),p?.heightM.toFixed(5),p?.rotation]);
}

export function createProjectBrushHistory(){
  const saved=new Map();let active=null;
  return {
    prepare(options,current){
      const key=frameKey(options);
      return {key,strokes:key===active?current:saved.get(key)||[]};
    },
    accept(candidate,current){
      if(candidate.key===active)return current;
      if(active!==null){if(current.length)saved.set(active,current);else saved.delete(active);}
      active=candidate.key;saved.delete(active);
      return candidate.strokes;
    }
  };
}
