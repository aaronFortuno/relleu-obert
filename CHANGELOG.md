# Canvis

## v0.12.0 — 2026-11-02

- RO-012: vista «Presentació» amb taula i llum locals, sense duplicar ni modificar les malles exportables. Restableix càmera/controls/qualitat en sortir; segueix els canvis incrementals i de dimensions. Llegenda il·lustrativa permanent.
- Render a demanda dins de Presentació, amb amortiment fins al repòs i límit de cua. Reducció d’ombres/resolució quan es detecten intervals actius lents; gestió de pèrdua/restabliment de context, encara pendent de forçar al navegador. Sense afirmar millores de rendiment mesurades.
- RO-023: resum de fonts seleccionades i pendents, flux principal remot i fitxers propis dins d’un apartat avançat plegat. Tornar de només edificis locals usa la via incremental; un DEM local continua exigint generar el terreny. Sense proveïdors nous ficticis.
- RO-024: auditoria i unió sobre còpies dins de cada material, amb límits, errors explícits i neteja de recursos. Cas real de la Perica: quatre materials, malles tancades i 34.624 → 15.398 triangles després d’unir. Fonament experimental separat de les exportacions normals.
- RO-024: resta del mateix buit de totes les capes, amb control sintètic de 400 × 120 × 12 mm; pas de 4 × 4 mm obert entre dues peces de 20 cm, base intacta i raigs lliures sense tapes al tall. Generador reproduïble i control petit de 40 × 24 mm per a validació manual.
- Backlog: RO-036–039 arxivats segons les validacions anotades per l’usuari. Petició completa de rosa dels vents incrustada (RO-017) conservada; la fletxa independent actual no la dona per resolta.
- Comprovació local del navegador sota el subdirectori de Pages i exportacions invariants entre vistes. Validació de l’usuari, laminador i impressió física separades; cap comprovació remota de Pages/CI.

201 proves locals superades, construcció estàtica i generadors de control correctes. Últim encàrrec de Kimi aturat pel límit temporal al 81,99% de quota; revisió, correccions i comprovació final completades per l’agent principal.

## v0.11.0 — 2026-11-02

- RO-040: el Catastre accepta respostes buides vàlides; manté errors de servei, truncament i recomptes incoherents. Una mena buida no descarta les parts de l’altra.
- RO-041/042: densitat de pinzell inicial ×0,5/màxim×2, cobertura per gest sense repopular solapaments i retorn a Navega en plegar Vegetació o canviar de menú.
- RO-043: font, mode i altura d’edificis amb actualització automàtica després de300ms; cua, cancel·lació i comprovació de vigència abans d’enviar al Worker. Terreny pendent conserva Generar explícit.
- RO-014: marc imprimible independent, tolerància/amplada/alçada configurables, una peça quan cap o trams només pel perímetre exterior. Guia SVG, manifest i 3MF/STL per peça, amb un sol material.
- RO-016: placa educativa independent, tipografia de traç simple en MAJÚSCULES amb accents catalans, tres línies, mides i comprovació que el text hi cap. Base i relleu units en un sòlid monocrom; col·locació plana o lateral documentada.
- RO-017: disc amb fletxa del nord, calculada segons el retall i les escales de projecció; la càmera no afecta la direcció. Complement independent monocrom.
- RO-032: fonts MDTe territorial/litoral estudiades. Encara sense adapter remot de cobertes: el flux oficial per àrea demana e-mail; no s’ha enviat cap formulari. Retorn Z del polígon RTT de la Perica verificat: continua2D. No s’inventen inclinacions.
- RO-002 validat per l’usuari a Tamariu i arxivat. Escena de presentació, UX de fonts i sòlids/ponts/cavitats pendents després de la petició de tancar la sessió.
- Validació local i proves de geometria/exportació; laminador i ajust físic pendents. Sense comprovacions remotes de Pages/CI.

152 proves locals superades i construcció estàtica correcta. Descàrregues dels tres complements comprovades al navegador local.

## v0.10.0 — 2026-11-01

- RO-039: peticions del Catastre amb 45 s per intent i un reintent limitat, també durant la lectura de la resposta. Errors en català amb alternatives; es conserva el model anterior en fallar. Causa exacta i càrrega real de Tamariu pendents de validar.
- RO-019: catàleg català i infraestructura d’idiomes amb alternativa segura, formats, persistència i selector accessible. Altres llengües desactivades; migració parcial de textos, sense traduccions noves.
- Propostes concretes de RO-014 (marc imprimible), RO-016 (plaques), RO-017 (rosa dels vents) i RO-012 (escena realista). Dissenys documentats, sense atribuir-los funcionalitat implementada. RO-033–035 conserven les dependències de sòlids de RO-024.
- Encàrrecs seqüencials a Kimi K3, amb revisió entre entregues i correccions retornades abans d’acceptar-les. 106 proves locals superades i construcció estàtica correcta. Selector comprovat al navegador local; validació d’usuari i física pendents. Cap comprovació remota de Pages/CI.

## v0.9.0 — 2026-11-01

- RO-036: pinzell sense quadrícula de col·locació; punts aleatoris dins del cercle, separació mínima, densitat desada per traç i generació reproduïble amb intents acotats. Primer component delegat a un únic Kimi k3-256k, revisat i integrat localment.
- RO-037 / RO-002: retirat el selector duplicat Automàtic · ICGC. Font explícita amb ICGC per defecte a l’àmbit català i OSM fora. Catastre WFS opcional per a parts d’edificis a península/Balears: màxim 4 km², famílies coherents, patis, reprojecció i altures estimades. Excloses parts amb zero plantes sobre rasant. No s’afegeix l’envolupant sobre les seves parts ni es canvia de font silenciosament en cas d’error.
- RO-038: actualització d’edificis sobre la geometria existent. Carrega només la capa necessària, conserva terreny/aigua/camins/cobertes del sòl i elimina només arbres que xoquen amb les petjades noves. Altura/font d’edificis no reinicien la càmera. Missatges parcials del Worker, sense tornar a copiar les capes estàtiques al preview.
- RO-032: primera implementació de cobertes d’una i dues aigües amb forma, altura i direcció explícites de la font, en mode d’altura/coberta de dades. Respecta gir, patis i retall. El mode limitat continua pla; paràmetres absents o formes no admeses conserven coberta plana amb procedència explícita. No hi ha encara dades automàtiques de teulades a les fonts actuals ni suport de formes corbes complexes.
- Seleccions de coordenades sense animació i centre conservat amb mapa ocult per evitar que un canvi de panell alteri un retall a escala fixa.
- Quatre validacions de v0.8.0 arxivades; RO-024 amb pla de sòlids, unions i prova de cavitat abans de ponts/túnels/cavitats reals.
- 82 proves locals superades; validacions d’usuari/laminador pendents. Cap comprovació remota de Pages/CI.

## v0.8.0 — 2026-11-01

- RO-030: corregida la vegetació que s’aturava a mitja maqueta en arribar a 12.000 arbres. Mostreig determinista de tota la zona verda, sense augmentar el pressupost de geometria. Els arbres pintats tenen prioritat sobre els automàtics; quan el pressupost és íntegrament manual, els traços nous substitueixen els més antics amb avís. Procedència amb recomptes i reduccions; candidats reutilitzats al Worker per no tornar a recórrer tot el bosc en pintar.
- RO-031: «Densitat del pinzell» afecta només els traços nous i no inicia cap càlcul en modificar-la. Cada traç conserva la seva densitat. La densitat automàtica inicial es manté a ×2,5.
- RO-015: retirats els selectors de broquet i tipus de filament i les opcions corresponents de l’exportació, per decisió de l’usuari després de provar-les a Bambu. Colors, parts i assignacions de materials es conserven.
- L’importador GeoJSON conserva l’etiqueta explícita d’altura estimada encara que el valor numèric sigui vàlid.
- RO-002 / RO-026: consulta real de la Perica al Catastre i primera comparació amb RTT; 22 parts de 9 famílies intersecten el megabloc. Mostra local experimental i figura comparativa. No es canvia el proveïdor automàtic ni es dona per resolta la fidelitat dels edificis.
- RO-032–RO-035: pla de dades i geometria per a cobertes, ponts/viaductes, túnels i cavitats naturals, amb criteris d’escala, exportació i validació. Encara sense reconstrucció d’aquests elements.
- Set tasques validades de v0.7.0 passen a l’historial, amb les anotacions de l’usuari preservades. Ajornaments conservats.
- 63 proves locals superades i construcció estàtica correcta. Revisió de navegador amb model de 40 cm i pinzell al límit; validació d’usuari i laminador pendents, sense comprovacions remotes.

## v0.7.0 — 2026-11-01

- RO-027: auditoria heurística dels sidebars, agrupació per tasca i textos més directes. Quatre blocs: lloc/orientació, mida/escala, relleu/edificis i vegetació. Colors/materials reunits al sidebar dret. Els quatre títols i Generar continuen sempre visibles.
- RO-006 / RO-018: un sol camp d’escala amb suggeriments i equivalència en metres; gir al costat del mapa amb passos de 15°, rang −90°…90° i retorn al nord.
- RO-028: capçades procedimentals dimensionades en metres i convertides amb l’escala horitzontal. S’ometen per sota de 0,25 mm amb avís, conservant la superfície del bosc; no s’engrandeixen artificialment. Es mantenen la variació i la incrustació al terreny.
- RO-029: prevalidació de l’àrea segons centre, mida i orientació, amb una escala màxima aproximada abans de carregar dades. El límit de càrrega actual es conserva; el rang numèric no implica que qualsevol àrea hi càpiga.
- RO-008 / RO-009: versió al footer, icona de commit al repositori, V4V amb dues columnes visibles i favicon quadrat.
- Backlog actiu separat de l’historial: arxivades les vuit entrades expressament validades per l’usuari. Anotacions originals preservades; les validacions parcials i els ajornaments continuen pendents.
- 60 proves locals superades. Noves funcions pendents de validació d’usuari; sense comprovacions remotes de Pages/CI.

## v0.6.0 — 2026-11-01

- RO-004: quatre títols sempre visibles, primer ancorat a dalt i últim abans del botó Generar. Scroll exclusiu al contingut de l’apartat obert; el sidebar esquerre no es desplaça. Ocultar/reobrir el mapa conserva el retall.
- RO-007–RO-009: escala i triangles al sidebar dret, fonts dins del V4V, enllaços separats de repositori i llicència al footer, i favicon SVG amb el logotip.
- RO-010: transicions de 220 ms, entrada/sortida de modals, tancament amb Escape i respecte per moviment reduït. Avisos de treball i errors immediats.
- RO-013: marc només visual (negre, blanc o to de fusta), sense modificar malles ni exportacions.
- RO-018: gir real del retall, compartit per selecció, càrrega de fonts, projecció, malla i procedència. Conserva dimensions, escala i orientació en la partició de peces.
- Corregit un cas de partició detectat en la prova girada de 40 cm: quan una capa ja queda buida en una peça, no es torna a retallar aquell sòlid buit. S’evita l’error de coordenades no finites del motor sense afegir geometria a les peces on la capa és absent.
- RO-015: PLA/PETG i broquet opcional, sense perfil de màquina ni temperatures. Metadades explícites al dialecte Bambu; reconeixement al laminador pendent de validació.
- RO-023: primera via local GeoTIFF/GeoJSON, processada al Worker. Reprojecció i registre de procedència, validació de banda numèrica, CRS, compressió, cobertura i buits. No s’han incorporat noves fonts automàtiques ni inventat divisions d’edificis.
- RO-003, RO-014 i RO-016 continuen ajornats per confirmació de l’usuari. La comparació/priorització de fonts d’edificis segueix a RO-026.
- 56 proves locals superades, construcció estàtica i prova de navegador amb importació, gir i exportació del 3MF. Validació d’usuari i laminador pendents.

## v0.5.0 — 2026-11-01

- RO-001 validat i tancat per confirmació de l’usuari. RO-003 ajornat expressament per després d’aquesta iteració.
- RO-004: acordió exclusiu al sidebar esquerre, amb «Tria el lloc» obert inicialment, controls natius de teclat i generació accessible fora dels apartats.
- RO-005: eliminat el subheader del preview. Restablir, vista zenital, ajuda, avisos de càlcul, errors i canvis pendents se superposen dins de la vista; es recupera espai vertical.
- RO-006: escala horitzontal lliure o fixada a 1:1.000, 1:1.500, 1:2.000 o personalitzada (1:100–1:100.000). La mida física determina el retall; el zoom del mapa no altera l’escala fixada. Exageració i divisió en peces independents. Escales invàlides bloquejades; coherència del retall comprovada també al motor.
- RO-002: identificat el polígon ICGC 1074761 del revolt de la Perica com una sola petjada original sense divisions, conservada sense canvis. Informe reproduïble, regressió de conservació de petjades i advertiment a les limitacions. La separació de cases queda pendent d’una font més detallada; no es dona per corregida.
- Proves locals d’escala, dimensions 3MF, petjades adjacents i patis, a més de les regressions existents. Validació d’usuari de les noves funcions pendent; no s’ha comprovat la web remota.

## v0.4.2 — 2026-11-01

- RO-001: substituïda la lectura de les altituds amb `createImageBitmap`/canvas per descodificació binària WebP (libwebp WASM) i PNG (JavaScript). Els canals RGB numèrics ja no passen per lectura de píxels del canvas ni conversions de color de visualització.
- Demostrat amb una prova que alterar una unitat del canal vermell crea un pic de 256 m i eleva la coberta d’un edifici proper. La lectura binària evita aquesta via de corrupció. La vinculació amb el cas intermitent de Brave encara requereix confirmació de l’usuari; no s’han modificat les proteccions del navegador.
- Procedència ampliada amb format, descodificador, SHA-256 del fitxer font quan Web Crypto està disponible, mida i rang d’altituds. Es desen als 3MF/STL per comparar casos.
- 44 proves locals, comparació byte a byte de les quatre tessel·les de Tamariu amb una referència independent i sis generacions de geometria, incloses tres malles idèntiques amb entrades idèntiques.
- RO-022: validació expressa de l’usuari de les cobertes de v0.4.1, exclosos els edificis afectats pels pics. RO-001 es manté pendent de validació a Brave. La verificació visual no s’ha pogut completar perquè el control del navegador s’ha aturat en no poder verificar-ne l’URL.

## v0.4.1 — 2026-11-01

- Corregida la interpretació del límit d’edificis: la coberta és horitzontal a tota la petjada, no segueix el pendent. L’altura limitada es mesura sobre el punt més alt del terreny dins de la petjada; la façana del costat baix pot ser més alta.
- Referència de cota calculada sobre la triangulació real, incloent punts alts interiors i fragments retallats d’una mateixa petjada. La base segueix incrustada al terreny.
- Textos d’interfície, procedència i documentació actualitzats; es conserven els modes de petjades sense volum i sense edificis.
- 40 proves locals superades, incloses cobertes horitzontals amb exageració del relleu i pics interiors a la petjada.

## v0.4.0 — 2026-11-01

- Camins amb unions i extrems arrodonits segons l’amplada del traçat. Es cobreixen els buits exteriors de les corbes i els girs tancats sense alterar l’eix cartogràfic.
- Edificis limitats a 5 metres reals per defecte, regulables d’1 a 1.200 m. El límit es respecta sobre el terreny de cada punt, també en pendent i amb exageració del relleu. La representació limitada s’adapta al relleu; no representa la forma real de la teulada.
- Selector d’edificis: limitats, altura de les dades amb coberta horitzontal, només petjades de color o sense edificis. Sense edificis es conserva el terreny de les dades actuals, no es reconstrueix el paisatge històric.
- Eliminada l’altura mínima artificial de 0,6 mm, que magnificava edificis baixos. En mode limitat també s’elimina l’efecte de basar tot l’edifici en el punt més alt de la seva petjada.
- Un càlcul de vegetació per traç, després d’aixecar el pinzell. Indicador visible de treball, bloqueig de traços nous fins a mostrar el resultat i desfer del traç complet.
- Evitat el desplaçament global de la pàgina quan el navegador enfoca controls fora de vista; la capçalera, el peu i l’indicador de càlcul continuen visibles.
- Les opcions d’edificis queden registrades a la procedència del model i es conserven en actualitzar la vegetació.
- L’usuari confirma que el 3MF de quatre materials es reconeix a Bambu Studio amb els colors corresponents.

## v0.3.0 — 2026-11-01

- Interfície d’escriptori amb capçalera i peu sempre visibles, dues barres laterals amb desplaçament independent i previsualització central estable.
- Capçalera compacta i alineada, ajuda en diàleg i historial resumit amb enllaç a aquest fitxer. Les versions es mantindran en 0.x fins a una declaració explícita d’estabilitat.
- Mapa OpenStreetMap desplaçable, zoom i retall centrat amb les proporcions del model. Cerca explícita de llocs i adreces amb Photon, o coordenades WGS84 en un sol camp.
- Mides exactes de 15 × 15 a 40 × 40 cm, incloses opcions rectangulars. Exportació dividida en peces de fins a 20 × 20 cm amb Manifold/WASM: talls tancats, origen local i plànol de muntatge; mateixa escala i exageració a totes les peces. Encara sense encaixos.
- Vuit categories geomètriques reassignables a 1, 2, 4 o 8 materials. La impressió monocroma conserva totes les geometries.
- Terreny i edificis en memòria: densitat, forma de capçades i pinzell/goma actualitzen només la vegetació. Els arbres manuals eviten mar, edificis i camins.
- Tolerància numèrica i tancament de superfícies millorats per a nous retalls i punts de contacte entre camins.
- Llegenda, mides, arbres, edificis, fonts i exportació al panell dret. Peu amb MIT i V4V, reutilitzant el contingut de Plec de l’autor.

Validació local: proves de geometria, reassignació de materials, vegetació incremental i divisió en peces; comprovació visual en viewport d’escriptori i construcció estàtica. La comprovació remota, el laminat i la impressió física els fa l’usuari.

## v0.2.0 — 2026-11-01

- Densitat regulable i capçades amb dimensions, orientacions i contorns moderadament diferents i reproduïbles.
- Vegetació ancorada i incrustada a la superfície triangular que es genera i exporta, eliminant la diferència amb l’altitud original entre vèrtexs.
- Consulta directa d’edificacions del Referencial Topogràfic Territorial de l’ICGC (GeoJSON, alçàries, paginació, atribució i data), mostra de Tamariu actualitzada i selector de fonts.
- Substitució individual de petjades OSM encavalcades amb les oficials, conservant les altres fins i tot en MultiPolygons agrupats.
- Mostreig continu entre tessel·les d’elevació, lectura numèrica del Terrarium i tractament d’altituds invàlides o pics aïllats extrems amb diagnòstic.
- Piscines i aigües interiors conservades a l’altitud local, en comptes de crear cavitats fins al nivell del mar.
- Font alternativa de relleu i resolució inferior quan cal; les tessel·les absents es representen a nivell de mar només amb cobertura oceànica confirmada.
- Segon motor de retall de polígons per resoldre degeneracions numèriques en zones denses.
- Exportació específica per a Bambu amb assignacions de filament i pintura per triangle; es conserven 3MF estàndard i STL.

La validació d’impressió física i la importació a Bambu Studio de l’usuari continuen pendents. El redisseny general de la interfície queda per a una fase posterior.

## v0.1.0 — 2026-10-31

Primera versió experimental, sota llicència MIT per al codi propi.

- Generació de maquetes al navegador, amb Web Worker i previsualització Three.js.
- Mostra de Tamariu amb dades reals incloses i càrrega d’altres zones per coordenades.
- Costa i superfícies delimitades amb geometries vectorials, mar pla, escala i exageració vertical.
- Quatre materials: terreny, aigua, edificis/camins i vegetació.
- Arbres procedimentals a les zones verdes, exportació 3MF estàndard i STL per material.
- Fonts i llicències documentades, metadades de procedència i desplegament estàtic a GitHub Pages.
- Validació local: vuit proves de geometria/exportació i construcció de producció.

### Continuació prevista

- Revisar la disposició de la pàgina i fer més intuïtius els controls, la selecció de regió i l’exportació.
- Millorar la precisió del relleu i els penya-segats, amb dades locals d’alta resolució.
- Unir i validar els volums per imprimir; revisar el laminat i els materials a Bambu Studio.
- Millorar edificis, camins i vegetació, diferenciant les dades mesurades de les aproximacions.

Les limitacions de la primera versió es descriuen a `README.md`. No s’ha validat una impressió física ni s’ha executat una comprovació remota de la web.
