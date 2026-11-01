const metres=v=>typeof v==='number'?v:typeof v==='string'&&/^\s*\d+(\.\d+)?\s*m?\s*$/.test(v)?parseFloat(v):NaN;
const compass={N:0,NE:45,E:90,SE:135,S:180,SW:225,W:270,NW:315};
export function roofProfile(properties,outline,scale,totalHeight,rotation=0){
  const shape=properties['roof:shape']??properties.roof_shape;
  if(!shape||shape==='flat')return {shape:'flat',parts:null};
  if(!['gabled','skillion'].includes(shape))return {shape:'flat',parts:null,fallback:'forma de coberta encara no admesa: '+shape};
  const height=metres(properties['roof:height']??properties.roof_height),raw=properties['roof:direction']??properties.roof_direction,direction=typeof raw==='string'&&raw.toUpperCase() in compass?compass[raw.toUpperCase()]:raw==null||raw===''?NaN:Number(raw);
  if(!Number.isFinite(height)||height<=0||height>=totalHeight||!Number.isFinite(direction)||direction<0||direction>360)return {shape:'flat',parts:null,fallback:'calen altura de coberta inferior a l’altura total i direcció de pendent'};
  // roof:direction is the downhill direction from north. Project it into the
  // rotated model using the same inverse-selection transform as the footprint.
  const angle=(direction-rotation)*Math.PI/180,a=[Math.sin(angle),Math.cos(angle)],b=[-a[1],a[0]],u=outline.map(p=>p[0]*a[0]+p[1]*a[1]),v=outline.map(p=>p[0]*b[0]+p[1]*b[1]),lo=Math.min(...u),hi=Math.max(...u),bottom=Math.min(...v)-1,top=Math.max(...v)+1,mid=(lo+hi)/2;
  if(hi-lo<1e-6)return {shape:'flat',parts:null,fallback:'petjada massa estreta per definir la coberta'};
  const point=(x,y)=>[a[0]*x+b[0]*y,a[1]*x+b[1]*y],ring=(min,max)=>[point(min,bottom),point(max,bottom),point(max,top),point(min,top),point(min,bottom)];
  const factor=(x,y)=>{const t=(x*a[0]+y*a[1]-lo)/(hi-lo);return Math.max(0,Math.min(1,shape==='gabled'?1-Math.abs(2*t-1):1-t));};
  return {shape,heightMM:height*scale,parts:shape==='gabled'?[ring(lo-1,mid),ring(mid,hi+1)]:[ring(lo-1,hi+1)],factor,direction};
}
