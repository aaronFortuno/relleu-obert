# RO-032 — Cobertes originals i primer singular

Implementació v0.18.0, 2026-11-02. La cobertura general de Tamariu continua
oberta: Catastre aporta volums, però no plans de teulada. No s'han inventat
pendents sobre aquestes parts ni fusionat proveïdors per proximitat.

## Font sota demanda

El selector «OpenStreetMap · cobertes i parts» consulta dades originals via
[Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API). Conserva IDs,
etiquetes, patis, parts i procedència. Les parts substitueixen només l'àrea
que ocupen dins de l'envolupant; la resta de petjada es conserva.

Consulta de fins a 16 km², dos servidors seqüencials i 10 s per servidor;
resposta màxima de 6 MB, 20.000 elements, 1.500 edificis i 40.000 punts.
Memòria cau de vuit consultes durant deu minuts; els errors es poden
reintentar. El segon servidor usa l'[endpoint publicat per
Private.coffee](https://overpass.private.coffee/). No es fa servir l'API
d'edició d'OSM com a alternativa de lectura massiva.

Si el servei falla, es conserven els edificis OSM vectorials amb avís;
el resum i la procedència indiquen que no s'han obtingut cobertes originals.
Una resposta incompleta amb `remark` no es presenta com una regió buida.

## Representació

El mode «Altura i coberta de les dades» interpreta `roof:shape`, altura,
angle i direcció/orientació. Admet dues aigües, un vessant, quatre aigües,
piramidal, volta i cúpula el·líptica. Les formes que exigeixen una petjada
rectangular o el·líptica la comproven abans de generar-la. Amb dades
insuficients es manté la coberta plana i es registra el motiu.

Una direcció explícita preval; quan s'utilitza la convenció S3DB del costat
més llarg o es deriva l'altura de l'angle, es registra com a derivació,
sense atribuir-la a una mesura. Les altures per nombre de plantes són
estimacions de 3 m/planta; l'absència d'atributs no acredita una altura real.
`min_height` conserva parts elevades en aquest mode. Els modes limitat i
petjada mantenen el comportament anterior; per veure teulades cal triar
el mode de la font.

Semàntica segons [Simple 3D Buildings](https://wiki.openstreetmap.org/wiki/Simple_3D_Buildings):
`roof:direction` indica el sentit del vessant principal, no l'azimut del
carener; `height` inclou la coberta i `min_height` es mesura des del terra.

## Torre Glòries

La fixture [osm3d-glories.json](../public/data/osm3d-glories.json) conserva
el [way OSM 44213122](https://www.openstreetmap.org/way/44213122) i els nodes
originals, amb llicència ODbL. Atributs: altura 144,4 m, cúpula de 68 m i
petjada el·líptica. Es representa amb sis anells i 24 sectors, evitant que
una única punta la converteixi en un con. És una reconstrucció paramètrica
basada en aquests atributs, sense atribuir-hi una malla mesurada ni els
detalls de façana.

Punt de comprovació: `41.40285,2.18995`, peça de 15 cm, escala 1:2000,
font OSM de cobertes i mode d'altura de les dades. La fixture és una prova
de desenvolupament; no substitueix silenciosament un servei remot fallit.
Sagrada Família i altres edificis complexos continuen pendents de dades i
suport adequats: no s'infereix una forma pel nom de l'edifici.

## Comprovacions i límits

Dotze proves noves cobreixen atributs, parts, patis, geometria incompleta,
memòria cau, errors, límits, temps d'espera, modes limitat/font, parts
elevades i Torre Glòries. La cúpula s'audita com a malla i la procedència es
llegeix del 3MF exportat. Lot final amb 284 casos únics i build correctes;
navegador i resultats del servei es registren a l'historial d'aquest lot.

Prova local real: dos endpoints amb GET des del navegador i comprovació
POST acotada també esgoten el temps d'espera; no s'acredita una consulta
remota reeixida en aquest entorn. El navegador conserva els cent fragments
OSM de la regió de Barcelona amb avís explícit de cobertes indisponibles.
La Torre Glòries del resultat alternatiu continua plana; la fixture de
desenvolupament és la que acredita els paràmetres de la cúpula.

Laminat i impressió física encara requereixen validació. La disponibilitat
de paràmetres OSM varia segons la regió; aquesta integració no dona per
resolta la reconstrucció de totes les teulades de Tamariu.
