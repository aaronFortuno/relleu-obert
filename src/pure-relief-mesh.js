import {RELIEF_MATERIALS} from './materials.js';
import {tilePlan} from './selection.js';

export const PURE_RELIEF_RESOLUTIONS={24:192,36:288,56:432};

// The two possible diagonals interpolate different heights at the centre.
// Choose the one closest to the actual elevation sample.
export function reliefDiagonals(heights,n,midpoint){
  const diagonals=new Uint8Array(n*n),stride=n+1;
  for(let row=0;row<n;row++)for(let col=0;col<n;col++){
    const i=row*stride+col,centre=midpoint(col,row);
    const rising=Math.abs((heights[i]+heights[i+stride+1])/2-centre);
    const falling=Math.abs((heights[i+1]+heights[i+stride])/2-centre);
    diagonals[row*n+col]=+(falling<rising||falling===rising&&(row+col)%2===1);
  }
  return diagonals;
}

const skinDepth=.65;
const directions=[[0,-1],[1,0],[0,1],[-1,0]];
const corners=[[0,0],[1,0],[1,1],[0,1]];

function reliefSolid(grid,bounds,kind,layered){
  const {resolution:n,heights,diagonals,labels,width,height}=grid;
  const {left,bottom,right,top}=bounds,cols=right-left,rows=top-bottom,stride=cols+1;
  const base=kind===null;
  const selected=(x,y)=>x>=left&&x<right&&y>=bottom&&y<top&&(base||labels[y*n+x]===kind);
  let cells=0,edges=0;
  for(let y=bottom;y<top;y++)for(let x=left;x<right;x++)if(selected(x,y)){
    cells++;
    for(const [dx,dy] of directions)if(!selected(x+dx,y+dy))edges++;
  }
  if(!cells)return null;
  const capacity=stride*(rows+1),slots=new Uint32Array(capacity*(base?1:2));
  const vertices=new Float32Array((base?capacity+edges+1:Math.min(4*cells,capacity*2)*2)*3);
  const faces=new Uint32Array((cells*(base?2:4)+edges*(base?3:2))*3);
  let nv=0,nf=0;
  const vertex=(x,y,z)=>{
    const i=nv++*3;
    vertices[i]=(x-left)*width/n;
    vertices[i+1]=(y-bottom)*height/n;
    vertices[i+2]=z;
    return i/3;
  };
  const triangle=(a,b,c)=>{faces[nf++]=a;faces[nf++]=b;faces[nf++]=c;};
  const floor=base?new Uint32Array(capacity):null;
  const centre=base?vertex((left+right)/2,(bottom+top)/2,0):null;
  function topIndex(x,y,corner){
    let slot=(y-bottom)*stride+x-left;
    // Opposite cells can touch at a point. Keep their vertical edges separate.
    if(!base&&corner>=2){
      const a=selected(x-1,y-1),b=selected(x,y-1),c=selected(x,y),d=selected(x-1,y);
      if(a&&c&&!b&&!d||b&&d&&!a&&!c)slot+=capacity;
    }
    if(!slots[slot]){
      const z=heights[y*(n+1)+x]-(base&&layered?skinDepth:0);
      slots[slot]=vertex(x,y,z)+1;
      if(!base)vertex(x,y,z-skinDepth);
    }
    return slots[slot]-1;
  }
  function floorIndex(x,y){
    const slot=(y-bottom)*stride+x-left;
    if(!floor[slot])floor[slot]=vertex(x,y,0)+1;
    return floor[slot]-1;
  }
  for(let y=bottom;y<top;y++)for(let x=left;x<right;x++)if(selected(x,y)){
    const ids=corners.map(([dx,dy],corner)=>topIndex(x+dx,y+dy,corner));
    const [a,b,c,d]=ids;
    if(diagonals[y*n+x]){
      triangle(a,b,d);triangle(b,c,d);
      if(!base){triangle(d+1,b+1,a+1);triangle(d+1,c+1,b+1);}
    }else{
      triangle(a,b,c);triangle(a,c,d);
      if(!base){triangle(c+1,b+1,a+1);triangle(d+1,c+1,a+1);}
    }
    for(let side=0;side<4;side++){
      const [dx,dy]=directions[side];
      if(selected(x+dx,y+dy))continue;
      const next=(side+1)%4,p=ids[side],q=ids[next];
      const pb=base?floorIndex(x+corners[side][0],y+corners[side][1]):p+1;
      const qb=base?floorIndex(x+corners[next][0],y+corners[next][1]):q+1;
      triangle(p,pb,qb);triangle(p,qb,q);
      if(base)triangle(centre,qb,pb);
    }
  }
  return {vertices:vertices.slice(0,nv*3),faces};
}

function combine(a,b){
  if(!b)return a;
  const vertices=new Float32Array(a.vertices.length+b.vertices.length),faces=new Uint32Array(a.faces.length+b.faces.length);
  vertices.set(a.vertices);vertices.set(b.vertices,a.vertices.length);
  faces.set(a.faces);
  const offset=a.vertices.length/3;
  for(let i=0;i<b.faces.length;i++)faces[a.faces.length+i]=b.faces[i]+offset;
  return {vertices,faces};
}

export function reliefParts(grid,bounds={left:0,bottom:0,right:grid.resolution,top:grid.resolution}){
  const {labels,resolution:n}=grid,{left,bottom,right,top}=bounds;
  let layered=false;
  for(let y=bottom;y<top&&!layered;y++)for(let x=left;x<right;x++)if(labels[y*n+x]){
    layered=true;break;
  }
  const base=reliefSolid(grid,bounds,null,layered);
  const terrain=layered?combine(base,reliefSolid(grid,bounds,0,true)):base;
  const parts=[{...RELIEF_MATERIALS[0],...terrain}];
  if(layered)for(let kind=1;kind<=2;kind++){
    const solid=reliefSolid(grid,bounds,kind,true);
    if(solid)parts.push({...RELIEF_MATERIALS[kind],...solid});
  }
  return parts;
}

// All pieces reuse the same sampled heights and diagonals. Rebuild their
// perimeter walls directly on grid lines instead of cutting large meshes.
export function splitPureRelief(model,max,progress){
  const grid=model.reliefGrid,n=grid.resolution,plan=tilePlan(model.width,model.height,max);
  if(n%plan.cols||n%plan.rows)return null;
  return plan.tiles.map((tile,i)=>{
    progress('Tancant la peça '+(i+1)+'/'+plan.tiles.length+'…');
    const cols=n/plan.cols,rows=n/plan.rows,left=(tile.col-1)*cols,bottom=(plan.rows-tile.row)*rows;
    const parts=reliefParts(grid,{left,bottom,right:left+cols,top:bottom+rows});
    const provenance={...model.provenance,tile,
      assembly:{width:model.width,height:model.height,columns:plan.cols,rows:plan.rows},
      name:(model.provenance.name||'Maqueta')+' · '+tile.name};
    return {parts,width:tile.width,height:tile.height,triangles:parts.reduce((sum,p)=>sum+p.faces.length/3,0),tile,provenance};
  });
}
