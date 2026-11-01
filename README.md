# Relleu Obert

Prototip educatiu separat de Terrology: generació de maquetes geogràfiques amb JavaScript, íntegrament al navegador, publicable a GitHub Pages. No s’ha copiat codi de Terrology.

**v0.4 experimental · 1 de novembre de 2026**

- Web: https://aaronFortuno.github.io/relleu-obert/
- Repositori: https://github.com/aaronFortuno/relleu-obert
- Canvis i treball pendent: `CHANGELOG.md` i `ARCHITECTURE.md`.

## Provar-lo

En aquest ordinador, `Obre-preview.ps1` inicia la previsualització amb les dependències ja preparades (si PowerShell permet executar scripts). No canvia la configuració del sistema.

Amb Node.js 22 o posterior i pnpm instal·lats:

```sh
pnpm install
pnpm build
pnpm exec vite preview --host 127.0.0.1
```

Obre l’adreça local que apareix. `pnpm dev` és útil per desenvolupar. La versió construïda no necessita Node: només un allotjament estàtic HTTP.

La mostra de Tamariu conté quatre tessel·les vectorials i quatre tessel·les d’elevació reals, amb origen i data a `public/data/tamariu.json`. El model inicial usa aquestes dades locals; el mapa de selecció carrega imatges d’OpenStreetMap. També es pot carregar una altra regió des del mapa: el navegador consulta directament OpenFreeMap i els proveïdors de relleu, amb temps límit i errors visibles. La cerca d’adreces consulta Photon en prémer el botó, amb resultats guardats durant la sessió. Les coordenades s’interpreten localment. No hi ha servidor propi ni comptes d’usuari.

La v0.2 inclou també les edificacions oficials de l’ICGC per a la mostra. En regions de Catalunya, el mode automàtic consulta el Referencial Topogràfic Territorial i substitueix les petjades OSM que s’hi encavalquen, conservant les petjades OSM complementàries. Es poden comparar les fonts amb el selector d’edificis. La font i la data de consulta es desen a les metadades; més cobertura no implica que totes les edificacions estiguin actualitzades al dia.

## Què hi ha implementat

- Previsualització 3D giratòria i vista zenital.
- Partició vectorial de terra/aigua, vegetació i camins. Els límits es retallen contra les cel·les del relleu: no es classifiquen triangles sencers per un únic punt.
- Mar pla, base, exageració vertical explícita i dimensions en mil·límetres.
- Edificis extrudits a partir de petjades cartogràfiques.
- Edificis limitats a 5 m reals per defecte, amb altura màxima configurable. El volum limitat segueix el terreny per respectar el límit també als vessants. Opcions alternatives: altura de les dades amb coberta horitzontal, petjades de color (0,12 mm) o sense edificis. No s’inventen teulades inclinades.
- Camins amb vores contínues i arrodonides a les corbes i als extrems, calculades a partir de l’amplada de cada traçat.
- Volums d’arbres procedimentals dins de zones verdes, evitant edificis i camins.
- Densitat de vegetació regulable de ×0,25 a ×5 (inicial ×2,5), variació moderada de capçada i arrels incrustades a la malla generada.
- Altitud comuna per a totes les superfícies i objectes; detecció de mostres invàlides i pics aïllats d’un quilòmetre, amb reparacions documentades.
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

- Els arbres són una distribució procedimental; no són arbres individuals localitzats a partir de LiDAR o ortofotografia.
- Les tessel·les d’OpenFreeMap són cartografia generalitzada per visualització: la costa pot ser molt millor que una classificació per triangles, però no equival a una línia topogràfica de precisió. No es promet paritat amb Lichtbild.
- Les elevacions de Mapterhorn combinen fonts amb precisions diferents. La resolució de la imatge no és la resolució real del terreny. Els penya-segats poden estar suavitzats. Falta incorporar un proveïdor de MDT local d’alta precisió (ICGC/GeoTIFF).
- L’alçària d’edificis de la font vectorial pot ser orientativa, fins i tot quan `render_height` existeix. Les peces sense valor utilitzen 6 m i queden indicades. La mida mínima visible és també una adaptació per representació/impressió.
- Boscos, aigua i camins poden tenir omissions en les dades originals. Els ponts i túnels no es reconstrueixen encara de manera específica.
- Les connexions a fonts públiques depenen de disponibilitat, CORS i condicions d’ús del proveïdor. “Sense backend propi” no vol dir “sense serveis externs”.
- Encara no hi ha importació de GeoTIFF ni validació/reparació general de malla. La divisió en peces comprova que el motor pugui tractar les malles com a sòlids; un error atura l’exportació i queda visible.
- L’opció 3MF estàndard és genèrica; un avís de Bambu Studio sobre un fitxer no nadiu és esperable. Els colors de visualització no són perfils de filament. Cal assignar els filaments i revisar l’escala i totes les parts.

La v0.2 afegeix una exportació específica **3MF per a Bambu** amb colors, assignació de filament per part i per triangle, i les metadades requerides pel seu importador. Es manté el 3MF estàndard com a opció independent. El marcador `Application` del dialecte compatible és necessari perquè Bambu llegeixi aquestes metadades; `Designer`, `RelleuObert:Generator` i la procedència indiquen el generador real. No s’inclou cap perfil d’impressora ni configuració de temperatura. L’usuari ha confirmat la importació de quatre materials amb colors correctes a Bambu Studio. La impressió física continua pendent.

## GitHub Pages

La carpeta `dist/` conté només fitxers estàtics. La construcció utilitza rutes relatives (`--base=./`) i empaqueta el Worker. Es pot publicar sota `usuari.github.io/repositori/`.

S’inclou `.github/workflows/pages.yml` per construir i desplegar quan es faci push a `main` o s’executi manualment. GitHub Pages utilitza GitHub Actions com a font. La v0.1 s’ha comprovat en local; les comprovacions de la web desplegada les fa l’usuari manualment.

Validació local de la v0.2: 27 proves superades, construcció estàtica i generació real de Tamariu i d’una regió de Barcelona. El cas amb latitud 42.918 i longitud 3.2075, que retorna tessel·les de relleu inexistents, s’ha comprovat com a regió completament marina. La comprovació del 3MF Bambu cobreix l’estructura i les assignacions exportades; encara cal verificar-ne la importació i el laminat a l’aplicació de l’usuari.

Validació local de la v0.3: 34 proves superades, construcció estàtica i comprovació visual d’escriptori a 1440 × 900. Cerca natural de La Torre de Claramunt, assignació d’1 a 8 materials, goma/desfer i generació real de Tamariu a 40 × 40 cm amb 12.000 arbres. Exportació al navegador d’un ZIP amb quatre models de 20 × 20 cm i talls tancats. La impressió i la comprovació remota continuen a càrrec de l’usuari.

Validació local de la v0.4: 39 proves superades i construcció estàtica. Proves de revolts i amplada dels camins, límit dels edificis sobre pendent amb exageració ×1 i ×3, petjades i mode sense edificis. Tamariu real generat amb límit de 5 m, malles comprovades amb Manifold i retall de prova. Interfície verificada amb indicador de vegetació i bloqueig de traços nous durant el càlcul.

## Direcció del projecte

Vegeu `ARCHITECTURE.md` per les decisions i els passos següents. Vegeu `SOURCES.md` per fonts i llicències. El codi propi es publica sota MIT; això no canvia les llicències de les dades cartogràfiques.
