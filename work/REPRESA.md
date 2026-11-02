# Represa en un altre ordinador — v0.18.1

Punt de tancament del 2026-11-02, a petició de l'usuari per passar a un
equip amb 64 GB de RAM. Llegir primer AGENTS.md, DESIGN.md i BACKLOG.md.
Les anotacions originals de MILLORES-BUGS.md s'han conservat intactes.

## Què es publica

- Túnels estimats activats inicialment a la interfície, amb volta
  parabòlica i paviment de camí/ferrocarril de 0,3 mm. Base protegida,
  colors sense volums superposats i transacció de sòlids fins al resultat
  final. El túnel principal de Rajadell passa al control real.
- RO-051 queda com a prototip **desactivat per defecte**, sense selector
  a la UI. Només funciona si es passa `majorRoads:true` explícitament a
  `buildModel`. L'aplicació publicada manté el tractament anterior dels
  camins. No activar-lo automàticament abans de resoldre el cost als 3 km.
- Codi, regressions, límits i procedència de l'envolupant conservats per
  reprendre la feina sense reconstruir-la. No s'ha publicat el prototip
  anterior de tall/terraplè: la decisió és conservar el terreny i afegir
  suports estimats.

## Primer objectiu: RO-051

L'envolupant funciona al control de 1,5 km / 150 mm / detall 36: quatre
perfils, dos pilars nous, llum mostrejada màxima de 3,681 mm i onze pilars
al viaducte conegut. Un túnel principal també s'aplica. Els controls de
conservació exacta del DEM i del camp de terreny passen.

El cas problemàtic és la mostra inclosa amb edificis OSM, centre
41.72213, 1.779785, retall de 3 km, 150 mm i detall 12. Els perfils i
comprovacions acaben en uns 18 s; després «Integrant les vies principals
amb les capes…» pot ocupar minuts. La prova completa es va interrompre
als 416 s, amb CPU activa i almenys 4,37 GB de RAM lliure. Això no acredita
un problema causat només per manca de memòria; més RAM no assegura resoldre
aquest cost geomètric.

Altres controls del prototip: 1,5 km / 150 mm / detall 12 acaba en 8 s
però recupera els camins anteriors davant error; cal capturar-ne el motiu.
2,4 km / 150 mm / detall 12 acaba en 36 s amb sis perfils. No confondre
aquests resultats amb la UI publicada, on el prototip queda apagat.

### Reproducció sense navegador ni serveis remots

Des de l'arrel del repo, amb dependències del lockfile instal·lades i una
sola operació pesada en marxa:

```powershell
node --max-old-space-size=1536 scripts/diagnose-major-roads.mjs 3 150 12
```

El script mostra fases i temps, usa les quatre tessel·les incloses i
activa explícitament el prototip. Té ajuda amb `--help`. La ruta completa
de 3 km no s'ha deixat acabar; pot trigar minuts. Vigilar memòria amb un
procés independent, com indiquen les instruccions del projecte.

Captura d'un error del motor ràpid de polígons:
`work/repro/RO-051-polygon-failure.json.gz` (JSON gzip amb operació,
arguments XY, error i pila). És una mostra real, encara sense reduir al
cas mínim. Descomprimir amb `node:zlib.gunzipSync`; no cal descarregar
dades. No afirmar que aquesta primera captura explica tota la lentitud.

### Punts concrets a revisar

1. Discriminar temps del merge de màscares, difference de les peces,
   reconstrucció de cobertura i preparació de suports: el missatge actual
   engloba més d'una operació.
2. `geometry.js` resta cada peça d'un ID acceptat contra la màscara GLOBAL
   de tots els perfils. Fer un índex per ID amb les seves pròpies màscares
   i filtrar proximitat. A més del cost, el cas multipart pot esborrar
   paviment aliè sota un altre perfil del mateix lot.
3. `supportRoadPoly` de cada plataforma reconstrueix una unió global de
   tots els altres camins. Amb catorze perfils es repeteix catorze vegades.
   Comprovar si es pot passar un MultiPolygon sense unir a `polygonTester`,
   que només necessita la cobertura, mantenint les col·lisions amb altres
   camins i edificis. Mesurar abans/després.
4. Conservar els controls de creuaments amb cotes XYZ i realç ferroviari,
   la recuperació atòmica, els ancoratges originals i les màscares només
   dins del retall físic. No afegir excepcions geogràfiques per esquivar-ho.
5. Una vegada resolt, provar una escala cada vegada, després el bloc
   integrat complet, i només llavors decidir l'activació a la UI.

## Validació i publicació

Resultats finals de proves/build/revisió al registre v0.18.1 de
HISTORIAL.md. La suite ordinària i els dos fitxers exigents s'executen en
blocs separats, amb una única operació pesada alhora. No presentar el lot
interromput del prototip com una prova superada.

L'usuari comprova manualment Pages/CI; no cal verificació remota després
de validar localment. Següent validació funcional: portals arquejats,
terra de material camí, laminat i cupó petit abans d'impressions llargues.
RO-051 queda obert; RO-034 també conserva validació d'usuari i impressió
pendents. No hi ha tasques delegades pendents d'acceptar.
