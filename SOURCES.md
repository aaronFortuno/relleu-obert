# Fonts i atribució

## Cartografia

- Dades © OpenStreetMap contributors: https://www.openstreetmap.org/copyright (ODbL).
- Esquema i processament © OpenMapTiles: https://openmaptiles.org/ .
- Distribució de tessel·les: OpenFreeMap, https://openfreemap.org/ . TileJSON: https://tiles.openfreemap.org/planet .
- Edificacions: © Institut Cartogràfic i Geològic de Catalunya, Referencial Topogràfic Territorial, CC BY 4.0. Consulta de polígons `tipus=edi`, excloent projectes, construccions en curs i ruïnes: https://geoserveis.icgc.cat/vector01/rest/services/topografia_territorial/MapServer/10 . La mostra s’ha consultat l’1 de novembre de 2026; data i URL a `tamariu-buildings-icgc.geojson`. No s’hi descarreguen noms ni dades de propietaris. Alçàries absents o invàlides s’identifiquen com a estimades.
- La mostra de Tamariu inclou quatre tessel·les MVT de la versió que consta a `public/data/tamariu.json`. Es conserven com a dades derivades d’OSM amb la seva atribució i condicions de reutilització; la llicència MIT del codi no s’aplica a aquestes dades.

## Altures i simplificació dels edificis

L’atribut `altura` de les construccions RTT s’expressa en metres: [especificacions de l’ICGC, annex A, construccions](https://datacloud.ide.cat/especificacions/topografia-territorial-v1r0-esp-06ca-20230524.pdf). S’utilitza com a altura de volum, no com a forma de coberta. La consulta actual descarta les coordenades Z i no incorpora malles reals de teulades. Els modes limitats i de petjades són simplificacions explícites per a representació educativa.

## Elevacions

- Mapterhorn, https://mapterhorn.com/data-access/ . Tessel·les Terrarium WebP de 512 píxels. Fórmula: `R*256 + G + B/256 - 32768` metres.
- Fonts originals i atribucions: https://mapterhorn.com/attribution/ i https://download.mapterhorn.com/attribution.json . La precisió real varia segons la font i la regió.
- Es conserva una còpia del catàleg d’atribucions originals a `public/data/elevation-attribution.json`.
- Font alternativa: Mapzen / Tilezen Terrain Tiles, AWS Open Data, https://registry.opendata.aws/terrain-tiles/ . Atribucions originals: https://github.com/tilezen/joerd/blob/master/docs/attribution.md . La font efectivament utilitzada queda registrada a les metadades de cada regió.
- La mostra inclou quatre tessel·les al zoom 14. L’exportació registra el proveïdor, però la identificació automàtica de la font original per regió encara és pendent. Abans de distribuir una biblioteca extensa de mostres o models, cal incorporar l’atribució específica corresponent.

## Biblioteques

Three.js (MIT), Leaflet (BSD-2-Clause), Manifold (Apache-2.0), polygon-clipping (MIT), polyclip-ts (MIT), earcut (ISC), @mapbox/vector-tile (BSD-3-Clause), pbf (BSD-3-Clause), fflate (MIT), Vite (MIT). Les versions queden fixades al manifest i al fitxer de dependències.

Es distribueixen les llicències de Leaflet i Manifold a `public/licenses/`. La llicència MIT del projecte es refereix al codi propi.

## Mapa, cerca i contingut de l’autor

- Mapa de selecció: tessel·les estàndard d’OpenStreetMap, https://tile.openstreetmap.org/ , amb atribució visible. No es descarreguen àrees en bloc ni s’hi implementa una memòria cau pròpia. Política: https://operations.osmfoundation.org/policies/tiles/ .
- Cerca de llocs: Photon, https://photon.komoot.io/ i https://github.com/komoot/photon . Consulta explícita, màxim cinc resultats i memòria de sessió; el servidor públic depèn de disponibilitat i ús raonable. La cerca no es fa a cada tecla.
- El contingut V4V, la fotografia d’Aarón Fortuño i el QR Lightning s’han reutilitzat del projecte Plec de l’autor, a petició seva. La fotografia i la identitat de l’autor no es concedeixen sota la llicència MIT del codi. No s’hi ha incorporat analítica.

## Referència visual

La imatge de Lichtbild aportada per l’usuari s’ha utilitzat per entendre l’objectiu funcional. No s’inclou al projecte, no se n’han extret dades i no s’ha copiat codi, marca ni contingut de Lichtbild.
