# Backlog de Relleu Obert

Actualitzat: **2026-11-01**. Referència del codi: **v0.5.0**.

Aquest és el registre de prioritats, decisions i comprovacions del projecte. El document [MILLORES-BUGS.md](MILLORES-BUGS.md) conserva les observacions originals de l’usuari, datades l’1 de novembre a les 12:30. La versió exacta del navegador amb què es van recollir aquestes observacions encara no consta: no es pressuposa que siguin totes de la v0.4.1.

**RO-001 tancat amb la confirmació de l’usuari de v0.4.2.** RO-004, RO-005 i RO-006 implementats a v0.5.0, pendents de validar per l’usuari. RO-002 diagnosticat: cal una font amb divisions d’edificis. RO-003 ajornat expressament.

## Com es manté

- Cada línia té un identificador estable `RO-NNN`. No es renumera ni s’esborra quan es tanca.
- En començar una tasca, s’anota `En curs`, l’abast concret i la data. En acabar, s’anoten el commit/versió, què s’ha comprovat i què falta.
- Un canvi de codi amb proves locals passa a `Pendent de validar` quan encara cal la comprovació d’usuari, de laminador o d’impressió corresponent. Compilar no resol per si sol una incidència observada al navegador.
- Les comprovacions locals, les de l’usuari a la web desplegada, les del laminador i les d’impressió física s’anoten separadament. Després de validar localment, la comprovació remota la fa l’usuari.
- Si reapareix un problema, es reobre la línia amb la nova evidència i es conserva l’historial. Un símptoma semblant no demostra que la causa sigui la mateixa.
- Ajornar requereix indicar quan es reconsiderarà. Descartar requereix data, motiu i alternativa, si n’hi ha. No es presenta una idea ajornada com a descartada.
- Les captures són evidència de comparació visual, no dades per generar geometries. Les hipòtesis es distingeixen dels resultats reproduïts.
- Es manté la numeració `0.x` / `0.x.x` fins que l’usuari declari explícitament una versió estable. Una entrada al backlog no implica passar a `1.0` ni prometre una data.

### Prioritats

| Prioritat | Criteri |
| --- | --- |
| P0 | Fiabilitat del model: pot deformar el relleu i contaminar altres geometries. Primer diagnòstic abans d’ampliar funcionalitats. |
| P1 | Fidelitat, exportació o ús principal d’escriptori. Següent grup de treball. |
| P2 | Millora funcional o d’interfície amb un benefici clar, després de les incidències principals. |
| P3 | Exploració o acabat; es reconsidera quan el nucli sigui fiable. |

### Estats

| Estat | Significat |
| --- | --- |
| Per reproduir | Observació registrada; falta un cas controlat amb versió, dades i ajustos. |
| Per estudiar | Falta determinar la causa, viabilitat o disseny. |
| Preparat | Abast i comprovacions definits; encara no començat. |
| En curs | S’hi està treballant; cal deixar-ne l’abast i el següent pas. |
| Pendent de validar | Implementat o corregit, però falta una comprovació explícita. |
| Validat | Comprovació satisfactòria registrada, dins de l’abast indicat. |
| Ajornat | Es conserva la proposta i la condició per reprendre-la. |
| Descartat | Decisió de no continuar amb motiu registrat. |
| Bloquejat | No pot avançar per una dependència concreta, que s’ha d’identificar. |

## Vista de conjunt

| ID | Prioritat | Estat | Línia |
| --- | --- | --- | --- |
| [RO-001](#ro-001--pics-de-relleu-i-efectes-sobre-edificis) | P0 | Validat | Pics de relleu i efectes sobre edificis |
| [RO-002](#ro-002--edificis-contigus-representats-com-a-megablocs) | P1 | Per estudiar | Edificis contigus representats com a megablocs |
| [RO-003](#ro-003--configuració-inesperada-en-importar-a-bambu) | P2 | Ajornat | Impressora, broquet i filament inesperats a Bambu |
| [RO-004](#ro-004--apartats-collapsables-dels-sidebars) | P1 | Pendent de validar | Apartats col·lapsables i menys scroll |
| [RO-005](#ro-005--més-espai-útil-al-preview) | P1 | Pendent de validar | Controls i missatges dins del preview |
| [RO-006](#ro-006--selecció-duna-escala-destí) | P1 | Pendent de validar | Selecció d’una escala destí |
| [RO-007](#ro-007--escala-i-triangles-al-sidebar) | P2 | Preparat | Treure redundàncies estadístiques del header |
| [RO-008](#ro-008--footer-i-quadre-v4v) | P2 | Preparat | Fonts dins de V4V i enllaços repo/llicència |
| [RO-009](#ro-009--favicon) | P2 | Preparat | Favicon amb el logotip actual |
| [RO-010](#ro-010--transicions-homogènies) | P3 | Preparat | Transicions de 220 ms |
| [RO-011](#ro-011--comptador-dexportacions-i-umami) | P3 | Per estudiar | Comptador públic i futura integració Umami |
| [RO-012](#ro-012--presentació-realista-del-model-imprès) | P3 | Ajornat | Escena de presentació sobre una taula |
| [RO-013](#ro-013--marc-a-la-previsualització) | P2 | Per estudiar | Marc opcional a la previsualització |
| [RO-014](#ro-014--marc-imprimible-independent) | P2 | Ajornat | Marc imprimible amb marge configurable |
| [RO-015](#ro-015--opcions-de-broquet-i-filament) | P2 | Per estudiar | Exportació amb broquet/material seleccionables |
| [RO-016](#ro-016--plaques-i-etiquetes-educatives) | P2 | Ajornat | Nom, coordenades i textos educatius imprimibles |
| [RO-017](#ro-017--rosa-dels-vents-i-altres-complements) | P3 | Ajornat | Rosa dels vents i altres accessoris |
| [RO-018](#ro-018--rotació-de-la-regió-seleccionada) | P2 | Per estudiar | Rotació del retall geogràfic |
| [RO-019](#ro-019--internacionalització) | P3 | Ajornat | Català, castellà, gallec, euskera i anglès |
| [RO-020](#ro-020--unions-arrodonides-dels-camins) | P1 | Validat | Unions arrodonides dels camins |
| [RO-021](#ro-021--quatre-materials-i-colors-a-bambu) | P1 | Validat | Quatre materials i colors a Bambu |
| [RO-022](#ro-022--cobertes-horitzontals-dels-edificis) | P1 | Validat | Cobertes horitzontals de la v0.4.1 |
| [RO-023](#ro-023--relleu-local-i-fonts-vectorials-de-més-precisió) | P2 | Per estudiar | MDT local i cartografia de més precisió |
| [RO-024](#ro-024--unió-de-volums-i-validació-dimpressió) | P1 | Per estudiar | Unió general de volums i impressió física |
| [RO-025](#ro-025--vegetació-mesurada-i-paisatges-històrics) | P3 | Ajornat | Vegetació mesurada i paisatges històrics |

## Ordre de treball proposat

1. **RO-001 validat:** reobrir només si reapareix amb nova evidència.
2. **RO-004, RO-005 i RO-006:** validar l’ús de v0.5.0. La comprovació remota la fa l’usuari.
3. **RO-002 amb RO-023:** estudiar dades obertes que divideixin el polígon ICGC 1074761 en cases o parts reals. El diagnòstic de procedència ja està fet; les divisions no existeixen a la mostra actual.
4. **RO-024:** concretar una prova de laminat/impressió, conservant camins, cobertes i quatre materials ja validats.
5. **RO-003:** reconsiderar després d’aquest grup, segons la prioritat expressa de l’usuari. No s’han canviat perfils de Bambu.
6. Reavaluar P2/P3 amb els resultats anteriors, inclosos RO-007–RO-009. No s’activa analítica ni es construeixen complements en aquesta iteració.

## Detall de les línies

### RO-001 — Pics de relleu i efectes sobre edificis

**Validat / tancat (2026-11-01):** l’usuari confirma que sembla solucionat i demana tancar RO-001. Es conserva l’informe de proves i la distinció entre el mecanisme simulat i el navegador de l’usuari. Reobrir si reapareix amb dades concretes.

**Correcció candidata (v0.4.2, 2026-11-01):** lectura binària WebP/PNG sense canvas, amb hashes i diagnòstics de tessel·les a la procedència. [Informe i comprovacions pendents](RO-001-DIAGNOSTIC.md).

**Resultats locals:** quatre tessel·les de Tamariu comparades byte a byte amb libvips/sharp; prova de soroll simulat que crea un pic de 256 m i eleva l’edifici; sis generacions de geometria amb tres malles idèntiques per entrades idèntiques i terreny conservat en desactivar arbres/edificis. 44 proves i construcció estàtica superades.

**Historial de la validació:** inicialment es va demanar confirmar a Brave si desapareixien els pics intermitents amb v0.4.2. La protecció de lectura de canvas continua sent una hipòtesi sustentada, no una causa demostrada directament al seu navegador. L’usuari va informar de tres simulacions sense deformacions i, posteriorment, ha confirmat que sembla solucionat i ha demanat tancar l’entrada. La comprovació directa del navegador afectat no s’havia completat.

**Observació:** l’usuari veu habitualment un pic i de vegades dos, en posicions aparentment variables; poden elevar també els edificis pròxims. La sospita que siguin un càlcul nostre és una hipòtesi, encara no una causa demostrada. Es reobre la línia de fiabilitat del relleu tractada anteriorment: les reparacions de mostres de la v0.2 no tanquen aquest nou avís.

**Si reapareix:** conservar regió, ajustos, diagnòstics i 3MF afectat per reobrir el cas; comparar dades, malla i preview. No hi ha feina activa sobre RO-001.

**Per validar:** reproducció documentada abans/després, proves de regressió sobre la causa trobada i sèrie d’execucions amb les mateixes entrades sense nous pics. Comprovar també 3MF/STL, edificis propers i una zona amb penya-segats reals, que no s’han d’aplanar. La comprovació local ja existent d’altituds invàlides no és evidència suficient per tancar-lo.

### RO-002 — Edificis contigus representats com a megablocs

**Diagnòstic completat a v0.5.0; millora pendent (2026-11-01):** el bloc de la captura és `icgc-1074761`, una sola petjada original d’uns 1.723 m² amb 29 coordenades i cap divisió interior. No hi ha petjades OSM intersectants a les tessel·les de la mostra. La combinació conserva la geometria exacta. [Informe reproduïble](RO-002-DIAGNOSTIC.md).

**Decisió:** no inventar divisions. Advertiment de petjades agrupades incorporat a les limitacions i exportacions; regressió de conservació de totes les petjades oficials, adjacències i patis. Torna a `Per estudiar` per buscar una font oberta amb parts d’edificis (RO-023). No es dona el problema visual per corregit.

**Evidència:** [Google Maps](google-maps.png), [OpenStreetMap](openstreetmap.png) i [Relleu Obert](relleu-obert.png), a la corba del carrer de la Perica / GIV-6542 de Tamariu. La captura OSM mostra absència de diverses petjades; la de Relleu Obert mostra blocs grans. Les imatges no identifiquen per si soles quina operació els ha produït.

**Proper pas:** identificar les geometries d’aquesta ubicació a ICGC i OSM/OpenFreeMap, els seus identificadors, alçàries i fragments després de combinar/retallar. Distingir un polígon de font que ja agrupa edificis, una unió nostra i edificis separats que visualment semblen units perquè comparteixen cota/color. Revisar també polígons amb parts o patis.

**Per validar:** comparació de petjades d’entrada/sortida amb casos de cases contigües sobre pendent, conservant les separacions presents a les dades i una cota de coberta per edifici identificable. No donar per real una divisió inventada només per corregir l’aspecte. Si falten dades de separació, documentar el límit o buscar una font oberta millor. Validació d’alçàries condicionada a RO-001; relacionada amb RO-022 i RO-023.

### RO-003 — Configuració inesperada en importar a Bambu

**Ajornat (2026-11-01):** petició expressa de l’usuari, prioritat P2. Reconsiderar després de RO-002, RO-004, RO-005 i RO-006. No es modifiquen perfils d’impressora en aquesta iteració.

**Observació:** l’usuari veu una impressora/configuració estranya, broquet de 0,2 mm i un filament que ha de canviar manualment. Cal registrar versió de Bambu, fitxer concret i passos d’importació.

**Evidència del codi, no diagnòstic final:** l’exportador actual escriu colors i `filament_type: PLA`, però no un perfil d’impressora ni un diàmetre de broquet. Cal determinar què interpreta o completa el laminador, en lloc d’atribuir tots els valors al nostre fitxer.

**Per validar:** comparar 3MF compatible i estàndard amb una configuració d’importació coneguda; entendre d’on surten els valors i corregir/documentar el comportament. Conservar l’assignació correcta dels quatre colors (RO-021), les mides i els materials. No confondre diàmetre del broquet, altura de capa i detall de la malla. Aquesta investigació precedeix RO-015; la comprovació al Bambu de l’usuari continua sent explícita.

### RO-004 — Apartats col·lapsables dels sidebars

**Implementat a v0.5.0, pendent de validar (2026-11-01):** acordió exclusiu al sidebar esquerre, primera secció oberta i generació fora dels apartats. Retirada la introducció visible per donar lloc als quatre apartats. Comprovat localment amb clic i teclat, conservant valors i sense reiniciar el model; header/footer visibles a 1280 × 720. Falta la valoració d’ús de l’usuari.

**Abast:** començar amb «Tria el lloc» obert i els apartats següents replegats; comportament exclusiu amb un apartat desplegat cada vegada, seguint la referència de Pentagrama. Revisar sobretot el sidebar esquerre.

**Per validar:** menys scroll sense perdre valors ni accés a generar/exportar, ús amb teclat, estat desplegat accessible i header/footer estables. Canviar d’apartat no ha de provocar càlculs innecessaris ni interrompre una operació activa.

### RO-005 — Més espai útil al preview

**Implementat a v0.5.0, pendent de validar (2026-11-01):** eliminat el subheader; controls, ajuda i estats dins del preview. En la comprovació local a 1280 × 720, la vista ocupa tot l’espai de 630 px entre header i footer. Canvis pendents i errors es mantenen en regions accessibles; exportació bloquejada fins a generar. Detectada i corregida la desaparició visual de la barra sobre el canvas animat, forçant-ne la composició en una capa pròpia. Falta validar-ne comoditat i visibilitat amb l’usuari.

**Abast:** retirar el subheader «Tamariu · Palafrugell» i el text «Càlcul al navegador»; situar Restablir, Vista zenital, ajuda de gestos i missatges d’actualització com a elements flotants dins del preview. Es conserva la identificació de la regió a la selecció i a les metadades.

**Per validar:** augment d’espai de model, controls llegibles sense tapar zones importants i sense interferir amb gir/zoom/pinzell. Els avisos de càlcul, errors i canvis pendents de generar continuen sent inequívocs i accessibles; no es perden en eliminar contenidors actuals. Relació amb RO-004 i RO-007.

### RO-006 — Selecció d’una escala destí

**Implementat a v0.5.0, pendent de validar (2026-11-01):** mode lliure i escala fixada (presets i personalitzada, 100–100.000). En mode fix, mida i escala determinen l’extensió; moure el mapa canvia el centre, i el zoom només la vista del mapa. La mostra de Tamariu restaura el mode lliure i el retall de mostra.

**Comprovacions locals:** 48 proves superades, amb latituds 0°, 41,918° i 65°, peces quadrades/rectangulars/40 cm, partició, escala personalitzada decimal, exageracions ×1/×3, coherència del motor, dimensions i unitats 3MF. Al navegador local: generació de 150 × 200 mm a 1:1.000, selecció de 150 × 200 m, canvi d’escala amb mapa ocult, zoom i reobertura del mapa, escala personalitzada i quatre peces de 200 mm, i bloqueig per escala invàlida. Tolerància numèrica i aproximació mètrica documentades a ARCHITECTURE.md. Falta la validació de l’usuari/laminador; no s’ha comprovat Pages ni CI remots.

**Abast:** poder demanar 1:1000, 1:1500, 1:2000 o una escala personalitzada, i adaptar l’extensió del retall del mapa a la mida física escollida. L’escala és horitzontal; l’exageració vertical es manté independent.

**Proper pas:** fixar quina variable s’ajusta quan es canvia mida/escala i com es mostra un retall pendent. Com a cas de control, una peça de 150 × 200 mm a 1:1000 representa 150 × 200 m. La disponibilitat/resolució de les tessel·les limita el detall, però no ha de definir arbitràriament l’escala sol·licitada.

**Per validar:** retall, preview, dimensions exportades i metadades concorden dins d’una tolerància documentada, amb peces quadrades/rectangulars, diverses latituds i partició en peces. Coordinar amb RO-018.

### RO-007 — Escala i triangles al sidebar

**Abast:** mostrar l’escala només a «La teva maqueta»; traslladar el recompte de triangles a estadístiques del sidebar. Només reconsiderar-ne la presència destacada si té una funció clara per a l’usuari.

**Per validar:** no hi ha duplicació al header i es conserven les dades útils. El nombre de triangles no es presenta com una garantia de precisió cartogràfica. Coordinar amb RO-005.

### RO-008 — Footer i quadre V4V

**Abast:** integrar «Fonts cartogràfiques» dins de «Sobre el projecte · V4V», amb espai per a fonts obertes i projectes utilitzats. Al footer, «Codi obert» enllaça al repositori i «MIT» a la llicència; retirar la duplicació d’aquests enllaços dins del quadre.

**Per validar:** tots els enllaços funcionen en local, fonts i atribucions continuen accessibles i el peu manté poca alçada. No es retira l’atribució pròpia del mapa. Mantenir el contingut de l’autor i les referències de Pentagrama/Plec.

### RO-009 — Favicon

**Abast:** reutilitzar els tres triangles del header com a marca provisional de la pestanya.

**Per validar:** es veu en navegador clar/fosc, no hi ha peticions de favicon inexistents i les rutes funcionen sota el subdirectori de GitHub Pages.

### RO-010 — Transicions homogènies

**Abast:** transicions coherents d’aproximadament 220 ms en modals, popups i controls adequats. No imposar una animació a controls nadius que no la permetin bé.

**Per validar:** obertura/tancament i focus correctes, respecte per la preferència de moviment reduït i cap retard afegit als avisos de treball o als errors. Aplicar després d’estabilitzar els components de RO-004/RO-005/RO-008.

### RO-011 — Comptador d’exportacions i Umami

**Proposta, encara no aprovada ni operativa:** una estadística real al footer pot mostrar ús de l’eina. El nombre «4 923» de les notes és un exemple, no una dada del projecte.

**Proper pas:** definir què es compta (clics, fitxers generats correctament, reintents, formats, ZIP de diverses peces) i què es pot afirmar honestament. Investigar l’API i els esdeveniments d’Umami quan hi hagi instància/configuració; no assumir-ne ara les capacitats. El navegador no acredita per si sol una impressió ni que un fitxer s’hagi desat a disc.

**Opció a estudiar:** publicar periòdicament una xifra agregada com a fitxer estàtic, si una automatització pot obtenir-la. No incloure credencials privades al client ni convertir el comptador en una dependència per generar models.

**Per validar:** recompte amb definició, font i data d’actualització; errors d’analítica no trenquen l’eina i no es mostren nombres inventats. Reconsiderar quan hi hagi desplegament estable i s’acordin els esdeveniments a mesurar.

### RO-012 — Presentació realista del model imprès

**Proposta:** escena sobre una taula d’escola, amb perspectiva, llum, ombres i colors que ajudin a imaginar la peça impresa.

**Ajornament:** després de resoldre fiabilitat de geometria/exportació (RO-001/RO-002/RO-003). Estudiar renderitzat local amb la malla real abans de triar tècnica o recursos gràfics.

**Per validar:** la representació usa la geometria, escala i colors seleccionats; es diferencia una escena il·lustrativa d’un resultat físic garantit. El model i la descàrrega continuen operatius si es desactiva aquesta vista.

### RO-013 — Marc a la previsualització

**Proposta:** marc opcional al voltant de la maqueta, amb acabat blanc/negre o fusta segons el disseny que s’acordi.

**Proper pas:** definir secció, gruix, color, marge interior i relació amb la base. El marc de visualització ha de quedar distingit del model exportat i d’un futur marc imprimible.

**Per validar:** concordança amb mides rectangulars/quadrades i peces grans, sense alterar l’escala del terreny ni afegir el marc a l’exportació sense selecció explícita. Precedeix RO-014; pot existir sense RO-012.

### RO-014 — Marc imprimible independent

**Proposta:** exportar el marc en un altre fitxer, amb buit interior calculat des de la maqueta i un marge configurable per encabir-la.

**Ajornament:** fins a definir RO-013 i una prova d’ajust físic (RO-024).

**Per validar:** dimensions, tolerància i gruixos explícits; arxiu independent, ajust físic comprovat i estratègia per a marcs que superin el llit d’impressió. No assumir un encaix universal per a totes les impressores/materials.

### RO-015 — Opcions de broquet i filament

**Proposta:** poder seleccionar broquet de 0,2 / 0,4 / 0,6 mm i material, per exemple PLA o PETG, quan l’exportació i el laminador ho puguin interpretar correctament.

**Dependència:** RO-003. Separar dades geomètriques, assignació de materials i perfils específics d’impressora abans de decidir què s’inclou al 3MF.

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

**Proposta:** orientar el retall amb un angle lliure; decidir si resulta més intuïtiu girar el mapa o el requadre.

**Proper pas:** definir la transformació comuna de selecció, projecció, dades, preview, exportació i peces. Girar només la càmera no compleix aquesta petició. Cal carregar la cobertura de dades de totes les cantonades del retall girat.

**Per validar:** un retall rectangular girat coincideix entre mapa i exportació, conserva mida/escala i exageració, costa i capes es retallen bé, i l’angle/nord queden a les metadades. Dependències de disseny: RO-006; afecta RO-014 i RO-017.

### RO-019 — Internacionalització

**Objectiu:** català, castellà, gallec, euskera i anglès. Traduccions ajornades fins a estabilitzar el flux, tal com indica l’usuari.

**Consideració des d’ara:** no afegir obstacles a la futura separació de textos, formats de nombres/unitats, missatges de càlcul i errors. La preparació arquitectònica es pot valorar abans que la traducció completa, sense obrir una reescriptura ara.

**Per validar:** textos visibles i missatges en la llengua triada, formats coherents, alternativa per a textos absents i cap identificador de capa/material dependent de la traducció.

## Seguiment de canvis anteriors

### RO-020 — Unions arrodonides dels camins

**Implementació:** v0.4.0. **Validació:** l’usuari confirma a la conversa que s’ha resolt el tema de les carreteres. Hi ha proves locals de girs, revolts tancats, punts repetits i amplada del traçat.

**Tancat dins d’aquest abast.** Reobrir si es troba un cas concret amb discontinuïtats; conservar com a regressió quan canviïn projecció, escala o retall.

### RO-021 — Quatre materials i colors a Bambu

**Implementació:** exportador compatible disponible des de v0.2 i ajustos posteriors. **Validació:** l’usuari confirma que el 3MF s’obre com quatre materials separats amb els colors que corresponen al preview.

**Tancat per a quatre materials en el cas comprovat.** No equival a validar tots els perfils d’impressora, 1/2/8 materials o impressió física. RO-003 no reobre aquesta assignació de colors: investiga la configuració de la impressora i els consumibles. Revalidar colors si RO-015 modifica aquestes metadades.

### RO-022 — Cobertes horitzontals dels edificis

**Implementació:** v0.4.1, commit `1f22c13`. Una cota horitzontal per petjada, situada sobre el punt més alt del terreny sota l’edifici més l’altura representada; amb límit de 5 m per defecte. Al costat baix pot haver-hi més façana.

**Validació local feta:** 40 proves del projecte, cas de pic interior a la petjada, exageració ×1/×3, Tamariu i 5.355 triangles de coberta comprovats com a horitzontals; sòlids auditats amb Manifold.

**Validació d’usuari (2026-11-01):** confirma que els canvis de v0.4.1 són correctes, exceptuant els edificis afectats pels pics incorrectes del terreny. La correcció de cobertes queda validada dins d’aquest abast; les alçàries contaminades pel relleu continuen obertes a RO-001. Els megablocs de RO-002 són un altre problema: una coberta plana no prova que la petjada representi un únic edifici real.

## Línies tècniques ja identificades

### RO-023 — Relleu local i fonts vectorials de més precisió

**Origen:** [ARCHITECTURE.md](../ARCHITECTURE.md). Estudiar MDT ICGC/GeoTIFF/COG i cartografia vectorial original o oficial més detallada. Es prioritza el diagnòstic de RO-001 abans de canviar de proveïdor per tapar-ne el símptoma.

**Per validar:** precisió/resolució documentades, projeccions i límits coherents, costa i penya-segats comparats amb dades de referència, atribució i càrrega directa/importació compatibles amb el navegador i GitHub Pages. Un ombrejat WMS no es tracta com a elevació numèrica. Dona suport a RO-002.

### RO-024 — Unió de volums i validació d’impressió

**Origen:** [ARCHITECTURE.md](../ARCHITECTURE.md). La comprovació de sòlids i els talls amb Manifold ja existeixen; falta concretar la unió/reparació general dels volums i una validació física. No marcar aquesta línia resolta només perquè es pot exportar o tancar un tall.

**Proper pas:** triar un model de prova fiable després de RO-001/RO-002, establir què cal unir dins de cada material i preparar el cas per al laminador de l’usuari.

**Per validar:** malles, superfícies internes/encavalcaments, separació de materials i continuïtat entre peces; després, laminat i impressió física amb mesures d’ajust i observacions registrades. Les validacions de Bambu i d’impressió es documenten separades. Relació amb RO-003, RO-014 i RO-015.

### RO-025 — Vegetació mesurada i paisatges històrics

**Origen:** conversa i [ARCHITECTURE.md](../ARCHITECTURE.md). Arbres individuals cartografiats/LiDAR i models d’un lloc en altres anys són línies futures diferents de la vegetació procedimental i de l’opció actual d’ocultar edificis.

**Ajornament:** fins a estabilitzar el nucli i disposar de fonts adequades. Si s’activa una d’aquestes línies, dividir-la en tasques pròpies amb fonts, data i precisió. La menció de «v1» a la conversa és una fita futura, no autorització per canviar la versió a 1.0.

**Per validar:** diferenciar dades mesurades/procedimentals i reconstruccions històriques; documentar dates compatibles de relleu, edificació i cobertes del sòl. Eliminar un edifici actual no acredita com era abans el terreny.

## Decisions, ajornaments i historial

**Descarts:** cap petició de l’usuari descartada en aquest triatge. Les idees posposades conserven una entrada amb condició de represa. **Bloquejos actuals:** cap declarat; les dependències es detallen a cada línia.

| Data | Entrades | Moviment i evidència |
| --- | --- | --- |
| 2026-11-01 | RO-001–RO-019 | Triatge inicial de les notes de l’usuari. Observacions encara no reproduïdes per aquest triatge; prioritats proposades, sense implementar funcionalitats. |
| 2026-11-01 | RO-020, RO-021 | Incorporada la validació expressa de l’usuari sobre camins i quatre materials. Abast de validació limitat al cas confirmat. |
| 2026-11-01 | RO-022 | Incorporada la correcció local de v0.4.1; continua pendent de validació d’usuari. |
| 2026-11-01 | RO-023–RO-025 | Incorporades les línies tècniques prèvies per evitar que quedin fora del seguiment. |
| 2026-11-01 | RO-022 | Pendent de validar → Validat. Confirmació expressa de l’usuari de v0.4.1; s’exclouen els edificis afectats pels pics de RO-001. |
| 2026-11-01 | RO-001 | Per reproduir → En curs. Diagnòstic amb entrades repetides i comparació entre dades, malla i preview; encara sense causa demostrada. |
| 2026-11-01 | RO-001 | En curs → Pendent de validar, v0.4.2. Lectura binària exacta, regressió amb soroll simulat i sis generacions locals; falta confirmació del cas intermitent a Brave. Informe RO-001-DIAGNOSTIC.md. |

### Iteració v0.5.0

Actualitzacions d’aquesta iteració (2026-11-01):

| Data | Entrada | Canvi / decisió |
| --- | --- | --- |
| 2026-11-01 | RO-001 | Pendent de validar → Validat. Confirmació expressa de l’usuari i petició de tancament de v0.4.2. |
| 2026-11-01 | RO-003 | Per reproduir / P1 → Ajornat / P2 per petició expressa; reconsiderar després del grup actual. |
| 2026-11-01 | RO-002 | Per estudiar → En curs → Per estudiar. Diagnòstic fet a v0.5.0: una petjada ICGC original sense divisions; cal estudiar una font més detallada. No corregit ni descartat. |
| 2026-11-01 | RO-004–RO-006 | Preparat / Per estudiar → En curs → Pendent de validar, v0.5.0. Interfície i escala implementades; 48 proves i construcció superades, comprovació local al navegador. Falta validació de l’usuari. |

El 3MF estàndard descarregat realment del navegador local conserva una envolupant XY de **150 × 200 mm**, territori de **150 × 200 m**, `targetScale: 1000` i exageració **1,5**. Inspecció de tots els vèrtexs i metadades satisfactòria. No és una validació al laminador ni una impressió física.

### Plantilla d’actualització

Per cada canvi d’estat, afegir una fila a l’historial i actualitzar la vista de conjunt i el detall:

| Data | Entrada | Estat anterior → nou | Canvi / decisió | Evidència local | Validació d’usuari / pendent | Commit / versió |
| --- | --- | --- | --- | --- | --- | --- |
| AAAA-MM-DD | RO-NNN | Preparat → En curs | Abast concret | Encara no feta | Què caldrà comprovar | — |

Per a una entrada nova: observació/origen, prioritat amb motiu, estat, següent pas, dependències i criteris de validació. Si no es disposa de dades per prioritzar o diagnosticar, s’ha de dir explícitament.

## Cobertura de les notes originals

| Apartat de MILLORES-BUGS.md | Seguiment |
| --- | --- |
| General | RO-001, RO-009, RO-010 |
| Edificis i captures | RO-002; relació amb RO-001 i RO-022 |
| Footer | RO-008, RO-011 |
| Gestió d’escala | RO-006, RO-007 |
| Preview d’impressió i marc | RO-012, RO-013, RO-014 |
| Configuració d’impressió | RO-003, RO-015 |
| Complements | RO-016, RO-017 |
| Rotar el model | RO-018 |
| Organització de sidebars | RO-004 |
| Preview | RO-005 |
| Internacionalització | RO-019 |
