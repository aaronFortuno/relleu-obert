// Full-region loads may recover using another source. Incremental edits instead
// keep the last accepted layer/configuration in main.js.
import {buildingProviderLabel} from './source-options.js';
export async function loadBuildingsRecoverably(load,source,fallbacks=[]){
  let original;
  for(const candidate of [...new Set([source,...fallbacks])]){
    try{
      const layer=await load(candidate);
      if(candidate===source)return layer;
      const notice=`No s’ha pogut carregar ${buildingProviderLabel(source)}. S’ha utilitzat ${buildingProviderLabel(candidate)} per generar el territori.`;
      return {...layer,warnings:[...layer.warnings,notice],recovery:{requested:source,selected:candidate,reason:original.message,notice}};
    }catch(e){original??=e;}
  }
  throw original;
}
