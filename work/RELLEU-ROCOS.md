# Pilot de relleu rocós

## Cavall Bernat · RO-023

Quatre controls amb el mateix centre (41,6007 N, 1,8227 E), base de 150 × 150 mm i exageració ×1,5. Mateix mostreig i criteri de triangulació de Relleu pur per a cada parell. Mapterhorn ha servit quatre tessel·les a zoom 14 de 512 píxels de costat. L’ICGC ha servit el MET5 de 5 m en ArcGrid via WCS, amb `Access-Control-Allow-Origin: *` a la petició de prova. El control de 300 m fa servir la malla fora del rang actual del selector de Relleu pur.

| Escala | Retall | Pas de malla | Cota màxima a 20 m del centre, Mapterhorn | ICGC MET5 |
| --- | --- | --- | ---: | ---: |
| 1:2.000 | 300 × 300 m | 2 m | 1.058,1 m | 1.109,9 m |
| 1:10.000 | 1.500 × 1.500 m | 10 m | 1.051,0 m | 1.109,8 m |

Els perfils són seccions de les dues fonts pel centre, en quatre direccions i amb eixos comuns dins de cada gràfic. A les quatre direccions del retall de 300 m, la discrepància màxima entre fonts és de 74,5 a 76,2 m. Al retall de 1.500 m la màxima global és semblant entre les fonts, mentre que la diferència a l’entorn de l’agulla es manté. Les quatre malles són tancades i superen l’auditoria 3MF. El retall de 300 m supera els 230 mm d’alçada amb aquesta exageració. El laminat és pendent.

Següent prova: comparar MET5 i el MDT de més resolució de l’ICGC, i mesurar què es perd en passar de 2 a 10 m de pas de malla. Contrastar el mateix flux al Pedraforca o a Riglos. [Servei WCS](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-i-WCS-Elevacions/WCS-del-Model-dElevacions-del-Terreny)

## Els Degotalls · RO-035

Cupó de la paret del sector est, secció nord, a partir del LiDAR terrestre d’octubre de 2020. En una graella vertical XZ de 0,5 m, la profunditat Y prové dels punts observats. La malla tanca el dors i els costats amb superfícies artificials. La cara mesurada avança fins a 0,97 m cap al punt d’escaneig en un tram de 2 m verticals. El cupó a 1:200 fa 50 × 24,54 × 60 mm, té 2.096 triangles i supera l’auditoria 3MF.

Les coordenades del fitxer són locals. Abans de substituir una secció del MDT, cal recuperar la transformació a coordenades de terreny i contrastar el datum, la cobertura lateral i la cara inferior. La cara visible del cupó acredita la viabilitat de conservar un pendent invertit local amb punts mesurats. La forma completa d’una balma requereix cobertura addicional. [Dades i atribució](https://doi.org/10.34810/DATA201) · [Format i llicència CC BY 4.0](https://dataverse.csuc.cat/api/access/datafile/12829)

## Reproducció local

```powershell
node --max-old-space-size=512 scripts/compare-cavall-bernat.mjs
node --max-old-space-size=512 scripts/pilot-degotalls.mjs
```

El primer script escriu quatre 3MF, les seccions SVG i les mesures a `output/cavall-bernat/`. El segon baixa en flux l’escaneig original, en comprova l’empremta i desa el cupó i l’auditoria a `output/`.
