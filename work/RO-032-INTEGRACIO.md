# RO-032 — Cobertes originals i primer singular

Implementació v0.18.0, 2026-11-02. La cobertura general de Tamariu continua
oberta: Catastre aporta volums, però no plans de teulada. No s'han inventat
pendents sobre aquestes parts ni fusionat proveïdors per proximitat.

## Font sota demanda

El selector «OpenStreetMap · cobertes i parts» consulta dades originals via
[Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API). Conserva IDs,
etiquetes, patis, parts i procedència. Les parts substitueixen només l'àrea
que ocupen dins de l'envolupant; la resta de petjada es conserva.

Consulta de fins a 16 km², dos servidors seqüencials i 10 s per servidor;
resposta màxima de 6 MB, 20.000 elements, 1.500 edificis i 40.000 punts.
Memòria cau de vuit consultes durant deu minuts; els errors es poden
reintentar. El segon servidor usa l'[endpoint publicat per
Private.coffee](https://overpass.private.coffee/). No es fa servir l'API
d'edició d'OSM com a alternativa de lectura massiva.

Si el servei falla, es conserven els edificis OSM vectorials amb avís;
el resum i la procedència indiquen que no s'han obtingut cobertes originals.
Una resposta incompleta amb `remark` no es presenta com una regió buida.

## Representació

El mode «Altura i coberta de les dades» interpreta `roof:shape`, altura,
angle i direcció/orientació. Admet dues aigües, un vessant, quatre aigües,
piramidal, volta i cúpula el·líptica. Les formes que exigeixen una petjada
rectangular o el·líptica la comproven abans de generar-la. Amb dades
insuficients es manté la coberta plana i es registra el motiu.

Una direcció explícita preval; quan s'utilitza la convenció S3DB del costat
més llarg o es deriva l'altura de l'angle, es registra com a derivació,
sense atribuir-la a una mesura. Les altures per nombre de plantes són
estimacions de 3 m/planta; l'absència d'atributs no acredita una altura real.
`min_height` conserva parts elevades en aquest mode. Els modes limitat i
petjada mantenen el comportament anterior; per veure teulades cal triar
el mode de la font.

Semàntica segons [Simple 3D Buildings](https://wiki.openstreetmap.org/wiki/Simple_3D_Buildings):
`roof:direction` indica el sentit del vessant principal, no l'azimut del
carener; `height` inclou la coberta i `min_height` es mesura des del terra.

## Torre Glòries

La fixture [osm3d-glories.json](../public/data/osm3d-glories.json) conserva
el [way OSM 44213122](https://www.openstreetmap.org/way/44213122) i els nodes
originals, amb llicència ODbL. Atributs: altura 144,4 m, cúpula de 68 m i
petjada el·líptica. Es representa amb sis anells i 24 sectors, evitant que
una única punta la converteixi en un con. És una reconstrucció paramètrica
basada en aquests atributs, sense atribuir-hi una malla mesurada ni els
detalls de façana.

Punt de comprovació: `41.40285,2.18995`, peça de 15 cm, escala 1:2000,
font OSM de cobertes i mode d'altura de les dades. La fixture és una prova
de desenvolupament; no substitueix silenciosament un servei remot fallit.
Sagrada Família i altres edificis complexos continuen pendents de dades i
suport adequats: no s'infereix una forma pel nom de l'edifici.

## Comprovacions i límits

Dotze proves noves cobreixen atributs, parts, patis, geometria incompleta,
memòria cau, errors, límits, temps d'espera, modes limitat/font, parts
elevades i Torre Glòries. La cúpula s'audita com a malla i la procedència es
llegeix del 3MF exportat. Lot final amb 284 casos únics i build correctes;
navegador i resultats del servei es registren a l'historial d'aquest lot.

Prova local real: dos endpoints amb GET des del navegador i comprovació
POST acotada també esgoten el temps d'espera; no s'acredita una consulta
remota reeixida en aquest entorn. El navegador conserva els cent fragments
OSM de la regió de Barcelona amb avís explícit de cobertes indisponibles.
La Torre Glòries del resultat alternatiu continua plana; la fixture de
desenvolupament és la que acredita els paràmetres de la cúpula.

Laminat i impressió física encara requereixen validació. La disponibilitat
de paràmetres OSM varia segons la regió; aquesta integració no dona per
resolta la reconstrucció de totes les teulades de Tamariu.

## Catàleg de geometries singulars · v0.23.26

Podem preparar malles en local i servir-les com a fitxers estàtics. El navegador només demanaria les que intersectin el retall. Aquest flux també permet aprofitar dades derivades de LiDAR per tercers. La reconstrucció a demanda a partir d’un núvol de punts és una línia diferent. Com a control de viabilitat, l’API 3DBAG ha retornat CityJSON amb CORS per un retall de 200 × 200 m d’Amsterdam. La primera pàgina, de cinc edificis, feia 64 kB de JSON. Són volums i cobertes precalculats de ciutat, amb menys detall que una malla arquitectònica. [API 3DBAG](https://api.3dbag.nl/api.html) · [Dades i mètode de 3DBAG](https://3d.bk.tudelft.nl/projects/3dbag/)

| Font | Evidència i límits |
| --- | --- |
| Torre Eiffel | Open Landmarks distribueix un GLB georeferenciat amb CORS. La versió baixa té 5.791 triangles i pesa 115 kB amb gzip. La detallada té 28.176 triangles i pesa 647 kB. La malla està sota CC BY-SA 3.0 i les dades d’ubicació derivades d’OSM, sota ODbL. L’auditoria confirma vores obertes i no manifold. [Fitxa i llicències](https://open-landmarks.benmaps.fr/landmarks/eiffel-tower/) · [Auditoria del proveïdor](https://open-landmarks.benmaps.fr/assets/eiffel-tower/4e011f6dced3b66b9599894f5e689977b06694c5d678a09872892d7f72e9a7d1/validation.json) |
| Sagrada Família i Torre Glòries | Barcelona publica CAD 3D per barris i un model tridimensional d’edificacions amb CC BY 4.0. Cal extreure els dos edificis i comprovar quines parts singulars contenen. La mostra d’alta resolució del temple de l’ICGC és un visor. Falta confirmar accés i llicència de la malla. [CAD 3D municipal](https://portaldades.ajuntament.barcelona.cat/mapes/146) · [Model municipal](https://portaldades.ajuntament.barcelona.cat/mapes/145) · [Visor ICGC](https://betaportal.icgc.cat/model-3d-de-la-sagrada-familia-en-alta-resolucio/) |
| Sant Marc i Pisa | El projecte de Sant Marc documenta un model BIM, amb reutilització de la malla pendent de verificar. Per a Pisa hi ha un núvol de punts de 2,37 GB amb CC BY-NC-SA, que requeriria preparació prèvia. [Projecte de Sant Marc](https://www.unescolab.mantova.polimi.it/elementor-796/) · [Arxiu de Pisa](https://openheritage3d.org/project.php?id=dbg6-x966) |

Com a estimació de pes abans de reparar la malla, les posicions i les cares de la Torre Eiffel ocupen **46 kB** en gzip per a la versió baixa i **219 kB** per a la detallada. La mida final depèn de la reparació, el detall i el format. Una peça paramètrica simple pot cabre en pocs kilobytes. Per a la Sagrada Família cal mesurar la geometria que conservi una silueta reconeixible a l’escala impresa.

### Criteris del primer cupó

1. Preparar una peça singular amb llicència, autoria, data, petjada, àncora geogràfica i unitats en metres. Simplificar per conservar la silueta, les parts reconeixibles i les obertures imprimibles.
2. Comparar-la amb OSM a dues escales. Verificar el contacte amb el relleu, la rotació i el retall a la vora de la maqueta. La Torre Eiffel permet comprovar les quatre potes i els arcs. Un volum més senzill permet comprovar primer l’encaix al terreny.
3. Auditar el sòlid i exportar un 3MF de prova amb la mateixa geometria que es veu al visor. Substituir només les petjades corresponents quan la malla preparada s’hagi carregat i validat. La capa OSM queda com a alternativa.

La v0.23.26 deixa les fonts i els criteris documentats. El cupó i el carregador del catàleg queden pendents.

## Proposta de catàleg independent

Un repositori propi pot publicar geometria descarregable per a qualsevol projecte. El web estàtic serviria un índex geogràfic i un fitxer per revisió de cada model. Relleu Obert consultaria l’índex i demanaria només els models pertinents al retall. L’índex i les malles es publicarien per HTTPS amb CORS. Per al pilot, GitHub Pages admet un lloc publicat de fins a 1 GB. Si cal més espai, es pot canviar l’allotjament dels fitxers mantenint el format del catàleg. [Límits de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

### Format del primer lliurament

| Element | Convenció proposada |
| --- | --- |
| `catalog.geojson` | `FeatureCollection` GeoJSON RFC 7946 amb versió de format, identificador estable per lloc, revisió del model, polígon o multipolígon de l’extensió horitzontal i `bbox`. Totes les coordenades de l’índex són WGS84 en ordre longitud, latitud. |
| `print.glb` | glTF 2.0 binari autocontingut, en metres locals. X cap a l’est, Y cap amunt i Z cap al sud, amb l’orientació geogràfica aplicada. La posició local (0, 0, 0) correspon a l’àncora declarada al catàleg. El perfil inicial pren l’altitud del terreny a l’àncora com a referència de Y=0. |
| Procedència | Cada revisió indica autoria, llicència i font de la geometria i de la georeferenciació, així com els canvis i la data de referència si es coneix. Cal conservar els crèdits dins del GLB i a la fitxa. Els identificadors externs, si estan verificats, indiquen quines petjades de la capa general es poden substituir. |

El GLB i el GeoJSON segueixen estàndards existents. Els camps de revisió, encaix i procedència són convencions pròpies que cal publicar amb el catàleg. L’índex pot ser un sol fitxer mentre sigui petit. Convé reutilitzar la convenció d’àncora i eixos d’Open Landmarks perquè els models que compleixin els criteris es puguin adaptar amb pocs canvis. [glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units) · [GeoJSON](https://datatracker.ietf.org/doc/html/rfc7946) · [API d’Open Landmarks](https://open-landmarks.benmaps.fr/docs/)

Per als models originals, CC BY 4.0 és una opció si volem que el crèdit viatgi amb cada model. Per a les aportacions externes, el catàleg registra la llicència concreta de cada font i admet només materials que permetin l’adaptació i la redistribució previstes. Una adaptació de material CC BY-SA ha de respectar les seves condicions. La llicència del codi i la dels models es publiquen per separat. [Creative Commons](https://creativecommons.org/cc-licenses/) · [Identificadors SPDX](https://spdx.org/licenses/)

### Integració i criteris d’acceptació

- Començar amb una sola peça d’edifici. El catàleg ha de permetre obrir-la directament i Relleu Obert ha de poder situar-la amb les mateixes dimensions i orientació a dues escales. El visor i el 3MF comparteixen la variant imprimible.
- La variant imprimible ha de tenir volum tancat, contacte amb el relleu i gruixos adequats a l’escala de prova. El GLB pot tenir una variant de més detall per a altres usos quan aporti valor.
- Carregar la malla amb un identificador i una revisió fixats i registrar-los, amb l’atribució, a la procedència de l’exportació. Substituir només les petjades associades un cop validat el sòlid i el seu encaix. Si la malla falla o queda parcialment fora del retall sense poder-se tancar, es conserva la representació de la font general.
- El mateix índex admet llocs naturals. Un cupó de roca o una bauma necessita un perfil d’encaix propi, amb referència vertical i contorn d’unió al relleu. Aquest perfil s’especificarà a partir del pilot RO-035. [Relleu rocós](RELLEU-ROCOS.md)

## Pilot de la Torre Glòries · v0.23.27

El catàleg estàtic Open Place Models publica l’índex GeoJSON i la malla GLB per revisió. Relleu Obert carrega l’índex i només demana les malles que intersecten el retall de Model complet. El primer GLB té 2.310 triangles i ocupa 28.492 bytes. Representa l’oval i la cúpula amb una aproximació paramètrica. [Fitxa, fonts i llicències](https://github.com/aaronFortuno/open-place-models/tree/main/models/torre-glories/r1) · [Guia per investigar candidats i fer malles](https://github.com/aaronFortuno/open-place-models/blob/main/CONTRIBUTING.md)

El motor col·loca la malla amb l’àncora WGS84, la posa a la cota superior del terreny sota la petjada i encasta la base. La mateixa projecció de la maqueta aplica l’escala i el gir. Un cop el sòlid supera l’auditoria, se substitueixen els volums del mateix edifici identificats per solapament o per un identificador verificat amb solapament. En cas de fallada es conserven els volums de la font triada. «Altura limitada» aplica la mateixa coberta plana que a la resta d’edificis. En amagar els edificis s’elimina també la torre.

| Peça | Centre en latitud, longitud | Escala | Gir | Terreny |
| --- | --- | --- | --- | --- |
| 10 × 10 cm | 41.403515, 2.189521 | 1:1.500 | 0° | ICGC MET5 |
| 10 × 10 cm | 41.40388, 2.18988 | 1:4.000 | 37° | ICGC MET5 |

Amb exageració ×1,5, les dues maquetes conserven els 2.310 triangles de la torre amb OSM, ICGC i Catastre. La cota de la cúpula sobre el terreny a l’àncora és de 96,95 mm i 36,54 mm, respectivament. El 3MF registra la revisió i els crèdits. Les proves de regressió també cobreixen el tall a vora de peça i una malla invàlida.

Al visor local s’ha comprovat la silueta amb la font per defecte, una peça de 10 × 10 cm i el centre de la torre a 1:2.000 sense gir i a 1:5.000 amb 15°. Queden pendents la revisió de l’usuari i el laminat.
