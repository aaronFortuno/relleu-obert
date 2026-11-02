# Instruccions del projecte

- Mantén les versions experimentals en `0.x` o `0.x.x`. Després de `0.9` ve `0.10`; no passis a `1.0` sense una petició explícita de l’usuari que declari la versió estable.
- Prioritza l’ús d’escriptori. Header i footer sempre visibles, dos sidebars amb scroll intern i preview central estable.
- Tot el càlcul es fa al navegador i l’aplicació es publica estàticament a GitHub Pages.
- Les elevacions RGB són dades numèriques: descodifica els bytes WebP/PNG directament, sense lectures de canvas (`getImageData`), que poden alterar els canals i les altituds. Conserva els diagnòstics i la procedència de les fonts.
- Després de validar localment, no facis comprovacions remotes de la web ni de CI: les fa l’usuari manualment.
- L’autorització de publicar els canvis d’aquest projecte a GitHub ja consta a la conversa. Utilitza Git Credential Manager i git.exe amb `http.sslBackend=openssl`; no utilitzis `gh` ni exposis credencials.
- Consulta `work/BACKLOG.md` abans d’obrir una línia de treball. Mantén els identificadors estables i actualitza l’entrada, la vista de conjunt i l’historial en començar, acabar o canviar de decisió. Conserva les observacions originals de `work/MILLORES-BUGS.md`.
- Distingeix correcció implementada, proves locals i validació d’usuari/laminador/impressió. No tanquis una incidència només perquè la construcció o les proves existents passin; registra què falta, i els motius de qualsevol ajornament o descart.
- Si es delega a Kimi, fes tasques acotades i seqüencials. Comprova el consum disponible abans de començar; una dada de consum d’una iteració anterior no acredita el pressupost actual. No llancis múltiples agents sense control del consum.

- Després de cada entrega de Kimi, consulta de nou la quota real abans d’encarregar res més. Per indicació expressa de l’usuari, en arribar al 85–90% consumit s’atura la delegació a Kimi i continua l’agent principal; no s’aturen les tasques autoritzades només per aquest canvi de responsable. No atribueixis un consum global a aquest projecte si no s’ha mesurat aquesta atribució.

- Reserva marge per al cost de la tasca següent: si el consum de Kimi supera el80%, prefereix continuar localment en lloc d’iniciar una tasca que pugui travessar el llindar85–90%. Una comprovació només al retorn no limita el consum dins de l’encàrrec. No acceptis resultats declarats si no s’han executat les proves, també quan el proveïdor esgota quota abans d’entregar.
