import {coverageSkins,RELIEF_SKIN_DEPTH} from './relief-contours.js';
import {RELIEF_MATERIALS} from './materials.js';
import {tilePlan} from './selection.js';

export const PURE_RELIEF_RESOLUTIONS={24:240,36:384,56:540};

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

const directions=[[0,-1],[1,0],[0,1],[-1,0]];
const corners=[[0,0],[1,0],[1,1],[0,1]];

function reliefBase(grid,bounds,layered){
  const {resolution:n,heights,diagonals,width,height}=grid;
  const {left,bottom,right,top}=bounds,cols=right-left,rows=top-bottom,stride=cols+1;
  const capacity=stride*(rows+1),edges=2*(cols+rows);
  const vertices=new Float32Array((capacity+edges+1)*3);
  const faces=new Uint32Array((2*cols*rows+3*edges)*3);
  const slots=new Uint32Array(capacity),floor=new Uint32Array(capacity);
  let nv=0,nf=0;
  const vertex=(x,y,z)=>{
    const i=nv++*3;
    vertices[i]=(x-left)*width/n;
    vertices[i+1]=(y-bottom)*height/n;
    vertices[i+2]=z;
    return i/3;
  };
  const triangle=(a,b,c)=>{faces[nf++]=a;faces[nf++]=b;faces[nf++]=c;};
  const centre=vertex((left+right)/2,(bottom+top)/2,0);
  function topIndex(x,y){
    const slot=(y-bottom)*stride+x-left;
    if(!slots[slot])slots[slot]=vertex(x,y,heights[y*(n+1)+x]-(layered?RELIEF_SKIN_DEPTH:0))+1;
    return slots[slot]-1;
  }
  function floorIndex(x,y){
    const slot=(y-bottom)*stride+x-left;
    if(!floor[slot])floor[slot]=vertex(x,y,0)+1;
    return floor[slot]-1;
  }
  for(let y=bottom;y<top;y++)for(let x=left;x<right;x++){
    const ids=corners.map(([dx,dy])=>topIndex(x+dx,y+dy));
    const [a,b,c,d]=ids;
    if(diagonals[y*n+x]){triangle(a,b,d);triangle(b,c,d);}
    else{triangle(a,b,c);triangle(a,c,d);}
    if(x>left&&x+1<right&&y>bottom&&y+1<top)continue;
    for(let side=0;side<4;side++){
      const [dx,dy]=directions[side],nx=x+dx,ny=y+dy;
      if(nx>=left&&nx<right&&ny>=bottom&&ny<top)continue;
      const next=(side+1)%4,p=ids[side],q=ids[next];
      const pb=floorIndex(x+corners[side][0],y+corners[side][1]);
      const qb=floorIndex(x+corners[next][0],y+corners[next][1]);
      triangle(p,pb,qb);triangle(p,qb,q);triangle(centre,qb,pb);
    }
  }
  return {vertices,faces};
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
  const skins=grid.scores||grid.lakeWeights?coverageSkins(grid,bounds):[],layered=skins.slice(1).some(Boolean);
  const base=reliefBase(grid,bounds,layered);
  const terrain=layered?combine(base,skins[0]):base;
  const parts=[{...RELIEF_MATERIALS[0],...terrain}];
  if(layered)for(let kind=1;kind<skins.length;kind++)if(skins[kind])parts.push({...RELIEF_MATERIALS[kind],...skins[kind]});
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
