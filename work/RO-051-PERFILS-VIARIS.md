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
