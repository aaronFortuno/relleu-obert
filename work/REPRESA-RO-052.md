# Represa RO-052 / RO-053 · v0.19.2

**Estat actual al portàtil, 2026-11-03:** RO-053 ja té els sis apartats
aprovats i accions al títol. El model i els traços es mantenen en cas
d'error; en canviar de retall els traços queden associats al retall
original fins que es tanqui la pàgina. El pas següent és separar el
càlcul de terreny i vies, mantenint les actualitzacions parcials existents.
RO-052 identifica els dos enllaços limitats pel cantell nord del quadrat;
ampliar o desplaçar el retall és l'acció disponible. No s'han forçat rampes.
Queden el contrast en altres retalls, Millau i el laminat.

**Antecedent al portàtil, 2026-11-02:** regressió del portal girat
corregida sense rebaixar toleràncies. Corregits també els plecs d'enllaços
reals i la serialització d'identificadors absents. 377/377 proves ordinàries
finals i sis integrades verificades (cinc inicials i una repetida després
de corregir només metadades). Dos controls reals regenerats amb auditoria
sense errors; al quadrat queden dos extrems sense enllaç suau. [Informe
actual i fitxers](RO-052-CONTINUITAT.md). No donar per resolt RO-052 ni
substituir la revisió de laminat/impressió per aquestes proves.

**RO-053:** [disseny, invalidacions i pilot](RO-053-UX.md),
amb [demostració navegable](https://aaronFortuno.github.io/relleu-obert/prototypes/ro053/)
revisada localment a 1280×720 i 1600×900. Ordre validat: Peça → Territori →
Terreny → Vegetació → Vies → Edificis. El prototip continua simulant
el càlcul per capes i no genera un fitxer imprimible.

**Pròxims passos:** usuari/laminat dels controls; revisar la posició de les
accions RO-053; separar el càlcul de terreny/vies i contrast general
de RO-033/052, inclòs Millau. RO-051 continua desactivat. Conservar els
pressupostos de memòria i una única cua pesada. Pages/CI els revisa l'usuari.

## Punt de tancament històric · v0.19.0 parcial

El text següent descriu l'estat anterior a v0.19.1; el 12/13 i les tasques
de verificació pendents d'aquell moment no són el resultat actual.

**Tancament del 2026-11-02 per petició expressa de l'usuari:** cal tancar
l'ordinador i continuar al portàtil durant la nit. Es publica el treball
actual, inclòs el refinament encara incomplet. **RO-052 no està resolt.**
No queda cap prova, generació de model ni feina d'agent en marxa.

## Prioritat addicional que ha de rebre l'agent del portàtil

L'usuari ha reiterat explícitament la necessitat d'estudiar un flux més
granular, separat en terreny, vegetació, vies i edificis, amb mida
d'impressió abans de seleccionar ubicació/zoom. Queda registrat com a
**[RO-053, P1](BACKLOG.md#ro-053--flux-de-treball-per-etapes)**, amb la seva
seqüència candidata, dependències i criteris. No deixar-ho com una nota
opcional al final del diagnòstic ni donar l'ordre per decidit.

Després d'estabilitzar el punt fallit de RO-052, preparar com a següent
línia prioritària una proposta revisable del flux i de la invalidació
incremental de capes. El pinzell inicial de vegetació ha de poder conviure
amb vies/edificis incorporats després, sense perdre edicions silenciosament.
Millau queda com a cas de regressió general de RO-033 segons zoom i retall.

## Punt de partida

- Llegir `AGENTS.md`, `DESIGN.md` i el detall de RO-052 a `BACKLOG.md`.
- Continuar des de `main` / v0.19.0; el codi, els tests i els diagnòstics
  formen part del commit, no depenen de `output/` de l'equip anterior.
- En aquest portàtil mantenir els pressupostos de memòria del projecte:
  proves petites a 512 MB i una sola operació pesada alhora. Comprovar RAM.
- Evitar més rondes de delegació fina sobre funcions dependents: un únic
  propietari de la integració transversal (geometria + túnel + seccions),
  i només tasques realment independents en paral·lel.

## Què s'ha implementat

1. `transport-width.js`: amplada comuna de calçada a superfície, ponts
   procedimentals i túnels. Contorn estructural mesurat i obertura de
   túnel diferenciats; no s'alteren els XYZ de taulers ICGC.
2. `transport-network.js`: identitat de traçat, continuació per extrems,
   normalització de ramals i reparació col·linear única i acotada de
   generalització cartogràfica. El raccord nord de Rajadell es recupera.
3. `geometry.js` / `bridge-completion.js`: passada conjunta d'enllaços,
   cotes del segment real connectat, no d'un pont que només es creua amb
   la via. Connexions pont–pont i pont–túnel cobertes per proves petites.
4. Boques: paviment separat de la cavitat, ruta cartogràfica i pendent
   transversal compartit. Petjada d'aigua segons la geometria real del
   revolt, no només un buffer arrodonit.
5. **Últim refinament, incomplet:** `transport-sections.js`, perfils
   `pavementSections.across`, `surfaceBreaks` i caps retriangulats. Vol
   fer coincidir la calçada amb centre i canvis de pla del terreny, no
   només les dues vores. La integració encara falla al rectangle girat.
6. «Marc exterior» retirat de la UI; backend i proves del marc conservats.
   Versió/footer/historial preparats a 0.19.0. Revisió visual pendent.

## Validació real, sense confondre etapes

- **Abans de l'últim refinament transversal:** suite ordinària 370/370,
  39,086 s, heap 512 MB, mínim 43,78 GiB lliures. No acredita l'estat final.
- Mòdul de seccions: 6/6 proves petites correctes. No acredita els encaixos
  reals del mòdul integrat.
- **Estat final:** selecció curta RO-052 amb 13 casos: **12 passen i 1
  falla**. La regressió no s'ha eliminat ni s'ha afluixat la tolerància.
- **Compilació final correcta**, 2,85 s; avisos previs de paquet/Manifold.
- No s'han repetit la suite completa ni els blocs pesants de ponts/túnels
  després del refinament. Tampoc revisió visual local, laminador o impressió.
- No s'han comprovat Pages ni CI remotament, segons les instruccions.

## Primer error que cal corregir

```powershell
node --max-old-space-size=512 --test --test-concurrency=1 --test-name-pattern='rotated rectangle' tests/transport-continuity.test.js
```

Falla `rotated rectangle/live/portal start: step at seam`, a
`tests/transport-continuity.test.js`, funció `checkSeam`. Les tres cotes
observades abans/sobre/després de la junta són:

```text
7.06836956973021, 7.172501959879605, 7.354167166034296 mm
```

La cadena quadrada, les unions pont–pont, el rebuig de ponts creuats i la
unió directa pont–túnel passen en aquesta selecció final. Cal revisar el
perfil transversal i la triangulació a la boca girada, el retall del
paviment contra el substrat i la coincidència amb el material exterior.
No donar per resolt el cas perquè els punts de metadades coincideixin:
la prova mostreja la geometria/material reals i també el 3MF.

El refinament es va motivar perquè, als controls reals previs, la mitjana
de les dues vores diferia del centre real del terreny fins a **0,0911 mm**
al rectangle girat. Mostrejar només esquerra/dreta no era suficient.

## Evidència conservada

[Diagnòstics i 3MF previs al refinament](repro/ro052/README.md). Són
evidència del problema, **no models finals ni controls acceptats per
imprimir**. Els dos JSON inclouen arguments, temps, memòria, procedència,
omissions i auditoria. No corresponen a una regeneració de l'últim codi.

## Després de corregir el cas petit

1. Repetir la selecció RO-052 i la suite ordinària a 512 MB.
2. Executar `bridge-support-scales.test.js` i `tunnel-model.test.js` sols,
   seqüencialment, a 1.536 MB i amb almenys 4 GB lliures inicials.
3. Regenerar els controls reals en mode de la UI (`--surface-roads`):

```powershell
node scripts/benchmark-major-roads.mjs 1.5 150 36 --timeout=120 --output=output/ro052-rajadell-150.json --surface-roads --icgc --tunnels --verify --export=output/RO-052-Rajadell-150mm.3mf
node scripts/benchmark-major-roads.mjs 1.2 150 36 --height-mm=200 --rotation=25 --centre=41.71792,1.78391 --timeout=120 --output=output/ro052-rectangle.json --surface-roads --icgc --tunnels --verify --export=output/RO-052-rectangle.3mf
```

4. Exigir mateix centre/cotes a les boques, material continu, amplada de
   calçada coherent, escales i mides exactes i passos inferiors oberts.
   Conservar omissions explícites i els XYZ originals.
5. Revisió visual de la retirada del marc a 1280×720 i una segona mida
   d'escriptori. Captura anterior disponible al context de v0.18.2; fer
   captures noves i validar scroll/materials/exportació.
6. Actualitzar backlog/informe i publicar amb commit i push. L'usuari
   revisarà nous 3MF, laminat i cupó abans d'impressions llargues.

RO-051 conserva el prototip desactivat i el cas de volum nul d'1,5 km /
detall 12 pendent. RO-014 queda ajornat per decisió expressa de l'usuari.
