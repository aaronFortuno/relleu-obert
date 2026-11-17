import {formatNumber,t} from './i18n.js';
import {bindFieldCommit} from './field-commit.js';
import {MAX_HORIZONTAL_SURFACES,MIN_HORIZONTAL_SURFACE_OFFSET_MM,MAX_HORIZONTAL_SURFACE_OFFSET_MM} from './horizontal-surface-settings.js';

const text=(key,params)=>t('runtime.horizontal.'+key,params);

export function horizontalErrorKey(error){
  return {HORIZONTAL_SURFACE_INVALID:'invalid',HORIZONTAL_SURFACE_OVERLAP:'overlap',
    HORIZONTAL_SURFACE_CONFLICT:'conflict'}[error?.code]??'failed';
}

export function createHorizontalSurfaceEditor(root,{records,levels,available,isDrawing,points,start,cancel,undo,edit,beforeRemove,submit}){
  const get=selector=>root.querySelector(selector);
  const startButton=get('[data-brush="horizontal"]'),finish=get('#horizontal-finish'),back=get('#horizontal-back');
  const actions=get('#horizontal-draft-actions'),list=get('#horizontal-list'),settings=get('#horizontal-settings');
  const reference=get('#horizontal-reference'),offset=get('#horizontal-offset'),material=get('#horizontal-material');
  const level=get('#horizontal-level'),feedback=get('#horizontal-feedback');
  let selected=null,message='';
  offset.min=MIN_HORIZONTAL_SURFACE_OFFSET_MM;
  offset.max=MAX_HORIZONTAL_SURFACE_OFFSET_MM;
  function say(key=''){
    message=key;feedback.textContent=key==='invalidPoint'?t('runtime.contour.invalid'):key?text(key):'';
  }
  function sync(){
    const ready=available(),drawing=isDrawing(),count=points().length;
    startButton.disabled=!ready||records().length>=MAX_HORIZONTAL_SURFACES;
    startButton.textContent=t(drawing?'ui.horizontal.cancel':'ui.horizontal.start');
    actions.hidden=!drawing;
    finish.disabled=!ready||count<3;
    back.disabled=!ready||!count;
    settings.hidden=selected==null||drawing;
    for(const input of [reference,offset,material,...list.querySelectorAll('button')])input.disabled=!ready||drawing;
  }
  function refresh(selection=selected){
    const items=records();
    selected=selection!=null&&selection>=0&&selection<items.length?selection:null;
    list.replaceChildren();
    items.forEach((_,index)=>{
      const row=document.createElement('li'),edit=document.createElement('button'),remove=document.createElement('button');
      const params={number:formatNumber(index+1)};
      edit.type=remove.type='button';edit.className=remove.className='quiet-button';
      edit.textContent=text('entry',params);
      edit.dataset.horizontalSelect=String(index);
      edit.setAttribute('aria-label',text('editItem',params));
      edit.setAttribute('aria-pressed',String(index===selected));
      remove.textContent=t('ui.horizontal.remove');
      remove.setAttribute('aria-label',text('removeItem',params));
      edit.onclick=()=>{
        refresh(index);
        editOutline(index);
        list.querySelector('[data-horizontal-select="'+index+'"]').focus({preventScroll:true});
      };
      remove.onclick=()=>{
        beforeRemove();
        submit(items.filter((_,i)=>i!==index),{
          selection:items.length>1?Math.min(index,items.length-2):null,message:'removed',focus:true
        });
      };
      row.append(edit,remove);list.append(row);
    });
    if(selected!=null){
      const item=items[selected];
      reference.value=item.reference;offset.value=item.offsetMM;material.value=item.material;
      const result=levels()[selected];
      const mm=value=>formatNumber(value,{maximumFractionDigits:1});
      level.textContent=result?text('level',{level:mm(result.levelMM),min:mm(result.minMM),max:mm(result.maxMM)}):'';
    }
    sync();
  }
  function change(field,value){
    if(!available()||selected==null)return;
    const items=records();
    if(items[selected][field]===value)return;
    submit(items.map((item,i)=>i===selected?{...item,[field]:value}:item),{selection:selected,message:'updated'});
  }
  reference.onchange=()=>change('reference',reference.value);
  material.onchange=()=>change('material',material.value);
  bindFieldCommit(offset,previous=>{
    const value=offset.valueAsNumber;
    if(!Number.isFinite(value)){offset.value=previous;return;}
    const next=Math.max(MIN_HORIZONTAL_SURFACE_OFFSET_MM,Math.min(MAX_HORIZONTAL_SURFACE_OFFSET_MM,Math.round(value*10)/10));
    offset.value=next;
    change('offsetMM',next);
  });
  startButton.onclick=()=>isDrawing()?cancel():start();
  finish.onclick=()=>{
    if(!available()||!isDrawing()||points().length<3)return;
    const items=records();
    submit([...items,{points:points(),reference:'mean',offsetMM:0,material:'roads'}],
      {selection:items.length,message:'saved',finish:true,focus:true});
  };
  back.onclick=undo;
  function focusSelection(){
    (list.querySelector('[data-horizontal-select="'+selected+'"]')||startButton).focus({preventScroll:true});
  }
  const editOutline=edit;
  return {refresh,sync,say,focusSelection,localize:()=>{refresh();say(message);}};
}
