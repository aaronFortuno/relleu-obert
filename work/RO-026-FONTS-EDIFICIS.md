# RO-026 — Fonts per a edificis més fidels

Estudi inicial del **2026-11-01**. Seguiment i criteris d’acceptació a [BACKLOG.md](BACKLOG.md#ro-026--fidelitat-dels-edificis-i-selecció-de-fonts). Estat: **Per estudiar**. Aquest document registra candidats; no acredita encara una millora a Tamariu ni modifica l’aplicació.

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

**Pendent:** obtenir i comparar aquestes geometries, verificar cobertura i accés real, decidir la política i implementar-la. Aquesta consulta documental no valida un futur model ni tanca RO-002.
