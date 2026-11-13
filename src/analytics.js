const host = 'relleu.ortogra.fi';
const website = 'a98eb37f-7201-4258-ba38-3fe42b6f7560';
const modes = ['model_complet', 'relleu_pur'];
const pieces = Array.from({length:16}, (_, index) => index + 1);
const events = {
  obre_galeria: {},
  copia_enllac: {},
  genera_model: {mode:modes, mida:['fins_15_cm','15_a_25_cm','25_a_50_cm','mes_de_50_cm']},
  error_generacio: {mode:modes},
  descarrega_model: {mode:modes, format:['bambu','bambu-zip','3mf','stl'], peces:pieces},
  canvia_font_edificis: {font:['icgc','osm','osm3d','catastre']},
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

function eventData(name, values) {
  if (!Object.hasOwn(events, name)) return null;
  const entries = Object.entries(events[name]);
  if (!entries.every(([field, options]) => options.includes(values?.[field]))) return null;
  return Object.fromEntries(entries.map(([field]) => [field, values[field]]));
}

export function analyticsPayload(type, payload) {
  if (type !== 'event' || !payload) return false;
  const base = {website, hostname:host, title:'Relleu Obert', url:'/'};
  const name = payload.name;
  if (name === undefined) return base;
  const data = eventData(name, payload.data);
  if (!data) return false;
  return Object.keys(data).length ? {...base, name, data} : {...base, name};
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
  script.src = 'https://maquestria.tail72bc84.ts.net:8443/script.js';
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
