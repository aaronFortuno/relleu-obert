const endpoint='https://geoserveis.icgc.cat/icc_mdt/wcs/service';
const cellSize=5;
const maxSide=1200;
const maxBytes=32*1024*1024;
const provider='ICGC MET5';

function parseGrid(text,bounds){
  const lines=text.trim().split(/\r?\n/);
  const header=Object.fromEntries(lines.slice(0,6).map(line=>{
    const [key,value]=line.trim().split(/\s+/);
    return [key.toLowerCase(),Number(value)];
  }));
  const [west,south,east,north]=bounds;
  const width=(east-west)/cellSize,height=(north-south)/cellSize;
  if(header.ncols!==width||header.nrows!==height||header.cellsize!==cellSize||
      header.xllcorner!==west||header.yllcorner!==south||!Number.isFinite(header.nodata_value)||
      lines.length!==height+6)throw Error('Graella ICGC invàlida.');
  const values=new Float32Array(width*height);
  for(let row=0;row<height;row++){
    const columns=lines[row+6].trim().split(/\s+/);
    if(columns.length!==width)throw Error('Fila ICGC incompleta.');
    for(let col=0;col<width;col++){
      const z=Number(columns[col]);
      if(!Number.isFinite(z)||z===header.nodata_value||z< -12000||z>9000)
        throw Error('El MET5 no cobreix tot el retall.');
      values[row*width+col]=z;
    }
  }
  return {width,height,values,epsg:25831,pixelIsArea:true,affine:[cellSize,0,west,0,-cellSize,north]};
}

export async function loadMet5(bbox,fetcher=fetch){
  const [w,s,e,n]=bbox;
  // The envelope avoids requests elsewhere. Nodata in the raster determines actual coverage.
  if(w<.15||e>3.4||s<40.48||n>42.9)return null;
  const {coordinateTransform}=await import('./local-raster.js');
  const transform=coordinateTransform(25831);
  const corners=[[w,s],[w,n],[e,s],[e,n]].map(p=>transform.inverse(p));
  const x=corners.map(p=>p[0]),y=corners.map(p=>p[1]);
  const lower=v=>Math.floor((Math.min(...v)-10)/cellSize)*cellSize;
  const upper=v=>Math.ceil((Math.max(...v)+10)/cellSize)*cellSize;
  const bounds=[lower(x),lower(y),upper(x),upper(y)];
  if(bounds[2]-bounds[0]>maxSide*cellSize||bounds[3]-bounds[1]>maxSide*cellSize)return null;
  const query=new URLSearchParams({SERVICE:'WCS',VERSION:'1.0.0',REQUEST:'GetCoverage',
    COVERAGE:'met',CRS:'EPSG:25831',BBOX:bounds.join(','),RESX:'5',RESY:'5',FORMAT:'ArcGrid'});
  const response=await fetcher(endpoint+'?'+query,{signal:AbortSignal.timeout(15000)});
  if(!response.ok||!response.body)throw Error('Resposta ICGC no disponible.');
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let size=0,text='';
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>maxBytes)throw Error('Resposta ICGC massa gran.');
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();
  }finally{
    await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
  return {tiles:[],raster:parseGrid(text,bounds),metadata:{provider,attribution:'Institut Cartogràfic i Geològic de Catalunya',
    resolutionMeters:cellSize,epsg:25831,bounds,url:endpoint},warnings:[]};
}
