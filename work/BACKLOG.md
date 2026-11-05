# Backlog actiu de Relleu Obert

Actualitzat el **2026-11-05 · v0.22.39**. Relleu pur fins a 1:500.000 també en format quadrat. [Historial](HISTORIAL.md).

## Ordre de treball

| Lot | Línies | Resultat que permet avançar |
| --- | --- | --- |
| **Pilot de relleu rocós** | RO-023, RO-035 | Quatre controls del Cavall Bernat i un cupó local dels Degotalls auditats. Contrastar un segon lloc i resoldre la georeferenciació del cupó. [Resultats](RELLEU-ROCOS.md) |
| **Paviment de superfície** | RO-051, RO-052 | Cobertura ampliada al retall de Marganell, amb encaix per tram i secció plana a les vores. Validar visualment i resoldre les unions complexes. [Control de Marganell](RO-051-PERFILS-VIARIS.md#més-cobertura-del-paviment-independent-a-la-v02211) |
| **Seguiment de les estructures** | RO-033, RO-034, RO-050 | Registrar noves incidències amb retall i escala. A Sant Salvador, dos perfils segueixen el terreny pel pendent dels enllaços. El túnel a 1:20.000 té les dues boques comprovades al 3MF. El pas de Montgròs es conserva al cupó laminat. [Controls de vies](RO-051-PERFILS-VIARIS.md#transicions-pendents-a-la-v0220) · [Montgròs](RO-033-CONTROLS-PROCEDIMENTALS.md#laminat-del-cupó-de-montgròs) |
| **Validació en paral·lel** | RO-024, RO-046, RO-054, RO-055 | Laminar les vores adjacents de Tamariu i dels Rasos–Gallina Pelada. Comprovar la recuperació d’un projecte girat, de mida personalitzada, amb materials i traços, i la transició quan es carrega un exemple. |
| **Cobertes obertes** | RO-032, RO-026 | Integrar l’ICGC si es verifica un servei públic que retorni geometria de coberta. |

Els encàrrecs independents avancen en paral·lel. Cada bloc validat té el seu commit i es manté una sola prova pesada alhora. Els casos que requereixen inspecció al laminador poden quedar pendents mentre avancen altres línies.

Millau, Rajadell i els Rasos–Gallina Pelada són casos de prova de les mateixes regles de generació. Les correccions han de basar-se en la geometria, les dades disponibles i l’escala, com la col·locació procedimental de pilars. Quan corregim un defecte, cal reproduir-lo en un control petit i contrastar la regla en un altre retall o escala.

**Seguiment:** 19 línies obertes, 6 ajornades i 30 arxivades. «Implementat» vol dir disponible; la validació local, la d’usuari, el laminat i la impressió es registren per separat.

## Desenvolupament prioritari

| ID | Prioritat | Estat | Proper resultat comprovable |
| ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [RO-053](#ro-053--flux-de-treball-per-etapes) | P1 | Taller mòbil i canvi de mida al mateix projecte | Validar el taller en telèfons reals i millorar el contrast de les guies al bosc |
| [RO-033](#ro-033--ponts-i-viaductes) | P1 | Millau i el cupó del Bages validats al visor. Montgròs conserva el pas al laminat del cupó | Comprovar llums i accessos en una placa completa |
| [RO-034](#ro-034--túnels-imprimibles) | P1 | Dues boques i rasant compartida verificades al cupó 3MF | Validar el cupó i revisar el tram cobert de Sant Salvador al laminador |
| [RO-051](#ro-051--perfils-de-carreteres-principals) | P1 | Encaix per tram i cobertura ampliada, també als talls de la peça | Validar Marganell i resoldre les unions complexes |
| [RO-052](#ro-052--continuïtat-i-amplada-del-traçat-viari) | P1 | Senders amb amplada ajustable. Quatre enllaços a Millau a 1:20.000 | Validar els senders al laminador i mesurar els enllaços de la C-37 |
| [RO-024](#ro-024--unió-de-volums-i-validació-dimpressió) | P1 | Filament per peça validat a Montserrat. Projecte de quatre plaques obert a Bambu Studio | Contrastar el laminat de les quatre peces de Tamariu |
| [RO-026](#ro-026--fidelitat-dels-edificis-i-selecció-de-fonts) | P1 | Fonts en estudi | Comparació de parts i petjades en segona zona |
| [RO-032](#ro-032--cobertes-i-volums-singulars) | P1 | Consulta opcional d’OSM amb retorn a petjades planes si és buida | Verificar una font de cobertes 3D consultable de l’ICGC |
| [RO-023](#ro-023--relleu-local-i-fonts-vectorials-de-més-precisió) | P2 | MET5 integrat i auditat al Pedraforca | Contrast visual i refinament de malla |
| [RO-055](#ro-055--mode-de-relleu-pur) | P2 | Retalls fins a 1:500.000 en tots els formats de Relleu pur | Laminar Tamariu i un panorama amb textura i comprovar dos talls adjacents |
| [RO-054](#ro-054--galeria-local-de-projectes) | P2 | Integrat a v0.20.0 | Validar la recuperació en l’ús habitual |

## Validació i retocs acotats

| ID | Prioritat | Estat | Què falta |
| ------------------------------------------------------------------------ | --------- | ------------------------------------ | --------------------------------------------------------------- |
| [RO-050](#ro-050--ferrocarrils-diferenciats) | P2 | Implementat i comprovat localment | Usuari: realç ferroviari i assignació de material; laminat |
| [RO-046](#ro-046--catàleg-de-llocs-recomanats) | P2 | 28 retalls amb captures, generació directa i resum al panell dret | Revisar la llegibilitat i els temps de generació en ús |
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

El cupó del Bages permet consultar els materials per altura. A Montserrat, l’usuari valida el filament per peça al laminador. A Tamariu, confirma que el 3MF únic s’obre amb quatre plaques. Queda pendent comprovar al laminador les vores i els materials de Tamariu 40 × 45 cm i dels Rasos–Gallina Pelada, i revisar el pas inferior de Rajadell. Impressió física pendent. [Resultats i controls](RO-024-RESULTATS.md)

### RO-025 — Vegetació mesurada i paisatges històrics

Estudiar fonts obertes de vegetació mesurada i paisatge històric quan el flux principal estigui consolidat.

### RO-026 — Fidelitat dels edificis i selecció de fonts

Comparar petjades i parts d’edificis d’ICGC, Catastre i OSM en una segona zona. Cal preservar els edificis independents quan la font els distingeix. [Comparativa de fonts](RO-026-FONTS-EDIFICIS.md)

### RO-032 — Cobertes i volums singulars

El motor incorpora cobertes amb dades obertes d’OSM quan els atributs ho permeten i conserva les petjades amb coberta plana si la consulta torna buida. L’RTL de l’ICGC documenta plans LoD2, amb un servei públic de careners en 2D. Resta verificar una font de cobertes 3D consultable des del navegador. [Fonts de cobertes](RO-032-DADES-COBERTES.md#seguiment-del-4-de-novembre) · [Integració](RO-032-INTEGRACIO.md)

### RO-033 — Ponts i viaductes

Pilars i taulers procedimentals, amb dades específiques documentades per a Rajadell. Millau i el cupó del Bages estan validats al visor. La regla general per als fragments continguts recupera el tauler de Montgròs a 1:20.000 i conserva el de la Fessona, amb dues unions a cadascun. L’obertura de 0,27 mm de Montgròs es conserva a la secció mostrejada del cupó laminat amb capes de 0,10 i 0,20 mm. Pendent de comprovar en una placa completa i en una impressió física. [Controls procedimentals](RO-033-CONTROLS-PROCEDIMENTALS.md) · [Suports segons escala](RO-033-SUPORTS-ESCALA.md)

### RO-034 — Túnels imprimibles

Obertures estimades amb volta parabòlica i paviment del material de la via. Revisar portals i pas interior al laminador en més d’un retall. El pilot amb la calçada nova comparteix una rasant entre els accessos i l’interior, amb les dues boques auditades al 3MF. Les omissions per falta de coberta han de quedar indicades. [Criteris i controls](RO-034-OBERTURES.md)

### RO-035 — Cavitats i relleus amb voladissos

El cupó local dels Degotalls a 1:200 té bon resultat segons l’usuari. Falta la transformació per integrar-lo al terreny. La Roca Foradada serà el control d’obertura passant. Cal trobar dades 3D de les boques i la volta, validar l’encaix i comprovar la llum al laminador. El mateix flux ha de servir en altres retalls amb dades equivalents. [Pilot i fonts](RELLEU-ROCOS.md)

### RO-044 — Catastre per seccions i recuperació de configuracions

Càrrega progressiva validada a Tamariu. Comprovar una consulta mixta amb sectors buits, subdivisions i recuperació de la font després d’un error. [Recuperació](RO-044-CATASTRE-RECUPERACIO.md)

### RO-045 — Coherència visual dels sidebars

Validar a l’escriptori la coherència dels controls i el desplaçament intern dels panells. [Auditoria](AUDITORIA-USABILITAT.md)

### RO-046 — Catàleg de llocs recomanats

El carrusel incorpora els 28 retalls del [catàleg](RO-046-CATALEG.md), amb 17 fitxes de Relleu pur i 11 de Model complet. L’ordre es barreja en cada càrrega i reparteix els modes al llarg del bucle. A la pantalla inicial d’escriptori, la separació respecte al selector de mides s’adapta a l’alçada disponible. «La teva maqueta» mostra el resum de la fitxa mentre el visor mostra el model corresponent. Queda revisar l’enquadrament, la llegibilitat i els temps de generació en ús.

### RO-047 — Precàrrega opcional de fonts alternatives

Reprendre quan les consultes i la recuperació siguin fiables. Si es prova, la precàrrega ha de ser opcional i acotada.

### RO-050 — Ferrocarrils diferenciats

Realç i material ferroviari diferenciats, comprovats localment. Pendent de contrastar l’assignació i la visibilitat al laminador. [Ferrocarrils](RO-050-FERROCARRILS.md)

### RO-051 — Perfils de carreteres principals

Les vies ràpides i el ferrocarril han de conservar una rasant contínua. Validar perfils, connexions i omissions a diverses escales. Els cupons de paviment amb secció transversal plana, excavació i reblert cobreixen corbes, una cruïlla en T, ponts i túnels. La v0.22.11 amplia el paviment independent als trams interiors i als talls de la peça, i munta cada tram amb el seu suport. Les cruïlles complexes i els trams que encara no passen les comprovacions conserven el càlcul habitual. [Perfils i controls](RO-051-PERFILS-VIARIS.md) · [Mesures](RO-051-RENDIMENT.md)

### RO-052 — Continuïtat i amplada del traçat viari

Els senders tenen un mínim de 0,30 mm i el selector de Vies en modifica l’amplada. Comprovar-ne la visibilitat al laminador. Revisar les unions i amplades de carretera, pont i túnel a dues escales. Separar l’amplada de calçada del contorn estructural i l’obertura imprimible. [Controls i reproducció](RO-052-CONTINUITAT.md)

### RO-053 — Flux de treball per etapes

L’amplada i la fondària es poden editar al principi de «La teva maqueta», dins d’«Exporta» al mòbil. El formulari indica els límits i manté el flux d’aplicar i generar la nova mida.

El taller mòbil integra els passos en panells inferiors que deixen el visor a la vista. S’hi pot generar i ajustar la maqueta, seleccionar el nombre de materials i exportar amb els formats habituals. Queda pendent comprovar els gestos i el teclat en dispositius reals. [Flux mòbil](RO-053-UX.md#taller-mòbil)

El selector inicial compara les mides i els talls sobre una taula de 60 × 40 cm. Els retalls mostren el mateix paisatge a escala constant i s’ofereix un sol rectangle predefinit. El progrés per capes està validat en diversos llocs. A Tamariu 40 × 45 cm, les guies es veuen en zenital i perspectiva i coincideixen amb les cares de tall dels quatre 3MF. El traç es distingeix menys al bosc dens. «La teva maqueta» permet preparar una mida nova conservant el centre, el gir i els ajustos. Queda validar el redimensionament en ús i millorar el contrast de les guies al bosc. [Validació](HISTORIAL.md#v0215--mides-i-guies-de-tall) · [Flux](RO-053-UX.md) · [Mesures](RO-053-TEMPS.md)

### RO-054 — Galeria local de projectes

Validar la recuperació d’un projecte girat amb traços i materials als dos modes. La galeria local desa els ajustos per regenerar la maqueta. Conservar la malla exacta queda per a una fase posterior.

### RO-055 — Mode de relleu pur

Les peces normals abasten d’1:10.000 a 1:500.000. Els retalls amplis fan servir el pressupost de dades del panoràmic segons l’extensió geogràfica. [Mesures i fonts](RO-055-RELLEU-PUR.md)

L’exageració vertical, els rius i la textura de vegetació s’apliquen automàticament sobre la maqueta carregada i mantenen la càmera. El canvi de detall, de mida o de retall es confirma amb «Genera el model».

«Vegetació simulada» activa una textura contínua i editable sobre el bosc. A 1:10.000 l’alçada màxima per defecte és de 0,8 mm, regulable entre 0,2 i 2 mm, i la irregularitat inicial és del 45 %. L’altura varia amb l’escala i se suavitza als límits del bosc. Les vores internes de les tessel·les queden dissoltes, comprovat amb el retall de linies-vegetacio.json. Queda pendent comprovar el laminat i una impressió de prova.

Validar les quatre peces dels Rasos–Gallina Pelada al laminador, sobretot les vores adjacents i la visibilitat de rierols i arbres. [Mesures i fonts](RO-055-RELLEU-PUR.md)

El format panoràmic admet de 51 a 100 cm de costat llarg i de 10 a 20 cm de costat curt, en Relleu pur. A la vista inicial, les peces que superen conjuntament els 60 cm es disposen en dues files a la mateixa escala que la taula. La malla rectangular segueix un pas físic similar als dos eixos i comparteix mostres i cota de base als talls.

En una prova de 100 × 20 cm, l’usuari observa un temps aproximat de 20 s i detecta que els mars quedaven sense material propi. La v0.22.20 incorpora els polígons marins al visor i a l’exportació. El retall complet de l’eix pirinenc ja mostra els dos mars al navegador. Queden la mesura de memòria i el control de les peces al laminador.

Relleu pur permet triar entre un i sis filaments. Cada capa es pot assignar a un filament i el 3MF de Bambu amb diverses plaques fa servir la mateixa assignació per al projecte sencer. Queda validar un panorama amb menys de sis filaments al laminador.

La base anormalment alta de Tamariu (30 × 30 cm a 1:10.000) venia del codi marí −8888 del MET5. El lector el converteix a 0 m i conserva el recurs a una font alternativa quan falta cobertura. Al retall real, els dos modes situen la superfície marina a 5 mm. En Relleu pur, els tres fragments marins són sòlids tancats fins a la cara inferior. Pendent de validar els talls i el material al laminador. [Especificació del MET5, §5](https://icgc-web-pro.s3.eu-central-1.amazonaws.com/produccio/s3fs-public/met5v10esp_02ca_54782.pdf#page=8)
