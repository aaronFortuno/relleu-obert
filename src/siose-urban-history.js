import {fetchArcgisPolygons} from './historical-arcgis.js';
import {parseHistoricalEdition} from './historical-layers.js';
import {clipUrbanFeatures} from './urban-history.js';

const years=[2005,2014];
const urbanClasses=[111,112,113,130,140];
const source={name:'Obra derivada del SIOSE · IGN i comunitats autònomes',shortName:'SIOSE',
  url:'https://www.siose.es/descripcion',license:'Compatible amb CC BY 4.0'};

export function createSioseUrbanHistory(read,fetcher=fetch){
  const cache=new Map();

  async function load(){
    const mask=await read('siose-coverage.json.gz');
    if(!Number.isSafeInteger(mask?.tilesPerDegree)||mask.tilesPerDegree<1||
      mask.bbox?.length!==4||!mask.bbox.every(Number.isFinite)||!Array.isArray(mask.full)||!mask.partial){
      throw Error('Invalid SIOSE coverage mask.');
    }
    return {area:{id:'siose-urban',layer:'urban',label:'SIOSE',exampleLabel:'Logroño · SIOSE',
      center:[42.465,-2.46],widthM:4000,bbox:mask.bbox,source,editions:years.map(year=>({year}))},
      mask:{...mask,full:new Set(mask.full)}};
  }

  async function edition(area,year,selection){
    if(!years.includes(year)||!selection)throw Error('SIOSE edition unavailable for this selection.');
    const {bbox,crop,partial}=selection;
    const key=`${year}:${bbox.join(',')}`;
    if(!cache.has(key)){
      const query=`https://serviciosgis2.ign.es/servicios/rest/services/SIOSE/SIOSE_${year}/MapServer/0/query`;
      const pending=fetchArcgisPolygons(query,{bbox,where:`CODIIGE IN (${urbanClasses.join(',')})`,
        idField:'OBJECTID',fields:['CODIIGE'],fetcher,
        accept:feature=>urbanClasses.includes(Number(feature.properties.CODIIGE))})
        .then(data=>parseHistoricalEdition(data,area,year));
      cache.set(key,pending);
      if(cache.size>6)cache.delete(cache.keys().next().value);
      pending.catch(()=>{if(cache.get(key)===pending)cache.delete(key);});
    }
    return clipUrbanFeatures(area,year,[await cache.get(key)],crop,partial);
  }

  return {load,edition};
}
