import assert from 'node:assert/strict';
import test from 'node:test';
import {auditPart} from '../src/solid-audit.js';
import {buildModel,makeProjection,updateVegetation} from '../src/geometry.js';
import {groupReliefMaterials} from '../src/materials.js';
import {splitPureRelief} from '../src/pure-relief-mesh.js';
import {physicalBBox,selectionPose} from '../src/selection.js';

function fixture(width,height,scale,extraOptions={}){
  const bbox=physicalBBox([0,0],width*scale/1e6,height*scale/1e6);
  const dem=[{x:0,y:0,z:0,size:2,elev:Float32Array.of(100,100,100,100)}];
  const options={size:Math.max(width,height),widthMM:width,heightMM:height,selectionPose:selectionPose(bbox),
    pureRelief:true,resolution:48,brushDensity:.5,...extraOptions};
  const {unproject}=makeProjection(bbox,options.size,options);
  const polygon=(x0,y0,x1,y1)=>({geometry:{type:'Polygon',coordinates:[[
    [x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]
  ].map(unproject)]}});
  return {data:{meta:{bbox},dem},options,polygon,unproject};
}

const texture=model=>model.categories.find(part=>part.id==='trees');
const area=model=>model.provenance.treeRepresentation.areaMM2;

test('mapped forest has a shallow deterministic texture by default at 1:10,000',()=>{
  const {data,options,polygon}=fixture(100,100,10000);
  data.forests=[polygon(-10,-10,110,110)];
  const model=buildModel(data,options),part=texture(model);
  assert.equal(model.scale,10000);
  assert.equal(model.treeCount,0);
  assert.equal(area(model),10000);
  assert.equal(model.provenance.treeRepresentation.manualStyle,'texture');
  const audit=auditPart(part);
  assert.deepEqual(audit.errors,[]);
  assert.equal(audit.components,1);
  assert(audit.bbox.min[2]<5);
  const surface=part.vertices.filter((_,i)=>i%6===2);
  assert(surface.every(z=>z>=5.44-1e-6&&z<=5.8+1e-6));
  assert(surface.some(z=>z<5.5)&&surface.some(z=>z>5.73));
  const off=updateVegetation(model,{trees:false});
  assert.equal(area(off),0);
  assert(!texture(off));
  assert.equal(off.categories.find(part=>part.id==='forest'),model.categories.find(part=>part.id==='forest'));
  const on=updateVegetation(off,{trees:true});
  assert(texture(on).vertices.every((value,i)=>value===part.vertices[i]));
});

test('height sets the texture ceiling and zero irregularity gives an even rise',()=>{
  const {data,options,polygon}=fixture(100,100,10000);
  data.forests=[polygon(-10,-10,110,110)];
  const model=buildModel(data,{...options,vegetationHeight:1.4,vegetationNoise:0});
  const base=model.reliefGrid.heights;
  assert.deepEqual(model.provenance.treeRepresentation.heightRangeMM,[1.4,1.4]);
  assert(texture(model).vertices.every((value,i)=>i%6!==2||Math.abs(value-6.4)<1e-6));
  const rough=updateVegetation(model,{vegetationNoise:100});
  assert.equal(rough.reliefGrid.heights,base);
  assert.deepEqual(rough.provenance.treeRepresentation.heightRangeMM,[0,1.4]);
  const surface=texture(rough).vertices.filter((_,i)=>i%6===2);
  assert(surface.every(z=>z>=5-1e-6&&z<=6.4+1e-6));
  assert(surface.some(z=>z<5.5));
  assert.throws(()=>updateVegetation(rough,{vegetationHeight:2.1}),/fora del rang/);
  assert.throws(()=>updateVegetation(rough,{vegetationNoise:101}),/fora del rang/);
});

test('forest fragments keep a continuous rise across crossed tile edges and preserve real clearings',()=>{
  const {data,options,polygon,unproject}=fixture(100,100,10000);
  const northEast=polygon(50,50,110,110);
  northEast.geometry.coordinates.push([[65,65],[65,85],[85,85],[85,65],[65,65]].map(unproject));
  data.forests=[polygon(-10,-10,50,50),polygon(50,-10,110,50),polygon(-10,50,50,110),northEast];
  const model=buildModel(data,{...options,vegetationNoise:0});
  const {forestWeights,resolution}=model.reliefGrid;
  const weight=(col,row)=>forestWeights[row*(resolution+1)+col];
  assert.equal(weight(24,24),1);
  assert.equal(weight(24,12),1);
  assert.equal(weight(12,24),1);
  assert.equal(weight(36,36),-1);
  assert.deepEqual(auditPart(texture(model)).errors,[]);
});

test('paint and erase edit only the texture, with strength and undo from the same base',()=>{
  const {data,options}=fixture(100,100,10000);
  const initial=buildModel(data,options);
  const add={mode:'add',x:45,y:46,radius:10,gesture:1};
  const painted=updateVegetation(initial,{strokes:[add]});
  assert(area(painted)>270&&area(painted)<330);
  assert.equal(painted.categories.find(part=>part.id==='terrain'),initial.categories[0]);
  assert.equal(painted.reliefGrid.heights,initial.reliefGrid.heights);
  const part=texture(painted),audit=auditPart(part);
  assert.deepEqual(audit.errors,[]);
  assert.equal(audit.components,1);
  const repeated=updateVegetation(painted,{strokes:[add,add]});
  assert.equal(area(repeated),area(painted));
  assert(texture(repeated).vertices.every((value,i)=>value===part.vertices[i]));
  const softer=updateVegetation(painted,{strokes:[{...add,density:.25}]});
  assert.equal(area(softer),area(painted));
  assert(auditPart(texture(softer)).bbox.max[2]<audit.bbox.max[2]-.3);
  assert.equal(painted.parts.find(part=>part.id==='forest').vertices,part.vertices);
  assert.equal(groupReliefMaterials(painted,6).parts.find(part=>part.id==='material-5').vertices,part.vertices);
  const erased=updateVegetation(painted,{strokes:[add,{...add,mode:'erase',radius:13,gesture:2}]});
  assert.equal(area(erased),0);
  assert(!texture(erased));
  const undone=updateVegetation(erased,{strokes:[add]});
  assert.equal(area(undone),area(painted));
  assert(texture(undone).vertices.every((value,i)=>value===part.vertices[i]));
});

test('panoramic texture avoids mapped water and meets across printable piece boundaries',()=>{
  const {data,options,polygon,unproject}=fixture(510,100,450000,{streams:false});
  data.lakes=[polygon(90,20,110,80)];
  data.oceans=[polygon(300,-2,520,102)];
  data.waterways=[{properties:{waterway:'stream'},geometry:{type:'LineString',coordinates:[[80,50],[220,50]].map(unproject)}}];
  const strokes=[[100,50],[170,60],[310,50]].map(([x,y],i)=>({mode:'add',x,y,radius:14,gesture:i+1,density:1}));
  const initial=buildModel(data,options);
  const model=updateVegetation(initial,{strokes});
  assert.equal(area(initial),0);
  assert(area(model)>0);
  assert.equal(model.categories.find(part=>part.id==='water'),initial.categories.find(part=>part.id==='water'));
  const part=texture(model);
  assert.deepEqual(auditPart(part).errors,[]);
  assert(Math.abs(model.provenance.treeRepresentation.heightRangeMM[1]-.8/45)<1e-6);
  for(let i=0;i<part.vertices.length;i+=3){
    const [x,y]=part.vertices.subarray(i,i+2);
    assert(x<300&&!(x>90&&x<110&&y>20&&y<80));
    assert(x<80||x>220||Math.abs(y-50)>.225);
  }
  const pieces=splitPureRelief(model,250);
  assert.equal(pieces.length,3);
  const getPart=piece=>piece.parts.find(part=>part.id==='forest');
  assert(!getPart(pieces[2]));
  const seam=(part,x)=>{
    const points=[];
    for(let i=0;i<part.vertices.length;i+=3)if(part.vertices[i]===x)points.push(part.vertices[i+1]+':'+part.vertices[i+2]);
    return points.sort();
  };
  const seamLeft=seam(getPart(pieces[0]),170);
  assert(seamLeft.length>0);
  assert.deepEqual(seamLeft,seam(getPart(pieces[1]),0));
  assert.deepEqual(auditPart(getPart(pieces[0])).errors,[]);
  assert.deepEqual(auditPart(getPart(pieces[1])).errors,[]);
});
