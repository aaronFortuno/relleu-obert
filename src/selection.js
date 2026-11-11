export const SIZE_PRESETS={'10x10':[100,100],'15x15':[150,150],'18x18':[180,180],'20x20':[200,200],'20x15':[200,150],'30x30':[300,300],'40x40':[400,400]};
export const MAX_MODEL_SIDE_MM=500;
export const MAX_PRINT_TILE_MM=250;
export const MIN_PROJECT_SCALE=100;
export const PURE_SCALE_RANGE=[MIN_PROJECT_SCALE,500000];
export const PANORAMIC_SCALE_RANGE=[50000,PURE_SCALE_RANGE[1]];

export function isPanoramicSize(width,height){
  return Math.max(width,height)>MAX_MODEL_SIDE_MM;
}

export function validPieceDimensions(width,height){
  const long=Math.max(width,height),short=Math.min(width,height);
  return Number.isFinite(long)&&short>=100&&(long<=MAX_MODEL_SIDE_MM||long<=1000&&short<=200);
}

export function pieceDimensions(key){
  if(typeof key!=='string')return null;
  if(Object.hasOwn(SIZE_PRESETS,key))return SIZE_PRESETS[key];
  if(!/^(?:[1-9]\d|100)x(?:[1-9]\d|100)$/.test(key))return null;
  const dimensions=key.split('x').map(value=>Number(value)*10);
  return validPieceDimensions(...dimensions)?dimensions:null;
}
export function parseCoordinates(text){
  const m=text.trim().match(/^([+-]?\d{1,2}(?:\.\d+)?)\s*[,;]\s*([+-]?\d{1,3}(?:\.\d+)?)$/);if(!m)return null;
  const lat=Number(m[1]),lon=Number(m[2]);if(Math.abs(lat)>70||Math.abs(lon)>179.8)throw Error('Coordenades fora de l’àmbit admès: latitud entre −70 i 70.');return {lat,lon};
}
export const MAX_PRINT_PIECES=16;
export const MIN_PRINT_BAND_MM=10;
export function validPrintBands(bands,length){
  return Array.isArray(bands)&&bands.length>0&&bands.length<=MAX_PRINT_PIECES&&
    Array.from(bands).every(mm=>Number.isSafeInteger(mm)&&mm>=MIN_PRINT_BAND_MM)&&bands.reduce((sum,mm)=>sum+mm,0)===length;
}
export function validPrintCuts(cuts,width,height){
  if(!cuts||typeof cuts!=='object'||Array.isArray(cuts))return false;
  const {columns,rows}=cuts;
  return (columns===undefined||validPrintBands(columns,width))&&(rows===undefined||validPrintBands(rows,height))&&
    (columns?.length??Math.ceil(width/MAX_PRINT_TILE_MM))*(rows?.length??Math.ceil(height/MAX_PRINT_TILE_MM))<=MAX_PRINT_PIECES;
}
export function tilePlan(width,height,maxOrOverrides=MAX_PRINT_TILE_MM){
  const max=typeof maxOrOverrides==='number'?maxOrOverrides:MAX_PRINT_TILE_MM;
  const overrides=typeof maxOrOverrides==='object'&&maxOrOverrides?maxOrOverrides:{};
  const bounds=(span,bands)=>{
    if(!bands){
      const count=Math.ceil(span/max);
      return Array.from({length:count+1},(_,i)=>i*span/count);
    }
    let offset=0;
    return [0,...bands.map(mm=>offset+=mm)];
  };
  const x=bounds(width,overrides.columns),y=bounds(height,overrides.rows);
  const cols=x.length-1,rows=y.length-1,tiles=[];
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const x0=x[col],x1=x[col+1],y0=y[rows-row-1],y1=y[rows-row];
    tiles.push({name:`fila-${row+1}-columna-${col+1}`,row:row+1,col:col+1,x0,y0,x1,y1,width:x1-x0,height:y1-y0});
  }
  return {cols,rows,tiles,xCuts:x.slice(1,-1),yCuts:y.slice(1,-1)};
}
export function physicalBBox([lat,lon],widthKM,heightKM){const dy=heightKM/2/111.32,dx=widthKM/2/(111.32*Math.cos(lat*Math.PI/180));return [lon-dx,lat-dy,lon+dx,lat+dy];}
export function coveringSelectionBox(pose,widthMM,heightMM){
  const metresPerMillimetre=Math.max(pose.widthM/widthMM,pose.heightM/heightMM);
  return physicalBBox(pose.center,widthMM*metresPerMillimetre/1000,heightMM*metresPerMillimetre/1000);
}
export function validateScale(value,[minimum,maximum]=[MIN_PROJECT_SCALE,100000]){
  const scale=Number(value);
  if(!Number.isFinite(scale)||scale<minimum||scale>maximum)
    throw Error(`L’escala ha de ser entre 1:${minimum.toLocaleString('ca')} i 1:${maximum.toLocaleString('ca')}.`);
  return scale;
}
export function parseScaleInput(text){
  const raw=String(text).trim();if(!raw||/^(segons el mapa|auto|automàtica)$/i.test(raw))return null;
  let value=raw.replace(/^1\s*:\s*/, '').trim();if(/^\d{1,3}(?:\.\d{3})+$/.test(value))value=value.replaceAll('.','');
  if(!/^\d+(?:[.,]\d+)?$/.test(value))throw Error('Escriu una escala com 1:1000 o tria «Segons el mapa».');
  return validateScale(Number(value.replace(',','.')));
}
export function scaledBBox(center,widthMM,heightMM,denominator,range){
  const scale=validateScale(denominator,range),[lat,lon]=center;
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
