# Cosa Fare a Potenza 2.0: Bacheca della città e Cabina di Regia totale

L'app diventa una piattaforma completa per Potenza e provincia: Esplora (eventi, locali, luoghi, attività), una **Bacheca** a sezioni (Spotted, Case & Coinquilini, Lavoro, Passaggi, Chi si unisce…) e il **Sondaggio del Giorno**.
Tutto è gestibile dal telefono da un **Super Admin** che può modificare struttura, testi, categorie, Home e sponsor senza mai toccare il codice.

## Per chi è
- **Giovani, studenti UNIBAS e residenti di Potenza e provincia**: vogliono sapere cosa fare, trovare casa o coinquilini, lavoretti serali, un passaggio o compagnia per uno sport.
- **Locali, agenzie e attività** (es. Supreme House Immobiliare): vogliono visibilità tramite banner sponsorizzati e annunci.
- **Il proprietario (Super Admin)**: controlla e trasforma l'app in autonomia.
- **I collaboratori (Admin)**: moderano e pubblicano contenuti.

## Funzionalità principali ed esperienza

### 1. Barra inferiore (aggiornata)
Esplora · Radar (resta "In arrivo") · **+** · **Bacheca** (sostituisce Spotted) · Accedi/Profilo.
- Il **"+"** apre "Aggiungi a Potenza", con tutte le categorie di Esplora attive e tutte le sezioni della Bacheca attive, entrambe generate in automatico da ciò che è configurato nell'Admin.

### 2. Bacheca (nuova sezione centrale dell'app)
- **Pagina iniziale a riquadri colorati**, uno per sezione, ognuno con icona, colore, nome, breve descrizione e numero di annunci attivi. L'ordine si decide dall'Admin.
- **Sezioni predefinite** (tutte modificabili, disattivabili o eliminabili):
  - **Spotted 💘**: Dove · Quando · Chi cerco · Messaggio. Etichette: UNIBAS, McDonald's, Centro Storico, Autobus/Treno, Locali. Pulsante "Sono io / La conosco".
  - **Case & Coinquilini 🏠**: stanze per studenti UNIBAS, affitti, coinquilini cercasi, B&B. Campi: tipo, zona, prezzo al mese, disponibile da, foto, descrizione. Etichette: Stanza, Appartamento, Cerco coinquilino, Affitto breve. Si può mostrare un **badge "Partner ufficiale"** (es. Supreme House).
  - **Lavoro & Staff 💼**: camerieri per il weekend, barman, PR, promoter, ripetizioni. Campi: ruolo, locale/azienda, zona, compenso, quando. Pulsante "Mi candido".
  - **Passaggi 🚗**: "Salgo a Potenza da Melfi sabato alle 21:00, 3 posti". Campi: da, a, data, ora, posti, contributo. Pulsante "Ci sto!". L'annuncio scade da solo dopo la data del viaggio.
  - **Chi si unisce? 🤝**: etichette Sport & Hobby, Tavoli & Uscite. Campi: attività, dove, quando, persone cercate. Pulsante "Ci sto!".
  - **Annunci UNIBAS / Mercatino 📚**: libri, appunti, oggetti, gruppi studio. Campi: titolo, prezzo, condizioni, foto.
- **In ogni sezione:**
  - filtri a etichette e ricerca testuale;
  - card con i campi della sezione;
  - condivisione del link;
  - pulsante "Segnala" contro i contenuti inappropriati;
  - reazioni ❤️ 👀 🔥, attivabili o disattivabili per ogni sezione.
- **Risposte private legate all'account.** Il pulsante della sezione ("Rispondi", "Ci sto!", "Mi candido", "Contatta") apre un mini-modulo con messaggio e contatto.
  - La risposta arriva **solo nel profilo dell'autore** e agli Admin. Non ci sono commenti pubblici.
  - **Il codice segreto viene eliminato.**
- **Ciclo di vita dell'annuncio:**
  - l'autore può segnarlo come "Completato" (es. stanza affittata, posto occupato), modificarlo o eliminarlo;
  - ogni sezione ha una durata automatica (es. Lavoro 30 giorni, Passaggi fino alla data del viaggio, Spotted 14 giorni), regolabile dall'Admin.

### 3. Chi può fare cosa
| Azione | Ospite (senza account) | Utente registrato |
|---|---|---|
| Leggere Esplora e Bacheca | ✅ | ✅ |
| "Ci sarò" / "Ci sono ORA", Salva, reazioni, voto al sondaggio | ✅ (tramite il dispositivo) | ✅ |
| Pubblicare con il "+" (eventi, locali, annunci, Spotted) | ❌ (gli viene chiesto di accedere) | ✅ |
| Rispondere / "Ci sto!" / candidarsi | ❌ | ✅ |
| Segnalare un contenuto | ❌ | ✅ |

### 4. Sondaggio del Giorno 📊
- Un blocco in Home con domanda e 2–4 opzioni, ad esempio "Venerdì: Centro Storico o Macchia Romana?".
- **Le percentuali restano nascoste finché non si vota.** Basta un tocco, il voto è anonimo e ne vale uno per dispositivo o account.
- Dall'Admin:
  - creare sondaggi e programmarli per data (uno attivo alla volta, gli altri in coda);
  - chiuderli in anticipo e vedere lo storico con i risultati.
- Si può aggiungere un'immagine e un testo di commento ai risultati (es. "Potenza ha deciso: si va in centro! 🔥").

### 5. Profilo utente (aggiornato)
- **Messaggi ricevuti**: tutte le risposte e i "Ci sto!" ai propri annunci e Spotted. Un badge con il numero dei non letti compare sulla voce Profilo della barra.
- **I miei annunci**: tutto ciò che è stato pubblicato (Esplora e Bacheca) con lo stato In attesa / Approvato / Rifiutato (con motivo) / Completato / Scaduto. Da qui si può modificare, completare o eliminare.
- **Salvati ⭐**.
- **Account**: cambio password, cambio email, eliminazione dell'account.

### 6. Cabina di Regia: Pannello Admin e Super Admin

**Ruoli**
- **Super Admin** (account proprietario): può tutto, comprese struttura, aspetto, sponsor, utenti, ruoli, backup.
- **Admin** (collaboratori): moderazione, pubblicazione e modifica dei contenuti, boost, evidenza, sondaggi. Non può toccare struttura, sponsor, utenti, ruoli, impostazioni e backup.
- **Il PIN viene rimosso**: si entra solo con un account che ha il ruolo.
- Il pannello mostra solo le voci consentite al proprio ruolo.

**A. Moderazione (Admin + Super Admin)**
- Coda unica di tutto ciò che è in attesa (Esplora + tutte le sezioni della Bacheca), filtrabile per tipo.
- Per ogni elemento: Approva (1 click), Modifica e approva, Rifiuta con motivo (visibile all'autore nel profilo), Elimina.
- Coda delle **Segnalazioni** degli utenti: per ognuna si può nascondere il contenuto, ignorare la segnalazione o bloccare l'autore.
- Elenco di tutte le risposte private, per verifiche e sicurezza.

**B. Contenuti (Admin + Super Admin)**
- Gestione completa di elementi di Esplora e annunci della Bacheca: crea (pubblicato subito), modifica, elimina, In Evidenza ⭐, Boost +5/+10/+25 e azzeramento.
- Gestione dei sondaggi.

**C. Struttura dell'app (solo Super Admin)**
1. **Categorie di Esplora**:
   - creare, rinominare, nascondere, riordinare ed eliminare;
   - per ogni categoria: nome, icona (da una galleria di icone), colore, sottocategorie, e se è **"con data e orari"** (tipo evento, sparisce quando è passato) o **"sempre visibile"** (tipo locale o luogo);
   - una nuova categoria (es. "Sagre in Provincia") compare subito nei filtri della Home e nel "+".
2. **Sezioni della Bacheca: costruttore completo.** Per ogni sezione:
   - nome, icona, colore, descrizione, ordine, attiva/nascosta;
   - **campi del modulo personalizzabili**: aggiungere, rinominare, riordinare o togliere campi scegliendo il tipo (testo breve, testo lungo, numero, prezzo, data, ora, scelta da elenco, zona/paese, foto, link) e se è obbligatorio;
   - **etichette/filtri** della sezione (es. aggiungere "Palestra X", "Liceo", "Festa Universitaria" agli Spotted);
   - testo del pulsante di risposta ("Rispondi", "Ci sto!", "Mi candido"…);
   - approvazione obbligatoria o pubblicazione immediata;
   - durata degli annunci in giorni;
   - reazioni attive o no;
   - badge partner opzionale (nome + logo).
3. **Zone e Paesi**: aggiungere, modificare, riordinare e nascondere le zone di Potenza e i comuni. I comuni si possono raggruppare per area (es. Vulture, Val d'Agri, Lagonegrese) per estendere l'app a tutta la Basilicata.

**D. Home Page Builder (solo Super Admin)**
- Titolo e sottotitolo della Home modificabili (es. "Speciale Natale a Potenza 🎄"). Si possono programmare per data o giorno della settimana, ad esempio il sabato "Dove si balla stasera 🔥".
- **Barra Avviso Importante** in cima: testo, colore (info/attenzione/urgente), link opzionale, date di inizio e fine.
- **Blocchi della Home** da accendere, spegnere e trascinare nell'ordine voluto:
  - Avviso
  - Sondaggio del Giorno
  - Banner sponsor
  - In Evidenza
  - Classifica "Dove va Potenza stasera"
  - Scorciatoie Bacheca
  - Lista completa
- Si possono rinominare i titoli dei blocchi e i filtri temporali (Stasera / Weekend / Tutti).

**E. Banner & Sponsor (solo Super Admin)**
- Ogni banner ha immagine, titolo, testo, testo del pulsante e link (WhatsApp, Instagram, sito, telefono).
- Posizioni possibili:
  - Home in alto
  - Home in mezzo
  - Bacheca iniziale
  - dentro una sezione specifica (es. Case → Supreme House)
  - tra gli elementi della lista ogni N card
- Altre impostazioni: date di inizio e fine, attivo/disattivo, priorità.
- **Statistiche per banner** (visualizzazioni e click), utili a dimostrare il valore agli sponsor.
- Il banner porta sempre la dicitura "Sponsorizzato".

**F. Testi, aspetto e regole (solo Super Admin)**
- Nome dell'app e logo/icona caricabili.
- Testi principali modificabili: messaggio di conferma dopo l'invio, testi dei pulsanti "Ci sarò" / "Ci sono ORA", testo della schermata Radar "In arrivo".
- Etichette e soglie dei **badge di tendenza** (es. rinominare "In movimento ⚡") e soglia oltre la quale si vedono i numeri (default 20).
- Durate dei voti: "Ci sarò" 12 ore e "Ci sono ORA" 4 ore.

**G. Utenti e ruoli (solo Super Admin)**
- Elenco utenti con ricerca e numero di contenuti pubblicati.
- Azioni: promuovere ad Admin o togliere il ruolo, sospendere/bloccare (non può più pubblicare né rispondere), reimpostare la password manualmente (non c'è un servizio email), eliminare.
- **Registro attività**: chi ha approvato, modificato o eliminato cosa, e quando.

**H. Backup (solo Super Admin)**
- **Esporta tutti i dati** (contenuti, Bacheca, utenti senza password, configurazione) in un file da scaricare.
- **Ripristina** da un file di backup, con conferma.
- **Statistiche rapide**: contenuti attivi, annunci per sezione, nuovi utenti, voti di stasera.

## Flusso utente
1. L'utente apre l'app e trova la Home come configurata dal Super Admin: avviso, sondaggio, banner, evidenza, classifica.
2. Vota il sondaggio, apre un evento, tocca "Ci sono ORA" anche senza account.
3. Va in Bacheca → Case & Coinquilini, filtra per "Stanza", tocca "Contatta" e gli viene chiesto di accedere. Si registra e invia la risposta privata.
4. Con il "+" pubblica un Passaggio: va in coda se la sezione richiede approvazione, altrimenti è subito visibile.
5. L'autore della stanza trova la risposta in Profilo → Messaggi ricevuti e poi segna l'annuncio come "Completato".
6. Il Super Admin crea la sezione "Feste Universitarie", aggiunge il comune "Villa d'Agri", attiva un banner Supreme House nella sezione Case, cambia il titolo della Home per il weekend e nomina un collaboratore Admin.

## UI/UX
- Resta lo stile attuale: dark #0B0B0F, card in vetro scuro #16161F, accenti neon viola, magenta e arancione, colonna centrale tipo smartphone, bottom-sheet.
- La Bacheca usa una griglia a riquadri grandi, ognuno con il gradiente del colore scelto nell'Admin.
- Il Pannello Admin è pensato per lo smartphone:
  - voci a schede, con riordino tramite trascinamento o frecce;
  - anteprima dal vivo dei banner e della Home;
  - conferma prima di ogni eliminazione.
- Tutta l'interfaccia è in italiano.

## Fasi di implementazione
**Fase 1: da costruire ora**
- Bacheca a sezioni configurabili, con le 6 sezioni predefinite e lo Spotted migrato al suo interno.
- Risposte private legate all'account; rimozione del codice segreto e del PIN.
- Permessi ospite/registrato come da tabella.
- Sondaggio del Giorno.
- Profilo con Messaggi ricevuti, I miei annunci, Salvati, impostazioni account.
- Pannello completo con ruoli Super Admin / Admin e tutte le aree A–H: moderazione e segnalazioni, contenuti, categorie dinamiche, costruttore sezioni Bacheca, zone e paesi, Home Builder e Barra Avviso, Banner & Sponsor con statistiche, testi e regole, utenti e ruoli, registro attività, backup ed esportazione.

**Fase 2: coinvolgimento**
- Mappa Radar con pin e alone a fiamma.
- Importatore "Copia-Incolla Magico" con l'intelligenza artificiale.
- Roulette "Risolvi-Serata".
- Pass Vantaggi / Bonus sbloccabili con il voto.

**Fase 3: crescita**
- Notifiche push per risposte e preferiti.
- Profili per i gestori dei locali.
- Pagamento online degli sponsor.
- Statistiche avanzate.
- Recupero password via email.

## Assunzioni
- L'account esistente `admin` / `admin123` diventa il **Super Admin**. Si consiglia di cambiare la password dal Profilo subito dopo.
- Gli Spotted già presenti passano nella sezione Spotted della Bacheca. Chi li aveva inviati come ospite col codice perde l'accesso alle risposte, che restano visibili agli Admin.
- Le categorie di Esplora già esistenti (Eventi, Locali, Luoghi, Corsi & Attività) diventano categorie modificabili, con gli stessi contenuti.
- Nascondere una categoria o una sezione la toglie dall'app senza cancellarne i contenuti. L'eliminazione è possibile solo se è vuota, oppure spostando prima i contenuti in un'altra.
- Se si rimuove un campo da una sezione, i dati già inseriti restano salvati ma non vengono più mostrati.
- Le sezioni predefinite partono con queste impostazioni: Spotted, Case e Lavoro con approvazione obbligatoria; Passaggi e Chi si unisce con pubblicazione immediata per gli utenti registrati.
- I contatti nelle risposte private (Instagram, WhatsApp, telefono) li vedono solo l'autore dell'annuncio e gli Admin.
- Un utente bloccato può ancora leggere, ma non può pubblicare né rispondere.
- Il ripristino da backup sostituisce i dati attuali. Gli account mantengono le password esistenti; gli utenti nuovi presenti nel file dovranno farsi reimpostare la password.
- Le statistiche dei banner contano visualizzazioni e click senza tracciare la persona.
- Per programmare titolo e avviso si usano l'ora italiana e i giorni della settimana.
- In questa fase non si usano servizi esterni a pagamento. Le foto restano sullo storage gestito già attivo.
