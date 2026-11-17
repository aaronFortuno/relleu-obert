import {CATEGORIES} from './materials.js';
import {selectSurfaceComponents,removeCollapsedSurfaceComponents} from './surface-components.js';
import {uniteMaterials} from './solid-operations.js';
import {subtractVoids} from './solid-voids.js';

const buildingMaterial=CATEGORIES.find(({id})=>id==='buildings');

// Walls replace the volume they occupy. Partition before applying the filament
// assignments so a slicer never has to choose between two overlapping colours.
export function withPrintableFences(model,mesh,api){
  if(!mesh?.faces.length)return model;
  const {categories}=model,{vertices,faces,footprint}=mesh,wallMesh={vertices,faces};
  const {selected,restore}=selectSurfaceComponents(categories,[wallMesh],
    {categories:categories.map(p=>p.id),footprints:[footprint]});
  const substrate=selected.filter(part=>part.id!=='buildings');
  const cut=substrate.length?subtractVoids({parts:substrate},[wallMesh],api).parts:[];
  const wall={...buildingMaterial,...wallMesh};
  const join=selected.find(part=>part.id==='buildings');
  const built=join?uniteMaterials({parts:[join,wall]},api).parts:[wall];
  const parts=restore(removeCollapsedSurfaceComponents([...cut,...built],{floatRoundoff:true}).parts)
    .filter(part=>part.faces.length);
  return {...model,categories:parts,parts,triangles:parts.reduce((n,p)=>n+p.faces.length/3,0)};
}
