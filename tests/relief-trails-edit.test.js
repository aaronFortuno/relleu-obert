import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareReliefTrails,editReliefTrailStrips,MAX_RELIEF_TRAIL_STROKES} from '../src/relief-trails.js';
import {buildModel,updatePureRelief} from '../src/geometry.js';
import {splitPureRelief} from '../src/pure-relief-mesh.js';
import {physicalBBox,tilePlan} from '../src/selection.js';
import {auditPart} from '../src/solid-audit.js';
import {polygonTester} from '../src/polygon-index.js';

const grid={width:100,height:100,resolution:10};
const feature=coordinates=>({properties:{class:'path'},geometry:{type:'LineString',coordinates}});
const stroke=(mode,x,y,gesture,radius=2,breakBefore=false)=>({mode,x,y,gesture,radius,breakBefore});
const contains=(strips,x,y,dimensions=grid)=>
  polygonTester(strips[Math.floor(x*dimensions.resolution/dimensions.width)]??[])([x,y]);

test('width is measured in model millimetres on mapped and freehand paths',()=>{
  const source=[feature([[5,30],[95,30]])],strokes=[stroke('add',5,60,1),stroke('add',95,60,1)];
  const mapped=width=>prepareReliefTrails(source,p=>p,grid,width).strips;
  const thin=editReliefTrailStrips(mapped(.42),grid,.42,strokes);
  const wide=editReliefTrailStrips(mapped(2),grid,2,strokes);
  for(const y of [30,60]){
    assert(contains(thin,42,y+.15));
    assert(!contains(thin,42,y+.4));
    assert(contains(wide,42,y+.8));
    assert(!contains(wide,42,y+1.2));
  }
});

test('a swept eraser removes mapped and drawn paths, and a later stroke can redraw',()=>{
  const base=prepareReliefTrails([feature([[5,30],[95,30]])],p=>p,grid).strips;
  const drawn=[stroke('add',5,60,1),stroke('add',95,60,1)];
  const erased=[...drawn,stroke('erase',45,12,2),stroke('erase',45,90,2)];
  const redrawn=[...erased,stroke('add',35,60,3),stroke('add',55,60,3)];
  const withErase=editReliefTrailStrips(base,grid,.42,erased);
  for(const y of [30,60]){
    assert(!contains(withErase,45,y));
    assert(contains(withErase,35,y));
    assert(contains(withErase,55,y));
  }
  const withRedraw=editReliefTrailStrips(base,grid,.42,redrawn);
  assert(contains(withRedraw,45,60));
  assert(!contains(withRedraw,45,30));
  assert(contains(base,45,30),'undo must be able to replay from untouched cartography');
  assert(!contains(base,45,60));
});

test('re-entering after a gap starts a new subpath and validates the point budget',()=>{
  const strokes=[stroke('add',5,20,1),stroke('add',20,20,1),
    stroke('add',70,20,1,2,true),stroke('add',90,20,1)];
  const edited=editReliefTrailStrips([],grid,.42,strokes);
  assert(contains(edited,12,20));
  assert(!contains(edited,45,20));
  assert(contains(edited,75,20));
  assert(contains(editReliefTrailStrips([],grid,.42,[stroke('add',10,20,1)]),10.1,20));
  assert.throws(()=>editReliefTrailStrips([],grid,3.1,strokes),/rang/);
  assert.throws(()=>editReliefTrailStrips([],grid,1,Array(MAX_RELIEF_TRAIL_STROKES+1).fill(strokes[0])),/rang/);
  assert.throws(()=>editReliefTrailStrips([],grid,1,[stroke('erase',20,20,1,31)]),/no és vàlid/);
});

test('trail-only updates reuse the terrain and export closed solids through a fractional seam',()=>{
  const bbox=physicalBBox([0,0],10,10),[w,s,e,n]=bbox,y=s+(n-s)*.275;
  const dem=[{z:0,x:0,y:0,size:2,elev:new Float32Array([100,200,500,650])}];
  const data={meta:{bbox},dem,trails:[feature([[w,y],[e,y]])]};
  const options={size:400,widthMM:400,heightMM:150,pureRelief:true,resolution:12,reliefTrails:true};
  const original=buildModel(data,options),ground=original.categories.find(part=>part.id==='terrain');
  const trailStrokes=[stroke('add',20,80,1),stroke('add',380,80,1),stroke('erase',101,80,2,6)];
  const edited=updatePureRelief(original,{trailStrokes,reliefTrailWidth:1.2});
  assert.equal(edited.categories.find(part=>part.id==='terrain'),ground);
  assert.equal(edited.reliefGrid.heights,original.reliefGrid.heights);
  assert.equal(updatePureRelief(edited,{trailStrokes:structuredClone(trailStrokes)}),edited);
  assert.deepEqual(edited.provenance.options.trailStrokes,trailStrokes);
  const pieces=splitPureRelief(edited,tilePlan(400,150,{columns:[193,207]}));
  assert.equal(pieces.length,2);
  assert.equal(pieces[0].width,193);
  const parts=pieces.map(piece=>piece.parts.find(part=>part.id==='trails'));
  assert(pieces.every(piece=>!piece.parts.some(part=>part.id==='route')));
  for(const part of parts){
    assert(part);
    assert.deepEqual(auditPart(part).errors,[]);
  }
  const seamYs=(part,x)=>{
    const result=new Set();
    for(let i=0;i<part.vertices.length;i+=3){
      const [px,py]=part.vertices.subarray(i,i+2);
      if(Math.abs(px-x)<1e-4&&Math.abs(py-80)<1)result.add(py.toFixed(4));
    }
    return [...result].sort();
  };
  assert(seamYs(parts[0],pieces[0].width).length>0);
  assert.deepEqual(seamYs(parts[0],pieces[0].width),seamYs(parts[1],0));
  const hidden=updatePureRelief(edited,{reliefTrails:false});
  assert(!hidden.categories.some(part=>part.id==='trails'||part.id==='route'));
  assert.equal(hidden.provenance.options.trailStrokes,trailStrokes);
  assert(updatePureRelief(hidden,{reliefTrails:true}).categories.some(part=>part.id==='trails'));
});

test('white trail corrections and two orange routes coexist and remain independently editable',()=>{
  const bbox=physicalBBox([0,0],1,1),[w,s,e,n]=bbox,lon=w+(e-w)*.45;
  const dem=[{z:0,x:0,y:0,size:2,elev:new Float32Array([100,200,500,650])}];
  const source={meta:{bbox},dem};
  const options={size:100,pureRelief:true,resolution:12,reliefTrails:true};
  const model=buildModel(source,options);
  const userRoute={name:'Ruta de prova',paths:[[[lon,s],[lon,n]]]};
  const drawnRouteStrokes=[stroke('add',15,55,1),stroke('add',80,55,1)];
  const trailStrokes=[stroke('add',15,20,2),stroke('add',80,20,2)];
  const imported=updatePureRelief(model,{userRoute});
  const combined=updatePureRelief(imported,{drawnRouteStrokes,trailStrokes});
  const routes=combined.parts.filter(part=>part.id==='route');
  assert.equal(routes.length,1);
  assert.deepEqual(auditPart(routes[0]).errors,[]);
  assert.deepEqual(auditPart(combined.parts.find(part=>part.id==='trails')).errors,[]);
  assert.equal(combined.reliefGrid.heights,model.reliefGrid.heights);
  assert.equal(combined.provenance.userRouteInCrop,true);
  const grid=combined.reliefGrid;
  assert(contains(grid.routeStrips,60,55,grid));
  assert(contains(grid.trailStrips,60,20,grid));
  assert(!contains(grid.routeStrips,60,20,grid));
  assert(!contains(grid.trailStrips,60,55,grid));
  assert.deepEqual(buildModel(source,{...options,userRoute,drawnRouteStrokes,trailStrokes}).reliefGrid.routeStrips,grid.routeStrips);
  assert.equal(updatePureRelief(combined,{drawnRouteStrokes:structuredClone(drawnRouteStrokes)}),combined);
  const withoutDrawn=updatePureRelief(combined,{drawnRouteStrokes:[]});
  assert.deepEqual(withoutDrawn.reliefGrid.routeStrips,imported.reliefGrid.routeStrips);
  const hiddenTrails=updatePureRelief(combined,{reliefTrails:false});
  assert.equal(hiddenTrails.parts.find(part=>part.id==='route'),routes[0]);
  assert(!hiddenTrails.parts.some(part=>part.id==='trails'));
  const withoutGPX=updatePureRelief(hiddenTrails,{userRoute:null});
  assert(contains(withoutGPX.reliefGrid.routeStrips,60,55,grid));
  assert(!contains(withoutGPX.reliefGrid.routeStrips,45,80,grid));
  const erased=updatePureRelief(combined,{drawnRouteStrokes:[...drawnRouteStrokes,stroke('erase',45,55,3,4)]});
  assert(!contains(erased.reliefGrid.routeStrips,47,55,grid));
  assert(contains(erased.reliefGrid.routeStrips,45,55,grid));
  assert.equal(erased.reliefGrid.trailStrips,grid.trailStrips);
  const outside=updatePureRelief(combined,{userRoute:{name:'Fora',paths:[[[1,1],[2,2]]]}});
  assert.equal(outside.provenance.userRouteInCrop,false);
  assert(outside.parts.some(part=>part.id==='route'));
});
