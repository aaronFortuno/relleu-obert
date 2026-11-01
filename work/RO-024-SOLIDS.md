# RO-024 — Sòlids abans de ponts, túnels i cavitats

2026-11-01 · Pla per a la iteració següent. No acredita unions generals ni impressió física. Relació amb [PAISATGE-3D.md](PAISATGE-3D.md) i [BACKLOG.md](BACKLOG.md#ro-024--unió-de-volums-i-validació-dimpressió).

## Què tenim i què falta

El motor genera peces tancades per fragments de superfície i exporta materials amb coordenades compartides. Hi pot haver cares internes o sòlids que s’encavalquen dins d’un material. El motor Manifold existent s’utilitza per tallar peces, però això no equival a una unió general validada de totes les capes. Les cobertes gabled/skillion noves també són fragments tancats; no resolen aquest deute.

La separació incremental de terreny i edificis de v0.9 permet treballar després sobre infraestructures sense recalcular l’MDT. Les operacions booleanes d’exportació s’han d’aplicar sobre una còpia del model, preservant les malles de preview i la seva procedència.

## Portes de validació

| Fase | Resultat revisable | Criteri per continuar |
| --- | --- | --- |
| 1. Auditoria de peces | Recompte de components, arestes, orientació, volum i errors per material | Coordenades finites, unitats i dimensions conservades; errors explícits, sense forats reparats silenciosament |
| 2. Unió dins del material | Peça petita amb terreny, bosc, carretera i edifici en pendent | Eliminar encavalcaments/carestes internes sense unir colors diferents; comparar volum i superfícies abans/després |
| 3. Cavitat sintètica | Bloc amb túnel recte de secció coneguda i dos portals | Restar el mateix buit de totes les capes afectades; comprovar pas lliure, sòlid tancat i base intacta |
| 4. Retall i partició | El mateix buit travessa dues peces de 20 cm | Cap tapa nova obtura el pas; correspondència exacta als límits de peces i materials |
| 5. Laminador i impressió | Fitxer de control petit amb dimensions i captures | Confirmació de l’usuari al Bambu i després impressió; registrar suports, parets i passos que es perden |

La fase 1 ha d’incloure un cas senzill i el retall de la Perica amb parts cadastrals. La fase 2 ha de provar també una capa absent, un pati i contactes coplanaris; no només cubs que se superposen còmodament. Les limitacions de precisió i quantització han de quedar registrades.

## Després: dades reals

- **Ponts/viaductes (RO-033):** començar per un tauler amb perfil 3D disponible, connexions i espai lliure inferior. `brunnel`/`layer` no són cotes. Decidir la transformació vertical comuna quan s’exagera el relleu; no doblegar el tauler seguint el fons de la vall.
- **Túnels (RO-034):** portals, eix 3D i secció coneguts. Un traçat 2D no permet afirmar una profunditat real. La política d’escala pot ometre passos massa petits amb avís, però no engrandir-los sense decisió de l’usuari.
- **Baumes/arcs/coves (RO-035):** el nostre MDT d’una altura per XY no conté aquests volums. Cal una malla o aixecament que observi les superfícies necessàries; primer un arc petit amb font i llicència verificades.

**Decisió:** començar per l’auditoria i la unió acotada, després un buit sintètic. No prometre encara ponts, coves o túnels imprimibles en qualsevol regió. Pages/CI els comprova l’usuari; les proves de geometria i les d’impressió són fases separades.
