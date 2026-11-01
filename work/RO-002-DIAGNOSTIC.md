# RO-002 — Petjades agrupades a Tamariu

Diagnòstic local del **2026-11-01**, amb la mostra inclosa al repositori. No s’han obtingut geometries de les captures de Google Maps.

## Resultat

El bloc de dins del revolt del carrer de la Perica / GIV-6542 correspon a **`icgc-1074761`**, identificador oficial **1074761**, de `public/data/tamariu-buildings-icgc.geojson`.

- Geometria original: **un Polygon amb un sol anell de 29 coordenades**, sense patis ni divisions interiors.
- Superfície aproximada: **1.723 m²**, amb la mateixa projecció mètrica local que el model.
- Mitjana dels vèrtexs (només per localitzar-lo): **41.9181382, 3.2052799**.
- Altura de font: **19,1299992 m**; el mode limitat en representa 5 m sobre el punt més alt de la petjada. Aquesta referència comuna fa especialment visible el bloc quan hi ha pendent.
- La combinació ICGC/OSM conserva aquesta geometria **sense canvis**. El motor no uneix les petjades per crear cobertes: cada polígon d’entrada conserva la seva referència. La unió de petjades només serveix per excloure els arbres.

La captura de Relleu Obert concorda amb aquest contorn. La captura de Google mostra divisions que **no existeixen en la font carregada**. Les quatre tessel·les OSM de la mostra no aporten la subdivisió d’aquest conjunt.

## Com reproduir la inspecció

`node scripts/inspect-building-footprints.mjs` genera `output/building-footprints.svg` i un inventari JSON amb identificadors, superfície, altura i comprovació que el contorn no canvia. El polígon 1074761 és dins del revolt, al sud del polígon 1074762.

La prova de regressió de `tests/buildings.test.js` comprova totes les petjades oficials, el polígon concret, les petjades adjacents i un pati. La representació continua mantenint cobertes horitzontals: no s’ha tornat a inclinar tot el bloc per dissimular-ne l’agrupació.

## Decisió i feina pendent

**Seguiment ampliat:** [RO-026 — Fonts per a edificis més fidels](RO-026-FONTS-EDIFICIS.md) concentra la nova petició de comparació i priorització de proveïdors. RO-002 continua com el cas concret de regressió del megabloc de la Perica.

**Diagnòstic fet; separació de cases pendent.** No es creen parcel·les fictícies ni es pressuposa que cada canvi de direcció del contorn sigui una casa. S’ha afegit l’advertiment de petjades agrupades a «Dades i limitacions» i als fitxers exportats.

Per millorar la fidelitat cal estudiar una font oberta amb edificis o parts identificables, per exemple construccions cadastrals INSPIRE o una capa topogràfica més detallada (RO-023). Abans d’incorporar-la cal verificar disponibilitat des del navegador, llicència, cobertura, identificadors i criteri de substitució. No s’ha comprovat encara aquesta alternativa ni es dona RO-002 per corregit. Els modes de només petjades i sense edificis continuen disponibles.

**Comprovació local de v0.9.0:** 82 proves superades i construcció estàtica correcta. Al navegador, retall de 150 × 150 mm a 1:1.000 centrat a 41.91814, 3.20528: 18 fragments amb ICGC i 117 volums retallats amb Catastre. Exportacions STL amb vuit assignacions: material-1 (terreny), material-4 (camins), material-5 (bosc), material-6 (arbres) i material-8 (aigua interior) idèntics byte a byte abans/després; només material-3 (edificis) canvia. Les categories absents continuen absents. El canvi de font manté la càmera i el mapa ocult conserva la selecció. Falta la validació de l’usuari, laminador i impressió; no s’han comprovat Pages/CI remots.
