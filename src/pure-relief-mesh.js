import {clippedReliefCore,coverageSkins,RELIEF_SKIN_DEPTH,vegetationSkin} from './relief-contours.js';
import {RELIEF_MATERIALS,nativeReliefParts} from './materials.js';
import {tilePlan} from './selection.js';
import {reliefStreamPart} from './relief-streams.js';
import {fractionalBounds,sampleBounds} from './relief-bounds.js';

export const PURE_RELIEF_RESOLUTIONS={24:240,36:384,56:540};
const panoramicSteps={240:1.25,384:.9,540:.65};

export function reliefGridSize(width,height,resolution,panoramic){
  if(!panoramic)return {columns:resolution,rows:resolution};
  const step=panoramicSteps[resolution]??1.25;
  const {cols,rows}=tilePlan(width,height);
  // Align the grid with the print seams while keeping the sampling step in mm.
  const count=(length,pieces)=>pieces*Math.ceil(length/(step*pieces));
  return {columns:count(width,cols),rows:count(height,rows)};
}

// The two possible diagonals interpolate different heights at the centre.
// Choose the one closest to the actual elevation sample.
export function reliefDiagonals(heights,n,midpoint,rows=n){
  const diagonals=new Uint8Array(n*rows),stride=n+1;
  for(let row=0;row<rows;row++)for(let col=0;col<n;col++){
    const i=row*stride+col,centre=midpoint(col,row);
    const rising=Math.abs((heights[i]+heights[i+stride+1])/2-centre);
    const falling=Math.abs((heights[i+1]+heights[i+stride])/2-centre);
    diagonals[row*n+col]=+(falling<rising||falling===rising&&(row+col)%2===1);
  }
  return diagonals;
}

const directions=[[0,-1],[1,0],[0,1],[-1,0]];
const corners=[[0,0],[1,0],[1,1],[0,1]];
const reliefTreeCategory={...RELIEF_MATERIALS[4],id:'trees',name:'Vegetació simulada'};
const wholeGrid=grid=>({left:0,bottom:0,right:grid.resolution,top:grid.rows??grid.resolution});

export function reliefTreesPart(grid,bounds=wholeGrid(grid)){
  const mesh=vegetationSkin(grid,bounds);
  return mesh&&{...reliefTreeCategory,...mesh};
}

function reliefBase(grid,bounds,layered){
  const {resolution:n,rows:ny=n,heights,diagonals,width,height}=grid;
  const {left,bottom,right,top}=bounds,cols=right-left,rows=top-bottom,stride=cols+1;
  const capacity=stride*(rows+1),edges=2*(cols+rows);
  const vertices=new Float32Array((capacity+edges+1)*3);
  const faces=new Uint32Array((2*cols*rows+3*edges)*3);
  const slots=new Uint32Array(capacity),floor=new Uint32Array(capacity);
  let nv=0,nf=0;
  const vertex=(x,y,z)=>{
    const i=nv++*3;
    vertices[i]=(x-left)*width/n;
    vertices[i+1]=(y-bottom)*height/ny;
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

function hasMarineNodes(grid,bounds){
  const {resolution,oceanWeights}=grid;
  if(!oceanWeights)return false;
  const {left,bottom,right,top}=sampleBounds(bounds),stride=resolution+1;
  for(let row=bottom;row<=top;row++)for(let col=left;col<=right;col++){
    if(oceanWeights[row*stride+col]>0)return true;
  }
  return false;
}

export function reliefParts(grid,bounds=wholeGrid(grid)){
  const coastal=hasMarineNodes(grid,bounds);
  const skins=coastal||grid.scores||grid.lakeWeights||grid.forestWeights?coverageSkins(grid,bounds,coastal):[];
  const layered=skins.slice(1,5).some(Boolean);
  const base=coastal?skins[6]:fractionalBounds(bounds)?clippedReliefCore(grid,bounds,layered?RELIEF_SKIN_DEPTH:0):reliefBase(grid,bounds,layered);
  const terrain=base&&(coastal||layered?combine(base,skins[0]):base);
  const parts=[];
  if(terrain)parts.push({...RELIEF_MATERIALS[0],...terrain});
  for(let kind=1;kind<3;kind++)if(skins[kind])parts.push({...RELIEF_MATERIALS[kind],...skins[kind]});
  const stream=reliefStreamPart(grid,bounds,grid.streamStrips,undefined,[grid.boundaryStrips,grid.routeStrips]),lake=skins[3];
  if(lake||stream)parts.push({...RELIEF_MATERIALS[3],...(lake?combine(lake,stream):stream)});
  if(skins[4])parts.push({...RELIEF_MATERIALS[4],...skins[4]});
  const trees=reliefTreesPart(grid,bounds);
  if(trees)parts.push(trees);
  if(skins[5])parts.push({...RELIEF_MATERIALS[5],...skins[5]});
  const trails=trailMesh(grid,bounds);
  if(trails)parts.push({...RELIEF_MATERIALS[6],...trails});
  const boundaries=boundaryMesh(grid,bounds);
  if(boundaries)parts.push({...RELIEF_MATERIALS[7],...boundaries});
  const route=routeMesh(grid,bounds);
  if(route)parts.push({...RELIEF_MATERIALS[8],...route});
  return parts;
}

function tileBounds(grid,tile){
  const {width,height,resolution,rows=resolution}=grid;
  const snap=value=>Math.abs(value-Math.round(value))<1e-9?Math.round(value):value;
  const x=mm=>snap(mm/width*resolution),y=mm=>snap(mm/height*rows);
  return {left:x(tile.x0),bottom:y(tile.y0),right:x(tile.x1),top:y(tile.y1)};
}

function placeInAssembly(part,tile){
  for(let i=0;i<part.vertices.length;i+=3){
    part.vertices[i]+=tile.x0;
    part.vertices[i+1]+=tile.y0;
  }
  return part;
}

function joinParts(parts){
  if(parts.length<2)return parts[0];
  const vertices=new Float32Array(parts.reduce((sum,part)=>sum+part.vertices.length,0));
  const faces=new Uint32Array(parts.reduce((sum,part)=>sum+part.faces.length,0));
  let vertexOffset=0,faceOffset=0;
  for(const part of parts){
    vertices.set(part.vertices,vertexOffset);
    for(const index of part.faces)faces[faceOffset++]=index+vertexOffset/3;
    vertexOffset+=part.vertices.length;
  }
  return {vertices,faces};
}

export function reliefInlandWater(grid,lakes,panoramic){
  if(!grid.streamStrips?.length)return lakes;
  const stream=assembleReliefLayer(grid,panoramic,(grid,bounds)=>reliefStreamPart(grid,bounds,grid.streamStrips,undefined,[grid.boundaryStrips,grid.routeStrips]));
  if(!stream)return lakes;
  return {...RELIEF_MATERIALS[3],...(lakes?combine(lakes,stream):stream)};
}

function assembleReliefLayer(grid,panoramic,partAt){
  if(!panoramic)return partAt(grid,wholeGrid(grid));
  const parts=[];
  for(const tile of tilePlan(grid.width,grid.height).tiles){
    const part=partAt(grid,tileBounds(grid,tile));
    if(part)parts.push(placeInAssembly(part,tile));
  }
  return joinParts(parts);
}

function trailMesh(grid,bounds){
  if(!grid.trailStrips?.length)return null;
  return reliefStreamPart(grid,bounds,grid.trailStrips,.20,[grid.streamStrips,grid.boundaryStrips,grid.routeStrips]);
}

export function assembleReliefTrails(grid,panoramic){
  if(!grid.trailStrips?.length)return null;
  const mesh=assembleReliefLayer(grid,panoramic,trailMesh);
  return mesh?{...RELIEF_MATERIALS[6],...mesh}:null;
}

function boundaryMesh(grid,bounds){
  return grid.boundaryStrips?.length?reliefStreamPart(grid,bounds,grid.boundaryStrips,.28):null;
}

export function assembleReliefBoundaries(grid,panoramic){
  if(!grid.boundaryStrips?.length)return null;
  const mesh=assembleReliefLayer(grid,panoramic,boundaryMesh);
  return mesh?{...RELIEF_MATERIALS[7],...mesh}:null;
}

function routeMesh(grid,bounds){
  return grid.routeStrips?.length?reliefStreamPart(grid,bounds,grid.routeStrips,.36,[grid.boundaryStrips]):null;
}

export function assembleUserRoute(grid,panoramic){
  if(!grid.routeStrips?.length)return null;
  const mesh=assembleReliefLayer(grid,panoramic,routeMesh);
  return mesh?{...RELIEF_MATERIALS[8],...mesh}:null;
}

export function previewReliefPieces(grid,emit){
  const plan=tilePlan(grid.width,grid.height),total=plan.tiles.length;
  if(total<2||grid.resolution%plan.cols||(grid.rows??grid.resolution)%plan.rows)return false;
  const previewGrid={...grid,scores:null,lakeWeights:null,forestWeights:null,streamStrips:null,trailStrips:null,boundaryStrips:null,routeStrips:null,vegetationTexture:null};
  for(const [i,tile] of plan.tiles.entries()){
    const parts=reliefParts(previewGrid,tileBounds(grid,tile));
    emit(parts.map(part=>placeInAssembly(part,tile)),{index:i+1,total});
  }
  return true;
}

export function assemblePanoramicRelief(grid,progress){
  const plan=tilePlan(grid.width,grid.height),partsByMaterial=new Map();
  for(const [i,tile] of plan.tiles.entries()){
    for(const part of reliefParts(grid,tileBounds(grid,tile))){
      if(!partsByMaterial.has(part.id))partsByMaterial.set(part.id,[]);
      partsByMaterial.get(part.id).push(placeInAssembly(part,tile));
    }
    progress(i+1,plan.tiles.length);
  }
  return [...RELIEF_MATERIALS,reliefTreeCategory].filter(({id})=>partsByMaterial.has(id))
    .map(material=>({...material,...joinParts(partsByMaterial.get(material.id))}));
}

// All pieces reuse the same sampled heights and diagonals. For a cut between
// samples, clip the original triangles and cap their exact intersection.
export function splitPureRelief(model,maxOrPlan,progress=()=>{}){
  const grid=model.reliefGrid,plan=maxOrPlan?.tiles?maxOrPlan:tilePlan(model.width,model.height,maxOrPlan);
  return plan.tiles.map((tile,i)=>{
    progress('Tancant la peça '+(i+1)+'/'+plan.tiles.length+'…');
    const parts=nativeReliefParts(reliefParts(grid,tileBounds(grid,tile)));
    const provenance={...model.provenance,tile,
      assembly:{width:model.width,height:model.height,columns:plan.cols,rows:plan.rows},
      name:(model.provenance.name||'Maqueta')+' · '+tile.name};
    return {parts,width:tile.width,height:tile.height,triangles:parts.reduce((sum,p)=>sum+p.faces.length/3,0),tile,provenance};
  });
}
