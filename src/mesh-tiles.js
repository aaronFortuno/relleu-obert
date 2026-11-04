import {MAX_PRINT_TILE_MM,tilePlan} from './selection.js';
import {threeMF,stlZip} from './export.js';
import {zipSync,strToU8} from 'fflate';
// Clip solids, including buildings and crowns crossing a seam, and cap every cut.
export function splitModel(model,api,max=MAX_PRINT_TILE_MM,progress=()=>{}){
  const plan=tilePlan(model.width,model.height,max),solids=[];
  try{
    for(const part of model.parts){const mesh=new api.Mesh({numProp:3,vertProperties:part.vertices,triVerts:part.faces});mesh.merge();const solid=new api.Manifold(mesh);solids.push({part,solid});if(solid.status()!=='NoError')throw Error(`No es pot dividir la capa «${part.name}»: cal revisar-ne la malla.`);}
    return plan.tiles.map((tile,i)=>{
      progress(`Tancant la peça ${i+1}/${plan.tiles.length}…`);const parts=[];
      for(const {part,solid}of solids){let cut=solid;try{
        // Once a layer is absent from this piece, another trim of the empty
        // solid can produce NonFiniteVertex in Manifold. Do not trim it again.
        for(const [normal,offset]of [[[1,0,0],tile.x0],[[-1,0,0],-tile.x1],[[0,1,0],tile.y0],[[0,-1,0],-tile.y1]]){if(!cut.numTri())break;const next=cut.trimByPlane(normal,offset);if(cut!==solid)cut.delete();cut=next;}
        if(cut.status()!=='NoError')throw Error(`No s’ha pogut tancar ${tile.name}, capa «${part.name}» (${cut.status()}).`);
        const volume=cut.volume();if(!Number.isFinite(volume)||volume<0)throw Error(`Volum invàlid en dividir ${tile.name}, capa «${part.name}».`);
        // A neighbouring material tangent to a cut plane may retain triangles
        // with exactly zero volume. It is absent from this piece. Do not use a
        // positive epsilon: a genuinely thin positive-volume layer must stay.
        if(cut.numTri()&&volume>0){const mesh=cut.getMesh(),vertices=new Float32Array(mesh.numVert*3);for(let v=0;v<mesh.numVert;v++){vertices[v*3]=mesh.vertProperties[v*mesh.numProp]-tile.x0;vertices[v*3+1]=mesh.vertProperties[v*mesh.numProp+1]-tile.y0;vertices[v*3+2]=mesh.vertProperties[v*mesh.numProp+2];}parts.push({...part,vertices,faces:new Uint32Array(mesh.triVerts)});}
      }finally{if(cut!==solid)cut.delete();}}
      return {...model,parts,width:tile.width,height:tile.height,triangles:parts.reduce((n,p)=>n+p.faces.length/3,0),tile,provenance:{...model.provenance,tile,assembly:{width:model.width,height:model.height,columns:plan.cols,rows:plan.rows},name:`${model.provenance.name||'Maqueta'} · ${tile.name}`}};
    });
  }finally{for(const {solid}of solids)solid.delete();}
}
export function tileArchive(tiles,format){
  const files={'LLEGEIX-ME.txt':strToU8('Relleu Obert · peces en mm, amb talls tancats.\nFila 1 = costat superior del model; columna 1 = costat esquerre. Consulta el gir del retall a muntatge.json per situar el nord. Les peces mantenen la mateixa escala i exageració.\nCada peça té origen local (0,0) i es pot imprimir separadament.\nEls talls no inclouen encaixos ni toleràncies d’assemblatge. Revisa el laminat.\n')};
  for(const tile of tiles)files[tile.tile.name+(format==='stl'?'-stl.zip':'.3mf')]=format==='stl'?stlZip(tile):threeMF(tile,{bambu:format==='bambu'});
  files['muntatge.json']=strToU8(JSON.stringify(tiles.map(t=>t.provenance),null,2));return zipSync(files,{level:1});
}
