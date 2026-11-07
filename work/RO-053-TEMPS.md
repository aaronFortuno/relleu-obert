# RO-053 — Temps de generació

Després de generar una maqueta, obre **Dades i limitacions** i prem
**Descarrega els temps de generació**. El navegador conserva l’informe
de la darrera generació de la sessió, inclosos errors. El fitxer es
genera localment i conté les coordenades i els ajustos del retall.

## Lectura del JSON

- `selection` i `settings` recullen la selecció i els ajustos quan es va
  iniciar la feina. `data` recull el retall i les fonts rebudes. Si
  `reusedRegion` és cert, s’han reutilitzat les dades del retall anterior.
- `sources` recull les durades de càrrega de les fonts, amb un registre per
  tessel·la en la cartografia vectorial. El temps de relleu inclou la
  descodificació. Si s’ha demanat el Catastre a la generació inicial,
  `cadastralBlocks` recull el moment en què arriba cada bloc.
- `worker.stages` i `worker.operations` donen dues vistes del mateix
  temps de càlcul. `worker.diagnostics` conté operacions internes que
  poden estar imbricades. S’han de comparar per separat.
- `firstTerrainPreviewMilliseconds` mesura fins que el primer relleu
  s’incorpora al visor. `displayMilliseconds` mesura la preparació del
  model final al visor. Aquestes durades exclouen el temps de la GPU
  després de preparar la vista.
- `totalMilliseconds` és el temps transcorregut des de l’inici fins al
  resultat o l’error. Els informes de navegador exclouen el pic de
  memòria del procés. Els controls Node l’inclouen a
  `peakProcessRSSBytes` i compten el primer relleu quan el motor el
  posa a disposició de la vista.

## Reproducció dels controls

Executa’ls seqüencialment, amb 2,5 GiB lliures inicials i el monitor de
memòria del projecte.

```sh
node --max-old-space-size=512 scripts/measure-processing.mjs tamariu
node --max-old-space-size=512 scripts/measure-processing.mjs millau
```

Els informes es desen a `output/`. Tots dos controls fan servir una peça
de 150 mm, detall 12, exageració ×1,5, edificis OSM, túnels activats i
vegetació desactivada. El control de Tamariu (650 m) fa servir les
tessel·les de la mostra local i el de Millau (3 km) consulta les fonts
remotes. Aquestes dues càrregues de dades es mesuren en condicions
diferents.

## Capa d’edificis a la v0.23.1

Control seqüencial amb la v0.23.0 i la v0.23.1. Cada procés genera el mateix relleu amb el mateix DEM i aigua i mesura a part la incorporació de la capa d’edificis. El càlcul de vies, ponts i vegetació queda fora del control. No s’inclou el temps de la xarxa. Tots dos retalls són a 1:10.000 i amb exageració ×1,5.

| Retall | Fragments | Capa d’edificis abans | Capa d’edificis després | Integració i acabat abans → després |
| --- | ---: | ---: | ---: | ---: |
| Amsterdam, 1,4 × 1,4 km · 52,3695 N, 4,8915 E · detall 64 | 6.425 | 40,5–63,5 s | 30,1 s | 15,5–16,2 → 1,7 s |
| Tamariu, 1,8 × 1,8 km · mostra ICGC · detall 36 | 631 | 3,5 s | 0,86 s | 0,20 → 0,05 s |

Els hashes dels vèrtexs, les cares i les metadades són idèntics entre revisions per a cada retall. La superfície de la màscara coincideix i les 22.801 mostres de cada retall donen la mateixa cobertura. La variació entre les dues execucions d’Amsterdam afecta sobretot la preparació de petjades. Les xifres descriuen la capa d’edificis. Queda pendent repetir la maqueta sencera a 25 × 25 cm i mesurar la integració viària.

## Amsterdam amb totes les capes · v0.23.27

Singelgracht, centre 52,3695 N, 4,8915 E, peça de 25 × 25 cm a 1:10.000. Mapterhorn i OSM via OpenFreeMap, exageració ×1,5, arbres, túnels, perfils suaus i edificis amb altura de la font. La galeria obre el retall amb detall alt. El control en detall equilibrat manté l’escala i el retall. Les mesures són del motor local en Node, amb dades descarregades de nou i sense el cost de dibuixar el visor.

| Control | Primer relleu o entrada a vies | Resultat |
| --- | ---: | --- |
| 25 × 25 cm, detall alt, heap de 512 MiB | 133,4 s, entrada a vies | El heap s’esgota durant vies. |
| 25 × 25 cm, detall alt, heap de 1.024 MiB | 82,3 s, entrada a vies | Aturat durant vies quan la memòria lliure baixa a 1.587 MiB. |
| 25 × 25 cm, detall equilibrat, heap de 768 MiB | 99,0 s, primer relleu | El heap s’esgota durant vies. |
| 10 × 10 cm, detall alt, heap de 512 MiB | 10,09 s, primer relleu | Complet en 32,16 s, pic del procés de 580 MiB. Set malles auditades. |

Les peticions inicials de dades triguen de 2,5 a 3,1 s en aquests controls. Les durades fins a vies varien amb la pressió de memòria i el límit de heap. Les proves del retall gran no donen un temps total ni un recompte final de ponts.

```sh
node --max-old-space-size=512 scripts/measure-processing.mjs amsterdam --centre
node --max-old-space-size=1024 scripts/measure-processing.mjs amsterdam
node --max-old-space-size=768 scripts/measure-processing.mjs amsterdam --balanced
```

El retall `--centre` manté el centre, l’escala i el detall alt en una peça de 10 × 10 cm. Les tres variants escriuen un informe separat a `output/` quan acaben. Els ponts sobre aigua inclouen una mesura geomètrica a l’eix i els IDs cartogràfics. Un eix omès als avisos pot ser un fragment i no correspon necessàriament a un pont físic. El laminat continua sent una comprovació separada.

Al retall de 10 × 10 cm, les vies ocupen 16,20 s. Dins d’aquesta fase, el muntatge del paviment regional costa 14,02 s i acaba aplicant-se a un fragment. És el primer punt a aïllar per optimitzar la integració del paviment. El relleu costa 8,94 s i la fase d’edificis, 5,77 s. El control acaba amb 954.596 triangles, 2.770 edificis i 83 taulers procedimentals. En 51 dels 81 taulers mostrejats sobre aigua, la llum mínima a l’eix és d’almenys 0,24 mm. Un eix queda omès per un revolt massa tancat. Aquests recomptes pertanyen al retall de control. Els tres ponts absents observats per l’usuari en el seu render no estan identificats.

## Primera mesura

| Retall | Temps total | Primer relleu | Pic de memòria del procés |
| --- | ---: | ---: | ---: |
| Tamariu, 650 m | 1,36 s | 1,09 s | 190 MiB |
| Millau, 3 km | 42,36 s | 9,57 s | 419 MiB |

A Millau, la cerca i comprovació de suports sumen 31,58 s, la unió
dels ponts 0,05 s i la delimitació de les capes del relleu 6,45 s.
El bloc que completa els ponts s’executa durant la fase d’edificis
perquè els pilars en necessiten les petjades. Les dues malles superen
l’auditoria. Les durades corresponen a aquest equip i aquests ajustos.

## Sant Llorenç de Munt, v0.19.15

Retall de 3.995 × 3.995 m, centre 41.636118, 1.965557, peça de
200 × 200 mm, detall 36, ICGC, túnels i arbres activats. A l’informe
del navegador anterior, el primer relleu arribava als 70,30 s i el
model complet als 83,31 s. Els controls locals Node separen la
delimitació de cada capa. Els temps de Node i navegador corresponen
a entorns diferents.

| Control Node | Polígons viaris | Primer relleu | Model complet |
| --- | ---: | ---: | ---: |
| Abans, aturat al primer relleu | 107,56 s | 132,69 s | — |
| Després, aturat al primer relleu | 4,35 s | 23,74 s | — |
| Després, model complet | 4,33 s | 22,63 s | 36,47 s |

Els controls posteriors inclouen el canvi d’amplades. Les malles
superen l’auditoria, inclosa la del model complet amb 12.000 arbres.
Construir les superfícies encara ha costat 14,65 s al control complet.
Un control amb la unió nova i les amplades anteriors ha mesurat
11,94 s als polígons viaris. Ha arribat al límit de heap de Node
(512 MiB) durant la construcció de superfícies, de manera que només
es compara l’operació viària en aquest control.

## Repetició de Millau, v0.19.15

Al control de 3 km amb els mateixos ajustos, el total ha passat de
42,36 a 28,91 s i el primer relleu de 9,57 a 4,60 s. Buscar i comprovar
els suports ha passat de 31,58 a 22,96 s. Els set ponts tenen el
mateix nombre de peces a la unió i la malla supera l’auditoria.
Els temps inclouen les variacions de càrrega de les fonts remotes.
