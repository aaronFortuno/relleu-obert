# RO-017 — Proposta d’implementació: fletxa de nord / brúixola imprimible

2026-11-01 · Proposta per a una futura iteració 0.x; **no és codi implementat ni validat**. Relació amb [BACKLOG.md](BACKLOG.md#ro-017--rosa-dels-vents-i-altres-complements), [RO-014-PROPOSTA.md](RO-014-PROPOSTA.md), [RO-016-PROPOSTA.md](RO-016-PROPOSTA.md) i [RO-024-SOLIDS.md](RO-024-SOLIDS.md). RO-024 no està resolt: **no es presumeix unió booleana validada**; la brúixola és geometria pròpia tancada, en fitxer independent. Abast acotat: **una fletxa de nord inicial**, no una biblioteca d’accessoris.

## 1. Propòsit i abast

Generar una **fletxa de nord imprimible independent** del model: una peça plana amb fletxa en relleu que indica el nord geogràfic del retall, per col·locar-la al costat del model muntat (o sobre el marc RO-014 si l’usuari el genera). Decisions d’usuari (defectes entre parèntesis):

- Exportar brúixola o no (**desactivada**).
- Diàmetre del disc `diameter` (**40 mm**, rang 25–80 mm).
- Gruix del disc `plateHeight` (**3 mm**, rang 2–5 mm) i relleu de la fletxa `relief` (**1,2 mm**, rang 0,6–3 mm), coherents amb RO-016.
- Ubicació suggerida `placement`: «independent» (**defecte**) o «sobre el marc» (només informativa, vegeu §6).

No decisions d’aquesta línia: rosa dels vents completa de 8/16 rumbs, regles graduades, suports, imants, unió al terreny o al marc (RO-024).

## 2. Comportament actual vs planificat

**Actual (codi existent):** no hi ha cap geometria d’orientació exportable. El gir del retall viu a `model.provenance.options.selectionPose.rotation` (generat per `selectionPose` a `src/selection.js:28`, controlat pels botons de `src/main.js:124-125` amb pas de 15° i rang ±90°, i per `placeMap.setRotation` a `src/place-map.js`). La projecció geogràfica→model és `makeProjection` a `src/geometry.js:26-34`. `muntatge.json` de `src/mesh-tiles.js:23` ja avisa: «Consulta el gir del retall a muntatge.json per situar el nord.» La càmera orbital del visor és només escènica: **no modifica cap coordenada del model** i per tant no afecta la direcció del nord.

**Planificat (no implementat):** nou mòdul `src/compass.js` pur, sense THREE, que deriva la direcció del nord en coordenades del model a partir de `selectionPose.rotation` i genera la peça.

## 3. Transformació nord geogràfic → model (derivada del codi real)

Amb `selectionPose` actiu, `makeProjection` (`src/geometry.js:30`) projecta `x = width/2 + (dx·cosθ − dy·sinθ)·sx`, `y = height/2 + (dx·sinθ + dy·cosθ)·sy`, amb `dx,dy` metres est/nord des del centre i `θ = rotation` en graus. La direcció del **nord geogràfic** (augmentar latitud, `dy>0`, `dx=0`) queda en coordenades del model:

- **Vector nord model:** normalitzar `(−sx·sinθ, sy·cosθ)`. Si `sx=sy`, es redueix a `(−sinθ, +cosθ)`. No assumir escales iguals: `makeProjection` accepta mides físiques independents.

Exemples treballats (model vist des de dalt, x a la dreta, y cap a la vora superior impresa; amb `θ=0` el nord cau a `y=height`, la «fila 1 = costat superior» del LLEGEIX-ME):

- **θ = 0°** → nord = (0, +1): la fletxa apunta a la vora superior del model («Nord a dalt», text actual de `src/main.js:67`).
- **θ = +30°** (UI: «girat a la dreta») → nord = (−0,500, +0,866): la fletxa apunta 30° cap a l’esquerra de la vora superior.
- **θ = −30°** («girat a l’esquerra») → nord = (+0,500, +0,866): 30° cap a la dreta de la vora superior.

Equivalència: la peça es genera amb la fletxa cap a +Y local i s’exporta amb una **rotació positiva α al voltant de Z**, amb `α=atan2(−nord.x,nord.y)`; si `sx=sy`, `α=+θ`. La rotació es grava als vèrtexs abans d’exportar i també es registra a la procedència; imprimida i posada amb la fletxa seguint aquella direcció sobre el model muntat, assenyala el nord geogràfic del retall. El marge `±90°` actual dels botons i el `±180°` admès per `selectionPose` es cobreixen amb la mateixa fórmula; no hi ha cas especial.

**Nord geogràfic vs nord de quadrícula:** la projecció és una aproximació equirectangular local centrada al retall; **no es calcula cap convergència de meridians** i per tant no es pot declarar nord de quadrícula UTM ni declinació magnètica. La fletxa indica el **nord geogràfic al centre de la selecció**; per a retalls de l’ordre de centenars de metres a pocs km la divergència amb el nord cartogràfic local és menyspreable per a l’ús educatiu, però **no es quantifica ni es garanteix** en aquesta fase.

## 4. Geometria, mides i peces mínimes imprimibles

- **Disc base** rodó de `diameter` × `plateHeight`, des de Z=0; **fletxa en relleu positiu** sobre el disc (Z de `plateHeight` a `plateHeight + relief`), mai gravada.
- **Fletxa:** triangle allargat amb asta; **traç mínim 1,0 mm** (mai sota 0,8 mm), punta arrodonida a ≥0,8 mm per evitar vores sub-mínimes; llargada de la fletxa ≈ 0,7·`diameter`. Lletra «N» opcional en fase posterior (reusa el motor de glifos de RO-016 quan existeixi; sense ell, sense lletra).
- **Una sola peça tancada** (disc + relleu com a volums units en la malla generada, no com a unió booleana d’exportador), validada amb Manifold (`status()==='NoError'`), com `splitModel` a `src/mesh-tiles.js`. Si es vol bicolor, dues parts separades `disc` / `fletxa` amb la mateixa interfície de contacte que RO-016 §Precisió, sense presentar-ho com a unió validada.
- Límits de llit: `diameter` ≤ llit declarat; si el diàmetre mínim (25 mm) no hi cap, bloqueig amb missatge.

**API proposada (pura, sense THREE):**
- `northVector(rotationDeg, {sx=1, sy=1})` → `{x, y}` unitari segons §3 (funció trivial, però centralitzada i provada).
- `compassParts({diameter, plateHeight, relief, rotation})` → llista de `{id, vertices: Float32Array, faces: Uint32Array, transform}` en el format de parts que consumeixen `threeMF`/`stlZip` de `src/export.js`, amb la rotació α aplicada als vèrtexs de la fletxa; les transformacions de muntatge són metadades, ja que `threeMF`/`stlZip` actuals no interpreten un camp nou `part.transform`.

## 5. Fitxers, materials i provenança

- **Fora del flux de materials:** la brúixola **no entra** a `CATEGORIES` ni a `defaultAssignments` de `src/materials.js`. S’exporta com a `bruixola.3mf` (o dins `bruixola-stl.zip`) al ZIP d’exportació, o com a descàrrega separada, sense tocar els fitxers del terreny.
- **Nomenclatura:** fitxer `bruixola`, ids de part `bruixola-disc`, `bruixola-fletxa`; provenança `bruixola-muntatge.json` separada, amb `rotation` del retall, vector nord resultant, paràmetres, versió i text pla de col·locació («poseu la fletxa paral·lela a la vora indicada…»).
- **Coordenades del terreny inalterades:** la brúixola es genera només a partir de metadades (`selectionPose.rotation`, mides del model); **mai toca `model.parts`, el retall, l’escala ni les coordenades**.

## 6. Col·locació, marc i mosaic multi-peça

- **Peça global única per exportació**, ancorada a la selecció sencera; mai una brúixola per tauler. Les peces de terreny del mosaic (`tilePlan`, `src/selection.js:6`) són una graella eix-alineada **sense gir per peça**: la direcció del nord §3 és la mateixa per a totes, i només té sentit sobre el model **muntat sencer**. **No s’admet ni es promet cap muntatge multi-peça amb peces girades arbitràriament**: si en el futur s’hi afegís, aquesta proposta quedaria obsoleta i caldria revisar la transformació per peça.
- **Col·locació sobre el marc (RO-014):** com que RO-014 també és proposta no implementada, la integració és només informativa: es suggereix una posició (cantonada NE del marc, per exemple) al `bruixola-muntatge.json`, però la brúixola **no s’acopla ni s’uneix** al marc. **Sense col·lisions garantides**: la brúixola no ocupa espai del terreny; la comprovació de que no xoca físicament amb res és responsabilitat de l’usuari en col·locar-la. Retalls/exclusions/tessel·les del terreny no es veuen afectats.
- **RO-024 condiciona** qualsevol unió futura (gravar la fletxa sobre el terreny, fondre-la al marc): ajornada fins a unió booleana validada.

## 7. Interfície i accessibilitat

- Secció «Brúixola» plegada al lateral d’exportació (header/footer sempre visibles, sidebars amb scroll intern, segons AGENTS.md), amb: activar (desactivat), `diameter`, `plateHeight`, `relief`, `placement`. Unitats en mm, defectes precarregats, una línia d’ajuda per camp.
- **Vista prèvia en text viu:** «Nord a 30° a l’esquerra de la vora superior», dimensions finals i avisos, en català; coherent amb el text existent «Nord a dalt / Retall girat…» de `src/main.js:124`.
- `<label>` associada a cada control, navegable per teclat, errors al costat del camp amb `aria-describedby`; cap menú nou de primer nivell; textos via catàleg i18n existent (`src/i18n.js`).

## 8. Implementació per fases (fitxers reals)

1. **Geometria pura:** nou `src/compass.js` amb `northVector`, `compassParts` i validacions. Sense UI.
2. **Proves de geometria (FUTURES, no executades en aquesta proposta):** nou `tests/compass.test.js` amb node:test — vectors dels tres exemples de §3 exactes (±1e-9), dimensions i traç mínim de §4, rotació positiva de la fletxa α (igual a +θ amb escales iguals), cas anisòtrop normalitzat, error amb paràmetres fora de rang.
3. **Exportació:** emissió de `bruixola-*` i `bruixola-muntatge.json` al flux existent (`src/mesh-tiles.js`, exportació d’una peça), sense tocar terreny ni `src/materials.js`.
4. **UI:** secció del §7 seguint l’estil de `src/dialogs.js` / `src/building-options.js`, estat persistent local.
5. **Posteriors condicionades:** «N» amb el motor de RO-016; unió al marc/terreny només amb RO-024 validat; posició sincronitzada amb la preview (escènic, no exportable).

Cada fase amb versió 0.x i entrada de backlog/historial; mai 1.0 sense petició explícita. Compatibilitat navegador + GitHub Pages estàtic, sense dependències noves.

## 9. Gestió d’errors i límits

- Paràmetres fora de rang, `rotation` no finit o |θ| > 180, diàmetre que no cap al llit declarat → **error abans de generar**, sense fitxers parcials.
- Peça no tancada segons Manifold → error explícit; cap reparació silenciosa (criteri de RO-024-SOLIDS.md).
- Si la generació falla, **l’exportació del model continua sense la brúixola** (fallada aïllada) i s’informa l’usuari.
- Límits declarats: no es garanteix precisió de nord de quadrícula ni declinació magnètica (§3); no es garanteix ajust físic sobre el marc; el traç mínim no assegura el resultat amb tots els materials/laminadors.

## Precisió de la revisió

Comprovació numèrica local contra `makeProjection` existent amb 0°, +30° i −30°, tant amb escales iguals com desiguals: vector i signe positiu de rotació verificats. Això valida la fórmula de la proposta, no una brúixola encara inexistent. Exportar vèrtexs ja transformats evita confiar en un camp `transform` que els exportadors actuals ignoren.

## 10. Criteris d’acceptació (tots FUTURS, cap executat)

1. **Numèric/manifold (automàtic, futur):** `tests/compass.test.js` en verd; vectors de §3 exactes; peça Manifold `NoError`; suite completa existent i build estàtic en verd.
2. **Exportació (automàtic + revisió, futur):** `bruixola-*` s’obre amb les cotes de §4 i provenança completa; repetibilitat entre dues exportacions idèntiques.
3. **Laminador (usuari, futur):** la peça s’obre sense errors de malla i amb les dimensions esperades; captures registrades.
4. **Física (usuari, futur):** impresa i col·locada sobre el model muntat, la fletxa assenyala el nord geogràfic del mapa amb gir de 0°, +30° i −30°; observacions documentades abans de tocar defectes.

Cap d’aquests criteris es dona per complert per haver escrit aquest document; RO-017 té la **implementació pendent** fins a implementació i validació.
