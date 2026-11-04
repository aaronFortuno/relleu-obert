# Canvis

## v0.22.30 — 2026-11-04

- Les fletxes laterals del carrusel acceleren el moviment en passar-hi per sobre. Un clic desplaça una fitxa sencera amb acceleració i frenada graduals. Les fitxes s’amplien en una vista flotant i l’ordre es barreja en cada càrrega. El carrusel alterna els modes quan hi ha fitxes de tots dos.
- Els controls de mida són al costat de la taula. L’exemple del Cap de Creus abasta 20 × 20 km amb gir de +10°.

## v0.22.29 — 2026-11-04

- El carrusel afegeix Montserrat, l’estany de Sant Maurici i els volcans del Croscat i Santa Margarida. Tots tres tenen una imatge estàtica del visor i es generen en triar-los.
- L’ajust de precisió dels contorns dels rierols evita que s’encalli el càlcul al retall de Montserrat.

## v0.22.28 — 2026-11-04

- Relleu pur mostra una textura contínua sobre el bosc cartografiat, d’1 a 3 mm a 1:10.000. La casella «Vegetació simulada», activada per defecte, permet amagar la textura. El pinzell i la goma permeten retocar-la.

## v0.22.26 — 2026-11-04

- Relleu pur recupera el panell de vegetació, el pinzell i la goma. Quan les capçades serien massa fines, els traços afegeixen una textura baixa. Els canvis de vegetació reutilitzen la malla del relleu.

## v0.22.25 — 2026-11-04

- Els exemples es desplacen lentament en bucle, amb els extrems difuminats. En passar-hi per sobre o enfocar una fitxa amb el teclat, el carrusel s’atura i la fitxa s’amplia per mostrar la descripció i l’escala. Hi ha un botó de pausa i el carrusel respecta la preferència de moviment reduït.
- En triar un exemple curat, la maqueta es genera directament amb el retall i els ajustos de relleu predeterminats.

## v0.22.24 — 2026-11-04

- El control «Gir automàtic» es mostra separat a la cantonada superior dreta del visor. Indica l’estat amb text i passa a gris quan es desactiva.

## v0.22.23 — 2026-11-04

- La pantalla inicial mostra un carrusel amb imatges estàtiques de la badia de Roses, el Cap de Creus i el delta de l’Ebre. Cada fitxa prepara la mida, el retall i l’escala en Relleu pur. El càlcul comença en prémer «Genera el model».
- Relleu pur també pot recuperar les tessel·les d’elevació absents en format estàndard quan la cartografia confirma que la zona afectada és completament marina.

## v0.22.22 — 2026-11-04

- El mapa s’obre a Tamariu. Es retira l’accés ràpid al viaducte de Rajadell.
- El visor gira lentament després de generar una maqueta. S’atura mentre hi interactues i es reprèn en sentit contrari. El botó «Gir automàtic» permet deixar la vista quieta.
- El MET5 interpreta correctament el codi marí i evita bases desproporcionades als retalls de costa. El mar cartografiat conserva el material fins a la base.

## v0.22.21 — 2026-11-04

- «Colors i materials» permet triar d’un a sis filaments en Relleu pur i assignar-ne un a cada capa. La tria s’aplica al visor, a les descàrregues i als projectes desats.

## v0.22.20 — 2026-11-04

- Relleu pur mostra els mars i oceans cartografiats. L’aigua marina es manté plana al nivell del mar i el seu material arriba fins a la base, també als talls de les maquetes panoràmiques.

## v0.22.19 — 2026-11-04

- La vista inicial manté les dimensions de les peces panoràmiques respecte de la taula de 60 × 40 cm. Si el costat llarg supera els 60 cm, presenta les peces en dues files.

## v0.22.18 — 2026-11-04

- Les mides panoràmiques admeten un costat de fins a 100 cm i l’altre de fins a 20 cm. Treballen en Relleu pur, d’1:50.000 a 1:500.000, amb una graella ajustada a les proporcions de la peça.
- Les maquetes dividides mostren fragments de terreny a mesura que es preparen. El model final i les peces exportades comparteixen el mostreig i les cotes dels talls.

## v0.22.17 — 2026-11-04

- «La teva maqueta» permet canviar les dimensions d’un projecte amb el territori ja triat. Conserva el centre, el gir i els ajustos, i reproporciona els traços del pinzell abans de generar la nova mida.

## v0.22.16 — 2026-11-04

- Les previsualitzacions inicials mostren retalls a la mateixa escala, amb ombrejat suau i més detall a les maquetes grans. El selector ofereix una sola mida rectangular predefinida, 20 × 15 cm.

## v0.22.15 — 2026-11-04

- El selector inicial mostra les mides en perspectiva sobre una taula de 60 × 40 cm. Les mides dividides indiquen els talls i mostren les peces separades.
- El diàleg de versions incorpora l’enllaç al changelog complet a la capçalera i la barra de desplaçament dels panells.

## v0.22.14 — 2026-11-04

- Les maquetes dividides s’exporten per defecte en un projecte 3MF amb totes les plaques de Bambu Studio. El menú de formats també permet descarregar les peces en un ZIP.

## v0.22.13 — 2026-11-04

- El 3MF per a Bambu Studio assigna el filament per peça. A Montserrat, la prova de laminat elimina les franges de colors incorrectes i redueix l’estimació en quatre hores.

## v0.22.12 — 2026-11-04

- Els senders tenen menys amplada per defecte. El selector de Vies permet ajustar-la entre ×0,75 i ×2.
- Els rius, rierols i llacs del Model complet tenen una capa blava superficial de 0,65 mm amb terreny sòlid a sota. El mar i l’oceà conserven el blau fins a la base.

## v0.22.11 — 2026-11-04

- El paviment independent cobreix més trams de cada retall i arriba fins als talls de la peça amb la secció transversal plana. Cada tram s’encaixa amb el seu suport i una incidència local només afecta el tram implicat.

## v0.22.10 — 2026-11-04

- El Model complet prova per defecte les calçades independents amb excavació i reblert. En xarxes complexes, també les pot construir entre cruïlles i enllaçar-les amb la resta del traçat.

## v0.22.9 — 2026-11-04

- Primera prova del paviment nou al generador de retalls reals. El paràmetre `?paviment=nou` activa la prova. El generador aplica el càlcul als grups de calçades que pot verificar i informa de quants fragments s’han actualitzat.

## v0.22.8 — 2026-11-04

- Cupó de 120 × 120 mm amb quatre traçats, una cruïlla en T i un pont. El pilot comprova els encreuaments conjuntament i retalla el terreny amb el paviment final perquè els materials encaixin.

## v0.22.7 — 2026-11-04

- El pilot de paviment comparteix la rasant entre els accessos i el túnel. El cupó comprova les dues boques i el pas continu a la malla exportada.

## v0.22.6 — 2026-11-04

- El pilot de paviment enllaça els dos extrems d’un pont recte cartografiat amb les calçades d’accés i comprova l’espai sobre la via inferior.

## v0.22.5 — 2026-11-04

- La calçada del cupó segueix un eix arrodonit i una rasant contínua a la corba. La cruïlla conserva una cota compartida amb transicions de pendent progressives.

## v0.22.4 — 2026-11-04

- El pilot de paviment admet un traçat amb corbes i una cruïlla en T amb cota compartida. El control reproduïble exporta els dos cupons en 3MF.

## v0.22.3 — 2026-11-04

- Primer cupó del nou paviment de superfície. La calçada pren la cota de l’eix i es manté plana transversalment. El terreny s’ajusta a sota amb excavació i reblert. El pilot es pot reproduir amb `node scripts/check-surface-road.mjs`.

## v0.22.2 — 2026-11-04

- Si falten cotes fora de la maqueta, les vies principals i els ferrocarrils poden recalcular el perfil amb les dades del retall. Es mantenen les comprovacions de pendent, creuaments i separació del terreny.

## v0.22.1 — 2026-11-04

- Una via principal pot conservar el perfil suau sobre un túnel estimat quan el model ha obert la volta i hi ha separació sota tota la calçada al creuament.
- Les autopistes de sentit únic tenen una amplada estimada de 10 m quan falten dades d’amplada i carrils. Això redueix el solapament entre calçades paral·leles.

## v0.22.0 — 2026-11-04

- Es consoliden els perfils suaus de vies principals i ferrocarrils amb les comprovacions de Sant Salvador, Millau i el retall ferroviari de 800 m.
- Els trams que no poden enllaçar dins del límit de pendent conserven el paviment sobre el relleu. A Sant Salvador s’han identificat els dos perfils de la C-37 afectats.
- La versió incorpora la recuperació del pont de Montgròs i del túnel de Sant Salvador, les mides de peça personalitzades i les guies de tall sobre el relleu.

## v0.21.9 — 2026-11-04

- El peu incorpora la signatura d’ortogra.fi amb el logotip i la composició de Plec.

## v0.21.8 — 2026-11-04

- Si un fragment de pont d’una tessel·la queda contingut en un altre del mateix traçat, es conserva el fragment complet amb els dos extrems. Es recupera així el tauler de la C-37 al torrent de Montgròs.

## v0.21.7 — 2026-11-04

- Si la secció mínima d’un túnel estimat queda sense coberta, el motor pot provar un descens limitat de la rasant. Es comproven de nou les dues connexions, la coberta i el gruix de base.

## v0.21.6 — 2026-11-04

- Els perfils principals poden reservar més traçat per enllaçar amb el paviment sobre el terreny. Cada intent conserva les comprovacions de pendent, suport i encreuaments.
- Els ajustos de vies reutilitzen també la finestra MET5 del model.

## v0.21.5 — 2026-11-04

- Mida inicial de 10 × 10 cm i mides personalitzades de 10 a 50 cm per costat, en passos d’1 cm.
- Les maquetes amb algun costat de més de 25 cm s’exporten en peces iguals i el visor en mostra els talls discontinus sobre el relleu.

## v0.21.4 — 2026-11-03

- La unió de materials reintenta en coordenades locals els components de volum positiu que perden precisió.
- Els prismes triangulars aïllats conserven l’orientació en la precisió de sortida. El control de Sant Salvador recupera dos perfils de la C-37 i el retall ferroviari de 800 m recupera la rasant constant.

## v0.21.3 — 2026-11-03

- Els perfils suaus amb MET5 acoten el càlcul al retall i un petit marge. Inclouen els ramals de vies primàries i les vies reservades a motor quan la font les identifica.
- En els reintents d’integració es poden excloure successivament els perfils que fallen i conservar els altres.

## v0.21.2 — 2026-11-03

- El navegador conserva la graella MET5 en enviar el retall al motor de geometria. Corregit l’error «No hi ha dades d’elevació».
- La càrrega del MET5 admet fins a 15 segons abans de passar a la font general.

## v0.21.1 — 2026-11-03

- MET5 de l’ICGC com a primera font per als retalls amb cobertura completa, amb retorn automàtic a la font general.

## v0.21.0 — 2026-11-03

- Auditoria dels 3MF de control per altura de capa i material.
- Les vies principals i els ferrocarrils poden conservar un radi intermedi de suavitzat quan la finestra màxima supera els límits de pendent o elevació.

## v0.20.1 — 2026-11-03

- Les rasants ferroviàries corbes adapten la finestra de suavitzat a l’escala.
- Els accessos de perfil limitat comparen punts d’enllaç propers i trien el que reparteix millor el canvi de pendent.

## v0.20.0 — 2026-11-03

- Galeria local de projectes amb retall, orientació, mida, capes, materials i traços. Els ajustos es poden recuperar per regenerar una maqueta.

## v0.19.25 — 2026-11-03

- Fins a un 50 % més d’alçada visible a les capçades còniques.
- Retall de prova conjunt dels Rasos de Peguera i la Gallina Pelada amb mesures de densitat per cotes.

## v0.19.24 — 2026-11-03

- Model complet adopta capçades còniques en alta muntanya amb la forma automàtica.
- Relleu pur augmenta la densitat de capçades i la redueix progressivament amb la cota local.
- Els contorns de materials es tanquen segons les arestes obertes reals de la malla.

## v0.19.23 — 2026-11-03

- Relleu pur adapta el perfil de les capçades a la cota màxima del retall.

## v0.19.22 — 2026-11-03

- Relleu pur representa els boscos cartografiats amb un material propi.
- Capçades còniques generades a escala quan el diàmetre supera el mínim imprimible, amb comprovacions a Rajadell i a l’Aneto.

## v0.19.21 — 2026-11-03

- Relleu pur incorpora cursos d’aigua i llacs cartografiats fora del pilot de l’Aneto, amb una consulta limitada de tessel·les.
- Tirador de gir més petit i transparent. El botó de nord queda sota els controls de zoom.

## v0.19.20 — 2026-11-03

- Selector segmentat Model complet / Relleu pur.
- Rius i rierols cartografiats activats per defecte, amb una amplada mínima de 0,45 mm i un multiplicador de fins a ×3.

## v0.19.19 — 2026-11-03

- Selector de modes Paisatge complet i Relleu pur i exemple dels llacs glacials de l’Aneto.
- Llacs plans a Paisatge complet i al retall de l’Aneto de Relleu pur.
- Malla més fina a Paisatge complet i ombrejat continu del terreny.

## v0.19.18 — 2026-11-03

- Relleu pur amb contorns de materials interpolats i cobertura de l’Aneto a uns 30 m per píxel.
- Malla de 384 cel·les per costat amb detall Equilibrat i de 540 amb detall Alt.

## v0.19.17 — 2026-11-03

- Relleu pur amb fins a 432 cel·les per costat, dades d’elevació més fines i diagonals triades a partir d’una mostra central de cada cel·la.
- Les peces separades comparteixen els perfils dels talls. El visor ombreja la superfície de manera contínua.

## v0.19.16 — 2026-11-03

- Mode Relleu pur d’1:10.000 a 1:100.000, sense consultes de vies ni edificis.
- Mostra de l’Aneto amb sòl nu i neu o gel segons ESA WorldCover 2021. [Mesures del pilot](work/RO-055-RELLEU-PUR.md).
- Perfils suaus activats per defecte al model complet.

## v0.19.15 — 2026-11-03

- RO-053: les unions de grans capes viàries es fan per grups i s’evita tornar a retallar les petjades completament interiors. L’informe de temps separa les operacions de polígons.
- RO-033: es descarten per caixa envolupant els obstacles llunyans abans de provar interseccions de pilars.
- RO-051 / RO-052: accessos de vies principals amb una tangent d’arribada limitada per evitar bonys locals. Els perfils experimentals adapten la finestra de suavitzat a l’escala. Les amplades estimades distingeixen classe i escala en superfície, ponts i paviment de túnels.

## v0.19.14 — 2026-11-03

- RO-053: informe local JSON de la darrera generació completa. Inclou retall, zoom, opcions, fonts, temps fins al primer relleu provisional, durades de càrrega i càlcul i seguiment del Catastre per blocs.

## v0.19.13 — 2026-11-03

- RO-053: les guies de les peces segueixen la superfície de la maqueta als plans de tall del 3MF o STL.
- El model visible es pot descarregar quan el mapa té canvis pendents de generar. El visor indica quina maqueta s’exportarà.

## v0.19.12 — 2026-11-03

- RO-053: el visor mostra el pas de generació i el recompte de l’operació quan té un total conegut.
- El relleu i les vies apareixen abans del model complet. Els taulers, edificis i arbres poden aparèixer per lots. La càmera es conserva entre previsualitzacions i la descàrrega queda reservada al model final.

## v0.19.11 — 2026-11-03

- RO-052: els enllaços de pont amb seccions plegades s’ometen individualment. El relleu, el tauler i els altres enllaços i vies es poden generar amb un avís.
- RO-034: si una excavació conjunta falla, es reintenten els túnels per entitat amb un límit de treball i es conserven les excavacions vàlides.
- RO-026 / RO-044: s’ometen els edificis amb geometries defectuoses i es conserva una entrada per petjada duplicada del mateix identificador.

## v0.19.10 — 2026-11-03

- RO-033 / RO-052: els fragments solapats d’una mateixa via es poden reunir en un tauler abans d’estimar-ne el pendent. En retalls remots, una càrrega addicional acotada recupera el traçat i el relleu dels estreps si queden fora de la selecció.
- Millau s’utilitza com a control de continuïtat i estabilitat del perfil en canviar el retall. [Controls i límits](work/RO-033-CONTROLS-PROCEDIMENTALS.md).

## v0.19.9 — 2026-11-03

- RO-051 / RO-052: els perfils suaus reserven tram cartografiat als extrems interiors i l’enllacen amb la superfície de la via. Si no hi cap una transició amb pendent i recolzament admissibles, aquell perfil es manté sobre el terreny.
- Pendent ferroviari comprovat a la malla d’un segon retall real de 400 m, a l’est de la mostra. Resultats i límits al [seguiment de continuïtat](work/RO-052-CONTINUITAT.md).

## v0.19.8 — 2026-11-03

- «Projecte nou» ara és un botó sobre Territori. El tirador del mapa és un cercle i el compàs recupera el nord.
- RO-051: opció experimental a Vies per arrodonir els canvis de pendent de les carreteres principals i estimar pendents ferroviàries entre extrems. Els perfils amb suport o encaixos invàlids recuperen la representació sobre el terreny.
- RO-052: els enllaços conserven el centre i les vores de la calçada quan alguns punts transversals coincideixen en convertir les coordenades de la malla.

## v0.19.7 — 2026-11-03

- El Catastre omet només els identificadors contradictoris i en registra el recompte i els identificadors. La resta d'edificis es conserva.
- La maqueta mostra el progrés de quatre blocs i una capa provisional d'edificis. L'exportació espera la capa confirmada. Si falla una consulta, es recuperen el model i la font vàlids.

## v0.19.6 — 2026-11-03

- RO-053: botons proporcionals de mida al centre. La tria obre Territori, ara el primer apartat i el punt des d'on es genera la maqueta.
- L'escala arriba a 1:20.000. El selector i el zoom s'aturen abans si la mida, la ubicació o l'orientació del retall esgoten el límit de tessel·les.
- «Projecte nou» al header recupera el selector de mides. La importació de fitxers propis queda ajornada.

## v0.19.5 — 2026-11-03

- RO-053: pantalla inicial estàtica amb «Comença un projecte». La primera generació s'inicia des de Terreny després de confirmar la peça i el territori.
- Territori reuneix els exemples, la cerca, el mapa, l'escala, l'exageració i el detall. Triar un exemple situa el retall al mapa.
- El retall es gira arrossegant el tirador de la cantonada o amb les fletxes del teclat. El botó del mapa recupera el nord. El control d'escala salta entre valors rodons i reflecteix els valors intermedis del zoom.

## v0.19.4 — 2026-11-03

- RO-053: canviar el realç de camins o ferrocarrils, o activar els túnels, reutilitza el camp d'altures, les malles de base i els edificis del retall vigent. El motor recalcula les vies i els encaixos i, quan cal, excava sobre el terreny original.
- L'actualització conserva la càmera i reaplica els traços del pinzell. El navegador rep només les capes amb malla nova.

## v0.19.3 — 2026-11-03

- RO-053: els ajustos de carreteres, ferrocarrils i túnels s'apliquen automàticament quan la maqueta correspon al retall i al terreny seleccionats. La vista es conserva durant el càlcul.
- Les capçaleres del panell dret i la descàrrega queden visibles. Cada apartat té scroll intern. Triar un format al desplegable inicia la descàrrega i el deixa seleccionat per a la propera.
- RO-050: ferrocarrils sense increment d'altura per defecte. Amb vuit materials comparteixen el dels edificis. Amb quatre, edificis, carreteres i ferrocarrils comparteixen un material reassignable.

## v0.19.2 — 2026-11-03

- RO-053: primera integració de l'ordre validat, amb sis apartats i una acció al costat del títol actiu. Es pot tornar directament a qualsevol apartat, i avançar amb teclat manté el focus dins del flux. La generació inicial i els canvis de vies encara treballen sobre el model complet.
- Els traços del pinzell no es descarten mentre s'intenta generar un retall nou. Durant la sessió es recuperen en tornar al mateix retall, gir i mida física. No es reprojecten entre retalls diferents.
- RO-052: el diagnòstic distingeix quan la continuació cartografiada d'un pont surt del retall abans que hi càpiga l'enllaç. Conserva l'avís i recomana ampliar o desplaçar la selecció. No canvia la geometria dels taulers mesurats.

## v0.19.1 — 2026-11-02

- RO-052: corregit el graó del portal en el rectangle girat. El material viari conserva el paviment que ja li pertany, evitant un retall i una reunió redundants sobre cares gairebé coplanàries. Comprovació de les cotes reals al model i al 3MF Bambu, sense relaxar toleràncies.
- Enllaços de pont amb vores calculades als vèrtexs reals del revolt i espai suficient dins del tauler per al primer angle. S'eviten seccions plegades detectades en quatre controls reals, conservant el traçat i els XYZ mesurats. Identificadors absents de portals serialitzats com a llista buida.
- 377 proves ordinàries i sis proves integrades de ponts/túnels verificades. Regenerats dos controls reals de Rajadell, quadrat i rectangle girat, amb túnel i auditoria sense errors. Al quadrat continuen dos extrems sense enllaç suau; RO-052 continua obert per a aquests casos i per al laminat/impressió.
- RO-053: proposta navegable independent a `prototypes/ro053/`: Peça → Territori → Terreny → Vegetació → Vies → Edificis, dependències, retorn, errors i conservació de traços. 36 comprovacions i revisió visual en dues mides d'escriptori. Demostració il·lustrativa per revisar; la UI productiva encara no adopta aquest flux.

## v0.19.0 — 2026-11-02 · ENTREGA PARCIAL

Tancament per canvi d'ordinador, demanat per l'usuari. Compilació correcta; **12/13 proves curtes finals**, amb un graó pendent al portal del rectangle girat. La passada ordinària anterior de 370 casos és prèvia al darrer refinament. No es dona RO-052 per resolt. Vegeu `work/REPRESA-RO-052.md`.

- RO-052: política comuna d'amplada de calçada per a superfície, ponts procedimentals i paviment de túnels; amplada explícita, carrils i classe amb un mínim físic compartit. Les obertures dels túnels i els contorns estructurals mesurats es conserven separats.
- Connexions escollides per identitat i extrems del traçat; passada final d'encaix amb les cotes del segment real connectat, sense saltar a ponts que només es creuen amb la carretera. Transicions d'amplada suaus als taulers mesurats i conservació del primer revolt de l'enllaç.
- Boques amb paviment i excavació coincidents a les dues vores, també amb pendent transversal; ruta cartogràfica quan hi ha dades compatibles i alternativa estimada identificada. Petjades reals dels revolts per comprovar interseccions amb aigua.
- Marc exterior retirat del sidebar dret i ajornat per petició de l'usuari; configuració, preview i botó de descàrrega fora de la UI, amb mòduls i proves geomètriques conservats per a més endavant.
- Regressions de calçada contínua en una cadena superfície/pont/túnel, també al 3MF, i en retall rectangular girat. Seguiment i límits a `work/RO-052-CONTINUITAT.md` i al backlog; validació d'usuari, laminat i impressió continuen separades.

## v0.18.2 — 2026-11-02

- RO-051: màscares d’obstacles dels pilars calculades sota demanda i reutilitzades. El control local de 3 km / 150 mm / detall 12 passa de 189,274 a 56,638 s (70,1% menys), amb 2 unions en lloc de 14 i els mateixos resums de perfils, omissions, pilars i llums. Sense paral·lelitzar ni canviar operands o precisió de les unions.
- Prototip viari encara desactivat per defecte i sense selector a la UI. El cas d’1,5 km / detall 12 conserva una recuperació preexistent per component de volum nul; pendent d’aïllar i corregir abans d’activar-lo. Màscares multipart i validació d’usuari/laminador/impressió també pendents.
- Dos controls 3MF disponibles a `public/controls/ro-051/`: retall de 3 km sense túnels ni arbres, i Rajadell amb ICGC/túnels i sense arbres. Són models de revisió, no una garantia d’impressió. Mesures i reproducció a `work/RO-051-RENDIMENT.md`; seguiment al backlog.
- 344 proves locals correctes, incloent càlcul diferit, reutilització en editar edificis, regressions de ponts i túnels, i compilació local correcta. Fixture de format numèric amb idioma real per evitar dependència de la configuració del sistema, sense canviar el nucli d’idiomes.

## v0.18.1 — 2026-11-02

- RO-034: túnels estimats activats inicialment, parets i sostre parabòlic, i paviment de 0,3 mm de material camí o ferrocarril. Excavació i assignació de material en una transacció de sòlids, sense conversions intermèdies ni pèrdua de closques interiors.
- RO-051: prototip d'envolupant superior amb calçades planes i suports estimats, mantenint el DEM i el camp de relleu. **Desactivat per defecte i sense opció a la UI**: el retall de 3 km necessita optimització abans d'activar-lo. La publicació manté el tractament anterior dels camins.
- Obstacles limitats al retall físic, també girat, conservant els ancoratges complets del perfil. Comprovacions de llum entre plataformes amb el realç ferroviari inclòs. Correcció de fragments exactament col·lapsats, sense eliminar volums petits positius.
- Rajadell: túnel principal excavat i viaducte amb onze pilars al control local. El prototip explícit també aplica quatre perfils viaris al retall inicial, però la prova ampliada es va interrompre per durada excessiva. Estat i diagnòstic reproduïble a `work/REPRESA.md`. Laminat i impressió pendents.

## v0.18.0 — 2026-11-02

- RO-050: ferrocarrils com a capa pròpia, amb increment de 0, +0,5 o +1 mm sobre els camins. Materials independents sense exigir un novè filament; compatibilitat amb assignacions anteriors. Plataformes i ponts respecten la cota inferior i els suports; vies subterrànies no es dibuixen a la superfície.
- RO-034: revisió dels portals contra la superfície real de la maqueta i processament acotat de les capes que poden intersectar l’obertura. El perfil continua estimat i l’opció experimental, amb límits i omissions explícits.
- RO-032: font «OpenStreetMap · cobertes i parts» sota demanda, que conserva geometries i atributs originals. Més formes paramètriques quan les dades les descriuen, incloent una mostra real de la Torre Glòries. El mode limitat continua pla. Sense dades suficients es conserva una coberta plana, amb procedència i avisos.
- Backlog: ferrocarrils registrats com RO-050; cobertes/singulars passen a P1. Anotacions de túnels i artefactes de materials preservades, sense atribuir encara aquests últims al laminador.

## v0.17.0 — 2026-11-02

- RO-033: cos de pilar imprimible amb cap adaptat al tauler quan es redueix l'escala. Espaiat acotat en mil·límetres de maqueta, suports auxiliars quan cal i diagnòstic dels trams sense suport segur; es conserven les comprovacions d'obstacles.
- RO-034: opció experimental explícita de túnels estimats a partir dels extrems DEM. Excavació real de substrat i capes de terra abans d'afegir ponts/edificis, amb protecció de la base i retorn atòmic davant errors. No són seccions ni cotes mesurades.
- Límit pendent de RO-034: la mostra de control passa amb detall ràpid, però hi ha omissions segons el detall i les dades remotes. No es presenta la generalització dels portals com a resolta.
- RO-014/016/046: marc negre fix sense selector de color; plaques retirades del menú i ajornades; triar un lloc recomanat carrega directament l'exemple.
- Backlog reorganitzat amb anotacions originals preservades. RO-040 s'arxiva amb l'abast de validació limitat declarat; RO-048 i RO-049 validats. Laminat i impressió continuen oberts a RO-024.

## v0.16.0 — 2026-11-02

- RO-033: generació procedimental de taulers a partir de trams OSM marcats com a pont, amb perfil estimat entre les cotes DEM dels extrems. Pilars, evitació d'obstacles i connexions al mateix flux de geometria i exportació.
- Unió de fragments contigus, deduplicació per grup i límits explícits de processament. Les cotes estimades consten als avisos i a la procedència; `layer` no es converteix en metres.
- Rajadell manté la font específica quan el retall hi intersecta; el generador evita duplicar aquests taulers. Sense una excepció, funciona amb les dades de la regió.
- Continuen pendents el contrast en altres ubicacions reals, la validació del laminador i la impressió; els perfils DEM són una aproximació.

## v0.15.1 — 2026-11-02

- Punt estable parcial: els detalls de Rajadell es carreguen per la ubicació del retall, també en generar una regió fora de la mostra inicial. Ampliar, reduir o desplaçar el mapa conserva les superfícies i el repartiment documentat mentre l’estructura interseca la peça.
- Excepció geogràfica petita, memòria cau compartida amb reintent després d’errors i sense consultes a altres regions. La generalització de taulers procedimentals continua en curs; aquest punt no la declara acabada.
- Regressions locals de càrrega, zoom/desplaçament, errors i edificis, i construcció estàtica. Sense comprovació remota.

## v0.15.0 — 2026-11-02

- Pilars simplificats sota els taulers, incrustats al terreny i units al pont. Petjades amb marge contra camins i edificis carregats; recalculades en canviar de font d’edificis sense reconstruir el relleu.
- Prolongacions sobre la continuació cartografiada de la carretera, amb transició suau de cota i amplada fins al terreny. Viaducte principal de Manresa: onze pilars segons el projecte i dues connexions; un únic component connectat. Geometria estimada, sense atribuir-la a aixecaments de pilars o estreps.
- Camins amb realç opcional de 0,5 o 1 mm, també al paviment dels taulers i enllaços; arran de terreny per defecte. Canviar el realç conserva l’enquadrament.
- 222 proves locals i construcció estàtica. Comprovacions de geometria, obstacles, actualització incremental i model de 40 cm; navegador i 3MF revisats localment. Laminat i impressió pendents. Sense comprovació remota de Pages/CI.

## v0.14.0 — 2026-11-02

- Mostra de Manresa amb quatre superfícies de pont de l’IFC ICGC, inclòs el viaducte: cotes pròpies, gruix imprimible de 0,6 mm, espai inferior i conservació en edicions de capes i exportació. Sense pilars mesurats ni font 3D automàtica fora de la mostra.
- RO-034: dades de túnel examinades; traçat 2D disponible però cotes i secció insuficients. Fonaments numèrics provats; no es perfora el relleu amb dades inventades.
- DESIGN.md obligatori a AGENTS.md: components, tipografia, colors, layout, accessibilitat i revisió visual dels encàrrecs. Tokens compartits sense redissenyar la UI.
- 217 proves locals, construcció estàtica i revisió de navegador/3MF. Validació d’usuari, suports i laminat pendents. Sense comprovació remota de Pages/CI.

## v0.13.1 — 2026-11-02

- Base relativa: el punt més baix del relleu queda a 5 mm de la cara inferior. Es resta l’altitud mínima de la graella visible i es conserven desnivells i exageració; totes les capes comparteixen la referència vertical. A la costa, el mar queda a 5 mm.
- Origen en metres i base en mil·límetres registrats a la procedència, sense alterar dades originals ni datum vertical. Regió real de Manresa: relleu entre 5 i 24,76 mm.
- 211 proves locals, comprovació numèrica de les dues mostres i construcció estàtica. Sense comprovació remota de Pages/CI.

## v0.13.0 — 2026-11-02

- Catastre: diagnòstic real de `Area of extension out of limits` a la vista inicial de Tamariu. Consulta per quadrants davant límits reconeguts, amb concurrència i recursió acotades, deduplicació i rebuig de resultats parcials. La consulta real recupera 2.447 volums sobre rasant.
- Canvis d’edificis fallits recuperen font/mode/altura vàlids i deixen disponible el model anterior. Una regió nova pot usar una altra font amb avís i procedència explícits; capes candidates confirmades després del Worker.
- Sidebars: textos, camps, resums i desplegables homogenis i discrets. Marc configurat i previsualitzat des del mateix apartat, amb geometria/mides/color compartits amb l’exportació i sense canviar el zoom.
- Catàleg de llocs recomanats: el viaducte de l’Eix Diagonal (41.71792, 1.78391) és l’inici, amb dades incloses; Tamariu es conserva com a badia. Títols curts per a les plaques inicials. Ponts i túnels reals continuen pendents; inventari inicial de fragments 2D documentat.
- Rosa dels vents ajornada per petició de l’usuari i fletxa retirada del menú. RO-041–043 validats passen a l’historial; notes del marc conservades. Precàrrega de fonts alternatives anotada com a proposta futura.

209 proves locals i construcció estàtica correctes. Comprovació de navegador sota subdirectori de Pages, incloent recuperació de font i catàleg. Sense validació remota de Pages/CI.

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
