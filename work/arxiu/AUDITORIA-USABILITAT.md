# Auditoria d’usabilitat dels sidebars

2026-11-01 · RO-027 · revisió del codi i fluxos de v0.6.0, amb primera aplicació a v0.7.0. És una revisió heurística i tècnica amb comprovacions locals, no una prova d’usabilitat amb persones externes. Les observacions de l’usuari són el punt de partida i es conserven a [HISTORIAL.md](HISTORIAL.md).

## Conclusió

La dificultat principal era la distribució: «Mida i relleu» reunia funcions de lloc, impressió, representació i fonts. L’escala exigia canviar de controlador quan era personalitzada, i la rotació quedava lluny del mapa on es veu el resultat. També hi havia controls relacionats repartits entre sidebars i explicacions repetides que compensaven noms poc directes.

## Inventari i decisions

| Troballa | Impacte | Primera correcció | Seguiment |
| --- | --- | --- | --- |
| Bloc 2 molt llarg i amb responsabilitats diferents | Costa trobar un ajust i entendre’n l’ordre | Separar mida/escala de relleu/edificis, mantenint quatre títols fixos | RO-004 / RO-027 |
| Materials a l’esquerra però assignacions a la dreta | Cal recordar dos llocs per a una mateixa tasca | Nombre de materials i llegenda junts a la dreta | RO-004 / RO-027 |
| Preset d’escala i segon camp «Denominador» | Canvi de controlador i vocabulari poc relacionat amb l’objectiu | Un únic camp editable amb suggeriments; admet 1:1000, 1000 i formats habituals. En buit segueix el mapa | RO-006 |
| Gir amb slider de −180° a 180° separat del mapa | És difícil relacionar els graus amb el retall | Botons de 15° al costat del mapa, text d’estat i retorn «Nord ↑»; rang d’interacció −90°…90° | RO-018 |
| La rotació de la càmera i la del territori poden confondre’s | Es pot esperar que es modifiqui una cosa diferent | Orientació al bloc del lloc; controls de càmera al preview | RO-018 / RO-027 |
| L’escala anunciava un rang que el límit de càrrega no sempre admet | L’error apareix tard i parla de tessel·les | Prevalidar la selecció i donar una escala màxima aproximada per centre, mida i gir; bloqueig abans de descarregar dades | RO-029 |
| Arbres amb radi fix en mm | Es tornen gegants en termes geogràfics a escales de territori ampli | Convertir una capçada orientativa en metres a l’escala horitzontal; no exagerar-ne l’altura amb el relleu | RO-028 |
| Molts paràgrafs repetien el nom o l’acció del control | Augment de lectura i scroll | Noms més directes i missatges de resultat. Retirar indicacions repetides de «prem generar» i descripcions evidents | RO-027 |
| Dades locals i ajustos poc freqüents ocupen el flux principal | Distracció respecte al cas senzill | Conservar-les dins de «Dades locals de més precisió» al bloc de relleu/edificis | RO-023 / RO-027 |
| Versió al header i repo sense senyal visual | Jerarquia poc útil per configurar el model | Versió al footer i icona de commit al repositori | RO-008 |
| Fonts del V4V amagades en un desplegable | Cal una acció extra per trobar-les | Autor i fonts visibles en dues columnes inferiors | RO-008 |
| Favicon rectangular | Marca petita dins d’una pestanya quadrada | Llenç quadrat, mantenint els triangles | RO-009 |

## Distribució aplicada

| Zona | Responsabilitat | Controls |
| --- | --- | --- |
| Esquerra 1 · Lloc i orientació | Quin territori entra al model | Adreça/coordenades, mapa, orientació del retall, mostra |
| Esquerra 2 · Mida i escala | Quina peça i quina extensió representa | Mida física, escala en un sol camp i divisió en peces |
| Esquerra 3 · Relleu i edificis | Com es representa i amb quines dades | Exageració vertical, detall, font i representació d’edificis, altura màxima, importació avançada |
| Esquerra 4 · Vegetació | Com es representa i edita la vegetació | Activació, densitat, forma, pinzell/goma i desfer |
| Dreta | Revisar, assignar materials i descarregar | Resultat i escala efectiva, aparença només del preview, materials amb llegenda i exportació |
| Preview | Explorar el model i veure’n l’estat | Càmera, ajuda, càrrega, errors i canvis pendents |
| Footer | Informació del projecte | Repositori, llicència, versió i V4V |

El bloc 2 passa de 13 controls de formulari a 3. Això no elimina funcions: la rotació passa al mapa, els paràmetres de representació al bloc 3 i els materials a la dreta. Els quatre títols i Generar continuen fora del scroll del contingut.

## Criteris de text i accessibilitat

- Cada control conserva un nom accessible, amb unitats al costat quan són necessàries. Els botons de gir tenen noms explícits de direcció i graus.
- No cal tornar a explicar un selector que ja diu «Marc · només al preview», «Exageració vertical» o «Petjades sense volum».
- Es mantenen explicacions que canvien una decisió: referència d’altura en pendent, absència de perfil d’impressora, substitució completa de la capa local, límit de càrrega i arbres massa petits per imprimir.
- Els errors queden associats al camp i disponibles en text; no depenen només de color. Obertura de menús amb teclat i `aria-expanded`, missatges accessibles i focus dels modals es mantenen.
- S’evita que una selecció invàlida comenci a descarregar dades. El rang numèric d’escala és diferent de la capacitat efectiva de la zona; no es promet accés a qualsevol territori a 1:100.000.

## Què cal comprovar amb l’usuari

1. Trobar un lloc, triar mida i posar una escala pròpia sense buscar un segon camp.
2. Orientar el retall veient-lo al mapa, tornar al nord i distingir-ho de girar la càmera.
3. Trobar font/altura d’edificis al bloc de relleu, i nombre/assignacions de materials a la dreta.
4. Entendre com corregir una àrea massa gran abans de generar.
5. Confirmar que els textos retirats no deixen opcions ambigües, i que teclat i menús continuen còmodes a la pantalla habitual.

**Límits i següent iteració:** els passos de 15° són una primera simplificació, no substitueixen una futura manipulació directa del retall amb el ratolí. Els controls avançats d’impressió i les estadístiques del sidebar dret poden compactar-se més després de la prova d’ús. La capçada de 12 m és una representació procedimental orientativa, no una mesura d’arbres reals. El llindar de 0,25 mm és una política de representació, no una garantia per a tots els broquets/materials. Cap d’aquestes decisions es dona per validada només per aquesta auditoria.

## Comprovacions locals de v0.7.0

- 60 proves automatitzades superades: escala i projecció, prevalidació i càrrega amb el mateix pressupost, dimensió geogràfica de les capçades i absència explícita quan són massa petites, incrustació i edició de vegetació, geometria i exportació existents. Construcció estàtica completada.
- Navegador local a 1280 × 720: generació inicial de Tamariu (4.559 capçades); quatre títols visibles i sidebar esquerre de 630 px sense scroll global. El contingut de cada apartat manté el seu propi desplaçament.
- Entrada 1:50.000 amb peça de 15 × 15 cm a Tamariu: avís anticipat, escala admissible aproximada 1:47.600 i Generar desactivat. Camp associat al missatge i marcat amb `aria-invalid`; tornar a una escala admissible reactiva el flux.
- Retall a 1:1.000: gir per passos fins a 90°, botó dret desactivat al límit, retorn al nord i generació efectiva a 15° amb dimensions de 150 × 150 mm.
- Versió v0.7.0 oberta des del footer; V4V amb autor i fonts visibles en dues columnes, sense desplegable.
- La revisió local no substitueix la validació amb la pantalla habitual de l’usuari, el laminador o la impressió física. No s’han comprovat Pages ni CI remots.
