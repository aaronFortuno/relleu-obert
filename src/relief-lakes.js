import {polygonTester} from './polygon-index.js';

function distanceToShore(x,y,rings){
  let nearest=Infinity;
  for(const ring of rings)for(let i=1;i<ring.length;i++){
    const [ax,ay]=ring[i-1],[bx,by]=ring[i],dx=bx-ax,dy=by-ay;
    const length=dx*dx+dy*dy;
    const t=length?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length)):0;
    nearest=Math.min(nearest,(x-ax-t*dx)**2+(y-ay-t*dy)**2);
  }
  return Math.sqrt(nearest);
}

export function levelReliefLakes(lakes,project,heights,n,width,height){
  const stepX=width/n,stepY=height/n,step=Math.max(stepX,stepY),stride=n+1;
  const weights=new Float32Array(heights.length).fill(-1),occupied=new Uint8Array(heights.length);
  const footprints=lakes.flatMap(({geometry})=>geometry.type==='Polygon'?[geometry.coordinates]:
    geometry.type==='MultiPolygon'?geometry.coordinates:[]).map(polygon=>{
    const rings=polygon.map(ring=>ring.map(project)),xs=rings[0].map(([x])=>x),ys=rings[0].map(([,y])=>y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    return {rings,minX,maxX,minY,maxY,area:(maxX-minX)*(maxY-minY)};
  }).sort((a,b)=>b.area-a.area);
  let count=0;
  for(const {rings,minX,maxX,minY,maxY} of footprints){
    if(maxX<0||maxY<0||minX>width||minY>height)continue;
    const left=Math.max(0,Math.floor(minX/stepX)),right=Math.min(n,Math.ceil(maxX/stepX));
    const bottom=Math.max(0,Math.floor(minY/stepY)),top=Math.min(n,Math.ceil(maxY/stepY));
    const inside=polygonTester([rings]),wet=[],support=new Set();
    for(let y=bottom;y<=top;y++)for(let x=left;x<=right;x++){
      if(!inside([x*stepX,y*stepY]))continue;
      wet.push(y*stride+x);
      // Include all vertices incident to a water sample, regardless of which
      // diagonal is selected. This keeps the interpolated shore at lake level.
      for(let sy=Math.max(0,y-1);sy<=Math.min(n,y+1);sy++)
        for(let sx=Math.max(0,x-1);sx<=Math.min(n,x+1);sx++)support.add(sy*stride+sx);
    }
    if(!wet.length||[...support].some(i=>occupied[i]))continue;
    const samples=wet.map(i=>heights[i]).sort((a,b)=>a-b);
    const level=samples[Math.floor(samples.length/2)];
    const wetSet=new Set(wet);
    for(const i of support){
      const distance=distanceToShore(i%stride*stepX,Math.floor(i/stride)*stepY,rings);
      const weight=Math.max(.0001,Math.min(1,distance/step));
      weights[i]=wetSet.has(i)?weight:-weight;
      heights[i]=level;
      occupied[i]=1;
    }
    count++;
  }
  return {weights,count};
}
