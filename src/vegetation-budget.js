export const MAX_TREES=12000;

// Deterministic reservoir: every eligible position has the same chance of being
// retained, including positions reached after the geometry budget is full.
export function treeSampler(limit=MAX_TREES,initialSeed=9187){
  const values=[];let seen=0,seed=initialSeed;
  return {values,get seen(){return seen;},add(value){
    seen++;
    if(values.length<limit){values.push(value);return;}
    seed=(1664525*seed+1013904223)>>>0;
    const index=Math.floor(seed/4294967296*seen);
    if(index<limit)values[index]=value;
  }};
}

export function fitTrees(automatic,manual){
  const manualDropped=Math.max(0,manual.length-MAX_TREES),keptManual=manual.slice(-MAX_TREES);
  const sampler=treeSampler(MAX_TREES-keptManual.length,3721);
  for(const tree of automatic)sampler.add(tree);
  return {placements:[...sampler.values,...keptManual],automatic:sampler.values.length,manual:keptManual.length,automaticReduced:automatic.length-sampler.values.length,manualDropped};
}
