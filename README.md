# Relleu Obert

Prototip educatiu separat de Terrology: generació de maquetes geogràfiques amb JavaScript, íntegrament al navegador, publicable a GitHub Pages. No s’ha copiat codi de Terrology.

**v0.1 experimental · 31 d’octubre de 2026**

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

La mostra de Tamariu conté quatre tessel·les vectorials i quatre tessel·les d’elevació reals, amb origen i data a `public/data/tamariu.json`. No consulta serveis cartogràfics en obrir-la. També es pot carregar una altra regió amb coordenades (entre 0,3 i 3 km): el navegador consulta directament OpenFreeMap i Mapterhorn, amb temps límit i errors visibles. Les dades carregades no s’envien a cap servidor propi.

## Què hi ha implementat

- Previsualització 3D giratòria i vista zenital.
- Partició vectorial de terra/aigua, vegetació i camins. Els límits es retallen contra les cel·les del relleu: no es classifiquen triangles sencers per un únic punt.
- Mar pla, base, exageració vertical explícita i dimensions en mil·límetres.
- Edificis extrudits a partir de petjades cartogràfiques.
- Volums d’arbres procedimentals dins de zones verdes, evitant edificis i camins.
- Quatre materials: terreny, aigua, edificis/camins i vegetació.
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
- No hi ha encara cercador de llocs, selector de regió sobre mapa, importació de GeoTIFF ni validació de malla amb reparació automàtica.
- El 3MF és genèric; un avís de Bambu Studio sobre un fitxer no nadiu és esperable. Els colors de visualització no són perfils de filament. Cal assignar els filaments i revisar l’escala i totes les parts.

## GitHub Pages

La carpeta `dist/` conté només fitxers estàtics. La construcció utilitza rutes relatives (`--base=./`) i empaqueta el Worker. Es pot publicar sota `usuari.github.io/repositori/`.

S’inclou `.github/workflows/pages.yml` per construir i desplegar quan es faci push a `main` o s’executi manualment. GitHub Pages utilitza GitHub Actions com a font. La v0.1 s’ha comprovat en local; les comprovacions de la web desplegada les fa l’usuari manualment.

## Direcció del projecte

Vegeu `ARCHITECTURE.md` per les decisions i els passos següents. Vegeu `SOURCES.md` per fonts i llicències. El codi propi es publica sota MIT; això no canvia les llicències de les dades cartogràfiques.
