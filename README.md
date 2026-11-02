# Relleu Obert

Prototip educatiu separat de Terrology: generació de maquetes geogràfiques amb JavaScript, íntegrament al navegador, publicable a GitHub Pages. No s’ha copiat codi de Terrology.

**v0.18.1 experimental · 2 de novembre de 2026**

Novetats v0.18.1: túnels estimats activats inicialment, amb sostre parabòlic i paviment del material dels camins o del ferrocarril. L'envolupant de punts alts per a vies principals es conserva com a prototip desactivat, pendent d'optimitzar els retalls grans. [Punt de represa en un altre ordinador](work/REPRESA.md), [estat viari](work/RO-051-PERFILS-VIARIS.md) i [obertures](work/RO-034-OBERTURES.md). Cal revisar el laminat; les geometries estimades no són cotes constructives mesurades.

Novetats v0.18: ferrocarrils amb realç seleccionable i material propi; [comprovacions](work/RO-050-FERROCARRILS.md). Revisió dels portals dels túnels experimentals. Font nova «OpenStreetMap · cobertes i parts», per mostrar paràmetres de coberta i parts originals en el mode «Altura i coberta de les dades». [Abast, mostra Torre Glòries i accés remot pendent de validar](work/RO-032-INTEGRACIO.md). El mode limitat continua pla. No es prometen cobertes on no hi ha atributs ni geometries mesurades a partir d’una parametrització.

Novetats v0.17: pilars adaptats a l’escala i suports auxiliars per acotar les llums. [Comprovacions](work/RO-033-SUPORTS-ESCALA.md). Túnels estimats amb excavació real en una opció experimental desactivada per defecte; cal revisar portals i laminat. [Abast i límits](work/RO-034-OBERTURES.md). Exemples amb càrrega automàtica, marc negre fix i plaques ajornades. [Backlog reorganitzat](work/BACKLOG.md).

Novetats v0.16: generació procedimental de ponts OSM amb perfils estimats entre cotes DEM dels extrems, pilars i enllaços. Rajadell es conserva com a excepció geogràfica. [Funcionament i límits](work/RO-033-PROCEDURAL-CORE.md).

Correcció v0.15.1: els detalls de Rajadell es recuperen per ubicació també en retalls moguts o ampliats fora de la mostra. Aquest punt parcial precedeix la integració procedimental de v0.16.

Novetats v0.15: pilars simplificats amb evitació de camins i edificis i prolongacions suaus fins a la carretera. El viaducte principal de Manresa té onze pilars segons el repartiment del projecte i dos enllaços, units al tauler abans de mostrar-los/exportar-los. Suports i enllaços són estimats, pendents de laminat. Selector per realçar camins 0,5 o 1 mm de maqueta, desactivat per defecte. [Comprovacions i límits](work/RO-033-SUPORTS-I-ENLLACOS.md).

Novetats v0.14: primer tauler del viaducte de Manresa amb cotes 3D reals de l’ICGC, separat del terreny i inclòs al 3MF. Gruix imprimible simplificat, sense pilars mesurats; encara només a la mostra. [Implementació i límits](work/RO-033-IMPLEMENTACIO.md). El túnel continua pendent de dades suficients. [Llibre d’estil obligatori](DESIGN.md) per a qualsevol canvi d’interfície, incloses tasques delegades.

Correcció v0.13.1: la cota mínima del retall se situa a 5 mm de la cara inferior, sense convertir l’altitud absoluta en gruix de plàstic. Es mantenen els desnivells i l’exageració; edificis, vegetació i aigua comparteixen la transformació vertical, registrada a la procedència.

Novetats de v0.13: Catastre dividit per seccions quan el servei rebutja la regió, amb duplicats eliminats i sense acceptar resultats parcials. Els canvis d’edificis fallits restauren els ajustos anteriors; una regió nova pot usar una altra font amb avís explícit. Sidebars homogenis i controls del marc units a una previsualització fidel, sense canviar el zoom. Inici al viaducte de l’Eix Diagonal (41.71792, 1.78391), amb Tamariu conservat al catàleg de llocs recomanats. Rosa dels vents ajornada i fletxa independent retirada del menú.

Des de v0.12: vista «Presentació» amb taula i llum, les mateixes malles i colors i retorn a la vista de treball. Render a demanda en aquest mode, amb reducció de qualitat si es detecten fotogrames lents. Resum de fonts remotes i fitxers propis dins d’un apartat avançat plegat. Els fonaments de sòlids de RO-024 es proven separadament abans d’afectar les exportacions normals; ponts i cavitats reals encara pendents.

RO-024 ja té unió per material, auditoria real de la Perica i un [túnel sintètic de control](work/RO-024-TUNEL-CONTROL.md) amb pas continu entre dues peces. `node scripts/solid-control.mjs` genera un control petit de 40 × 24 × 12 mm per revisar al Bambu; `--large` genera el de 40 cm. 209 proves i construcció estàtica correctes; laminador i impressió física pendents.

Des de v0.11: el Catastre pot retornar zero edificis sense aturar la maqueta; pinzell ×0,5 (màxim ×2), cobertura única per gest i navegació recuperada en plegar-lo. Altura/font d’edificis s’actualitzen automàticament sobre terreny vigent. Complements independents en ZIP amb 3MF i STL: marc ajustable i placa en majúscules amb accents. La fletxa independent de v0.11 queda retirada del menú a v0.13. La rosa dels vents incrustada demanada a RO-017 continua pendent. [Sistema d’idiomes preparat](work/RO-019-SETUP.md), amb català com a única llengua i migració de textos parcial. Comprovar laminat i ajust físic abans d’imprimir.

Pinzell amb repartiment aleatori, font Catastre opcional amb parts d’edificis i actualització d’aquesta capa sense reconstruir el terreny. ICGC queda seleccionat per defecte dins de l’àmbit català i OpenStreetMap fora; no hi ha una opció Automàtic duplicada.

La vegetació automàtica es reparteix per tota la zona verda encara que s’assoleixin els 12.000 arbres. El pinzell té prioritat sobre la vegetació automàtica, i la densitat només afecta els traços nous. Exportació sense opcions de broquet ni tipus de filament: es trien al laminador. Estudi i comparació de parts d’edificis, cobertes, ponts, túnels i cavitats a [work/PAISATGE-3D.md](work/PAISATGE-3D.md).

Sidebars reorganitzats en quatre tasques: lloc/orientació, mida/escala, relleu/edificis i vegetació. Materials reunits a la dreta. Escala en un únic camp amb suggeriments, gir al costat del mapa amb retorn al nord i avís d’àrea massa gran abans de generar. Els arbres es dimensionen segons l’escala geogràfica; si són massa petits es conserva la superfície del bosc sense ampliar-los artificialment. Vegeu l’[auditoria d’usabilitat](work/AUDITORIA-USABILITAT.md).

La v0.6 manté sempre visibles els quatre menús de configuració: només té scroll el contingut de l’apartat obert. Estadístiques al sidebar dret, fonts dins del V4V, favicon i transicions de 220 ms amb moviment reduït. Marc visual opcional (negre, blanc o to de fusta), separat de les malles exportades.

El retall es pot girar respecte al nord, també amb mida rectangular i escala fixada. Es carrega l’envolupant de totes les cantonades i el mateix gir s’aplica a les capes, el relleu i l’exportació. Les files de peces es numeren des de la part superior del model, que amb un gir no equival necessàriament al nord.

«Fitxers propis · avançat», plegat dins de «Relleu i edificis», admet MDT GeoTIFF numèric d’una banda en metres (100 MB / 4 milions de cel·les) i edificis GeoJSON (30 MB / 10.000 elements / 300.000 vèrtexs). S’admeten EPSG:4326/4258/3857, UTM WGS84 i ETRS89 UTM 29–31. El GeoTIFF ha de cobrir tot el retall sense buits; no es transforma el datum vertical. El GeoJSON substitueix tota la capa d’edificis i conserva parts i patis que ja existeixin al fitxer; les dades absents no s’inventen ni es completen amb una altra font. No és encara una selecció automàtica de fonts més bones (RO-026). Els fitxers es processen al navegador, sense servidor d’importació.

L’exportació conserva colors i assignacions de materials, sense selectors de broquet ni tipus de filament. L’usuari tria aquests ajustos al laminador. RO-003 continua ajornat. Marc imprimible i etiquetes ja tenen exportació independent; validació física pendent.

Apartats de configuració replegables, controls flotants al preview i escala horitzontal en un sol camp (per exemple, 1:1.000 o 1000; buit segueix el mapa). En mode fix, la mida física defineix el territori a aquesta escala: 15 × 20 cm a 1:1.000 són 150 × 200 m. Arrossegar el mapa canvia el centre; fer zoom només canvia la vista del mapa. L’exageració vertical és independent. «Carrega exemple» recupera el retall del lloc recomanat i el mode lliure.

RO-001 validat per l’usuari. El [diagnòstic RO-002](work/RO-002-DIAGNOSTIC.md) identifica el megabloc de la Perica com una única petjada ICGC sense divisions; es pot comparar amb parts del Catastre mitjançant el selector. L’usuari ha validat la millora de volums a Tamariu. Les parts són volums, no necessàriament habitatges independents; cobertes reals i contrast en altres zones continuen oberts.

- Web: https://aaronFortuno.github.io/relleu-obert/
- Repositori: https://github.com/aaronFortuno/relleu-obert
- Backlog, prioritats i seguiment: [work/BACKLOG.md](work/BACKLOG.md). Tasques validades: [work/HISTORIAL.md](work/HISTORIAL.md). Observacions originals: [work/MILLORES-BUGS.md](work/MILLORES-BUGS.md).
- Historial de versions: [CHANGELOG.md](CHANGELOG.md). Decisions tècniques: [ARCHITECTURE.md](ARCHITECTURE.md).

## Provar-lo

En aquest ordinador, `Obre-preview.ps1` inicia la previsualització amb les dependències ja preparades (si PowerShell permet executar scripts). No canvia la configuració del sistema.

Amb Node.js 22 o posterior i pnpm instal·lats:

```sh
pnpm install
pnpm build
pnpm exec vite preview --host 127.0.0.1 --configLoader native
```

Obre l’adreça local que apareix. `pnpm dev` és útil per desenvolupar. La versió construïda no necessita Node: només un allotjament estàtic HTTP.

Les mostres del viaducte i de Tamariu contenen cadascuna quatre tessel·les vectorials i quatre tessel·les d’elevació reals, amb origen i data a `public/data/eix-diagonal.json` i `public/data/tamariu.json`. El model inicial usa aquestes dades locals; el mapa de selecció carrega imatges d’OpenStreetMap. També es pot carregar una altra regió des del mapa: el navegador consulta directament OpenFreeMap i els proveïdors de relleu, amb temps límit i errors visibles. La cerca d’adreces consulta Photon en prémer el botó, amb resultats guardats durant la sessió. Les coordenades s’interpreten localment. No hi ha servidor propi ni comptes d’usuari.

La v0.2 inclou també les edificacions oficials de l’ICGC per a la mostra. A l’àmbit català, ICGC és la font seleccionada per defecte: consulta el Referencial Topogràfic Territorial i substitueix les petjades OSM que s’hi encavalquen, conservant les petjades OSM complementàries. Es poden comparar les fonts amb el selector d’edificis. La font i la data de consulta es desen a les metadades; més cobertura no implica que totes les edificacions estiguin actualitzades al dia.

## Què hi ha implementat

- Previsualització 3D giratòria i vista zenital.
- Partició vectorial de terra/aigua, vegetació i camins. Els límits es retallen contra les cel·les del relleu: no es classifiquen triangles sencers per un únic punt.
- Mar pla, base, exageració vertical explícita i dimensions en mil·límetres.
- Edificis extrudits a partir de petjades cartogràfiques.
- Edificis amb coberta horitzontal i altura limitada a 5 m reals per defecte, regulable i mesurada des del punt més alt del terreny dins de la petjada. Al costat baix d’un pendent la façana és més alta. Opcions alternatives: altura de les dades amb coberta horitzontal, petjades de color (0,12 mm) o sense edificis. En mode d’altura/coberta de dades, s’admeten gabled/skillion si el GeoJSON aporta roof:shape, roof:height i roof:direction; les altres es mantenen planes. Catastre i les tessel·les actuals no aporten aquesta forma.
- Camins amb vores contínues i arrodonides a les corbes i als extrems, calculades a partir de l’amplada de cada traçat.
- Volums d’arbres procedimentals dins de zones verdes, evitant edificis i camins.
- Densitat del pinzell regulable de ×0,25 a ×2 (inicial ×0,5), desada per traç i sense repopular zones solapades dins del mateix gest. Bosc inicial amb densitat ×2,5, distribució per tota la zona verda amb pressupost de 12.000 arbres, variació de capçada i arrels incrustades a la malla. En saturació, el pinzell substitueix arbres automàtics; si tot són arbres pintats, els nous substitueixen els més antics amb avís.
- Altitud comuna per a totes les superfícies i objectes; detecció de mostres invàlides i pics aïllats d’un quilòmetre, amb reparacions documentades.
- Lectura numèrica directa dels fitxers d’elevació WebP/PNG, sense canvas; preserva els canals RGB originals. Les metadades de descodificació i els hashes de les tessel·les faciliten investigar pics intermitents.
- Fonts alternatives de relleu (Mapterhorn / Mapzen Terrain Tiles), amb tractament explícit dels 404 marins només quan la cartografia confirma cobertura oceànica completa.
- Vuit categories: terreny, mar, edificis, camins, sòl de bosc, arbres, prats i aigües interiors; reassignables a 1, 2, 4 o 8 materials sense eliminar geometria.
- Layout d’escriptori estable, ajuda i changelog en diàlegs i peu amb llicència i V4V.
- Mapa amb retall centrat, cerca d’adreces i coordenades `latitud,longitud`, i mides físiques quadrades o rectangulars.
- Vegetació recalculada independentment del terreny; formes de capçada i pinzell/goma sobre el preview, amb desfer i restablir.
- El pinzell aplica tot el traç en aixecar-lo, mostra un indicador durant el càlcul i impedeix començar-ne un altre fins que apareix el resultat. Desfer anul·la el traç complet.
- Fins a 40 × 40 cm, amb exportació en peces de fins a 20 × 20 cm: talls tancats i plànol de muntatge, sense encaixos ni toleràncies d’unió.
- Exportació 3MF estàndard com una única composició de parts i ZIP amb STL per material, amb metadades de procedència.
- Càlcul i exportació en un Web Worker; la interfície es manté operativa.
- Proves de geometria, forats, escala, absència de dades i estructura de les exportacions.

## Límits d’aquesta primera prova

**És un prototip geomètric, no una garantia de models llestos per imprimir.** Cal validar les interseccions de volums i el laminat amb el programa d’impressió. Les peces d’una mateixa capa poden contenir closques que es toquen o s’encavalquen; encara falta una unió booleana robusta abans de l’exportació. No s’ha comprovat una impressió física.

- Els arbres són una distribució procedimental amb capçada orientativa de 12 m, convertida a l’escala horitzontal. Per sota de 0,25 mm de diàmetre s’ometen amb avís; el llindar no garanteix impressió amb qualsevol broquet. No són arbres individuals localitzats a partir de LiDAR o ortofotografia.
- Les tessel·les d’OpenFreeMap són cartografia generalitzada per visualització: la costa pot ser molt millor que una classificació per triangles, però no equival a una línia topogràfica de precisió. No es promet paritat amb Lichtbild.
- Les elevacions de Mapterhorn combinen fonts amb precisions diferents. La resolució de la imatge no és la resolució real del terreny. Els penya-segats poden estar suavitzats. Es pot importar un MDT local GeoTIFF; falta incorporar-ne un proveïdor automàtic d’alta precisió.
- L’alçària d’edificis de la font vectorial pot ser orientativa, fins i tot quan `render_height` existeix. Les peces sense valor utilitzen 6 m i queden indicades. La mida mínima visible és també una adaptació per representació/impressió.
- Boscos, aigua i camins poden tenir omissions en les dades originals. Ponts i túnels tenen geometria procedimental estimada; Rajadell conserva una excepció amb cotes de font. Les cavitats naturals i els interiors mesurats continuen pendents.
- Les connexions a fonts públiques depenen de disponibilitat, CORS i condicions d’ús del proveïdor. “Sense backend propi” no vol dir “sense serveis externs”.
- Hi ha importació local de GeoTIFF, però encara falta validació/reparació general de malla. La divisió en peces comprova que el motor pugui tractar les malles com a sòlids; un error atura l’exportació i queda visible.
- L’opció 3MF estàndard és genèrica; un avís de Bambu Studio sobre un fitxer no nadiu és esperable. Els colors de visualització no són perfils de filament. Cal assignar els filaments i revisar l’escala i totes les parts.

La v0.2 afegeix una exportació específica **3MF per a Bambu** amb colors, assignació de filament per part i per triangle, i les metadades requerides pel seu importador. Es manté el 3MF estàndard com a opció independent. El marcador `Application` del dialecte compatible és necessari perquè Bambu llegeixi aquestes metadades; `Designer`, `RelleuObert:Generator` i la procedència indiquen el generador real. No s’inclou cap perfil d’impressora ni configuració de temperatura. L’usuari ha confirmat la importació de quatre materials amb colors correctes a Bambu Studio. La impressió física continua pendent.

## GitHub Pages

La carpeta `dist/` conté només fitxers estàtics. La construcció utilitza rutes relatives (`--base=./`) i empaqueta el Worker. Es pot publicar sota `usuari.github.io/repositori/`.

S’inclou `.github/workflows/pages.yml` per construir i desplegar quan es faci push a `main` o s’executi manualment. GitHub Pages utilitza GitHub Actions com a font. La v0.1 s’ha comprovat en local; les comprovacions de la web desplegada les fa l’usuari manualment.

Validació local de la v0.2: 27 proves superades, construcció estàtica i generació real de Tamariu i d’una regió de Barcelona. El cas amb latitud 42.918 i longitud 3.2075, que retorna tessel·les de relleu inexistents, s’ha comprovat com a regió completament marina. La comprovació del 3MF Bambu cobreix l’estructura i les assignacions exportades; encara cal verificar-ne la importació i el laminat a l’aplicació de l’usuari.

Validació local de la v0.3: 34 proves superades, construcció estàtica i comprovació visual d’escriptori a 1440 × 900. Cerca natural de La Torre de Claramunt, assignació d’1 a 8 materials, goma/desfer i generació real de Tamariu a 40 × 40 cm amb 12.000 arbres. Exportació al navegador d’un ZIP amb quatre models de 20 × 20 cm i talls tancats. La impressió i la comprovació remota continuen a càrrec de l’usuari.

Validació local de la v0.4: 39 proves superades i construcció estàtica. Proves de revolts i amplada dels camins, límit dels edificis sobre pendent amb exageració ×1 i ×3, petjades i mode sense edificis. Tamariu real generat amb límit de 5 m, malles comprovades amb Manifold i retall de prova. Interfície verificada amb indicador de vegetació i bloqueig de traços nous durant el càlcul.

Validació local de la v0.4.1: 40 proves superades, construcció estàtica i previsualització de Tamariu. Comprovats 5.355 triangles de coberta horitzontals a la mostra real i les quatre malles com a sòlids amb Manifold. Les proves cobreixen el límit sobre la cota més alta, amb exageració ×1/×3 i un pic interior a la petjada.

Validació local de la v0.4.2: 44 proves; els quatre WebP coincideixen byte a byte amb libvips/sharp; una tessel·la PNG real de Mapzen es descodifica correctament. Sis generacions de Tamariu amb entrades controlades: tres malles repetides tenen el mateix SHA-256, i desactivar arbres o edificis conserva el terreny. La prova amb soroll de píxel simulat demostra la vulnerabilitat anterior, però la causa concreta al Brave de l’usuari continua pendent de confirmació. Vegeu [l’informe RO-001](work/RO-001-DIAGNOSTIC.md).

## Direcció del projecte

Vegeu `ARCHITECTURE.md` per les decisions i els passos següents. Vegeu `SOURCES.md` per fonts i llicències. El codi propi es publica sota MIT; això no canvia les llicències de les dades cartogràfiques.

## Fonts d’edificis i actualització de capes

Catastre és una alternativa opcional en àrees de menys de 4 km² de la península i les Balears, amb les limitacions territorials del servei. Es consulten edificis i parts, excloent parts de zero plantes sobre rasant i sense superposar envolupants a les parts. Les altures de plantes × 3 m (o 6 m quan no hi ha informació) són estimacions, no mesures. El servei s’accedeix directament des del navegador i pot retornar errors de cobertura o disponibilitat; no es canvia silenciosament de proveïdor. Detalls a [PAISATGE-3D.md](work/PAISATGE-3D.md).

Si només canvien els edificis, «Actualitzar els edificis» reutilitza terreny, mar, camins i cobertes del sòl; conserva els arbres que no col·lideixen amb les petjades noves. Canviar altura no mou els arbres. Canviar lloc, mida, gir, relleu o exageració sí que requereix reconstruir el model. Unió general i impressió física pendents; pla a [RO-024-SOLIDS.md](work/RO-024-SOLIDS.md).
