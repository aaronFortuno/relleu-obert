import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {parseCoordinates} from './selection.js';

export function createPlaceMap(container,{onChange,onName,width=150,height=150}){
  const map=L.map(container,{zoomControl:true,attributionControl:true,zoomSnap:0,scrollWheelZoom:true,minZoom:4,maxZoom:18}).setView([41.918,3.2075],14.8);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  const frame=document.createElement('div');frame.className='selection-frame';frame.setAttribute('aria-hidden','true');container.appendChild(frame);
  let physical=[width,height];
  function selection(){
    const w=container.clientWidth,h=container.clientHeight,r=physical[0]/physical[1],fw=Math.min(w-46,(h-54)*r),fh=fw/r;
    frame.style.width=fw+'px';frame.style.height=fh+'px';
    const a=map.containerPointToLatLng([(w-fw)/2,(h+fh)/2]),b=map.containerPointToLatLng([(w+fw)/2,(h-fh)/2]);return [a.lng,a.lat,b.lng,b.lat];
  }
  const changed=()=>onChange(selection(),map.getCenter());map.on('moveend zoomend',changed);
  new ResizeObserver(()=>{map.invalidateSize({pan:false});changed();}).observe(container);
  return {map,getBBox:selection,setSize(w,h){physical=[w,h];changed();},setRegion(bbox){selection();const w=container.clientWidth,h=container.clientHeight;map.fitBounds([[bbox[1],bbox[0]],[bbox[3],bbox[2]]],{padding:[(w-parseFloat(frame.style.width))/2,(h-parseFloat(frame.style.height))/2],animate:false});changed();},async search(text){
    const coordinate=parseCoordinates(text);if(coordinate){map.setView([coordinate.lat,coordinate.lon],map.getZoom());onName(text);return [];}
    const cacheKey='relleu-search:'+text.trim().toLowerCase();let cached;try{cached=JSON.parse(sessionStorage.getItem(cacheKey));}catch{}
    if(cached)return cached;
    const url=new URL('https://photon.komoot.io/api/');url.searchParams.set('q',text);url.searchParams.set('limit','5');const c=map.getCenter();url.searchParams.set('lat',c.lat);url.searchParams.set('lon',c.lng);
    const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('El cercador no està disponible. Pots introduir coordenades o moure el mapa.');
    const data=await response.json(),results=data.features.map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],label:[f.properties.name,[f.properties.street,f.properties.housenumber].filter(Boolean).join(' '),f.properties.city||f.properties.county,f.properties.postcode,f.properties.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}));
    try{sessionStorage.setItem(cacheKey,JSON.stringify(results));}catch{}return results;
  },choose(result){map.setView([result.lat,result.lon],15);onName(result.label);}};
}
