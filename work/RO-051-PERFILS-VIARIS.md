# RO-051 — Perfils de vies principals sobre el relleu intacte

Lot v0.18.1, 2026-11-02. L'usuari proposa connectar els punts alts del
perfil longitudinal i confirma que els trams suspesos rebin suports
estimats. El prototip anterior de tall/terraplè s'ha retirat abans de
publicar. El DEM original i el camp d'altures de la maqueta es conserven.

**Estat de publicació: prototip DESACTIVAT per defecte, sense opció a la
UI.** Requereix `majorRoads:true` explícit al codi. La represa en l'equip
de 64 GB redueix el retall de 3 km de 189,274 a 56,638 s amb màscares
d'obstacles sota demanda, sense canviar les unions ni els seus operands.
Conserva els 14 perfils i els resums de suports. [Mesures i validacions
pendents](RO-051-RENDIMENT.md); [punt de partida i reproducció](REPRESA.md).
Els resultats viaris d'aquest informe són del prototip, no del valor per
defecte de l'aplicació publicada.

## Estratègia integrada

- Classes `motorway`, `trunk` i enllaços. Les vies secundàries continuen
  sobre el terreny. El perfil es calcula sobre l'eix original complet,
  després d'unir fragments compatibles, i es retalla al final.
- Estacions cada 10 m, seccions transversals horitzontals i restriccions
  d'altura preses de l'eix i les dues vores. Es considera tant el DEM com
  el terreny triangulat realment generat: poden diferir amb detall baix.
- Envolupant superior amb pendent màxim del 12%, o 16% als enllaços.
  Els extrems poden pujar per complir aquest límit; l'ajust consta a la
  procedència. No es reconstrueix l'alineació real de la infraestructura.
- Amplada de la font o nombre de carrils quan hi ha dades vàlides; en
  absència, 14/10/7 m segons classe. Amplada física mínima de 0,44 mm.
- Ajust residual comprovat en tots els vèrtexs d'intersecció entre els
  triangles de carretera i terreny, per evitar cims interiors que travessin
  la calçada. Separació màxima admesa de 30 m respecte al terreny; una vall
  més profunda necessita un pont cartografiat, no una invenció automàtica.

El tauler conserva un gruix de 0,6 mm més el realç de camins seleccionat.
Només el volum que aquest ocupa passa a material camí; no s'aplana ni es
reconstrueix el terreny inferior. L'altura del paviment sobre el DEM no és
la llum lliure sota una peça amb gruix.

## Suports, creuaments i recuperació

Es reutilitza el planificador de pilars dels ponts: cos mínim de 0,8 mm,
comprovació de petjades i suports auxiliars per acotar llums a 10 mm de
maqueta. S'eviten altres camins, ferrocarrils, taulers, edificis, aigua i
túnels carregats. La calçada pròpia no es considera un obstacle contra
els seus pilars. El repartiment és estimat, sense dades constructives.

Els creuaments interiors amb infraestructures requereixen cotes XYZ
acreditades i una comprovació de llum útil de 0,8 mm, incloent el gruix dels
taulers. `layer` indica ordre, no metres. Un contacte proper als extrems
es deixa al planificador d'enllaços; un cas interior desconegut s'omet amb
motiu explícit. La comprovació d'obstacles només afecta el retall físic
visible, sense canviar els ancoratges del perfil exterior.

Si falla l'assignació de material o no es poden situar suports segurs,
la generació recupera atòmicament els camins anteriors sobre el terreny.
Una actualització d'edificis incompatible conserva el model vàlid previ.
Els nous taulers reben el mateix tall dels túnels perquè no tapin portals.

## Diagnòstic de Rajadell

La comparació inicial amb DEM fi del tram de 739,6 m donava 4,227 m de
pujada màxima del paviment. Aquesta dada és només una comparació
d'estratègies: no descriu l'altura final sobre una graella més gruixuda,
ni equival a un espai buit sota el tauler.

El primer control integrat detecta dues incidències numèriques i una
comprovació fora de la regió:

- Un prisma positiu molt petit era seleccionat per l'envolupant rectangular
  d'un tauler corbat, tot i quedar fora de la seva petjada. Ara es conserva
  sense passar-lo innecessàriament per booleans; no s'elimina per mida.
- La conversió dels resultats booleans a Float32 podia col·lapsar un
  tetraedre a tres posicions exactes. Només aquests components tancats
  incapaços d'envoltar volum es retiren, amb recompte i avís. Una capa
  positiva de 0,001 mm i el prisma real anterior es conserven.
- El camí-pont `1820330582` creua l'eix llarg de la carretera a uns 418 m
  al sud del retall. No és el viaducte de Rajadell ni té font IFC associada.
  Comprovar-lo fora de la maqueta descartava erròniament el perfil visible.

## Verificació i límits pendents

Les regressions comproven la conservació exacta del DEM i del camp
d'altures, secció plana, malles tancades, suports, recuperació en error,
actualitzacions incrementals i procedència al 3MF. Els casos de creuament
desconegut continuen omesos; no s'han afegit excepcions geogràfiques.

Control real final: mostra inclosa de Rajadell, edificis ICGC, 1,5 km sobre
150 mm, detall 36 i túnels activats. Quatre perfils aplicats, sense omissions
viàries; el tram de 739,6 m té una separació màxima representada de 7,604 m
entre paviment i terreny. Les altres tres són 6,697, 13,983 i 8,650 m;
són cotes estimades sobre la malla generada, amb gruix de tauler a descomptar.

Dos pilars estimats a les noves plataformes; la llum mostrejada màxima
és de 3,681 mm. El viaducte conegut conserva onze pilars, dues connexions
i llum màxima de 8,919 mm. Alguns altres extrems continuen sense enllaç
suau i consten als avisos. El túnel principal s'excava amb paviment de
camí, sense retirar cap component final de volum nul en aquest control.
Execució de 15 s i almenys 4,58 GB de RAM lliure.

El punt publicable, amb el prototip apagat per defecte, supera 342 proves
úniques, build i comprovació de controls al navegador. Això no valida el
cas explícit de 3 km interromput. Validació d'usuari, laminat i impressió
encara pendents.
La generalització necessita contrast en més regions i amb fonts remotes,
especialment enllaços, retalls girats, terreny de poca resolució i
infraestructures superposades. Les comprovacions sobre cartografia
incompleta no garanteixen evitar obstacles reals absents de les dades.

## C-37 a Sant Salvador de Guardiola · v0.21.3

OpenFreeMap classifica la C-37 com a via troncal. Al retall sud-oest, centrat a 41,68075 N, 1,754 E, el túnel 317900732 i el pont 317898440 tenen etiquetes pròpies. Amb MET5, el planificador passa de quatre a cinc perfils troncals en un retall d’1,5 km per a una peça de 150 mm. Al retall de Salelles, centrat a 41,706 N, 1,781 E, es conserva un perfil troncal. Les omissions per manca de DEM passen de dues a zero en cadascun dels retalls. Les altres causes d’omissió, incloses les de pendent o encaix, continuen subjectes a les comprovacions geomètriques.

El planificador del túnel sud-oest troba una obertura elegible. Queda pendent comprovar l’excavació i el pont al model complet de Sant Salvador, i repetir la bateria amb altres escales i corredors. [Avaluació ambiental del tram Sant Salvador–Manresa](https://www.gencat.cat/mediamb/dia/dia_guardiola.pdf)

## Bateria de la 0.22 · control inicial amb v0.21.3

Sis models complets amb dades remotes, peça de 150 mm, detall Ràpid de la interfície (36 cel·les), exageració ×1,5, edificis OSM i arbres desactivats. Perfils suaus i túnels estimats activats. Totes les malles passen l’auditoria topològica. El pendent correspon als eixos dels perfils acceptats abans de l’exageració vertical, i el canvi és la diferència màxima de pendent entre dos intervals consecutius. Els enllaços del tauler es comproven a banda.

| Control | Escala | Perfils aplicats | Pendent màxim / canvi màxim | Resultat |
| --- | --- | ---: | --- | --- |
| Sant Salvador, 1,5 km | 1:10.000 | 0 | — | Pont i túnel presents. La unió de paviment falla i recupera els camins sobre el terreny. |
| Sant Salvador, 3 km | 1:20.000 | 3 | 8,30% / 1,71 punts | Pont present. Túnel 317900732 omès per coberta discontínua. |
| Millau, 1,5 km | 1:10.000 | 3 | 7,67% / 0,31 punts | Dos taulers. Cap enllaç resolt al retall curt. |
| Millau, 3 km | 1:20.000 | 7 | 10,47% / 0,54 punts | Dos taulers, amb els quatre enllaços. |
| Ferrocarril, 400 m | 1:2.667 | 1 | 1,51% / 0,00 punts | Rasant ferroviària constant. |
| Ferrocarril, 800 m | 1:5.333 | 0 | — | La unió de paviment ferroviari falla i recupera la via sobre el terreny. |

Sant Salvador a 1:10.000 i el ferrocarril a 1:5.333 fallen en la mateixa etapa, en unir els components de la capa de paviment abans de la resta booleana. El motor n’informa amb volums calculats lleugerament negatius. Cal capturar els components i provar si el càlcul en coordenades locals conserva els sòlids vàlids. Un control preexistent de Rajadell mostra que traslladar un prisma petit a l’origen recupera un volum positiu i manté col·lapsat el control degenerat. L’efecte sobre els dos errors reals encara és pendent. La falta de coberta del túnel a 1:20.000 és una incidència separada.

Reproducció amb `node --max-old-space-size=512 scripts/diagnose-transport-battery.mjs guardiola 1.5`. Els casos són `guardiola` i `millau` amb 1,5 o 3 km, i `rail` amb 0,4 o 0,8 km. Executar-los seqüencialment i controlar el marge de memòria segons `AGENTS.md`. Els informes JSON i 3MF es desen a `output/transport-battery/`.

### Repetició amb v0.21.4

La unió reintenta en coordenades locals els components amb volum geomètric positiu que Manifold valora com a no positius. El retall ferroviari també presentava un prisma aïllat que invertia l’orientació en convertir el contorn a Float32. L’extrusió d’aquests prismes comprova ara l’orientació amb la precisió de sortida abans de tancar la peça. Són regles de geometria compartides.

- **Sant Salvador, 1:10.000.** Dos perfils troncals aplicats, amb pendents màxims del 10,69% i el 4,63%. Pont i túnel presents. Quatre omissions al conjunt del retall, incloses transicions de la C-37.
- **Ferrocarril, 800 m, 1:5.333.** Perfil aplicat amb pendent constant de l’1,56% i zero omissions.

Tots dos controls s’han repetit amb MET5 i els mateixos ajustos de model, amb un termini ampliat només al diagnòstic per obtenir la mateixa font. Les malles finals passen l’auditoria. El contrast visual i el laminat són pendents.

### Transicions amb v0.21.6

Quan l’enllaç habitual falla, el motor pot provar dues reserves més llargues dins del mateix eix cartografiat. Cada intent torna a comprovar l’ajust a la superfície, els encreuaments, el pendent i el tram sense suport. La terra i les cotes dels taulers mesurats es mantenen.

- **Sant Salvador, 1:10.000 amb MET5.** De dos a tres perfils aplicats. El nou enllaç fa 3,65 mm i té un pendent màxim mesurat del 5,16% abans de l’exageració vertical. Les cotes coincideixen al centre dels dos extrems de l’enllaç calculat. El pont i el túnel principal es conserven. Queden dos perfils omesos per manca d’una unió admissible i un tercer per un creuament amb túnel sense cota acreditada.
- **Ferrocarril, 800 m amb MET5.** Es conserva el perfil a l’1,56% i amb zero omissions.

Totes dues malles passen l’auditoria. L’informe de la bateria separa ara els pendents de l’eix i els dels enllaços. Pendent de contrast visual i laminat.

### Bateria repetida amb v0.21.7

Mateixos retalls i ajustos que a v0.21.3. MET5 de 5 m a Sant Salvador i al ferrocarril, i Mapterhorn a zoom 14 a Millau. S’han comprovat els límits dels retalls i del MET5. Les fonts s’han consultat en directe. El diagnòstic ha permès més temps de resposta al MET5 per conservar el proveïdor de referència.

| Retall i escala | Perfils aplicats | Omissions de perfil | Pendent màxim | Canvi màxim de pendent | Unions de perfil | Temps de malla |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Sant Salvador 1:10.000 | 0 → 3 | 4 → 3 | — → 10,69% | — → 2,48 punts | 0 → 4 | 9,87 → 10,02 s |
| Sant Salvador 1:20.000 | 3 → 8 | 19 → 14 | 8,30% → 12,36% | 1,71 → 2,77 punts | 6 → 12 | 64,80 → 53,68 s |
| Millau 1:10.000 | 3 → 3 | 9 → 9 | 7,67% → 7,67% | 0,31 → 0,31 punts | 6 → 6 | 4,58 → 5,50 s |
| Millau 1:20.000 | 7 → 8 | 21 → 20 | 10,47% → 10,47% | 0,54 → 0,84 punts | 11 → 12 | 48,69 → 57,36 s |
| Ferrocarril 1:2.667 | 1 → 1 | 0 → 0 | 1,51% → 1,51% | 0,00 → 0,00 punts | 0 → 0 | 1,16 → 1,31 s |
| Ferrocarril 1:5.333 | 0 → 1 | 0 → 0 | — → 1,56% | — → 0,00 punts | 0 → 0 | 2,36 → 2,68 s |

Els màxims corresponen al conjunt de perfils aplicats a cada execució, abans de l’exageració vertical. A Sant Salvador 1:20.000, el 12,36% correspon a un ramal incorporat a la segona passada. L’omissió zero al ferrocarril 1:5.333 amagava una recuperació global del paviment sobre el terreny a v0.21.3. El model de v0.21.7 hi aplica una rasant constant. Totes sis malles passen l’auditoria topològica. Els temps corresponen a una passada per versió amb la càrrega de fonts registrada a banda.

Les unions dels ponts de referència es mantenen. A Sant Salvador, els fragments del pont 317898440 sumen sis unions als dos retalls i el túnel principal passa de zero a un a 1:20.000. A Millau, els dos taulers continuen amb quatre unions al retall ampli i els extrems sense continuació al retall curt.

**Pas de la C-37 al nord de Sant Salvador.** El candidat principal és el torrent de Montgròs, a 41,689049 N, 1,761280 E. És dins del retall de 3 km i fora del d’1,5 km. En un control amb terreny pla, el fragment complet genera el tauler. Quan s’hi afegeix la còpia truncada i solapada de la tessel·la veïna, el motor el rebutja per una corba massa tancada, en tots dos ordres d’entrada. El mateix identificador també produeix un tauler al torrent de la Fessona. Cal validar la presència del tauler al punt de creuament. A la Fessona també hi ha un ramal amb tauler i dos extrems sense enllaç. [Traçat principal a OpenStreetMap](https://www.openstreetmap.org/way/317900710) · [Ramal de la Fessona](https://www.openstreetmap.org/way/457787902)

### Transicions pendents a la v0.22.0

Sant Salvador a 1:10.000, amb el mateix retall, MET5 i ajustos de la bateria. Els dos perfils pertanyen a la via `317898410`. La traça registra el pendent màxim de cada corba candidata abans de l’exageració vertical. El valor de la taula és el mínim dels màxims de les corbes provades a cada extrem. El límit de la C-37 és del 12%.

| Extrems del tram cartografiat (N, E) | Extrem rebutjat | Millor pendent amb la reserva inicial | Millor pendent amb les reserves alternatives |
| --- | --- | ---: | ---: |
| 41,680092, 1,753693 → 41,681214, 1,753757 | Sud | 17,88% | 15,90% |
| 41,682303, 1,754245 → 41,683213, 1,754653 | Sud | 22,18% | 22,18% |
| Mateix tram | Nord | 39,83% | 33,62% |

Els tres extrems fallen el control de pendent abans que calgui comprovar el suport o el contacte amb el relleu. Un prototip amb reserves de traçat més curtes i asimètriques conserva un mínim de 2 mm de perfil central a la maqueta. Cap combinació provada aconsegueix els dos enllaços d’un perfil. Es manté el paviment sobre el terreny en aquests trams. El creuament amb el túnel `1941444752` queda separat perquè hi manca una cota fiable.

### Controls de publicació de la v0.22.0

Quatre retalls amb les mateixes fonts i opcions que a la bateria anterior. Les mètriques de perfils, unions, omissions i l’auditoria de triangles coincideixen amb els informes de v0.21.7. Els temps corresponen a una sola execució de cada versió i inclouen el càlcul i l’auditoria.

| Retall | Perfils / omissions | Pendent màxim / canvi màxim | Unions de perfil | Temps v0.21.7 → v0.22.0 |
| --- | ---: | ---: | ---: | ---: |
| Sant Salvador 1:10.000 | 3 / 3 | 10,69% / 2,48 punts | 4 | 10,02 → 16,14 s |
| Millau 1:10.000 | 3 / 9 | 7,67% / 0,31 punts | 6 | 5,50 → 4,42 s |
| Millau 1:20.000 | 8 / 20 | 10,47% / 0,84 punts | 12 | 57,36 → 110,76 s |
| Ferrocarril 800 m, 1:5.333 | 1 / 0 | 1,56% / 0,00 punts | 0 | 2,68 → 2,39 s |

Sant Salvador conserva el pont i el túnel del control. Els dos taulers de Millau són presents a les dues escales i sumen quatre enllaços al retall de 3 km. El temps de Millau a 3 km queda registrat per contrastar-lo amb més passades.

### Accés sud de Millau a la v0.22.1

Retall de l’informe de l’usuari, centrat a **44,066336 N, 3,030207 E**.
Peça de 150 × 150 mm, escala 1:10.539, detall Equilibrat, exageració
×1,5, arbres actius i edificis OSM. El retall de control anterior era
centrat al viaducte i feia servir detall Ràpid.

L’informe original mostrava les dues calçades de l’A75 rebutjades per
un creuament amb el túnel `810885922`. La carretera tornava a seguir
els triangles del terreny, també en sentit transversal. Ara el motor
comprova la volta excavada contra els triangles del paviment i els
seus enllaços. Si falla la comprovació, es recupera la via sobre el
terreny. La separació sota el paviment i la coberta del túnel es
comproven per separat.

També s’ha mesurat un solapament entre calçades d’amplada estimada.
Les autopistes de sentit únic passen a una estimació de 10 m quan
falten tant l’amplada com el nombre de carrils. El valor s’aplica al
paviment i als taulers procedimentals perquè els enllaços facin servir
la mateixa amplada.

El control complet recupera els dos perfils de l’A75 i manté els dos
taulers i els enllaços sud. La diferència de cota és inferior a 0,001 mm
en deu seccions transversals mesurades a la malla prop del túnel. La
separació mínima entre la volta i la cara inferior del paviment és de
0,72 i 0,55 mm. Totes les categories de la malla superen l’auditoria.
Els enllaços curts amb el paviment sobre el terreny encara hi adapten
la secció transversal. Queda pendent el contrast visual i el laminat.
## Millau sud a la v0.22.2

El retall de `millau-sud.json` fa 2.179,6 × 2.179,6 m i està centrat a 44,02347469° N, 3,06385296° E. Peça de 150 mm, escala 1:14.531, exageració ×1,5, detall Equilibrat i sis tessel·les Mapterhorn. La v0.22.1 aplica 13 perfils i omet alguns eixos sencers quan la cartografia viària s’estén més enllà de la cobertura altimètrica.

La v0.22.2 conserva el càlcul sobre l’eix complet si disposa de totes les cotes. Si la primera mostra que falla és fora de la peça, torna a provar l’eix dins del retall amb 5 m de marge. Si falten cotes interiors o la calçada no supera les comprovacions d’integració, el tram encara pot quedar sobre el relleu.

- Retall complet de Millau sud, amb edificis i vegetació. De 13 a 17 perfils aplicats. Entre els quatre recuperats hi ha la calçada de l’A75 dels fragments 1512307892 i 42968112, amb un pendent longitudinal màxim estimat del 6,35%. Cinc seccions transversals mostrejades a la malla final tenen una diferència inferior a 0,001 mm. Les set capes exportades al 3MF superen l’auditoria de geometria.
- Control del retall anterior, amb vies i aigua. Es conserven els dos perfils sobre el túnel verificat, amb zero omissions i auditoria correcta.
- A Millau sud queden 14 omissions de candidats. Inclouen creuaments amb ponts sense cota verificada, túnels que no s’han pogut obrir i enllaços curts. Cal aïllar aquestes zones perquè una incidència local no retorni al relleu tota la resta de l’eix.

## Cupó de paviment en vessant · v0.22.3

El pilot calcula una cota per estació a partir del centre de la calçada. La secció es manté plana i només varia la rasant longitudinal. Dins de la petjada es retalla el costat alt i es reconstrueix el terreny fins a la cara inferior del paviment. Fora de la petjada es conserva el perfil del vessant.

El control representa 200 × 200 m en una peça de 60 × 60 mm amb una calçada de 12 m d’amplada. El vessant té un 50% de pendent transversal i un 1,5% longitudinal. Amb un gruix de paviment de 0,65 mm i realç zero, cinc seccions mesurades al 3MF tenen les vores a la mateixa cota. El desmunt i el terraplè fins a la cara superior fan 0,90 mm als extrems de cada secció. A un 2,5% de l’amplada des de la vora baixa hi ha 0,205 mm de terreny afegit sota el paviment.

El 3MF exporta dos materials amb malles tancades. La unió té un sol component i la intersecció mesurada de 0,000007 mm³ queda dins de la tolerància d’arrodoniment del control. Les mesures també comproven que el relleu immediatament exterior es conserva. El laminat està pendent. Bambu Studio per línia d’ordres es va tancar abans de generar el G-code.

El pilot admet un sol tram recte de superfície. Es reprodueix amb `node scripts/check-surface-road.mjs`, que desa el 3MF i el diagnòstic a `output/surface-road/`. El següent control és mantenir la secció plana en corbes i resoldre les cotes comunes de les cruïlles abans de connectar-hi estructures elevades o soterrades.
