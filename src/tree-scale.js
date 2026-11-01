export const TREE_CROWN_METRES=12,MIN_TREE_MM=.25;
export function treeDimensions(scale){
  if(!Number.isFinite(scale)||scale<=0)throw Error('Escala de vegetació invàlida.');
  const radius=TREE_CROWN_METRES/2*scale;
  return {radius,visible:radius*2>=MIN_TREE_MM,spacing:Math.max(2.1,radius*2.2)};
}
