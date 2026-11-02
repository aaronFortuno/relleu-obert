# RO-034 — Obertures experimentals i portals

Treball delegat del 2026-11-02. **Nucli implementat i retornat a l’agent principal per integrar i validar:**
passos sintètics i túnel principal de Rajadell amb centreline lliure provats
localment. No s’ha declarat reconstrucció fidel ni validació d’impressió.

## Nucli i integració

`src/procedural-tunnels.js` exporta
`generateProceduralTunnelVoids(features, elevationAt, options)` amb activació
explícita `enabled:true`. Per defecte no genera ni excava res.

Opcions requerides en activar: `projection`, `verticalReference`, `ground` i
callback DEM original. Opcions d’impressió: `minBaseMM:2.5`,
`minOpeningMM:1.2`, `maxTunnels:24`, `surfaceRiseMM:0`. Aquesta última ha de
rebre el realç dels camins de la maqueta.

El resultat és `{items,warnings,metadata}`. Cada item conté vèrtexs/caretes
tipats d’un tallador tancat, eix original i prolongat, secció en mm,
identificadors de les entitats font, mètode estimat i distàncies de
prolongació dels dos portals. No s’utilitza `layer` com a profunditat.

Els trams MVT `brunnel=tunnel` s’uneixen només en extrems inequívocs del
mateix grup de classe/nivell/nom; duplicats invertits s’eliminen. El DEM es
consulta als extrems originals abans del retall de la peça. Les cotes
interiors s’interpolen per distància acumulada. La secció rectangular és una
aproximació de visualització/impressió, no una mesura de l’interior real.

`src/tunnel-operations.js` exporta
`carveTerrainTunnels(staticParts, items, api, limits)` amb resultat
`{parts,warnings,metadata}`. Fa servir les restes booleanes auditades de
RO-024 només sobre `terrain`, `forest`, `grass` i `roads`. **Cal cridar-ho
abans d’afegir taulers i pilars a roads**, edificis i arbres. Els altres ids,
incloent mar i aigües interiors, conserven les peces originals. Una fallada
restaura totes les capes atòmicament, amb avís.

L’agent principal integra la UI, worker, geometria i conservació de
procedència durant canvis incrementals d’edificis. Checkbox compacte,
desactivat per defecte: «Túnels estimats · experimental».

## Criteris conservadors

- Base mínima intacta; rebutjar perfils que hi baixen.
- Secció mínima física, amb advertència sobre l’aproximació.
- Ometre traçats que intersequen aigua, també després de prolongar portals.
- Comprovar cobertura al centre i vores del tallador sobre la graella real
  del model; una vall oberta entre dos trams coberts no es presenta com un
  túnel continu.
- Prolongar cada extrem seguint-ne el pendent, amb passos de 0,25 mm i
  límit curt. Cal que la cara del tallador quedi fora del terreny, admetent
  com a màxim 0,05 mm a l’arrencada del pis per interpolació numèrica.
- Límits: 50.000 entitats, 256 fragments/10.000 punts totals, 1.000 punts per
  eix, 24 túnels i 4.096 mostres de cobertura per túnel. Un cas descartat no
  bloqueja la regió.

La mostra MVT de Rajadell encara no acredita portals ni secció. Aquests
controls geomètrics no converteixen la interpolació en una dada mesurada.

## Comprovacions executades

- `tests/tunnel-operations.test.js` i `tests/solid-tunnel.test.js`: **15/15**.
  Pas lliure entre dos portals i a les costures de peces de 200 mm, base
  intacta, categories protegides, volums conservats i retorn atòmic en error.
- Focus final dels tres fitxers nous i regressions de RO-024: **26/26**
  (16 noves i 10 preexistents), incloent camins realçats 1 mm.
  El sintètic integrat comprova activació off/on, canvis incrementals,
  procedència conservada i pas lliure també en les malles llegides del 3MF.
- Build de producció correcte; els avisos habituals de mida de chunks es
  mantenen. Revisió de navegador, suite completa i laminador a càrrec de
  l’agent principal abans d’acceptar.

La prova de partició va trobar un defecte general de `mesh-tiles.js`: una
capa només tangent a la costura podia conservar triangles de volum zero.
Ara s’omet exclusivament el resultat de volum exactament zero. La regressió
també conserva una capa positiva de 0,001 mm de gruix a banda i banda i el
volum total, sense tolerància positiva que la pogués eliminar.

## Problema dels portals i canvi de criteri acordat

La comprovació integrada va fallar després de tres intents amb el criteri
inicial. Es va retornar el problema exacte a l’agent principal, mantenint
les proves de Rajadell sense eliminar-les ni passar-les a skip. L’agent
principal va autoritzar un nou criteri experimental motivat, comprovat en
un nou intent que va passar les 15 proves.

El fragment principal `1820235140` fa aproximadament 9,73 mm a la maqueta
inicial de 150 mm. Una extensió fixa de 0,49 mm deixava una tapa de carretera
al portal, detectada amb `rayCast`. El límit adaptatiu inicial era
`max(2,min(8,length*.4))`, aproximadament 3,89 mm. En un extrem el terreny
continua 0,42 mm sobre el pis a 4 mm de prolongació, 0,27 mm a 6 mm i
0,015 mm a 8 mm. Amb aquell límit, el nucli ometia el túnel davant la impossibilitat
d’obrir ambdues boques.

La decisió de l’agent principal permet fins a **8 mm de maqueta i 100 m
reals per portal**, el menor dels dos límits, independentment del 40% de la
llargada cartografiada. Sempre dins del mode experimental explícit, amb
secció i portals estimats. Si encara no hi ha sortida, s’omet amb avís.

Les prolongacions en mm i metres i els extrems DEM originals consten a la
procedència. Si algun portal supera 25 m reals o el 40% de la llargada
original, apareix un avís específic de prolongació important. Aquest criteri
no acredita la geometria real: s’ha de contrastar amb fonts de major precisió.
Les coves, baumes i arcs naturals RO-035 continuen fora d’aquesta aproximació
lineal.

## Integració i limitació trobada al navegador

Suite completa de l'agent principal: **262/262**, build correcte. A la
regió remota real de 3 km, 150 mm i resolució 24, els nou candidats de
túnel s'ometen amb avís: dos massa curts i la resta sense sortida de portals
dins dels límits establerts. El fitxer exportat registra `count:0, omitted:9`;
no conté cavitats inventades ni es declara aquest cas resolt. La prova amb
fixtures de Rajadell sí acredita el recorregut lliure al cas de control.

RO-034 continua obert per estudiar discrepàncies entre dades remotes,
fragments MVT entre tessel·les, DEM i malla generada a diferents escales.
La generalització no queda acreditada per la mostra local. No ampliar
silenciosament els límits per aconseguir un resultat visual.

Comprovació addicional de la mostra inicial al navegador: amb detall
equilibrat (resolució 36) també s'omet el túnel principal. El diagnòstic
numèric del terreny coincideix: a resolució 24 calen prolongacions de
2,5 i 7,75 mm; a 36, d'11,75 i 18 mm; a 56, de 10,75 i 17,5 mm. Aquests
últims valors excedeixen els límits admesos i no s'han ampliat per forçar
l'obertura. La mostra amb detall ràpid és el cas de control, no una garantia
per als altres detalls.

Cas de control també completat a la UI local: mostra inicial, detall ràpid,
checkbox experimental activat. El 3MF descarregat conté un túnel aplicat.
Les tres malles llegides del fitxer accepten els 12 segments de comprovació
sense impactes al recorregut central. Prolongacions registrades: 77,5 i
25 m. Aquesta comprovació és geomètrica; el laminador i la impressió física
encara s'han de validar.

## v0.18 — Portals contra la superfície generada

El diagnòstic de detall 36/56 mostra que el portal original DEM queda
entre 0,65 i 1,84 mm sota la carretera generada. Moure linealment tot el
perfil als portals feia perdre cobertura interior; s'ha descartat aquest
criteri. Ara es conserva el perfil interior original i es prefereix la
prolongació amb el pendent original quan permet sortir a superfície.

Només si aquesta prolongació falla, es pot connectar cada entrada amb
una rampa estimada fins a la superfície generada. Límits explícits:
pendent físic màxim del 25%, correcció vertical màxima de 25 m reals i
la mateixa extensió màxima de 8 mm / 100 m (el menor). No s'amplien
silenciosament les distàncies. Cotes originals, ajustos verticals, pendents,
extensions i recorregut final `pathMM` queden a la procedència, amb avís.
No es presenta aquesta rampa com la cota mesurada de la carretera real.

El cas de control prova 1,5 km / 150 mm a resolucions 24, 36 i 56 i un
retall desplaçat de 3 km / 300 mm a resolució 36. Comprova el pas central
lliure a totes les malles i al 3MF serialitzat. A 3 km / 150 mm el turó
no té cobertura física suficient per a l'obertura mínima: s'omet amb
motiu explícit, en lloc de forçar-la. La base i l'aigua continuen protegides.

El detall alt superava el pressupost de 10.000 components abans de la
resta perquè intentava unir tota la regió. Ara es comproven les envolupants
dels components i només entren a booleans els propers als talladors.
Els altres es recombinen sense alterar coordenades ni triangles. No s'ha
pujat el límit global. Una regressió amb 10.001 prismes llunyans i un de
proper comprova buffers, volums i pas lliure; també s'excava la nova
categoria ferroviària, mantenint protegits els edificis i els arbres.

La primera comprovació d'aquests buffers va revelar un reordenament de
vèrtexs en compactar components. Corregit conservant l'ordre original de
vèrtexs i triangles. El test manté la igualtat exacta dels buffers, però
informa d'un error compacte si falla: el diff numèric massiu consumia
memòria sense ajudar al diagnòstic. Les set proves d'excavació passen
després d'aquesta correcció, inclòs el cas de 10.001 prismes llunyans.

Validació final de suite, navegador i fitxer descarregat a l'historial
v0.18. Les cavitats naturals RO-035 i la geometria interior mesurada no
queden resoltes per aquesta aproximació experimental.
