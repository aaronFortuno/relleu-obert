import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {buildModel} from '../src/geometry.js';
import {physicalBBox} from '../src/selection.js';
import {polygonOps} from '../src/polygon-ops.js';

await init(await WebAssembly.compile(await readFile('node_modules/@jsquash/webp/codec/dec/webp_dec.wasm')));
const api=await Module();api.setup();
const pc=polygonOps();

test('Rajadell retains multiple joined piers at zoom out and at different physical sizes',async()=>{
  const prior=globalThis.fetch;
  try{
    globalThis.fetch=async url=>new Response(await readFile(new URL('../public/'+String(url).replace(/^\.\//,''),import.meta.url)));
    const data=await loadRegion({sample:'eix-diagonal',buildingSource:'osm',decodeElevation:async(b,t)=>decodeDEMTile(await b.arrayBuffer(),t,decode)});
    for(const [km,mm,centre] of [
      [1.5,150,[41.71792,1.78391]],
      [2.4,150,[41.71792,1.78391]],
      // The 3 km test must stay inside the four bundled DEM tiles.
      [3,150,[41.72213,1.779785]],
      [3,400,[41.72213,1.779785]],
    ]){
      const model=buildModel({...data,meta:{...data.meta,bbox:physicalBBox(centre,km,km)}},{size:mm,widthMM:mm,heightMM:mm,resolution:12,trees:false},()=>{},api);
      const detail=model.provenance.infrastructure.completion.details.find(b=>b.id==='ifc-127512');
      assert(detail,`bridge missing at ${km} km / ${mm} mm`);
      assert(detail.piers.length>=8,`too few piers at ${km} km / ${mm} mm: ${detail.piers.length}`);
      assert.equal(detail.connectedComponents,1);
      assert(detail.maxUnsupportedSpanMM<=detail.maxSpanMM,`unsupported span at ${km} km / ${mm} mm`);
      for(const pier of detail.piers){
        assert(pier.topRing.every(model.context.bridges.find(b=>b.id===detail.id).contains));
        for(const mask of [model.context.roadPoly,model.context.buildingMask,model.context.waterPoly])if(mask.length)assert.equal(pc.intersection([[pier.ring.concat([pier.ring[0]])]],mask).length,0);
        for(const p of pier.ring.concat(pier.topRing))assert(p[0]>=0&&p[0]<=mm&&p[1]>=0&&p[1]<=mm);
      }
    }
  }finally{globalThis.fetch=prior;}
});

test('procedural bridges whose deck is narrower than a 0.8 mm body keep connected tapered supports',()=>{
  const values=new Float32Array(121);
  for(let y=0;y<11;y++)values.set([50,40,30,20,10,0,10,20,30,40,50],y*11);
  const data={meta:{bbox:[0,0,.01,.01]},localDEM:{width:11,height:11,epsg:4326,affine:[.001,0,0,0,.001,0],pixelIsArea:false,values,metadata:{}},features:[
    {type:'Feature',id:'narrow',properties:{sourceLayer:'transportation',class:'primary',brunnel:'bridge',layer:1,width:8},geometry:{type:'LineString',coordinates:[[.001,.005],[.009,.005]]}},
  ]};
  for(const mm of [50,100]){
    const model=buildModel(data,{size:mm,widthMM:mm,heightMM:mm,resolution:12,trees:false},()=>{},api);
    assert.equal(model.provenance.infrastructure.proceduralCount,1);
    const detail=model.provenance.infrastructure.completion.details[0];
    assert(detail.piers.length>=5);assert.equal(detail.connectedComponents,1);
    assert(detail.piers.some(p=>p.topAcrossMM<p.acrossMM));
    for(const p of detail.piers){assert(p.acrossMM>=.8);assert(p.topAcrossMM>=.32);}
  }
});
