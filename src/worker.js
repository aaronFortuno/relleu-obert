import {buildModel} from './geometry.js';
import {threeMF,stlZip} from './export.js';
let current;
self.onmessage=({data})=>{try{
  if(data.type==='build'){current=buildModel(data.region,data.options,message=>self.postMessage({type:'progress',message}));self.postMessage({type:'model',model:current});}
  if(data.type==='export'){if(!current)throw Error('Genera primer el model.');const bytes=data.format==='3mf'?threeMF(current):stlZip(current);self.postMessage({type:'download',format:data.format,bytes},[bytes.buffer]);}
}catch(e){self.postMessage({type:'error',message:e.message,detail:e.stack});}};
