import test from 'node:test';
import assert from 'node:assert/strict';
import {analyticsPayload,generationErrorData,generationReportData,workshopMode,workshopSize} from '../src/analytics.js';
import {sourceError} from '../src/generation-error.js';
import app from '../package.json' with {type:'json'};

const privateFields={
  coordinates:[41.7,1.8],selection:'private',search:'private address',project:'private project',
  url:'/map?search=private',referrer:'https://example.com/private',file:'private.gpx',id:'private id',
  message:'[41.7,1.8] private',stack:'private stack'
};
const baseReport={settings:{pureRelief:false,widthMM:200,heightMM:150,requestedBuildingSource:'icgc',
  selectionPose:{widthM:2469,heightM:1851.75,rotation:15,center:privateFields.coordinates},
  exaggeration:1.5,resolution:56,baseThickness:4.5}};
const vectorError=generationErrorData(baseReport,sourceError('source.vector-fetch',
  Object.assign(Error(privateFields.message),{status:429}),'OpenFreeMap'));

test('Umami receives only the public page address and the fields allowed for each event',()=>{
  const cases=[
    ['obre_galeria',{}],
    ['copia_enllac',{}],
    ['copia_enllac_galeria',{exemple:'tamariu'}],
    ['genera_model',{mode:'relleu_pur',mida:'25_a_50_cm'}],
    ['error_generacio',vectorError],
    ['descarrega_model',{mode:'relleu_pur',format:'bambu-zip',peces:4}],
    ['canvia_font_edificis',{font:'catastre'}],
    ['usa_eina',{eina:'dibuixa_sender'}],
    ['ajusta_talls',{peces:6}],
    ['canvia_materials',{mode:'model_complet',materials:8}]
  ];
  const page=analyticsPayload('event',{...privateFields,data:privateFields});
  assert.equal(page.url,'/');
  assert.deepEqual(Object.keys(page).sort(),['hostname','title','url','website']);
  for(const [name,data] of cases){
    const payload=analyticsPayload('event',{...privateFields,name,data:{...privateFields,...data}});
    assert.deepEqual(payload,Object.keys(data).length?{...page,name,data}:{...page,name});
  }
});

test('rejects unknown event names and values outside the declared categories',()=>{
  assert.equal(analyticsPayload('identify',{name:'obre_galeria'}),false);
  assert.equal(analyticsPayload('event',{name:'__proto__'}),false);
  assert.equal(analyticsPayload('event',{name:'copia_enllac_galeria',data:{exemple:'private project'}}),false);
  assert.equal(analyticsPayload('event',{name:'canvia_font_edificis',data:{font:'a private address'}}),false);
  assert.equal(analyticsPayload('event',{name:'genera_model',data:{mode:'model_complet',mida:151}}),false);
  assert.equal(analyticsPayload('event',{name:'error_generacio',data:{...vectorError,font:privateFields.url}}),false);
  assert.equal(analyticsPayload('event',{name:'error_generacio',data:{...vectorError,escala:12345}}),false);
  assert.equal(analyticsPayload('event',{name:'error_generacio',data:{...vectorError,motiu:privateFields.message}}),false);
  assert.equal(analyticsPayload('event',{name:'ajusta_talls',data:{peces:17}}),false);
});

test('generation errors use the active failure and a snapshot of the requested model',()=>{
  assert.deepEqual(vectorError,{mode:'model_complet',mida:'15_a_25_cm',escala:'5000_a_20000',versio:app.version,
    fase:'carrega_cartografia',motiu:'http_429',font:'openfreemap',font_edificis:'icgc'});
  const failedWorker={...baseReport,settings:{...baseReport.settings,pureRelief:true},
    sources:[{phase:'source.vector-fetch',ok:false}],workerStartMilliseconds:10,
    data:{terrainProvider:'ICGC MET5'},worker:{stages:[{phase:'initialization'},{phase:'terrain'}]}};
  const result=generationErrorData(failedWorker,Object.assign(Error(privateFields.message),{diagnosticReason:'dades_invalides'}));
  assert.deepEqual(result,{...vectorError,mode:'relleu_pur',fase:'malla_relleu',motiu:'dades_invalides',font:'icgc_met5',font_edificis:'cap'});
  const unexpected=generationErrorData(baseReport,sourceError(privateFields.message,
    Object.assign(Error(privateFields.message),{diagnosticReason:privateFields.message}),privateFields.url));
  assert.deepEqual(unexpected,{...vectorError,fase:'prepara_retall',font:'desconeguda',motiu:'inesperat'});
});

test('the voluntary report selects reproducible settings and is excluded from automatic analytics',()=>{
  const report=generationReportData({...baseReport,error:privateFields.message,selection:privateFields},
    {...privateFields,...vectorError});
  assert.deepEqual(report,{mode:'model_complet',versio:app.version,fase:'carrega_cartografia',motiu:'http_429',
    font:'openfreemap',font_edificis:'icgc',centre:'41.700000, 1.800000',amplada_m:2469,fondaria_m:1851.75,gir:15,
    amplada_mm:200,fondaria_mm:150,escala_exacta:12345,exageracio:1.5,resolucio:56,base_mm:4.5});
  assert.equal(analyticsPayload('event',{name:'informe_error_generacio',data:report}),false);
  assert.equal(generationReportData({settings:{...baseReport.settings,selectionPose:null}},vectorError),null);
});

test('physical size is counted in four bands using the longest side',()=>{
  assert.deepEqual([150,151,250,251,500,501].map(side=>workshopSize(100,side)),
    ['fins_15_cm','15_a_25_cm','15_a_25_cm','25_a_50_cm','25_a_50_cm','mes_de_50_cm']);
  assert.equal(workshopMode(true),'relleu_pur');
  assert.equal(workshopMode(false),'model_complet');
});
