import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import decode,{init} from '@jsquash/webp/decode.js';
import Module from 'manifold-3d';
import {loadRegion} from '../src/sources.js';
import {decodeDEMTile} from '../src/dem-decoder.js';
import {buildModel} from '../src/geometry.js';
import {physicalBBox} from '../src/selection.js';
import {auditPart} from '../src/solid-audit.js';
import {polygonOps} from '../src/polygon-ops.js';
import {lineBuffer} from '../src/roads.js';
import {threeMF} from '../src/export.js';
import {freemem} from 'node:os';

if(freemem()/2**30<2.5)throw Error('Calen almenys 2,5 GiB lliures per iniciar el control.');
await mkdir('output',{recursive:true});
const api=await Module();api.setup();
await init(await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url))));
globalThis.fetch=async url=>new Response(await readFile(new URL('../public/'+String(url).replace(/^\.\//,''),import.meta.url)));
const bridgeID=3522318132,lowerID=1820330450,crossing=[1.784274827,41.710875740];
const cases=[
  {id:'whole',centre:[41.71088,1.78427],km:.14,mm:84},
  {id:'crop',centre:[41.71089,1.78395],km:.065,mm:39},
  {id:'scale',centre:[41.71088,1.78427],km:.14,mm:56},
];
const results=[];
const clearanceFor=hits=>hits.at(-2).z-hits.at(-3).z;
for(const c of cases){
  const bbox=physicalBBox(c.centre,c.km,c.km);
  const data=await loadRegion({sample:'eix-diagonal',bbox,buildingSource:'osm',decodeElevation:async(blob,t)=>decodeDEMTile(await blob.arrayBuffer(),t,decode)});
  const loadedOverrides=data.infrastructure?.items?.length||0;
  const model=buildModel(data,{size:Math.max(50,c.mm),widthMM:c.mm,heightMM:c.mm,resolution:20,trees:false,estimatedTunnels:true},()=>{},api);
  const {ground,proj,verticalReference,options}=model.context;
  const deck=model.context.bridges.find(b=>b.sourceFeatureIds?.includes(bridgeID));assert(deck,c.id);
  const completion=model.provenance.infrastructure.completion.details.find(d=>d.id===deck.id);
  const lower=model.context.terrain.transport.filter(t=>t.sourceFeatureIds.includes(lowerID));
  assert(lower.length);
  const lowerMask=lower.flatMap(t=>lineBuffer(t.points,t.width/2,[c.mm,c.mm]));
  const [x,y]=proj.project(crossing),inside=x>=0&&x<=c.mm&&y>=0&&y<=c.mm;
  const top=inside?deck.top(x,y):null;
  const physicalToGeo=z=>verticalReference.originMeters+(z-5)/(proj.scale*options.exaggeration);
  const audits=model.categories.map(auditPart).map(({id,errors})=>({id,errors}));
  const ends=deck.axis.map(p=>p.slice(0,2)).filter((p,i,a)=>!i||i===a.length-1).map(([x,y])=>x>=0&&x<=c.mm&&y>=0&&y<=c.mm);
  const pierConflicts=completion.piers.filter(p=>lowerMask.length&&polygonOps().intersection([[p.ring.concat([p.ring[0]])]],lowerMask).length).length;
  const roads=model.categories.find(part=>part.id==='roads');
  const triangleHeights=([x,y])=>{
    const hits=[];
    for(let i=0;i<roads.faces.length;i+=3){
      const [a,b,c]=Array.from(roads.faces.subarray(i,i+3),j=>roads.vertices.subarray(3*j,3*j+3));
      const det=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      if(Math.abs(det)<1e-10)continue;
      const u=((x-a[0])*(c[1]-a[1])-(y-a[1])*(c[0]-a[0]))/det,v=((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/det;
      if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)hits.push({z:a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]),up:det>0});
    }
    return hits.sort((a,b)=>a.z-b.z);
  };
  const measuredLandings=completion.approaches.map(({sections})=>{
    const a=sections.at(-2).centre,b=sections.at(-1).centre,d=Math.hypot(b[0]-a[0],b[1]-a[1]);
    return [-.01,.01].map(offset=>{
      const hits=triangleHeights([b[0]+offset*(b[0]-a[0])/d,b[1]+offset*(b[1]-a[1])/d]).filter(hit=>hit.up);
      return hits.length?hits.at(-1).z-b[2]:null;
    });
  });
  const crossingSurfaces=inside?triangleHeights([x,y]):[];
  const result={...c,loadedOverrides,estimated:deck.estimated,deckId:deck.id,ends,measuredLandings,crossingSurfaces,crossingTopMetres:top!=null?physicalToGeo(top):null,clearanceMM:top!=null?top-deck.thickness-ground(x,y):null,piers:completion.piers.length,pierConflicts,maximumSpanMM:completion.maxUnsupportedSpanMM,joins:completion.approaches.length,unconnected:completion.unconnectedEnds,audits};
  results.push(result);
  console.log(JSON.stringify(result));
  assert.equal(loadedOverrides,0);
  assert.equal(deck.estimated,true);
  assert.equal(pierConflicts,0);
  assert(audits.every(a=>a.errors.length===0));
  assert(crossingSurfaces.length>=4&&clearanceFor(crossingSurfaces)>3);
  assert(measuredLandings.every(pair=>pair.every(z=>z!=null&&Math.abs(z)<.005)));
  assert.equal(completion.approaches.length,ends.filter(Boolean).length);
  if(c.id==='crop'){
    assert.equal(completion.piers.length,2);
    assert(completion.maxUnsupportedSpanMM<10);
    await writeFile('output/RO-033-cupo-pas-inferior.3mf',threeMF(model,{bambu:true}));
  }
}
assert(Math.max(...results.map(r=>r.crossingTopMetres))-Math.min(...results.map(r=>r.crossingTopMetres))<.001);
await writeFile('output/ro033-pas-inferior.json',JSON.stringify(results,null,2)+'\n');
