import {MAX_FENCE_POINTS} from './fence-settings.js';
import {MAX_HORIZONTAL_SURFACE_POINTS} from './horizontal-surface-settings.js';
import {formatNumber,t} from './i18n.js';

const svgNS='http://www.w3.org/2000/svg';
const limits={fence:MAX_FENCE_POINTS,horizontal:MAX_HORIZONTAL_SURFACE_POINTS};
const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
const samePoint=(a,b)=>a[0]===b[0]&&a[1]===b[1];

function outlinePath(positions,closed){
  let path='',continued=false;
  for(const point of positions){
    if(point)path+=(continued?'L':'M')+point.join(' ');
    continued=!!point;
  }
  if(closed&&positions.every(Boolean))return path+'Z';
  if(closed&&positions[0]&&positions.at(-1))path+='M'+positions.at(-1).join(' ')+'L'+positions[0].join(' ');
  return path;
}

export function createContourEditor(root,{available,record,anchor,midpoint,locate,snap,submit,invalid,finish}){
  const overlay=root.id==='contour-overlay'?root:root.querySelector('#contour-overlay');
  const doc=overlay.ownerDocument;
  const actionPanels=[...doc.querySelectorAll('[data-contour-actions]')];
  const guide=doc.createElementNS(svgNS,'svg'),path=doc.createElementNS(svgNS,'path');
  const snapEdge=doc.createElementNS(svgNS,'path'),snapTarget=doc.createElementNS(svgNS,'circle');
  guide.classList.add('contour-guide');
  guide.setAttribute('aria-hidden','true');
  snapEdge.classList.add('contour-snap-edge');
  snapTarget.classList.add('contour-snap-target');
  snapTarget.setAttribute('r','5');
  guide.append(path,snapEdge,snapTarget);
  overlay.append(guide);
  let active=null,trace=null,selected=null,drag=null,focusAfterRender=false;
  let vertices=[],segments=[],previousPath='';
  let snapPreview=null;

  function showSnap(result){
    snapPreview=result?.screen?result:null;
    overlay.hidden=!active&&!snapPreview;
    snapTarget.setAttribute('visibility',snapPreview?'visible':'hidden');
    snapEdge.setAttribute('visibility',snapPreview?.edge?'visible':'hidden');
    if(snapPreview){
      snapTarget.setAttribute('cx',snapPreview.screen[0]);
      snapTarget.setAttribute('cy',snapPreview.screen[1]);
      if(snapPreview.edge)snapEdge.setAttribute('d','M'+snapPreview.edge[0].join(' ')+'L'+snapPreview.edge[1].join(' '));
    }
  }
  const clearSnap=()=>showSnap(null);
  clearSnap();

  function sync(){
    const enabled=!!active&&available(),min=trace?.closed?3:2;
    if(!enabled){drag=null;clearSnap();}
    for(const panel of actionPanels){
      panel.hidden=panel.dataset.contourActions!==active?.kind;
      panel.querySelector('[data-contour-remove]').disabled=!enabled||selected==null||trace.points.length<=min;
    }
    overlay.hidden=!active;
    for(const {button} of vertices)button.disabled=!enabled;
    for(const {button} of segments)button.disabled=!enabled;
    if(active)overlay.setAttribute('aria-busy',String(!enabled));
  }

  function select(index){
    selected=index;
    for(const [i,{button}] of vertices.entries())button.setAttribute('aria-pressed',String(i===index));
    sync();
  }

  function apply(points,selection,focus){
    if(!active||!available())return;
    clearSnap();
    if(submit(active.kind,active.index,points,{selection,focus})!==false)sync();
  }

  function move(index,point,focus){
    if(!point||trace.points.some((other,i)=>i!==index&&samePoint(point,other))){
      invalid(active.kind);
      return;
    }
    if(samePoint(point,trace.points[index]))return;
    apply(trace.points.map((current,i)=>i===index?point:current),index,focus);
  }

  function add(index,point,focus){
    if(!trace||trace.points.length>=limits[active.kind])return;
    if(!point||trace.points.some(other=>samePoint(point,other))){
      invalid(active.kind);
      return;
    }
    const points=[...trace.points];
    points.splice(index,0,point);
    apply(points,index,focus);
  }

  function remove(){
    if(!trace||selected==null||trace.points.length<=(trace.closed?3:2))return;
    const points=trace.points.filter((_,i)=>i!==selected);
    apply(points,Math.min(selected,points.length-1),true);
  }

  function positionHandle(handle,point){
    const {button}=handle;
    const hidden=!point;
    if(button.hidden!==hidden)button.hidden=hidden;
    if(!point)return;
    if(handle.screen?.[0]!==point[0])button.style.left=point[0]+'px';
    if(handle.screen?.[1]!==point[1])button.style.top=point[1]+'px';
    handle.screen=point;
  }

  const clientPoint=(point)=>{
    const bounds=overlay.getBoundingClientRect();
    return locate(bounds.left+point[0],bounds.top+point[1]);
  };
  function resolvedPoint(position,index,bypass=false){
    const point=clientPoint(position),bounds=overlay.getBoundingClientRect();
    const result=point&&!bypass&&snap?.(point,{...active,pointIndex:index,
      clientX:bounds.left+position[0],clientY:bounds.top+position[1]});
    showSnap(result);
    return {point:result?.point??point,screen:result?.screen??position};
  }

  function bindVertex(handle,index){
    const {button}=handle;
    button.addEventListener('click',()=>{
      if(!drag&&available())select(index);
    });
    button.addEventListener('pointerdown',event=>{
      if(event.button!==0||!event.isPrimary||!available()||!handle.screen)return;
      event.stopPropagation();
      select(index);
      drag={
        id:event.pointerId,index,start:[event.clientX,event.clientY],
        startScreen:handle.screen,position:handle.screen,moved:false
      };
      button.setPointerCapture(event.pointerId);
    });
    function updateDrag(event){
      const dx=event.clientX-drag.start[0],dy=event.clientY-drag.start[1];
      drag.moved||=Math.hypot(dx,dy)>=4;
      if(drag.moved){
        const position=[drag.startScreen[0]+dx,drag.startScreen[1]+dy];
        const resolved=resolvedPoint(position,index,event.shiftKey);
        drag.position=resolved.screen;
        drag.point=resolved.point;
      }
    }
    button.addEventListener('pointermove',event=>{
      if(drag?.id!==event.pointerId)return;
      event.stopPropagation();
      updateDrag(event);
    });
    button.addEventListener('pointerup',event=>{
      if(drag?.id!==event.pointerId)return;
      event.stopPropagation();
      updateDrag(event);
      const {point,moved}=drag;
      drag=null;
      clearSnap();
      if(moved&&available())move(index,point,doc.activeElement===button);
    });
    const cancel=event=>{if(drag?.id===event.pointerId){drag=null;clearSnap();}};
    button.addEventListener('pointercancel',cancel);
    button.addEventListener('lostpointercapture',cancel);
    button.addEventListener('keydown',event=>{
      const direction=Object.hasOwn(directions,event.key)&&directions[event.key];
      const removing=event.key==='Delete'||event.key==='Backspace';
      if(!direction&&!removing)return;
      event.preventDefault();
      if(!available()||!handle.screen||event.repeat)return;
      select(index);
      if(removing)remove();
      else{
        const distance=event.shiftKey?8:2;
        const position=handle.screen.map((value,axis)=>value+direction[axis]*distance);
        move(index,resolvedPoint(position,index,event.shiftKey).point,true);
        clearSnap();
      }
    });
  }

  function localize(){
    for(const [index,{button}] of vertices.entries()){
      const number=formatNumber(index+1);
      button.textContent=number;
      button.setAttribute('aria-label',t('runtime.contour.point',{number}));
    }
    for(const [index,{button}] of segments.entries())
      button.setAttribute('aria-label',t('runtime.contour.insert',{number:formatNumber(index+1)}));
  }

  function end(){
    active=null;trace=null;selected=null;drag=null;focusAfterRender=false;
    vertices=[];segments=[];previousPath='';
    overlay.replaceChildren(guide);
    path.removeAttribute('d');
    clearSnap();
    sync();
  }

  function refresh({selection=selected,focus=false}={}){
    if(!active)return;
    trace=record(active.kind,active.index);
    if(!trace){end();return;}
    drag=null;
    clearSnap();
    focusAfterRender=focus;
    overlay.replaceChildren(guide);
    const makeHandle=(kind,point)=>{
      const button=doc.createElement('button');
      button.type='button';
      button.className='contour-handle';
      button.dataset.kind=kind;
      button.hidden=true;
      overlay.append(button);
      return {button,world:point&&anchor(point,{insert:kind==='insert'}),screen:null};
    };
    vertices=trace.points.map((point,index)=>{
      const handle=makeHandle('point',point);
      bindVertex(handle,index);
      return handle;
    });
    segments=[];
    if(trace.points.length<limits[active.kind]){
      const length=trace.points.length-(trace.closed?0:1);
      for(let index=0;index<length;index++){
        const a=trace.points[index],b=trace.points[(index+1)%trace.points.length];
        const point=midpoint?midpoint(a,b):a.map((value,axis)=>(value+b[axis])/2);
        const handle=makeHandle('insert',point);
        handle.button.textContent='+';
        handle.button.addEventListener('pointerdown',event=>event.stopPropagation());
        handle.button.addEventListener('click',()=>add(index+1,point,doc.activeElement===handle.button));
        segments.push(handle);
      }
    }
    localize();
    select(Number.isInteger(selection)&&selection>=0&&selection<trace.points.length?selection:null);
  }

  function start(kind,index){
    active={kind,index};
    refresh({selection:null});
  }

  function render(project){
    if(!trace)return;
    const {clientWidth,clientHeight}=overlay;
    const screen=point=>point?.map(value=>Math.round(value*10)/10)??null;
    const visible=point=>point&&point[0]>=0&&point[1]>=0&&point[0]<clientWidth&&point[1]<clientHeight;
    const positions=vertices.map((handle,index)=>{
      const moving=drag?.moved&&drag.index===index;
      const point=screen(moving?drag.position:handle.world&&project(handle.world));
      positionHandle(handle,moving||visible(point)?point:null);
      return point;
    });
    for(const [index,handle] of segments.entries()){
      const next=(index+1)%vertices.length;
      const point=positions[index]&&positions[next]&&!drag&&handle.world&&project(handle.world);
      // Leave room to grab vertices on tightly spaced sections. Zoom reveals the insert handle.
      const clear=point&&[positions[index],positions[next]].every(p=>Math.hypot(point[0]-p[0],point[1]-p[1])>=16);
      positionHandle(handle,clear&&visible(point)?screen(point):null);
    }
    const nextPath=outlinePath(positions,trace.closed);
    if(previousPath!==nextPath){
      path.setAttribute('d',nextPath);
      previousPath=nextPath;
    }
    if(focusAfterRender&&available()){
      focusAfterRender=false;
      const button=vertices[selected]?.button;
      if(button&&!button.hidden)button.focus({preventScroll:true});
    }
  }

  for(const panel of actionPanels){
    panel.querySelector('[data-contour-remove]').addEventListener('click',remove);
    panel.querySelector('[data-contour-done]').addEventListener('click',finish);
  }
  return {start,end,get active(){return active;},sync,refresh,render,localize,showSnap,clearSnap};
}
