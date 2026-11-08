# Backlog actiu de Relleu Obert

Revisat el **2026-11-08** amb la v0.23.36. [Historial i validacions](arxiu/HISTORIAL.md) · [Ajornaments i idees](arxiu/AJORNATS.md) · [Criteri d’arxiu](README.md)

## Ordre de treball

1. Mesurar la fase de vies en el retall gran d’Amsterdam. [RO-053](#ro-053--flux-de-treball-per-etapes)
2. Definir els límits per placa i els avisos d’impressora. [RO-056](#ro-056--base-talls-i-plaques)
3. Continuar la revisió de la galeria per blocs. [RO-046](#ro-046--catàleg-de-llocs-recomanats)
4. Contrastar la Foradada r3 al visor i reprendre els controls de relleu rocós. [RO-035](#ro-035--cavitats-i-relleus-amb-voladissos) · [RO-023](#ro-023--relleu-local-i-fonts-vectorials-de-més-precisió)

## Desenvolupament i proves

### RO-053 — Flux de treball per etapes

**P1.** Aïllar el muntatge del paviment regional i repetir Amsterdam a 25 × 25 cm amb totes les capes. El control de 10 × 10 cm triga 32,16 s. Comprovar al navegador el recàlcul automàtic d’exageració en Model complet i validar el redimensionament, la guia inicial i els gestos i el teclat en mòbil. Les guies de tall perden contrast al bosc dens. [Mesures](RO-053-TEMPS.md#amsterdam-amb-totes-les-capes--v02327) · [Flux de treball](RO-053-UX.md)

### RO-056 — Base, talls i plaques

**P2.** Tamariu lamina correctament en quatre plaques i en el cupó de dues plaques desiguals. Comprovar el límit de la placa de la impressora triada i avisar abans d’exportar si alguna peça el supera. La referència del 3MF multiplaca actual és de 256 × 256 mm. [Resultats d’impressió](RO-024-RESULTATS.md)

### RO-046 — Catàleg de llocs recomanats

**P2.** Continuar per l’Eixample, Girona i Venècia. Revisar els retocs de les Bardenas, Colorado i Lavaredo, i comprovar la llegibilitat, la cota de base i els temps de les fitxes pendents. [Llista de revisió per blocs](RO-046-CATALEG.md#revisió-per-a-maquetes-daula)

### RO-035 — Cavitats i relleus amb voladissos

**P3.** Comparar la carena i la Cadireta de la Foradada r3 al visor amb la foto i comprovar el laminat de les dues boques. Recuperar la transformació geogràfica del cupó dels Degotalls per encaixar-lo al terreny. [Fonts i controls](RELLEU-ROCOS.md#carena-i-cadireta--v02335)

### RO-023 — Relleu local i fonts vectorials de més precisió

**P2.** Comparar la silueta del Cavall Bernat amb el MET5 i el MDT de detall a igual exageració i dues escales. Comprovar la transició del pedaç al laminador i contrastar el refinament amb un altre retall, com el Pedraforca. [Controls del relleu rocós](RELLEU-ROCOS.md)

### RO-026 — Fidelitat dels edificis i selecció de fonts

**P1.** Comparar petjades i parts d’ICGC, Catastre i OSM en una segona zona i comprovar que es preserven els edificis independents quan la font els distingeix. L’estudi de fonts fora d’Espanya i de GlobalBuildingAtlas queda com a referència. [Comparativa](RO-026-FONTS-EDIFICIS.md)

### RO-032 — Cobertes i volums singulars

**P1.** Revisar al visor els tres volums de Guiza i l’encaix de Mont-Saint-Michel, i comprovar-ne el laminat. [Proves d’ancoratge](arxiu/HISTORIAL.md#v02336--ancoratge-en-terrenys-en-pendent) Per a les cobertes generals, queda identificar una font de geometria 3D consultable des del navegador. El servei de careners documentat és en 2D. [Integració](RO-032-INTEGRACIO.md) · [Estudi de fonts](arxiu/RO-032-DADES-COBERTES.md)

## Validació en ús i seguiment

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

### RO-050 — Ferrocarrils diferenciats

**P2.** Comprovar al laminador el realç i l’assignació de material en un retall on la via es distingeixi dels camins. [Controls inicials](arxiu/RO-050-FERROCARRILS.md)

### RO-054 — Galeria local de projectes

**P2.** Exportar i recuperar en un altre navegador un projecte girat, amb traços i materials, en tots dos modes. El JSON conserva la configuració i permet regenerar la maqueta. [Format i validació](arxiu/HISTORIAL.md#v0237--còpia-del-catàleg-local)

### RO-055 — Mode de relleu pur

**P2.** Laminar els talls adjacents dels Rasos–Gallina Pelada i un panoràmic amb menys de sis filaments. Comprovar la continuïtat de les vores, el mar fins a la base i la visibilitat de la vegetació i els cursos d’aigua. Queda trobar una font de cobertes que ampliï el sòl nu i la neu a altres serralades. [Mesures i fonts](RO-055-RELLEU-PUR.md)
