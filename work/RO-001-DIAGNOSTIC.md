# RO-001 — Lectura d’altituds i pics intermitents

Data: 2026-11-01. Correcció candidata: **v0.4.2**. Estat: **pendent de validar a Brave**.

## Observació i abast

L’usuari confirma que les cobertes de v0.4.1 són correctes, exclosos els edificis afectats per pics incorrectes del terreny. També precisa que el problema és inconsistent: en el moment de l’estudi havia fet tres simulacions amb ampliacions diferents sense deformacions. Això no constitueix ni una reproducció controlada ni un tancament de la incidència.

La comprovació directa de la finestra de Brave s’ha aturat perquè Computer Use no ha pogut verificar-ne l’URL. No s’han canviat opcions de privacitat, ni s’ha reprès el control per una altra via. Les proves següents són de dades, geometria i empaquetat en Node; **no substitueixen la validació al navegador de l’usuari**.

## Hipòtesi sustentada, però encara no confirmada en aquest cas

La lectura anterior feia `createImageBitmap` → `OffscreenCanvas` → `getImageData` → conversió Terrarium. Els canals RGB són dades numèriques, no colors decoratius:

`altura = R × 256 + G + B / 256 − 32768` metres.

Canviar una unitat de R altera l’altitud en 256 m. El filtre existent de discontinuïtats aïllades d’un quilòmetre no detecta aquest canvi més petit.

Brave [documenta la modificació de valors de canvas per protecció contra empremtes digitals](https://brave.com/privacy-updates/4-fingerprinting-defenses-2.0/). El seu repositori també conté [proves específiques d’OffscreenCanvas/getImageData](https://github.com/brave/brave-core/blob/master/browser/farbling/brave_offscreencanvas_farbling_browsertest.cc). És una possible explicació de pics variables en aquest camí de lectura; **no s’ha mesurat encara que el Brave de l’usuari hagi alterat aquests píxels concrets**. Altres incidències de dades o geometria no queden descartades per aquest estudi.

## Correcció de v0.4.2

- WebP: descodificació binària amb libwebp/WASM, empaquetat com a recurs estàtic.
- PNG: descodificació numèrica amb fast-png, sense canvas ni conversions de color de visualització.
- Reconeixement del format pels bytes del fitxer, comprovació de mida/canals/profunditat i error explícit si no és una tessel·la RGB/RGBA compatible. Es conserva la transparència i el tractament de mostres absents.
- Procedència `elevationDecoding`: format, descodificador, SHA-256 del fitxer font quan Web Crypto està disponible, mida, mostres vàlides/absents i rang d’altituds. Les zones marines confirmades representades a cota zero es documenten, com abans, a les metadades del proveïdor; no tenen fitxer raster per descodificar.
- No s’ha afegit un suavitzat del terreny ni canviat el filtre de pics per aplanar el símptoma. El preview continua usant WebGL, però no s’utilitza per calcular les altituds.

## Proves locals i resultats

### 1. Comparació independent dels bytes

Els quatre WebP inclosos de Tamariu, de 512 × 512 píxels, coincideixen **byte a byte** amb una descodificació independent libvips/sharp: 1.048.576 píxels RGBA. Els hashes de referència queden a `tests/dem-decoder.test.js`.

| Tessel·la | SHA-256 del fitxer font | Rang descodificat (m) |
| --- | --- | --- |
| 14/8337/6086 | `88355d3dc3856c154f2fc5864a84038184a3384f1d5a6c3b7d3a11fa119ca900` | 3,625 a 195,5 |
| 14/8337/6087 | `7c3217934ae2bf839be0b973b3f3d5733f06bef0db3029bdc66d9cb37e4d3169` | −0,5 a 164,75 |
| 14/8338/6086 | `dd2368df392a70f73a98202455da1ab7136246a670717121e072acab257aefc2` | −4 a 176,375 |
| 14/8338/6087 | `73e42d185854481c7294f3475981895673e622e64bdabc3066090e1abf0a88d2` | −2,5 a 119,75 |

També s’ha descodificat una tessel·la PNG real de la font alternativa Mapzen, 14/8337/6086: 256 × 256, 65.536 mostres vàlides, rang 12,8203125–189,3046875 m. No s’ha substituït cap font en la mostra de l’aplicació.

### 2. Regressió amb soroll simulat

En una tessel·la de terreny pla a 10 m, alterar una unitat de R en un píxel crea un pic a 266 m. Una coberta que pren la cota més alta queda elevada els mateixos 256 m. El filtre antic no ho repara. Llegir el fitxer original amb el nou descodificador manté els 10 m i la coberta a 15 m. La prova s’executa sense disposar d’un canvas per llegir les altituds.

**Aquesta és una reproducció del mecanisme de corrupció, no una captura de l’error en un Brave real.**

### 3. Repetibilitat i independència de capes

`scripts/check-terrain-repeatability.mjs` utilitza la mostra real, retall quadrat, 150 × 150 mm, detall 36 i exageració ×1,5. Cada execució rep una còpia de les entrades, com el Worker.

| Cas | Resultat |
| --- | --- |
| Tres generacions idèntiques | Mateixa malla: `531620b8e9277da3a190ea7144bf3c2186148e0f124afae0f331fa4c7441df09` |
| Sense arbres | El hash del terreny es conserva |
| Sense edificis | El hash del terreny es conserva |
| Exageració ×3 i detall 24 | Geometria finita dins de l’envolupant d’altituds de les fonts |

Els tres casos base tenen 537.472 triangles, 4.183 arbres i 623 fragments d’edificis, amb zero mostres d’altitud reparades. El hash del terreny dels casos sense arbres/edificis és `f76cbfa6cd8668b956ffbc4b8799b909b913ff2d43cef9820d77687152101cbe`.

L’script desa el detall a `output/ro-001-elevation-audit.json` i exporta un 3MF estàndard i un de compatible amb Bambu. `output/` és una carpeta local ignorada per Git; es pot regenerar amb `node scripts/check-terrain-repeatability.mjs`.

### 4. Empaquetat

La construcció estàtica inclou el mòdul carregat sota demanda i el WASM WebP de 137.960 bytes. El descodificador construït s’ha executat en un banc de proves Node que proporciona els bytes locals del WASM a `fetch`; la seva lectura coincideix amb el hash i rang esperats. Això comprova el cablejat del mòdul i l’asset, però no verifica HTTP/CSP ni la renderització en Brave.

## Comprovació pendent de l’usuari

1. Confirmar que es carrega **v0.4.2** i tornar a generar el territori; un model ja carregat amb la lectura anterior no es transforma automàticament.
2. Repetir la mateixa mostra i ajustos, i després les ampliacions amb què s’havien observat pics, mantenint les proteccions habituals de Brave.
3. Si reapareix: conservar el 3MF afectat i anotar regió, mida, detall, exageració i passos previs. La procedència permetrà comparar fitxers font i descodificació; distingir també si el pic apareix al laminador o només al preview.
4. Registrar el resultat a RO-001. Només després decidir si es pot validar la correcció o cal continuar el diagnòstic.
