import {subtractVoids} from './solid-voids.js';

// Call ONLY on the static surface layers, before adding buildings, trees,
// bridge decks and piers to the roads category. Returned parts keep their order.
const EXCAVATABLE=new Set(['terrain','roads','forest','grass']);
export function carveTerrainTunnels(surfaceParts,tunnels,api,limits={}){
  if(!Array.isArray(surfaceParts)||!Array.isArray(tunnels))throw Error('Cal una llista de capes i túnels.');
  if(!tunnels.length)return {parts:surfaceParts,warnings:[],metadata:{applied:false,count:0}};
  try{
    const selected=surfaceParts.filter(p=>EXCAVATABLE.has(p.id));
    const cut=subtractVoids({parts:selected},tunnels,api,limits),byId=new Map(cut.parts.map(p=>[p.id,p]));
    return {parts:surfaceParts.map(p=>byId.get(p.id)||p),warnings:[],metadata:{applied:true,count:tunnels.length,removedMM3:{...cut.voids.removed},profiles:tunnels.map(t=>({id:t.id,sourceFeatureIds:t.sourceFeatureIds,sourceEndpoints:t.sourceEndpoints,estimated:true,elevationMethod:t.elevationMethod,widthMM:t.widthMM,heightMM:t.heightMM,portalExtensionMM:t.portalExtensionMM,portalExtensionMetres:t.portalExtensionMetres}))}};
  }catch(error){
    // Atomic rollback: never leave some colours excavated and others sealed.
    return {parts:surfaceParts,warnings:[`No s’han pogut obrir els túnels experimentals; es conserva el terreny anterior. ${error.message}`],metadata:{applied:false,count:0,error:error.message}};
  }
}
