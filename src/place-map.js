import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {parseCoordinates,scaledBBox,physicalBBox,selectionPose,coveringSelectionBox,isPanoramicSize,PURE_SCALE_RANGE,PANORAMIC_SCALE_RANGE} from './selection.js';
import {recommendedPlace,DEFAULT_PLACE,placeSelection} from './recommended-places.js';
import {maxRegionScale,regionTileCount,MAX_REGION_TILES} from './region-limits.js';

export const MAX_PROJECT_SCALE=20000;

export function createPlaceMap(container,{onChange,onName,width=150,height=150}){
  const map=L.map(container,{zoomControl:true,attributionControl:true,zoomSnap:0,zoomAnimation:false,scrollWheelZoom:true,minZoom:4,maxZoom:18}).setView(recommendedPlace(DEFAULT_PLACE).center,15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  const frame=document.createElement('div');frame.className='selection-frame';container.appendChild(frame);
  const handle=document.createElement('button');
  handle.type='button';handle.className='map-rotation-handle';
  handle.setAttribute('role','slider');handle.setAttribute('aria-label','Gira el retall');
  handle.setAttribute('aria-valuemin','-180');handle.setAttribute('aria-valuemax','180');
  handle.title='Arrossega per girar · fletxes per ajustar';
  frame.append(handle);
  const reset=document.createElement('button');
  reset.type='button';reset.className='map-rotation-reset';
  reset.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>';
  reset.setAttribute('aria-label','Restableix l’orientació');reset.title='Restableix l’orientació';
  const north=L.control({position:'topleft'});
  north.onAdd=()=>{
    const bar=L.DomUtil.create('div','leaflet-bar map-north-control');
    bar.append(reset);
    L.DomEvent.disableClickPropagation(bar);
    return bar;
  };
  north.addTo(map);
  L.DomEvent.disableClickPropagation(handle);
  let physical=[width,height],lastBBox,lastBase=placeSelection(DEFAULT_PLACE,width,height),pendingFit,rotation=0,lastRotation,restoring=false,retainedBase=null,gesture=null,locked=false,pureRelief=false;
  let resizeReference=null;
  map.on('zoomstart',()=>{if(!restoring)retainedBase=null;});
  function frameSize(){const w=container.clientWidth,h=container.clientHeight,r=physical[0]/physical[1],a=rotation*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),fw=Math.min((w-46)/(c+s/r),(h-54)/(s+c/r));return [fw,fw/r];}
  function scaleBox(center,denominator){
    return physicalBBox(center,physical[0]*denominator/1e6,physical[1]*denominator/1e6);
  }
  function reliefScaleRange(){
    return isPanoramicSize(...physical)?PANORAMIC_SCALE_RANGE:PURE_SCALE_RANGE;
  }
  function getScaleLimit(center){
    if(pureRelief)return reliefScaleRange()[1];
    if(Math.abs(center[0])>70)return MAX_PROJECT_SCALE;
    const envelope=selectionPose(scaleBox(center,MAX_PROJECT_SCALE),rotation).bbox;
    if(regionTileCount(envelope)<=MAX_REGION_TILES)return MAX_PROJECT_SCALE;
    return Math.min(MAX_PROJECT_SCALE,maxRegionScale(center,...physical,rotation)||MAX_PROJECT_SCALE);
  }
  function limitBox(bbox){
    const p=selectionPose(bbox),scale=p.widthM*1000/physical[0],maximum=getScaleLimit(p.center);
    if(scale>maximum+1e-6)return scaleBox(p.center,maximum);
    if(pureRelief&&scale<reliefScaleRange()[0]-1e-6)return scaleBox(p.center,reliefScaleRange()[0]);
    return bbox;
  }
  function limitZoom(center){
    if(!container.clientWidth||!container.clientHeight)return;
    const [fw,fh]=frameSize();
    const zoomAt=denominator=>{
      const [w,s,e,n]=scaleBox(center,denominator),span=map.project([s,e],0).subtract(map.project([n,w],0));
      return map.getScaleZoom(Math.min(fw/span.x,fh/span.y),0);
    };
    const prior=restoring;
    restoring=true;
    map.setMinZoom(Math.max(4,zoomAt(getScaleLimit(center))));
    map.setMaxZoom(pureRelief?Math.min(18,zoomAt(reliefScaleRange()[0])):18);
    restoring=prior;
  }
  function baseSelection(){
    if(!container.clientWidth||!container.clientHeight)return pendingFit||lastBase;
    function drawBounds([w,s,e,n]){
      const a=map.latLngToContainerPoint([s,w]),b=map.latLngToContainerPoint([n,e]);
      frame.style.width=Math.abs(b.x-a.x)+'px';frame.style.height=Math.abs(b.y-a.y)+'px';
    }
    if(retainedBase){
      retainedBase=limitBox(retainedBase);
      drawBounds(retainedBase);return retainedBase;
    }
    // A collapsed accordion has no pixel dimensions. Keep its geographic selection.
    const w=container.clientWidth,h=container.clientHeight,[fw,fh]=frameSize();
    frame.style.width=fw+'px';frame.style.height=fh+'px';
    const a=map.containerPointToLatLng([(w-fw)/2,(h+fh)/2]),b=map.containerPointToLatLng([(w+fw)/2,(h-fh)/2]);
    let bounds=[a.lng,a.lat,b.lng,b.lat];
    if(pureRelief){
      const {lat,lng}=map.getCenter();
      // Keep a single horizontal scale in both directions despite the map projection.
      bounds=scaleBox([lat,lng],selectionPose(bounds).widthM*1000/physical[0]);
    }
    const limited=limitBox(bounds);
    if(pureRelief||limited!==bounds)drawBounds(limited);
    return limited;
  }
  function pose(){const b=baseSelection();if(!b)return null;lastBase=b;return selectionPose(b,rotation);}
  const selection=()=>pose()?.bbox;
  function drawRotation(value){
    frame.style.transform=`translate(-50%,-50%) rotate(${value}deg)`;
    handle.setAttribute('aria-valuenow',String(value));
    handle.setAttribute('aria-valuetext',value+' graus');
    reset.disabled=locked||value===0;
  }
  const changed=()=>{if(restoring||gesture)return;const {lat,lng}=map.getCenter();limitZoom([lat,lng]);const p=pose();drawRotation(rotation);if(p&&(!lastBBox||rotation!==lastRotation||p.bbox.some((v,i)=>Math.abs(v-lastBBox[i])>1e-12))){lastBBox=p.bbox;lastRotation=rotation;resizeReference=null;onChange(p.bbox,map.getCenter(),p);}};
  map.on('moveend',()=>{
    if(restoring||!retainedBase)return;
    const {lat,lng}=map.getCenter(),old=selectionPose(retainedBase);
    if(Math.abs(lat-old.center[0])>1e-12||Math.abs(lng-old.center[1])>1e-12)retainedBase=physicalBBox([lat,lng],old.widthM/1000,old.heightM/1000);
  });
  map.on('moveend zoomend',changed);
  function fit(bbox){
    const p=selectionPose(bbox);
    bbox=limitBox(bbox);
    retainedBase=bbox;if(!container.clientWidth||!container.clientHeight){pendingFit=bbox;changed();return;}
    const w=container.clientWidth,h=container.clientHeight,[fw,fh]=frameSize();
    const prior=restoring;restoring=true;pendingFit=null;
    limitZoom(p.center);
    map.fitBounds([[bbox[1],bbox[0]],[bbox[3],bbox[2]]],{padding:[(w-fw)/2,(h-fh)/2],animate:false});
    map.setView(p.center,map.getZoom(),{animate:false});restoring=prior;changed();
  }
  new ResizeObserver(()=>{if(!container.clientWidth||!container.clientHeight)return;const previous=pendingFit||lastBase;restoring=true;map.invalidateSize({pan:false});if(previous)fit(previous);restoring=false;changed();}).observe(container);
  function setRotation(value){
    const previous=baseSelection();
    rotation=value;
    fit(previous);
  }
  function resizePiece(width,height,pure=pureRelief){
    const current=pose();
    // Repeated size changes start from the same territory until the map is edited.
    const reference=resizeReference??{pose:current,base:lastBase,width:physical[0],height:physical[1]};
    physical=[width,height];
    pureRelief=pure;
    const sameAspect=width*reference.height===height*reference.width;
    const requested=sameAspect?reference.base:coveringSelectionBox(reference.pose,width,height);
    const bounded=limitBox(requested);
    fit(bounded);
    resizeReference=reference;
    return bounded!==requested;
  }
  const normalAngle=value=>((Math.round(value)+180)%360+360)%360-180;
  const pointerAngle=event=>{
    const bounds=container.getBoundingClientRect();
    return Math.atan2(event.clientY-bounds.top-container.clientHeight/2,event.clientX-bounds.left-container.clientWidth/2)*180/Math.PI;
  };
  handle.onpointerdown=event=>{
    if(locked||gesture||event.button!==0)return;
    event.stopPropagation();event.preventDefault();
    handle.focus({preventScroll:true});
    handle.setPointerCapture(event.pointerId);
    gesture={id:event.pointerId,start:pointerAngle(event),value:rotation};
  };
  handle.onpointermove=event=>{
    if(gesture?.id!==event.pointerId)return;
    gesture.value=normalAngle(rotation+pointerAngle(event)-gesture.start);
    drawRotation(gesture.value);
  };
  function finishRotation(event,commit){
    if(gesture?.id!==event.pointerId)return;
    const value=gesture.value;
    gesture=null;
    if(commit&&!locked)setRotation(value);
    else drawRotation(rotation);
  }
  handle.onpointerup=event=>finishRotation(event,true);
  handle.onpointercancel=handle.onlostpointercapture=event=>finishRotation(event,false);
  handle.onkeydown=event=>{
    const delta={ArrowLeft:-5,ArrowDown:-5,ArrowRight:5,ArrowUp:5}[event.key];
    if(locked||(!delta&&event.key!=='Home'))return;
    event.preventDefault();event.stopPropagation();
    setRotation(event.key==='Home'?0:normalAngle(rotation+delta));
  };
  reset.onclick=()=>setRotation(0);
  drawRotation(0);
  function setSize(w,h,pure=pureRelief){
    const previous=pose();
    physical=[w,h];
    pureRelief=pure;
    fit(physicalBBox(previous.center,previous.heightM*w/h/1000,previous.heightM/1000));
  }
  return {map,getBBox:selection,getPose:pose,getScaleLimit,setRotation,resizePiece,setSize,setLocked(value){locked=value;handle.disabled=value;reset.disabled=value||rotation===0;},setPureRelief(value){const previous=baseSelection();pureRelief=value;fit(previous);},setScale(value){fit(scaledBBox(pose().center,...physical,value,pureRelief?reliefScaleRange():undefined));},setRegion:fit,async search(text){
    const coordinate=parseCoordinates(text);if(coordinate){map.setView([coordinate.lat,coordinate.lon],map.getZoom(),{animate:false});onName(text);return null;}
    const cacheKey='relleu-search:'+text.trim().toLowerCase();let cached;try{cached=JSON.parse(sessionStorage.getItem(cacheKey));}catch{}
    if(cached)return cached;
    const url=new URL('https://photon.komoot.io/api/');url.searchParams.set('q',text);url.searchParams.set('limit','5');const c=map.getCenter();url.searchParams.set('lat',c.lat);url.searchParams.set('lon',c.lng);
    const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('El cercador no està disponible. Pots introduir coordenades o moure el mapa.');
    const data=await response.json(),results=data.features.map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],label:[f.properties.name,[f.properties.street,f.properties.housenumber].filter(Boolean).join(' '),f.properties.city||f.properties.county,f.properties.postcode,f.properties.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}));
    try{sessionStorage.setItem(cacheKey,JSON.stringify(results));}catch{}return results;
  },choose(result){map.setView([result.lat,result.lon],15,{animate:false});onName(result.label);}};
}
