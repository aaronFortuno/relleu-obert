import {frameSegments} from './printable-frame.js';

export function initAccessoryUI({onDownload,onFrameChange=()=>{}}){
  const root=document.getElementById('accessories'),container=document.getElementById('frame-settings'),$=id=>document.getElementById(id);
  // Labels are deferred; keep their geometry/export modules available for later.
  root.hidden=true;
  container.innerHTML=`<div class="accessory-fields">
  <label for="accessory-bed">Mida útil del llit <span class="unit">mm</span></label><input id="accessory-bed" type="number" min="50" max="450" value="180">
  <label for="frame-clearance">Tolerància per costat · mm</label><input id="frame-clearance" type="number" min=".2" max="1" step=".1" value=".4">
  <label for="frame-rim">Amplada de vora · mm</label><input id="frame-rim" type="number" min="3" max="15" value="8">
  <label for="frame-height">Alçada de marc · mm</label><input id="frame-height" type="number" min="2" max="40" value="3">
  <output id="frame-info" class="hint" aria-live="polite"></output><button id="download-frame" class="secondary" disabled>Descarrega marc ↓</button></div>`;
  let model,ready=false;
  const number=id=>Number($(id).value),bed=()=>number('accessory-bed');
  const frameOptions=()=>({bed:bed(),clearance:number('frame-clearance'),rim:number('frame-rim'),frameHeight:number('frame-height'),color:'#292e2a'});
  function refresh(next=model,canDownload=ready,busy=false){
    model=next;ready=!!canDownload;
    container.querySelectorAll('input').forEach(e=>e.disabled=busy);
    $('download-frame').disabled=true;
    if(!model)return;
    try{
      if(!Number.isFinite(bed())||bed()<50||bed()>450)throw Error('Mida útil del llit entre 50 i 450 mm.');
      const r=frameSegments({...frameOptions(),width:model.width,height:model.height,segmentMax:bed()});
      $('frame-info').textContent=`Exterior ${r.outer.map(v=>v.toFixed(1)).join(' × ')} mm · obertura ${r.opening.map(v=>v.toFixed(1)).join(' × ')} mm · ${r.segments.length===1?'una peça':r.segments.length+' trams a muntar'}.`;
      $('frame-info').classList.remove('error');$('download-frame').disabled=busy||!ready;
    }catch(e){$('frame-info').textContent=e.message;$('frame-info').classList.add('error');}
  }
  container.addEventListener('input',()=>{refresh();onFrameChange();});
  $('download-frame').onclick=()=>{if(ready&&model)onDownload('marc',frameOptions());};
  return {refresh,frameOptions};
}
