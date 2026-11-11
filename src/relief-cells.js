// Reuse the diagonal's interpolated mask scores, but preserve the measured
// elevation at the centre. Every tile and material uses the same triangles.
export function visitReliefCell(a,b,c,d,falling,centreHeight,visit){
  if(Number.isFinite(centreHeight)){
    const start=falling?b:a,end=falling?d:c;
    const centre=start.map((value,i)=>i===2?centreHeight:(value+end[i])/2);
    visit(a,b,centre);visit(b,c,centre);visit(c,d,centre);visit(d,a,centre);
  }else if(falling){
    visit(a,b,d);visit(b,c,d);
  }else{
    visit(a,b,c);visit(a,c,d);
  }
}

// Preserve sub-cell relief where the best diagonal misses enough height to
// show on the print. The largest errors take priority within the mesh budget.
export function selectReliefCentres(samples,heights,diagonals,columns,zScale,ocean,lakes){
  const thresholdMM=.1,maximum=Math.max(1,Math.floor(samples.length*.08));
  const stride=columns+1,candidates=[];
  const wet=(a,b,c,d,mask)=>mask&&(mask[a]>0||mask[b]>0||mask[c]>0||mask[d]>0);
  for(let i=0;i<samples.length;i++){
    const a=i+Math.floor(i/columns),b=a+1,d=a+stride,c=d+1;
    if(wet(a,b,c,d,ocean)||wet(a,b,c,d,lakes))continue;
    const diagonal=diagonals[i]?(heights[b]+heights[d])/2:(heights[a]+heights[c])/2;
    const error=Math.abs(samples[i]-diagonal)*zScale;
    if(error>=thresholdMM)candidates.push({i,error});
  }
  if(!candidates.length)return {count:0,metres:null};
  if(candidates.length>maximum)candidates.sort((a,b)=>b.error-a.error||a.i-b.i);
  const count=Math.min(maximum,candidates.length),metres=new Float64Array(samples.length).fill(NaN);
  for(let j=0;j<count;j++){
    const {i}=candidates[j];
    metres[i]=samples[i];
  }
  return {count,metres};
}
