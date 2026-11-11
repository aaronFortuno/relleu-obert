const snap=v=>Math.round(v*1e5)/1e5;
export function makeProjection(bbox,size,physical={}){
  if(physical.selectionPose){
    const {center:[lat,lon],widthM,heightM,rotation}=physical.selectionPose,c=Math.cos(lat*Math.PI/180),a=rotation*Math.PI/180,cos=Math.cos(a),sin=Math.sin(a),width=physical.widthMM||size,height=physical.heightMM||size*heightM/widthM,sx=width/widthM,sy=height/heightM;
    if(![lat,lon,widthM,heightM,rotation].every(Number.isFinite)||widthM<=0||heightM<=0)throw Error('Orientació del retall invàlida.');
    return {width,height,scale:Math.min(sx,sy),project:([x,y])=>{const dx=(x-lon)*111320*c,dy=(y-lat)*111320;return [snap(width/2+(dx*cos-dy*sin)*sx),snap(height/2+(dx*sin+dy*cos)*sy)];},unproject:([x,y])=>{const dx=(x-width/2)/sx,dy=(y-height/2)/sy;return [lon+(dx*cos+dy*sin)/(111320*c),lat+(-dx*sin+dy*cos)/111320];}};
  }
  const [w,s,e,n]=bbox,c=Math.cos((s+n)/2*Math.PI/180),xm=(e-w)*111320*c,ym=(n-s)*111320,scale=size/Math.max(xm,ym);
  const width=physical.widthMM||xm*scale,height=physical.heightMM||ym*scale,sx=width/xm,sy=height/ym;
  return {width,height,scale:Math.min(sx,sy),project:([lon,lat])=>[snap((lon-w)*111320*c*sx),snap((lat-s)*111320*sy)],unproject:([x,y])=>[w+x/(111320*c*sx),s+y/(111320*sy)]};
}
