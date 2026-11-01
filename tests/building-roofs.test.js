import test from 'node:test';
import assert from 'node:assert/strict';
import {roofProfile} from '../src/building-roofs.js';
import {levelBuildingSolid,buildModel} from '../src/geometry.js';
const outline=[[2,2],[12,2],[12,10],[2,10],[2,2]],polys=[[outline]],p={'roof:shape':'gabled','roof:height':3,'roof:direction':0};
const closed=mesh=>{const edges=new Map();for(let i=0;i<mesh.faces.length;i+=3)for(let j=0;j<3;j++){const a=mesh.faces[i+j],b=mesh.faces[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');edges.set(key,(edges.get(key)||0)+1);}assert([...edges.values()].every(n=>n===2));};
test('gabled roof uses source height and downhill direction, with an exact ridge and closed bottom on slopes',()=>{
 const profile=roofProfile(p,outline,1,9),solid=levelBuildingSolid(polys,9,(x,y)=>3+y,20,20,3,profile);closed(solid);
 assert.equal(profile.factor(5,2),0);assert.equal(profile.factor(5,6),1);assert.equal(profile.factor(5,10),0);assert.equal(solid.roofShape,'gabled');assert.equal(solid.roof,22);
 let ridge=false,eave=false;for(let i=0;i<solid.vertices.length;i+=3){if(Math.abs(solid.vertices[i+1]-6)<1e-4&&Math.abs(solid.vertices[i+2]-22)<1e-4)ridge=true;if(Math.abs(solid.vertices[i+1]-2)<1e-4&&Math.abs(solid.vertices[i+2]-19)<1e-4)eave=true;}assert(ridge&&eave);
});
test('a rotated footprint keeps the geographical roof direction; incomplete and unsupported roofs stay flat',()=>{
 const rotation=35,a=rotation*Math.PI/180,rotate=([x,y])=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)],rotated=outline.map(rotate),spec=roofProfile(p,rotated,1,9,rotation),ridge=rotate([5,6]);assert(Math.abs(spec.factor(...ridge)-1)<1e-10);
 assert.equal(roofProfile({...p,'roof:height':undefined},outline,1,9).parts,null);assert.equal(roofProfile({...p,'roof:shape':'dome'},outline,1,9).parts,null);assert(roofProfile({...p,'roof:height':15},outline,1,9).fallback);
 const slope=roofProfile({...p,'roof:shape':'skillion'},outline,1,9);assert.equal(slope.factor(5,2),1);assert.equal(slope.factor(5,10),0);
});
test('limited mode keeps its validated flat roof even when roof metadata exists',()=>{
 const bbox=[0,0,.01,.01],house={type:'Feature',properties:{...p,sourceLayer:'building',render_height:9},geometry:{type:'Polygon',coordinates:[[[.002,.002],[.008,.002],[.008,.008],[.002,.008],[.002,.002]]]}};
 const data={meta:{bbox},features:[house],dem:[{z:0,x:0,y:0,size:2,elev:new Float32Array(4)}]},limited=buildModel(data,{size:50,resolution:2,trees:false}),source=buildModel(data,{size:50,resolution:2,trees:false,buildingMode:'source'});
 assert.equal(limited.provenance.buildingVolumes[0].roofShape,'flat');assert.equal(source.provenance.buildingVolumes[0].roofShape,'gabled');assert(source.warnings.some(w=>w.includes('cobertes inclinades')));
});
test('roof partitions preserve a courtyard and a clipped footprint without moving the ridge',()=>{
 const hole=[[4,4],[4,8],[8,8],[8,4],[4,4]],profile=roofProfile(p,outline,1,9),solid=levelBuildingSolid([[outline,hole]],9,()=>3,20,20,3,profile);closed(solid);
 for(let i=0;i<solid.faces.length;i+=3){const a=[...solid.faces.slice(i,i+3)].map(id=>[...solid.vertices.slice(id*3,id*3+3)]),area=(a[1][0]-a[0][0])*(a[2][1]-a[0][1])-(a[1][1]-a[0][1])*(a[2][0]-a[0][0]);if(Math.abs(area)<1e-7)continue;const x=a.reduce((s,v)=>s+v[0],0)/3,y=a.reduce((s,v)=>s+v[1],0)/3;assert(!(x>4+1e-6&&x<8-1e-6&&y>4+1e-6&&y<8-1e-6));}
 const clipped=levelBuildingSolid([[[[2,2],[12,2],[12,5],[2,5],[2,2]]]],9,()=>3,20,20,3,profile);assert(Math.max(...clipped.vertices.filter((_,i)=>i%3===2))<12);closed(clipped);
});
