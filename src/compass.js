import {finiteRange,joinedPart,translateSolid} from './accessory-solids.js';
export function northVector(rotationDeg=0,{sx=1,sy=1}={}){
  if(!Number.isFinite(rotationDeg)||Math.abs(rotationDeg)>180||![sx,sy].every(v=>Number.isFinite(v)&&v>0))throw Error('Orientació geogràfica invàlida.');
  const a=rotationDeg*Math.PI/180,x=-Math.sin(a)*sx,y=Math.cos(a)*sy,length=Math.hypot(x,y);
  return {x:x/length,y:y/length};
}
export function modelNorth(model){
  const pose=model.provenance?.options?.selectionPose;
  if(!pose)return {rotation:0,vector:northVector(0)};
  const vector=northVector(pose.rotation,{sx:model.width/pose.widthM,sy:model.height/pose.heightM});
  return {rotation:pose.rotation,vector};
}
export function compassParts(options={},api){
  const {diameter=40,plateHeight=3,relief=1.2,rotation=0,sx=1,sy=1}=options;
  finiteRange(diameter,25,80,'Diàmetre');finiteRange(plateHeight,2,5,'Gruix');finiteRange(relief,.6,3,'Relleu');
  const vector=northVector(rotation,{sx,sy}),length=.7*diameter,halfStem=Math.max(.8,diameter*.025),head=length*.22;
  const raw=[[-halfStem,-length*.4],[halfStem,-length*.4],[halfStem,length*.12],[head,length*.12],[.4,length*.5],[-.4,length*.5],[-head,length*.12],[-halfStem,length*.12]];
  const alpha=Math.atan2(-vector.x,vector.y),c=Math.cos(alpha),s=Math.sin(alpha),mid=diameter/2;
  const outline=raw.map(([x,y])=>[mid+x*c-y*s,mid+x*s+y*c]);
  const part=joinedPart(api,own=>{
    own(translateSolid(api.Manifold.cylinder(plateHeight,diameter/2,diameter/2,64),[mid,mid,0]));
    const cross=new api.CrossSection([outline]);try{own(translateSolid(cross.extrude(relief+.05),[0,0,plateHeight-.05]));}finally{cross.delete();}
  },'nord','Fletxa del nord',options.color||'#314e3a');
  return {segments:[part],outer:[diameter,diameter],parameters:{diameter,plateHeight,relief,rotation,sx,sy,north:vector},north:vector};
}
