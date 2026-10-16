# Cosa Fare a Potenza: il radar sociale della città

Una web app mobile-first installabile (PWA) che mostra cosa succede stasera a Potenza e provincia: eventi, locali, luoghi di ritrovo, corsi e Spotted anonimi.
Gli utenti segnalano, anche senza account, dove saranno o dove si trovano ora. L'app ne ricava la classifica "Dove va Potenza stasera". L'Admin approva e gestisce tutti i contenuti.

## Per chi è
- **Giovani e studenti (UNIBAS) di Potenza e provincia** che vogliono sapere dove andare stasera e mandare Spotted.
- **Chiunque in città** voglia scoprire eventi, locali, corsi e attività, o segnalarne di nuovi. Si può fare da ospite oppure con un account.
- **L'amministratore della piattaforma** che modera i contenuti, mette elementi in evidenza e fa salire la classifica nella fase di lancio.

## Funzionalità principali ed esperienza

**Barra inferiore fissa a 5 voci:** Esplora · Mappa Radar · "+" centrale luminoso · Spotted · **Accedi** (diventa **Profilo** con icona utente dopo il login).

**Esplora (Home)**
- Barra di ricerca testuale rapida su titoli, descrizioni, zone e paesi.
- Filtro temporale rapido: **Stasera / Questo Weekend / Tutti**.
- Filtri per categoria: Tutto, Eventi, Locali, Luoghi, Corsi & Attività.
- Carosello "In Evidenza stasera", con gli elementi segnati ⭐ dall'Admin.
- Classifica "Dove va Potenza stasera", ordinata per punteggio di tendenza del momento.
- Lista completa e scheda dettaglio: foto, descrizione, data e orari, zona, prezzo, link Instagram, badge di tendenza.
- Pulsante **Condividi** in ogni scheda (Evento, Locale, Luogo, Corso, Spotted). Usa la condivisione nativa del telefono (WhatsApp, Instagram…); se non è disponibile, copia il link. Ogni scheda ha un link diretto che si apre nell'app.

**Mappa Radar (solo segnaposto in questa fase)**
- La voce esiste nella barra ma mostra una schermata vuota con il messaggio "In arrivo". La mappa verrà fatta in una fase successiva.

**Voto anonimo "Ci sarò" / "Ci sono"**
- Si può votare senza account: il dispositivo riceve un ID anonimo. Se l'utente è loggato, il voto è legato al suo account.
- **Massimo 1 presenza per utente/dispositivo per elemento.** "Ci sarò stasera 👋" e "Ci sono ORA 📍" si escludono a vicenda. Se si passa da "Ci sarò" a "Ci sono ORA" il voto cambia tipo e il totale non raddoppia. Ritoccando il pulsante attivo il voto si annulla.
- Scadenze: "Ci sarò" dura fino a fine evento o 12 ore; "Ci sono ORA" dura 4 ore.
- **Scadono e spariscono solo gli Eventi con data passata.** Locali, Luoghi di ritrovo e Corsi/Attività restano sempre visibili; di questi scadono solo i voti.
- "Segui / Salva ⭐" per mettere un elemento nei preferiti.
- **Niente numeri bassi.** Sotto la soglia (20 di default) si vede solo il badge:
  - 1–5: "In movimento ⚡"
  - 6–19: "Di tendenza stasera 🔥"
  - 20–49: "Molto frequentato 🔥🔥 (20+ presenti)"
  - 50+: "Pieno / Evento Top 🚀 (50+ presenti)"
  - Sopra la soglia compare anche il numero. Il boost Admin conta nel totale.

**Tasto "+": "Aggiungi a Potenza"**
- Bottom-sheet con 5 icone grandi: Evento/Festa/Sagra · Locale/Ristorante/Pub · Luogo Pubblico · Corso/Attività/Associazione · Spotted 💘.
- Campi specifici per tipo: titolo, categoria, zona di Potenza o paese della provincia, data e ora se è un evento, descrizione, foto (caricata dal telefono o tramite URL), link Instagram/info.
- "Invia per Approvazione" mette il contenuto in attesa e mostra il messaggio *"Grazie! Il tuo contributo è stato inviato agli Admin e sarà pubblico appena approvato."*
- Se l'utente è loggato, il contenuto compare in "Le mie segnalazioni".

**Spotted Potenza**
- Si vedono solo gli Spotted approvati, in card con: Dove · Quando · Chi cerco · Messaggio.
- Filtri per luogo: UNIBAS, McDonald's, Centro Storico, Autobus/Treno, Locali.
- Reazioni anonime ❤️ 👀 🔥, una per tipo per utente/dispositivo.
- "Sono io / La conosco (Rispondi)" apre un mini-modulo privato (messaggio + contatto). Non ci sono commenti pubblici.
- **Chi lo ha creato da loggato** legge le risposte private nel Profilo, senza codice.
- **Chi lo ha creato da ospite** riceve un codice segreto all'invio, salvato anche sul dispositivo. Inserendolo in "Leggi risposte con codice" (accessibile dalla tab Spotted) vede le risposte.
- L'Admin vede sempre tutte le risposte.

**Accedi / Profilo**
- Registrazione e login semplici con Email o Username + Password. La sessione resta salvata e c'è il pulsante Esci.
- Nell'area utente:
  - **I miei Salvati ⭐**
  - **I miei Spotted**, ciascuno con le risposte private ricevute
  - **Le mie segnalazioni** inviate con il "+", con stato In attesa / Approvato / Rifiutato
- **Accesso Admin integrato.** Si entra nel Pannello Admin in due modi:
  - login con l'account admin già creato (username `admin`, password `admin123`);
  - voce "Sblocca Admin con PIN" dentro il Profilo (PIN predefinito `admin123`).

**Pannello Admin (raggiungibile dal Profilo)**
1. **Coda di approvazione:** approva in 1 click, modifica testi e foto prima di approvare, rifiuta o elimina.
2. **Inserimento diretto:** i contenuti creati dall'Admin sono pubblicati subito.
3. **Gestione completa:** modifica, elimina, metti o togli "In Evidenza ⭐".
4. **Boost Tendenza:** pulsanti +5 / +10 / +25 e azzeramento del boost su eventi, locali, luoghi e attività.
5. **Impostazioni:** soglia di visualizzazione dei numeri (default 20) e cambio del PIN Admin.
6. **Risposte agli Spotted:** elenco di tutte le risposte private ricevute.

**Contenuti precaricati:** luoghi, eventi, corsi e Spotted reali di Potenza già approvati. In più ci sono 2–3 elementi in attesa per provare subito l'approvazione.

## Flusso utente
1. L'utente apre l'app (o la installa sulla Home come "Cosa Fare a Potenza") e arriva su Esplora, dove vede gli elementi in evidenza e la classifica della serata.
2. Cerca per testo o filtra per Stasera / Weekend e per categoria, poi apre una scheda. Lì tocca "Ci sarò" o "Ci sono ORA" e il badge si aggiorna; può anche salvare o condividere.
3. Tocca "+", sceglie il tipo, compila e invia per approvazione.
4. In Spotted reagisce o risponde in privato.
5. Se vuole, si registra dalla tab Accedi: nel Profilo trova salvati, Spotted con risposte e segnalazioni con il loro stato.
6. L'Admin fa login come `admin` (o sblocca con il PIN), approva, modifica o rifiuta, mette in evidenza, applica il boost e regola la soglia.

## UI/UX
- Dark mode nativa: sfondo #0B0B0F, card in vetro scuro #16161F, bordi sottili luminosi.
- Accenti neon: viola #8B5CF6, magenta #EC4899 per gli eventi caldi, arancione fiamma #F97316 per i trend.
- Su desktop l'app resta in una colonna centrale come su uno smartphone.
- Animazioni fluide, badge animati (fiamme pulsanti), icone Lucide, bottom-sheet al posto delle finestre modali.
- Interfaccia interamente in italiano.

## Fasi di implementazione
**Fase 1: MVP (da costruire ora)**
Tutto quanto descritto sopra:
- Esplora con ricerca, filtri temporali e per categoria, evidenza, classifica e schede con Condividi
- Voti anonimi o con account, con la regola di 1 presenza per persona e le scadenze
- Salvati
- Tasto "+" con upload foto
- Spotted con reazioni, risposte private e codice per gli ospiti
- Accedi/Profilo con registrazione, login, salvati, i miei Spotted e le mie segnalazioni
- Accesso Admin integrato e Pannello Admin completo
- Contenuti precaricati
- PWA installabile con icona e funzionamento offline di base
- La Mappa Radar è solo un segnaposto vuoto.

**Fase 2: Mappa e coinvolgimento**
- Mappa Radar scura di Potenza e provincia con pin per categoria e alone a fiamma sui posti più frequentati
- Notifiche push per gli elementi seguiti
- Segnalazione di contenuti inappropriati
- Recupero password via email

**Fase 3: Crescita**
- Profili per i gestori dei locali, che pubblicano i propri eventi
- Statistiche per l'Admin
- Più amministratori con ruoli diversi
- Eventuali spazi promozionali a pagamento

## Assunzioni
- Nome dell'app: **"Cosa Fare a Potenza"**, installabile con icona e splash dedicati.
- Foto: upload diretto dal telefono (su storage cloud gestito) oppure link URL, a scelta.
- In registrazione si chiedono username, email e password. Il login accetta sia l'email sia lo username.
- Il recupero password non c'è in Fase 1, perché manca un servizio email.
- Il PIN Admin del Profilo e la password dell'account `admin` sono separati. Tutti e due valgono `admin123` all'inizio, ma dalle impostazioni si cambia solo il PIN.
- Gli utenti normali non vedono mai il Pannello Admin. Chi sblocca col PIN ottiene l'accesso admin solo su quel dispositivo, finché non esce.
- I voti, i salvati e gli Spotted fatti da ospite non vengono trasferiti all'account quando ci si registra.
- Se un ospite perde il codice segreto, le risposte al suo Spotted restano visibili solo all'Admin.
- "Stasera" comprende gli eventi di oggi e quelli in corso; "Questo Weekend" va da venerdì a domenica. Locali, luoghi e corsi compaiono con ogni filtro temporale.
- La classifica comprende gli eventi di oggi o in corso e i locali, luoghi e attività con voti attivi.
- Il boost Admin non scade da solo: resta finché l'Admin non lo azzera.
- Tutti i contenuti inviati dagli utenti, Spotted compresi, devono essere approvati prima di essere pubblicati.
- In questa fase l'unico anti-spam è l'ID del dispositivo (o l'account) e il blocco temporaneo del login dopo troppi tentativi sbagliati.
