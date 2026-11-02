# Backlog actiu de Relleu Obert

Actualitzat: **2026-11-01**. Iteració **v0.11.0**: implementació i comprovacions locals; validació d’usuari pendent. Les quatre validacions de v0.8.0 i les anotacions originals són a [HISTORIAL.md](HISTORIAL.md). Identificadors estables, versions 0.x fins a declaració explícita d’estabilitat.

## Prioritats immediates

**Tancament de sessió demanat per l’usuari:** publicar les correccions i els tres complements ja integrats. RO-012(escena), RO-023(UX de fonts) i RO-024(sòlids per a infraestructures) continuen pendents; les cobertes reals depenen de dades/accés de RO-032. No es dona cap línia pendent per completada.

**Lot nou autoritzat:** [DELEGACIONS-011.md](DELEGACIONS-011.md), Kimi 100% disponible comunicat ara. Acceptar Catastre buit, millorar pinzell/navegació i actualització d’edificis, investigar dades de cobertes i implementar propostes. RO-023 prioritza fonts remotes entenedores; RO-033 inclou viaductes ferroviaris. RO-024 s’executa com a fonament de ponts/cavitats, sense atribuir dades 3D inexistents.

**Lot anterior completat:** execució seqüencial delegada a Kimi, amb revisió i proves obligatòries; cua i abast a [DELEGACIONS.md](DELEGACIONS.md). Primer RO-039, després setup de RO-019 i propostes de RO-014/016/017/012. RO-033–035 mantenen la dependència de RO-024.

1. Corregir respostes buides del Catastre i interacció del pinzell (RO-040–RO-042); validar actualització automàtica (RO-043).
2. Comparar fidelitat de parts i cobertes, segona zona i noves fonts (RO-026 / RO-032).
3. Preparar sòlids i proves de continuïtat per a ponts/túnels/cavitats (RO-024), segons [RO-024-SOLIDS.md](RO-024-SOLIDS.md).

## Feina pendent

| ID                                                                 | Prioritat | Estat                                                           | Feina                                                                 |
| ------------------------------------------------------------------ | --------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| [RO-011](#ro-011--comptador-dexportacions-i-umami)                 | P3        | Per estudiar                                                    | Comptador públic i futura integració Umami                            |
| [RO-023](#ro-023--relleu-local-i-fonts-vectorials-de-més-precisió) | P2        | Per millorar                                                    | Simplificar la importació local i estudiar fonts GeoJSON accessibles  |
| [RO-024](#ro-024--unió-de-volums-i-validació-dimpressió)           | P1        | Per estudiar                                                    | Unió general de volums i impressió física                             |
| [RO-026](#ro-026--fidelitat-dels-edificis-i-selecció-de-fonts)     | P1        | En estudi                                                       | Comparar parts cadastrals i petjades, amb política de fonts explícita |
| [RO-032](#ro-032--cobertes-i-volums-singulars)                     | P2        | En estudi                                                       | Cobertes reals segons dades disponibles                               |
| [RO-033](#ro-033--ponts-i-viaductes)                               | P2        | Per estudiar                                                    | Ponts i viaductes amb cota pròpia                                     |
| [RO-034](#ro-034--túnels-imprimibles)                              | P3        | Per estudiar                                                    | Túnels com a passos oberts dins del model                             |
| [RO-035](#ro-035--cavitats-i-relleus-amb-voladissos)               | P3        | Per estudiar                                                    | Baumes, coves i arcs naturals amb dades 3D                            |
| [RO-036](#ro-036--pinzell-de-vegetació-sense-quadrícula)           | P2        | Validat                                                         | Dispersió aleatòria dins del pinzell                                  |
| [RO-037](#ro-037--selecció-explícita-de-fonts-dedificis)           | P1        | Validat                                                         | Fonts explícites i Catastre opcional                                  |
| [RO-038](#ro-038--capa-dedificis-incremental)                      | P1        | Validat                                                         | Actualització de només edificis                                       |
| [RO-039](#ro-039--timeout-de-la-font-catastre)                     | P1        | Validat                                                         | Timeout del Catastre: reintent fitat i missatge accionable            |
| [RO-019](#ro-019--internacionalització)                            | P3        | Setup preparat; traduccions pendents                            | Català, castellà, gallec, euskera i anglès                            |

| [RO-040](#ro-040--catastre-sense-edificis-no-ha-de-bloquejar-el-model) | P1 | Pendent de validar | Acceptar respostes vàlides buides; distingir-les d’errors de servei |
| [RO-041](#ro-041--recuperar-la-navegació-en-tancar-vegetació) | P1 | Pendent de validar | Tancar el panell o canviar de menú desactiva el pinzell |
| [RO-042](#ro-042--densitat-i-cobertura-única-de-cada-traç) | P2 | Pendent de validar | Defecte ×0,5, màxim ×2 i evitar sobrepintar la mateixa zona en un gest |
| [RO-043](#ro-043--actualització-automàtica-dedificis) | P2 | Pendent de validar | Canvis d’edificis amb espera breu, cua i conservació del terreny |

| [RO-014](#ro-014--marc-imprimible-independent)           | P2        | Pendent de validar | Marc imprimible amb marge configurable          |

| [RO-016](#ro-016--plaques-i-etiquetes-educatives)        | P2        | Pendent de validar | Nom, coordenades i textos educatius imprimibles |

| [RO-017](#ro-017--rosa-dels-vents-i-altres-complements)  | P3        | Pendent de validar | Rosa dels vents i altres accessoris             |

## Dissenys preparats

Propostes revisades, encara sense funcionalitat implementada. Les proves específiques de geometria i les validacions físiques són criteris futurs.

| ID                                                       | Prioritat | Estat                                     | Feina                                           |
| -------------------------------------------------------- | --------- | ----------------------------------------- | ----------------------------------------------- |
| [RO-012](#ro-012--presentació-realista-del-model-imprès) | P3        | Proposta preparada; implementació pendent | Escena de presentació sobre una taula           |

## Ajornats

| ID                                                             | Prioritat | Estat   | Feina                                             |
| -------------------------------------------------------------- | --------- | ------- | ------------------------------------------------- |
| [RO-003](#ro-003--configuració-inesperada-en-importar-a-bambu) | P2        | Ajornat | Impressora, broquet i filament inesperats a Bambu |
| [RO-025](#ro-025--vegetació-mesurada-i-paisatges-històrics)    | P3        | Ajornat | Vegetació mesurada i paisatges històrics          |

## Criteris de seguiment

P1: fidelitat/fiabilitat; P2: funcionalitat/interfície; P3: exploració. Proves locals, validació d’usuari, laminador i impressió són fases diferents. Només s’arxiven validacions expresses o retirades decidides per l’usuari. Ajornaments conservats; cap petició descartada. Notes inicials a [MILLORES-BUGS.md](MILLORES-BUGS.md). Pages/CI remots els comprova l’usuari.

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

**Disseny preparat:** [proposta d’escena de presentació](RO-012-PROPOSTA.md), revisada per reutilitzar malles, gestionar canvis de model, restaurar càmera/recursos i renderitzar amb amortiment sense bucle permanent en repòs. 106 proves existents i build correctes; escena i comprovacions visuals/rendiment pendents.

**Proposta:** escena sobre una taula d’escola, amb perspectiva, llum, ombres i colors que ajudin a imaginar la peça impresa.

**Ajornament:** després de resoldre fiabilitat de geometria/exportació (RO-001/RO-002/RO-003). Estudiar renderitzat local amb la malla real abans de triar tècnica o recursos gràfics.

**Per validar:** la representació usa la geometria, escala i colors seleccionats; es diferencia una escena il·lustrativa d’un resultat físic garantit. El model i la descàrrega continuen operatius si es desactiva aquesta vista.

### RO-014 — Marc imprimible independent

**Implementat a v0.11.0:** [resultats](RO-014-IMPLEMENTACIO.md), geometria i exportació independents comprovades localment. Laminador i prova física pendents; la proposta anterior queda com a antecedent.

**Disseny preparat:** [proposta de marc imprimible](RO-014-PROPOSTA.md), revisada per separar tolerància/solapa i segmentar només el perímetre exterior. 106 proves existents i build correctes; geometria, proves específiques futures, laminador i ajust físic pendents.

**Proposta:** exportar el marc en un altre fitxer, amb buit interior calculat des de la maqueta i un marge configurable per encabir-la.

**Ajornament:** fins a definir RO-013 i una prova d’ajust físic (RO-024).

**Per validar:** dimensions, tolerància i gruixos explícits; arxiu independent, ajust físic comprovat i estratègia per a marcs que superin el llit d’impressió. No assumir un encaix universal per a totes les impressores/materials.

### RO-016 — Plaques i etiquetes educatives

**Implementat a v0.11.0:** [resultats](RO-016-IMPLEMENTACIO.md), geometria i exportació independents comprovades localment. Laminador i prova física pendents; la proposta anterior queda com a antecedent.

**Disseny preparat:** [proposta de plaques](RO-016-PROPOSTA.md), revisada amb mides, contacte base/relleu i distinció de coordenades automàtiques/text editat. 106 proves existents i build correctes; font amb llicència, implementació i llegibilitat física pendents.

**Proposta:** nom del lloc, coordenades o text lliure («Serralada», «Estret», «Badia»...), en placa separada o integrada al model/marc, també llegible des del lateral en una prestatgeria.

**Ajornament:** després del flux principal i de definir les superfícies d’ubicació; coordinació amb RO-013/RO-014.

**Per validar:** text personalitzat amb accents, dimensions i llegibilitat a l’escala d’impressió, ubicació que no tapi geometria important i exportació separada/integrada segons l’opció. L’etiqueta no modifica les coordenades geogràfiques del model.

### RO-017 — Rosa dels vents i altres complements

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

**Actualització de l’usuari:** Prioritzar fonts remotes seleccionables i llenguatge educatiu; importació GeoTIFF/GeoJSON queda com a opció avançada plegada, amb ajuda clara. No esperar que docents aportin fitxers especialitzats.

**Primera implementació v0.6.0:** importació local GeoTIFF numèric i GeoJSON d’edificis, reprojecció WGS84/Web Mercator/UTM i límits explícits. Es comprova cobertura i NoData; es rebutgen RGB, compressió inadequada i CRS desconegut. MDT en metres, sense transformar datum vertical ni convertir DSM en terreny nu. El GeoJSON substitueix tota la capa d’edificis, conservant parts i patis disponibles. Proves numèriques i de càrrega de fonts; al navegador, importació d’un MDT sintètic identificat com a prova i del GeoJSON oficial inclòs, seguida de generació girada. Pendent de validar amb MDT oficial d’alta resolució i dades de l’usuari. L’accés automàtic COG/serveis i la comparació/priorització de proveïdors no queden resolts: continuen amb RO-026.

**Origen:** [ARCHITECTURE.md](../ARCHITECTURE.md). Estudiar MDT ICGC/GeoTIFF/COG i cartografia vectorial original o oficial més detallada. Es prioritza el diagnòstic de RO-001 abans de canviar de proveïdor per tapar-ne el símptoma.

**Per validar:** precisió/resolució documentades, projeccions i límits coherents, costa i penya-segats comparats amb dades de referència, atribució i càrrega directa/importació compatibles amb el navegador i GitHub Pages. Un ombrejat WMS no es tracta com a elevació numèrica. Dona suport a RO-002.

**Anotació original de l’usuari sobre v0.6.0:** Validat aparentment, però no puc garantir en diferents escenaris.

**Decisió de l’usuari després de v0.7.0:** Comprovat que l'eina existeix, però poc intuïtiva i massa text. Valorar si podem carregar GeoJSON d'alguna font oberta, potser no com a opció principal però si com una opció d'usuari en cas que vulgui major detall per als edificis.

### RO-024 — Unió de volums i validació d’impressió

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

**Recerca actualitzada:** [dades reals de cobertes](RO-032-DADES-COBERTES.md), MDTe territorial/litoral com a superfície d’altituds; no conté plans semàntics. Cal endpoint COG/CORS/rangs i ajustos de qualitat per petjada abans d’automatitzar; no s’inventen cobertes. Recerca revisada, 139 proves/build correctes; funcionalitat de cobertes de Tamariu pendent.

**Actualització de l’usuari:** L’usuari valida els volums cadastrals de Tamariu, però observa cobertes reals inclinades que continuen planes. Cal obtenir dades de coberta de la mateixa regió; no convertir totes les teulades a inclinades ni inferir-les només de les petjades.

Estudiar roof:shape, roof:height, roof:direction/angle i parts d’OSM original, CityGML/CityJSON o models municipals 3D. Distingir coberta paramètrica d’una malla real (p. ex. Torre Glòries). Respectar els modes limitat/pla; no inventar cobertes per donar aparença de realisme. Pla i casos de control a PAISATGE-3D.md.

**Actualització v0.9.0:** Primer suport de cobertes gabled/skillion amb forma, altura i direcció explícites en dades locals. Respecta el gir, els patis, el retall i el mode limitat pla. Falten fonts automàtiques de cobertes i formes corbes/complexes; Catastre no les aporta.

### RO-033 — Ponts i viaductes

**Actualització de l’usuari:** Incloure taulers viaris i ferroviaris, connexions i cota pròpia. No confondre brunnel/layer amb altitud; dependència de RO-024.

Separar ponts dels camins adherits al terreny; cercar cota del tauler, connexions i suports. brunnel/layer només indiquen tipus/ordre, no metres. Estudiar un viaducte cartografiat amb dades suficients i un cas sense cota. Pla a PAISATGE-3D.md.

### RO-034 — Túnels imprimibles

Escombrar una secció sobre un eix 3D i restar-la dels volums de terreny i capes que travessi. Fan falta portals, traçat, cota, secció i política d’escala. Conservar mar/base, continuïtat entre peces i geometria tancada. No prometre un túnel real a partir d’una línia 2D. Pla a PAISATGE-3D.md; depèn de RO-024.

### RO-035 — Cavitats i relleus amb voladissos

Un MDT d’una altura per XY no descriu cavitats ni voladissos. Investigar núvols de punts o malles d’aixecaments amb cobertura de la cavitat; LiDAR aeri no garanteix veure’n l’interior. Començar per un arc petit amb malla oberta i llicència comprovada. Pla a PAISATGE-3D.md.

### RO-036 — Pinzell de vegetació sense quadrícula

**Implementat, pendent de validar:** Mostreig uniforme dins del disc amb distància mínima, llavor determinista per traç i intents acotats. Cap malla de col·locació; els contenidors espacials només serveixen per comprovar veïns. Variació de capçades independent del recorregut automàtic. Canviar densitat no altera traços antics.

### RO-037 — Selecció explícita de fonts d’edificis

**Implementat, pendent de validar:** Retirat Automàtic · ICGC. ICGC per defecte dins de l’àmbit configurat i OSM fora; ICGC desactivat fora de l’àmbit, sense confondre’l amb cobertura comprovada de cada edifici. Catastre opcional a península/Balears, límit de 4 km² i errors sense canvi silenciós de font. Fonts noves només quan es validin.

### RO-038 — Capa d’edificis incremental

**Implementat, pendent de validar:** Càrrega i memòria cau de la capa d’edificis sense redescàrrega de vectors/DEM. Worker reutilitza terreny, aigua, camins i cobertes del sòl; conserva les capçades que no xoquen amb petjades noves. Canvis d’altura no mouen arbres. Missatges parcials al preview, càmera conservada i botó Actualitzar els edificis. Una regió, mida, gir, font de relleu o exageració nous sí que necessiten reconstrucció general.

## Historial de v0.9.0

- RO-009, RO-015, RO-030 i RO-031: validats → historial.
- RO-002: alternativa implementada per provar al mateix cas; no es dona per validada tota la fidelitat cadastral.
- RO-026 / RO-032: abast parcial explícit; fonts/cobertes noves pendents.
- RO-036–RO-038: implementats i pendents de validar. RO-024 / RO-033–RO-035 segueixen oberts.
- Delegació acotada a un únic Kimi k3-256k per al repartiment del pinzell, després que l’usuari confirmés consum inicial del 0%. Dos fitxers revisats i vuit proves pròpies superades; cap altre agent simultani. No es declara un percentatge final de consum que no s’hagi mesurat.

**Comprovació local de v0.9.0:** 82 proves superades i construcció estàtica correcta. Al navegador, retall de 150 × 150 mm a 1:1.000 centrat a 41.91814, 3.20528: 18 fragments amb ICGC i 117 volums retallats amb Catastre. Exportacions STL amb vuit assignacions: material-1 (terreny), material-4 (camins), material-5 (bosc), material-6 (arbres) i material-8 (aigua interior) idèntics byte a byte abans/després; només material-3 (edificis) canvia. Les categories absents continuen absents. El canvi de font manté la càmera i el mapa ocult conserva la selecció. Falta la validació de l’usuari, laminador i impressió; no s’han comprovat Pages/CI remots.

### RO-039 — Timeout de la font Catastre

**Actualització de l’usuari:** L’usuari ha obtingut dades cadastrals correctes en ampliar el mapa. La nova fallada de resposta sense dades es registra a RO-040; no es dona per provada una causa de timeout a partir d’una resposta buida.

**Observació de l’usuari:** carregar edificis del Catastre sobre la mateixa zona retorna «signal timed out». No es dona per reproduïda la causa només per aquest text.

**Encàrrec completat:** Kimi ha rebut diagnòstic acotat del WFS, gestió de temps límit/reintents limitats, errors entenedors i regressions. Ha de conservar model/font explícita en fallar i evitar resultats parcials a la memòria cau. Entrega només amb totes les proves i construcció passades, o informe de bloqueig després de tres intents.

**RO-039 · entrega revisada:** [diagnòstic i correcció](RO-039-CATASTRE-TIMEOUT.md), 45 s per intent i un reintent, inclosa la lectura del cos. 89 proves de suite i build correctes; proves específiques repetides pel revisor. Causa exacta del cas real i càrrega satisfactòria de Tamariu pendents de validar.

### RO-040 — Catastre sense edificis no ha de bloquejar el model

**Implementat i revisat:** [diagnòstic i proves](RO-040-CATASTRE-BUIT.md). Col·leccions buides vàlides, capes mixtes i zero parts sobre rasant acceptades; paginació/recomptes incoherents continuen sent errors. 117 proves de suite i build correctes; AOI real buida/mixta pendent de validar.

**Petició de l’usuari:** Acceptar respostes vàlides buides; distingir-les d’errors de servei.

**Seguiment:** Implementat, pendent de validar. Encàrrecs seqüencials a Kimi i revisió abans de continuar. Proves locals obligatòries; validació d’usuari diferenciada.

### RO-041 — Recuperar la navegació en tancar vegetació

**Implementat i revisat:** [resultats del pinzell](RO-041-042-PINZELL.md), 128 proves i build correctes. Densitat ×0,5/màxim×2, cobertura per gest i retorn de navegació comprovats localment; validació d’usuari pendent.

**Petició de l’usuari:** Tancar el panell o canviar de menú desactiva el pinzell.

**Seguiment:** Implementat, pendent de validar. Encàrrecs seqüencials a Kimi i revisió abans de continuar. Proves locals obligatòries; validació d’usuari diferenciada.

### RO-042 — Densitat i cobertura única de cada traç

**Implementat i revisat:** [resultats del pinzell](RO-041-042-PINZELL.md), 128 proves i build correctes. Densitat ×0,5/màxim×2, cobertura per gest i retorn de navegació comprovats localment; validació d’usuari pendent.

**Petició de l’usuari:** Defecte ×0,5, màxim ×2 i evitar sobrepintar la mateixa zona en un gest.

**Seguiment:** Implementat, pendent de validar. Encàrrecs seqüencials a Kimi i revisió abans de continuar. Proves locals obligatòries; validació d’usuari diferenciada.

### RO-043 — Actualització automàtica d’edificis

**Implementat i revisat:** [resultats d’edificis automàtics](RO-043-EDIFICIS-AUTO.md). Espera300ms i només edificis sobre terreny vigent; bloqueig/captura i validació posterior a càrrega, cancel·lació i protecció de resultats antics. 138 proves/build i regressió addicional del planificador passada. Navegador: canvi d’altura/font sense botó, i canvi de relleu que conserva Generar explícit, comprovats; validació d’usuari pendent.

**Petició de l’usuari:** Canvis d’edificis amb espera breu, cua i conservació del terreny.

**Seguiment:** Implementat, pendent de validar. Encàrrecs seqüencials a Kimi i revisió abans de continuar. Proves locals obligatòries; validació d’usuari diferenciada.
