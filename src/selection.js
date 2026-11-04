export const SIZE_PRESETS={'10x10':[100,100],'15x15':[150,150],'18x18':[180,180],'20x20':[200,200],'20x15':[200,150],'30x30':[300,300],'40x40':[400,400]};
export const MAX_MODEL_SIDE_MM=500;
export const MAX_PRINT_TILE_MM=250;

export function pieceDimensions(key){
  if(typeof key!=='string')return null;
  if(Object.hasOwn(SIZE_PRESETS,key))return SIZE_PRESETS[key];
  if(!/^\d{2}x\d{2}$/.test(key))return null;
  const dimensions=key.split('x').map(value=>Number(value)*10);
  return dimensions.every(value=>value>=100&&value<=MAX_MODEL_SIDE_MM)?dimensions:null;
}
export function parseCoordinates(text){
  const m=text.trim().match(/^([+-]?\d{1,2}(?:\.\d+)?)\s*[,;]\s*([+-]?\d{1,3}(?:\.\d+)?)$/);if(!m)return null;
  const lat=Number(m[1]),lon=Number(m[2]);if(Math.abs(lat)>70||Math.abs(lon)>179.8)throw Error('Coordenades fora de l’àmbit admès: latitud entre −70 i 70.');return {lat,lon};
}
export function tilePlan(width,height,max=MAX_PRINT_TILE_MM){
  const cols=Math.ceil(width/max),rows=Math.ceil(height/max),tiles=[];
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const x0=col*width/cols,y0=(rows-row-1)*height/rows;tiles.push({name:`fila-${row+1}-columna-${col+1}`,row:row+1,col:col+1,x0,y0,x1:(col+1)*width/cols,y1:(rows-row)*height/rows,width:width/cols,height:height/rows});}
  return {cols,rows,tiles};
}
export function physicalBBox([lat,lon],widthKM,heightKM){const dy=heightKM/2/111.32,dx=widthKM/2/(111.32*Math.cos(lat*Math.PI/180));return [lon-dx,lat-dy,lon+dx,lat+dy];}
export function validateScale(value){
  const scale=Number(value);
  if(!Number.isFinite(scale)||scale<100||scale>100000)throw Error('L’escala ha de ser entre 1:100 i 1:100.000.');
  return scale;
}
export function parseScaleInput(text){
  const raw=String(text).trim();if(!raw||/^(segons el mapa|auto|automàtica)$/i.test(raw))return null;
  let value=raw.replace(/^1\s*:\s*/, '').trim();if(/^\d{1,3}(?:\.\d{3})+$/.test(value))value=value.replaceAll('.','');
  if(!/^\d+(?:[.,]\d+)?$/.test(value))throw Error('Escriu una escala com 1:1000 o tria «Segons el mapa».');
  return validateScale(Number(value.replace(',','.')));
}
export function scaledBBox(center,widthMM,heightMM,denominator){
  const scale=validateScale(denominator),[lat,lon]=center;
  if(![lat,lon,widthMM,heightMM].every(Number.isFinite)||Math.abs(lat)>70||widthMM<=0||heightMM<=0)throw Error('Centre o mida fora de l’àmbit admès.');
  return physicalBBox(center,widthMM*scale/1e6,heightMM*scale/1e6);
}
export function selectionPose(bbox,rotation=0){
  if(!Number.isFinite(rotation)||Math.abs(rotation)>180)throw Error('El gir ha de ser entre −180° i 180°.');
  const [w,s,e,n]=bbox,lat=(s+n)/2,lon=(w+e)/2,c=Math.cos(lat*Math.PI/180),widthM=(e-w)*111320*c,heightM=(n-s)*111320;
  if(widthM<=0||heightM<=0)throw Error('El retall no té una extensió vàlida.');
  const a=rotation*Math.PI/180,cos=Math.cos(a),sin=Math.sin(a);
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>{const dx=x*widthM/2,dy=y*heightM/2;return [lon+(dx*cos+dy*sin)/(111320*c),lat+(-dx*sin+dy*cos)/111320];});
  return {center:[lat,lon],widthM,heightM,rotation,corners,bbox:[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1])),Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1]))]};
}
