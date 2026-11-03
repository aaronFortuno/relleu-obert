// The vector-clipped terrain duplicates vertices along patch boundaries.
// Average only upward-facing surface normals at coincident points.
export function smoothTerrainNormals(vertices,faces,normals){
  const samples=new Map(),groups=new Array(vertices.length/3);
  function group(i){
    if(groups[i])return groups[i];
    const p=i*3,key=vertices[p]+','+vertices[p+1]+','+vertices[p+2];
    let value=samples.get(key);
    if(!value){value=[0,0,0];samples.set(key,value);}
    return groups[i]=value;
  }
  for(let i=0;i<faces.length;i+=3){
    const a=faces[i]*3,b=faces[i+1]*3,c=faces[i+2]*3;
    const ux=vertices[b]-vertices[a],uy=vertices[b+1]-vertices[a+1],uz=vertices[b+2]-vertices[a+2];
    const vx=vertices[c]-vertices[a],vy=vertices[c+1]-vertices[a+1],vz=vertices[c+2]-vertices[a+2];
    const z=ux*vy-uy*vx;
    if(z<=0)continue;
    const x=uy*vz-uz*vy,y=uz*vx-ux*vz;
    for(let k=0;k<3;k++){
      const sum=group(faces[i+k]);sum[0]+=x;sum[1]+=y;sum[2]+=z;
    }
  }
  for(let i=0;i<groups.length;i++){
    const sum=groups[i];
    if(!sum)continue;
    const length=Math.hypot(...sum);
    normals[i*3]=sum[0]/length;normals[i*3+1]=sum[1]/length;normals[i*3+2]=sum[2]/length;
  }
}
