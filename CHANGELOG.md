# Canvis

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
