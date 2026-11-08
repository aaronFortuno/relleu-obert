# RO-014 — Proposta d’implementació: marc imprimible independent

2026-11-01 · Proposta per a una futura iteració 0.x; **no és codi implementat ni validat**. Relació amb [Ajornaments i idees](AJORNATS.md#ro-014--marc-imprimible-independent) i [RO-024-SOLIDS.md](RO-024-SOLIDS.md). RO-024 no està resolt: aquesta proposta **no presumeix unió booleana validada ni ajust físic confirmat**; el marc és geometria pròpia tancada i la impressió queda com a validació separada de l’usuari.

## 1. Propòsit i decisions de l’usuari

Generar un marc imprimible com a **fitxer independent** de la maqueta: un anell rectangular que envolta el **perímetre exterior global** del model muntat, sense tocar el terreny ni les seves costures. El marc de previsualització (`src/preview-frame.js`) és escènic, no s’exporta i no es toca.

Decisions d’usuari (defectes segurs entre parèntesis):

- Exportar marc o no (**desactivat**).
- Holgura d’encaix `clearance` (**0,4 mm**) i amplada de la vora `rim` (**8 mm**): vegeu §2, són coses diferents.
- Alçada de l’anell `frameHeight` (**12 mm**).
- Llargada màxima de segment `segmentMax` (**180 mm**), derivada del llit que l’usuari declari; l’eina no assumeix cap llit concret.

No decisions d’aquesta línia: etiquetes (RO-016), complements (RO-017), unió marc-terreny (RO-024), encaixos mecànics entre segments (fase posterior), solera `base > 0` (ajornada, vegeu §6).

## 2. Secció transversal única i precisa

Un sol perfil: **anell obert rectangular** (sense fons, `base=0`), definit per tres paràmetres:

- **Obertura interior** = `(W_model + 2·clearance)` × `(H_model + 2·clearance)`. La cara interna de l’anell queda a `clearance` del model: és la **tolerància mecànica**, l’única separació entre terreny i marc. No hi ha cap «marge buit» addicional: un marge de 6 mm + holgura deixaria el model ballant i no donaria ajust.
- **Vora `rim`**: banda decorativa i estructural **a fora** de l’obertura. Dimensió exterior del marc = `(W_model + 2·(clearance + rim))` × `(H_model + 2·(clearance + rim))`.
- **Alçada `frameHeight`**: cota Z de l’anell, des de Z=0 (plà de la base del model).

Rangs admesos: `clearance` 0,2–1 mm; `rim` 3–15 mm; `frameHeight` 5–40 mm. Només aquests tres controls: la versió anterior amb `margin` + `wall` + `clearance` era redundant i contradictòria, i queda descartada.

`W_model`/`H_model` són les dimensions impreses finals de la maqueta sencera (després de mida objectiu i retall; l’exageració vertical ja és dins dels vèrtexs i no afecta el marc). El marc escala amb la mida triada sense cap factor addicional.

Exemples exactes amb `clearance=0,4`, `rim=8`:

- Model **200 × 200 mm** → obertura 200,8 × 200,8; exterior **216,8 × 216,8 mm**.
- Model **400 × 400 mm** → obertura 400,8 × 400,8; exterior **416,8 × 416,8 mm**.

## 3. Segmentació: només el perímetre global, en tires i cantonades

El marc és **sempre global** (envolta el model muntat sencer). Mai un marc per peça de terreny: quatre marcs de 20 cm introduirien vores i buits dins del paisatge continu de 40 cm, i una peça de terreny de 200 mm amb marc propi superaria un llit de 200 mm. El terreny no es reescala ni se li toquen les costures.

Com que l’anell global pot superar el llit, es **divideix el propi anell** en segments imprimibles independents:

- **Tall per línies del buit**: 4 **cantonades** quadrades de `rim` de costat + 4 **tires** rectes de llargada `costat_obertura` i secció `rim × frameHeight`. Talls plans i rectes (juntes a topall, sense angles de 45°).
- Si una tire supera `segmentMax`, es subdivideix en trams iguals de llargada `≤ segmentMax`. El límit s’aplica sobre la llargada de la peça, no sobre la diagonal del llit.
- Cada segment és un fitxer/cosa amb **origen i transformació propis**: es genera en coordenades globals del model i es desa amb la translació que el porta a origen local per imprimir; `muntatge` de l’arxiu registra la transformació inversa per col·locar-lo. Identificadors propis del marc (`marc-N1…Nn`, `marc-E…`, `marc-S…`, `marc-O…`, `marc-CNE` cantonades…), **independents dels ids de les peces de terreny**, en un `muntatge-marc.json` separat del `muntatge.json` del terreny.

Exemples (amb els valors de §2 i `segmentMax=180`):

- Model **200 mm**: tire de 200,8 mm → 2 trams de **100,4 mm** per costat. Total: 8 tires + 4 cantonades (8 × 8 mm) = **12 segments**, tots ≤ 180 mm. Sense segmentació l’exterior seria 216,8 mm, que pot no cabre al llit de l’usuari.
- Model **400 mm**: tire de 400,8 mm → 3 trams de **133,6 mm** per costat. Total: 12 tires + 4 cantonades = **16 segments**.

**Primera fase sense encaixos**: juntes planes a topall, alineació manual sobre una superfície plana guiant-se pel perímetre del model muntat i l’esquema d’ids; l’usuari pot enganxar els segments si vol rigidesa. Encaixos mascle/femella o pinyons d’alineació queden com a fase posterior documentada, no com a requisit inicial. L’estratègia de marc gran **és aquesta segmentació del perímetre**; no queda ajornada cap decisió d’abast.

Cas límit declarat: si fins i tot una cantonada o un tram mínim no cap (llit < ~50 mm), l’exportació del marc es bloqueja amb missatge explícit.

## 4. Geometria i integració

Nou mòdul proposat `src/printable-frame.js`, API pura sense THREE:

- `frameSegments({width, height, clearance, rim, frameHeight, segmentMax})` → llista de `{id, vertices: Float32Array, faces: Uint32Array, transform}`: anell segmentat segons §3, cada peça tancada i orientada, en el mateix format de parts que consumeixen els exportadors (`threeMF`, `stlZip` de `src/export.js`).
- Validació de cada segment amb el motor Manifold existent (`status()==='NoError'` o error explícit), com fa `splitModel` a `src/mesh-tiles.js`.

Integració:

- **Fora del flux de materials**: el marc no entra a `CATEGORIES` ni a `defaultAssignments` de `src/materials.js`; s’exporta com a fitxers propis (`marc-*.3mf` o `marc-stl.zip`) dins del ZIP d’exportació, o com a descàrrega separada. No altera les 8 categories ni les paletes validades.
- **Provenança**: `muntatge-marc.json` amb paràmetres (`clearance`, `rim`, `frameHeight`, `segmentMax`), dimensions del model, ids, transformacions per segment i esquema de muntatge en text pla.
- **Còpia d’exportació**: com RO-024-SOLIDS.md exigeix, les malles de preview i la seva procedència no es toquen; el marc es genera a partir de les dimensions, mai modificant `model.parts`.

Sense dependències noves; tot al navegador, compatible amb GitHub Pages estàtic.

## 5. Convivència amb el marc de previsualització

`createPreviewFrame` usa `rim=6`, `gap=0,5` i caixes decoratives; no surt del render ni forma part de `model.parts`. El marc imprimible té paràmetres independents i semàntica diferent (tolerància real, no gap visual). Per evitar confusió: etiquetes clares a la interfície («marc de visualització» vs «marc imprimible (fitxers separats)»). Sincronitzar la preview amb la geometria real del marc imprimible és una fase posterior opcional, no requisit inicial.

## 6. Solera (base) i posicionament vertical

**`base=0` sempre en la primera fase**: l’anell és obert i el model descansa sobre la mateixa superfície que el marc. Una solera `base > 0` **canviaria la posició vertical del model**: l’hauria d’aixecar `base` mm per sobre del plà del marc i exigiria una llengueta/rebaix per suportar-lo, amb impacte en l’ajust i en l’ús de material. Per això queda **ajornada** i documentada com a extensió futura, no com a paràmetre actiu.

## 7. Interfície, accessibilitat i descobribilitat

- Secció «Marc imprimible» plegada al lateral d’exportació (header/footer sempre visibles, sidebars amb scroll intern, segons AGENTS.md), amb els 4 camps de §1 amb unitats (mm), defectes precarregats i una línia d’ajuda per camp.
- Vista prèvia en text viu: obertura, exterior, nombre de segments i llargada màxima resultant abans d’exportar.
- `<label>` associada a cada control, navegable per teclat, errors en català clar al costat del camp (p. ex. «El tram de 200,8 mm supera la llargada màxima de 180 mm; s’ha dividit en 2 trams.» — informatiu — o bloqueig si no hi cap segment possible).
- Una sola casella «Exportar marc imprimible» a prop de les opcions d’exportació existents; cap menú nou de primer nivell.

## 8. Implementació per fases (fitxers reals)

1. **Geometria pura**: nou `src/printable-frame.js` amb `frameSegments` i validació de paràmetres. Sense UI.
2. **Proves de geometria** (futures, no executades en aquesta proposta): nou `tests/printable-frame.test.js` amb node:test: obertura/exterior exactes segons §2, recompte i llargades de segments dels exemples de 200/400 mm, cares orientades, error amb paràmetres invàlids.
3. **Exportació**: emissió de `marc-*` i `muntatge-marc.json` al flux d’exportació existent (`src/mesh-tiles.js` `tileArchive` i l’exportació d’una peça), sense tocar els fitxers del terreny.
4. **UI**: secció del §7 seguint l’estil de `src/dialogs.js` / `src/building-options.js`, estat persistent local.
5. **Posteriors opcionals**: encaixos entre segments, solera `base>0`, previsualització del marc real.

Cada fase amb versió 0.x i entrada de backlog/historial; mai 1.0 sense petició explícita.

## 9. Gestió d’errors i límits

- Paràmetres fora de rang → error abans de generar, sense fitxers parcials.
- Cap retall silenciós: si `segmentMax` és impossible, bloqueig amb missatge i alternatives.
- Segment no tancat segons Manifold → error explícit; cap reparació silenciosa (criteri de RO-024-SOLIDS.md).
- Si el model no té dimensions finites, el marc no es genera i **l’exportació del model continua sense ell** (fallada aïllada).
- Límits declarats: no garantim ajust físic, rigidesa de les juntes a topall ni compatibilitat amb tots els laminadors/materials; la tolerància per defecte no és un encaix universal i queda registrada a la provenança.

## 10. Criteris d’acceptació (futurs, no executats)

1. **Geometria manifold** (automàtica): tots els segments passen Manifold `NoError`; obertura i exterior coincideixen amb §2 ±0,01 mm; recompte i llargades dels exemples de 200/400 mm exactes; suite completa existent i build estàtic en verd.
2. **Dimensional** (automàtica + revisió): amb model de 200 × 200 mm, els fitxers exportats mesuren les cotes de §3; `muntatge-marc.json` reprodueix paràmetres, ids i transformacions.
3. **Laminador** (usuari): els segments s’obren al seu laminador sense errors de malla i amb les dimensions esperades; captures registrades.
4. **Ajust físic** (usuari, dins de RO-024 fase 5): el model muntat entra a l’obertura amb la holgura triada; mesures i observacions documentades abans de tocar el defecte de `clearance`.

Cap d’aquests criteris es dona per complert per haver escrit aquest document; RO-014 té la **implementació pendent** fins a implementació i validació.
