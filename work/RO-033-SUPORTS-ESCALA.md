# RO-033 — Suports quan canvia l'escala

## Diagnòstic

L'usuari aporta un viaducte llarg amb un sol pilar després de fer zoom out.
El repartiment dels pilars no era l'únic problema: el cos mínim de 0,8 mm
s'exigia íntegrament dins de la superfície del tauler. En reduir l'escala,
un tauler real esdevé més estret que aquest cos i els candidats es
descartaven encara que hi hagués espai segur a sota. Els camins i edificis
continuaven provocant omissions vàlides.

També faltava un sostre de separació en mil·límetres de maqueta: els 50 m
procedimentals i els trams reals de Rajadell podien donar llums llargues
quan s'ampliava la mida física del model.

## Canvi

- Es conserva el cos i la base de 0,8 mm com a mínim. El cap s'afina quan
  cal perquè càpiga sota el tauler, amb dimensions mínimes de 0,32 mm.
  `columnSolid(ring,ground,top,topRing)` connecta tots dos anells. Les cotes
  i l'amplada real del tauler no es modifiquen.
- La petjada completa del cos, més 0,25 mm de marge, continua evitant els
  camins, edificis, aigua i altres màscares que rep el planificador. El cap
  és interior al cos: no s'ignoren obstacles per aconseguir més pilars.
- La separació procedimental és entre 4 i 10 mm segons l'escala. Es manté
  el repartiment real de Rajadell i s'afegeixen suports auxiliars si la
  maqueta deixa trams lliures més llargs de 10 mm. Els auxiliars no tenen
  `sourceStationMetres` i porten `auxiliary:true`.
- S'informen `maxSpanMM`, `maxUnsupportedSpanMM`, `unsupportedSpans` i
  `auxiliaryPiers`. Si un obstacle o un tauler massa estret impedeix un
  suport segur, no es força: la llum restant queda al diagnòstic.
- El diagnòstic de llums és un mostreig de l'eix, no una anàlisi estructural
  ni una garantia del comportament del laminador o la impressora. Deu
  mil·límetres és un criteri de modelització d'aquesta versió.

## Comprovacions

Proves unitàries: cap adaptat en tauler de 0,6 mm amb cos de 0,8 mm i camí
inferior bloquejant; auxiliars en un repartiment de projecte ampliat;
diagnòstic explícit de tauler obstruït o inferior al mínim representable.
Els pilars es comproven com a sòlids tancats de volum positiu.

Regressions integrades: Rajadell a 1,5 i 2,4 km sobre una peça de 150 mm;
3 km sobre peces de 150 i 400 mm; ponts procedimentals estrets sobre una
vall en dues mides físiques. Es comproven múltiples pilars, una unió
connectada, caps dins del tauler, petjades fora d'obstacles i diagnòstic de
llums dins del criteri. La suite usa resolució 12 per limitar el cost; les
formes i unions dels pilars són les mateixes.

Diagnòstic addicional executat amb resolució 24 i sense arbres:

| Retall | Peça | Pilars principals | Observació |
| --- | --- | --- | --- |
| 1,5 km | 150 mm | 11 | Cap omès |
| 2,4 km | 150 mm | 10 | Dos candidats omesos; altres emplaçaments cobreixen el tram |
| 3 km | 150 mm | 8 | Quatre candidats omesos; es conserva el diagnòstic |
| 3 km | 200 mm | 11 | Cap omès |
| 3 km | 400 mm | 12 | Onze del repartiment i un auxiliar; cap omès |

El retall de 3 km usa centre 41,72213 / 1,779785 perquè les quatre
tessel·les DEM incloses cobreixin tota l'àrea. El centre inicial amb 3 km
se surt lleugerament de la cobertura local i exigeix tessel·les remotes;
no s'ha omplert el buit amb dades inventades.

Un primer procés amb quatre models i un diagnòstic competint es va aturar
als 140 s. El cas aïllat 3 km / 400 mm / resolució 24 es va completar en
uns 49 s: la major part corresponia a construir terreny i capes; les
unions van acabar en uns dos segons, sense errors. No es declara una
regressió de les unions a partir d'aquell primer límit de temps.

Resultat final: **23/23 proves de focus correctes** (quatre fitxers, uns
93 s), i build de producció correcte (4,46 s). Inclou els dos escenaris
integrats nous, les set proves de connexions/suports, les tretze del nucli
procedimental i la regressió de la mostra amb canvi d'edificis i vegetació.
Revisió al navegador, suite completa, laminat i impressió a càrrec de les
fases d'integració i validació; aquest informe no les pressuposa.

## Integració i comprovació final

Agent principal: suite completa **262/262**, build correcte. Al navegador,
retall real de 3 km al centre inicial, peça de 150 mm, detall ràpid:
el 3MF descarregat conté **8 pilars** al viaducte principal, un component
unit i llum mostrejada màxima de **5,93 mm**. Comprovats els 32 cantons
XY de les bases al fitxer, 337.172 vèrtexs finits dins la peça i quatre
colors. Es conserva la captura local de zoom out. Laminat/impressió pendents.
El diagnòstic no cobreix encara tota la longitud dels enllaços; cal revisar-los
amb RO-024 abans de donar per imprimible la ruta sencera.
