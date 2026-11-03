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
