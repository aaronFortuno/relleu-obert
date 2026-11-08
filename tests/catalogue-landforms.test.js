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
    // A closed but coplanar remnant at a material boundary is not a solid.
    const seam={id:'green',vertices:Float32Array.of(8,2,15.5,9,2,16.5,9,3,17.5,8,3,16.5),
      faces:Uint32Array.of(0,2,1,0,1,3,1,2,3,2,0,3)};
    const {applied,skipped,parts}=carveCatalogueLandforms([original,seam],patches,api,datum,1);
    assert.equal(applied.length,1);
    assert.equal(skipped.length,0);
    assert.ok(Math.abs(applied[0].removedMM3-400)<.01);
    assert.deepEqual(auditPart(parts[0]).errors,[]);
    assert.equal(parts.find(part=>part.id==='green').faces.length,0);
  }
});
