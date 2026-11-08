# RO-033 — Pilars i continuïtat de les carreteres

v0.15.0, 2026-11-02. Implementació i proves locals; validació de l’usuari,
laminat i impressió pendents. Resol les captures d’extrems flotants aportades
per l’usuari sobre la mostra del viaducte de l’Eix Diagonal.

## Dades i aproximacions

Es conserven les [superfícies ICGC de v0.14](RO-033-IMPLEMENTACIO.md).
La revisió del mateix IFC identifica els laterals `lpn` **64097 i 64748**:
dues vores de 124 punts, amb cotes aproximades de 277,42 a 295,58 m.
Descriuen les vores del viaducte; no acrediten posicions de pilars ni el seu
perfil estructural. La distribució de Rajadell s’ha pogut contrastar amb una altra font.

El [plànol dels autors del projecte, IDEAM](https://gpreman-cp165.wordpresstemporal.com/wp-content/uploads/2017/03/pon612_2.pdf), figura 1 de la pàgina 2, dóna onze pilars entre els PK 64+914,970 i 65+654,970: dotze trams que sumen 740 m. El text de la pàgina 1 omet un tram de 50 m; s’ha contrastat visualment el dibuix i se’n prova la suma, sense escalar artificialment els 690 m del resum.

La seqüència de trams és 35, 50, 70, 70, 100, 70, 70, 70, 70, 50, 50 i 35 m. Els pilars s’ubiquen segons aquestes distàncies acumulades des de l’extrem sud (E1, el més alt), interpolades sobre l’eix cartogràfic. No són coordenades XYZ de pilars mesurades: l’alineació continua sent aproximada. La secció nominal descrita és de 2,2 × 6 m, representada com un rectangle senzill orientat amb la via i amb mínim imprimible de 0,8 mm.

A les altres estructures sense aquest plànol, la separació objectiu és de 50 m reals, com a mínim 6 mm al model, amb suports simplificats de 2,5 m reals i mínim de 0,8 mm.
Es desplacen al llarg i a través de la petjada quan cal per trobar un lloc
vàlid; a Rajadell, l’ajust longitudinal queda limitat a 3 m respecte a l’estació del projecte. Els desplaçaments es registren a la procedència. La petjada sencera, amb marge de 0,25 mm, es contrasta geomètricament
contra camins, edificis carregats i aigua. No n’hi ha prou amb comprovar el
punt central. Un obstacle no cartografiat no es pot detectar.

El peu s’incrusta 0,25 mm al terreny i el cap entra 0,08 mm al tauler.
S’ometen posicions sense espai segur. Si la font d’edificis canvia, es torna
a comprovar la distribució dels suports; el terreny no es reconstrueix. Els perfils estructurals detallats i la comprovació d’obra executada continuen pendents.
Canviar només l’altura dels mateixos edificis reutilitza la malla del pont.

## Enllaç dels extrems

Les prolongacions segueixen la continuació cartografiada de la carretera,
amb preferència per la mateixa classe i el sentit més continu en bifurcacions.
Es permet una connexió curta amb un segment coincident que no comparteixi
vèrtex a causa de la generalització MVT. No es continua per túnels.

La cota inicial i la pendent provenen del tauler. Una transició cúbica arriba
a la cota de la carretera sobre el terreny, també a les dues vores de l’extrem.
L’amplada es redueix progressivament fins a la del camí. Són **enllaços
estimats per donar continuïtat a la maqueta**, sense modificar les cotes
originals de la superfície central ICGC ni afirmar que descriguin els estreps
reals. No s’afegeixen trams fora del retall o sense continuació suficient.

Tauler, pilars i prolongacions s’uneixen amb Manifold al navegador abans de
mostrar-los i exportar-los. Cada resultat ha de superar auditoria de tancament
i orientació. No es confon un contacte visual amb una unió de sòlids.

## Resultat i comprovacions

- Mostra inicial de 15 cm, detall equilibrat: **11 pilars i dos enllaços**
  al viaducte principal; un únic component connectat del conjunt.
- Model de **40 cm**: 11 pilars i dos enllaços al mateix viaducte;
  un únic component connectat. Els límits d’exploració respecten l’escala.
- Proves de peu/cap dels pilars, obstacles complets, determinisme, bifurcacions,
  exclusió de túnels, contacte amb tota l’amplada del camí i offsets d’impressió.
- Cas real amb detall ràpid i equilibrat. Afegir un edifici sota un suport
  recalcula els pilars i conserva els buffers de terreny; canviar-ne només
  l’altura conserva la malla de carreteres. Realç d’1 mm manté les connexions.
- **222 proves** correctes i construcció estàtica local. Revisió visual i del
  3MF descarregat diferenciades de la futura validació al Bambu de l’usuari.

Els altres ponts petits propers al límit de la mostra poden quedar sense
continuació dins del retall. S’indica als avisos; no es construeix una rampa
fora de la peça. Les proves no garanteixen impressió sense suports: falten
laminat, resistència física i comprovació de la fidelitat dels estreps.

## RO-049 — Realç opcional dels camins

Selector «Relleu dels camins» dins de Relleu i edificis: arran de terreny
(per defecte), **0,5 mm** o **1 mm** de maqueta. No són metres del territori.
El mateix realç afecta el paviment dels taulers i les prolongacions. El peu
dels camins i el terreny natural es conserven; el tauler guanya gruix cap amunt,
sense desenganxar els pilars de la cara inferior. Valor registrat al 3MF/STL.
