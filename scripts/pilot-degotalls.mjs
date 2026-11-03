import {createInterface} from 'node:readline';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {threeMF} from '../src/export.js';
import {auditThreeMF} from '../src/three-mf-audit.js';
import {auditPart,signedVolume} from '../src/solid-audit.js';

const source='https://dataverse.csuc.cat/api/access/datafile/11534';
const response=await fetch(source,{signal:AbortSignal.timeout(45000)});
if(!response.ok)throw Error(response.status);
const stream=Readable.fromWeb(response.body),hash=createHash('md5');
stream.on('data',bytes=>hash.update(bytes));
const cellSize=.5,cells=new Map();
for await(const line of createInterface({input:stream,crlfDelay:Infinity})){
  const [x,y,z]=line.trim().split(/\s+/).map(Number);
  if(![x,y,z].every(Number.isFinite))continue;
  const col=Math.floor(x/cellSize),row=Math.floor(z/cellSize),key=col+','+row;
  const cell=cells.get(key)??{sum:0,count:0,min:Infinity,max:-Infinity,col,row};
  cell.sum+=y;cell.count++;cell.min=Math.min(cell.min,y);cell.max=Math.max(cell.max,y);
  cells.set(key,cell);
}
const md5=hash.digest('hex');
if(md5!=='ee8c78c13fc3d5ee1fafc7b8ca305b80')throw Error('Unexpected source hash');

function pickWindow(cols,rows){
  let best;
  for(const origin of cells.values()){
    const patch=[];
    for(let col=0;col<cols;col++)for(let row=0;row<rows;row++){
      const sample=cells.get((origin.col+col)+','+(origin.row+row));
      if(sample?.count>=3&&sample.max-sample.min<=1.25)patch.push(sample.sum/sample.count);
    }
    if(patch.length!==cols*rows)continue;
    let reversed=0,maximumReversal=0;
    for(let col=0;col<cols;col++)for(let row=0;row<rows-4;row++){
      const difference=patch[col*rows+row]-patch[col*rows+row+4];
      if(difference>=.4)reversed++;
      maximumReversal=Math.max(maximumReversal,difference);
    }
    if(reversed>=3&&(!best||reversed>best.reversed))best={cols,rows,patch,origin:[origin.col,origin.row],reversed,maximumReversal};
  }
  return best;
}

const choice=pickWindow(21,25)??pickWindow(17,21)??pickWindow(13,17);
if(!choice)throw Error('No sufficiently sampled patch with negative grade');
const {cols,rows,patch,origin,reversed,maximumReversal}=choice;
const scale=5,minimum=Math.min(...patch),back=Math.max(...patch)+1;
const vertices=[],faces=[];
for(const surface of [false,true]){
  for(let i=0;i<patch.length;i++)vertices.push(Math.floor(i/rows)*cellSize*scale,
    ((surface?back:patch[i])-minimum)*scale,i%rows*cellSize*scale);
}
const n=patch.length;
const quad=(a,b,c,d)=>faces.push(a,b,c,a,c,d);
for(let col=0;col<cols-1;col++)for(let row=0;row<rows-1;row++){
  const a=col*rows+row;
  quad(a,a+rows,a+rows+1,a+1);
  quad(a+n,a+n+1,a+n+rows+1,a+n+rows);
}
const perimeter=[];
for(let col=0;col<cols;col++)perimeter.push(col*rows);
for(let row=1;row<rows;row++)perimeter.push((cols-1)*rows+row);
for(let col=cols-2;col>=0;col--)perimeter.push(col*rows+rows-1);
for(let row=rows-2;row>0;row--)perimeter.push(row);
for(let i=0;i<perimeter.length;i++){
  const a=perimeter[i],b=perimeter[(i+1)%perimeter.length];
  quad(b,a,a+n,b+n);
}
const part={id:'terrain',name:'Espadat',color:'#B4A68C',vertices:Float32Array.from(vertices),faces:Uint32Array.from(faces)};
if(signedVolume(part.vertices,part.faces)<0)for(let i=0;i<faces.length;i+=3){
  const tmp=part.faces[i+1];part.faces[i+1]=part.faces[i+2];part.faces[i+2]=tmp;
}
const provenance={name:'Cupó local dels Degotalls',source,doi:'https://doi.org/10.34810/data201',
  authors:'García Sellés, David; Guinau Sellés, Marta; Blanco Nuñez, Laura; Institut Cartogràfic i Geològic de Catalunya',
  license:'https://creativecommons.org/licenses/by/4.0/',md5,scale:200,cellSize,
  localWindow:[(origin[0]+.5)*cellSize,(origin[1]+.5)*cellSize,(origin[0]+cols-.5)*cellSize,(origin[1]+rows-.5)*cellSize],
  method:'Superfície visible del núvol TLS en el pla XZ, amb Y de cada cel·la mitjana dels punts observats. Tancament artificial al darrere i als costats. Coordenades locals; no integrat al MDT.',
  measuredReversal:{depthMetres:maximumReversal,verticalSpanMetres:2,intervalsAtLeastPointFourMetres:reversed}};
const geometry=auditPart(part);
const bytes=threeMF({parts:[part],provenance},{bambu:true});
const archive=auditThreeMF(bytes);
if(geometry.errors.length||!archive.valid)throw Error(JSON.stringify({geometry,archive}));
await mkdir(new URL('../output/',import.meta.url),{recursive:true});
await writeFile(new URL('../output/degotalls-cupo-3d.3mf',import.meta.url),bytes);
await writeFile(new URL('../output/degotalls-cupo-3d.json',import.meta.url),JSON.stringify({provenance,geometry,archive},null,2)+'\n');
console.log({provenance,geometry});
