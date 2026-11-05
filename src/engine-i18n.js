import rows from './locales/workshop-engine.js';

const exact=new Map(),patterns=[];
const fields=/\{([a-zA-Z]\w*)\}/g;
const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

for(const row of rows){
  const [source]=row,names=[];
  let previous=0,pattern='^';
  for(const field of source.matchAll(fields)){
    pattern+=escapeRegex(source.slice(previous,field.index))+'(.+?)';
    names.push(field[1]);
    previous=field.index+field[0].length;
  }
  if(names.length)patterns.push({regex:new RegExp(pattern+escapeRegex(source.slice(previous))+'$','u'),names,row});
  else exact.set(source,row);
}

export function translateDiagnostic(message,column,formatNumber){
  if(!column||typeof message!=='string')return message;
  const direct=exact.get(message);
  if(direct)return direct[column]??message;
  for(const {regex,names,row} of patterns){
    const match=regex.exec(message);
    if(!match)continue;
    const values=new Map(names.map((name,index)=>[name,match[index+1]]));
    return (row[column]??message).replace(fields,(_field,name)=>{
      const value=values.get(name);
      return /^(?:count|current|total|height|limit)$/.test(name)&&/^\d+$/.test(value)
        ?formatNumber(Number(value)):value;
    });
  }
  return message;
}
