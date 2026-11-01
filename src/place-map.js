import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {parseCoordinates,scaledBBox,validateScale,physicalBBox} from './selection.js';

export function createPlaceMap(container,{onChange,onName,width=150,height=150}){
  const map=L.map(container,{zoomControl:true,attributionControl:true,zoomSnap:0,scrollWheelZoom:true,minZoom:4,maxZoom:18}).setView([41.918,3.2075],14.8);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  const frame=document.createElement('div');frame.className='selection-frame';frame.setAttribute('aria-hidden','true');container.appendChild(frame);
  let physical=[width,height],targetScale=null,lastBBox,pendingFit;
  function selection(){
    const center=map.getCenter();
    if(targetScale){
      const bbox=scaledBBox([center.lat,center.lng],...physical,targetScale),a=map.latLngToContainerPoint([bbox[1],bbox[0]]),b=map.latLngToContainerPoint([bbox[3],bbox[2]]);
      frame.style.width=Math.abs(b.x-a.x)+'px';frame.style.height=Math.abs(b.y-a.y)+'px';
      return bbox;
    }
    // A collapsed accordion has no pixel dimensions. Keep its geographic selection.
    if(!container.clientWidth||!container.clientHeight)return pendingFit||lastBBox;
    const w=container.clientWidth,h=container.clientHeight,r=physical[0]/physical[1],fw=Math.min(w-46,(h-54)*r),fh=fw/r;
    frame.style.width=fw+'px';frame.style.height=fh+'px';
    const a=map.containerPointToLatLng([(w-fw)/2,(h+fh)/2]),b=map.containerPointToLatLng([(w+fw)/2,(h-fh)/2]);return [a.lng,a.lat,b.lng,b.lat];
  }
  const changed=()=>{const bbox=selection();if(bbox&&(!lastBBox||bbox.some((v,i)=>Math.abs(v-lastBBox[i])>1e-12))){lastBBox=bbox;onChange(bbox,map.getCenter());}};
  map.on('moveend zoomend',changed);
  function fit(bbox){
    if(!container.clientWidth||!container.clientHeight){pendingFit=bbox;changed();return;}
    const w=container.clientWidth,h=container.clientHeight,r=physical[0]/physical[1],fw=Math.min(w-46,(h-54)*r),fh=fw/r;
    pendingFit=null;map.fitBounds([[bbox[1],bbox[0]],[bbox[3],bbox[2]]],{padding:[(w-fw)/2,(h-fh)/2],animate:false});changed();
  }
  new ResizeObserver(()=>{if(!container.clientWidth||!container.clientHeight)return;map.invalidateSize({pan:false});if(pendingFit)fit(targetScale?selection():pendingFit);else changed();}).observe(container);
  return {map,getBBox:selection,setScale(value){const previous=selection();targetScale=value===null?null:validateScale(value);fit(targetScale?selection():previous);changed();},setSize(w,h){const previous=selection();physical=[w,h];if(targetScale)fit(selection());else if(previous){const lat=(previous[1]+previous[3])/2,lon=(previous[0]+previous[2])/2,km=(previous[3]-previous[1])*111.32;fit(physicalBBox([lat,lon],km*w/h,km));}changed();},setRegion(bbox){if(targetScale){map.panTo([(bbox[1]+bbox[3])/2,(bbox[0]+bbox[2])/2],{animate:false});fit(selection());}else fit(bbox);},async search(text){
    const coordinate=parseCoordinates(text);if(coordinate){map.setView([coordinate.lat,coordinate.lon],map.getZoom());onName(text);return [];}
    const cacheKey='relleu-search:'+text.trim().toLowerCase();let cached;try{cached=JSON.parse(sessionStorage.getItem(cacheKey));}catch{}
    if(cached)return cached;
    const url=new URL('https://photon.komoot.io/api/');url.searchParams.set('q',text);url.searchParams.set('limit','5');const c=map.getCenter();url.searchParams.set('lat',c.lat);url.searchParams.set('lon',c.lng);
    const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('El cercador no està disponible. Pots introduir coordenades o moure el mapa.');
    const data=await response.json(),results=data.features.map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],label:[f.properties.name,[f.properties.street,f.properties.housenumber].filter(Boolean).join(' '),f.properties.city||f.properties.county,f.properties.postcode,f.properties.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}));
    try{sessionStorage.setItem(cacheKey,JSON.stringify(results));}catch{}return results;
  },choose(result){map.setView([result.lat,result.lon],targetScale?map.getZoom():15);if(targetScale)fit(selection());onName(result.label);}};
}
