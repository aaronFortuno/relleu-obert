# RO-052 — Continuïtat i amplada de la calçada

## Talls locals sota els taulers, v0.23.19

La calçada amb rasant pròpia ja es construeix com un sòlid. Per preservar l’assignació de materials, es retalla el volum que comparteix amb el substrat i s’hi munten els enllaços i els suports. Abans, si el tall de tots els taulers fallava, es recuperava el paviment sobre el terreny a tot el retall. Ara el motor divideix el tall en grups i conserva els talls vàlids. Si cal descartar un perfil, es tornen a calcular les petjades perquè aquell tram recuperi el paviment habitual sense deixar buits. La recuperació té un pressupost acotat de talls i de repeticions del model.

El mateix subretall de 550 m de l’Hospitalet, a 1:5.000 i amb arbres desactivats, passa de 0 a 19 perfils suaus. El tall que falla és el de `5544604682` (`Not manifold`). Els 19 restants es tallen conjuntament després d’excloure aquest perfil. Entre els recuperats hi ha `501496602`, `428252032` i `354819572`. El temps local passa de 9,6 a 21,1 s. Les tres malles de material passen l’auditoria abans de l’exportació.

Els 26 taulers cartografiats continuen amb 39 enllaços, 13 extrems sense resoldre i cinc taulers amb algun tram sense suport suficient. El pas del ramal `428252022` sobre el camí de vianants `1351597090` continua tapat a la sonda. Aquest control mesura la recuperació de les rasants i deixa la inspecció visual i el laminat pendents.

Reproducció amb `node --max-old-space-size=512 scripts/check-dense-transport.mjs regional talls-locals`. El 3MF i el diagnòstic es desen a `output/hospitalet-xarxa-talls-locals/`, amb l’exportació anterior disponible a `output/hospitalet-xarxa/` per comparar.

### Retall girat 45°

Els dos `regional.3mf` tenen el mateix nom. El bloc de geometria exportada té hashes diferents i conté 160.842 triangles abans del canvi i 174.772 després. L’usuari indica que a la seva vista els dos fitxers es veuen igual.

El control nou talla una peça de 400 × 400 m amb el mateix centre, gir de 45°, mida de 80 × 80 mm, escala 1:5.000 i detall 28. Es recalculen el terreny, les vores i les vies amb el retall girat. Hi ha 94.846 triangles i 16 perfils suaus aplicats. L’auditoria del 3MF verifica les tres malles tancades i l’assignació dels materials. Es mantenen 11 extrems sense enllaç i el pas de vianants continua tapat al punt mostrejat.

Reproducció amb `node --max-old-space-size=256 scripts/check-dense-transport.mjs regional gir45 --gir45`. Fitxer `output/hospitalet-xarxa-gir45/hospitalet-gir45-1-5000-regional.3mf`.

## Xarxa densa a l’Hospitalet, v0.23.18

Subretall de 550 × 550 m centrat a `41.35131, 2.05543`, amb la còpia de `hospitalet2.json`, MET5 i edificis ICGC. Peça de 110 × 110 mm a 1:5.000, detall 36, exageració ×1,5 i arbres desactivats. S’hi compten 31 fragments d’autopista o via ràpida, 30 de ramals, 5 d’altres carreteres, 26 de camins i 15 de ferrocarril.

`regional` i `independent` donen la mateixa geometria exportada, verificada amb un hash dels recursos del 3MF. Es preparen 20 perfils suaus. La separació entre taulers i materials del terreny falla amb `Not manifold`, i el motor recupera el càlcul habitual per a tots. El paviment regional cobreix el 19,2% de la petjada original de carreteres. El model conserva 26 taulers cartografiats amb 39 enllaços, 13 extrems sense resoldre i 5 taulers amb algun tram sense suport suficient. Les malles de material superen l’auditoria abans d’exportar.

| Punt del retall | Resultat observat |
| --- | --- |
| Ramal `428252022` sobre el camí `1351597090` | El fons del tauler entra 0,51 mm al paviment inferior a la sonda. Un extrem queda sense enllaç suau. |
| Ramal `1647439892` sobre `3586195772` i `6782699972` | El model complet conserva els dos enllaços. A la sonda sobre `3586195772` hi ha 1,32 mm de llum. El generador marca un tram amb suport insuficient. |
| Final de tauler `501496622` | L’enllaç selecciona `961983332`. La sortida `1649512752`, més estreta, comparteix l’extrem cartografiat. L’altre extrem del tauler queda condicionat pel cantell del retall. |

S’ha provat el planificador dels cupons per separat en 17 taulers amb creuaments interiors detectats. En 13 es reserva el veí perquè és un camí o una estructura amb tractament propi. Tres passen la comprovació de llum local. En un quart, `1647439902`, la llum és inferior a 0,8 mm i la simplificació de Mataró queda fora d’abast perquè a sota hi ha dues calçades. El recompte és del control local i depèn de les línies i l’escala del retall.

El cupó `ramal-dues-calcades.3mf` aïlla `1647439892`, els dos accessos i totes dues calçades inferiors. La llum calculada mínima a la petjada compartida és d’1,11 mm. A les dues sondes és d’1,28 i 1,14 mm, i el graó als estreps és inferior a 0,001 mm. El 3MF passa l’auditoria. El laminat i la integració del pilot al Model complet queden pendents.

Amb la còpia `output/hospitalet2-repro/region.json`, executa `node --max-old-space-size=512 scripts/check-dense-transport.mjs regional` i després repeteix amb `independent`. Els 3MF i els informes JSON es desen a `output/hospitalet-xarxa/`.

## Pas inferior i cruïlla a nivell a Mataró, v0.23.17

Mateix retall real de 400 × 400 m centrat a `41.52530, 2.41143136`, amb relleu MET5, exageració ×1 i quatre traçats d’OpenStreetMap via OpenFreeMap. El tauler `343867212` connecta `343867222` amb `429180592` i creua l’autopista `3066223302`. La prova aïlla els dos eixos i conserva les dades d’aigua del retall.

| Peça | Escala | Solució | Verificació del 3MF |
| --- | --- | --- | --- |
| 120 × 120 mm | ≈1:3.333 | Tauler i pas inferior | Mínim calculat de 2,19 mm a la petjada compartida. Mínim de 2,30 mm a les nou sondes exportades de la intersecció. Graó als estreps inferior a 0,001 mm. |
| 50 × 50 mm | 1:8.000 | Cruïlla seca a nivell | El tauler queda per sota de la llum mínima del pilot de 0,8 mm. Un únic paviment amb quatre accessos, pendent màxim mostrejat del 10,6% i graó inferior a 0,001 mm. |

El control de llum compara les calçades a tota l’àrea on se superposen. La cruïlla a nivell pren una cota de la via inferior a banda i banda del creuament, fa servir aquesta cota a totes dues calçades i limita els pendents dels quatre braços al 12% a la peça. La simplificació s’aplica a un pas entre dues carreteres seques, amb tauler estimat i dos accessos identificats. El mode `crossing-coupon` treballa amb dos eixos i una sola estructura. La integració al Model complet i la validació al laminador queden pendents.

Executa `node --max-old-space-size=192 scripts/check-road-crossing.mjs` per generar `mataro-pas-inferior-120mm.3mf`, `mataro-cruilla-a-nivell-50mm.3mf` i les mesures a `output/road-class-coupons/`.

## Cupons de Mataró i Palamós, v0.23.16

Els dos controls aïllen una carretera i un camí o sender cartografiats en subretalls dels diagnòstics `mataro-sud.json` i `palamos.json`. El relleu prové del MET5 de l’ICGC i les vies d’OpenStreetMap via OpenFreeMap. Peça de 100 × 100 mm, base de 5 mm i exageració vertical ×1. Es mantenen les masses d’aigua del retall. La calçada es calcula a partir d’una rasant d’eix suavitzada i preval sobre el relleu dins de la seva amplada. El sender manté la superfície natural. L’opció `classified-coupon` és un control local que admet un o dos eixos de superfície i una capa de senders.

| Cupó | Centre (latitud, longitud) | Extensió i escala | Traçats | Excavació màxima | Reblert sota la calçada |
| --- | --- | --- | --- | ---: | ---: |
| Mataró sud | 41,526890 · 2,410780 | 230 m · 1:2.300 | Autopista `284829752` i camí `612760890` | 1,29 mm | 1,21 mm |
| Palamós | 41,85444845 · 3,11919635 | 100 m · 1:1.000 | Via local `827880792` i sender `14762580822` | 0,23 mm | — |

S’han mesurat 182 seccions a Mataró i 72 a Palamós, a més dels punts intermedis. La variació transversal màxima és inferior a 0,001 mm. A les mostres, el reblert i el fons de la calçada comparteixen cota i els senders segueixen el relleu amb un error inferior a 0,001 mm. Les malles exportades són tancades i tenen un filament per peça. Queden pendents el laminat i els creuaments de carreteres a nivell o amb pas inferior.

Per reproduir els controls, executa `node --max-old-space-size=512 scripts/check-road-class-coupons.mjs`. El guió desa els 3MF de Bambu, les mesures i les fonts descarregades a `output/road-class-coupons/` i reutilitza les fonts desades en les següents execucions.

## Prova de calçada amb rasant pròpia, v0.23.15

En Model complet, `?paviment=rasant` activa la variant amb «Perfils suaus» marcat. La calçada principal surt d’una rasant suavitzada a partir de les cotes de l’eix i de seccions planes d’amplada constant. La malla retalla el terreny dins de la calçada i omple amb terreny fins a la seva cara inferior. Una via menor al mateix nivell pot arribar a la calçada principal sense interrompre-la. Es reserven l’aigua, els traçats ferroviaris, els passos a altres nivells i les zones d’accés a estructures de la mateixa via. En aquests punts es mantenen els controls i els motors de ponts i túnels.

Al mateix retall de `hospitalet2.json`, amb arbres desactivats, la variant construeix set trams amb rasant pròpia que sumen 151 mm sobre la peça. La superfície de paviment regional passa del 26,7% al 30,1%, repartida entre 31 fragments en comptes de 34. Els 21 taulers principals cartografiats mantenen els 37 enllaços. Les sis malles per material passen l’auditoria de tancament. Temps local de 88,0 a 90,9 s.

A l’eix del tram `5544604652`, el pendent P95 ponderat pel recorregut baixa del 10,6% al 9,0% i la longitud mostrejada per sobre del 12% baixa d’1,48 a 0,73 mm sobre la peça. El pendent màxim mostrejat es manté, igual que els pics dels altres tres trams de control. En un encreuament a diferents nivells la sonda pot seleccionar una altra superfície, de manera que els pics requereixen verificació per traçat. Al control sintètic en vessant, la diferència transversal és inferior a 0,001 mm, també en creuar la via menor, i el ferrocarril conserva el seu corredor. Continuen pendents la geometria dels enllaços als creuaments, els components aïllats i el laminat de la maqueta amb vegetació.

En el diagnòstic anterior, el túnel ferroviari `426024682` s’envia a la comprovació de taulers XYZ perquè es classifica primer com a ferrocarril. Cal verificar-lo com a túnel i comprovar la volta excavada abans d’acceptar la calçada que hi passa per sobre.

## Segon retall de l’Hospitalet, v0.23.14

`hospitalet2.json` correspon a un altre enllaç del Llobregat, centrat a `41.349390, 2.057431`. Retall de 999,68 × 999,68 m, peça de 200 × 200 mm, detall 64, exageració ×1,5, MET5 i edificis ICGC. Les comparacions locals parteixen de les mateixes dades i es fan sense arbres. La v0.23.13 construeix 27 perfils principals i 34 fragments de paviment regional. Els controls del primer retall de l’Hospitalet es mantenen separats.

Al segon retall hi ha trams que tornen al relleu quan un perfil no pot acreditar la cota d’un ferrocarril, un pont o la volta d’un túnel. També hi ha extrems d’autopista que queden massa a prop del cantell per acabar una transició, o que es descarten perquè una vora de la calçada surt de la peça. Alguns ramals apareixen amb la classe del tronc i queden sense un candidat compatible.

El motor conserva la classe del ramal per buscar continuacions cartogràfiques compatibles. Si la continuació seca d’una via principal surt de la peça a tocar del tauler, pot seguir la tangent fins al cantell i tancar-hi el sòlid. Les unions que arriben a una rampa suavitzada prenen la cota de la seva malla. Quan falta la cota d’un creuament protegit, cal separar el tram afectat de la resta de la via per conservar la rasant on hi ha dades suficients.

Als 21 taulers cartografiats de vies principals, els enllaços passen de 18 a 37 i els extrems sense connexió de 24 a 5. Els dos taulers del cantell oest recuperen un enllaç cadascun. A la continuació `501496602`, l’enllaç acaba a 9,203 mm, a la cota de la rampa suavitzada. Abans acabava a 8,698 mm, al nivell del terreny. Les sis malles per material superen l’auditoria de tancament. Temps de generació local de 91,6 a 88,0 s.

Els pendents màxims mostrejats dels trams `501496602`, `961983332`, `961985742` i `5544604652` es mantenen al 67,0%, 22,5%, 20,0% i 20,3%, respectivament. La prova amb un mostreig més espaiat del paviment de retorn tampoc els va reduir. Queden pendents els canvis bruscos de rasant, la inspecció de components separats i la prova amb vegetació i laminat.

## Hospitalet i el Prat, v0.23.13

Retall d’`hospitalet.json` centrat a `41.340975, 2.093828`, 1.200 × 1.200 m, peça de 240 × 240 mm a 1:5.000, detall 64, relleu Mapterhorn i edificis ICGC. S’han comparat el model anterior i el corregit amb els arbres desactivats en ambdós. El pressupost inicial de paviment comptava 5.256 fragments de totes les tessel·les. Comptant les petjades que poden tocar la peça, la prova aplica 5 trams complets i 27 de parcials.

Els dos taulers de l’autopista sobre el Llobregat tenien cotes estimades a partir dels extrems. La correcció mostreja l’aigua i el relleu al llarg de l’amplada del tauler. Ajusta la rasant amb un límit de pendent i conserva el recolzament als extrems. S’aplica a ponts cartografiats de vies principals quan la cota del tauler és estimada i hi ha espai per fer l’ajust. Tres passos o ramals pròxims mantenen el perfil anterior.

| Traçat d’OSM | Pas lliure mínim abans, a l’eix | Pas lliure mínim després, a l’eix | Mostres seques amb terreny per sobre del tauler |
| --- | ---: | ---: | ---: |
| `2249864642` | −0,284 mm | +0,355 mm | 15 → 0 |
| `197912442` | −0,378 mm | +0,277 mm | 22 → 0 |

Tots dos taulers conserven dos enllaços i la seva malla supera l’auditoria de tancament. El càlcul ha passat de 36,33 a 36,98 s. Queda el contrast visual amb vegetació i la comprovació al laminador.

**v0.19.9 · terminacions dels perfils experimentals.** Cada extrem interior reserva
espai a la mateixa via cartografiada. El tram de transició pren la cota
i el pendent del perfil i els de la via sobre el relleu als dos punts
d'unió. El motor descarta el perfil local si no troba una unió admissible.
Els perfils que surten de la maqueta continuen fins al cantell. Una
regressió comprova les dues unions de la via a la malla final.

**Segon retall ferroviari.** Centre `41.724, 1.788`, 400 × 400 m, peça
150 × 150 mm, detall 12, edificis OSM, túnels i arbres desactivats. Amb
les tessel·les locals, el perfil es va aplicar i les cinc malles van
superar l'auditoria. Mesura en 36 intervals de la superfície ferroviària,
descomptada l'exageració vertical: **1,220–1,223%**. El retall de 600 m
centrat a `41.7242, 1.791` va recuperar la via sobre el terreny per falta
de suports segurs en el control ferroviari aïllat.

**Rajadell, detall 12.** Retall inicial d'1,5 km, peça de 150 mm,
edificis ICGC i túnels activats. Tres perfils viaris es mantenen sobre
el terreny perquè no hi cap la transició prevista. El perfil ferroviari
s'omet per un creuament amb un túnel sense cota acreditada. Les sis
malles superen l'auditoria. Queden pendents els extrems dels ponts
mesurats, el contrast a més resolucions i el laminat.

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

## Amplada dels senders a la v0.22.12

Els senders, camins de vianants i graons tenen una amplada pròpia. Es fa servir l’amplada cartografiada quan està disponible. En absència de dades, el sender s’estima en 1 m. L’amplada mínima per defecte és 0,30 mm a la peça i el selector de Vies aplica factors de ×0,75, ×1, ×1,5 o ×2. El factor s’aplica també als taulers estimats i a les calçades dels túnels de vianants, de manera que coincideixin amb els seus accessos.

El canvi reutilitza la cartografia carregada i conserva la vista i els traços. Es desa a la galeria local. El control de geometria confirma que el sender passa de 0,30 a 0,60 mm amb ×2 i que la carretera del mateix retall manté la seva amplada.

A la mostra de Tamariu de 100 × 100 mm, l’amplada ×1 exposava un error numèric en unir les vores de dos contorns acabats de separar. El motor obté ara la cobertura conjunta a partir de les petjades prèvies al tall. Amb ×1, 25 fragments reben el paviment independent i les malles superen l’auditoria.
