import base from './workshop-base.js';
import examples from './workshop-examples.js';
import guide from './workshop-guide.js';
import runtime from './workshop-runtime.js';
import workshop from './workshop-static.js';

export const WORKSHOP_LOCALES=['ca','es','gl','eu','en'];
export const workshopRows={...base,...workshop,...runtime,...examples,...guide};

export function workshopCatalog(column){
  return Object.fromEntries(Object.entries(workshopRows).map(([key,row])=>[key,row[column]]));
}
