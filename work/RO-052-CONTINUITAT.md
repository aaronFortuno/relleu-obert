# RO-052 — Continuïtat i amplada de la calçada

**v0.19.2 · diagnòstic dels dos extrems de Rajadell.** Tots dos recorreguts
compatibles surten pel cantell nord abans que hi càpiga l'enllaç suau.
El tauler `ifc-132561` arriba al cantell; `ifc-114729` acaba 0,579 mm
abans i deixa un graó respecte de la carretera inferior. El diagnòstic
distingeix aquest cas d'una continuació curta que acaba dins del retall
i recomana ampliar o desplaçar la selecció. No s'ha estès artificialment
el tauler ni s'ha alterat la pendent admissible. La regressió sintètica
verifica que ampliar el retall recupera l'enllaç quan hi ha prou recorregut.

**Antecedent v0.19.1, correccions comprovades localment.** La regressió
del portal girat passa sense rebaixar toleràncies. També s'han corregit
plecs dels enllaços en revolts i metadades absents al JSON. **377/377 proves
ordinàries finals i sis proves integrades verificades.** Dos controls reals
regenerats amb túnels i auditoria sense errors. RO-052 continua obert:
dos extrems sense enllaç suau al quadrat, contrast general i revisió de
laminat/impressió pendents. [Represa actualitzada](REPRESA-RO-052.md).

## Correcció i verificació v0.19.1

El cas fallit de v0.19.0 tenia cotes de metadades correctes, però el
material real de la boca presentava el graó. `tunnel-pavement.js` conserva
el paviment que ja pertany a cada categoria i hi retira només el buit i
els paviments d'altres materials. Evita restar i tornar a unir la mateixa
regió sobre cares gairebé coplanàries abans de convertir a Float32.
La regressió comprova de nou eix/vores del model i del 3MF Bambu real.
No s'eliminen fragments positius ni es relaxa cap tolerància.

La suite ordinària va detectar quatre casos reals amb seccions plegades.
`bridge-completion.js` calcula les normals de vora als vèrtexs cartogràfics
i les interpola dins de cada segment, en lloc de girar cada secció
remostrejada cap al revolt veí. El primer angle reserva dins del tauler
la distància exigida per la mitra; els enllaços rectes mantenen el solapament
curt anterior. La regressió del primer revolt ara també construeix i
comprova el sòlid. No es desplaça el traçat ni es modifiquen XYZ mesurats.

La primera passada integrada va ser 5/6: el cas restant només perdia
`targetFeatureIds: undefined` en serialitzar. Ara la manca d'identificadors
és `[]`; la prova integrada afectada s'ha repetit i passa. No és una
nova passada conjunta de sis casos després d'aquesta correcció de metadades.

| Comprovació local al portàtil | Resultat | Temps | RAM lliure mínima |
| --- | --- | ---: | ---: |
| Selecció inicial de continuïtat/capes/3MF | 31/31 | 2,52 s | 4,94 GiB |
| Regressions reals i d'enllaços després de corregir plecs | 31/31 | 31,95 s | 4,61 GiB |
| Suite ordinària final, heap 512 MB | 377/377 | 58,57 s | 5,18 GiB |
| Dos fitxers integrats seqüencials, heap 1.536 MB | 5/6 inicials | 225,35 s | 3,77 GiB |
| Repetició integrada de paritat JSON corregida | 1/1 | 0,73 s | 5,42 GiB |

Una sola operació pesada alhora, llindars d'AGENTS.md vigilats i cap
interrupció per memòria. Compilació correcta en 3,72 s i revisió de la
versió compilada a 1280×720 i 1600×900: model inicial complet, exportacions
habilitades, quatre menús visibles i marc exterior absent. Detall a
l'historial de v0.19.1. Les comprovacions d'UX de RO-053 són independents.

## Controls reals regenerats

Edificis ICGC, sense arbres, exageració ×1,5, realç viari 0 mm,
ferrocarril +1 mm, detall 36 i RO-051 desactivat (`--surface-roads`),
igual que a la UI publicada. **3MF estàndard**, no projectes nadius Bambu.

| Control | Resultat i límits |
| --- | --- |
| [Rajadell 150×150 mm](../public/controls/ro-052/RO-052-Rajadell-150mm.3mf), 1,5 km, 1:10.000 | 10,24 s; mínim 4,46 GiB; un túnel i auditoria sense errors. Viaducte principal: 11 pilars, dos enllaços i llum màxima 8,919 mm. |
| [Rajadell 150×200 mm, 25°](../public/controls/ro-052/RO-052-Rajadell-150x200mm-gir25.3mf), 1,2×1,6 km, 1:8.000 | 6,31 s; mínim 5,30 GiB; un túnel i auditoria sense errors. Viaducte principal: 12 pilars, dos enllaços i llum màxima 7,879 mm. Tots els taulers acceptats tenen dos enllaços. |

Al quadrat queden dos avisos `no gentle join`: un extrem d'`ifc-114729`
(longitud disponible 0,755 mm; desnivell 0,283 mm) i un d'`ifc-132561`
(longitud disponible zero; desnivell 0,283 mm). Es conserven als diagnòstics;
no es força una rampa abrupta ni s'aplana el relleu per ocultar-los.
El rectangle no els reprodueix. Una auditoria de malles correcta no
converteix aquests extrems en unions validades.

Els informes detallats locals són `output/ro052-rajadell-final.json` i
`output/ro052-rectangle-final.json`. Es van generar des d'a72d787 amb
aquestes correccions encara sense commit; aquest és l'origen registrat,
no una prova feta després del commit final. Els controls PRE de
[repro/ro052](repro/ro052/README.md) es conserven com a evidència històrica.

## Fonaments incorporats a v0.19.0

Lot v0.19.0 iniciat el 2026-11-02. Seguiment al
[backlog](BACKLOG.md#ro-052--continuïtat-i-amplada-del-traçat-viari).
L'usuari observa salts del traçat i canvis d'amplada en les unions entre
carretera, viaducte i túnel dels controls 3MF de v0.18.2.

La correcció comparteix la política d'amplada i la identitat del traçat,
i resol els enllaços després de conèixer les plataformes i els portals
acceptats. Una malla tancada o una millora de rendiment no acrediten per
si soles la continuïtat del paviment.

## Amplada de calçada, estructura i buit

`src/transport-width.js` concentra la política de calçada per a la
superfície, els taulers estimats i el paviment dels túnels:

1. Amplada explícita vàlida de la font, en metres, entre 0,5 i 60 m.
2. Nombre enter de carrils entre 1 i 12, amb estimació de 3,2 m per carril.
3. Estimació de classe: motorway 14 m, trunk/primary/secondary/tertiary
   10 m, enllaços 7 m i altres classes 4 m.

La conversió usa l'escala horitzontal i un mínim físic de 0,44 mm de
calçada. No s'hi aplica l'exageració vertical. Els ferrocarrils mantenen
el seu tractament específic.

Els fragments amb amplades o identitats incompatibles no s'uneixen
heretant silenciosament els atributs del primer fragment. Els canvis
d'amplada queden explícits; l'ordre d'entrada no ha de decidir la secció.

**Tres dimensions diferents:**

- La calçada és la franja de material que representa la via.
- El contorn estructural d'un tauler mesurat, com els XYZ de l'ICGC,
  conserva les dades originals. No s'estreny ni se n'alteren les cotes
  per imposar una amplada estimada a tota l'estructura.
- El buit del túnel pot tenir una obertura mínima d'1,2 mm per a la
  representació imprimible, sense convertir tot aquest espai en carretera.

Per exemple, una calçada de 6 m a escala de 0,1 mm/m representa **0,6 mm
de paviment**, mentre l'obertura excavada pot continuar fent **1,2 mm**.
Aquesta diferència és deliberada; no justifica un eixamplament del
paviment a la boca.

## Identitat i continuacions

`src/transport-network.js` conserva identificadors de font, ref, nom,
classe, nivell, tipus viari/ferroviari i sentit. Les continuacions:

- Prioritzen identificadors, referència i nom compatibles sobre una via
  més propera sense la mateixa identitat.
- Rebutgen referències conegudes diferents i la barreja de carretera i
  ferrocarril.
- Canvien de línia als extrems compatibles; una intersecció interior no
  es converteix automàticament en una connexió.
- Admeten una projecció curta prop de l'extrem per compensar la
  generalització cartogràfica, amb tolerància explícita de 0,15 mm.
- Conserven cada segment i la seva amplada, en lloc de reduir tota la
  continuació a una única classe.

El recorregut físic d'un enllaç es pot fer des dels dos extrems d'una
via de sentit únic; la dada de sentit es conserva i no elimina un dels
estreps. Els trams de pont o túnel només participen quan el consumidor
demana explícitament connexions amb estructures.

La primera passada de regressions va detectar un raccord nord perdut a
Rajadell: `1820330462` acaba a 0,00448 mm de l'interior generalitzat de
`1556025770`, amb alineació 0,999994, però sense un vèrtex compartit.
La ruta estricta s'aturava als 11,97 mm i l'enllaç necessitava més llargada;
la prova existent exigia els dos raccords i no s'ha relaxat.

La reparació acotada només s'activa després de recórrer una línia de
superfície fins al seu extrem. Exigeix una única continuació compatible,
distància màxima de 0,15 mm i alineació superior a 0,995. No s'usa per
iniciar una ruta en un punt interior arbitrari, per travessar nivells,
per entrar en una estructura o per abandonar una referència/nom coneguts
a favor d'una línia anònima. Les unions amb referències contradictòries
i els creuaments transversals continuen exclosos.

Els trams estimats queden marcats a la ruta i `routingRepairs` conserva
els punts i identificadors de font als enllaços exportats. Les proves
lleugeres de xarxa passen 11/11; la regressió de Rajadell torna a conservar
els dos raccords.

## Passada conjunta d'enllaços

`src/geometry.js` recull també els trams de túnel a la xarxa de transport,
sense dibuixar-los com una carretera de superfície. Primer coneix els
taulers acceptats i genera les obertures i els paviments dels túnels.
Després prepara els enllaços amb la informació conjunta:

- Un extrem pot connectar amb una plataforma compatible elevada o amb
  un paviment de túnel acceptat, en lloc de baixar sempre al terreny cru.
- Es conserva l'extrem cartogràfic entre el punt interior del tauler i
  la continuació: eliminar-lo podia tallar una primera corba.
- L'enllaç mesura la secció disponible del tauler i arriba a l'amplada
  del segment de destinació mitjançant una transició suau.
- Les dues vores tenen en compte el terreny o la superfície de
  destinació. No n'hi ha prou amb fer coincidir només l'altura de l'eix.
- La superfície de destinació rep el segment real de la ruta
  (`routeLine`, cinquè argument de `surfaceAt`). Selecciona el tauler o
  túnel pels seus identificadors de font, a més de la compatibilitat de
  ruta: compartir referència no converteix un pont creuat en destí.
- Els límits d'un tauler es consulten amb el mostrejador de triangles
  `topSampler`, incloses les vores. Una consulta punt-dins-polígon podia
  descartar justament la secció compartida.
- `forceConnections` construeix també les unions directes de seccions
  que ja són al mateix pla. No s'omet una connexió només perquè no hi
  hagi un desnivell central aparent.

El terreny de referència i els XYZ dels taulers mesurats es conserven.
El canvi afecta les connexions i el material de la via; no és un
aplanament global del relleu ni una reconstrucció topogràfica mesurada.

## Portals, paviment i pendent transversal

`src/procedural-tunnels.js` separa `carriagewayWidthMM` de `widthMM`, que
continua descrivint l'obertura excavada. Busca una continuació compatible
del traçat als portals; quan no n'hi ha, la prolongació estimada de l'eix
queda identificada a la procedència i als avisos.

El paviment arriba a la superfície exterior calculada, amb cotes per a
les dues vores. Les seccions de paviment i el fons del tallador fan servir
els mateixos pendents transversals i la mateixa diagonal de triangulació.
Això evita una pel·lícula de terreny entre el tall i el paviment o un
llavi produït per dues superfícies que només coincideixen al centre.
Les superfícies de paviment de túnel que usa la passada final
(`floorTargets`) conserven també aquesta mateixa diagonal; no es calcula
un altre pla per aterrar-hi des del pont.

`src/tunnel-pavement.js` construeix el paviment amb aquestes seccions i
amb l'amplada de calçada, mantenint el material per sota del pis útil.
La transacció de sòlids conserva la base protegida i la recuperació del
model anterior davant errors. No es retiren fragments positius petits
per fer passar el control.

La procedència exportada inclou amplada de calçada i obertura, seccions
del paviment, ruta usada als portals i seccions de connexió amb centre,
vores, amplada i cotes. Les altures i les rampes continuen essent estimades
quan la font només aporta traçat i DEM.

## Comprovació sintètica local completada

`tests/transport-continuity.test.js` reconstrueix una cadena
superfície → pont → superfície → túnel → superfície, amb una calçada
explícita de 6 m. Han passat els dos casos següents:

| Cas | Mida física | Gir | Calçada | Obertura del túnel |
| --- | --- | ---: | ---: | ---: |
| Quadrat | 100 × 100 mm | 0° | 0,6 mm | 1,2 mm |
| Rectangle girat | 100 × 120 mm | 25° | 0,6 mm | 1,2 mm |

Es comproven el model en memòria i les malles realment serialitzades al
3MF, inclòs l'arrodoniment de coordenades de l'exportació:

- Existència de material de carretera a l'eix i a prop de les dues vores,
  i absència d'eixamplament més enllà de la calçada esperada.
- Continuïtat abans, damunt i després de cada boca i unió de l'enllaç,
  amb toleràncies explícites d'altura.
- Coincidència de les dues vores de l'enllaç amb el tauler i la superfície
  exterior, i portals que segueixen la continuació cartogràfica.
- Dimensions físiques, escala horitzontal i límits XY conservats.
- DEM d'entrada i geometria del tauler de control sense modificacions.

Les proves lleugeres d'amplada, xarxa, generadors i paviment cobreixen
atributs de font, carrils, estimacions de classe, mínims físics, identitats,
bifurcacions i ordre d'entrada. Les regressions existents de ponts i túnels
continuen essent necessàries; aquestes dues proves no les substitueixen.

## Estructures veïnes i rebuig de falsos destins

Les tres regressions de `tests/transport-peer-connections.test.js` han
passat en una execució lleugera de 0,396 s:

| Cas | Resultat comprovat en la geometria de material viari |
| --- | --- |
| Pont de 8 mm sobre pont veí de 7 mm, amb terreny a 5 mm | L'enllaç arriba a les dues vores del pont veí a 7 mm, no al terreny inferior |
| Pont creuat de 15 mm amb la mateixa referència | El raccord continua per la seva carretera a 5 mm i no salta a l'estructura creuada |
| Connexió directa de pont i túnel | La boca manté les dues vores a 5,3 mm i 0,6 mm de calçada; el material continua a través de la unió |

La comprovació conjunta de les dues cadenes, aquests tres casos i la
regressió existent del viaducte passa **6/6 en 6,98 s**. Aquesta passada
no és encara la suite final ni la validació dels nous controls reals de
l'entrega; la revisió d'usuari i laminador també continua pendent.

## Reproducció i validacions següents

Des de l'arrel, respectant els límits de memòria d'[AGENTS.md](../AGENTS.md)
i sense una altra operació pesada simultània:

```powershell
node --max-old-space-size=512 --test --test-concurrency=1 tests/transport-width.test.js tests/transport-network.test.js tests/transport-continuity.test.js tests/transport-peer-connections.test.js
```

El diagnòstic existent pot reconstruir separadament el control real de
Rajadell amb ICGC i túnels en el mode de carreteres de l'aplicació:

```powershell
node scripts/benchmark-major-roads.mjs 1.5 150 36 --timeout=120 --output=output/ro052-rajadell.json --surface-roads --icgc --tunnels --verify --export=output/RO-052-Rajadell.3mf
```

`--surface-roads` desactiva el prototip RO-051 i correspon al mode de la
UI; `major.enabled:false` és esperat en aquest control. Sense aquesta
opció el diagnòstic històric activa RO-051 explícitament, i no representa
el comportament per defecte de l'aplicació. Les opcions `--rotation=25`
i `--height-mm=200` permeten demanar un retall girat o rectangular
separadament, mantenint l'escala horitzontal de les dimensions triades.

Els resultats v0.19.1 d'aquesta reproducció consten al principi de
l'informe. Si el model recupera les vies anteriors en una prova amb
RO-051 activat, no és un control amb aquells perfils aplicats. Cal
comprovar túnels, enllaços no resolts, auditoria i procedència.

Pròximes comprovacions:

1. Resoldre els dos extrems del quadrat amb longitud insuficient sense
   canviar els XYZ mesurats ni crear falses connexions.
2. Altres retalls/escales i Millau com a regressió general, registrant
   omissions, amplades i procedència. Els controls sintètics no acrediten
   tots els enllaços de cartografia generalitzada.
3. Revisió de l'usuari dels nous models, laminat i cupó físic abans de
   maquetes llargues. No s'ha comprovat Pages ni CI remotament.

## Marc exterior ajornat

La secció «Marc exterior», els seus ajustos i la descàrrega s'han retirat
del sidebar dret. L'aplicació tampoc inicialitza ni crea el seu marc de
previsualització. La resta de mètriques, materials i exportacions del
model continua en els components existents, sense un redisseny d'estil.

Els mòduls de geometria, previsualització i exportació del marc i les
seves proves es conserven per a un desenvolupament posterior. La UI
opcional de complements tolera l'absència dels contenidors retirats.
Ajornar el marc no vol dir eliminar-ne el motor ni donar per validat un
disseny futur.
