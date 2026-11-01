// Exact point-in-polygon queries, with cached bounds and horizontal edge bands.
// These are spatial indexes, not a raster approximation of the coastline.
export function polygonTester(polygons){
  const compiled=polygons.map(poly=>poly.map(ring=>{
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const [x,y]of ring){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    const bands=Array.from({length:64},()=>[]),span=maxY-minY||1;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];if(a[1]===b[1])continue;
      const first=Math.max(0,Math.floor((Math.min(a[1],b[1])-minY)/span*64)),last=Math.min(63,Math.floor((Math.max(a[1],b[1])-minY)/span*64));
      for(let k=first;k<=last;k++)bands[k].push([a,b]);
    }
    return {minX,maxX,minY,maxY,span,bands};
  }));
  function inside([x,y],r){if(x<r.minX||x>r.maxX||y<r.minY||y>r.maxY)return false;let yes=false;const band=r.bands[Math.min(63,Math.max(0,Math.floor((y-r.minY)/r.span*64)))];for(const [a,b]of band)if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;return yes;}
  if(!compiled.length)return ()=>false;
  const bounds=compiled.map(r=>r[0]),minX=Math.min(...bounds.map(r=>r.minX)),minY=Math.min(...bounds.map(r=>r.minY)),maxX=Math.max(...bounds.map(r=>r.maxX)),maxY=Math.max(...bounds.map(r=>r.maxY)),dx=maxX-minX||1,dy=maxY-minY||1,grid=Array.from({length:1024},()=>[]),cell=(v,min,span)=>Math.min(31,Math.max(0,Math.floor((v-min)/span*32)));
  for(const rings of compiled){const b=rings[0];for(let y=cell(b.minY,minY,dy);y<=cell(b.maxY,minY,dy);y++)for(let x=cell(b.minX,minX,dx);x<=cell(b.maxX,minX,dx);x++)grid[y*32+x].push(rings);}
  return p=>{if(p[0]<minX||p[0]>maxX||p[1]<minY||p[1]>maxY)return false;return grid[cell(p[1],minY,dy)*32+cell(p[0],minX,dx)].some(rings=>inside(p,rings[0])&&!rings.slice(1).some(r=>inside(p,r)));};
}
