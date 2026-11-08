# RO-025 — Edificis i vies d’altres èpoques

**Pilot retirat a la v0.23.13.** A Cardona i Cornellà del Llobregat, les capes històriques van dibuixar superfícies urbanitzades contínues. L’objectiu docent requereix distingir les petjades i, quan sigui possible, el perfil de cada edifici. Es reprendrà amb una font històrica que ofereixi aquest nivell de detall amb cobertura útil. Els projectes antics es poden obrir i conserven els ajustos. El taller avisa que la generació utilitza cartografia actual.

Objectiu: poder imprimir dues maquetes del mateix lloc i comparar l’evolució del teixit construït i de la xarxa de comunicacions. «Actual» és el valor per defecte. El taller parteix de geometries o punts ja publicats, amb una data o una edició documentada. Les ortofotos serveixen per contrastar resultats.

### Fonts comunes: abast i decisió

El pilot comprova el flux del taller. La generalització s’ha de fer per font i cobertura, sense afegir fitxers poble per poble. Hi ha dues capes amb prou base per continuar: **xarxa ferroviària** i **sòl urbanitzat**. La reconstrucció conjunta de carrers i edificis d’època queda ajornada: no s’ha acreditat una sèrie amb el detall i la cobertura necessaris, ni que la combinació de fonts arribi al 95% dels retalls.

| Capa | Font comuna | Què en podem fer |
| --- | --- | --- |
| Ferrocarril | [Railways of Spain GIS, UdL](https://dataverse.csuc.cat/dataset.xhtml?persistentId=doi%3A10.34810%2Fdata917), 1848–2023, CC BY 4.0 | Filtrar els traçats segons les dates de servei. Els tres arxius originals de línies pesen uns 1,5 MB en ZIP i cobreixen Catalunya dins del conjunt estatal. Es poden preparar una sola vegada en un índex espacial estàtic; no cal una descàrrega per any ni per municipi. La sèrie documenta el ferrocarril del seu inventari, no totes les vies urbanes. |
| Sòl urbanitzat | [Cobertes del sòl de l’ICGC](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Mapes/Mapa-de-cobertes-del-sol-de-Catalunya), CC BY 4.0 | Comparar polígons urbanitzats de tot Catalunya. S’han comprovat 2009, 2018 i 2024. Els anys són edicions: la data d’observació pot variar dins d’una edició, i canvien els llindars de revisió. El [CREAF publica edicions anteriors](https://www.mcsc.creaf.cat/descriptiu.htm), amb cobertura incompleta el 2000–2002 i llegendes diferents; cal comprovar la reutilització i l’equivalència de classes abans d’incorporar-les. |
| Carreteres | [Xarxa principal històrica europea, JRC](https://data.jrc.ec.europa.eu/dataset/jrc-tem-10005), amb sis dates de 1955 a 2012. L’[arxiu de dades](https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId=doi:10.7910/DVN/INFPSE) indica CC0 1.0; cal atribuir la font i verificar el significat dels codis abans d’incorporar-los. | Possible capa d’autopistes i eixos interurbans per a maquetes regionals. La geobase descarregada té un sol conjunt de línies amb camps de classe per any, inclosos codis negatius sense explicació a la fitxa del JRC. No permet donar per documentats els carrers ni els canvis locals de traçat. La [BTN25 de 2016](https://centrodedescargas.cnig.es/CentroDescargas/novedades?codSerie=02101) és una pista: l’IGN en va publicar la cobertura completa, però no s’ha verificat un arxiu de versions antigues recuperables de manera sistemàtica al [catàleg actual](https://centrodedescargas.cnig.es/CentroDescargas/btn). |
| Edificis individuals | [Cadastre INSPIRE](https://www.catastro.hacienda.gob.es/webinspire/index.html) i [HISDAC-ES](https://essd.copernicus.org/articles/15/4713/2023/) | El Cadastre té un model de dades comú per a Catalunya; el problema és temporal. Permet filtrar petjades actuals per antiguitat. HISDAC-ES homogeneïtza el Cadastre i publica centroides i agregats, sense recuperar els edificis enderrocats ni la seva planta antiga. L’antiguitat és un ús separat, no un substitut d’una edició topogràfica. |

**Control de l’ICGC fora del pilot.** Amb la mateixa consulta per coordenades, s’han extret polígons de les edicions 2009, 2018 i 2024 a Lleida (334/320/280), Girona (222/221/209) i la Seu d’Urgell (123/125/136). Són recomptes de polígons seleccionats, no d’edificis ni una mesura de creixement. En aquests retalls d’uns 3–4 km s’han transferit aproximadament 1,8–16,4 MB per edició en 9–15 peticions parcials. Els tres fitxers tenen índex espacial, però l’host no ha retornat la capçalera CORS: GitHub Pages no els pot llegir directament des del navegador. Els arxius sencers pesen 1,56–1,61 GB cadascun; cal preparar una capa que contingui només les classes urbanitzades, dividida en tessel·les o en un arxiu amb índex. Cal mesurar-ne la mida abans d’escollir on publicar-la.

**Control ferroviari fora del pilot.** El mateix filtre geogràfic i temporal ha recuperat dos trams de la línia Barcelona–Sant Joan de les Abadesses el 1900 i el 1960. Al mateix retall, no hi figura cap tram en servei el 1980, el 2000 ni el 2023.

Els scripts de preparació tenen un mode de consulta que no escriu al catàleg:

```sh
node scripts/prepare-historical-railways.mjs --probe 2.270 42.219 2.299 42.245
node scripts/prepare-historical-urban.mjs --probe 0.615 41.604 0.655 41.637
node scripts/prepare-historical-urban.mjs --probe 2.803 41.963 2.844 41.994
node scripts/prepare-historical-urban.mjs --probe 1.430 42.332 1.470 42.363
```

**Control de les carreteres.** La geobase del JRC es pot descarregar i llegir. Retallant les línies a quatre finestres d’uns 2 km, el fitxer dona 0 trams als retalls del centre de Girona i Avinyó, 2 a Manresa i 6 a Lleida, comptant totes les dates del fitxer. Els zeros no indiquen absència històrica de carreteres. Per reproduir el control, cal llegir `European_Network_No_Planarized` (EPSG:3034), reprojectar a WGS 84 i comptar les interseccions de longitud positiva amb els retalls: Avinyó `1.961 41.854 1.985 41.872`; Girona `2.810 41.973 2.834 41.991`; Manresa `1.812 41.715 1.836 41.733`; Lleida `0.611 41.609 0.635 41.627`.

**Prioritat acordada.** Centrar la comparació en el sòl urbanitzat de l’ICGC. L’ampliació del ferrocarril queda en segon pla fins que pugui anar acompanyada d’altres capes històriques amb detall comparable. L’[API Territorial de l’ICGC](https://api.icgc.cat/territorial/collections/cobertes-sol) admet filtre de classe i coordenades, i el navegador pot consultar-la directament. La col·lecció correspon a l’edició de 2024. Les altres edicions es preparen a partir dels [vectors oficials](https://datacloud.icgc.cat/datacloud/cobertes-sol/gpkg/) per aplicar els mateixos criteris de selecció i simplificació a totes.

### Comparació estàtica de l’ICGC

L’[eina de preparació](../../scripts/package-urban-cover.py) separa els polígons residencials, industrials i de serveis en cel·les de 0,0625° i desa cada cel·la com a GeoJSON comprimit. L’índex descriu les edicions i les cel·les amb geometries. Es consulta per coordenades i es retalla a la mateixa finestra en totes dues edicions. El càlcul uneix els polígons abans de mesurar la superfície en una projecció equivalent. El resultat indica la superfície total per edició i els guanys i pèrdues de superfície cartografiada entre les dues.

La preparació de Catalunya sencera ha generat 959 cel·les el 2009 (14,96 MB) i 965 el 2024 (16,39 MB). El paquet complet ocupa 32,66 MB, incloent-hi l’índex i el límit administratiu. Es pot allotjar com a fitxers estàtics i carregar només les cel·les que creuen el retall. A Girona se’n consulten quatre, amb 163 kB per al 2009 i 175 kB per al 2024. La superfície calculada del 2009 difereix un 0,0093% de la unió retallada dels vectors originals.

| Retall de prova | Superfície el 2009 | Superfície el 2024 | Dades per edició |
| --- | ---: | ---: | ---: |
| Girona | 502,28 ha | 521,08 ha | 163–175 kB |
| Manresa | 564,66 ha | 581,56 ha | 96–106 kB |
| La Seu d’Urgell | 137,34 ha | 139,78 ha | 44–51 kB |
| Tamariu | 54,07 ha | 58,26 ha | 28–30 kB |
| Llívia | 30,73 ha | 34,89 ha | 9–11 kB |

El control de costa ha limitat el càlcul a terra a Tamariu. El retall de Llívia compta només la part dins l’enclavament. Un retall a l’altra banda de la frontera es marca com a exterior, mentre que un retall interior dels Pirineus retorna zero hectàrees urbanitzades en ambdues edicions.

El [límit terrestre de l’ICGC a 1:5.000](https://datacloud.icgc.cat/datacloud/divisions-administratives/json_unzip/divisions-administratives-v2r2-catalunya-5000-20260120.json) permet mesurar només la part catalana d’un retall mixt i descartar una finestra completament exterior. És un límit administratiu modern, i no acredita per si sol la cobertura de cada edició. En el taller caldrà etiquetar un retall amb cobertura parcial i distingir una cel·la amb zero superfície urbanitzada d’una edició o un fitxer no disponible. Les àrees urbanitzades poden incloure jardins, aparcaments i altres espais de l’entorn construït. Els canvis poden venir tant d’una transformació del sòl com d’una revisió cartogràfica. [Llegenda i metodologia de l’ICGC](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Mapes/Mapa-de-cobertes-del-sol-de-Catalunya)

El taller pot presentar-ho com a **comparació de sòl urbanitzat**, amb un mateix relleu de referència i un color reservat a la coberta seleccionada. La xifra d’hectàrees correspon al polígon cartografiat dins del retall, amb independència de l’escala física d’impressió. La prova amb el motor existent ha exportat dos 3MF de Girona de 16 × 21 cm amb dos materials, una malla de terreny idèntica i la data de cada coberta a les metadades. El laminat queda pendent.

Per reproduir-ho cal Python amb Shapely 2.1 o superior i pyproj. `pack` requereix una carpeta de sortida nova i admet `--bounds W S E N` per fer una prova petita. També accepta GeoJSON obtingut amb `node scripts/prepare-historical-urban.mjs --extract FITXER ANY W S E N`, sempre amb `--bounds` ajustat a l’extracció.

```sh
python scripts/package-urban-cover.py pack urban-icgc 2009=cobertes-sol-v1r0-2009.zip 2024=cobertes-sol-v1r0-2024.zip --boundary catalunya-5000.geojson
python scripts/package-urban-cover.py compare urban-icgc 2.800 41.968 2.839 42.006
```

### Publicació al taller entre la v0.23.10 i la v0.23.12

«Sòl urbanitzat · edició» apareix al peu del visor del Model complet quan el retall té cobertura. La selecció ordinària combina les edicions **1956, 1977 i 1990** a l’àrea metropolitana de Barcelona amb **2005 i 2014** del SIOSE a Espanya. El navegador consulta els serveis oficials quan es tria l’any i només demana la geometria del retall. La font i la cobertura parcial s’indiquen al control i es conserven a l’exportació. Si la consulta falla, es conserva l’edició vàlida que es veia al visor.

Cada edició substitueix els edificis individuals amb una capa de superfície. L’escala i els criteris de classificació poden variar entre fonts. Es manté el mateix relleu de referència i «Actual» recupera els edificis. El 2009 de l’ICGC s’ofereix allà on la màscara del SIOSE queda fora del retall. Els projectes desats amb edicions de l’ICGC mantenen la tria, inclòs el 2024. Els exemples ferroviaris conserven el seu propi selector d’edició.

El repositori conserva una còpia comprimida del paquet de l’ICGC, de 32,9 MB. L’índex i les cel·les es poden extreure amb `node scripts/unpack-urban-history.mjs`. El resultat es desa a `output/archived-historical/`. La màscara territorial es regenera amb `python scripts/package-urban-cover.py web-coverage datasets/icgc-urban-2009-2024.zip datasets/historical/urban-coverage.json.gz`.

Els fitxers grans que ja són a Git només surten de l’historial si se’n reescriuen els commits i les referències. Per als paquets futurs es poden fer servir adjunts de GitHub Releases. La compilació podria descarregar els paquets actius i verificar-ne el SHA-256. Els paquets retirats es podrien esborrar sense reescriure el codi. Es manté el límit d’1 GB per al lloc publicat. [Fitxers grans a GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) · [Gestió de versions publicades](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) · [Límits de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

### Pilot del SIOSE

El SIOSE ofereix edicions vectorials a 1:25.000 de 2005, 2009, 2011 i 2014. El pilot desa polígons sencers de les classes 111, 112, 113, 130 i 140, que corresponen a teixit urbà, sòl industrial i equipaments. Els polígons poden contenir cobertes mixtes. La llegenda i l’escala són pròpies del SIOSE, de manera que la comparació entre anys s’ha de fer dins de la mateixa sèrie. [Descripció del SIOSE](https://www.siose.es/descripcion) · [Servei de l’IGN per a 2005](https://serviciosgis2.ign.es/servicios/rest/services/SIOSE/SIOSE_2005/MapServer/0)

Les tessel·les de Logronyo ocupen **50.058 bytes el 2005** i **52.912 el 2014**. Al pilot, el motor ha aplicat totes dues edicions sobre el mateix terreny sintètic amb dades urbanes reals. La v0.23.12 consulta directament el servei del SIOSE. Els fitxers d’aquesta prova d’empaquetament queden a `output/`.

| Mostra de 2005 | Retall W S E N | Polígons | Bytes gzip |
| --- | --- | ---: | ---: |
| La Rioja | `-3.15 41.9 -1.65 42.66` | 3.680 | 788.218 |
| Madrid | `-3.84 40.34 -3.55 40.54` | 3.146 | 428.237 |
| Vigo | `-8.90 42.08 -8.55 42.45` | 1.458 | 858.523 |
| València | `-0.61 39.26 -0.22 39.62` | 2.344 | 409.342 |
| Tenerife | `-16.60 28.25 -16.12 28.63` | 748 | 383.935 |

Les cinc mostres sumen 11.376 polígons i 2.868.255 bytes. Extrapolant als 153.966 registres oficials de les cinc classes, les tessel·les de 2005 ocuparien uns **39 MB**, a banda de l’índex i la màscara. Amb la ràtio de cadascuna de les mostres extremes, el resultat és de 21 a 91 MB. Al mateix retall de La Rioja, l’edició de 2014 ocupa 813.143 bytes, un 3,2% més que la de 2005.

Per reproduir la mesura local, crea primer la carpeta `output/siose-pilot`.

```sh
node scripts/fetch-siose-urban.mjs 2005 output/siose-pilot/logrono-2005.geojson -2.52 42.41 -2.40 42.52
node scripts/fetch-siose-urban.mjs 2014 output/siose-pilot/logrono-2014.geojson -2.52 42.41 -2.40 42.52
python scripts/package-urban-cover.py pack output/siose-pilot/logrono 2005=output/siose-pilot/logrono-2005.geojson 2014=output/siose-pilot/logrono-2014.geojson --provider siose --bounds -2.52 42.41 -2.40 42.52
python scripts/package-urban-cover.py web-coverage output/siose-pilot/logrono output/siose-pilot/logrono/urban-coverage.json.gz
```

### Cobertes anteriors a 1990

- **Catalunya, 1987.** El mapa d’usos i cobertes del sòl és un ràster classificat de 30 m. L’arxiu comprimit ocupa 6,32 MB. Les classes 5–7 permeten extreure urbanitzacions, zones urbanes i sòl industrial i comercial. La vectorització es pot fer abans de publicar les dades. [Fitxa i metodologia](https://agricultura.gencat.cat/ca/serveis/cartografia-sig/bases-cartografiques/usos-sol-subsol/usos-sol/usos-cobertes-sol/) · [Dades de 1987](https://www.infoambiental.grumets.cat/MapesCobertes_i_Usos/UsosCobertes_1987.zip)
- **Àrea metropolitana de Barcelona, 1965.** El catàleg ofereix SHP i GeoPackage, amb classes residencials, industrials, viàries i ferroviàries. Per descarregar el paquet cal iniciar sessió. El servei públic ja retorna els polígons de 1956, 1977 i 1990. S’han comprovat les tres dates en un retall de l’Hospitalet i el Prat. [Especificacions de l’AMB](https://geoportalcartografia.amb.cat/AppGeoportalCartografia2/DadesAplicacio/Especificacions/AMB_MapaUsosSol_Especificacions_ca.pdf) · [Servei de polígons](https://ide.amb.cat/geoserveispi/rest/services/Hosted/03_EvolucioUsosSol/FeatureServer)
- **Tot l’Estat, 1990.** CORINE està disponible en vector a 1:100.000. La unitat mínima de 25 hectàrees el fa adequat per a maquetes regionals. [Descàrrega CNIG](https://centrodedescargas.cnig.es/CentroDescargas/corine-land-cover) · [Resolució de CORINE](https://land.copernicus.eu/en/products/corine-land-cover/clc-1990)

### Pilot al taller (v0.23.9)

A **Territori → Llocs amb dades històriques** es pot centrar el mapa a la Vall d’Aro, a la Garrotxa o a Avinyó. El control **Any de la cartografia** admet només edicions documentades quan tot el retall està cobert per una font amb almenys dues dates. El mode és Model complet; la font i la data queden a les metadades d’exportació i la tria es conserva als projectes desats.

Els carrilets són visibles el 1960 i absents el 1980. A Avinyó, els anys 2009, 2018 i 2024 mostren l’àrea urbanitzada amb una capa de color de 0,3 mm, sense convertir els polígons en volums d’edificis. Els retalls i l’atribució són a [les dades del pilot](../../datasets/historical/README.md). El relleu i les capes no documentades per a l’any triat són actuals; no es recuperen ponts, túnels ni rasants ferroviàries històriques si no consten a la font.

| Font | Què es pot recuperar | Limitació |
| --- | --- | --- |
| [Cadastre INSPIRE — edificis](https://www.catastro.hacienda.gob.es/webinspire/index.html) | Petjades actuals en GML amb `dateOfConstruction` al nivell d’edifici, verificat al fitxer municipal de Palafrugell. | Permet filtrar la planta actual dels edificis que encara consten al Cadastre. Els enderrocats no es recuperen i una planta actual pot incorporar reformes posteriors. `beginLifespanVersion` és una data de les dades, no de construcció. |
| [Railways of Spain GIS, Universitat de Lleida](https://doi.org/10.34810/data917) | Línies i estacions en Shapefile per al període 1848–2023, amb dates d’obertura, tancament i reobertura. S’han comprovat els camps dels tres fitxers de traçat. Llicència CC BY 4.0. | Ferrocarrils d’ample ibèric, estret i alta velocitat; no és un inventari de carreteres. Cal convertir i retallar els fitxers abans de servir-los al taller. |
| [Cobertes del sòl de l’ICGC](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Mapes/Mapa-de-cobertes-del-sol-de-Catalunya) | Àrees urbanitzades i altres tipus de coberta en [GeoPackage](https://datacloud.icgc.cat/datacloud/cobertes-sol/gpkg/), amb edicions de 2009, 2018, 2019–2022, 2023 i 2024. Per a tot Espanya, [SIOSE](https://www.siose.es/web/guest/siose) té edicions a 1:25.000 de 2005, 2009, 2011 i 2014. | Permet representar l’expansió del sòl urbanitzat a escala de poble o comarca. Els polígons són classes de sòl; no substitueixen les petjades d’edificis o una xarxa de carrers. |
| [Cobertes de 1956 — mostra d’Avinyó](https://www.arcgis.com/home/item.html?id=65597409a5cf43cca7a113cde2f5bfd6) | S’ha verificat que el [servei de la mostra](https://services.arcgis.com/fwF8e4aLR6TRWtqM/arcgis/rest/services/Cobertes_1956/FeatureServer/0) retorna polígons GeoJSON amb categories de carretera i sòl urbanitzat. El [CREAF documenta el mapa de 1956 per a la província de Barcelona](https://www.creaf.cat/ca/recerca/directori-de-recerca/land-cover-map-province-barcelona-1956). | La fitxa de la mostra no indica una llicència: cal confirmar-la abans de redistribuir. La [comparativa pública de la Diputació](https://bcnagraria.diba.cat/ca/investiga/canvis60anys) té capes descarregables de 1956 i 2018, però les classes publicades agrupen les zones urbanes i viàries amb altres sòls improductius. |
| [OpenStreetMap amb Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL#Date) | Estat dels objectes OSM en una data des del 12 de setembre de 2012, si el servidor conserva l’historial. Les geometries i els atributs serveixen per construir les capes. | L’absència d’un objecte pot significar que encara no s’havia cartografiat. Les instàncies públiques tenen límits d’ús. |
| [ohsome](https://docs.ohsome.org/ohsome-api/v2/migration_guide.html) | Historial OSM a partir del [8 d’octubre de 2007, segons les metadades de v1](https://api.ohsome.org/v1/metadata). Recompte per dates i extracció segons la versió del servei. | L’extracció de v1 ha retornat HTTP 403 a la prova. La v2 demana clau i retorna GeoParquet; és candidata a preparar fitxers fora del taller, no a incrustar-hi una clau. |
| [Ortofoto territorial de l’ICGC](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Ortoimatges/WMS-Ortofoto-Territorial) | Fotografies aèries georeferenciades, útils per comprovar què existia. | Queden fora de la generació del model. L’any ofert pot correspondre a un mosaic de diversos vols. |
| [MTN25 històric del CNIG](https://centrodedescargas.cnig.es/CentroDescargas/mtn25-vectorial-historico) | Fulls d’edicions històriques que el catàleg situa entre 1994 i 2019. Poden documentar vies i nuclis en dates intermèdies. | Són fulls sencers en GeoPDF; queda per provar si es poden recuperar capes amb prou detall per a un model de població. L’any del fitxer correspon a l’edició del full. |

El [Referencial Topogràfic Territorial de l’ICGC](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Geoinformacio-cartografica/Referencial-Topografic-Territorial) ofereix geometria vectorial, però no s’ha verificat una sèrie d’edicions descarregables que permeti triar l’any d’edificis i carreteres. Tampoc no s’ha verificat un servei del Cadastre que retorni la planta que tenia un edifici en una data passada.

### Control cadastral a Palafrugell

El [ZIP municipal del Cadastre](https://www.catastro.hacienda.gob.es/INSPIRE/Buildings/17/17124-PALAFRUGELL/A.ES.SDGC.BU.17124.zip) conté 7.516 elements `Building`; 7.466 tenen els dos extrems de `dateOfConstruction` (99,3%). En 1.667 casos són anys diferents, com 1950–1977. En 3.961 casos l’extrem final és 1985 o anterior. El recompte és de tot el municipi i només inclou edificis que consten a l’inventari actual. Les 24.168 parts d’edifici del fitxer no porten aquest camp. Una visualització amb data ha d’indicar els intervals i la manca de data, i evitar atribuir automàticament a les parts actuals la data de l’edifici sencer. La comprovació s’ha fet amb la descàrrega municipal; la petició de prova per retall al WFS ha exhaurit el temps d’espera.

### Control a Tamariu

Retall de prova: longitud 3,204–3,210°, latitud 41,916–41,920°. L’[endpoint de recompte d’ohsome v1](https://api.ohsome.org/v1/elements/count?bboxes=3.204%2C41.916%2C3.21%2C41.92&time=2012-12-31%2C2018-12-31%2C2025-12-31&filter=highway%3D%2A+and+geometry%3Aline), amb el filtre `highway=* and geometry:line`, ha retornat 29 elements el 31 de desembre de 2012, 48 el 31 de desembre de 2018 i 59 el 31 de desembre de 2025. Són elements del mapa: dividir un carrer en més trams també fa pujar el recompte. La sèrie no mesura els quilòmetres de carretera construïts. El recompte d’edificis no s’ha pogut verificar en el temps de prova.

El [full 0335-1 de Palafrugell](https://centrodedescargas.cnig.es/CentroDescargas/mtn25-vectorial-historico?numHoja25=0335-1), que inclou el centre de Tamariu, té dues edicions localitzades: [2002](https://centrodedescargas.cnig.es/CentroDescargas/detalleArchivo?sec=11707084) i [2014](https://centrodedescargas.cnig.es/CentroDescargas/detalleArchivo?sec=12017072). És un cas concret per provar l’extracció de la xarxa viària i comprovar quins edificis distingeix el mapa a 1:25.000.

Les peticions petites d’Overpass amb data (2014 i 2024) no han retornat geometries en aquesta sessió: HTTP 406 o temps d’espera exhaurit en una instància i limitació de peticions o temps d’espera en l’altra. És una prova de disponibilitat, no de cobertura. Per això el pilot inicial proposa fitxers preparats i verificats, sense dependre d’aquestes consultes quan un alumne obri l’aplicació.

### Criteris del pilot inicial

1. Provar el ferrocarril amb dues dates en un mateix retall. El [fitxer d’ample estret](https://dataverse.csuc.cat/api/access/datafile/60282) confirma que el carrilet de Sant Feliu de Guíxols a Girona figura obert el 1892 i tancat el 1969: permet comparar, per exemple, 1960 i 1980. Per als edificis, provar a Palafrugell un filtre separat d’**antiguitat dels edificis actuals**. Per comparar l’expansió urbanitzada, provar dues edicions de cobertes del sòl. La reconstrucció de cada edifici i carretera en dues dates queda pendent d’un parell d’edicions vectorials comparables. Els primers fitxers es poden preparar en GeoJSON estàtic, amb la font, la data i la llicència corresponents.
2. Comparar al visor i a l’exportació amb el mateix retall, mida, escala, gir i relleu de referència. Revisar mostres de carrers i edificis sobre la font original. Si hi ha prou dades, comparar superfície ocupada per les petjades i longitud de vies per classe, retallades al mateix perímetre. Això mesura superfície construïda en planta, no el nombre d’habitatges.
3. Mostrar només les dates disponibles per a la capa i el retall triats i etiquetar-ne la font, la data i el significat. Una època comuna per a diverses capes només té sentit si les fonts en documenten la mateixa data. Si una capa històrica falla, mostrar-ho o conservar l’últim model vàlid; substituir-la per dades actuals requereix una acció explícita.

El motor pot reutilitzar el relleu carregat i aplicar-hi altres capes. Cal carregar de la mateixa època els trams de connexió de ponts i vies, i desactivar les reconstruccions específiques modernes si no se n’ha acreditat la data. El relleu i les altres capes actuals s’han d’identificar com a referència: una mateixa base facilita la comparació, però no reconstrueix canvis del terreny o de la costa.
