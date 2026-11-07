import {defaultReliefAssignments,reliefMaterialId,RELIEF_MATERIALS,RELIEF_PALETTES} from '../src/materials.js';

export function catalogueThumbnail(model,plan,materialCount=6){
  const width=720,height=450;
  const pixels=new Uint8ClampedArray(width*height*4);
  const depth=new Float32Array(width*height).fill(-Infinity);
  for(let i=0;i<pixels.length;i+=4)pixels.set([245,246,238,255],i);

  const assignments=defaultReliefAssignments(materialCount);
  const cosAz=.993,sinAz=.118,cosElev=.83,sinElev=Math.sqrt(1-cosElev**2);
  const project=(x,y,z)=>{
    const forward=-x*sinAz+y*cosAz;
    return [x*cosAz+y*sinAz,forward*cosElev+z*sinElev,-forward*sinElev+z*cosElev];
  };
  let maxZ=0;
  for(const {vertices} of model.categories)for(let i=2;i<vertices.length;i+=3)maxZ=Math.max(maxZ,vertices[i]);
  const corners=[0,model.width].flatMap(x=>[0,model.height].flatMap(y=>[0,maxZ].map(z=>project(x,y,z))));
  const left=Math.min(...corners.map(p=>p[0])),right=Math.max(...corners.map(p=>p[0]));
  const bottom=Math.min(...corners.map(p=>p[1])),top=Math.max(...corners.map(p=>p[1]));
  const scale=Math.min(width*.88/(right-left),height*.83/(top-bottom));
  const cx=(left+right)/2,cy=(bottom+top)/2;
  const pixelPoint=(x,y,z)=>{
    const [u,v,w]=project(x,y,z);
    return [(u-cx)*scale+width/2,(v-cy)*scale+height/2,w*scale];
  };

  for(const {id,vertices,faces} of model.categories){
    const index=RELIEF_MATERIALS.findIndex(material=>material.id===reliefMaterialId(id));
    const color=RELIEF_PALETTES[materialCount][assignments[index]];
    const rgb=[1,3,5].map(i=>Number.parseInt(color.slice(i,i+2),16));
    const projected=new Float32Array(vertices.length);
    for(let i=0;i<vertices.length;i+=3)projected.set(pixelPoint(vertices[i],vertices[i+1],vertices[i+2]),i);

    for(let i=0;i<faces.length;i+=3){
      const a=faces[i]*3,b=faces[i+1]*3,c=faces[i+2]*3;
      const ax=projected[a],ay=projected[a+1],az=projected[a+2];
      const ux=projected[b]-ax,uy=projected[b+1]-ay,uz=projected[b+2]-az;
      const vx=projected[c]-ax,vy=projected[c+1]-ay,vz=projected[c+2]-az;
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      if(nz<1e-8)continue;
      const x0=Math.max(0,Math.floor(ax+Math.min(0,ux,vx))),x1=Math.min(width-1,Math.ceil(ax+Math.max(0,ux,vx)));
      const y0=Math.max(0,Math.floor(ay+Math.min(0,uy,vy))),y1=Math.min(height-1,Math.ceil(ay+Math.max(0,uy,vy)));
      const shade=.63+.54*Math.max(0,(-.39*nx+.42*ny+.82*nz)/Math.hypot(nx,ny,nz));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const dx=x+.5-ax,dy=y+.5-ay,s=(dx*vy-dy*vx)/nz,t=(ux*dy-uy*dx)/nz;
        if(s< -1e-6||t< -1e-6||s+t>1.000001)continue;
        const pixel=(height-1-y)*width+x,z=az+s*uz+t*vz;
        if(z<depth[pixel])continue;
        depth[pixel]=z;
        for(let channel=0;channel<3;channel++)pixels[pixel*4+channel]=rgb[channel]*shade;
      }
    }
  }

  const {resolution,rows=resolution,heights}=model.reliefGrid;
  for(const cut of plan.xCuts){
    const column=Math.round(cut/model.width*resolution);
    for(let row=0;row<=rows;row++){
      if(row%8>=4)continue;
      const [x,y,z]=pixelPoint(cut,row*model.height/rows,heights[row*(resolution+1)+column]);
      const pixel=(height-1-Math.floor(y))*width+Math.floor(x);
      if(z+1.5>=depth[pixel])pixels.set([73,88,76],4*pixel);
    }
  }
  return {width,height,data:pixels};
}
