# RO-043 — Actualització automàtica d’edificis

**Estat:** implementat, proves locals i build correctes; pendent de validació d’usuari.

## Petició de l’usuari

Canvis d’edificis amb espera breu, cua i conservació del terreny.

## Abast implementat

- **`src/building-update-scheduler.js` (nou):** planificador pur i petit, amb temporitzadors, funció `run`, predicats `canAutoUpdate`/`isBusy` injectables. Debounce de 300 ms, coalescència d’edicions ràpides (només s’executa l’estat més recent), sense solapament d’execucions, sense reintents automàtics després d’un error (fase `error` estable fins a `retry()` o una nova edició), tokens per detectar resultats obsolets (`isCurrent`), i `cancel()`/`dispose()`.
- **`src/main.js`:** els canvis de font, mode i altura d’edificis (`#building-source`, `#building-mode`, `#building-height`) criden `requestBuildingsAuto()` en lloc de `requireBuild()`:
  - Si el model existeix i el terreny/selecció/mida/escala/exageració estan nets (`sameTerrain`), es programa l’actualització incremental existent (`worker.postMessage({type:'buildings',…})`), sense tornar a descarregar terreny. La font nova es carrega amb el `loadBuildingLayer` incremental ja existent; sense cap crida nova a endpoints ni canvi de dades.
  - Si el terreny és brut o no hi ha model, el planificador retorna `manual` i es manté el flux explícit de «Generar el model» (com abans).
  - Si hi ha un altre càlcul, vegetació, importació o exportació en marxa, l’edició queda en cua i es buida en acabar correctament (`scheduler.flush()` als handlers de `model`, `download` i `imported`); després d’un error no hi ha buidatge automàtic (mai bucle infinit).
  - Robustesa revisada i verificada: `job`/`lock` ocupats ABANS de qualsevol crida de xarxa; regió, font, dades locals i opcions capturades abans de l’espera; després de l’espera es tornen a comprovar `scheduler.isCurrent(token)`, la identitat de la regió, les dades locals i `sameTerrain(opcions)` ABANS d’assignar `pendingBuildingLayer` o fer `postMessage`. Una petició quedada enrere desbloqueja el seu propi job sense post ni commit de font, i la cua aplica l’estat més recent. `cancel()` incrementa la versió: invalida tokens en vol (`isCurrent` retorna fals) i descarta el resultat quan arribi. Si una execució falla amb una edició NOVA encuada, només la petició fallida queda en error (mai reintentada) i la nova s’executa una sola vegada quan és possible; sense edició nova, no hi ha cap reintent automàtic. Les respostes del worker amb token no vigent es descarten conservant l’últim model.
  - En fallar, `needsBuild` queda actiu, el model es conserva i el botó «Actualitzar els edificis» segueix disponible com a reintent explícit. `generate()` cancel·la qualsevol actualització automàtica pendent per evitar duplicitats.
  - Estat accessible: la barra d’estat mostra «Edificis pendents d’actualització automàtica…», «Edificis en cua…» i els missatges existents `status.updatingBuildings`/`status.buildingsUpdated`. Etiquetes sense canvis: el botó diu «Actualitzar els edificis» quan l’actualització incremental és possible, i la selecció de font continua sent explícita, sense fallback.
- **`tests/building-update-scheduler.test.js` (nou):** 10 proves sense `sleep` (temporitzadors i promeses diferides injectades): ràfega amb debounce, cua en ocupat i buidatge, error sense reintents i retry explícit, edició durant l’execució (token obsolet + encuada), terreny brut → mai automàtic, cancel/dispose, absència de solapament, cancel·lació que invalida el token en vol, edició nova encuada que sobreviu a la fallada anterior i s’executa una sola vegada, i fallada sense edició nova sense cap reintent automàtic. La guarda pre-commit de `main.js` depèn de DOM/worker i queda coberta per validació manual (vegeu limitacions).

## Verificació

- `node --test --test-concurrency=1 tests/*.test.js` → **138 pass, 0 fail**.
- `node node_modules/vite/bin/vite.js build --base=./ --configLoader native` → **correcte** (només l’avís habitual de mida de chunk).

## Limitacions i comprovacions manuals pendents

- El debounce real al navegador és de 300 ms per a font, mode i altura; cal validació d’usuari sobre la sensació de fluïdesa amb el control d’altura.
- Comprovar manualment al navegador: canvi d’edificis amb terreny net (auto), canvi amb terreny brut (botó Generar), edició mentre s’exporta o es pinta vegetació (cua), i error de xarxa en carregar una font nova (model conservat + reintent explícit).
- El reintent explícit després d’un error és el botó principal; el `retry()` del planificador queda disponible però la UI no hi afegeix un control nou.

## Revisió d’integració

La distinció entre peticions antigues i noves es fa pel número de versió, també quan la referència d’estat reutilitzada és la mateixa. Regressió afegida i 11 proves del planificador superades. El carregador bloqueja la feina abans de la xarxa i valida regió, versió i configuració abans d’enviar al Worker. No s’atribueix al planificador una recuperació de totes les fallades de xarxa: les fallades sense nova petició continuen amb reintent explícit.

Navegador local: canviar altura5→8 i fontICGC→OSM aplica automàticament la capa (623→235 fragments), sense prémer Actualitzar; descàrrega habilitada després. Canviar exageració1,5→1,75 i altura9 deixa Generar explícit i descàrrega desactivada fins a regenerar. Validació d’usuari pendent.
