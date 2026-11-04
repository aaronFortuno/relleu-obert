// Shape convention for individual crowns in Model complet.
export const reliefCrownTaper=maximumElevation=>Math.max(0,Math.min(1,(maximumElevation-1000)/800));
export const alpineCrownHeightFactor=taper=>1+.5*taper;
