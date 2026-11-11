import earcut from 'earcut';
import {polygonOps} from './polygon-ops.js';
import {fractionalBounds,sampleBounds} from './relief-bounds.js';

const pc=polygonOps();
const STREAM_RAISE=.24,STREAM_EMBED=.12;
const rectangle=(x0,y0,x1,y1)=>[[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]];

export function reliefStreamStrips(polygons,width,height,n){
  if(!polygons.length)return [];
  const columns=Array.from({length:n},()=>[]);
  for(const buffer of polygons)for(const outline of buffer){
    // Snap tangential joins before the union, far below printable detail.
    const polygon=outline.map(ring=>ring.map(point=>point.map(value=>Math.round(value*1e4)/1e4)));
    let min=Infinity,max=-Infinity;
    for(const [x] of polygon[0]){min=Math.min(min,x);max=Math.max(max,x);}
    const left=Math.max(0,Math.floor(min*n/width)),right=Math.min(n-1,Math.floor(max*n/width));
    for(let i=left;i<=right;i++)columns[i].push(polygon);
  }
  // Clip locally before merging. Rivers on the far side of the map do not
  // participate in the same polygon operation, even on a 40 km crop.
  return columns.map((column,i)=>{
    const box=rectangle(i*width/n,0,(i+1)*width/n,height);
    const pieces=[];
    for(let k=0;k<column.length;k+=24){
      const batch=pc.union(...column.slice(k,k+24).map(polygon=>[polygon]));
      const clipped=pc.intersection(batch,box);
      if(clipped.length)pieces.push(clipped);
    }
    return pieces.length?pc.union(...pieces):[];
  });
}

function landPolygon(polygon,weightIndex){
  if(polygon.every(p=>p[weightIndex]>0))return [];
  if(polygon.every(p=>p[weightIndex]<=0))return polygon;
  const result=[];
  let a=polygon.at(-1);
  for(const b of polygon){
    if((a[weightIndex]<=0)!==(b[weightIndex]<=0)){
      const t=a[weightIndex]/(a[weightIndex]-b[weightIndex]);
      result.push(a.map((value,index)=>value+t*(b[index]-value)));
    }
    if(b[weightIndex]<=0)result.push(b);
    a=b;
  }
  return result;
}

function extrudePatch(poly,heightAt,offset,result,raise){
  const xy=[],holes=[];
  for(const [i,ring]of poly.entries()){
    if(i)holes.push(xy.length/2);
    for(let j=0;j<ring.length-1;j++)xy.push(ring[j][0],ring[j][1]);
  }
  const triangles=earcut(xy,holes);
  if(!triangles.length)return;
  const {vertices,faces}=result,edges=new Map(),top=[];
  const vertex=i=>{
    const x=xy[i*2],y=xy[i*2+1],z=heightAt(x,y),index=vertices.length/3;
    vertices.push(x-offset[0],y-offset[1],z+raise,x-offset[0],y-offset[1],z-STREAM_EMBED);
    return index;
  };
  const surface=(a,b,c)=>faces.push(a,b,c,a+1,c+1,b+1);
  const wall=(a,b)=>faces.push(a,a+1,b+1,a,b+1,b);
  for(let i=0;i<triangles.length;i+=3){
    let a=triangles[i],b=triangles[i+1],c=triangles[i+2];
    const ax=xy[2*a],ay=xy[2*a+1],bx=xy[2*b],by=xy[2*b+1],cx=xy[2*c],cy=xy[2*c+1];
    const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
    if(Math.abs(area)<1e-12)continue;
    if(area<0)[b,c]=[c,b];
    top.push([a,b,c]);
    for(const [u,v]of [[a,b],[b,c],[c,a]]){
      const key=Math.min(u,v)*xy.length+Math.max(u,v);
      const edge=edges.get(key);
      if(edge)edge.count++;
      else edges.set(key,{u,v,count:1});
    }
  }
  const boundary=[...edges.values()].filter(edge=>edge.count===1),degree=new Map();
  for(const {u,v} of boundary)for(const id of [u,v])degree.set(id,(degree.get(id)||0)+1);
  // A contour clipped at a confluence can pinch at a vertex. Give each
  // triangle its own walls in that patch to avoid a shared vertical edge.
  if([...edges.values()].some(edge=>edge.count>2)||[...degree.values()].some(count=>count!==2)){
    for(const triangle of top){
      const [a,b,c]=triangle.map(vertex);
      surface(a,b,c);wall(a,b);wall(b,c);wall(c,a);
    }
    return;
  }
  const indices=Array.from({length:xy.length/2},(_,i)=>vertex(i));
  for(const [a,b,c] of top)surface(indices[a],indices[b],indices[c]);
  for(const {u,v} of boundary)wall(indices[u],indices[v]);
}

export function reliefStreamPart(grid,bounds,strips=grid.streamStrips,raise=STREAM_RAISE,exclusions=[]){
  const {resolution:n,rows=n,width,height,heights,diagonals,lakeWeights,oceanWeights}=grid;
  if(!strips?.length)return null;
  const {left,bottom,right,top}=sampleBounds(bounds);
  const dy=height/rows,stride=n+1;
  const x=i=>i*width/n,y=i=>i*height/rows,offset=[x(bounds.left),y(bounds.bottom)],result={vertices:[],faces:[]};
  const clip=fractionalBounds(bounds)?rectangle(...offset,x(bounds.right),y(bounds.top)):null;
  const nodes=(i,j)=>{
    const index=j*stride+i;
    return [x(i),y(j),heights[index],lakeWeights?.[index]??-1,oceanWeights?.[index]??-1];
  };
  for(let i=left;i<right;i++){
    const column=strips[i];
    if(!column.length)continue;
    const blocked=exclusions.flatMap(layer=>layer?.[i]?.length?[layer[i]]:[]);
    const stripsByRow=new Map();
    for(const strip of column){
      let min=Infinity,max=-Infinity;
      for(const [,py]of strip[0]){min=Math.min(min,py);max=Math.max(max,py);}
      const from=Math.max(bottom,Math.floor(min/dy)),to=Math.min(top,Math.ceil(max/dy));
      for(let j=from;j<to;j++){
        if(!stripsByRow.has(j))stripsByRow.set(j,[]);
        stripsByRow.get(j).push(strip);
      }
    }
    for(const [j,candidates]of stripsByRow){
      const a=nodes(i,j),b=nodes(i+1,j),c=nodes(i+1,j+1),d=nodes(i,j+1);
      for(const triangle of diagonals[j*n+i]?[[a,b,d],[b,c,d]]:[[a,b,c],[a,c,d]]){
        const land=landPolygon(triangle,3);
        const dry=oceanWeights?landPolygon(land,4):land;
        if(dry.length<3)continue;
        const needsClip=clip&&(i<bounds.left||i+1>bounds.right||j<bounds.bottom||j+1>bounds.top);
        let clipped=pc.intersection(candidates,[[dry.map(([px,py])=>[px,py])]],...(needsClip?[clip]:[]));
        if(clipped.length&&blocked.length)clipped=pc.difference(clipped,...blocked);
        if(!clipped.length)continue;
        const [p,q,r]=triangle;
        const determinant=(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
        const sx=((q[2]-p[2])*(r[1]-p[1])-(r[2]-p[2])*(q[1]-p[1]))/determinant;
        const sy=((r[2]-p[2])*(q[0]-p[0])-(q[2]-p[2])*(r[0]-p[0]))/determinant;
        const heightAt=(px,py)=>p[2]+sx*(px-p[0])+sy*(py-p[1]);
        for(const patch of clipped)extrudePatch(patch,heightAt,offset,result,raise);
      }
    }
  }
  return result.faces.length?{vertices:new Float32Array(result.vertices),faces:new Uint32Array(result.faces)}:null;
}
