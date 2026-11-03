# Backlog actiu de Relleu Obert

Actualitzat: **2026-11-03 · v0.21.0**. Auditoria per altura i primera millora del radi de suavitzat de la 0.22. [Historial](HISTORIAL.md).

## Ordre de treball

| Lot | Línies | Resultat que permet avançar |
| --- | --- | --- |
| **0.21 · Exportació comprovable** | RO-024, RO-033, RO-034, RO-050, RO-052, RO-055 | Auditar els 3MF amb controls petits i identificar el primer defecte reproduïble. Les comprovacions de Bambu Studio i d’impressió es registren a banda. |
| **0.22 · Vies i rendiment** | RO-051, RO-052, RO-053 | Comparar els accessos de Millau i Rajadell i un segon retall ferroviari. Mesurar cada canvi amb el mateix retall, escala i ajustos. |
| **Retocs en paral·lel** | RO-046, RO-054 | Validar la càrrega dels exemples i la recuperació de projectes girats, amb els dos modes i traços. Reproduir qualsevol pèrdua d’ajustos abans de tocar el flux. |
| **Pilot de relleu rocós** | RO-023, RO-035 | Quatre controls del Cavall Bernat i un cupó local dels Degotalls auditats. Contrastar un segon lloc i resoldre la georeferenciació del cupó. [Resultats](RELLEU-ROCOS.md) |
| **Després** | RO-026, RO-032 | Comparar les fonts d’edificis en dues zones, amb proves d’accés i cobertura abans de fer canvis al model. |

Els encàrrecs independents avancen en paral·lel. Cada bloc validat té el seu commit i es manté una sola prova pesada alhora. Els casos que requereixen inspecció al laminador poden quedar pendents mentre avancen altres línies.

Millau, Rajadell i els Rasos–Gallina Pelada són casos de prova de les mateixes regles de generació. Les correccions han de basar-se en la geometria, les dades disponibles i l’escala, com la col·locació procedimental de pilars. Quan corregim un defecte, cal reproduir-lo en un control petit i contrastar la regla en un altre retall o escala.

**Seguiment:** 19 línies obertes, 6 ajornades i 30 arxivades. «Implementat» vol dir disponible; la validació local, la d’usuari, el laminat i la impressió es registren per separat.

## Desenvolupament prioritari

| ID | Prioritat | Estat | Proper resultat comprovable |
| ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [RO-053](#ro-053--flux-de-treball-per-etapes) | P1 | Previsualització i progrés validats en diversos llocs | Mesurar temps i memòria; validar guies i descàrrega |
| [RO-033](#ro-033--ponts-i-viaductes) | P1 | Millau i el cupó del Bages validats al visor | Revisar accessos i llums al laminador, contrastar altres ponts |
| [RO-034](#ro-034--túnels-imprimibles) | P1 | Corregit en controls locals; pendent d'usuari/laminat | Revisar portals amb mode experimental activat |
| [RO-051](#ro-051--perfils-de-carreteres-principals) | P1 | Radi intermedi verificat en carretera i ferrocarril sintètics | Contrastar Millau, Rajadell i un retall ferroviari |
| [RO-052](#ro-052--continuïtat-i-amplada-del-traçat-viari) | P1 | Accessos de Millau visualment acceptables; camins massa amples en retalls grans | Comparar amplades a dues escales i revisar el laminat |
| [RO-024](#ro-024--unió-de-volums-i-validació-dimpressió) | P1 | Consulta per altura verificada amb el cupó del Bages | Reproduir el primer defecte al laminador amb un fitxer controlat |
| [RO-026](#ro-026--fidelitat-dels-edificis-i-selecció-de-fonts) | P1 | Fonts en estudi | Comparació de parts i petjades en segona zona |
| [RO-032](#ro-032--cobertes-i-volums-singulars) | P1 | Nucli verificat; servei remot pendent de validar | Consulta real reeixida i dades de coberta de Tamariu |
| [RO-023](#ro-023--relleu-local-i-fonts-vectorials-de-més-precisió) | P2 | Fonts remotes pendents | MDT més precís accessible al navegador |
| [RO-055](#ro-055--mode-de-relleu-pur) | P2 | Pilot implementat | Malla amb hidrografia i boscos; pendent de laminat |
| [RO-054](#ro-054--galeria-local-de-projectes) | P2 | Integrat a v0.20.0 | Validar la recuperació en l’ús habitual |

## Validació i retocs acotats

| ID | Prioritat | Estat | Què falta |
| ------------------------------------------------------------------------ | --------- | ------------------------------------ | --------------------------------------------------------------- |
| [RO-050](#ro-050--ferrocarrils-diferenciats) | P2 | Implementat i comprovat localment | Usuari: realç ferroviari i assignació de material; laminat |
| [RO-046](#ro-046--catàleg-de-llocs-recomanats) | P2 | Catàleg validat; canvi aplicat | Càrrega en seleccionar exemple; comprovar transició |
| [RO-044](#ro-044--catastre-per-seccions-i-recuperació-de-configuracions) | P1 | Vista progressiva validada a Tamariu | Buit/mixt, subdivisions i recuperació després d’error |
| [RO-045](#ro-045--coherència-visual-dels-sidebars) | P2 | Implementat; pendent d’usuari | Coherència de controls i scroll a escriptori |

## Després del nucli imprimible

| ID | Prioritat | Estat | Abast |
| -------------------------------------------------------- | --------- | ------------------ | -------------------------------------------------------------- |
| [RO-035](#ro-035--cavitats-i-relleus-amb-voladissos) | P3 | Dades 3D pendents | Coves, baumes i arcs naturals; un MDT no en descriu l’interior |
| [RO-012](#ro-012--presentació-realista-del-model-imprès) | P3 | Objectiu redefinit | Imatge estàtica fotorealista del model amb entorn escolar |
| [RO-019](#ro-019--internacionalització) | P3 | Setup fet | Migració/traduccions quan s’estabilitzi el flux |
| [RO-011](#ro-011--comptador-dexportacions-i-umami) | P3 | Per estudiar | Definir recompte i font real abans de publicar una xifra |

## Ajornats

| ID | Prioritat | Estat | Motiu / condició de retorn |
| -------------------------------------------------------------- | --------- | ---------------------------------- | --------------------------------------------- |
| [RO-014](#ro-014--marc-imprimible-independent) | P2 | Ajornat per l'usuari; menú retirat a v0.19.0 | Desenvolupar amb més detall després del flux principal |
| [RO-016](#ro-016--plaques-i-etiquetes-educatives) | P2 | Ajornat per l’usuari; menú retirat | Prioritzar funcionalitat i qualitat del model |
| [RO-017](#ro-017--rosa-dels-vents-i-altres-complements) | P3 | Ajornat; menú retirat | Reprendre amb disseny de rosa incrustada |
| [RO-003](#ro-003--configuració-inesperada-en-importar-a-bambu) | P2 | Ajornat | Perfils d’impressora/filament secundaris |
| [RO-025](#ro-025--vegetació-mesurada-i-paisatges-històrics) | P3 | Ajornat | Fonts adequades després del nucli |
| [RO-047](#ro-047--precàrrega-opcional-de-fonts-alternatives) | P3 | Ajornat | Primer consultes i recuperació fiables |

## Criteris de seguiment

P1: fidelitat i imprimibilitat; P2: funcionalitat i ús; P3: exploració. Només s’arxiven validacions expresses o retirades decidides. Els casos desconeguts no s’etiqueten com a errors resolts. Pages/CI els comprova l’usuari després de les proves locals. El desplegament continua estàtic, sense backend propi.

## Criteris i referències per tasca

### RO-003 — Configuració inesperada en importar a Bambu

Reprendre si hi ha un cas reproduïble d’importació de 3MF a Bambu Studio que afecti el model o els filaments.

### RO-011 — Comptador d’exportacions i Umami

Definir què compta com a exportació i d’on sortirà la xifra abans de mostrar-la al peu.

### RO-012 — Presentació realista del model imprès

Provar una presentació del model imprès en un entorn escolar. La vista anterior queda documentada a [Implementació](RO-012-IMPLEMENTACIO.md).

### RO-014 — Marc imprimible independent

El marc ja es va validar al visor i s’ha retirat del menú. Reprendre amb una prova física de toleràncies. [Implementació](RO-014-IMPLEMENTACIO.md)

### RO-016 — Plaques i etiquetes educatives

Les plaques estan ajornades. En reprendre-les, revisar la llegibilitat impresa i mantenir l’opció d’una peça separada. [Implementació](RO-016-IMPLEMENTACIO.md)

### RO-017 — Rosa dels vents i altres complements

Rosa incrustada ajornada i opció retirada del menú. [Implementació del complement anterior](RO-017-IMPLEMENTACIO.md)

### RO-019 — Internacionalització

Infraestructura preparada amb català. Migrar els textos i incorporar traduccions quan s’estabilitzi el flux. [Configuració](RO-019-SETUP.md)

### RO-023 — Relleu local i fonts vectorials de més precisió

Comparar la font actual i un MDT de detall al mateix retall de Montserrat, a dues escales i amb la mateixa exageració. Incloure un retall del Cavall Bernat i un segon cas al Pedraforca o a Riglos. Conservar carenes, colls i agulles amb refinament local de la malla segons el relleu i la mida impresa. Mesurar fidelitat del perfil, triangles i temps. Verificar accés des del navegador i retorn a la font general fora de cobertura. [Fonts i interfície](RO-023-FONTS-UX.md) · [Models d’elevacions ICGC](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions) · [Productes PNOA-LiDAR](https://pnoa.ign.es/web/portal/pnoa-lidar/productos-a-descarga)

### RO-024 — Unió de volums i validació d’impressió

El cupó del Bages permet consultar els materials per altura. Bambu Studio lamina bé en general segons el retorn d’usuari. Si reapareix un material inesperat, conservar el 3MF, el perfil i la cota de la primera capa afectada. Pendents els controls de Rajadell i dels Rasos–Gallina Pelada al laminador i la impressió física. [Resultats i controls](RO-024-RESULTATS.md)

### RO-025 — Vegetació mesurada i paisatges històrics

Estudiar fonts obertes de vegetació mesurada i paisatge històric quan el flux principal estigui consolidat.

### RO-026 — Fidelitat dels edificis i selecció de fonts

Comparar petjades i parts d’edificis d’ICGC, Catastre i OSM en una segona zona. Cal preservar els edificis independents quan la font els distingeix. [Comparativa de fonts](RO-026-FONTS-EDIFICIS.md)

### RO-032 — Cobertes i volums singulars

El motor admet cobertes a partir d’atributs disponibles. Verificar la consulta remota i les dades reals de Tamariu abans d’ampliar la cobertura. [Fonts](RO-032-DADES-COBERTES.md) · [Integració](RO-032-INTEGRACIO.md)

### RO-033 — Ponts i viaductes

Pilars i taulers procedimentals, amb dades específiques documentades per a Rajadell. Millau i el cupó del Bages estan validats al visor. Contrastar altres retalls, escales i connexions i revisar llums i contacte al laminador. [Controls procedimentals](RO-033-CONTROLS-PROCEDIMENTALS.md) · [Suports segons escala](RO-033-SUPORTS-ESCALA.md)

### RO-034 — Túnels imprimibles

Obertures estimades amb volta parabòlica i paviment del material de la via. Revisar portals i pas interior al laminador en més d’un retall. Les omissions per falta de coberta han de quedar indicades. [Criteris i controls](RO-034-OBERTURES.md)

### RO-035 — Cavitats i relleus amb voladissos

Per a parets verticals, voladissos i balmes, provar una malla 3D georeferenciada que substitueixi un sector del MDT. Primer candidat: LiDAR terrestre dels Degotalls. Comprovar llicència, cobertura lateral, dades de la cara inferior i unió amb el terreny. Validar el perfil des de diversos angles, el volum tancat i un cupó al laminador. Aplicar la mateixa regla allà on hi hagi dades equivalents i conservar el MDT quan la cobertura 3D sigui insuficient. [Pla](PAISATGE-3D.md) · [Núvol de punts dels Degotalls](https://doi.org/10.34810/DATA201)

### RO-044 — Catastre per seccions i recuperació de configuracions

Càrrega progressiva validada a Tamariu. Comprovar una consulta mixta amb sectors buits, subdivisions i recuperació de la font després d’un error. [Recuperació](RO-044-CATASTRE-RECUPERACIO.md)

### RO-045 — Coherència visual dels sidebars

Validar a l’escriptori la coherència dels controls i el desplaçament intern dels panells. [Auditoria](AUDITORIA-USABILITAT.md)

### RO-046 — Catàleg de llocs recomanats

Comprovar que seleccionar cada exemple restaura el retall i els ajustos esperats i que la transició és clara.

### RO-047 — Precàrrega opcional de fonts alternatives

Reprendre quan les consultes i la recuperació siguin fiables. Si es prova, la precàrrega ha de ser opcional i acotada.

### RO-050 — Ferrocarrils diferenciats

Realç i material ferroviari diferenciats, comprovats localment. Pendent de contrastar l’assignació i la visibilitat al laminador. [Ferrocarrils](RO-050-FERROCARRILS.md)

### RO-051 — Perfils de carreteres principals

El radi intermedi de suavitzat està verificat en carretera i ferrocarril sintètics a dues escales. Comparar canvis de pendent, omissions i temps a Millau, Rajadell i un altre retall ferroviari. [Perfils](RO-051-PERFILS-VIARIS.md) · [Mesures](RO-051-RENDIMENT.md)

### RO-052 — Continuïtat i amplada del traçat viari

Revisar les unions i amplades de carretera, pont i túnel a dues escales. Separar l’amplada de calçada del contorn estructural i l’obertura imprimible. [Controls i reproducció](RO-052-CONTINUITAT.md)

### RO-053 — Flux de treball per etapes

El progrés per capes està validat en diversos llocs. Mesurar temps i memòria amb els mateixos ajustos i verificar guies de tall i descàrrega. El canvi de mida d’una maqueta existent queda pendent. [Flux](RO-053-UX.md) · [Mesures](RO-053-TEMPS.md)

### RO-054 — Galeria local de projectes

Validar la recuperació d’un projecte girat amb traços i materials als dos modes. La galeria local desa els ajustos per regenerar la maqueta. Conservar la malla exacta queda per a una fase posterior.

### RO-055 — Mode de relleu pur

Validar les quatre peces dels Rasos–Gallina Pelada al laminador, sobretot les vores adjacents i la visibilitat de rierols i arbres. [Mesures i fonts](RO-055-RELLEU-PUR.md)
