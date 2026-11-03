# RO-055 · Pilot de Relleu pur

A Territori, el mode Relleu pur permet treballar d’1:10.000 a 1:100.000. Des de la v0.19.17 el navegador pot sol·licitar fins a 96 tessel·les, amb 32 MiB de pressupost per a les mostres d’elevació que conserva. Omet les consultes de vies i edificis. El mode complet conserva els seus límits i activa Perfils suaus per defecte.

## Font dels colors

El retall inclòs s’ha derivat d’ESA WorldCover 2021 v200 (Zanaga et al., 2022), tessel·la N42E000, CC BY 4.0. El fitxer reprodueix les classes de sòl nu o amb vegetació escassa (60) i neu o gel (70). El gris granític és una elecció de paleta per al sòl nu. La classe blanca descriu la cobertura del conjunt de 2021. Fora del retall distribuït la paleta és neutra.

- [Dades ESA WorldCover](https://esa-worldcover.org/en/data-access)
- [Citació i llicència del conjunt 2021](https://doi.org/10.5281/zenodo.7254221)
- [Script de preparació del retall](../scripts/prepare-aneto-coverage.mjs)

## Mesures locals

Retalls centrats a 42,635° N i 0,650° E, escala 1:100.000 i exageració ×1,5. Amb detall Alt, la malla té 432 × 432 cel·les. Cada cel·la pren una mostra central per triar la diagonal que s’hi ajusta millor. El visor calcula normals contínues sobre la superfície indexada. L’exportació en peces conserva les cotes i la triangulació als talls, que es reconstrueixen sobre línies de la mateixa malla.

| Retall | Tessel·les Mapterhorn | Pas a v0.19.16 | Pas a v0.19.17 | Temps local | Exportació |
| --- | --- | --- | --- | --- | --- |
| 20 × 20 km | 42, zoom 13 | 208 m | 46 m | 2,92 s | Un 3MF de 20 × 20 cm |
| 40 × 40 km | 49, zoom 12 | 417 m | 93 m | 3,43 s | Quatre 3MF de 20 × 20 cm |

Temps de la càrrega de dades i la generació en Node, abans de les auditories i l’exportació. Les auditories dels sòlids de terreny, sòl nu i neu o gel passen en els dos retalls i en les quatre peces. Queda pendent comprovar els fitxers al laminador.
