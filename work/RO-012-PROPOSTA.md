# RO-012 — Proposta d’implementació: escena de presentació realista

**Antecedent de disseny:** el registre d’implementació i proves de v0.12 és a [RO-012-IMPLEMENTACIO.md](RO-012-IMPLEMENTACIO.md). Les referències a proves futures d’aquest document corresponen al moment de redactar la proposta.

2026-11-01 · Proposta per a una futura iteració 0.x; **no és codi implementat ni validat**. Relació amb [BACKLOG.md](BACKLOG.md#ro-012--presentació-realista-del-model-imprès), [RO-014-PROPOSTA.md](RO-014-PROPOSTA.md), [RO-016-PROPOSTA.md](RO-016-PROPOSTA.md) i [RO-017-PROPOSTA.md](RO-017-PROPOSTA.md). L’escena usa la **malla real del preview i els colors seleccionats**; cap imatge generada per IA ni fotografia substitueix la geometria.

## 1. Propòsit i abast

Un **mode de vista «Presentació»** alternatiu al mode actual («Taller»), que mostra el model com si fos la peça impresa sobre una taula d’escola: perspectiva, fons neutre, taula, llums i ombres ajustades. Tot procedimental i local: sense textures externes, sense xarxa, sense dependències noves, compatible amb GitHub Pages estàtic.

Decisions d’usuari (defectes entre parèntesis): mode Presentació (**desactivat**); superfície de taula (**fusta clara procedimental**); mostrar el marc de previsualització a l’escena (**segons el selector existent**); moviment de càmera d’entrada (**desactivat si `prefers-reduced-motion`**).

No decisions d’aquesta línia: canviar el model exportat, els materials, les coordenades del món, el marc imprimible (RO-014), plaques (RO-016), brúixola (RO-017), ni cap servei de renderitzat extern.

## 2. Comportament actual vs planificat

**Actual (codi existent, `src/main.js`):** una sola escena THREE permanent: `PerspectiveCamera(34)` amb `camera.up=(0,0,1)` (`src/main.js:25`), `WebGLRenderer` amb `PCFSoftShadowMap` i `SRGBColorSpace` (`src/main.js:26`), llum hemisfèrica + direccional amb ombres de 2048 (`src/main.js:28`), terra `ShadowMaterial` gairebé invisible (`src/main.js:29`), i `group` amb una malla per categoria creada a `display()` a partir de `model.categories` (vèrtexs i cares en **mm físics**, `src/main.js:38-44`). Colors segons `PALETTES[materialCount][assignments]` a `recolor()` (`src/main.js:34`). Marc escènic de `createPreviewFrame` (`src/preview-frame.js`), no exportat. Bucle continu `renderer.setAnimationLoop` (`src/main.js:33`). Dispose per malla a `dispose()` (`src/main.js:37`).

**Planificat (no implementat):** nou mòdul `src/presentation-scene.js` que **reorganitza la mateixa escena** per al mode Presentació i la restaura en sortir. La geometria del model **no es copia ni es recrea**: es reutilitzen les malles existents de `group`; no es dupliquen arbres ni cap categoria.

## 3. Arquitectura: commutació de mode, recursos i dispose

**API proposada (costat escena, amb THREE):**

- `createPresentationMode({scene, camera, renderer, controls, group})` → `{enter(options), exit(), isActive(), dispose()}`.
- `snapshotCamera(camera, controls)` → `{position, target, zoom}`; `restoreCamera(camera, controls, snap)`: desar i restaurar la vista del Taller en entrar/sortir; si no hi ha instantània, `home()` existent.
- `presentationConfig(options)` (part pura, provable a node): valida taula, fons, llums i retorna paràmetres normalitzats o error abans de tocar l’escena.

**Recursos propis del mode (creats a `enter`, eliminats a `exit` amb `geometry.dispose()`/`material.dispose()`, mai compartits amb `group`):**

- **Taula procedimental:** una `BoxGeometry` (p. ex. `model.width×2` × `model.height×2` × 20 mm) amb `MeshStandardMaterial` de color fusta; textura opcional generada amb `DataTexture` procedural (veteig determinista amb llavor fixa, codi propi). **Cap fitxer d’imatge**: cap actiu gràfic extern per llicenciar; conservar els avisos de les dependències existents, amb escena disponible fora de línia un cop carregada l’aplicació; els textures del projecte a `public/licenses/` no s’hi afegeixen.
- **Fons:** `scene.background` de color neutre i, opcionalment, paret posterior simple; es restaura el fons anterior (transparent/alpha) en sortir.
- **Llums:** reorientar la direccional existent (no afegir-ne una segona d’idèntica) i afegir **una** llum de farciment suau; guardar posicions/intensitats prèvies i restaurar-les. Ombres: conservar el pressupost actual (mapa ≤ 2048), mai augmentar-lo.
- **Elements del Taller ocults temporalment:** línies de costura `seams` i el terra `ShadowMaterial`; el marc `previewFrame` només es mostra si ja existeix com a geometria real (selector de marc ≠ `none`).

**Dispose compartit:** `exit()` i `dispose()` eliminen només els recursos del mode. Les malles de `group` segueixen gestionades per `display()`/`dispose()` existents; el mode Presentació **mai** en fa dispose. Canvis de model mentre el mode és actiu (regeneració, vegetació, edificis incrementals) reapliquen `recolor()` normalment; l’escena no en té còpia.

## 4. Invariança del model i condicionalitat d’accessoris

- **Res no altera el model exportable:** el mode no toca `model.parts`, `CATEGORIES`, `defaultAssignments`, coordenades del món ni escala; només presentació visual. L’exportació des del mode Presentació produeix els **mateixos fitxers** que des del Taller (criteri: exportació idèntica byte a byte, a comprovar en proves futures).
- **Unitats físiques:** la taula i la composició es dimensionen en mm a partir de `model.width`/`model.height` reals; l’escala de l’escena no s’inventa.
- **Accessoris condicionals:** marc imprimible (RO-014), placa (RO-016) i brúixola (RO-017) són propostes **no implementades**. L’escena **no els simula**: només inclou un element quan la seva geometria real existeixi al projecte (avui: només el marc escènic de `preview-frame.js`). Cap maqueta d’accessori inventada per fer la foto.

## 5. Renderitzat a demanda, pressupostos i degradació de qualitat

- **A demanda:** en mode Presentació, aturar el bucle continu (`setAnimationLoop(null)`) i renderitzar només a esdeveniments (`controls.change`, redimensionat, canvi de mode/model). El mode Taller conserva el comportament actual. Estalvi de GPU/CPU en repòs, sense cap xifra de millora no mesurada.
- **Pressupostos conservatives:** `pixelRatio ≤ 2` (ja existent), ombres ≤ 2048 (ja existent), una sola textura procedural ≤ 256×256, zero càrregues de xarxa, zero geometria duplicada. La taula i el fons són O(10) triangles.
- **Degradació:** si `renderer.getContext()` falla o el temps de fotograma mesurat supera un llindar conservador durant la primera interacció, es desactiven ombres del mode i es baixa `pixelRatio` a 1, amb nota a l’estat; mai es bloqueja la vista. Si `enter()` falla, es torna al Taller amb missatge d’error via `say()` i la sessió continua (fallada aïllada).
- **Pèrdua de context WebGL:** el mode no afegeix listeners nous propis; es recolza en el renderer existent i es desactiva netament si l’escena es reinicia.

## 6. Interfície, estabilitat i accessibilitat

- **Commutador d’escriptori intuïtiu:** botó «Presentació» a la filera de controls del visor (com `#reset`/`#top`, `src/main.js:101`), amb `aria-pressed`, estat visible i teclat operable. **Cap menú nou de primer nivell**; header/footer sempre visibles i sidebars estables amb scroll intern (AGENTS.md); el mode no mou cap panell ni canvia la disposició.
- **Reducció de moviment:** sense animació automàtica de càmera si `matchMedia('(prefers-reduced-motion: reduce)')`; en qualsevol cas, l’entrada és instantània per defecte i qualsevol transició futura serà opcional.
- **Anunci d’estat:** text viu «Vista de presentació activada: escena il·lustrativa, no és l’aspecte garantit de la impressió» via el canal d’estat existent; errors en català clar.
- **Honestedat educativa:** llegenda permanent dins del mode: «Render il·lustratiu amb els colors triats; la llum i l’acabat són virtuals i no garanteixen l’aspecte de la peça impresa.» El model i la descàrrega continuen operatius amb el mode desactivat (requeriment del backlog).

## 7. Implementació per fases (fitxers reals)

1. **Nucli d’escena:** nou `src/presentation-scene.js` amb `presentationConfig` (pura), `snapshotCamera`/`restoreCamera`, taula/fons/llums i `enter/exit/dispose`. Sense UI.
2. **Proves (FUTURES, no executades en aquesta proposta):** nou `tests/presentation-scene.test.js` amb node:test sobre la part pura: validació de configuració, instantània/restauració de càmera (valors exactes), determinisme de la textura procedural (mateixa llavor → mateixos bytes), errors amb paràmetres invàlids. La interacció WebGL real queda fora de node:test i es verifica al navegador (futur).
3. **Integració UI:** cablejat del botó i del mode a `src/main.js`, desant/restaurant càmera i amagant `seams`; renderitzat a demanda només en mode Presentació; textos via catàleg i18n (`src/i18n.js`).
4. **Qualitat:** mesura de fotograma inicial i degradació del §5; documentació de límits.
5. **Posteriors condicionades:** incloure a l’escena el marc imprimible/placa/brúixola **només quan** RO-014/016/017 existeixin com a geometria real; mai abans.

Cada fase amb versió 0.x i entrada de backlog/historial; mai 1.0 sense petició explícita.

## 8. Gestió d’errors i límits

- Configuració invàlida o WebGL indisponible → error abans de mutar l’escena; Taller intacte.
- `exit()` idempotent: sortir dues vegades no fa dispose de res compartit ni perd la instantània del Taller.
- Cap textura externa: si la textura procedural falla, color pla de fusta; mai una descàrrega de rescat.
- Límits declarats: el render **no garanteix** colors de filament, acabat, ombres ni escala percebuda de la impressió física; la taula és escenografia, no una peça exportable; la composició de llums és fixa i no un estudi fotogràfic.

## Precisió de la revisió

- Taula centrada a XY=0 amb cara superior Z=0 i centre Z=−10 mm per a gruix 20 mm; no moure ni escalar `group`. Recalcular límits de càmera/ombres conservant el mapa màxim de 2048.
- Afegir `refreshBounds(model)` després de `display()`, `tiling()` i `updateFrame()`: ajustar taula/composició a les noves dimensions, amagar les costures acabades de crear i evitar referències a marcs eliminats. En una regeneració completa, invalidar la instantània de càmera antiga i usar `home()` en sortir; actualitzacions incrementals conserven la vista.
- Desar/restaurar totes les propietats que es modifiquin: projecció i controls de càmera, relació de píxel, ombres, llums, fons, visibilitats i mode de bucle. Restaurar-les també si l’entrada falla a mig camí.
- Amb `enableDamping=true`, el render a demanda necessita una cua `requestAnimationFrame` fins que els controls s’estabilitzin, sense crides recursives síncrones des de `controls.change`. També invalidar després de resize, canvis de colors/marc i missatges incrementals del Worker; zero bucle permanent en repòs.
- Si es perd el context, pausar i mostrar estat de recuperació; tornar al Taller no recupera per si sol un WebGL perdut. A `webglcontextrestored`, recrear només recursos propis que calgui i tornar a invalidar, sense regenerar el model numèric.
- Per a la futura comparació binària d’exportacions, fixar o normalitzar dates ZIP i altres metadades variables; comparar també malles i assignacions semàntiques. Cap d’aquestes comprovacions d’una escena futura es presenta com a superada ara.

## 9. Criteris d’acceptació (tots FUTURS, cap executat)

1. **Numèric (automàtic, futur):** `tests/presentation-scene.test.js` en verd; instantània/restauració de càmera exacta; textura procedural determinista; suite completa existent i build estàtic en verd.
2. **Invariança (automàtic + revisió, futur):** exportació 3MF/STL idèntica byte a byte amb el mode activat i desactivat; `model.parts`, materials i coordenades sense canvis.
3. **Visual i rendiment (usuari + mesura, futur):** comparació de captures Taller/Presentació del mateix model; mesura de memòria GPU abans/després (sense duplicació de geometria) i de temps de fotograma amb el pressupost del §5, registrats abans de declarar cap xifra.
4. **Accessibilitat (usuari, futur):** commutador operable només amb teclat, anunci d’estat correcte, `prefers-reduced-motion` respectat i panells estables; comprovació amb lector de pantalla pendent.

Cap d’aquests criteris es dona per complert per haver escrit aquest document; RO-012 té la **implementació pendent** fins a implementació i validació.
