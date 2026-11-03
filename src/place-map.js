import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {parseCoordinates,scaledBBox,physicalBBox,selectionPose} from './selection.js';
import {recommendedPlace,DEFAULT_PLACE,placeSelection} from './recommended-places.js';

export function createPlaceMap(container,{onChange,onName,width=150,height=150}){
  const map=L.map(container,{zoomControl:true,attributionControl:true,zoomSnap:0,zoomAnimation:false,scrollWheelZoom:true,minZoom:4,maxZoom:18}).setView(recommendedPlace(DEFAULT_PLACE).center,15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  const frame=document.createElement('div');frame.className='selection-frame';container.appendChild(frame);
  const handle=document.createElement('button');
  handle.type='button';handle.className='map-rotation-handle';handle.textContent='⟳';
  handle.setAttribute('role','slider');handle.setAttribute('aria-label','Gira el retall');
  handle.setAttribute('aria-valuemin','-180');handle.setAttribute('aria-valuemax','180');
  handle.title='Arrossega per girar · fletxes per ajustar';
  frame.append(handle);
  const reset=document.createElement('button');
  reset.type='button';reset.className='map-rotation-reset';reset.textContent='↶';
  reset.setAttribute('aria-label','Restableix l’orientació');reset.title='Restableix l’orientació';
  container.append(reset);
  L.DomEvent.disableClickPropagation(handle);
  L.DomEvent.disableClickPropagation(reset);
  let physical=[width,height],lastBBox,lastBase=placeSelection(DEFAULT_PLACE,width,height),pendingFit,rotation=0,lastRotation,restoring=false,retainedBase=null,gesture=null,locked=false;
  map.on('zoomstart',()=>{if(!restoring)retainedBase=null;});
  function frameSize(){const w=container.clientWidth,h=container.clientHeight,r=physical[0]/physical[1],a=rotation*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),fw=Math.min((w-46)/(c+s/r),(h-54)/(s+c/r));return [fw,fw/r];}
  function baseSelection(){
    if(!container.clientWidth||!container.clientHeight)return pendingFit||lastBase;
    if(retainedBase){const a=map.latLngToContainerPoint([retainedBase[1],retainedBase[0]]),b=map.latLngToContainerPoint([retainedBase[3],retainedBase[2]]);frame.style.width=Math.abs(b.x-a.x)+'px';frame.style.height=Math.abs(b.y-a.y)+'px';return retainedBase;}
    // A collapsed accordion has no pixel dimensions. Keep its geographic selection.
    const w=container.clientWidth,h=container.clientHeight,[fw,fh]=frameSize();
    frame.style.width=fw+'px';frame.style.height=fh+'px';
    const a=map.containerPointToLatLng([(w-fw)/2,(h+fh)/2]),b=map.containerPointToLatLng([(w+fw)/2,(h-fh)/2]);return [a.lng,a.lat,b.lng,b.lat];
  }
  function pose(){const b=baseSelection();if(!b)return null;lastBase=b;return selectionPose(b,rotation);}
  const selection=()=>pose()?.bbox;
  function drawRotation(value){
    frame.style.transform=`translate(-50%,-50%) rotate(${value}deg)`;
    handle.setAttribute('aria-valuenow',String(value));
    handle.setAttribute('aria-valuetext',value+' graus');
    reset.disabled=locked||value===0;
  }
  const changed=()=>{if(restoring||gesture)return;const p=pose();drawRotation(rotation);if(p&&(!lastBBox||rotation!==lastRotation||p.bbox.some((v,i)=>Math.abs(v-lastBBox[i])>1e-12))){lastBBox=p.bbox;lastRotation=rotation;onChange(p.bbox,map.getCenter(),p);}};
  map.on('moveend',()=>{
    if(restoring||!retainedBase)return;
    const {lat,lng}=map.getCenter(),old=selectionPose(retainedBase);
    if(Math.abs(lat-old.center[0])>1e-12||Math.abs(lng-old.center[1])>1e-12)retainedBase=physicalBBox([lat,lng],old.widthM/1000,old.heightM/1000);
  });
  map.on('moveend zoomend',changed);
  function fit(bbox){
    retainedBase=bbox;if(!container.clientWidth||!container.clientHeight){pendingFit=bbox;changed();return;}
    const w=container.clientWidth,h=container.clientHeight,[fw,fh]=frameSize();
    const prior=restoring;restoring=true;pendingFit=null;map.fitBounds([[bbox[1],bbox[0]],[bbox[3],bbox[2]]],{padding:[(w-fw)/2,(h-fh)/2],animate:false});map.setView([(bbox[1]+bbox[3])/2,(bbox[0]+bbox[2])/2],map.getZoom(),{animate:false});restoring=prior;changed();
  }
  new ResizeObserver(()=>{if(!container.clientWidth||!container.clientHeight)return;const previous=pendingFit||lastBase;restoring=true;map.invalidateSize({pan:false});if(previous)fit(previous);restoring=false;changed();}).observe(container);
  function setRotation(value){
    const previous=baseSelection();
    rotation=value;
    fit(previous);
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
  return {map,getBBox:selection,getPose:pose,setRotation,setLocked(value){locked=value;handle.disabled=value;reset.disabled=value||rotation===0;},setScale(value){fit(scaledBBox(pose().center,...physical,value));},setSize(w,h){const previous=pose();physical=[w,h];fit(physicalBBox(previous.center,previous.heightM*w/h/1000,previous.heightM/1000));},setRegion:fit,async search(text){
    const coordinate=parseCoordinates(text);if(coordinate){map.setView([coordinate.lat,coordinate.lon],map.getZoom(),{animate:false});onName(text);return null;}
    const cacheKey='relleu-search:'+text.trim().toLowerCase();let cached;try{cached=JSON.parse(sessionStorage.getItem(cacheKey));}catch{}
    if(cached)return cached;
    const url=new URL('https://photon.komoot.io/api/');url.searchParams.set('q',text);url.searchParams.set('limit','5');const c=map.getCenter();url.searchParams.set('lat',c.lat);url.searchParams.set('lon',c.lng);
    const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('El cercador no està disponible. Pots introduir coordenades o moure el mapa.');
    const data=await response.json(),results=data.features.map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],label:[f.properties.name,[f.properties.street,f.properties.housenumber].filter(Boolean).join(' '),f.properties.city||f.properties.county,f.properties.postcode,f.properties.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}));
    try{sessionStorage.setItem(cacheKey,JSON.stringify(results));}catch{}return results;
  },choose(result){map.setView([result.lat,result.lon],15,{animate:false});onName(result.label);}};
}
