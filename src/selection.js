export const SIZE_PRESETS={'15x15':[150,150],'18x18':[180,180],'20x20':[200,200],'15x20':[150,200],'20x15':[200,150],'30x30':[300,300],'40x40':[400,400]};
export function parseCoordinates(text){
  const m=text.trim().match(/^([+-]?\d{1,2}(?:\.\d+)?)\s*[,;]\s*([+-]?\d{1,3}(?:\.\d+)?)$/);if(!m)return null;
  const lat=Number(m[1]),lon=Number(m[2]);if(Math.abs(lat)>70||Math.abs(lon)>179.8)throw Error('Coordenades fora de l’àmbit admès: latitud entre −70 i 70.');return {lat,lon};
}
export function tilePlan(width,height,max=200){
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
export function scaledBBox(center,widthMM,heightMM,denominator){
  const scale=validateScale(denominator),[lat,lon]=center;
  if(![lat,lon,widthMM,heightMM].every(Number.isFinite)||Math.abs(lat)>70||widthMM<=0||heightMM<=0)throw Error('Centre o mida fora de l’àmbit admès.');
  return physicalBBox(center,widthMM*scale/1e6,heightMM*scale/1e6);
}
