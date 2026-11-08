# RO-016 — Proposta d’implementació: plaques i etiquetes educatives

2026-11-01 · Proposta per a una futura iteració 0.x; **no és codi implementat ni validat**. Relació amb [Ajornaments i idees](AJORNATS.md#ro-016--plaques-i-etiquetes-educatives), [RO-014-PROPOSTA.md](RO-014-PROPOSTA.md) i [RO-024-SOLIDS.md](RO-024-SOLIDS.md). RO-024 no està resolt: aquesta proposta **no presumeix unió booleana validada**; la placa és geometria pròpia tancada i independent.

## 1. Propòsit i abast

Generar una **placa imprimible independent** del model amb text educatiu: **nom del lloc**, **coordenades** (provenència de la selecció existent) i/o **text lliure** de l’usuari («Serralada», «Estret», «Badia»...). Primera fase: **només placa separada**, mai integrada al terreny ni al marc. La integració amb marc (RO-014) o terreny queda **condicionada a RO-024** (unió validada de volums): sense unió booleana validada no es fon text amb el model.

No decisions d’aquesta línia: marc imprimible (RO-014), complements/rosa dels vents (RO-017), unió de volums (RO-024), tipografia descarregable de xarxa (§3).

## 2. Comportament actual vs planificat

**Actual:** `src/export.js` (`threeMF`, `stlZip`) exporta les parts agrupades per material segons `src/materials.js` (`CATEGORIES`, 8 categories fixes, `defaultAssignments` de 1/2/4/8 materials); no existeix cap categoria, geometria ni flux de text. `src/preview-frame.js` és escènic i no s’exporta. Les coordenades de la selecció viuen a la provenança del model (`model.provenance`).

**Planificat (no implementat):** nou mòdul `src/printable-label.js` que genera peces de placa (base + lletres en relleu) com a parts addicionals amb **id propi**, exportades com a fitxers separats dins del ZIP/3MF o com a descàrrega apart, sense tocar les parts del terreny.

## 3. Geometria de text determinista al navegador

- **Font vectorial pròpia incrustada al codi** (sense dependència de xarxa ni de font del sistema): conjunt reduït de glifos definit com a contorns 2D (polígons amb forats) d’una font lliure amb **llicència comprovada i registrada** (p. ex. OFL, amb fitxer de llicència a `public/licenses/` com ja fa el projecte). Sense pla de llicència no s’incrusta res; alternativa de rescat: glifos propis traçats manualment per al subconjunt necessari.
- **Subconjunt suportat:** A–Z, a–z, 0–9, espai i puntuació bàsica, **amb accents catalans complets** (à é è í ï ó ò ú ü ç, majúscules incloses, i l’apòstrof i la ela geminada «·»). Qualsevol caràcter fora del subconjunt → error explícit a la UI, no substitució silenciosa.
- **Determinisme:** els contorns són dades fixes del repositori; la geometria resultant és idèntica byte a byte entre navegadors i sessions (mateix criteri de repetibilitat que el terreny). No s’usa `canvas.measureText` ni fonts del sistema, que variarien la geometria.
- **API proposada (pura, sense THREE):**
  - `labelParts({lines, align, plateWidth, plateDepth, plateHeight, textHeight, relief, strokeMin})` → llista de `{id, vertices: Float32Array, faces: Uint32Array, transform}` en el format de parts que consumeixen `threeMF`/`stlZip` de `src/export.js`.
  - `layoutText(lines, textHeight)` → caixes de glifos, avanços, amplada per línia i recompte, per a la vista prèvia i la validació d’abast (§5).
  - Validació de cada peça amb el motor Manifold existent (`status()==='NoError'` o error explícit), com a `splitModel` de `src/mesh-tiles.js`.

## 4. Dimensions físiques i llegibilitat mínima

Valors per defecte entre parèntesis; rangs admesos:

- **Alçada de lletra** `textHeight` (**6 mm**, rang 4–20 mm). **Traç mínim de glif** `strokeMin` (**0,8 mm**, mai sota 0,6 mm): si escalar un glif el deixa sota el mínim, es rebutja l’alçada amb missatge; no es genera traç sub-mínim.
- **Relleu** `relief` (**1,2 mm**, rang 0,6–3 mm) per sobre de la base de la placa; relleu positiu (en alt), no gravat, per llegibilitat amb un sol color i pintura posterior opcional.
- **Placa base:** gruix `plateHeight` (**3 mm**, rang 2–6 mm); marges laterals ≥ 2 mm al voltant del text; marge superior/inferior ≥ 1,5 mm. Cantonades arrodonides opcionals en fase posterior.
- **Orients de lectura:** la placa estàndard es llegeix **de cara (Z amunt)** sobre el llit. Variant **lateral**: la mateixa placa generada vertical (text llegible quan el model és en una prestatgeria vist de front); s’exporta amb la transformació adequada i origen propi perquè el laminador la col·loqui plana. Ambdues variants són fitxers independents; no s’adhereixen a res.

## 5. Text: línies, abast, límits i seguretat

- **Tres línies màxim:** línia 1 = nom del lloc (precarregada des de la provenança), línia 2 = coordenades (format `41.91814, 3.20528`, generat des de la selecció, editable), línia 3 = text lliure opcional.
- **Límits d’entrada:** 60 caràcters per línia, 3 línies; amplada màxima de línia `plateWidth − 4 mm`: si una línia no hi cap, **no s’escala automàticament**; error amb suggeriment (escurçar, pujar `plateWidth` o baixar `textHeight` dins de rang). Sense retalls silenciosos.
- **Seguretat:** el text **només es tracta com a dades geomètriques**; mai s’injecta al DOM com a HTML. A la UI s’assigna via `textContent`; a la provenança es serialitza amb JSON. Escapament idèntic al ja existent `esc()` de `src/export.js` per a qualsevol metadada XML. No s’accepta marcat ni entitats; els caràcters fora del subconjunt de glifos es rebutgen abans de generar.
- **Coordenades i rotació:** les coordenades corresponen al **centre de la selecció geogràfica original** (provença de `model.provenance`), no a la peça impresa. Si l’usuari **gira el model** a la vista o retalla en mosaic, la coordenada de la placa **no canvia** i la provenança registra la rotació aplicada, perquè la placa segueixi sent veraç respecte al mapa. La placa **no altera els límits geogràfics, el retall ni l’escala del terreny**: es genera a partir de metadades, mai tocant `model.parts` del terreny.

## 6. Sortides, materials i mosaic multi-peça

- **Fora del flux de materials del terreny:** la placa **no entra** a `CATEGORIES` ni a `defaultAssignments` de `src/materials.js`; no altera les 8 categories ni les paletes validades. S’exporta com a fitxers propis: `placa-*.3mf` o dins `placa-stl.zip`, amb base i lletres com a **dues parts separades** (base / relleu) perquè l’usuari hi assigni dos filaments si vol contrast, o una si prefereix monocrom.
- **Provenança:** `placa-muntatge.json` amb línies de text, `textHeight`, `relief`, variant (frontal/lateral), coordenades, rotació del model en el moment d’exportar, transformacions i versió. Separat del `provenance.json` del terreny.
- **Mosaic multi-peça:** la placa és **global** (una per model exportat, ancorada a la selecció sencera), no una per tauler. La propietat geogràfica del text és del model muntat; si hi ha diverses peces de terreny, la placa no duplica coordenades per peça. Es documenta que la col·locació física (al costat del model, al marc RO-014, o enganxada) és decisió de l’usuari.

## 7. Interfície i accessibilitat

- Secció «Placa educativa» plegada al lateral d’exportació (header/footer sempre visibles, sidebars amb scroll intern, segons AGENTS.md), amb camps: activar placa (desactivat per defecte), nom, coordenades, text lliure, `textHeight`, `relief`, variant frontal/lateral. Unitats en mm i defectes precarregats.
- **Vista prèvia en text viu:** amplada per línia, dimensions finals de la placa i avisos abans d’exportar («la línia 1 fa 96 mm i supera els 92 mm disponibles»).
- `<label>` associada a cada control, navegable per teclat, contrast de text suficient, errors en català clar al costat del camp i `aria-describedby` per a les ajudes; cap menú nou de primer nivell.

## 8. Implementació per fases (fitxers reals)

1. **Dades i geometria pura:** nou `src/printable-label.js` amb subconjunt de glifos, `layoutText`, `labelParts` i validacions. Sense UI.
2. **Proves de geometria** (FUTURES, no executades en aquesta proposta): nou `tests/printable-label.test.js` amb node:test — amplades de `layoutText` per cadenes conegudes, accents catalans presents (ç, à, é, í, ó, ú, ü, ï, «·»), error amb caràcter fora de subconjunt, dimensions exactes de placa segons §4, peces tancades i orientades.
3. **Exportació:** emissió de `placa-*` i `placa-muntatge.json` al flux d’exportació existent (`src/mesh-tiles.js`, exportació d’una peça), sense tocar els fitxers del terreny ni `src/materials.js`.
4. **UI:** secció del §7 seguint l’estil de `src/dialogs.js` / `src/building-options.js`, estat persistent local.
5. **Posteriors condicionades a RO-024:** unió de la placa al marc (RO-014) o gravat sobre el terreny, només amb unió booleana validada; encaixos físics placa-marc.

Cada fase amb versió 0.x i entrada de backlog/historial; mai 1.0 sense petició explícita.

## 9. Gestió d’errors i límits

- Paràmetres fora de rang, línia que no hi cap, caràcter sense glif o traç sota mínim → **error abans de generar**, sense fitxers parcials ni retalls silenciosos.
- Peça no tancada segons Manifold → error explícit; cap reparació silenciosa (criteri de RO-024-SOLIDS.md).
- Si la generació de la placa falla, **l’exportació del model continua sense ella** (fallada aïllada) i s’informa l’usuari.
- **Limitacions actuals de l’exportador** (existents, no introduïdes aquí): `threeMF` assigna un material per part sencera i el dialecte Bambu pinta per part; per això base i lletres van com a parts separades i no s’ofereix text bicolor dins d’una mateixa peça. `stlZip` no porta color; la separació en dos STL és la via prevista.
- Límits declarats: no garantim llegibilitat amb tots els materials/acabats, ni ajust físic d’enganxada; el relleu per defecte és un punt de partida documentat a la provenança, no una especificació universal.

## Precisió de la revisió

- Mida inicial proposada de placa: 100 × 32 mm; rang 40–180 × 16–80 mm, sempre comprovat contra el llit declarat. Amb els tres textos i lletra de 6 mm, l’amplada es valida abans de generar; el text massa llarg es rebutja o escurça explícitament. Cal oferir amplada/profunditat a la configuració avançada.
- Base entre Z=0 i Z=3 mm; relleu entre Z=3 i Z=4,2 mm amb els defectes proposats, interfície de contacte coherent i cap solapament entre materials. Comprovar continuïtat física; agrupar parts no equival a una unió de sòlids validada.
- Preservar coordenades automàtiques i text editat en camps de procedència diferents; si s’editen les coordenades de la placa, indicar «text personalitzat», sense presentar-lo com a dada del retall.
- Comparar geometria i contingut canònic per al determinisme d’exportació; normalitzar dates/metadades ZIP abans d’exigir igualtat binària.

## 10. Criteris d’acceptació (tots FUTURS, cap executat)

1. **Numèric/manifold (automàtic, futur):** proves de `tests/printable-label.test.js` en verd; totes les peces passen Manifold `NoError`; dimensions i amplades coincideixen amb §4–§5 ±0,01 mm; suite completa existent i build estàtic en verd.
2. **Exportació (automàtic + revisió, futur):** els fitxers `placa-*` s’obren amb dues parts i provenança completa; repetibilitat byte a byte entre dues exportacions idèntiques.
3. **Laminador (usuari, futur):** les peces s’obren sense errors de malla, amb dimensions esperades i separació base/relleu útil; captures registrades.
4. **Llegibilitat física (usuari, futur):** placa impresa llegible a ull a 50 cm en variant frontal i lateral, amb el material de l’usuari; mesures i observacions documentades abans de tocar defectes de traç/relleu.

Cap d’aquests criteris es dona per complert per haver escrit aquest document; RO-016 té la **implementació pendent** fins a implementació i validació.
