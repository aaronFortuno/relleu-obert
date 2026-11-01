import fast from 'polygon-clipping';
import * as robust from 'polyclip-ts';
// Use the fast engine normally; retry numerical degeneracies with decimal
// arithmetic and a tolerance far below the cartographic/printing resolution.
export function polygonOps(precision=1e-6){
  return Object.fromEntries(['union','intersection','difference'].map(name=>[name,(...args)=>{
    try{return fast[name](...args);}catch{
      robust.setPrecision(precision);
      try{return robust[name](...args);}finally{robust.setPrecision();}
    }
  }]));
}
