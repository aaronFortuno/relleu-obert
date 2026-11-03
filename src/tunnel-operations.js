import {selectSurfaceComponents,removeCollapsedSurfaceComponents} from './surface-components.js';
import {tunnelPavements,carveTunnelMaterials} from './tunnel-pavement.js';

// Call ONLY on the static surface layers, before adding buildings, trees,
// bridge decks and piers. Protected layers retain their original buffers.
const EXCAVATABLE=new Set(['terrain','roads','railways','forest','grass']);
export function carveTerrainTunnels(surfaceParts,tunnels,api,limits={}){
  if(!Array.isArray(surfaceParts)||!Array.isArray(tunnels))throw Error('Cal una llista de capes i túnels.');
  if(!tunnels.length)return {parts:surfaceParts,warnings:[],metadata:{applied:false,count:0}};
  try{
    const pavementInputs=tunnelPavements(tunnels).map(p=>{
      const template=surfaceParts.find(q=>q.id===p.id);
      return {...p,color:template?.color??p.color,name:template?.name??p.name};
    });
    const {selected,restore,considered,candidates}=selectSurfaceComponents(surfaceParts,[...tunnels,...pavementInputs],{categories:EXCAVATABLE});
    const cut=carveTunnelMaterials(selected,tunnels,pavementInputs,api,limits);
    const cleaned=removeCollapsedSurfaceComponents(cut.parts),parts=restore(cleaned.parts),discarded=cleaned.count,discardedByCategory={...cleaned.byCategory};
    const warnings=discarded?[`S’han retirat ${discarded} components col·lapsats de volum exactament nul en obrir els túnels.`]:[];
    return {parts,warnings,metadata:{applied:true,count:tunnels.length,consideredComponents:considered,excavatedCandidateComponents:candidates,materialization:'single-final-float32-per-material',discardedZeroVolumeComponents:discarded,discardedZeroVolumeBeforeCutComponents:0,discardedZeroVolumeAfterCutComponents:cleaned.count,discardedZeroVolumeByCategory:discardedByCategory,removedMM3:{...cut.removed},pavements:cut.pavements,profiles:tunnels.map(t=>({id:t.id,sourceFeatureIds:t.sourceFeatureIds,sourceEndpoints:t.sourceEndpoints,pathMM:t.path,estimated:true,elevationMethod:t.elevationMethod,sectionProfile:t.sectionProfile,sectionMM:t.sectionMM,pavementCategory:t.pavementCategory,pavementThicknessMM:t.pavementThicknessMM,minimumBaseMM:t.minimumBaseMM,widthMM:t.widthMM,carriagewayWidthMM:t.carriagewayWidthMM,pavementSections:t.pavementSections,boreSectionMM:t.boreSectionMM,portalRouting:t.portalRouting,portalConnections:t.portalConnections,heightMM:t.heightMM,portalAdjustmentMM:t.portalAdjustmentMM,portalAdjustmentMetres:t.portalAdjustmentMetres,maximumPortalAdjustmentMetres:t.maximumPortalAdjustmentMetres,portalRampGrades:t.portalRampGrades,maximumPortalRampGrade:t.maximumPortalRampGrade,portalExtensionMM:t.portalExtensionMM,portalExtensionMetres:t.portalExtensionMetres}))}};
  }catch(error){
    return {parts:surfaceParts,warnings:[`No s’han pogut obrir els túnels experimentals; es conserva el terreny anterior. ${error.message}`],metadata:{applied:false,count:0,error:error.message}};
  }
}

// Keep the fast, atomic batch on success. On failure, retry against the
// original surfaces so a rejected tunnel never leaves a partial excavation.
export function carveAvailableTunnels(surfaceParts,tunnels,api){
  const batch=carveTerrainTunnels(surfaceParts,tunnels,api);
  if(!batch.metadata.error||tunnels.length<2)return {...batch,tunnels:batch.metadata.applied?tunnels:[]};
  const accepted=[],warnings=[];
  let result=batch;
  const retryLimit=8;
  for(const tunnel of tunnels.slice(0,retryLimit)){
    const trial=carveTerrainTunnels(surfaceParts,[...accepted,tunnel],api);
    if(trial.metadata.applied){accepted.push(tunnel);result=trial;}
    else warnings.push(`Túnel ${tunnel.id} omès. ${trial.metadata.error}`);
  }
  if(tunnels.length>retryLimit)warnings.push(`${tunnels.length-retryLimit} túnels pendents: s’ha assolit el límit de reintents de geometria.`);
  return {...result,tunnels:accepted,warnings:[...result.warnings,...warnings]};
}
