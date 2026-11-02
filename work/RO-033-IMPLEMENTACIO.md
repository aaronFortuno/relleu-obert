# RO-033 — Primer tauler real del viaducte de l’Eix Diagonal

Implementació v0.14.0, 2026-11-02. Validació d’usuari i laminador pendents.

## Dades i preparació

El [catàleg oficial dels fulls](https://geoserveis.icgc.cat/vector01/rest/services/icgc_talls_etrs89b/MapServer/22)
identifica **280110** per l’envolupant inicial de Manresa. El
[ZIP IFC oficial de 2024](https://datacloud.icgc.cat/datacloud/topografia-territorial/ifc/topografia-territorial-v1r0-full280110-2024.zip)
ocupa 19.184.408 bytes; el fitxer principal descomprimit, 83.598.524. Font:
ICGC, Referencial Topogràfic Territorial, CC BY 4.0. Coordenades ETRS89
UTM31 i altituds ortomètriques d’Alacant segons les
[especificacions](https://datacloud.ide.cat/especificacions/topografia-territorial-v1r0-20260629.pdf).

El servei ArcGIS de transports retorna XY malgrat `returnZ=true`. Per això
no es converteix `brunnel` o `layer` en una altura arbitrària. L’IFC sí que
conté XYZ del tauler. Desar-ne el fitxer principal a `output/full280110.ifc`
i executar `node scripts/prepare-infrastructure.mjs` reconstrueix la mostra
compacta [eix-diagonal-decks.json](../public/data/eix-diagonal-decks.json).
No cal descarregar el paquet GPKG de tot Catalunya ni processar IFC al client.

| Element IFC | Vèrtexs de superfície | Triangles de superfície | Cotes originals (m) |
| --- | ---: | ---: | --- |
| 114334 | 151 | 149 | 231,607–231,813 |
| 114729 | 95 | 93 | 276,445–278,545 |
| **127512, viaducte gran** | **3.192** | **3.190** | **277,420–294,621** |
| 132561 | 310 | 308 | 279,997–280,990 |

## Què es representa

Es conserva la superfície amb les cotes de l’IFC, es transforma amb el mateix
origen i exageració del terreny i s’hi afegeix un gruix imprimible de **0,6 mm**.
Els `IFCCLOSEDSHELL` examinats són superfícies obertes: el seu nom no acredita
un sòlid tancat. Es construeixen parets i cara inferior explícites.

Els trams MVT etiquetats com a pont que coincideixen amb aquestes superfícies
deixen d’estampar-se sobre el relleu. El terreny i la cobertura continuen sota
el tauler; s’eviten arbres dins la seva petjada. La capa comparteix el material
de camins i es conserva en actualitzacions d’edificis i vegetació.

**Límits:** dades incloses només a la mostra recomanada, encara sense consulta
automàtica per a qualsevol regió. Gruix de maqueta, no gruix estructural mesurat.
Sense reconstrucció de pilars; el tauler pot requerir suports al laminador.
L’IFC i el DEM no tenen una transformació de datum vertical acreditada: s’indica
a la procedència i als avisos. No es corregeix l’altura del tauler per fer-lo
coincidir artificialment amb el DEM. Cal contrastar especialment estreps i
unions; investigar també els laterals `lpn` abans d’inventar suports.

## Comprovacions

- Sòlids tancats i acceptats per Manifold per a les quatre superfícies, també
  amb retall de 600 m girat 25°. Coordenades dins del model.
- Mostra completa carregada amb fonts locals: espai lliure superior a 2 mm
  entre tauler i vall; mateixa geometria després de canviar edificis/vegetació.
- La base continua a 5 mm a Manresa i Tamariu conserva mar a 5 mm.
- Navegador local: tauler visible amb aire a sota, exportació Bambu operativa.
  Geometria i procedència del fitxer descarregat revisades separadament.
- No es comprova Pages/CI remot. Laminat, suports, connexió física i fidelitat
  altimètrica entre fonts queden pendents de validació.

Túnel real: [dades comprovades i mancances](RO-034-DADES-IFC.md).
