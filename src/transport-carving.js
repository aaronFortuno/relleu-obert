import {selectSurfaceComponents,removeCollapsedSurfaceComponents} from './surface-components.js';
import {subtractVoids} from './solid-voids.js';

const SUBSTRATE=new Set(['terrain','forest','grass','roads']);

// Replace only the original substrate INSIDE a road deck's own closed volume.
// The caller appends that same deck as road material after applied:true. This
// function neither raises/grades terrain nor constructs decks or supports.
export function carveTransportDecks(surfaceParts,decks,api,limits={},includeRailways=decks?.some(d=>d.railway)){
  if(!Array.isArray(surfaceParts)||!Array.isArray(decks))throw Error('Cal una llista de capes i taulers de carretera.');
  if(!decks.length)return {parts:surfaceParts,warnings:[],metadata:{applied:false,count:0}};
  try{
    const categories=includeRailways?new Set([...SUBSTRATE,'railways']):SUBSTRATE;
    const {finishDecks=[],...cutLimits}=limits;
    const allDecks=[...decks,...finishDecks],meshes=allDecks.map(d=>d.mesh??d);
    const {selected,restore,considered,candidates,footprintExcluded}=selectSurfaceComponents(surfaceParts,meshes,
      {categories,footprints:allDecks.map(d=>d.mask)});
    const cut=subtractVoids({parts:selected},meshes.slice(0,decks.length),api,
      {...cutLimits,finishCutters:meshes.slice(decks.length)});
    const floatRoundoff=limits.floatRoundoff===true;
    const cleaned=removeCollapsedSurfaceComponents(cut.parts,{floatRoundoff}),warnings=cleaned.count?[
      `S’han retirat ${cleaned.count} components col·lapsats de ${floatRoundoff?'gruix dins la tolerància numèrica':'volum exactament nul'} després de separar els materials de carretera.`]:[];
    return {parts:restore(cleaned.parts),warnings,metadata:{applied:true,count:meshes.length,consideredComponents:considered,excavatedCandidateComponents:candidates,footprintExcludedComponents:footprintExcluded,discardedZeroVolumeComponents:cleaned.count,discardedZeroVolumeByCategory:{...cleaned.byCategory},removedMM3:{...cut.voids.removed}}};
  }catch(error){
    return {parts:surfaceParts,warnings:[`No s’ha pogut assignar el volum dels taulers al material de carretera; es conserva el terreny anterior. ${error.message}`],metadata:{applied:false,count:0,error:error.message}};
  }
}
