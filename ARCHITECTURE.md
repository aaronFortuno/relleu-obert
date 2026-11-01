# Arquitectura proposada

## Decisió: projecte separat

Terrology és un motor Python amb FastAPI, processos i dependències natives. Un fork mantenint la seva arquitectura no satisfaria l’objectiu d’allotjament complet a GitHub Pages. Relleu Obert utilitza una base nova en JavaScript. S’aprofita el coneixement adquirit revisant Terrology, sense copiar-ne codi.

## Flux actual

Des de v0.8, els candidats de vegetació es recorren completament i es retenen amb mostreig determinista de reservori, sense tallar les últimes files. El pressupost de 12.000 arbres es comparteix amb el pinzell: primer es conserven els arbres manuals i es mostreja la resta d’automàtics. Quan els manuals superen el pressupost, es conserven els més recents amb avís. La procedència registra candidats, arbres de cada origen i reduccions. La memòria cau del context del Worker reutilitza els candidats i l’estat aleatori amb la mateixa densitat automàtica/forma. La densitat visible és només del pinzell, no inicia un càlcul i es desa a cada traç.

Des de v0.7, la interfície agrupa lloc/orientació, mida/escala, relleu/edificis i vegetació; materials i assignacions queden junts al sidebar dret. `parseScaleInput` interpreta el camp únic d’escala; buit segueix el mapa. `region-limits.js` comparteix amb el carregador el recompte de tessel·les vectorials a zoom 14 i el pressupost de 16. La selecció es prevalida abans de generar; una cerca sobre el denominador dona un límit aproximat segons centre, mida i gir. No es canvia el zoom de dades ni s’amplia aquest pressupost.

`tree-scale.js` converteix una capçada procedimental orientativa de 12 m a mil·límetres amb l’escala horitzontal comuna, sense exageració vertical. Manté variacions deterministes i una separació mínima per limitar el nombre de candidats. Si el diàmetre nominal és inferior a 0,25 mm s’ometen les capçades, incloses les del pinzell, amb avís i procedència explícita; la capa de bosc es conserva. Aquest llindar és una política de representació i no una garantia per a tots els broquets. No s’han incorporat mesures reals d’arbres.

Des de v0.6, `selectionPose` conserva centre, amplada/alçada reals, gir horari, cantonades i envolupant. La càrrega de fonts utilitza l’envolupant; `makeProjection` aplica la transformació inversa comuna al retall físic. La triangulació i els retalls de capes continuen en mil·límetres locals. La selecció es conserva durant els canvis de mida del mapa i l’obertura/tancament del panell; reobrir-lo no equival a seleccionar un altre territori.

`local-import.js` es carrega sota demanda al Worker i valida GeoTIFF amb geotiff.js i GeoJSON. `local-raster.js` aplica la transformació afí del ràster (incloent PixelIsArea/Point i matrius girades) i la reprojecció amb Proj4js; el mostreig bilineal exigeix cobertura i dades vàlides. No hi ha lectura de canvas; només s’accepten compressions TIFF numèriques sense pèrdua. No s’ajusten datum vertical, geoide ni altures de DSM a terreny nu: l’usuari ha d’aportar un MDT adequat. EPSG:4258 s’aproxima a WGS84 i les definicions UTM ETRS89 utilitzen GRS80 sense correccions de datum d’alta precisió.

La importació local evita descarregar DEM global i substitueix explícitament la capa d’edificis quan hi ha GeoJSON; no introdueix encara una política de fusió de proveïdors. Des de v0.8 l’exportació no escriu tipus de filament ni broquet: aquests ajustos corresponen al laminador. El dialecte Bambu conserva colors, parts i assignacions d’extrusor. No es generen perfils de màquina ni G-code. El marc visual és un grup Three.js fora del grup de malles semàntiques i mai es passa al Worker.

La compilació utilitza Workers ES modules per permetre descodificadors TIFF carregats sota demanda; `vite.config.js` fixa `worker.format: 'es'`. En aquest entorn Windows s’ha construït amb `--configLoader native` per evitar l’accés als directoris superiors que intenta el carregador de configuració d’esbuild; el resultat continua sent estàtic.

1. El navegador llegeix una mostra estàtica o descarrega tessel·les directament de fonts públiques.
2. Decodifica MVT i Terrarium i projecta la regió en un sistema mètric local.
3. Envia les dades al Web Worker.
4. El motor reconstrueix els polígons d’aigua i vegetació i els buffers de camins. Retalla els límits vectorials contra una triangulació regular, de manera que la costa passa per les coordenades del vector.
5. Afegeix volums d’edificis i arbres procedimentals. Cada material té coordenades compartides en mil·límetres.
6. Three.js mostra el mateix conjunt de malles utilitzat per exportar.
7. El Worker crea el ZIP STL o l’arxiu 3MF a la memòria del dispositiu. No hi ha crides a un servei de generació.

## Mòduls

Des de v0.5, la selecció admet escala horitzontal fixa. L’extensió es calcula amb `scaledBBox` a partir de centre, mil·límetres físics i denominador; comparteix la mètrica local (111.320 m/grau i cosinus de latitud) amb la projecció. No és una escala geodèsica cadastral. Les proves exigeixen error inferior a 0,000001 mm a les cantonades projectades i 0,000001 al denominador per als casos de control. Les coordenades de malla es quantitzen posteriorment a 0,0001 mm. El Worker rebutja retalls que divergeixin de l’escala demanada més d’una part per milió. L’escala sol·licitada es conserva en la procedència i al model; la partició de peces no reescala les geometries.

El zoom en mode fix només canvia el context visible del mapa; el marc es projecta des del retall geogràfic fix i pot sortir de la vista si s’amplia molt. Canviar mida/escala torna a enquadrar-lo. L’acordió pot amagar el mapa: es conserva la selecció, es notifica igualment el nou retall i s’ajorna l’enquadrament fins que torna a ser visible. Els errors d’escala bloquegen generació i exportació. La mostra local restaura el mode lliure per evitar usar dades fora de la seva cobertura.

- `src/sources.js`: lectura de dades; ha d’evolucionar cap a adaptadors independents de proveïdor.
- `src/geometry.js`: escala, partició de capes, mostreig d’elevació i construcció de volums.
- `src/dem-decoder.js`, `src/dem-browser.js` i `src/terrarium.js`: descodificació binària WebP/PNG i conversió RGB numèrica, separades del DOM i del preview. El WASM s’inclou com a asset estàtic i es carrega quan cal llegir elevacions.
- `src/worker.js`: càlcul i exportació en segon pla.
- `src/export.js`: fitxers estàndard amb procedència, unitats i materials.
- `src/main.js`: controls i previsualització.
- `src/place-map.js` i `src/selection.js`: mapa Leaflet, cerca Photon, coordenades, proporcions i pla de peces.
- `src/materials.js`: vuit categories semàntiques, paletes i agrupació de geometries segons els materials disponibles.
- `src/mesh-tiles.js`: retalls de sòlids amb Manifold/WASM, tancament de talls i exportació del conjunt de peces.

Des de v0.3, el Worker conserva el terreny, els edificis i el camp d’altitud en un context privat. Els canvis de vegetació només regeneren les capçades i el preview conserva els buffers de les altres capes. Els canvis de material només actualitzen l’aparença; l’agrupació física es fa en exportar. Els canvis de regió, mida, detall o exageració requereixen generar de nou i bloquegen l’exportació del model anterior.

`src/polygon-index.js` accelera les comprovacions d’ancoratge de la vegetació amb una graella de polígons i bandes d’arestes. Manté el test vectorial exacte; no rasteritza ni simplifica els límits.

Des de v0.4.2, els fitxers d’altitud no es llegeixen amb `getImageData`: una petita alteració dels canals RGB pot representar centenars de metres. WebP es descodifica amb libwebp/WASM i PNG amb fast-png, sense fer servir el canvas. El preview continua utilitzant WebGL, però no determina les altituds. Els hashes dels fitxers font i els rangs descodificats queden a la procedència. L’informe [RO-001](work/RO-001-DIAGNOSTIC.md) distingeix la prova de corrupció simulada de la validació encara pendent a Brave.

## Línies tècniques de referència

Les prioritats operatives, els estats i les comprovacions pendents es mantenen a [work/BACKLOG.md](work/BACKLOG.md). Aquesta secció conserva el context tècnic de les línies, no una segona llista d’estats. La validació de quatre materials a Bambu està registrada a RO-021; la de malles i impressió física es porta a RO-024.

Actualització v0.2: ja hi ha adaptador d’edificacions ICGC, fonts alternatives de relleu, reconstrucció d’altituds invàlides, densitat i variació de capçades i un camp triangular d’altitud compartit amb la vegetació. Es manté pendent l’adaptador de MDT ICGC/GeoTIFF i la validació booleana/laminat de tots els volums.

1. **Validació d’impressió:** eliminar encavalcaments i superfícies internes amb un motor booleà robust en WebAssembly; verificar malles tancades i orientació, laminat i impressió física. La importació de quatre materials amb colors correctes ja ha estat confirmada per l’usuari. Comparar amb la mateixa extensió exacta que l’exemple de l’usuari.
2. **Relleu de Catalunya:** adaptador de GeoTIFF/COG i projeccions amb dades ICGC. WMS ombrejat és una imatge de visualització i no s’ha d’utilitzar com a elevació numèrica.
3. **Font vectorial de precisió:** dades originals OSM o cartografia oficial, costa ben polygonitzada, toleràncies en mil·límetres i tractament de límits de tessel·la. La primera prova usa polígons d’aigua ja processats d’OpenFreeMap per evitar heurístiques de costat de costa.
4. **Vegetació mesurada:** permetre posicions individuals cartografiades i, més endavant, detecció de capçades amb LiDAR o dades equivalents. Mantenir sempre visible si els arbres són mesurats o procedimentals.
5. **Experiència d’aula:** ampliar el mapa i cercador ja disponibles amb presets de relleu/paisatge/ciutat, marques tàctils, nord, escala i una fitxa de fonts. Memòria cau local amb límits i possibilitat d’importar dades per funcionar sense connexió.

## Limitacions de disseny

Des de v0.4, `src/roads.js` uneix buffers de segments amb discs del mateix radi als revolts i extrems. `src/building-options.js` explicita el límit de 5 m per defecte i les alternatives de petjada, font i absència. Des de v0.4.1, tant el mode limitat com el de la font tenen una única coberta horitzontal per petjada: cota màxima del terreny retallat sota l’edifici més l’altura representada. El màxim inclou els vèrtexs dels talls del terreny dins de la petjada, no només el perímetre original. La base queda incrustada al terreny; al costat baix es veu més façana. L’altura afegida conserva l’escala geogràfica, sense exageració vertical ni mínim artificial de 0,6 mm.

Les teulades reals requereixen dades addicionals de cobertes o malles 3D. Per a paisatges històrics caldran fonts datades compatibles de cartografia i relleu: ocultar construccions actuals no equival a reconstruir un any anterior. Ambdues línies queden per a fases posteriors.

No es promet un bessó digital exacte. Les alçàries i els arbres poden ser estimacions; les fonts i les transformacions han de quedar al fitxer exportat. Caldrà adaptar el detall al broquet i a l’escala sense eliminar capes silenciosament. Una capa absent ha de tenir una explicació visible.

El navegador té un pressupost finit de memòria. Àrees grans requeriran reducció de detall o divisió en peces. Les credencials privades de proveïdors no poden quedar en un bundle públic: s’han de prioritzar fonts sense secrets, importació local o claus aportades voluntàriament per l’usuari.
