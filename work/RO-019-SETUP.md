# RO-019 — Preparació del sistema d’internacionalització (setup, sense traduccions)

Data: 2026-11-01. Abast: infraestructura i selector d’idioma. **No s’ha fet cap traducció**: el català és l’únic catàleg disponible i també el fallback explícit. Estat del backlog: fase «setup» implementada i provada localment; pendent de validació d’usuari al navegador.

## Què s’ha implementat

- `src/i18n.js` — nucli:
  - `t(key, params)`: cerca de clau plana amb substitució de paràmetres `{name}`. Si la clau falta al catàleg actiu, cau al català (`DEFAULT_LOCALE`); si no hi és enlloc, retorna `''` i avisa per consola — **mai no s’exposa la clau a l’usuari**.
  - `registerLocale(code, catalog)`: registre segur amb `Map` (sense membres heretats), validació d’etiquetes via `Intl.getCanonicalLocales` i còpia del catàleg amb prototipus nul. Només catàlegs importats estàticament; mai càrrega d’URL arbitràries. El selector marca l’idioma actiu amb `aria-pressed`.
  - `setLocale(code)` / `getLocale()` / `availableLocales()`: `setLocale` retorna `false` per idiomes sense catàleg i conserva l’actiu.
  - `formatNumber(value, options)` (`Intl.NumberFormat`) i `plural(count, forms)` (`Intl.PluralRules`) amb l’idioma actiu.
  - Persistència a `localStorage` (`relleu-obert-locale`) envoltada de `try/catch`: si l’emmagatzematge falla o llança, l’aplicació continua amb l’idioma per defecte.
  - `applyLocale()`: actualitza `document.documentElement.lang`, retradueix el DOM marcat amb `data-i18n`, `data-i18n-aria`, `data-i18n-title`, `data-i18n-placeholder` i refresca el selector d’idioma.
- `src/locales/ca.js` — catàleg català amb les claus representatives (capçalera, 4 títols de secció, peu, diàleg d’idioma i missatges d’estat del flux principal).
- `index.html` — botó «Idioma» a la capçalera (estil `header-button`) i `<dialog id="language-dialog">` amb els estils de diàleg actuals. Català seleccionable; Castellà, Galego, Euskera i English **desactivats** amb l’etiqueta «Pendent de catàleg». Sense icones de banderes. Layout, capçalera, peu, diàlegs i els 4 títols de configuració es mantenen intactes.
- `src/main.js` — `initI18n()` abans d’`initDialogs()`; missatges d’estat representatius passen per `t()` (càrrega del territori, construcció, actualització d’edificis/vegetació, cerca de llocs, exportació, canvis pendents).
- `src/usability.css` — estils de `.language-list` (afegits al final, sense tocar la resta).
- `tests/i18n.test.js` — 17 proves: cerca, substitució, fallback explícit, idiomes no suportats, registre segur, extensió amb fixtures sintètics (`zz`, `yy`, `ab`, `hw`), persistència tolerant a fallades i recuperada, formats de nombre i plural, i regressions: codis heretats/maliciosos (`__proto__`, `constructor`, `toString`…), codis desats no suportats, etiquetes mal formades rebutjades, canonicalització i valors amb aspecte HTML literals via `textContent`.

## Migració de cadenes pendent (fora d’abast d’aquest setup)

Resten en català en línia, entre d’altres: etiquetes i opcions dels 4 panells de configuració, sidebar dret (mètriques, materials, exportació), diàlegs d’ajuda/versions/V4V, missatges dinàmics de `main.js` (`lock()`, `tiling()`, `requireBuild()`, `buildingInfo()`, `buildingControls()`, `scaleHint()`, missatges del worker i d’errors de les fonts) i els `toLocaleString('ca')` directes (candidats a `formatNumber`). Procediment proposat: afegir la clau al catàleg català, marcar l’element estàtic amb `data-i18n` a `index.html` o passar el literal dinàmic per `t()`, i validar al navegador.

Abans d’habilitar una altra llengua a producció, completar la migració de textos pendents, també les etiquetes dinàmiques, l’idioma XML de `src/export.js` i la política d’actualització dels missatges ja visibles en canviar de llengua. El setup actual només retradueix els elements marcats al DOM; no és una interfície multilingüe completa.

## Com registrar un nou catàleg (contribuidors futurs)

1. Crear `src/locales/<codi>.js` amb `export default { ... }` i **exactament les mateixes claus** que `src/locales/ca.js`.
2. A `src/i18n.js`: `import es from './locales/es.js';` (import estàtic) i `registerLocale('es', es);` després de la declaració de `catalogs`.
3. Afegir el codi a `KNOWN_LOCALES` si no hi és i crear el botó corresponent `[data-locale]` a `index.html` quan encara no existeixi. El botó del diàleg s’activa sol (`renderLanguageList` habilita qualsevol `[data-locale]` amb catàleg registrat).
4. Revisar les formes de `plural()` per a l’idioma i executar `node --test --test-concurrency=1 tests/*.test.js` i la construcció.

## Verificació local

- Suite completa: 106 proves, 106 passades (17 d’i18n, després de revisió), 0 fallades.
- Construcció: `node node_modules/vite/bin/vite.js build --base=./ --configLoader native` correcta (avís de mida de chunk preexistent).

## Comprovacions manuals pendents (usuari)

- Selector d’idioma al navegador: obertura/tancament del diàleg, estats desactivats sense confusió, cap salt del layout escriptori.
- Persistència real: recarregar amb l’idioma desat (quan n’hi hagi més d’un).
- Lectors de pantalla: `lang` del document i missatges `aria-live` en l’idioma actiu.
