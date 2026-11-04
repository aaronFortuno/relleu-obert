import {tilePlan} from './selection.js';

function bucketFaces(part,width,height,{cols,rows,tiles}){
  const {vertices,faces}=part;
  const tileIndices=new Uint32Array(faces.length/3);
  const offsets=new Uint32Array(tiles.length+1);
  for(let face=0;face<tileIndices.length;face++){
    const a=3*faces[3*face],b=3*faces[3*face+1],c=3*faces[3*face+2];
    const x=(vertices[a]+vertices[b]+vertices[c])/3;
    const y=(vertices[a+1]+vertices[b+1]+vertices[c+1])/3;
    const col=Math.min(cols-1,Math.max(0,Math.floor(x/width*cols)));
    const row=rows-1-Math.min(rows-1,Math.max(0,Math.floor(y/height*rows)));
    const tile=row*cols+col;
    tileIndices[face]=tile;
    offsets[tile+1]++;
  }
  for(let i=1;i<offsets.length;i++)offsets[i]+=offsets[i-1];
  const cursor=offsets.slice(0,-1),order=new Uint32Array(tileIndices.length);
  for(let face=0;face<tileIndices.length;face++)order[cursor[tileIndices[face]]++]=face;
  return {part,offsets,order,remap:new Uint32Array(vertices.length/3)};
}

function compactPart({part,offsets,order,remap},tile){
  const first=offsets[tile],last=offsets[tile+1];
  if(first===last)return null;
  const faces=new Uint32Array((last-first)*3);
  const sourceIndices=new Uint32Array(Math.min(faces.length,remap.length));
  let vertexCount=0,out=0;
  for(let i=first;i<last;i++){
    const face=order[i]*3;
    for(let k=0;k<3;k++){
      const source=part.faces[face+k];
      if(!remap[source]){
        sourceIndices[vertexCount]=source;
        remap[source]=++vertexCount;
      }
      faces[out++]=remap[source]-1;
    }
  }
  const vertices=new Float32Array(vertexCount*3);
  for(let i=0;i<vertexCount;i++){
    const source=sourceIndices[i],from=source*3,to=i*3;
    vertices[to]=part.vertices[from];
    vertices[to+1]=part.vertices[from+1];
    vertices[to+2]=part.vertices[from+2];
    remap[source]=0;
  }
  return {...part,faces,vertices};
}

// These fragments are for preview only. Assign a crossing triangle by its
// centroid so the assembled view retains every face in its global position.
export function* previewPieces(parts,width,height){
  const plan=tilePlan(width,height),total=plan.tiles.length;
  if(total<2)return;
  const buckets=parts.filter(part=>part.faces.length).map(part=>bucketFaces(part,width,height,plan));
  for(let i=0;i<total;i++){
    yield {parts:buckets.map(bucket=>compactPart(bucket,i)).filter(Boolean),index:i+1,total};
  }
}
