import {auditPart} from './solid-audit.js';
import {selectSurfaceComponents,removeCollapsedSurfaceComponents} from './surface-components.js';
import {carveTunnelMaterials} from './tunnel-pavement.js';

const finiteIn=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const clearanceMM=.8;
const blendMetres=8;

export function resolvableLandform({model},sampleMetres){
  return sampleMetres<=model.landform.minimumWidth/2;
}

export function validLandformProfile(profile){
  return typeof profile?.data==='string'&&typeof profile.verticalDatum==='string'&&profile.verticalDatum.length>0&&
    profile.verticalDatum.length<=80&&finiteIn(profile.minimumWidth,.5,200);
}

export function decodeLandform({grid,void:mesh}){
  const {side,step,elevations}=grid??{};
  if(!Number.isInteger(side)||side<3||side>129||!finiteIn(step,.25,10)||step*(side-1)<2*blendMetres||
    !Array.isArray(elevations)||elevations.length!==side*side||!elevations.every(z=>finiteIn(z,-500,9000))||
    !Array.isArray(mesh?.vertices)||mesh.vertices.length<12||mesh.vertices.length>3072||mesh.vertices.length%3||
    !mesh.vertices.every((v,i)=>i%3===1?finiteIn(v,-500,9000):Math.abs(v)<=step*(side-1)/2+blendMetres)||
    !Array.isArray(mesh.faces)||mesh.faces.length<12||mesh.faces.length>6144||mesh.faces.length%3||
    !mesh.faces.every(i=>Number.isInteger(i)&&i>=0&&i<mesh.vertices.length/3))throw Error('Dades de relleu singular invàlides.');
  const cutter={vertices:Float32Array.from(mesh.vertices),faces:Uint32Array.from(mesh.faces)};
  if(auditPart(cutter).errors.length)throw Error('L’obertura del relleu singular no és un sòlid vàlid.');
  return {grid:{side,step,elevations:Float32Array.from(elevations)},cutter};
}

function bounds(vertices){
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<vertices.length;i+=3)for(let axis=0;axis<3;axis++){
    const v=vertices[i+axis];lo[axis]=Math.min(lo[axis],v);hi[axis]=Math.max(hi[axis],v);
  }
  return {lo,hi};
}

export function prepareCatalogueLandforms(models,proj){
  return (models??[]).filter(m=>m.kind==='landform'&&m.landform.minimumWidth*proj.scale>=clearanceMM).flatMap(model=>{
    const [lon,lat]=model.anchor,k=111320*Math.cos(lat*Math.PI/180),{grid,cutter}=model;
    const toMap=(x,south)=>proj.project([lon+x/k,lat-south/111320]);
    const world=Float32Array.from(cutter.vertices);
    for(let i=0;i<world.length;i+=3){
      const [x,y]=toMap(world[i],world[i+2]);
      world[i]=x;world[i+2]=world[i+1];world[i+1]=y;
    }
    const extent=bounds(world),{lo,hi}=extent;
    if(hi[0]<=0||hi[1]<=0||lo[0]>=proj.width||lo[1]>=proj.height)return [];
    const half=(grid.side-1)*grid.step/2;
    const corners=[[-half,-half],[-half,half],[half,-half],[half,half]].map(([x,y])=>toMap(x,y));
    const surfaceExtent={lo:[0,1].map(axis=>Math.min(...corners.map(p=>p[axis]))),hi:[0,1].map(axis=>Math.max(...corners.map(p=>p[axis])))};
    return [{model,world,extent,surfaceExtent,grid,lon,lat,k}];
  });
}

export function catalogueTerrain(sample,patches){
  if(!patches.length)return sample;
  return (lon,lat)=>{
    let z=sample(lon,lat);
    for(const patch of patches){
      const {side,step,elevations}=patch.grid,half=(side-1)*step/2;
      const x=(lon-patch.lon)*patch.k,south=(patch.lat-lat)*111320;
      const edge=half-Math.max(Math.abs(x),Math.abs(south));
      if(edge<=0)continue;
      const gx=(x+half)/step,gy=(south+half)/step,col=Math.min(side-2,Math.floor(gx)),row=Math.min(side-2,Math.floor(gy));
      const u=gx-col,v=gy-row,i=row*side+col;
      const north=elevations[i]*(1-u)+elevations[i+1]*u,southZ=elevations[i+side]*(1-u)+elevations[i+side+1]*u;
      const t=Math.min(1,edge/blendMetres),weight=t*t*(3-2*t);
      z+=(north*(1-v)+southZ*v-z)*weight;
    }
    return z;
  };
}

// The cutter is kept in absolute metres until the active base and vertical scale are known.
export function carveCatalogueLandforms(parts,patches,api,datum,zScale){
  const applied=[],skipped=[];
  for(const {model,world,extent:{lo}} of patches){
    const skip=reason=>skipped.push({name:model.name,id:model.id,reason});
    const at=z=>datum.minimumSurfaceMM+(z-datum.originMeters)*zScale;
    const floor=at(lo[2]);
    if(floor<datum.minimumSurfaceMM||!api){skip('below base or geometry engine unavailable');continue;}
    const vertices=Float32Array.from(world);
    for(let i=2;i<vertices.length;i+=3)vertices[i]=at(vertices[i]);
    try{
      const cutter={vertices,faces:model.cutter.faces};
      const {selected,restore}=selectSurfaceComponents(parts,[cutter],{categories:parts.map(p=>p.id)});
      if(!selected.length){skip('outside terrain');continue;}
      const result=carveTunnelMaterials(selected,[cutter],[],api);
      const removedMM3=Object.values(result.removed).reduce((sum,v)=>sum+v,0);
      if(removedMM3<=1e-5){skip('no intersecting volume');continue;}
      const {parts:carved}=removeCollapsedSurfaceComponents(result.parts);
      if(carved.some(part=>auditPart(part).errors.length)){skip('cavity mesh audit failed');continue;}
      parts=restore(carved);
      applied.push({id:model.id,name:model.name,revision:model.revision,attribution:model.attribution,license:model.license,
        spatialDataLicense:model.spatialDataLicense,sources:model.sources,verticalDatum:model.landform.verticalDatum,removedMM3});
    }catch(error){skip(error.message);}
  }
  return {parts,applied,skipped};
}

export function clearOfLandforms(patches,x,y,padding){
  return !patches?.some(({extent:{lo,hi}})=>x>=lo[0]-padding&&x<=hi[0]+padding&&y>=lo[1]-padding&&y<=hi[1]+padding);
}

export function landformWarnings({applied,skipped}){
  return [...applied.map(({name,revision})=>`Model singular del catàleg «${name}» (${revision}).`),
    ...skipped.map(({name})=>`No s’ha pogut obrir la cavitat de «${name}» en aquest retall. Es conserva el relleu.`)];
}
