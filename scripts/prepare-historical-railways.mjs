import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';
import proj4 from 'proj4';

const source={name:'Railways of Spain GIS (1848–2023) · Guillermo Esteban-Oliver i Jordi Martí-Henneberg',url:'https://doi.org/10.34810/data917',license:'CC BY 4.0'};
const downloads=[['60282','narrow_gauge'],['60294','rail'],['60283','rail']];
const pilots=[
  {id:'carrilet-vall-aro',label:'Carrilet de Sant Feliu de Guíxols a Girona',bbox:[2.97,41.797,3.023,41.834],center:[41.8115,2.998],widthM:2000,checkLine:'E070'},
  {id:'carrilet-garrotxa',label:'Carrilet d’Olot a Girona',bbox:[2.514,42.035,2.56,42.079],center:[42.057,2.538],widthM:2000,checkLine:'E059'},
];
const rounded=v=>Math.round(v*1e7)/1e7;
const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
const featureCollection=features=>({type:'FeatureCollection',features});
const out=new URL('../datasets/historical/',import.meta.url);
const args=process.argv.slice(2);
const probe=args[0]==='--probe'&&args.length===5?args.slice(1).map(Number):null;
if(args.length&&(!probe||!args.slice(1).every(value=>value.trim())||!probe.every(Number.isFinite)||
  probe[0]< -180||probe[2]>180||probe[1]< -90||probe[3]>90||probe[0]>=probe[2]||probe[1]>=probe[3])){
  throw Error('Usage: node scripts/prepare-historical-railways.mjs [--probe west south east north]');
}

function fields(dbf){
  const data=view(dbf),first=data.getUint16(8,true),stride=data.getUint16(10,true),count=data.getUint32(4,true);
  const decode=new TextDecoder('windows-1252'),columns=[];
  for(let i=32,offset=1;i<first&&dbf[i]!==13;i+=32){
    const name=decode.decode(dbf.subarray(i,i+11)).split('\0')[0],size=dbf[i+16];
    columns.push({name,size,offset});offset+=size;
  }
  if(first+count*stride>dbf.length||columns.at(-1).offset+columns.at(-1).size!==stride)throw Error('Invalid DBF table');
  return Array.from({length:count},(_,i)=>{
    const at=first+i*stride;
    return dbf[at]===42?null:Object.fromEntries(columns.map(({name,size,offset})=>[name,decode.decode(dbf.subarray(at+offset,at+offset+size)).trim()]));
  });
}

function shapes(shp,transform){
  const data=view(shp),records=[];
  if(data.getInt32(0)!==9994||data.getInt32(32,true)!==3)throw Error('Expected a PolyLine Shapefile');
  for(let at=100;at<shp.length;){
    const size=2*data.getInt32(at+4),p=at+8,end=p+size,kind=data.getInt32(p,true);
    if(size<4||end>shp.length||![0,3].includes(kind))throw Error('Invalid SHP record');
    if(kind===0){records.push([]);at=end;continue;}
    const numParts=data.getInt32(p+36,true),numPoints=data.getInt32(p+40,true),parts=p+44,points=parts+4*numParts;
    if(numParts<1||numPoints<2||points+16*numPoints!==end)throw Error('Invalid SHP PolyLine');
    const partStarts=Array.from({length:numParts},(_,i)=>data.getInt32(parts+4*i,true));
    records.push(partStarts.map((start,i)=>Array.from({length:(partStarts[i+1]??numPoints)-start},(_,j)=>{
      const xy=points+16*(start+j);
      return transform.forward([data.getFloat64(xy,true),data.getFloat64(xy+8,true)]);
    })));
    at=end;
  }
  return records;
}

function clipLine(line,[w,s,e,n]){
  const parts=[];
  let current=null;
  for(let i=1;i<line.length;i++){
    const [x,y]=line[i-1],[u,v]=line[i],dx=u-x,dy=v-y;
    let start=0,end=1;
    for(const [p,q] of [[-dx,x-w],[dx,e-x],[-dy,y-s],[dy,n-y]]){
      if(!p){if(q<0){start=1;end=0;break;}}
      else if(p<0)start=Math.max(start,q/p);
      else end=Math.min(end,q/p);
    }
    if(start>=end){current=null;continue;}
    const point=t=>[rounded(x+dx*t),rounded(y+dy*t)];
    if(!current||start>0){current=[point(start)];parts.push(current);}
    const a=current.at(-1),b=point(end);
    if(a[0]!==b[0]||a[1]!==b[1])current.push(b);
    if(end<1)current=null;
  }
  return parts.filter(part=>part.length>1);
}

function inService({OPENING,CLOSURE,REOPENING},year){
  const [open,close,reopen]=[OPENING,CLOSURE,REOPENING].map(Number);
  if(!Number.isInteger(open)||open<1800||open>year)return false;
  return !close||close>year||Boolean(reopen&&reopen<=year);
}

if(!probe)await mkdir(out,{recursive:true});
const records=[];
for(const [file,gauge] of downloads){
  const response=await fetch(`https://dataverse.csuc.cat/api/access/datafile/${file}`,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`Cannot download rail data ${file}: HTTP ${response.status}`);
  const entries=Object.entries(unzipSync(new Uint8Array(await response.arrayBuffer()))),get=ext=>entries.find(([name])=>name.toLowerCase().endsWith('.'+ext))?.[1];
  const rows=fields(get('dbf')),lines=shapes(get('shp'),proj4(strFromU8(get('prj')),'EPSG:4326'));
  if(rows.length!==lines.length)throw Error(`DBF and SHP record count mismatch: ${file}`);
  records.push(...rows.flatMap((row,i)=>row?[{row,lines:lines[i],gauge}]:[]));
}

if(probe){
  const local=records.filter(({lines})=>lines.some(line=>clipLine(line,probe).length));
  for(const year of [1900,1960,1980,2000,2023]){
    const active=local.filter(({row})=>inService(row,year));
    console.log(JSON.stringify({bbox:probe,year,features:active.length,lines:[...new Set(active.map(({row})=>row.LINE))].sort()}));
  }
}

const railAreas=[];
for(const {checkLine,...pilot} of probe?[]:pilots){
  const clipped=records.flatMap(({row,lines,gauge})=>{
    const coordinates=lines.flatMap(line=>clipLine(line,pilot.bbox));
    return coordinates.length?[{row,feature:{type:'Feature',id:`${gauge}-${row.LINE_CODE}-${row.F_ID}`,properties:{sourceLayer:'transportation',class:'rail',subclass:gauge,railway:gauge,name:row.LINE,opened:Number(row.OPENING),closed:Number(row.CLOSURE)||null,reopened:Number(row.REOPENING)||null},geometry:{type:'MultiLineString',coordinates}}}]:[];
  });
  const editions=[];
  for(const year of [1960,1980]){
    const active=clipped.filter(({row})=>inService(row,year));
    if(active.some(({row})=>row.LINE_CODE===checkLine)!==(year===1960))throw Error(`Unexpected coverage for ${checkLine} in ${year}`);
    const file=`${pilot.id}-${year}.geojson`;
    await writeFile(new URL(file,out),JSON.stringify(featureCollection(active.map(({feature})=>feature)))+'\n');
    editions.push({year,file});
    console.log(`${pilot.id} · ${year}: ${active.length} trams`);
  }
  railAreas.push({...pilot,source,layer:'railways',editions});
}

if(!probe){
  const index=new URL('index.json',out);
  const previous=await readFile(index,'utf8').then(JSON.parse,error=>{if(error.code==='ENOENT')return {areas:[]};throw error;});
  const ids=new Set(railAreas.map(area=>area.id));
  await writeFile(index,JSON.stringify({areas:[...railAreas,...previous.areas.filter(area=>!ids.has(area.id))]},null,2)+'\n');
}
