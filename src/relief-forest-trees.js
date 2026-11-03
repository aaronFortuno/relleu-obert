import {polygonTester} from './polygon-index.js';
import {tilePlan} from './selection.js';
import {TREE_CROWN_METRES} from './tree-scale.js';
import {treeSampler} from './vegetation-budget.js';

export const RELIEF_TREE_MIN_DIAMETER_MM=.45;
export const RELIEF_TREE_DIAMETER_METRES=TREE_CROWN_METRES;
const MAX_RELIEF_TREES=2500;
const SIDES=8;
const PROFILE=[[.45,-.55],[1,.1],[.7,.8],[.38,1.28],[.16,1.49]];
const CIRCLE=Array.from({length:SIDES},(_,i)=>[Math.cos(i*2*Math.PI/SIDES),Math.sin(i*2*Math.PI/SIDES)]);

function fieldSample(grid,field,x,y){
  const {width,height,resolution:n,diagonals}=grid;
  const gx=x/width*n,gy=y/height*n,ix=Math.min(n-1,Math.floor(gx)),iy=Math.min(n-1,Math.floor(gy));
  const u=gx-ix,v=gy-iy,stride=n+1,index=iy*stride+ix;
  const a=field[index],b=field[index+1],c=field[index+stride+1],d=field[index+stride];
  if(diagonals[iy*n+ix]){
    return u+v<=1?a+(b-a)*u+(d-a)*v:c+(d-c)*(1-u)+(b-c)*(1-v);
  }
  return v<=u?a+(b-a)*u+(c-b)*v:a+(c-d)*u+(d-a)*v;
}

export function reliefForestTrees(grid,containsForest,scale){
  const diameter=RELIEF_TREE_DIAMETER_METRES*scale;
  if(diameter<RELIEF_TREE_MIN_DIAMETER_MM)return [];
  const {width,height,resolution:n,lakeWeights,streamStrips,heights}=grid;
  const {cols,rows}=tilePlan(width,height);
  const seamDistance=(v,step)=>Math.abs(v-Math.round(v/step)*step);
  const streamTests=new Map();
  function dry(x,y){
    if(lakeWeights&&fieldSample(grid,lakeWeights,x,y)>0)return false;
    const col=Math.min(n-1,Math.floor(x/width*n)),polys=streamStrips?.[col];
    if(!polys?.length)return true;
    if(!streamTests.has(col))streamTests.set(col,polygonTester(polys));
    return !streamTests.get(col)([x,y]);
  }
  const eligible=(x,y)=>containsForest([x,y])&&dry(x,y);
  const candidates=treeSampler(MAX_RELIEF_TREES);
  const pitch=Math.max(2.4,diameter*5.5,Math.sqrt(width*height/6500));
  let seed=39127;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let row=0;row<Math.ceil(height/pitch);row++)for(let col=0;col<Math.ceil(width/pitch);col++){
    const x=(col+.14+.72*random())*pitch,y=(row+.14+.72*random())*pitch;
    const radius=Math.max(RELIEF_TREE_MIN_DIAMETER_MM/2,diameter*(.46+.08*random()));
    const rotation=random()*2*Math.PI,heightFactor=.8+.4*random();
    if(x<radius||y<radius||x>width-radius||y>height-radius||
       seamDistance(x,width/cols)<radius||seamDistance(y,height/rows)<radius)continue;
    if(!eligible(x,y)||!CIRCLE.every(([dx,dy])=>eligible(x+radius*dx,y+radius*dy)))continue;
    const ground=fieldSample(grid,heights,x,y);
    candidates.add({x,y,ground,radius,rotation,heightFactor});
  }
  return candidates.values;
}

export function reliefTreePart(grid,{left,bottom,right,top}){
  const {width,height,resolution:n,trees=[]}=grid;
  const x0=left*width/n,y0=bottom*height/n,x1=right*width/n,y1=top*height/n;
  const visible=trees.filter(({x,y,radius})=>x-radius>=x0&&y-radius>=y0&&x+radius<=x1&&y+radius<=y1);
  if(!visible.length)return null;
  const ringVertices=PROFILE.length*SIDES,vertexCount=ringVertices+2;
  const vertices=new Float32Array(visible.length*vertexCount*3);
  const faces=new Uint32Array(visible.length*ringVertices*6);
  let v=0,f=0;
  const vertex=(x,y,z)=>{vertices[v++]=x-x0;vertices[v++]=y-y0;vertices[v++]=z;};
  const tri=(a,b,c)=>{faces[f++]=a;faces[f++]=b;faces[f++]=c;};
  for(const {x,y,ground,radius,rotation,heightFactor} of visible){
    const first=v/3;
    for(const [widthRatio,level] of PROFILE)for(let i=0;i<SIDES;i++){
      const angle=rotation+i*2*Math.PI/SIDES,r=radius*widthRatio;
      vertex(x+r*Math.cos(angle),y+r*Math.sin(angle),ground+radius*level*heightFactor);
    }
    const foot=v/3;
    vertex(x,y,ground+radius*PROFILE[0][1]*heightFactor);
    const tip=v/3;
    vertex(x,y,ground+radius*1.56*heightFactor);
    for(let i=0;i<SIDES;i++){
      const next=(i+1)%SIDES;
      tri(foot,first+next,first+i);
      for(let ring=0;ring<PROFILE.length-1;ring++){
        const a=first+ring*SIDES+i,b=first+ring*SIDES+next;
        tri(a,b,b+SIDES);tri(a,b+SIDES,a+SIDES);
      }
      tri(foot-SIDES+i,foot-SIDES+next,tip);
    }
  }
  return {vertices,faces};
}
