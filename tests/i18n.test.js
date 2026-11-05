import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  DEFAULT_LOCALE,
  availableLocales,
  formatNumber,
  getLocale,
  initI18n,
  onLocaleChange,
  plural,
  registerLocale,
  setLocale,
  t,
  translateDom,
  translateEngineMessage,
} from '../src/i18n.js';
import {WORKSHOP_LOCALES,workshopRows} from '../src/locales/workshop-catalogs.js';
import engineRows from '../src/locales/workshop-engine.js';

test('cerca de clau: retorna el text català del catàleg base', () => {
  assert.equal(t('app.tagline'), 'Geografia que pots tocar.');
});

test('substitució de paràmetres amb fixtures sintètics', () => {
  registerLocale('zz', { 'test.greet': 'Hola, {name}! Tens {count} peces.' });
  const previous = getLocale();
  try {
    assert.equal(setLocale('zz'), true);
    assert.equal(t('test.greet', { name: 'A', count: 3 }), 'Hola, A! Tens 3 peces.');
    assert.equal(t('test.greet'), 'Hola, ! Tens  peces.');
  } finally {
    setLocale(previous);
  }
});

test('fallback explícit al català per claus absents del catàleg actiu', () => {
  const previous = getLocale();
  try {
    assert.equal(setLocale('zz'), true);
    assert.equal(t('app.tagline'), 'Geografia que pots tocar.');
  } finally {
    setLocale(previous);
  }
});

test('clau absent de tots els catàlegs: mai no s’exposa la clau a l’usuari', () => {
  assert.equal(t('clau.que.no.existeix'), '');
});

test('idiomes no suportats: setLocale retorna fals i conserva l’idioma actiu', () => {
  const previous = getLocale();
  assert.equal(setLocale('de'), false);
  assert.equal(setLocale('fr'), false);
  assert.equal(setLocale(''), false);
  assert.equal(getLocale(), previous);
});

test('els cinc idiomes del taller estan disponibles', () => {
  const locales = availableLocales();
  assert.deepEqual(
    locales.map(l => [l.code, l.available]),
    [['ca', true], ['es', true], ['gl', true], ['eu', true], ['en', true], ['zz', true]],
  );
});

test('extensió futura: un catàleg registrat esdevé seleccionable i tradueix', () => {
  registerLocale('yy', { 'test.only': 'prova {value}' });
  assert.equal(availableLocales().find(l => l.code === 'yy').available, true);
  const previous = getLocale();
  try {
    assert.equal(setLocale('yy'), true);
    assert.equal(t('test.only', { value: '42' }), 'prova 42');
  } finally {
    setLocale(previous);
  }
});

test('registre segur: rebutja codis i catàlegs mal formats', () => {
  assert.throws(() => registerLocale('../../etc/passwd', {}));
  assert.throws(() => registerLocale('https://evil.example/x.js', {}));
  assert.throws(() => registerLocale('ab', null));
});

test('persistència tolerant a fallades: localStorage que llança no atura res', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('emmagatzematge blocat'); },
  });
  try {
    assert.equal(initI18n(), DEFAULT_LOCALE);
    const previous = getLocale();
    assert.equal(setLocale('zz'), true);
    assert.equal(getLocale(), 'zz');
    setLocale(previous);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('persistència: un idioma desat i disponible es recupera a initI18n', () => {
  const store = new Map([['relleu-obert-locale', 'zz']]);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
  });
  try {
    assert.equal(initI18n(), 'zz');
    assert.equal(getLocale(), 'zz');
  } finally {
    setLocale(DEFAULT_LOCALE);
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('formats locals: nombres i plurals segons l’idioma actiu', () => {
  const previous = getLocale();
  setLocale(DEFAULT_LOCALE);
  assert.equal(formatNumber(1234.5), '1.234,5');
  assert.equal(plural(1, { one: '{count} peça', other: '{count} peces' }), '1 peça');
  assert.equal(plural(3, { one: '{count} peça', other: '{count} peces' }), '3 peces');
  setLocale(previous);
});

test('regressió: codis heretats o maliciosos no són idiomes vàlids', () => {
  const previous = getLocale();
  for (const code of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf']) {
    assert.equal(setLocale(code), false, code);
  }
  assert.equal(getLocale(), previous);
});

test('regressió: un codi desat maliciós o no suportat cau a l’idioma per defecte', () => {
  for (const saved of ['__proto__', 'constructor', 'toString', 'de', '']) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => saved, setItem: () => {} },
    });
    try {
      setLocale(DEFAULT_LOCALE);
      assert.equal(initI18n(), DEFAULT_LOCALE, saved);
      assert.equal(getLocale(), DEFAULT_LOCALE, saved);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
      else delete globalThis.localStorage;
    }
  }
});

test('regressió: registerLocale rebutja etiquetes mal formades abans que Intl pugui llançar', () => {
  for (const bad of ['', 'no sóc una etiqueta!', '../../x', 'a'.repeat(40), 'ca;DROP']) {
    assert.throws(() => registerLocale(bad, { k: 'v' }), undefined, bad);
    assert.equal(setLocale(bad), false, bad);
  }
});

test('regressió: registerLocale canonicalitza etiquetes vàlides (majúscules)', () => {
  registerLocale('AB', { 'test.ab': 'canònic' });
  assert.equal(availableLocales().find(l => l.code === 'ab').available, true);
  const previous = getLocale();
  try {
    assert.equal(setLocale('ab'), true);
    assert.equal(t('test.ab'), 'canònic');
  } finally {
    setLocale(previous);
  }
});

test('fallback explícit: clau absent del catàleg actiu cau al català sense canviar l’idioma', () => {
  registerLocale('en-GB', {});
  const previous = getLocale();
  try {
    assert.equal(setLocale('en-GB'), true);
    assert.equal(t('footer.tagline'), 'Un tros del món, a les teves mans.');
    assert.equal(getLocale(), 'en-GB');
    assert.equal(formatNumber(1234.5), '1,234.5');
  } finally {
    setLocale(previous);
  }
});

test('regressió: valors amb aspecte HTML queden literals via textContent', () => {
  registerLocale('hw', {
    'test.markup': '<b>negreta</b>',
    'test.param': 'Valor: {value}',
  });
  const previous = getLocale();
  try {
    assert.equal(setLocale('hw'), true);
    const injected = '<img src=x onerror=alert(1)>';
    assert.equal(t('test.param', { value: injected }), `Valor: ${injected}`);
    const el = { dataset: { i18n: 'test.markup' }, textContent: '', innerHTML: 'sense toc-ar' };
    const root = { querySelectorAll: sel => (sel === '[data-i18n]' ? [el] : []) };
    translateDom(root);
    assert.equal(el.textContent, '<b>negreta</b>');
    assert.equal(el.innerHTML, 'sense toc-ar');
  } finally {
    setLocale(previous);
  }
});

test('els catàlegs cobreixen el marcatge i conserven els paràmetres en els cinc idiomes', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const keys = [...html.matchAll(/\bdata-i18n(?:-[a-z]+)?="([^"]+)"/g)].map(match => match[1]);
  for (const key of keys) assert(Object.hasOwn(workshopRows,key), key);
  const fields = text => [...new Set(text.match(/\{[a-zA-Z]\w*\}/g) ?? [])].sort();
  for (const [key,row] of [...Object.entries(workshopRows),...engineRows.map(row=>[row[0],row])]) {
    assert.equal(row.length, WORKSHOP_LOCALES.length, key);
    assert(row.every(text => typeof text === 'string' && text.trim()), key);
    for (const text of row) assert.deepEqual(fields(text), fields(row[0]), key);
  }
});

test('un canvi d’idioma notifica les vistes actives i tradueix missatges amb dades', () => {
  const previous = getLocale(), notified = [], stop = onLocaleChange(code => notified.push(code));
  try {
    setLocale('en');
    assert.equal(translateEngineMessage('Carregant relleu 3/9 · Mapterhorn…'), 'Loading terrain 3/9 · Mapterhorn…');
    setLocale('eu');
    assert.equal(translateEngineMessage('Calculant els edificis…'), 'Eraikinak kalkulatzen…');
    stop();
    setLocale('gl');
    assert.deepEqual(notified, ['en', 'eu']);
    assert.equal(translateEngineMessage('External provider message'), 'External provider message');
  } finally {
    stop();
    setLocale(previous);
  }
});

test('un text mixt conserva els elements fills i els espais', () => {
  const previous = getLocale();
  try {
    setLocale('en');
    const text = {nodeType:3,nodeValue:'  Idioma '};
    const svg = {nodeType:1};
    const el = {childNodes:[svg,text],dataset:{i18nText:'header.language'}};
    translateDom({querySelectorAll:selector=>selector==='[data-i18n-text]'?[el]:[]});
    assert.equal(text.nodeValue, '  Language ');
    assert.equal(el.childNodes[0], svg);
  } finally {
    setLocale(previous);
  }
});
