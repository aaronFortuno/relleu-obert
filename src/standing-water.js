const flowing=new Set(['river','stream','canal','ditch','drain','waterfall','rapids']);
const standing=new Set(['lake','reservoir','pond','basin','swimming_pool','lagoon']);

export const isMarineWater=properties=>properties.class==='ocean'||properties.class==='sea';

export function isFlowingWater(properties){
  return [properties.class,properties.water,properties.waterway].some(value=>flowing.has(value));
}

export function isStandingWater(properties){
  return !isFlowingWater(properties)&&
    [properties.class,properties.water,properties.natural,properties.landuse].some(value=>standing.has(value));
}

// Estimate an unmeasured water level from the visible shoreline. Sample at
// even distances so detailed stretches of shore do not dominate the median.
export function shorelineLevel(polygon,ground,width,height){
  const ring=polygon[0],edges=[];
  let length=0;
  for(let i=1;i<ring.length;i++){
    const a=ring[i-1],b=ring[i];
    const span=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(!span)continue;
    const border=(a[0]===b[0]&&(a[0]===0||a[0]===width))||
      (a[1]===b[1]&&(a[1]===0||a[1]===height));
    edges.push({a,b,span,border});
    if(!border)length+=span;
  }
  const shore=length?edges.filter(edge=>!edge.border):edges;
  if(!length)length=shore.reduce((sum,edge)=>sum+edge.span,0);
  if(!length)return ground(...ring[0]);
  const count=Math.min(128,Math.max(12,Math.ceil(length)));
  const elevations=[];
  let edge=0,start=0;
  for(let i=0;i<count;i++){
    const distance=(i+.5)*length/count;
    while(edge+1<shore.length&&distance>start+shore[edge].span)start+=shore[edge++].span;
    const {a,b,span}=shore[edge],t=(distance-start)/span;
    elevations.push(ground(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t));
  }
  elevations.sort((a,b)=>a-b);
  const middle=Math.floor(count/2);
  return count%2?elevations[middle]:(elevations[middle-1]+elevations[middle])/2;
}
