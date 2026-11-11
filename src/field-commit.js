const drafts=new WeakMap();

export const committedFieldValue=field=>drafts.get(field)??field.value;

export function bindFieldCommit(field,commit){
  field.addEventListener('focus',()=>drafts.set(field,field.value));
  field.addEventListener('blur',()=>{
    if(!drafts.has(field))return;
    const before=drafts.get(field);
    drafts.delete(field);
    if(field.value!==before)commit(before);
  });
  field.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.isComposing){
      event.preventDefault();
      field.blur();
    }
  });
}
