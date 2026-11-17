import {formatNumber,t} from './i18n.js';
import {bindFieldCommit,committedFieldValue} from './field-commit.js';
import {MAX_BASIC_OBJECTS,MIN_BASIC_OBJECT_SIZE_MM,MAX_BASIC_OBJECT_SIZE_MM} from './basic-object-settings.js';

const text=(key,params)=>t('runtime.object.'+key,params);
const sizeLimits=[MIN_BASIC_OBJECT_SIZE_MM,MAX_BASIC_OBJECT_SIZE_MM];
const limits={widthMM:sizeLimits,depthMM:sizeLimits,heightMM:sizeLimits,rotation:[-180,180]};

export function createBasicObjectEditor(root,{records,levels,available,isPlacing,start,cancel,submit,select}){
  const get=selector=>root.querySelector(selector);
  const shape=get('#object-shape'),place=get('[data-brush="object"]'),move=get('#object-move');
  const done=get('#object-done'),list=get('#object-list'),level=get('#object-level'),feedback=get('#object-feedback');
  const fields=Object.fromEntries(Object.keys(limits).map(key=>[key,get('[data-object-field="'+key+'"]')]));
  let selected=null,message='';

  function say(key=''){
    message=key;feedback.textContent=key?text(key):'';
  }
  function draft(){
    return {shape:shape.value,...Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,Number(committedFieldValue(input))]))};
  }
  function sync(){
    const ready=available(),placing=isPlacing();
    place.disabled=!ready||!placing&&records().length>=MAX_BASIC_OBJECTS;
    place.textContent=t(placing?'ui.object.cancel':'ui.object.place');
    place.setAttribute('aria-pressed',String(placing));
    move.hidden=done.hidden=selected==null;
    move.disabled=done.disabled=!ready||placing;
    shape.disabled=!ready||placing;
    for(const input of Object.values(fields))input.disabled=!ready||placing;
    for(const button of list.querySelectorAll('button'))button.disabled=!ready||placing;
  }
  function refresh(selection=selected){
    const rows=records();
    selected=selection!=null&&selection>=0&&selection<rows.length?selection:null;
    list.replaceChildren();
    rows.forEach((row,index)=>{
      const item=document.createElement('li'),edit=document.createElement('button'),remove=document.createElement('button');
      const params={number:formatNumber(index+1)};
      edit.type=remove.type='button';edit.className=remove.className='quiet-button';
      edit.textContent=text('entry',params);
      edit.dataset.objectSelect=index;
      edit.setAttribute('aria-label',text('editItem',params));
      edit.setAttribute('aria-pressed',String(index===selected));
      edit.onclick=()=>{
        refresh(index);select(index);
        list.querySelector('[data-object-select="'+index+'"]').focus({preventScroll:true});
      };
      remove.textContent=t('ui.object.remove');
      remove.setAttribute('aria-label',text('removeItem',params));
      remove.onclick=()=>{
        select(null);
        submit(rows.filter((_,i)=>i!==index),{selection:rows.length>1?Math.min(index,rows.length-2):null,message:'removed',focus:true});
      };
      item.append(edit,remove);list.append(item);
    });
    if(selected!=null){
      const row=rows[selected];shape.value=row.shape;
      for(const [key,input] of Object.entries(fields))input.value=row[key];
      const result=levels()[selected],mm=value=>formatNumber(value,{maximumFractionDigits:1});
      level.textContent=result?text('level',{base:mm(result.baseMM),top:mm(result.topMM)}):'';
    }else level.textContent='';
    sync();
  }
  function change(key,value){
    if(!available()||selected==null)return;
    const rows=records();
    if(rows[selected][key]===value)return;
    submit(rows.map((row,index)=>index===selected?{...row,[key]:value}:row),{selection:selected,message:'updated'});
  }
  shape.onchange=()=>change('shape',shape.value);
  for(const [key,input] of Object.entries(fields)){
    const [min,max]=limits[key];input.min=min;input.max=max;
    bindFieldCommit(input,previous=>{
      const value=input.valueAsNumber;
      if(!Number.isFinite(value)){input.value=previous;return;}
      const next=Math.max(min,Math.min(max,Math.round(value*10)/10));
      input.value=next;change(key,next);
    });
  }
  place.onclick=()=>isPlacing()?cancel():start(null);
  move.onclick=()=>{if(selected!=null&&available())start(selected);};
  done.onclick=()=>{selected=null;select(null);refresh(null);};
  return {refresh,sync,say,draft,get selection(){return selected;},
    focusSelection:()=>{(list.querySelector('[data-object-select="'+selected+'"]')||place).focus({preventScroll:true});},
    localize:()=>{refresh();say(message);}};
}
