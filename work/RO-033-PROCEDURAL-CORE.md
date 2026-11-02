# RO-033 — Nucli procedimental de taulers de pont

**Estat:** integrat a v0.16.0 (2026-11-02). Nucli delegat a Kimi, revisat per l'agent principal i connectat a `geometry.js` i al worker. Taulers coneguts i procedimentals comparteixen suports, enllaços i unions abans de previsualitzar/exportar.

**Revisió 2026-11-02 (3 problemes detectats per l'agent arrel, corregits
sense canviar la signatura de l'API):**

1. **Dedup amb identitat de grup:** la clau de deduplicació ara inclou
   `classe|layer|name` abans de les coordenades; dos ponts amb el mateix XY
   però grup diferent es conserven tots dos, i un duplicat invertit del
   mateix grup encara s'elimina (prova dedicada).
2. **Pressupostos abans d'unir:** `joinFragments` ja no pot rebre entrades
   il·limitades: màxim 1.000 fragments i 20.000 punts totals acumulats abans
   de la unió, i màxim 2.000 punts per línia (si se supera, omesa amb avís). A més, el pressupost de 200 ponts s'aplica DESPRÉS del filtre de
   bbox: ponts aliens a l'àrea mai descarten els de dins (prova de regressió
   amb 250 ponts fora + 1 dins).
3. **Orientació canònica de l'eix:** cada eix unit s'orienta per coordenades
   d'extrems (extrem lexicogràficament menor primer), de manera que invertir
   l'ordre dels fragments d'entrada no mou els pilars entre retalls. I una
   línia amb coordenades invàlides (NaN o fora de lon/lat) es rebutja sencera:
   mai se salta el punt i s'uneixen les vores per damunt d'un buit.

## API

`generateProceduralBridgeItems(features, elevationAt, {scale=.1, minWidthMM=.44, bbox}={})`
→ `{items, warnings}`. Funció pura, síncrona, sense xarxa ni DOM.

- Entrada: features GeoJSON/MVT amb `properties.sourceLayer='transportation'`,
  `brunnel='bridge'` (túnels exclosos), geometria LineString/MultiLineString.
- `elevationAt(lon,lat)`: DEM original (no clamped al retall). Només es
  consulta als **dos extrems** de l'eix; les cotes interiors s'interpolen
  linealment per distància acumulada. Perfils estimats: cada item porta
  `estimated:true` i `elevationMethod:'linear-dem-endpoints'`.
- `bbox` [w,s,e,n]: filtre d'intersecció per bounds de l'eix. Mai retalla
  vèrtexs ni perfil: el mateix pont produeix XYZ idèntics amb o sense bbox
  (prova dedicada).
- Sortida per item: `{id, coordinates:[[lon,lat,z],...], faces,
  outlines:[anellTancatXYZ], axis:[[lon,lat],...], estimated:true,
  widthMetres, elevationMethod, sourceFeatureIds}` — superfície TOP (cinta de
  triangles, normal +Z coherent), pensada per a `deckSurfaceSolid` /
  `projectInfrastructurePath` (≤5000 coordenades XYZ finites garantit).

## Decisions

- **Amplada:** atribut `width` vàlid (0,5–60 m) → `lanes*3,2` (1–12 carrils,
  sostre 38,4 m) → taula de classes (motorway 14, trunk 10, primary 8,
  secondary 7, tertiary 6, residential 5, path/track 2, rail 5; resta 5) →
  mínim físic `minWidthMM/scale`. Amplades absurdes rebutjades amb avís.
- **Offset:** pla mètric local amb `cos(lat)` de referència del primer punt de
  l'eix; joins miter limitats (factor ≤2). Revolts amb dot<−0,5 s'ometen amb
  avís (criteri coherent amb `sweepSection`).
- **Unió:** deduplicació de fragments idèntics i invertits; unió només entre
  extrems inequívocs de grau 2 dins d'~1 m i del mateix grup classe/layer/name.
  Bifurcacions i nivells diferents mai s'uneixen.
- **Robustesa:** si el DEM falla o torna NaN a un extrem, s'omet només aquell
  pont amb avís; la resta de la regió continua.
- **Límits i determinisme:** 50.000 entitats d'entrada, 200 ponts, 1.000 punts
  per eix (decimació conservant extrems). Ordre estable per coordenada
  d'inici; sortida idèntica entre crides (provada).

## Proves i revisió

Resultat final de l’agent principal: **241/241 proves**, build de producció correcte i 145 enllaços locals de documentació comprovats. Només comprovació local; Pages/CI els valida l’usuari.

- 13 proves del nucli procedimental: perfils sobre vall, amplades, corbes, deduplicació, grups de nivell, unió de fragments, invalidesa i pressupostos. Totes passen.
- Tres proves d'integració de l'agent principal: retalls de Rajadell de 600/1.500/2.000 m, gir de 25° i mida física de 40 cm; Rajadell sense fitxers específics; vall sintètica amb camí inferior lliure, comprovant petjades i interseccions d'un raig amb la geometria unida.
- La primera prova sintètica no tenia cap pilar perquè el tauler resultant era més estret que el suport mínim de 0,8 mm. El cas amb suports usa amplada explícita de 20 m; es conserva la comprovació de pilars i pas lliure. Els taulers massa estrets continuen ometent suports amb avís.
- Les dues últimes tasques de Kimi van arribar al seu límit de temps. No s'han acceptat com a entregues completes: l'agent principal ha verificat el nucli, escrit les proves d'integració i executat les comprovacions finals.
- Línies de més de 2.000 punts s'ometen senceres; mai es talla un eix creant un extrem fals per al DEM. Els eixos dins del pressupost es redueixen conservant ambdós extrems.
- Navegador local: zoom de 1,5 km a 750 m i desplaçament fins a 41,7185 / 1,7827, amb viaducte elevat i pilars. 3MF descarregat: onze pilars, unions actives, 156.789 vèrtexs finits dins dels límits de 150 mm i colors de les tres categories presents. No s'ha obert al Bambu ni imprès en aquesta iteració.

## Limitacions

- Cotes interiors estimades, mai mesurades; ponts sobre valls queden plans
  entre extrems (comportament demanat, no una mesura real).
- La unió d'extrems usa graella d'~1e-5° (~1 m); no hi ha snap ponderat.
- L'avís d'entrada >50.000 entitats no té test propi (cost de generar el
  fixture); la resta de límits sí.
- Pilars i unions es calculen a `geometry.js`/`bridge-completion.js`; les col·lisions només tenen en compte els obstacles cartografiats carregats.
- Un perfil lineal entre extrems pot travessar relleus intermedis; falta contrast en més llocs reals. Si no hi ha DEM als extrems originals, s’omet aquell pont amb avís.
- Un tauler més estret que el suport mínim pot quedar sense pilars; cal revisar els avisos i la impressió.
