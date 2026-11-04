# RO-024 — Resultats de la fundació (fases 1–2 acotades)

2026-11-02 · Lliurament fitat: auditoria + unió dins del material, sense UI ni
canvis d'exportació, sense activar res a l'aplicació. Relació amb
[RO-024-SOLIDS.md](RO-024-SOLIDS.md). Revisat per l’agent principal; encara sense activació general.

## Fitxers nous (cap altre tocat)

- `src/solid-audit.js` — auditoria de peces indexades (`Float32Array` XYZ +
  `Uint32Array` d'índexs): coordenades finites, índexs en rang, bbox i
  dimensions, volum signat (teorema de la divergència), recompte cru d'arestes
  (vora / no varietat / conflicte d'orientació) i components connexos per
  unió-find. Capa buida = vàlida. Errors explícits en català; **cap reparació
  silenciosa**.
- `src/solid-operations.js` — `uniteMaterials(model, api, límits)`: unió
  booleana sobre **còpies**, només dins del mateix `id` de material, amb
  l'API de manifold-3d **injectada**. Mai uneix ids diferents encara que
  comparteixin hex; rebutja colors conflictius dins d'un mateix id. Divideix
  cada peça crua en components topològics independents **abans** de construir
  cada Manifold, de manera que caixes encavalcades concatenades en una mateixa
  peça indexada s'uneixen realment. Límits de triangles/components per
  material (`maxTriangles`, `maxComponents`), validació de `status`/`volume`,
  i destrucció de tots els sòlids WASM propis en tots els camins
  (`try/finally`).
- `tests/solid-operations.test.js` — 13 proves amb Manifold real.

## Proves executades (totes en verd)

- `node --test --test-concurrency=1 tests/solid-operations.test.js` → 13/13.
- `node --test --test-concurrency=1 tests/*.test.js` → 188/188.
- `node node_modules/vite/bin/vite.js build --base=./ --configLoader native` → correcte.

Cobertura de les proves: caixes encavalcades (separades i **concatenades a la
mateixa peça**), contactes coplanars, capa buida, pati/forat travessant
conservat (volum 4000, no 5000), materials diferents amb el mateix hex no
units, colors conflictius rebutjats, índexs invàlids / no finits / winding
invertit rebutjats, entrada no mutada (`structuredClone`), fallada injectada
amb recompte de sòlids WASM creats = destruïts, límits explícits, i model
sintètic amb terreny en pendent (volum analític), bosc, carretera i edifici
amb materials agrupats (volums amb encavalcaments descomptats).

## Limitacions registrades

- **Topologia crua d'índexs**: l'auditoria compta components i arestes per
  índexs, no per posició. Vèrtexs duplicats sense soldar apareixen com a
  arestes de vora i components separats encara que la geometria sigui
  contigua; la unió els solda via `mesh.merge()`, però l'auditoria prèvia ho
  mostra explícitament.
- **Precisió**: vèrtexs `Float32Array`; volums comprovats amb toleràncies de
  0,01–1 mm³ segons la magnitud. Manifold pot requantitzar coordenades.
- **Perica comprovada després del lliurament:** l’agent principal ha construït
  un retall de 150 × 150 m a escala 1:1000 amb les 80 parts del GeoJSON
  cadastral guardat, vectors/DEM locals, detall 24, exageració ×1,5, altura
  limitada a 5 m i sense arbres. És un sol cas, no una validació general.
- La unió **no està activada** a l'aplicació ni a l'exportació; no s'ha tocat
  `worker.js`, `export.js` ni UI.

## Portes que queden (segons RO-024-SOLIDS.md)

- Fases 3–4: [control sintètic i partició comprovats localment](RO-024-TUNEL-CONTROL.md), sense equivalència a dades reals.
- Fase 5: laminador Bambu i impressió física — validació de l'usuari.
- Més regions, escales, vegetació i pressupost de temps/memòria abans
  d’integrar la unió en les exportacions habituals.

## Revisió de l’agent principal

- Límits no finits, fraccionaris o fora de pressupost i identificadors absents
  rebutjats; coordenades no finites revisades també en capes sense cares.
- Volum nul/no finit explícit i auditoria de sortida. Neteja del sòlid també
  quan falla la inspecció `status`/`volume`. 16 proves específiques i 191 de
  suite en verd després d’aquestes regressions.
- La topologia per índexs no demostra per si sola absència d’autointerseccions
  geomètriques. La unió acotada i l’estat Manifold són comprovacions
  addicionals; no equivalen a una reparació universal ni a una prova física.

## Retall real de la Perica

Evidència numèrica: [informe](mostres/perica-solids-v012.json).
Generació local amb `output/audit-perica-v012.mjs`, sense cap petició remota;
fixture de Catastre guardat a `output/tamariu-perica-catastre.geojson`.
Els fitxers d’entrada i 3MF de control són locals, no es descarreguen des de CI.

| Material | Triangles abans → després | Components abans → després | Volum abans → després (mm³) |
| --- | --- | --- | --- |
| Terreny | 19.192 → 6.488 | 2.185 → 3 | 667.693,258 → 667.693,257 |
| Aigua | 380 → 208 | 37 → 2 | 6.135,940 → 6.135,940 |
| Edificis/camins | 12.940 → 7.814 | 1.067 → 23 | 35.929,363 → 35.927,204 |
| Bosc | 2.112 → 888 | 230 → 2 | 2.133,684 → 2.133,684 |

Total: 34.624 → 15.398 triangles. Les quatre capes tenen coordenades finites,
volum positiu i zero arestes de vora/no varietat/orientació inconsistent.
La reducció de volum d’edificis/camins és compatible amb eliminar
encavalcaments dins d’aquest material; no s’han restat encavalcaments entre
materials diferents. S’han generat `output/perica-v012-{raw,united}.3mf` per
comparar al Bambu, pendent de validació de l’usuari.

## Auditoria dels fitxers de control

L’ordre següent emet un informe JSON i retorna un error si detecta un problema de muntatge, correspondència de materials o topologia indexada.

```powershell
node --max-old-space-size=512 scripts/audit-3mf.mjs public/controls/ro-033/RO-033-cupo-pas-inferior.3mf output/perica-v012-raw.3mf output/perica-v012-united.3mf
```

| Control | Peces verificades | Parells amb caixes envolupants solapades |
| --- | ---: | ---: |
| Cupó del Bages | 3 | 3 |
| La Perica, exportació original | 4 | 6 |
| La Perica, unió per material | 4 | 6 |

Els tres fitxers passen les comprovacions. El recompte de parells és una indicació per orientar la inspecció i no mesura el volum d’intersecció. Queda pendent obrir els fitxers a Bambu Studio i registrar el primer defecte que es pugui reproduir amb la configuració de laminat. L’eina està acotada a controls de fins a 8 MiB de ZIP, 12 MiB d’XML, 100.000 triangles i 16 peces.

### Controls per a la 0.21

- **Rajadell.** El [retall de 150 mm amb túnels](../public/controls/ro-051/RO-051-Rajadell-tunels-150mm.3mf) permet inspeccionar el paviment, la volta i el contacte dels pilars amb el tauler i el terreny. El [control rectangular girat](../public/controls/ro-052/RO-052-Rajadell-150x200mm-gir25.3mf) permet contrastar les terminacions amb un altre retall. Són exportacions de referència de versions anteriors.
- **Rasos–Gallina Pelada.** Amb el retall conjunt en Relleu pur, obrir les quatre peces amb el mateix perfil de laminat. Usar les files i columnes de `muntatge.json` per comparar les vores adjacents i revisar si els rierols i arbres prop dels talls apareixen a la vista per capes.
- **Material inesperat.** Conservar el 3MF original, el perfil de laminat i l’altura Z en mil·límetres de la primera capa afectada. Comparar el filament de la peça abans de laminar amb el color per filament després de laminar. Si es pot reproduir, usar un control petit amb el mateix tipus de geometria.

```powershell
node --max-old-space-size=512 scripts/audit-3mf.mjs --z=5 public/controls/ro-033/RO-033-cupo-pas-inferior.3mf
```

Al cupó del Bages hi ha triangles de terreny, camins i sòl de bosc que toquen el pla a 5 mm. La consulta inclou les cares coplanàries i mostra les assignacions del fitxer. La comparació amb les trajectòries d’impressió es fa al laminador. El 3MF complet de Rajadell supera el límit de triangles d’aquesta eina acotada.

## Capes baixes del Model complet a la v0.22.12

Els llacs i cursos d’aigua s’imprimeixen com una capa de 0,65 mm. El terreny arriba des de la base fins a la cara inferior de l’aigua. Les dues malles comparteixen el mateix contacte al fons, incloent-hi els talls de la peça. El mar conserva el volum blau fins a la base.

El control de `tests/standing-water.test.js` rellegeix un 3MF amb el mar, un llac, un riu i un rierol. A 0,2 mm només hi ha geometria de mar i de terreny. Les sis mostres del contacte d’aigua continental coincideixen amb el terreny fins a menys de 0,00001 mm. Queda pendent el contrast al laminador.

El retall complet de Marganell amb els ajustos originals té la primera geometria d’aigua continental a 4,53 mm. Les set malles superen l’auditoria. La mostra costanera de Tamariu de 100 × 100 mm conserva tant el mar com l’aigua continental i totes les seves malles superen l’auditoria.

## Filament per peça a la v0.22.13

La còpia de control de Montserrat conserva les malles, els colors i els filaments assignats a cada peça. Només s’hi retira la pintura per triangle. L’usuari valida que les franges de colors incorrectes desapareixen al laminador i que el temps estimat passa de 3 dies i 21 h a 3 dies i 17 h. El contrast és de laminat i la impressió física queda pendent.

El generador aplica aquesta assignació a tots els 3MF per a Bambu Studio, també quan s’exporten en diverses peces. L’auditoria accepta els arxius antics amb pintura i comprova la coherència dels filaments per peça en tots dos formats de Bambu.
