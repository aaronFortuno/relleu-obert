# Maquetes de prova per al catàleg de relleu

Els sis models de prova inicials de [RO-046](RO-046-CATALEG.md) fan servir **Relleu pur**, exageració vertical ×1,5, base de 5 mm i dos filaments, terra i aigua. Els ajustos actuals de cada fitxa de la galeria consten a la cua de revisió del catàleg.

Les malles per filament passen l’auditoria local i les vistes zenitals confirmen els enquadraments. Als retalls costaners el mar arriba a la cara inferior de la base. El 3MF panoràmic té quatre plaques i mostra mar als dos extrems. En aquest retall, els rius i els llacs segueixen les superfícies d’aigua cartografiades. Els rierols que només tenen traçat lineal s’ometen per mantenir llegible el relleu del conjunt.

| Retall | Centre WGS84 | Mida, escala i gir | Què s’hi ha de veure |
| --- | --- | --- | --- |
| Estret de Gibraltar | `35.9985,-5.4660` | 25 × 25 cm · 1:150.000 · 0° | Les ribes de Tarifa i Punta Cires i el pas de l’aigua entre elles. [Estudi de l’IEO](https://os.copernicus.org/articles/14/1547/2018/os-14-1547-2018.html) |
| Istme d’O Vao · A Lanzada | `42.4502,-8.8684` | 25 × 20 cm · 1:25.000 · 0° | El cordó de terra que uneix O Grove amb el continent i separa el mar obert de l’aiguamoll. [Xunta de Galícia](https://www.turismo.gal/recurso/-/detalle/190516000262/praia-da-lanzada?ctre=40000140&langId=gl_ES&tp=40003930) |
| Conca de Tremp i Montsec | `42.1470,0.9250` | 24 × 24 cm · 1:100.000 · 0° | El contrast entre el fons de la conca i les carenes que l’envolten. [Geoparc Orígens](https://www.geoparcorigens.cat/es/geologia/) |
| Penya-segats de Zumaia | `43.2987,-2.2670` | 20 × 15 cm · 1:10.000 · −25° | Els penya-segats de Pikote, Algorri i Itzurun i la plataforma litoral. [Inventari geològic d’Euskadi](https://www.euskadi.eus/web01-a2inguru/eu/contenidos/informacion/lig/es_def/adjuntos/102.pdf) |
| Pirineus panoràmics | `42.8000,0.7500` | 100 × 20 cm · 1:450.000 · +15° | La continuïtat de la serralada entre el Cantàbric i la Mediterrània, en quatre peces de 25 × 20 cm. |
| Meandres de l’Ebre · Riba-roja i Flix | `41.2440,0.5250` | 24 × 16 cm · 1:40.000 · 0° | Dos revolts connectats pel curs de l’Ebre. A Flix el riu envolta una llengua de terra. [Inventari de zones humides](https://mediambient.gencat.cat/web/.content/home/ambits_dactuacio/patrimoni_natural/sistemes_dinformacio/inventari_zones_humides/documents_fitxes/ebre/fitxers_estatics/19003009_meandre_flix.pdf) |

Per reproduir els fitxers de revisió, executa `node --max-old-space-size=512 scripts/prepare-landform-catalogue.mjs <id>`. Els identificadors són `gibraltar`, `o-vao`, `tremp`, `zumaia`, `pirineus` i `ebre-meandres`. El procés desa el 3MF, la vista zenital i les dades de generació a `output/cataleg-relleu/`. Amb l’argument `miniatura`, l’script genera el WebP de la fitxa amb els ajustos de la galeria.

El panoràmic actual a 1:500.000 s’ha regenerat amb `node --max-old-space-size=768 scripts/prepare-landform-catalogue.mjs pirineus miniatura`.

Les elevacions provenen de Mapterhorn i la cartografia, d’OpenStreetMap via OpenFreeMap. [Atribucions de Mapterhorn](https://mapterhorn.com/attribution/) · [OpenStreetMap](https://www.openstreetmap.org/copyright)
