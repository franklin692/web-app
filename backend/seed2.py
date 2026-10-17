from datetime import date, timedelta

ZONES = ["Centro Storico", "Via Pretoria", "Rione Santa Maria", "Macchia Romana", "Gallitello", "Montereale", "Poggio Tre Galli",
         "Rione Lucania", "Bucaletto", "Malvaccaro", "Basento", "Rione Mancusi", "Cocuzzo", "Serpentone"]
TOWNS = [("Potenza", "Potenza"), ("Abriola", "Potenza e dintorni"), ("Avigliano", "Potenza e dintorni"), ("Pignola", "Potenza e dintorni"),
         ("Tito", "Potenza e dintorni"), ("Picerno", "Potenza e dintorni"), ("Melfi", "Vulture"), ("Rionero in Vulture", "Vulture"),
         ("Venosa", "Vulture"), ("Viggiano", "Val d'Agri"), ("Marsico Nuovo", "Val d'Agri"), ("Lagonegro", "Lagonegrese"),
         ("Lauria", "Lagonegrese"), ("Maratea", "Lagonegrese"), ("Muro Lucano", "Marmo Platano"), ("Brienza", "Melandro"),
         ("Sasso di Castalda", "Melandro"), ("Castelmezzano", "Dolomiti Lucane"), ("Pietrapertosa", "Dolomiti Lucane")]

BLOCKS = [("alert", "Avviso"), ("live", "Potenza Live"), ("poll", "Sondaggio del Giorno"), ("banner", "Banner sponsor"), ("featured", "In Evidenza stasera"),
          ("trending", "Classifica Live"), ("vivi", "Vivi Potenza"), ("board", "Dalla Bacheca"), ("boardtop", "📌 Dalla Bacheca (I più cliccati)"), ("list", "Tutto a Potenza")]

DEFAULT_CONFIG = {
    "_id": "app", "app_name": "Cosa Fare a Potenza", "logo_url": "",
    "texts": {"submit_success": "Grazie! Il tuo contributo è stato inviato agli Admin e sarà pubblico appena approvato.",
              "submit_published": "Pubblicato! Il tuo annuncio è già visibile a tutti.",
              "going_label": "Ci sarò 👋", "here_label": "Ci sono ORA 📍",
              "radar_text": "Presto vedrai su una mappa scura di Potenza e provincia dove si accende la serata, con le fiamme sui posti più frequentati."},
    "trend": {"threshold": 20, "going_hours": 12, "here_hours": 4,
              "labels": {"1": "In movimento ⚡", "2": "Di tendenza stasera 🔥", "3": "Molto frequentato 🔥🔥", "4": "Pieno / Evento Top 🚀"}},
    "home": {"title": "Cosa fare a", "subtitle": "Potenza", "schedules": [{"day": "5", "date": "", "title": "Dove si balla", "subtitle": "stasera 🔥"}],
             "alert": {"text": "", "level": "info", "link": "", "start": "", "end": "", "active": False},
             "blocks": [{"id": b, "label": l, "enabled": True} for b, l in BLOCKS],
             "time_labels": {"tonight": "Stasera", "weekend": "Questo Weekend", "all": "Tutti"}},
    "contacts": {"email": "", "whatsapp": "", "instagram": ""},
    "zones": [{"name": z, "hidden": False} for z in ZONES],
    "towns": [{"name": t, "area": a, "hidden": False} for t, a in TOWNS],
}

DEFAULT_CATEGORIES = [
    dict(slug="event", name="Evento", plural="Eventi", icon="CalendarDays", color="#EC4899", dated=True, hidden=False, order=0,
         subcategories=["DJ Set / Discoteca", "Concerto", "Teatro", "Cinema", "Mostra", "Sagra", "Aperitivo / DJ Set", "Sport", "Altro"]),
    dict(slug="venue", name="Locale", plural="Locali", icon="Martini", color="#8B5CF6", dated=False, hidden=False, order=1,
         subcategories=["Pub", "Bar", "Cocktail Bar", "Ristorante", "Pizzeria", "Discoteca", "Sala giochi", "Altro"]),
    dict(slug="place", name="Luogo", plural="Luoghi", icon="MapPin", color="#0EA5E9", dated=False, hidden=False, order=2,
         subcategories=["Passeggio / Centro", "Parco", "Piazza", "Università", "Centro commerciale", "Belvedere", "Altro"]),
    dict(slug="activity", name="Corso & Attività", plural="Corsi & Attività", icon="Sparkles", color="#10B981", dated=False, hidden=False, order=3,
         subcategories=["Musica", "Teatro", "Sport", "Escursioni", "Associazione culturale", "Museo", "Volontariato", "Altro"]),
]


def F(key, label, type="text", required=False, options=None):
    return {"key": key, "label": label, "type": type, "required": required, "options": options or []}


def S(slug, name, icon, color, description, order, fields, tags, reply, approval, days, **kw):
    base = dict(slug=slug, name=name, icon=icon, color=color, description=description, order=order, hidden=False, fields=fields,
                tags=tags, reply_label=reply, requires_approval=approval, duration_days=days, reactions=True,
                partner_name="", partner_logo="", expiry_field="")
    base.update(kw)
    return base


DEFAULT_SECTIONS = [
    S("spotted", "Spotted", "HeartHandshake", "#EC4899", "Hai incrociato qualcuno? Ritrovalo qui 💘", 0,
      [F("message", "Messaggio", "textarea", True)],
      ["UNIBAS", "McDonald's", "Centro Storico", "Autobus/Treno", "Locali"], "Sono io / La conosco", True, 14),
    S("case", "Case & Coinquilini", "House", "#8B5CF6", "Stanze per studenti, affitti e coinquilini", 1,
      [F("title", "Titolo", required=True), F("type", "Tipo", "select", options=["Stanza singola", "Stanza doppia", "Appartamento", "Posto letto"]),
       F("zone", "Zona", "place"), F("price", "Prezzo al mese", "price"), F("available_from", "Disponibile da", "date"),
       F("photo", "Foto", "photo"), F("description", "Descrizione", "textarea")],
      ["Stanza", "Appartamento", "Cerco coinquilino", "Affitto breve"], "Contatta", True, 45,
      partner_name="Supreme House Immobiliare"),
    S("lavoro", "Lavoro & Staff", "Briefcase", "#F97316", "Camerieri, barman, PR, ripetizioni", 2,
      [F("role", "Ruolo", required=True), F("company", "Locale / Azienda"), F("zone", "Zona", "place"), F("pay", "Compenso", "price"),
       F("when", "Quando"), F("description", "Dettagli", "textarea")],
      ["Camerieri", "Barman", "PR & Promoter", "Ripetizioni", "Altro"], "Mi candido", True, 30),
    S("passaggi", "Passaggi", "Car", "#0EA5E9", "Offri o cerca un passaggio in provincia", 3,
      [F("from", "Da", "place", True), F("to", "A", "place", True), F("date", "Data", "date", True), F("time", "Ora", "time"),
       F("seats", "Posti", "number"), F("contribution", "Contributo", "price"), F("notes", "Note", "textarea")],
      ["Offro passaggio", "Cerco passaggio"], "Ci sto!", False, 30, expiry_field="date"),
    S("unisciti", "Chi si unisce?", "Users", "#10B981", "Trova compagnia per sport, tavoli e uscite", 4,
      [F("activity", "Attività", required=True), F("where", "Dove"), F("when", "Quando"), F("people", "Persone cercate", "number"),
       F("description", "Dettagli", "textarea")],
      ["Sport & Hobby", "Tavoli & Uscite"], "Ci sto!", False, 14),
    S("mercatino", "Annunci UNIBAS / Mercatino", "BookOpen", "#EAB308", "Libri, appunti, oggetti e gruppi studio", 5,
      [F("title", "Titolo", required=True), F("price", "Prezzo", "price"), F("condition", "Condizioni", "select", options=["Nuovo", "Come nuovo", "Usato"]),
       F("photo", "Foto", "photo"), F("description", "Descrizione", "textarea")],
      ["Libri", "Appunti", "Oggetti", "Gruppi studio"], "Contatta", True, 60),
]

SPOT_TAG_MAP = {"unibas": "UNIBAS", "mcdonalds": "McDonald's", "centro": "Centro Storico", "trasporti": "Autobus/Treno", "locali": "Locali"}


def seed_posts(today: date):
    sat = (today + timedelta(days=(5 - today.weekday()) % 7)).isoformat()
    room = "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?crop=entropy&cs=srgb&fm=jpg&q=80&w=1080"
    books = "https://images.unsplash.com/photo-1512820790803-83ca734da794?crop=entropy&cs=srgb&fm=jpg&q=80&w=1080"
    return [
        ("case", "Stanza", {"title": "Stanza singola vicino UNIBAS", "type": "Stanza singola", "zone": "Macchia Romana", "price": "250€",
                             "available_from": today.isoformat(), "photo": room,
                             "description": "Stanza luminosa in appartamento con altri 2 studenti, a 5 minuti a piedi dal campus. Spese incluse."}),
        ("case", "Cerco coinquilino", {"title": "Cerco coinquilina in centro", "type": "Posto letto", "zone": "Centro Storico", "price": "200€",
                                        "description": "Appartamento in Via Pretoria, cerchiamo una ragazza tranquilla da novembre."}),
        ("lavoro", "Camerieri", {"role": "Cameriere/a weekend", "company": "Birreria Il Portale", "zone": "Centro Storico", "pay": "60€ a serata",
                                  "when": "Venerdì e sabato sera", "description": "Cerchiamo ragazzi/e solari, anche prima esperienza."}),
        ("lavoro", "Ripetizioni", {"role": "Ripetizioni di Matematica", "company": "Privato", "zone": "Rione Lucania", "pay": "15€/ora",
                                    "when": "Pomeriggi", "description": "Studente di Ingegneria UNIBAS offre ripetizioni per licei."}),
        ("passaggi", "Offro passaggio", {"from": "Melfi", "to": "Potenza", "date": sat, "time": "21:00", "seats": "3", "contribution": "5€",
                                          "notes": "Salgo per il Venerdì Universitario, ritorno verso le 3."}),
        ("unisciti", "Sport & Hobby", {"activity": "Calcetto 5vs5", "where": "Campetti Gallitello", "when": "Giovedì ore 21", "people": "2",
                                        "description": "Ci mancano due giocatori, livello amatoriale!"}),
        ("unisciti", "Tavoli & Uscite", {"activity": "Tavolo per il concerto rock", "where": "Centro Storico", "when": "Stasera", "people": "3",
                                          "description": "Siamo in 3, cerchiamo altri per dividere il tavolo."}),
        ("mercatino", "Libri", {"title": "Libri Economia Aziendale I anno", "price": "35€", "condition": "Come nuovo", "photo": books,
                                 "description": "Pacchetto completo dei testi del primo anno, sottolineati a matita."}),
    ]


def seed_poll(today: date):
    return {"question": "Venerdì sera: dove si va?", "options": [{"text": "Centro Storico", "votes": 18}, {"text": "Macchia Romana", "votes": 23},
                                                                 {"text": "Gallitello", "votes": 6}],
            "image_url": "", "comment": "Potenza ha deciso: si va a Macchia Romana! 🔥", "start_date": today.isoformat(), "status": "open"}


def T(slug, name, icon, color, description, order, subcategories):
    return dict(slug=slug, name=name, icon=icon, color=color, description=description, order=order, hidden=False,
                image_url="", subcategories=subcategories)


DEFAULT_THEMES = [
    T("movida", "Movida e serate", "PartyPopper", "#EC4899", "DJ set, discoteche, aperitivi e notti in città", 0,
      ["DJ Set / Discoteca", "Aperitivo / DJ Set", "Discoteca", "Cocktail Bar", "Festa privata"]),
    T("musica-spettacoli", "Concerti, musica e spettacoli", "Music", "#8B5CF6", "Live, teatro, cinema e spettacoli dal vivo", 1,
      ["Concerto", "Teatro", "Cinema"]),
    T("corsi", "Corsi, workshop e formazione", "GraduationCap", "#0EA5E9", "Impara qualcosa di nuovo: musica, lingue, laboratori", 2,
      ["Musica", "Workshop", "Corso"]),
    T("cultura", "Cultura, musei e mostre", "Landmark", "#EAB308", "Mostre, musei, storia e patrimonio lucano", 3,
      ["Mostra", "Museo", "Associazione culturale"]),
    T("sport", "Sport e benessere", "Dumbbell", "#10B981", "Tornei, palestre, padel, yoga e attività fisica", 4, ["Sport"]),
    T("natura", "Natura, escursioni e outdoor", "Mountain", "#22C55E", "Sentieri, parchi, belvederi e aria aperta", 5,
      ["Escursioni", "Parco", "Belvedere"]),
    T("sagre", "Sagre, feste e tradizioni", "Flame", "#F97316", "Sapori tipici, feste di paese e tradizioni", 6, ["Sagra"]),
    T("locali", "Locali, ristoranti e ritrovi", "Utensils", "#F43F5E", "Pub, pizzerie, bar e i posti dove ci si incontra", 7,
      ["Pub", "Bar", "Ristorante", "Pizzeria", "Passeggio / Centro", "Piazza", "Università"]),
    T("shopping", "Shopping, mercatini e fiere", "ShoppingBag", "#A855F7", "Centri commerciali, mercatini ed eventi commerciali", 8,
      ["Centro commerciale", "Mercatino", "Sala giochi"]),
    T("arte", "Arte, creatività e hobby", "Palette", "#06B6D4", "Laboratori creativi, fotografia, hobby e passioni", 9,
      ["Arte", "Laboratorio creativo"]),
    T("famiglie", "Famiglie e bambini", "Baby", "#FB7185", "Idee e attività da vivere con i più piccoli", 10, ["Bambini", "Famiglie"]),
    T("community", "Community e volontariato", "HeartHandshake", "#14B8A6", "Associazioni, volontariato e gruppi della città", 11,
      ["Volontariato", "Associazione culturale"]),
]
