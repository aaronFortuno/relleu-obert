export const RELIEF_PIN_RADIUS_MM=.5;
export const RELIEF_PIN_MARGIN_MM=1.5;
export const RELIEF_PIN_SPACING_MM=2;
export const RELIEF_PIN_DEFAULT_DEPTH_MM=8;
export const MAX_RELIEF_PINS=24;
export const validReliefPinDepth=depth=>Number.isFinite(depth)&&depth>=7&&depth<=9;

const segments=32,minimumFloor=1,mouthAllowance=.75,minimumSupportRatio=.99999;

function bounds({vertices}){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<vertices.length;i+=3)for(let axis=0;axis<3;axis++){
    const v=vertices[i+axis];
    min[axis]=Math.min(min[axis],v);
    max[axis]=Math.max(max[axis],v);
  }
  return {min,max};
}

function near({min,max},{x,y},radius=RELIEF_PIN_MARGIN_MM){
  return x+radius>=min[0]&&x-radius<=max[0]&&y+radius>=min[1]&&y-radius<=max[1];
}

function requireSolid(solid){
  const status=solid.status();
  if(status!=='NoError')throw Error(status);
  const volume=solid.volume();
  if(!Number.isFinite(volume)||volume<0)throw Error('Volum invàlid.');
  return volume;
}

function cylinder(api,{x,y},z0,z1,radius){
  const shape=api.Manifold.cylinder(z1-z0,radius,radius,segments);
  try{return shape.translate([x,y,z0]);}finally{shape.delete();}
}

function supported(layers,api,pin,z0,z1){
  // Union only the small intersections around this pin. Work across all
  // filaments so a material seam does not count as a hole in the substrate.
  const probe=cylinder(api,pin,z0,z1,RELIEF_PIN_MARGIN_MM),sections=[];
  let combined;
  try{
    const requiredVolume=requireSolid(probe)*minimumSupportRatio;
    for(const {solid,box} of layers){
      if(box.min[2]>z1||box.max[2]<z0)continue;
      const section=solid.intersect(probe);
      sections.push(section);
      if(requireSolid(section)>=requiredVolume)return true;
    }
    if(sections.length<2)return false;
    combined=api.Manifold.union(sections);
    return requireSolid(combined)>=requiredVolume;
  }finally{
    combined?.delete();
    for(const section of sections)section.delete();
    probe.delete();
  }
}

function typedPart(part,solid){
  const mesh=solid.getMesh(),vertices=new Float32Array(mesh.numVert*3);
  for(let i=0;i<mesh.numVert;i++)for(let axis=0;axis<3;axis++)
    vertices[i*3+axis]=mesh.vertProperties[i*mesh.numProp+axis];
  return {...part,vertices,faces:new Uint32Array(mesh.triVerts)};
}

// All positions are in print-piece millimetres, after applying the tile plan.
// The support cylinder checks the bore wall and the final millimetre of floor.
// Its top allows a shallow sloping lip while requiring a solid channel below.
export function applyReliefPinHoles(piece,pins,api){
  if(!Array.isArray(pins)||!Array.isArray(piece?.parts)||![piece.width,piece.height].every(value=>Number.isFinite(value)&&value>0))
    throw Error('Punts o peça de perforació invàlids.');
  if(!pins.length)return {piece,accepted:[],rejected:[]};
  if(!api?.Manifold||!api?.Mesh)throw Error('Cal el motor de geometria per perforar la peça.');
  const accepted=[],rejected=[],candidates=[];
  for(const [index,pin]of pins.entries()){
    if(!pin||!Number.isFinite(pin.x)||!Number.isFinite(pin.y)||!validReliefPinDepth(pin.depth)){
      rejected.push({pin,reason:'invalid'});
    }else if(index>=MAX_RELIEF_PINS){
      rejected.push({pin,reason:'limit'});
    }else if(Math.min(pin.x,pin.y,piece.width-pin.x,piece.height-pin.y)<RELIEF_PIN_MARGIN_MM){
      rejected.push({pin,reason:'edge'});
    }else candidates.push(pin);
  }
  if(!candidates.length)return {piece,accepted,rejected};

  const layers=new Map(),owned=[],acceptedPins=[];
  const own=solid=>(owned.push(solid),solid);
  const reject=(pin,reason)=>rejected.push({pin,reason});
  let candidateIndex=0;
  try{
    for(const part of piece.parts){
      if(!part.faces.length)continue;
      const box=bounds(part);
      if(!candidates.some(pin=>near(box,pin)))continue;
      // Import the whole material so a disconnected inward-oriented cavity
      // shell stays with its original enclosing solid.
      const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});
      mesh.merge();
      const solid=own(new api.Manifold(mesh));
      if(requireSolid(solid)>0)layers.set(part,{solid,box});
    }
    const all=[...layers.values()];
    if(!all.length)return {piece,accepted,rejected:[...rejected,...candidates.map(pin=>({pin,reason:'no-surface'}))]};
    const base=Math.min(...all.map(({box})=>box.min[2])),ceiling=Math.max(...all.map(({box})=>box.max[2]))+1;
    for(;candidateIndex<candidates.length;candidateIndex++){
      const pin=candidates[candidateIndex];
      if(accepted.some(other=>Math.hypot(pin.x-other.x,pin.y-other.y)<RELIEF_PIN_SPACING_MM)){
        reject(pin,'overlap');continue;
      }
      const {x,y,depth}=pin,nearby=all.filter(({box})=>near(box,pin));
      const origin=[x,y,ceiling],end=[x,y,base-1];
      let zTop=-Infinity;
      for(const {solid,box}of nearby)if(near(box,pin,0)){
        const hit=solid.rayCast(origin,end)[0];
        if(hit)zTop=Math.max(zTop,hit.position[2]);
      }
      if(!Number.isFinite(zTop)){reject(pin,'no-surface');continue;}
      const zBottom=zTop-depth;
      if(zBottom<base+minimumFloor){reject(pin,'thin-base');continue;}
      if(!supported(nearby,api,pin,zBottom-minimumFloor,zTop-mouthAllowance)){
        reject(pin,'unsupported');continue;
      }
      accepted.push({...pin,zTop,zBottom});
      acceptedPins.push(pin);
    }
    if(!accepted.length)return {piece,accepted,rejected};
    const drills=accepted.map(pin=>own(cylinder(api,pin,pin.zBottom,ceiling,RELIEF_PIN_RADIUS_MM)));
    const cutters=drills.length===1?drills[0]:own(api.Manifold.union(drills));
    requireSolid(cutters);
    const parts=piece.parts.flatMap(part=>{
      const layer=layers.get(part);
      if(!layer||!accepted.some(pin=>near(layer.box,pin,RELIEF_PIN_RADIUS_MM)))return [part];
      const {solid}=layer,drilled=solid.subtract(cutters);
      try{
        const volume=requireSolid(drilled);
        if(!volume)return [];
        if(volume===solid.volume())return [part];
        return [typedPart(part,drilled)];
      }finally{drilled.delete();}
    });
    return {piece:{...piece,parts,triangles:parts.reduce((sum,part)=>sum+part.faces.length/3,0)},accepted,rejected};
  }catch{
    // Treat a native geometry failure as one transaction. No partially
    // perforated material layers escape and the original buffers stay valid.
    return {piece,accepted:[],rejected:[...rejected,...acceptedPins.concat(candidates.slice(candidateIndex)).map(pin=>({pin,reason:'geometry'}))]};
  }finally{for(const solid of owned)solid.delete();}
}
