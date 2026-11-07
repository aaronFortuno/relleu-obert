# Fonts i atribució

El quadre **Sobre el projecte · V4V** reuneix les fonts de les maquetes per capa. El mapa interactiu i les imatges de la galeria mostren l’atribució d’OpenStreetMap al lloc d’ús.

## Cartografia

- Dades © OpenStreetMap contributors: https://www.openstreetmap.org/copyright (ODbL).
- Esquema i processament © OpenMapTiles: https://openmaptiles.org/ .
- Distribució de tessel·les: OpenFreeMap, https://openfreemap.org/ . TileJSON: https://tiles.openfreemap.org/planet .
- Edificacions: © Institut Cartogràfic i Geològic de Catalunya, Referencial Topogràfic Territorial, CC BY 4.0. Consulta de polígons `tipus=edi`, excloent projectes, construccions en curs i ruïnes: https://geoserveis.icgc.cat/vector01/rest/services/topografia_territorial/MapServer/10 . La mostra s’ha consultat l’1 de novembre de 2026; data i URL a `tamariu-buildings-icgc.geojson`. No s’hi descarreguen noms ni dades de propietaris. Alçàries absents o invàlides s’identifiquen com a estimades.
- La mostra de Tamariu inclou quatre tessel·les MVT de la versió que consta a `public/data/tamariu.json`. Es conserven com a dades derivades d’OSM amb la seva atribució i condicions de reutilització; la llicència MIT del codi no s’aplica a aquestes dades.
- Cartografia històrica: [Railways of Spain GIS (1848–2023)](https://doi.org/10.34810/data917), Guillermo Esteban-Oliver i Jordi Martí-Henneberg, i [Cobertes del sòl de Catalunya](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Mapes/Mapa-de-cobertes-del-sol-de-Catalunya), ICGC. Retalls i conversions a GeoJSON sota [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); vegeu [l’atribució i el procés](datasets/historical/README.md).
- Sòl urbanitzat històric. [Àrea Metropolitana de Barcelona](https://ide.amb.cat/geoserveispi/rest/services/Hosted/03_EvolucioUsosSol/FeatureServer), edicions de 1956, 1977 i 1990 amb les [condicions de reutilització de l’AMB](https://www.amb.cat/s/web/area-metropolitana/dades-obertes/condicions-d-us.html). Obra derivada del [SIOSE](https://www.siose.es/descripcion), edicions de 2005 i 2014, IGN i comunitats autònomes, amb [llicència compatible amb CC BY 4.0](https://www.ign.es/resources/licencia/Condiciones_licenciaUso_IGN.pdf).
- Cobertes de sòl nu o vegetació esparsa i de neu o gel dels Pirineus, els Alps i les zones de detall de l’Aneto, Lavaredo, el Fuji i Geiranger, © [ESA WorldCover 2021 v200](https://doi.org/10.5281/zenodo.7254221), CC BY 4.0. Conté dades Copernicus Sentinel modificades (2021) que ha processat el consorci ESA WorldCover. [Cita i llicència](https://esa-worldcover.org/en/data-access#license)

## Altures i simplificació dels edificis

L’atribut `altura` de les construccions RTT s’expressa en metres: [especificacions de l’ICGC, annex A, construccions](https://datacloud.ide.cat/especificacions/topografia-territorial-v1r0-esp-06ca-20230524.pdf). S’utilitza com a altura de volum, no com a forma de coberta. La consulta actual descarta les coordenades Z i no incorpora malles reals de teulades. Els modes limitats i de petjades són simplificacions explícites per a representació educativa.

## Elevacions

- Mapterhorn, https://mapterhorn.com/data-access/ . Tessel·les Terrarium WebP de 512 píxels. Fórmula: `R*256 + G + B/256 - 32768` metres.
- ICGC MET5, [servei WCS del Model d’Elevacions del Terreny](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-i-WCS-Elevacions/WCS-del-Model-dElevacions-del-Terreny). Graella ArcGrid de 5 m en ETRS89 / UTM 31N. Font preferent per als retalls amb cobertura completa i dins del pressupost de càrrega.
- Fonts originals i atribucions: https://mapterhorn.com/attribution/ i https://download.mapterhorn.com/attribution.json . La precisió real varia segons la font i la regió.
- Es conserva una còpia del catàleg d’atribucions originals a `public/data/elevation-attribution.json`.
- Font alternativa: Mapzen / Tilezen Terrain Tiles, AWS Open Data, https://registry.opendata.aws/terrain-tiles/ . Atribucions originals: https://github.com/tilezen/joerd/blob/master/docs/attribution.md . La font efectivament utilitzada queda registrada a les metadades de cada regió.
- La mostra inclou quatre tessel·les al zoom 14. L’exportació registra el proveïdor. El catàleg documenta els proveïdors de les captures i enllaça les fonts originals. [Atribucions del catàleg](work/RO-046-CATALEG.md#catàleg-complet-al-carrusel)

## Biblioteques

Importació local (v0.6): [geotiff.js](https://github.com/geotiffjs/geotiff.js) 3.0.5 i [Proj4js](https://github.com/proj4js/proj4js) 2.22.0, MIT. Llicències pròpies i avisos de dependències a `public/licenses/`, incloent float16, parse-headers, quick-lru, web-worker, xml-utils, zstddec, lerc, mgrs i wkt-parser. Només s’admeten MDT numèrics amb compressió sense pèrdua; no es reconstrueixen altituds a partir de visualitzacions.

Les dades locals conserven la seva llicència original, que l’usuari ha de respectar en reutilitzar-les. El programa registra el fitxer, importació, CRS i metadades de lectura; en el GeoTIFF registra també SHA-256. La data d’importació no acredita la data d’aixecament. No s’han incorporat noves dades oficials ni s’ha validat encara una millora de precisió de Tamariu amb aquestes opcions.

Des de v0.8 es retiren els selectors de broquet i tipus de filament per decisió de l’usuari després de provar-los a Bambu. Es conserven colors i assignacions per material.

Three.js (MIT), Leaflet (BSD-2-Clause), Manifold (Apache-2.0), polygon-clipping (MIT), polyclip-ts (MIT), earcut (ISC), @mapbox/vector-tile (BSD-3-Clause), pbf (BSD-3-Clause), fflate (MIT), Vite (MIT). Les versions queden fixades al manifest i al fitxer de dependències.

Lectura d’elevacions: [jSquash WebP](https://github.com/jamsinclair/jSquash/tree/main/packages/webp) (Apache-2.0), amb libwebp (BSD-3-Clause), i [fast-png](https://github.com/image-js/fast-png) (MIT). Les còpies de les llicències es distribueixen a `public/licenses/`. La lectura binària s’utilitza perquè els valors RGB són dades numèriques: les proteccions de [Brave sobre lectures de canvas](https://brave.com/privacy-updates/4-fingerprinting-defenses-2.0/) poden alterar píxels. La incidència concreta de l’usuari encara no s’ha reproduït al seu navegador.

S’hi inclouen també els avisos de les dependències PNG pako i iobuffer.

Es distribueixen les llicències de Leaflet i Manifold a `public/licenses/`. La llicència MIT del projecte es refereix al codi propi.

## Mapa, cerca i contingut de l’autor

- Mapa de selecció: tessel·les estàndard d’OpenStreetMap, https://tile.openstreetmap.org/ , amb atribució visible. No es descarreguen àrees en bloc ni s’hi implementa una memòria cau pròpia. Política: https://operations.osmfoundation.org/policies/tiles/ .
- Cerca de llocs: Photon, https://photon.komoot.io/ i https://github.com/komoot/photon . Consulta explícita, màxim cinc resultats i memòria de sessió; el servidor públic depèn de disponibilitat i ús raonable. La cerca no es fa a cada tecla.
- El contingut V4V, la fotografia d’Aarón Fortuño i el QR Lightning s’han reutilitzat del projecte Plec de l’autor, a petició seva. La fotografia i la identitat de l’autor no es concedeixen sota la llicència MIT del codi. No s’hi ha incorporat analítica.

## Referència visual

La imatge de Lichtbild aportada per l’usuari s’ha utilitzat per entendre l’objectiu funcional. No s’inclou al projecte, no se n’han extret dades i no s’ha copiat codi, marca ni contingut de Lichtbild.

## Recerca de parts d’edificis i paisatge 3D

Consulta del WFS INSPIRE BU del Catastre el 2026-11-01, amb envolupant i metodologia a [work/PAISATGE-3D.md](work/PAISATGE-3D.md). La figura comparativa deriva de petjades ICGC RTT i parts de la Dirección General del Catastro. Els GML originals i la mostra GeoJSON experimental són locals, no s’inclouen en la web ni es declaren MIT. Referències i [condicions de la font](https://www.catastro.hacienda.gob.es/webinspire/documentos/Licencia.pdf) a l’estudi. Cap proveïdor nou s’ha incorporat encara al mode automàtic.

## Catastre i cobertes (v0.9)

Font opcional: Dirección General del Catastro, [WFS INSPIRE BU](https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx) i [condicions d’accés/ús](https://www.catastro.hacienda.gob.es/webinspire/documentos/Licencia.pdf). Peticions d’edificis i parts per envolupant, fins a 4 km², sense dades de titulars. Identificador, família, versió de registre, proveïdor, consulta i mètode d’estimació d’altura conservats. La data del registre no és data d’aixecament. Les dades originals no es copien a la web; els models exportats són transformacions geomètriques amb atribució i llicència de la font.

El mode de dades interpreta cobertes gabled/skillion segons [OSM Simple 3D Buildings](https://wiki.openstreetmap.org/wiki/Simple_3D_Buildings) i [roof:direction](https://wiki.openstreetmap.org/wiki/Key:roof:direction). Calen atributs explícits; no se n’infereix una forma real a partir de petjada/plantes. Catastre i la capa actual d’OpenMapTiles no proporcionen aquesta informació de coberta; primer suport disponible amb dades locals.

Descodificació GML: fast-xml-parser 5.11.2 (MIT), carregat sota demanda. Avisos de les vuit biblioteques XML distribuïts a public/licenses, incloent @nodable/entities, fast-xml-builder, is-unsafe, path-expression-matcher, strnum i xml-naming.

## Mostres i recuperació (v0.13)

`public/data/eix-diagonal.json` registra la mostra inicial de 41.71792, 1.78391,
data de consulta, envolupant i quatre parelles de tessel·les OpenFreeMap/Mapterhorn.
Edificis ICGC en el GeoJSON adjacent, amb metadades i CC BY 4.0. Mateixes
condicions de fonts que la mostra de Tamariu; aquestes dades no passen a ser MIT.
El nom «badia de Tamariu» també apareix a la [descripció municipal del litoral](https://www.palafrugell.cat/noticies/general/1311-reobert-un-tram-del-cami-de-ronda-entre-tamariu-i-aigua-xelida).

El [manual oficial del WFS BU](https://www.catastro.hacienda.gob.es/webinspire/documentos/inspire-bu-wfs.pdf)
indica límits de 4 km² i 5.000 elements. La prova del 2026-11-02 a Tamariu
rebutja una envolupant d’uns 3,18 km² amb `Area of extension out of limits`;
els quadrants sí que responen. El client subdivideix davant límits reconeguts,
conserva elements complets, elimina duplicats coherents i rebutja qualsevol
error o contradicció restant. Una font alternativa usada en recuperar una
regió queda identificada a la interfície i a les metadades d’exportació.

## Superfícies de pont ICGC (v0.14)

`public/data/eix-diagonal-decks.json`: transformació de les superfícies XYZ `tpn`
del [full IFC 280110, any 2024](https://datacloud.icgc.cat/datacloud/topografia-territorial/ifc/topografia-territorial-v1r0-full280110-2024.zip),
ICGC Referencial Topogràfic Territorial, CC BY 4.0. No són dades MIT.
Extracció, coordenades, atribució, gruix de maqueta i límits documentats a
[RO-033-IMPLEMENTACIO.md](work/RO-033-IMPLEMENTACIO.md).

## Repartiment de pilars de Rajadell (v0.15)

`public/data/eix-diagonal-layouts.json` transcriu dades numèriques del plànol
Fig. 1, pàgina 2 de [Matute, Millanes i Nebreda, IDEAM, V Congreso ACHE, 2011](https://gpreman-cp165.wordpresstemporal.com/wp-content/uploads/2017/03/pon612_2.pdf).
La figura dóna dotze trams que sumen 740 m i onze pilars; el resum escrit omet
un tram de 50 m. Només es distribueixen fets numèrics amb atribució, cap còpia
del PDF o plànol. Les coordenades d’implantació i els ajustos d’impressió són
transformacions aproximades del projecte, no un aixecament de pilars.
