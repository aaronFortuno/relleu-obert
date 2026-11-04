# RO-032 — Dades de cobertes fidels (Tamariu): recerca de fonts

Actualitzat el 2026-11-04. Fonts verificades i pilot acotat. La reconstrucció de cobertes a partir de LiDAR continua pendent.

## Seguiment del 4 de novembre

El **Referencial Topogràfic Local (RTL)** de l’ICGC especifica careners i parts d’edificació LoD2 amb plans adjacents en tres dimensions. La figura 158 en mostra un exemple a Riudoms. La presència d’aquests elements depèn de la zona i del fitxer distribuït. El MapServer publica la capa de careners `150_construccions_l`, amb `HasZ: false`. Les consultes per caixa als nuclis de Tamariu, Palafrugell i Riudoms van donar zero construccions i zero careners en aquest servei. [Especificació RTL, A.6.5–6 i B.4](https://datacloud.ide.cat/especificacions/topografia-local-v1r0-20250711.pdf#page=74) · [Capa de construccions lineals](https://maps.icgc.cat/vector01/rest/services/topografia_local/MapServer/15)

Mataró té un paquet SHP 3D accessible per rangs HTTP. S’han llegit l’índex del ZIP i les capes de construccions. La capa poligonal és `PolygonZ`, però cap dels 65.285 registres de classe `edn` supera 0,5 m de desnivell entre vèrtexs i a la capa lineal no hi ha registres `crn`. La cota Z pot correspondre a una sola altitud de l’edifici. Cal verificar una mostra amb plans LoD2 abans de triar un importador. [Descàrregues oficials de Mataró](https://mapes.mataro.cat/Nova_Cartografia_Topografica/)

La tessel·la LiDAR territorial que conté el centre de Tamariu és `517640`. Una lectura de 512 bytes ha retornat `206 Partial Content` i una mida total de 235.837.493 bytes. La resposta a l’origen `https://relleu.ortogra.fi` no portava `Access-Control-Allow-Origin`. És una font per al pilot local, amb un accés directe des de l’aplicació web encara pendent. El producte MDTe d’1 m continua sent candidat si es valida l’accés a una finestra de dades. [Tessel·la oficial de Tamariu](https://datacloud.icgc.cat/datacloud/lidar-territorial/laz_unzip/full10km5164/lidar-territorial-v3r1-full1km517640-2021-2023.laz) · [Producte MDTe](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions-especifics-territorials)

### Pilot proposat

1. En un retall de 300 × 300 m del nucli de Tamariu, conservar les petjades cadastrals i filtrar els punts LiDAR classificats com a edificació dins de cada petjada. Comparar coberta plana, un vessant i dues aigües. Exigir prou punts a cada vessant, una millora clara respecte al pla horitzontal i un carener coherent amb la petjada. Conservar la coberta plana si el resultat és ambigu o incompatible amb el contorn.
2. Generar un cupó de 150 × 150 mm a 1:2.000. Comparar les cobertes amb l’ortofoto i comprovar que els volums són tancats. Repetir els mateixos edificis a 1:1.000 i 1:5.000 per mesurar quines carenes encara es llegeixen al laminador. Una pujada real de 2 m dona 2, 1 i 0,4 mm respectivament.
3. Registrar per edifici l’origen de la coberta i el motiu de la recuperació plana. Per al primer pilot web es pot publicar el resultat compacte com a dades estàtiques atribuïdes. La càrrega automàtica per a retalls arbitraris requereix una font accessible des del navegador i una mida de consulta acotada.

## Recerca inicial del 1 de novembre

### Context

- El renderitzador actual de cobertes admet forma explícita (gabled/skillion) + alçada +
  direcció en mode font; el mode limitat és pla per decisió conscient.
- Catastro INSPIRE BU dona petjada i nombre de plantes, NO geometria de coberta. El visor 3D
  de Catastro menciona WFS BuildingPart per a l'entorn, sense prova de geometria de coberta.
- Objectiu: cobertes fidels a Tamariu, sense invents.

## Font primària verificada: ICGC MDTe (Model d'elevacions del terreny amb edificis)

URLs verificades aquesta sessió:

1. Producte: <https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions-especifics-territorials>
2. Especificació tècnica v1.0 (llegida íntegra):
   <https://datacloud.ide.cat/especificacions/model-elevacions-terreny-edificis-territorial-v1r0-20260902.pdf>
3. App de descàrrega: <https://visors.icgc.cat/appdownloads/index.html>

Fets de l'especificació (font 2):

- Ràster 2.5D: cada cel·la porta l'altitud ortomètrica del terreny O del sostre superior de
  l'edifici on n'hi ha. Edifici = cota màxima dels punts classe "building" + interpolació local,
  integrat substituint el MDT. Vegetació exclosa.
- Resolució 1 m (pot ser superior), EPSG:25831, altituds ortomètriques, 2–3 decimals.
- Distribució: GeoTIFF COG 32 bits float, NoData -9999 (confirmat també a la pàgina de producte).
- Lidar territorial 2021–2023, publicació 2026-09, cicle d'actualització ~4 anys, CC BY 4.0.
- Exactitud vertical: EMQ ≤ 15 cm en zones planes amb lidar ~10 punts/m².
- WMS amb GetFeatureInfo per altitud puntual (URL de connexió il·legible a l'extracció del PDF).

Trobada rellevant a l'app de descàrrega (font 3): existeixen també els productes
"Model d'Elevacions del Terreny amb Edificis del Litoral Lidar 1 m i 50 cm". Tamariu és zona
litoral: candidat de més resolució (50 cm) que el territorial, mateixa naturalesa (sostre màxim).
La llista "Per àrea" extreta no mostra encara el MDTe territorial nou (publicat 2026-09);
la selecció és interactiva per bbox/fulls, no s'ha observat cap URL de descàrrega directa.

## Inconnexes exactes (NO "indisponible per sempre")

- URL directa del COG i patró de tessel·les/fulls: no observada (descàrrega via app interactiva).
- Suport CORS i HTTP Range del host COG: no provat (no s'ha fet cap petició al fitxer).
- URL del servei WMS/WCS: tallada a l'extracció del PDF; no verificada.
- Data exacta del vol lidar sobre Tamariu: el rang 2021–2023 és territorial; el full concret cal
  consultar-lo a l'app per fulls.

## Implicació per a cobertes fidels

Cap font pública verificada dona plans de coberta explícits: el MDTe/MDTe-Litoral és un DSM
2.5D (cota màxima per píxel, sense ID d'edifici ni forma). Les cobertes fidels només es poden
obtenir DERIVANT plans del DSM dins de cada petjada cadastral — és dada derivada, no font.

Adaptador de navegador proposat (mínim):

1. Flux de producte prioritari: obtenir el COG remot via un catàleg/URL oficial verificat, llegir només la finestra necessària amb geotiff.js al navegador/Worker i derivar plans per petjada amb indicadors de qualitat. Requereix comprovar primer URL, CORS i HTTP Range. No requereix servidor propi ni fitxers especialitzats del docent.
2. Només com a eina de desenvolupament/fixture: un retall descarregat manualment i processat fora de línia pot validar els ajustos de plans i generar un GeoJSON de control. No és el flux proposat per a l’usuari educatiu.

Portes de qualitat obligatòries:

- MDT de terra nua sempre separat: mai substituir el terreny pel DSM de superfície.
- Mostres del DSM intersectades amb petjades i IDs de família existents; mínim ~20 mostres
  vàlides per petjada, si no → pla (mode limitat actual).
- Concordança de datum: MDTe és ortomètric ETRS89; comprovar el mateix datum que el DEM actual
  abans de comparar alçades (penalització: rebutjar l'edifici si el desfasament supera llindar).
- Qualitat del pla: RMSE d'ajust ≤ ~0,3 m i inclinació coherent; confiança de forma per edifici;
  sota llindar → flat, mai plans inventats.
- Sense barreja automàtica amb cap altre proveïdor no suportat.

Per què les cobertes actuals queden planes: la font actual (Catastro BU) no porta geometria de
coberta i no hi ha cap font primària de plans; generar formes sense el DSM derivat seria inventar.

## Verificació local obligatòria (doc-only)

- `node --test --test-concurrency=1 tests/*.test.js` — resultat: 139/139 correctes.
- `node node_modules/vite/bin/vite.js build --base=./ --configLoader native` — resultat: construcció correcta.
- Futures proves d'acceptació de l'adaptador: explícitament FUTURES, no creades ara.

## Comprovació addicional de root

El codi públic del portal(appdownloads/lib/params.js i downloads300926.js) apunta al formulari per àrea de descarregues.icgc.cat. Consulta petita de200×200m a la Perica, sèrie176(MDTe litoral50cm): HTTP200 i CORS*, però retorna un formulari POST/userRequest amb e-mail obligatori; no és un GeoTIFF/COG directe. No s’ha enviat el formulari ni dades personals.

Capa RTT MapServer/10: camps OBJECTID,tipus,estat,altura,nom i geometria; consultaOBJECTID1074761 amb returnZ=true continua retornant coordenades de només2components. Aquesta capa no dona els plans de coberta necessaris.

Resta pendent verificar un catàleg/COG o servei numèric directe que permeti consulta client sense formularis de notificació. No es dona la coberta real per implementada.
