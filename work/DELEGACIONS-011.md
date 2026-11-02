# Lot seqüencial següent a v0.10.0

Autorització actual: Kimi 100% disponible segons l’usuari. Un sol encàrrec cada vegada, amb revisió abans del següent. Totes les proves proposades/afegides i la suite completa han de passar, igual que la construcció. Màxim tres intents de reparació per fallada; després, retornar el bloqueig exacte sense rebaixar proves. Cap commit/publicació ni verificació remota per part de Kimi.

| Ordre | Abast | Estat |
| --- | --- | --- |
| 1 | RO-040 · Catastre buit vàlid i diagnòstic de zoom | Acceptat després de revisió; 117 proves i build correctes |
| 2 | RO-041/042 · navegació, densitat i cobertura per gest | Acceptat amb límits d’entrada revisats; 128 proves/build; navegació/òrbita comprovades al navegador |
| 3 | RO-043 · actualització automàtica d’edificis | Acceptat: 138 proves/build de Kimi, 11 proves del planificador amb regressió addicional; altura/font automàtiques i generació explícita amb relleu pendent comprovades al navegador |
| 4 | RO-032 · dades reals de cobertes i política de fusió | Recerca revisada: 139 proves/build; font MDTe identificada, endpoint/CORS pendents; quota82,34% després |
| 5 | RO-014 · implementar marc independent | Parcial de Kimi no acceptat; revisat, provat i integrat per root |
| 6 | RO-016 · implementar placa educativa | Implementat per root; proves de geometria i exportació passades |
| 7 | RO-017 · implementar fletxa de nord | Implementat per root; proves de geometria i exportació passades |
| 8 | RO-012 · implementar escena de presentació | Pendent |
| 9 | RO-023 · simplificar l’accés a fonts remotes i importació avançada | Pendent |
| 10 | RO-024 · auditoria/unió acotada i bloc sintètic amb pas | Pendent |

Ponts/cavitats reals requereixen dades 3D i les portes de RO-024. No s’inventen pendents, cotes de viaductes ni coves a partir d’un MDT 2,5D. Validació d’usuari, laminador i física continuen separades de les proves locals.

## Seguiment de recursos

L’usuari demana consulta després de cada entrega; en arribar al 85–90% consumit, aturar nous encàrrecs a Kimi i continuar amb l’agent principal. API local autenticada consultada sense mostrar credencials: 65,08% i després 67,31% consumits a la finestra de 5 h; reinici01:42UTC (02:42 local). Són lectures globals del compte, no una atribució demostrada al projecte. RO-043 ha tornat a revisió per la protecció prèvia al commit després d’una càrrega asíncrona.

## Traspàs a l’agent principal

L’últim encàrrec de nucli del marc ha acabat amb429 abans de les proves. Lectura posterior:100% consumit. No es dona per acceptada l’entrega parcial ni els resultats declarats al document encara sense execució. Root continua implementació, revisió i totes les proves; cap nou encàrrec a Kimi en aquesta finestra. El marge85–90% no s’ha preservat durant aquest encàrrec, malgrat comprovar abans82,34%. En futures delegacions, reservar marge per al cost de l’encàrrec i monitorar també durant l’execució si s’apropa al llindar.

Per petició explícita de l’usuari es tanca la feina en curs: RO-012, UX remota de RO-023 i fonaments RO-024 queden pendents, sense nous encàrrecs ni implementacions atribuïdes. No queden processos auxiliars de Kimi iniciats per root.

Comprovació conjunta de v0.11.0: 152 proves superades, construcció estàtica correcta i 43 identificadors estables al seguiment. Validacions d’usuari/laminador/impressió pendents.

Comprovació real de navegador: descàrregues de marc, placa i nord generades pel Worker i obertes com aZIP locals, amb manifest i3MF/STL. No valida laminador ni ajust físic.
