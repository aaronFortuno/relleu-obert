import {polygonTester} from './polygon-index.js';
import {tilePlan} from './selection.js';
import {TREE_CROWN_METRES} from './tree-scale.js';
import {treeSampler} from './vegetation-budget.js';
import {scatterBrush} from './brush-scatter.js';
import {createGestureCoverage} from './brush-coverage.js';

export const RELIEF_TREE_MIN_DIAMETER_MM=.45;
export const RELIEF_TREE_DIAMETER_METRES=TREE_CROWN_METRES;
export const RELIEF_TREE_THINNING={from:1950,to:2450};
const MAX_RELIEF_TREES=4000;
const SIDES=8;
const ROUND_PROFILE=[[.45,-.55],[.90,.02],[1,.33],[.83,.68],[.44,.91]];
const CONE_PROFILE=[[.45,-.55],[1,.1],[.7,.8],[.38,1.28],[.16,1.49]];
const TEXTURE_PROFILE=[[.7,-.65],[1,-.08],[.92,.32],[.68,.7],[.34,.87]];
const CIRCLE=Array.from({length:SIDES},(_,i)=>[Math.cos(i*2*Math.PI/SIDES),Math.sin(i*2*Math.PI/SIDES)]);

// A visual convention for the retall, independent of vertical exaggeration.
export const reliefCrownTaper=maximumElevation=>Math.max(0,Math.min(1,(maximumElevation-1000)/800));
export const alpineCrownHeightFactor=taper=>1+.5*taper;

// Thin procedural crowns towards the high-mountain tree line. Mapped
// forest remains the mask, including where crowns are too sparse to print.
export function reliefTreeChance(elevation){
  const {from,to}=RELIEF_TREE_THINNING;
  const t=Math.max(0,Math.min(1,(elevation-from)/(to-from)));
  return 1-t*t*(3-2*t);
}

function fieldSample(grid,field,x,y){
  const {width,height,resolution:n,rows=n,diagonals}=grid;
  const gx=x/width*n,gy=y/height*rows,ix=Math.min(n-1,Math.floor(gx)),iy=Math.min(rows-1,Math.floor(gy));
  const u=gx-ix,v=gy-iy,stride=n+1,index=iy*stride+ix;
  const a=field[index],b=field[index+1],c=field[index+stride+1],d=field[index+stride];
  if(diagonals[iy*n+ix]){
    return u+v<=1?a+(b-a)*u+(d-a)*v:c+(d-c)*(1-u)+(b-c)*(1-v);
  }
  return v<=u?a+(b-a)*u+(c-b)*v:a+(c-d)*u+(d-a)*v;
}

function plantingArea(grid){
  const {width,height,resolution:n,lakeWeights,oceanWeights,streamStrips}=grid;
  const strips=grid.plantingStreamStrips??streamStrips;
  const {cols,rows}=tilePlan(width,height);
  const seamDistance=(v,step)=>Math.abs(v-Math.round(v/step)*step);
  const streamTests=new Map();
  function dry(x,y){
    if(lakeWeights&&fieldSample(grid,lakeWeights,x,y)>0)return false;
    if(oceanWeights&&fieldSample(grid,oceanWeights,x,y)>0)return false;
    if(grid.containsMappedWater?.([x,y]))return false;
    const col=Math.min(n-1,Math.floor(x/width*n)),polys=strips?.[col];
    if(!polys?.length)return true;
    if(!streamTests.has(col))streamTests.set(col,polygonTester(polys));
    return !streamTests.get(col)([x,y]);
  }
  return (x,y,radius,contains)=>{
    if(x<radius||y<radius||x>width-radius||y>height-radius||
       seamDistance(x,width/cols)<radius||seamDistance(y,height/rows)<radius)return false;
    const eligible=(px,py)=>(!contains||contains([px,py]))&&dry(px,py);
    if(!eligible(x,y)||!CIRCLE.every(([dx,dy])=>eligible(x+radius*dx,y+radius*dy)))return false;
    // A narrow stream can cross the footprint without hitting any test point.
    const first=Math.floor((x-radius)/width*n),last=Math.min(n-1,Math.floor((x+radius)/width*n));
    for(let col=first;col<=last;col++)for(const polygon of strips?.[col]??[])for(const ring of polygon){
      for(let i=1;i<ring.length;i++){
        const [ax,ay]=ring[i-1],[bx,by]=ring[i],dx=bx-ax,dy=by-ay;
        if(x+radius<Math.min(ax,bx)||x-radius>Math.max(ax,bx)||y+radius<Math.min(ay,by)||y-radius>Math.max(ay,by))continue;
        const length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length)):0;
        if((x-ax-t*dx)**2+(y-ay-t*dy)**2<radius*radius)return false;
      }
    }
    return true;
  };
}

export function reliefForestTrees(grid,containsForest,scale,density=2.5){
  const diameter=RELIEF_TREE_DIAMETER_METRES*scale;
  if(diameter<RELIEF_TREE_MIN_DIAMETER_MM)return [];
  const {width,height,heights,originMeters=0,exaggeration=1}=grid;
  const canPlant=plantingArea(grid);
  const candidates=treeSampler(MAX_RELIEF_TREES);
  const pitch=Math.max(1.7,diameter*3.8,Math.sqrt(width*height/9000))/Math.sqrt(density/2.5);
  let seed=39127;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let row=0;row<Math.ceil(height/pitch);row++)for(let col=0;col<Math.ceil(width/pitch);col++){
    const x=(col+.14+.72*random())*pitch,y=(row+.14+.72*random())*pitch;
    const radius=Math.max(RELIEF_TREE_MIN_DIAMETER_MM/2,diameter*(.46+.08*random()));
    const rotation=random()*2*Math.PI,heightFactor=.8+.4*random(),chance=random();
    if(!canPlant(x,y,radius,containsForest))continue;
    const ground=fieldSample(grid,heights,x,y);
    const elevation=originMeters+(ground-5)/(scale*exaggeration);
    if(chance>=reliefTreeChance(elevation))continue;
    candidates.add({x,y,ground,radius,rotation,heightFactor});
  }
  return candidates.values;
}

export function reliefBrushTrees(grid,candidates,{strokes,brushDensity},scale,texture){
  let automatic=candidates,manual=[],manualDropped=0,coverage,gesture,occupied;
  const canPlant=plantingArea(grid),diameter=RELIEF_TREE_DIAMETER_METRES*scale;
  const cells=new Map();
  const key=(col,row)=>col+':'+row;
  function occupy(tree){
    const index=key(Math.floor(tree.x),Math.floor(tree.y));
    const bin=cells.get(index);
    if(bin)bin.push(tree);else cells.set(index,[tree]);
  }
  for(const [i,stroke] of strokes.entries()){
    const {x,y,radius,mode}=stroke;
    if(![x,y,radius].every(Number.isFinite)||radius<=0||radius>30)continue;
    if(mode==='erase'){
      const outside=tree=>Math.hypot(tree.x-x,tree.y-y)>radius;
      automatic=automatic.filter(outside);manual=manual.filter(outside);
      occupied=false;
    }
    if(mode!=='add')continue;
    if(!occupied){cells.clear();automatic.forEach(occupy);manual.forEach(occupy);occupied=true;}
    const nextGesture=stroke.gesture??i;
    if(gesture!==nextGesture){coverage=createGestureCoverage();gesture=nextGesture;}
    let seed=(Math.round(x*1000)^Math.imul(Math.round(y*1000),73856093)^Math.imul(nextGesture,19349663))>>>0;
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    for(const [px,py] of scatterBrush({x,y,radius,spacing:Math.max(1.5,diameter*1.1),density:stroke.density??brushDensity,seed})){
      if(coverage.covers(px,py))continue;
      const r=texture ? .27+.03*random() : Math.max(RELIEF_TREE_MIN_DIAMETER_MM/2,diameter*(.46+.08*random()));
      let overlaps=false;
      for(let row=Math.floor(py-2);row<=Math.floor(py+2)&&!overlaps;row++){
        for(let col=Math.floor(px-2);col<=Math.floor(px+2)&&!overlaps;col++){
          overlaps=cells.get(key(col,row))?.some(tree=>Math.hypot(tree.x-px,tree.y-py)<tree.radius+r);
        }
      }
      if(overlaps||!canPlant(px,py,r))continue;
      const tree={x:px,y:py,radius:r,ground:fieldSample(grid,grid.heights,px,py),rotation:random()*2*Math.PI,
        heightFactor:texture ? .9+.1*random() : .8+.4*random(),texture};
      manual.push(tree);occupy(tree);
    }
    coverage.addCircle(x,y,radius);
    if(manual.length>MAX_RELIEF_TREES){
      manualDropped+=manual.length-MAX_RELIEF_TREES;
      manual=manual.slice(-MAX_RELIEF_TREES);occupied=false;
    }
  }
  const kept=treeSampler(MAX_RELIEF_TREES-manual.length);
  automatic.forEach(tree=>kept.add(tree));
  return {placements:[...kept.values,...manual],budget:{limit:MAX_RELIEF_TREES,eligibleAutomatic:candidates.length,
    automatic:kept.values.length,manual:manual.length,automaticReduced:automatic.length-kept.values.length,manualDropped}};
}

export function reliefTreePart(grid,{left,bottom,right,top}){
  const {width,height,resolution:n,rows=n,trees=[],crownTaper=0}=grid;
  const x0=left*width/n,y0=bottom*height/rows,x1=right*width/n,y1=top*height/rows;
  const visible=trees.filter(({x,y,radius})=>x-radius>=x0&&y-radius>=y0&&x+radius<=x1&&y+radius<=y1);
  if(!visible.length)return null;
  const blend=(a,b)=>a+(b-a)*crownTaper;
  const profile=ROUND_PROFILE.map(([radius,level],i)=>[blend(radius,CONE_PROFILE[i][0]),blend(level,CONE_PROFILE[i][1])]);
  const crownWidth=Math.max(...profile.map(([radius])=>radius));
  const tipLevel=blend(1.02,1.56);
  const stretch=alpineCrownHeightFactor(crownTaper);
  const ringVertices=profile.length*SIDES,vertexCount=ringVertices+2;
  const vertices=new Float32Array(visible.length*vertexCount*3);
  const faces=new Uint32Array(visible.length*ringVertices*6);
  let v=0,f=0;
  const vertex=(x,y,z)=>{vertices[v++]=x-x0;vertices[v++]=y-y0;vertices[v++]=z;};
  const tri=(a,b,c)=>{faces[f++]=a;faces[f++]=b;faces[f++]=c;};
  for(const {x,y,ground,radius,rotation,heightFactor,texture} of visible){
    const first=v/3;
    const rings=texture?TEXTURE_PROFILE:profile;
    const widest=texture?1:crownWidth,heightStretch=texture?1:stretch;
    for(const [ring,[widthRatio,level]] of rings.entries())for(let i=0;i<SIDES;i++){
      const angle=rotation+i*2*Math.PI/SIDES,r=radius*widthRatio/widest;
      const px=x+r*Math.cos(angle),py=y+r*Math.sin(angle);
      const z=ground+radius*level*heightFactor*(level>0?heightStretch:1);
      vertex(px,py,ring===0?Math.min(z,fieldSample(grid,grid.heights,px,py)-.08):z);
    }
    const foot=v/3;
    vertex(x,y,ground+radius*rings[0][1]*heightFactor);
    const tip=v/3;
    vertex(x,y,ground+radius*(texture?1.02:tipLevel)*heightFactor*heightStretch);
    for(let i=0;i<SIDES;i++){
      const next=(i+1)%SIDES;
      tri(foot,first+next,first+i);
      for(let ring=0;ring<profile.length-1;ring++){
        const a=first+ring*SIDES+i,b=first+ring*SIDES+next;
        tri(a,b,b+SIDES);tri(a,b+SIDES,a+SIDES);
      }
      tri(foot-SIDES+i,foot-SIDES+next,tip);
    }
  }
  return {vertices,faces};
}
