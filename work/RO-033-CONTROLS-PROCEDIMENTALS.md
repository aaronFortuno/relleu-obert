# RO-033 / RO-052 — Controls de ponts procedimentals

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

## Millau — diagnòstic de fonts i perfil

Centre 44.0797, 3.0226 i peça de 150 mm. Consulta del 3 de novembre de
2026 amb OpenFreeMap (`20261101_080013_pt`) i el proveïdor de relleu
habitual de l’aplicació. Dues calçades amb identificadors vectorials
`42968122` i `42968132`.

| Retall quadrat | Tessel·les | Resultat abans de construir la malla |
| --- | ---: | --- |
| 3 km (1:20.000) | 9 | Tres fragments solapats per calçada, cadascun amb el seu perfil estimat. |
| 1,4 km (1:9.333) | 1 | Les dues calçades són presents a la cartografia. Els quatre extrems dels fragments cauen fora del DEM disponible i el motor omet els dos taulers. |

El diagnòstic identifica la desaparició amb el zoom i un mecanisme
que pot produir angles al retall ampli, perquè el motor
interpreta els fragments solapats com a trams separats. Queda pendent
mesurar aquests angles a la malla. El següent pas és reconstruir un
eix únic per calçada abans del retall i obtenir les cotes als estreps
reals quan calgui anar més enllà de les tessel·les visibles.

```sh
node --max-old-space-size=512 scripts/diagnose-millau.mjs
```
