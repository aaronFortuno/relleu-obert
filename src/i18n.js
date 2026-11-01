// Núcli d'internacionalització. Veure work/RO-019-SETUP.md per a la guia de migració
// i les instruccions per registrar nous catàlegs.
import ca from './locales/ca.js';

export const DEFAULT_LOCALE = 'ca';
const STORAGE_KEY = 'relleu-obert-locale';

// Registre segur: Map (sense propietats heretades) i codis validats amb
// Intl.getCanonicalLocales. Els catàlegs només entren per import estàtic +
// registerLocale(); mai no es carreguen URL arbitràries ni codi remot.
const catalogs = new Map();
const KNOWN_LOCALES = [
  { code: 'ca', name: 'Català' },
  { code: 'es', name: 'Castellà' },
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

registerLocale(DEFAULT_LOCALE, ca);

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
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.setAttribute('title', t(el.dataset.i18nTitle));
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
}

function renderLanguageList() {
  if (typeof document === 'undefined') return;
  const dialog = document.getElementById('language-dialog');
  if (!dialog) return;
  for (const button of dialog.querySelectorAll('[data-locale]')) {
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
  if (typeof document === 'undefined') return;
  document.documentElement.lang = current;
  translateDom();
  renderLanguageList();
}

export function initI18n() {
  const stored = readStored();
  if (typeof stored === 'string' && catalogs.has(stored)) current = stored;
  applyLocale();
  if (typeof document === 'undefined') return current;
  const dialog = document.getElementById('language-dialog');
  if (dialog) for (const button of dialog.querySelectorAll('[data-locale]')) {
    button.addEventListener('click', () => {
      if (setLocale(button.dataset.locale)) dialog.close();
    });
  }
  return current;
}
