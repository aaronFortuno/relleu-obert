# RO-050 — Ferrocarrils diferenciats

Implementació i integració (2026-11-02). Validacions locals finals a
l'historial del lot; laminador i impressió pendents. No s'ha fet cap
comprovació remota.

## Comportament

- `railRise` és l'increment físic de maqueta sobre `roadRise`: 0, 0,5 o 1 mm,
  amb 1 mm per defecte. No es multiplica per l'exageració vertical.
- Categoria semàntica nova `railways`, al final de les vuit categories
  existents. El selector de material pot assignar-la independentment; no
  exigeix un novè filament. Per defecte comparteix material amb els camins.
- Fonts: classes ferroviàries i `transit` amb subclass ferroviària, o etiqueta
  `railway` explícita. `track` continua sent un camí. Traçats etiquetats com
  abandonats, en desús, desmuntats, en construcció o proposats s'ometen,
  sense reconvertir-los en carreteres.
- Superfície: plataforma contínua amb mínim de 0,44 mm d'amplada. La petjada
  ferroviària preval a la mateixa superfície de terreny quan creua un camí;
  el desnivell addicional és un realç didàctic, no un pas elevat mesurat.
- Pont ferroviari: el gruix addicional s'afegeix sobre la cota de superfície
  de la font; la cara inferior, els estreps i els pilars conserven les cotes.
  El pont i els seus suports formen un sòlid de la categoria ferroviària.
  Les connexions segueixen només altres vies ferroviàries.
- Una línia `brunnel=tunnel` no crea cap plataforma a la superfície. No
  s'han afegit carrils a l'interior dels buits en aquesta tasca; aquesta
  geometria podria reduir l'obertura mínima i necessita coordinació amb
  RO-034. Tampoc es modelen encara dos carrils ni travesses individuals.
- Les petjades de ferrocarrils es resten del bosc i mantenen fora arbres i
  pilars d'altres infraestructures. Les malles i procedència es conserven
  durant les actualitzacions incrementals d'edificis/vegetació.

## Materials i compatibilitat

`normalizeAssignments` admet assignacions antigues de vuit categories i les
converteix en nou, copiant per al ferrocarril l'assignació dels camins sense
modificar l'array original. Les paletes continuen sent d'1, 2, 4 o 8 materials.
Amb 8 materials, les primeres vuit categories mantenen els colors anteriors i
el ferrocarril comparteix el material 4 per defecte. Pot canviar-se al selector.

`provenance.railways` registra l'increment i el realç total. Els perfils de
pont també indiquen `railway`, `surfaceRiseMM` i `printableThicknessMM`; les
coordenades font dels taulers no es modifiquen.

## Comprovacions executades

- 8 proves noves a `tests/railways.test.js`, incloses nou combinacions de
  realç de camins/vies, classificació semàntica, túnel sense línia exterior,
  pont procedimental i tauler conegut, cotes de pilars/cara inferior,
  actualitzacions incrementals i procedència del 3MF.
- Regroupament amb 1/2/4/8 filaments, assignació independent i migració
  d'assignacions antigues conservant tots els triangles.
- Focus final de quatre fitxers: **35/35 correctes**.
- Build de producció: **correcte**, 3,89 s; avisos habituals de mida de chunks.
- Integració final del lot: **284 casos únics correctes** i build final en
  4,15 s; execució per blocs amb vigilància de memòria, detallada a l'historial.

Controls, actualització de `railways` al worker i render parcial integrats.
Revisió visual local a 1280×720: control compacte al costat del realç de
camins, capçaleres i footer visibles amb scroll intern; categoria present a
la llegenda amb assignació pròpia. No es pressuposen prova física ni
validació de colors al laminador només perquè aquests tests passen.
