// RO-014 fase 1: nucli geomètric del marc imprimible independent.
// API pura sense THREE ni Manifold; cada segment és una malla tancada pròpia
// en coordenades locals d'impressió (origen 0) més un offset global de muntatge
// en coordenades del terreny ([0,width]×[0,height]).

const RANGES={
  width:[1,450],
  height:[1,450],
  clearance:[.2,1],
  rim:[3,15],
  frameHeight:[2,40],
  segmentMax:[50,450],
};

function check(name,value){
  const [min,max]=RANGES[name];
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)
    throw new RangeError(`frameSegments: «${name}» ha de ser un número finit entre ${min} i ${max}; rebut ${value}`);
}

function boxMesh(dx,dy,dz){
  const vertices=new Float32Array([
    0,0,0, dx,0,0, dx,dy,0, 0,dy,0,
    0,0,dz, dx,0,dz, dx,dy,dz, 0,dy,dz,
  ]);
  const faces=new Uint32Array([
    0,2,1, 0,3,2,
    4,5,6, 4,6,7,
    0,1,5, 0,5,4,
    1,2,6, 1,6,5,
    2,3,7, 2,7,6,
    3,0,4, 3,4,7,
  ]);
  return {vertices,faces};
}

function boxSegment(id,name,dx,dy,dz,gx,gy){
  const {vertices,faces}=boxMesh(dx,dy,dz);
  return {id,name,vertices,faces,offset:[gx,gy,0]};
}

function annulusSegment(outerW,outerH,openingW,openingH,rim,h,gx,gy){
  const x1=rim+openingW,y1=rim+openingH;
  const vertices=new Float32Array([
    0,0,0, outerW,0,0, outerW,outerH,0, 0,outerH,0,
    0,0,h, outerW,0,h, outerW,outerH,h, 0,outerH,h,
    rim,rim,0, x1,rim,0, x1,y1,0, rim,y1,0,
    rim,rim,h, x1,rim,h, x1,y1,h, rim,y1,h,
  ]);
  const tri=[];
  for(let i=0;i<4;i++){
    const j=(i+1)%4;
    tri.push(i,j,4+j, i,4+j,4+i);
    tri.push(8+i,12+j,8+j, 8+i,12+i,12+j);
    tri.push(4+i,4+j,12+j, 4+i,12+j,12+i);
    tri.push(i,8+j,j, i,8+i,8+j);
  }
  return {id:'anell-unic',name:'Anell únic',vertices,faces:new Uint32Array(tri),offset:[gx,gy,0]};
}

export function frameSegments(options={}){
  const {width,height,clearance=.4,rim=8,frameHeight=3,segmentMax=180}=options||{};
  check('width',width);check('height',height);check('clearance',clearance);
  check('rim',rim);check('frameHeight',frameHeight);check('segmentMax',segmentMax);

  const openingW=width+2*clearance,openingH=height+2*clearance;
  const outerW=openingW+2*rim,outerH=openingH+2*rim;
  const gx0=-(clearance+rim),gy0=-(clearance+rim);
  const gx1=gx0+rim+openingW,gy1=gy0+rim+openingH;
  const result={
    segments:[],
    opening:[openingW,openingH],
    outer:[outerW,outerH],
    parameters:{width,height,clearance,rim,frameHeight,segmentMax},
  };

  if(outerW<=segmentMax&&outerH<=segmentMax){
    result.segments.push(annulusSegment(outerW,outerH,openingW,openingH,rim,frameHeight,gx0,gy0));
    return result;
  }

  const segments=result.segments;
  for(const [id,name,gx,gy] of [
    ['corner-bottom-left','Cantonada inferior esquerra',gx0,gy0],
    ['corner-bottom-right','Cantonada inferior dreta',gx1,gy0],
    ['corner-top-left','Cantonada superior esquerra',gx0,gy1],
    ['corner-top-right','Cantonada superior dreta',gx1,gy1],
  ]) segments.push(boxSegment(id,name,rim,rim,frameHeight,gx,gy));

  const nx=Math.ceil(openingW/segmentMax),ny=Math.ceil(openingH/segmentMax);
  const lenX=openingW/nx,lenY=openingH/ny;
  for(let i=0;i<nx;i++){
    const gx=gx0+rim+i*lenX;
    segments.push(boxSegment(`bottom-${i}`,`Tram inferior ${i}`,lenX,rim,frameHeight,gx,gy0));
    segments.push(boxSegment(`top-${i}`,`Tram superior ${i}`,lenX,rim,frameHeight,gx,gy1));
  }
  for(let i=0;i<ny;i++){
    const gy=gy0+rim+i*lenY;
    segments.push(boxSegment(`left-${i}`,`Tram esquerre ${i}`,rim,lenY,frameHeight,gx0,gy));
    segments.push(boxSegment(`right-${i}`,`Tram dret ${i}`,rim,lenY,frameHeight,gx1,gy));
  }
  return result;
}
