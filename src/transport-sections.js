// Exact breakpoints of a horizontal cross section. Fractions parameterize
// P(t) = centre + normal * widthMM * t; a miter normal need not have unit length.
const xy=p=>(Array.isArray(p)||ArrayBuffer.isView(p))&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]);
const xyz=p=>xy(p)&&p.length===3&&Number.isFinite(p[2]);
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const roundoff=32*Number.EPSILON;

export function crossSectionFractions({centre,normal,widthMM}={},options={}){
  if(!xy(centre)||!xy(normal)||!Number.isFinite(widthMM)||widthMM<=0)
    throw Error('Secció transversal invàlida.');
  const direction=[normal[0]*widthMM,normal[1]*widthMM],length2=dot(direction,direction);
  if(!direction.every(Number.isFinite)||!Number.isFinite(length2)||length2<=0)throw Error('Normal de secció invàlida.');
  const values=[-.5,0,.5];
  const add=t=>{
    if(!Number.isFinite(t)||t<-.5-roundoff||t>.5+roundoff)return;
    values.push(Math.max(-.5,Math.min(.5,t)));
  };
  // Coalesce only machine-roundoff coincidences, never a geometric tolerance
  // or a quantization of the source coordinates.
  const sorted=()=>values.slice().sort((a,b)=>a-b).filter((v,i,a)=>!i||v-a[i-1]>roundoff);
  const {fieldWidth,fieldHeight,resolution,points=[],faces=[]}=options;
  if(resolution!==undefined){
    if(!Number.isInteger(resolution)||resolution<1||resolution>100||!Number.isFinite(fieldWidth)||fieldWidth<=0||!Number.isFinite(fieldHeight)||fieldHeight<=0)
      throw Error('Graella del camp de relleu invàlida.');
    const dx=fieldWidth/resolution,dy=fieldHeight/resolution;
    for(let i=0;i<=resolution;i++){
      if(direction[0]!==0)add((i*dx-centre[0])/direction[0]);
      if(direction[1]!==0)add((i*dy-centre[1])/direction[1]);
    }
    const cuts=sorted(),denominator=direction[0]/dx-direction[1]/dy;
    if(denominator!==0)for(let i=1;i<cuts.length;i++){
      const before=cuts[i-1],after=cuts[i],middle=(before+after)/2,x=centre[0]+direction[0]*middle,y=centre[1]+direction[1]*middle;
      if(x<0||x>fieldWidth||y<0||y>fieldHeight)continue;
      const ix=Math.min(resolution-1,Math.floor(x/dx)),iy=Math.min(resolution-1,Math.floor(y/dy));
      // u=v is the actual diagonal used by createTerrainField.sample.
      const t=(ix-iy-centre[0]/dx+centre[1]/dy)/denominator;
      if(t>=before-roundoff&&t<=after+roundoff)add(t);
    }
  }
  if(!Array.isArray(points)||!points.every(xy)||!(Array.isArray(faces)||ArrayBuffer.isView(faces))||faces.length%3||Array.from(faces).some(i=>!Number.isInteger(i)||i<0||i>=points.length))
    throw Error('Triangles de superfície invalids.');
  const seen=new Set();
  for(let i=0;i<faces.length;i+=3)for(let k=0;k<3;k++){
    const from=faces[i+k],to=faces[i+(k+1)%3],key=from<to?`${from},${to}`:`${to},${from}`;
    if(seen.has(key))continue;seen.add(key);
    const a=points[from],b=points[to],edge=[b[0]-a[0],b[1]-a[1]],relative=[a[0]-centre[0],a[1]-centre[1]],det=cross(direction,edge);
    if(det!==0){
      const u=cross(relative,direction)/det;
      if(u>=-roundoff&&u<=1+roundoff)add(cross(relative,edge)/det);
    }else if(cross(relative,direction)===0){
      add(dot(relative,direction)/length2);add(dot([b[0]-centre[0],b[1]-centre[1]],direction)/length2);
    }
  }
  return sorted();
}

// A single closed indexed solid. Every row is LEFT -> RIGHT. Across columns
// share their edges; no internal longitudinal walls are introduced.
export function stripSectionSolid(sections,thickness){
  if(!Array.isArray(sections)||sections.length<2||!Number.isFinite(thickness)||thickness<=0)
    throw Error('Seccions o gruix de paviment invàlids.');
  const rows=sections.map(section=>section?.across??[section?.left,section?.right]),columns=rows[0]?.length;
  if(!Number.isInteger(columns)||columns<2||rows.some(row=>!Array.isArray(row)||row.length!==columns||!row.every(xyz)))
    throw Error('Cal el mateix nombre de columnes XYZ finites a totes les seccions.');
  const stride=columns*2,vertices=new Float32Array(sections.length*stride*3),faces=[];
  const index=(i,j,bottom=false)=>i*stride+j+(bottom?columns:0);
  const vertex=i=>vertices.subarray(i*3,i*3+3);
  const equalXY=(a,b)=>a[0]===b[0]&&a[1]===b[1];
  for(let i=0;i<rows.length;i++)for(let j=0;j<columns;j++){
    const p=rows[i][j],top=index(i,j),bottom=index(i,j,true);
    vertices.set(p,top*3);vertices.set([p[0],p[1],p[2]-thickness],bottom*3);
    if(!vertex(top).every(Number.isFinite)||!vertex(bottom).every(Number.isFinite))throw Error('Coordenades fora del rang Float32.');
    if(vertex(top)[2]<=vertex(bottom)[2])throw Error('Gruix de paviment col·lapsat en Float32.');
    if(j&&equalXY(vertex(top),vertex(index(i,j-1))))throw Error('Columnes transversals col·lapsades en Float32.');
  }
  const area=(a,b,c)=>{
    const A=vertex(a),B=vertex(b),C=vertex(c);
    return (B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]);
  };
  let orientation=0;
  function topTriangle(a,b,c){
    const determinant=area(a,b,c);
    if(determinant===0)throw Error('Triangle de paviment col·lapsat en Float32.');
    const sign=Math.sign(determinant);if(!orientation)orientation=sign;
    if(sign!==orientation)throw Error('Les seccions de paviment es pleguen o es creuen.');
    faces.push(a,b,c);
  }
  for(let i=0;i<rows.length-1;i++)for(let j=0;j<columns-1;j++){
    const left=index(i,j),right=index(i,j+1),nextLeft=index(i+1,j),nextRight=index(i+1,j+1);
    // The shared diagonal is RIGHT_i -> LEFT_next, also used by the bore floor.
    topTriangle(left,right,nextLeft);topTriangle(right,nextRight,nextLeft);
    const a=index(i,j,true),b=index(i,j+1,true),c=index(i+1,j,true),d=index(i+1,j+1,true);
    faces.push(a,c,b,b,c,d);
  }
  for(let i=0;i<rows.length-1;i++){
    const left=index(i,0),nextLeft=index(i+1,0),bottomLeft=index(i,0,true),nextBottomLeft=index(i+1,0,true);
    faces.push(left,nextLeft,nextBottomLeft,left,nextBottomLeft,bottomLeft);
    const right=index(i,columns-1),nextRight=index(i+1,columns-1),bottomRight=index(i,columns-1,true),nextBottomRight=index(i+1,columns-1,true);
    faces.push(right,bottomRight,nextBottomRight,right,nextBottomRight,nextRight);
  }
  for(let j=0;j<columns-1;j++){
    const a=index(0,j),b=index(0,j+1),c=index(0,j,true),d=index(0,j+1,true);
    faces.push(a,c,d,a,d,b);
    const last=rows.length-1,e=index(last,j),f=index(last,j+1),g=index(last,j,true),h=index(last,j+1,true);
    faces.push(e,f,h,e,h,g);
  }
  if(orientation<0)for(let i=0;i<faces.length;i+=3)[faces[i+1],faces[i+2]]=[faces[i+2],faces[i+1]];
  return {vertices,faces:new Uint32Array(faces)};
}
