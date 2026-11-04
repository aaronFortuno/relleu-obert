import fast from 'polygon-clipping';
import * as robust from 'polyclip-ts';
// Use the fast engine normally; retry numerical degeneracies with decimal
// arithmetic and a tolerance far below the cartographic/printing resolution.
export function polygonOps(precision=1e-6,{recoverMillimetreUnions=false}={}){
  return Object.fromEntries(['union','intersection','difference'].map(name=>[name,(...args)=>{
    try{return fast[name](...args);}catch{
      let last;
      for(const tolerance of [precision,precision*10,precision*100]){
        robust.setPrecision(tolerance);
        try{return robust[name](...args);}catch(error){last=error;}finally{robust.setPrecision();}
      }
      // Quantize the input too: tolerances alone cannot repair coincident
      // segments already rounded differently by preceding intersections.
      // A projected union can retry at 0.001 and 0.01 mm after the usual snap.
      const factors=recoverMillimetreUnions&&name==='union'?[1e4,1e3,1e2]:[1e4];
      for(const factor of factors){
        const quantize=value=>typeof value==='number'?Math.round(value*factor)/factor:Array.isArray(value)?value.map(quantize):value;
        const snapped=args.map(quantize);
        try{return fast[name](...snapped);}catch{}
        robust.setPrecision(precision*100);
        try{return robust[name](...snapped);}catch{}finally{robust.setPrecision();}
      }
      throw last;
    }
  }]));
}
