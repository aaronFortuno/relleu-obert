# RO-053 — Proposta de flux per etapes

## Taller mòbil

A v0.22.34, fins a 900 px, l’inici presenta les mides, la taula orientativa,
el formulari personalitzat i les fitxes d’exemple amb fletxes. Triar una
mida obre Territori amb la cerca i el mapa primer. El botó de generar
queda fix dins d’Ajustos. En iniciar el primer càlcul s’obre el visor i,
si la generació falla, es tornen a mostrar els ajustos.

La barra inferior dona accés a Visor, Ajustos i Exporta. En horitzontal, el
panell es posa al costat del visor quan hi ha espai. Les opcions són
els mateixos controls del taller d’escriptori. Al mòbil, l’exportació
mostra la mida, l’escala, el nombre de materials i els formats. Els
detalls del diagnòstic, l’assignació per capa i la vista de presentació
queden al taller d’escriptori. Queda pendent validar els gestos,
el teclat i l’exportació en dispositius reals.

**2026-11-03 · v0.19.4.** Els ajustos de vies ja tenen un càlcul propi sobre
el terreny preparat. La base original, el camp d'altures i els edificis
es reutilitzen. Els túnels es tornen a excavar sobre la base original.
Els traços es reapliquen amb les màscares de vies i la vista manté la
càmera. La primera generació encara prepara el conjunt de capes.

**2026-11-03 · ordre validat per l'usuari i primera integració a v0.19.2.**
El producte ja presenta sis apartats i l'acció del pas al costat del títol.
Es pot tornar a qualsevol pas i plegar el panell de vegetació per recuperar
l'òrbita. Els traços només canvien de retall després d'una generació reeixida;
es poden recuperar en tornar al mateix retall i mida durant la sessió.
Terreny i vies encara comparteixen generació; vegetació i edificis
reutilitzen les actualitzacions existents. El document següent conserva
la proposta de càlcul independent i els límits encara pendents.

Prototip: [public/prototypes/ro053/index.html](../../public/prototypes/ro053/index.html).
Des d'un servidor local del projecte: `/prototypes/ro053/`. El paquet de
publicació també el pot servir sota el subdirectori de GitHub Pages.

## Recomanació

**Peça → Territori → Terreny → Vegetació → Vies → Edificis**, amb retorn
lliure als passos anteriors i revisió de la vegetació quan apareguin
obstacles nous. Els dos primers passos preparen el projecte; els quatre
següents són les capes de construcció. No són sis generacions completes.

La seqüència serveix de guia per al primer recorregut, sense convertir-se
en un assistent que obligui a repetir-lo cada vegada. Obrir un pas no
calcula res ni modifica la càmera. La descàrrega requereix un conjunt de
capes coherent, incloent les que l'usuari decideixi ometre.

| Alternativa | Avantatge | Cost per a l'usuari | Decisió proposada |
| --- | --- | --- | --- |
| Vegetació abans de vies/edificis | Paisatge llegible aviat; edició del bosc accessible | Cal revisar arbres afectats per obstacles posteriors | Recomanada amb conservació dels traços i revisió explícita |
| Vies i edificis abans dels arbres | Menys reconciliació posterior | La vegetació, d'interès educatiu, arriba al final | Alternativa vàlida si les proves d'ús prefereixen simplicitat de dependències |
| Totes les capes lliures des de l'inici | Ràpid per a ús habitual | Més decisions simultànies i dependències poc evidents | Permetre retorn lliure després de preparar el terreny, mantenint els estats visibles |

L'ordre de la navegació no obliga a descarregar les dades en aquell
ordre. Es poden preparar petjades d'obstacles ja disponibles, sense
presentar-les com a edificis o vies generats. Qualsevol precàrrega remota
addicional ha de continuar explícita i acotada; RO-047 no s'activa aquí.

## Inventari inicial (v0.19.1) i friccions concretes

Lectura de [index.html](../../index.html), [main.js](../../src/main.js),
[worker.js](../../src/worker.js), [geometry.js](../../src/geometry.js),
[sources.js](../../src/sources.js) i [place-map.js](../../src/place-map.js).

| Ara | Efecte observat al codi | Canvi proposat |
| --- | --- | --- |
| El lloc precedeix la mida | Canviar mida pot modificar el retall preparat al mapa | Preparar mida/peces abans de seleccionar el territori |
| «Relleu i edificis» agrupa detall, font, altura, camins, ferrocarrils i túnels | Mescla abast de dades i dependències de càlcul diferents | Controls dins de la capa que modifiquen |
| «Generar el model» cobreix generació completa i, de vegades, només edificis | El cost i el resultat de l'acció no són previsibles | Acció específica: preparar terreny, aplicar vegetació/vies/edificis |
| `sameTerrain()` inclou realç de camins/ferrocarrils i túnels | Aquests canvis van al mateix camí de reconstrucció completa | Separar clau de terreny de clau del transport i del substrat excavat |
| `loadRegion()` també resol la capa d'edificis | Un inici només de terreny encara espera fonts d'edificis | Diferir aquesta font o reutilitzar una càrrega independent |
| `updateVegetation()` reutilitza el context i candidats | Ja hi ha una base incremental útil | Preservar-la; no substituir-la per un nou sistema procedimental |
| `updateBuildings()` conserva el terreny i filtra capçades; pot recalcular pilars | «Només edificis» també té dependències de vies/vegetació | Mostrar l'abast real, sense regenerar terreny ni eliminar traços |
| `generate()` pot buidar `strokes` abans de saber si la càrrega/generació reeixirà | Un canvi de lloc/mida fallit pot perdre la història d'edició | No consumir ni esborrar edicions fins a confirmar un resultat nou |
| Materials ja es reassignen a les categories existents | No requereixen reconstruir el paisatge | Mantenir-los fora de les etapes geomètriques |
| El Worker té missatges `build`, `vegetation`, `buildings`, `export` | No hi ha encara `transport` ni construcció separada del terreny | El flux productiu necessita modularització; canviar menús no la substitueix |

El marc i els complements ajornats continuen fora de la proposta.
Es reutilitzen família, colors i mides de DESIGN.md: capçalera de 58 px,
footer de 32 px, controls d'11 px, etiquetes de 10 px i ajuda de 9 px.

## Responsabilitat de cada zona

- **Esquerra:** passos i controls de l'etapa activa. Sis entrades compactes
  sempre visibles; només el panell de controls té scroll. «Enrere» conserva
  els valors. Els prerequisits impedeixen aplicar una capa incompatible,
  però no amaguen els seus controls.
- **Centre:** una sola vista, conservant càmera i zoom. La vista vàlida
  continua visible mentre hi ha canvis o un error. El missatge diferencia
  el resultat mostrat de la configuració pendent.
- **Dreta:** mida/peces, estat de les quatre capes, reconciliació d'edicions,
  materials i descàrrega. Scroll intern; no una segona configuració del
  mateix objecte.
- **Header/footer:** marca, ajuda i condició de proposta; sense duplicar
  mètriques ni afegir pestanyes que desplacin la vista central.

Els controls de generació són explícits en aquest primer prototip. A la
implementació final convé conservar l'actualització automàtica d'edificis
ja existent per a retocs simples després de la primera incorporació,
mostrant si el canvi està pendent, en cua o aplicant-se. L'usuari ha de
validar aquest equilibri entre acció explícita i resposta automàtica.

## Mida, escala i territori

La mida útil d'impressió és un límit físic per peça, separat de les
dimensions totals del projecte. El prototip mostra el recompte de peces
abans de triar el lloc. Els límits de 15/18/20/25 cm són una proposta de
control; **l'exportador actual continua dividint a 20 cm**. No es presenta
un suport arbitrari de llits d'impressora com a funcionalitat implementada.

En passar a producció, mantenir una única representació de l'escala:
segons el mapa, o un denominador explícit si l'usuari el demana. Cap segon
selector redundant. El retall al mapa i les mides reals han de coincidir
amb aquesta decisió abans de preparar el terreny.

Quan es modifica una mida ja definida:

- Mateixa proporció, escala segons el mapa: proposta de conservar el
  territori i canviar l'escala física. Les dades es poden reutilitzar;
  les malles i els mínims imprimibles s'han de recalcular.
- Proporció diferent: no deformar el mapa. Conservar centre i gir, mantenir
  l'amplada real i adaptar l'alçada al nou retall uniforme. Mostrar la nova
  extensió abans d'aplicar-la; pot requerir dades addicionals.
- Escala explícita: respectar-la i mostrar com canvia el territori cobert.
  No canviar silenciosament de mode per fer encaixar la peça.

El prototip mostra invalidació i conservació, però no implementa aquesta
reprojecció cartogràfica. El comportament exacte és una decisió de disseny
pendent de revisar amb l'usuari.

## Matriu d'impacte proposada

«Reutilitzar» és un objectiu del pilot, no una promesa de rendiment mesurat.
Les petjades i les malles de color/substrat són dependències diferents.

| Canvi | Recalcular | Reutilitzar | Edicions i vista |
| --- | --- | --- | --- |
| Navegar entre passos / càmera | Presentació | Totes les dades i malles | Cap modificació de traços ni reenquadrament |
| Materials / colors | Agrupació i aparença | Geometria de totes les capes | No ometre elements per tenir menys colors |
| Límit útil de cada peça / partició | Pla de peces i exportació | Model complet coherent | Conservar retall i càmera |
| Mida total / escala / lloc / gir | Projecció, malles, mínims físics i dependents | Fonts cobertes per la mateixa regió, quan sigui possible | Traços ancorats al territori; els de fora es conserven ocults |
| Exageració / detall / font de relleu | Camp de terreny i tots els elements que hi recolzen o l'excaven | DEM/vectors originals compatibles | Reancorar al terreny, sense esborrar la història del pinzell |
| Mostrar arbres / forma | Capçades i col·lisions que canviïn per dimensió | Terreny, vies, edificis i traços | Activar/desactivar no buida l'historial |
| Densitat / radi del pinzell | Només traços nous | Bosc actual i traços anteriors | Capturar els paràmetres a cada gest |
| Realç de camins / rails | Paviment, unions i llums que canviïn | DEM, camp d'altures i petjades no afectades | Reconciliar arbres només si canvia la màscara efectiva |
| Activar túnels / canviar transport | Capa viària i còpia del substrat afectat | Substrat original, fonts i edificis compatibles | Nou resultat atòmic; mai perforar repetidament la mateixa malla ja excavada |
| Font/petjades d'edificis | Edificis, suports que hi col·lideixin i arbres afectats | Terreny, taulers i cavitats compatibles | Traços intactes; resum dels canvis visibles |
| Altura/coberta amb la mateixa petjada | Edificis | Terreny, arbres i pilars amb màscara idèntica | No exigir una nova revisió de la mateixa ocultació |

En alguns canvis de font només es poden conèixer les petjades afectades
després de carregar dades. Comparar-ne la identitat/revisió abans de decidir
si cal recalcular suports i vegetació, en lloc d'invalidar tot el model.

## Estats, retorn i recuperació

| Estat visible | Significat | Accions |
| --- | --- | --- |
| Pendent | No hi ha capa, o hi ha configuració nova per aplicar | Preparar/aplicar; conservar la vista anterior si existeix |
| En curs | Hi ha un treball actiu amb una revisió concreta | Mostrar progrés; cancel·lar només si és viable; impedir accions incompatibles |
| A punt | Resultat coherent amb les dependències confirmades | Avançar o tornar enrere |
| Omesa | Decisió explícita de no incorporar una capa opcional | Permetre descàrrega i futura incorporació |
| Revisa arbres | Han aparegut obstacles que oculten arbres manuals nous | Revisar, acceptar l'ocultació o desfer el canvi de capa |
| Error | La configuració nova no s'ha pogut aplicar | Reintentar o recuperar els ajustos anteriors; conservar la vista vàlida |

Una capa desactualitzada no es presenta com a preparada perquè encara
tingui una malla visible. La descàrrega espera totes les capes preparades
o explícitament omeses i les revisions manuals resoltes.

**Pinzell:** guardar la intenció geogràfica del gest, mode, radi, densitat,
ordre i llavor. Separar els traços de les capçades que actualment es poden
mostrar. Una màscara de vies/edificis pot ocultar punts sense eliminar-ne
el registre; en treure l'obstacle reapareixen. Reproduir afegir/esborrar en
ordre. Els traços de fora del retall queden associats al seu territori.
La forma canònica geogràfica és arquitectura proposada; els traços de
`main.js` encara són locals en mil·límetres i no la implementen.

**Desfer:** separar últim gest, darrer canvi de capa i recuperar ajustos
després d'error. Desfer una capa no ha d'eliminar traços afegits després.
El prototip inhabilita desfer capa si hi ha configuració pendent, perquè
no pugui descartar-la implícitament.

**Cancel·lar:** la demostració cancel·la una espera simulada. No acredita
cancel·lació de CSG real. A producció cal diferenciar abortar una petició,
interrompre una feina del Worker i descartar un resultat obsolet. Cancel·lar
no pot deixar el Worker amb un model diferent del preview/exportació.

## Pilot productiu i treball següent

1. Introduir estat de projecte separat de la UI: configuració desitjada,
   revisions aplicades de dades/malles, feina activa i últim model vàlid.
   Les claus han de distingir terreny, transport, edificis i vegetació.
2. Deixar de buidar `strokes` a l'inici de `generate()`. Conservar un registre
   durant la petició i confirmar el resultat atòmicament. Primer pilot
   petit: un error en canviar mida/lloc no perd el pinzell.
3. Adaptar el recalculat ja existent d'edificis/vegetació a revisions i
   comparar màscares; mantenir materials com a canvi de presentació.
4. Separar després terreny base i transport, amb substrat original immutable
   i actualització viària pròpia. Aquest punt depèn dels encaixos de RO-052:
   no executar-lo com una reorganització de menús mentre la geometria falla.
5. Aplicar la nova navegació gradualment, amb recorreguts reals i mesures
   per etapa. Un únic propietari integra el motor transversal; el disseny
   visual i les verificacions independents poden avançar en paral·lel.

No es proposa repartir simultàniament quatre generadors al portàtil.
Primer cal mesurar temps, reutilització i pic de memòria de cada etapa.

## Què demostra el prototip

- Navegació entre els sis moments, controls conservats i càmera estable.
- Confirmació de mida/territori, quatre estats de capa i omissions explícites.
- Pinzell il·lustratiu, afegir/esborrar en ordre i traços conservats en
  aplicar obstacles, desfer o canviar de territori.
- Revisió dels arbres afectats, sense exigir-la de nou per la mateixa
  ocultació ja acceptada; exportació de revisió condicionada a coherència.
- Canvis pendents, espera de demostració de 450 ms, cancel·lació, error
  simulat i recuperació d'ajustos sense perdre els traços.
- Canvi d'1/2/4/8 materials sense eliminar elements.

**No demostra:** cerca real, mapes, dades de Rajadell/Tamariu, DEM, mètriques
de càlcul, imprimibilitat, 3MF/STL, reconstrucció incremental del motor,
reprojecció geogràfica exacta ni persistència en tancar la pàgina. Les dues
localitzacions etiqueten escenaris; el paisatge SVG és esquemàtic. Les
coordenades que registra l'estat il·lustren un contracte de traços, no una
integració cartogràfica. No hi ha connexions de xarxa ni llibreries noves.

Fitxers: `index.html`, `prototype.css`, `prototype.js` i `state.js`, tots
al directori públic del prototip. Estils derivats dels tokens i patrons
existents; no es canvien els CSS ni la UI productius.

## Verificació i revisió pendent

Verificacions lleugeres executades: **36 comprovacions d'estat/estàtiques
correctes** amb Node a 128 MB, més `node --check` dels dos JS. Inclouen
prerequisits, cancel·lació, error i retorn, invalidacions, revisió de
traços, altura sense màscara nova, reconciliació de font, esborrar/pintar
en ordre, desfer sense perdre edicions/càmera, canvi de mida fallit,
arxiu de traços d'un altre territori, omissions i bloqueig de descàrrega.
IDs estàtics únics i referències existents; cap `fetch`, Worker ni petició
de servei al script. No s'han executat proves de geometria ni build des
d'aquesta línia delegada.

Revisió visual local completada per l'agent principal a **1280×720 i
1600×900**: sis passos, header/footer visibles, controls amb scroll intern,
navegació per teclat, quatre capes a punt, revisió abans de descarregar,
canvi a 40×40 cm / quatre peces i retorn després d'un error simulat.
També s'ha comprovat un traç manual conservat amb tres arbres ocultats en
afegir vies, revisió explícita i bloqueig de descàrrega fins a resoldre-la.
La recuperació d'ajustos s'ha mogut al missatge central perquè es vegi
encara que el sidebar dret estigui desplaçat. «A punt» evita flexions
incorrectes d'estat i el recompte de traços distingeix singular/plural.
La pàgina mesura exactament 1600×900 a la segona revisió, sense scroll
general; els sis accessos de navegació queden entre header i footer.
Captures locals a `output/ro053-1280-ready.png` i
`output/ro053-1600-ready.png` (no formen part del paquet publicat).

L'usuari ha validat l'ordre i ha demanat provar les accions al costat
del títol. El producte i la demostració ja les hi situen. Queda pendent
la revisió d'ús de la nova disposició i el càlcul separat de terreny/vies.
RO-053 continua obert, igual que les validacions d'impressió de RO-052.
