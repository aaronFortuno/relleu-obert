# RO-019 — Internacionalització del taller

Des de la v0.23.3, el desplegable de capçalera ofereix català, castellà, gallec, basc i anglès. La tria s’aplica al taller i a la galeria amb el model obert, i es recupera en recarregar. El català és la llengua inicial i de reserva.

Els textos fixos, les etiquetes accessibles i els missatges dinàmics fan servir els catàlegs de `src/locales/`. Les fitxes conserven identificadors i coordenades. La cerca de la galeria admet els noms originals i els localitzats.

El progrés habitual, els avisos principals i els errors habituals de dades es tradueixen al visor. Els missatges tècnics poc freqüents que encara no tenen traducció mostren el text d’origen. Els informes descarregables mantenen els missatges del motor i les notes històriques anteriors a la v0.23.3 es presenten en català.

## Manteniment

- Cada fila de `workshop-base.js`, `workshop-static.js`, `workshop-runtime.js` i `workshop-examples.js` inclou els textos en ordre `ca, es, gl, eu, en`. Els paràmetres entre claus han de coincidir a totes les columnes.
- El marcatge HTML fa servir `data-i18n` per al text, `data-i18n-text` per a un node de text amb elements fills i els sufixos `aria`, `title`, `placeholder`, `alt` i `content` per als atributs.
- Les vistes dinàmiques fan servir `t()`, `formatNumber()` i `onLocaleChange()`. En actualitzar-se conserven els ajustos de projecte i la geometria.
- `workshop-engine.js` localitza el text que es mostra al taller sense modificar els informes ni el motor. Els diagnòstics amb valors variables admeten paràmetres amb nom.
- `tests/i18n.test.js` comprova la cobertura del marcatge, la paritat de paràmetres, la persistència, els avisos i el canvi d’idioma.

Queda pendent la revisió lingüística en ús i l’ampliació del catàleg de diagnòstics.
