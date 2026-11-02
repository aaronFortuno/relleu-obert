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
