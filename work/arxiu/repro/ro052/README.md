# RO-052 · evidència prèvia al refinament transversal

**Fitxers de diagnòstic, no models finals per imprimir.** Es conserven per
reprendre la investigació al portàtil. Es van generar abans de l'últim
canvi `pavementSections.across` / `surfaceBreaks`; no validen l'últim codi.

- [Rajadell 150 × 150 mm](RO-052-PRE-perfil-Rajadell-150mm.3mf) i
  [informe JSON](rajadell-150-pre-perfil.json): model en 7,602 s, escala
  1:10.000, onze pilars al viaducte principal i dos enllaços, un túnel
  aplicat. Auditoria sense errors, però en una boca el centre interpolat
  diferia del terreny aproximadament 0,01865 mm.
- [Rectangle 150 × 200 mm girat 25°](RO-052-PRE-perfil-Rajadell-150x200mm-gir25.3mf)
  i [informe JSON](rajadell-rectangle-pre-perfil.json): 3,323 s, escala
  1:8.000, dotze pilars al viaducte principal i dos enllaços. El centre
  interpolat diferia del terreny 0,09110 / 0,04919 mm a les dues boques.

Tots dos usen ICGC, detall 36, túnels activats, sense arbres i sense el
prototip RO-051 de vies principals: corresponen al mode de carreteres de
la UI. Vegeu [el punt de represa](../../REPRESA-RO-052.md) per a la
regressió final fallida i l'ordre de continuació.
