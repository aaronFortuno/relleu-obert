// Constant-width planar buffer: segment rectangles plus disks at bends/ends.
// Their union is the Minkowski sum of the path and a radius-r disk (round joins).
export function lineBuffer(points,r,bounds){
  if(!Number.isFinite(r)||r<=0)throw Error('Amplada de camí invàlida.');
  const line=points.filter((p,i)=>!i||Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])>1e-5),polys=[],normals=Array.from({length:line.length},()=>[]);
  const visible=(a,b=a)=>!bounds||!(Math.max(a[0],b[0])+r<0||Math.min(a[0],b[0])-r>bounds[0]||Math.max(a[1],b[1])+r<0||Math.min(a[1],b[1])-r>bounds[1]);
  for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),x=-dy/l*r,y=dx/l*r;
    const angle=Math.atan2(y,x);normals[i-1].push(angle,angle+Math.PI);normals[i].push(angle,angle+Math.PI);
    if(visible(a,b))polys.push([[[a[0]+x,a[1]+y],[a[0]-x,a[1]-y],[b[0]-x,b[1]-y],[b[0]+x,b[1]+y],[a[0]+x,a[1]+y]]]);
  }
  const count=Math.max(12,Math.ceil(Math.PI/Math.acos(Math.max(-1,1-.01/r))));
  for(let i=0;i<line.length;i++){
    if(!normals[i].length||!visible(line[i]))continue;
    if(i&&i<line.length-1){const a=line[i-1],b=line[i],c=line[i+1],cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]),dot=(b[0]-a[0])*(c[0]-b[0])+(b[1]-a[1])*(c[1]-b[1]);if(Math.abs(cross)<1e-10&&dot>0)continue;}
    const angles=[...normals[i],...Array.from({length:count},(_,j)=>j/count*Math.PI*2)].map(a=>(a%(Math.PI*2)+Math.PI*2)%(Math.PI*2)).sort((a,b)=>a-b).filter((a,j,list)=>!j||a-list[j-1]>1e-9);
    const [x,y]=line[i],ring=angles.map(a=>[x+Math.cos(a)*r,y+Math.sin(a)*r]);ring.push(ring[0]);polys.push([ring]);
  }
  return polys;
}
