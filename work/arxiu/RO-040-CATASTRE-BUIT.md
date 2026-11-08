# RO-040 · Catastre: dada buida legítima

## Diagnòstic (codi real, no la hipòtesi inicial)

`fetchCadastralBuildings` (`src/cadastre.js`) fa **dues** consultes WFS GetFeature per a tota l’AOI (`BU.BUILDING` i `BU.BUILDINGPART`), amb un únic filtre `bbox`; no hi ha cap consulta per tessel·la de mar. Una AOI sense edificis (p. ex. mar) rep una FeatureCollection WFS buida **vàlida**, que el codi rebutjava en dos punts:

1. `parseCadastreGML` tractava qualsevol FeatureCollection no objecte com a error (`!collection`). Amb `fast-xml-parser`, una col·lecció auto-tancada **amb atributs** ja es parsejava com a objecte (cas que funcionava), però una col·lecció **nua** (`<gml:FeatureCollection/>` o parell sense fills) es parseja com a `''` (falsy) i es rebutjava.
2. `fetchCadastralBuildings` llançava error quan el volum combinat sobre rasant era zero (ambdues buides o només parts de 0 plantes), impedint conservar la font triada i exportar el model sense edificis.

## Canvi implementat

- `src/cadastre.js`:
  - S’accepta una FeatureCollection buida vàlida (auto-tancada amb atributs i cas nu); `members=[]` → retorna `[]`.
  - Distinció d’errors preservada: `ExceptionReport` (clau present, amb o sense contingut) llança missatge propi; XML invàlid, arrel inesperada, tipus/CRS/sobremida/truncament continuen llançant. Sense fallback silenciós ni caché negativa.
  - Ambdues buides o només parts de 0 plantes → `{features:[], metadata.count:0}` amb avís informatiu (no error); la font Catastre queda conservada i la resta del model s’exporta sense edificis.
- Una mena buida no descarta l’altra: `cadastralVolumes` ja combinava; ara els `[]` arriben fins al final.
- `src/sources.js` no ha calgut tocar-lo: la caché per regió+font només desa resultats reeixits (l’avís buit s’hi desa; els errors llancen abans de `cache.set`).
- Terreny i edificis incrementals amb zero categories: `updateBuildings` accepta `features:[]` i `buildModel` genera el model sense edificis; verificat amb prova d’exportació 3MF.

## Proves

- Nou `tests/cadastre-empty.test.js` (12 proves): buida auto-tancada amb atributs i nua; ExceptionReport/malformada/arrel inesperada/sobremida rebutjades; Building buit + parts plenes i viceversa; ambdues buides i només parts de 0 plantes → count 0 + avís; error permanent no confós amb buida; caché d’èxit buit exercitada (2 crides WFS totals, segona càrrega servida per caché); sense caché negativa (error de xarxa → reintent torna a consultar); export 3MF del model sense edificis amb `buildingSource:'catastre'`.
- Enduriment de la revisió d’acceptació: només s’accepta la forma buida real — es rebutgen text dins de la FeatureCollection (`<FeatureCollection>garbage</…>`), contenidors desconeguts, arrels duplicades/arrays, indicadors de paginació/truncament (`next`, `previous`, `truncated`) i recomptes `numberMatched`/`numberReturned`/`numberOfFeatures` incoherents amb els membres rebuts. Un `numberMatched` positiu amb 0 membres és resposta **incompleta** (error), no «sense edificis». `boundedBy` s’accepta com a metadada, en col·leccions buides i plenes, amb els membres ordinaris preservats. La resposta paginada es rebutja al fetch i no es desa a la caché (la càrrega següent torna a consultar).
- L’avís passa de «el servei confirma que no hi ha edificis» a «el servei no ha retornat volums… (dada absent, no prova d’absència real)».
- Suite completa: `node --test --test-concurrency=1 tests/*.test.js` → 117/117 passen.
- Build: `node node_modules/vite/bin/vite.js build --base=./ --configLoader native` → correcte (avís preexistent de mida de chunk).

## Comprovacions manuals pendents (usuari)

- Carregar una AOI de mar real amb font Catastre i confirmar que el model s’exporta sense edificis i amb l’avís informatiu visible.
- Confirmar que una AOI mixta (part mar, part edificis) conserva els volums de la part edificada.
- Nota de diagnòstic: el límit de 4 km² i el límit de 5000 entitats es poden trobar en ampliar el zoom; es gestionen com a errors explicits, no com a buides. No s’ha fet cap afirmació sobre la causa del servidor sense prova.
