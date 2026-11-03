# RO-055 · Pilot de Relleu pur

A Territori, el mode Relleu pur permet treballar d’1:10.000 a 1:100.000. Des de la v0.19.17 el navegador pot sol·licitar fins a 96 tessel·les, amb 32 MiB de pressupost per a les mostres d’elevació que conserva. Omet les consultes de vies i edificis. El mode complet conserva els seus límits i activa Perfils suaus per defecte.

## Font dels colors

El retall inclòs s’ha derivat d’ESA WorldCover 2021 v200 (Zanaga et al., 2022), tessel·la N42E000, CC BY 4.0. El fitxer reprodueix les classes de sòl nu o amb vegetació escassa (60) i neu o gel (70). El gris granític és una elecció de paleta per al sòl nu. La classe blanca descriu la cobertura del conjunt de 2021. Fora del retall distribuït la paleta és neutra.

- [Dades ESA WorldCover](https://esa-worldcover.org/en/data-access)
- [Citació i llicència del conjunt 2021](https://doi.org/10.5281/zenodo.7254221)
- [Script de preparació del retall](../scripts/prepare-aneto-coverage.mjs)

## Mesures locals

### Retall conjunt dels Rasos i la Gallina Pelada a la v0.19.25

Retall de 6 × 6 km centrat a 42,165671° N, 1,751211° E, a escala 1:20.000 i amb detall Equilibrat. S’ha exportat en quatre peces de 15 × 15 cm i totes han passat l’auditoria de malla. Les capçades plenament còniques tenen un 50 % més d’alçada visible. La base incrustada conserva la seva cota.

| Cota | Capçades | Capçades per 1.000 mostres de bosc |
| --- | ---: | ---: |
| Per sota de 1.950 m | 3.400 | 33,7 |
| De 1.950 a 2.200 m | 579 | 29,2 |
| De 2.200 a 2.450 m | 21 | 15,6 |

El retall arriba al límit de 4.000 capçades, amb un mostreig repartit entre els candidats. Les mostres de bosc corresponen a nodes de la malla dins de polígons cartografiats.

### Capçades d’alta muntanya a la v0.19.24

En Model complet, la forma automàtica pren la cota màxima del retall com a referència per afinar el perfil. En Relleu pur, la densitat parteix del bosc cartografiat i disminueix amb la cota local de cada capçada entre 1.950 i 2.450 m. Aquesta franja és un criteri visual de simulació.

| Retall de 3 × 3 km a 1:20.000 | Mode | Capçades |
| --- | --- | ---: |
| Rasos de Peguera | Relleu pur | 3.638 |
| Gallina Pelada | Relleu pur | 2.512 |
| Gallina Pelada | Model complet | 8.897, perfil cònic automàtic |

Les tres malles han passat l’auditoria. Queda pendent comprovar-les al laminador. [Rasos de Peguera](https://www.openstreetmap.org/node/2653927400) · [Gallina Pelada](https://www.openstreetmap.org/node/26862904)

### Boscos a la v0.19.22

Les zones de bosc cartografiades es representen en verd, amb contorns interpolats dins de la malla. Les capçades tenen un diàmetre de referència de 12 m i s’escampen de manera procedimental dins d’aquests polígons. S’afegeixen quan el diàmetre equival almenys a 0,45 mm a la maqueta i eviten l’aigua i les vores de les peces. [Font i llicència](https://www.openstreetmap.org/copyright)

| Retall | Escala | Capçades simulades |
| --- | --- | ---: |
| Rajadell, 1,5 × 1,5 km | 1:10.000 | 232 |
| Vessants de l’Aneto, 3 × 3 km (42,629° N, 0,580° E) | 1:20.000 | 1.389 |
| Aneto, 40 × 40 km | 1:100.000 | 0, bosc en color |

### Hidrografia fora de l’Aneto a la v0.19.21

Relleu pur incorpora les capes de rius, rierols i llacs d’OpenFreeMap amb un màxim de 16 tessel·les. Descodifica les capes d’aigua del paquet vectorial. Si falten tessel·les, la maqueta aprofita les disponibles. La mostra de Rajadell reutilitza les tessel·les locals i el retall de l’Aneto conserva les dades pròpies del pilot. El color de sòl nu i neu continua limitat a la cobertura WorldCover distribuïda. [Font i llicència](https://www.openstreetmap.org/copyright)

### Rius i rierols a la v0.19.20

El selector segmentat de Territori permet triar Model complet o Relleu pur. En tots dos modes es poden activar els rius i rierols cartografiats i fixar una amplada mínima de 0,45 a 1,35 mm. El multiplicador actua sobre el mínim i conserva les amplades cartogràfiques més grans. Els cursos segueixen el pendent i les superfícies dels llacs es mantenen planes.

A Relleu pur, la cobertura de cursos d’aigua correspon al retall local de l’Aneto. El sector central utilitza tessel·les de més detall que la perifèria. El retall de 3 × 3 km conserva 11 trams. El de 40 × 40 km processa 4.493 traçats en uns 25 s abans d’auditar i exportar. Cal validar al laminador la passada mínima i els contactes dels trams amb els llacs. [Font i llicència](https://www.openstreetmap.org/copyright)

### Aigua a la v0.19.19

A Territori, **Paisatge complet** és el mode inicial. L’exemple **Llacs glacials de l’Aneto** permet generar el mateix sector en tots dos modes. En una peça de 15 cm a 1:20.000, el retall és de 3 × 3 km i el pas de malla amb detall Alt a Paisatge complet és d’uns 31 m.

Paisatge complet agrupa els fragments de cada llac i n’estima la cota a partir de la riba. L’aigua corrent conserva el perfil del relleu. Relleu pur fa servir un retall local d’OpenStreetMap via OpenFreeMap a l’Aneto. El contorn es projecta sobre la malla i els llacs més petits depenen del pas de mostreig. [Atribució i llicència OpenStreetMap](https://www.openstreetmap.org/copyright)

Retalls centrats a 42,635° N i 0,650° E, escala 1:100.000 i exageració ×1,5. Amb detall Alt, la malla té 432 × 432 cel·les. Cada cel·la pren una mostra central per triar la diagonal que s’hi ajusta millor. El visor calcula normals contínues sobre la superfície indexada. L’exportació en peces conserva les cotes i la triangulació als talls, que es reconstrueixen sobre línies de la mateixa malla.

### Contorns de la v0.19.18

El retall WorldCover distribuït passa de 512 a 2.048 píxels per costat, amb un pas d’uns 28 × 30 m. La coberta es representa traçant el límit entre les classes interpolades dins de cada triangle. Els contorns conserven el caràcter històric de la font i la seva precisió final també depèn del pas de malla i de la mida d’impressió.

| Retall | Pas Equilibrat (384) | Pas Alt (540) | Temps Alt |
| --- | --- | --- | --- |
| 20 × 20 km | 52 m | 37 m | 3,19 s |
| 40 × 40 km | 104 m | 74 m | 3,85 s |

Els dos models Alt i els quatre fragments del de 40 km han superat l’auditoria de malla. Els temps exclouen l’auditoria i l’exportació.

### Referència de la v0.19.17

| Retall | Tessel·les Mapterhorn | Pas a v0.19.16 | Pas a v0.19.17 | Temps local | Exportació |
| --- | --- | --- | --- | --- | --- |
| 20 × 20 km | 42, zoom 13 | 208 m | 46 m | 2,92 s | Un 3MF de 20 × 20 cm |
| 40 × 40 km | 49, zoom 12 | 417 m | 93 m | 3,43 s | Quatre 3MF de 20 × 20 cm |

Temps de la càrrega de dades i la generació en Node, abans de les auditories i l’exportació. Les auditories dels sòlids de terreny, sòl nu i neu o gel passen en els dos retalls i en les quatre peces. Queda pendent comprovar els fitxers al laminador.
