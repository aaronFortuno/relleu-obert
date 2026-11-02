const metres=v=>typeof v==='number'?v:typeof v==='string'&&/^\s*\d+(\.\d+)?\s*m?\s*$/.test(v)?parseFloat(v):NaN;
const compass={N:0,NE:45,E:90,SE:135,S:180,SW:225,W:270,NW:315};
const numberDirection=raw=>typeof raw==='string'&&raw.toUpperCase() in compass?compass[raw.toUpperCase()]:raw==null||raw===''?NaN:Number(raw);
export function roofProfile(properties,outline,scale,totalHeight,rotation=0){
  const minimum=metres(properties.min_height??properties.render_min_height),baseOffsetMM=Number.isFinite(minimum)&&minimum>0&&minimum<totalHeight?minimum*scale:0;
  const flat=(fallback)=>({shape:'flat',parts:null,baseOffsetMM,...(fallback?{fallback}:{})});
  const shape=properties['roof:shape']??properties.roof_shape;
  if(!shape||shape==='flat')return flat();
  if(!['gabled','skillion','hipped','pyramidal','dome','round'].includes(shape))return flat('forma de coberta encara no admesa: '+shape);
  if(!Array.isArray(outline)||outline.length<4||!outline.every(p=>p.every(Number.isFinite))||!Number.isFinite(scale)||scale<=0)return flat('petjada invàlida per definir la coberta');
  // An explicitly mapped ridge direction wins. For symmetric roofs S3DB
  // defines the default ridge along the longest side; this convention is
  // recorded, and is not presented as a measured azimuth.
  const rawDirection=properties['roof:direction']??properties.roof_direction,rawOrientation=properties['roof:orientation'];
  let direction=numberDirection(rawDirection),directionBasis='OSM roof:direction',a,b;
  if(rawDirection!=null&&rawDirection!==''&&(!Number.isFinite(direction)||direction<0||direction>360)&&shape!=='dome'&&shape!=='pyramidal')return flat('direcció de coberta invàlida');
  if(!Number.isFinite(direction)&&rawOrientation!=null&&!['along','across'].includes(rawOrientation)&&shape!=='dome'&&shape!=='pyramidal')return flat('orientació de coberta no admesa');
  if(Number.isFinite(direction)&&direction>=0&&direction<=360){const angle=(direction-rotation)*Math.PI/180;a=[Math.sin(angle),Math.cos(angle)];b=[-a[1],a[0]];}
  else if(shape==='skillion')return flat('cal direcció de pendent explícita per a una coberta a un vessant');
  else{
    let edge=[0,0],length=0;for(let i=1;i<outline.length;i++){const d=[outline[i][0]-outline[i-1][0],outline[i][1]-outline[i-1][1]],n=Math.hypot(...d);if(n>length){edge=d;length=n;}}
    if(length<1e-6)return flat('petjada massa estreta per definir la coberta');
    b=edge.map(v=>v/length);a=[-b[1],b[0]];
    if(properties['roof:orientation']==='across'){[a,b]=[b,a];directionBasis='OSM roof:orientation=across';}
    else directionBasis=properties['roof:orientation']==='along'?'OSM roof:orientation=along':'S3DB default ridge along longest side';
  }
  if(shape==='dome'){
    const center=outline.slice(0,-1).reduce((c,p)=>[c[0]+p[0]/(outline.length-1),c[1]+p[1]/(outline.length-1)],[0,0]),xx=outline.reduce((s,p)=>s+(p[0]-center[0])**2,0),yy=outline.reduce((s,p)=>s+(p[1]-center[1])**2,0),xy=outline.reduce((s,p)=>s+(p[0]-center[0])*(p[1]-center[1]),0),angle=.5*Math.atan2(2*xy,xx-yy);
    a=[Math.cos(angle),Math.sin(angle)];b=[-a[1],a[0]];directionBasis='ellipse axes from mapped footprint; OSM dome parameterization';
  }
  const u=outline.map(p=>p[0]*a[0]+p[1]*a[1]),v=outline.map(p=>p[0]*b[0]+p[1]*b[1]),lo=Math.min(...u),hi=Math.max(...u),vlo=Math.min(...v),vhi=Math.max(...v),mid=(lo+hi)/2,vmid=(vlo+vhi)/2,W=hi-lo,L=vhi-vlo;
  if(Math.min(W,L)<1e-6)return flat('petjada massa estreta per definir la coberta');
  let height=metres(properties['roof:height']??properties.roof_height),heightBasis='OSM roof:height';
  if(!Number.isFinite(height)){
    const angle=Number(properties['roof:angle']);
    if(['gabled','skillion','hipped','pyramidal'].includes(shape)&&properties['roof:angle']!=null&&Number.isFinite(angle)&&angle>0&&angle<80){height=Math.tan(angle*Math.PI/180)*(shape==='skillion'?W:Math.min(W,L)/2)/scale;heightBasis='derived from OSM roof:angle and mapped span';}
  }
  if(!Number.isFinite(height)||height<=0||height>=totalHeight-(Number.isFinite(minimum)?minimum:0))return flat('cal altura de coberta inferior a l’altura total o un angle vàlid');
  const point=(x,y)=>[a[0]*x+b[0]*y,a[1]*x+b[1]*y],ring=(min,max,lower=vlo-1,upper=vhi+1)=>[point(min,lower),point(max,lower),point(max,upper),point(min,upper),point(min,lower)],clamp=x=>Math.max(0,Math.min(1,x));
  let parts,factor;
  if(shape==='gabled'||shape==='skillion'){
    factor=(x,y)=>{const t=(x*a[0]+y*a[1]-lo)/W;return clamp(shape==='gabled'?1-Math.abs(2*t-1):1-t);};
    parts=shape==='gabled'?[ring(lo-1,mid),ring(mid,hi+1)]:[ring(lo-1,hi+1)];
  }else if(shape==='dome'){
    const radii=outline.slice(0,-1).map((_,i)=>Math.hypot((u[i]-mid)/(W/2),(v[i]-vmid)/(L/2)));
    const footprintArea=Math.abs(outline.reduce((n,p,i)=>{const q=outline[(i+1)%outline.length];return n+p[0]*q[1]-q[0]*p[1];},0)/2),ellipseArea=Math.PI*W*L/4;
    if(footprintArea/ellipseArea<.8||footprintArea/ellipseArea>1.1||radii.filter(r=>r>.8&&r<1.2).length<radii.length*.9)return flat('la petjada no defineix una el·lipse fiable per a la cúpula paramètrica');
    factor=(x,y)=>Math.sqrt(clamp(1-((x*a[0]+y*a[1]-mid)/(W/2))**2-((x*b[0]+y*b[1]-vmid)/(L/2))**2));
    const radiiLevels=[0,.2,.4,.6,.8,1,Math.max(1.01,Math.max(...radii)/Math.cos(Math.PI/24)+.01)],polar=(r,j)=>point(mid+W/2*r*Math.cos(j/24*Math.PI*2),vmid+L/2*r*Math.sin(j/24*Math.PI*2));
    parts=[];for(let k=1;k<radiiLevels.length;k++)for(let j=0;j<24;j++){const inner=radiiLevels[k-1],outer=radiiLevels[k],points=inner===0?[point(mid,vmid),polar(outer,j),polar(outer,j+1)]:[polar(inner,j),polar(outer,j),polar(outer,j+1),polar(inner,j+1)];parts.push([...points,points[0]]);}
  }else{
    const area=Math.abs(outline.reduce((n,p,i)=>{const q=outline[(i+1)%outline.length];return n+p[0]*q[1]-q[0]*p[1];},0)/2);
    if(area/(W*L)<.85)return flat('la petjada no és prou rectangular per a aquesta coberta paramètrica');
    if(shape==='round'){
      factor=(x,y)=>Math.sqrt(clamp(1-((x*a[0]+y*a[1]-mid)/(W/2))**2));parts=Array.from({length:12},(_,i)=>ring(lo+W*i/12,lo+W*(i+1)/12));
    }else{
      const A=point(lo,vlo),B=point(hi,vlo),C=point(hi,vhi),D=point(lo,vhi),r=Math.min(W,L)/2,P=shape==='pyramidal'?point(mid,vmid):point(mid,vlo+r),Q=shape==='pyramidal'?P:point(mid,vhi-r);
      parts=[[A,B,P,A],[B,C,Q,P,B],[C,D,Q,C],[D,A,P,Q,D]].map(r=>r.filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>1e-10));
      factor=(x,y)=>{const U=x*a[0]+y*a[1],V=x*b[0]+y*b[1];return clamp(shape==='pyramidal'?1-Math.max(Math.abs(U-mid)/(W/2),Math.abs(V-vmid)/(L/2)):Math.min(U-lo,hi-U,V-vlo,vhi-V)/r);};
    }
  }
  return {shape,heightMM:height*scale,parts,factor,direction:Number.isFinite(direction)?direction:null,baseOffsetMM,metadata:{heightBasis,directionBasis,representation:'parametric source roof; not a surveyed mesh'}};
}
