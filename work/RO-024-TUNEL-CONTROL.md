# RO-024 — Control sintètic del buit (fases 3 i 4)

2026-11-02 · Resultat revisable de les fases 3 (cavitat sintètica) i 4 (retall i partició) de [RO-024-SOLIDS.md](RO-024-SOLIDS.md). **No és un túnel real, no és una dada de territori i no acredita impressió.** Les portes de laminador (Bambu) i impressió física (fase 5) queden per a l’usuari. L’auditoria real de la Perica i la integració final queden per a l’arrel del projecte.

## Fitxers

- `src/solid-voids.js` — `subtractVoids(model, voidParts, api, opcions)`: unió prèvia DINS de cada material (`uniteMaterials`, mai ids diferents), unió de totes les peces de buit en un sol tallador, i resta del MATEIX buit de cada capa. Còpies independents (arrays tipats nous), cap mutació d’entrada, estats/volums explícits, capa buida conservada si un material desapareix del tot, fites `maxTriangles` / `maxComponents` / `maxVoidTriangles`, i destrucció de tot sòlid WASM temporal en èxit i error (també si `status()`/`volume()` llança). **No connectat a la UI ni a l’exportació.**
- `tests/solid-tunnel.test.js` — 10 proves amb Manifold real després de revisió.
- `output/control-tunnel.mjs` — generador (ignorat per git, com tot `output/`).
- `output/solid-control-tunnel.3mf` — model sencer, dialecte Bambu, procedència sintètica.
- `output/solid-control-tunnel-tiles.zip` — retall 2×200 mm (`tileArchive`, dialecte Bambu).

## Fixtura de control (dimensions exactes)

- Bloc 400×120×12 mm. Zoc z0..5 ple i íntegre; pis superior z5..12 en tres materials adjacents sense encavalcament: **terra** x0..200 (també tot el zoc), **bosc** x200..300, **carretera** x300..400.
- Buit: caixa x−1..401, y58..62, z5..9 (secció 4×4 mm, dos portals oberts).
- Volums analítics: total 576.000 mm³; forat dins del bloc 6.400 mm³; després de la resta 569.600 mm³ (terra 404.800, bosc 82.400, carretera 82.400).

## Què proven els tests (no només volums)

1. Volum total i per color contra l’analític; auditories sense errors i capes tancades; model, buits i opcions inalterats; arrays del resultat independents.
2. Intersecció buit∩material = 0 per a cada capa; `rayCast([-1,60,7]→[401,60,7])` sense cap encert (pas lliure de portal a portal), amb raig de control fora del forat que SÍ travessa material.
3. Zoc z0..5 amb volum idèntic (240.000 mm³) abans i després de la resta.
4. `splitModel(max=200)` → dues peces de 200×120: el mateix raig local sense encerts a cada peça (cap tapa de gruix zero a la costura x=200), cantons del forat (y58/62, z5/9) presents a banda i banda de la costura malgrat la triangulació, suma de volums de peces = volum sencer, zoc intacte dins de cada peça.
5. Capa buida d’entrada conservada; material enter dins del forat eliminat del tot però conservat com a capa buida tipada.
6. Dues peces de buit encavalcades s’unionen en un sol tallador per a totes les capes.
7. Límits invàlids, buit pla (volum zero) i coordenades no finites rebutjats amb errors explícits.
8. Fallades injectades a `subtract` i a `volume`: tot sòlid WASM creat queda destruït (comptador creats=destruïts).

## Limitacions conegudes

- Precisió de coma flotant en coordenades de malha; les igualtats de cantons es comproven amb tolerància (1e-2 mm).
- `splitModel` omet del fitxer de peça les capes que queden buides en aquella peça (comportament existent).
- El buit és un tallador prismàtic; no s’infereix cap pont, túnel o cavitat real (RO-033/034/035 pendents, vegeu RO-024-SOLIDS.md).

## Llista de verificació manual (usuari, fase 5)

- [ ] Obrir `solid-control-tunnel.3mf` al Bambu Studio: 3 materials/colors, bloc 400×120×12 mm.
- [ ] Vista en secció a y=60: pas de 4×4 mm obert de x=0 a x=400, sostre a z=9, terra del pas a z=5, zoc ple.
- [ ] Comprovar que el pas travessa els tres colors i que les unions de colors (x=200, x=300) no s’han fos.
- [ ] Obrir les dues peces del ZIP: el pas continua alineat a la costura x=200, sense tapa.
- [ ] Si s’imprimeix: registrar suports, parets i si el pas de 4 mm es col·lapsa; registrar-ho a l’historial.

## Com reproduir els artefactes

El [generador inclòs al repositori](../scripts/solid-control.mjs) crea un ZIP
amb el model sencer i dues peces alternatives, així com instruccions i
manifest. Per defecte fa el control petit, més pràctic per provar al laminador:

```sh
node scripts/solid-control.mjs
node scripts/solid-control.mjs --large
```

Sortides: `output/solid-control-petit.zip` (40 × 24 × 12 mm; peces de
20 × 24 mm) i `output/solid-control-grand.zip` (400 × 120 × 12 mm; peces de
200 × 120 mm). En tots dos casos, pas de 4 × 4 mm amb base de 5 mm. No és
una reducció uniforme del control gran: es manté una secció imprimible per
a la comprovació petita. S’han verificat volum analític, suma dels volums
de peces i raigs lliures als dos controls generats. El petit dona 10.880 mm³.

## Revisió i tancament local

L’últim encàrrec de Kimi s’ha aturat pel pressupost de temps, al 81,99% de
quota global consumida. No s’ha acceptat automàticament: l’agent principal
ha revisat els fitxers, corregit el pressupost total de talladors independent
dels seus ids/colors, i afegit una fallada injectada en la inspecció del
resultat de la resta (neteja també de resultats i unions).

**201 proves de suite, 10 específiques de túnel i construcció estàtica
correctes.** Les dues comandes de generació també passen les seves
comprovacions. Laminador i impressió física continuen pendents.
