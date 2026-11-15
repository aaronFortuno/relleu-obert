import {CURATED_EXAMPLES} from './curated-examples.js';
import {generationErrorReason} from './generation-error.js';
import app from '../package.json' with {type:'json'};

const host = 'relleu.ortogra.fi';
const website = 'a98eb37f-7201-4258-ba38-3fe42b6f7560';
const umamiOrigin = 'https://maquestria.tail72bc84.ts.net:8443';
const page = {website, hostname:host, title:'Relleu Obert', url:'/'};
const modes = ['model_complet', 'relleu_pur'];
const pieces = Array.from({length:16}, (_, index) => index + 1);
const sizes = ['fins_15_cm','15_a_25_cm','25_a_50_cm','mes_de_50_cm'];
const scales = ['fins_5000','5000_a_20000','20000_a_100000','mes_de_100000','desconeguda'];
const buildingSources = ['icgc','osm','osm3d','catastre'];
const sourcePhases = new Map([
  ['source.catalog','carrega_cataleg'],['source.vector-fetch','carrega_cartografia'],
  ['source.vector-decode','llegeix_cartografia'],['source.terrain','carrega_relleu'],
  ['source.buildings','carrega_edificis'],['source.boundaries','carrega_limits'],
  ['source.bridge-vector','carrega_cartografia'],['source.bridge-terrain','carrega_relleu'],
  ['source.singular-models','carrega_models_singulars'],['source.singular-terrain','carrega_models_singulars'],
]);
const enginePhases = new Map([
  ['initialization','inicia_motor'],['terrain','malla_relleu'],['transport','malla_vies'],
  ['buildings','malla_edificis'],['vegetation','malla_vegetacio'],
]);
const providers = new Map([
  ['sample','mostra_local'],['OpenFreeMap','openfreemap'],['ICGC MET5','icgc_met5'],
  ['Mapterhorn','mapterhorn'],['Mapzen Terrain Tiles · AWS','mapzen'],['globalTerrain','fonts_globals_relleu'],
  ...buildingSources.map(source=>[source,source]),
]);
const failureReasons = ['limit_retall','temps_exhaurit','peticio_interrompuda','xarxa','http_404','http_429',
  'http_4xx','http_5xx','dades_invalides','fonts_exhaurides','error_worker','inesperat'];
const events = {
  obre_galeria: {},
  copia_enllac: {},
  copia_enllac_galeria: {exemple:CURATED_EXAMPLES.map(({id})=>id)},
  genera_model: {mode:modes, mida:sizes},
  error_generacio: {mode:modes,mida:sizes,escala:scales,versio:[app.version],motiu:failureReasons,
    fase:[...new Set(sourcePhases.values()),...enginePhases.values(),'prepara_retall','motor'],
    font:[...providers.values(),'desconeguda'],font_edificis:[...buildingSources,'cap']},
  descarrega_model: {mode:modes, format:['bambu','bambu-zip','3mf','stl'], peces:pieces},
  canvia_font_edificis: {font:buildingSources},
  usa_eina: {eina:['dibuixa_sender','esborra_sender','dibuixa_ruta','esborra_ruta','importa_gpx','marca_punt']},
  ajusta_talls: {peces:pieces},
  canvia_materials: {mode:modes, materials:[1,2,3,4,5,6,8]},
};

function allowed() {
  return typeof window !== 'undefined' && location.protocol === 'https:' && location.hostname === host &&
    navigator.doNotTrack !== '1' && window.doNotTrack !== '1' && navigator.globalPrivacyControl !== true;
}

export function workshopMode(pure) {
  return pure ? 'relleu_pur' : 'model_complet';
}

export function workshopSize(widthMM, heightMM) {
  const side = Math.max(widthMM, heightMM);
  if (side <= 150) return 'fins_15_cm';
  if (side <= 250) return '15_a_25_cm';
  if (side <= 500) return '25_a_50_cm';
  return 'mes_de_50_cm';
}

function scaleBand({selectionPose,widthMM}){
  const scale=selectionPose?.widthM*1000/widthMM;
  if(!Number.isFinite(scale)||scale<=0)return 'desconeguda';
  if(scale<=5000)return 'fins_5000';
  if(scale<=20000)return '5000_a_20000';
  if(scale<=100000)return '20000_a_100000';
  return 'mes_de_100000';
}

export function generationErrorData(report,error){
  const {settings,data,worker,workerStartMilliseconds}=report;
  const engineStage=worker?.stages.at(-1)?.phase??error.engineStage;
  const phase=sourcePhases.get(error.sourcePhase)??enginePhases.get(engineStage)??
    (workerStartMilliseconds==null?'prepara_retall':'motor');
  const buildingSource=!settings.pureRelief&&settings.buildingMode!=='none'?settings.requestedBuildingSource:null;
  const engineProvider=engineStage==='terrain'?data?.terrainProvider:engineStage==='buildings'?data?.buildingSource:undefined;
  const provider=providers.get(error.sourceProvider??engineProvider);
  const reason=generationErrorReason(error.sourcePhase?error.cause:error);
  return {mode:workshopMode(settings.pureRelief),mida:workshopSize(settings.widthMM,settings.heightMM),
    escala:scaleBand(settings),versio:app.version,fase:phase,font:provider??'desconeguda',
    font_edificis:buildingSources.includes(buildingSource)?buildingSource:'cap',
    motiu:failureReasons.includes(reason)?reason:'inesperat'};
}

export function generationReportData(report,summary){
  const {settings}=report;
  const {center,widthM,heightM,rotation}=settings.selectionPose??{};
  const categories=eventData('error_generacio',summary);
  if(!categories||!Array.isArray(center)||center.length!==2||!center.every(Number.isFinite)||
    Math.abs(center[0])>90||Math.abs(center[1])>180||
    ![widthM,heightM,rotation,settings.widthMM,settings.heightMM,settings.exaggeration,settings.resolution,settings.baseThickness].every(Number.isFinite)||
    Math.min(widthM,heightM,settings.widthMM,settings.heightMM)<=0)return null;
  const {mode,versio,fase,motiu,font,font_edificis}=categories;
  return {mode,versio,fase,motiu,font,font_edificis,centre:center.map(coordinate=>coordinate.toFixed(6)).join(', '),
    amplada_m:Number(widthM.toFixed(2)),fondaria_m:Number(heightM.toFixed(2)),gir:rotation,
    amplada_mm:settings.widthMM,fondaria_mm:settings.heightMM,escala_exacta:Math.round(widthM*1000/settings.widthMM),
    exageracio:settings.exaggeration,resolucio:settings.resolution,base_mm:settings.baseThickness};
}

export function canSendGenerationReport(){
  if(!allowed())return false;
  try{return !localStorage.getItem('umami.disabled');}catch{return true;}
}

export async function sendGenerationReport(data){
  if(!canSendGenerationReport())return false;
  const response=await fetch(`${umamiOrigin}/api/send`,{
    method:'POST',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',
    headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),
    body:JSON.stringify({type:'event',payload:{...page,name:'informe_error_generacio',data}}),
  });
  if(!response.ok)return false;
  const result=await response.json();
  return !!result?.cache&&!result.disabled;
}

function eventData(name, values) {
  if (!Object.hasOwn(events, name)) return null;
  const entries = Object.entries(events[name]);
  if (!entries.every(([field, options]) => options.includes(values?.[field]))) return null;
  return Object.fromEntries(entries.map(([field]) => [field, values[field]]));
}

export function analyticsPayload(type, payload) {
  if (type !== 'event' || !payload) return false;
  const name = payload.name;
  if (name === undefined) return {...page};
  const data = eventData(name, payload.data);
  if (!data) return false;
  return Object.keys(data).length ? {...page, name, data} : {...page, name};
}

export function trackWorkshopEvent(name, values) {
  if (!allowed()) return;
  const data = eventData(name, values);
  if (!data) return;
  try { window.umami?.track?.(name, data)?.catch?.(() => {}); } catch { /* Analytics is optional. */ }
}

if (allowed()) {
  window.relleuBeforeSend = (type, payload) => allowed() && analyticsPayload(type, payload);
  const script = document.createElement('script');
  script.async = true;
  script.src = umamiOrigin+'/script.js';
  script.referrerPolicy = 'no-referrer';
  script.dataset.websiteId = website;
  script.dataset.domains = host;
  script.dataset.excludeSearch = 'true';
  script.dataset.excludeHash = 'true';
  script.dataset.doNotTrack = 'true';
  script.dataset.beforeSend = 'relleuBeforeSend';
  document.head.append(script);

  document.querySelector('#projects-open')?.addEventListener('click', () => trackWorkshopEvent('obre_galeria'));
}
