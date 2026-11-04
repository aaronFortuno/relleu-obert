import {sampleReliefMask} from './relief-forest.js';

const unit=value=>Math.max(0,Math.min(1,value));
const smooth=value=>value*value*(3-2*value);

function random(x,y){
  let bits=Math.imul(x^0x4f31a335,0x7feb352d)^Math.imul(y^0x11af6acd,0x846ca68b);
  bits=Math.imul(bits^(bits>>>16),0x45d9f3b);
  return ((bits^(bits>>>16))>>>0)/4294967295;
}

function noise(x,y){
  const col=Math.floor(x),row=Math.floor(y),u=smooth(x-col),v=smooth(y-row);
  const a=random(col,row),b=random(col+1,row),c=random(col,row+1),d=random(col+1,row+1);
  return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}

export function reliefVegetationTexture(grid,context,{trees=true,strokes=[],brushDensity=.5}={}){
  if(!trees||!grid.forestWeights&&!strokes.some(stroke=>stroke.mode==='add'))return null;
  const {width,height,resolution:n,rows=n,forestWeights,oceanWeights,lakeWeights}=grid;
  const stride=n+1,length=stride*(rows+1),dx=width/n,dy=height/rows;
  const feather=Math.hypot(dx,dy),wavelength=Math.max(2.2,2.8*Math.max(dx,dy));
  const coverage=forestWeights?.slice()??new Float32Array(length).fill(-1);
  const strength=new Float32Array(length).fill(1);
  for(const {x,y,radius,mode,density=brushDensity} of strokes){
    if(![x,y,radius].every(Number.isFinite)||radius<=0||radius>30||!['add','erase'].includes(mode))continue;
    if(!Number.isFinite(density)||density<.25||density>5)throw Error('Densitat del traç fora del rang admès.');
    const intensity=unit(density/.5),edgeScale=mode==='add'?Math.max(1,density/.5):1;
    const left=Math.max(0,Math.ceil((x-radius-feather)/dx)),right=Math.min(n,Math.floor((x+radius+feather)/dx));
    const bottom=Math.max(0,Math.ceil((y-radius-feather)/dy)),top=Math.min(rows,Math.floor((y+radius+feather)/dy));
    for(let row=bottom;row<=top;row++)for(let col=left;col<=right;col++){
      const index=row*stride+col;
      const signed=(radius-Math.hypot(col*dx-x,row*dy-y))/feather;
      if(mode==='erase')coverage[index]=Math.min(coverage[index],Math.max(-1,-signed));
      else{
        const wasCovered=coverage[index]>0;
        coverage[index]=Math.max(coverage[index],Math.min(1,signed*edgeScale));
        if(signed>0)strength[index]=wasCovered?Math.max(strength[index],intensity):intensity;
      }
    }
  }
  // A channel narrower than one cell can pass between all four nodes.
  // Leave a cell diagonal of clearance so its full width remains open.
  context.waterMask??=sampleReliefMask(context.waterPolygons,width,height,n,rows,2)?.weights??null;
  const raise=new Float32Array(length),scaleFactor=context.scale/.1;
  let present=false;
  for(let row=0;row<=rows;row++)for(let col=0;col<=n;col++){
    const index=row*stride+col;
    if(context.waterMask)coverage[index]=Math.min(coverage[index],-2*context.waterMask[index]-1);
    if(oceanWeights)coverage[index]=Math.min(coverage[index],-oceanWeights[index]);
    if(lakeWeights)coverage[index]=Math.min(coverage[index],-lakeWeights[index]);
    // Keep noise defined on both sides, so clipping only feathers the height.
    const value=noise(col*dx/wavelength,row*dy/wavelength);
    raise[index]=(1+2*value)*scaleFactor*strength[index];
    present||=coverage[index]>0;
  }
  return present?{coverage,raise}:null;
}
