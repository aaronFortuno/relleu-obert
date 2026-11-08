# RO-039 — Catastre: «signal timed out» en brut carregant Tamariu (v0.9.0)

## Diagnòstic

**Evidència** (sonda WFS oficial, 2026-11-01, 2 consultes):
- Crop petit de Perica (~200 m, `BU.BUILDING`): el servei va trigar **15,5 s** per 299 KB. El servei INSPIRE BU del Catastro és lent i irregular.
- Tamariu sencer (~1,8 km): resposta de **300 B en 1,8 s**, cos no inspeccionat.

**Inferència (no verificada, sense noves sondes)**:
- La sonda de 15,5 s en un crop petit **no demostra** que Tamariu superi els 30 s: el timeout preexistent de 30 s era **per petició** (cada `fetch` tenia el seu propi `AbortSignal.timeout(30000)`), no un límit compartit entre les dues peticions seqüencials (Building + BuildingPart).
- El cos de 300 B no s’ha inspeccionat; podria ser un `ExceptionReport` o una col·lecció buida, però no permet identificar la causa del fall de Tamariu.

**Causa local (observada al codi)**:
1. `fetchCadastralBuildings` usava `AbortSignal.timeout(30000)` sense capturar l'error; el `TimeoutError` amb el missatge en brut `signal timed out` arribava a `main.js` (`say(e.message)`) sense context ni acció possible.
2. A la primera correcció, el `try` de `wfsGet` cobria només la petició (capçaleres); un avortament durant `response.arrayBuffer()` quedava fora del reintent i es filtrava en brut.
3. Cap reintent davant d’una fallada transitòria. S’amplia el marge a 45 s per intent; això no demostra que el retall real de Tamariu es pugui carregar.

**Propagació (verificada, correcta)**: el error puja a `main.js:87`, que posa `pendingBuildingLayer=null` i conserva el model i la font anteriors; `sources.js:43` només emmagatzema al `cache` en cas d'èxit, de manera que mai no es desen resultats incomplets.

## Solució implementada (`src/cadastre.js`)

- `wfsGet` executa la **petició i la lectura completa del cos** dins del mateix `AbortSignal.timeout` de **45 s per intent**: un cos que s’encalla produeix el mateix error localitzat i és reintentable. La validació de mida del cos resta a `parseCadastreGML` (límit de 20 MB de text).
- **1 reintent automàtic** (2 intents totals) només per errors de temps d'espera o de xarxa, amb backoff d'1,5 s injectable (`backoff`) per a proves deterministes sense esperes reals. L’opció `retries` es **clampa a [0,1]** (`NaN` → 1), de manera que el límit del pitjor cas no es pot sobrepassar per configuració.
- Errors **permanents, sense reintent**: estat HTTP (`response.ok === false`, p. ex. 503), `content-length` > 20 MB i errors de parseig XML. Els dos primers es llancen marcats dins de `wfsGet`; el parseig es fa fora del bucle de reintents.
- Errors **localitzats i accionables**:
  - Temps esgotat: «Catastre: el servei del Catastro no ha respost en 45 s (2 intents). Torna-ho a provar d'aquí a una estona; si persisteix, redueix la regió o tria la font ICGC o OpenStreetMap.»
  - Xarxa: «Catastre: no s'ha pogut connectar amb el servei del Catastro (…). Comprova la connexió a internet i torna-ho a provar.»
- Sense particionament de la consulta: no està justificat — el servei respon (lent, però respon) i l'àrea està dins dels límits; particionar afegiria risc de deduplicació d'IDs i de coherència famílies/parts sense evidència de necessitat.

## Límits i compensacions

- Pitjor cas fitat: 2 peticions × 2 intents × 45 s + 2 backoffs d'1,5 s ≈ **183 s** abans de fallar amb missatge clar, lectura del cos inclosa dins de cada finestra de 45 s. En fallida, es conserven el model antic i la font triada; no es desa res al cache.
- Límits preexistents intactes: 4 km², 5000 entitats, 20 MB XML, 300 000 vèrtexs, parts de 0 plantes excloses, deduplicació d'IDs dins de cada resposta.

## Proves

- Noves, deterministes (amb `backoff` injectat, sense esperes reals):
  - Temps esgotat de capçaleres amb reintent i missatge localitzat (sense el missatge en brut, exactament 2 crides); recuperació d’un temps esgotat transitori (3 crides).
  - **Temps esgotat durant la lectura del cos**: recuperació al segon intent (3 crides, família+parts carregades) i esgotament (2 crides, missatge localitzat sense `signal timed out` en brut).
  - **Fallida HTTP permanent (503): un sol intent**, sense reintent.
  - **Clamp de `retries`**: `retries: 99` continua fent exactament 2 intents i el missatge diu «2 intents».
  - Fallida de xarxa permanent: missatge de connexió. (La prova no diu res del cache: el cache viu a `sources.js` i no s’exercita aquí; la no-persistència de resultats parcials consta verificada per lectura de `sources.js:43`.)
- Suite completa: `node --test --test-concurrency=1 tests/*.test.js` → **89/89 passen**.
- Build estàtic: `node node_modules/vite/bin/vite.js build --base=./ --configLoader native` → **correcte** (3,3 s; només l'avís habitual de mida de chunks).

## Riscos pendents

- Si el Catastro triga sistemàticament >45 s per intent en àrees de ~4 km², l'usuari rebrà el missatge accionable però no geometria; el particionament quedaria com a opció futura amb deduplicació explícita.
- La causa exacta de la resposta de 300 B de Tamariu resta sense identificar (cos no inspeccionat; no s’han fet noves sondes).
- No s'ha fet validació d'usuari a Pages (fora d'abast); cal que l'usuari confirmi el cas real de Tamariu.
