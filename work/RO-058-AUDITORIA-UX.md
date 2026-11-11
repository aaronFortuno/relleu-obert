# RO-058 · Auditoria del taller

Revisió de la v0.23.51. Contrast entre una revisió independent de la implementació i comprovacions locals a 1280 × 720 i 390 × 844. Inclou el flux inicial, l’obertura d’un exemple de galeria i la preparació per imprimir. És una inspecció experta. La prova amb persones que encara no coneixen l’aplicació queda com a criteri d’acceptació de la v0.24.

## Incidències

| Prioritat | Troballa | Correcció i criteri d’acceptació |
| --- | --- | --- |
| P1 | **«Dibuixa» fa dues feines incompatibles.** El pinzell anomenat «Edició de senders» completa la cartografia, però envia els traços a la capa taronja. El GPX apareix en un altre bloc i només es pot substituir o treure. «Mostra els senders» condiciona el dibuix manual. [Controls](../index.html#L79) · [Motor](../src/geometry.js#L872) · [Fitxer GPX](../src/main.js#L1155) | Separar **Edita senders** (blanc), **Dibuixa una ruta** (taronja) i **Importa GPX** (taronja). Un sender nou, una ruta dibuixada i un GPX han de poder coexistir. La goma i el desfer han d’actuar sobre l’edició activa. Eliminar el GPX ha de conservar la ruta dibuixada. |
| P1 | **Els forats estan amagats i el mode d’edició es perd de vista.** A 1280 × 720 el títol apareix a y=534 i el cos visible d’«Impressió» acaba a y=492. Amb teclat, Esc manté «Marca un forat» activat i la superfície de selecció no és tabulable. A 390 px, passar d’«Exporta» a «Visor» manté l’eina activa amb el botó ocult. Els anells del visor són idèntics, mentre que les files es renumeren en esborrar. [Ubicació](../index.html#L202) · [Mode mòbil](../src/main.js#L135) · [Llista i selecció](../src/main.js#L1633) | Donar un accés visible a **Forats** des del visor. Mostrar «Afegeix un forat», l’estat actiu i «Fet» a prop de la maqueta. Fer que Esc surti del mode. Vincular cada fila amb una marca numerada estable i mostrar-la en seleccionar la fila. Permetre modificar profunditat i desfer una retirada. Oferir també entrada per coordenades per col·locar un punt amb teclat. |
| P1 | **Obrir un altre projecte pot descartar la feina en curs.** «Projecte nou» i obrir un projecte desat recarreguen la pàgina. Obrir un exemple aplica ajustos i genera directament, però pot arrossegar el GPX i les xinxetes de la maqueta anterior. [Projecte nou](../src/main.js#L1303) · [Desats](../src/main.js#L1797) · [Exemples](../src/main.js#L1227) | Si hi ha canvis pendents de desar, oferir **Desa i continua**, **Descarta** o **Cancel·la** en obrir un altre projecte. Identificar què es conserva en ajustar el retall del mateix projecte. En un exemple nou, inicialitzar les anotacions per al nou projecte. |
| P1 | **La recuperació d’errors arriba massa tard.** Un forat pot bloquejar l’exportació perquè el suport es valida amb el sòlid final. Els forats fora del retall es poden ometre sense una indicació a la llista. Un GPX fora del retall pot mostrar el nom de fitxer al control, amb l’avís reservat a «Dades i limitacions», apartat ocult al mòbil. [Validació de forats](../src/worker.js#L16) · [Retall](../src/relief-pin-placement.js#L23) · [Avís GPX](../src/geometry.js#L947) | Identificar la marca problemàtica i el motiu al mateix panell. Revalidar la posició quan canvien els talls o la base. Fer visible «El GPX és fora del retall» al costat del fitxer i mostrar també els errors d’exportació prop del botó de descàrrega. |
| P2 | **La mateixa tasca obliga a buscar en contextos diferents.** La mida inicial és al centre, l’edició de mida a «La teva maqueta», els talls i la base a «Impressió» i els materials en un tercer apartat. Les accions d’edició, els noms d’apartats i els botons de navegació entre passos competeixen. En Relleu pur, «Senders i límits» acumula tres tasques diferents. [Taller](../index.html#L28) · [Accions](../src/main.js#L1384) · [Panell dret](../index.html#L177) | Ordenar els controls per objectiu. Distingir quan es canvia el territori, quan es configura una capa i quan s’edita una marca al visor. Posar mida, base, peces, materials i descàrrega sota una mateixa responsabilitat. |
| P2 | **Mòbil manté visible el model, però reparteix malament algunes opcions.** A 390 px les tres capçaleres de Relleu pur caben amb amplades 134, 134 i 90 px. En sortir d’«Ajustos» es desactiva el pinzell, mentre que sortir d’«Exporta» pot deixar el mode de forats actiu. [Graella](../src/mobile-workshop.css#L58) · [Transicions](../src/main.js#L135) | Donar el mateix espai a les tres capçaleres, o permetre dues files si cal, i usar el mateix patró de mode actiu i sortida per a totes les eines. Comprovar amplades estretes i textos llargs dels idiomes. |
| P2 | **Algunes accions tenen un resultat inesperat o depenen d’un gest.** «Formats de descàrrega» canvia el format i descarrega en una acció. Els talls ja es poden moure amb teclat, però falta una alternativa de toc simple al gest d’arrossegar. [Descàrrega](../src/main.js#L1523) · [Talls](../src/print-cut-editor.js#L94) | Mantenir la descàrrega immediata i anomenar les opcions «Descarrega en…». Oferir botons de pas o un camp numèric per al tall seleccionat com a alternativa a arrossegar. |

## Distribució proposada

| Responsabilitat | Controls |
| --- | --- |
| **Territori** | Lloc, mapa, retall, escala, orientació, mode, detall i generació. |
| **Capes** | Aigua, vegetació, fronteres i senders cartografiats. Vies i edificis quan pertoqui segons el mode. |
| **Eines del visor** | Edita senders, dibuixa una ruta, importa GPX i gestiona forats. Un mateix patró per entrar, veure el mode actiu, desfer i sortir. |
| **Impressió** | Mida, gruix de la base, peces, materials i formats. Descàrrega sempre a mà. |

«Dades i limitacions» queda com a referència tècnica. Cada problema que es pugui corregir s’ha de mostrar també al control que l’ha causat.

En escriptori, **Territori** i **Capes** ocupen l’esquerra. Les eines s’obren des de la barra del visor i el control actiu hi queda visible mentre s’edita. A la dreta, **Impressió** concentra la preparació de la peça. En mòbil, **Ajustos** agrupa Territori i Capes, **Visor** mostra les eines i **Exporta** agrupa Impressió. Els panells han de deixar espai per veure i tocar la maqueta.

En Model complet, si una eina només està disponible en Relleu pur, indicar-ho al punt d’accés. El canvi de mode requereix una acció explícita perquè afecta tot el model.

## Ordre de treball

1. **Recuperar l’edició de senders i donar una eina pròpia a les rutes.** Conservar els traços desats com a correccions de sender. Els projectes existents fan servir el mateix camp per a tots els traços manuals i no permeten deduir la intenció amb què es van dibuixar. El GPX conserva el seu camp i la nova ruta manual en tindrà un de propi. Provar els tres elements junts, el desfer, la retirada individual, la còpia de projecte i els talls.
2. **Fer visibles i recuperables les marques.** Provar col·locació i retirada de dos forats, també amb teclat, i la recuperació d’un punt sobre un tall o amb una base prima. La marca del visor i l’entrada de la llista han de mantenir la mateixa identitat.
3. **Reordenar i validar el taller.** Fer passar a una persona nova pels tres recorreguts descrits més avall. Cal que pugui trobar els controls, recuperar-se d’un error i saber quina maqueta es descarregarà sense ajuda externa. Fer servir una maqueta dividida en la prova d’impressió.

## Comprovacions locals

- **Des de zero.** Peça de 10 × 10 cm, coordenades de la Cerdanya, Relleu pur i generació amb teclat. El focus arriba a «Territori» després de triar la mida i el visor anuncia la càrrega.
- **Galeria i adaptació.** La cerca rep el focus i filtra els exemples. S’ha obert «Penya-segats de Zumaia» en Model complet i s’ha canviat a impressió monocroma. La descàrrega continua disponible. El control de pèrdua d’ajustos en canviar de projecte s’ha revisat a la implementació.
- **Impressió.** Dues columnes en una peça de 10 cm. Fletxa dreta desplaça el tall de 50 a 51 mm i Supr el torna a 50. Esc tanca el menú de formats i retorna el focus. S’han inspeccionat els errors de perforació i l’exportació a la implementació.

## Criteris de referència

- Visibilitat de l’estat, reconeixement d’accions, prevenció d’errors i control de l’usuari. [Heurístiques d’usabilitat de Nielsen Norman Group](https://www.nngroup.com/articles/ten-usability-heuristics/)
- Accions operables amb teclat, alternativa de punter simple als gestos d’arrossegar, mida de les dianes i anuncis d’estat. [WCAG 2.2 · W3C](https://www.w3.org/TR/WCAG22/)
