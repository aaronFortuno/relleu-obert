// Small, explicitly requested geographic exceptions. General bridges must
// work without this registry; it is not a worldwide structure catalogue.
export const INFRASTRUCTURE_OVERRIDES=[{
  id:'rajadell-sample',bbox:[1.7748839251728468,41.71118266618757,1.7929360748271534,41.72465733381243],
  file:'eix-diagonal-decks.json',layouts:'eix-diagonal-layouts.json'
}];
const caches=new WeakMap();
const intersects=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
const itemBBox=item=>{const p=item.coordinates;return [Math.min(...p.map(p=>p[0])),Math.min(...p.map(p=>p[1])),Math.max(...p.map(p=>p[0])),Math.max(...p.map(p=>p[1]))];};
export async function loadInfrastructureOverrides(bbox,readJSON){
  if(!Array.isArray(bbox)||bbox.length!==4||!bbox.every(Number.isFinite)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3])throw Error('Retall d’infraestructures invàlid.');
  if(typeof readJSON!=='function')throw Error('Cal un lector de dades d’infraestructures.');
  const matches=INFRASTRUCTURE_OVERRIDES.filter(p=>intersects(bbox,p.bbox));if(!matches.length)return null;
  let cache=caches.get(readJSON);if(!cache){cache=new Map();caches.set(readJSON,cache);}
  const read=name=>{if(!cache.has(name)){const pending=Promise.resolve().then(()=>readJSON(name));cache.set(name,pending);pending.catch(()=>{if(cache.get(name)===pending)cache.delete(name);});}return cache.get(name);};
  const items=[],scopes=[],layoutItems={};let first,layoutSource;
  for(const entry of matches){
    const data=await read(entry.file);if(!Array.isArray(data?.items))throw Error('Dades detallades dels ponts invàlides.');
    const selected=data.items.filter(item=>intersects(bbox,itemBBox(item)));if(!selected.length)continue;
    first??=data;items.push(...selected);scopes.push({id:entry.id,bbox:entry.bbox});
    if(entry.layouts){const layout=await read(entry.layouts);layoutSource??=layout;for(const item of selected)if(layout.items?.[item.id])layoutItems[item.id]=layout.items[item.id];}
  }
  return items.length?{...first,items,scopes,selection:'geographic override, independent of sample mode',layouts:layoutSource?{...layoutSource,items:layoutItems}:undefined}:null;
}
