# RO-012 — Mode Presentació

2026-11-02 · Nucli delegat a Kimi i integració/revisió de l’agent principal. Implementat a v0.12; validació de l’usuari pendent. La [proposta anterior](RO-012-PROPOSTA.md) és l’antecedent, no el registre de funcionalitat actual.

## Fitxers nous

- `src/presentation-scene.js` — mòdul del mode Presentació.
- `tests/presentation-scene.test.js` — 12 proves amb escena/càmera/malles THREE reals i stubs de renderer/controls.
- `src/render-scheduler.js` i `tests/render-scheduler.test.js` — cua a demanda i 5 proves.

## API

`createPresentationMode({scene, camera, renderer, controls, group, light, ground, getSeams, getFrame, onReset, onStatus})` retorna:

- `enter(model)` → entra al mode; idempotent (segona crida retorna `false` sense efecte). Valida `model.width/height` abans de mutar res; si l'aplicació falla a mig camí, reverteix tot l'estat tocat i allibera els recursos propis creats.
- `exit()` → restaura tot l'estat i elimina els recursos propis; idempotent.
- `refreshBounds(model, {resetCamera=false})` → reescala la taula al nou model (geometria pròpia vella alliberada), amaga les costures noves. Incremental: conserva la instantània de càmera. `resetCamera: true` (regeneració completa): invalida la instantània i recol·loca la càmera; aleshores `exit()` crida `onReset()` (home) en lloc de restaurar la vista antiga.
- `isActive()` / `dispose()` — dispose repetible; amb mode actiu restaura l'escena primer; `enter` després de dispose llença error.

## Comportament

- Reutilitza les malles de `group` (mai clonades ni dispose); no toca geometria, materials ni coordenades del model ni de `group`.
- Taula pròpia: `BoxGeometry(width×2, height×2, 20 mm)`, centre Z=−10 (cara superior a Z=0), `MeshStandardMaterial` pla càlid (0xb98a5e), sense textures ni actius externs.
- Fons neutre (0xe9e7e2); una única llum de farciment pròpia sense ombres; la direccional existent es reorienta i s'ajusta la càmera d'ombres (mapa intacte, ≤2048).
- Amaga `ground` i les costures vives (`getSeams()`); restaura la visibilitat només si l'objecte segueix a l'escena (els substituïts per `display()` no es toquen). El marc (`getFrame()`) no s'amaga; només entra al càlcul de límits.
- Instantània i restauració exactes de: fons, visibilitats, llum (posició/intensitat/target/càmera d'ombres), renderer (pixelRatio, limitat a 2 dins del mode; shadowMap.enabled), càmera (posició/up/quaternion/zoom/fov/near/far) i controls (target i límits).
- `onStatus` rep `'enter' | 'exit' | 'refresh'`; `onReset` substitueix la restauració de càmera quan la instantània s'ha invalidat.

## Verificació local (2026-11-02)

- `node --test --test-concurrency=1 tests/*.test.js` → **165/165 en verd** (9 noves).
- `node node_modules/vite/bin/vite.js build --base=./ --configLoader native` → **en verd** (l'avís de mida de chunks és preexistent).

## Integració i revisió

- Botó «Presentació» amb `aria-pressed`, llegenda permanent i textos del botó/llegenda al catàleg català. Taula de color pla: no s’ha afegit textura ni cap descàrrega.
- Cua de fotogrames fins que s’estabilitza l’amortiment; sense bucle permanent en repòs dins del mode. Materials, dimensions, marc i malles invaliden la vista. Límits de cua i errors provats.
- Si el percentil 95 de 30 intervals actius supera 50 ms, es desactiven ombres i es limita la relació de píxel a 1 durant aquesta sessió. Els períodes en repòs no compten com a lentitud. Qualitat anterior restaurada en sortir; sense afirmar cap guany mesurat.
- Pèrdua/restabliment de context: pausa i missatge de recuperació, sense regenerar el model numèric. Aquest esdeveniment encara no s’ha forçat al navegador.
- Restauració després d’errors, costures substituïdes i canvi de dimensions/llum revisats; sense alliberar geometria compartida.

## Comprovació al navegador local

- Construcció estàtica sota `/relleu-obert/`: entrada/sortida, òrbita i indicador il·lustratiu visibles.
- Actualització automàtica d’altura d’edificis dins de Presentació i retorn al Taller correctes. Zero errors de consola en aquest recorregut.
- Dues descàrregues STL i dues 3MF Bambu reals amb Presentació activada/desactivada: sis entrades en cada parella (geometria, materials i metadades) idèntiques byte a byte després de normalitzar dates del contenidor. Evidència local a `output/v012-presentation-{on,off}-stl.zip` i `output/v012-presentation-{on,off}.3mf`.
- Memòria GPU i temps de fotograma amb instrumental no mesurats. Lector de pantalla, pèrdua real de context, validació de l’usuari i impressió física pendents. Sense comprovacions remotes de Pages/CI.
