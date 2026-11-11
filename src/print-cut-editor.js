import {MAX_PRINT_PIECES,MIN_PRINT_BAND_MM,validPrintBands} from './selection.js';

const axes=['columns','rows'];
const widths=edges=>edges.slice(1).map((end,index)=>end-edges[index]);

function boundaries(bands){
  let offset=0;
  return [0,...bands.map(band=>offset+=band)];
}

export function equalPrintBands(span,count){
  return widths(Array.from({length:count+1},(_,i)=>Math.round(i*span/count)));
}

export function printCutLimits(bands,index){
  const edges=boundaries(bands);
  return {position:edges[index+1],min:Math.ceil(edges[index]+MIN_PRINT_BAND_MM-1e-7),
    max:Math.floor(edges[index+2]-MIN_PRINT_BAND_MM+1e-7)};
}

export function movePrintCut(bands,index,position){
  // Automatic splits can be fractional. Round the cumulative edges once
  // so the editable layout remains in millimetres and keeps its total.
  const edges=boundaries(bands).map(Math.round),rounded=widths(edges);
  const {min,max}=printCutLimits(rounded,index);
  edges[index+1]=Math.min(max,Math.max(min,Math.round(position)));
  return widths(edges);
}

export function bindPrintCutEditor(fields,{text,formatNumber,onChange,onCommit=()=>{}}){
  const board=fields.querySelector('#print-cut-blueprint');
  const readout=fields.querySelector('#print-cut-dimensions');
  const nudge=fields.querySelector('#print-cut-nudge');
  const selects={
    columns:fields.querySelector('#print-column-count'),
    rows:fields.querySelector('#print-row-count')
  };
  let layout,handles=[],active=null,selected=null,gesture=null,layoutKey='';

  const cm=mm=>formatNumber(mm/10,{maximumFractionDigits:1});
  const disabled=()=>!layout||fields.disabled;
  const valueParams=(axis,index)=>{
    const [near,far]=layout.bands[axis].slice(index,index+2);
    return axis==='columns'?{a:cm(near),b:cm(far)}:{a:cm(far),b:cm(near)};
  };

  function showDimensions(){
    const handle=active??selected??handles[0];
    readout.textContent=handle
      ? text(handle.axis==='columns'?'print.widthPair':'print.depthPair',valueParams(handle.axis,handle.index))
      : text('print.fullSize',{width:cm(layout.width),height:cm(layout.height)});
    for(const item of handles)item.element.classList.toggle('is-active',item===handle);
    nudge.hidden=!handle;
  }

  function changePosition(handle,position,dragging=false){
    const {axis,index}=handle;
    const current=layout.bands[axis],next=movePrintCut(current,index,position);
    if(next.every((band,i)=>band===current[i]))return;
    onChange({...layout.cuts,[axis]:next},dragging);
  }

  function activate(handle){
    active=handle;
    showDimensions();
  }

  function resetPosition(handle){
    const {axis,index}=handle;
    if(disabled()||gesture||!layout.cuts[axis])return;
    const span=axis==='columns'?layout.width:layout.height;
    activate(handle);
    // The drag limits keep the other cuts in place if the equal split is blocked.
    changePosition(handle,(index+1)*span/layout.bands[axis].length);
  }

  function makeHandle(axis,index){
    const element=document.createElement('div'),vertical=axis==='columns';
    const handle={axis,index,element};
    element.className='print-cut-handle '+(vertical?'is-column':'is-row');
    element.dataset.cutAxis=axis;
    element.dataset.cutIndex=index;
    element.setAttribute('role','slider');
    element.setAttribute('aria-orientation',vertical?'horizontal':'vertical');
    element.setAttribute('aria-describedby','print-cuts-note');
    element.setAttribute('aria-keyshortcuts','Delete');
    const grip=document.createElement('span');
    grip.className='print-cut-grip';
    grip.setAttribute('aria-hidden','true');
    element.append(grip);
    element.addEventListener('pointerenter',()=>{if(!disabled()&&!gesture)activate(handle);});
    element.addEventListener('pointerleave',()=>{
      if(gesture||active!==handle)return;
      activate(handles.find(item=>item.element===document.activeElement)??null);
    });
    element.addEventListener('focus',()=>{selected=handle;activate(handle);});
    element.addEventListener('blur',()=>{if(!gesture&&active===handle)activate(null);});
    element.addEventListener('pointerdown',event=>{
      if(disabled()||gesture||event.button!==0)return;
      const length=vertical?board.clientWidth:board.clientHeight;
      const {position,min,max}=printCutLimits(layout.bands[axis],index);
      if(!length||min===max)return;
      event.preventDefault();
      element.focus({preventScroll:true});
      activate(handle);
      gesture={handle,id:event.pointerId,start:vertical?event.clientX:event.clientY,position,
        mmPerPixel:(vertical?layout.width:-layout.height)/length};
      element.setPointerCapture(event.pointerId);
    });
    element.addEventListener('pointermove',event=>{
      if(disabled()||gesture?.handle!==handle||gesture.id!==event.pointerId)return;
      const delta=(vertical?event.clientX:event.clientY)-gesture.start;
      if(delta!==0)changePosition(handle,gesture.position+delta*gesture.mmPerPixel,true);
    });
    element.addEventListener('lostpointercapture',event=>{
      if(gesture?.handle===handle&&gesture.id===event.pointerId){gesture=null;onCommit();}
    });
    element.addEventListener('dblclick',()=>resetPosition(handle));
    element.addEventListener('keydown',event=>{
      if(disabled())return;
      if(event.key==='Delete'){
        event.preventDefault();
        resetPosition(handle);
        return;
      }
      const {min,max,position}=printCutLimits(layout.bands[axis],index);
      const step=event.shiftKey?10:1;
      const positions={Home:min,End:max,ArrowLeft:position-step,ArrowDown:position-step,
        ArrowRight:position+step,ArrowUp:position+step};
      if(!Object.hasOwn(positions,event.key))return;
      event.preventDefault();
      activate(handle);
      changePosition(handle,positions[event.key]);
    });
    return handle;
  }

  for(const button of nudge.querySelectorAll('button'))button.onclick=()=>{
    const handle=selected??handles[0];
    if(disabled()||!handle)return;
    const {position}=printCutLimits(layout.bands[handle.axis],handle.index);
    changePosition(handle,position+Number(button.dataset.cutStep));
  };

  for(const axis of axes)selects[axis].addEventListener('change',()=>{
    if(disabled())return;
    const span=axis==='columns'?layout.width:layout.height;
    const bands=equalPrintBands(span,Number(selects[axis].value));
    if(validPrintBands(bands,span))onChange({...layout.cuts,[axis]:bands});
  });

  return {
    update({width,height,plan,cuts}){
      const bands={
        columns:widths([0,...plan.xCuts,width]),
        rows:widths([0,...plan.yCuts,height])
      };
      layout={width,height,bands,cuts};
      const key=[width,height,plan.cols,plan.rows].join(':');
      if(layoutKey!==key){
        layoutKey=key;
        active=selected=gesture=null;
        handles=axes.flatMap(axis=>bands[axis].slice(1).map((_,index)=>makeHandle(axis,index)));
        board.replaceChildren(...handles.map(handle=>handle.element));
        board.style.setProperty('--print-blueprint-width',Math.min(215,112*width/height)+'px');
        board.style.setProperty('--print-blueprint-ratio',width+' / '+height);
      }
      for(const axis of axes){
        const select=selects[axis],other=axis==='columns'?'rows':'columns';
        const span=axis==='columns'?width:height;
        const max=Math.min(Math.floor(MAX_PRINT_PIECES/bands[other].length),Math.floor(span/MIN_PRINT_BAND_MM));
        if(select.options.length!==max)select.replaceChildren(...Array.from({length:max},(_,i)=>new Option(formatNumber(i+1),i+1)));
        select.value=bands[axis].length;
      }
      for(const {axis,index,element} of handles){
        const vertical=axis==='columns',span=vertical?width:height;
        const {min,max,position}=printCutLimits(bands[axis],index);
        const nearest=Math.min(bands[axis][index],bands[axis][index+1]);
        element.style.setProperty('--print-cut-position',(vertical?position/span:1-position/span)*100+'%');
        element.style.setProperty('--print-cut-target',nearest/span*100+'%');
        const locked=disabled()||min===max;
        element.tabIndex=locked?-1:0;
        element.setAttribute('aria-disabled',String(locked));
        element.setAttribute('aria-label',text(vertical?'print.verticalCut':'print.horizontalCut',{index:formatNumber(index+1)}));
        element.setAttribute('aria-valuemin',min);
        element.setAttribute('aria-valuemax',max);
        element.setAttribute('aria-valuenow',Math.min(max,Math.max(min,Math.round(position))));
        element.setAttribute('aria-valuetext',text(vertical?'print.widthPair':'print.depthPair',valueParams(axis,index)));
      }
      showDimensions();
    }
  };
}
