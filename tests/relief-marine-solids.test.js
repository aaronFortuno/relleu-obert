import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8,unzipSync} from 'fflate';
import {reliefParts,splitPureRelief,previewReliefPieces} from '../src/pure-relief-mesh.js';
import {auditPart} from '../src/solid-audit.js';
import {bambuPlateProject} from '../src/export.js';

function makeGrid(width,height,cols,rows,marineAt,extra={}){
  const count=(cols+1)*(rows+1);
  const oceanWeights=Float32Array.from({length:count},(_,i)=>marineAt(i%(cols+1),Math.floor(i/(cols+1))));
  return {width,height,resolution:cols,rows,heights:new Float64Array(count).fill(9),
    diagonals:new Uint8Array(cols*rows),oceanWeights,seaLevelMM:5,...extra};
}

test('seas on both sides own the whole thickness while inland water remains superficial',()=>{
  const grid=makeGrid(400,150,4,2,x=>x===0||x===4?2:-1,{
    lakeWeights:new Float32Array(15).fill(1)
  });
  const parts=reliefParts(grid);
  assert.deepEqual(parts.map(({id})=>id),['terrain','inland-water','water']);
  const [land,lake,sea]=parts.map(auditPart);
  for(const audit of [land,lake,sea])assert.deepEqual(audit.errors,[]);
  assert.equal(sea.components,2);
  assert.deepEqual(sea.bbox,{min:[0,0,0],max:[400,150,5]});
  assert.ok(Math.abs(lake.bbox.min[2]-8.35)<1e-5);
  assert.equal(lake.bbox.max[2],9);
  // The fractional shoreline places 200/3 mm of sea at each end.
  const seaArea=400/3*150;
  const landArea=400*150-seaArea;
  assert.ok(Math.abs(sea.signedVolume-seaArea*5)<.05);
  assert.ok(Math.abs(land.signedVolume+lake.signedVolume-landArea*9)<.05);
});

test('coasts cross rectangular print seams with the same sea vertices and closed solids',()=>{
  const grid=makeGrid(600,100,6,3,(x,y)=>y-1.4+x*.2);
  const pieces=splitPureRelief({reliefGrid:grid,width:600,height:100,provenance:{}},250);
  assert.equal(pieces.length,3);
  for(const {parts} of pieces)for(const part of parts)assert.deepEqual(auditPart(part).errors,[]);
  function seaEdge(piece,x){
    const {vertices}=piece.parts.find(({id})=>id==='water'),values=[];
    for(let i=0;i<vertices.length;i+=3){
      if(vertices[i]===x)values.push(`${vertices[i+1].toFixed(5)},${vertices[i+2]}`);
    }
    return values.sort();
  }
  for(let i=1;i<pieces.length;i++){
    const previous=seaEdge(pieces[i-1],200);
    assert.ok(previous.length>=4);
    assert.deepEqual(previous,seaEdge(pieces[i],0));
  }
  const parts=reliefParts(grid),marineFilament=parts.findIndex(({id})=>id==='water');
  const files=unzipSync(bambuPlateProject({parts,provenance:{}},pieces));
  const settings=JSON.parse(strFromU8(files['Metadata/project_settings.config']));
  assert.equal(settings.filament_colour[marineFilament],'#8DC5CA');
});

test('the progressive preview shows fully marine tiles without a terrain solid beneath them',()=>{
  const grid=makeGrid(600,100,6,3,x=>2.5-x),preview=[];
  assert(previewReliefPieces(grid,(parts,piece)=>preview.push({parts,...piece})));
  assert.deepEqual(preview.map(({index,total,parts})=>[index,total,parts.map(({id})=>id)]),[
    [1,3,['water']],[2,3,['terrain','water']],[3,3,['terrain']]
  ]);
  const sea=auditPart(preview[0].parts[0]);
  assert.deepEqual(sea.errors,[]);
  assert.deepEqual(sea.bbox,{min:[0,0,0],max:[200,100,5]});
});
