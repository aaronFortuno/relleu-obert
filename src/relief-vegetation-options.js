export const RELIEF_VEGETATION_DEFAULTS={vegetationHeight:.8,vegetationNoise:45};
export const validVegetationHeight=value=>Number.isFinite(value)&&value>=.2&&value<=2;
export const validVegetationNoise=value=>Number.isInteger(value)&&value>=0&&value<=100;
