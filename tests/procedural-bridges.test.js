import test from 'node:test';
import assert from 'node:assert/strict';
import {generateProceduralBridgeItems} from '../src/procedural-bridges.js';
import {roadWidthMM} from '../src/transport-width.js';

const bridge=(coords,props={},id)=>({type:'Feature',id,properties:{sourceLayer:'transportation',brunnel:'bridge',class:'primary',...props},geometry:{type:'LineString',coordinates:coords}});
const flat=()=>100;

test('linear profile by accumulated distance between the two DEM endpoints; a valley does not pull the deck down',()=>{
  const f=bridge([[0,0],[0.001,0],[0.002,0]],{},'v');
  const valley=(lon)=>50+Math.abs(lon-0.001)*1e5; // extrems 150, centre DEM 50
  const {items,warnings}=generateProceduralBridgeItems([f],valley);
  assert.equal(items.length,1);assert.deepEqual(warnings,[]);
  const item=items[0];
  assert.equal(item.estimated,true);
  assert.equal(item.elevationMethod,'linear-dem-endpoints');
  assert.deepEqual([...new Set(item.coordinates.map(p=>p[2]))],[150]); // tauler lineal, no baixa a la vall
  const slope=generateProceduralBridgeItems([f],lon=>100+lon*1e4).items[0];
  const mid=slope.coordinates.filter(p=>Math.abs(p[0]-0.001)<1e-7);
  assert.equal(mid.length,2);
  for(const p of mid)assert(Math.abs(p[2]-110)<1e-6); // mitjana lineal entre 100 i 120
});

test('a smaller or shifted bbox keeps the same bridge XYZ; the profile is never clipped',()=>{
  const f=bridge([[0,0],[0.004,0]],{},'b');
  const el=lon=>100+lon*1e4;
  const full=generateProceduralBridgeItems([f],el).items[0];
  const {items}=generateProceduralBridgeItems([f],el,{bbox:[0.001,-0.01,0.002,0.01]});
  assert.equal(items.length,1);
  assert.deepEqual(items[0],full); // mateixes cotes i vèrtexs en un retall menor
  assert.equal(generateProceduralBridgeItems([f],el,{bbox:[1,1,2,2]}).items.length,0);
});

test('width: attribute, lanes or class table, with physical minimum and absurd values rejected',()=>{
  const trunk=bridge([[0,0],[0.002,0]],{class:'trunk'},'a');
  const path=bridge([[0,0.01],[0.002,0.01]],{class:'path'},'b');
  const lanes=bridge([[0,0.02],[0.002,0.02]],{lanes:'3'},'c');
  const absurd=bridge([[0,0.03],[0.002,0.03]],{width:'9000'},'d');
  const {items,warnings}=generateProceduralBridgeItems([trunk,path,lanes,absurd],flat);
  assert.equal(items.length,4);
  const byId=Object.fromEntries(items.map(i=>[i.sourceFeatureIds[0],i]));
  assert.equal(byId.a.widthMetres,10);
  assert(Math.abs(byId.b.widthMetres-4.4)<1e-9); // minWidthMM/scale = .44/.1
  assert(Math.abs(byId.c.widthMetres-9.6)<1e-9); // 3 carrils * 3.2
  assert.equal(byId.d.widthMetres,10); // amplada absurda rebutjada → política comuna primary
  assert.equal(warnings.length,1);assert.match(warnings[0],/rebutjada/);
  // amplada geomètrica del tauler ≈ widthMetres en pla mètric local
  const [L,R]=byId.a.coordinates;
  const width=Math.hypot((L[0]-R[0])*111320*Math.cos(L[1]*Math.PI/180),(L[1]-R[1])*111320);
  assert(Math.abs(width-10)<1e-6);
});

test('a distant path bridge uses the same width as its road continuation',()=>{
  const f=bridge([[0,0],[0.002,0]],{class:'path'},'path');
  const scale=.05;
  const estimated=generateProceduralBridgeItems([f],flat,{scale}).items[0];
  assert(Math.abs(estimated.widthMetres*scale-roadWidthMM(f.properties,scale))<1e-12);
  const overridden=generateProceduralBridgeItems([f],flat,{scale,minWidthMM:.44}).items[0];
  assert(Math.abs(overridden.widthMetres*scale-.44)<1e-12);
});

test('curve: mitered strip with coherent +Z faces and closed outline; hairpin omitted with warning',()=>{
  const l=bridge([[0,0],[0.001,0],[0.001,0.001]],{class:'residential'},'l');
  const hairpin=bridge([[0.01,0],[0.011,0],[0.010001,0.0001]],{class:'residential'},'h');
  const {items,warnings}=generateProceduralBridgeItems([l,hairpin],flat);
  assert.equal(items.length,1);assert.equal(warnings.length,1);assert.match(warnings[0],/revolt/);
  const item=items[0];
  assert.equal(item.coordinates.length,6);
  assert.equal(item.faces.length,12);
  for(let t=0;t<item.faces.length;t+=3){
    const [a,b,c]=item.faces.slice(t,t+3).map(k=>item.coordinates[k]);
    assert((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>0); // orientació positiva XY
  }
  const ring=item.outlines[0];
  assert.equal(ring.length,7);assert.deepEqual(ring[0],ring[ring.length-1]); // anell tancat
  // compatible amb projectInfrastructurePath (<=5000 coords XYZ finites)
  assert(item.coordinates.length<=5000&&item.coordinates.every(p=>p.length===3&&p.every(Number.isFinite)));
});

test('duplicate and reversed fragments dedupe; contiguous fragments of one road join into a single axis',()=>{
  const a=bridge([[0,0],[0.001,0]],{name:'X'},'a');
  const rev=bridge([[0.001,0],[0,0]],{name:'X'},'a-rev');
  const b=bridge([[0.001,0],[0.002,0]],{name:'X'},'b');
  const {items,warnings}=generateProceduralBridgeItems([a,rev,b],flat);
  assert.equal(items.length,1);assert.deepEqual(warnings,[]);
  assert.deepEqual(items[0].axis,[[0,0],[0.001,0],[0.002,0]]);
  assert.deepEqual([...items[0].sourceFeatureIds].sort(),['a','b']);
});

test('overlapping copies of the same tiled bridge use its two outer elevations in any input order',()=>{
  const id='same-way';
  const a=bridge([[0,0],[.001,0],[.002,0]],{},id);
  const b=bridge([[.004,.0002],[.002,0],[.0015,.000004]],{},id);
  const c=bridge([[.0037,.00017],[.0048,.00028],[.005,.0003]],{},id);
  const queried=[];
  const {items,warnings}=generateProceduralBridgeItems([a,b,c],(lon,lat)=>{
    queried.push([lon,lat]);
    return lon===0?180:190;
  });
  assert.deepEqual(warnings,[]);
  assert.equal(items.length,1);
  assert.deepEqual(queried,[[0,0],[.005,.0003]]);
  assert.deepEqual(items[0].sourceFeatureIds,[id]);
  assert.deepEqual(generateProceduralBridgeItems([c,b,a],lon=>lon===0?180:190).items,items);
});

test('overlap stitching rejects distinct IDs, lateral offsets and a same-ID fork',()=>{
  const a=bridge([[0,0],[.002,0]],{},'a');
  const b=bridge([[.001,0],[.003,0]],{},'b');
  const parallel=bridge([[.001,.00002],[.003,.00002]],{},'a');
  const matching={...b,id:'a'};
  const fork=bridge([[.0011,0],[.0022,0],[.003,.0003]],{},'a');
  assert.equal(generateProceduralBridgeItems([a,b],flat).items.length,2);
  assert.equal(generateProceduralBridgeItems([a,parallel],flat).items.length,2);
  assert.equal(generateProceduralBridgeItems([a,matching,fork],flat).items.length,3);
});

test('a contained tile copy does not reverse the Montgròs bridge at its shared endpoint',()=>{
  const east=[1.761980652809143,41.68925015293257];
  const axis=[east,[1.7613476514816284,41.68906988498435],[1.7607307434082031,41.688877598616074]];
  const props={class:'trunk',layer:1},id=317900710;
  const full=bridge(axis,props,id);
  const short=bridge([east,[1.761331558227539,41.689065879024184]],props,id);
  const fessona=bridge([[1.7701667547225952,41.689390360987545],[1.769120693206787,41.68945846193253]],props,id);
  const elevation=lon=>300+10000*(lon-1.76);
  const expected=generateProceduralBridgeItems([full,fessona],elevation);
  const reversed=bridge(short.geometry.coordinates.slice().reverse(),props,id);
  assert.equal(expected.items.length,2);
  assert.deepEqual(expected.warnings,[]);
  assert.deepEqual(generateProceduralBridgeItems([short,full,fessona],elevation),expected);
  assert.deepEqual(generateProceduralBridgeItems([fessona,full,reversed],elevation),expected);
});

test('contained tile matching preserves a short detour between matching endpoints',()=>{
  const id='way',line=bridge([[0,0],[.004,0]],{},id);
  const detour=bridge([[.001,0],[.00103,0],[.00111,.000015],[.00119,0],[.003,0]],{},id);
  const {items,warnings}=generateProceduralBridgeItems([line,detour],flat);
  assert.equal(items.length,2);
  assert.deepEqual(warnings,[]);
});

test('connected fragments keep real width changes and route identities independent of input order',()=>{
  const a=bridge([[0,0],[.002,0]],{name:'Same road',ref:'C-1',width:6},'narrow');
  const b=bridge([[.002,0],[.004,0]],{name:'Same road',ref:'C-1',width:10},'wide');
  const direct=generateProceduralBridgeItems([a,b],flat,{scale:.1}).items;
  assert.equal(direct.length,2,'different measured widths were merged into one arbitrary width');
  assert.deepEqual(direct.map(p=>p.widthMetres),[6,10]);
  assert.deepEqual(generateProceduralBridgeItems([b,a],flat,{scale:.1}).items,direct);
  const other={...b,properties:{...b.properties,width:6,ref:'C-2'}};
  assert.equal(generateProceduralBridgeItems([a,other],flat).items.length,2,'different route refs were joined');
});

test('overlapping bridge axes with different lane widths are not deduplicated',()=>{
  const a=bridge([[0,0],[.002,0]],{name:'Lane change',lanes:2},'two');
  const b=bridge([[.002,0],[0,0]],{name:'Lane change',lanes:3},'three');
  const direct=generateProceduralBridgeItems([a,b],flat).items;
  assert.equal(direct.length,2);assert.deepEqual(direct.map(p=>p.sourceWidthMetres).sort((x,y)=>x-y),[6.4,9.6]);
  assert.deepEqual(generateProceduralBridgeItems([b,a],flat).items,direct);
});

test('equivalent explicit and lane widths join without a floating-point width boundary',()=>{
  const a=bridge([[0,0],[.002,0]],{name:'Same',ref:'C-1',width:9.6},'explicit');
  const b=bridge([[.002,0],[.004,0]],{name:'Same',ref:'C-1',lanes:3},'lanes');
  const items=generateProceduralBridgeItems([a,b],flat).items;
  assert.equal(items.length,1);assert.equal(items[0].sourceWidthMetres,9.6);
  assert.deepEqual(items[0].sourceFeatureIds,['explicit','lanes']);
});

test('identical XY with different layer/class/name are kept as separate bridges; a reversed duplicate in the same group is still removed',()=>{
  const l1=bridge([[0,0],[0.002,0]],{layer:1,name:'P'},'l1');
  const l1rev=bridge([[0.002,0],[0,0]],{layer:1,name:'P'},'l1-rev');
  const l2=bridge([[0,0],[0.002,0]],{layer:2,name:'P'},'l2');
  const {items}=generateProceduralBridgeItems([l1,l1rev,l2],flat);
  assert.equal(items.length,2); // mateix XY però grups diferents: es conserven els dos
  const ids=items.flatMap(i=>i.sourceFeatureIds).sort();
  assert.deepEqual(ids,['l1','l2']); // el duplicat invertit del mateix grup s'elimina
});

test('the 200-bridge budget applies after the bbox filter: many bridges outside never evict one inside',()=>{
  const inside=bridge([[0,0],[0.001,0]],{layer:'in'},'inside');
  const outside=[];
  for(let i=0;i<250;i++)outside.push(bridge([[-10-i*0.01,0],[-10-i*0.01+0.001,0]],{layer:i},`out${i}`));
  const {items,warnings}=generateProceduralBridgeItems([...outside,inside],flat,{bbox:[-0.01,-0.01,0.01,0.01]});
  assert.equal(items.length,1);
  assert.deepEqual(items[0].sourceFeatureIds,['inside']);
  assert(!warnings.some(w=>/Pressupost de 200 ponts/.test(w)));
});

test('join budgets: at most 1000 fragments and 20000 points before merging, and a single line is capped, all with warnings',()=>{
  const frags=[];
  for(let i=0;i<1200;i++)frags.push(bridge([[i*0.001,0],[i*0.001+0.0005,0]],{layer:i},`f${i}`));
  const r=generateProceduralBridgeItems(frags,flat);
  assert(r.warnings.some(w=>/fragments omesos/.test(w)));
  assert(r.items.length<=200);
  const huge=Array.from({length:3000},(_,i)=>[i*1e-5,0.01]);
  const r2=generateProceduralBridgeItems([bridge(huge,{},'huge')],flat);
  assert.equal(r2.items.length,0); // Never truncate the axis and fabricate a DEM endpoint.
  assert(r2.warnings.some(w=>/omès.*superior al límit/.test(w)));
});

test('axis orientation is canonical by endpoint coordinates: fragment order never moves the pillars between tiles',()=>{
  const f1=bridge([[0.002,0],[0.001,0]],{name:'C'},'f1');
  const f2=bridge([[0.001,0],[0,0]],{name:'C'},'f2');
  const direct=generateProceduralBridgeItems([f1,f2],flat).items[0];
  const reversed=generateProceduralBridgeItems([f2,f1],flat).items[0];
  assert.deepEqual(direct.axis,[[0,0],[0.001,0],[0.002,0]]);
  assert.deepEqual(reversed,direct); // mateix eix, mateixes cotes i mateixa id
});

test('a line with NaN or out-of-range coordinates is rejected entirely, never joined across the gap',()=>{
  const ok=bridge([[0,0],[0.002,0]],{},'ok');
  const nan=bridge([[0.01,0],[NaN,0],[0.012,0]],{},'nan');
  const out=bridge([[0.02,0],[0.02,95],[0.022,0]],{},'out'); // lat fora de rang
  const {items,warnings}=generateProceduralBridgeItems([ok,nan,out],flat);
  assert.equal(items.length,1);
  assert.deepEqual(items[0].sourceFeatureIds,['ok']);
  assert.equal(warnings.length,2);
  assert(warnings.every(w=>/invàlida/.test(w)));
});

test('branches and different layers never join; tunnels are excluded',()=>{
  const a=bridge([[0,0],[0.001,0]],{},'a');
  const b=bridge([[0.001,0],[0.002,0]],{},'b');
  const c=bridge([[0.001,0],[0.001,0.001]],{},'c'); // bifurcació: grau 3
  const d=bridge([[0.002,0],[0.003,0]],{layer:2},'d'); // toca b però nivell diferent
  const tunnel=bridge([[0,0.01],[0.002,0.01]],{brunnel:'tunnel'},'t');
  const {items}=generateProceduralBridgeItems([a,b,c,d,tunnel],flat);
  assert.equal(items.length,4);
  assert(items.every(i=>i.axis.length===2)); // cap unió amb bifurcacions ni entre nivells
});

test('missing or NaN DEM at one bridge omits only that bridge with a warning; no fictitious model',()=>{
  const ok=bridge([[0,0],[0.002,0]],{},'ok');
  const bad=bridge([[0.01,0],[0.012,0]],{},'bad');
  const throwing=(lon)=>{if(lon>0.005)throw Error('sense dades');return 100;};
  let r=generateProceduralBridgeItems([ok,bad],throwing);
  assert.equal(r.items.length,1);assert.equal(r.items[0].sourceFeatureIds[0],'ok');
  assert.equal(r.warnings.length,1);assert.match(r.warnings[0],/omès/);
  r=generateProceduralBridgeItems([ok,bad],lon=>lon>0.005?NaN:100);
  assert.equal(r.items.length,1);assert.equal(r.warnings.length,1);
  assert(r.items[0].coordinates.every(p=>Number.isFinite(p[2])));
});

test('explicit budgets: 200 bridges and 1000 axis points; deterministic output',()=>{
  const many=[];
  for(let i=0;i<250;i++)many.push(bridge([[i*0.01,0],[i*0.01+0.001,0]],{layer:i},`b${i}`));
  const r1=generateProceduralBridgeItems(many,flat);
  assert.equal(r1.items.length,200);
  assert(r1.warnings.some(w=>/Pressupost/.test(w)));
  assert.deepEqual(r1,generateProceduralBridgeItems(many,flat));
  const longLine=Array.from({length:1500},(_,i)=>[i*1e-5,0]);
  const big=generateProceduralBridgeItems([bridge(longLine,{},'big')],flat);
  assert.equal(big.items.length,1);
  assert.equal(big.items[0].axis.length,1000);
  assert(big.items[0].coordinates.length<=5000);
  assert(big.warnings.some(w=>/reduït/.test(w)));
});
