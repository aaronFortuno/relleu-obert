# Relleu Obert

Relleu Obert és una eina educativa per crear i imprimir maquetes 3D de llocs reals. Permet treballar el relleu i els accidents geogràfics a l’aula a partir de cartografia oberta. El càlcul es fa al navegador, que consulta les fonts de dades cartogràfiques.

[Obre Relleu Obert](https://aaronFortuno.github.io/relleu-obert/)

Al domini públic, l’Umami propi d’ortogra.fi compta visites, obertures de la galeria, generacions, descàrregues i l’ús de fonts, eines, talls i materials. El V4V explica quins camps s’envien i quins queden exclosos. El seguiment respecta Do Not Track i Global Privacy Control.

## Crear una maqueta

1. Tria una mida o obre una fitxa de la galeria.
2. A «Territori», cerca una adreça o introdueix les coordenades. Al mapa pots moure, girar i ajustar l’escala del retall.
3. Tria «Model complet» per afegir vies i edificis, o «Relleu pur» per treballar el terreny, l’aigua i la cobertura del sòl. Genera la maqueta i ajusta-la al visor.
4. A «Impressió» pots regular la base i arrossegar els talls entre peces. Tria els materials i descarrega el model en 3MF o STL. El format de Bambu Studio pot obrir diverses plaques en un sol 3MF quan les peces hi caben.

Les dades i el detall disponible varien segons el lloc i l’escala. Els ponts, els túnels i la vegetació poden incloure geometria estimada. Revisa al laminador els materials, les unions i els passos estrets abans d’imprimir.

«Projectes desats» permet guardar els ajustos al navegador i exportar o importar una còpia JSON.

La icona «Comparteix la configuració», al costat de la descàrrega, crea un enllaç amb el retall i els ajustos actuals. En obrir-lo, la maqueta es genera automàticament al navegador. Els traços, les rutes i els punts destacats es poden conservar a la còpia JSON del projecte.

## Desenvolupament local

El desplegament fa servir Node.js 24 i pnpm 11. Amb les dependències instal·lades, a Windows també pots obrir la previsualització amb `Obre-preview.ps1`.

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```

La construcció genera `dist/` amb rutes relatives i un Web Worker per al càlcul. GitHub Actions publica aquesta carpeta a GitHub Pages. [Flux de desplegament](.github/workflows/pages.yml)

## Documentació

- [Backlog i prioritats](work/BACKLOG.md) · [Documents de treball i arxiu](work/README.md)
- [Historial de versions](CHANGELOG.md) · [Historial de validacions](work/arxiu/HISTORIAL.md)
- [Arquitectura](ARCHITECTURE.md) · [Llibre d’estil](DESIGN.md)
- [Fonts i llicències de les dades](SOURCES.md) · [Llicència MIT del codi](LICENSE)
