export const RELIEF_SKIN_DEPTH=.65;

// Interpolate class weights on the raster. Each grid vertex receives three
// scores, with a tiny deterministic bias for exact categorical ties.
export function sampleCoverage(coverage,lon,lat,out,offset){
  out[offset]=1;
  for(const {bbox:[w,s,e,n],width,height,values} of coverage){
    if(lon<w||lon>=e||lat<=s||lat>n)continue;
    const x=Math.max(0,Math.min(width-1,(lon-w)/(e-w)*width-.5));
    const y=Math.max(0,Math.min(height-1,(n-lat)/(n-s)*height-.5));
    const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;
    const right=Math.min(ix+1,width-1),below=Math.min(iy+1,height-1);
    out[offset]=0;
    const add=(col,row,weight)=>{
      const value=values[row*width+col];
      out[offset+(value===60?1:value===70?2:0)]+=weight;
    };
    add(ix,iy,(1-u)*(1-v));add(right,iy,u*(1-v));
    add(ix,below,(1-u)*v);add(right,below,u*v);
    break;
  }
  out[offset+1]+=.0001;
  out[offset+2]+=.0002;
}

function clip(poly,score){
  const result=[];
  let a=poly.at(-1),da=score(a);
  for(const b of poly){
    const db=score(b);
    if((da>=0)!==(db>=0)){
      const t=da/(da-db);
      result.push(a.map((value,i)=>value+(b[i]-value)*t));
    }
    if(db>=0)result.push(b);
    a=b;da=db;
  }
  return result;
}

function grow(array,minimum){
  if(minimum<=array.length)return array;
  const bigger=new array.constructor(Math.max(minimum,array.length*2));
  bigger.set(array);
  return bigger;
}

function skinBuilder(bounds,grid){
  const {left,bottom,right,top}=bounds,{resolution:n,rows=n,width,height}=grid;
  const stride=right-left+1,integer=new Uint32Array(stride*(top-bottom+1));
  const intersections=new Map(),boundary=new Map(),edgeStride=2**24;
  let vertices=new Float32Array(1024),faces=new Uint32Array(1024),nv=0,nf=0;
  function vertex([x,y,z]){
    const vx=Math.fround((x-left)*width/n),vy=Math.fround((y-bottom)*height/rows);
    const ix=Math.round(x),iy=Math.round(y);
    if(vx===Math.fround((ix-left)*width/n))x=ix;
    if(vy===Math.fround((iy-bottom)*height/rows))y=iy;
    const lattice=Number.isInteger(x)&&Number.isInteger(y);
    const key=lattice?(y-bottom)*stride+x-left:vx+','+vy;
    const found=lattice?integer[key]:intersections.get(key);
    if(found)return found-1;
    vertices=grow(vertices,nv+6);
    const index=nv/3;
    vertices[nv++]=vx;vertices[nv++]=vy;vertices[nv++]=z;
    vertices[nv++]=vx;vertices[nv++]=vy;vertices[nv++]=z-RELIEF_SKIN_DEPTH;
    if(lattice)integer[key]=index+1;
    else intersections.set(key,index+1);
    return index;
  }
  function tri(a,b,c){
    if(a===b||b===c||c===a)return;
    faces=grow(faces,nf+3);
    faces[nf++]=a;faces[nf++]=b;faces[nf++]=c;
  }
  const wall=(a,b)=>{tri(a,a+1,b+1);tri(a,b+1,b);};
  function edge(a,b,face){
    const key=Math.min(a,b)*edgeStride+Math.max(a,b);
    if(boundary.has(key))boundary.delete(key);
    else boundary.set(key,a<b?face+1:-face-1);
  }
  function splitPinches(){
    const degree=new Map();
    for(const key of boundary.keys()){
      const a=Math.floor(key/edgeStride),b=key%edgeStride;
      degree.set(a,(degree.get(a)||0)+1);
      degree.set(b,(degree.get(b)||0)+1);
    }
    const pinches=new Map();
    for(const [id,count] of degree)if(count>2)pinches.set(id,[]);
    if(!pinches.size)return new Map();
    for(let face=0;face<nf;face+=6){
      for(let i=0;i<3;i++){
        const fan=pinches.get(faces[face+i]);
        if(fan)fan.push([face,faces[face+(i+1)%3],faces[face+(i+2)%3]]);
      }
    }
    const replacements=new Map();
    for(const [id,fan] of pinches){
      const neighbours=new Map();
      for(const corner of fan)for(const neighbour of corner.slice(1)){
        if(!neighbours.has(neighbour))neighbours.set(neighbour,[]);
        neighbours.get(neighbour).push(corner);
      }
      const pending=new Set(fan);
      let first=true;
      while(pending.size){
        const component=[pending.values().next().value];
        pending.delete(component[0]);
        for(const corner of component)for(const neighbour of corner.slice(1)){
          for(const next of neighbours.get(neighbour))if(pending.delete(next))component.push(next);
        }
        if(first){first=false;continue;}
        vertices=grow(vertices,nv+6);
        const copy=nv/3;
        vertices.copyWithin(nv,id*3,id*3+6);nv+=6;
        for(const [face] of component){
          for(let i=0;i<6;i++){
            if(faces[face+i]===id)faces[face+i]=copy;
            else if(faces[face+i]===id+1)faces[face+i]=copy+1;
          }
          if(!replacements.has(face))replacements.set(face,new Map());
          replacements.get(face).set(id,copy);
        }
      }
    }
    return replacements;
  }
  return {
    patch(poly){
      const ids=poly.map(vertex);
      for(let i=1;i+1<ids.length;i++){
        const a=ids[0],b=ids[i],c=ids[i+1];
        if(a===b||b===c||a===c)continue;
        edge(a,b,nf);edge(b,c,nf);edge(c,a,nf);
        tri(a,b,c);tri(a+1,c+1,b+1);
      }
    },
    finish(){
      if(!nf)return null;
      // Build walls from actual open top edges. Independent clipping passes
      // can otherwise classify the same almost coincident edge twice.
      const replacements=splitPinches();
      for(const [key,face] of boundary){
        let a=Math.floor(key/edgeStride),b=key%edgeStride;
        const moved=replacements.get(Math.abs(face)-1);
        a=moved?.get(a)??a;b=moved?.get(b)??b;
        if(face>0)wall(a,b);
        else wall(b,a);
      }
      return {vertices:vertices.slice(0,nv),faces:faces.slice(0,nf)};
    }
  };
}

export function coverageSkins(grid,bounds){
  const {left,bottom,right,top}=bounds;
  const {resolution:n,heights,diagonals,scores,lakeWeights,forestWeights}=grid,builders=Array.from({length:5},()=>skinBuilder(bounds,grid));
  const point=(x,y)=>{
    const i=y*(n+1)+x;
    return [x,y,heights[i],scores?.[i*3]??1,scores?.[i*3+1]??0,scores?.[i*3+2]??0,lakeWeights?.[i]??-1,forestWeights?.[i]??-1];
  };
  const kindAt=p=>p[3]>p[4]?(p[3]>p[5]?0:2):(p[4]>p[5]?1:2);
  function triangle(a,b,c){
    let poly=[a,b,c];
    if(a[6]>0||b[6]>0||c[6]>0){
      const water=clip(poly,p=>p[6]);
      if(water.length>=3)builders[3].patch(water);
      poly=clip(poly,p=>-p[6]);
      if(poly.length<3)return;
    }
    if(poly.some(p=>p[7]>0)){
      const forest=clip(poly,p=>p[7]);
      if(forest.length>=3)builders[4].patch(forest);
      poly=clip(poly,p=>-p[7]);
      if(poly.length<3)return;
    }
    const first=kindAt(a);
    if(first===kindAt(b)&&first===kindAt(c)){
      builders[first].patch(poly);
      return;
    }
    for(let kind=0;kind<3;kind++){
      let region=poly;
      for(let other=0;other<3&&region.length;other++)if(kind!==other)region=clip(region,p=>p[3+kind]-p[3+other]);
      if(region.length>=3)builders[kind].patch(region);
    }
  }
  for(let y=bottom;y<top;y++)for(let x=left;x<right;x++){
    const a=point(x,y),b=point(x+1,y),c=point(x+1,y+1),d=point(x,y+1);
    if(diagonals[y*n+x]){triangle(a,b,d);triangle(b,c,d);}
    else{triangle(a,b,c);triangle(a,c,d);}
  }
  return builders.map(builder=>builder.finish());
}
