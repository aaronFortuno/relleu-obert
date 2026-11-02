import test from 'node:test';
import assert from 'node:assert/strict';
import {generateMajorRoadItems,majorRoadWidthMetres} from '../src/major-roads.js';

const M=111320,geo=(x,y=0)=>[x/M,y/M];
const feature=(points,props={},id='road')=>({type:'Feature',id,properties:{sourceLayer:'transportation',class:'trunk',...props},geometry:{type:'LineString',coordinates:points.map(p=>geo(...p))}});
const projection=(scale=.1,rotation=0,offset=[0,0])=>{
  const a=rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return {scale,project:([lon,lat])=>[(lon*M*c-lat*M*s)*scale+offset[0],(lon*M*s+lat*M*c)*scale+offset[1]],unproject:([x,y])=>{const u=(x-offset[0])/scale,v=(y-offset[1])/scale;return [(u*c+v*s)/M,(-u*s+v*c)/M];}};
};
const terrain=(lon,lat)=>100+.015*lon*M+1.5*Math.sin(lon*M*Math.PI/60)+.06*lat*M;
const road=feature([[0,0],[600,0]]),options={projection:projection()};
const close=(a,b,epsilon=1e-7)=>assert(Math.abs(a-b)<=epsilon,`${a} != ${b}`);

test('only motorway/trunk surface roads and links produce estimated platforms without modifying input',()=>{
  const features=['motorway','trunk','motorway_link','trunk_link','primary','track','rail'].map((c,i)=>feature([[0,i*100],[600,i*100]],{class:c},c));
  features.push(feature([[0,1000],[600,1000]],{brunnel:'bridge'},'bridge'),feature([[0,1200],[600,1200]],{brunnel:'tunnel'},'tunnel'));
  const before=JSON.stringify(features),r=generateMajorRoadItems(features,()=>100,options);
  assert.equal(r.items.length,4);assert.equal(JSON.stringify(features),before);assert.equal(r.metadata.terrainModified,false);
  assert.equal(r.metadata.method,'upper-envelope-dem');assert(!('sample' in r));
  for(const item of r.items){assert.equal(item.estimated,true);assert.equal(item.mainRoad,true);assert.equal(item.railway,false);assert(item.elevations.every(z=>z===100));assert.equal(item.elevationMethod,'upper-envelope-dem');}
  assert(r.warnings.some(w=>/No són cotes constructives/.test(w)));
});

test('global upper envelope remains above axis and BOTH edges with fixed original section endpoints',()=>{
  const {items,metadata}=generateMajorRoadItems([road],terrain,options),p=items[0];assert(p);
  close(p.elevations[0],p.sourceFloors[0]);close(p.elevations.at(-1),p.sourceFloors.at(-1));
  let previous=Infinity;
  for(let i=0;i<p.stations.length;i++){
    assert(p.elevations[i]>=p.sourceFloors[i]-1e-9);
    close(p.sourceFloors[i],p.sourceElevations[i]+.3);
    close(p.coordinates[i*2][2],p.coordinates[i*2+1][2]);close(p.axisXYZ[i][2],p.elevations[i]);
    if(i){const grade=(p.elevations[i]-p.elevations[i-1])/(p.stations[i]-p.stations[i-1]);assert(grade<=previous+1e-9);assert(Math.abs(grade)<=.12000001);previous=grade;}
  }
  assert(p.maximumLiftMetres>2);assert(p.maximumSectionLiftMetres>=p.maximumLiftMetres);assert(p.meanLiftMetres>0);
  close(metadata.maximumSourceLiftMetres,p.maximumSectionLiftMetres);assert(metadata.minimumFloorClearanceMetres>=-1e-8);
});

test('deck item topology has one flat cross-section per station and upward triangle winding',()=>{
  const p=generateMajorRoadItems([road],terrain,options).items[0];
  assert.equal(p.coordinates.length,p.stations.length*2);assert.equal(p.faces.length,(p.stations.length-1)*6);
  assert.equal(p.outlines.length,1);assert.deepEqual(p.outlines[0][0],p.outlines[0].at(-1));
  for(let i=0;i<p.faces.length;i+=3){
    const [a,b,c]=p.faces.slice(i,i+3).map(j=>p.coordinates[j]);
    assert((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>0);
  }
  assert.equal(p.coordinates.length,122);assert.deepEqual(p.axis,road.geometry.coordinates);
});

test('unambiguous fragments and reversed duplicates preserve the complete source envelope',()=>{
  const whole=generateMajorRoadItems([road],terrain,options).items[0],left=feature([[0,0],[300,0]],{},'left'),right=feature([[300,0],[600,0]],{},'right');
  const duplicate={...left,geometry:{...left.geometry,coordinates:left.geometry.coordinates.slice().reverse()}};
  const r=generateMajorRoadItems([right,duplicate,left],terrain,options);
  assert.equal(r.items.length,1);assert.deepEqual(r.items[0].sourceFeatureIds,['left','right']);
  assert.deepEqual(r.items[0].stations,whole.stations);assert.deepEqual(r.items[0].elevations,whole.elevations);
  const coordinateError=Math.max(...r.items[0].coordinates.flatMap((p,i)=>p.map((v,j)=>Math.abs(v-whole.coordinates[i][j]))));
  assert(coordinateError<1e-12,`Fragment coordinate error ${coordinateError}; source interpolation must agree within sub-micrometre precision.`);
});

test('branches and incompatible layers stay separate instead of becoming a false continuous axis',()=>{
  const left=feature([[0,0],[300,0]],{},'left'),right=feature([[300,0],[600,0]],{},'right'),branch=feature([[300,0],[300,100]],{class:'secondary'},'branch');
  assert.equal(generateMajorRoadItems([left,right,branch],()=>100,options).items.length,2);
  const levels=generateMajorRoadItems([left,{...right,properties:{...right.properties,layer:1}}],()=>100,options);
  assert.equal(levels.items.length,2);assert.deepEqual(levels.items.map(p=>p.layer).sort(),['0','1']);
});

test('crop and rotation retain original anchors, stations and geographic elevations',()=>{
  const a=generateMajorRoadItems([road],terrain,options).items[0],b=generateMajorRoadItems([road],terrain,{projection:projection(.05,37,[10,50]),bbox:[100/M,-10/M,500/M,10/M]}).items[0];
  assert(b);assert.deepEqual(a.stations,b.stations);
  for(let i=0;i<a.coordinates.length;i++)for(let j=0;j<3;j++)close(a.coordinates[i][j],b.coordinates[i][j]);
  assert.equal(a.sourceWidthMetres,b.sourceWidthMetres);assert.equal(a.widthMetres,b.widthMetres);
});

test('crop includes an outside axis whose rendered road enters the selected region',()=>{
  const r=generateMajorRoadItems([road],terrain,{...options,bbox:[100/M,4/M,500/M,20/M]});assert.equal(r.items.length,1);
  assert.deepEqual(r.items[0].elevations,generateMajorRoadItems([road],terrain,options).items[0].elevations);
  assert.equal(generateMajorRoadItems([road],terrain,{...options,bbox:[100/M,8/M,500/M,20/M]}).items.length,0);
  const small=generateMajorRoadItems([road],terrain,{projection:projection(.02),bbox:[100/M,10/M,500/M,20/M]});assert.equal(small.items.length,1);assert.equal(small.items[0].widthMetres,22);
});

test('shared width helper and rendered section edges match actual visible road widths',()=>{
  assert.equal(majorRoadWidthMetres({class:'primary'}),null);assert.equal(majorRoadWidthMetres({class:'trunk',railway:'rail'}),null);
  assert.equal(majorRoadWidthMetres({class:'motorway'}),14);assert.equal(majorRoadWidthMetres({class:'trunk'}),10);
  assert.equal(majorRoadWidthMetres({class:'trunk',ramp:1}),7);assert.equal(majorRoadWidthMetres({class:'motorway_link'}),7);
  assert.equal(majorRoadWidthMetres({class:'trunk',lanes:2}),6.4);assert.equal(majorRoadWidthMetres({class:'trunk',width:12}),12);
  const r=generateMajorRoadItems([road],terrain,{projection:projection(.02)}).items[0];assert.equal(r.widthMetres,22);assert.equal(r.sourceWidthMetres,10);
  for(let i=0;i<r.stations.length;i++){close(Math.abs(r.coordinates[i*2][1]-r.coordinates[i*2+1][1])*M,22);close(r.sourceFloors[i],r.sourceElevations[i]+.66);}
});

test('deep valleys and over-steep endpoints are omitted with an explicit reason; links use 16 percent',()=>{
  const valley=(lon)=>Math.abs(lon*M-300)<40?50:100;
  const a=generateMajorRoadItems([road],valley,options);assert.equal(a.items.length,0);assert.match(a.metadata.omissions[0].reason,/vall profunda/);
  const steep=lon=>100+.14*lon*M;
  const b=generateMajorRoadItems([road],steep,options);assert.equal(b.items.length,0);assert.match(b.metadata.omissions[0].reason,/pendent/);
  const c=generateMajorRoadItems([feature([[0,0],[600,0]],{ramp:1})],steep,options);assert.equal(c.items.length,1);assert.equal(c.items[0].maxGrade,.16);
});

test('water intersecting a platform footprint requires an identified bridge even between station samples',()=>{
  const water={type:'Feature',properties:{sourceLayer:'water'},geometry:{type:'Polygon',coordinates:[[[172,-20],[174,-20],[174,20],[172,20],[172,-20]].map(p=>geo(...p))]}};
  const r=generateMajorRoadItems([road,water],terrain,options);assert.equal(r.items.length,0);assert.match(r.metadata.omissions[0].reason,/aigua/);
  assert.equal(generateMajorRoadItems([feature([[0,0],[600,0]],{class:'trunk',railway:'rail'})],()=>100,options).items.length,0);
});

test('missing DEM, invalid geometry, short axes and folded/over-sharp bends fail locally',()=>{
  for(const missing of [()=>NaN,()=>{throw Error('missing');}]){const r=generateMajorRoadItems([road],missing,options);assert.equal(r.items.length,0);assert.match(r.metadata.omissions[0].reason,/DEM/);}
  const invalid=feature([[0,0],[600,0]]);invalid.geometry.coordinates[1][0]=NaN;assert.equal(generateMajorRoadItems([invalid],()=>100,options).items.length,0);
  assert.equal(generateMajorRoadItems([feature([[0,0],[20,0]])],()=>100,options).items.length,0);
  const bend=generateMajorRoadItems([feature([[0,0],[300,0],[300,300]])],()=>100,options);assert.equal(bend.items.length,0);assert.match(bend.metadata.omissions[0].reason,/revolt/);
});

test('unknown interior rail/bridge/tunnel crossings are omitted even when layer numbers differ',()=>{
  for(const props of [{class:'rail'},{brunnel:'bridge',layer:1},{brunnel:'tunnel',layer:-1}]){
    const crossing=feature([[173,-100],[173,100]],props,'crossing');
    const r=generateMajorRoadItems([road,crossing],terrain,options);
    assert.equal(r.items.length,0);assert.match(r.metadata.omissions[0].reason,/creuament interior/);
  }
});

test('mapped bridge/tunnel endpoint connection zones remain available without merging their axes',()=>{
  for(const brunnel of ['bridge','tunnel']){
    const connection=feature([[-100,0],[0,0]],{brunnel},'connection');
    const r=generateMajorRoadItems([road,connection],terrain,options);
    assert.equal(r.items.length,1);assert.deepEqual(r.items[0].sourceFeatureIds,['road']);
    assert.deepEqual(r.items[0].elevations,generateMajorRoadItems([road],terrain,options).items[0].elevations);
  }
});

test('an explicitly certified crossing is permitted and records its actual XY intersection',()=>{
  const crossing=feature([[173,-100],[173,100]],{brunnel:'bridge',layer:1},'surveyed-bridge'),calls=[];
  const r=generateMajorRoadItems([road,crossing],()=>100,{...options,allowCrossing:(otherFeature,pointXY)=>{calls.push({otherFeature,pointXY});return otherFeature.id==='surveyed-bridge';}});
  assert.equal(r.items.length,1);assert.equal(calls.length,1);assert.equal(calls[0].otherFeature,crossing);
  close(calls[0].pointXY[0],17.3);close(calls[0].pointXY[1],0);
  assert.equal(r.items[0].crossingChecks.length,1);assert.equal(r.items[0].crossingChecks[0].featureId,'surveyed-bridge');assert.equal(r.items[0].crossingChecks[0].allowed,true);
  assert.equal(r.metadata.crossingChecks.length,1);
  assert.equal(generateMajorRoadItems([road,crossing],()=>100,options).items.length,0);
});

test('generated-terrain constraints cover coarse model peaks while preserving original fine DEM arrays',()=>{
  const fine=()=>100,represented=(lon)=>100+8*Math.max(0,1-Math.abs(lon*M-300)/100);
  const r=generateMajorRoadItems([road],fine,{...options,renderedElevationAt:represented}),p=r.items[0];assert(p);
  assert.equal(r.metadata.reference,'source-and-generated-terrain');assert.equal(r.metadata.terrainModified,false);
  assert(p.sourceElevations.every(z=>z===100));assert(p.sourceFloors.every(z=>z===100));
  assert(Math.max(...p.renderedFloors)>=108-1e-8);
  for(let i=0;i<p.elevations.length;i++){assert(p.elevations[i]>=p.renderedFloors[i]-1e-8);close(p.originalConstraintFloors[i],Math.max(p.sourceFloors[i],p.renderedFloors[i]));}
  close(p.elevations[p.stations.indexOf(300)],108);
});

test('endpoint lift is opt-in and uses the least slope-limited upward constraints',()=>{
  const fine=()=>100,represented=(lon)=>100+10*Math.max(0,1-Math.min(Math.abs(lon*M-10),Math.abs(lon*M-590))/10);
  const unchanged=generateMajorRoadItems([road],fine,{...options,renderedElevationAt:represented});assert.equal(unchanged.items.length,0);assert.match(unchanged.metadata.omissions[0].reason,/pendent/);
  const r=generateMajorRoadItems([road],fine,{...options,renderedElevationAt:represented,allowEndpointLift:true,maxLiftMetres:30}),p=r.items[0];assert(p);
  assert.equal(r.metadata.allowEndpointLift,true);close(p.endpointLiftMetres[0],8.8);close(p.endpointLiftMetres[1],8.8);
  assert(p.sourceElevations.every(z=>z===100));assert(p.sourceFloors.every(z=>z===100));
  for(let i=1;i<p.stations.length;i++){
    assert(Math.abs(p.elevations[i]-p.elevations[i-1])/(p.stations[i]-p.stations[i-1])<=.120000001);
    assert(p.constraintFloors[i]>=p.originalConstraintFloors[i]-1e-8);
  }
});

test('off-model obstacles do not discard a visible road or modify its full source anchors',()=>{
  const projected={...projection(),width:20,height:10},axis=feature([[0,50],[600,50]],{},'main'),outside=feature([[400,-100],[400,200]],{class:'track',brunnel:'bridge'},'outside');
  const before=structuredClone(axis),r=generateMajorRoadItems([axis,outside],()=>100,{projection:projected}),whole=generateMajorRoadItems([axis],()=>100,{projection:projected});
  assert.equal(r.items.length,1);assert.equal(r.metadata.obstacleScope,'physical-roi');assert.equal(r.items[0].crossingChecks.length,0);
  assert.deepEqual(r.items[0].axis,whole.items[0].axis);assert.deepEqual(r.items[0].stations,whole.items[0].stations);assert.deepEqual(r.items[0].elevations,whole.items[0].elevations);assert.deepEqual(axis,before);
  const inside=feature([[100,-100],[100,200]],{class:'track',brunnel:'bridge'},'inside');
  const blocked=generateMajorRoadItems([axis,inside],()=>100,{projection:projected});assert.equal(blocked.items.length,0);assert.match(blocked.metadata.omissions[0].reason,/inside/);
});

test('rotated rectangular selections use the physical XY ROI instead of the geographic bbox',()=>{
  const projected={...projection(.1,90,[10,0]),width:12,height:25},axis=feature([[0,50],[600,50]],{},'main'),bbox=[0,-100/M,600/M,200/M];
  const outside=feature([[400,-100],[400,200]],{class:'track',brunnel:'bridge'},'outside'),inside=feature([[100,-100],[100,200]],{class:'track',brunnel:'bridge'},'inside');
  assert.equal(generateMajorRoadItems([axis,outside],()=>100,{projection:projected,bbox}).items.length,1);
  const blocked=generateMajorRoadItems([axis,inside],()=>100,{projection:projected,bbox});assert.equal(blocked.items.length,0);assert.match(blocked.metadata.omissions[0].reason,/inside/);
  const roi=[[[[0,0],[12,0],[12,25],[0,25],[0,0]]]],withoutDimensions=projection(.1,90,[10,0]);
  assert.equal(generateMajorRoadItems([axis,outside],()=>100,{projection:withoutDimensions,bbox,roi}).items.length,1);
  assert.equal(generateMajorRoadItems([axis,inside],()=>100,{projection:withoutDimensions,bbox,roi}).items.length,0);
});

test('water outside the physical crop cannot veto the visible part of a complete axis',()=>{
  const projected={...projection(),width:20,height:10},axis=feature([[0,50],[600,50]],{},'main');
  const water=x=>({type:'Feature',properties:{sourceLayer:'water'},geometry:{type:'Polygon',coordinates:[[[x-2,30],[x+2,30],[x+2,70],[x-2,70],[x-2,30]].map(p=>geo(...p))]}});
  assert.equal(generateMajorRoadItems([axis,water(400)],()=>100,{projection:projected}).items.length,1);
  const blocked=generateMajorRoadItems([axis,water(100)],()=>100,{projection:projected});assert.equal(blocked.items.length,0);assert.match(blocked.metadata.omissions[0].reason,/aigua/);
});

test('budgets and malformed options are explicit; same-id multipart axes keep distinct item identities',()=>{
  const roads=Array.from({length:3},(_,i)=>feature([[0,i*100],[600,i*100]],{},String(i)));
  const r=generateMajorRoadItems(roads,()=>100,{...options,maxItems:1});assert.equal(r.items.length,1);assert.equal(r.metadata.omitted,2);assert(r.warnings.some(w=>/límits/.test(w)));
  const multi={...road,geometry:{type:'MultiLineString',coordinates:[[[0,0],[600,0]],[[0,100],[600,100]]].map(line=>line.map(p=>geo(...p)))}};
  const items=generateMajorRoadItems([multi],()=>100,options).items;assert.equal(items.length,2);assert.notEqual(items[0].id,items[1].id);
  for(const bad of [{maxItems:100},{maxLiftMetres:31},{minRoadWidthMM:0},{stationMetres:1},{projection:{scale:0}},{bbox:[0,0,0,1]},{allowCrossing:true},{renderedElevationAt:true},{allowEndpointLift:'true'},{roi:[[[[0,NaN],[1,0],[0,1],[0,NaN]]]]}])assert.throws(()=>generateMajorRoadItems([road],terrain,{...options,...bad}),/invàlida/);
});
