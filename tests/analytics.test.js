import test from 'node:test';
import assert from 'node:assert/strict';
import {analyticsPayload,workshopMode,workshopSize} from '../src/analytics.js';

const privateFields={
  coordinates:[41.7,1.8],selection:'private',search:'private address',project:'private project',
  url:'/map?search=private',referrer:'https://example.com/private',file:'private.gpx',id:'private id'
};

test('Umami receives only the public page address and the fields allowed for each event',()=>{
  const cases=[
    ['obre_galeria',{}],
    ['genera_model',{mode:'relleu_pur',mida:'25_a_50_cm'}],
    ['error_generacio',{mode:'model_complet'}],
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
  assert.equal(analyticsPayload('event',{name:'canvia_font_edificis',data:{font:'a private address'}}),false);
  assert.equal(analyticsPayload('event',{name:'genera_model',data:{mode:'model_complet',mida:151}}),false);
  assert.equal(analyticsPayload('event',{name:'ajusta_talls',data:{peces:17}}),false);
});

test('physical size is counted in four bands using the longest side',()=>{
  assert.deepEqual([150,151,250,251,500,501].map(side=>workshopSize(100,side)),
    ['fins_15_cm','15_a_25_cm','15_a_25_cm','25_a_50_cm','25_a_50_cm','mes_de_50_cm']);
  assert.equal(workshopMode(true),'relleu_pur');
  assert.equal(workshopMode(false),'model_complet');
});
