# RO-055 · Pilot de Relleu pur

A Territori, el mode Relleu pur permet treballar d’1:10.000 a 1:100.000. El navegador sol·licita les elevacions amb un màxim de 16 tessel·les i omet les consultes de vies i edificis. El mode complet conserva els seus límits i activa Perfils suaus per defecte.

## Font dels colors

El retall inclòs s’ha derivat d’ESA WorldCover 2021 v200 (Zanaga et al., 2022), tessel·la N42E000, CC BY 4.0. El fitxer reprodueix les classes de sòl nu o amb vegetació escassa (60) i neu o gel (70). El gris granític és una elecció de paleta per al sòl nu. La classe blanca descriu la cobertura del conjunt de 2021. Fora del retall distribuït la paleta és neutra.

- [Dades ESA WorldCover](https://esa-worldcover.org/en/data-access)
- [Citació i llicència del conjunt 2021](https://doi.org/10.5281/zenodo.7254221)
- [Script de preparació del retall](../scripts/prepare-aneto-coverage.mjs)

## Mesures locals

Retalls centrats a 42,635° N i 0,650° E, escala 1:100.000, exageració ×1,5 i malla de 96 × 96 cel·les. Temps fins al model preparat en Node, abans de les auditories i l’exportació.

| Retall | Tessel·les Mapterhorn | Pas aproximat de malla | Temps | Exportació |
| --- | --- | --- | --- | --- |
| 20 × 20 km | 12, zoom 12 | 208 m | 4,77 s | Un 3MF de 20 × 20 cm |
| 40 × 40 km | 16, zoom 11 | 417 m | 5,08 s | Quatre 3MF de 20 × 20 cm |

Les auditories dels sòlids de terreny, sòl nu i neu o gel passen en tots dos casos. La malla de 40 km representa la forma general de les valls i carenes. La de 20 km conserva millor els detalls i les taques petites de cobertura. Queda pendent comprovar els fitxers al laminador.
