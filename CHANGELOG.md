# Canvis

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
