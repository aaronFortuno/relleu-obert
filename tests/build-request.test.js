import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRequest} from '../src/build-request.js';
import {buildModel} from '../src/geometry.js';
import {physicalBBox} from '../src/selection.js';

test('both build modes receive a MET5 raster through the browser worker message',()=>{
  const bbox=physicalBBox([41.61107,1.78548],1.5,1.5);
  const terrainRaster={width:2,height:2,epsg:4326,pixelIsArea:true,
    affine:[bbox[2]-bbox[0],0,bbox[0]-.005,0,bbox[1]-bbox[3],bbox[3]+.005],
    values:new Float32Array([900,930,850,870])};
  const target={meta:{bbox,terrain:{provider:'ICGC MET5'}},features:[],dem:[],terrainRaster};
  for(const pureRelief of [true,false]){
    const message=structuredClone(buildRequest(target,{size:150,resolution:6,pureRelief,trees:false}));
    const model=buildModel(message.region,message.options);
    assert.equal(model.provenance.terrain.provider,'ICGC MET5');
    assert(model.triangles>0);
  }
});
