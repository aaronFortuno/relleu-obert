import earcut from 'earcut';

// Sweep a vertical section along an XY path with a Z profile. Width stays in
// the horizontal plane; heights use the same vertical reference as terrain.
export function sweepSection(path,section,{maxSectionPoints=64}={}){
  if(!Number.isSafeInteger(maxSectionPoints)||maxSectionPoints<3||maxSectionPoints>2048)throw Error('Pressupost de secció invàlid.');
  if(!Array.isArray(path)||path.length<2||path.length>5000||!Array.isArray(section)||section.length<3||section.length>maxSectionPoints)
    throw Error('Traçat o secció d’infraestructura invàlids.');
  if(!path.every(p=>p.length===3&&p.every(Number.isFinite))||!section.every(p=>p.length===2&&p.every(Number.isFinite)))throw Error('Coordenades d’infraestructura invàlides.');
  const area=section.reduce((sum,p,i)=>{const q=section[(i+1)%section.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2;
  if(area<=1e-8)throw Error('La secció ha de tenir àrea positiva i orientació antihorària.');
  const directions=[];
  for(let i=1;i<path.length;i++){
    const dx=path[i][0]-path[i-1][0],dy=path[i][1]-path[i-1][1],length=Math.hypot(dx,dy);
    if(length<1e-5)throw Error('El traçat té trams de longitud horitzontal nul·la.');
    directions.push([dx/length,dy/length]);
  }
  const vertices=[],faces=[],n=section.length;
  for(let i=0;i<path.length;i++){
    const before=directions[Math.max(0,i-1)],after=directions[Math.min(i,directions.length-1)],dot=before[0]*after[0]+before[1]*after[1];
    if(dot<-.5)throw Error('Corba massa tancada per generar una infraestructura fiable.');
    const nx=-(before[1]+after[1]),ny=before[0]+after[0],denominator=1+dot;
    for(const [across,z]of section)vertices.push(path[i][0]+nx/denominator*across,path[i][1]+ny/denominator*across,path[i][2]+z);
  }
  for(let i=0;i<path.length-1;i++)for(let k=0;k<n;k++){
    const a=i*n+k,b=i*n+(k+1)%n,c=b+n,d=a+n;
    faces.push(a,b,c,a,c,d);
  }
  const caps=earcut(section.flat());
  for(let i=0;i<caps.length;i+=3){
    let [a,b,c]=caps.slice(i,i+3);const A=section[a],B=section[b],C=section[c];
    if((B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0])<0)[b,c]=[c,b];
    faces.push(c,b,a,(path.length-1)*n+a,(path.length-1)*n+b,(path.length-1)*n+c);
  }
  return {vertices:new Float32Array(vertices),faces:new Uint32Array(faces)};
}

export function bridgeDeck(path,width,thickness){
  if(!Number.isFinite(width)||width<=0||!Number.isFinite(thickness)||thickness<=0)throw Error('Amplada o gruix del tauler invàlids.');
  return sweepSection(path,[[-width/2,-thickness],[width/2,-thickness],[width/2,0],[-width/2,0]]);
}

export function tunnelVoid(path,width,height){
  if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0)throw Error('Amplada o altura del túnel invàlides.');
  return sweepSection(path,[[-width/2,0],[width/2,0],[width/2,height],[-width/2,height]]);
}

// An estimated print section, not a surveyed engineering profile. Short
// vertical walls preserve useful lateral clearance; a sampled parabola gives
// the roof its crown without changing the floor's vertical reference.
export function parabolicTunnelSection(width,height,{segments=16}={}){
  if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0||!Number.isSafeInteger(segments)||segments<8||segments>32||segments%2)
    throw Error('Secció parabòlica del túnel invàlida.');
  const section=[[-width/2,0],[width/2,0]];
  for(let i=0;i<=segments;i++){
    const across=1-2*i/segments;
    section.push([across*width/2,height*(.55+.45*(1-across*across))]);
  }
  return section;
}

export function archedTunnelVoid(path,width,height,options){
  return sweepSection(path,parabolicTunnelSection(width,height,options));
}

export function projectInfrastructurePath(coordinates,projection,verticalReference,exaggeration){
  if(!Array.isArray(coordinates)||coordinates.length<2||!Number.isFinite(verticalReference?.originMeters)||!Number.isFinite(verticalReference?.minimumSurfaceMM)||!Number.isFinite(exaggeration)||exaggeration<=0)
    throw Error('Falta la referència vertical de la infraestructura.');
  return coordinates.map(p=>{
    if(p.length!==3||!p.every(Number.isFinite)||p[2]<-12000||p[2]>9000)throw Error('La infraestructura necessita coordenades XYZ vàlides.');
    const [x,y]=projection.project(p);
    return [x,y,verticalReference.minimumSurfaceMM+(p[2]-verticalReference.originMeters)*projection.scale*exaggeration];
  });
}
