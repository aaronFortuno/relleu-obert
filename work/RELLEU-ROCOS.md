# Pilot de relleu rocós

## Cavall Bernat · RO-023

Quatre controls amb el mateix centre (41,6007 N, 1,8227 E), base de 150 × 150 mm i exageració ×1,5. Mateix mostreig i criteri de triangulació de Relleu pur per a cada parell. Mapterhorn ha servit quatre tessel·les a zoom 14 de 512 píxels de costat. L’ICGC ha servit el MET5 de 5 m en ArcGrid via WCS, amb `Access-Control-Allow-Origin: *` a la petició de prova. El control de 300 m fa servir la malla fora del rang actual del selector de Relleu pur.

| Escala | Retall | Pas de malla | Cota màxima a 20 m del centre, Mapterhorn | ICGC MET5 |
| --- | --- | --- | ---: | ---: |
| 1:2.000 | 300 × 300 m | 2 m | 1.058,1 m | 1.109,9 m |
| 1:10.000 | 1.500 × 1.500 m | 10 m | 1.051,0 m | 1.109,8 m |

Els perfils són seccions de les dues fonts pel centre, en quatre direccions i amb eixos comuns dins de cada gràfic. A les quatre direccions del retall de 300 m, la discrepància màxima entre fonts és de 74,5 a 76,2 m. Al retall de 1.500 m la màxima global és semblant entre les fonts, mentre que la diferència a l’entorn de l’agulla es manté. Les quatre malles són tancades i superen l’auditoria 3MF. El retall de 300 m supera els 230 mm d’alçada amb aquesta exageració. El laminat és pendent.

El MET5 queda integrat al Model complet i a Relleu pur. El motor accepta una graella completa de fins a 1.200 cel·les per costat, amb un límit de 15 s i 32 MiB de resposta. Si hi ha buits o el servei falla, el retall sencer passa a la font general. Els exemples del Model complet carregats des del catàleg conserven les dades empaquetades. [Servei WCS](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-i-WCS-Elevacions/WCS-del-Model-dElevacions-del-Terreny)

Al **Pedraforca**, el retall de 1.500 × 1.500 m centrat a 42,237 N, 1,704 E ha seleccionat MET5 en tots dos modes. Base de 150 mm, exageració ×1,5. El 3MF de Relleu pur té 74.752 triangles i el de Model complet, 92.228. Tots dos passen l’auditoria. Queden pendents el contrast visual amb la font general i el refinament de la malla.

### Pilot de detall local amb el MDT de 50 cm

Control fora de línia de 300 × 300 m a 1:2.000, amb peça de 150 × 150 mm i exageració ×1. Les dues malles es mostregen cada 1,25 m. La primera utilitza només MET5. La segona incorpora les cotes de 50 cm dins de 80 m del centre, amb transició progressiva fins als 115 m. La lectura HTTP parcial demana una finestra de 465 × 465 cel·les del GeoTIFF original en EPSG:25831. La fitxa del conjunt de 50 cm declara altituds ortomètriques EGM08D595 i llicència CC BY 4.0. El proveïdor no ha exposat CORS a la consulta parcial de prova. [Metadades i descàrrega de l’ICGC](https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat)

Per al cupó, la mediana de la diferència entre fonts a l’anell de solapament afegeix 1,07 m al detall. És un ajust local entre superfícies, amb diferències mostrejades de −6,28 a +34,56 m a l’anell. Les dues malles sense gir comparteixen la cota de base. Amb i sense gir de 35°, el pedaç conserva exactament les cotes de les vores exteriors del retall. Els tres 3MF tenen 118.080 triangles i superen l’auditoria de sòlid. La forma i el laminat s’han de contrastar amb els 3MF. L’operació només substitueix elevacions i representa una sola cota per coordenada.

Als 20 m al voltant del centre del control, el màxim mostrejat és de 1.109,92 m al MET5 i de 1.082,50 m amb el pedaç. La diferència d’uns 27 m apareix també abans de convertir el relleu en sòlid. Cal verificar quina font conserva la forma i la cota de l’agulla abans d’activar una substitució automàtica. La resolució nominal i l’auditoria del sòlid permeten comprovar aspectes diferents.

### Catàleg de formes naturals i infraestructures

Open Place Models pot compartir l’índex per coordenades, la memòria cau, els identificadors i la procedència entre edificis i formes singulars. El perfil actual de l’edifici encaixa el sòlid sobre el terreny. Un pedaç d’elevació s’aplica abans de generar la superfície. Una malla 3D amb una obertura substitueix un volum de terreny i necessita àncora horitzontal, origen i datum vertical, contorn d’unió i un retall que conservi la cavitat. Si l’encaix no dona un sòlid tancat, cal conservar el MDT general. Els lectors d’edificis actuals han de continuar llegint l’índex v1. El cupó encara és local i no està connectat al catàleg.

Un model del massís de Montserrat pot combinar un relleu base i pedaços locals. L’escala física i la informació disponible governen la selecció de detall. Cal comprovar la transició al terreny, el retall i el gir, la unió de materials, la base i les obertures al laminador abans de publicar cada recurs. Riglos és un segon control de la mateixa estratègia quan es confirmi la cobertura dels espadats. El núvol NPC02 d’Aragó és un punt de partida per a la superfície. [PNOA-LiDAR](https://pnoa.ign.es/pnoa-lidar/tercera-cobertura)

Millau encaixa en un perfil d’infraestructura amb extrems d’ancoratge, l’eix i la rasant compartits amb l’A75. La geometria preparada pot incloure la curvatura, les piles i els pilons. Els tirants requereixen una variant imprimible segons l’escala. L’absència del recurs o una unió inviable deixen actiu el motor procedimental. [Dades oficials del viaducte](https://www.leviaducdemillau.com/sites/viaducdemillau/accueil-viaduc-de-millau/le-viaduc/les-chiffres-cles.html)

## Els Degotalls · RO-035

Cupó de la paret del sector est, secció nord, a partir del LiDAR terrestre d’octubre de 2020. En una graella vertical XZ de 0,5 m, la profunditat Y prové dels punts observats. La malla tanca el dors i els costats amb superfícies artificials. La cara mesurada avança fins a 0,97 m cap al punt d’escaneig en un tram de 2 m verticals. El cupó a 1:200 fa 50 × 24,54 × 60 mm, té 2.096 triangles i supera l’auditoria 3MF.

Les coordenades del fitxer són locals. Abans de substituir una secció del MDT, cal recuperar la transformació a coordenades de terreny i contrastar el datum, la cobertura lateral i la cara inferior. La cara visible del cupó acredita la viabilitat de conservar un pendent invertit local amb punts mesurats. La forma completa d’una balma requereix cobertura addicional. [Dades i atribució](https://doi.org/10.34810/DATA201) · [Format i llicència CC BY 4.0](https://dataverse.csuc.cat/api/access/datafile/12829)

Les metadades CORA només donen el rectangle geogràfic de tot el conjunt. L’article identifica l’escaneig com l’estació 2, orientació 2. Cal obtenir la transformació de l’escaneig o punts comuns amb coordenades als dos sistemes. Els fulls de LiDAR aeri 402605 i 402606 de l’ICGC cobreixen el rectangle, segons les capçaleres LAZ. Permeten estudiar un ajust fora de línia sobre punts comuns de la coronació i el peu de la paret, amb punts independents de comprovació. [Metadades CORA](https://dataverse.csuc.cat/api/datasets/:persistentId/?persistentId=doi:10.34810/data201) · [Article](https://doi.org/10.3390/rs14174306) · [LiDAR territorial](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/LiDAR-Territorial)

## Roca Foradada · control d’obertura passant

Amb la v0.21.2, el retall de 800 × 800 m centrat a 41,61107 N, 1,78548 E es genera en Relleu pur amb MET5 real. La prova passa per la mateixa preparació del missatge al motor que el navegador. És el control de relleu de partida per al pilot de l’obertura.

La Diputació de Barcelona inventaria una obertura triangular d’uns 12 × 14,5 m. A 1:10.000, la base fa aproximadament 1,2 mm a la maqueta. El MET5 descriu la superfície superior i no conté el buit. Per validar un flux general cal un núvol de punts o una malla amb cobertura de les dues boques i de la volta. Amb mesures parcials es podria preparar un cupó aproximat, identificat com a tal. El control ha de conservar l’obertura de banda a banda en una malla tancada i al laminador. [Inventari de la Diputació](https://patrimonicultural.diba.cat/print/pdf/node/74394)

La figura 14 d’un treball de la UPC i l’ICGC mostra una reconstrucció tridimensional de la Foradada amb la volta. No s’ha localitzat una descàrrega de la malla amb condicions de reutilització. [Estudi i figura 14](https://doi.org/10.3390/geosciences12100370)

### Pilot de catàleg · v0.23.29

El model utilitza un retall de 64 × 64 m del MDT de 50 cm de l’ICGC, mostrejat cada metre. La cavitat és una reconstrucció aproximada a partir de la topografia de camp de Jordi Navarro i Montse Mañosa. El perfil oest fa uns 10,2 × 13 m, amb un eix de 74°. La boca oest s’ha ajustat a la carena del MDT, prop de 41,61223 N, 1,78670 E i a 892,8 m. [Fitxa i fonts del model](https://github.com/aaronFortuno/open-place-models/tree/main/models/roca-foradada/r1)

El catàleg lliura un GLB per al visor i un fitxer amb la graella d’altituds i el volum que cal restar per obrir la roca. Relleu Obert barreja el detall amb el terreny del retall als últims 8 m del pedaç i talla les capes de superfície abans d’afegir-hi vegetació. El pas requereix 0,8 mm d’amplada nominal a la maqueta i una graella amb un pas de com a màxim la meitat de l’amplada real. El relleu de base continua disponible quan el detall resulta insuficient.

| Mode | Escala | Gir | Control |
| --- | --- | --- | --- |
| Model complet | 1:2.000 | +35° | Pas axial obert, volta present i quatre capes tancades |
| Relleu pur | 1:10.000 | −29° | Pas axial obert i volta present. Es conserven amb exageració ×1,25 i base de 6 mm i en el tall per la cavitat |

Les comprovacions fan passar un raig per l’eix del buit a 897 m i comproven que hi ha roca per sobre, a 907 m. Els tres 3MF queden a `output/foradada/`. Falta comprovar al laminador la llum útil del pas i la forma visible de les boques.

## Reproducció local

```powershell
node --max-old-space-size=512 scripts/compare-cavall-bernat.mjs
node --max-old-space-size=512 scripts/pilot-cavall-detail.mjs
node --max-old-space-size=512 scripts/pilot-degotalls.mjs
node --max-old-space-size=512 scripts/check-foradada.mjs
```

El primer script escriu quatre 3MF, les seccions SVG i les mesures a `output/cavall-bernat/`. El pilot de detall escriu tres 3MF i les mesures a `output/cavall-bernat-detall/`. El script dels Degotalls baixa en flux l’escaneig original, en comprova l’empremta i desa el cupó i l’auditoria a `output/`.
