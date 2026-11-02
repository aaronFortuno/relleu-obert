# RO-034 — Dades per al túnel de la mostra de Manresa

Estudi local del 2026-11-02, preparat per Kimi i revisat per l’agent principal.
**Dades examinades insuficients per reconstruir el buit amb fidelitat.** Això
no afirma que no existeixin altres fonts adequades.

## Fonts comprovades

1. [IFC ICGC del full 280110, 2024](https://datacloud.icgc.cat/datacloud/topografia-territorial/ifc/topografia-territorial-v1r0-full280110-2024.zip):
   83.598.524 bytes descomprimits, 1.738 proxies i 37 categories. Hi ha 12
   superfícies `tpn` de tauler i 23 laterals `lpn`, però cap categoria `tun`.
   Inventari de propietats i cerca de túnels/portals sense resultats que
   acreditin un eix subterrani o una secció del túnel de prova.
2. [RTT, capa 22: connexions d’eixos](https://maps.icgc.cat/vector03/rest/services/RTT/Referencial_Topogr%C3%A0fic_Territorial/MapServer/22):
   consulta de l’envolupant inicial amb `inSR=4326`, `returnZ=true`,
   `outFields=*`: **6 elements, 34 punts, tots XY**.
   **Sí que hi ha elements `terreny=tun`**, a més de `gen`: és identificació
   del túnel, però no aporta la Z ni la secció. Els codis `vca/vnc/vpu`
   descriuen la via i no substitueixen l’atribut `terreny`.
3. [RTT, capa 23: eixos](https://maps.icgc.cat/vector03/rest/services/RTT/Referencial_Topogr%C3%A0fic_Territorial/MapServer/23):
   124 elements i 3.600 punts, també XY malgrat `returnZ=true`.
4. [Inventari MVT de la mostra](mostres/eix-diagonal-infraestructura.json):
   fragment `1820235140`, `class=trunk`, `brunnel=tunnel`, `layer=-1`,
   7 punts, només XY. L’identificador de tessel·la no s’acredita com a ID
   original d’OpenStreetMap. `layer=-1` no significa un metre de profunditat.

L’envolupant és la de [la mostra inclosa](../public/data/eix-diagonal.json).
Les consultes RTT en UTM i en coordenades geogràfiques corresponen a la
mateixa zona de prova.

## Comprovacions executades

Kimi ha executat els inventaris IFC i tres consultes HTTP acotades; sense
modificar l’aplicació ni tornar a descarregar l’IFC. L’agent principal ha
reexecutat l’inventari i comprovat amb assercions: nom del full, 12 taulers,
cap categoria IFC `tun`, respostes sense error i coordenades de dimensió 2.

[Resultat resumit i hash SHA-256 de l’IFC](mostres/eix-diagonal-tunnel-data-audit.json).
Les consultes completes i scripts temporals són a `output/kimi26-*` i
`output/review-tunnel-data.mjs`; el resum inclòs permet contrastar-ne la versió.
L’atribució de les dades ICGC continua sent CC BY 4.0.

## Què falta i proper pas

Tenim identificació i traçat en planta. Falta acreditar **perfil altimètric,
boques i secció**; una connexió virtual 2D no descriu el buit 3D. Per tant,
l’aplicació manté el túnel ocult en superfície i no perfora el relleu encara.

El motor numèric ja pot escombrar una secció sobre un eix XYZ i el motor de
RO-024 pot restar-la de diverses capes. Les proves sintètiques no acrediten
la geometria del túnel real.

Investigar els formats ICGC 3D GPKG/DWG/DGN i si permeten extreure la connexió
subterrània amb Z en un paquet acotat; el servei ArcGIS examinat perd aquesta
dimensió. El GPKG de tot Catalunya supera els 10 GB i no és una descàrrega
raonable al navegador. També es poden estudiar projectes constructius o BIM.
Si no s’obtenen dades, una futura aproximació entre portals s’haurà de definir
i identificar explícitament com a estimació, amb límits d’escala i impressió.
