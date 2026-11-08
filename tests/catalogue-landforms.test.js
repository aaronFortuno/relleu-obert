import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {decodeLandform,prepareCatalogueLandforms,carveCatalogueLandforms} from '../src/catalogue-landforms.js';
import {auditPart} from '../src/solid-audit.js';

test('a separate lower cut cannot block an opening in a cropped landform',async()=>{
  const api=await Module();
  api.setup();
  const solidMesh=(dimensions,offset)=>{
    const cube=api.Manifold.cube(dimensions);
    const solid=cube.translate(offset);
    try{
      const {vertProperties:vertices,triVerts:faces}=solid.getMesh();
      return {vertices,faces};
    }finally{solid.delete();cube.delete();}
  };
  const high=solidMesh([5,4,26],[7,110,-23]),low=solidMesh([5,4,8],[25,80,-8]);
  const source={id:'rock',kind:'landform',anchor:[0,0],landform:{minimumWidth:5},...decodeLandform({
    grid:{side:17,step:5,elevations:Array(17**2).fill(120)},
    void:{vertices:[...high.vertices,...low.vertices],faces:[...high.faces,...low.faces.map(i=>i+high.vertices.length/3)]}
  })};
  const datum={originMeters:100,minimumSurfaceMM:5};
  for(const width of [20,35]){
    const proj={width,height:20,scale:1,project:([lon,lat])=>[lon*111320,lat*111320]};
    const patches=prepareCatalogueLandforms([source],proj);
    assert.equal(patches[0].cutters.length,width===20?1:2);
    const original={id:'terrain',...solidMesh([width,20,25],[0,0,0])};
    const {applied,skipped,parts}=carveCatalogueLandforms([original],patches,api,datum,1);
    assert.equal(applied.length,1);
    assert.equal(skipped.length,0);
    assert.ok(Math.abs(applied[0].removedMM3-400)<.01);
    assert.deepEqual(auditPart(parts[0]).errors,[]);
  }
});
