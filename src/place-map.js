import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {parseCoordinates,scaledBBox,validateScale,physicalBBox,selectionPose} from './selection.js';

export function createPlaceMap(container,{onChange,onName,width=150,height=150}){
  const map=L.map(container,{zoomControl:true,attributionControl:true,zoomSnap:0,scrollWheelZoom:true,minZoom:4,maxZoom:18}).setView([41.918,3.2075],14.8);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  const frame=document.createElement('div');frame.className='selection-frame';frame.setAttribute('aria-hidden','true');container.appendChild(frame);
  let physical=[width,height],targetScale=null,lastBBox,lastBase,pendingFit,rotation=0,lastRotation,restoring=false,retainedBase=null;
  map.on('movestart zoomstart',()=>{if(!restoring)retainedBase=null;});
  function frameSize(){const w=container.clientWidth,h=container.clientHeight,r=physical[0]/physical[1],a=rotation*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),fw=Math.min((w-46)/(c+s/r),(h-54)/(s+c/r));return [fw,fw/r];}
  function baseSelection(){
    const center=map.getCenter();
    if(targetScale){
      const bbox=scaledBBox([center.lat,center.lng],...physical,targetScale),a=map.latLngToContainerPoint([bbox[1],bbox[0]]),b=map.latLngToContainerPoint([bbox[3],bbox[2]]);
      frame.style.width=Math.abs(b.x-a.x)+'px';frame.style.height=Math.abs(b.y-a.y)+'px';
      return bbox;
    }
    if(retainedBase){const a=map.latLngToContainerPoint([retainedBase[1],retainedBase[0]]),b=map.latLngToContainerPoint([retainedBase[3],retainedBase[2]]);frame.style.width=Math.abs(b.x-a.x)+'px';frame.style.height=Math.abs(b.y-a.y)+'px';return retainedBase;}
    // A collapsed accordion has no pixel dimensions. Keep its geographic selection.
    if(!container.clientWidth||!container.clientHeight)return pendingFit||lastBase;
    const w=container.clientWidth,h=container.clientHeight,[fw,fh]=frameSize();
    frame.style.width=fw+'px';frame.style.height=fh+'px';
    const a=map.containerPointToLatLng([(w-fw)/2,(h+fh)/2]),b=map.containerPointToLatLng([(w+fw)/2,(h-fh)/2]);return [a.lng,a.lat,b.lng,b.lat];
  }
  function pose(){const b=baseSelection();if(!b)return null;lastBase=b;return selectionPose(b,rotation);}
  const selection=()=>pose()?.bbox;
  const changed=()=>{if(restoring)return;const p=pose();frame.style.transform=`translate(-50%,-50%) rotate(${rotation}deg)`;if(p&&(!lastBBox||rotation!==lastRotation||p.bbox.some((v,i)=>Math.abs(v-lastBBox[i])>1e-12))){lastBBox=p.bbox;lastRotation=rotation;onChange(p.bbox,map.getCenter(),p);}};
  map.on('moveend zoomend',changed);
  function fit(bbox){
    retainedBase=bbox;if(!container.clientWidth||!container.clientHeight){pendingFit=bbox;changed();return;}
    const w=container.clientWidth,h=container.clientHeight,[fw,fh]=frameSize();
    const prior=restoring;restoring=true;pendingFit=null;map.fitBounds([[bbox[1],bbox[0]],[bbox[3],bbox[2]]],{padding:[(w-fw)/2,(h-fh)/2],animate:false});map.setView([(bbox[1]+bbox[3])/2,(bbox[0]+bbox[2])/2],map.getZoom(),{animate:false});restoring=prior;changed();
  }
  new ResizeObserver(()=>{if(!container.clientWidth||!container.clientHeight)return;const previous=pendingFit||lastBase;restoring=true;map.invalidateSize({pan:false});if(previous)fit(previous);restoring=false;changed();}).observe(container);
  return {map,getBBox:selection,getPose:pose,setRotation(value){const previous=baseSelection();selectionPose(previous,value);rotation=value;fit(previous);changed();},setScale(value){const previous=baseSelection();targetScale=value===null?null:validateScale(value);fit(targetScale?baseSelection():previous);changed();},setSize(w,h){const previous=baseSelection();physical=[w,h];if(targetScale)fit(baseSelection());else if(previous){const lat=(previous[1]+previous[3])/2,lon=(previous[0]+previous[2])/2,km=(previous[3]-previous[1])*111.32;fit(physicalBBox([lat,lon],km*w/h,km));}changed();},setRegion(bbox){if(targetScale){map.panTo([(bbox[1]+bbox[3])/2,(bbox[0]+bbox[2])/2],{animate:false});fit(baseSelection());}else fit(bbox);},async search(text){
    const coordinate=parseCoordinates(text);if(coordinate){map.setView([coordinate.lat,coordinate.lon],map.getZoom());onName(text);return [];}
    const cacheKey='relleu-search:'+text.trim().toLowerCase();let cached;try{cached=JSON.parse(sessionStorage.getItem(cacheKey));}catch{}
    if(cached)return cached;
    const url=new URL('https://photon.komoot.io/api/');url.searchParams.set('q',text);url.searchParams.set('limit','5');const c=map.getCenter();url.searchParams.set('lat',c.lat);url.searchParams.set('lon',c.lng);
    const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('El cercador no està disponible. Pots introduir coordenades o moure el mapa.');
    const data=await response.json(),results=data.features.map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],label:[f.properties.name,[f.properties.street,f.properties.housenumber].filter(Boolean).join(' '),f.properties.city||f.properties.county,f.properties.postcode,f.properties.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}));
    try{sessionStorage.setItem(cacheKey,JSON.stringify(results));}catch{}return results;
  },choose(result){map.setView([result.lat,result.lon],targetScale?map.getZoom():15);if(targetScale)fit(baseSelection());onName(result.label);}};
}
