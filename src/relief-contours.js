const near=(a,b)=>Math.abs(a-b)<1e-8;
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

function skinBuilder(kind,bounds,grid){
  const {left,bottom,right,top}=bounds,{resolution:n,width,height}=grid;
  const stride=right-left+1,integer=new Uint32Array(stride*(top-bottom+1));
  const intersections=new Map();
  let vertices=new Float32Array(1024),faces=new Uint32Array(1024),nv=0,nf=0;
  function vertex([x,y,z]){
    const lattice=Number.isInteger(x)&&Number.isInteger(y);
    const key=lattice?(y-bottom)*stride+x-left:Math.round(x*1e8)+','+Math.round(y*1e8);
    const found=lattice?integer[key]:intersections.get(key);
    if(found)return found-1;
    vertices=grow(vertices,nv+6);
    const vx=(x-left)*width/n,vy=(y-bottom)*height/n,index=nv/3;
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
  const outer=(a,b)=>(a[0]===b[0]&&(a[0]===left||a[0]===right))||
    (a[1]===b[1]&&(a[1]===bottom||a[1]===top));
  return {
    patch(poly,interior){
      const ids=poly.map(vertex);
      for(let i=1;i+1<ids.length;i++){
        tri(ids[0],ids[i],ids[i+1]);tri(ids[0]+1,ids[i+1]+1,ids[i]+1);
      }
      for(let i=0;i<poly.length;i++){
        const j=(i+1)%poly.length,a=poly[i],b=poly[j];
        const shore=near(a[6],0)&&near(b[6],0);
        const materialBoundary=kind<3&&!interior&&[0,1,2].some(other=>other!==kind&&
          near(a[3+kind],a[3+other])&&near(b[3+kind],b[3+other]));
        if(outer(a,b)||shore||materialBoundary)wall(ids[i],ids[j]);
      }
    },
    finish(){return nf?{vertices:vertices.slice(0,nv),faces:faces.slice(0,nf)}:null;}
  };
}

export function coverageSkins(grid,bounds){
  const {left,bottom,right,top}=bounds;
  const {resolution:n,heights,diagonals,scores,lakeWeights}=grid,builders=[0,1,2,3].map(kind=>skinBuilder(kind,bounds,grid));
  const point=(x,y)=>{
    const i=y*(n+1)+x;
    return [x,y,heights[i],scores?.[i*3]??1,scores?.[i*3+1]??0,scores?.[i*3+2]??0,lakeWeights?.[i]??-1];
  };
  const kindAt=p=>p[3]>p[4]?(p[3]>p[5]?0:2):(p[4]>p[5]?1:2);
  function triangle(a,b,c){
    let poly=[a,b,c];
    if(a[6]>0||b[6]>0||c[6]>0){
      const water=clip(poly,p=>p[6]);
      if(water.length>=3)builders[3].patch(water,true);
      poly=clip(poly,p=>-p[6]);
      if(poly.length<3)return;
    }
    const first=kindAt(a);
    if(first===kindAt(b)&&first===kindAt(c)){
      builders[first].patch(poly,true);
      return;
    }
    for(let kind=0;kind<3;kind++){
      let region=poly;
      for(let other=0;other<3&&region.length;other++)if(kind!==other)region=clip(region,p=>p[3+kind]-p[3+other]);
      if(region.length>=3)builders[kind].patch(region,false);
    }
  }
  for(let y=bottom;y<top;y++)for(let x=left;x<right;x++){
    const a=point(x,y),b=point(x+1,y),c=point(x+1,y+1),d=point(x,y+1);
    if(diagonals[y*n+x]){triangle(a,b,d);triangle(b,c,d);}
    else{triangle(a,b,c);triangle(a,c,d);}
  }
  return builders.map(builder=>builder.finish());
}
