# RO-033 / RO-052 — Controls de ponts procedimentals

## Pilot de Millau al catàleg · v0.23.28

El perfil singular segueix un arc de 2.460 m i radi de 20 km, amb una rasant del 3,025 %. Les dues calçades 3D de la BD TOPO de l’IGN fixen la posició i la cota del tauler, de 600,26 m al nord i 674,68 m al sud en NGF–IGN69. Els enllaços i els fonaments s’ajusten al terreny del retall. Les piles segueixen les estacions de projecte de 204, 546, 888, 1.230, 1.572, 1.914 i 2.256 m. [Xifres del concessionari](https://www.leviaducdemillau.com/sites/viaducdemillau/accueil-viaduc-de-millau/le-viaduc/les-chiffres-cles.html) · [BD TOPO](https://www.data.gouv.fr/datasets/bd-topo-r)

El GLB aporta els pilons i els tirants. Els tirants del model tenen un diàmetre de 4,5 m i s’ometen per sota de 0,42 mm a la maqueta. El motor substitueix les dues calçades, el contorn del pont i les petjades duplicades de les piles identificades a l’índex quan solapen amb el tauler. Les altres vies i els edificis continuen actuant com a obstacles. La regla de catàleg és independent del lloc, del gir i de l’escala. Els trams de projecte es mantenen sense suports auxiliars automàtics. [Fitxa del model](https://github.com/aaronFortuno/open-place-models/tree/main/models/millau-viaduct/r1)

| Retall centrat a 44,07991 N, 3,02244 E | Gir | Piles | Enllaços | Tirants |
| --- | ---: | ---: | ---: | --- |
| 250 × 250 mm a 1:10.000 | 26° | 7 | 2 | Sí |
| 180 × 180 mm a 1:18.000 | 34° | 7 | 2 | Omesos per gruix |
| 130 × 130 mm a 1:8.500, parcial | −28° | 3 | Extrems fora del retall | Sí |

Els tres controls de relleu, aigua i autopista passen l’auditoria de tancament i cadascun té una sola component per al viaducte i els seus enllaços. Els dos retalls sencers mantenen els enllaços amb l’A75 i cap control duplica el tauler. El fitxer d’1:10.000 conserva una llum sense suport d’uns 33 mm. S’ha de contrastar al laminador. `node --max-old-space-size=512 scripts/check-millau-catalogue.mjs` reprodueix els controls des del catàleg publicat.

El retall de 250 × 250 mm també s’ha verificat amb totes les capes, inclosos edificis, vegetació, paviment regional i perfils suaus. Se’n conserven les set piles, els dos enllaços i una sola component de malla. Les petjades de les piles cartografiades com a edificis quedaven superposades i s’han incorporat a les referències de substitució. Els ajustos de les piles extremes deixen espai als vials de servei i als túnels. Afegir `complet --totes-les-capes` al comandament per repetir el control complet.

## Ponts curts sobre canals

**v0.22.43.** L’informe d’Amsterdam a 1:10.000 comptava 192 taulers procedimentals i 299 eixos descartats pel pressupost de 200. Els avisos de pendent afectaven els perfils viaris principals. El problema als canals era la cota del tauler, interpolada a partir del DEM dels extrems, respecte de l’aigua modelada.

La regla s’aplica a un pont cartografiat que creua una làmina d’aigua curta i té les dues ribes al retall. Ajusta el tauler de 0,4 mm per deixar un pas objectiu de 0,25 mm, amb marge de mostreig i contacte amb les ribes. Els ponts amb prou pas i els casos que exigirien separar-se de les ribes conserven el perfil d’origen. La cerca d’accessos acota els traçats per distància. El pressupost de ponts prioritza els creuaments d’aigua i els reparteix pel retall.

| Control a 1:10.000 | Pas mesurat abans | Pas mesurat després |
| --- | ---: | ---: |
| Amsterdam, 600 × 600 m, Model complet amb carrers i edificis | 0 ponts amb 0,24 mm o més | 15 ponts, 0,259–0,275 mm |
| Amsterdam, 2,5 × 2,5 km, relleu, aigua i ponts | 0 ponts amb 0,24 mm o més | 164 ponts, 0,256–0,291 mm |
| Empuriabrava, 700 × 700 m, Model complet amb carrers i edificis | 0 ponts amb 0,24 mm o més | 3 ponts, 0,258–0,260 mm |

Al retall ampli d’Amsterdam hi ha 84 ponts sobre aigua a l’oest i 113 a l’est del centre. Abans n’hi havia 185 a l’oest i cap a l’est. Es conserva el límit de 200 i hi ha eixos que queden fora. Al control complet de 600 m s’han calculat 21 accessos per als taulers ajustats. A Empuriabrava se n’han calculat sis per als tres ponts. A 1:5.000 s’han mesurat obertures en 13 ponts del retall urbà d’Amsterdam i en els tres d’Empuriabrava. Queda pendent comprovar les obertures al laminador i generar el retall gran amb totes les capes.

## Torrent de Montgròs

**v0.21.8.** Control del retall de Sant Salvador de 3 × 3 km a 1:20.000,
amb centre a 41,68075 N, 1,754 E, detall 36, exageració ×1,5 i MET5 de
l’ICGC. Els fragments originals reprodueixen l’omissió de la v0.21.7.
La regla conserva el fragment més llarg quan el més curt del mateix
traçat hi queda contingut dins de la tolerància mètrica. La prova
verifica ambdós ordres d’entrada i conserva també el tram independent
de la Fessona, que comparteix identificador amb Montgròs.

El paviment de la C-37 és present sobre el torrent a **41,689049 N,
1,761280 E**. La cota superior a la malla és de 8,006 mm sobre la base
i hi ha 0,266 mm lliures entre el terreny i la cara inferior del tauler
en aquest punt. Els dos accessos arriben a la C-37 cartografiada
(`317898630`). S’ha mostrejat el paviment a 0,01 mm a cada costat de les
unions a l’eix de la calçada.

| Accés | Diferència de cota a la unió amb el tauler | Diferència de cota a la unió amb la carretera |
| --- | ---: | ---: |
| Oest | 0,0018 mm | 0,0062 mm |
| Est | 0,0025 mm | 0,0007 mm |

Auditoria de les sis categories sense errors. El pont de la Fessona
conserva els dos accessos. Temps del control de Montgròs de 6,3 s de
càrrega i 44,2 s de càlcul i auditoria.

### Laminat del cupó de Montgròs

Cupó de **19 × 13 mm** extret del 3MF de Sant Salvador, amb les mateixes
cotes i els dos accessos. Bambu Studio 2.8.1.55, Bambu Lab A1, PLA Basic
i suports desactivats. S’ha comprovat el G-code en una secció de 2 mm
perpendicular al tauler i centrada a les coordenades del torrent. El
control inclou els arcs d’extrusió i l’amplada estimada de cada traç.

| Broquet | Alçada de capa | Filaments | Cotes de capa amb la secció lliure | Primera capa de tauler al punt de creuament |
| --- | --- | --- | --- | --- |
| 0,2 mm | 0,10 mm | 1 | 7,10 · 7,20 · 7,30 · 7,40 mm | 7,50 mm |
| 0,4 mm | 0,20 mm | 1 | 7,20 · 7,40 mm | 7,60 mm |
| 0,4 mm | 0,20 mm | 4 | 7,20 · 7,40 mm | 7,60 mm |

Els tres perfils conserven una obertura a la secció mesurada. Es manté
la geometria amb els dos accessos auditats. Queda pendent la impressió
física i la comprovació en una placa completa.

## Pas inferior al Bages

Control local amb les tessel·les de la [mostra de l’Eix Diagonal](../public/data/eix-diagonal.json).
El pont cartografiat `3522318132` passa per sobre de la carretera `1820330450`
a 41.710876, 1.784275. El carregador no ha trobat cap tauler del registre
de Rajadell en cap dels tres retalls. El motor ha estimat el perfil del pont
a partir del seu eix i les cotes del relleu als extrems.

| Retall quadrat / peça | Centre (latitud, longitud) | Enllaços | Pilars | Pas lliure al creuament | Llum màxima mostrejada |
| --- | --- | ---: | ---: | ---: | ---: |
| Sencer, 140 m / 84 mm | 41.71088, 1.78427 | 2 | 1 | 6,00 mm | 15,29 mm |
| Amb un extrem fora, 65 m / 39 mm | 41.71089, 1.78395 | 1 | 2 | 6,00 mm | 5,88 mm |
| Mateix retall sencer a altra escala, 140 m / 56 mm | 41.71088, 1.78427 | 2 | 1 | 3,80 mm | 7,84 mm |

Amb detall 20 i exageració ×1,5, els tres controls conserven la cota
estimada del tauler al creuament (314,865 m, variació inferior a 0,001 m).
Cap pilar intersecta la calçada inferior cartografiada i les malles
superen l’auditoria. S’ha mesurat la cota de la malla al centre de la
calçada a 0,01 mm a banda i banda de cada unió amb la superfície.
Les diferències respecte de la cota d’unió són inferiors a 0,002 mm.
El retall parcial registra que la segona continuació surt de la peça.

La peça sencera de 84 mm supera el llindar de 10 mm del motor en una
llum mostrejada. La diferència de suports segons escala o retall queda
oberta. El [cupó Bambu de 39 × 39 mm](../public/controls/ro-033/RO-033-cupo-pas-inferior.3mf)
conserva el pas inferior, dos pilars i l’enllaç interior. S’ha verificat
el contingut del 3MF. El laminat i la impressió queden pendents.

```sh
node --max-old-space-size=512 scripts/check-procedural-overpass.mjs
```

## Millau — continuïtat del perfil

**v0.19.11.** Una regressió amb un accés corbat reprodueix l’error de
seccions plegades. La recuperació omet aquell accés i conserva el
tauler i l’accés oposat. El control real de 3 km amb detall 36 ha
generat ambdues calçades i els quatre accessos amb auditoria sense
errors. Queda pendent contrastar el retall concret de l’usuari.

**v0.19.10.** Amb el mateix centre i els mateixos dos retalls, la
reconstrucció obté una sola plataforma per calçada. Les cotes dels
extrems són idèntiques entre retalls (587,96–671,66 m i 588,84–668,31 m).
El retall d’1,4 km ha carregat dues tessel·les vectorials i les dues de
relleu corresponents per completar el pont. La malla completa
(detall 12, edificis OSM i túnels actius) supera l’auditoria en ambdós
retalls. Al de 3 km, les dues calçades tenen dos enllaços cadascuna.
Les llums màximes mostrejades (10,76 i 13,77 mm al retall de 3 km)
queden pendents de revisar al laminador.

La continuació fora del retall segueix la identitat de la via, amb un
màxim de vuit consultes vectorials addicionals i un temps d’espera
compartit. Les cotes noves procedeixen del mateix proveïdor i nivell
del relleu que la maqueta. El tauler continua sent una estimació DEM.

### Diagnòstic de la v0.19.9

Centre 44.0797, 3.0226 i peça de 150 mm. Consulta del 3 de novembre de
2026 amb OpenFreeMap (`20261101_080013_pt`) i el proveïdor de relleu
habitual de l’aplicació. Dues calçades amb identificadors vectorials
`42968122` i `42968132`.

| Retall quadrat | Tessel·les | Resultat abans de construir la malla |
| --- | ---: | --- |
| 3 km (1:20.000) | 9 | Tres fragments solapats per calçada, cadascun amb el seu perfil estimat. |
| 1,4 km (1:9.333) | 1 | Les dues calçades són presents a la cartografia. Els quatre extrems dels fragments cauen fora del DEM disponible i el motor omet els dos taulers. |

La v0.19.9 interpretava els fragments solapats com a trams separats,
cadascun amb les seves cotes. La v0.19.10 resol aquests dos mecanismes
en els retalls de control.

```sh
node --max-old-space-size=512 scripts/diagnose-millau.mjs --mesh
```
