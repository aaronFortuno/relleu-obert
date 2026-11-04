import {polygonOps} from './polygon-ops.js';

const pc=polygonOps();

// The surface-road pilot has one straight corridor. Each station samples
// the centreline once, then uses that elevation across the whole carriageway.
export function planSurfaceRoad({points,width},{rect,land,ground,proj,resolution},rise){
  const start=points[0],end=points.at(-1);
  const length=Math.hypot(end[0]-start[0],end[1]-start[1]);
  if(length<1e-5)throw Error('El tram del cupó ha de tenir un eix recte amb longitud positiva.');
  const axis=end.map((v,i)=>(v-start[i])/length),normal=[-axis[1],axis[0]];
  const along=p=>(p[0]-start[0])*axis[0]+(p[1]-start[1])*axis[1];
  const across=p=>(p[0]-start[0])*normal[0]+(p[1]-start[1])*normal[1];
  if(points.some(p=>Math.abs(across(p))>1e-4||along(p)<-1e-4||along(p)>length+1e-4))
    throw Error('El pilot només admet un tram recte.');

  const at=(s,t)=>start.map((v,i)=>v+axis[i]*s+normal[i]*t);
  const half=width/2;
  const corridor=(a,b)=>{
    const ring=[at(a,-half),at(b,-half),at(b,half),at(a,half)];
    return [[ring.concat([ring[0]])]];
  };
  const mask=pc.intersection(corridor(0,length),rect);
  if(!mask.length||pc.difference(mask,land).length)
    throw Error('El tram del cupó ha de quedar sobre el terreny i dins de la peça.');
  const distances=mask[0][0].map(along);
  const first=Math.max(0,Math.min(...distances)),last=Math.min(length,Math.max(...distances));
  const step=Math.min(proj.width,proj.height)/resolution;
  const count=Math.ceil((last-first)/step);
  const spacing=(last-first)/count,station=i=>first+i*spacing;
  const elevations=Array.from({length:count+1},(_,i)=>ground(...at(station(i),0))+rise);
  // Adjacent patches must evaluate their shared vertices identically, even
  // when the terrain triangulator rounds XY close to a station boundary.
  const top=(x,y)=>{
    const position=Math.max(0,Math.min(count,(along([x,y])-first)/spacing));
    const index=Math.min(count-1,Math.floor(position));
    return elevations[index]+(position-index)*(elevations[index+1]-elevations[index]);
  };
  const patches=Array.from({length:count},(_,i)=>pc.intersection(corridor(station(i),station(i+1)),mask)).flat();
  return {mask,patches,top};
}
