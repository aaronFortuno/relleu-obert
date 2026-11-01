# Backlog actiu de Relleu Obert

Actualitzat: **2026-11-01**. Iteració **v0.7.0**: implementació i proves locals acabades; pendent de validació d’usuari.

Només conté feina pendent, pendent de validar o ajornada. Les entrades completament validades i les anotacions originals de l’usuari són a [HISTORIAL.md](HISTORIAL.md). Les observacions inicials es conserven a [MILLORES-BUGS.md](MILLORES-BUGS.md). Els identificadors són estables i no es reutilitzen.

## Prioritats immediates

1. Revisió dels sidebars i dels controls d’escala/orientació (RO-004, RO-006, RO-018, RO-027).
2. Vegetació a escala i avís coherent abans de carregar àrees massa grans (RO-028, RO-029).
3. Ajustos de footer, V4V i favicon (RO-008, RO-009).
4. Fidelitat d’edificis i fonts obertes (RO-002, RO-026); validacions de dades i d’impressió (RO-015, RO-023, RO-024).

## Feina pendent

| ID | Prioritat | Estat | Feina |
| --- | --- | --- | --- |
| [RO-002](#ro-002--edificis-contigus-representats-com-a-megablocs) | P1 | Per estudiar | Edificis contigus representats com a megablocs |
| [RO-004](#ro-004--apartats-collapsables-dels-sidebars) | P1 | Pendent de validar | Reorganitzar els quatre menús; traslladar materials a la dreta |
| [RO-006](#ro-006--selecció-duna-escala-destí) | P1 | Pendent de validar | Unificar el control d’escala i explicar-ne el resultat |
| [RO-008](#ro-008--footer-i-quadre-v4v) | P2 | Pendent de validar | Versió al footer, icona del repo i V4V a dues columnes |
| [RO-009](#ro-009--favicon) | P2 | Pendent de validar | Favicon quadrat |
| [RO-011](#ro-011--comptador-dexportacions-i-umami) | P3 | Per estudiar | Comptador públic i futura integració Umami |
| [RO-015](#ro-015--opcions-de-broquet-i-filament) | P2 | Pendent de validar | Exportació amb broquet/material seleccionables |
| [RO-018](#ro-018--rotació-de-la-regió-seleccionada) | P2 | Pendent de validar | Orientació al costat del mapa, amb gir senzill i retorn al nord |
| [RO-023](#ro-023--relleu-local-i-fonts-vectorials-de-més-precisió) | P2 | Pendent de validar | MDT local i cartografia de més precisió |
| [RO-024](#ro-024--unió-de-volums-i-validació-dimpressió) | P1 | Per estudiar | Unió general de volums i impressió física |
| [RO-026](#ro-026--fidelitat-dels-edificis-i-selecció-de-fonts) | P1 | Per estudiar | Petjades, parts, altures i priorització de fonts d’edificis |
| [RO-027](#ro-027--auditoria-dusabilitat-dels-sidebars) | P1 | Pendent de validar | Auditoria d’usabilitat i distribució de controls |
| [RO-028](#ro-028--vegetació-proporcionada-a-lescala) | P1 | Pendent de validar | Mida de la vegetació coherent amb l’escala |
| [RO-029](#ro-029--escala-i-límit-real-de-càrrega) | P1 | Pendent de validar | Coherència entre escala sol·licitada i àrea carregable |

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

- P1: fidelitat, fiabilitat o flux principal. P2: millora funcional o d’interfície. P3: exploració o acabat.
- Estat breu a les taules; observacions, decisions i validacions al detall.
- Proves locals, revisió d’usuari, laminador i impressió es distingeixen. Una compilació correcta no tanca una incidència d’ús.
- Només s’arxiven les entrades completament validades. Els punts validats parcialment conserven l’abast pendent.
- Els ajornaments indiquen una condició per reprendre’ls; no són descarts.
- Versions 0.x fins que l’usuari declari estabilitat. Pages i CI remots els comprova l’usuari.

## Detall

### RO-002 — Edificis contigus representats com a megablocs

**Diagnòstic completat a v0.5.0; millora pendent (2026-11-01):** el bloc de la captura és `icgc-1074761`, una sola petjada original d’uns 1.723 m² amb 29 coordenades i cap divisió interior. No hi ha petjades OSM intersectants a les tessel·les de la mostra. La combinació conserva la geometria exacta. [Informe reproduïble](RO-002-DIAGNOSTIC.md).

**Decisió:** no inventar divisions. Advertiment de petjades agrupades incorporat a les limitacions i exportacions; regressió de conservació de totes les petjades oficials, adjacències i patis. Torna a `Per estudiar` per buscar una font oberta amb parts d’edificis (RO-023). No es dona el problema visual per corregit.

**Continuació:** la investigació i priorització de fonts s’organitza a RO-026. Aquesta incidència manté l’evidència del megabloc i es validarà quan hi hagi una millora real sobre el mateix cas.

**Evidència:** [Google Maps](google-maps.png), [OpenStreetMap](openstreetmap.png) i [Relleu Obert](relleu-obert.png), a la corba del carrer de la Perica / GIV-6542 de Tamariu. La captura OSM mostra absència de diverses petjades; la de Relleu Obert mostra blocs grans. Les imatges no identifiquen per si soles quina operació els ha produït.

**Proper pas:** identificar les geometries d’aquesta ubicació a ICGC i OSM/OpenFreeMap, els seus identificadors, alçàries i fragments després de combinar/retallar. Distingir un polígon de font que ja agrupa edificis, una unió nostra i edificis separats que visualment semblen units perquè comparteixen cota/color. Revisar també polígons amb parts o patis.

**Per validar:** comparació de petjades d’entrada/sortida amb casos de cases contigües sobre pendent, conservant les separacions presents a les dades i una cota de coberta per edifici identificable. No donar per real una divisió inventada només per corregir l’aspecte. Si falten dades de separació, documentar el límit o buscar una font oberta millor. Validació d’alçàries condicionada a RO-001; relacionada amb RO-022 i RO-023.


### RO-003 — Configuració inesperada en importar a Bambu

**Ajornat (2026-11-01):** petició expressa de l’usuari, prioritat P2. Reconsiderar després de RO-002, RO-004, RO-005 i RO-006. No es modifiquen perfils d’impressora en aquesta iteració.

**Observació:** l’usuari veu una impressora/configuració estranya, broquet de 0,2 mm i un filament que ha de canviar manualment. Cal registrar versió de Bambu, fitxer concret i passos d’importació.

**Evidència del codi, no diagnòstic final:** l’exportador actual escriu colors i `filament_type: PLA`, però no un perfil d’impressora ni un diàmetre de broquet. Cal determinar què interpreta o completa el laminador, en lloc d’atribuir tots els valors al nostre fitxer.

**Per validar:** comparar 3MF compatible i estàndard amb una configuració d’importació coneguda; entendre d’on surten els valors i corregir/documentar el comportament. Conservar l’assignació correcta dels quatre colors (RO-021), les mides i els materials. No confondre diàmetre del broquet, altura de capa i detall de la malla. Aquesta investigació precedeix RO-015; la comprovació al Bambu de l’usuari continua sent explícita.


### RO-004 — Apartats col·lapsables dels sidebars

**Actualització v0.6.0 (2026-11-01):** reobert per avís de l’usuari: el contingut llarg del bloc 2 empenyia els altres menús. Ara els quatre títols i el botó Generar queden fora del scroll; només es desplaça el contingut de l’apartat obert. Comprovat a 1280 × 720: sidebar 630 px de contingut/630 px de viewport, bloc 2 amb scroll intern i tots els títols visibles. Reobrir el mapa conserva la selecció i el model continua exportable. Pendent de validar per l’usuari.

**Implementat a v0.5.0, pendent de validar (2026-11-01):** acordió exclusiu al sidebar esquerre, primera secció oberta i generació fora dels apartats. Retirada la introducció visible per donar lloc als quatre apartats. Comprovat localment amb clic i teclat, conservant valors i sense reiniciar el model; header/footer visibles a 1280 × 720. Falta la valoració d’ús de l’usuari.

**Abast:** començar amb «Tria el lloc» obert i els apartats següents replegats; comportament exclusiu amb un apartat desplegat cada vegada, seguint la referència de Pentagrama. Revisar sobretot el sidebar esquerre.

**Per validar:** menys scroll sense perdre valors ni accés a generar/exportar, ús amb teclat, estat desplegat accessible i header/footer estables. Canviar d’apartat no ha de provocar càlculs innecessaris ni interrompre una operació activa.

**Revisió v0.7.0 · Pendent de validar:** Quatre blocs: lloc/orientació, mida/escala, relleu/edificis i vegetació. Materials reunits al sidebar dret. Títols i Generar fora del scroll intern.

**Anotació original de l’usuari sobre v0.6.0:** Validat però millorar. Controls d'escala moguts a un apartat propi, controls de "Colors i materials" els passen completament al sidebar dret, perquè aquí només hi tenim l'opció per triar quants materials i res més.


### RO-006 — Selecció d’una escala destí

**Implementat a v0.5.0, pendent de validar (2026-11-01):** mode lliure i escala fixada (presets i personalitzada, 100–100.000). En mode fix, mida i escala determinen l’extensió; moure el mapa canvia el centre, i el zoom només la vista del mapa. La mostra de Tamariu restaura el mode lliure i el retall de mostra.

**Comprovacions locals:** 48 proves superades, amb latituds 0°, 41,918° i 65°, peces quadrades/rectangulars/40 cm, partició, escala personalitzada decimal, exageracions ×1/×3, coherència del motor, dimensions i unitats 3MF. Al navegador local: generació de 150 × 200 mm a 1:1.000, selecció de 150 × 200 m, canvi d’escala amb mapa ocult, zoom i reobertura del mapa, escala personalitzada i quatre peces de 200 mm, i bloqueig per escala invàlida. Tolerància numèrica i aproximació mètrica documentades a ARCHITECTURE.md. Falta la validació de l’usuari/laminador; no s’ha comprovat Pages ni CI remots.

**Abast:** poder demanar 1:1000, 1:1500, 1:2000 o una escala personalitzada, i adaptar l’extensió del retall del mapa a la mida física escollida. L’escala és horitzontal; l’exageració vertical es manté independent.

**Proper pas:** fixar quina variable s’ajusta quan es canvia mida/escala i com es mostra un retall pendent. Com a cas de control, una peça de 150 × 200 mm a 1:1000 representa 150 × 200 m. La disponibilitat/resolució de les tessel·les limita el detall, però no ha de definir arbitràriament l’escala sol·licitada.

**Per validar:** retall, preview, dimensions exportades i metadades concorden dins d’una tolerància documentada, amb peces quadrades/rectangulars, diverses latituds i partició en peces. Coordinar amb RO-018.

**Revisió v0.7.0 · Pendent de validar:** Un camp editable amb suggeriments, lectura 1:1000 o 1000, i equivalència entre centímetres del model i metres reals. Buit segueix el mapa.

**Anotació original de l’usuari sobre v0.6.0:** Validat però millorar fluxe.


### RO-008 — Footer i quadre V4V

**Implementat a v0.6.0:** fonts i projectes oberts integrats en un desplegable del V4V; footer amb enllaços separats al repositori i MIT, sense duplicació dins del modal. Conservats autor, foto, Lightning i atribució del mapa. Comprovats rutes al DOM local, obertura, tancament amb Escape i retorn del focus. No s’han visitat els enllaços remots. Pendent de validar.

**Abast:** integrar «Fonts cartogràfiques» dins de «Sobre el projecte · V4V», amb espai per a fonts obertes i projectes utilitzats. Al footer, «Codi obert» enllaça al repositori i «MIT» a la llicència; retirar la duplicació d’aquests enllaços dins del quadre.

**Per validar:** tots els enllaços funcionen en local, fonts i atribucions continuen accessibles i el peu manté poca alçada. No es retira l’atribució pròpia del mapa. Mantenir el contingut de l’autor i les referències de Pentagrama/Plec.

**Revisió v0.7.0 · Pendent de validar:** Versió al footer, icona de commit al repositori i V4V amb autor/fonts visibles a dues columnes.

**Anotació original de l’usuari sobre v0.6.0:** Millorar layout del popup per encabir-ho sense haver de desplegar "Fonts cartogràfiques i projectes oberts". Podem utilitzar layout a doble columna a la part inferior (sobre l'autor - fonts i projectes oberts).


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

**Primera implementació v0.6.0:** PLA/PETG i broquet opcional de 0,2/0,4/0,6 mm; per defecte no s’escriu diàmetre i es conserva el del laminador. Valors explícits al dialecte Bambu i procedència en 3MF/STL, sense perfils de màquina, temperatures ni G-code. Proves de metadades i preservació de geometria. Abast acotat mentre RO-003 continua ajornat: no es dona per resolta la configuració inesperada de Bambu. Pendent de validar el reconeixement amb el laminador de l’usuari.

**Proposta:** poder seleccionar broquet de 0,2 / 0,4 / 0,6 mm i material, per exemple PLA o PETG, quan l’exportació i el laminador ho puguin interpretar correctament.

**Dependència acotada:** RO-003 continua ajornat. Aquesta primera iteració només incorpora els valors de consumibles escollits explícitament, sense generar perfils de màquina ni investigar els valors inesperats d’importació. La validació al laminador segueix pendent.

**Per validar:** opcions reconegudes amb la impressora/perfil seleccionats, valors modificables per l’usuari i regressió de quatre colors. No prometre un perfil complet ni temperatures adequades només a partir de «PLA» o del diàmetre del broquet.


### RO-016 — Plaques i etiquetes educatives

**Proposta:** nom del lloc, coordenades o text lliure («Serralada», «Estret», «Badia»...), en placa separada o integrada al model/marc, també llegible des del lateral en una prestatgeria.

**Ajornament:** després del flux principal i de definir les superfícies d’ubicació; coordinació amb RO-013/RO-014.

**Per validar:** text personalitzat amb accents, dimensions i llegibilitat a l’escala d’impressió, ubicació que no tapi geometria important i exportació separada/integrada segons l’opció. L’etiqueta no modifica les coordenades geogràfiques del model.


### RO-017 — Rosa dels vents i altres complements

**Proposta:** accessoris sobre el model o en arxiu independent per afegir-los després d’imprimir.

**Ajornament:** després del flux d’etiquetes i de definir l’orientació geogràfica de RO-018.

**Per validar:** nord real coherent amb l’angle del retall, dimensions imprimibles i peça separada quan es demani. Girar la càmera no ha de modificar la direcció geogràfica indicada.


### RO-018 — Rotació de la regió seleccionada

**Implementat a v0.6.0:** gir horari −180° a 180°, amb centre, dimensions reals i cantonades compartides entre mapa, càrrega, projecció i exportació. L’envolupant inclou totes les cantonades. La numeració de peces es refereix a dalt/esquerra del model; el nord s’obté del gir registrat. Proves amb rectangles, escala fixa, latituds 0°/41,918°/65° i angles diversos. Model generat al navegador a 35°, 150 × 200 mm i 1:1.000. La mostra de Tamariu recupera gir zero. Pendent de validar per l’usuari.

**Proposta:** orientar el retall amb un angle lliure; decidir si resulta més intuïtiu girar el mapa o el requadre.

**Proper pas:** definir la transformació comuna de selecció, projecció, dades, preview, exportació i peces. Girar només la càmera no compleix aquesta petició. Cal carregar la cobertura de dades de totes les cantonades del retall girat.

**Per validar:** un retall rectangular girat coincideix entre mapa i exportació, conserva mida/escala i exageració, costa i capes es retallen bé, i l’angle/nord queden a les metadades. Dependències de disseny: RO-006; afecta RO-014 i RO-017.

**Revisió v0.7.0 · Pendent de validar:** Gir al costat del mapa amb passos de 15°, rang d’interacció −90°…90° i botó Nord. Manipulació directa del retall pendent d’una futura iteració.

**Anotació original de l’usuari sobre v0.6.0:** Validat però sistema de rotació molt poc intuïtiu. Millor passar-ho d'alguna forma al mapa o inventar-se alguna altra forma. La rotació màxim entre -90º i 90º, no cal més (de fet, només amb 0-90º és suficient).


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

**Seguiment:** documentació inicial consultada; mostres comparatives, decisió de fonts, prototip, validació i integració pendents. RO-002 continua obert; RO-023 coordina projeccions/cartografia/relleu; RO-022 conserva el comportament de les cobertes ja validat.

### RO-027 — Auditoria d’usabilitat dels sidebars

**v0.7.0 · Pendent de validar:** inventari, agrupació de controls, noms, descobribilitat, accessibilitat i reducció de textos redundants. Aplicar una distribució coherent amb lloc/orientació, mida/escala, relleu/edificis i vegetació, i reunir colors/materials a la dreta. Informe i criteris a [AUDITORIA-USABILITAT.md](AUDITORIA-USABILITAT.md); revisió d’usuari pendent.

### RO-028 — Vegetació proporcionada a l’escala

**Observació:** les capçades tenen radi en mil·límetres constants i poden semblar arbres gegants en maquetes de territoris amplis.

**v0.7.0 · Pendent de validar:** capçada orientativa de 12 m convertida a l’escala horitzontal, sense exageració vertical. Variació i incrustació conservades. Per sota de 0,25 mm de diàmetre s’ometen els arbres i es conserva la superfície del bosc; avís explícit, sense engrandir-los artificialment. El llindar és una política de representació, no una garantia universal d’impressió. La vegetació no acredita arbres individuals mesurats.

### RO-029 — Escala i límit real de càrrega

**Observació:** el rang numèric arriba a 1:100.000 però 1:50.000 o 1:100.000 poden superar el límit de 16 tessel·les de la cartografia actual.

**v0.7.0 · Pendent de validar:** validació contextual abans de generar, mateixa lògica de capacitat a la càrrega i missatge amb escala màxima aproximada segons centre, mida i orientació. No confondre rang numèric amb cobertura admissible. Ampliar territori o reduir el detall automàticament requereix un estudi posterior; no s’ha d’amagar la desaparició de capes en canviar de zoom de dades.

## Historial d’aquesta iteració

| Data | Entrada | Moviment |
| --- | --- | --- |
| 2026-11-01 | RO-001, RO-005, RO-007, RO-010, RO-013, RO-020–RO-022 | Validades → arxivades a HISTORIAL.md per petició de l’usuari. |
| 2026-11-01 | RO-004, RO-006, RO-008, RO-009, RO-018 | Anotacions de validació parcial → En curs amb millores concretes. Notes originals preservades a l’historial. |
| 2026-11-01 | RO-027–RO-029 | Noves línies → En curs: auditoria, vegetació a escala i límit coherent de càrrega. |

**Tancament local v0.7.0:** RO-004, RO-006, RO-008, RO-009, RO-018 i RO-027–RO-029 passen a pendent de validar. No s’amplia la capacitat de càrrega ni es dona per validada la usabilitat només amb proves locals. RO-023 manté la confirmació aparent de l’usuari i els límits d’abast previs.
