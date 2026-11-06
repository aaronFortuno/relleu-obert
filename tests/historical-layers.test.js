import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';
import {createHistoricalCatalog,matchHistoricalArea,applyHistoricalEdition,parseHistoricalEdition} from '../src/historical-layers.js';
import {buildModel,updateBuildings} from '../src/geometry.js';
import {threeMF} from '../src/export.js';
import {physicalBBox} from '../src/selection.js';

const catalog=createHistoricalCatalog(async name=>JSON.parse(await readFile(new URL('../public/data/historical/'+name,import.meta.url),'utf8')));
const areas=await catalog.areas();
const line=(id,coordinates,properties)=>({type:'Feature',id,geometry:{type:'LineString',coordinates},properties:{sourceLayer:'transportation',...properties}});
const rectangle=(west,south,east,north)=>[[west,south],[east,south],[east,north],[west,north],[west,south]];
const options={size:100,widthMM:100,heightMM:100,resolution:12,trees:false,baseThickness:5};
function localRegion(bbox,features){
  const [west,south,east,north]=bbox,dx=(east-west)/18,dy=(north-south)/18;
  return {meta:{bbox,name:'Control'},features,bridgeFeatures:[],localDEM:{width:21,height:21,epsg:4326,
    affine:[dx,0,west-dx,0,dy,south-dy],pixelIsArea:false,values:new Float32Array(441).fill(100),metadata:{}}};
}
const centerCrop=entry=>physicalBBox(entry.center,entry.widthM/1000,entry.widthM/1000);
const part=(model,id)=>model.categories.find(p=>p.id===id);

test('only two or more documented years covering the whole selection enable history',()=>{
  for(const entry of areas){
    const bbox=centerCrop(entry);
    assert.equal(matchHistoricalArea(areas,bbox),entry);
    assert.equal(matchHistoricalArea([{...entry,editions:entry.editions.slice(0,1)}],bbox),null);
    assert.equal(matchHistoricalArea(areas,[entry.bbox[0]-.001,bbox[1],bbox[2],bbox[3]]),null);
  }
  assert.equal(matchHistoricalArea(areas,[3.204,41.916,3.21,41.92]),null);
});

test('each carrilet is printable before closure, absent after closure, and independent from present roads',async()=>{
  for(const entry of areas.filter(a=>a.layer==='railways')){
    const bbox=centerCrop(entry),[w,s,e,n]=bbox;
    const road=line('modern-road',[[w,(s+n)/2],[e,(s+n)/2]],{class:'secondary'});
    const modernRail=line('modern-rail',[[w,s+(n-s)/4],[e,s+(n-s)/4]],{class:'rail',brunnel:'bridge'});
    const base={...localRegion(bbox,[road,modernRail]),bridgeFeatures:[modernRail],infrastructure:{items:[{railway:true,id:'rail'},{id:'road'}]}};
    const opened=applyHistoricalEdition(base,entry,1960,await catalog.edition(entry,1960));
    const closed=applyHistoricalEdition(base,entry,1980,await catalog.edition(entry,1980));
    assert.equal(base.features.length,2);
    assert.equal(closed.features.length,1);assert.equal(closed.features[0],road);
    assert.equal(closed.bridgeFeatures.length,0);
    assert.equal(closed.infrastructure.items.length,1);assert.equal(closed.infrastructure.items[0].id,'road');
    const m=buildModel({...opened,infrastructure:null},options),later=buildModel({...closed,infrastructure:null},options);
    assert(part(m,'railways')?.faces.length>0);
    assert.equal(part(later,'railways'),undefined);
    assert(part(m,'roads')?.faces.length>0&&part(later,'roads')?.faces.length>0);
    const afterBuildingUpdate=updateBuildings(m,{meta:base.meta,features:base.features},{maxBuildingHeight:3});
    assert.equal(afterBuildingUpdate.provenance.historical.year,1960);
    const zip=unzipSync(threeMF(later));
    assert.equal(JSON.parse(strFromU8(zip['Metadata/provenance.json'])).historical.year,1980);
  }
});

test('Avinyó years yield flat urban cover instead of current buildings, with real differences in geometry',async()=>{
  const entry=areas.find(a=>a.id==='avinyo-urban'),bbox=centerCrop(entry),[w,s,e,n]=bbox;
  const current={type:'Feature',id:'building',properties:{sourceLayer:'building',render_height:10},
    geometry:{type:'Polygon',coordinates:[rectangle(w+(e-w)*.2,s+(n-s)*.2,w+(e-w)*.25,s+(n-s)*.25)]}};
  const road=line('road',[[w,(s+n)/2],[e,(s+n)/2]],{class:'secondary'});
  const base=localRegion(bbox,[current,road]);
  const outputs=[];
  for(const year of [2009,2018,2024]){
    const converted=applyHistoricalEdition(base,entry,year,await catalog.edition(entry,year));
    assert.equal(converted.features.includes(current),false);
    assert(converted.features.includes(road));
    const m=buildModel(converted,{...options,buildingMode:'none'}),cover=part(m,'buildings');
    assert(cover?.faces.length>0);
    assert.equal(m.buildingCount,0);
    assert.equal(m.context.buildingGeometry.obstacleMask.length,0);
    assert.equal(m.provenance.historical.layer,'urban');
    for(let i=2;i<cover.vertices.length;i+=3)assert(cover.vertices[i]>=4.69&&cover.vertices[i]<=5.31);
    outputs.push(cover.faces.length);
  }
  assert.notEqual(outputs[0],outputs[2]);
  assert.throws(()=>parseHistoricalEdition({type:'FeatureCollection',features:[road]},entry,2009),/geometry/);
});

test('switching an urban edition and returning to current buildings reuses the terrain mesh',async()=>{
  const entry=areas.find(a=>a.id==='avinyo-urban'),bbox=centerCrop(entry),[w,s,e,n]=bbox;
  const original={type:'Feature',id:'building',properties:{sourceLayer:'building',render_height:10},
    geometry:{type:'Polygon',coordinates:[rectangle(w+(e-w)*.2,s+(n-s)*.2,w+(e-w)*.25,s+(n-s)*.25)]}};
  const base=localRegion(bbox,[original]);
  const current=buildModel(base,options),terrain=part(current,'terrain');
  let model=current;
  for(const year of [2009,2024]){
    const target=applyHistoricalEdition(base,entry,year,await catalog.edition(entry,year));
    model=updateBuildings(model,{features:target.features,meta:target.meta,historical:target.meta.historical},
      {historical:{areaId:entry.id,year}});
    assert.equal(model.provenance.historical.year,year);
    assert.equal(model.buildingCount,0);
    assert.ok(part(model,'buildings')?.faces.length);
    assert.ok(part(model,'terrain').vertices===terrain.vertices);
  }
  const restored=updateBuildings(model,{features:base.features,meta:base.meta,historical:null},{historical:null});
  assert.equal(restored.provenance.historical,undefined);
  assert.equal(restored.buildingCount,current.buildingCount);
  assert.ok(part(restored,'terrain').vertices===terrain.vertices);
});
