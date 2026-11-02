# Backlog actiu de Relleu Obert

Actualitzat: **2026-11-02 · v0.19.0 PARCIAL**. Tancament expressament demanat per continuar al portàtil. RO-052 incomplet: compilació correcta; última selecció curta 12/13, amb graó a boca del rectangle girat. [Punt de represa prioritari](REPRESA-RO-052.md), [informe](RO-052-CONTINUITAT.md). Marc exterior retirat de la UI i ajornat. Versions 0.x; les observacions originals es conserven a MILLORES-BUGS.md.

## Ordre de treball

**RO-052 — reprendre al portàtil.** Primera tasca: corregir la regressió del rectangle girat abans de més validació o impressions. Hi ha feina transversal desada però incompleta; 370/370 ordinàries passaven abans del darrer refinament, no en acrediten l'estat actual. Cap procés ni agent queda treballant en aquest equip.

**RO-053 — prioritat de disseny i arquitectura: flux per etapes.** Petició reiterada de l'usuari: separar terreny, vegetació, vies i edificis per guanyar agilitat i control, començant per la mida d'impressió i la selecció del territori. [Proposta completa, decisions obertes i criteris](#ro-053--flux-de-treball-per-etapes). Cal estudiar l'ordre i les dependències; no és una seqüència ja aprovada ni una millora opcional perduda entre retocs. Preparar el disseny com a següent línia prioritària, coordinada amb les correccions RO-052/051.

1. **RO-051 — Primera optimització validada localment.** 3 km: 189,3 → 56,6 s; màscares sota demanda, de 14 unions a 2, amb mateixos perfils/omissions/pilars/llums. 344 proves i build correctes. Següent: component nul d'1,5 km / detall 12 i màscares multipart; prototip desactivat. [Informe i controls](RO-051-RENDIMENT.md).
2. **RO-034 / RO-050 — Validació del lot.** Revisar túnels arquejats i suports a Rajadell; comparar +0,5 / +1 mm ferroviaris i materials. Distingir control geomètric local de laminat i impressió.
3. **RO-024 — Qualitat abans d'impressions llargues.** Analitzar els canvis de material observats en algunes capes al laminador; no atribuir-ne encara la causa al programa. Cupó reduït abans de maquetes de 2–3 dies.
4. **RO-032 — Cobertes i singulars, P1.** Acreditar accés remot reeixit i obtenir dades de coberta de Tamariu. Nucli de sis formes i fixture Torre Glòries verificats; cobertura general i altres singulars encara oberts.
5. **RO-033 — Contrast fora de Rajadell.** Tres llocs reals amb pont recte, corbat i pas inferior; revisar connexions, obstacles i suports dels enllaços.

**Seguiment:** 17 línies obertes, 6 ajornades i 30 arxivades. «Implementat» vol dir disponible; la validació local, la d’usuari, el laminat i la impressió es registren per separat.

## Desenvolupament prioritari

| ID                                                                 | Prioritat | Estat                                                                                                                                                                                                                                                                                                                                 | Proper resultat comprovable                             |
| ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [RO-053](#ro-053--flux-de-treball-per-etapes) | P1 | Proposta prioritària de l'usuari; ordre per estudiar | Flux revisable, dependències de capes i primer pilot incremental |
| [RO-033](#ro-033--ponts-i-viaductes) | P1 | Controls de Rajadell corregits; generalització/Millau pendents | Reproduir omissions i angles a Millau segons zoom/retall; contrastar altres ponts |
| [RO-034](#ro-034--túnels-imprimibles) | P1 | Corregit en controls locals; pendent d'usuari/laminat | Revisar portals amb mode experimental activat |
| [RO-051](#ro-051--perfils-de-carreteres-principals) | P1 | 3 km un 70% més ràpid; 344 proves/build correctes | Component nul a 1,5 km/detall 12; IDs multipart; usuari/laminat |
| [RO-052](#ro-052--continuïtat-i-amplada-del-traçat-viari) | P1 | Entrega parcial; rectangle girat falla | REPRESA-RO-052.md: corregir graó, suite final, controls i revisió visual |
| [RO-024](#ro-024--unió-de-volums-i-validació-dimpressió) | P1 | Artefactes de materials pendents de diagnòstic | Distingir malla/exportació de configuració del laminador |
| [RO-026](#ro-026--fidelitat-dels-edificis-i-selecció-de-fonts)     | P1        | Fonts en estudi                                                                                                                                                                                                                                                                                                                       | Comparació de parts i petjades en segona zona           |
| [RO-032](#ro-032--cobertes-i-volums-singulars) | P1 | Nucli verificat; servei remot pendent de validar | Consulta real reeixida i dades de coberta de Tamariu |
| [RO-023](#ro-023--relleu-local-i-fonts-vectorials-de-més-precisió) | P2        | Fonts remotes pendents                                                                                                                                                                                                                                                                                                                | MDT més precís accessible al navegador                  |

## Validació i retocs acotats

| ID                                                                       | Prioritat | Estat                                | Què falta                                                       |
| ------------------------------------------------------------------------ | --------- | ------------------------------------ | --------------------------------------------------------------- |
| [RO-050](#ro-050--ferrocarrils-diferenciats) | P2 | Implementat i comprovat localment | Usuari: realç ferroviari i assignació de material; laminat |
| [RO-046](#ro-046--catàleg-de-llocs-recomanats)                           | P2        | Catàleg validat; canvi aplicat       | Càrrega en seleccionar exemple; comprovar transició             |
| [RO-044](#ro-044--catastre-per-seccions-i-recuperació-de-configuracions) | P1        | Implementat; casos límit pendents    | Buit/mixt, subdivisions i recuperació després d’error           |
| [RO-045](#ro-045--coherència-visual-dels-sidebars)                       | P2        | Implementat; pendent d’usuari        | Coherència de controls i scroll a escriptori                    |

## Després del nucli imprimible

| ID                                                       | Prioritat | Estat              | Abast                                                          |
| -------------------------------------------------------- | --------- | ------------------ | -------------------------------------------------------------- |
| [RO-035](#ro-035--cavitats-i-relleus-amb-voladissos)     | P3        | Dades 3D pendents  | Coves, baumes i arcs naturals; un MDT no en descriu l’interior |
| [RO-012](#ro-012--presentació-realista-del-model-imprès) | P3        | Objectiu redefinit | Imatge estàtica fotorealista del model amb entorn escolar      |
| [RO-019](#ro-019--internacionalització)                  | P3        | Setup fet          | Migració/traduccions quan s’estabilitzi el flux                |
| [RO-011](#ro-011--comptador-dexportacions-i-umami)       | P3        | Per estudiar       | Definir recompte i font real abans de publicar una xifra       |

## Ajornats

| ID                                                             | Prioritat | Estat                              | Motiu / condició de retorn                    |
| -------------------------------------------------------------- | --------- | ---------------------------------- | --------------------------------------------- |
| [RO-014](#ro-014--marc-imprimible-independent) | P2 | Ajornat per l'usuari; menú retirat a v0.19.0 | Desenvolupar amb més detall després del flux principal |
| [RO-016](#ro-016--plaques-i-etiquetes-educatives)              | P2        | Ajornat per l’usuari; menú retirat | Prioritzar funcionalitat i qualitat del model |
| [RO-017](#ro-017--rosa-dels-vents-i-altres-complements)        | P3        | Ajornat; menú retirat              | Reprendre amb disseny de rosa incrustada      |
| [RO-003](#ro-003--configuració-inesperada-en-importar-a-bambu) | P2        | Ajornat                            | Perfils d’impressora/filament secundaris      |
| [RO-025](#ro-025--vegetació-mesurada-i-paisatges-històrics)    | P3        | Ajornat                            | Fonts adequades després del nucli             |
| [RO-047](#ro-047--precàrrega-opcional-de-fonts-alternatives)   | P3        | Ajornat                            | Primer consultes i recuperació fiables        |

## Criteris de seguiment

P1: fidelitat i imprimibilitat; P2: funcionalitat i ús; P3: exploració. Només s’arxiven validacions expresses o retirades decidides. Els casos desconeguts no s’etiqueten com a errors resolts. Pages/CI els comprova l’usuari després de les proves locals. El desplegament continua estàtic, sense backend propi.

## Detall

### RO-003 — Configuració inesperada en importar a Bambu

**Ajornat (2026-11-01):** petició expressa de l’usuari, prioritat P2. Reconsiderar després de RO-002, RO-004, RO-005 i RO-006. No es modifiquen perfils d’impressora en aquesta iteració.

**Observació:** l’usuari veu una impressora/configuració estranya, broquet de 0,2 mm i un filament que ha de canviar manualment. Cal registrar versió de Bambu, fitxer concret i passos d’importació.

**Evidència del codi, no diagnòstic final:** l’exportador actual escriu colors i `filament_type: PLA`, però no un perfil d’impressora ni un diàmetre de broquet. Cal determinar què interpreta o completa el laminador, en lloc d’atribuir tots els valors al nostre fitxer.

**Per validar:** comparar 3MF compatible i estàndard amb una configuració d’importació coneguda; entendre d’on surten els valors i corregir/documentar el comportament. Conservar l’assignació correcta dels quatre colors (RO-021), les mides i els materials. No confondre diàmetre del broquet, altura de capa i detall de la malla. Aquesta investigació precedeix RO-015; la comprovació al Bambu de l’usuari continua sent explícita.

### RO-011 — Comptador d’exportacions i Umami

**Proposta, encara no aprovada ni operativa:** una estadística real al footer pot mostrar ús de l’eina. El nombre «4 923» de les notes és un exemple, no una dada del projecte.

**Proper pas:** definir què es compta (clics, fitxers generats correctament, reintents, formats, ZIP de diverses peces) i què es pot afirmar honestament. Investigar l’API i els esdeveniments d’Umami quan hi hagi instància/configuració; no assumir-ne ara les capacitats. El navegador no acredita per si sol una impressió ni que un fitxer s’hagi desat a disc.

**Opció a estudiar:** publicar periòdicament una xifra agregada com a fitxer estàtic, si una automatització pot obtenir-la. No incloure credencials privades al client ni convertir el comptador en una dependència per generar models.

**Per validar:** recompte amb definició, font i data d’actualització; errors d’analítica no trenquen l’eina i no es mostren nombres inventats. Reconsiderar quan hi hagi desplegament estable i s’acordin els esdeveniments a mesurar.

### RO-012 — Presentació realista del model imprès

**Objectiu redefinit per l’usuari (2026-11-02):** imatge estàtica fotorealista a partir de la maqueta dissenyada: acabat mat, paret de fons, taula i estris escolars. La taula 3D actual no satisfà aquest objectiu. Estudi posterior al nucli imprimible, conservant la geometria real i distingint imatge il·lustrativa de garantia física.

**Antecedent implementat a v0.12:** [resultats](RO-012-IMPLEMENTACIO.md). Mateixa geometria/colors, taula/llum, restauració de vista i render a demanda. Navegador local: entrada/sortida, òrbita, edificis incrementals i llegenda correctes; exportacions STL i 3MF Bambu idèntiques amb el mode activat/desactivat. Validació d’usuari, lector de pantalla i mesures instrumentals de rendiment pendents.

**Antecedent:** [proposta d’escena de presentació](RO-012-PROPOSTA.md), revisada per reutilitzar malles, gestionar canvis i restaurar càmera/recursos. L’estat actual és el de l’informe d’implementació enllaçat a dalt.

**Proposta:** escena sobre una taula d’escola, amb perspectiva, llum, ombres i colors que ajudin a imaginar la peça impresa.

**Ajornament:** després de resoldre fiabilitat de geometria/exportació (RO-001/RO-002/RO-003). Estudiar renderitzat local amb la malla real abans de triar tècnica o recursos gràfics.

**Per validar:** la representació usa la geometria, escala i colors seleccionats; es diferencia una escena il·lustrativa d’un resultat físic garantit. El model i la descàrrega continuen operatius si es desactiva aquesta vista.

### RO-014 — Marc imprimible independent

**Decisió de l'usuari (2026-11-02), ajornat:** retirar «Marc exterior» del sidebar dret per reduir soroll mental. Eliminats els controls, preview i descàrrega de la UI a v0.19.0; backend i proves es conserven per reprendre un disseny més detallat. Validació visual local de la retirada i validació d'usuari es registraran separadament.


**Validació rebuda (2026-11-02):** marc validat. Es demana retirar el selector de color i fixar el preview en negre; simplificació aplicada en aquest lot. El material físic es tria al laminador. Ajust de toleràncies i impressió continuen a RO-024.

**Antecedent v0.13:** selector, configuració, previsualització i descàrrega reunits. La vista reutilitza les mateixes mides, tolerància, color i geometria de l’exportació; canviar el marc no crida Restablir ni modifica la càmera.

**Observació de l’usuari conservada:** Validat però modifica el zoom del model, quan en realitat el preview del marc hauria de ser un afegit exterior al model, és a dir, no hauria de fer zoom in-out al conjunt. Les configuracions del marc no afecten el preview i estan al sidebar en zones diferents: allà on indiquem si volem marc o no hauríem de poder indicar la configuració i veure-la previsualitzada, no imaginar-nos-la i que estiguin en llocs diferents.

**Pendent:** confirmació del canvi de color fix, laminat i ajust físic de toleràncies. [Antecedent i comprovacions](RO-014-IMPLEMENTACIO.md).

### RO-016 — Plaques i etiquetes educatives

**Ajornat per l’usuari (2026-11-02):** «Validat però molt millorable». Retirada la secció de plaques del menú; codi i proves conservats per reprendre-la. Prioritzar funcionalitat i qualitat de la maqueta.

**Antecedent implementat a v0.11.0:** [resultats](RO-016-IMPLEMENTACIO.md), geometria i exportació independents comprovades localment. Laminador i prova física pendents; la proposta anterior queda com a antecedent.

**Disseny preparat:** [proposta de plaques](RO-016-PROPOSTA.md), revisada amb mides, contacte base/relleu i distinció de coordenades automàtiques/text editat. 106 proves existents i build correctes; font amb llicència, implementació i llegibilitat física pendents.

**Proposta:** nom del lloc, coordenades o text lliure («Serralada», «Estret», «Badia»...), en placa separada o integrada al model/marc, també llegible des del lateral en una prestatgeria.

**Ajornament:** després del flux principal i de definir les superfícies d’ubicació; coordinació amb RO-013/RO-014.

**Per validar:** text personalitzat amb accents, dimensions i llegibilitat a l’escala d’impressió, ubicació que no tapi geometria important i exportació separada/integrada segons l’opció. L’etiqueta no modifica les coordenades geogràfiques del model.

### RO-017 — Rosa dels vents i altres complements

**Ajornat per petició expressa (2026-11-02):** la rosa incrustada no és prioritària. Es retira també la fletxa independent del menú; el codi queda disponible per reprendre’l.

**Validació i petició de l’usuari (conservada literalment):** No vàlid. Una fletxa grossa sobre un cercle no és una rosa dels vents. Pot ser una opció, però no la única, de model. La rosa del vent la prepararem com una entitat incrustable sobre el model, visible al previsualitzador i impresa com a part del conjunt. L'usuari podrà ubicar-la mitjançant ratolí (mateixa estratègia que el pinzell que hem fet per la vegetació?). Només hi podrà haver una rosa al model. Si fem clic a una altra banda desapareix l'anterior. L'orientació ha de correspondre a la real, evidentment. L'elevació de la rosa haurà de ser configurable 1-3 mil·limetres sobre la cota més alta de la zona on estigui posicionada (això vol dir que en una zona on hi hagi pendent, veurem la rosa sencera, plana horitzontal, aixecada 1-3 mil·limetres a la part més alta i més a la part més baixa)

**Implementat a v0.11.0:** [resultats](RO-017-IMPLEMENTACIO.md), geometria i exportació independents comprovades localment. Laminador i prova física pendents; la proposta anterior queda com a antecedent.

**Disseny preparat:** [proposta de fletxa del nord](RO-017-PROPOSTA.md), revisada i fórmula comprovada contra la projecció real (0° i ±30°, escales iguals/desiguals). 106 proves existents i build correctes; accessori, exportació i validació física pendents.

**Proposta:** accessoris sobre el model o en arxiu independent per afegir-los després d’imprimir.

**Ajornament:** després del flux d’etiquetes i de definir l’orientació geogràfica de RO-018.

**Per validar:** nord real coherent amb l’angle del retall, dimensions imprimibles i peça separada quan es demani. Girar la càmera no ha de modificar la direcció geogràfica indicada.

### RO-019 — Internacionalització

**Setup v0.10.0 implementat:** [arquitectura i migració](RO-019-SETUP.md). Catàleg català, selector amb altres llengües desactivades, formats i persistència amb alternativa segura. 106 proves de suite i build correctes després de revisió; selector i Enter/Escape comprovats al navegador local. Migració de textos parcial, traduccions pendents per petició de l’usuari; lectors de pantalla i validació d’usuari pendents.

**Objectiu:** català, castellà, gallec, euskera i anglès. Traduccions ajornades fins a estabilitzar el flux, tal com indica l’usuari.

**Consideració des d’ara:** no afegir obstacles a la futura separació de textos, formats de nombres/unitats, missatges de càlcul i errors. La preparació arquitectònica es pot valorar abans que la traducció completa, sense obrir una reescriptura ara.

**Per validar:** textos visibles i missatges en la llengua triada, formats coherents, alternativa per a textos absents i cap identificador de capa/material dependent de la traducció.

## Seguiment de canvis anteriors

### RO-023 — Relleu local i fonts vectorials de més precisió

**UX v0.12 implementada:** [resultats i comprovacions locals](RO-023-FONTS-UX.md). Fonts remotes com a flux principal, resum de font seleccionada/pendent, importació avançada plegada i retorn a fonts remotes. Cap proveïdor nou inventat; COG/MDT remot d’alta precisió i validació d’usuari continuen pendents.

**Actualització de l’usuari:** Prioritzar fonts remotes seleccionables i llenguatge educatiu; importació GeoTIFF/GeoJSON queda com a opció avançada plegada, amb ajuda clara. No esperar que docents aportin fitxers especialitzats.

**Primera implementació v0.6.0:** importació local GeoTIFF numèric i GeoJSON d’edificis, reprojecció WGS84/Web Mercator/UTM i límits explícits. Es comprova cobertura i NoData; es rebutgen RGB, compressió inadequada i CRS desconegut. MDT en metres, sense transformar datum vertical ni convertir DSM en terreny nu. El GeoJSON substitueix tota la capa d’edificis, conservant parts i patis disponibles. Proves numèriques i de càrrega de fonts; al navegador, importació d’un MDT sintètic identificat com a prova i del GeoJSON oficial inclòs, seguida de generació girada. Pendent de validar amb MDT oficial d’alta resolució i dades de l’usuari. L’accés automàtic COG/serveis i la comparació/priorització de proveïdors no queden resolts: continuen amb RO-026.

**Origen:** [ARCHITECTURE.md](../ARCHITECTURE.md). Estudiar MDT ICGC/GeoTIFF/COG i cartografia vectorial original o oficial més detallada. Es prioritza el diagnòstic de RO-001 abans de canviar de proveïdor per tapar-ne el símptoma.

**Per validar:** precisió/resolució documentades, projeccions i límits coherents, costa i penya-segats comparats amb dades de referència, atribució i càrrega directa/importació compatibles amb el navegador i GitHub Pages. Un ombrejat WMS no es tracta com a elevació numèrica. Dona suport a RO-002.

**Anotació original de l’usuari sobre v0.6.0:** Validat aparentment, però no puc garantir en diferents escenaris.

**Decisió de l’usuari després de v0.7.0:** Comprovat que l'eina existeix, però poc intuïtiva i massa text. Valorar si podem carregar GeoJSON d'alguna font oberta, potser no com a opció principal però si com una opció d'usuari en cas que vulgui major detall per als edificis.

### RO-024 — Unió de volums i validació d’impressió

**Observació rebuda, 2026-11-02:** al laminador apareixen capes puntuals amb color terra dins de vegetació/arbres i alguns edificis. La causa no està establerta: comprovar encavalcaments, topologia i assignació de materials del 3MF, i després configuració/reparació del laminador. Cal un fitxer i tall concrets abans d’atribuir responsabilitat. Es conserva l’anotació literal a l’historial.

**Prioritat actual (2026-11-02):** abans de reservar 2–3 dies de màquina per model, preparar un cupó amb tauler, diversos pilars i pas inferior. Comprovar primer al laminador unions, llums, portals i base; després registrar la impressió física. No generar una cua de maquetes llargues amb errors coneguts.

**Fonaments v0.12:** [auditoria i unions](RO-024-RESULTATS.md) sobre còpies, material a material, amb regressions i retall real de la Perica. [Túnel sintètic i partició](RO-024-TUNEL-CONTROL.md) comprovats: dos portals, base intacta i pas lliure entre peces. 201 proves/build i controls petit/gran generats. Sense activar unions generals en l’exportació; laminador, impressió física i infraestructures reals pendents.

**Origen:** [ARCHITECTURE.md](../ARCHITECTURE.md). La comprovació de sòlids i els talls amb Manifold ja existeixen; falta concretar la unió/reparació general dels volums i una validació física. No marcar aquesta línia resolta només perquè es pot exportar o tancar un tall.

**Proper pas:** triar un model de prova fiable després de RO-001/RO-002, establir què cal unir dins de cada material i preparar el cas per al laminador de l’usuari.

**Per validar:** malles, superfícies internes/encavalcaments, separació de materials i continuïtat entre peces; després, laminat i impressió física amb mesures d’ajust i observacions registrades. Les validacions de Bambu i d’impressió es documenten separades. Relació amb RO-003, RO-014 i RO-015.

**Actualització v0.9.0:** Pla de sòlids i portes de validació a RO-024-SOLIDS.md, abans de ponts/túnels/cavitats. Encara sense unió general ni validació física.

### RO-025 — Vegetació mesurada i paisatges històrics

**Origen:** conversa i [ARCHITECTURE.md](../ARCHITECTURE.md). Arbres individuals cartografiats/LiDAR i models d’un lloc en altres anys són línies futures diferents de la vegetació procedimental i de l’opció actual d’ocultar edificis.

**Ajornament:** fins a estabilitzar el nucli i disposar de fonts adequades. Si s’activa una d’aquestes línies, dividir-la en tasques pròpies amb fonts, data i precisió. La menció de «v1» a la conversa és una fita futura, no autorització per canviar la versió a 1.0.

**Per validar:** diferenciar dades mesurades/procedimentals i reconstruccions històriques; documentar dates compatibles de relleu, edificació i cobertes del sòl. Eliminar un edifici actual no acredita com era abans el terreny.

### RO-026 — Fidelitat dels edificis i selecció de fonts

**Origen i prioritat:** petició expressa de l’usuari després de v0.5.0 (2026-11-01). P1 perquè afecta la fidelitat del model imprès i pot resoldre els megablocs de RO-002. Estat `Per estudiar`; no s’ha canviat el proveïdor de l’aplicació.

**Objectiu:** obtenir petjades, separacions, patis i parts de volum més fidels; tractar per separat altures i cobertes. Definir quina font convé per regió i atribut, com substituir-la o complementar-la i com explicar-ne les limitacions.

**Estudi inicial registrat:** [RO-026-FONTS-EDIFICIS.md](RO-026-FONTS-EDIFICIS.md). Fonts oficials consultades: Catastre INSPIRE, incloses les parts `BuildingPart`; ICGC RTL, equivalent a 1:1.000; RTT actual i OSM com a comparadors i possibles complements. Verificada la documentació, però no la cobertura detallada de Tamariu, la millora geomètrica, l’accés directe des del navegador ni la integració. L’ordre d’estudi no és encara una jerarquia automàtica de proveïdors.

**Treball proposat:**

1. Descarregar una mostra pública de Tamariu/Palafrugell i comparar el bloc 1074761, una casa aïllada i un edifici amb pati. Identificar parts, contorns, omissions, dates i atributs reals; no confondre parts cadastrals amb cases independents.
2. Preparar una matriu de fonts: cobertura, data de captura/actualització, precisió, parts disponibles, significat de les altures, cobertes, llicència/atribució, formats, mida de descàrrega i viabilitat al navegador.
3. Proposar selecció per qualitat comprovada de zona/atribut. Mantenir una família coherent d’edifici i parts, evitar duplicats i unions que eliminin separacions, i conservar procedència i motius de les alternatives utilitzades. No substituir sempre per ICGC o Catastre només pel nom del proveïdor.
4. Provar un adaptador de la font que aporti una millora demostrada. Si l’accés directe no és viable, valorar importació local o preparació de dades estàtiques obertes, mantenint GitHub Pages sense backend propi.

**Criteris d’acceptació:** millora comparada sobre els casos de control i una segona zona; petjades/parts i patis conservats sense duplicació ni divisions inventades; altures i cobertes distingint dades mesurades, estimacions i límits d’usuari; escala i cobertes horitzontals sense regressions; procedència per element/atribut i avisos de cobertura incompleta; mateixa geometria en preview i exportació; accés, reutilització i cost de càlcul compatibles amb el projecte. Validació local, d’usuari i de laminador separades.

**Límits de l’estudi:** una imatge WMS no proporciona per si sola geometries vectorials; el nombre de plantes no és una altura mesurada; un fitxer 3D no garanteix teulades reals. No es prometen cobertes inclinades fidels on no hi hagi dades. No s’implementa tota aquesta línia només per registrar-la.

**Seguiment v0.8.0:** obtinguda la primera comparació real de la Perica amb Catastre: 22 parts de 9 famílies intersecten el megabloc, amb cobertura del 85,6% de la petjada RTT. Mostra experimental preparada localment i figura a [PAISATGE-3D.md](PAISATGE-3D.md). Segona zona, contrast de discrepàncies, política de fonts i adaptador de navegador pendents. RO-002 continua obert; RO-023 coordina projeccions/cartografia/relleu; RO-022 conserva el comportament de les cobertes ja validat.

**Decisió de l’usuari després de v0.7.0:** Per estudiar.

**Actualització v0.9.0:** Primer adaptador Catastre WFS: consultes acotades, XML validat i reprojecció. Altures estimades a partir de plantes, zero plantes excloses. Comparació amb ICGC/OSM disponible. RTL, segona zona i priorització de fonts addicionals pendents.

### RO-032 — Cobertes i volums singulars

**P1 en curs, lot v0.18:** [font i integració](RO-032-INTEGRACIO.md) de petjades/parts i cobertes OSM originals, sis formes paramètriques i mostra real Torre Glòries. Els dos serveis Overpass han esgotat el temps d'espera a la prova local real; l'alternativa OSM simplificada es conserva amb avís. Accés remot reeixit i cobertura de Tamariu encara pendents. Sagrada Família requereix dades i suport específics; no s'ha reconstruït pel nom. No es tanca la cobertura general a partir d'un sol exemple. Els modes limitat/pla conserven el comportament anterior.

**Recerca actualitzada:** [dades reals de cobertes](RO-032-DADES-COBERTES.md), MDTe territorial/litoral com a superfície d’altituds; no conté plans semàntics. Cal endpoint COG/CORS/rangs i ajustos de qualitat per petjada abans d’automatitzar; no s’inventen cobertes. Recerca revisada, 139 proves/build correctes; funcionalitat de cobertes de Tamariu pendent.

**Actualització de l’usuari:** L’usuari valida els volums cadastrals de Tamariu, però observa cobertes reals inclinades que continuen planes. Cal obtenir dades de coberta de la mateixa regió; no convertir totes les teulades a inclinades ni inferir-les només de les petjades.

Estudiar roof:shape, roof:height, roof:direction/angle i parts d’OSM original, CityGML/CityJSON o models municipals 3D. Distingir coberta paramètrica d’una malla real (p. ex. Torre Glòries). Respectar els modes limitat/pla; no inventar cobertes per donar aparença de realisme. Pla i casos de control a PAISATGE-3D.md.

**Actualització v0.9.0:** Primer suport de cobertes gabled/skillion amb forma, altura i direcció explícites en dades locals. Respecta el gir, els patis, el retall i el mode limitat pla. Falten fonts automàtiques de cobertes i formes corbes/complexes; Catastre no les aporta.

### RO-033 — Ponts i viaductes

**Incidència nova (2026-11-02), P1:** la captura de l’usuari mostra només un pilar després de fer zoom out a Rajadell; amb zoom in el resultat és millor. Cal corregir l’adaptació física dels suports i les distàncies, amb proves de regressió a escales diferents. Correcció integrada a v0.17.0 amb cap adaptat i auxiliars; [proves i límits](RO-033-SUPORTS-ESCALA.md). 262 proves i build correctes. Navegador i 3MF reals a 3 km / 150 mm: 8 pilars, un component i llum màxima mostrejada de 5,93 mm. Pendent de comprovació de l’usuari i laminat; també dels suports dels enllaços prolongats.

**v0.16.0, implementat i pendent de validar per l’usuari:** flux procedimental integrat de taulers MVT amb perfil lineal entre cotes DEM dels extrems, pilars, enllaços i unions. Avisos i procedència separen estimacions de dades específiques. [Nucli i límits](RO-033-PROCEDURAL-CORE.md). 241 proves, build i 3MF del retall mogut correctes en local. La v0.15.1 es va publicar primer com a punt estable parcial de càrrega geogràfica.

**Decisió de l’usuari després de v0.15.0:** prioritzar construcció procedimental general; evitar acumular fitxers per a desenes de milers de ponts. Conservar Rajadell com a cas especial ja disponible. Altres excepcions, només sota demanda concreta, amb àmbit geogràfic i font explícits. No s’obre ara una tasca de Millau.

**Actualització posterior de l'usuari (2026-11-02):** Millau sí queda recollit com a cas de regressió de la generalització: segons zoom/posició del retall s'omet bona part del viaducte o apareixen geometries anguloses. Reproduir amb centre, retall, escala, fonts i resultat registrats; revisar traçat, retall i continuïtat a RO-033/052. Aquest seguiment actualitza la priorització anterior, sense introduir una reconstrucció específica pel nom del lloc.

**Pendent, P1:** contrastar almenys tres ubicacions reals alienes a Rajadell (recte, corbat i creuament inferior), incloent canvi de font d’edificis i límit del retall. Revisar que els DEM dels extrems i la interpolació no enfonsen els taulers en relleus intermedis. Les proves sintètiques no substitueixen aquesta comprovació. Validar laminat, suports omesos i fragments separats. El camí inferior ha de continuar obert, no només el peu del pilar en queda fora.

**Validació rebuda:** l’usuari aprova l’aspecte visual de la reconstrucció de Rajadell. Continuen pendents la impressió, els fragments petits tallats i la cobertura general; l’evitació es limita als obstacles presents a les dades.

**v0.15.0 implementada:** [pilars, enllaços i comprovacions](RO-033-SUPORTS-I-ENLLACOS.md). Viaducte principal amb onze pilars segons el projecte, dues connexions i un únic component tancat; 40 cm també comprovat. Validació d’usuari i laminat pendents.

**Petició i treball v0.15.0:** l’usuari confirma l’avenç i aporta captures de taulers flotants als estreps. Calen pilars que evitin camins i edificis i prolongacions amb pendent suau fins a la superfície de la carretera. Els laterals IFC `lpn` 64097/64748 descriuen vores. El plànol IDEAM/ACHE, figura 1 pàgina 2, sí que aporta onze estacions de pilars i una secció nominal; s’han incorporat amb alineació aproximada a l’eix i comprovació d’obstacles. Es preparen suports i connexions identificats com a adaptacions estimades d’impressió; perfils reals de pilars per a més endavant.

**v0.14.0, parcial implementat:** [taulers reals ICGC, proves i límits](RO-033-IMPLEMENTACIO.md). Quatre superfícies XYZ al catàleg de Manresa, amb gruix imprimible simplificat, aire a sota i exportació. Sense pilars mesurats ni càrrega 3D automàtica fora de la mostra. Falta contrast de datum/estreps, laterals `lpn`, laminat i validació d’usuari.

**Actualització de l’usuari:** Incloure taulers viaris i ferroviaris, connexions i cota pròpia. No confondre brunnel/layer amb altitud; dependència de RO-024.

Separar ponts dels camins adherits al terreny; cercar cota del tauler, connexions i suports. brunnel/layer només indiquen tipus/ordre, no metres. Estudiar un viaducte cartografiat amb dades suficients i un cas sense cota. Pla a PAISATGE-3D.md.

### RO-034 — Túnels imprimibles

**Petició v0.18.1 implementada:** activats per defecte a la interfície, paviment de material camí/ferrocarril i volta parabòlica. Control real amb ICGC i detall 36 correcte: principal excavat i segon candidat omès per manca de coberta. Transacció nativa de sòlids fins al resultat final, conservant closques interiors i volums petits; base i colors comprovats. 342 proves úniques, build i control de navegador correctes; laminador i impressió pendents. La forma arquejada redueix la llum superior plana; no acredita una impressió sense suports per a totes les escales/configuracions.

**Incidència confirmada per l’usuari, lot v0.18:** al sud de la vista inicial de Rajadell, la carretera continua a l’altra banda de la muntanya sense una obertura visible. La v0.17 no es considera resolució d’aquest cas amb els ajustos per defecte. Es revisen ancoratge del perfil als portals generats, fragments i proves a resolucions 24/36/56.

**Correcció v0.18 comprovada localment:** perfil interior DEM conservat i rampes curtes als portals quan la superfície interpolada els enterra; límits de 25% físic, 25 m verticals i 8 mm / 100 m de prolongació (el menor). Excavació limitada als components propers, sense ampliar pressupostos globals. Control de quatre retalls/detalls i 3MF correcte; 284 casos únics i build superats. A 3 km / 150 mm s'omet el principal per manca de coberta suficient. Revisió visual final del túnel i laminat pendents d'usuari; no s'ha repetit l'automatització del navegador després dels bloquejos. [Criteris i límits](RO-034-OBERTURES.md).

**v0.17.0 experimental (2026-11-02), P1:** implementació d’obertures amb booleans i opció experimental estimada explícita, desactivada per defecte. Nucli, UI, worker i vista/exportació integrats. [Proves, portals i límits](RO-034-OBERTURES.md). Dades insuficients no s’etiqueten com una reconstrucció real. La mostra de control en detall ràpid passa; en detall equilibrat i en la regió remota de 3 km hi ha omissions amb avís. Prioritat següent: continuïtat entre fragments MVT, diferències DEM/graella i portals a diferents escales.

**Recerca anterior, 2026-11-02:** [comprovació de dades del full de Manresa](RO-034-DADES-IFC.md). Fonts examinades insuficients: traçat MVT 2D, sense eix XYZ ni secció acreditats. Escombrat numèric amb perfil propi provat, encara sense perforació automàtica d’aquest túnel. Cal localitzar dades constructives o acordar una aproximació explícita abans de modelar-lo com a real.

Escombrar una secció sobre un eix 3D i restar-la dels volums de terreny i capes que travessi. Fan falta portals, traçat, cota, secció i política d’escala. Conservar mar/base, continuïtat entre peces i geometria tancada. No prometre un túnel real a partir d’una línia 2D. Pla a PAISATGE-3D.md; depèn de RO-024.

### RO-035 — Cavitats i relleus amb voladissos

Un MDT d’una altura per XY no descriu cavitats ni voladissos. Investigar núvols de punts o malles d’aixecaments amb cobertura de la cavitat; LiDAR aeri no garanteix veure’n l’interior. Començar per un arc petit amb malla oberta i llicència comprovada. Pla a PAISATGE-3D.md.

### RO-044 — Catastre per seccions i recuperació de configuracions

[Diagnòstic i comprovacions](RO-044-CATASTRE-RECUPERACIO.md). Reproduït a Tamariu: el servidor rebutja l’àrea inicial (3,18 km²) amb «Area of extension out of limits». Ara es subdivideix només davant límits reconeguts, fins a dos nivells 2×2, 42 consultes lògiques i dues connexions simultànies, amb pressupost total de tres minuts. Duplicats coherents eliminats; cap resultat parcial acceptat.

Comprovació real: 10 consultes, 624 edificis, 2.613 parts, 301 duplicats i 2.447 volums sobre rasant. Navegador local: error incremental conserva model, restaura font/mode/altura i habilita exportació; regió nova usa ICGC amb avís explícit. Model nou confirmat després del Worker. Validació de l’usuari pendent.

### RO-045 — Coherència visual dels sidebars

**v0.14.0:** [llibre d’estil](../DESIGN.md) obligatori també per a Kimi, referenciat a AGENTS.md; tokens de tipografia i controls compartits, sense canviar valors visuals. Criteris d’acceptació inclouen navegador i captures; tests/build no substitueixen revisió visual.

Homogeneïtzats resums, camps, desplegables i sortides de text amb l’estètica existent. Resum de fonts sense caixa fosca ni mida desproporcionada; controls del marc reunits i fletxa del nord retirada. Comprovació visual local completada; validació de l’usuari pendent.

### RO-046 — Catàleg de llocs recomanats

**Validació rebuda (2026-11-02):** catàleg validat. Canviar el selector ara inicia la càrrega de l’exemple; retirat el botó «Carrega exemple». Comprovació local entre Tamariu i Rajadell correcta; validació d’usuari del canvi pendent.

Inici a 41.71792, 1.78391: «Viaducte de l’Eix Diagonal (Bages)», retall inicial d’1,5 × 1,5 km. Mostra estàtica amb quatre parelles de tessel·les i 18 elements ICGC. Tamariu es conserva com «Badia (Tamariu, Baix Empordà)». El catàleg recupera retall, nord i fonts inicials.

Canvi entre els dos exemples comprovat al navegador. Retalls rectangulars
conserven la proporció geogràfica i queden dins de les tessel·les incloses;
títols suggerits de placa prou curts per a la mida inicial. [Inventari 2D
d’infraestructures](mostres/eix-diagonal-infraestructura.json): sis fragments
etiquetats com a pont/túnel, amb coordenades XY i sense cota del tauler o eix.

RO-033/034: aquesta ubicació és el següent cas d’estudi; els taulers XYZ s’han incorporat a v0.14; el túnel continua pendent de dades suficients. Cal validar cotes, portals i seccions reals.

### RO-047 — Precàrrega opcional de fonts alternatives

Proposta de l’usuari: opció a Com funciona per carregar altres capes en segon pla, explicant el consum addicional de dades. No activada en aquesta iteració. Primer es corregeixen les consultes i la recuperació d’errors.

Abans d’implementar: cua limitada, cancel·lació per canvi de regió, memòria cau amb caducitat i estat per àrea/font; un error temporal no demostra manca de cobertura ni ha de desactivar permanentment un proveïdor. Sense peticions ocultes addicionals ara.

### RO-050 — Ferrocarrils diferenciats

**P2, implementat i comprovat localment (2026-11-02):** [nucli i comprovacions](RO-050-FERROCARRILS.md). Vies ferroviàries separades dels camins amb increment de 0, 0,5 o 1 mm sobre el realç viari; +1 mm per defecte. Mil·límetres de maqueta, sense exageració vertical. Capa amb assignació de material pròpia, també en impressió monocroma. Control i llegenda revisats a 1280×720; geometria, materials i procedència exportada comprovats, amb 284 casos únics i build superats. Usuari/laminador pendents.

**Criteris:** identificar vies per atributs de la font, sense confondre un camí `track` amb tren. Conservar nivells de ponts i pilars; realç sobre el tauler, sense moure la seva cota original. Vies en túnel no es dibuixen a la superfície. Preview/3MF/STL i canvis incrementals d’edificis han de conservar la mateixa geometria. Migrar assignacions de vuit categories sense perdre triangles en 1/2/4/8 materials. Carrils i travesses detallats queden per escales on siguin imprimibles.

### RO-051 — Perfils de carreteres principals

**Represa autoritzada (2026-11-02), primer lot completat localment:** diagnòstic i optimització seqüencial en l'equip de 64 GB. El prototip continua sense activar-se a la UI. Ordre i responsables:

- [x] Agent: instrumentar màscares, diferències, cobertura, obstacles/suports i sòlids; mesurar el cas de 3 km / 150 mm / detall 12 amb límit de temps i vigilància de memòria.
- [x] Agent: evitar unions d'obstacles no utilitzades. Mateix equip: 189,274 → 56,638 s, 14 perfils, mateixos resums d'omissions/pilars/llums, auditoria sense errors i 3MF generat. [Mètode i límits](RO-051-RENDIMENT.md).
- [x] Agent: controls de 1,5 / 2,4 / 3 km i ICGC/túnels en detall 36; regressions i suite en blocs seqüencials: **344/344**, build correcte. 2,4 km aplica sis perfils en 18,907 s; ICGC/túnels aplica quatre perfils en 10,625 s. El control d'1,5 km / detall 12 recupera els camins previs, no es considera resolt.
- [ ] Agent, següent: aïllar el component de **volum nul a 1,5 km / detall 12 / OSM**. Reproduït també amb `c74e992`, mateix error i resultat recuperat. Guardar el component mínim i corregir-lo conservant volums positius i recuperació atòmica.
- [ ] Agent, després: màscares per ID/multipart i fragments estrets. Els intents han canviat el resultat i s'han retirat; no s'han eliminat components petits ni rebaixat les comprovacions per donar-los per bons. El filtratge espacial d'obstacles també queda retirat del lot actual; la causa numèrica de la divergència encara no està acreditada.
- [ ] Usuari, disponible al repositori: obrir el [3MF de 3 km](../public/controls/ro-051/RO-051-3km-150mm.3mf) al laminador i revisar perfils, connexions, pilars i passos inferiors del retall ampliat. Aquest fitxer no inclou túnels ni arbres.
- [ ] Usuari, disponible al repositori: obrir el [3MF de Rajadell amb túnels](../public/controls/ro-051/RO-051-Rajadell-tunels-150mm.3mf) i revisar portals, paviment del túnel, materials i passos lliures. Control ICGC, detall 36: onze pilars al viaducte, dos nous i túnel principal excavat; segon túnel omès per manca de coberta. El prototip encara no té selector a la UI.
- [ ] Usuari: imprimir un cupó petit després de revisar el laminat, abans d'impressions llargues. Les malles correctes no acrediten encara la impressió física.
- [ ] Agent: un cop resoltes les incidències i contrastats els controls, decidir l'activació i mesurar cobertura/unions residuals abans de plantejar paral·lelització. Si es reprèn el filtratge espacial, capturar la primera col·lisió divergent i el motor/tolerància emprats.

**Després d'aquest diagnòstic:** refactorització/modularització segons els límits del motor; [RO-053: flux per etapes i auditoria de sidebars](#ro-053--flux-de-treball-per-etapes); contrast general de ponts (incloent Millau amb retalls/escales diferents); depuració de backlog i documents redundants conservant observacions originals i evidència pendent. Són passos previstos, encara sense implementació ni validació.

**P1, en curs (v0.18.1):** l'usuari observa ondulacions desproporcionades a l'Eix Transversal, al costat de Rajadell. Cal una estratègia general per a motorway/trunk i enllaços, preservant camins secundaris i fonts/procedència.

**Tancament parcial per canvi d'ordinador:** `majorRoads:true` queda com a opt-in només de codi, desactivat a l'aplicació publicada. El retall de 3 km s'ha interromput als 416 s amb CPU activa i memòria disponible; no s'ha validat. [Diagnòstic i següents passos](REPRESA.md). Els resultats del control inicial següent corresponen al prototip activat explícitament, no al comportament per defecte de la UI.

Primer prototip local: perfil longitudinal regularitzat amb tall/terraplè acotats i camp triangular compartit entre substrat i superfícies. Proves petites correctes; encara sense publicar.

**Decisió posterior de l'usuari:** conservar el relleu i connectar punts alts mitjançant una envolupant superior, afegint suports estimats als trams que en necessitin. El prototip de tall/terraplè s'ha retirat del lot. Els gruixos es descompten abans de planificar pilars; les altituds del terreny i els seus desnivells no s'ajusten. Es documenten les omissions i es distingeixen aquestes estructures inferides dels ponts cartografiats o mesurats.

**Control local inicial del prototip correcte:** quatre perfils viaris, dos pilars nous, llum mostrejada màxima de 3,681 mm i túnel principal aplicat. El viaducte conserva onze pilars i dues connexions. El creuament que descartava el tram llarg era un altre camí-pont a uns 418 m fora de la maqueta, sense font IFC; la comprovació ara respecta el retall físic. El punt publicable amb prototip desactivat supera 342 proves, build i controls locals; no acredita el cas ampliat interromput. Els creuaments interiors sense cota coneguda continuen omesos amb avís. [Decisió i límits](RO-051-PERFILS-VIARIS.md).

**Criteris:** perfil menys ondulat, continuïtat amb ponts/túnels i extrems, malles tancades, absència de col·lisions amb vies/edificis carregats, escala i retall coherents, avisos quan no hi ha una solució segura, mateixa geometria en preview i fitxer, laminat pendent d'usuari. La simplificació no és un aixecament real de la carretera.

### RO-052 — Continuïtat i amplada del traçat viari

**TANCAMENT PARCIAL per petició de l'usuari (2026-11-02):** treball desat i publicat per reprendre al portàtil. No s'ha resolt RO-052. Compilació correcta; última selecció 12/13, falla la boca del rectangle girat (cotes 7,06837 / 7,17250 / 7,35417 mm). Els perfils transversals complets estan integrats però pendents de depuració. Les proves pesants, regeneració final de controls i revisió visual del marc no s'han fet després del darrer refinament. [Instruccions exactes de represa](REPRESA-RO-052.md).


**P1, implementació autoritzada en curs (2026-11-02), observació expressa de l'usuari:** als 3MF les unions entre carretera, túnel i viaducte tenen formes estranyes, manca continuïtat de la línia i apareixen canvis d'amplada. L'usuari proposa revisar el traçat complet d'una mateixa carretera, en lloc de resoldre segments aïllats. Relacionat amb RO-033/034/051; no queda validat pel rendiment ni per malles tancades.

**Diagnòstic estàtic inicial:** hi ha polítiques diferents per a superfície, tauler i túnel. El paviment del túnel reutilitza l'amplada mínima de la cavitat; les continuacions de pont es trien per proximitat/classe/direcció, sense una identitat comuna de carretera. Cal distingir amplada de calçada, amplada estructural del tauler i secció lliure de túnel: no s'han d'igualar cegament.

- [x] Agents independents: revisar polítiques d'amplada i selecció de continuacions; identificar buits de les proves actuals. Primera correcció implementada en v0.19.0 parcial; manca validar el darrer refinament.
- [x] Agent: conservar identificadors i atributs de ruta i construir correspondències fiables entre fragments de superfície/pont/túnel, evitant unir carreteres diferents només perquè es creuen.
- [x] Agent: definir l'amplada comuna de paviment i transicions quan hi hagi canvis acreditats de carrils/amplada. Separar-la dels mínims d'obertura imprimible i de l'amplada estructural mesurada.
- [x] Agent: provar una passada conjunta de continuïtat a boques i estreps, amb cotes i dues vores coherents, mantenint el terreny i els buits sota les estructures.
- [ ] Agent: completar la regressió integrada superfície → pont → superfície → túnel → superfície; mostrejar eix i vores, connexions i material, a diferents escales i retalls. Conservar la geometria a preview i 3MF.
- [ ] Usuari: revisar els enllaços i les transicions d'amplada dels nous controls abans de validar laminat/impressió. Els fitxers de v0.18.2 documenten el problema i no el donen per resolt.

### RO-053 — Flux de treball per etapes

**P1, proposta prioritària reiterada per l'usuari el 2026-11-02. Estat: per dissenyar; encara no implementat.** Objectiu: seguir polint la implementació i separar clarament els processos de **terreny, vegetació, vies i edificis**, possiblement en quatre etapes successives de construcció. Guanyar rapidesa, control i comprensió del resultat, evitant una generació monolítica seguida de retocs aïllats. Inclou arquitectura incremental i navegació/sidebars; no és només canviar l'ordre dels menús.

**Hipòtesi inicial de l'usuari, pendent d'avaluar i validar:**

| Moment | Acció de l'usuari i resultat esperat |
| --- | --- |
| Preparació | Triar primer mida útil d'impressió, dimensions del projecte/peces i configuració bàsica, tenint en compte el límit de la màquina. |
| Territori i terreny | Triar ubicació, zoom/escala i retall. Generar elevacions i tipologies bàsiques: aigua, terra i boscos/zones verdes. La proposta també contempla mostrar ja vegetació inicial. |
| Vegetació i base | Desplegar la configuració de vegetació; pintar-la o ajustar la base i continuar quan l'usuari estigui satisfet. |
| Vies de comunicació | Configurar i generar carreteres/ferrocarrils, ponts, viaductes i túnels, amb perfils altimètrics, creuaments i connexions coherents segons les dades i l'escala. |
| Edificis | Afegir edificis i contorns precisos, triant les col·leccions ICGC, OpenStreetMap o Catastre disponibles. Estudiar altres fonts després que aquest flux sigui funcional. |

La preparació de mida i territori precedeix les quatre capes; el nombre de pantalles o passos de la UI encara no està decidit. L'usuari considera que aquest ordre té sentit però el planteja com a hipòtesi. **Cal estudiar l'ordre lògic abans d'implementar-lo**, inclosa l'alternativa de completar o reconciliar la vegetació després de vies/edificis. Diferenciar la cobertura verda bàsica del terreny dels volums d'arbres.

**Dependències i comportament que el disseny ha de resoldre:**

- Les vies i els edificis condicionen les col·lisions i la vegetació. Si s'incorporen després de pintar, conservar els traços i definir com es reconcilien els arbres afectats; explicar qualsevol canvi visible i oferir desfer/ajustar.
- Tornar a un pas anterior ha de conservar les decisions de l'usuari. Definir què es reutilitza, es reprojecta o s'invalida en canviar mida, escala, ubicació, gir, font o configuració, sense pèrdues silencioses.
- Separar càrrega de dades, preparació de geometria i presentació de cada capa; memòria cau i recalculat només de les dependències afectades. Mesurar el temps de cada etapa i els canvis incrementals abans de decidir si convé paral·lelitzar càlculs.
- Estats clars de pendent/calculant/preparat/error, progrés, cancel·lació quan sigui viable i recuperació del model vàlid. Preview central i mides d'impressió estables en avançar o retrocedir.
- Carreteres, rails, ponts i túnels han de formar un traçat coherent encara que es generin en etapes. Distingir cotes acreditades, estimacions i realços físics; coordinar amb RO-052, RO-033, RO-034, RO-050 i RO-051.
- Homogeneïtzar el llenguatge dels controls i revisar l'UX dels sidebars seguint DESIGN.md i RO-045. La modularització del motor ha de donar suport al flux, no provocar reconstruccions completes per canvis locals.

**Casos i observacions que s'han de conservar:** els ponts sobre alguns rius ja s'han generat correctament, però queden viaductes, túnels, creuaments ferroviaris i altimetria per contrastar. **Viaducte de Millau:** l'usuari observa omissions de bona part de l'estructura o geometries anguloses segons zoom i posició del model. Incorporar-lo com a regressió general de RO-033/052 amb retall, escala i fonts registrats; no donar-lo per resolt per les proves de Rajadell ni convertir-lo automàticament en una excepció geogràfica.

**Pla de treball i seguiment:**

- [ ] Agent: inventariar el flux actual i les dependències de dades/meshes/edicions, aprofitant el recalculat incremental existent.
- [ ] Agent: comparar l'ordre proposat amb alternatives justificades; preparar un mapa de passos i estats, incloent tornar enrere, errors i invalidació de capes.
- [ ] Usuari: revisar un prototip o proposta visual del flux i dels sidebars abans d'una reorganització general de la UI.
- [ ] Agent: definir límits de mòduls i un primer pilot petit de construcció per etapes; implementar-lo gradualment, conservant el comportament i les dades verificades.
- [ ] Agent: comprovar temps/memòria per etapa, reutilització de capes no afectades, conservació del pinzell i configuració, continuïtat del transport i igualtat preview/exportació. Provar avançar/retrocedir i errors, no només la construcció final.
- [ ] Usuari: validar claredat, agilitat, control i absència de soroll mental amb un recorregut real complet; després, laminat/impressió dels nous controls quan la geometria estigui estabilitzada.

**Proper resultat revisable:** proposta explícita d'ordre i dependències, amb justificació de la posició de la vegetació i de les decisions de mida/escala. Disseny prioritari coordinat amb les incidències obertes; el registre d'aquesta proposta no tanca RO-052 ni autoritza a donar per acabades les validacions geomètriques pendents.
