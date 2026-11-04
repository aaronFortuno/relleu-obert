import {polygonTester} from './polygon-index.js';

// Sample signed distance near the mapped outline. This lets the surface
// contour cross a triangle at a fractional position instead of snapping it.
export function sampleReliefMask(polygons,width,height,n,rows=n,distanceCells=1){
  if(!polygons.length)return null;
  const stride=n+1,dx=width/n,dy=height/rows,pad=Math.hypot(dx,dy)*distanceCells;
  const weights=new Float32Array(stride*(rows+1)).fill(pad);
  for(const polygon of polygons)for(const ring of polygon)for(let i=1;i<ring.length;i++){
    const [ax,ay]=ring[i-1],[bx,by]=ring[i],vx=bx-ax,vy=by-ay,length=vx*vx+vy*vy;
    if(!length)continue;
    const bottom=Math.max(0,Math.ceil((Math.min(ay,by)-pad)/dy)),top=Math.min(rows,Math.floor((Math.max(ay,by)+pad)/dy));
    for(let row=bottom;row<=top;row++){
      const y=row*dy;
      // Limit the candidate columns to the edge section near this row.
      const t0=vy?Math.max(0,Math.min((y-pad-ay)/vy,(y+pad-ay)/vy)):0;
      const t1=vy?Math.min(1,Math.max((y-pad-ay)/vy,(y+pad-ay)/vy)):1;
      const x0=ax+t0*vx,x1=ax+t1*vx;
      const left=Math.max(0,Math.ceil((Math.min(x0,x1)-pad)/dx)),right=Math.min(n,Math.floor((Math.max(x0,x1)+pad)/dx));
      for(let col=left;col<=right;col++){
        const x=col*dx,t=Math.max(0,Math.min(1,((x-ax)*vx+(y-ay)*vy)/length)),index=row*stride+col;
        weights[index]=Math.min(weights[index],Math.hypot(x-ax-t*vx,y-ay-t*vy));
      }
    }
  }
  const contains=polygonTester(polygons);
  let cells=0;
  for(let row=0;row<=rows;row++)for(let col=0;col<=n;col++){
    const index=row*stride+col,distance=Math.max(.0001,weights[index]/pad);
    const inside=contains([col*dx,row*dy]);
    weights[index]=inside?distance:-distance;
    if(inside)cells++;
  }
  return {weights,contains,cells};
}
