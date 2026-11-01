# Backlog actiu de Relleu Obert

Actualitzat: **2026-11-01**. Iteració **v0.8.0**: implementació i proves locals acabades; pendent de validació d’usuari. Validacions de v0.7.0 arxivades a [HISTORIAL.md](HISTORIAL.md), conservant les anotacions originals. No es reutilitzen identificadors.

## Prioritats immediates

1. Vegetació completa, pinzell al límit i densitat per traç (RO-030 / RO-031).
2. Retirar broquet i tipus de filament; colors i assignacions de materials es conserven (RO-015).
3. Comparar el megabloc de Tamariu amb parts del Catastre i preparar la política de fonts (RO-002 / RO-026). Millorar la via local sense afegir opcions confuses (RO-023).
4. Estudiar cobertes, ponts, túnels i cavitats per fases (RO-032–RO-035), amb dades i criteris a [PAISATGE-3D.md](PAISATGE-3D.md).

## Feina pendent

| ID | Prioritat | Estat | Feina |
| --- | --- | --- | --- |
| [RO-002](#ro-002--edificis-contigus-representats-com-a-megablocs) | P1 | Per estudiar | Edificis contigus representats com a megablocs |
| [RO-009](#ro-009--favicon) | P2 | Pendent de validar | Favicon quadrat |
| [RO-011](#ro-011--comptador-dexportacions-i-umami) | P3 | Per estudiar | Comptador públic i futura integració Umami |
| [RO-015](#ro-015--opcions-de-broquet-i-filament) | P2 | Pendent de validar | Retirar broquet i tipus de filament de la configuració i del 3MF |
| [RO-023](#ro-023--relleu-local-i-fonts-vectorials-de-més-precisió) | P2 | Per millorar | Simplificar la importació local i estudiar fonts GeoJSON accessibles |
| [RO-024](#ro-024--unió-de-volums-i-validació-dimpressió) | P1 | Per estudiar | Unió general de volums i impressió física |
| [RO-026](#ro-026--fidelitat-dels-edificis-i-selecció-de-fonts) | P1 | En estudi | Comparar parts cadastrals i petjades, amb política de fonts explícita |
| [RO-030](#ro-030--vegetació-incompleta-i-límit-de-recursos) | P1 | Pendent de validar | Vegetació completa i pinzell quan s’assoleix el límit |
| [RO-031](#ro-031--densitat-dels-traços-de-vegetació) | P2 | Pendent de validar | Densitat només per als traços nous del pinzell |
| [RO-032](#ro-032--cobertes-i-volums-singulars) | P2 | Per estudiar | Cobertes reals segons dades disponibles |
| [RO-033](#ro-033--ponts-i-viaductes) | P2 | Per estudiar | Ponts i viaductes amb cota pròpia |
| [RO-034](#ro-034--túnels-imprimibles) | P3 | Per estudiar | Túnels com a passos oberts dins del model |
| [RO-035](#ro-035--cavitats-i-relleus-amb-voladissos) | P3 | Per estudiar | Baumes, coves i arcs naturals amb dades 3D |

## Ajornats

| ID | Prioritat | Estat | Feina |
| --- | --- | --- | --- |
| [RO-003](#ro-003--configuració-inesperada-en-importar-a-bambu) | P2 | Ajornat | Impressora, broquet i filament inesperats a Bambu |
| [RO-012](#ro-012--presentació-realista-del-model-imprès) | P3 | Ajornat | Escena de presentació sobre una taula |
| [RO-014](#ro-014--marc-imprimible-independent) | P2 | Ajornat | Marc imprimible amb marge configurable |
| [RO-016](#ro-016--plaques-i-etiquetes-educatives) | P2 | Ajornat | Nom, coordenades i textos educatius imprimibles |
| [RO-017](#ro-017--rosa-dels-vents-i-altres-complements) | P3 | Ajornat | Rosa dels vents i altres accessoris |
| [RO-019](#ro-019--internacionalització) | P3 | Ajornat | Català, castellà, gallec, euskera i anglès |
| [RO-025](#ro-025--vegetació-mesurada-i-paisatges-històrics) | P3 | Ajornat | Vegetació mesurada i paisatges històrics |

## Criteris de seguiment

P1: fidelitat/fiabilitat o flux principal; P2: funcionalitat/interfície; P3: exploració. Una correcció implementada o una prova local no tanca una incidència d’ús. Només s’arxiven entrades validades per l’usuari o retirades expressament. Els ajornaments es mantenen i no són descarts. Versions 0.x fins que l’usuari declari estabilitat. Pages/CI remots els comprova l’usuari. Notes inicials intactes a [MILLORES-BUGS.md](MILLORES-BUGS.md).

## Detall

### RO-002 — Edificis contigus representats com a megablocs

**Diagnòstic completat a v0.5.0; millora pendent (2026-11-01):** el bloc de la captura és `icgc-1074761`, una sola petjada original d’uns 1.723 m² amb 29 coordenades i cap divisió interior. No hi ha petjades OSM intersectants a les tessel·les de la mostra. La combinació conserva la geometria exacta. [Informe reproduïble](RO-002-DIAGNOSTIC.md).

**Decisió:** no inventar divisions. Advertiment de petjades agrupades incorporat a les limitacions i exportacions; regressió de conservació de totes les petjades oficials, adjacències i patis. Torna a `Per estudiar` per buscar una font oberta amb parts d’edificis (RO-023). No es dona el problema visual per corregit.

**Continuació:** la investigació i priorització de fonts s’organitza a RO-026. Aquesta incidència manté l’evidència del megabloc i es validarà quan hi hagi una millora real sobre el mateix cas. A v0.8.0, primer contrast amb parts cadastrals registrat a [PAISATGE-3D.md](PAISATGE-3D.md); el mode automàtic encara no canvia.

**Evidència:** [Google Maps](google-maps.png), [OpenStreetMap](openstreetmap.png) i [Relleu Obert](relleu-obert.png), a la corba del carrer de la Perica / GIV-6542 de Tamariu. La captura OSM mostra absència de diverses petjades; la de Relleu Obert mostra blocs grans. Les imatges no identifiquen per si soles quina operació els ha produït.

**Proper pas:** identificar les geometries d’aquesta ubicació a ICGC i OSM/OpenFreeMap, els seus identificadors, alçàries i fragments després de combinar/retallar. Distingir un polígon de font que ja agrupa edificis, una unió nostra i edificis separats que visualment semblen units perquè comparteixen cota/color. Revisar també polígons amb parts o patis.

**Per validar:** comparació de petjades d’entrada/sortida amb casos de cases contigües sobre pendent, conservant les separacions presents a les dades i una cota de coberta per edifici identificable. No donar per real una divisió inventada només per corregir l’aspecte. Si falten dades de separació, documentar el límit o buscar una font oberta millor. Validació d’alçàries condicionada a RO-001; relacionada amb RO-022 i RO-023.

### RO-003 — Configuració inesperada en importar a Bambu

**Ajornat (2026-11-01):** petició expressa de l’usuari, prioritat P2. Reconsiderar després de RO-002, RO-004, RO-005 i RO-006. No es modifiquen perfils d’impressora en aquesta iteració.

**Observació:** l’usuari veu una impressora/configuració estranya, broquet de 0,2 mm i un filament que ha de canviar manualment. Cal registrar versió de Bambu, fitxer concret i passos d’importació.

**Evidència del codi, no diagnòstic final:** l’exportador actual escriu colors i `filament_type: PLA`, però no un perfil d’impressora ni un diàmetre de broquet. Cal determinar què interpreta o completa el laminador, en lloc d’atribuir tots els valors al nostre fitxer.

**Per validar:** comparar 3MF compatible i estàndard amb una configuració d’importació coneguda; entendre d’on surten els valors i corregir/documentar el comportament. Conservar l’assignació correcta dels quatre colors (RO-021), les mides i els materials. No confondre diàmetre del broquet, altura de capa i detall de la malla. Aquesta investigació precedeix RO-015; la comprovació al Bambu de l’usuari continua sent explícita.

### RO-009 — Favicon

**Implementat a v0.6.0:** favicon SVG amb els tres triangles, contrast propi sobre fons clar i ruta relativa al subdirectori. Asset inclòs a la construcció i enllaç verificat al DOM local. Pendent de validar a les pestanyes del navegador habitual de l’usuari.

**Abast:** reutilitzar els tres triangles del header com a marca provisional de la pestanya.

**Per validar:** es veu en navegador clar/fosc, no hi ha peticions de favicon inexistents i les rutes funcionen sota el subdirectori de GitHub Pages.

**Revisió v0.7.0 · Pendent de validar:** Favicon amb llenç quadrat de 38 × 38, conservant el logotip.

**Anotació original de l’usuari sobre v0.6.0:** Fons de la icona quadrat, no rectangular, per aprofitar millor l'espai disponible.

### RO-011 — Comptador d’exportacions i Umami

**Proposta, encara no aprovada ni operativa:** una estadística real al footer pot mostrar ús de l’eina. El nombre «4 923» de les notes és un exemple, no una dada del projecte.

**Proper pas:** definir què es compta (clics, fitxers generats correctament, reintents, formats, ZIP de diverses peces) i què es pot afirmar honestament. Investigar l’API i els esdeveniments d’Umami quan hi hagi instància/configuració; no assumir-ne ara les capacitats. El navegador no acredita per si sol una impressió ni que un fitxer s’hagi desat a disc.

**Opció a estudiar:** publicar periòdicament una xifra agregada com a fitxer estàtic, si una automatització pot obtenir-la. No incloure credencials privades al client ni convertir el comptador en una dependència per generar models.

**Per validar:** recompte amb definició, font i data d’actualització; errors d’analítica no trenquen l’eina i no es mostren nombres inventats. Reconsiderar quan hi hagi desplegament estable i s’acordin els esdeveniments a mesurar.

### RO-012 — Presentació realista del model imprès

**Proposta:** escena sobre una taula d’escola, amb perspectiva, llum, ombres i colors que ajudin a imaginar la peça impresa.

**Ajornament:** després de resoldre fiabilitat de geometria/exportació (RO-001/RO-002/RO-003). Estudiar renderitzat local amb la malla real abans de triar tècnica o recursos gràfics.

**Per validar:** la representació usa la geometria, escala i colors seleccionats; es diferencia una escena il·lustrativa d’un resultat físic garantit. El model i la descàrrega continuen operatius si es desactiva aquesta vista.

### RO-014 — Marc imprimible independent

**Proposta:** exportar el marc en un altre fitxer, amb buit interior calculat des de la maqueta i un marge configurable per encabir-la.

**Ajornament:** fins a definir RO-013 i una prova d’ajust físic (RO-024).

**Per validar:** dimensions, tolerància i gruixos explícits; arxiu independent, ajust físic comprovat i estratègia per a marcs que superin el llit d’impressió. No assumir un encaix universal per a totes les impressores/materials.

### RO-015 — Opcions de broquet i filament

**v0.8.0 · Retirada implementada, pendent de validar:** eliminats els dos selectors, el mòdul d’opcions i els camps de broquet/tipus de filament al 3MF. Colors i assignacions de materials conservats. La configuració d’impressió es decideix al laminador. La funció pot reprendre’s amb demanda o una contribució específica; no es promet una versió. Les notes següents documenten la implementació anterior.

**Primera implementació v0.6.0:** PLA/PETG i broquet opcional de 0,2/0,4/0,6 mm; per defecte no s’escriu diàmetre i es conserva el del laminador. Valors explícits al dialecte Bambu i procedència en 3MF/STL, sense perfils de màquina, temperatures ni G-code. Proves de metadades i preservació de geometria. Abast acotat mentre RO-003 continua ajornat: no es dona per resolta la configuració inesperada de Bambu. Pendent de validar el reconeixement amb el laminador de l’usuari.

**Proposta:** poder seleccionar broquet de 0,2 / 0,4 / 0,6 mm i material, per exemple PLA o PETG, quan l’exportació i el laminador ho puguin interpretar correctament.

**Dependència acotada:** RO-003 continua ajornat. Aquesta primera iteració només incorpora els valors de consumibles escollits explícitament, sense generar perfils de màquina ni investigar els valors inesperats d’importació. La validació al laminador segueix pendent.

**Per validar:** opcions reconegudes amb la impressora/perfil seleccionats, valors modificables per l’usuari i regressió de quatre colors. No prometre un perfil complet ni temperatures adequades només a partir de «PLA» o del diàmetre del broquet.

**Decisió de l’usuari després de v0.7.0:** Validat, però eliminarem l'opció de material i gruix de broquet, perquè ho ignora, així que millor simplement exportem el 3MF i que l'usuari decideixi com enfocar exactament la seva configuració. Eliminem les opcions de material i gruix del broquet..

### RO-016 — Plaques i etiquetes educatives

**Proposta:** nom del lloc, coordenades o text lliure («Serralada», «Estret», «Badia»...), en placa separada o integrada al model/marc, també llegible des del lateral en una prestatgeria.

**Ajornament:** després del flux principal i de definir les superfícies d’ubicació; coordinació amb RO-013/RO-014.

**Per validar:** text personalitzat amb accents, dimensions i llegibilitat a l’escala d’impressió, ubicació que no tapi geometria important i exportació separada/integrada segons l’opció. L’etiqueta no modifica les coordenades geogràfiques del model.

### RO-017 — Rosa dels vents i altres complements

**Proposta:** accessoris sobre el model o en arxiu independent per afegir-los després d’imprimir.

**Ajornament:** després del flux d’etiquetes i de definir l’orientació geogràfica de RO-018.

**Per validar:** nord real coherent amb l’angle del retall, dimensions imprimibles i peça separada quan es demani. Girar la càmera no ha de modificar la direcció geogràfica indicada.

### RO-019 — Internacionalització

**Objectiu:** català, castellà, gallec, euskera i anglès. Traduccions ajornades fins a estabilitzar el flux, tal com indica l’usuari.

**Consideració des d’ara:** no afegir obstacles a la futura separació de textos, formats de nombres/unitats, missatges de càlcul i errors. La preparació arquitectònica es pot valorar abans que la traducció completa, sense obrir una reescriptura ara.

**Per validar:** textos visibles i missatges en la llengua triada, formats coherents, alternativa per a textos absents i cap identificador de capa/material dependent de la traducció.

## Seguiment de canvis anteriors

### RO-023 — Relleu local i fonts vectorials de més precisió

**Primera implementació v0.6.0:** importació local GeoTIFF numèric i GeoJSON d’edificis, reprojecció WGS84/Web Mercator/UTM i límits explícits. Es comprova cobertura i NoData; es rebutgen RGB, compressió inadequada i CRS desconegut. MDT en metres, sense transformar datum vertical ni convertir DSM en terreny nu. El GeoJSON substitueix tota la capa d’edificis, conservant parts i patis disponibles. Proves numèriques i de càrrega de fonts; al navegador, importació d’un MDT sintètic identificat com a prova i del GeoJSON oficial inclòs, seguida de generació girada. Pendent de validar amb MDT oficial d’alta resolució i dades de l’usuari. L’accés automàtic COG/serveis i la comparació/priorització de proveïdors no queden resolts: continuen amb RO-026.

**Origen:** [ARCHITECTURE.md](../ARCHITECTURE.md). Estudiar MDT ICGC/GeoTIFF/COG i cartografia vectorial original o oficial més detallada. Es prioritza el diagnòstic de RO-001 abans de canviar de proveïdor per tapar-ne el símptoma.

**Per validar:** precisió/resolució documentades, projeccions i límits coherents, costa i penya-segats comparats amb dades de referència, atribució i càrrega directa/importació compatibles amb el navegador i GitHub Pages. Un ombrejat WMS no es tracta com a elevació numèrica. Dona suport a RO-002.

**Anotació original de l’usuari sobre v0.6.0:** Validat aparentment, però no puc garantir en diferents escenaris.

**Decisió de l’usuari després de v0.7.0:** Comprovat que l'eina existeix, però poc intuïtiva i massa text. Valorar si podem carregar GeoJSON d'alguna font oberta, potser no com a opció principal però si com una opció d'usuari en cas que vulgui major detall per als edificis.

### RO-024 — Unió de volums i validació d’impressió

**Origen:** [ARCHITECTURE.md](../ARCHITECTURE.md). La comprovació de sòlids i els talls amb Manifold ja existeixen; falta concretar la unió/reparació general dels volums i una validació física. No marcar aquesta línia resolta només perquè es pot exportar o tancar un tall.

**Proper pas:** triar un model de prova fiable després de RO-001/RO-002, establir què cal unir dins de cada material i preparar el cas per al laminador de l’usuari.

**Per validar:** malles, superfícies internes/encavalcaments, separació de materials i continuïtat entre peces; després, laminat i impressió física amb mesures d’ajust i observacions registrades. Les validacions de Bambu i d’impressió es documenten separades. Relació amb RO-003, RO-014 i RO-015.

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

### RO-030 — Vegetació incompleta i límit de recursos

El generador s’atura en arribar a 12.000 arbres, deixant sense cobrir les files finals; el pinzell no afegeix arbres al límit. Mostreig determinista de tota l’àrea, prioritat dels arbres pintats, avís de saturació i memòria cau de candidats. Provar una zona verda que superi el límit i pintar-hi amb capacitat plena.

### RO-031 — Densitat dels traços de vegetació

La densitat deixa de regenerar automàticament tot el bosc. Es desa per traç perquè canviar-la no modifiqui els traços anteriors. Confirmar en navegador que el control no inicia un càlcul i que el pinzell pinta més/menys arbres.

### RO-032 — Cobertes i volums singulars

Estudiar roof:shape, roof:height, roof:direction/angle i parts d’OSM original, CityGML/CityJSON o models municipals 3D. Distingir coberta paramètrica d’una malla real (p. ex. Torre Glòries). Respectar els modes limitat/pla; no inventar cobertes per donar aparença de realisme. Pla i casos de control a PAISATGE-3D.md.

### RO-033 — Ponts i viaductes

Separar ponts dels camins adherits al terreny; cercar cota del tauler, connexions i suports. brunnel/layer només indiquen tipus/ordre, no metres. Estudiar un viaducte cartografiat amb dades suficients i un cas sense cota. Pla a PAISATGE-3D.md.

### RO-034 — Túnels imprimibles

Escombrar una secció sobre un eix 3D i restar-la dels volums de terreny i capes que travessi. Fan falta portals, traçat, cota, secció i política d’escala. Conservar mar/base, continuïtat entre peces i geometria tancada. No prometre un túnel real a partir d’una línia 2D. Pla a PAISATGE-3D.md; depèn de RO-024.

### RO-035 — Cavitats i relleus amb voladissos

Un MDT d’una altura per XY no descriu cavitats ni voladissos. Investigar núvols de punts o malles d’aixecaments amb cobertura de la cavitat; LiDAR aeri no garanteix veure’n l’interior. Començar per un arc petit amb malla oberta i llicència comprovada. Pla a PAISATGE-3D.md.

## Historial de v0.8.0

- Validades i arxivades: RO-004, RO-006, RO-008, RO-018, RO-027, RO-028, RO-029. RO-004 es pot reobrir quan hi hagi una nova millora concreta.
- RO-015: retirada expressa de dues opcions; no es retiren colors ni separació de materials. La funció es pot reprendre si hi ha una contribució i demanda, sense compromís de versió.
- RO-023: l’usuari confirma l’existència, no la usabilitat ni una millora de dades.
- RO-030 / RO-031: implementats i pendents de validar. RO-032–RO-035: estudi registrat, encara sense reconstrucció 3D real.

**Comprovacions locals v0.8.0:** 63 proves automatitzades superades i construcció estàtica correcta. Regressió de bosc saturat, repartiment als quatre quadrants, prioritat del pinzell, densitat desada per traç, memòria cau i exportació sense configuració d’impressora. En navegador local: densitat de ×2,5 a ×5 sense canvi de 4.559 arbres ni inici de càlcul; generació de 40 × 40 cm amb 12.000 arbres i traç processat a capacitat plena. Validació d’usuari/laminador/impressió separada; Pages i CI no comprovats.

**Exportació real del navegador:** 3MF únic de 400 × 400 mm amb 623.484 vèrtexs finits dins dels límits. Quatre colors conservats, sense camps de broquet/tipus de filament; 11.955 arbres automàtics i 45 pintats, sumant 12.000. Desat localment a `output/v0.8.0-saturated-painted.3mf`. No obert al laminador ni imprès. Mostra cadastral experimental acceptada per l’importador: 80 parts, altures marcades com a estimades.
