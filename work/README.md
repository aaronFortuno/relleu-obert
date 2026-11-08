# Documents de treball

El [backlog](BACKLOG.md) recull les prioritats, les comprovacions pendents i el document de referència de cada tasca. A `work/` hi ha els documents que es fan servir per continuar una línia, reproduir un cas vigent o mantenir una funcionalitat.

## Arxiu

- [Historial i validacions](arxiu/HISTORIAL.md) recull què s’ha comprovat i quan.
- [Ajornaments i idees](arxiu/AJORNATS.md) conserva les condicions per reprendre les línies aparcades.
- [Observacions originals](arxiu/MILLORES-BUGS.md) conserva les notes i les captures de l’usuari.
- [Mostres](arxiu/mostres/) i [reproduccions](arxiu/repro/) acompanyen els informes antics.

## En tancar una iteració

1. Actualitza la tasca amb el següent pas. Distingeix prova local, validació d’usuari, laminat i impressió.
2. Quan es tanqui o s’ajorni, conserva l’identificador, la decisió i les proves a l’historial o al registre d’ajornaments. Si encara cal una comprovació, deixa-la al backlog.
3. Mou a `arxiu/` els informes, les captures i les mostres que ja no es necessiten per continuar. Conserva a `work/` les guies de manteniment i la documentació que encara es fa servir. Reutilitza el document vigent de la tasca en cada iteració i elimina els duplicats que no aportin evidència.
4. Actualitza els enllaços als documents moguts i comprova’ls localment.
