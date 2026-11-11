import {formatNumber,t} from './i18n.js';

const focusable='a[href],button,input:not([type=hidden]),select,textarea,summary,iframe,[tabindex],[contenteditable=true]';
const clipping=/^(auto|hidden|scroll|clip|overlay)$/;
const margin=12,frameWidth=1.5,stepDuration=180;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function padRect({left,top,right,bottom},viewport,padding){
  return {left:Math.max(0,left-padding),top:Math.max(0,top-padding),
    right:Math.min(viewport.width,right+padding),bottom:Math.min(viewport.height,bottom+padding)};
}

function spotlightRect(element,win,viewport){
  if(!element?.getClientRects().length||win.getComputedStyle(element).visibility!=='visible')return null;
  const box=element.getBoundingClientRect();
  let {left,top,right,bottom}=box;
  for(let parent=element.parentElement;parent&&parent!==element.ownerDocument.body;parent=parent.parentElement){
    const {overflowX,overflowY}=win.getComputedStyle(parent);
    if(!clipping.test(overflowX)&&!clipping.test(overflowY))continue;
    const bounds=parent.getBoundingClientRect();
    if(clipping.test(overflowX)){left=Math.max(left,bounds.left);right=Math.min(right,bounds.right);}
    if(clipping.test(overflowY)){top=Math.max(top,bounds.top);bottom=Math.min(bottom,bounds.bottom);}
  }
  if(right<=left||bottom<=top||right<=0||bottom<=0||left>=viewport.width||top>=viewport.height)return null;
  return padRect({left,top,right,bottom},viewport,0);
}

function shadePath(width,height,cutouts){
  const rows=[...new Set([0,height,...cutouts.flatMap(({top,bottom})=>[top,bottom])])].sort((a,b)=>a-b);
  const rect=(left,top,right,bottom)=>`M${left},${top}H${right}V${bottom}H${left}Z`;
  // Disjoint shaded rectangles keep overlapping targets open.
  let path='';
  for(let row=1;row<rows.length;row++){
    const top=rows[row-1],bottom=rows[row];
    const spans=cutouts.filter(cut=>cut.top<bottom&&cut.bottom>top).sort((a,b)=>a.left-b.left);
    let left=0;
    for(const span of spans){
      if(span.left>left)path+=rect(left,top,span.left,bottom);
      left=Math.max(left,span.right);
    }
    if(left<width)path+=rect(left,top,width,bottom);
  }
  return path;
}

function controlsIn(elements){
  return [...new Set(elements.flatMap(element=>[
    ...(element.matches(focusable)?[element]:[]),...element.querySelectorAll(focusable)
  ]))];
}

function placeCard(card,viewport,cutouts,controls,focused){
  const {left,top,width,height}=viewport;
  card.style.maxWidth=`${Math.max(0,width-margin*2)}px`;
  card.style.maxHeight=`${Math.max(0,height-margin*2)}px`;
  const w=card.offsetWidth,h=card.offsetHeight;
  const xMin=left+margin,yMin=top+margin;
  const xMax=left+width-w-margin,yMax=top+height-h-margin;
  const xs=[xMin,xMax,left+(width-w)/2],ys=[yMin,yMax,top+(height-h)/2];
  for(const cut of focused?[...cutouts,focused]:cutouts){
    xs.push(cut.left-w-margin,cut.right+margin,cut.left);
    ys.push(cut.top-h-margin,cut.bottom+margin,cut.top);
  }
  const overlap=(x,y,r)=>Math.max(0,Math.min(x+w,r.right)-Math.max(x,r.left))*
    Math.max(0,Math.min(y+h,r.bottom)-Math.max(y,r.top));
  const distance=(x,y,r)=>Math.hypot(Math.max(r.left-x-w,x-r.right,0),Math.max(r.top-y-h,y-r.bottom,0));
  let best={x:xMin,y:yMin,score:Infinity};
  for(const offsetX of xs)for(const offsetY of ys){
    const x=clamp(offsetX,xMin,xMax),y=clamp(offsetY,yMin,yMax);
    const covered=cutouts.reduce((area,cut)=>area+overlap(x,y,cut),0);
    const coveredControls=controls.reduce((area,control)=>area+overlap(x,y,control),0);
    const score=(covered+4*coveredControls+(focused?8*overlap(x,y,focused):0))*100+
      (cutouts.length?Math.min(...cutouts.map(cut=>distance(x,y,cut))):0)+Math.abs(y-yMin)*.01;
    if(score<best.score)best={x,y,score};
  }
  card.style.left=`${Math.round(best.x)}px`;
  card.style.top=`${Math.round(best.y)}px`;
}

export function createWorkshopGuide(root,{getSteps,onStep=()=>{},targets=()=>[],canAdvance=()=>true,
  autoAdvance=()=>false,titleKey,instructionKey,fallbackFocus}){
  const doc=root.ownerDocument,win=doc.defaultView;
  root.innerHTML=`
    <svg class="workshop-guide-shade" aria-hidden="true" focusable="false">
      <g class="workshop-guide-previous">
        <path class="workshop-guide-mask"/>
        <path class="workshop-guide-frame" fill-rule="evenodd"/>
      </g>
      <g class="workshop-guide-current">
        <path class="workshop-guide-mask"/>
        <path class="workshop-guide-frame" fill-rule="evenodd"/>
      </g>
      <path class="workshop-guide-hit"/>
    </svg>
    <section class="workshop-guide-card" aria-labelledby="workshop-guide-heading">
      <h2 id="workshop-guide-heading" tabindex="-1" aria-describedby="workshop-guide-instruction"></h2>
      <p id="workshop-guide-instruction" class="hint"></p>
      <div class="workshop-guide-actions">
        <button type="button" class="quiet-button" data-guide-action="exit"></button>
        <button type="button" class="secondary" data-guide-action="back"></button>
        <button type="button" class="primary" data-guide-action="next"></button>
      </div>
    </section>`;
  const previousShade=root.querySelector('.workshop-guide-previous'),currentShade=root.querySelector('.workshop-guide-current');
  const hit=root.querySelector('.workshop-guide-hit'),card=root.querySelector('section');
  const reducedMotion=win.matchMedia('(prefers-reduced-motion: reduce)');
  const title=card.querySelector('h2'),instruction=card.querySelector('p');
  const exit=root.querySelector('[data-guide-action="exit"]');
  const back=root.querySelector('[data-guide-action="back"]');
  const next=root.querySelector('[data-guide-action="next"]');
  let step,opener,flow=[],ready=false,transitioning=false,frame=0,observed=[];
  let animateStep=false,paintedPaths,animations=[];
  const resizeObserver=new win.ResizeObserver(scheduleLayout);

  function setShade(group,paths){
    for(const [index,path] of [...group.children].entries())path.setAttribute('d',paths[index]);
  }
  function animateChange(previousPaths){
    for(const animation of animations)animation.cancel();
    if(reducedMotion.matches){animations=[];return;}
    const options={duration:stepDuration,easing:'ease-out'};
    animations=[card.animate([{opacity:.65},{opacity:1}],options)];
    if(previousPaths){
      setShade(previousShade,previousPaths);
      animations.push(previousShade.animate([{opacity:1},{opacity:0}],options));
      animations.push(currentShade.animate([{opacity:0},{opacity:1}],options));
    }
  }

  function layout(){
    frame=0;
    if(!step)return;
    const elements=targets(step).filter(Boolean);
    if(elements.length!==observed.length||elements.some((element,index)=>element!==observed[index])){
      resizeObserver.disconnect();
      resizeObserver.observe(card);
      for(const element of elements)resizeObserver.observe(element);
      observed=elements;
    }
    const viewport={width:win.innerWidth,height:win.innerHeight};
    const cutouts=elements.map(element=>spotlightRect(element,win,viewport)).filter(Boolean);
    const padding=viewport.width<=900?8:10;
    const padded=cutouts.map(rect=>padRect(rect,viewport,padding));
    const shade=shadePath(viewport.width,viewport.height,padded);
    const inner=cutouts.map(rect=>padRect(rect,viewport,padding-frameWidth));
    // Both paths enclose the shaded area. Their even-odd fill leaves the
    // outline of the union, including where neighbouring targets overlap.
    const paths=[shade,shade+shadePath(viewport.width,viewport.height,inner)];
    const previousPaths=paintedPaths;
    setShade(currentShade,paths);
    paintedPaths=paths;
    hit.setAttribute('d',shadePath(viewport.width,viewport.height,cutouts));
    const visual=win.visualViewport;
    const controls=controlsIn(elements).map(element=>spotlightRect(element,win,viewport)).filter(Boolean);
    const focused=elements.some(element=>element.contains(doc.activeElement))?spotlightRect(doc.activeElement,win,viewport):null;
    placeCard(card,visual?{left:visual.offsetLeft,top:visual.offsetTop,width:visual.width,height:visual.height}:
      {left:0,top:0,...viewport},padded,controls,focused);
    if(animateStep){
      animateStep=false;
      animateChange(previousPaths);
    }
  }
  function scheduleLayout(){
    if(step&&!frame)frame=win.requestAnimationFrame(layout);
  }
  function render(){
    const index=flow.indexOf(step);
    title.textContent=t('guide.workshopStep',{
      current:formatNumber(index+1),total:formatNumber(flow.length),title:t(titleKey?.(step)??`guide.workshop.${step}.title`)
    });
    instruction.textContent=t(instructionKey?.(step)??`guide.workshop.${step}.text`);
    exit.textContent=t('guide.workshopExit');
    back.textContent=t('guide.workshopBack');
    next.textContent=t(index===flow.length-1?'guide.workshopDone':'guide.workshopNext');
    back.disabled=index===0;
    next.disabled=!canAdvance(step);
    scheduleLayout();
  }
  function show(id){
    if(id===step)return;
    step=id;
    root.dataset.guideStep=id;
    root.hidden=false;
    transitioning=true;
    try{onStep(id);}finally{transitioning=false;}
    ready=!!autoAdvance(id)&&canAdvance(id);
    animateStep=true;
    render();
    title.focus({preventScroll:true});
  }
  function close(){
    step=undefined;
    root.hidden=true;
    delete root.dataset.guideStep;
    opener=undefined;
    observed=[];
    resizeObserver.disconnect();
    animateStep=false;
    paintedPaths=undefined;
    for(const animation of animations)animation.cancel();
    animations=[];
    if(frame)win.cancelAnimationFrame(frame);
    frame=0;
  }
  function dismiss(){
    const target=opener?.getClientRects().length?opener:fallbackFocus;
    close();
    target?.focus({preventScroll:true});
  }
  function advance(){
    const following=flow[flow.indexOf(step)+1];
    if(following)show(following);
    else dismiss();
  }
  function update(){
    if(!step||transitioning)return;
    const previousFlow=flow;
    flow=getSteps();
    if(!flow.includes(step)){
      const index=previousFlow.indexOf(step);
      const replacement=previousFlow.slice(index+1).find(id=>flow.includes(id))??flow.at(-1);
      if(replacement)show(replacement);
      else dismiss();
      return;
    }
    const nowReady=!!autoAdvance(step)&&canAdvance(step);
    const completed=!ready&&nowReady;
    ready=nowReady;
    if(completed)advance();
    else render();
  }
  function tabStops(){
    const controls=controlsIn([...targets(step).filter(Boolean),card])
      .filter(element=>element.tabIndex>=0&&!element.matches(':disabled')&&!element.closest('[hidden],[inert]')&&
        element.getClientRects().length&&win.getComputedStyle(element).visibility==='visible');
    return controls.filter(control=>control.type!=='radio'||!control.name||control===
      (controls.find(other=>other.type==='radio'&&other.name===control.name&&other.form===control.form&&other.checked)??
        controls.find(other=>other.type==='radio'&&other.name===control.name&&other.form===control.form)));
  }
  doc.addEventListener('keydown',event=>{
    if(!step||event.defaultPrevented||doc.querySelector('dialog[open]'))return;
    if(event.key==='Escape'){
      event.preventDefault();
      dismiss();
    }else if(event.key==='Tab'){
      const controls=tabStops(),index=controls.indexOf(doc.activeElement);
      const offset=event.shiftKey?-1:1;
      const destination=index<0?(event.shiftKey?controls.at(-1):controls[0]):controls.at((index+offset)%controls.length);
      event.preventDefault();
      destination?.focus();
    }
  });
  doc.addEventListener('focusin',event=>{
    if(!step||transitioning||doc.querySelector('dialog[open]'))return;
    if(!root.contains(event.target)&&!targets(step).some(element=>element?.contains(event.target)))
      title.focus({preventScroll:true});
    scheduleLayout();
  });
  doc.addEventListener('scroll',scheduleLayout,true);
  win.addEventListener('resize',scheduleLayout);
  win.visualViewport?.addEventListener('resize',scheduleLayout);
  win.visualViewport?.addEventListener('scroll',scheduleLayout);
  hit.addEventListener('wheel',event=>event.preventDefault(),{passive:false});
  exit.onclick=dismiss;
  back.onclick=()=>{if(step&&flow.indexOf(step)>0)show(flow[flow.indexOf(step)-1]);};
  next.onclick=()=>{if(step&&canAdvance(step))advance();};
  return {start({step:id,returnFocus=doc.activeElement}={}){
    flow=getSteps();
    if(!flow.length)return;
    opener=returnFocus;
    show(flow.includes(id)?id:flow[0]);
  },update,close,current:()=>step};
}
