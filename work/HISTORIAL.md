# Historial i validacions de Relleu Obert

Actualitzat: 2026-11-04. Les entrades validades surten del [backlog actiu](BACKLOG.md), mantenint identificadors i evidència. Una incidència nova es pot reobrir sense renumerar-la.

## v0.21.6 — Transicions de la C-37

Una reserva més llarga de traçat recupera un tercer perfil de la C-37 a Sant Salvador a 1:10.000. Queden dues omissions d’enllaç i un creuament sense cota acreditada. El control ferroviari de 800 m conserva la rasant. [Resultats](RO-051-PERFILS-VIARIS.md#transicions-amb-v0216)

## v0.21.5 — Mides i guies de tall

Tria inicial amb 10 × 10 cm i mides personalitzades. El visor i l’exportació comparteixen el límit de 25 cm i les mides de les peces.

**Control local de Tamariu, 40 × 45 cm.** S’han vist les dues guies discontínues en zenital i en perspectiva. El traç es distingeix menys al bosc dens. El ZIP descarregat al navegador conté quatre 3MF de 200 × 225 mm. El plànol i les cares de tall de les quatre malles coincideixen a X = 200 mm i Y = 225 mm en coordenades de muntatge.

**Represa de la 0.22.** Primer, transicions de la C-37 a 1:10.000. Després, diagnòstic de la coberta del túnel a 1:20.000 i repetició de la bateria a dues escales. El laminat dels controls de tall queda com a comprovació independent. [Ordre de treball](BACKLOG.md#ordre-de-treball)

## v0.21.4 — Unió de paviment

La unió en coordenades locals i la correcció del sentit de cares en prismes aïllats recuperen perfils en els dos retalls afectats de la bateria. [Resultats](RO-051-PERFILS-VIARIS.md#repetició-amb-v0214)

## v0.21.3 — Perfils de vies principals amb MET5

Els eixos de superfície es retallen abans de mostrejar el MET5. El planificador conserva cinc perfils troncals al retall sud-oest de Sant Salvador de Guardiola, un més que abans. El resultat integrat i el laminat del túnel i el pont queden pendents. [Control de la C-37](RO-051-PERFILS-VIARIS.md)

## v0.21.2 — Lliurament de la graella MET5

El missatge del navegador al procés de geometria conserva el ràster numèric. Prova de regressió amb còpia estructurada en tots dos modes. El cupó local dels Degotalls té un resultat satisfactori segons l’usuari.

## v0.21.1 — MET5 al Pedraforca

MET5 seleccionat automàticament en retalls amb cobertura completa. Dos 3MF auditats al Pedraforca. Als Degotalls falta la transformació del núvol terrestre. [Resultats i comprovacions](RELLEU-ROCOS.md)

## v0.21.0 — Control d’exportació per altura i rasants

El cupó del Bages permet consultar materials per altura. Rajadell i els Rasos–Gallina Pelada queden com a controls de laminat. Una prova sintètica amb carretera i ferrocarril en dues escales verifica un radi intermedi i un canvi de pendent més progressiu. Queda pendent el contrast visual en retalls reals.

## v0.19.8 — Perfils suaus i controls del mapa

L'opció experimental de Vies arrodoneix els canvis de pendent de les
carreteres principals. Els perfils ferroviaris provinents d'eixos
compatibles prefereixen un pendent constant entre extrems, sempre que
respecti el relleu i els límits de separació. Els punts transversals
que coincideixen a la precisió de sortida es consoliden abans de
construir la unió.

El control local de Rajadell de 150 mm i detall 36 aplica quatre perfils
i un túnel en 26,06 s. Les sis capes superen l'auditoria de malles. Un
perfil s'omet pel creuament amb un túnel sense cota acreditada. Queden
els dos extrems coneguts limitats pel retall i el contrast de les
terminacions i del ferrocarril en altres llocs.

«Projecte nou» passa al panell esquerre. El tirador és circular i el
restabliment d'orientació usa el [compàs de Lucide](https://lucide.dev/icons/compass).
386 proves ordinàries i compilació correctes. Revisió de la interfície a
1280×720 i 1600×900. La maqueta de Rajadell amb l'opció marcada conserva
l'exportació habilitada.

## v0.19.7 — Catastre per blocs

RO-044 descarta els identificadors contradictoris i conserva la resta
d'edificis. Un conflicte detectat després d'un bloc retira l'element
de la vista provisional. El motor valida la capa final abans d'habilitar
l'exportació. Si falla un bloc, es recupera l'última capa confirmada.

383 proves ordinàries i compilació correctes. A Tamariu s'ha verificat
la primera generació amb Catastre, la vista provisional i l'avís final
amb respostes controlades del servei.

## v0.19.6 — Tria de mida al centre i límit d'escala

RO-053 situa les set mides proporcionals al centre. La tria obre Territori,
primer de quatre apartats i punt de generació. «Projecte nou» reinicia la
vista i els ajustos. La divisió en peces passa al panell dret i s'activa
per defecte a les mides grans. La importació pròpia queda ajornada.

21 proves dirigides i compilació correctes. Revisió a 1280×720 i 1600×900,
generació de 150×200 mm i reinici. A Rajadell, el límit general d'1:20.000
s'aplica a 15×15 cm. A 40×40 cm el selector s'atura a 1:15.900 i ajusta
el topall amb el gir segons les tessel·les disponibles.

## v0.19.5 — Inici guiat i controls del territori

RO-053 demana confirmar peça i territori abans de la primera generació.
La vista inicial mostra una invitació estàtica. Triar un exemple situa el
mapa. Territori inclou el tirador amb control de teclat, el retorn al nord,
un selector d'escala per passos i els ajustos d'exageració i detall.
El zoom pot situar el selector entre dos passos.

Sis proves de selecció, exemples i historial del pinzell superades.
Compilació correcta. Revisió local a 1280×720 i 1600×900 amb arrencada
sense generació, confirmacions, canvi d'exemple després de fer zoom,
arrossegament, gir amb teclat, retorn al nord i escala intermèdia.

## v0.19.4 — Actualització de vies sobre el terreny preparat

RO-053 separa el càlcul incremental de vies. Es reutilitzen el camp
d'altures, les malles de base sense excavar i els edificis. Les unions
i els túnels es recalculen quan canvien les cotes de la via. Els traços
es reapliquen i el navegador substitueix les malles noves sense reenquadrar.

381 proves ordinàries i compilació correctes. La regressió comprova
reutilització de terreny i edificis, traços, obertura i tancament de
túnels, i recuperació de la base. A Rajadell s'ha comprovat l'actualització
automàtica de camins i ferrocarrils, amb la vista zenital conservada.

## v0.19.3 — Ajustos de vies automàtics i descàrrega fixa

RO-053 aplica els canvis de vies automàticament sobre les dades del retall
vigent i conserva la vista durant el càlcul. El panell dret mostra les
capçaleres i la descàrrega encara que el contingut obert tingui scroll.
El format triat al desplegable inicia l'exportació i es recorda durant
la sessió. A Rajadell s'ha verificat un canvi de realç de +0,5 mm i la
preparació del 3MF estàndard des del desplegable. Revisió local a
1280×720 i 1600×900, amb Escape i retorn de focus al selector.
380 proves ordinàries i compilació correctes.

RO-050 iguala per defecte el realç de carretera i ferrocarril. Amb vuit
materials, les vies ferroviàries comparteixen material amb els edificis
i les carreteres mantenen el seu. La paleta de quatre agrupa les tres
categories inicialment i permet reassignar-les.

## v0.19.2 — Primer flux productiu RO-053 i límit del retall RO-052

L'usuari valida l'ordre i proposa provar accions al títol. La UI productiva
adopta els sis apartats i manté l'acció del pas fora del contingut amb scroll.
Navegar no torna a calcular la maqueta. El primer càlcul continua essent
conjunt; vegetació i edificis conserven les actualitzacions parcials.
Els traços es confirmen després d'una generació reeixida i es recuperen
en tornar al mateix retall, gir i mida durant la sessió.

RO-052: el recorregut dels dos enllaços pendents surt del cantell nord
abans que hi càpiga la pendent. Prova de retall/ampliació i avís verificat
a la maqueta real de Rajadell. No s'altera el tauler mesurat; el graó d'un
dels extrems encara és visible al quadrat. Laminat i altres retalls pendents.

380/380 proves ordinàries (67,9 s; mínim 2,71 GiB lliures), compilació
correcta i revisió del producte a 1280×720 i 1600×900. Comprovats el focus
en avançar, el mapa i el retall de la mostra inicial, els sis títols
visibles, la sortida del pinzell, l'avís de dos extrems i l'exportació
habilitada només amb els canvis aplicats. Demostració: confirmació,
aplicació i focus al botó següent. Els dos blocs que requereixen
4 GiB inicials no s'han repetit en aquesta iteració. Pages/CI no verificats.

## v0.19.1 — RO-052 corregit en controls i proposta RO-053 (2026-11-02)

Petició expressa de l'usuari: prioritzar el redisseny d'UX RO-053 en
paral·lel a la geometria RO-052. Proposta i prototip separats de la UI
productiva fins a revisió; un únic propietari de la integració geomètrica
i una sola operació pesada alhora en aquest portàtil.

El cas del rectangle girat es reprodueix en menys d'un segon. Les cotes
de metadades són correctes però el material real presenta el graó. La
correcció conserva el paviment que ja pertany al mateix material i retira
només l'obertura i els paviments d'altres categories, evitant restar-lo
i unir-lo de nou sobre cares gairebé coplanàries abans del Float32 final.
31 controls passen en 2,52 s, amb almenys 4,94 GiB lliures, sense canviar
toleràncies ni eliminar la regressió. La suite detecta quatre casos reals
amb seccions plegades: normals interpolades entre els vèrtexs cartogràfics
i espai de mitra dins del tauler resolen el primer revolt sense canviar
traçat, XYZ mesurats ni DEM. La prova del revolt ara construeix el sòlid.

Suite ordinària final **377/377**, 58,565 s, heap 512 MB i mínim 5,18 GiB
lliures. Dos fitxers integrats seqüencials, heap 1.536 MB: 5/6 inicials en
225,354 s, mínim 3,77 GiB; la fallada restant era només `undefined` absent
en JSON. Corregida com a llista buida i repetida la prova afectada: 1/1 en
0,729 s, mínim 5,42 GiB. **383 casos diferents verificats** entre passades,
no una única passada final conjunta de sis proves pesants. Una sola cua
pesada alhora i cap llindar de memòria traspassat.

Controls reals regenerats en 3MF estàndard, sense arbres i RO-051
desactivat: Rajadell 150×150 mm, 10,238 s, i 150×200 mm / 25°, 6,305 s.
Un túnel aplicat cadascun i auditoria sense errors. Tauler principal amb
11/12 pilars i dos enllaços. Al quadrat queden dos extrems `no gentle join`
(`ifc-114729`, `ifc-132561`), conservats als avisos. [Resultats i models](RO-052-CONTINUITAT.md).
RO-052 continua obert per a aquests extrems, contrast general i laminat.

RO-053 entrega [proposta i pilot](RO-053-UX.md) amb prototip públic
independent: Peça → Territori → Terreny → Vegetació → Vies → Edificis.
36 comprovacions lleugeres correctes; revisió visual principal a 1280×720
i 1600×900, inclosos traços conservats, arbres ocultats, recuperació
d'errors i exportació de revisió bloquejada quan cal. Recuperació visible
al centre encara que el sidebar es desplaci. Sense xarxa, generació real
ni canvis generals a la UI productiva; ordre i pilot pendents de l'usuari.

Compilació final correcta en 3,72 s (heap 512 MB; mínim 4,95 GiB lliures),
amb els avisos previs de mida de paquet i `node:module` de Manifold.
Versió compilada oberta localment: model inicial complet amb 4.747 arbres,
23 fragments d'edificis, exportacions habilitades i footer v0.19.1. Revisada
a 1280×720 i 1600×900: quatre menús visibles, scroll intern, absència del
marc exterior i changelog correcte. Cap comprovació remota de Pages/CI.
Backlog: 53 identificadors estables, 17 línies obertes, sis ajornades i
30 arxivades; 216 enllaços/àncores locals verificats. Observacions originals
de MILLORES-BUGS.md intactes.

## RO-053 — Prioritat de flux per etapes recollida (2026-11-02)

L'usuari reitera que el flux granular no pot quedar perdut a la conversa:
preparació de mida d'impressió, selecció d'ubicació/zoom i construcció de
terreny, vegetació, vies i edificis en passos controlables. Es registra
RO-053, P1, a la vista prioritària i al detall del backlog, i s'afegeix un
avís visible al punt de represa del portàtil. L'ordre proposat continua
obert a estudi; disseny i implementació encara pendents. Es preserven
edicions manuals, dependències, memòria cau, coherència de transport i
validacions per etapa com a criteris. Millau es recull explícitament a
RO-033 com a cas d'omissions/geometries anguloses segons zoom i retall.
Canvi només documental; no es modifica ni es dona per resolt RO-052.

## v0.19.0 PARCIAL — RO-052 i retirada del marc (2026-11-02)

Tancament expressament demanat per l'usuari per apagar l'equip i reprendre
al portàtil: s'ha de publicar l'estat actual encara que hi hagi feina a
mitges. **RO-052 continua obert.** [Represa exacta](REPRESA-RO-052.md).

Política comuna d'amplada, identitat del traçat, encaixos amb cota del
segment real, boques/paviments i retirada del marc implementats. La suite
ordinària va passar 370/370 en 39,086 s, heap 512 MB, mínim 43,78 GiB,
abans del darrer refinament transversal. Els controls previs es van generar
en 7,602 s (150×150 mm) i 3,323 s (150×200 mm, 25°), amb auditoria sense
errors; van revelar una discrepància de centre fins a 0,0911 mm.

Refinament de perfils complets desat (`transport-sections`, `across`,
`surfaceBreaks`, caps re-triangulats), però última selecció final **12/13**:
falla la boca inicial del rectangle girat amb cotes 7,06837 / 7,17250 /
7,35417 mm. No s'ha afluixat ni eliminat la regressió. Compilació final
correcta en 2,85 s. Blocs pesants, suite final, models regenerats i revisió
visual pendents. Cap procés o agent queda en marxa. Diagnòstics i 3MF
anteriors preservats a `work/repro/ro052/` com a evidència, no com a models
finals per imprimir. No s'han comprovat Pages/CI remotament.

L'usuari autoritza corregir la continuïtat i l'amplada del traçat en
unions de ponts i túnels, amb agents en paral·lel, validar nous models,
actualitzar el backlog i publicar l'entrega amb commit i push. També
demana retirar «Marc exterior» del sidebar dret i ajornar-lo. Es reparteix
política d'amplada, boques/paviments, UI i integració de corredors entre
fitxers diferents; els càlculs pesants continuen seqüencials. Resultats
pendents de validar abans de publicar.

## v0.18.2 — RO-051, diagnòstic i primera optimització (2026-11-02)

Repositori reprès en l'equip de 64 GB des de `c74e992` / v0.18.1.
L'usuari autoritza mesurar el retall de 3 km i optimitzar abans de
plantejar paral·lelització; després autoritza agents per a revisió i
documentació. Els càlculs pesants es mantenen seqüencials.

Referència original completa al mateix equip: 189,274 s. La construcció
diferida i memoïtzada de les màscares d'obstacles redueix el model a
56,638 s (**70,1% menys; 3,34×**), sense paral·lelitzar. Només es calculen
dues de les catorze unions; operands i ordre originals conservats.
Catorze perfils aplicats i igualtat exacta dels resums d'omissions,
identificadors, recomptes de pilars i llums; set categories auditades
sense errors. La comparació de resums no és una comparació de tots els
buffers. [Mesures, variants rebutjades i reproducció](RO-051-RENDIMENT.md).

Controls: 2,4 km / detall 12 aplica sis perfils en 18,907 s; Rajadell
ICGC / detall 36 amb túnels aplica quatre perfils en 10,625 s, amb onze
pilars del viaducte, dos nous i un túnel excavat. Els 3MF de control són
a `output/`; revisió d'usuari, laminat i cupó físic pendents. El cas
d'1,5 km / detall 12 recupera els camins previs per un component de volum
nul: mateix error i resultat amb `c74e992`, encara pendent de corregir.
Els intents de màscares per ID i filtratge espacial s'han retirat perquè
alteraven el resultat; no s'han rebaixat criteris ni eliminat fragments
petits per acceptar-los. El prototip continua desactivat a la UI.

Validació final: **344/344 proves úniques correctes**. Bloc ordinari:
338 casos en 37,883 s, heap 512 MB i mínim 43,89 GiB lliures. Blocs
integrats, sols i seqüencials: ponts 2/2 en 45,649 s (mínim 43,43 GiB),
túnels 4/4 en 76,270 s (mínim 43,05 GiB), heap 1.536 MB. Nova regressió
de diferiment/reutilització i edició incremental d'edificis. S'ha corregit
només una fixture preexistent d'idiomes que depenia del locale del sistema
(`zz` → `en-GB`); cap canvi al nucli d'idiomes. Build correcte en 2,86 s,
amb els avisos previs d'empaquetat. No s'han comprovat Pages/CI remots.
Backlog actualitzat amb passos tècnics i comprovacions concretes d'usuari.

Petició de l'usuari posterior a la validació: publicar cada iteració amb
commit i push i repartir tasques independents entre agents. Pauta afegida
a AGENTS.md. Metadades, peu i historial actualitzats a v0.18.2; els dos
3MF verificats s'inclouen a `public/controls/ro-051/`, amb descripció i
enllaços al README/backlog, perquè no depenguin dels fitxers locals ignorats.
Les còpies són idèntiques als controls validats (SHA-256 comprovat).
Build de l'entrega v0.18.2 correcte en 2,82 s; peu i historial revisats
al navegador local a 1280 × 720, amb captures abans/després a `output/`.

L'usuari revisa els controls i observa discontinuïtats del traçat i canvis
d'amplada en unions de superfície, pont i túnel. S'obre RO-052, P1, amb
diagnòstic independent de geometria i buits de regressió. Els fitxers de
control no es donen per validats visualment; v0.18.2 publica l'optimització
de rendiment i registra aquest problema pendent, sense presentar-lo resolt.

## v0.18.1 — Túnels arquejats i punt de represa

Tancament parcial demanat per l'usuari per continuar en un ordinador de
64 GB. Els túnels es publiquen; RO-051 queda guardat com a prototip
**desactivat per defecte**, sense control a la UI i amb activació només
explícita `majorRoads:true`. [Represa i diagnòstic](REPRESA.md).

Túnels activats inicialment, volta parabòlica estimada i paviment de
0,3 mm del material de camí o ferrocarril. Base protegida, pisos limitats
al substrat i buits compartits entre materials. La transacció es manté
en Manifold fins a una materialització final, sense dividir les closques
interiors ni convertir resultats intermedis a Float32. No s'ha eliminat
el tetraedre petit de volum negatiu trobat al diagnòstic. La neteja només
retira components tancats exactament col·lapsats, amb comptador i avís;
preserva prismes positius i capes de 0,001 mm.

RO-051 segueix la proposta i decisió de l'usuari: «Afegir suports estimats,
mantenint el relleu intacte». Es retira el prototip de tall/terraplè abans
de publicar i s'integra una envolupant superior amb calçades planes en
secció, pendent acotat i pilars que eviten obstacles carregats. DEM i
camp d'altures conservats, comprovats exactament. Els obstacles només
afecten el retall físic; el que descartava Rajadell era un altre camí-pont
a uns 418 m fora del model. No s'ha afegit cap excepció geogràfica nova.
Les comprovacions de creuaments acreditats inclouen el realç ferroviari.

Control real amb prototip activat, ICGC, 150 mm i detall 36: quatre perfils viaris
aplicats, dos pilars nous i llum mostrejada màxima de 3,681 mm. El viaducte
conserva onze pilars i dues connexions; el túnel principal s'excava amb
paviment de camí. Un altre candidat s'omet per manca de coberta contínua.
El control dura 15 s i manté almenys 4,58 GB de RAM lliure. Alguns extrems
continuen sense enllaç suau i consten als avisos.

L'ampliació del prototip a 3 km s'interromp als 416 s, amb CPU activa i
memòria disponible. El diagnòstic situa la lentitud després dels perfils,
en la integració de capes i preparació de suports. Es conserva una captura
comprimida d'operació i un script local reproduïble. No es presenta aquest
lot interromput com una validació ni s'atribueix tot el cost a la RAM.

Punt publicable amb RO-051 desactivat: **342/342 proves úniques correctes**.
Bloc ordinari: 336 casos, 63 s, heap de 512 MB i mínim de 5,11 GB lliures.
Bloc exigent: sis casos, 180 s, heap de 1.536 MB i mínim de 4,18 GB lliures.
Inclou quatre retalls i detalls reals amb centreline lliure també al 3MF
serialitzat. Build correcte en 4,36 s, amb avisos habituals d'empaquetat.
UI local revisada a 1280×720: model preparat, túnels marcats inicialment,
control i ajuda visibles amb scroll intern, capçaleres i footer conservats.
Captura local `output/v0.18.1-controls-desktop.png`; cap canvi de CSS.
168 enllaços/ancoratges locals i 51 identificadors comprovats. Sense
comprovació remota de Pages/CI. Laminat i impressió pendents d'usuari.


## v0.18.0 — Ferrocarrils, portals i cobertes de la font

Tres fronts autoritzats en paral·lel: categoria ferroviària i realç independent RO-050; túnel sud de Rajadell RO-034; cobertes i volums singulars RO-032. S’incorporen dades OSM originals amb selecció explícita i es conserva el mode limitat pla. Les dades paramètriques no s’etiqueten com a malles mesurades. Les proves locals, validació de l’usuari, laminat i impressió continuen diferenciades; resultats detallats als informes de cada línia.

**Verificació final:** 284 casos únics correctes, executats en blocs. A
512 MB de heap passen 281 casos i dos fitxers integrats excedeixen aquest
pressupost; executats sols i seqüencialment a 1.536 MB, els sis casos dels
dos fitxers passen (tres ja constaven al primer bloc). Cap fallada pendent.
El bloc exigent dura 175 s i manté un mínim de 4,24 GB de RAM lliure. La
revisió final dels missatges compactes repeteix les set proves d'excavació:
7/7 en 0,5 s. Build final correcte en 4,15 s, amb avisos habituals de mida.
157 enllaços/ancoratges locals i 50 identificadors estables comprovats.

Controls i llegenda revisats a 1280×720 abans dels reinicis. La revisió
visual final del túnel, laminador i impressió queden explícitament pendents
d'usuari; no es torna a automatitzar el navegador després dels bloquejos.
RO-032 continua obert per disponibilitat remota i cobertes de Tamariu;
els errors reals d'Overpass i l'alternativa simplificada estan documentats.
No es fan comprovacions remotes de Pages ni CI.

Durant els reinicis, els canvis van quedar desats abans de publicar.
Controls/llegenda revisats localment a 1280×720 i build correcte. Els
serveis Overpass esgoten el temps d'espera; l'alternativa conserva els
edificis amb avís i no s'afirma que la càrrega remota de cobertes funcioni.
El control integrat de quatre casos de túnel i 3MF ha passat; la suite
completa ha quedat interrompuda pels talls de l'entorn. La lectura XML de
les proves s'ha canviat a iteradors i arrays tipats per evitar còpies
massives de captures. En reprendre s'han mesurat només 0,83 GB de RAM
lliure de 15,49 GB; no s'atribueix una causa definitiva als tancaments.
La verificació pendent es completa posteriorment amb una única operació
pesada i consum acotat, tal com consta al resum final.

Diagnòstic posterior: la nova regressió dels prismes llunyans fallava pel
reordenament de vèrtexs en compactar-los. L'informe intentava expandir una
comparació numèrica massiva. Amb una asserció compacta, el problema es
reprodueix en 0,4 s; corregit l'ordre dels buffers, les set proves del
fitxer passen en 0,6 s. No s'ha eliminat ni rebaixat la igualtat exacta.
L'usuari ha alliberat memòria i s'han mesurat 5,7 GB disponibles. La suite
es reprèn sola amb heap de 512 MB i aturada sota 1,6 GB lliures; 256 MB
era insuficient per al cas integrat de Rajadell.

## Anotacions rebudes per al lot v0.18

| ID | Observació de l’usuari abans de resumir-la |
| --- | --- |
| RO-034 | Experimental integrat; pendent d’usuari. Comprovat al model default de Rajadell, a la banda sud hi ha un túnel al món real però a la maqueta no s'hi aprecia cap obertura, simplement la carretera "acaba" a una banda de la muntanya i continua a la següent |
| RO-024 | Al laminador hi ha alguns artefactes estranys (per exemple, algunes regions de vegetació i arbres on en una capa determinada es renderitza tota en marró-terra, o alguns edificis que també tenen alguna capa en particular amb un altre color). Sembla més un problema de laminador que del nostre projecte, però hem d'estar atents |
| RO-032 | Cal pujar de prioritat i abordar-ho si podem. Caldria incloure aquí les geometries més reals d'edificis singulars (allà on existeixin les parametritzacions): torre Agbar, Sagrada Família, etc., com a llocs amb perfil reconeixible i que caldria conservar si és possible. |

Ferrocarrils: capa pròpia amb increment seleccionable de +0,5 o +1 mm sobre el realç dels camins. Treball en tres fronts en paral·lel autoritzat; RO-032 puja a P1 i inclou singulars amb dades accessibles. Les cobertes planes del mode limitat continuen sent una decisió d’usuari.

## v0.17.0 — Suports a escala i obertures experimentals

Treball en tres fronts autoritzat per l’usuari: pilars (RO-033), túnels (RO-034) i reorganització del backlog. Captura de zoom out amb un sol pilar: incidència reproduïda i tractada amb cap adaptat, espaiat físic i diagnòstic de llums. L’opció de túnels és estimada, explícita i desactivada inicialment; no s’atribueixen dades constructives inexistents. Validacions locals i límits als informes [suports](RO-033-SUPORTS-ESCALA.md) i [túnels](RO-034-OBERTURES.md).

262 proves i build correctes; comprovació local de navegador i 3MF real a 3 km: viaducte principal amb 8 pilars i un component. Els túnels d’aquesta regió remota s’ometen amb avís, mentre el cas de control de la mostra en detall ràpid sí que passa: 3MF real llegit i 12 segments del pas central lliures en tres malles. RO-034 continua obert per a generalització; no es pressuposen laminat ni impressió.

Anotacions de l’usuari incorporades: plaques ajornades i menú retirat; selector de color del marc retirat, preview negre; exemples carregats en canviar la selecció. RO-040 arxivat com a validació limitada d’ús, amb casos límit a RO-044. RO-048 i RO-049 validats i arxivats; impressió i laminador continuen a RO-024. El preview fotorealista estàtic es registra com a objectiu posterior de RO-012. Les notes originals no s’han modificat.

## Anotacions de l’usuari sobre v0.16 i reorganització

Es conserven les anotacions abans de resumir el backlog; les validacions d’ús no acrediten encara laminat o impressió.

| ID | Anotació rebuda |
| --- | --- |
| RO-011 | Per estudiar |
| RO-023 | UX implementada; fonts pendents |
| RO-024 | Fonaments en validació |
| RO-026 | En estudi |
| RO-032 | En estudi |
| RO-033 | Procedimental integrat; en validació |
| RO-034 | Dades insuficients al cas de prova |
| RO-035 | Per estudiar |
| RO-019 | Setup preparat; traduccions pendents |
| RO-040 | Validat aparentment, no comprovat en moltes possibles situacions |
| RO-014 | Validat, però eliminar opció de triar color, és absurd, el color serà del material imprès. Al preview ho deixem en negre i ja està. |
| RO-016 | Validat però molt millorable en molts aspectes. Treiem opció del menú i ajornem aquesta tasca per futures iteracions, per centrar-nos de moment en funcionalitat i qualitat del model. |
| RO-012 | Més que un objecte que representi una taula a sota, el que busquem és un preview estàtic, una imatge renderitzada fotorealista a partir del model dissenyat, amb textures realistes: una paret de fons, la taula amb estris escolars a sobre, la maqueta com es veuria impresa amb tons mat, etc. |
| RO-044 | Implementat; pendent de validar |
| RO-045 | Implementat; pendent de validar |
| RO-046 | Validat, però que carregui el model en modificar la selecció, no via clic de "carrega l'exemple" o similar. El canvi del dropdown activa la petició |
| RO-048 | Validat |
| RO-049 | Validat |
| RO-003 | Ajornat |
| RO-025 | Ajornat |
| RO-017 | Ajornat per l’usuari |
| RO-047 | Ajornat; proposta |

## v0.16.0 — Ponts procedimentals integrats

RO-033 incorpora generació de taulers amb perfil estimat entre extrems DEM, pilars i enllaços. Rajadell manté la seva excepció geogràfica. [Implementació i comprovacions](RO-033-PROCEDURAL-CORE.md): proves del nucli, retalls moguts/girats i mides físiques variables, generació sense excepcions i pas inferior obert. 241 proves i build correctes. Navegador i 3MF locals comprovats; laminat, impressió i contrast en altres llocs continuen pendents. L'usuari demana publicar aquest bloc i aturar els processos; no s'obren tasques noves.

## v0.15.1 — Punt estable de continuïtat geogràfica

Rajadell es carrega per ubicació també en moure o ampliar el retall fora de la mostra. Proves locals de càrrega/regressió i build. Punt parcial publicat per petició de l’usuari mentre es prepara el motor procedimental general; RO-033 segueix obert.

## Decisió posterior a v0.15.0 — Procedimental com a via general

L’usuari aprova visualment Rajadell i fixa com a prioritat la generació
procedimental de ponts amb evitació de camins i edificis. Es conserva
l’excepció ja disponible, sense crear un catàleg mundial de plànols; altres
casos específics només sota demanda. Revisió del codi: suports i enllaços
reutilitzables, però la reconstrucció dels taulers fora de les mostres encara
no està integrada. RO-033 passa a P1 i continua obert. S’actualitzen
[arquitectura](../ARCHITECTURE.md) i [prioritats](BACKLOG.md); sense canvis de
funcionalitat ni versió nova. Validació visual distingida de laminat/impressió.

## v0.15.0 — Pilars, enllaços i camins realçats

Captures d’extrems flotants rebudes de l’usuari; no són una validació de contacte físic. [Implementació i proves](RO-033-SUPORTS-I-ENLLACOS.md): pilars amb evitació d’obstacles, dues connexions al viaducte principal, unions de sòlids i realç opcional. 222 proves i construcció locals correctes. RO-033 continua obert per a fidelitat i laminat; nou RO-049 pendent de validació. Cap validació d’usuari arxivada en aquesta iteració.

## v0.14.0 — Implementació local, sense noves validacions d’usuari

Primer tauler real del viaducte incorporat a la mostra i al 3MF; [dades,
comprovacions i límits](RO-033-IMPLEMENTACIO.md). Estudi de túnels amb revisió
de l’agent principal: [fonts insuficients per al buit real](RO-034-DADES-IFC.md).
[Llibre d’estil](../DESIGN.md) obligatori per a contribucions i delegacions,
amb tokens compartits i revisió visual. 217 proves, construcció i navegador
locals correctes. Cap entrada arxivada ni validació física presumida; RO-033,
RO-034 i RO-045 continuen al backlog. Pages/CI remots els comprova l’usuari.

## Validacions i observacions de l’usuari sobre v0.6.0

Es conserven aquí les anotacions de totes les cel·les d’estat abans de reorganitzar el backlog. «Validat però…» conserva la millora pendent al backlog actiu; «aparentment» no és una validació completa en tots els escenaris.

| ID | Anotació de l’usuari |
| --- | --- |
| RO-001 | Validat |
| RO-002 | Per estudiar |
| RO-003 | Ajornat |
| RO-004 | Validat però millorar. Controls d'escala moguts a un apartat propi, controls de "Colors i materials" els passen completament al sidebar dret, perquè aquí només hi tenim l'opció per triar quants materials i res més |
| RO-005 | Validat |
| RO-006 | Validat però millorar fluxe |
| RO-007 | Validat |
| RO-008 | Millorar layout del popup per encabir-ho sense haver de desplegar "Fonts cartogràfiques i projectes oberts". Podem utilitzar layout a doble columna a la part inferior (sobre l'autor - fonts i projectes oberts) |
| RO-009 | Fons de la icona quadrat, no rectangular, per aprofitar millor l'espai disponible |
| RO-010 | Validat |
| RO-011 | Per estudiar |
| RO-012 | Ajornat |
| RO-013 | Validat |
| RO-014 | Ajornat |
| RO-015 | Pendent de validar |
| RO-016 | Ajornat |
| RO-017 | Ajornat |
| RO-018 | Validat però sistema de rotació molt poc intuïtiu. Millor passar-ho d'alguna forma al mapa o inventar-se alguna altra forma. La rotació màxim entre -90º i 90º, no cal més (de fet, només amb 0-90º és suficient) |
| RO-019 | Ajornat |
| RO-020 | Validat |
| RO-021 | Validat |
| RO-022 | Validat |
| RO-023 | Validat aparentment, però no puc garantir en diferents escenaris |
| RO-024 | Per estudiar |
| RO-025 | Ajornat |
| RO-026 | Per estudiar |

## Entrades completament validades

### RO-001 — Pics de relleu i efectes sobre edificis

**Validat / tancat (2026-11-01):** l’usuari confirma que sembla solucionat i demana tancar RO-001. Es conserva l’informe de proves i la distinció entre el mecanisme simulat i el navegador de l’usuari. Reobrir si reapareix amb dades concretes.

**Correcció candidata (v0.4.2, 2026-11-01):** lectura binària WebP/PNG sense canvas, amb hashes i diagnòstics de tessel·les a la procedència. [Informe i comprovacions pendents](RO-001-DIAGNOSTIC.md).

**Resultats locals:** quatre tessel·les de Tamariu comparades byte a byte amb libvips/sharp; prova de soroll simulat que crea un pic de 256 m i eleva l’edifici; sis generacions de geometria amb tres malles idèntiques per entrades idèntiques i terreny conservat en desactivar arbres/edificis. 44 proves i construcció estàtica superades.

**Historial de la validació:** inicialment es va demanar confirmar a Brave si desapareixien els pics intermitents amb v0.4.2. La protecció de lectura de canvas continua sent una hipòtesi sustentada, no una causa demostrada directament al seu navegador. L’usuari va informar de tres simulacions sense deformacions i, posteriorment, ha confirmat que sembla solucionat i ha demanat tancar l’entrada. La comprovació directa del navegador afectat no s’havia completat.

**Observació:** l’usuari veu habitualment un pic i de vegades dos, en posicions aparentment variables; poden elevar també els edificis pròxims. La sospita que siguin un càlcul nostre és una hipòtesi, encara no una causa demostrada. Es reobre la línia de fiabilitat del relleu tractada anteriorment: les reparacions de mostres de la v0.2 no tanquen aquest nou avís.

**Si reapareix:** conservar regió, ajustos, diagnòstics i 3MF afectat per reobrir el cas; comparar dades, malla i preview. No hi ha feina activa sobre RO-001.

**Per validar:** reproducció documentada abans/després, proves de regressió sobre la causa trobada i sèrie d’execucions amb les mateixes entrades sense nous pics. Comprovar també 3MF/STL, edificis propers i una zona amb penya-segats reals, que no s’han d’aplanar. La comprovació local ja existent d’altituds invàlides no és evidència suficient per tancar-lo.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-005 — Més espai útil al preview

**Implementat a v0.5.0, pendent de validar (2026-11-01):** eliminat el subheader; controls, ajuda i estats dins del preview. En la comprovació local a 1280 × 720, la vista ocupa tot l’espai de 630 px entre header i footer. Canvis pendents i errors es mantenen en regions accessibles; exportació bloquejada fins a generar. Detectada i corregida la desaparició visual de la barra sobre el canvas animat, forçant-ne la composició en una capa pròpia. Falta validar-ne comoditat i visibilitat amb l’usuari.

**Abast:** retirar el subheader «Tamariu · Palafrugell» i el text «Càlcul al navegador»; situar Restablir, Vista zenital, ajuda de gestos i missatges d’actualització com a elements flotants dins del preview. Es conserva la identificació de la regió a la selecció i a les metadades.

**Per validar:** augment d’espai de model, controls llegibles sense tapar zones importants i sense interferir amb gir/zoom/pinzell. Els avisos de càlcul, errors i canvis pendents de generar continuen sent inequívocs i accessibles; no es perden en eliminar contenidors actuals. Relació amb RO-004 i RO-007.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-007 — Escala i triangles al sidebar

**Implementat a v0.6.0:** escala retirada del header i recompte de triangles traslladat a «La teva maqueta». L’escala només es mostra a les estadístiques del model (a banda del control d’escala sol·licitada). Comprovat al navegador; els triangles s’etiqueten com a complexitat, no precisió. Pendent de validar.

**Abast:** mostrar l’escala només a «La teva maqueta»; traslladar el recompte de triangles a estadístiques del sidebar. Només reconsiderar-ne la presència destacada si té una funció clara per a l’usuari.

**Per validar:** no hi ha duplicació al header i es conserven les dades útils. El nombre de triangles no es presenta com una garantia de precisió cartogràfica. Coordinar amb RO-005.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-010 — Transicions homogènies

**Promogut a P2 i implementat a v0.6.0 per petició de l’usuari:** transicions de color/vores i entrada de contingut de 220 ms; modals amb entrada i sortida i tancament accessible. Preferència de moviment reduït respectada per CSS i JavaScript. Durada de 0,22 s i Escape comprovats al navegador; avisos de càlcul/errors sense animació ni demora afegida. Pendent de validar l’experiència i el mode de moviment reduït al dispositiu de l’usuari.

**Abast:** transicions coherents d’aproximadament 220 ms en modals, popups i controls adequats. No imposar una animació a controls nadius que no la permetin bé.

**Per validar:** obertura/tancament i focus correctes, respecte per la preferència de moviment reduït i cap retard afegit als avisos de treball o als errors. Aplicar després d’estabilitzar els components de RO-004/RO-005/RO-008.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-013 — Marc a la previsualització

**Implementat a v0.6.0:** selector de marc visual negre, blanc o to de fusta, o sense marc. Adaptat a les dimensions reals del model, separat del grup de malles i del Worker. No modifica escala ni exportació. Comprovada la selecció al navegador amb model rectangular; el marc imprimible RO-014 continua ajornat. Pendent de validar.

**Proposta:** marc opcional al voltant de la maqueta, amb acabat blanc/negre o fusta segons el disseny que s’acordi.

**Proper pas:** definir secció, gruix, color, marge interior i relació amb la base. El marc de visualització ha de quedar distingit del model exportat i d’un futur marc imprimible.

**Per validar:** concordança amb mides rectangulars/quadrades i peces grans, sense alterar l’escala del terreny ni afegir el marc a l’exportació sense selecció explícita. Precedeix RO-014; pot existir sense RO-012.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-020 — Unions arrodonides dels camins

**Implementació:** v0.4.0. **Validació:** l’usuari confirma a la conversa que s’ha resolt el tema de les carreteres. Hi ha proves locals de girs, revolts tancats, punts repetits i amplada del traçat.

**Tancat dins d’aquest abast.** Reobrir si es troba un cas concret amb discontinuïtats; conservar com a regressió quan canviïn projecció, escala o retall.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-021 — Quatre materials i colors a Bambu

**Implementació:** exportador compatible disponible des de v0.2 i ajustos posteriors. **Validació:** l’usuari confirma que el 3MF s’obre com quatre materials separats amb els colors que corresponen al preview.

**Tancat per a quatre materials en el cas comprovat.** No equival a validar tots els perfils d’impressora, 1/2/8 materials o impressió física. RO-003 no reobre aquesta assignació de colors: investiga la configuració de la impressora i els consumibles. Revalidar colors si RO-015 modifica aquestes metadades.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-022 — Cobertes horitzontals dels edificis

**Implementació:** v0.4.1, commit `1f22c13`. Una cota horitzontal per petjada, situada sobre el punt més alt del terreny sota l’edifici més l’altura representada; amb límit de 5 m per defecte. Al costat baix pot haver-hi més façana.

**Validació local feta:** 40 proves del projecte, cas de pic interior a la petjada, exageració ×1/×3, Tamariu i 5.355 triangles de coberta comprovats com a horitzontals; sòlids auditats amb Manifold.

**Validació d’usuari (2026-11-01):** confirma que els canvis de v0.4.1 són correctes, exceptuant els edificis afectats pels pics incorrectes del terreny. La correcció de cobertes queda validada dins d’aquest abast; les alçàries contaminades pel relleu continuen obertes a RO-001. Els megablocs de RO-002 són un altre problema: una coberta plana no prova que la petjada representi un únic edifici real.

## Línies tècniques ja identificades

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

## Decisions, ajornaments i historial

**Iteració P2 (2026-11-01):** iniciades RO-004, RO-007–RO-010, RO-013, RO-015, RO-018 i RO-023. Resposta expressa de l’usuari: mantenir RO-003, RO-014 i RO-016 ajornats. Fi del bloc a v0.6.0: implementacions pendents de validar, amb abast parcial explícit a RO-015/RO-023; no s’ha descartat cap línia.

**Evidència local del bloc:** 56 proves automatitzades superades; model realment generat i descarregat del navegador local a 150 × 200 mm, 1:1.000 i gir de 35°, amb GeoTIFF sintètic de control i els 632 edificis del GeoJSON oficial inclòs. Inspeccionats els 63.484 vèrtexs del 3MF compatible: límits XY correctes, procedència dels fitxers, gir, PETG i broquet de 0,4 mm conservats; marc visual absent de l’arxiu. El MDT de prova no acredita una millora del relleu real. No s’ha obert al laminador ni imprès, ni s’han comprovat Pages/CI remots.

**Incidència trobada durant el bloc:** la partició d’un retall girat de 400 × 400 mm fallava en tornar a retallar un sòlid d’aigua que ja havia quedat buit en una peça (`NonFiniteVertex`). Reproduïda localment amb la mostra i corregida aturant el retall quan no queden triangles. Afegida una regressió de capa absent en tres peces; el cas complet de mostra genera les quatre peces, amb la capa d’aigua absent on correspon. Relació amb RO-018 i RO-024; no valida unions generals ni impressió física.

**Regressió posterior al navegador:** exportació ZIP completada amb quatre 3MF de 200 × 200 mm, gir de 35° i escala 1:1.000, amb relleu públic real. Inspeccionats tots els vèrtexs i la procedència de les quatre peces: coordenades finites dins de cada peça i mateix gir/escala. No comprovat al laminador.

**Descarts:** cap petició de l’usuari descartada en aquest triatge. Les idees posposades conserven una entrada amb condició de represa. **Bloquejos actuals:** cap declarat; les dependències es detallen a cada línia.

| Data | Entrades | Moviment i evidència |
| --- | --- | --- |
| 2026-11-01 | RO-001–RO-019 | Triatge inicial de les notes de l’usuari. Observacions encara no reproduïdes per aquest triatge; prioritats proposades, sense implementar funcionalitats. |
| 2026-11-01 | RO-020, RO-021 | Incorporada la validació expressa de l’usuari sobre camins i quatre materials. Abast de validació limitat al cas confirmat. |
| 2026-11-01 | RO-022 | Incorporada la correcció local de v0.4.1; continua pendent de validació d’usuari. |
| 2026-11-01 | RO-023–RO-025 | Incorporades les línies tècniques prèvies per evitar que quedin fora del seguiment. |
| 2026-11-01 | RO-022 | Pendent de validar → Validat. Confirmació expressa de l’usuari de v0.4.1; s’exclouen els edificis afectats pels pics de RO-001. |
| 2026-11-01 | RO-001 | Per reproduir → En curs. Diagnòstic amb entrades repetides i comparació entre dades, malla i preview; encara sense causa demostrada. |
| 2026-11-01 | RO-001 | En curs → Pendent de validar, v0.4.2. Lectura binària exacta, regressió amb soroll simulat i sis generacions locals; falta confirmació del cas intermitent a Brave. Informe RO-001-DIAGNOSTIC.md. |
| 2026-11-01 | RO-026 | Nova petició → Per estudiar / P1. Registrat l’estudi de fidelitat dels edificis, fonts candidates i criteris de priorització. Consulta documental inicial feta; encara sense comparar geometries ni canviar el proveïdor. Vinculada a RO-002, RO-023 i RO-022. Canvi només documental sobre v0.5.0. |

### Iteració v0.5.0

Actualitzacions d’aquesta iteració (2026-11-01):

| Data | Entrada | Canvi / decisió |
| --- | --- | --- |
| 2026-11-01 | RO-001 | Pendent de validar → Validat. Confirmació expressa de l’usuari i petició de tancament de v0.4.2. |
| 2026-11-01 | RO-003 | Per reproduir / P1 → Ajornat / P2 per petició expressa; reconsiderar després del grup actual. |
| 2026-11-01 | RO-002 | Per estudiar → En curs → Per estudiar. Diagnòstic fet a v0.5.0: una petjada ICGC original sense divisions; cal estudiar una font més detallada. No corregit ni descartat. |
| 2026-11-01 | RO-004–RO-006 | Preparat / Per estudiar → En curs → Pendent de validar, v0.5.0. Interfície i escala implementades; 48 proves i construcció superades, comprovació local al navegador. Falta validació de l’usuari. |

El 3MF estàndard descarregat realment del navegador local conserva una envolupant XY de **150 × 200 mm**, territori de **150 × 200 m**, `targetScale: 1000` i exageració **1,5**. Inspecció de tots els vèrtexs i metadades satisfactòria. No és una validació al laminador ni una impressió física.

### Plantilla d’actualització

Per cada canvi d’estat, afegir una fila a l’historial i actualitzar la vista de conjunt i el detall:

| Data | Entrada | Estat anterior → nou | Canvi / decisió | Evidència local | Validació d’usuari / pendent | Commit / versió |
| --- | --- | --- | --- | --- | --- | --- |
| AAAA-MM-DD | RO-NNN | Preparat → En curs | Abast concret | Encara no feta | Què caldrà comprovar | — |

Per a una entrada nova: observació/origen, prioritat amb motiu, estat, següent pas, dependències i criteris de validació. Si no es disposa de dades per prioritzar o diagnosticar, s’ha de dir explícitament.

## Cobertura de les notes originals

| Apartat de MILLORES-BUGS.md | Seguiment |
| --- | --- |
| General | RO-001, RO-009, RO-010 |
| Edificis i captures | RO-002; relació amb RO-001 i RO-022 |
| Footer | RO-008, RO-011 |
| Gestió d’escala | RO-006, RO-007 |
| Preview d’impressió i marc | RO-012, RO-013, RO-014 |
| Configuració d’impressió | RO-003, RO-015 |
| Complements | RO-016, RO-017 |
| Rotar el model | RO-018 |
| Organització de sidebars | RO-004 |
| Preview | RO-005 |
| Internacionalització | RO-019 |

## Validacions de l’usuari sobre v0.7.0

| ID | Anotació original de l’usuari |
| --- | --- |
| RO-002 | Per estudiar |
| RO-004 | Validat, però a futur segurament li donem una volta més. |
| RO-006 | Validat |
| RO-008 | Validat |
| RO-009 | Pendent de validar |
| RO-011 | Per estudiar |
| RO-015 | Validat, però eliminarem l'opció de material i gruix de broquet, perquè ho ignora, així que millor simplement exportem el 3MF i que l'usuari decideixi com enfocar exactament la seva configuració. Eliminem les opcions de material i gruix del broquet. |
| RO-018 | Validat |
| RO-023 | Comprovat que l'eina existeix, però poc intuïtiva i massa text. Valorar si podem carregar GeoJSON d'alguna font oberta, potser no com a opció principal però si com una opció d'usuari en cas que vulgui major detall per als edificis |
| RO-024 | Per estudiar |
| RO-026 | Per estudiar |
| RO-027 | Validat |
| RO-028 | Validat |
| RO-029 | Validat |
| RO-003 | Ajornat |
| RO-012 | Ajornat |
| RO-014 | Ajornat |
| RO-016 | Ajornat |
| RO-017 | Ajornat |
| RO-019 | Ajornat |
| RO-025 | Ajornat |

### RO-004 — Apartats col·lapsables dels sidebars

**Actualització v0.6.0 (2026-11-01):** reobert per avís de l’usuari: el contingut llarg del bloc 2 empenyia els altres menús. Ara els quatre títols i el botó Generar queden fora del scroll; només es desplaça el contingut de l’apartat obert. Comprovat a 1280 × 720: sidebar 630 px de contingut/630 px de viewport, bloc 2 amb scroll intern i tots els títols visibles. Reobrir el mapa conserva la selecció i el model continua exportable. Pendent de validar per l’usuari.

**Implementat a v0.5.0, pendent de validar (2026-11-01):** acordió exclusiu al sidebar esquerre, primera secció oberta i generació fora dels apartats. Retirada la introducció visible per donar lloc als quatre apartats. Comprovat localment amb clic i teclat, conservant valors i sense reiniciar el model; header/footer visibles a 1280 × 720. Falta la valoració d’ús de l’usuari.

**Abast:** començar amb «Tria el lloc» obert i els apartats següents replegats; comportament exclusiu amb un apartat desplegat cada vegada, seguint la referència de Pentagrama. Revisar sobretot el sidebar esquerre.

**Per validar:** menys scroll sense perdre valors ni accés a generar/exportar, ús amb teclat, estat desplegat accessible i header/footer estables. Canviar d’apartat no ha de provocar càlculs innecessaris ni interrompre una operació activa.

**Revisió v0.7.0 · Pendent de validar:** Quatre blocs: lloc/orientació, mida/escala, relleu/edificis i vegetació. Materials reunits al sidebar dret. Títols i Generar fora del scroll intern.

**Anotació original de l’usuari sobre v0.6.0:** Validat però millorar. Controls d'escala moguts a un apartat propi, controls de "Colors i materials" els passen completament al sidebar dret, perquè aquí només hi tenim l'opció per triar quants materials i res més.

**Arxivat després de v0.7.0 (2026-11-01):** Validat, però a futur segurament li donem una volta més.. La revisió futura indicada no té un canvi concret pendent; es pot reobrir quan n’hi hagi.

### RO-006 — Selecció d’una escala destí

**Implementat a v0.5.0, pendent de validar (2026-11-01):** mode lliure i escala fixada (presets i personalitzada, 100–100.000). En mode fix, mida i escala determinen l’extensió; moure el mapa canvia el centre, i el zoom només la vista del mapa. La mostra de Tamariu restaura el mode lliure i el retall de mostra.

**Comprovacions locals:** 48 proves superades, amb latituds 0°, 41,918° i 65°, peces quadrades/rectangulars/40 cm, partició, escala personalitzada decimal, exageracions ×1/×3, coherència del motor, dimensions i unitats 3MF. Al navegador local: generació de 150 × 200 mm a 1:1.000, selecció de 150 × 200 m, canvi d’escala amb mapa ocult, zoom i reobertura del mapa, escala personalitzada i quatre peces de 200 mm, i bloqueig per escala invàlida. Tolerància numèrica i aproximació mètrica documentades a ARCHITECTURE.md. Falta la validació de l’usuari/laminador; no s’ha comprovat Pages ni CI remots.

**Abast:** poder demanar 1:1000, 1:1500, 1:2000 o una escala personalitzada, i adaptar l’extensió del retall del mapa a la mida física escollida. L’escala és horitzontal; l’exageració vertical es manté independent.

**Proper pas:** fixar quina variable s’ajusta quan es canvia mida/escala i com es mostra un retall pendent. Com a cas de control, una peça de 150 × 200 mm a 1:1000 representa 150 × 200 m. La disponibilitat/resolució de les tessel·les limita el detall, però no ha de definir arbitràriament l’escala sol·licitada.

**Per validar:** retall, preview, dimensions exportades i metadades concorden dins d’una tolerància documentada, amb peces quadrades/rectangulars, diverses latituds i partició en peces. Coordinar amb RO-018.

**Revisió v0.7.0 · Pendent de validar:** Un camp editable amb suggeriments, lectura 1:1000 o 1000, i equivalència entre centímetres del model i metres reals. Buit segueix el mapa.

**Anotació original de l’usuari sobre v0.6.0:** Validat però millorar fluxe.

**Arxivat després de v0.7.0 (2026-11-01):** Validat.

### RO-008 — Footer i quadre V4V

**Implementat a v0.6.0:** fonts i projectes oberts integrats en un desplegable del V4V; footer amb enllaços separats al repositori i MIT, sense duplicació dins del modal. Conservats autor, foto, Lightning i atribució del mapa. Comprovats rutes al DOM local, obertura, tancament amb Escape i retorn del focus. No s’han visitat els enllaços remots. Pendent de validar.

**Abast:** integrar «Fonts cartogràfiques» dins de «Sobre el projecte · V4V», amb espai per a fonts obertes i projectes utilitzats. Al footer, «Codi obert» enllaça al repositori i «MIT» a la llicència; retirar la duplicació d’aquests enllaços dins del quadre.

**Per validar:** tots els enllaços funcionen en local, fonts i atribucions continuen accessibles i el peu manté poca alçada. No es retira l’atribució pròpia del mapa. Mantenir el contingut de l’autor i les referències de Pentagrama/Plec.

**Revisió v0.7.0 · Pendent de validar:** Versió al footer, icona de commit al repositori i V4V amb autor/fonts visibles a dues columnes.

**Anotació original de l’usuari sobre v0.6.0:** Millorar layout del popup per encabir-ho sense haver de desplegar "Fonts cartogràfiques i projectes oberts". Podem utilitzar layout a doble columna a la part inferior (sobre l'autor - fonts i projectes oberts).

**Arxivat després de v0.7.0 (2026-11-01):** Validat.

### RO-018 — Rotació de la regió seleccionada

**Implementat a v0.6.0:** gir horari −180° a 180°, amb centre, dimensions reals i cantonades compartides entre mapa, càrrega, projecció i exportació. L’envolupant inclou totes les cantonades. La numeració de peces es refereix a dalt/esquerra del model; el nord s’obté del gir registrat. Proves amb rectangles, escala fixa, latituds 0°/41,918°/65° i angles diversos. Model generat al navegador a 35°, 150 × 200 mm i 1:1.000. La mostra de Tamariu recupera gir zero. Pendent de validar per l’usuari.

**Proposta:** orientar el retall amb un angle lliure; decidir si resulta més intuïtiu girar el mapa o el requadre.

**Proper pas:** definir la transformació comuna de selecció, projecció, dades, preview, exportació i peces. Girar només la càmera no compleix aquesta petició. Cal carregar la cobertura de dades de totes les cantonades del retall girat.

**Per validar:** un retall rectangular girat coincideix entre mapa i exportació, conserva mida/escala i exageració, costa i capes es retallen bé, i l’angle/nord queden a les metadades. Dependències de disseny: RO-006; afecta RO-014 i RO-017.

**Revisió v0.7.0 · Pendent de validar:** Gir al costat del mapa amb passos de 15°, rang d’interacció −90°…90° i botó Nord. Manipulació directa del retall pendent d’una futura iteració.

**Anotació original de l’usuari sobre v0.6.0:** Validat però sistema de rotació molt poc intuïtiu. Millor passar-ho d'alguna forma al mapa o inventar-se alguna altra forma. La rotació màxim entre -90º i 90º, no cal més (de fet, només amb 0-90º és suficient).

**Arxivat després de v0.7.0 (2026-11-01):** Validat.

### RO-027 — Auditoria d’usabilitat dels sidebars

**v0.7.0 · Pendent de validar:** inventari, agrupació de controls, noms, descobribilitat, accessibilitat i reducció de textos redundants. Aplicar una distribució coherent amb lloc/orientació, mida/escala, relleu/edificis i vegetació, i reunir colors/materials a la dreta. Informe i criteris a [AUDITORIA-USABILITAT.md](AUDITORIA-USABILITAT.md); revisió d’usuari pendent.

**Arxivat després de v0.7.0 (2026-11-01):** Validat.

### RO-028 — Vegetació proporcionada a l’escala

**Observació:** les capçades tenen radi en mil·límetres constants i poden semblar arbres gegants en maquetes de territoris amplis.

**v0.7.0 · Pendent de validar:** capçada orientativa de 12 m convertida a l’escala horitzontal, sense exageració vertical. Variació i incrustació conservades. Per sota de 0,25 mm de diàmetre s’ometen els arbres i es conserva la superfície del bosc; avís explícit, sense engrandir-los artificialment. El llindar és una política de representació, no una garantia universal d’impressió. La vegetació no acredita arbres individuals mesurats.

**Arxivat després de v0.7.0 (2026-11-01):** Validat.

### RO-029 — Escala i límit real de càrrega

**Observació:** el rang numèric arriba a 1:100.000 però 1:50.000 o 1:100.000 poden superar el límit de 16 tessel·les de la cartografia actual.

**v0.7.0 · Pendent de validar:** validació contextual abans de generar, mateixa lògica de capacitat a la càrrega i missatge amb escala màxima aproximada segons centre, mida i orientació. No confondre rang numèric amb cobertura admissible. Ampliar territori o reduir el detall automàticament requereix un estudi posterior; no s’ha d’amagar la desaparició de capes en canviar de zoom de dades.

**Arxivat després de v0.7.0 (2026-11-01):** Validat.

## Validacions de l’usuari sobre v0.8.0

| ID | Anotació original |
| --- | --- |
| RO-002 | Per estudiar |
| RO-009 | Validat |
| RO-011 | Per estudiar |
| RO-015 | Validat |
| RO-023 | Per millorar |
| RO-024 | Per estudiar |
| RO-026 | En estudi |
| RO-030 | Validat |
| RO-031 | Validat |
| RO-032 | Per estudiar |
| RO-033 | Per estudiar |
| RO-034 | Per estudiar |
| RO-035 | Per estudiar |
| RO-003 | Ajornat |
| RO-012 | Ajornat |
| RO-014 | Ajornat |
| RO-016 | Ajornat |
| RO-017 | Ajornat |
| RO-019 | Ajornat |
| RO-025 | Ajornat |

### RO-009 — Favicon

**Implementat a v0.6.0:** favicon SVG amb els tres triangles, contrast propi sobre fons clar i ruta relativa al subdirectori. Asset inclòs a la construcció i enllaç verificat al DOM local. Pendent de validar a les pestanyes del navegador habitual de l’usuari.

**Abast:** reutilitzar els tres triangles del header com a marca provisional de la pestanya.

**Per validar:** es veu en navegador clar/fosc, no hi ha peticions de favicon inexistents i les rutes funcionen sota el subdirectori de GitHub Pages.

**Revisió v0.7.0 · Pendent de validar:** Favicon amb llenç quadrat de 38 × 38, conservant el logotip.

**Anotació original de l’usuari sobre v0.6.0:** Fons de la icona quadrat, no rectangular, per aprofitar millor l'espai disponible.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.8.0.

### RO-015 — Opcions de broquet i filament

**v0.8.0 · Retirada implementada, pendent de validar:** eliminats els dos selectors, el mòdul d’opcions i els camps de broquet/tipus de filament al 3MF. Colors i assignacions de materials conservats. La configuració d’impressió es decideix al laminador. La funció pot reprendre’s amb demanda o una contribució específica; no es promet una versió. Les notes següents documenten la implementació anterior.

**Primera implementació v0.6.0:** PLA/PETG i broquet opcional de 0,2/0,4/0,6 mm; per defecte no s’escriu diàmetre i es conserva el del laminador. Valors explícits al dialecte Bambu i procedència en 3MF/STL, sense perfils de màquina, temperatures ni G-code. Proves de metadades i preservació de geometria. Abast acotat mentre RO-003 continua ajornat: no es dona per resolta la configuració inesperada de Bambu. Pendent de validar el reconeixement amb el laminador de l’usuari.

**Proposta:** poder seleccionar broquet de 0,2 / 0,4 / 0,6 mm i material, per exemple PLA o PETG, quan l’exportació i el laminador ho puguin interpretar correctament.

**Dependència acotada:** RO-003 continua ajornat. Aquesta primera iteració només incorpora els valors de consumibles escollits explícitament, sense generar perfils de màquina ni investigar els valors inesperats d’importació. La validació al laminador segueix pendent.

**Per validar:** opcions reconegudes amb la impressora/perfil seleccionats, valors modificables per l’usuari i regressió de quatre colors. No prometre un perfil complet ni temperatures adequades només a partir de «PLA» o del diàmetre del broquet.

**Decisió de l’usuari després de v0.7.0:** Validat, però eliminarem l'opció de material i gruix de broquet, perquè ho ignora, així que millor simplement exportem el 3MF i que l'usuari decideixi com enfocar exactament la seva configuració. Eliminem les opcions de material i gruix del broquet..

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.8.0.

### RO-030 — Vegetació incompleta i límit de recursos

El generador s’atura en arribar a 12.000 arbres, deixant sense cobrir les files finals; el pinzell no afegeix arbres al límit. Mostreig determinista de tota l’àrea, prioritat dels arbres pintats, avís de saturació i memòria cau de candidats. Provar una zona verda que superi el límit i pintar-hi amb capacitat plena.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.8.0.

### RO-031 — Densitat dels traços de vegetació

La densitat deixa de regenerar automàticament tot el bosc. Es desa per traç perquè canviar-la no modifiqui els traços anteriors. Confirmar en navegador que el control no inicia un càlcul i que el pinzell pinta més/menys arbres.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.8.0.

## Validació d’edificis amb Catastre · v0.10.0

### RO-002 — Edificis contigus representats com a megablocs

**Diagnòstic completat a v0.5.0; millora pendent (2026-11-01):** el bloc de la captura és `icgc-1074761`, una sola petjada original d’uns 1.723 m² amb 29 coordenades i cap divisió interior. No hi ha petjades OSM intersectants a les tessel·les de la mostra. La combinació conserva la geometria exacta. [Informe reproduïble](RO-002-DIAGNOSTIC.md).

**Decisió:** no inventar divisions. Advertiment de petjades agrupades incorporat a les limitacions i exportacions; regressió de conservació de totes les petjades oficials, adjacències i patis. Torna a `Per estudiar` per buscar una font oberta amb parts d’edificis (RO-023). No es dona el problema visual per corregit.

**Continuació:** la investigació i priorització de fonts s’organitza a RO-026. Aquesta incidència manté l’evidència del megabloc i es validarà quan hi hagi una millora real sobre el mateix cas. A v0.8.0, primer contrast amb parts cadastrals registrat a [PAISATGE-3D.md](PAISATGE-3D.md); el mode automàtic encara no canvia.

**Evidència:** [Google Maps](google-maps.png), [OpenStreetMap](openstreetmap.png) i [Relleu Obert](relleu-obert.png), a la corba del carrer de la Perica / GIV-6542 de Tamariu. La captura OSM mostra absència de diverses petjades; la de Relleu Obert mostra blocs grans. Les imatges no identifiquen per si soles quina operació els ha produït.

**Proper pas:** identificar les geometries d’aquesta ubicació a ICGC i OSM/OpenFreeMap, els seus identificadors, alçàries i fragments després de combinar/retallar. Distingir un polígon de font que ja agrupa edificis, una unió nostra i edificis separats que visualment semblen units perquè comparteixen cota/color. Revisar també polígons amb parts o patis.

**Per validar:** comparació de petjades d’entrada/sortida amb casos de cases contigües sobre pendent, conservant les separacions presents a les dades i una cota de coberta per edifici identificable. No donar per real una divisió inventada només per corregir l’aspecte. Si falten dades de separació, documentar el límit o buscar una font oberta millor. Validació d’alçàries condicionada a RO-001; relacionada amb RO-022 i RO-023.

**Actualització v0.9.0:** Catastre com a font opcional de parts sobre el mateix retall. No se superposen envolupants ni es creen divisions inventades. Procedència de volums i famílies; validació visual de Tamariu pendent.


**Validació de l’usuari (2026-11-01):** a la zona de prova de Tamariu, els volums cadastrals representen els edificis de forma molt més fidel i les geometries es renderitzen com s’espera. Es tanca el cas de megablocs de RO-002 per a aquesta mostra; això no valida totes les regions/fonts. Cobertes reals pendents a RO-032.


## Validacions anotades per l’usuari i arxivades a v0.12

### RO-036 — Pinzell de vegetació sense quadrícula

**Estat de l’usuari al backlog: «Validat». Arxivat el 2026-11-02.** Es conserva el registre anterior a continuació; les noves funcionalitats RO-040–043 i la impressió física mantenen validacions separades.

**Implementat, pendent de validar:** Mostreig uniforme dins del disc amb distància mínima, llavor determinista per traç i intents acotats. Cap malla de col·locació; els contenidors espacials només serveixen per comprovar veïns. Variació de capçades independent del recorregut automàtic. Canviar densitat no altera traços antics.

### RO-037 — Selecció explícita de fonts d’edificis

**Estat de l’usuari al backlog: «Validat». Arxivat el 2026-11-02.** Es conserva el registre anterior a continuació; les noves funcionalitats RO-040–043 i la impressió física mantenen validacions separades.

**Implementat, pendent de validar:** Retirat Automàtic · ICGC. ICGC per defecte dins de l’àmbit configurat i OSM fora; ICGC desactivat fora de l’àmbit, sense confondre’l amb cobertura comprovada de cada edifici. Catastre opcional a península/Balears, límit de 4 km² i errors sense canvi silenciós de font. Fonts noves només quan es validin.

### RO-038 — Capa d’edificis incremental

**Estat de l’usuari al backlog: «Validat». Arxivat el 2026-11-02.** Es conserva el registre anterior a continuació; les noves funcionalitats RO-040–043 i la impressió física mantenen validacions separades.

**Implementat, pendent de validar:** Càrrega i memòria cau de la capa d’edificis sense redescàrrega de vectors/DEM. Worker reutilitza terreny, aigua, camins i cobertes del sòl; conserva les capçades que no xoquen amb petjades noves. Canvis d’altura no mouen arbres. Missatges parcials al preview, càmera conservada i botó Actualitzar els edificis. Una regió, mida, gir, font de relleu o exageració nous sí que necessiten reconstrucció general.

### RO-039 — Timeout de la font Catastre

**Estat de l’usuari al backlog: «Validat». Arxivat el 2026-11-02.** Es conserva el registre anterior a continuació; les noves funcionalitats RO-040–043 i la impressió física mantenen validacions separades.

**Actualització de l’usuari:** L’usuari ha obtingut dades cadastrals correctes en ampliar el mapa. La nova fallada de resposta sense dades es registra a RO-040; no es dona per provada una causa de timeout a partir d’una resposta buida.

**Observació de l’usuari:** carregar edificis del Catastre sobre la mateixa zona retorna «signal timed out». No es dona per reproduïda la causa només per aquest text.

**Encàrrec completat:** Kimi ha rebut diagnòstic acotat del WFS, gestió de temps límit/reintents limitats, errors entenedors i regressions. Ha de conservar model/font explícita en fallar i evitar resultats parcials a la memòria cau. Entrega només amb totes les proves i construcció passades, o informe de bloqueig després de tres intents.

**RO-039 · entrega revisada:** [diagnòstic i correcció](RO-039-CATASTRE-TIMEOUT.md), 45 s per intent i un reintent, inclosa la lectura del cos. 89 proves de suite i build correctes; proves específiques repetides pel revisor. Causa exacta del cas real i càrrega satisfactòria de Tamariu pendents de validar.


## Validacions de v0.11 confirmades per l’usuari el 2026-11-02

### RO-041 — Recuperar la navegació en tancar vegetació

**Validat expressament per l’usuari al backlog.** Registre d’implementació anterior conservat:

**Implementat i revisat:** [resultats del pinzell](RO-041-042-PINZELL.md), 128 proves i build correctes. Densitat ×0,5/màxim×2, cobertura per gest i retorn de navegació comprovats localment; validació d’usuari pendent.

**Petició de l’usuari:** Tancar el panell o canviar de menú desactiva el pinzell.

**Seguiment:** Implementat, pendent de validar. Encàrrecs seqüencials a Kimi i revisió abans de continuar. Proves locals obligatòries; validació d’usuari diferenciada.

### RO-042 — Densitat i cobertura única de cada traç

**Validat expressament per l’usuari al backlog.** Registre d’implementació anterior conservat:

**Implementat i revisat:** [resultats del pinzell](RO-041-042-PINZELL.md), 128 proves i build correctes. Densitat ×0,5/màxim×2, cobertura per gest i retorn de navegació comprovats localment; validació d’usuari pendent.

**Petició de l’usuari:** Defecte ×0,5, màxim ×2 i evitar sobrepintar la mateixa zona en un gest.

**Seguiment:** Implementat, pendent de validar. Encàrrecs seqüencials a Kimi i revisió abans de continuar. Proves locals obligatòries; validació d’usuari diferenciada.

### RO-043 — Actualització automàtica d’edificis

**Validat expressament per l’usuari al backlog.** Registre d’implementació anterior conservat:

**Implementat i revisat:** [resultats d’edificis automàtics](RO-043-EDIFICIS-AUTO.md). Espera300ms i només edificis sobre terreny vigent; bloqueig/captura i validació posterior a càrrega, cancel·lació i protecció de resultats antics. 138 proves/build i regressió addicional del planificador passada. Navegador: canvi d’altura/font sense botó, i canvi de relleu que conserva Generar explícit, comprovats; validació d’usuari pendent.

**Petició de l’usuari:** Canvis d’edificis amb espera breu, cua i conservació del terreny.

**Seguiment:** Implementat, pendent de validar. Encàrrecs seqüencials a Kimi i revisió abans de continuar. Proves locals obligatòries; validació d’usuari diferenciada.

#### Antecedent de RO-014 abans de reorganitzar els controls


**Implementat a v0.11.0:** [resultats](RO-014-IMPLEMENTACIO.md), geometria i exportació independents comprovades localment. Laminador i prova física pendents; la proposta anterior queda com a antecedent.

**Disseny preparat:** [proposta de marc imprimible](RO-014-PROPOSTA.md), revisada per separar tolerància/solapa i segmentar només el perímetre exterior. 106 proves existents i build correctes; geometria, proves específiques futures, laminador i ajust físic pendents.

**Proposta:** exportar el marc en un altre fitxer, amb buit interior calculat des de la maqueta i un marge configurable per encabir-la.

**Ajornament:** fins a definir RO-013 i una prova d’ajust físic (RO-024).

**Per validar:** dimensions, tolerància i gruixos explícits; arxiu independent, ajust físic comprovat i estratègia per a marcs que superin el llit d’impressió. No assumir un encaix universal per a totes les impressores/materials.



## Historial de v0.9.0

- RO-009, RO-015, RO-030 i RO-031: validats → historial.
- RO-002: alternativa implementada per provar al mateix cas; no es dona per validada tota la fidelitat cadastral.
- RO-026 / RO-032: abast parcial explícit; fonts/cobertes noves pendents.
- RO-036–RO-038: implementats i pendents de validar. RO-024 / RO-033–RO-035 segueixen oberts.
- Delegació acotada a un únic Kimi k3-256k per al repartiment del pinzell, després que l’usuari confirmés consum inicial del 0%. Dos fitxers revisats i vuit proves pròpies superades; cap altre agent simultani. No es declara un percentatge final de consum que no s’hagi mesurat.

**Comprovació local de v0.9.0:** 82 proves superades i construcció estàtica correcta. Al navegador, retall de 150 × 150 mm a 1:1.000 centrat a 41.91814, 3.20528: 18 fragments amb ICGC i 117 volums retallats amb Catastre. Exportacions STL amb vuit assignacions: material-1 (terreny), material-4 (camins), material-5 (bosc), material-6 (arbres) i material-8 (aigua interior) idèntics byte a byte abans/després; només material-3 (edificis) canvia. Les categories absents continuen absents. El canvi de font manté la càmera i el mapa ocult conserva la selecció. Falta la validació de l’usuari, laminador i impressió; no s’han comprovat Pages/CI remots.



## Seguiment v0.12

RO-036–039 han passat a [l’historial](HISTORIAL.md), perquè l’usuari els havia marcat «Validat» a la taula. Es preserven totes les observacions i no es trasllada aquesta validació a les novetats de v0.11/v0.12 ni a proves físiques. La petició completa de replantejament de RO-017 es conserva dins de la seva entrada.


## Registre del lot v0.12 (antecedent)



**Antecedent v0.11:** publicar les correccions i els tres complements ja integrats. RO-012(escena), RO-023(UX de fonts) i RO-024(sòlids per a infraestructures) continuen pendents; les cobertes reals depenen de dades/accés de RO-032. No es dona cap línia pendent per completada.

1. Validar les correccions de respostes buides del Catastre i interacció del pinzell (RO-040–RO-042), l’actualització automàtica (RO-043) i les novetats de v0.12.
2. Comparar fidelitat de parts i cobertes, segona zona i noves fonts (RO-026 / RO-032).
3. Preparar sòlids i proves de continuïtat per a ponts/túnels/cavitats (RO-024), segons [RO-024-SOLIDS.md](RO-024-SOLIDS.md).

### RO-040 — Catastre sense edificis no ha de bloquejar el model

**Validació d’ús rebuda (2026-11-02):** «Validat aparentment, no comprovat en moltes possibles situacions». S’arxiva el flux ordinari; respostes mixtes, errors de servei i recuperació continuen en seguiment amb RO-044. No és una garantia per a totes les àrees.

**Antecedents de la implementació i proves locals:**

**Implementat i revisat:** [diagnòstic i proves](RO-040-CATASTRE-BUIT.md). Col·leccions buides vàlides, capes mixtes i zero parts sobre rasant acceptades; paginació/recomptes incoherents continuen sent errors. 117 proves de suite i build correctes; AOI real buida/mixta pendent de validar.

**Petició de l’usuari:** Acceptar respostes vàlides buides; distingir-les d’errors de servei.

**Seguiment:** Implementat, pendent de validar. Encàrrecs seqüencials a Kimi i revisió abans de continuar. Proves locals obligatòries; validació d’usuari diferenciada.


### RO-048 — Base relativa a la cota mínima del retall

**Validat per l’usuari (2026-11-02).** Laminat i prova física es mantenen a RO-024.

**Antecedents de la implementació i proves locals:**

Petició expressa: corregir i publicar com a v0.13.1 abans de continuar RO-033/034, sense esperar validació. Ara es resta la cota mínima de la mateixa graella que genera el relleu i s’hi afegeixen 5 mm; a la costa es manté nivell marí zero com a origen i superfície a 5 mm. Les altituds d’origen es conserven a les metadades; no és una conversió de datum. Edificis, arbres, camins i aigües interiors comparteixen la transformació.

Mostra real de Manresa: origen 227,2727 m, relleu generat entre 5 i 24,7599 mm amb exageració ×1,5 i escala 1:10.000. Tamariu conserva mar a 5 mm. Regressions de cota absoluta/negativa, desnivell, exageració, escala i aigües interiors; validació de l’usuari pendent.


### RO-049 — Camins realçats

**Validat per l’usuari (2026-11-02).** Laminat i prova física es mantenen a RO-024.

**Antecedents de la implementació i proves locals:**

Implementat v0.15.0, pendent de validar: [comprovacions](RO-033-SUPORTS-I-ENLLACOS.md#ro-049--realç-opcional-dels-camins). Petició de l’usuari per ressaltar carreteres a 0,5 o 1 mm sobre el terreny. Opció desactivada per defecte, en mil·límetres de maqueta; afecta també el paviment dels taulers i els enllaços, sense presentar-ho com una cota mesurada. Unions, exportació i càmera comprovades localment; validació d’usuari i laminat pendents.
