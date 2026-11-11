# Llibre d’estil de Relleu Obert

Guia obligatòria per a canvis d’interfície, també en tasques delegades. La
referència és la interfície d’escriptori de v0.13.1: discreta, compacta i
centrada en la maqueta. No es redissenya una secció per incorporar una opció.

## Jerarquia i tipografia

Una sola família: Segoe UI / system-ui, heretada de l’arrel. Cap font externa
ni monospace per a textos, formularis, exemples o previsualització de plaques.
Els valors canònics són a [ui-tokens.css](src/ui-tokens.css).

| Ús al sidebar | Mida | Pes | Component existent |
| --- | --- | --- | --- |
| Títol d’apartat | 12 px | 600–650 | `.section-heading`, `.section-toggle` |
| Camp de text, número o selector | 11 px | 400 | controls dins de `.sidebar` |
| Etiqueta, desplegable secundari | 10 px | 400–500 | `label`, `details > summary` |
| Ajuda, unitats, resultats secundaris | 9 px | 400 | `.hint`, `.unit` |
| Mètrica principal | 17 px | 550 | `.metrics strong` |

Els diàlegs conserven la seva jerarquia existent (cos de 13 px). La marca i
les mètriques són excepcions explícites, no precedents per engrandir controls.
La benvinguda i la visita guiada fan servir text de 14–15 px i accions més visibles.
Els selectors compactes ja existents, com el de font d’edificis, fan 10 px;
no s’han d’engrandir per uniformitzar-los amb els camps principals d’11 px.
No confiar en mides natives d’`h2`, `summary`, `input` o `output`: aplicar les
classes existents. `output` de formulari no ha de flotar a la dreta.

## Colors, formes i espaiat

- Reutilitzar `--paper`, `--line`, `--green`, `--muted` i els tokens de control.
  Fons paper clar, verd sobri, vores fines i cantonades de 4–5 px.
- Els resums informatius són text secundari o separadors fins. Cap targeta
  amb vora fosca, fons saturat, ombra forta, gradient o pill decoratiu nou.
- Espaiat de referència: 4/8/12/16/20 px. Camps amb padding de 8 px;
  labels amb marge superior curt. Evitar inflar cada opció amb un paràgraf.
- Botons `.primary` i `.secondary`; accions petites amb `.quiet-button`.
  Una acció principal per tasca. Les icones complementen un nom accessible.

## Distribució i responsabilitats

- Header de 58 px i footer de 32 px sempre visibles. Cap scroll de pàgina.
- Sidebar esquerre: Territori, Vegetació, Vies i Edificis.
  Les quatre capçaleres es veuen sempre i només el contingut obert fa scroll.
  Aigua i vies agrupa la hidrografia i les vies. En Relleu pur s’hi mostren
  senders i fronteres, i s’amaga Edificis.
  A escriptori, la cerca i el mapa es mantenen sota la capçalera de Territori.
  La roda fa zoom dins del mapa i desplaça els ajustos dins del seu panell.
  L’acció del pas actiu acompanya el títol. Els títols permeten saltar
  directament a un altre pas; «Següent» no inicia un càlcul.
- Sidebar dret: mètriques, mida/base/talls, materials i dades amb capçaleres visibles i
  scroll només al contingut obert. Descàrrega ancorada al peu, amb un
  botó principal i un selector de formats que aplica la tria.
- «Marc exterior» i els complements ajornats no apareixen al sidebar;
  retirada demanada per l'usuari el 2026-11-02. El codi reutilitzable es
  conserva per a un desenvolupament futur, sense controls buits a la UI.
- Centre: selector de mida amb botons uniformes i una vista de les proporcions
  i els talls sobre una taula. Després, maqueta i controls flotants discrets.
  Eines del visor separa correccions de senders, rutes i punts destacats. El panell
  deixa la maqueta a la vista i mostra el mode actiu i com sortir-ne.
- Els canvis d’aparença o d’una capa conserven càmera/zoom. Restablir és una
  acció explícita; una regió o mida noves poden requerir enquadrament.
- La visita guiada ressalta els controls originals de cada pas i permet
  sortir sempre. Presenta Eines del visor abans dels ajustos d’impressió.
  Els camps numèrics apliquen els canvis en perdre el focus
  o amb Retorn. Canviar el retall requereix prémer «Genera el model».

### Taller mòbil

Fins a 900 px, el selector inicial ocupa la zona principal i pot fer scroll.
Un cop triada la mida, «Visor», «Ajustos» i «Exporta» comparteixen una barra
inferior. Els panells només ocupen una part de l’altura quan hi ha maqueta.
En horitzontal, el panell apareix al costat del visor si hi ha amplada.
Els controls de Territori prioritzen cerca i mapa, amb l’acció de generar
visible. Els diàlegs apareixen des de baix i els controls de la barra fan
44 px d’altura. Els camps de text i número fan servir 16 px per evitar
el zoom en obrir el teclat. L’escriptori conserva els dos sidebars.

## Controls i llenguatge

- Català breu i directe. Etiqueta autodescriptiva, unitat adjacent i valor
  visible quan calgui. Un únic control per concepte.
- Seguir els patrons de [index.html](index.html), [accessory-ui.js](src/accessory-ui.js)
  i [usability.css](src/usability.css), abans de crear classes o controls nous.
- Reutilitzar `.two-fields`, `.check-row`, `.accessory-fields`, `.hint` i les
  classes de botons. Evitar estils inline i selectors globals nous.
- Ajuda llarga dins de `details` avançat o Com funciona; no ocupar el flux
  docent amb formats GIS, motor de malla o decisions d’implementació.
- Errors han d’explicar l’efecte i la recuperació. Estat de treball visible,
  sense permetre accions incompatibles ni perdre el model vàlid anterior.
- Dades mesurades, estimades i absents s’han de distingir. No presentar una
  geometria aproximada com una reconstrucció acreditada de l’estructura real.

## Accessibilitat i comprovació

- Labels associats, noms accessibles per a icones, focus visible i controls
  natius quan sigui possible. Conservar els estats disabled i aria-busy.
- No dependre només del color per indicar estat/error. No reduir contrast
  per dissimular un control important. Respectar moviment reduït existent.
- Una modificació d’UI s’ha de revisar al navegador: 1280×720 i, si canvia
  distribució, una segona mida d’escriptori. Verificar scroll, textos llargs,
  càrrega/error, teclat i absència de salts de càmera pertinents al canvi.
- Captura abans/després de la zona afectada. No donar per validada l’estètica
  perquè passa el build. La revisió de l’usuari continua sent una fase diferent.

## Contracte dels encàrrecs delegats

Cada encàrrec ha d’indicar: objectiu acotat, fitxers que es poden tocar,
components que cal reutilitzar, criteris d’acceptació i límits de temps/quota.
Llegir AGENTS.md i aquesta guia abans de modificar UI. No afegir panells,
fonts, dependències, configuracions o canvis de layout fora de l’abast.

Totes les proves proposades o afegides s’executen i han de passar, igual que
la suite i el build pertinents. Màxim tres intents de reparació d’una fallada;
després, retornar el problema exacte sense eliminar ni rebaixar comprovacions.
No cal inventar tests que només repeteixin CSS: les comprovacions visuals
també s’han de registrar. Si l’encàrrec no permet navegador, declarar aquesta
revisió pendent perquè la faci l’agent principal abans d’acceptar l’entrega.

No fer commits, publicar ni comprovar Pages/CI remots des d’una delegació.
Una sola tasca de Kimi cada vegada, amb quota real comprovada abans, durant
i després segons AGENTS.md. Cap resultat parcial s’accepta automàticament.
