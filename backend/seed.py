from datetime import date, timedelta

IMG = {
    "centro": "https://images.pexels.com/photos/33099812/pexels-photo-33099812.jpeg?auto=compress&cs=tinysrgb&w=940",
    "montereale": "https://images.unsplash.com/photo-1635193728400-98be5b62b3cf?crop=entropy&cs=srgb&fm=jpg&q=80&w=1080",
    "unibas": "https://images.pexels.com/photos/7972324/pexels-photo-7972324.jpeg?auto=compress&cs=tinysrgb&w=940",
    "gallitello": "https://images.pexels.com/photos/5100306/pexels-photo-5100306.jpeg?auto=compress&cs=tinysrgb&w=940",
    "basento": "https://images.pexels.com/photos/35071414/pexels-photo-35071414.jpeg?auto=compress&cs=tinysrgb&w=940",
    "dj": "https://images.unsplash.com/photo-1502872364588-894d7d6ddfab?crop=entropy&cs=srgb&fm=jpg&q=80&w=1080",
    "rock": "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?crop=entropy&cs=srgb&fm=jpg&q=80&w=1080",
    "sagra": "https://images.pexels.com/photos/29901176/pexels-photo-29901176.jpeg?auto=compress&cs=tinysrgb&w=940",
    "teatro": "https://images.pexels.com/photos/8994700/pexels-photo-8994700.jpeg?auto=compress&cs=tinysrgb&w=940",
    "chitarra": "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?crop=entropy&cs=srgb&fm=jpg&q=80&w=1080",
    "padel": "https://images.unsplash.com/photo-1658723826297-fe4d1b1e6600?crop=entropy&cs=srgb&fm=jpg&q=80&w=1080",
    "trekking": "https://images.unsplash.com/photo-1508184782546-39f96de554aa?crop=entropy&cs=srgb&fm=jpg&q=80&w=1080",
    "pub": "https://images.pexels.com/photos/6174047/pexels-photo-6174047.jpeg?auto=compress&cs=tinysrgb&w=940",
    "lounge": "https://images.unsplash.com/photo-1597075687490-8f673c6c17f6?crop=entropy&cs=srgb&fm=jpg&q=80&w=1080",
    "pizzeria": "https://images.unsplash.com/photo-1709548145082-04d0cde481d4?crop=entropy&cs=srgb&fm=jpg&q=80&w=1080",
    "vinile": "https://images.unsplash.com/photo-1730818203797-897b2838105a?crop=entropy&cs=srgb&fm=jpg&q=80&w=1080",
    "arcade": "https://images.pexels.com/photos/31923252/pexels-photo-31923252.jpeg?auto=compress&cs=tinysrgb&w=940",
}


def build_seed(today: date):
    wd = today.weekday()
    fri = today - timedelta(days=wd - 4) if wd >= 4 else today + timedelta(days=4 - wd)
    sat = fri + timedelta(days=1)
    if sat < today:
        sat = today
    d = lambda x: x.isoformat()

    def item(kind, title, **kw):
        base = dict(kind=kind, title=title, category="", town="Potenza", zone="", description="", image_url="",
                    instagram="", info_link="", address="", opening_hours="", start_date="", start_time="",
                    end_time="", price="", status="approved", featured=False, boost=0, created_by="seed")
        base.update(kw)
        return base

    items = [
        item("place", "Centro Storico – Via Pretoria & Piazza Prefettura", category="Passeggio / Centro",
             zone="Centro Storico", address="Via Pretoria, Piazza Mario Pagano", image_url=IMG["centro"], boost=32,
             description="Il cuore della movida potentina: lo struscio su Via Pretoria, i tavolini in Piazza Prefettura e i vicoli pieni di pub e bar fino a tarda notte."),
        item("place", "Parco Montereale", category="Parco", zone="Montereale", address="Viale Dante",
             image_url=IMG["montereale"], boost=4,
             description="Il parco storico della città con la villa, i viali alberati e il belvedere. Perfetto per una passeggiata al tramonto o una chiacchierata sulle panchine."),
        item("place", "Campus UNIBAS Macchia Romana", category="Università", zone="Macchia Romana",
             address="Viale dell'Ateneo Lucano", image_url=IMG["unibas"], boost=12,
             description="Il campus dell'Università della Basilicata: biblioteca, piazzale e bar sempre pieni di studenti. Il giovedì e venerdì sera il piazzale diventa punto di ritrovo."),
        item("place", "Zona Commerciale Gallitello", category="Centro commerciale", zone="Gallitello",
             address="Via del Gallitello", image_url=IMG["gallitello"], boost=9,
             description="Centri commerciali, fast food, cinema multisala e sale giochi: il ritrovo di chi cerca shopping, un panino al volo o un film del weekend."),
        item("place", "Parco Fluviale del Basento", category="Parco", zone="Basento", address="Contrada Bucaletto",
             image_url=IMG["basento"],
             description="Percorsi pedonali e ciclabili lungo il fiume Basento, aree verdi e spazi per lo sport all'aperto. Ideale per correre o fare un picnic."),
        item("venue", "Birreria Il Portale", category="Pub", zone="Centro Storico", address="Via Pretoria",
             opening_hours="Mar–Dom 18:00 – 02:00", price="Birre artigianali da 5€", instagram="https://instagram.com/",
             image_url=IMG["pub"], boost=7,
             description="Pub nel centro storico con birre artigianali lucane, taglieri e musica live nel fine settimana."),
        item("venue", "Lounge Bar Prefettura", category="Cocktail Bar", zone="Centro Storico", address="Piazza Mario Pagano",
             opening_hours="Tutti i giorni 17:00 – 01:00", price="Cocktail da 7€", instagram="https://instagram.com/",
             image_url=IMG["lounge"], boost=3,
             description="Aperitivi e cocktail d'autore affacciati sulla piazza principale. Il punto di partenza della serata."),
        item("venue", "Pizzeria Forno a Legna Santa Maria", category="Pizzeria", zone="Rione Santa Maria",
             address="Rione Santa Maria", opening_hours="Mer–Lun 19:00 – 23:30", price="Pizze da 6€",
             image_url=IMG["pizzeria"],
             description="Pizza napoletana cotta nel forno a legna, impasti a lunga lievitazione e prodotti lucani."),
        item("event", "Venerdì Universitario a Macchia Romana – DJ Set", category="DJ Set / Discoteca",
             zone="Macchia Romana", address="Piazzale UNIBAS", start_date=d(fri), start_time="23:00", end_time="04:00",
             price="8€ con drink · gratis studenti entro le 00:30", image_url=IMG["dj"], featured=True, boost=14,
             instagram="https://instagram.com/",
             description="La serata universitaria più attesa della settimana: DJ set house & reggaeton, luci e tutta Macchia Romana in pista."),
        item("event", "Concerto Live Rock al Centro Storico", category="Concerto", zone="Centro Storico",
             address="Birreria Il Portale, Via Pretoria", start_date=d(today), start_time="21:30", end_time="01:00",
             price="Ingresso libero", image_url=IMG["rock"], featured=True, boost=27,
             description="Band lucane dal vivo con cover rock anni '90 e 2000. Birra artigianale, panini e tanta energia nel cuore di Potenza."),
        item("event", "Sagra della Castagna e Prodotti Tipici", category="Sagra", town="Rionero in Vulture",
             zone="Centro paese", start_date=d(sat), start_time="17:00", end_time="23:59",
             price="Ingresso libero · degustazioni da 5€", image_url=IMG["sagra"], featured=True, boost=6,
             description="Caldarroste, vino Aglianico del Vulture, salumi e formaggi tipici, musica popolare e stand artigianali tra le vie del paese."),
        item("event", "Spettacolo al Teatro Stabile di Potenza", category="Teatro", zone="Centro Storico",
             address="Piazza Mario Pagano", start_date=d(today), start_time="20:45", end_time="23:00",
             price="Biglietti da 15€", image_url=IMG["teatro"], boost=6,
             description="Commedia in due atti nella splendida sala ottocentesca del Teatro Stabile. Prenotazione consigliata."),
        item("activity", "Corso di Chitarra & Produzione Musicale", category="Musica", zone="Rione Lucania",
             opening_hours="Martedì e Giovedì 18:00 – 20:00", price="60€ / mese", image_url=IMG["chitarra"],
             description="Lezioni di chitarra per tutti i livelli e laboratorio di produzione musicale con DAW, in piccoli gruppi."),
        item("activity", "Torneo Padel Amatoriale Gallitello", category="Sport", zone="Gallitello",
             opening_hours="Ogni sabato dalle 15:00", price="20€ a coppia", image_url=IMG["padel"], boost=5,
             description="Torneo a coppie per principianti e intermedi, con classifica mensile e terzo tempo finale."),
        item("activity", "Gruppo Trekking domenicale Sellata–Pierfaone", category="Escursioni", town="Abriola",
             zone="Sellata", opening_hours="Domenica ore 8:30 · ritrovo Piazzale Sellata", price="Gratuito",
             image_url=IMG["trekking"],
             description="Escursione di gruppo sui sentieri tra la Sellata e il Monte Pierfaone, con guida esperta. Adatta a tutti."),
        item("event", "Aperitivo Vinile in Terrazza", category="Aperitivo / DJ Set", zone="Rione Santa Maria",
             start_date=d(today + timedelta(days=1)), start_time="19:00", end_time="23:00", price="10€ con drink",
             image_url=IMG["vinile"], status="pending", created_by="d:seed-guest",
             description="Selezione di vinili soul e funk al tramonto, aperitivo lucano e vista sulla città."),
        item("venue", "Arcade Room Gallitello – Sala Giochi", category="Sala giochi", zone="Gallitello",
             opening_hours="Tutti i giorni 15:00 – 00:00", image_url=IMG["arcade"], status="pending",
             created_by="d:seed-guest",
             description="Videogiochi arcade, flipper, air hockey e postazioni console."),
    ]

    def spotted(where, when, who, message, tag, reactions, status="approved"):
        return dict(where=where, when=when, who=who, message=message, tag=tag, status=status,
                    reactions=reactions, owner_user=None, owner_code=None)

    spotteds = [
        spotted("McDonald's Gallitello", "Venerdì ore 19:00", "Ragazza bionda con cappotto nero alla cassa",
                "Ci siamo scambiati un sorriso mentre aspettavi l'ordine, avevi una sciarpa bordeaux. Non ho avuto il coraggio di parlarti… se ti riconosci, rispondi!",
                "mcdonalds", {"heart": 24, "eyes": 11, "fire": 6}),
        spotted("Biblioteca UNIBAS – Macchia Romana", "Martedì pomeriggio", "Ragazzo con felpa blu e cuffie bianche",
                "Mi hai prestato l'evidenziatore giallo e sei sparito prima che potessi ridartelo. Ce l'ho ancora io, ti devo almeno un caffè ☕",
                "unibas", {"heart": 18, "eyes": 9, "fire": 3}),
        spotted("Via Pretoria, davanti al Teatro Stabile", "Sabato sera verso le 23", "Ragazza riccia con giacca di jeans",
                "Eri con le tue amiche e ridevi tantissimo, io ero quello col cappello che ti ha chiesto l'ora. Rifacciamo due passi in centro?",
                "centro", {"heart": 31, "eyes": 14, "fire": 12}),
        spotted("Autobus linea 4 – Stazione Potenza Centrale", "Lunedì mattina ore 7:50", "Ragazzo con zaino rosso e un libro in mano",
                "Leggevi 'Il nome della rosa' e sei sceso alla stazione. Anch'io lo sto leggendo: ci scambiamo opinioni?",
                "trasporti", {"heart": 12, "eyes": 7, "fire": 2}),
        spotted("Birreria Il Portale – Centro Storico", "Giovedì sera", "Ragazza con frangia e maglia dei Nirvana",
                "Hai cantato tutte le canzoni del concerto a memoria. Rock solidarity: rispondimi!",
                "locali", {"heart": 0, "eyes": 0, "fire": 0}, status="pending"),
    ]
    return items, spotteds
