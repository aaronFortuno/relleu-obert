// Synthetic specimens only. Run from the repository: node scripts/solid-control.mjs [--large]
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {zipSync,unzipSync,strToU8} from 'fflate';
import {solidPart,translateSolid} from '../src/accessory-solids.js';
import {subtractVoids} from '../src/solid-voids.js';
import {splitModel,tileArchive} from '../src/mesh-tiles.js';
import {threeMF} from '../src/export.js';

const large=process.argv.includes('--large'),width=large?400:40,height=large?120:24;
const api=await Module();api.setup();
function box(id,color,size,at){
  const s=translateSolid(api.Manifold.cube(size),at);
  try{return solidPart(s,id,id,color);}finally{s.delete();}
}
const model={width,height,triangles:48,provenance:{
  name:'CONTROL SINTÈTIC · NO és un túnel real',source:'Geometria sintètica, sense dades de territori',
  units:'millimeters',dimensions:[width,height,12],tunnel:{section:[4,4],bottom:5,axis:'X'},baseThickness:5
},parts:[
  box('soil','#c6b38d',[width,height,5],[0,0,0]),
  box('soil','#c6b38d',[width/2,height,7],[0,0,5]),
  box('forest','#4e8966',[width/4,height,7],[width/2,0,5]),
  box('road','#eee9dc',[width/4,height,7],[width*.75,0,5])
]};
const cut=subtractVoids(model,[box('void','#000000',[width+2,4,4],[-1,height/2-2,5])],api);
cut.provenance={...model.provenance,voids:cut.voids};
const tiles=splitModel(cut,api,large?200:24);
assert.equal(tiles.length,2);assert(tiles.every(t=>t.width===width/2&&t.height===height));
let volume=0,tileVolume=0;
for(const m of [cut,...tiles])for(const p of m.parts){
  const s=new api.Manifold(new api.Mesh({numProp:3,vertProperties:p.vertices,triVerts:p.faces}));
  try{
    assert.equal(s.status(),'NoError');
    assert.equal(s.rayCast([-1,height/2,7],[m.width+1,height/2,7]).length,0);
    if(m===cut)volume+=s.volume();else tileVolume+=s.volume();
  }finally{s.delete();}
}
const expected=width*height*12-width*4*4;
assert(Math.abs(volume-expected)<.01);assert(Math.abs(tileVolume-expected)<.01);
const files=unzipSync(tileArchive(tiles,'bambu'));files['control-sencer.3mf']=threeMF(cut,{bambu:true});
files['LLEGEIX-ME.txt']=strToU8(`CONTROL SINTÈTIC · Relleu Obert\nNo correspon a un túnel real.\nSencer: ${width} × ${height} × 12 mm. Dues peces: ${width/2} × ${height} × 12 mm, sense encaixos ni tolerància.\nPas recte de 4 × 4 mm, fons a Z=5 mm; base intacta de 5 mm.\nObre control-sencer.3mf o les dues peces per separat. No imprimeixis totes les variants alhora si només vols una prova.\nComprova colors, escala, pas obert als portals i al tall, base i pont de 4 mm al laminador.\nValidació física pendent; decideix suports i paràmetres al laminador.\n`);
const output=new URL('../output/',import.meta.url);await mkdir(output,{recursive:true});
const filename=large?'solid-control-grand.zip':'solid-control-petit.zip';
await writeFile(new URL(filename,output),zipSync(files,{level:6}));
console.log({file:'output/'+filename,dimensions:[width,height,12],tiles:tiles.length,volume,expectedVolume:expected,clearRay:true});
