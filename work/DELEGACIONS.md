# Delegacions seqüencials a Kimi

2026-11-01. Autorització de l’usuari: una tasca cada vegada; consum inicial comunicat del 95% disponible. Cap altre agent simultani. No es pressuposa aquest marge en futures sessions.

## Condició d’entrega

Totes les proves proposades o afegides s’han d’executar i passar. Cada tasca ha de passar també la suite existent i la construcció estàtica. Si una prova continua fallant després de tres intents de correcció acotats, s’ha de retornar l’error, els intents, el diff pendent i el bloqueig, sense declarar èxit ni rebaixar la prova. Revisió de l’agent principal abans d’enviar la tasca següent. Cap publicació ni comprovació remota per part de Kimi.

| Ordre | Tasca | Estat |
| --- | --- | --- |
| 1 | [RO-039](RO-039-CATASTRE-TIMEOUT.md): diagnosticar i corregir el timeout del Catastre | Acceptada amb revisió; 89 proves i build correctes. Cas real pendent |
| 2 | [RO-019](RO-019-SETUP.md): preparar sistema i interfície d’idiomes, sense traduccions | Acceptada amb revisió; 106 proves i build correctes; selector/teclat comprovats localment |
| 3 | [RO-014](RO-014-PROPOSTA.md): proposta concreta de marc imprimible | Acceptada després de revisió de perfil/perímetre i correcció aritmètica de cantonades; 106 proves i build correctes |
| 4 | [RO-016](RO-016-PROPOSTA.md): proposta concreta de plaques i etiquetes | Acceptada amb precisions de revisió; 106 proves i build correctes; font/implementació pendents |
| 5 | [RO-017](RO-017-PROPOSTA.md): proposta concreta de rosa dels vents i complements | Acceptada amb correcció del signe, anisotropia i exportació; fórmula comprovada contra projecció; 106 proves i build correctes |
| 6 | [RO-012](RO-012-PROPOSTA.md): proposta concreta d’escena de presentació | Acceptada amb precisions de cicle de vida/render/context; 106 proves i build correctes; implementació pendent |

RO-033–RO-035 no s’implementen saltant els requisits de sòlids de RO-024. Aquesta decisió respon a les dependències del projecte, no a una incapacitat atribuïda a Kimi. Les propostes han de distingir feina dissenyada de funcionalitat realment implementada o provada.

## Revisió final local

106 proves superades i construcció estàtica correcta després de la integració. Les 23 referències de text migrades tenen entrada catalana; només es distribueix el catàleg català. Backlog amb 39 identificadors estables (20 actius/dissenys/ajornats i 19 arxivats), enllaços locals comprovats. Selector comprovat al navegador local: català seleccionat, quatre llengües desactivades, document `lang=ca`, obertura amb Enter i tancament amb Escape. Pendents validació d’usuari, lector de pantalla, cas real del Catastre i totes les validacions futures de les propostes. Cap comprovació remota de Pages/CI. No es declara un consum final de Kimi que no s’hagi mesurat.
