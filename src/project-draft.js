import {validatedSettings} from './project-library.js';

export const PROJECT_DRAFT_KEY='relleu-obert.draft';
export const MAX_PROJECT_DRAFT_BYTES=2*1024*1024;
const VERSION=1;
const fail=(code,cause)=>Object.assign(new Error(code,{cause}),{code});
const bytes=text=>new TextEncoder().encode(text).byteLength;

function storageFailure(cause){
  return fail(['QuotaExceededError','NS_ERROR_DOM_QUOTA_REACHED'].includes(cause?.name)?'DRAFT_QUOTA':'DRAFT_STORAGE',cause);
}
function storedValue(storage){
  try{return storage.getItem(PROJECT_DRAFT_KEY);}
  catch(cause){throw storageFailure(cause);}
}
function decode(raw){
  if(typeof raw!=='string')throw fail('DRAFT_INVALID');
  if(bytes(raw)>MAX_PROJECT_DRAFT_BYTES)throw fail('DRAFT_TOO_LARGE');
  try{
    const value=JSON.parse(raw);
    if(value?.version!==VERSION||typeof value.savedAt!=='string'||
      new Date(value.savedAt).toISOString()!==value.savedAt)throw Error();
    return {savedAt:value.savedAt,settings:validatedSettings(value.settings)};
  }catch(cause){throw fail('DRAFT_INVALID',cause);}
}

// Recovery never changes storage, even if a newer version or a damaged record
// cannot be read. Only an explicit discard may clear that previous draft.
export function readProjectDraft(storage){
  const raw=storedValue(storage);
  return raw===null?null:decode(raw);
}

export function writeProjectDraft(storage,settings,{now=new Date()}={}){
  let clean,savedAt;
  try{
    if(!(now instanceof Date)&&typeof now!=='string'&&typeof now!=='number'||
      typeof now==='number'&&!Number.isFinite(now))throw Error();
    savedAt=new Date(now).toISOString();
    clean=validatedSettings(settings);
  }catch(cause){throw fail('DRAFT_INVALID',cause);}
  const raw=JSON.stringify({version:VERSION,savedAt,settings:clean});
  if(bytes(raw)>MAX_PROJECT_DRAFT_BYTES)throw fail('DRAFT_TOO_LARGE');
  // A scheduled save cannot erase an unreadable previous draft before the
  // user has had a chance to recover or explicitly discard it.
  const previous=storedValue(storage);
  if(previous!==null)decode(previous);
  try{storage.setItem(PROJECT_DRAFT_KEY,raw);}
  catch(cause){throw storageFailure(cause);}
  return {savedAt,settings:clean};
}

export function clearProjectDraft(storage){
  if(storedValue(storage)===null)return false;
  try{storage.removeItem(PROJECT_DRAFT_KEY);}
  catch(cause){throw storageFailure(cause);}
  return true;
}
