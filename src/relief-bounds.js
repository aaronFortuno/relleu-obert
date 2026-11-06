export const sampleBounds=({left,bottom,right,top})=>({
  left:Math.floor(left),bottom:Math.floor(bottom),right:Math.ceil(right),top:Math.ceil(top)
});

export const fractionalBounds=({left,bottom,right,top})=>
  ![left,bottom,right,top].every(Number.isInteger);

function clipPlane(poly,axis,value,side){
  if(!poly.some(p=>side*(p[axis]-value)<0))return poly;
  const result=[];
  let a=poly.at(-1);
  for(const b of poly){
    const da=side*(a[axis]-value),db=side*(b[axis]-value);
    if((da<0&&db>0)||(da>0&&db<0)){
      // Use the same interpolation direction on both sides of a print seam
      // and for neighbouring triangles with oppositely oriented edges.
      const [low,high]=a[axis]<b[axis]?[a,b]:[b,a];
      const t=(value-low[axis])/(high[axis]-low[axis]);
      result.push(low.map((v,i)=>i===axis?value:v+(high[i]-v)*t));
    }
    if(db>=0)result.push(b);
    a=b;
  }
  return result;
}

export function reliefBoundsClipper(bounds){
  const planes=[[0,bounds.left,1],[0,bounds.right,-1],[1,bounds.bottom,1],[1,bounds.top,-1]]
    .filter(([,value])=>!Number.isInteger(value));
  const snap=(value,a,b)=>Math.abs(value-a)<1e-10?a:Math.abs(value-b)<1e-10?b:value;
  return poly=>{
    const original=poly;
    for(const [axis,value,side] of planes){
      poly=clipPlane(poly,axis,value,side);
      if(poly.length<3)return [];
    }
    if(poly===original)return poly;
    // A mesh diagonal can pass through a tile corner. Its two successive
    // interpolations may differ by machine rounding; keep only one vertex.
    const snapped=[];
    for(const p of poly){
      const [x,y]=p,px=snap(x,bounds.left,bounds.right),py=snap(y,bounds.bottom,bounds.top);
      const last=snapped.at(-1);
      if(!last||px!==last[0]||py!==last[1])snapped.push(px===x&&py===y?p:[px,py,...p.slice(2)]);
    }
    if(snapped.length>1&&snapped[0][0]===snapped.at(-1)[0]&&snapped[0][1]===snapped.at(-1)[1])snapped.pop();
    return snapped.length<3?[]:snapped;
  };
}
