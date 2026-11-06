import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8,unzipSync} from 'fflate';
import Module from 'manifold-3d';
import {reliefParts,splitPureRelief} from '../src/pure-relief-mesh.js';
import {reliefStreamStrips} from '../src/relief-streams.js';
import {splitModel,tileArchive} from '../src/mesh-tiles.js';
import {tilePlan} from '../src/selection.js';
import {auditPart,signedVolume} from '../src/solid-audit.js';

const makeGrid=()=>{
  const width=800,height=200,resolution=11,rows=5;
  const points=fn=>Float32Array.from({length:(resolution+1)*(rows+1)},(_,i)=>
    fn(i%(resolution+1),Math.floor(i/(resolution+1))));
  const grid={width,height,resolution,rows,heights:points((x,y)=>9+Math.sin(x)*2+y*.8+((x+y)%2)*3),
    diagonals:Uint8Array.from({length:resolution*rows},(_,i)=>i%3===1?1:0),
    oceanWeights:points((x,y)=>1.2-y+x*.08),seaLevelMM:5,
    forestWeights:points((x,y)=>y-2.7+x*.04),
    vegetationTexture:{coverage:points((x,y)=>y-3.2+x*.04),raise:points((x,y)=>1+(x*y)%4*.2)}};
  grid.streamStrips=reliefStreamStrips([[[[[0,101],[800,111],[800,122],[0,112],[0,101]]]]],width,height,resolution);
  return grid;
};

const volume=parts=>parts.reduce((sum,{vertices,faces})=>sum+signedVolume(vertices,faces),0);
function seamPoints(piece,axis,where){
  const points=new Map();
  for(const {id,vertices} of piece.parts){
    const seam=new Set();
    for(let i=0;i<vertices.length;i+=3)if(Math.abs(vertices[i+axis]-where)<1e-5){
      const other=1-axis,offset=other===0?piece.tile.x0:piece.tile.y0;
      seam.add(`${(vertices[i+other]+offset).toFixed(4)},${vertices[i+2].toFixed(4)}`);
    }
    if(seam.size)points.set(id,[...seam].sort());
  }
  return points;
}

test('uneven panoramic cut coordinates stay exact through capped relief and ZIP assembly',()=>{
  const grid=makeGrid(),{width,height}=grid;
  const plan=tilePlan(width,height,{columns:[300,300,200]});
  const pieces=splitPureRelief({width,height,reliefGrid:grid,provenance:{}},plan);
  assert.deepEqual(pieces.map(({tile})=>[tile.x0,tile.x1,tile.width,tile.height]),
    [[0,300,300,200],[300,600,300,200],[600,800,200,200]]);
  for(const piece of pieces){
    assert.deepEqual(piece.parts.map(({id})=>id),['terrain','inland-water','forest','water']);
    for(const part of piece.parts){
      const {errors,bbox}=auditPart(part);
      assert.deepEqual(errors,[],`${piece.tile.name} · ${part.id}`);
      assert(bbox.min[0]>=0&&bbox.max[0]<=piece.width&&bbox.min[1]>=0&&bbox.max[1]<=piece.height);
      if(part.id==='water')assert.deepEqual([bbox.min[2],bbox.max[2]],[0,5]);
    }
  }
  for(let i=1;i<pieces.length;i++)assert.deepEqual(seamPoints(pieces[i-1],0,pieces[i-1].width),seamPoints(pieces[i],0,0));
  const total=pieces.reduce((sum,piece)=>sum+volume(piece.parts),0);
  assert(Math.abs(total-volume(reliefParts(grid)))<.5);
  const archive=unzipSync(tileArchive(pieces,'3mf'));
  assert.equal(Object.keys(archive).filter(name=>name.endsWith('.3mf')).length,3);
  assert.deepEqual(JSON.parse(strFromU8(archive['muntatge.json'])).map(({tile})=>[tile.x0,tile.x1]),[[0,300],[300,600],[600,800]]);
});

test('an uneven north-south cut crosses uneven widths without changing the adjoining dry profiles',()=>{
  const grid=makeGrid(),{width,height}=grid;
  const dry={...grid,oceanWeights:undefined,forestWeights:undefined,vegetationTexture:undefined,streamStrips:undefined};
  const plan=tilePlan(width,height,{columns:[250,250,300],rows:[75,125]});
  const pieces=splitPureRelief({width,height,reliefGrid:dry,provenance:{}},plan);
  for(let col=0;col<3;col++){
    const north=pieces[col],south=pieces[3+col];
    assert.deepEqual([north.height,north.tile.y0,south.height,south.tile.y0],[125,75,75,0]);
    assert.deepEqual(auditPart(north.parts[0]).errors,[]);
    assert.deepEqual(auditPart(south.parts[0]).errors,[]);
    assert.deepEqual(seamPoints(north,1,0),seamPoints(south,1,75));
  }
  assert(Math.abs(pieces.reduce((sum,piece)=>sum+volume(piece.parts),0)-volume(reliefParts(dry)))<.5);
});

test('crossing cuts that meet precisely on a DEM diagonal leave a single closed corner',()=>{
  const width=400,height=450,resolution=6,rows=9;
  const grid={width,height,resolution,rows,
    heights:Float32Array.from({length:(resolution+1)*(rows+1)},(_,i)=>6+Math.sin(i)**2),
    diagonals:Uint8Array.from({length:resolution*rows},(_,i)=>i%2)};
  // The common corner is (2.4,0.4) in grid coordinates, on a cell diagonal.
  const plan=tilePlan(width,height,{columns:[160,240],rows:[20,430]});
  const pieces=splitPureRelief({width,height,reliefGrid:grid,provenance:{}},plan);
  for(const piece of pieces)assert.deepEqual(auditPart(piece.parts[0]).errors,[]);
  assert(Math.abs(pieces.reduce((sum,piece)=>sum+volume(piece.parts),0)-volume(reliefParts(grid)))<.5);
});

test('the complete model caps separate materials on a manual 30 cm seam and rebases both pieces',async()=>{
  const api=await Module();api.setup();
  const box=(id,dimensions,translation)=>{
    const source=api.Manifold.cube(dimensions),solid=source.translate(translation);
    try{
      const {vertProperties,triVerts}=solid.getMesh();
      return {id,name:id,color:'#aba397',vertices:new Float32Array(vertProperties),faces:new Uint32Array(triVerts)};
    }finally{solid.delete();source.delete();}
  };
  const width=500,height=200;
  const model={width,height,provenance:{},parts:[box('terrain',[width,height,9],[0,0,0]),box('roads',[220,10,1],[100,50,9])]};
  const pieces=splitModel(model,api,tilePlan(width,height,{columns:[300,200]}));
  assert.deepEqual(pieces.map(piece=>piece.width),[300,200]);
  for(const piece of pieces)for(const part of piece.parts)assert.deepEqual(auditPart(part).errors,[]);
  assert.deepEqual(pieces.map(piece=>auditPart(piece.parts.find(part=>part.id==='roads')).bbox),[
    {min:[100,50,9],max:[300,60,10]},{min:[0,50,9],max:[20,60,10]}
  ]);
  assert(Math.abs(pieces.reduce((sum,piece)=>sum+volume(piece.parts),0)-volume(model.parts))<.5);
});
