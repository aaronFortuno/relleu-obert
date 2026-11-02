# Controls RO-051 · v0.18.2

Models generats i auditats localment, publicats per a revisió de l'usuari.
Les infraestructures estimades no són aixecaments constructius. La revisió
al laminador i la impressió d'un cupó continuen pendents.

**Observació d'usuari pendent (RO-052):** discontinuïtats i canvis
d'amplada en unions carretera/pont/túnel. Aquests controls permeten
revisar el problema; v0.18.2 encara no el corregeix.

| Fitxer | Configuració | Resultat local |
| --- | --- | --- |
| [RO-051-3km-150mm.3mf](RO-051-3km-150mm.3mf) | 3 × 3 km, 150 × 150 mm, detall 12, edificis OSM, sense arbres ni túnels | 14 perfils; mateixos resums de pilars i llums que c74e992; 56,638 s en lloc de 189,274 s |
| [RO-051-Rajadell-tunels-150mm.3mf](RO-051-Rajadell-tunels-150mm.3mf) | 1,5 × 1,5 km, 150 × 150 mm, detall 36, edificis ICGC, túnels, sense arbres | 4 perfils, 11 pilars al viaducte i 2 de nous; túnel principal excavat; segon candidat omès per manca de coberta |

Revisar continuïtat de les vies, connexions als extrems, pilars i passos
inferiors. Al control de Rajadell, comprovar també portals, paviment del
túnel i materials. Els 3MF conserven les dades de procedència.

El prototip encara no té selector a l'aplicació. El cas d'1,5 km amb detall
12 recupera els camins previs per un component de volum nul, també amb
el codi original; aquests fitxers no el donen per resolt.

[Informe de rendiment](../../../work/RO-051-RENDIMENT.md) ·
[Seguiment al backlog](../../../work/BACKLOG.md#ro-051--perfils-de-carreteres-principals)
