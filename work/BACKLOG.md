# Backlog actiu de Relleu Obert

Revisat el **2026-11-11** amb la v0.23.53. [Historial i validacions](arxiu/HISTORIAL.md) · [Ajornaments i idees](arxiu/AJORNATS.md) · [Criteri d’arxiu](README.md)

## Ordre de treball

1. Validar el perfil ferroviari en un retall amb passos a nivell i en un segon amb un pont o túnel. [RO-050](#ro-050--ferrocarrils-diferenciats)
2. Preparar les cinc boques del primer lot de coves i balmes. [RO-035](#ro-035--cavitats-i-relleus-amb-voladissos)
3. Continuar la revisió de la galeria per blocs. [RO-046](#ro-046--catàleg-de-llocs-recomanats)
4. Contrastar la Foradada r3 al visor i reprendre els controls de relleu rocós. [RO-035](#ro-035--cavitats-i-relleus-amb-voladissos) · [RO-023](#ro-023--relleu-local-i-fonts-vectorials-de-més-precisió)

## Desenvolupament i proves

### RO-046 — Catàleg de llocs recomanats

El Pont Vell de Besalú passa les proves locals amb els edificis ICGC, dos retalls complets i un de parcial. Queden la revisió de l’usuari i el laminat dels arcs. [Validació](arxiu/HISTORIAL.md#v02345--torres-de-pont-a-la-capa-icgc)

**P2.** Continuar per l’Eixample, Girona i Venècia. Revisar els retocs de les Bardenas, Colorado i Lavaredo, i comprovar la llegibilitat, la cota de base i els temps de les fitxes pendents. [Llista de revisió per blocs](RO-046-CATALEG.md#revisió-per-a-maquetes-daula)

### RO-035 — Cavitats i relleus amb voladissos

**P2.** Can Solà està validada al visor per l’usuari. Queda el laminat. El primer lot d’Open Place Models prioritzarà la boca i els primers metres de cinc coves i balmes de Catalunya. Queden també la comparació visual i el laminat de la Foradada r3, i la transformació geogràfica dels Degotalls. [Fonts i controls](RELLEU-ROCOS.md#balma-de-can-solà) · [Cua de modelatge](https://github.com/aaronFortuno/open-place-models/blob/main/CAVITY-QUEUE.md)

Al-Khazneh r1 passa els controls d’encaix locals a 1:500 i 1:1.000 i en un retall parcial. Queden la revisió al visor i el laminat del pòrtic. [Controls d’Al-Khazneh](arxiu/HISTORIAL.md#v02339--al-khazneh-al-cingle)

### RO-023 — Relleu local i fonts vectorials de més precisió

**P2.** Comparar la silueta del Cavall Bernat amb el MET5 i el MDT de detall a igual exageració i dues escales. Comprovar la transició del pedaç al laminador i contrastar el refinament amb un altre retall, com el Pedraforca. [Controls del relleu rocós](RELLEU-ROCOS.md)

### RO-026 — Fidelitat dels edificis i selecció de fonts

**P1.** Comparar petjades i parts d’ICGC, Catastre i OSM en una segona zona i comprovar que es preserven els edificis independents quan la font els distingeix. L’estudi de fonts fora d’Espanya i de GlobalBuildingAtlas queda com a referència. [Comparativa](RO-026-FONTS-EDIFICIS.md)

### RO-032 — Cobertes i volums singulars

**P1.** Revisar al visor els tres volums de Guiza i l’encaix de Mont-Saint-Michel, i comprovar-ne el laminat. [Proves d’ancoratge](arxiu/HISTORIAL.md#v02336--ancoratge-en-terrenys-en-pendent) Per a les cobertes generals, queda identificar una font de geometria 3D consultable des del navegador. El servei de careners documentat és en 2D. [Integració](RO-032-INTEGRACIO.md) · [Estudi de fonts](arxiu/RO-032-DADES-COBERTES.md)

## Validació en ús i seguiment

### RO-050 — Ferrocarrils diferenciats

El Cremallera de Núria incorpora la via oficial de l’ICGC i comparteix cotes entre trams de superfície, ponts i túnels. Queden la revisió al visor de l’usuari i el laminat de les boques. [Controls del Cremallera](arxiu/HISTORIAL.md#v02346--traçat-ferroviari-del-catàleg)

**P1.** La via de superfície té secció transversal plana i una rasant estimada entre extrems, amb tall i reblert. El control de vessant passa amb i sense una carretera transversal i el retall ferroviari del Bages passa la comprovació local de la malla a 400 i 800 m. Queden la validació al visor i al laminador en un pas a nivell i en enllaços amb estructures. [Proves i abast](arxiu/HISTORIAL.md#v02338--rasant-ferroviària-independent)

### RO-024 — Unió de volums i validació d’impressió

**P1.** El filament per peça a Montserrat i les quatre plaques de Tamariu estan validats al laminador. Queden la comprovació dels talls dels Rasos–Gallina Pelada, el pas inferior de Rajadell i les proves d’impressió física. [Resultats i controls](RO-024-RESULTATS.md)

### RO-033 — Ponts i viaductes

**P1.** A l’última revisió visual d’Amsterdam no s’han detectat ponts absents. Queden les llums dels ponts de canal al laminador, el pas de Montgròs en una placa completa i els tirants i les llums del model singular de Millau. Si reapareix una omissió, registrar el retall i l’escala. [Controls de ponts](RO-033-CONTROLS-PROCEDIMENTALS.md)

### RO-034 — Túnels imprimibles

**P1.** Les dues boques del túnel de Sant Salvador a 1:20.000 passen la comprovació de malla. Validar al laminador les boques, la volta i el paviment de l’interior, i repetir el control en un segon retall. [Controls de túnels](RO-034-OBERTURES.md)

Al Guggenheim, el control de malla recupera els dos sentits del pas inferior i el vial de servei. Pendent de revisió visual del conjunt i contrast a la Ronda Litoral o la Ronda de Dalt. [Control de Bilbao](RO-034-OBERTURES.md#pas-inferior-del-guggenheim-v02344)

### RO-051 — Perfils de carreteres principals

**P1.** El retall girat s’ha acceptat provisionalment al laminador. Queden dos enllaços a Sant Salvador i la comprovació de quines irregularitats són visibles en imprimir. Si es corregeix una rasant, contrastar-la en un segon retall o escala. [Perfils i transicions](RO-051-PERFILS-VIARIS.md)

Rasant de la v0.23.41 acceptada provisionalment per l’usuari a l’enllaç de l’Eix Transversal amb la C-37. Queden dos retalls de contrast, la comprovació al laminador i els ramals en una xarxa densa. [Controls i observacions](RO-051-PERFILS-VIARIS.md#rasant-prioritària-amb-tall-i-reblert)

### RO-052 — Continuïtat i amplada del traçat viari

**P1.** Revisar el model complet de l’Hospitalet quan reapareguin discontinuïtats entre ramals i passos a diferent nivell. El cupó del ramal conserva les calçades inferiors i el model complet encara presenta interferències. [Mesures i reproducció](RO-052-CONTINUITAT.md#talls-locals-sota-els-taulers-v02319)

A Lleida, queda corregit el tram de carrer a la vora sud que tornava a seguir el vessant a prop d’un pont de vianants. Pendent de revisió visual de la v0.23.42 amb el retall original. [Control de la Seu Vella](RO-052-CONTINUITAT.md#carrer-a-la-vora-de-la-seu-vella-v02342)

### RO-044 — Catastre per seccions i recuperació de configuracions

**P1.** La càrrega progressiva està validada a Tamariu. Verificar una consulta amb sectors buits, subdivisions i recuperació de la font després d’un error. [Diagnòstic inicial](arxiu/RO-044-CATASTRE-RECUPERACIO.md)

### RO-045 — Coherència visual dels sidebars

**P2.** Validar amb una maqueta carregada que la roda fa zoom sobre el mapa i que permet desplaçar els ajustos inferiors sense canviar el retall. [Comprovació local](arxiu/HISTORIAL.md#v02314--zoom-de-territori-i-enllaços-de-ponts)

La cerca amb fletxes i Retorn, el tancament amb Esc i l’entrada directa de coordenades s’han comprovat al navegador a la v0.23.40.

### RO-019 — Internacionalització

**P2.** Revisar els cinc idiomes en ús i completar els diagnòstics de fonts que encara apareixen en català. [Guia de manteniment](RO-019-SETUP.md)

### RO-054 — Galeria local de projectes

**P2.** Exportar i recuperar en un altre navegador un projecte girat, amb traços i materials, en tots dos modes. El JSON conserva la configuració i permet regenerar la maqueta. [Format i validació](arxiu/HISTORIAL.md#v0237--còpia-del-catàleg-local)

### RO-055 — Mode de relleu pur

**P2.** Laminar els talls adjacents dels Rasos–Gallina Pelada i un panoràmic amb menys de sis filaments. Comprovar la continuïtat de les vores, el mar fins a la base i la visibilitat de la vegetació i els cursos d’aigua. Queda trobar una font de cobertes que ampliï el sòl nu i la neu a altres serralades. [Mesures i fonts](RO-055-RELLEU-PUR.md)

### RO-057 — Cartografia excursionista i marques imprimibles

**P2.** Comprovar en un retall pirinenc la llegibilitat de senders i fronteres i el seu comportament al laminador a dues escales. Relleu pur inclou estils independents per a fronteres estatals i divisions interiors de Catalunya, amb els quatre nivells ocults per defecte. Els talls i la migració de projectes tenen proves locals. Queda valorar altres fonts administratives i les fronteres en Model complet. [Fonts](../SOURCES.md#cartografia)

Controls de malla a la Cerdanya i al Pedraforca, amb retalls de 6 × 6 km i peces de 100 × 100 mm a 1:60.000. La frontera amb França, els tres nivells administratius interiors i els senders es generen amb dades reals entre els dos retalls. Les malles passen l’auditoria al detall de la prova. Pendent de laminat.

La v0.23.48 incorpora els patrons amb creu, l’amplada per nivell i el pinzell de senders amb goma per a traços dibuixats i cartografiats. Comprovat en malles de tall fraccionari i còpies de projectes. Al visor, dos retalls de la Cerdanya amb una peça de 100 mm mostren les creus negres i els senders blancs. El dibuix, la goma, Desfés i Restableix s’han comprovat sobre la maqueta. Pendent de laminat. La goma i el dibuix s’apliquen en Relleu pur, sobre la seva capa independent de senders.

La v0.23.49 actualitza els límits sobre la malla carregada i reutilitza les dades ja consultades per nivell. El control verifica l’activació, el canvi de patró, la retirada i la recuperació dels senders sota la línia.

La v0.23.50 incorpora rutes GPX locals i perforacions verticals de Ø1 mm i 7–9 mm de fondària en Relleu pur. Les proves cobreixen projectes desats, actualització de la ruta i talls entre peces, i el sòlid perforat amb diversos materials i cavitats. Pendent de validació al laminador i d’impressió física. Els banderins personalitzats queden per a una fase posterior.

La v0.23.51 destaca en taronja les rutes dibuixades i importades al visor. Tenen una assignació de material pròpia i els senders cartografiats es mantenen blancs.

### RO-058 — Auditoria del taller abans de la v0.24

**P1.** La v0.23.52 separa les tres eines de senders i rutes, porta els forats al visor i incorpora una guia opcional. L’aigua passa al bloc de capes i la mida queda al costat de la base i els talls. El canvi de projecte protegeix els ajustos sense desar. Abans de la v0.24, validar els tres recorreguts amb una persona nova i comprovar els errors de perforació en una peça laminada. [Troballes, distribució i criteris d’acceptació](RO-058-AUDITORIA-UX.md)

La v0.23.53 convida a una visita interactiva al primer accés. La visita passa de mida i territori a cada capa i apartat d’impressió, amb els controls reals ressaltats. Els camps numèrics esperen el final de l’edició i canviar el detall o una capa d’un retall pendent conserva la generació manual.
