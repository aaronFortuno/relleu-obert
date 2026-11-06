# RO-025 — Edificis i vies d’altres èpoques

Objectiu: poder imprimir dues maquetes del mateix lloc i comparar l’evolució del teixit construït i de la xarxa de comunicacions. «Actual» continuaria sent el valor per defecte. L’estudi no ha activat cap selector a l’aplicació.

| Font | Què es pot recuperar | Limitació |
| --- | --- | --- |
| [OpenStreetMap amb Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL#Date) | Estat dels objectes OSM en una data des del 12 de setembre de 2012, si el servidor conserva l’historial. Les geometries i els atributs serveixen per construir les capes. | L’absència d’un objecte pot significar que encara no s’havia cartografiat. Les instàncies públiques tenen límits d’ús. |
| [ohsome](https://docs.ohsome.org/ohsome-api/v2/migration_guide.html) | Historial OSM a partir del [8 d’octubre de 2007, segons les metadades de v1](https://api.ohsome.org/v1/metadata). Recompte per dates i extracció segons la versió del servei. | L’extracció de v1 ha retornat HTTP 403 a la prova. La v2 demana clau i retorna GeoParquet; és candidata a preparar fitxers fora del taller, no a incrustar-hi una clau. |
| [Ortofoto territorial de l’ICGC](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Ortoimatges/WMS-Ortofoto-Territorial) | Fotografies aèries georeferenciades: vols de 1945–46 i 1956–57 i capes dels anys vuitanta, noranta i posteriors. El servei permet consultar la data i la resolució de les imatges. | Són imatges. Cal obtenir les geometries d’una altra font o traçar-les i revisar-les sobre les fotografies. L’any ofert pot correspondre a un mosaic de diversos vols. |
| [MTN25 històric del CNIG](https://centrodedescargas.cnig.es/CentroDescargas/mtn25-vectorial-historico) | Fulls d’edicions històriques que el catàleg situa entre 1994 i 2019. Poden documentar vies i nuclis en dates intermèdies. | Són fulls sencers en GeoPDF; queda per provar si es poden recuperar capes amb prou detall per a un model de població. L’any del fitxer correspon a l’edició del full. |

El [Referencial Topogràfic Territorial de l’ICGC](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Geoinformacio-cartografica/Referencial-Topografic-Territorial) descriu una versió de 2024 a 1:5.000 i el [Cadastre INSPIRE](https://www.catastro.hacienda.gob.es/webinspire/index.html) ofereix dades actualitzades. No s’ha verificat que aquestes dues fonts permetin demanar les petjades d’una data històrica.

### Control a Tamariu

Retall de prova: longitud 3,204–3,210°, latitud 41,916–41,920°. L’[endpoint de recompte d’ohsome v1](https://api.ohsome.org/v1/elements/count?bboxes=3.204%2C41.916%2C3.21%2C41.92&time=2012-12-31%2C2018-12-31%2C2025-12-31&filter=highway%3D%2A+and+geometry%3Aline), amb el filtre `highway=* and geometry:line`, ha retornat 29 elements el 31 de desembre de 2012, 48 el 31 de desembre de 2018 i 59 el 31 de desembre de 2025. Són elements del mapa: dividir un carrer en més trams també fa pujar el recompte. La sèrie no mesura els quilòmetres de carretera construïts. El recompte d’edificis no s’ha pogut verificar en el temps de prova.

El [full 0335-1 de Palafrugell](https://centrodedescargas.cnig.es/CentroDescargas/mtn25-vectorial-historico?numHoja25=0335-1), que inclou el centre de Tamariu, té dues edicions localitzades: [2002](https://centrodedescargas.cnig.es/CentroDescargas/detalleArchivo?sec=11707084) i [2014](https://centrodedescargas.cnig.es/CentroDescargas/detalleArchivo?sec=12017072). És un cas concret per provar l’extracció de la xarxa viària i comprovar quins edificis distingeix el mapa a 1:25.000.

Les peticions petites d’Overpass amb data (2014 i 2024) no han retornat geometries en aquesta sessió: HTTP 406 o temps d’espera exhaurit en una instància i limitació de peticions o temps d’espera en l’altra. És una prova de disponibilitat, no de cobertura. Per això el pilot inicial proposa fitxers preparats i verificats, sense dependre d’aquestes consultes quan un alumne obri l’aplicació.

### Pilot proposat

1. Triar un retall urbà d’1–2 km amb creixement conegut i imatges d’època prou clares. Preparar dues capes verificades sobre el mateix perímetre: **anys vuitanta i actualitat**. Afegir èpoques intermèdies quan hi hagi cobertura comparable. Per al primer lloc n’hi ha prou amb fitxers GeoJSON estàtics al projecte, amb l’atribució i la llicència corresponents.
2. Comparar al visor i a l’exportació amb el mateix retall, mida, escala, gir i relleu de referència. Revisar mostres de carrers i edificis sobre la font original. Si hi ha prou dades, comparar superfície ocupada per les petjades i longitud de vies per classe, retallades al mateix perímetre. Això mesura superfície construïda en planta, no el nombre d’habitatges.
3. Quan la font estigui validada, oferir **Època** amb una tria comuna per a edificis i vies i dates independents dins de cada capa. Mostrar només les dates disponibles per a aquell retall i etiquetar-ne la font, la data i el significat. Si una capa històrica falla, mostrar-ho o conservar l’últim model vàlid; substituir-la per dades actuals requereix una acció explícita.

El motor pot reutilitzar el relleu carregat i aplicar-hi altres capes. Cal carregar de la mateixa època els trams de connexió de ponts i vies, i desactivar les reconstruccions específiques modernes si no se n’ha acreditat la data. El relleu i les altres capes actuals s’han d’identificar com a referència: una mateixa base facilita la comparació, però no reconstrueix canvis del terreny o de la costa.
