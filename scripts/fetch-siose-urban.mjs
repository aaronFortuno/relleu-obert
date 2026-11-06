import {writeFile} from 'node:fs/promises';

const [yearText,output,...coordinates]=process.argv.slice(2);
const year=Number(yearText),bbox=coordinates.map(Number);
const [west,south,east,north]=bbox;
if(![2005,2009,2011,2014].includes(year)||!output||coordinates.length!==4||
  !coordinates.every(value=>value.trim())||!bbox.every(Number.isFinite)||
  !(west<east&&south<north&&west>=-180&&east<=180&&south>=-90&&north<=90)){
  throw Error('Use YEAR OUTPUT.geojson WEST SOUTH EAST NORTH. Editions: 2005, 2009, 2011, 2014.');
}

const source=`https://serviciosgis2.ign.es/servicios/rest/services/SIOSE/SIOSE_${year}/MapServer/0`;
const classes=[111,112,113,130,140];
async function query(parameters){
  const request=new URL(`${source}/query`);
  request.search=new URLSearchParams(parameters);
  const response=await fetch(request,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`SIOSE HTTP ${response.status}`);
  const result=await response.json();
  if(result.error)throw Error(`SIOSE ${result.error.code}: ${result.error.message}`);
  return result;
}

const {objectIdFieldName,objectIds}=await query({f:'json',where:`CODIIGE IN (${classes.join(',')})`,returnIdsOnly:true,
  geometry:bbox.join(','),geometryType:'esriGeometryEnvelope',inSR:4326,spatialRel:'esriSpatialRelIntersects'});
// The official service returns null for a valid selection without matches.
const matches=objectIds===null?[]:objectIds;
if(objectIdFieldName!=='OBJECTID'||!Array.isArray(matches)||!matches.every(Number.isSafeInteger)){
  throw Error('The SIOSE response lacks a usable object list.');
}
if(matches.length>6000)throw Error('The SIOSE response exceeds 6,000 features. Try a smaller window.');
const ids=[...new Set(matches)].sort((a,b)=>a-b);
const features=[];
for(let start=0;start<ids.length;start+=400){
  const wanted=new Set(ids.slice(start,start+400));
  const result=await query({f:'geojson',objectIds:[...wanted].join(','),outFields:'OBJECTID,CODIIGE',outSR:4326,
    geometryPrecision:7,orderByFields:'OBJECTID ASC'});
  if(result.type!=='FeatureCollection'||!Array.isArray(result.features)||result.exceededTransferLimit||
    result.properties?.exceededTransferLimit||!result.features.every(feature=>{
      const {OBJECTID,CODIIGE}=feature.properties??{};
      return wanted.delete(OBJECTID)&&classes.includes(Number(CODIIGE))&&
        ['Polygon','MultiPolygon'].includes(feature.geometry?.type);
    })||wanted.size)throw Error(`Incomplete SIOSE page at feature ${start}.`);
  features.push(...result.features);
}
await writeFile(output,JSON.stringify({type:'FeatureCollection',bbox,edition:year,source,features})+'\n',{flag:'wx'});
console.log(`SIOSE ${year}: ${features.length} polígons per a ${bbox.join(', ')}.`);
