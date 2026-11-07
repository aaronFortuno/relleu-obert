# Catàleg inicial de llocs per a maquetes

RO-046 recull **31 enquadraments**, agrupats per mode i àmbit. En **Relleu pur**, el punt de partida és una forma que es pugui reconèixer al terreny o al contorn de l’aigua. En **Model complet**, cada retall proposa un patró de carrers, edificis o infraestructures que es pugui llegir en relació amb el lloc.

## Revisió per a maquetes d’aula

La primera passada prioritza una forma principal llegible a la mida final. Per a cada fitxa, cal obrir el retall amb els seus ajustos, comprovar la forma en vista zenital i obliqua, i registrar el resultat del laminat. Apunta si cal canviar l’enquadrament, el gir, l’escala o l’exageració. La validació física es registra a part.

| Fitxa existent | Què cal comprovar | Revisió |
| --- | --- | --- |
| Cap de Creus | La punta queda sencera i destaca del contorn general de la península. | Pendent |
| Ordesa i Mont Perdut | El fons i les parets deixen llegir la secció en U de la vall. | Pendent |
| Estany de Sant Maurici | Es distingeixen la làmina d’aigua i el relleu que tanca la capçalera. | Pendent |
| Montserrat | Les agulles destaquen de la carena a la mida impresa. | Pendent |
| Illes Cíes | La barra de Rodas i l’aigua de cada banda es distingeixen. | Pendent |
| Delta de l’Ebre | Les llacunes i les barres estretes es llegeixen i els talls coincideixen a les quatre peces. | Pendent |

### Candidats per ampliar la tria

- **Estret de Gibraltar.** Provar un retall que mostri les dues ribes i el pas entre elles. [Institut Espanyol d’Oceanografia](https://www.ieo.es/documents/10640/6094157/NP_031224_estrecho%2BBIODIV.pdf/c8d76885-900f-4d6a-8e14-1aedd3a0b77e)
- **Istme d’O Vao, a A Lanzada.** Comprovar que la franja de terra uneix O Grove amb el continent a la mida de la peça. [Turismo de Galicia](https://blog.turismo.gal/?p=13000)
- **Conca de Tremp.** Buscar un enquadrament que inclogui el fons de la conca i prou marge de les serres que la delimiten. [Geoparc Orígens](https://www.geoparcorigens.cat/es/geologia/)
- **Penya-segats de Zumaia.** Prioritzar el perfil del penya-segat i la relació amb el mar. [Geoparc de la Costa Basca](https://geoparkea.eus/es/ciencia-educacion/geologia)
- **Serralada dels Pirineus.** Recuperar la proposta panoràmica per veure la continuïtat de l’eix de la serralada i comprovar que els talls no en dificulten la lectura.

## Primera tria per a les mostres

- **Relleu pur.** Badia de Roses, Cap de Creus i delta de l’Ebre per comparar tres formes del litoral català. Montserrat i el sector de l’Aneto mostren dues formes de massís. Tenerife, Geirangerfjord i el Gran Canó del Colorado amplien la tria amb una illa volcànica, un fiord i un canó fluvial.
- **Model complet.** Barcelona, Girona, Granada i Amsterdam permeten comparar una quadrícula planificada, un nucli històric vora el riu, dos vessants urbans i una ciutat articulada per canals. Cusco afegeix un exemple americà de trama històrica en pendent.

## Primer lot al carrusel

La badia de Roses, el Cap de Creus i el delta de l’Ebre tenen una vista obliqua estàtica del model de Relleu pur amb detall equilibrat i exageració ×1,5. Les tres imatges de 720 × 450 píxels ocupen 52 kB en total. Al delta es veuen les guies de les quatre peces. El visor pot generalitzar els cursos d’aigua i les llacunes petites en els retalls més amplis.

Les noves fitxes s’afegeixen a [la llista d’exemples](../src/curated-examples.js) i les captures es desen a [la carpeta d’imatges](../public/examples/). El carrusel barreja les fitxes cada cop que s’obre i reparteix els dos modes al llarg del bucle segons la proporció disponible. Les fletxes acceleren el moviment i un clic desplaça una fitxa sencera. El moviment es frena quan es consulta una fitxa ampliada. En triar-la, l’aplicació genera la maqueta amb la mida, escala, centre i gir de la fitxa i els ajustos predeterminats. Els ajustos es poden editar a Territori després de la generació.

Cartografia © OpenStreetMap contributors (ODbL), via OpenFreeMap. Elevacions © Mapterhorn. El catàleg d’elevacions del proveïdor inclou el MDT02 i el MDT05 del Sistema Cartográfico Nacional i el Copernicus GLO-30. [OpenStreetMap](https://www.openstreetmap.org/copyright) · [Atribucions de Mapterhorn](https://mapterhorn.com/attribution/)

## Segon lot al carrusel

Montserrat, l’estany de Sant Maurici i els volcans del Croscat i Santa Margarida s’afegeixen després dels tres exemples litorals. Són retalls d’una sola peça i tenen vistes obliqües estàtiques de 720 × 450 píxels. A Sant Maurici, la càmera mira l’estany des del nord per deixar els Encantats al fons.

Les elevacions de les captures de Montserrat i Sant Maurici són de Mapterhorn. La dels volcans utilitza el MET5 de l’ICGC. L’aigua i el bosc dels tres retalls provenen d’OpenStreetMap via OpenFreeMap. [Atribucions de Mapterhorn](https://mapterhorn.com/attribution/) · [Models d’elevacions de l’ICGC](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions) · [OpenStreetMap](https://www.openstreetmap.org/copyright)

## Primer lot de Model complet al carrusel

Barcelona, Girona i Cardona utilitzen els centres de la taula de Catalunya, a 1:10.000, amb una sola peça i el nord a dalt. Les tres fitxes tenen una vista obliqua estàtica del visor i queden intercalades entre les sis de Relleu pur. A l’Eixample interessa el traçat dels carrers i dels xamfrans. A Girona, el contrast entre el riu i el nucli històric. A Cardona, la relació entre el castell, la vila i el relleu de la Vall Salina.

Les tres imatges WebP de 720 × 450 píxels ocupen 168 kB en total. Les captures fan servir el MET5 i els edificis de l’ICGC, amb cartografia d’OpenStreetMap via OpenFreeMap.

## Catàleg complet al carrusel

El lot final incorpora els onze retalls de Relleu pur i els vuit de Model complet que faltaven. Amb la incorporació de la badia de Tamariu, el carrusel reparteix 17 fitxes de Relleu pur i 12 de Model complet al llarg del bucle. Els 29 retalls de les taules es poden generar des de la fitxa, amb la mida, el centre, el gir i l’escala documentats.

La primera captura de Tenerife mostrava tres peces. A Granada, el visor conserva les vies ordinàries i els edificis quan falla la integració dels perfils suaus. A Amsterdam, la unió dels carrers es recupera amb un ajust de precisió projectada i es conserva el retall. Els models urbans grans poden trigar diversos minuts en l’equip de prova.

Les dinou captures del lot final són WebP de 720 × 450 píxels i ocupen 729 kB en total. La cartografia i els edificis d’aquest lot provenen d’OpenStreetMap via OpenFreeMap. [Imatges](../public/examples/) · [OpenStreetMap](https://www.openstreetmap.org/copyright)

En obrir una maqueta del catàleg, «La teva maqueta» mostra el nom del lloc, el mode, el tipus i la mateixa descripció de la fitxa. El resum correspon al retall que es veu al visor. Es recupera en tornar a generar un projecte desat del catàleg.

La fitxa de Tamariu conserva el centre de la mostra original i l’identificador dels projectes desats. La maqueta és d’una sola peça i té el nord a dalt. [Dades de la mostra](../public/data/tamariu.json)

| Proveïdor d’elevacions registrat | Captures del lot final |
| --- | --- |
| Mapterhorn | Tenerife, Teide i Las Cañadas, Ordesa, illes Cíes, Bardenas, Geirangerfjord, Tre Cime, mont Fuji, Gran Canó del Colorado, Granada, Bilbao, Ronda, Amsterdam, Lisboa i Chicago |
| Mapzen Terrain Tiles via AWS | Santorini, Table Mountain, Venècia i Cusco |

El catàleg de Mapterhorn recull el Sistema Cartográfico Nacional per als retalls de l’Estat espanyol, Kartverket per a Noruega, TINITALY i la província de Bolzano per a Itàlia, GSI per al Japó, USGS 3DEP per als EUA, AHN per als Països Baixos i la Direção-Geral do Território per a Portugal. També hi consta el Copernicus GLO-30. El catàleg de Tilezen recull Copernicus EU-DEM per a Europa i les fonts globals de l’USGS i la NOAA. Les llistes originals detallen els crèdits i la cobertura de cada conjunt. [Fonts originals de Mapterhorn](https://mapterhorn.com/attribution/) · [Atribucions de Tilezen](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) · [Registre d’AWS](https://registry.opendata.aws/terrain-tiles/)

## Graella de la galeria i fitxes de l’Aneto

La galeria mostra la descripció completa, el tipus de paisatge, la mida, el mode i l’escala al costat de cada captura. La cerca es combina amb els filtres de mode, dimensions i família de paisatge. Una fitxa pot pertànyer a més d’una família. El carrusel de la pantalla inicial també inclou les dues fitxes noves.

Els dos retalls de l’Aneto comparen el conjunt del massís amb el detall dels llacs. Tots dos són de Relleu pur, amb gir de 0°, detall equilibrat i exageració vertical ×1,5. [Posets-Maladeta · Turisme d’Aragó](https://www.turismodearagon.com/ficha/parque-natural-posets-maladeta/) · [Dades locals de relleu i aigua](RO-055-RELLEU-PUR.md)

Les dues captures WebP de 720 × 450 píxels provenen del visor. Fan servir elevacions de Mapterhorn, roca i neu derivades d’ESA WorldCover 2021 v200 (CC BY 4.0), i aigua i bosc d’OpenStreetMap via OpenFreeMap. [Mapterhorn](https://mapterhorn.com/attribution/) · [ESA WorldCover](https://doi.org/10.5281/zenodo.7254221) · [OpenStreetMap](https://www.openstreetmap.org/copyright)

## Tenerife en dues peces

El nou retall reprodueix l’enquadrament de `tenerife.json` aportat per l’usuari. El model de Relleu pur abasta 120 × 60 km amb detall equilibrat i exageració vertical ×1,5. La miniatura WebP mostra la guia de tall entre les dues peces de 20 × 20 cm. [Miniatura de Tenerife](../public/examples/tenerife.webp)

## Com reproduir els retalls

1. Tria el mode i introdueix la **mida de la maqueta** en l’ordre amplada × alçada. Fes servir la mida personalitzada quan calgui.
2. Enganxa a la cerca de Territori el **centre del retall** en graus decimals WGS84, amb punt decimal i coma entre latitud i longitud. Els enllaços «Mapa» situen aquest punt.
3. Mou el selector d’**escala horitzontal** fins al valor indicat. Les fletxes permeten avançar un salt d’escala cada vegada. Orienta el nord a dalt (gir de 0°), amb un gir de +10° al Cap de Creus i de −25° a Tenerife. L’**extensió** és la mida real del retall, calculada a partir de la mida de la maqueta i l’escala.

El centre de cada fila és el punt mig de l’enquadrament proposat. Pot caure a l’aigua o fora del topònim. La mida i el gir formen part de l’enquadrament. Si es canvia la proporció de la peça, cal mantenir dins del retall els elements citats a la fitxa.

El **Model complet** admet fins a 1:20.000, amb un límit addicional per superfície de càrrega. El **Relleu pur** admet 1:10.000–1:500.000 en formats de fins a 50 cm de costat, i 1:50.000–1:500.000 en el format panoràmic de 51–100 × 10–20 cm. El terreny i l’aigua permeten comparar les formes de les mostres de Relleu pur. [Regles de selecció](../src/selection.js) · [Límits d’escala](../src/place-map.js) · [Seguiment del mode](RO-055-RELLEU-PUR.md)

## Relleu pur

### Catalunya

| Què representa | Lloc | Centre del retall | Extensió real | Maqueta i escala | Què s’hi hauria de llegir |
| --- | --- | --- | --- | --- | --- |
| Badia | Badia de Roses (Alt Empordà) | `42.1870,3.1670` [Mapa](https://www.openstreetmap.org/?mlat=42.1870&mlon=3.1670#map=10/42.1870/3.1670) | 24 × 22 km | 24 × 22 cm · 1:100.000 | La concavitat entre la costa de Roses i el Montgrí, amb la plana litoral i els Aiguamolls de l’Empordà. [Turisme de Roses](https://visit.roses.cat/ca/descobreix/natura-i-paisatge/paisatge/badia-de-roses.html) |
| Cap | Cap de Creus (Alt Empordà) | `42.293444,3.212368` [Mapa](https://www.openstreetmap.org/?mlat=42.293444&mlon=3.212368#map=11/42.293444/3.212368) | 20 × 20 km | 20 × 20 cm · 1:100.000 · +10° | La península entre Roses, Cadaqués i el Port de la Selva, amb la punta a llevant. El centre i el gir provenen del retall de l’usuari. [ICGC](https://app1.icgc.cat/bd/mapes/igc_GT1_259q11q21q12_79x21_80x21_79x22_v1g.pdf) |
| Delta fluvial | Delta de l’Ebre (Baix Ebre i Montsià) | `40.6900,0.7750` [Mapa](https://www.openstreetmap.org/?mlat=40.6900&mlon=0.7750#map=10/40.6900/0.7750) | 34 × 32 km | 34 × 32 cm · 1:100.000 | La desembocadura i l’illa de Buda, el Fangar, el Trabucador i la punta de la Banya. La silueta i les llacunes són el centre de la mostra. [Parc Natural](https://parcsnaturals.gencat.cat/web/.content/Xarxa-de-parcs/delta_de_lebre/el_parc/mapa/planol-ca-es.pdf) |
| Massís de conglomerats | Montserrat (Bages, Anoia i Baix Llobregat) | `41.6020,1.8160` [Mapa](https://www.openstreetmap.org/?mlat=41.6020&mlon=1.8160#map=12/41.6020/1.8160) | 10 × 6 km | 20 × 12 cm · 1:50.000 | Carena allargada, agulles i contrast amb els vessants. De les Agulles fins al sector del monestir. [Patronat de Montserrat](https://muntanyamontserrat.gencat.cat/ca/el_parc/historia-i-origens/) |
| Estany glacial | Estany de Sant Maurici i els Encantats (Pallars Sobirà) | `42.5760,1.0100` [Mapa](https://www.openstreetmap.org/?mlat=42.5760&mlon=1.0100#map=12/42.5760/1.0100) | 5 × 5 km | 25 × 25 cm · 1:20.000 | L’estany, els cims dels Encantats i l’amfiteatre que envolta la capçalera de la vall. [Parc Nacional](https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/aiguestortes/el-parc/patrimoni-natural-i-cultural/paisatge/) |
| Cons volcànics | Croscat i Santa Margarida (Garrotxa) | `42.1500,2.5460` [Mapa](https://www.openstreetmap.org/?mlat=42.1500&mlon=2.5460#map=14/42.1500/2.5460) | 4 × 4 km | 20 × 20 cm · 1:20.000 | El cràter de Santa Margarida al costat del con del Croscat, amb el tall de les antigues extraccions com a detall secundari. [Parc Natural](https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/garrotxa/el-parc/patrimoni-natural-i-cultural/geologia/) |

### Resta de l’Estat espanyol

| Què representa | Lloc | Centre del retall | Extensió real | Maqueta i escala | Què s’hi hauria de llegir |
| --- | --- | --- | --- | --- | --- |
| Illa volcànica | Tenerife (Canàries) | `28.29697700,-16.47832495` [Mapa](https://www.openstreetmap.org/?mlat=28.29697700&mlon=-16.47832495#map=8/28.29697700/-16.47832495) | 120 × 60 km | 40 × 20 cm · 1:300.000 · −25° | El contorn de l’illa sencera, del Teno a Anaga i a la punta de la Rasca, amb el Teide al centre del relleu insular. Dues peces de 20 × 20 cm. [Cartografia del Cabildo de Tenerife](https://datos.canarias.es/catalogos/general/dataset/limites-municipales-de-tenerife/resource/91c4573e-d737-4c20-9827-758727d08e3a) |
| Con volcànic i caldera | Teide i Las Cañadas (Tenerife) | `28.2600,-16.6150` [Mapa](https://www.openstreetmap.org/?mlat=28.2600&mlon=-16.6150#map=10/28.2600/-16.6150) | 24 × 20 km | 24 × 20 cm · 1:100.000 | Retall de detall de l’illa per llegir la vora de la caldera i els cons del Teide i Pico Viejo. [IGN](https://www.ign.es/web/catalogo-cartoteca/resources/pdfcards/card031570.pdf) |
| Vall glacial | Ordesa i Mont Perdut (Aragó) | `42.6300,0.0250` [Mapa](https://www.openstreetmap.org/?mlat=42.6300&mlon=0.0250#map=10/42.6300/0.0250) | 24 × 20 km | 24 × 20 cm · 1:100.000 | La vall d’Ordesa i les seves parets fins al massís del Mont Perdut. Interessant per comparar la secció amb la d’un canó fluvial. [MITECO](https://www.miteco.gob.es/en/parques-nacionales-oapn/red-parques-nacionales/parques-nacionales/ordesa/valores-naturales/geologia.html) |
| Massís d’alta muntanya | Pirineus · sector de l’Aneto (Aragó) | `42.6350,0.6500` | 24 × 20 km | 24 × 20 cm · 1:100.000 | El massís de la Maladeta, amb el cim de l’Aneto i les valls que l’envolten. |
| Estanys glacials | Llacs glacials de l’Aneto (Aragó) | `42.6330,0.6380` | 4,8 × 4,8 km | 24 × 24 cm · 1:20.000 | L’estany de Cregüeña i els de Corones entre les crestes i els circs de la Maladeta. |
| Arxipèlag litoral | Illes Cíes (Galícia) | `42.2170,-8.9070` [Mapa](https://www.openstreetmap.org/?mlat=42.2170&mlon=-8.9070#map=12/42.2170/-8.9070) | 10 × 12,5 km | 20 × 25 cm · 1:50.000 | Les illes principals, els vessants i el pas entre elles. Cal comprovar que la barra de Rodas i l’aigua que tanca siguin llegibles. [IGN](https://www.ign.es/web/catalogo-cartoteca/resources/pdfcards/card020580.pdf) |
| Xarxa de barrancs en terreny argilós | Bardenas Reales · Bardena Blanca (Navarra) | `42.2160,-1.5020` [Mapa](https://www.openstreetmap.org/?mlat=42.2160&mlon=-1.5020#map=12/42.2160/-1.5020) | 6 × 6 km | 20 × 20 cm · 1:30.000 | Els barrancs de les Cortinas i els relleus residuals com el Castildetierra. La xarxa de drenatge és el tret principal del retall. [IGME](https://info.igme.es/ielig/LIGInfo.aspx?codigo=EB021) |

### Resta d’Europa

| Què representa | Lloc | Centre del retall | Extensió real | Maqueta i escala | Què s’hi hauria de llegir |
| --- | --- | --- | --- | --- | --- |
| Fiord | Geirangerfjord (Noruega) | `62.1100,7.0750` [Mapa](https://www.openstreetmap.org/?mlat=62.1100&mlon=7.0750#map=11/62.1100/7.0750) | 18 × 18 km | 24 × 24 cm · 1:75.000 | El braç de mar fins al poble de Geiranger i el contrast amb les parets escarpades. [UNESCO](https://whc.unesco.org/en/list/1195/maps/) |
| Caldera marina | Santorini (Grècia) | `36.4070,25.4070` [Mapa](https://www.openstreetmap.org/?mlat=36.4070&mlon=25.4070#map=11/36.4070/25.4070) | 20 × 20 km | 20 × 20 cm · 1:100.000 | El contorn emergit de Thera i Therasia i els illots Kameni dins la caldera. [Smithsonian GVP](https://volcano.si.edu/volcano.cfm?vn=212040) |
| Torres rocoses alpines | Tre Cime di Lavaredo, Dolomites (Itàlia) | `46.6180,12.3020` [Mapa](https://www.openstreetmap.org/?mlat=46.6180&mlon=12.3020#map=12/46.6180/12.3020) | 10 × 10 km | 20 × 20 cm · 1:50.000 | Les torres i el replà del massís. Cal comprovar si el model d’elevacions separa les tres puntes. [Parc Natural](https://parchi-naturali.provincia.bz.it/it/parco-naturale-tre-cime) |

### Resta del món

| Què representa | Lloc | Centre del retall | Extensió real | Maqueta i escala | Què s’hi hauria de llegir |
| --- | --- | --- | --- | --- | --- |
| Estratovolcà | Mont Fuji (Japó) | `35.3610,138.7280` [Mapa](https://www.openstreetmap.org/?mlat=35.3610&mlon=138.7280#map=10/35.3610/138.7280) | 25 × 25 km | 25 × 25 cm · 1:100.000 | El con central i els vessants radials. El cràter és un detall per contrastar amb la resolució disponible. [Smithsonian GVP](https://volcano.si.edu/volcano.cfm?vn=283030) |
| Canó fluvial | Gran Canó del Colorado, sector de Grand Canyon Village (EUA) | `36.1180,-112.1000` [Mapa](https://www.openstreetmap.org/?mlat=36.1180&mlon=-112.1000#map=10/36.1180/-112.1000) | 25 × 25 km | 25 × 25 cm · 1:100.000 | El Colorado encaixat entre dues vores d’altiplà i els barrancs laterals. [National Park Service](https://www.nps.gov/grca/learn/nature/grca-geology.htm) |
| Muntanya tabular | Table Mountain (Sud-àfrica) | `-33.9600,18.4180` [Mapa](https://www.openstreetmap.org/?mlat=-33.9600&mlon=18.4180#map=11/-33.9600/18.4180) | 12 × 12 km | 24 × 24 cm · 1:50.000 | El cim pla, els vessants abruptes, Lion’s Head i la costa de Camps Bay. [SANParks](https://www.sanparks.org/wp-content/uploads/2024/02/tmnp-visitors-map.pdf) |

## Model complet

### Catalunya

| Què representa | Lloc | Centre del retall | Extensió real | Maqueta i escala | Què s’hi hauria de llegir |
| --- | --- | --- | --- | --- | --- |
| Badia petita | Badia de Tamariu | `41.9180,3.2075` | 1,8 × 1,8 km | 18 × 18 cm · 1:10.000 | La platja, les cases i els penya-segats. Permet comparar el perfil de costa amb la badia més oberta de Roses. |
| Eixample planificat | Barcelona · Eixample de Cerdà | `41.3950,2.1630` [Mapa](https://www.openstreetmap.org/?mlat=41.3950&mlon=2.1630#map=14/41.3950/2.1630) | 2,4 × 2,4 km | 24 × 24 cm · 1:10.000 | La quadrícula i els xamfrans, amb la Diagonal i el passeig de Gràcia com a referències. [Ajuntament de Barcelona](https://bcnroc.ajuntament.barcelona.cat/jspui/bitstream/11703/129573/5/jardins-eixample-cat_web-compressed_paginaxpagina.pdf) |
| Nucli històric i riu | Girona · Barri Vell i Onyar | `41.9860,2.8265` [Mapa](https://www.openstreetmap.org/?mlat=41.9860&mlon=2.8265#map=14/41.9860/2.8265) | 1,6 × 1,6 km | 16 × 16 cm · 1:10.000 | El riu, els ponts, els carrers estrets i el pendent cap a la catedral i la muralla. [Ajuntament de Girona](https://web.girona.cat/mobilitat/circulacio/barrivell-criteris) |
| Vila fortificada i paisatge miner | Cardona · Castell, vila i Vall Salina | `41.9110,1.6800` [Mapa](https://www.openstreetmap.org/?mlat=41.9110&mlon=1.6800#map=14/41.9110/1.6800) | 2,4 × 2,4 km | 24 × 24 cm · 1:10.000 | El turó fortificat, la vila i el paisatge de l’explotació salina en superfície. [Patrimoni Cultural](https://patrimoni.gencat.cat/ca/monuments/monuments/castell-de-cardona/) · [Vall Salina](https://patrimoni.gencat.cat/ca/node/1416) |

### Resta de l’Estat espanyol

| Què representa | Lloc | Centre del retall | Extensió real | Maqueta i escala | Què s’hi hauria de llegir |
| --- | --- | --- | --- | --- | --- |
| Patrimoni en dos vessants | Granada · Alhambra i Albaicín | `37.1800,-3.5915` [Mapa](https://www.openstreetmap.org/?mlat=37.1800&mlon=-3.5915#map=14/37.1800/-3.5915) | 2,4 × 2,4 km | 24 × 24 cm · 1:10.000 | Dos vessants urbanitzats, separats pel Darro, amb carrers, recintes i patis segons les petjades disponibles. [UNESCO](https://whc.unesco.org/en/list/314/maps/) |
| Front fluvial urbà | Bilbao · Ria i Abandoibarra | `43.2690,-2.9380` [Mapa](https://www.openstreetmap.org/?mlat=43.2690&mlon=-2.9380#map=14/43.2690/-2.9380) | 2,4 × 2,4 km | 24 × 24 cm · 1:10.000 | El revolt de la ria, els ponts, els passeigs i la petjada del Guggenheim. [Museu Guggenheim Bilbao](https://www.guggenheim-bilbao.eus/informacion-practica/haz-turismo/que-ver/ria-de-bilbao) |
| Ciutat sobre un congost | Ronda · Tajo i Pont Nou | `36.7408,-5.1662` [Mapa](https://www.openstreetmap.org/?mlat=36.7408&mlon=-5.1662#map=14/36.7408/-5.1662) | 1,4 × 1,4 km | 14 × 14 cm · 1:10.000 | El congost i la relació entre els dos costats urbans. El pont és una referència de traçat que cal validar al visor. [Ajuntament de Ronda](https://ayuntamientoronda.es/el-ayuntamiento-de-ronda-abrira-la-segunda-fase-del-camino-del-desfiladero-del-tajo-y-completara-su-recorrido-el-16-de-septiembre/) |

### Resta d’Europa

| Què representa | Lloc | Centre del retall | Extensió real | Maqueta i escala | Què s’hi hauria de llegir |
| --- | --- | --- | --- | --- | --- |
| Anell de canals | Amsterdam · Singelgracht (Països Baixos) | `52.3695,4.8915` [Mapa](https://www.openstreetmap.org/?mlat=52.3695&mlon=4.8915#map=14/52.3695/4.8915) | 2,5 × 2,5 km | 25 × 25 cm · 1:10.000 | Els canals concèntrics i les illes edificades. La lectura depèn de la continuïtat de l’aigua entre ponts. [UNESCO](https://whc.unesco.org/en/list/1349/maps/) |
| Trames urbanes en pendent | Lisboa · Alfama i Baixa (Portugal) | `38.7125,-9.1320` [Mapa](https://www.openstreetmap.org/?mlat=38.7125&mlon=-9.1320#map=14/38.7125/-9.1320) | 2 × 2 km | 20 × 20 cm · 1:10.000 | El contrast entre els carrers irregulars d’Alfama i la quadrícula de la Baixa, del castell cap al Tajo. [Turisme de Lisboa](https://www.visitlisboa.com/en/places/baixa-chiado) |
| Ciutat de canals | Venècia · Gran Canal (Itàlia) | `45.4370,12.3330` [Mapa](https://www.openstreetmap.org/?mlat=45.4370&mlon=12.3330#map=14/45.4370/12.3330) | 3 × 3 km | 15 × 15 cm · 1:20.000 | El Gran Canal i els fronts edificats. Els canals menors són una comprovació de detall. [UNESCO](https://whc.unesco.org/en/list/394/) |

### Resta del món

| Què representa | Lloc | Centre del retall | Extensió real | Maqueta i escala | Què s’hi hauria de llegir |
| --- | --- | --- | --- | --- | --- |
| Quadrícula i riu urbà | Chicago · Riu i Loop (EUA) | `41.8870,-87.6265` [Mapa](https://www.openstreetmap.org/?mlat=41.8870&mlon=-87.6265#map=14/41.8870/-87.6265) | 2,5 × 2,5 km | 25 × 25 cm · 1:10.000 | El riu, els ponts i els carrers en quadrícula. La silueta dels gratacels requereix alçades d’edificis contrastades. [Ajuntament de Chicago](https://chicago.gov/city/en/sites/chicagoriverwalk/home.html.html) |
| Centre històric andí | Cusco · Plaça d’Armes i entorn (Perú) | `-13.5170,-71.9780` [Mapa](https://www.openstreetmap.org/?mlat=-13.5170&mlon=-71.9780#map=14/-13.5170/-71.9780) | 2,4 × 2,4 km | 24 × 24 cm · 1:10.000 | La plaça, el pendent i la trama formada per la ciutat inca i la colonial. Cal comprovar la continuïtat de les petjades. [UNESCO](https://whc.unesco.org/en/list/273/maps/) |

## Exemples de l’aplicació que es poden aprofitar

- **Serralada · Eix dels Pirineus.** Antic retall panoràmic d’«Altres retalls», amb centre `42.8000,0.7500`. En 100 × 20 cm, a 1:450.000 i amb gir de +15°, abasta 450 × 90 km. Els projectes desats conserven el retall i els seus ajustos.
- **Infraestructura · Viaducte de l’Eix Diagonal.** Exemple existent amb centre `41.71792,1.78391` i retall quadrat de referència d’1,5 km. Es pot aprofitar com a mostra de Model complet centrada en un viaducte. [Fitxa actual](../src/recommended-places.js)

## Validació abans d’incorporar-los al selector

Els retalls tenen mida, escala i centre definits. La comprovació local cobreix els límits geomètrics i de càrrega de l’aplicació. La primera proposta de Tenerife es va contrastar amb els límits municipals del Cabildo i els contorns insulars de l’ISTAC. [Límits municipals de Tenerife](https://datos.canarias.es/catalogos/general/dataset/limites-municipales-de-tenerife/resource/91c4573e-d737-4c20-9827-758727d08e3a) · [Contorns insulars de l’ISTAC](https://datos.canarias.es/catalogos/general/dataset/islas-canarias-delimitaciones-territoriales-para-fines-estadisticos2)

- **Costa i aigües poc profundes.** Comprova el contorn marí, les llacunes i els passos estrets del delta. Revisa la cota de base en mostres de costa, arran de la incidència registrada a Tamariu. A les maquetes el mar és una superfície plana. [Incidència i tractament del mar](BACKLOG.md#ro-055--mode-de-relleu-pur)
- **Formes de muntanya.** Revisa la silueta amb exageració vertical ×1 abans d’ajustar-la. Les agulles, els cràters petits i els penya-segats depenen de la resolució del terreny.
- **Trama urbana.** Contrasta les petjades, vies i ponts amb el mapa. La primera mostra s’ha de poder llegir a partir del conjunt urbà. Les alçades i cobertes singulars demanen comprovar els atributs disponibles. [Fonts del projecte](../SOURCES.md)
- **Peces i captures.** El delta de l’Ebre es divideix en quatre peces i Tenerife en dues, amb el límit de 25 cm per costat. [Pla de tall](../src/selection.js)
