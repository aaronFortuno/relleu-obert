import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {unzipSync,strFromU8} from 'fflate';
import {layoutLabel,labelParts} from '../src/printable-label.js';
import {printableText} from '../src/label-font.js';
import {compassParts,northVector} from '../src/compass.js';
import {accessoryArchive} from '../src/accessory-export.js';
import {makeProjection} from '../src/geometry.js';
const api=await Module();api.setup();
const model={width:150,height:150,provenance:{name:'Tamariu · Palafrugell',bbox:[3.2,41.91,3.21,41.92],options:{selectionPose:{center:[41.918,3.2075],widthM:1000,heightM:1000,rotation:30}}}};
function solid(p){const mesh=new api.Mesh({numProp:3,vertProperties:p.vertices,triVerts:p.faces});return new api.Manifold(mesh);}
test('text educatiu: accents NFC, ela geminada, apòstrof i majúscules explícites; caràcters no suportats rebutjats',()=>{
 assert.equal(printableText('à é è í ï ó ò ú ü ç l·l d’aigua'),'À É È Í Ï Ó Ò Ú Ü Ç L·L D\'AIGUA');
 assert.equal(printableText('e\u0301'),'É');assert.throws(()=>printableText('<script>'));assert.throws(()=>printableText('🙂'));assert.throws(()=>printableText('a'.repeat(61)));
});
test('layout respecta marges, traç mínim i separació de línies amb accents',()=>{
 const l=layoutLabel({lines:['ÇÇ','ÉÉ','ÇÇ'],plateDepth:40});
 assert(l.strokeWidth>=.6);
 for(const r of l.rectangles){assert(r.x>=2-1e-6&&r.x+r.width<=98+1e-6);assert(r.y>=1.5-1e-6&&r.y+r.height<=38.5+1e-6);}
 for(const a of l.rectangles)for(const b of l.rectangles)if(a.line!==b.line)assert(!(Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+1e-6&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+1e-6));
 assert.throws(()=>layoutLabel({lines:['W'.repeat(60)]}),/no cap/);assert.throws(()=>layoutLabel({lines:['']}));assert.throws(()=>layoutLabel({lines:['A'],textHeight:NaN}));
});
test('placa és un sol sòlid connectat, relleu unit a la base, dimensions i geometria reproduïbles',()=>{
 const opts={lines:['BADIA','41.9180, 3.2075'],color:'#eee9dc'},a=labelParts(opts,api),b=labelParts(opts,api);
 assert.deepEqual(a.segments[0].vertices,b.segments[0].vertices);assert.deepEqual(a.segments[0].faces,b.segments[0].faces);
 const s=solid(a.segments[0]);try{assert.equal(s.status(),'NoError');assert(s.volume()>100*32*3);const parts=s.decompose();try{assert.equal(parts.length,1);}finally{parts.forEach(p=>p.delete());}const bb=s.boundingBox();assert(Math.abs(bb.max[2]-4.2)<1e-4);}finally{s.delete();}
});
test('nord concorda amb la projecció real a 0, ±30, ±90 i 180 graus, amb escales desiguals',()=>{
 for(const rotation of [0,30,-30,90,-90,180])for(const h of [150,200]){
  const pose={...model.provenance.options.selectionPose,rotation},p=makeProjection(model.provenance.bbox,200,{selectionPose:pose,widthMM:150,heightMM:h});
  const a=p.project([3.2075,41.918]),b=p.project([3.2075,41.919]),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),n=northVector(rotation,{sx:.15,sy:h/1000});
  assert(Math.abs(n.x-dx/len)<1e-6&&Math.abs(n.y-dy/len)<1e-6);
 }
 assert.throws(()=>northVector(NaN));assert.throws(()=>northVector(0,{sx:0,sy:1}));
});
test('disc i fletxa formen un sòlid i la punta exportada segueix el nord',()=>{
 const r=compassParts({rotation:30},api),p=r.segments[0],s=solid(p);
 try{assert.equal(s.status(),'NoError');assert(s.volume()>Math.PI*20*20*3*.99);const c=s.decompose();try{assert.equal(c.length,1);}finally{c.forEach(p=>p.delete());}}finally{s.delete();}
 let tip=-Infinity;for(let i=0;i<p.vertices.length;i+=3)if(p.vertices[i+2]>4.19)tip=Math.max(tip,(p.vertices[i]-20)*r.north.x+(p.vertices[i+1]-20)*r.north.y);
 assert(Math.abs(tip-14)<1e-3);
});
test('ZIP independent conserva terreny, coordenades i un únic filament per 3MF de cada peça',()=>{
 const before=structuredClone(model);
 for(const kind of ['marc','placa','nord']){
  const opts={lines:['TAMARIU'],color:'#123456',automaticCoordinates:[41.918,3.2075],coordinatesCustom:true};
  const r=accessoryArchive(kind,model,opts,api),files=unzipSync(r.bytes),manifest=JSON.parse(strFromU8(files['muntatge.json']));
  assert.equal(manifest.units,'millimeters');assert(manifest.parts.length>0);
  for(const part of manifest.parts){const inner=unzipSync(files[part.file+'.3mf']);const config=JSON.parse(strFromU8(inner['Metadata/project_settings.config']));assert.deepEqual(config.filament_colour,['#123456']);assert(files[part.file+'.stl'].length>84);assert.match(strFromU8(inner['3D/3dmodel.model']),/unit="millimeter"/);}
 }
 assert.deepEqual(model,before);assert.throws(()=>accessoryArchive('inventat',model,{},api));assert.throws(()=>accessoryArchive('marc',model,{bed:NaN},api));
});
