# Backlog actiu de Relleu Obert

Actualitzat el **2026-11-07 · v0.23.28**. [Historial](HISTORIAL.md).

## Ordre de treball

| Lot | Línies | Resultat que permet avançar |
| --- | --- | --- |
| **Temps de generació** | RO-053 | Amsterdam 10 × 10 cm complet en 32,16 s. Aïllar el muntatge del paviment regional i repetir el retall de 25 × 25 cm, aturat a la fase de vies. [Mesures](RO-053-TEMPS.md#amsterdam-amb-totes-les-capes--v02327) |
| **Ajustos d’impressió** | RO-056 | Cupó de Tamariu de dues plaques amb talls desiguals validat al laminador. Continuar amb els perfils d’impressora i la mida de cada placa. |
| **Catàleg de relleu** | RO-046 | Amsterdam té una primera revisió visual del centre. Continuar amb l’Eixample, Girona i Venècia, i reprendre els controls pendents de les Bardenas, Colorado i Lavaredo. [Cua de revisió](RO-046-CATALEG.md#revisió-per-a-maquetes-daula) |
| **Paviment de superfície** | RO-051, RO-052 | El retall girat mostra millora al laminador i es dona per bo de moment. La impressió física i els enllaços pendents queden en seguiment. [Control de l’Hospitalet](RO-052-CONTINUITAT.md#talls-locals-sota-els-taulers-v02319) |
| **Seguiment de les estructures** | RO-033, RO-034, RO-050 | Registrar noves incidències amb retall i escala. A Sant Salvador, dos perfils segueixen el terreny pel pendent dels enllaços. El túnel a 1:20.000 té les dues boques comprovades al 3MF. El pas de Montgròs es conserva al cupó laminat. [Controls de vies](RO-051-PERFILS-VIARIS.md#transicions-pendents-a-la-v0220) · [Montgròs](RO-033-CONTROLS-PROCEDIMENTALS.md#laminat-del-cupó-de-montgròs) |
| **Validació en paral·lel** | RO-024, RO-033, RO-046, RO-054, RO-055 | Revisar Tamariu 40 × 45 cm i Amsterdam amb totes les capes al laminador. També queden la recuperació d’un projecte girat i els talls dels Rasos–Gallina Pelada. |
| **Pilot de relleu rocós** | RO-023, RO-035 | Contrastar els cupons MET5 i MDT de 50 cm del Cavall Bernat. Per a les cavitats, obtenir una malla reutilitzable de la Foradada o georeferenciar els Degotalls. [Resultats](RELLEU-ROCOS.md#pilot-de-detall-local-amb-el-mdt-de-50-cm) |
| **Catàleg de llocs singulars** | RO-032, RO-033 | Torre Glòries validada al visor. Millau verificat a tres retalls. Validar al laminador les llums i els tirants del viaducte. [Controls de Millau](RO-033-CONTROLS-PROCEDIMENTALS.md#pilot-de-millau-al-catàleg--v02328) |

Els encàrrecs independents avancen en paral·lel. Cada bloc validat té el seu commit i es manté una sola prova pesada alhora. Els casos que requereixen inspecció al laminador poden quedar pendents mentre avancen altres línies.

Millau, Rajadell i els Rasos–Gallina Pelada són casos de prova de les mateixes regles de generació. Les correccions han de basar-se en la geometria, les dades disponibles i l’escala, com la col·locació procedimental de pilars. Quan corregim un defecte, cal reproduir-lo en un control petit i contrastar la regla en un altre retall o escala.

**Seguiment:** 20 línies obertes, 6 ajornades i 30 arxivades. «Implementat» vol dir disponible. La validació local, la d’usuari, el laminat i la impressió es registren per separat.

## Desenvolupament prioritari

| ID | Prioritat | Estat | Proper resultat comprovable |
| ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [RO-053](#ro-053--flux-de-treball-per-etapes) | P1 | Taller mòbil, canvi de mida i guia de primera maqueta | Validar el taller en telèfons reals, la utilitat de la guia i el contrast de les guies de tall al bosc |
| [RO-033](#ro-033--ponts-i-viaductes) | P1 | Montgròs validat al cupó. Obertures mesurades a Amsterdam i Empuriabrava | Laminar els ponts curts i comprovar les llums en una placa completa |
| [RO-034](#ro-034--túnels-imprimibles) | P1 | Dues boques i rasant compartida verificades al cupó 3MF | Validar el cupó i revisar el tram cobert de Sant Salvador al laminador |
| [RO-051](#ro-051--perfils-de-carreteres-principals) | P1 | Retall girat acceptat provisionalment després de revisar-lo al laminador | Valorar quines irregularitats es distingeixen en la impressió física |
| [RO-052](#ro-052--continuïtat-i-amplada-del-traçat-viari) | P1 | Ramal sobre dues calçades verificat al cupó. Interferència amb un camí de vianants en el model complet | Comprovar la llum i els enllaços després d’integrar cada grup de vies |
| [RO-024](#ro-024--unió-de-volums-i-validació-dimpressió) | P1 | Filament per peça validat a Montserrat. Projecte de quatre plaques obert a Bambu Studio | Contrastar el laminat de les quatre peces de Tamariu |
| [RO-026](#ro-026--fidelitat-dels-edificis-i-selecció-de-fonts) | P1 | ICGC, Catastre i OSM actius. GlobalBuildingAtlas aparcat | Comparar les parts i petjades de les fonts actuals en una segona zona |
| [RO-032](#ro-032--cobertes-i-volums-singulars) | P1 | Torre Glòries integrada i validada visualment | Comprovar el laminat i els nous models quan arribin |
| [RO-023](#ro-023--relleu-local-i-fonts-vectorials-de-més-precisió) | P2 | MET5 integrat. Cupó local de detall amb MDT de 50 cm | Comparar la silueta del Cavall Bernat i validar la transició al laminador |
| [RO-055](#ro-055--mode-de-relleu-pur) | P2 | Retalls fins a 1:500.000 en tots els formats de Relleu pur | Laminar Tamariu i un panorama amb textura i comprovar dos talls adjacents |
| [RO-054](#ro-054--galeria-local-de-projectes) | P2 | Catàleg local amb còpia JSON a v0.23.7 | Validar la recuperació entre dispositius en l’ús habitual |
| [RO-056](#ro-056--base-talls-i-plaques) | P2 | Plànol de talls interactiu a v0.23.10 | Laminar talls asimètrics i definir com comprovar les plaques de cada impressora |

## Validació i retocs acotats

| ID | Prioritat | Estat | Què falta |
| ------------------------------------------------------------------------ | --------- | ------------------------------------ | --------------------------------------------------------------- |
| [RO-050](#ro-050--ferrocarrils-diferenciats) | P2 | Implementat i comprovat localment | Usuari: realç ferroviari i assignació de material; laminat |
| [RO-046](#ro-046--catàleg-de-llocs-recomanats) | P2 | 37 fitxes i sis blocs de revisió | Revisar els enquadraments al visor i al laminador |
| [RO-044](#ro-044--catastre-per-seccions-i-recuperació-de-configuracions) | P1 | Vista progressiva validada a Tamariu | Buit/mixt, subdivisions i recuperació després d’error |
| [RO-045](#ro-045--coherència-visual-dels-sidebars) | P2 | Mapa fixat a Territori i zoom amb la roda | Validar l’accés als ajustos inferiors amb una maqueta carregada |
| [RO-019](#ro-019--internacionalització) | P2 | Cinc idiomes disponibles | Revisió lingüística i dels diagnòstics tècnics poc freqüents |

## Després del nucli imprimible

| ID | Prioritat | Estat | Abast |
| -------------------------------------------------------- | --------- | ------------------ | -------------------------------------------------------------- |
| [RO-035](#ro-035--cavitats-i-relleus-amb-voladissos) | P3 | Dades 3D pendents | Coves, baumes i arcs naturals; un MDT no en descriu l’interior |
| [RO-012](#ro-012--presentació-realista-del-model-imprès) | P3 | Objectiu redefinit | Imatge estàtica fotorealista del model amb entorn escolar |
| [RO-011](#ro-011--comptador-dexportacions-i-umami) | P3 | Per estudiar | Definir recompte i font real abans de publicar una xifra |

## Ajornats

| ID | Prioritat | Estat | Motiu / condició de retorn |
| -------------------------------------------------------------- | --------- | ---------------------------------- | --------------------------------------------- |
| [RO-014](#ro-014--marc-imprimible-independent) | P2 | Ajornat per l'usuari; menú retirat a v0.19.0 | Desenvolupar amb més detall després del flux principal |
| [RO-016](#ro-016--plaques-i-etiquetes-educatives) | P2 | Ajornat per l’usuari; menú retirat | Prioritzar funcionalitat i qualitat del model |
| [RO-017](#ro-017--rosa-dels-vents-i-altres-complements) | P3 | Ajornat; menú retirat | Reprendre amb disseny de rosa incrustada |
| [RO-003](#ro-003--configuració-inesperada-en-importar-a-bambu) | P2 | Ajornat | Perfils d’impressora/filament secundaris |
| [RO-047](#ro-047--precàrrega-opcional-de-fonts-alternatives) | P3 | Ajornat | Primer consultes i recuperació fiables |
| [RO-025](#ro-025--vegetació-mesurada-i-paisatges-històrics) | P2 | Prova històrica retirada | Reprendre amb fonts d’època que diferenciïn edificis individuals |

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

Català, castellà, gallec, basc i anglès disponibles al desplegable. S’han localitzat els textos del taller, les fitxes, l’ajuda i el progrés habitual. Queda la revisió lingüística i dels diagnòstics tècnics de les fonts. [Configuració](RO-019-SETUP.md)

### RO-023 — Relleu local i fonts vectorials de més precisió

Comparar la font actual i un MDT de detall al mateix retall de Montserrat, a dues escales i amb la mateixa exageració. Incloure un retall del Cavall Bernat i un segon cas al Pedraforca o a Riglos. Conservar carenes, colls i agulles amb refinament local de la malla segons el relleu i la mida impresa. Mesurar fidelitat del perfil, triangles i temps. Verificar accés des del navegador i retorn a la font general fora de cobertura. [Fonts i interfície](RO-023-FONTS-UX.md) · [Models d’elevacions ICGC](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions) · [Productes PNOA-LiDAR](https://pnoa.ign.es/web/portal/pnoa-lidar/productos-a-descarga)

El pilot del Cavall Bernat combina el MET5 amb un retall numèric de l’ICGC a 50 cm, processat fora de línia. Els tres sòlids passen l’auditoria i el pedaç conserva la vora del retall a 0° i 35°. Queden el contrast visual, el laminat i el carregador automàtic. [Cupó de detall](RELLEU-ROCOS.md#pilot-de-detall-local-amb-el-mdt-de-50-cm)

### RO-024 — Unió de volums i validació d’impressió

El cupó del Bages permet consultar els materials per altura. A Montserrat, l’usuari valida el filament per peça al laminador. A Tamariu, confirma que el 3MF únic s’obre amb quatre plaques. Queda pendent comprovar al laminador les vores i els materials de Tamariu 40 × 45 cm i dels Rasos–Gallina Pelada, i revisar el pas inferior de Rajadell. Impressió física pendent. [Resultats i controls](RO-024-RESULTATS.md)

### RO-025 — Vegetació mesurada i paisatges històrics

El pilot històric queda ajornat. La revisió d’usuari a Cardona i Cornellà ha mostrat superfícies urbanitzades contínues, amb un detall insuficient per representar cada edifici i el seu perfil. La v0.23.13 retira el selector i els accessos. Es conservaran els resultats per reprendre la línia quan hi hagi fonts històriques amb petjades individuals i cobertura útil. [Resultats i criteri de retorn](RO-025-CARTOGRAFIA-HISTORICA.md)

### RO-026 — Fidelitat dels edificis i selecció de fonts

Comparar petjades i parts d’edificis d’ICGC, Catastre i OSM en una segona zona. Cal preservar els edificis independents quan la font els distingeix. [Comparativa de fonts](RO-026-FONTS-EDIFICIS.md)

Les fonts fora d’Espanya queden documentades per a més endavant. GlobalBuildingAtlas s’aparca perquè el LoD1 conserva la simplificació de cobertes. [Proves per país](RO-026-FONTS-EDIFICIS.md#fonts-fora-despanya--v02325) · [Estudi de GlobalBuildingAtlas](RO-026-FONTS-EDIFICIS.md#globalbuildingatlas--estudi-de-viabilitat)

### RO-032 — Cobertes i volums singulars

El motor incorpora cobertes amb dades obertes d’OSM quan els atributs ho permeten i conserva les petjades amb coberta plana si la consulta torna buida. L’RTL de l’ICGC documenta plans LoD2, amb un servei públic de careners en 2D. Resta verificar una font de cobertes 3D consultable des del navegador. [Fonts de cobertes](RO-032-DADES-COBERTES.md#seguiment-del-4-de-novembre) · [Integració](RO-032-INTEGRACIO.md)

La Torre Glòries és el primer edifici d’Open Place Models. En local s’ha verificat la substitució d’ICGC, Catastre i OSM i l’exportació a 1:1.500 i 1:4.000 amb gir. L’usuari confirma que la torre és recognoscible en la maqueta de Barcelona. Queden el laminat i els controls amb altres models. [Pilot i retalls de prova](RO-032-INTEGRACIO.md#pilot-de-la-torre-glòries--v02327)

Els llocs que substitueixen un fragment del relleu es coordinen amb RO-035. El catàleg documenta el procés per investigar candidats i preparar malles. [Guia de contribució](https://github.com/aaronFortuno/open-place-models/blob/main/CONTRIBUTING.md)

### RO-033 — Ponts i viaductes

Els ponts curts que poden recolzar a totes dues ribes s’ajusten a la cota de l’aigua modelada. El pressupost es reparteix pel retall i prioritza els creuaments. Verificar el model complet d’Amsterdam al visor i laminar les obertures. [Mesures dels canals](RO-033-CONTROLS-PROCEDIMENTALS.md#ponts-curts-sobre-canals)

En un render del centre d’Amsterdam, l’usuari només ha identificat tres ponts absents. El retall precís i els tres identificadors queden per determinar. L’observació visual i el recompte d’eixos del motor es registren per separat.

Pilars i taulers procedimentals, amb dades específiques documentades per a Rajadell. Millau i el cupó del Bages estan validats al visor. La regla general per als fragments continguts recupera el tauler de Montgròs a 1:20.000 i conserva el de la Fessona, amb dues unions a cadascun. L’obertura de 0,27 mm de Montgròs es conserva a la secció mostrejada del cupó laminat amb capes de 0,10 i 0,20 mm. Pendent de comprovar en una placa completa i en una impressió física. [Controls procedimentals](RO-033-CONTROLS-PROCEDIMENTALS.md) · [Suports segons escala](RO-033-SUPORTS-ESCALA.md)

### RO-034 — Túnels imprimibles

Obertures estimades amb volta parabòlica i paviment del material de la via. Revisar portals i pas interior al laminador en més d’un retall. El pilot amb la calçada nova comparteix una rasant entre els accessos i l’interior, amb les dues boques auditades al 3MF. Les omissions per falta de coberta han de quedar indicades. [Criteris i controls](RO-034-OBERTURES.md)

### RO-035 — Cavitats i relleus amb voladissos

El cupó local dels Degotalls a 1:200 té bon resultat segons l’usuari. Falta la transformació per integrar-lo al terreny. La Roca Foradada serà el control d’obertura passant. Cal trobar dades 3D de les boques i la volta, validar l’encaix i comprovar la llum al laminador. El mateix flux ha de servir en altres retalls amb dades equivalents. [Pilot i fonts](RELLEU-ROCOS.md)

### RO-044 — Catastre per seccions i recuperació de configuracions

Càrrega progressiva validada a Tamariu. Comprovar una consulta mixta amb sectors buits, subdivisions i recuperació de la font després d’un error. [Recuperació](RO-044-CATASTRE-RECUPERACIO.md)

### RO-045 — Coherència visual dels sidebars

A escriptori, la cerca i el mapa queden sota la capçalera de Territori i els ajustos tenen un desplaçament independent. A 1280 × 720 i 1100 × 680, la roda canvia el zoom al mapa i manté el retall quan es desplacen els ajustos. També s’ha comprovat que el retall es conserva en canviar de pas i en passar al format mòbil. Queda la validació d’usuari amb una maqueta carregada. [Auditoria](AUDITORIA-USABILITAT.md)

### RO-046 — Catàleg de llocs recomanats

El [catàleg](RO-046-CATALEG.md) inclou 37 retalls, amb 23 fitxes de Relleu pur i 14 de Model complet. El carrusel inicial barreja l’ordre i reparteix els modes al llarg del bucle. «Galeria de maquetes» a la capçalera obre una graella amb el focus a la cerca i filtres per mode, mida i tipus de paisatge. «La teva maqueta» mostra el resum del lloc mentre el visor mostra el model corresponent. Queda revisar l’enquadrament, la llegibilitat i els temps de generació en ús, i comprovar el gruix de la base a les fitxes costaneres.

Cap de Creus, Tamariu, Tenerife i Santorini validats. Les sis incorporacions ja tenen els ajustos dels JSON de revisió. El panoràmic dels Pirineus amplia la cobertura de sòl nu i neu o gel. [Cua de revisió](RO-046-CATALEG.md#revisió-per-a-maquetes-daula) · [Retalls de prova inicials](RO-046-PROVES-RELLEU.md)

A la v0.23.24 totes les fitxes s’obren amb detall alt. El panoràmic dels Pirineus s’ha completat al navegador amb 5.005.740 triangles i quatre peces. Queda validar el rendiment en ús habitual i els darrers ajustos de les Bardenas, Colorado i Lavaredo.

### RO-047 — Precàrrega opcional de fonts alternatives

Reprendre quan les consultes i la recuperació siguin fiables. Si es prova, la precàrrega ha de ser opcional i acotada.

### RO-050 — Ferrocarrils diferenciats

Realç i material ferroviari diferenciats, comprovats localment. Pendent de contrastar l’assignació i la visibilitat al laminador. [Ferrocarrils](RO-050-FERROCARRILS.md)

### RO-051 — Perfils de carreteres principals

Les vies ràpides i el ferrocarril han de conservar una rasant contínua. Validar perfils, connexions i omissions a diverses escales. Els cupons de paviment amb secció transversal plana, excavació i reblert cobreixen corbes, una cruïlla en T, ponts i túnels. La v0.22.11 amplia el paviment independent als trams interiors i als talls de la peça, i munta cada tram amb el seu suport. Les cruïlles complexes i els trams que encara no passen les comprovacions conserven el càlcul habitual. [Perfils i controls](RO-051-PERFILS-VIARIS.md) · [Mesures](RO-051-RENDIMENT.md)

Al segon retall de l’Hospitalet, les cotes desconegudes d’alguns creuaments amb pont, túnel o ferrocarril fan que trams principals tornin al paviment de relleu. Amb `?paviment=rasant` s’amplia la calçada independent fora d’aquests creuaments. Queda pendent que les transicions i els ramals connectin amb la rasant dels dos costats sense graons. [Segon retall de l’Hospitalet](RO-052-CONTINUITAT.md#prova-de-calçada-amb-rasant-pròpia-v02315)

Els cupons de Mataró i Palamós aïllen l’encaix de la calçada i el tractament dels senders sobre el MET5. L’usuari els valida al 3MF. El pas inferior de Mataró queda obert a 1:3.333 i té una cruïlla seca d’una sola cota a 1:8.000. Queda integrar la decisió de nivell a la xarxa completa i provar encreuaments amb més de dos eixos. [Cupons i mesures](RO-052-CONTINUITAT.md#pas-inferior-i-cruïlla-a-nivell-a-mataró-v02317)

Al subretall dens de l’Hospitalet, els talls locals aïllen la fallada de la via `5544604682` i conserven 19 perfils suaus que abans es perdien tots. El ramal `1647439892` conserva les dues calçades inferiors en un cupó amb les cotes del mateix retall. Queden pendents el laminat, els extrems que encara segueixen el terreny i els creuaments amb llum insuficient. [Mesures i reproducció](RO-052-CONTINUITAT.md#talls-locals-sota-els-taulers-v02319)

### RO-052 — Continuïtat i amplada del traçat viari

Els senders tenen un mínim de 0,30 mm i el selector de Vies en modifica l’amplada. A l’Hospitalet, la v0.23.13 recupera el paviment independent i ajusta els dos taulers principals que tocaven l’aigua. Revisar les unions, els ramals i el laminat amb totes les capes. [Controls i reproducció](RO-052-CONTINUITAT.md)

### RO-053 — Flux de treball per etapes

L’amplada i la fondària es poden editar al principi de «La teva maqueta», dins d’«Exporta» al mòbil. El formulari indica els límits i manté el flux d’aplicar i generar la nova mida.

El taller mòbil integra els passos en panells inferiors que deixen el visor a la vista. S’hi pot generar i ajustar la maqueta, seleccionar el nombre de materials i exportar amb els formats habituals. Queda pendent comprovar els gestos i el teclat en dispositius reals. [Flux mòbil](RO-053-UX.md#taller-mòbil)

El selector inicial compara les mides i els talls sobre una taula de 60 × 40 cm. Els retalls mostren el mateix paisatge a escala constant i s’ofereix un sol rectangle predefinit. El progrés per capes està validat en diversos llocs. A Tamariu 40 × 45 cm, les guies es veuen en zenital i perspectiva i coincideixen amb les cares de tall dels quatre 3MF. El traç es distingeix menys al bosc dens. «La teva maqueta» permet preparar una mida nova conservant el centre, el gir i els ajustos. Queda validar el redimensionament en ús i millorar el contrast de les guies al bosc. [Validació](HISTORIAL.md#v0215--mides-i-guies-de-tall) · [Flux](RO-053-UX.md) · [Mesures](RO-053-TEMPS.md)

### RO-054 — Galeria local de projectes

«Projectes desats» agrupa l’obertura, l’esborrat i la còpia del catàleg. El JSON es pot recuperar en un altre navegador i es fusiona amb els ajustos locals, que tenen prioritat si un projecte ja hi és. Queda validar la recuperació d’un projecte girat amb traços i materials als dos modes en l’ús habitual. Conservar la malla exacta queda per a una fase posterior.

### RO-055 — Mode de relleu pur

Les peces normals abasten d’1:10.000 a 1:500.000. Els retalls amplis fan servir el pressupost de dades del panoràmic segons l’extensió geogràfica. [Mesures i fonts](RO-055-RELLEU-PUR.md)

El mar cartografiat queda a 5 mm de la base, també en canviar l’exageració. A l’interior es pren el mínim un cop anivellats els llacs.

L’exageració vertical, els rius i la textura de vegetació s’apliquen automàticament sobre la maqueta carregada i mantenen la càmera. El canvi de detall inicia el recàlcul automàticament. Els canvis de mida o de retall es poden confirmar amb «Genera el model».

ESA WorldCover aporta cobertes noves de sòl nu i neu o gel als Alps, Lavaredo, el Fuji i Geiranger. Els mosaics regionals s’ometen si un píxel supera els 2 mm a la maqueta. Queda pendent validar una font remota per ampliar la cobertura a altres serralades.

«Vegetació simulada» activa una textura contínua i editable sobre el bosc. A 1:10.000 l’alçada màxima per defecte és de 0,8 mm, regulable entre 0,2 i 2 mm, i la irregularitat inicial és del 45 %. L’altura varia amb l’escala i se suavitza als límits del bosc. Les vores internes de les tessel·les queden dissoltes, comprovat amb el retall de linies-vegetacio.json. Queda pendent comprovar el laminat i una impressió de prova.

Validar les quatre peces dels Rasos–Gallina Pelada al laminador, sobretot les vores adjacents i la visibilitat de rierols i arbres. [Mesures i fonts](RO-055-RELLEU-PUR.md)

### RO-056 — Base, talls i plaques

«Impressió» permet ajustar la base i repartir la maqueta amb mides diferents per columna i fila. Les guies i l’exportació comparteixen els mateixos talls. El 3MF multiplaca actual té una placa de referència de 256 × 256 mm; els talls més grans s’exporten en fitxers separats. Queda comprovar el laminat i, en una fase posterior, verificar els perfils reals d’impressores i avisar si una peça no hi cap.

A la v0.23.24, un doble clic o la tecla Supr sobre un tirador restableixen només aquell tall, respectant l’espai mínim entre peces.

Cupó de Tamariu a 1:10.000, peça de 10 × 10 cm, centre 41,918 N, 3,2075 E, detall equilibrat, base de 5 mm i tall a 40 mm des del sud. El 3MF conté dues plaques de 100 × 60 i 100 × 40 mm. Les malles dels quatre filaments són tancades, el mar arriba a la base en totes dues peces i la diferència d’àrea de la secció compartida per filament és inferior a 0,000001 mm². L’usuari confirma que el laminat és correcte. Fitxer local `output/tamariu-cupo-dues-plaques-10x10.3mf`.

El format panoràmic admet de 51 a 100 cm de costat llarg i de 10 a 20 cm de costat curt, en Relleu pur. A la vista inicial, les peces que superen conjuntament els 60 cm es disposen en dues files a la mateixa escala que la taula. La malla rectangular segueix un pas físic similar als dos eixos i comparteix mostres i cota de base als talls.

En una prova de 100 × 20 cm, l’usuari observa un temps aproximat de 20 s i detecta que els mars quedaven sense material propi. La v0.22.20 incorpora els polígons marins al visor i a l’exportació. El retall complet de l’eix pirinenc ja mostra els dos mars al navegador. Queden la mesura de memòria i el control de les peces al laminador.

Relleu pur permet triar entre un i sis filaments. Cada capa es pot assignar a un filament i el 3MF de Bambu amb diverses plaques fa servir la mateixa assignació per al projecte sencer. Queda validar un panorama amb menys de sis filaments al laminador.

La base anormalment alta de Tamariu (30 × 30 cm a 1:10.000) venia del codi marí −8888 del MET5. El lector el converteix a 0 m i conserva el recurs a una font alternativa quan falta cobertura. Al retall real, els dos modes situen la superfície marina a 5 mm. En Relleu pur, els tres fragments marins són sòlids tancats fins a la cara inferior. Pendent de validar els talls i el material al laminador. [Especificació del MET5, §5](https://icgc-web-pro.s3.eu-central-1.amazonaws.com/produccio/s3fs-public/met5v10esp_02ca_54782.pdf#page=8)
