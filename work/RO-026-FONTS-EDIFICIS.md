# RO-026 — Fonts per a edificis més fidels

Estudi inicial del **2026-11-01**. Seguiment i criteris d’acceptació a [BACKLOG.md](BACKLOG.md#ro-026--fidelitat-dels-edificis-i-selecció-de-fonts). Estat: **En estudi**. A v0.9, Catastre ja és una font opcional amb parts, comprovada al navegador sobre la Perica. ICGC continua com a selecció inicial a l’àmbit català; no s’aplica una jerarquia automàtica de qualitat. [PAISATGE-3D.md](PAISATGE-3D.md) conserva el contrast inicial i els límits.

## Què volem comparar

- **Petjada i divisions:** contorn real, separació d’edificis contigus, patis i parts amb volums diferents.
- **Altures:** origen i significat del valor; distingir metres mesurats, nombre de plantes i estimacions.
- **Cobertes:** dades específiques de forma i cota, si existeixen. Mantenir una coberta horitzontal per volum quan només hi hagi petjada i altura.
- **Actualització i cobertura:** dates de les dades de la zona, omissions i diferències entre serveis; no equiparar data de descàrrega amb data d’aixecament.

## Fonts candidates i evidència documental

| Font | Què s’ha verificat a la documentació | Què falta comprovar per al projecte |
| --- | --- | --- |
| Catastre INSPIRE, edificis i parts | La documentació WFS contempla `Building` i `BuildingPart`, amb consulta de parts per parcel·la. La descàrrega ATOM permet obtenir conjunts municipals. | Mostra de Palafrugell, separacions reals del bloc de la Perica, atributs útils, condicions de reutilització/atribució, accés HTTPS/CORS, límits de consulta i lectura de GML/ZIP al navegador. Una part de volum homogeni no equival necessàriament a una casa independent. |
| ICGC Referencial Topogràfic Local (RTL) | Producte de detall equivalent a 1:1.000, amb edificis; distribució GeoPackage 2D/3D i altres formats. Cobertura municipal progressiva, amb llicència CC BY 4.0 indicada al catàleg. | Cobertura concreta de Tamariu, data, divisions i informació de cobertes efectivament presents, extracció vectorial per àrea i pes del fitxer. No assumir que el WMS dona els polígons. |
| ICGC Referencial Topogràfic Territorial (RTT) | El catàleg situa l’escala òptima a 1:5.000. És la font oficial que utilitzem actualment a Catalunya. | Comparar-la amb RTL/Catastre per zona. El diagnòstic RO-002 ja acredita agrupació sense divisions al polígon 1074761 de la mostra. |
| OSM / OpenFreeMap actual | L’aplicació ja llegeix petjades i atributs de les tessel·les; pot completar cobertura fora d’ICGC. | Comparar geometria original i tessel·lada, generalització per zoom, parts/altures presents o perdudes i qualitat local. No descartar una petjada més bona només perquè no és una font institucional. |
| Cartografia municipal, regional o nacional oberta d’altres zones | Candidata a investigar quan hi hagi un cas concret fora de la cobertura catalana. | Identificar el conjunt vectorial real, data, precisió, llicència i forma d’accés. No es pressuposa un proveïdor universal ni equivalència entre dades de diferents països. |

Referències oficials consultades:

- [Catastre: serveis INSPIRE](https://www.catastro.hacienda.gob.es/webinspire/).
- [Catastre: documentació WFS d’edificis](https://www.catastro.hacienda.gob.es/webinspire/documentos/inspire-bu-wfs.pdf), amb `GetBuildingPartByParcel`.
- [Catastre: descripció dels conjunts](https://www.catastro.hacienda.gob.es/webinspire/documentos/Conjuntos%20de%20datos_en.pdf), que distingeix envolupant d’edifici i parts de volum homogeni.
- [ICGC: Referencial Topogràfic Local](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Geoinformacio-cartografica/Referencial-Topografic-Local).
- [ICGC: Referencial Topogràfic Territorial](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Geoinformacio-cartografica/Referencial-Topografic-Territorial).

## Ordre d’investigació i política a decidir

**Primer Catastre BuildingPart i RTL sobre el mateix retall de Tamariu**, comparats amb RTT i OSM actuals. És un ordre d’investigació motivat pel megabloc existent, no una preferència automàtica ja aprovada.

La política candidata prioritzarà, després dels requisits de reutilització i viabilitat, la fidelitat comprovada dels contorns i parts, la data real de la zona, la precisió, la completesa i la coherència topològica. La procedència institucional per si sola no determina la millor geometria. No s’han fixat pesos numèrics sense mostres de comparació.

La selecció podrà diferir segons l’atribut: una font pot aportar la millor petjada i una altra una altura millor. Barrejar-les exigeix comprovar correspondència d’identificadors/posició, semàntica, unitats, datum i dates. Una família d’edifici i parts ha de conservar-se coherent; no s’ha de superposar el volum general a tots els volums de les seves parts ni unir contorns de fonts diferents indiscriminadament. Si hi ha conflicte sense correspondència fiable, conservar-lo com a discrepància i fer explícita la tria.

Caldrà guardar font, identificador, data coneguda, transformacions, estimacions i motiu de selecció per element/atribut. Les opcions d’ocultar, aplanar o limitar edificis de l’usuari es mantindran com a simplificacions de representació.

## Primera prova i resultats esperats

Comparar el bloc 1074761 de la Perica, una casa aïllada i un cas amb pati de Tamariu, i contrastar després una segona zona. Desar una taula de coincidències/omissions, vista superposada de petjades, parts i atributs amb les dates disponibles. Les imatges de referència serveixen per contrastar, no per copiar-ne geometries.

Amb aquesta evidència es podrà decidir font principal, complements i substitució, i construir un primer adaptador. Si el servei no admet accés directe des del navegador, estudiar importació de fitxers o preparació de mostres estàtiques obertes. El resultat continuarà sent publicable a GitHub Pages sense backend propi.

**Actualització posterior a v0.7.0:** obtingudes i comparades les geometries cadastrals del primer retall de la Perica; resposta amb CORS permissiu, parts i famílies distingides. Falta la segona zona, contrastar discrepàncies, provar l’accés dins d’un adaptador de navegador, decidir la política i integrar-la. L’estudi no valida un futur model ni tanca RO-002.

## Fonts fora d’Espanya · v0.23.25

Els projectes nous i les fitxes de la galeria utilitzen «Altura i coberta de les dades». Quan falten cotes, es conserva l’estimació del motor. El límit de 5 m continua disponible i els projectes desats recuperen la representació que tenien.

| Àmbit | Font i prova | Encaix amb GitHub Pages |
| --- | --- | --- |
| França | La BD TOPO de l’IGN publica geometria, altura en metres, nombre de plantes i cotes de sòl i sostre. Té llicència oberta Etalab 2.0. | La consulta WFS per retall ha respost en GeoJSON i amb `Access-Control-Allow-Origin: *`. És la primera candidata per a un adaptador sense dades al repositori. [Fitxa i llicència](https://www.data.gouv.fr/datasets/bd-topo-r) · [API WFS](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/diffusion/wfs/) |
| Andorra | La cartografia topogràfica 3D de 2019 a 1:500 i 1:1.000 documenta façanes i cotes d’edificis. Cobreix zones urbanes i fons de vall. | El GeoPackage es distribueix en un ZIP d’uns 363 MB. El servei de descàrrega no ha retornat CORS i l’IDE documenta un WFS del nomenclàtor. Falta confirmar la reutilització i trobar un servei per retall o preparar una capa reduïda amb permís de redistribució. [Cartografia 3D](https://www.cartografia.ad/cartografia-home/43-cartografia/259-cartografia-topografica-d-andorra-1-500-i-1-1000) · [Serveis IDE](https://www.cartografia.ad/serveis-ogc) |
| Portugal | CartTop defineix `alturaEdificio` i `numeroTotalPisos`. La llista de col·leccions obertes de la DGT inclou el Cadastro Predial, que és de parcel·les. El GeoJSON municipal de Lisboa retorna polígons i no inclou altures ni plantes. | Lisboa respon a retalls amb CORS permissiu i pot servir per comparar petjades. Encara no s’ha verificat un servei nacional consultable amb cotes d’edifici. [Esquema CartTop](https://www.dgterritorio.gov.pt/recart/CONSTRU%C3%87%C3%95ES/Edificio.html) · [Dades obertes DGT](https://www.dgterritorio.gov.pt/dados-abertos) · [Edificado de Lisboa](https://dados.cm-lisboa.pt/dataset/edificado-e-vias) |

Per a Portugal, el DBSM del JRC publica alçades harmonitzades a escala europea. El paquet nacional pesa uns 2,9 GiB i el catàleg l’ofereix com a fitxer. Caldria preparar una capa per retalls i identificar l’altura com a derivada. [Fitxa del JRC](https://data.jrc.ec.europa.eu/dataset/a601a4a8-9289-4fc4-983a-25d54f957f3a) · [Paquets per país](https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/DBSM/DBSM_Europe_R2025/per-country/)

### Prova de la Géoplateforme

Consultes de la capa `BDTOPO_V3:batiment` amb WFS 2.0, `bbox` en `CRS:84`, sortida GeoJSON, camps seleccionats i ordre estable per `cleabs`. El servidor comprimeix les respostes. Les mides de la taula corresponen al JSON descomprimit. [Documentació WFS](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/diffusion/wfs/)

| Retall WGS84 (oest, sud, est, nord) | Edificis examinats amb altura positiva | Mida del JSON | Temps de recepció |
| --- | --- | --- | --- |
| Perpinyà (2.890, 42.694, 2.897, 42.700) | 497 de 500, en dues pàgines de 250 | 147 i 145 kB | 206 i 177 ms |
| Tolosa (1.439, 43.599, 1.450, 43.608) | 999 de 1.000 | 727 kB | 243 ms |

La mateixa capa retorna zero elements en un retall d’Andorra la Vella. Els temps només mesuren la consulta i varien segons la xarxa. A França, `hauteur` es refereix a l’altura sobre el costat baix del terreny. Cal tenir en compte les cotes de sòl quan la maqueta situa la coberta sobre el costat alt. La cota màxima de coberta tampoc determina per si sola la forma d’una teulada. [Especificació BD TOPO 3.5](https://geoservices.ign.fr/sites/default/files/2025-08/DC_BDTOPO_3-5.pdf#page=79)

El primer pilot seria oferir l’IGN com a font opcional als retalls amb cobertura francesa i comparar-lo amb OSM a Perpinyà i Tolosa. L’adaptador consultaria només el retall, amb paginació limitada, i reutilitzaria el resultat quan es modifiquin els ajustos d’edificis. Cal verificar un retall de frontera abans de substituir cap capa automàticament. Si el servei falla o no té cobertura, el model ha de poder continuar amb OSM.
