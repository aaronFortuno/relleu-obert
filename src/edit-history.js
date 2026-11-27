export const EDIT_HISTORY_LIMIT=20;
export const EDIT_HISTORY_MAX_BYTES=2*1024*1024;

const invalid=()=>Object.assign(Error('L’historial només admet ajustos en format JSON.'),{code:'EDIT_HISTORY_INVALID'});
const tooLarge=()=>Object.assign(Error('Els ajustos superen el límit de memòria de l’historial.'),{code:'EDIT_HISTORY_TOO_LARGE'});
const encoder=new TextEncoder();

// Keep snapshots as JSON, never as meshes, typed arrays or references to the
// editor's mutable data. Sorting keys makes a reordered settings object a no-op.
function encode(value){
  const ancestors=new Set();
  function clean(input){
    if(input===null||typeof input==='string'||typeof input==='boolean')return input;
    if(typeof input==='number'){if(!Number.isFinite(input))throw invalid();return input;}
    if(typeof input!=='object'||ancestors.has(input)||
      !Array.isArray(input)&&![Object.prototype,null].includes(Object.getPrototypeOf(input)))throw invalid();
    ancestors.add(input);
    let result;
    if(Array.isArray(input))result=Array.from(input,clean);
    else{
      result=Object.create(null);
      for(const key of Object.keys(input).sort())result[key]=clean(input[key]);
    }
    ancestors.delete(input);
    return result;
  }
  return JSON.stringify(clean(value));
}

// Peek before dispatching a calculation; move the cursor only once that
// calculation succeeds. A failed edit or undo leaves the same target available.
export function createEditHistory({limit=EDIT_HISTORY_LIMIT,maxBytes=EDIT_HISTORY_MAX_BYTES,normalize=value=>value}={}){
  if(!Number.isSafeInteger(limit)||limit<1||limit>EDIT_HISTORY_LIMIT||
    !Number.isSafeInteger(maxBytes)||maxBytes<1||typeof normalize!=='function')throw invalid();
  let entries=[],cursor=-1,bytes=0;
  function snapshot(state,label=null){
    const json=encode(normalize(JSON.parse(encode(state))));
    const size=encoder.encode(json).byteLength;
    if(size>maxBytes)throw tooLarge();
    return {json,bytes:size,label};
  }
  const stateAt=index=>entries[index]?JSON.parse(entries[index].json):null;
  function reset(state){
    const entry=snapshot(state);
    entries=[entry];cursor=0;bytes=entry.bytes;
  }
  function record(state,label='edit'){
    if(typeof label!=='string'||label.length>120)throw invalid();
    const entry=snapshot(state,label);
    if(cursor<0){reset(JSON.parse(entry.json));return false;}
    if(entry.json===entries[cursor].json)return false;
    entries=entries.slice(0,cursor+1);
    entries.push(entry);
    bytes=entries.reduce((sum,item)=>sum+item.bytes,0);
    while(entries.length>limit+1||bytes>maxBytes){bytes-=entries.shift().bytes;}
    cursor=entries.length-1;
    // The oldest retained snapshot is now the baseline, not an undoable action.
    entries[0].label=null;
    return true;
  }
  function commitUndo(){if(cursor<=0)return false;cursor--;return true;}
  function commitRedo(){if(cursor<0||cursor>=entries.length-1)return false;cursor++;return true;}
  return {
    reset,record,
    peekUndo:()=>cursor>0?stateAt(cursor-1):null,
    peekRedo:()=>cursor>=0&&cursor<entries.length-1?stateAt(cursor+1):null,
    commitUndo,commitRedo,
    get canUndo(){return cursor>0;},
    get canRedo(){return cursor>=0&&cursor<entries.length-1;},
    get undoLabel(){return cursor>0?entries[cursor].label:null;},
    get redoLabel(){return cursor>=0&&cursor<entries.length-1?entries[cursor+1].label:null;},
    get length(){return Math.max(0,entries.length-1);},
    get bytes(){return bytes;}
  };
}
