# RO-044 — Catastre: àrees, seccions i recuperació

2026-11-02 · v0.13 · Implementat i comprovat localment; validació de l’usuari pendent.

## Diagnòstic reproduït

La mateixa vista inicial de Tamariu (1.781,1 m de costat, aproximadament
3,18 km²) retorna HTTP 200 amb XML `ExceptionReport` i text
`Area of extension out of limits`, tant a Building com a BuildingPart.
Un quadrant de la mateixa envolupant respon amb geometries vàlides.
No era una col·lecció buida per la part de mar.

El [manual oficial del WFS BU](https://www.catastro.hacienda.gob.es/webinspire/documentos/inspire-bu-wfs.pdf)
indica límits de 4 km² i 5.000 elements. Aquesta prova mostra un rebuig
abans dels 4 km² estimats pel client; no s’atribueix una causa interna al
servidor que no podem observar. Els paràmetres segueixen el format documentat.

## Comportament

- Consulta completa primer. Només els límits reconeguts del servei o el
  recompte límit desencadenen divisió 2×2, fins a dos nivells.
- Com a màxim 42 consultes lògiques, dues connexions simultànies (incloent
  lectura del cos), tres minuts totals i un reintent per fallada de xarxa.
  En fallar una secció es cancel·len les altres; no s’accepta el resultat parcial.
- Els buits vàlids continuen sent vàlids. Les geometries completes que es
  repeteixen a les fronteres es dedupliquen per ID; contradiccions es rebutgen.
- Pressupostos acumulats de dades i vèrtexs, a més dels límits per resposta.
  Metadades amb consultes, subdivisions i duplicats, sense dades de titulars.

## Recuperació de la interfície

- Canvi incremental fallit: conserva model/càmera, restaura font, mode,
  altura i dades locals d’edificis de l’últim model acceptat. Si el terreny
  no té canvis pendents, l’exportació torna a estar disponible.
- Regió nova: prova una altra font apropiada (última vàlida, ICGC on
  correspon i OSM), sense reutilitzar edificis de la regió anterior. La font
  efectivament aplicada es mostra al selector i a l’avís, i la recuperació
  queda a la procedència del model.
- Regió/capa candidata confirmada després que el Worker acabi correctament;
  una fallada conserva el model anterior. Si han canviat mapa, mida o relleu,
  aquests canvis continuen identificats com a pendents.

## Comprovacions

- Tamariu real: 10 consultes lògiques, 2 subdivisions, 301 duplicats;
  624 edificis i 2.613 parts úniques; 166 parts de zero plantes excloses;
  2.447 volums finals. Evidència local: `output/cadastre-tamariu-v013.json`.
- Sis regressions: classificació del text, seccions buides/duplicats,
  concurrència màxima, error de secció, recursió acotada, contradiccions i
  font alternativa explícita. Les proves anteriors de timeout, buits,
  paginació i absència de memòria cau negativa continuen passant.
- Navegador local: regió de 3×3 km amb ICGC; Catastre rebutjat pel límit
  del client retorna a ICGC i manté exportació activa. Regió nova de
  3,15×3,15 km amb Catastre seleccionat genera el terreny amb ICGC i avís.
  Zero errors de consola en aquests recorreguts.
- 209 proves i construcció estàtica correctes; no es comproven Pages/CI remots.

La precàrrega d’altres fonts queda com a proposta RO-047; no hi ha consultes
ocultes per omplir totes les alternatives ni desactivació permanent de fonts
per un error temporal. Laminador i impressió física són validacions separades.
