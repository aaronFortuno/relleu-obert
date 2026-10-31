# Arquitectura proposada

## Decisió: projecte separat

Terrology és un motor Python amb FastAPI, processos i dependències natives. Un fork mantenint la seva arquitectura no satisfaria l’objectiu d’allotjament complet a GitHub Pages. Relleu Obert utilitza una base nova en JavaScript. S’aprofita el coneixement adquirit revisant Terrology, sense copiar-ne codi.

## Flux actual

1. El navegador llegeix una mostra estàtica o descarrega tessel·les directament de fonts públiques.
2. Decodifica MVT i Terrarium i projecta la regió en un sistema mètric local.
3. Envia les dades al Web Worker.
4. El motor reconstrueix els polígons d’aigua i vegetació i els buffers de camins. Retalla els límits vectorials contra una triangulació regular, de manera que la costa passa per les coordenades del vector.
5. Afegeix volums d’edificis i arbres procedimentals. Cada material té coordenades compartides en mil·límetres.
6. Three.js mostra el mateix conjunt de malles utilitzat per exportar.
7. El Worker crea el ZIP STL o l’arxiu 3MF a la memòria del dispositiu. No hi ha crides a un servei de generació.

## Mòduls

- `src/sources.js`: lectura de dades; ha d’evolucionar cap a adaptadors independents de proveïdor.
- `src/geometry.js`: escala, partició de capes, mostreig d’elevació i construcció de volums.
- `src/worker.js`: càlcul i exportació en segon pla.
- `src/export.js`: fitxers estàndard amb procedència, unitats i materials.
- `src/main.js`: controls i previsualització.

## Prioritats següents

1. **Validació d’impressió:** eliminar encavalcaments i superfícies internes amb un motor booleà robust en WebAssembly; verificar malles tancades i orientació; importar i laminar les quatre parts en Bambu Studio. Comparar amb la mateixa extensió exacta que l’exemple de l’usuari.
2. **Relleu de Catalunya:** adaptador de GeoTIFF/COG i projeccions amb dades ICGC. WMS ombrejat és una imatge de visualització i no s’ha d’utilitzar com a elevació numèrica.
3. **Font vectorial de precisió:** dades originals OSM o cartografia oficial, costa ben polygonitzada, toleràncies en mil·límetres i tractament de límits de tessel·la. La primera prova usa polígons d’aigua ja processats d’OpenFreeMap per evitar heurístiques de costat de costa.
4. **Vegetació mesurada:** permetre posicions individuals cartografiades i, més endavant, detecció de capçades amb LiDAR o dades equivalents. Mantenir sempre visible si els arbres són mesurats o procedimentals.
5. **Experiència d’aula:** mapa per seleccionar regió, cercador, presets de relleu/paisatge/ciutat, marques tàctils, nord, escala i una fitxa de fonts. Memòria cau local amb límits i possibilitat d’importar dades per funcionar sense connexió.

## Limitacions de disseny

No es promet un bessó digital exacte. Les alçàries i els arbres poden ser estimacions; les fonts i les transformacions han de quedar al fitxer exportat. Caldrà adaptar el detall al broquet i a l’escala sense eliminar capes silenciosament. Una capa absent ha de tenir una explicació visible.

El navegador té un pressupost finit de memòria. Àrees grans requeriran reducció de detall o divisió en peces. Les credencials privades de proveïdors no poden quedar en un bundle públic: s’han de prioritzar fonts sense secrets, importació local o claus aportades voluntàriament per l’usuari.
