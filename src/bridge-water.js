const STEP_MM=.15;
const MIN_WATER_SPAN_MM=.2;
const MAX_WATER_SPAN_MM=10;
const MAX_AXIS_LENGTH_MM=20;
const DECK_THICKNESS_MM=.4;
const MIN_CLEARANCE_MM=.25;
const SAMPLING_MARGIN_MM=.01;
const BANK_OVERLAP_MM=.005;
const MAX_DECK_GRADE=.2;
const MAIN_DECK_THICKNESS_MM=.6;
const MAIN_SECTION_MM=2;
const MAIN_MAX_LENGTH_MM=300;
const MAIN_MAX_LIFT_MM=3;

const mix=(a,b,t)=>a+(b-a)*t;

function* stations(axis){
  let start=0;
  yield {index:0,t:0,s:0,point:axis[0]};
  for(let i=1;i<axis.length;i++){
    const a=axis[i-1],b=axis[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const steps=Math.min(512,Math.ceil(length/STEP_MM));
    for(let j=1;j<=steps;j++){
      const t=j/steps;
      yield {index:i-1,t,s:start+length*t,point:[mix(a[0],b[0],t),mix(a[1],b[1],t)]};
    }
    start+=length;
  }
}

export function bridgeCrossesWater(axis,containsWater){
  if(containsWater(axis[0])||containsWater(axis.at(-1)))return false;
  for(const {point} of stations(axis))if(containsWater(point))return true;
  return false;
}

// Fit only a single short crossing with two dry banks. Heights and clearance
// are measured against the same surface that gives the water its material.
export function fitWaterBridge(axis,rows,ground,waterAt){
  if(waterAt(...axis[0])!==null||waterAt(...axis.at(-1))!==null)return null;
  let firstWet,lastWet,ended=false,length=0,clearance=Infinity;
  const water=[];
  for(const {index,t,s,point} of stations(axis)){
    if(s>MAX_AXIS_LENGTH_MM)return null;
    length=s;
    const wet=waterAt(...point);
    if(wet!==null){
      if(ended)return null;
      firstWet??=s;lastWet=s;
    }else if(firstWet!==undefined)ended=true;
    const [a,b]=[rows[index],rows[index+1]];
    const levels=[wet,...a.map((p,i)=>waterAt(mix(p[0],b[i][0],t),mix(p[1],b[i][1],t)))];
    for(const z of levels)if(z!==null){
      water.push([s,z]);
      clearance=Math.min(clearance,mix(a[0][2],b[0][2],t)-.6-z);
    }
  }
  if(firstWet===undefined||lastWet-firstWet<MIN_WATER_SPAN_MM||
     lastWet-firstWet>MAX_WATER_SPAN_MM||clearance>=MIN_CLEARANCE_MM)return null;
  const start=ground(...axis[0]),end=ground(...axis.at(-1));
  const grade=Math.max(-MAX_DECK_GRADE,Math.min(MAX_DECK_GRADE,(end-start)/length));
  let startZ=Math.max(start,end-grade*length);
  for(const [s,z] of water)startZ=Math.max(startZ,z+MIN_CLEARANCE_MM+SAMPLING_MARGIN_MM+DECK_THICKNESS_MM-grade*s);
  // Keep solid contact with both banks even if no compatible ramp is found.
  if(Math.max(startZ-start,startZ+grade*length-end)>DECK_THICKNESS_MM-BANK_OVERLAP_MM)return null;
  let distance=0;
  const heights=axis.map((p,i)=>{
    if(i)distance+=Math.hypot(p[0]-axis[i-1][0],p[1]-axis[i-1][1]);
    return startZ+grade*distance;
  });
  return {heights,thicknessMM:DECK_THICKNESS_MM,minimumClearanceMM:MIN_CLEARANCE_MM};
}

// Mapped main-road bridges can be longer than the small two-bank fit above.
// Keep their alignment and existing profile wherever it clears the model.
// Lift only the affected stations, carrying the correction back smoothly
// enough to meet the existing landings.
export function fitMainWaterBridge(axis,rows,ground,waterAt,{maxGrade,inModel}){
  if(waterAt(...axis[0])!==null||waterAt(...axis.at(-1))!==null)return null;
  const totalLength=axis.slice(1).reduce((sum,[x,y],i)=>sum+Math.hypot(x-axis[i][0],y-axis[i][1]),0);
  if(totalLength>MAIN_MAX_LENGTH_MM)return null;

  const sections=[{point:axis[0],row:rows[0],s:0,lift:0}];
  for(let i=1;i<axis.length;i++){
    const a=axis[i-1],b=axis[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length<1e-7)return null;
    const start=sections.at(-1).s,count=Math.ceil(length/MAIN_SECTION_MM);
    for(let j=1;j<=count;j++){
      const t=j/count;
      sections.push({point:a.map((v,k)=>mix(v,b[k],t)),
        row:rows[i-1].map((edge,k)=>edge.map((v,l)=>mix(v,rows[i][k][l],t))),s:start+length*t,lift:0});
    }
  }

  let crossesWater=false,needsLift=false;
  for(let i=1;i<sections.length;i++){
    const a=sections[i-1],b=sections[i],count=Math.ceil((b.s-a.s)/STEP_MM);
    for(let j=0;j<=count;j++){
      const t=j/count,edges=a.row.map((edge,k)=>edge.map((v,l)=>mix(v,b.row[k][l],t)));
      for(const u of [0,.25,.5,.75,1]){
        const [x,y,z]=edges[0].map((v,k)=>mix(v,edges[1][k],u));
        if(!inModel([x,y]))continue;
        const water=waterAt(x,y);
        if(water!==null&&u===.5)crossesWater=true;
        const floor=water===null?ground(x,y):water+MAIN_DECK_THICKNESS_MM+MIN_CLEARANCE_MM;
        if(z+1e-7>=floor)continue;
        const lift=floor-z+SAMPLING_MARGIN_MM;
        a.lift=Math.max(a.lift,lift);
        b.lift=Math.max(b.lift,lift);
        needsLift=true;
      }
    }
  }
  if(!crossesWater||!needsLift)return null;

  const heights=sections.map(({row,lift})=>row[0][2]+lift);
  const soften=heights.map((z,i)=>{
    const before=sections[i-1],after=sections[i+1];
    if(!before||!after)return z;
    const smooth=mix(heights[i-1],heights[i+1],(sections[i].s-before.s)/(after.s-before.s));
    return Math.max(z,(z+smooth)/2);
  });
  for(let i=1;i<sections.length;i++)soften[i]=Math.max(soften[i],soften[i-1]-maxGrade*(sections[i].s-sections[i-1].s));
  for(let i=sections.length-2;i>=0;i--)soften[i]=Math.max(soften[i],soften[i+1]-maxGrade*(sections[i+1].s-sections[i].s));
  if(soften.some((z,i)=>z-sections[i].row[0][2]>MAIN_MAX_LIFT_MM))return null;
  for(const i of [0,sections.length-1]){
    const p=sections[i].point;
    if(inModel(p)&&soften[i]-ground(...p)>MAIN_DECK_THICKNESS_MM-BANK_OVERLAP_MM)return null;
  }
  return {axis:sections.map(section=>section.point),rows:sections.map(({row},i)=>row.map(([x,y])=>[x,y,soften[i]])),
    thicknessMM:MAIN_DECK_THICKNESS_MM,minimumClearanceMM:MIN_CLEARANCE_MM};
}
