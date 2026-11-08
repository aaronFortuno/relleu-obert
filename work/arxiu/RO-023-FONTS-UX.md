# RO-023 · UX de fonts per a ús docent

Data: 2026-11-02 · Estat: implementat, revisat i comprovat al navegador local; validació de l’usuari i lector de pantalla pendents.

## Objectiu

El flux docent ha de treballar amb fonts remotes, no amb fitxers GIS locals. La secció 03 «Relleu i edificis» ha d’explicar clarament quines fonts s’usen, i els fitxers propis queden com a opció avançada plegada.

## Canvis

- **index.html** (secció 03):
  - Nou resum `#source-summary` a dalt: «Relleu del terreny» (proveïdor remot real, Mapterhorn/Mapzen) i «Edificis» (proveïdor remot triat o fitxer propi), amb estat pendent quan hi ha canvis sense generar. No hi ha desplegable de terreny perquè no hi ha alternativa implementada.
  - Els controls locals passen a `<details>` natiu plegat «Fitxers propis · avançat» al peu de la mateixa secció, amb descripció plana; els requisits CRS i límits van a un `<details>` niat «Requisits tècnics i límits».
  - Etiquetes: «Terreny sense edificis (GeoTIFF)» i «Edificis (GeoJSON)». IDs de fitxer (`local-dem`, `local-buildings`, `local-data-info`, `clear-local-data`) i worker d’importació sense canvis.
  - Botó reanomenat «Torna a les fonts remotes», desactivat sense fitxers o mentre calcula.
  - No s’ofereix el MDT RO032 ni DDS com a proveïdor (és només recerca).
- **src/source-options.js** (nou, pur): `describeSources` (etiquetes actiu/pendent, override local mai mostra el remot com a actiu), `buildingProviderLabel`, `clearLocalDecision` (`reload` si hi havia DEM, `buildings` si només edificis, `none` si res).
- **src/main.js**: `sourceSummary()` cridat des de `buildingInfo` i `buildingControls`; `lock()` manté el botó de neteja desactivat sense fitxers; neteja amb només edificis locals usa la via incremental `requestBuildingsAuto`; amb DEM local conserva «Generar el model» (`requireBuild`).
- **src/usability.css**: estils mínims de `.source-summary` i `.local-data-help`.
- **tests/source-options.test.js** (nou): 5 proves — remotes per defecte, override d’edificis sense ICGC fictici, override de terreny pendent, ICGC no disponible, decisió de neteja.

## Verificació local

- `node --test --test-concurrency=1 tests/*.test.js` → 173 pass, 0 fail.
- `node node_modules/vite/bin/vite.js build --base=./ --configLoader native` → built in 4.95s.

## Proveïdors realment suportats

- Terreny: Mapterhorn / Mapzen (tesel·les remotes); alternativa només via GeoTIFF propi (avançat).
- Edificis: ICGC (Catalunya), OpenStreetMap, Catastre · parts (Espanya); alternativa via GeoJSON propi (avançat).

## Revisió i comprovació de l’agent principal

- Sis proves de fonts després de revisió: inclouen retornar del DEM local a font remota pendent, sense atribuir el proveïdor antic al remot; fonts desconegudes no s’etiqueten com OpenStreetMap.
- Navegador local: resum remot, avançat plegat, importació del GeoJSON de la Perica identificada com a pendent i retorn a ICGC amb actualització incremental. L’estat pendent desapareix en acabar. Retorn desactivat sense fitxers i controls bloquejats durant càlcul.
- Validació d’usuari i lector de pantalla; contrast de precisió amb MDT oficial pendents. No s’ha afegit cap proveïdor de cobertes ni s’ha convertit una imatge WMS en elevacions.
