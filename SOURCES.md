# Fonts i atribució

## Cartografia

- Dades © OpenStreetMap contributors: https://www.openstreetmap.org/copyright (ODbL).
- Esquema i processament © OpenMapTiles: https://openmaptiles.org/ .
- Distribució de tessel·les: OpenFreeMap, https://openfreemap.org/ . TileJSON: https://tiles.openfreemap.org/planet .
- La mostra de Tamariu inclou quatre tessel·les MVT de la versió que consta a `public/data/tamariu.json`. Es conserven com a dades derivades d’OSM amb la seva atribució i condicions de reutilització; la llicència MIT del codi no s’aplica a aquestes dades.

## Elevacions

- Mapterhorn, https://mapterhorn.com/data-access/ . Tessel·les Terrarium WebP de 512 píxels. Fórmula: `R*256 + G + B/256 - 32768` metres.
- Fonts originals i atribucions: https://mapterhorn.com/attribution/ i https://download.mapterhorn.com/attribution.json . La precisió real varia segons la font i la regió.
- Es conserva una còpia del catàleg d’atribucions originals a `public/data/elevation-attribution.json`.
- La mostra inclou quatre tessel·les al zoom 14. L’exportació registra el proveïdor, però la identificació automàtica de la font original per regió encara és pendent. Abans de distribuir una biblioteca extensa de mostres o models, cal incorporar l’atribució específica corresponent.

## Biblioteques

Three.js (MIT), polygon-clipping (MIT), earcut (ISC), @mapbox/vector-tile (BSD-3-Clause), pbf (BSD-3-Clause), fflate (MIT), Vite (MIT). Les versions queden fixades al manifest i al fitxer de dependències.

## Referència visual

La imatge de Lichtbild aportada per l’usuari s’ha utilitzat per entendre l’objectiu funcional. No s’inclou al projecte, no se n’han extret dades i no s’ha copiat codi, marca ni contingut de Lichtbild.
