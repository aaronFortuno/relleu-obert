export const BOUNDARY_LEVELS=['national','province','county','municipality'];
export const BOUNDARY_SAMPLES={
  cross:'+++++','cross-dot':'+·+·+','cross-dash':'+-+-+','cross-double-dash':'+--+--+',
  solid:'─────',dashed:'- - - - -',dotted:'···········','dash-dot':'-·-·-·-'
};
export const BOUNDARY_STYLES=['off',...Object.keys(BOUNDARY_SAMPLES)];
export const DEFAULT_BOUNDARY_PATTERNS={national:'cross',province:'cross-dot',county:'cross-dash',municipality:'cross-double-dash'};
export const DEFAULT_BOUNDARY_WIDTHS={national:3,province:2.5,county:2,municipality:1.5};
export const MIN_BOUNDARY_WIDTH=.6,MAX_BOUNDARY_WIDTH=6;
export const validBoundaryWidth=value=>Number.isFinite(value)&&value>=MIN_BOUNDARY_WIDTH&&value<=MAX_BOUNDARY_WIDTH;
export const defaultBoundaryStyles=()=>Object.fromEntries(BOUNDARY_LEVELS.map(level=>[level,'off']));
export const activeBoundaries=styles=>BOUNDARY_LEVELS.filter(level=>styles?.[level]&&styles[level]!=='off');
export const boundaryPattern=(level,styles,patterns)=>styles?.[level]&&styles[level]!=='off'?
  styles[level]:patterns?.[level]??DEFAULT_BOUNDARY_PATTERNS[level];
