# RO-041 / RO-042 — Pinzell: navegació i cobertura per gest

Data: 01/11/2026. Execució seqüencial delegada (Kimi). Estat: correcció implementada, proves locals en verd; validació d’usuari pendent.

## RO-041 — Recuperar la navegació en tancar vegetació

- `src/main.js`: nova selecció centralitzada de mode (`setBrush`, `selectNavigate`, `endVegetationEditing`). Tots els camins passen pel mateix codi: botons `[data-brush]`, el cas d’arbres omesos per escala (abans feia `.click()` divergent) i el tancament de seccions.
- En tancar el panell de vegetació (`config-toggle-4`) o en obrir una altra secció mentre és obert: s’acaba el traç actiu de forma segura (`finishStroke`, que aplica els canvis pendents), s’amaga el cursor, es selecciona Navega, es restaura `controls.enabled` (òrbita/pan) i els estats `aria-pressed`/classe `selected`, i el hint del visor.
- `setBrush` també acaba qualsevol traç actiu en canviar d’eina, evitant gestos penjats.

## RO-042 — Densitat i cobertura única de cada traç

- `index.html`: densitat del pinzell per defecte ×0,5, rang UI min .25 / màx 2 / pas .25. La densitat automàtica del bosc (2,5) no canvia; `scatterBrush` i la validació de `geometry.js` conserven el rang 0,25–5, així que valors històrics de densitat desats en traços antics segueixen vàlids.
- Nou `src/brush-coverage.js`:
  - `createGestureCoverage(cellSize=8)`: índex espacial per graella dels cercles visitats en un gest. `covers(x,y)` consulta només la cel·la del punt (els cercles s’insereixen a totes les cel·les de la seva capsa), de manera que el cost per punt és acotat i no hi ha escombrats arbres×traços quadràtics. Radi ≤ 30 i cel·la 8 → com a molt 64 cel·les per cercle.
  - `withoutLastGesture(strokes)`: desfés de gest sencer, reutilitzat pel botó Desfés de `main.js`.
- `src/geometry.js` (`updateVegetation`): els traços `add` amb el mateix `gesture` comparteixen cobertura; els punts del `scatterBrush` que cauen dins de cercles anteriors del mateix gest es descarten. Un gest nou reinicia la cobertura i pot tornar a afegir. Traços sense `gesture` (antics) usen l’índex del bucle (comptador propi, no `indexOf`, que fallava amb objectes duplicats) i conserven el comportament per traç. Es mantenen el scatter aleatori, la densitat per traç, la semàntica de la goma, el pressupost d’arbres i la prioritat dels manuals.

## Proves

- `tests/brush-coverage.test.js` (10 tests): cobertura unitària, desfés de gest, mateix centre repetit dins del gest, gest nou sobre zona pintada, anada i tornada dins del mateix gest, solapament = unió, compatibilitat de traços antics sense gest, esborrat determinista, i rang/defectes de la UI llegint `index.html`.
- Suite completa: `node --test --test-concurrency=1 tests/*.test.js` → 127/127 passen (inclosos els antics de `brush-scatter` i `vegetation-budget`, sense modificar-los).
- Build: `node node_modules/vite/bin/vite.js build --base=./ --configLoader native` → correcte.

## Limitacions / comprovacions manuals pendents

- No s’ha verificat al navegador: cal comprovar manualment que en plegar Vegetació o obrir una altra secció amb un traç a mig fer, el traç s’aplica, el cursor desapareix i l’òrbita/pan torna (ho farà l’usuari/root).
- El comportament de cobertura depèn de `stroke.gesture`, que `main.js` ja assigna per `pointerdown`; gestos creats per altres vies sense `gesture` es tracten com a traços independents (comportament antic).

## Revisió d’integració

Afegits límits d’entrada a l’índex per evitar increments no representables amb coordenades/cel·les extremes, i deduplicació de cercles idèntics. Nova regressió amb 10.000 repeticions: 128 proves totals i build correctes. El cost depèn dels cercles presents a la cel·la consultada; la graella evita cercar sempre tots els traços, però no acredita un límit de temps absolut per a qualsevol sessió. Al navegador local: densitat inicial0,5/màxim2, retorn a Navega en plegar o canviar panell, cursor ocult i òrbita real comprovats. Traç a mig fer amb punter capturat i impressió física pendents de validació d’usuari.
