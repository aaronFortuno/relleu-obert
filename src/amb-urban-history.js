import {parseHistoricalEdition} from './historical-layers.js';
import {fetchArcgisPolygons} from './historical-arcgis.js';
import {clipUrbanFeatures} from './urban-history.js';

const service='https://ide.amb.cat/geoserveispi/rest/services/Hosted/03_EvolucioUsosSol/FeatureServer';
const editions=[1956,1977,1990].map((year,layer)=>({year,layer,field:`us${String(year).slice(-2)}`}));
// Residential uses, industry, facilities, technical services and tertiary uses.
// Rail and road land-use polygons are excluded from the built-up layer.
const classes=['rai','rbl','rca','rhi','rma','rxx','ind','equ','set','ter'];

export function createAmbUrbanHistory(read,fetcher=fetch){
  async function load(){
    const mask=await read('amb-urban-coverage.json.gz');
    const area={id:'amb-urban',label:'Àrea Metropolitana de Barcelona',exampleLabel:'L’Hospitalet i el Prat · AMB',
      layer:'urban',bbox:mask.bbox,center:[41.347,2.108],widthM:4500,editions,
      source:{name:'Àrea Metropolitana de Barcelona · Mapa d’usos del sòl',url:service,license:'Llei 37/2007'}};
    return {area,mask:{...mask,full:new Set(mask.full)}};
  }

  async function edition(area,year,selection){
    const entry=editions.find(item=>item.year===year);
    if(!entry||!selection)throw Error('This AMB edition does not cover the selection.');
    const {layer,field}=entry,{bbox,crop,partial}=selection;
    const where=`${field} IN (${classes.map(value=>`'${value}'`).join(',')})`;
    const data=await fetchArcgisPolygons(`${service}/${layer}/query`,{bbox,where,fetcher,idField:'objectid',fields:[field],
      accept:feature=>classes.includes(feature.properties?.[field])});
    return clipUrbanFeatures(area,year,[parseHistoricalEdition(data,area,year)],crop,partial);
  }
  return {load,edition};
}
