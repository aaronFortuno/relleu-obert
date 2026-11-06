# Dades dels pilots històrics

Els fitxers són GeoJSON en longitud i latitud (WGS 84) i cobreixen només els rectangles d’`index.json`.

- **Ferrocarril, 1960 i 1980**: Guillermo Esteban-Oliver i Jordi Martí-Henneberg, [Railways of Spain GIS (1848–2023)](https://doi.org/10.34810/data917), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Els traçats d’ample ibèric, estret i alta velocitat s’han retallat, reprojectat i filtrat segons els anys d’obertura, tancament i reobertura. Una edició buida indica que no hi consta cap tram en servei al retall i any. No s’inclouen les estacions ni l’alçada històrica de les vies.
- **Sòl urbanitzat, Avinyó, 2009, 2018 i 2024**: © Institut Cartogràfic i Geològic de Catalunya, [Mapa de cobertes del sòl de Catalunya](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Mapes/Mapa-de-cobertes-del-sol-de-Catalunya), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). S’han seleccionat les categories 341–345 i 347, i s’han retallat els polígons. Els anys corresponen a edicions, que poden conservar observacions anteriors. Són superfícies de sòl urbanitzat, no edificis individuals. No es redistribueix la mostra de 1956.

Per tornar a preparar els fitxers, executeu `node scripts/prepare-historical-railways.mjs` i `node scripts/prepare-historical-urban.mjs`. El segon necessita `tar` per llegir el paquet del lector FlatGeobuf i demana únicament els rangs de dades del retall a l’ICGC.
