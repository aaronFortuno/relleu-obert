Qüestions detectades a 26/11/01 12:30

General:

- Afegir transicions-animacions 220ms allà on calgui (modals, popups, dropdowns...) de forma sistemàtica i homogènia

- Hi ha encara alguns artefactes d'elevació del terreny:
  
  - Normalment apareix 1 per renderitzat, però de vegades 2
  
  - Apareix en posició aleatòria, no sembla que tingui a veure amb les fonts cartogràfiques sinó més aviat amb algun càlcul nostre posterior
  
  - Això provoca deformacions abruptes al terreny, apareixent muntanyes punxegudes sobtades.
    
    - Això, al mateix temps provoca que si hi ha un edifici a prop, agafi com a referència d'alçada calculada la errònia i els edificis afectats quedin molt més alts del que li pertoca
- Ens falta un favicon al projecte, que pot ser el mateix logo dels tres triangles que utilitzem al header, i pot esdevenir una marca provisional

Edificis:

- El tractament de vegades és en blocs molt més grans que en la realitat. La zona que estem utilitzant per fer proves, Tamariu, té moltes cases i antigues barraques de pescador, que són edificis independents. En molts casos, edificis colindants però independents al món real es tracten com una sola entitat a relleu-obert, el que fa que, en llocs amb diferències tan importants d'altura, alguns d'aquests mega-blocs quedin molt "mamotreto".

- T'he deixat tres captures (google-maps.png, openstreetmap.png i relleu-obert.png) de la mateixa zona aproximada, perquè vegis l'efecte del que deia.
  
  - L'edifici gran a l'interior de la corba principal del carrer, a relleu-obert, en realitat a google maps es tracta com edificis independents (que és el que són), i a openstreetmap ni tan sols està cartografiat. No sé d'on s'extreu la informació però s'hauria de mirar de fer-ho més respectuós amb la disposició real

Footer:

- El peu "Fonts cartogràfiques" el podem passar dins de "Sobre el projecte - V4V", seguint l'estil de pentagrama.page i plec.ortogra.fi, on s'hi reserva un espai per indicar les fonts obertes i enllaços a altres projectes que s'han utilitzat com a base per construir el nostre

- Hi ha una redundància amb l'enllaç a la llicència. Crec que al footer, on posem "Codi obert · MIT" com  un únic enllaç a la llicència, podrien ser dos enllaços, un al repo i l'altre a la llicència, i treure aquesta anotació de dins del quadre V4V, per evitar redundància

- Al costat de "Un tros del món..." crec que estarà bé aprofitar aquest footer per mostrar un petit missatge de quants models s'han descarregat. No sé com ho haurem de fer, o si podrem fer-ho, però quan estiguem actius utilitzarem Umami per fer seguiment d'algunes opcions que utilitzin els usuaris, i no sé si serà possible automatitzar alguna informació d'Umami cap al repositori per mostrar-ho, o què. Pensem-hi, perquè pot ser un ganxo interessant: "4 923 models descarregats" és una forma de dir que l'eina funciona i s'ha utilitzat de forma clara.

Gestió d'escala:

- Ara mateix l'escala es calcula en funció de la mida i ampliació del model, proporcionant escales una mica "estranyes" (per exemple, ara tinc en pantalla un model amb escala 1:3415). Estaria bé disposar d'una opció de fer-ho al revés, és a dir, indicar una escala destí (1:1000, 1:1500, 1:2000...) i llavors ampliar o reduir el zoom fins a mostrar-nos aquella escala precisa. No sé si serà possible fer els càlculs correctes d'acord amb les tesel·les que obtenim dels serveis, però seria interessant poder-ho fer.

- Al header hi tenim l'escala i també al sidebar dret sota "La teva maqueta". Potser hauríem de mostrar-ho només al sidebar.

- L'anotació de "XXX.XXX triangles" potser també és una mica innecessària al header i pot quedar més com una curiositat estadística del model al sidebar. O això o li donem una mica més de protagonisme amb algun text que realçi el nivell de detall del model, llavors sí que estaria bé mostrar-lo en un lloc preeminent. Però pensem-ho bé

Preview d'impressió:

- Una opció interessant, en paral·lel a descarregar-se el model, o que aparegui al sidebar de la dreta, seria una previsualització renderitzada de com quedaria imprès. Per exemple, mostrar una taula d'una escola, amb el model imprès en perspectiva, amb il·luminació i colors realistes, ombres, etc, perquè l'usuari es pugui fer una idea de com pot quedar un cop imprès. Evidentment, el resultat final dependrà.

- Al preview donar l'opció de mostrar-ho amb un marc que envolti el model. Probablement, per conservar millor els models impresos el que faré serà posar-los dins d'un marc, que no sé si serà de fusta o fet adhoc amb 3D també, una cosa elegant en blanc o negre.

- Potser una opció serà també poder imprimir aquest marc amb les mides del model més un petit marge interior per encabir-lo, com si fos un quadre. Aquesta opció calcularia les mides del marc d'acord amb les mides del model i seria un altre arxiu independent

Configuració d'impressió:

- Ara, per defecte, el model exportat utilitza una mena d'impressora vinculada al propi projecte, una mica estrany. En qualsevol cas, el diàmetre d'extrusió per defecte és de 0,2mm, i el filament que apareix a la configuració és una mica estrany i s'ha de canviar manualment a PLA, PTEG o el que sigui.

- Estaria bé donar opció d'exportar amb diferents boques: 0,2 0,4 i 0,6 semblen opcions raonables, i potser poder exportar ja amb determinat tipus de material d'impressió no seria mala cosa. Sé que és simplement una cosa que no afecta al model en sí o a la impressió, que finalment cadascú ha de configurar pel seu compte, però seria una cosa que podria millorar una mica el resultat final del que estem fent.

Complements:

- Poder imprimir una placa amb les coordenades o el nom del lloc, o un text personalitzat (per exemple, poder imprimir i tenir al propi models la descripció de quina entitat de relleu és: "Serralada", "Estret", "Badia", etc.), ja sigui com una plaqueta per separat o bé a sobre mateix. Té sentit, fixa't: model imprès, marc amb una etiqueta amb quin accident geogràfic és, de forma que a la prestatgeria on els guardem podem veure ràpidament quin és cadascun només mirant el lateral del model (és un exemple d'ús, no necessàriament sempre seria així)

- Poder imprirmir altres formes accessories, per exemple una rosa dels vents sobre el model, o com a peça per separat, per incloure posteriorment al disseny un cop imprès, amb cola.

Rotar el model:

- Ara mateix sempre tenim el nord a dalt, estaria bé disposar de l'opció de rotar el nostre quadre. Per exemple, a la vista de mapa podriem tenir opció de rotar el mapa o bé de rotar el quadrat central, el que sigui més pràctic i intuïtiu. Potser és més natural rotar el mapa de sota que no pas el quadrat i imaginar-te com quedarà, però vaja, en aquest punt crec que no importa gaire.

Organització de sidebars:

- Els sidebars tenen massa scroll vertical, sobretot el de l'esquerra. Crec que seria interessant que els diferents apartats (Tria el lloc, Mida i relleu, etc.) apareguin replegats a partir del 2, de forma que puguem accedir-hi però no ens comprometi tant d'espai. Podem fer-los col·lapsables de forma exclusiva i que només es pugui mostrar un desplegat, igual que fa el sidebar esquerra de pentagrama.page

Preview:

- Al preview hi mostrem una mena de subheader que hi diu "Tamariu · Palafrugell" que és innecessari, i també el "Càlcul al navegador" també ho podem obviar.

- Els botons de Restablir i Vista zenital poden mostrar-se dins del propi preview, com a botons flotants.

- El helper "Arrossega per girar..." tambéel podem mostrar flotant dins del preview i no fora.

- El "Vegetació actualitzada" o altres missatges d'actualització en temps real podríem fer que apareguin també sobreimpresos, per guanyar més espai útil a la previsualització.

Internacionalització:

- No és urgent, però quan tinguem una versió estable i funcionant voldrem la interfície en diferents idiomes. Estarà bé tenir-ho present des del principi a l'hora de treballar perquè l'arquitectura ho permeti de forma fàcil (com a mínim tindrem castellà, gallec, euskera i anglès)
