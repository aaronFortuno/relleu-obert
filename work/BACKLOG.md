# Backlog actiu de Relleu Obert

Revisat el **2026-11-08** amb la v0.23.39. [Historial i validacions](arxiu/HISTORIAL.md) · [Ajornaments i idees](arxiu/AJORNATS.md) · [Criteri d’arxiu](README.md)

## Ordre de treball

1. Validar el perfil ferroviari en un retall amb passos a nivell i en un segon amb un pont o túnel. [RO-050](#ro-050--ferrocarrils-diferenciats)
2. Preparar les cinc boques del primer lot de coves i balmes. [RO-035](#ro-035--cavitats-i-relleus-amb-voladissos)
3. Continuar la revisió de la galeria per blocs. [RO-046](#ro-046--catàleg-de-llocs-recomanats)
4. Contrastar la Foradada r3 al visor i reprendre els controls de relleu rocós. [RO-035](#ro-035--cavitats-i-relleus-amb-voladissos) · [RO-023](#ro-023--relleu-local-i-fonts-vectorials-de-més-precisió)

## Desenvolupament i proves

### RO-046 — Catàleg de llocs recomanats

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

**P1.** La via de superfície té secció transversal plana i una rasant estimada entre extrems, amb tall i reblert. El control de vessant passa amb i sense una carretera transversal i el retall ferroviari del Bages passa la comprovació local de la malla a 400 i 800 m. Queden la validació al visor i al laminador en un pas a nivell i en enllaços amb estructures. [Proves i abast](arxiu/HISTORIAL.md#v02338--rasant-ferroviària-independent)

### RO-024 — Unió de volums i validació d’impressió

**P1.** El filament per peça a Montserrat i les quatre plaques de Tamariu estan validats al laminador. Queden la comprovació dels talls dels Rasos–Gallina Pelada, el pas inferior de Rajadell i les proves d’impressió física. [Resultats i controls](RO-024-RESULTATS.md)

### RO-033 — Ponts i viaductes

**P1.** A l’última revisió visual d’Amsterdam no s’han detectat ponts absents. Queden les llums dels ponts de canal al laminador, el pas de Montgròs en una placa completa i els tirants i les llums del model singular de Millau. Si reapareix una omissió, registrar el retall i l’escala. [Controls de ponts](RO-033-CONTROLS-PROCEDIMENTALS.md)

### RO-034 — Túnels imprimibles

**P1.** Les dues boques del túnel de Sant Salvador a 1:20.000 passen la comprovació de malla. Validar al laminador les boques, la volta i el paviment de l’interior, i repetir el control en un segon retall. [Controls de túnels](RO-034-OBERTURES.md)

### RO-051 — Perfils de carreteres principals

**P1.** El retall girat s’ha acceptat provisionalment al laminador. Queden dos enllaços a Sant Salvador i la comprovació de quines irregularitats són visibles en imprimir. Si es corregeix una rasant, contrastar-la en un segon retall o escala. [Perfils i transicions](RO-051-PERFILS-VIARIS.md)

### RO-052 — Continuïtat i amplada del traçat viari

**P1.** Revisar el model complet de l’Hospitalet quan reapareguin discontinuïtats entre ramals i passos a diferent nivell. El cupó del ramal conserva les calçades inferiors i el model complet encara presenta interferències. [Mesures i reproducció](RO-052-CONTINUITAT.md#talls-locals-sota-els-taulers-v02319)

### RO-044 — Catastre per seccions i recuperació de configuracions

**P1.** La càrrega progressiva està validada a Tamariu. Verificar una consulta amb sectors buits, subdivisions i recuperació de la font després d’un error. [Diagnòstic inicial](arxiu/RO-044-CATASTRE-RECUPERACIO.md)

### RO-045 — Coherència visual dels sidebars

**P2.** Validar amb una maqueta carregada que la roda fa zoom sobre el mapa i que permet desplaçar els ajustos inferiors sense canviar el retall. [Comprovació local](arxiu/HISTORIAL.md#v02314--zoom-de-territori-i-enllaços-de-ponts)

### RO-019 — Internacionalització

**P2.** Revisar els cinc idiomes en ús i completar els diagnòstics de fonts que encara apareixen en català. [Guia de manteniment](RO-019-SETUP.md)

### RO-054 — Galeria local de projectes

**P2.** Exportar i recuperar en un altre navegador un projecte girat, amb traços i materials, en tots dos modes. El JSON conserva la configuració i permet regenerar la maqueta. [Format i validació](arxiu/HISTORIAL.md#v0237--còpia-del-catàleg-local)

### RO-055 — Mode de relleu pur

**P2.** Laminar els talls adjacents dels Rasos–Gallina Pelada i un panoràmic amb menys de sis filaments. Comprovar la continuïtat de les vores, el mar fins a la base i la visibilitat de la vegetació i els cursos d’aigua. Queda trobar una font de cobertes que ampliï el sòl nu i la neu a altres serralades. [Mesures i fonts](RO-055-RELLEU-PUR.md)
