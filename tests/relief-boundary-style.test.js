import assert from 'node:assert/strict';
import test from 'node:test';
import {boundaryStrokePolygons} from '../src/relief-boundary-style.js';
import {polygonTester} from '../src/polygon-index.js';
import {reliefStreamPart,reliefStreamStrips} from '../src/relief-streams.js';
import {auditPart} from '../src/solid-audit.js';

const width=24,height=24,project=p=>p;
const polygons=(lines,style)=>boundaryStrokePolygons(lines,project,{width,height,style});
const contains=(lines,style)=>polygonTester(polygons(lines,style).flat());

test('boundary stroke styles leave visible gaps between printed marks',()=>{
  const lines=[[[0,5],[24,5]]];
  for(const [style,on,off]of [
    ['solid',[1,3,4,8],[]],
    ['dashed',[1,4,5.8],[3,6.8]],
    ['dotted',[.1,1.25,2.6],[.65,1.9,3.3]],
    ['dash-dot',[1,3.74,5.5],[3,4.5,8.2]]
  ]){
    const hasInk=contains(lines,style);
    for(const x of on)assert(hasInk([x,5]),style+' should mark '+x);
    for(const x of off)assert(!hasInk([x,5]),style+' should leave a gap at '+x);
    assert(!hasInk([1,5.3]));
  }
});

test('a mark turns the original corner and the reversed duplicate draws only once',()=>{
  const line=[[0,5],[1,5],[1,15]],reverse=line.slice().reverse();
  assert.deepEqual(polygons([reverse,line],'dashed'),polygons([line],'dashed'));
  const hasInk=contains([line],'dashed');
  assert(hasInk([.4,5])&&hasInk([1,5.8]));
  assert(!hasInk([1,7]));
});

test('a long segment outside the plate keeps its phase without generating off-plate marks',()=>{
  const start=-100000000,end=24,period=3.7;
  const line=[[start,5],[end,5]],shifted=[[start+period*27027026,5],[end,5]];
  const distant=polygons([line],'dashed'),ink=polygonTester(distant.flat()),local=contains([shifted],'dashed');
  assert(distant.length<10);
  for(const ring of distant.flat(2))for(const [x,y]of ring){
    assert(x>-.55&&x<24.55&&y>4.7&&y<5.3);
  }
  for(const x of [.1,.8,2,3,5,9,14,17,23.9])assert.equal(ink([x,5]),local([x,5]),'phase at '+x);
});

test('a dash spanning a fractional plate cut keeps the same closed cross section',()=>{
  const resolution=12,step=width/resolution;
  const grid={resolution,width,height,diagonals:new Uint8Array(resolution**2),
    heights:Float64Array.from({length:(resolution+1)**2},(_,i)=>8+i%(resolution+1)*.1+Math.floor(i/(resolution+1))*.2)};
  const strips=reliefStreamStrips(polygons([[[5,0],[5,8],[8,20]]],'dashed'),width,height,resolution);
  const cut=2.25;
  const south=reliefStreamPart(grid,{left:0,bottom:0,right:resolution,top:cut},strips);
  const north=reliefStreamPart(grid,{left:0,bottom:cut,right:resolution,top:resolution},strips);
  const seam=(part,y)=>{
    const vertices=new Set();
    for(let i=0;i<part.vertices.length;i+=3){
      const [x,v,z]=part.vertices.subarray(i,i+3);
      if(v===y)vertices.add(`${x}:${z}`);
    }
    return [...vertices].sort();
  };
  for(const part of [south,north])assert.deepEqual(auditPart(part).errors,[]);
  assert(seam(south,cut*step).length>0);
  assert.deepEqual(seam(south,cut*step),seam(north,0));
});
