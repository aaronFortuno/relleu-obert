import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Module from 'manifold-3d';
import {bridgeDeck,archedTunnelVoid} from '../src/infrastructure-solids.js';
import {selectSurfaceComponents,removeCollapsedSurfaceComponents} from '../src/surface-components.js';
import {carveTransportDecks} from '../src/transport-carving.js';
import {carveTerrainTunnels} from '../src/tunnel-operations.js';
import {auditPart} from '../src/solid-audit.js';
import {uniteMaterials} from '../src/solid-operations.js';
import {Surface} from '../src/geometry.js';
const api=await Module();api.setup();
const fixture=JSON.parse(await readFile(new URL('./fixtures/rajadell-surface-slivers.json',import.meta.url)));
const part=name=>({id:'roads',name:'Camins',color:'#123456',vertices:new Float32Array(fixture[name].vertices),faces:new Uint32Array(fixture[name].faces)});
function box(id,x0=0,x1=100,z0=0,z1=20){return {id,name:id,color:'#123456',vertices:new Float32Array([x0,0,z0,x1,0,z0,x1,80,z0,x0,80,z0,x0,0,z1,x1,0,z1,x1,80,z1,x0,80,z1]),faces:new Uint32Array([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,2,3,7,2,7,6,0,4,7,0,7,3,1,2,6,1,6,5])};}
function combine(parts){
  const vertices=new Float32Array(parts.reduce((n,p)=>n+p.vertices.length,0)),faces=new Uint32Array(parts.reduce((n,p)=>n+p.faces.length,0));let v=0,f=0;
  for(const p of parts){vertices.set(p.vertices,v);for(let i=0;i<p.faces.length;i++)faces[f+i]=p.faces[i]+v/3;v+=p.vertices.length;f+=p.faces.length;}
  return {...parts[0],vertices,faces};
}
const cornerDeck={...bridgeDeck([[0,0,12],[100,0,12],[100,150,12]],2,.6),id:'deck',color:'#123456'},mask=[[[[-1,-1],[101,-1],[101,150],[99,150],[99,1],[-1,1],[-1,-1]]]];

test('material union recovers a positive thin component in its original position',()=>{
  const positive=part('positive');
  const [recovered]=uniteMaterials({parts:[positive]},api).parts;
  assert.equal(recovered.faces.length,positive.faces.length);
  assert.deepEqual(auditPart(recovered).bbox,auditPart(positive).bbox);
  assert.throws(()=>uniteMaterials({parts:[part('collapsed')]},api),/sòlid vàlid/);
});

test('a thin terrain prism uses the winding of its Float32 footprint',()=>{
  const surface=new Surface();
  surface.tri([4.1667,77.1389,15.69],[2.7713,77.2374,15.52],[2.2726,77.2726,15.45]);
  const mesh=surface.solid((_x,_y,z)=>z-.65);
  assert.deepEqual(auditPart(mesh).errors,[]);
  const [united]=uniteMaterials({parts:[{id:'railways',...mesh}]},api).parts;
  assert(auditPart(united).signedVolume>0);
});

test('real positive Float32 sliver outside a conservative deck footprint bypasses booleans unchanged',()=>{
  const positive=part('positive'),v=positive.vertices,det=(v[3]-v[0])*(v[7]-v[1])-(v[4]-v[1])*(v[6]-v[0]);
  assert.equal(det,7.33125489205122e-7);assert(det>0,'this real prism is positive, never an exact-zero cleanup candidate');
  const world=new api.Manifold(new api.Mesh({numProp:3,vertProperties:positive.vertices,triVerts:positive.faces}));try{assert.equal(world.volume(),0,'fixture must reproduce the position-sensitive Manifold tolerance');}finally{world.delete();}
  const selection=selectSurfaceComponents([positive],[cornerDeck],{categories:['roads'],footprints:[mask]});
  assert.equal(selection.candidates,0);assert.equal(selection.footprintExcluded,1);assert.strictEqual(selection.restore([])[0],positive);
  const result=carveTransportDecks([positive],[{mesh:cornerDeck,mask}],api);assert.equal(result.metadata.applied,true,result.warnings.join(' '));assert.strictEqual(result.parts[0],positive);
  assert.equal(result.metadata.footprintExcludedComponents,1);assert.equal(result.metadata.discardedZeroVolumeComponents,0);
});

test('a cutter without a footprint retains candidates even beside another masked cutter',()=>{
  const positive=part('positive'),unmasked=box('deck',50,60,11,13);
  for(let i=1;i<unmasked.vertices.length;i+=3)unmasked.vertices[i]+=100;
  const selection=selectSurfaceComponents([positive],[cornerDeck,unmasked],{categories:new Set(['roads']),footprints:[mask,undefined]});
  assert.equal(selection.candidates,1);assert.equal(selection.footprintExcluded,0);assert.strictEqual(selection.selected[0],positive);
});

test('cleanup removes only exact collapsed closed components and preserves real positive and 0.001 mm layers',()=>{
  const positive=part('positive'),collapsed=part('collapsed'),thin=box('roads',200,201,10,10.001);
  const planar={...collapsed,vertices:new Float32Array([80,0,0,80,1,0,80,1,1,80,0,1])};
  const vertical={...collapsed,vertices:new Float32Array([80,0,0,81,1,0,81,1,1,80,0,1])};
  const source=combine([positive,collapsed,planar,vertical,thin]),expected=combine([positive,thin]);
  const result=removeCollapsedSurfaceComponents([source]);assert.equal(result.count,3);assert.deepEqual({...result.byCategory},{roads:3});
  assert(result.parts[0].vertices.length===expected.vertices.length&&result.parts[0].vertices.every((v,i)=>v===expected.vertices[i]),'positive vertex buffers were changed');
  assert(result.parts[0].faces.length===expected.faces.length&&result.parts[0].faces.every((v,i)=>v===expected.faces[i]),'positive face buffers were changed');
  const open={...collapsed,faces:new Uint32Array([0,1,3])};assert.strictEqual(removeCollapsedSurfaceComponents([open]).parts[0],open,'an invalid open surface must not be silently removed');
});

function injectCollapsedFinalMaterial(target){
  const collapsed=part('collapsed'),Native=api.Manifold;let injected=false,finalCalls=0;
  const decorate=s=>{
    const subtract=s.subtract.bind(s),intersect=s.intersect.bind(s),getMesh=s.getMesh.bind(s);
    s.intersect=other=>decorate(intersect(other));
    s.subtract=other=>decorate(subtract(other));
    s.getMesh=()=>{
      const stack=new Error().stack;
      assert(stack.includes('fromSolid')&&stack.includes('tunnel-pavement.js'),'a Boolean intermediate must never be materialized');
      const m=getMesh();finalCalls++;
      if(!injected&&finalCalls===target){
        injected=true;
        const vertices=new Float32Array((m.numVert+collapsed.vertices.length/3)*m.numProp),faces=new Uint32Array(m.triVerts.length+collapsed.faces.length);
          vertices.set(m.vertProperties);faces.set(m.triVerts);
          for(let i=0;i<collapsed.vertices.length/3;i++)for(let k=0;k<3;k++)vertices[(m.numVert+i)*m.numProp+k]=collapsed.vertices[i*3+k];
          for(let i=0;i<collapsed.faces.length;i++)faces[m.triVerts.length+i]=collapsed.faces[i]+m.numVert;
          return {numVert:vertices.length/m.numProp,numProp:m.numProp,vertProperties:vertices,triVerts:faces};
      }
      return m;
    };return s;
  };
  const engine={...api,Manifold:new Proxy(Native,{construct(Target,args){return decorate(new Target(...args));},get(Target,key){if(key==='union')return (...args)=>decorate(Target.union(...args));return Reflect.get(Target,key);}})};
  return {engine,injected:()=>injected,finalCalls:()=>finalCalls};
}
function bore(){const path=[[-1,40,5],[101,40,5]];return {id:'test',...archedTunnelVoid(path,8,6),path,widthMM:8,heightMM:6,pavementCategory:'roads',pavementThicknessMM:.3,minimumBaseMM:2.5};}

test('an exact collapsed fragment in the final terrain materialization is removed and reported',()=>{
  const injected=injectCollapsedFinalMaterial(1),result=carveTerrainTunnels([box('terrain')],[bore()],injected.engine);assert(injected.injected());assert.equal(result.metadata.applied,true,result.warnings.join(' '));
  assert.equal(result.metadata.discardedZeroVolumeComponents,1);assert.equal(result.metadata.discardedZeroVolumeByCategory.terrain,1);assert.match(result.warnings[0],/volum exactament nul/);
  assert.equal(result.metadata.discardedZeroVolumeBeforeCutComponents,0);assert.equal(result.metadata.discardedZeroVolumeAfterCutComponents,1);
  assert.equal(injected.finalCalls(),2,'each final material must be materialized only once');
  for(const p of result.parts)assert.deepEqual(auditPart(p).errors,[]);
});

test('an exact collapsed fragment in the final pavement is cleaned without any intermediate cutter roundtrip',()=>{
  const injected=injectCollapsedFinalMaterial(2),source=[box('terrain')],before=structuredClone(source),result=carveTerrainTunnels(source,[bore()],injected.engine);
  assert(injected.injected());assert.equal(result.metadata.applied,true,result.warnings.join(' '));assert.deepEqual(source,before);
  assert.equal(result.metadata.discardedZeroVolumeComponents,1);assert.equal(result.metadata.discardedZeroVolumeByCategory.roads,1);
  assert.equal(result.metadata.discardedZeroVolumeBeforeCutComponents,0);assert.equal(result.metadata.discardedZeroVolumeAfterCutComponents,1);assert.match(result.warnings[0],/volum exactament nul/);
  assert.equal(injected.finalCalls(),2,'each final material must be materialized only once');
  assert(result.parts.find(p=>p.id==='roads')?.faces.length,'positive pavement must remain after cleaning the exact zero fragment');
  for(const p of result.parts)assert.deepEqual(auditPart(p).errors,[]);
});
