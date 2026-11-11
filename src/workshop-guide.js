import {formatNumber,t} from './i18n.js';

const steps=['size','territory','layers','tools','print'];

export function createWorkshopGuide(root,{onStep=()=>{},canAdvance=()=>true,fallbackFocus}={}){
  root.setAttribute('role','region');
  root.setAttribute('aria-labelledby','workshop-guide-heading');
  root.innerHTML=`
    <div class="workshop-guide-copy">
      <h2 id="workshop-guide-heading" tabindex="-1" aria-describedby="workshop-guide-instruction"></h2>
      <p id="workshop-guide-instruction" class="hint"></p>
    </div>
    <div class="workshop-guide-actions">
      <button type="button" class="quiet-button" data-guide-action="exit"></button>
      <button type="button" class="secondary" data-guide-action="back"></button>
      <button type="button" class="primary" data-guide-action="next" aria-describedby="workshop-guide-instruction"></button>
    </div>`;
  const title=root.querySelector('h2'),instruction=root.querySelector('p');
  const exit=root.querySelector('[data-guide-action="exit"]');
  const back=root.querySelector('[data-guide-action="back"]');
  const next=root.querySelector('[data-guide-action="next"]');
  let index=-1,opener;

  function update(){
    if(index<0)return;
    const step=steps[index];
    title.textContent=t('guide.workshopStep',{
      current:formatNumber(index+1),total:formatNumber(steps.length),title:t('guide.workshop.'+step+'.title'),
    });
    instruction.textContent=t('guide.workshop.'+step+'.text');
    exit.textContent=t('guide.workshopExit');
    back.textContent=t('guide.workshopBack');
    next.textContent=t(index===steps.length-1?'guide.workshopDone':'guide.workshopNext');
    back.disabled=index===0;
    next.disabled=!canAdvance(step);
  }
  function show(position){
    index=position;
    root.hidden=false;
    onStep(steps[index]);
    update();
    title.focus({preventScroll:true});
  }
  function close(){
    index=-1;
    root.hidden=true;
    opener=null;
  }
  function dismiss(){
    const target=opener;
    close();
    (target?.getClientRects().length?target:fallbackFocus)?.focus({preventScroll:true});
  }
  exit.onclick=dismiss;
  back.onclick=()=>{if(index>0)show(index-1);};
  next.onclick=()=>{
    if(index<0||!canAdvance(steps[index]))return;
    if(index===steps.length-1)dismiss();
    else show(index+1);
  };
  root.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||event.defaultPrevented)return;
    event.preventDefault();
    dismiss();
  });
  return {start({step='size',returnFocus=root.ownerDocument.activeElement}={}){
    opener=returnFocus;
    show(Math.max(0,steps.indexOf(step)));
  },update,close};
}
