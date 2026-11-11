export const BOUNDARY_LEVELS=['national','province','county','municipality'];
export const BOUNDARY_STYLES=['off','solid','dashed','dotted','dash-dot'];
export const defaultBoundaryStyles=()=>Object.fromEntries(BOUNDARY_LEVELS.map(level=>[level,'off']));
export const activeBoundaries=styles=>BOUNDARY_LEVELS.filter(level=>styles?.[level]&&styles[level]!=='off');
