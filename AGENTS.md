# Instruccions del projecte

- Mantén les versions experimentals en `0.x` o `0.x.x`. Després de `0.9` ve `0.10`; no passis a `1.0` sense una petició explícita de l’usuari que declari la versió estable.
- Prioritza l’ús d’escriptori. Header i footer sempre visibles, dos sidebars amb scroll intern i preview central estable.
- Tot el càlcul es fa al navegador i l’aplicació es publica estàticament a GitHub Pages.
- Després de validar localment, no facis comprovacions remotes de la web ni de CI: les fa l’usuari manualment.
- L’autorització de publicar els canvis d’aquest projecte a GitHub ja consta a la conversa. Utilitza Git Credential Manager i git.exe amb `http.sslBackend=openssl`; no utilitzis `gh` ni exposis credencials.
