# Historial i validacions de Relleu Obert

Actualitzat: 2026-11-01. Les entrades validades surten del [backlog actiu](BACKLOG.md), mantenint identificadors i evidència. Una incidència nova es pot reobrir sense renumerar-la.

## Validacions i observacions de l’usuari sobre v0.6.0

Es conserven aquí les anotacions de totes les cel·les d’estat abans de reorganitzar el backlog. «Validat però…» conserva la millora pendent al backlog actiu; «aparentment» no és una validació completa en tots els escenaris.

| ID | Anotació de l’usuari |
| --- | --- |
| RO-001 | Validat |
| RO-002 | Per estudiar |
| RO-003 | Ajornat |
| RO-004 | Validat però millorar. Controls d'escala moguts a un apartat propi, controls de "Colors i materials" els passen completament al sidebar dret, perquè aquí només hi tenim l'opció per triar quants materials i res més |
| RO-005 | Validat |
| RO-006 | Validat però millorar fluxe |
| RO-007 | Validat |
| RO-008 | Millorar layout del popup per encabir-ho sense haver de desplegar "Fonts cartogràfiques i projectes oberts". Podem utilitzar layout a doble columna a la part inferior (sobre l'autor - fonts i projectes oberts) |
| RO-009 | Fons de la icona quadrat, no rectangular, per aprofitar millor l'espai disponible |
| RO-010 | Validat |
| RO-011 | Per estudiar |
| RO-012 | Ajornat |
| RO-013 | Validat |
| RO-014 | Ajornat |
| RO-015 | Pendent de validar |
| RO-016 | Ajornat |
| RO-017 | Ajornat |
| RO-018 | Validat però sistema de rotació molt poc intuïtiu. Millor passar-ho d'alguna forma al mapa o inventar-se alguna altra forma. La rotació màxim entre -90º i 90º, no cal més (de fet, només amb 0-90º és suficient) |
| RO-019 | Ajornat |
| RO-020 | Validat |
| RO-021 | Validat |
| RO-022 | Validat |
| RO-023 | Validat aparentment, però no puc garantir en diferents escenaris |
| RO-024 | Per estudiar |
| RO-025 | Ajornat |
| RO-026 | Per estudiar |

## Entrades completament validades

### RO-001 — Pics de relleu i efectes sobre edificis

**Validat / tancat (2026-11-01):** l’usuari confirma que sembla solucionat i demana tancar RO-001. Es conserva l’informe de proves i la distinció entre el mecanisme simulat i el navegador de l’usuari. Reobrir si reapareix amb dades concretes.

**Correcció candidata (v0.4.2, 2026-11-01):** lectura binària WebP/PNG sense canvas, amb hashes i diagnòstics de tessel·les a la procedència. [Informe i comprovacions pendents](RO-001-DIAGNOSTIC.md).

**Resultats locals:** quatre tessel·les de Tamariu comparades byte a byte amb libvips/sharp; prova de soroll simulat que crea un pic de 256 m i eleva l’edifici; sis generacions de geometria amb tres malles idèntiques per entrades idèntiques i terreny conservat en desactivar arbres/edificis. 44 proves i construcció estàtica superades.

**Historial de la validació:** inicialment es va demanar confirmar a Brave si desapareixien els pics intermitents amb v0.4.2. La protecció de lectura de canvas continua sent una hipòtesi sustentada, no una causa demostrada directament al seu navegador. L’usuari va informar de tres simulacions sense deformacions i, posteriorment, ha confirmat que sembla solucionat i ha demanat tancar l’entrada. La comprovació directa del navegador afectat no s’havia completat.

**Observació:** l’usuari veu habitualment un pic i de vegades dos, en posicions aparentment variables; poden elevar també els edificis pròxims. La sospita que siguin un càlcul nostre és una hipòtesi, encara no una causa demostrada. Es reobre la línia de fiabilitat del relleu tractada anteriorment: les reparacions de mostres de la v0.2 no tanquen aquest nou avís.

**Si reapareix:** conservar regió, ajustos, diagnòstics i 3MF afectat per reobrir el cas; comparar dades, malla i preview. No hi ha feina activa sobre RO-001.

**Per validar:** reproducció documentada abans/després, proves de regressió sobre la causa trobada i sèrie d’execucions amb les mateixes entrades sense nous pics. Comprovar també 3MF/STL, edificis propers i una zona amb penya-segats reals, que no s’han d’aplanar. La comprovació local ja existent d’altituds invàlides no és evidència suficient per tancar-lo.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-005 — Més espai útil al preview

**Implementat a v0.5.0, pendent de validar (2026-11-01):** eliminat el subheader; controls, ajuda i estats dins del preview. En la comprovació local a 1280 × 720, la vista ocupa tot l’espai de 630 px entre header i footer. Canvis pendents i errors es mantenen en regions accessibles; exportació bloquejada fins a generar. Detectada i corregida la desaparició visual de la barra sobre el canvas animat, forçant-ne la composició en una capa pròpia. Falta validar-ne comoditat i visibilitat amb l’usuari.

**Abast:** retirar el subheader «Tamariu · Palafrugell» i el text «Càlcul al navegador»; situar Restablir, Vista zenital, ajuda de gestos i missatges d’actualització com a elements flotants dins del preview. Es conserva la identificació de la regió a la selecció i a les metadades.

**Per validar:** augment d’espai de model, controls llegibles sense tapar zones importants i sense interferir amb gir/zoom/pinzell. Els avisos de càlcul, errors i canvis pendents de generar continuen sent inequívocs i accessibles; no es perden en eliminar contenidors actuals. Relació amb RO-004 i RO-007.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-007 — Escala i triangles al sidebar

**Implementat a v0.6.0:** escala retirada del header i recompte de triangles traslladat a «La teva maqueta». L’escala només es mostra a les estadístiques del model (a banda del control d’escala sol·licitada). Comprovat al navegador; els triangles s’etiqueten com a complexitat, no precisió. Pendent de validar.

**Abast:** mostrar l’escala només a «La teva maqueta»; traslladar el recompte de triangles a estadístiques del sidebar. Només reconsiderar-ne la presència destacada si té una funció clara per a l’usuari.

**Per validar:** no hi ha duplicació al header i es conserven les dades útils. El nombre de triangles no es presenta com una garantia de precisió cartogràfica. Coordinar amb RO-005.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-010 — Transicions homogènies

**Promogut a P2 i implementat a v0.6.0 per petició de l’usuari:** transicions de color/vores i entrada de contingut de 220 ms; modals amb entrada i sortida i tancament accessible. Preferència de moviment reduït respectada per CSS i JavaScript. Durada de 0,22 s i Escape comprovats al navegador; avisos de càlcul/errors sense animació ni demora afegida. Pendent de validar l’experiència i el mode de moviment reduït al dispositiu de l’usuari.

**Abast:** transicions coherents d’aproximadament 220 ms en modals, popups i controls adequats. No imposar una animació a controls nadius que no la permetin bé.

**Per validar:** obertura/tancament i focus correctes, respecte per la preferència de moviment reduït i cap retard afegit als avisos de treball o als errors. Aplicar després d’estabilitzar els components de RO-004/RO-005/RO-008.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-013 — Marc a la previsualització

**Implementat a v0.6.0:** selector de marc visual negre, blanc o to de fusta, o sense marc. Adaptat a les dimensions reals del model, separat del grup de malles i del Worker. No modifica escala ni exportació. Comprovada la selecció al navegador amb model rectangular; el marc imprimible RO-014 continua ajornat. Pendent de validar.

**Proposta:** marc opcional al voltant de la maqueta, amb acabat blanc/negre o fusta segons el disseny que s’acordi.

**Proper pas:** definir secció, gruix, color, marge interior i relació amb la base. El marc de visualització ha de quedar distingit del model exportat i d’un futur marc imprimible.

**Per validar:** concordança amb mides rectangulars/quadrades i peces grans, sense alterar l’escala del terreny ni afegir el marc a l’exportació sense selecció explícita. Precedeix RO-014; pot existir sense RO-012.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-020 — Unions arrodonides dels camins

**Implementació:** v0.4.0. **Validació:** l’usuari confirma a la conversa que s’ha resolt el tema de les carreteres. Hi ha proves locals de girs, revolts tancats, punts repetits i amplada del traçat.

**Tancat dins d’aquest abast.** Reobrir si es troba un cas concret amb discontinuïtats; conservar com a regressió quan canviïn projecció, escala o retall.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-021 — Quatre materials i colors a Bambu

**Implementació:** exportador compatible disponible des de v0.2 i ajustos posteriors. **Validació:** l’usuari confirma que el 3MF s’obre com quatre materials separats amb els colors que corresponen al preview.

**Tancat per a quatre materials en el cas comprovat.** No equival a validar tots els perfils d’impressora, 1/2/8 materials o impressió física. RO-003 no reobre aquesta assignació de colors: investiga la configuració de la impressora i els consumibles. Revalidar colors si RO-015 modifica aquestes metadades.

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

### RO-022 — Cobertes horitzontals dels edificis

**Implementació:** v0.4.1, commit `1f22c13`. Una cota horitzontal per petjada, situada sobre el punt més alt del terreny sota l’edifici més l’altura representada; amb límit de 5 m per defecte. Al costat baix pot haver-hi més façana.

**Validació local feta:** 40 proves del projecte, cas de pic interior a la petjada, exageració ×1/×3, Tamariu i 5.355 triangles de coberta comprovats com a horitzontals; sòlids auditats amb Manifold.

**Validació d’usuari (2026-11-01):** confirma que els canvis de v0.4.1 són correctes, exceptuant els edificis afectats pels pics incorrectes del terreny. La correcció de cobertes queda validada dins d’aquest abast; les alçàries contaminades pel relleu continuen obertes a RO-001. Els megablocs de RO-002 són un altre problema: una coberta plana no prova que la petjada representi un únic edifici real.

## Línies tècniques ja identificades

**Arxivat (2026-11-01):** validació expressa de l’usuari sobre v0.6.0. Es conserva l’abast de les comprovacions anteriors.

## Decisions, ajornaments i historial

**Iteració P2 (2026-11-01):** iniciades RO-004, RO-007–RO-010, RO-013, RO-015, RO-018 i RO-023. Resposta expressa de l’usuari: mantenir RO-003, RO-014 i RO-016 ajornats. Fi del bloc a v0.6.0: implementacions pendents de validar, amb abast parcial explícit a RO-015/RO-023; no s’ha descartat cap línia.

**Evidència local del bloc:** 56 proves automatitzades superades; model realment generat i descarregat del navegador local a 150 × 200 mm, 1:1.000 i gir de 35°, amb GeoTIFF sintètic de control i els 632 edificis del GeoJSON oficial inclòs. Inspeccionats els 63.484 vèrtexs del 3MF compatible: límits XY correctes, procedència dels fitxers, gir, PETG i broquet de 0,4 mm conservats; marc visual absent de l’arxiu. El MDT de prova no acredita una millora del relleu real. No s’ha obert al laminador ni imprès, ni s’han comprovat Pages/CI remots.

**Incidència trobada durant el bloc:** la partició d’un retall girat de 400 × 400 mm fallava en tornar a retallar un sòlid d’aigua que ja havia quedat buit en una peça (`NonFiniteVertex`). Reproduïda localment amb la mostra i corregida aturant el retall quan no queden triangles. Afegida una regressió de capa absent en tres peces; el cas complet de mostra genera les quatre peces, amb la capa d’aigua absent on correspon. Relació amb RO-018 i RO-024; no valida unions generals ni impressió física.

**Regressió posterior al navegador:** exportació ZIP completada amb quatre 3MF de 200 × 200 mm, gir de 35° i escala 1:1.000, amb relleu públic real. Inspeccionats tots els vèrtexs i la procedència de les quatre peces: coordenades finites dins de cada peça i mateix gir/escala. No comprovat al laminador.

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
| 2026-11-01 | RO-026 | Nova petició → Per estudiar / P1. Registrat l’estudi de fidelitat dels edificis, fonts candidates i criteris de priorització. Consulta documental inicial feta; encara sense comparar geometries ni canviar el proveïdor. Vinculada a RO-002, RO-023 i RO-022. Canvi només documental sobre v0.5.0. |

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

## Validacions de l’usuari sobre v0.7.0

| ID | Anotació original de l’usuari |
| --- | --- |
| RO-002 | Per estudiar |
| RO-004 | Validat, però a futur segurament li donem una volta més. |
| RO-006 | Validat |
| RO-008 | Validat |
| RO-009 | Pendent de validar |
| RO-011 | Per estudiar |
| RO-015 | Validat, però eliminarem l'opció de material i gruix de broquet, perquè ho ignora, així que millor simplement exportem el 3MF i que l'usuari decideixi com enfocar exactament la seva configuració. Eliminem les opcions de material i gruix del broquet. |
| RO-018 | Validat |
| RO-023 | Comprovat que l'eina existeix, però poc intuïtiva i massa text. Valorar si podem carregar GeoJSON d'alguna font oberta, potser no com a opció principal però si com una opció d'usuari en cas que vulgui major detall per als edificis |
| RO-024 | Per estudiar |
| RO-026 | Per estudiar |
| RO-027 | Validat |
| RO-028 | Validat |
| RO-029 | Validat |
| RO-003 | Ajornat |
| RO-012 | Ajornat |
| RO-014 | Ajornat |
| RO-016 | Ajornat |
| RO-017 | Ajornat |
| RO-019 | Ajornat |
| RO-025 | Ajornat |

### RO-004 — Apartats col·lapsables dels sidebars

**Actualització v0.6.0 (2026-11-01):** reobert per avís de l’usuari: el contingut llarg del bloc 2 empenyia els altres menús. Ara els quatre títols i el botó Generar queden fora del scroll; només es desplaça el contingut de l’apartat obert. Comprovat a 1280 × 720: sidebar 630 px de contingut/630 px de viewport, bloc 2 amb scroll intern i tots els títols visibles. Reobrir el mapa conserva la selecció i el model continua exportable. Pendent de validar per l’usuari.

**Implementat a v0.5.0, pendent de validar (2026-11-01):** acordió exclusiu al sidebar esquerre, primera secció oberta i generació fora dels apartats. Retirada la introducció visible per donar lloc als quatre apartats. Comprovat localment amb clic i teclat, conservant valors i sense reiniciar el model; header/footer visibles a 1280 × 720. Falta la valoració d’ús de l’usuari.

**Abast:** començar amb «Tria el lloc» obert i els apartats següents replegats; comportament exclusiu amb un apartat desplegat cada vegada, seguint la referència de Pentagrama. Revisar sobretot el sidebar esquerre.

**Per validar:** menys scroll sense perdre valors ni accés a generar/exportar, ús amb teclat, estat desplegat accessible i header/footer estables. Canviar d’apartat no ha de provocar càlculs innecessaris ni interrompre una operació activa.

**Revisió v0.7.0 · Pendent de validar:** Quatre blocs: lloc/orientació, mida/escala, relleu/edificis i vegetació. Materials reunits al sidebar dret. Títols i Generar fora del scroll intern.

**Anotació original de l’usuari sobre v0.6.0:** Validat però millorar. Controls d'escala moguts a un apartat propi, controls de "Colors i materials" els passen completament al sidebar dret, perquè aquí només hi tenim l'opció per triar quants materials i res més.

**Arxivat després de v0.7.0 (2026-11-01):** Validat, però a futur segurament li donem una volta més.. La revisió futura indicada no té un canvi concret pendent; es pot reobrir quan n’hi hagi.

### RO-006 — Selecció d’una escala destí

**Implementat a v0.5.0, pendent de validar (2026-11-01):** mode lliure i escala fixada (presets i personalitzada, 100–100.000). En mode fix, mida i escala determinen l’extensió; moure el mapa canvia el centre, i el zoom només la vista del mapa. La mostra de Tamariu restaura el mode lliure i el retall de mostra.

**Comprovacions locals:** 48 proves superades, amb latituds 0°, 41,918° i 65°, peces quadrades/rectangulars/40 cm, partició, escala personalitzada decimal, exageracions ×1/×3, coherència del motor, dimensions i unitats 3MF. Al navegador local: generació de 150 × 200 mm a 1:1.000, selecció de 150 × 200 m, canvi d’escala amb mapa ocult, zoom i reobertura del mapa, escala personalitzada i quatre peces de 200 mm, i bloqueig per escala invàlida. Tolerància numèrica i aproximació mètrica documentades a ARCHITECTURE.md. Falta la validació de l’usuari/laminador; no s’ha comprovat Pages ni CI remots.

**Abast:** poder demanar 1:1000, 1:1500, 1:2000 o una escala personalitzada, i adaptar l’extensió del retall del mapa a la mida física escollida. L’escala és horitzontal; l’exageració vertical es manté independent.

**Proper pas:** fixar quina variable s’ajusta quan es canvia mida/escala i com es mostra un retall pendent. Com a cas de control, una peça de 150 × 200 mm a 1:1000 representa 150 × 200 m. La disponibilitat/resolució de les tessel·les limita el detall, però no ha de definir arbitràriament l’escala sol·licitada.

**Per validar:** retall, preview, dimensions exportades i metadades concorden dins d’una tolerància documentada, amb peces quadrades/rectangulars, diverses latituds i partició en peces. Coordinar amb RO-018.

**Revisió v0.7.0 · Pendent de validar:** Un camp editable amb suggeriments, lectura 1:1000 o 1000, i equivalència entre centímetres del model i metres reals. Buit segueix el mapa.

**Anotació original de l’usuari sobre v0.6.0:** Validat però millorar fluxe.

**Arxivat després de v0.7.0 (2026-11-01):** Validat.

### RO-008 — Footer i quadre V4V

**Implementat a v0.6.0:** fonts i projectes oberts integrats en un desplegable del V4V; footer amb enllaços separats al repositori i MIT, sense duplicació dins del modal. Conservats autor, foto, Lightning i atribució del mapa. Comprovats rutes al DOM local, obertura, tancament amb Escape i retorn del focus. No s’han visitat els enllaços remots. Pendent de validar.

**Abast:** integrar «Fonts cartogràfiques» dins de «Sobre el projecte · V4V», amb espai per a fonts obertes i projectes utilitzats. Al footer, «Codi obert» enllaça al repositori i «MIT» a la llicència; retirar la duplicació d’aquests enllaços dins del quadre.

**Per validar:** tots els enllaços funcionen en local, fonts i atribucions continuen accessibles i el peu manté poca alçada. No es retira l’atribució pròpia del mapa. Mantenir el contingut de l’autor i les referències de Pentagrama/Plec.

**Revisió v0.7.0 · Pendent de validar:** Versió al footer, icona de commit al repositori i V4V amb autor/fonts visibles a dues columnes.

**Anotació original de l’usuari sobre v0.6.0:** Millorar layout del popup per encabir-ho sense haver de desplegar "Fonts cartogràfiques i projectes oberts". Podem utilitzar layout a doble columna a la part inferior (sobre l'autor - fonts i projectes oberts).

**Arxivat després de v0.7.0 (2026-11-01):** Validat.

### RO-018 — Rotació de la regió seleccionada

**Implementat a v0.6.0:** gir horari −180° a 180°, amb centre, dimensions reals i cantonades compartides entre mapa, càrrega, projecció i exportació. L’envolupant inclou totes les cantonades. La numeració de peces es refereix a dalt/esquerra del model; el nord s’obté del gir registrat. Proves amb rectangles, escala fixa, latituds 0°/41,918°/65° i angles diversos. Model generat al navegador a 35°, 150 × 200 mm i 1:1.000. La mostra de Tamariu recupera gir zero. Pendent de validar per l’usuari.

**Proposta:** orientar el retall amb un angle lliure; decidir si resulta més intuïtiu girar el mapa o el requadre.

**Proper pas:** definir la transformació comuna de selecció, projecció, dades, preview, exportació i peces. Girar només la càmera no compleix aquesta petició. Cal carregar la cobertura de dades de totes les cantonades del retall girat.

**Per validar:** un retall rectangular girat coincideix entre mapa i exportació, conserva mida/escala i exageració, costa i capes es retallen bé, i l’angle/nord queden a les metadades. Dependències de disseny: RO-006; afecta RO-014 i RO-017.

**Revisió v0.7.0 · Pendent de validar:** Gir al costat del mapa amb passos de 15°, rang d’interacció −90°…90° i botó Nord. Manipulació directa del retall pendent d’una futura iteració.

**Anotació original de l’usuari sobre v0.6.0:** Validat però sistema de rotació molt poc intuïtiu. Millor passar-ho d'alguna forma al mapa o inventar-se alguna altra forma. La rotació màxim entre -90º i 90º, no cal més (de fet, només amb 0-90º és suficient).

**Arxivat després de v0.7.0 (2026-11-01):** Validat.

### RO-027 — Auditoria d’usabilitat dels sidebars

**v0.7.0 · Pendent de validar:** inventari, agrupació de controls, noms, descobribilitat, accessibilitat i reducció de textos redundants. Aplicar una distribució coherent amb lloc/orientació, mida/escala, relleu/edificis i vegetació, i reunir colors/materials a la dreta. Informe i criteris a [AUDITORIA-USABILITAT.md](AUDITORIA-USABILITAT.md); revisió d’usuari pendent.

**Arxivat després de v0.7.0 (2026-11-01):** Validat.

### RO-028 — Vegetació proporcionada a l’escala

**Observació:** les capçades tenen radi en mil·límetres constants i poden semblar arbres gegants en maquetes de territoris amplis.

**v0.7.0 · Pendent de validar:** capçada orientativa de 12 m convertida a l’escala horitzontal, sense exageració vertical. Variació i incrustació conservades. Per sota de 0,25 mm de diàmetre s’ometen els arbres i es conserva la superfície del bosc; avís explícit, sense engrandir-los artificialment. El llindar és una política de representació, no una garantia universal d’impressió. La vegetació no acredita arbres individuals mesurats.

**Arxivat després de v0.7.0 (2026-11-01):** Validat.

### RO-029 — Escala i límit real de càrrega

**Observació:** el rang numèric arriba a 1:100.000 però 1:50.000 o 1:100.000 poden superar el límit de 16 tessel·les de la cartografia actual.

**v0.7.0 · Pendent de validar:** validació contextual abans de generar, mateixa lògica de capacitat a la càrrega i missatge amb escala màxima aproximada segons centre, mida i orientació. No confondre rang numèric amb cobertura admissible. Ampliar territori o reduir el detall automàticament requereix un estudi posterior; no s’ha d’amagar la desaparició de capes en canviar de zoom de dades.

**Arxivat després de v0.7.0 (2026-11-01):** Validat.
