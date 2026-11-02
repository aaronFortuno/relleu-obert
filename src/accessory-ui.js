import {frameSegments} from './printable-frame.js';
import {layoutLabel} from './printable-label.js';
import {modelNorth} from './compass.js';

export function initAccessoryUI({onDownload}){
  const root=document.getElementById('accessories'),$=id=>root.querySelector('#'+id);
  root.innerHTML=`<div class="section-heading"><h2>Complements imprimibles</h2></div><p class="hint">Fitxers independents de la maqueta. El ZIP inclou 3MF i STL equivalents.</p>
  <label for="accessory-bed">Mida útil del llit <span class="unit">mm</span></label><input id="accessory-bed" type="number" min="50" max="450" value="180">
  <details><summary>Marc independent</summary><div class="accessory-fields">
  <label for="frame-clearance">Tolerància per costat · mm</label><input id="frame-clearance" type="number" min=".2" max="1" step=".1" value=".4">
  <label for="frame-rim">Amplada de vora · mm</label><input id="frame-rim" type="number" min="3" max="15" value="8">
  <label for="frame-height">Alçada de marc · mm</label><input id="frame-height" type="number" min="2" max="40" value="3">
  <label for="frame-color">Color del marc</label><input id="frame-color" type="color" value="#292e2a">
  <output id="frame-info" class="hint" aria-live="polite"></output><button id="download-frame" class="secondary" disabled>Descarrega marc ↓</button></div></details>
  <details><summary>Placa educativa</summary><div class="accessory-fields">
  <label for="label-title">Nom a la placa</label><input id="label-title" maxlength="60">
  <label for="label-coordinates">Coordenades o text</label><input id="label-coordinates" maxlength="60">
  <label for="label-note">Tercera línia · opcional</label><input id="label-note" maxlength="60">
  <label for="label-width">Amplada de placa · mm</label><input id="label-width" type="number" min="40" max="180" value="100">
  <label for="label-depth">Fondària de placa · mm</label><input id="label-depth" type="number" min="16" max="80" value="32">
  <label for="label-text-height">Alçada de lletra · mm</label><input id="label-text-height" type="number" min="4.5" max="20" step=".5" value="6">
  <label for="label-orientation">Col·locació després d’imprimir</label><select id="label-orientation"><option value="frontal">Plana · vista des de dalt</option><option value="lateral">Vertical · davant d’una prestatgeria</option></select>
  <label for="label-color">Color de la placa</label><input id="label-color" type="color" value="#eee9dc">
  <p class="hint">Traç simple en majúscules amb accents; un sol color. S’imprimeix plana.</p><output id="label-preview" class="label-preview"></output><output id="label-info" class="hint" aria-live="polite"></output><button id="download-label" class="secondary" disabled>Descarrega placa ↓</button></div></details>
  <details><summary>Fletxa del nord</summary><div class="accessory-fields">
  <label for="north-diameter">Diàmetre del disc · mm</label><input id="north-diameter" type="number" min="25" max="80" value="40">
  <label for="north-color">Color del disc i la fletxa</label><input id="north-color" type="color" value="#314e3a">
  <output id="north-info" class="hint" aria-live="polite"></output><button id="download-north" class="secondary" disabled>Descarrega nord ↓</button></div></details>`;
  let model,ready=false,working=false,regionKey,autoCoordinates='',touchedTitle=false,touchedCoordinates=false;
  const number=id=>Number($(id).value),bed=()=>number('accessory-bed');
  const frameOptions=()=>({bed:bed(),clearance:number('frame-clearance'),rim:number('frame-rim'),frameHeight:number('frame-height'),color:$('frame-color').value});
  const labelOptions=()=>({bed:bed(),plateWidth:number('label-width'),plateDepth:number('label-depth'),textHeight:number('label-text-height'),plateHeight:3,relief:1.2,color:$('label-color').value,orientation:$('label-orientation').value,lines:[$('label-title').value,$('label-coordinates').value,$('label-note').value],automaticCoordinates:model?.provenance.options?.selectionPose?.center||null,coordinatesCustom:$('label-coordinates').value!==autoCoordinates});
  const northOptions=()=>({bed:bed(),diameter:number('north-diameter'),color:$('north-color').value});
  function item(button,info,validate){
    try{if(!Number.isFinite(bed())||bed()<50||bed()>450)throw Error('Mida útil del llit entre 50 i 450 mm.');const text=validate();$(info).textContent=text;$(info).classList.remove('error');$(button).disabled=!ready||!model;}
    catch(e){$(info).textContent=e.message;$(info).classList.add('error');$(button).disabled=true;if(info==='label-info')$('label-preview').textContent='';}
  }
  function refresh(next=model,canDownload=ready,busy=working){
    model=next;ready=!!canDownload;working=busy;
    root.querySelectorAll('input,select').forEach(e=>e.disabled=busy);
    if(!model){for(const id of ['download-frame','download-label','download-north'])$(id).disabled=true;return;}
    const key=JSON.stringify([model.provenance?.name,model.provenance?.bbox,model.provenance?.options?.selectionPose]);
    if(key!==regionKey){
      const pose=model.provenance?.options?.selectionPose,bbox=model.provenance?.bbox;
      const center=pose?.center||(bbox?[(bbox[1]+bbox[3])/2,(bbox[0]+bbox[2])/2]:null);
      autoCoordinates=center?center.map(v=>v.toFixed(4)).join(', '):'';
      if(!touchedTitle)$('label-title').value=(model.provenance?.name||'La meva maqueta').split(/ · |,/)[0];
      if(!touchedCoordinates)$('label-coordinates').value=autoCoordinates;
      regionKey=key;
    }
    item('download-frame','frame-info',()=>{const r=frameSegments({...frameOptions(),width:model.width,height:model.height,segmentMax:bed()});return `Exterior ${r.outer.map(v=>v.toFixed(1)).join(' × ')} mm · obertura ${r.opening.map(v=>v.toFixed(1)).join(' × ')} mm · ${r.segments.length===1?'una peça':r.segments.length+' trams a muntar'}.`;});
    item('download-label','label-info',()=>{const o=labelOptions(),l=layoutLabel(o);if(Math.max(o.plateWidth,o.plateDepth)>bed())throw Error('La placa supera el llit disponible.');$('label-preview').textContent=l.printed.filter(Boolean).join('\n');return `${l.plateWidth} × ${l.plateDepth} mm · ${o.coordinatesCustom?'coordenades/text personalitzat':'coordenades del centre del retall'}.`;});
    item('download-north','north-info',()=>{const d=number('north-diameter');if(d<25||d>80||!Number.isFinite(d)||d>bed())throw Error('Diàmetre entre 25 i 80 mm, dins del llit disponible.');const n=modelNorth(model);return `Nord del retall: ${n.rotation===0?'cap a la vora superior':Math.abs(n.rotation)+'° a '+(n.rotation>0?'l’esquerra':'la dreta')+' de la vora superior'}. No depèn de la càmera.`;});
  }
  root.addEventListener('input',event=>{if(event.target.id==='label-title')touchedTitle=true;if(event.target.id==='label-coordinates')touchedCoordinates=true;refresh();});
  root.addEventListener('change',()=>refresh());
  for(const [id,kind,options]of [['download-frame','marc',frameOptions],['download-label','placa',labelOptions],['download-north','nord',northOptions]])$(id).onclick=()=>{if(ready&&model)onDownload(kind,options());};
  return {refresh};
}
