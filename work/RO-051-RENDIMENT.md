# RO-051 — Diagnòstic de rendiment en l'equip de 64 GB

2026-11-02. Represa des de `c74e992` / v0.18.1. Seguiment de decisions i
validacions al [backlog](BACKLOG.md#ro-051--perfils-de-carreteres-principals).
L'estratègia geomètrica i els seus límits continuen a
[RO-051-PERFILS-VIARIS.md](RO-051-PERFILS-VIARIS.md).

Entrega **v0.18.2**: els [controls 3MF](../public/controls/ro-051/README.md)
s'incorporen al repositori i a la publicació estàtica, idèntics als fitxers
auditats de `output/` (SHA-256 comprovat). L'usuari demana commit i push
després de cada iteració validada i agents per a subtasques independents.

**Revisió d'usuari posterior: RO-052 obert.** S'observen discontinuïtats
i canvis d'amplada entre superfície, viaductes i túnels. La validació
numèrica d'aquest informe no acredita la coherència visual del traçat.
La correcció conjunta de calçada/unions es registra al backlog; encara
no forma part de v0.18.2.

**El prototip continua desactivat per defecte i sense selector a la UI.**
Aquest diagnòstic l'activa explícitament amb `majorRoads:true`. Una
execució que recupera els camins anteriors no valida l'aplicació dels
perfils, encara que el procés acabi sense error.

## Condicions de mesura

- Mateix ordinador: AMD Ryzen 9 7900X, 63,10 GiB de RAM visible pel
  sistema, Node v24.14.0 i dependències del lockfile de v0.18.1.
- Mostra local `eix-diagonal`, sense serveis remots. Retall de 3 × 3 km,
  centre 41.72213, 1.779785; maqueta de 150 × 150 mm; detall 12;
  edificis OSM. Arbres i túnels desactivats en aquesta comparació.
- Una sola operació pesada alhora. Procés de geometria amb heap màxim
  de 1.536 MB. Un procés pare comprova la RAM lliure cada 500 ms,
  exigeix almenys 4 GiB per iniciar i atura només el fill que ha creat
  si el marge baixa d'1,6 GiB o s'esgota el temps establert.
- `seconds` mesura la construcció del model. `wallSeconds` inclou també
  arrencada, lectura/descodificació local i, quan es demanen, auditoria
  i exportació. No s'han de barrejar els dos valors.
- Són execucions individuals, no mitjanes estadístiques. Tampoc mesuren
  la resposta completa del navegador amb arbres, mapa i interacció.

La referència original es va executar amb una còpia temporal de
`src/geometry.js` extreta de `c74e992`, mantenint les dependències i les
dades locals del mateix equip. No es va canviar la còpia de treball per
fer aquesta comparació.

## On es perd el temps

La referència original completa en **189,274 s**, amb **14 perfils
aplicats**, sense recuperació dels camins previs. És la primera mesura
completa d'aquest retall en aquest equip; els 416 s interromputs al
portàtil no són una mesura completa comparable.

La primera execució instrumentada, amb les operacions originals, es va
aturar expressament als 90 s. Havia acabat cinc de les catorze unions
d'obstacles i estava calculant la sisena:

| Fase | Temps observat |
| --- | ---: |
| Màscara conjunta dels perfils | 0,005 s |
| Diferències sobre les peces de calçada | 0,031 s |
| Reconstrucció de cobertura viària | 11,906 s |
| Reconstrucció de bosc i terra nua | 1,493 s |
| Obstacles dels pilars: cinc perfils acabats | 53,950 s |
| Obstacles: cost per perfil acabat | 10,43–11,18 s |

La preparació de cada plataforma recorria les 601 peces de camins i
reconstruïa una unió global de la xarxa, tot i que els seus pilars només
poden col·lidir amb obstacles propers al tauler. Aquest treball es
repetia catorze vegades. El coll d'ampolla acreditat és aquesta unió
global repetida; la RAM lliure es va mantenir per damunt de 43 GiB en la
referència i en la primera mesura instrumentada.

La cobertura viària també té un cost rellevant d'uns 12 s. La fase
«Integrant les vies principals amb les capes…» agrupava aquests treballs
i impedia distingir-los només amb els missatges de progrés anteriors.

## Optimització i comprovació geomètrica

El canvi final conserva **les mateixes operacions, coordenades i ordre
d'unió d'obstacles que la referència**. En difereix la construcció fins
que `planPiers` troba un candidat elevat que requereix comprovar una
col·lisió. `deferredObstacleMask`, a `src/bridge-completion.js`, conserva
el resultat per reutilitzar-lo en altres candidats i actualitzacions.
Les plataformes que reposen sobre el terreny i no necessiten aquesta
comprovació no construeixen la màscara.

Les col·lisions continuen usant geometria vectorial completa. No s'hi
introdueix una aproximació rasteritzada, un filtre espacial ni una reducció
de precisió. El propòsit és evitar treball no utilitzat, sense canviar la
petjada dels obstacles ni els criteris de col·locació dels pilars.

S'han rebutjat explícitament aquestes variants més agressives:

- Retall local d'obstacles i selecció de polígons per envolupant: la fase
  baixava a 0,10–0,14 s, però alterava el resultat de les comprovacions
  de suports i recuperava els camins previs. Ni els 51,674 s de la variant
  de polígons complets ni els temps similars del retall acrediten una
  acceleració funcionalment acceptable. Codi i proves espacials retirats.
- Màscares viàries limitades als identificadors de cada perfil i retall
  anticipat de les peces de calçada: han exposat fragments amb volum
  negatiu o nul en assignar material. També s'han retirat. No s'atribueix
  aquest error a `c74e992`, que sí completa els catorze perfils.

## Resultat de la construcció diferida

| Mesura de 3 km / 150 mm / detall 12 | Referència `c74e992` | Construcció diferida |
| --- | ---: | ---: |
| Construcció del model | 189,274 s | **56,638 s** |
| Temps total del procés | 189,571 s | 57,789 s, amb auditoria i exportació |
| Perfils aplicats | 14 | 14 |
| Unions globals d'obstacles construïdes | 14 | **2** |
| Memòria mínima lliure observada | 43,78 GiB | 42,97 GiB |

La construcció del model triga **un 70,1% menys**, equivalent a una
acceleració de **3,34 vegades** en aquesta execució. Les dues unions que
encara es necessiten duren 10,481 i 10,656 s; les dotze altres no es
calculen. No s'ha paral·lelitzat el càlcul ni modificat els pressupostos
geomètrics.

La comparació exacta dels resums JSON conserva la llista d'omissions i
tots els identificadors, recomptes de pilars i llums màximes de
`completion`. El viaducte conegut manté vuit pilars i llum mostrejada
màxima de 5,92654 mm. El perfil principal que rep tres pilars conserva
una llum màxima de 3,31717 mm; l'altre perfil que requereix comprovar
obstacles, sense pilars col·locats, conserva 5,98453 mm. Aquest control no equival a una
comparació de tots els buffers ni a una validació d'impressió.

Les set categories presents superen `auditPart` sense errors. S'ha
generat `output/RO-051-3km-150mm.3mf`, amb els catorze perfils aplicats
i sense recuperar els camins previs. Túnels i arbres estan desactivats
en aquest control; no s'ha de fer servir per validar-ne el comportament.

## Controls a diferents retalls i detalls

Tots els controls següents fan maquetes de 150 × 150 mm amb arbres
desactivats. El temps és el de construcció del model, no inclou auditoria
ni exportació. Les files amb fonts o detall diferents no són comparacions
de rendiment entre si.

| Retall, detall i fonts | Temps | Perfils aplicats | Resultat local |
| --- | ---: | ---: | --- |
| 1,5 km, detall 12, OSM, sense túnels | 4,289 s | 0 | Recupera els camins previs per un component de volum nul; incidència preexistent |
| 2,4 km, detall 12, OSM, sense túnels | 18,907 s | 6 | Aplicats; una omissió per creuament amb pont sense cota acreditada; set categories auditades sense errors |
| 3 km, detall 12, OSM, sense túnels | 56,638 s | 14 | Aplicats; omissions i resums de suports iguals a la referència; set categories auditades sense errors |
| 1,5 km, detall 36, ICGC i túnels | 10,625 s | 4 | Aplicats sense omissions viàries; sis categories auditades sense errors; un túnel excavat i un altre omès per manca de coberta contínua |

El cas de 1,5 km / detall 12 també recupera els camins previs amb el codi
original de `c74e992` en 5,580 s. S'han comparat exactament els camps
`major` i `completion`, incloent el missatge de volum nul. No és una
regressió del canvi diferit, però **continua sense ser un control de
perfils aplicats**. El fet que el model recuperat superi l'auditoria no
resol aquesta incidència.

El control de detall 36 amb ICGC conserva onze pilars al viaducte i dos
pilars nous, amb llum mostrejada màxima de 3,68010 mm als perfils nous.
S'ha generat `output/RO-051-Rajadell-tunels-150mm.3mf`. Inclou paviment del
túnel, però l'auditoria de la malla no substitueix comprovar portals,
materials, buits i suports al laminador.

## Estat de les proves automatitzades

La primera suite ordinària ha executat 337 casos: 336 correctes i una
fallada de la fixture d'internacionalització. El mateix cas falla amb
`c74e992`: usava un identificador de llengua inexistent i depenia del
format alternatiu que tria `Intl` en aquest sistema. S'ha corregit només
la fixture perquè usi `en-GB`, i les 17 proves d'internacionalització
passen. Això no modifica la configuració d'idioma de l'aplicació.

Validació final: **344/344 proves úniques correctes**, sense salts ni
casos pendents dins de la suite. Una sola operació pesada alhora:

| Bloc | Casos | Temps | Heap | RAM mínima lliure |
| --- | ---: | ---: | ---: | ---: |
| Ordinari final | 338/338 | 37,883 s | 512 MB | 43,89 GiB |
| `bridge-support-scales` | 2/2 | 45,649 s | 1.536 MB | 43,43 GiB |
| `tunnel-model` | 4/4 | 76,270 s | 1.536 MB | 43,05 GiB |

La regressió nova comprova que una plataforma a nivell de terra no
construeix la màscara, que la plataforma elevada dona els mateixos
pilars que el càlcul immediat i que reutilitza la màscara en consultes
posteriors. La prova integrada afegida força una edició de petjades
d'edificis: es tornen a comprovar els obstacles, però la màscara viària
no es reconstrueix. Les regressions existents conserven DEM/camp d'altures,
recuperació atòmica, túnels, escales i procedència exportada.

Build correcte en 2,86 s, amb els avisos previs de mida del paquet i
externalització de `node:module` a Manifold. RO-051 continua obert pel
component nul d'1,5 km / detall 12, les màscares multipart i la validació
d'usuari/laminador/impressió. Les proves correctes no tanquen aquests casos.

## Reproducció

Executar seqüencialment des de l'arrel del repositori:

```powershell
node scripts/benchmark-major-roads.mjs 3 150 12 --timeout=120 --output=output/ro051-3km.json --verify
node scripts/benchmark-major-roads.mjs 1.5 150 12 --timeout=120 --output=output/ro051-15km.json --verify
node scripts/benchmark-major-roads.mjs 2.4 150 12 --timeout=120 --output=output/ro051-24km.json --verify
```

El control de més detall amb ICGC i túnels es demana separadament:

```powershell
node scripts/benchmark-major-roads.mjs 1.5 150 36 --timeout=120 --output=output/ro051-control.json --icgc --tunnels --verify --export=output/RO-051-control.3mf
```

L'opció d'exportació rebutja una execució que hagi recuperat els camins
anteriors. Cal llegir igualment `result.major.applied`, les omissions,
l'auditoria i els suports: un codi de sortida correcte del diagnòstic
sense exportació no equival a catorze perfils aplicats.

Els JSON i els 3MF originals de `output/` són artefactes locals ignorats
per Git. Les còpies dels dos 3MF acceptats a `public/controls/ro-051/` sí
formen part de v0.18.2 i es poden descarregar des del repositori o de
Pages. Els logs i les variants rebutjades continuen només en local.
Evidència actual:

- `output/ro051-original-3km.json`: referència completa de `c74e992`.
- `output/ro051-before-3km.json`: instrumentació original, interrompuda
  als 90 s; útil per fases, no com a temps total.
- `output/ro051-after-3km.json`, `ro051-after-3km-v2.json` i
  `ro051-final-3km.json`: variants de cobertura descartades.
- `output/ro051-optimized-3km.json`: variant local d'obstacles que arriba
  a les comprovacions de suports però recupera el model anterior.
- `output/ro051-final-whole-polygons-3km.json`: filtre de polígons
  complets; també recupera el model per la comprovació de suports.
- `output/ro051-final-deferred-3km.json`: construcció diferida acceptada,
  amb 14 perfils aplicats, auditoria i exportació 3MF.
- `output/ro051-final-15km.json` i `ro051-original-15km.json`: recuperació
  preexistent per volum nul, comparada amb la referència.
- `output/ro051-final-24km.json`: sis perfils aplicats i auditoria.
- `output/ro051-final-control-icgc.json`: quatre perfils aplicats, túnel
  excavat, auditoria i 3MF de control.

## Passos següents i validacions

1. Agent, completat: comparar 3 km amb els mateixos perfils, omissions,
   recomptes de suports i llums que la referència, sense recuperació.
2. Agent, completat: controls de 1,5 / 2,4 / 3 km i detall 36 amb ICGC i
   túnels, registrant errors, omissions i pilars. El cas de 1,5 km / detall
   12 queda obert per la recuperació preexistent, no es marca com a acceptat.
3. Agent, completat: 344 proves i build; regressions de memòria cau,
   altures, retall, actualitzacions incrementals, recuperació i procedència.
4. Usuari: revisar els dos 3MF publicats a `public/controls/ro-051/`: continuïtat
   del paviment, connexions als extrems, pilars i passos inferiors al de
   3 km; portals, paviment del túnel i materials al de Rajadell. El primer
   no inclou túnels/arbres; el segon inclou ICGC i túnels, sense arbres.
   El prototip encara no té selector a la UI.
5. Usuari: revisar el 3MF al laminador, materials i buits, i imprimir un
   cupó petit abans d'impressions llargues. Agent: valorar després si es
   pot activar el prototip.
6. Agent, següent lot: aïllar el component nul d'1,5 km / detall 12,
   després reprendre el cas multipart per identificador i fragments
   estrets. Conservar volums positius i recuperació atòmica. Si es reprèn
   el filtratge espacial, capturar primera col·lisió divergent i registrar
   motor/tolerància de polígons; no atribuir-ne encara la causa. Mesurar
   el cost restant de cobertura abans de decidir si cal paral·lelització.

No s'han comprovat Pages ni CI remotament. L'auditoria local, la revisió
visual d'usuari, el laminat i la impressió són validacions diferents.
