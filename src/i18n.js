// Núcli d'internacionalització. Veure work/RO-019-SETUP.md per a la guia de migració
// i les instruccions per registrar nous catàlegs.
import {translateDiagnostic} from './engine-i18n.js';
import {WORKSHOP_LOCALES,workshopCatalog} from './locales/workshop-catalogs.js';

export const DEFAULT_LOCALE = 'ca';
const STORAGE_KEY = 'relleu-obert-locale';

// Registre segur: Map (sense propietats heretades) i codis validats amb
// Intl.getCanonicalLocales. Els catàlegs només entren per import estàtic +
// registerLocale(); mai no es carreguen URL arbitràries ni codi remot.
const catalogs = new Map();
const localeListeners = new Set();
const KNOWN_LOCALES = [
  { code: 'ca', name: 'Català' },
  { code: 'es', name: 'Castellano' },
  { code: 'gl', name: 'Galego' },
  { code: 'eu', name: 'Euskara' },
  { code: 'en', name: 'English' },
];

let current = DEFAULT_LOCALE;

function canonicalLocale(code) {
  if (typeof code !== 'string' || !code) throw new Error(`Codi d'idioma no vàlid: ${code}`);
  try {
    return Intl.getCanonicalLocales(code)[0];
  } catch {
    throw new Error(`Etiqueta d'idioma mal formada: ${code}`);
  }
}

export function registerLocale(code, catalog) {
  const canonical = canonicalLocale(code);
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) throw new Error(`Catàleg no vàlid per a ${code}`);
  // Còpia amb prototipus nul: la cerca de claus no pot retornar membres heretats.
  catalogs.set(canonical, Object.freeze(Object.assign(Object.create(null), catalog)));
}

WORKSHOP_LOCALES.forEach((code,column) => registerLocale(code, workshopCatalog(column)));

export function availableLocales() {
  const known = KNOWN_LOCALES.map(l => ({ ...l, available: catalogs.has(l.code) }));
  const extra = [...catalogs.keys()]
    .filter(code => !KNOWN_LOCALES.some(l => l.code === code))
    .map(code => ({ code, name: code, available: true }));
  return [...known, ...extra];
}

export function getLocale() { return current; }

function lookup(locale, key) {
  const catalog = catalogs.get(locale);
  if (!catalog || !Object.prototype.hasOwnProperty.call(catalog, key)) return undefined;
  const value = catalog[key];
  return typeof value === 'string' ? value : undefined;
}

function interpolate(text, params = {}) {
  return text.replace(/\{([a-zA-Z][\w]*)\}/g, (match, name) =>
    params[name] === undefined || params[name] === null ? '' : String(params[name]));
}

// Traducció amb fallback explícit al català. Les claus absents no es mostren mai
// a l'usuari: retornen cadena buida i deixen un avís a la consola.
export function t(key, params) {
  const value = lookup(current, key) ?? lookup(DEFAULT_LOCALE, key);
  if (value === undefined) {
    if (typeof console !== 'undefined') console.warn(`[i18n] clau absent: ${key}`);
    return '';
  }
  return interpolate(value, params);
}

export function formatNumber(value, options) {
  return new Intl.NumberFormat(current, options).format(value);
}

export function translateEngineMessage(message) {
  return translateDiagnostic(message, WORKSHOP_LOCALES.indexOf(current), formatNumber);
}

export function onLocaleChange(callback) {
  localeListeners.add(callback);
  return () => localeListeners.delete(callback);
}

export function plural(count, forms) {
  const rule = new Intl.PluralRules(current).select(count);
  const form = forms[rule] ?? forms.other ?? '';
  return interpolate(form, { count });
}

function readStored() {
  try { return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null; } catch { return null; }
}

function writeStored(locale) {
  try { globalThis.localStorage?.setItem(STORAGE_KEY, locale); } catch { /* emmagatzematge no disponible: es continua sense persistir */ }
}

export function setLocale(code) {
  if (typeof code !== 'string' || !catalogs.has(code)) return false;
  current = code;
  writeStored(code);
  applyLocale();
  return true;
}

export function translateDom(root = typeof document !== 'undefined' ? document : null) {
  if (!root) return;
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-text]')) {
    const node = [...el.childNodes].find(child => child.nodeType === 3 && child.nodeValue.trim());
    if (node) node.nodeValue = node.nodeValue.replace(/\S[\s\S]*\S|\S/, () => t(el.dataset.i18nText));
  }
  for (const [suffix, attribute] of [['aria','aria-label'],['title','title'],['placeholder','placeholder'],['alt','alt'],['content','content']]) {
    const marker = 'data-i18n-' + suffix;
    for (const el of root.querySelectorAll(`[${marker}]`)) el.setAttribute(attribute, t(el.getAttribute(marker)));
  }
}

function renderLanguageList() {
  if (typeof document === 'undefined') return;
  const control = document.getElementById('language-control');
  if (!control) return;
  for (const button of control.querySelectorAll('[data-locale]')) {
    const code = button.dataset.locale;
    const available = catalogs.has(code);
    const selected = available && code === current;
    button.disabled = !available;
    button.classList.toggle('current', selected);
    button.setAttribute('aria-pressed', String(selected));
    const state = button.querySelector('.language-state');
    if (state) state.textContent = selected ? t('language.current') : available ? '' : t('language.pending');
  }
}

export function applyLocale() {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current;
    translateDom();
    renderLanguageList();
  }
  for (const listener of localeListeners) listener(current);
}

export function initI18n() {
  const stored = readStored();
  if (typeof stored === 'string' && catalogs.has(stored)) current = stored;
  applyLocale();
  if (typeof document === 'undefined') return current;
  const control = document.getElementById('language-control');
  if (!control) return current;
  const trigger = control.querySelector('summary');
  function closeLanguageList() {
    trigger.focus();
    control.open = false;
  }
  for (const button of control.querySelectorAll('[data-locale]')) {
    button.addEventListener('click', () => {
      if (setLocale(button.dataset.locale)) closeLanguageList();
    });
  }
  control.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !control.open) return;
    event.preventDefault();
    closeLanguageList();
  });
  control.addEventListener('focusout', event => {
    if (event.relatedTarget && !control.contains(event.relatedTarget)) control.open = false;
  });
  document.addEventListener('pointerdown', event => {
    if (control.open && !control.contains(event.target)) control.open = false;
  });
  return current;
}
