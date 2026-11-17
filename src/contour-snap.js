const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const distance2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;
const interpolate=(a,b,t)=>{
  // Follow the short longitude arc for rings next to the date line.
  const delta=((b[0]-a[0]+540)%360)-180;
  let lon=a[0]+delta*t;
  if(lon>180)lon-=360;
  if(lon<-180)lon+=360;
  return [lon,a[1]+(b[1]-a[1])*t];
};

// Tolerances are screen pixels, so zooming never changes the grab distance.
// An array is a closed ring; use {points,closed:false} for an open fence.
// Do not include the contour being edited among the supplied candidates.
export function snapToContours(point,contours,{project,tolerance=10,edgeTolerance=8}={}){
  if(!valid(point)||!Array.isArray(contours)||typeof project!=='function'||
    !Number.isFinite(tolerance)||tolerance<=0||!Number.isFinite(edgeTolerance)||edgeTolerance<0)return null;
  let vertex=null,edge=null,vertexDistance=tolerance*tolerance,edgeDistance=edgeTolerance*edgeTolerance;
  for(const contour of contours){
    const points=Array.isArray(contour)?contour:contour?.points,closed=Array.isArray(contour)||contour?.closed!==false;
    if(!Array.isArray(points)||points.length<2)continue;
    const screens=points.map(p=>valid(p)?project(p):null);
    for(let i=0;i<points.length;i++){
      const screen=screens[i];
      if(!valid(screen))continue;
      const d=distance2(point,screen);
      if(d<=vertexDistance){
        vertexDistance=d;
        vertex={point:points[i].slice(),kind:'vertex',screen:screen.slice()};
      }
      if(i===points.length-1&&!closed)continue;
      const j=(i+1)%points.length,end=screens[j];
      if(!valid(end))continue;
      const dx=end[0]-screen[0],dy=end[1]-screen[1],length2=dx*dx+dy*dy;
      if(length2<1e-12)continue;
      const t=Math.max(0,Math.min(1,((point[0]-screen[0])*dx+(point[1]-screen[1])*dy)/length2));
      const nearest=[screen[0]+t*dx,screen[1]+t*dy],along=distance2(point,nearest);
      if(along<=edgeDistance){
        edgeDistance=along;
        edge={point:interpolate(points[i],points[j],t),kind:'edge',screen:nearest,
          edge:[screen.slice(),end.slice()]};
      }
    }
  }
  // Corners take precedence over edges inside the corner's grab radius.
  return vertex??edge;
}
