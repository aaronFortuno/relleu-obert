# Backlog actiu de Relleu Obert

Actualitzat: **2026-11-02**. Iteració **v0.16.0**: ponts procedimentals i continuïtat geogràfica de Rajadell. Les quatre validacions de v0.8.0 i les anotacions originals són a [HISTORIAL.md](HISTORIAL.md). Identificadors estables, versions 0.x fins a declaració explícita d’estabilitat.

## Prioritats immediates

1. **RO-033: generalitzar ponts i trams elevats sense dades preparades per lloc.** La generació procedimental ja està integrada; falta contrast en més ubicacions reals i al laminador. Rajadell queda com a excepció, no com a estratègia de cobertura mundial.
2. **RO-024/033/049: validar al laminador** les unions, els pilars, els extrems i els realços de 0/0,5/1 mm; després, un control físic petit. Revisar fragments dels ponts petits al límit del retall i continuïtat en peces de 40 cm.
3. **RO-023/026/032: qualitat de les fonts**, relleu, petjades i cobertes, amb contrast en més d’una zona. La fidelitat no queda acreditada només pel nom del proveïdor.
4. Comprovacions curtes del que ja està implementat: Catastre buit/per seccions i recuperació (040/044), càmera/scroll (045), marc/plaques (014/016), exemples/base (046/048) i presentació (012). Arxivar només validacions explícites.
5. RO-034/035 mantenen una línia d’estudi posterior: els túnels i cavitats reals encara requereixen dades o una aproximació acordada. Traduccions, comptador i les quatre línies formalment ajornades no desplacen el nucli geogràfic.

**Lectura del backlog:** 18 línies obertes i 4 ajornades, més 27 arxivades.
Una part de les obertes ja està implementada i només espera validació; no són
18 desenvolupaments nous. L’aprovació visual de Rajadell no tanca la
generalització ni substitueix el laminat o la impressió.

## Feina pendent

| ID | Prioritat | Estat | Feina |
| --- | --- | --- | --- |
| [RO-011](#ro-011--comptador-dexportacions-i-umami) | P3 | Per estudiar | Comptador públic i futura integració Umami |
| [RO-023](#ro-023--relleu-local-i-fonts-vectorials-de-més-precisió) | P2 | UX implementada; fonts pendents | Validar el flux remot i incorporar fonts precises accessibles |
| [RO-024](#ro-024--unió-de-volums-i-validació-dimpressió) | P1 | Fonaments en validació | Unió acotada, continuïtat de cavitats i prova física |
| [RO-026](#ro-026--fidelitat-dels-edificis-i-selecció-de-fonts) | P1 | En estudi | Comparar parts cadastrals i petjades, amb política de fonts explícita |
| [RO-032](#ro-032--cobertes-i-volums-singulars) | P2 | En estudi | Cobertes reals segons dades disponibles |
| [RO-033](#ro-033--ponts-i-viaductes) | P1 | Procedimental integrat; en validació | Contrast de perfils i continuïtat; Rajadell com a excepció |
| [RO-034](#ro-034--túnels-imprimibles) | P3 | Dades insuficients al cas de prova | Túnels: motor preparat; calen cotes i secció |
| [RO-035](#ro-035--cavitats-i-relleus-amb-voladissos) | P3 | Per estudiar | Baumes, coves i arcs naturals amb dades 3D |
| [RO-019](#ro-019--internacionalització) | P3 | Setup preparat; traduccions pendents | Català, castellà, gallec, euskera i anglès |
| [RO-040](#ro-040--catastre-sense-edificis-no-ha-de-bloquejar-el-model) | P1 | Pendent de validar | Acceptar respostes vàlides buides; distingir-les d’errors de servei |
| [RO-014](#ro-014--marc-imprimible-independent) | P2 | Millora implementada; pendent de validar | Marc coherent entre configuració, vista i exportació |
| [RO-016](#ro-016--plaques-i-etiquetes-educatives) | P2 | Pendent de validar | Nom, coordenades i textos educatius imprimibles |
| [RO-012](#ro-012--presentació-realista-del-model-imprès) | P3 | Implementat; pendent de validar | Escena de presentació sobre una taula |
| [RO-044](#ro-044--catastre-per-seccions-i-recuperació-de-configuracions) | P1 | Implementat; pendent de validar | Consultes acotades i retorn a la capa vàlida |
| [RO-045](#ro-045--coherència-visual-dels-sidebars) | P2 | Implementat; pendent de validar | Tipografia, controls i textos discrets |
| [RO-046](#ro-046--catàleg-de-llocs-recomanats) | P2 | Implementat; pendent de validar | Viaducte inicial i badia de Tamariu conservada |

| [RO-048](#ro-048--base-relativa-a-la-cota-mínima-del-retall) | P1 | Implementat; pendent de validar | Cota mínima a 5 mm i desnivells conservats |
| [RO-049](#ro-049--camins-realçats) | P2 | Implementat; pendent de validar | Camins amb relleu opcional de 0,5 o 1 mm |

## Ajornats

| ID | Prioritat | Estat | Feina |
| --- | --- | --- | --- |
| [RO-003](#ro-003--configuració-inesperada-en-importar-a-bambu) | P2 | Ajornat | Impressora, broquet i filament inesperats a Bambu |
| [RO-025](#ro-025--vegetació-mesurada-i-paisatges-històrics) | P3 | Ajornat | Vegetació mesurada i paisatges històrics |
| [RO-017](#ro-017--rosa-dels-vents-i-altres-complements) | P3 | Ajornat per l’usuari | Rosa incrustada; opció retirada del sidebar |
| [RO-047](#ro-047--precàrrega-opcional-de-fonts-alternatives) | P3 | Ajornat; proposta | Estudiar precàrrega amb consentiment i pressupost |

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

**Implementat a v0.12:** [resultats](RO-012-IMPLEMENTACIO.md). Mateixa geometria/colors, taula/llum, restauració de vista i render a demanda. Navegador local: entrada/sortida, òrbita, edificis incrementals i llegenda correctes; exportacions STL i 3MF Bambu idèntiques amb el mode activat/desactivat. Validació d’usuari, lector de pantalla i mesures instrumentals de rendiment pendents.

**Antecedent:** [proposta d’escena de presentació](RO-012-PROPOSTA.md), revisada per reutilitzar malles, gestionar canvis i restaurar càmera/recursos. L’estat actual és el de l’informe d’implementació enllaçat a dalt.

**Proposta:** escena sobre una taula d’escola, amb perspectiva, llum, ombres i colors que ajudin a imaginar la peça impresa.

**Ajornament:** després de resoldre fiabilitat de geometria/exportació (RO-001/RO-002/RO-003). Estudiar renderitzat local amb la malla real abans de triar tècnica o recursos gràfics.

**Per validar:** la representació usa la geometria, escala i colors seleccionats; es diferencia una escena il·lustrativa d’un resultat físic garantit. El model i la descàrrega continuen operatius si es desactiva aquesta vista.

### RO-014 — Marc imprimible independent

**v0.13 implementada, pendent de validar:** selector, configuració, previsualització i descàrrega reunits. La vista reutilitza les mateixes mides, tolerància, color i geometria de l’exportació; canviar el marc no crida Restablir ni modifica la càmera.

**Observació de l’usuari conservada:** Validat però modifica el zoom del model, quan en realitat el preview del marc hauria de ser un afegit exterior al model, és a dir, no hauria de fer zoom in-out al conjunt. Les configuracions del marc no afecten el preview i estan al sidebar en zones diferents: allà on indiquem si volem marc o no hauríem de poder indicar la configuració i veure-la previsualitzada, no imaginar-nos-la i que estiguin en llocs diferents.

**Pendent:** confirmació visual de l’usuari, laminat i ajust físic de toleràncies. [Antecedent i comprovacions](RO-014-IMPLEMENTACIO.md).

### RO-016 — Plaques i etiquetes educatives

**Implementat a v0.11.0:** [resultats](RO-016-IMPLEMENTACIO.md), geometria i exportació independents comprovades localment. Laminador i prova física pendents; la proposta anterior queda com a antecedent.

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

**Recerca actualitzada:** [dades reals de cobertes](RO-032-DADES-COBERTES.md), MDTe territorial/litoral com a superfície d’altituds; no conté plans semàntics. Cal endpoint COG/CORS/rangs i ajustos de qualitat per petjada abans d’automatitzar; no s’inventen cobertes. Recerca revisada, 139 proves/build correctes; funcionalitat de cobertes de Tamariu pendent.

**Actualització de l’usuari:** L’usuari valida els volums cadastrals de Tamariu, però observa cobertes reals inclinades que continuen planes. Cal obtenir dades de coberta de la mateixa regió; no convertir totes les teulades a inclinades ni inferir-les només de les petjades.

Estudiar roof:shape, roof:height, roof:direction/angle i parts d’OSM original, CityGML/CityJSON o models municipals 3D. Distingir coberta paramètrica d’una malla real (p. ex. Torre Glòries). Respectar els modes limitat/pla; no inventar cobertes per donar aparença de realisme. Pla i casos de control a PAISATGE-3D.md.

**Actualització v0.9.0:** Primer suport de cobertes gabled/skillion amb forma, altura i direcció explícites en dades locals. Respecta el gir, els patis, el retall i el mode limitat pla. Falten fonts automàtiques de cobertes i formes corbes/complexes; Catastre no les aporta.

### RO-033 — Ponts i viaductes

**v0.16.0, implementat i pendent de validar per l’usuari:** flux procedimental integrat de taulers MVT amb perfil lineal entre cotes DEM dels extrems, pilars, enllaços i unions. Avisos i procedència separen estimacions de dades específiques. [Nucli i límits](RO-033-PROCEDURAL-CORE.md). 241 proves, build i 3MF del retall mogut correctes en local. La v0.15.1 es va publicar primer com a punt estable parcial de càrrega geogràfica.

**Decisió de l’usuari després de v0.15.0:** prioritzar construcció procedimental general; evitar acumular fitxers per a desenes de milers de ponts. Conservar Rajadell com a cas especial ja disponible. Altres excepcions, només sota demanda concreta, amb àmbit geogràfic i font explícits. No s’obre ara una tasca de Millau.

**Pendent, P1:** contrastar almenys tres ubicacions reals alienes a Rajadell (recte, corbat i creuament inferior), incloent canvi de font d’edificis i límit del retall. Revisar que els DEM dels extrems i la interpolació no enfonsen els taulers en relleus intermedis. Les proves sintètiques no substitueixen aquesta comprovació. Validar laminat, suports omesos i fragments separats. El camí inferior ha de continuar obert, no només el peu del pilar en queda fora.

**Validació rebuda:** l’usuari aprova l’aspecte visual de la reconstrucció de Rajadell. Continuen pendents la impressió, els fragments petits tallats i la cobertura general; l’evitació es limita als obstacles presents a les dades.

**v0.15.0 implementada:** [pilars, enllaços i comprovacions](RO-033-SUPORTS-I-ENLLACOS.md). Viaducte principal amb onze pilars segons el projecte, dues connexions i un únic component tancat; 40 cm també comprovat. Validació d’usuari i laminat pendents.

**Petició i treball v0.15.0:** l’usuari confirma l’avenç i aporta captures de taulers flotants als estreps. Calen pilars que evitin camins i edificis i prolongacions amb pendent suau fins a la superfície de la carretera. Els laterals IFC `lpn` 64097/64748 descriuen vores. El plànol IDEAM/ACHE, figura 1 pàgina 2, sí que aporta onze estacions de pilars i una secció nominal; s’han incorporat amb alineació aproximada a l’eix i comprovació d’obstacles. Es preparen suports i connexions identificats com a adaptacions estimades d’impressió; perfils reals de pilars per a més endavant.

**v0.14.0, parcial implementat:** [taulers reals ICGC, proves i límits](RO-033-IMPLEMENTACIO.md). Quatre superfícies XYZ al catàleg de Manresa, amb gruix imprimible simplificat, aire a sota i exportació. Sense pilars mesurats ni càrrega 3D automàtica fora de la mostra. Falta contrast de datum/estreps, laterals `lpn`, laminat i validació d’usuari.

**Actualització de l’usuari:** Incloure taulers viaris i ferroviaris, connexions i cota pròpia. No confondre brunnel/layer amb altitud; dependència de RO-024.

Separar ponts dels camins adherits al terreny; cercar cota del tauler, connexions i suports. brunnel/layer només indiquen tipus/ordre, no metres. Estudiar un viaducte cartografiat amb dades suficients i un cas sense cota. Pla a PAISATGE-3D.md.

### RO-034 — Túnels imprimibles

**2026-11-02:** [comprovació de dades del full de Manresa](RO-034-DADES-IFC.md). Fonts examinades insuficients: traçat MVT 2D, sense eix XYZ ni secció acreditats. Escombrat numèric amb perfil propi provat, encara sense perforació automàtica d’aquest túnel. Cal localitzar dades constructives o acordar una aproximació explícita abans de modelar-lo com a real.

Escombrar una secció sobre un eix 3D i restar-la dels volums de terreny i capes que travessi. Fan falta portals, traçat, cota, secció i política d’escala. Conservar mar/base, continuïtat entre peces i geometria tancada. No prometre un túnel real a partir d’una línia 2D. Pla a PAISATGE-3D.md; depèn de RO-024.

### RO-035 — Cavitats i relleus amb voladissos

Un MDT d’una altura per XY no descriu cavitats ni voladissos. Investigar núvols de punts o malles d’aixecaments amb cobertura de la cavitat; LiDAR aeri no garanteix veure’n l’interior. Començar per un arc petit amb malla oberta i llicència comprovada. Pla a PAISATGE-3D.md.

### RO-040 — Catastre sense edificis no ha de bloquejar el model

**Implementat i revisat:** [diagnòstic i proves](RO-040-CATASTRE-BUIT.md). Col·leccions buides vàlides, capes mixtes i zero parts sobre rasant acceptades; paginació/recomptes incoherents continuen sent errors. 117 proves de suite i build correctes; AOI real buida/mixta pendent de validar.

**Petició de l’usuari:** Acceptar respostes vàlides buides; distingir-les d’errors de servei.

**Seguiment:** Implementat, pendent de validar. Encàrrecs seqüencials a Kimi i revisió abans de continuar. Proves locals obligatòries; validació d’usuari diferenciada.


### RO-044 — Catastre per seccions i recuperació de configuracions

[Diagnòstic i comprovacions](RO-044-CATASTRE-RECUPERACIO.md). Reproduït a Tamariu: el servidor rebutja l’àrea inicial (3,18 km²) amb «Area of extension out of limits». Ara es subdivideix només davant límits reconeguts, fins a dos nivells 2×2, 42 consultes lògiques i dues connexions simultànies, amb pressupost total de tres minuts. Duplicats coherents eliminats; cap resultat parcial acceptat.

Comprovació real: 10 consultes, 624 edificis, 2.613 parts, 301 duplicats i 2.447 volums sobre rasant. Navegador local: error incremental conserva model, restaura font/mode/altura i habilita exportació; regió nova usa ICGC amb avís explícit. Model nou confirmat després del Worker. Validació de l’usuari pendent.

### RO-045 — Coherència visual dels sidebars

**v0.14.0:** [llibre d’estil](../DESIGN.md) obligatori també per a Kimi, referenciat a AGENTS.md; tokens de tipografia i controls compartits, sense canviar valors visuals. Criteris d’acceptació inclouen navegador i captures; tests/build no substitueixen revisió visual.

Homogeneïtzats resums, camps, desplegables i sortides de text amb l’estètica existent. Resum de fonts sense caixa fosca ni mida desproporcionada; controls del marc reunits i fletxa del nord retirada. Comprovació visual local completada; validació de l’usuari pendent.

### RO-046 — Catàleg de llocs recomanats

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

### RO-048 — Base relativa a la cota mínima del retall

Petició expressa: corregir i publicar com a v0.13.1 abans de continuar RO-033/034, sense esperar validació. Ara es resta la cota mínima de la mateixa graella que genera el relleu i s’hi afegeixen 5 mm; a la costa es manté nivell marí zero com a origen i superfície a 5 mm. Les altituds d’origen es conserven a les metadades; no és una conversió de datum. Edificis, arbres, camins i aigües interiors comparteixen la transformació.

Mostra real de Manresa: origen 227,2727 m, relleu generat entre 5 i 24,7599 mm amb exageració ×1,5 i escala 1:10.000. Tamariu conserva mar a 5 mm. Regressions de cota absoluta/negativa, desnivell, exageració, escala i aigües interiors; validació de l’usuari pendent.

### RO-049 — Camins realçats

Implementat v0.15.0, pendent de validar: [comprovacions](RO-033-SUPORTS-I-ENLLACOS.md#ro-049--realç-opcional-dels-camins). Petició de l’usuari per ressaltar carreteres a 0,5 o 1 mm sobre el terreny. Opció desactivada per defecte, en mil·límetres de maqueta; afecta també el paviment dels taulers i els enllaços, sense presentar-ho com una cota mesurada. Unions, exportació i càmera comprovades localment; validació d’usuari i laminat pendents.
