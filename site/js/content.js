/* ==========================================================================
   HAK AUTO — editable site content (FR default · NL · EN)
   Everything a non-developer may want to change lives in this file:
   business facts, copy, services, social links, the fly-through beat timeline and media.
   Translatable text is written as { fr: "…", nl: "…", en: "…" }.
   Interface labels (buttons, form fields…) are in js/i18n.js.
   Facts marked  // VERIFY  are placeholders that must be confirmed before launch.
   ========================================================================== */

window.HAK_CONTENT = {
  business: {
    name: "HAK AUTO",
    since: 2021,
    street: "Spoelewielenlaan 10",
    city: "8860 Lendelede",
    phoneDisplay: "0496 30 40 96",
    phoneIntl: "+32496304096",
    whatsapp: "32496304096",
    // VERIFY — no email address is published anywhere (site, listings, shop data).
    // Fill it in to enable the "send by email" option on the forms.
    email: "",
    mapsQuery: "HAK AUTO, Spoelewielenlaan 10, 8860 Lendelede",
    // VERIFY — opening hours were not published. Replace with the real hours.
    hours: [
      { days: { fr: "Lundi – Vendredi", nl: "Maandag – vrijdag", en: "Monday – Friday" }, time: { fr: "À confirmer", nl: "Te bevestigen", en: "To be confirmed" } },
      { days: { fr: "Samedi", nl: "Zaterdag", en: "Saturday" }, time: { fr: "À confirmer", nl: "Te bevestigen", en: "To be confirmed" } },
      { days: { fr: "Dimanche", nl: "Zondag", en: "Sunday" }, time: { fr: "Sur rendez-vous", nl: "Op afspraak", en: "By appointment" } }
    ]
  },

  /* ---- Social & marketplace. 2ememain is where almost all sales happen: it gets the most
     prominent placement (stock band, vehicle details, header, menu, contact, footer). ---- */
  social: {
    secondhand: { url: "https://www.2ememain.be/smb-profile/profile/50925632", label: "2ememain" },
    instagram: { url: "https://www.instagram.com/hakautoofficial/", handle: "@hakautoofficial" },
    tiktok: { url: "https://www.tiktok.com/@hakautoofficial", handle: "@hakautoofficial" }
  },

  nav: [
    { label: { fr: "Véhicules", nl: "Voertuigen", en: "Cars" }, href: "#vehicules" },
    { label: { fr: "Atelier", nl: "Werkplaats", en: "Workshop" }, href: "#atelier" },
    { label: { fr: "Reprise", nl: "Inkoop", en: "Sell your car" }, href: "#reprise" },
    { label: { fr: "Location", nl: "Verhuur", en: "Rental" }, href: "#location" },
    { label: { fr: "Contact", nl: "Contact", en: "Contact" }, href: "#contact" }
  ],

  /* ---- Fly-through chapters (copy shown over the footage) ---------------- */
  chapters: {
    arrive: {
      eyebrow: { fr: "Lendelede · depuis 2021", nl: "Lendelede · sinds 2021", en: "Lendelede · since 2021" },
      title: { fr: "Votre prochaine voiture vous attend chez HAK AUTO.", nl: "Uw volgende wagen wacht op u bij HAK AUTO.", en: "Your next car is waiting at HAK AUTO." },
      body: {
        fr: "Achat, vente, entretien et location — un seul garage, une seule équipe, plus de 3 500 véhicules vendus.",
        nl: "Aankoop, verkoop, onderhoud en verhuur — één garage, één team, meer dan 3.500 wagens verkocht.",
        en: "Buying, selling, servicing and rental — one garage, one team, over 3,500 cars sold."
      },
      mobileTitle: { fr: "Votre prochaine voiture vous attend.", nl: "Uw volgende wagen wacht op u.", en: "Your next car is waiting." },
      actions: [
        { label: { fr: "Voir nos véhicules", nl: "Bekijk ons aanbod", en: "View our cars" }, href: "#vehicules", primary: true },
        { label: { fr: "Prendre rendez-vous", nl: "Afspraak maken", en: "Book an appointment" }, href: "#atelier" }
      ],
      align: "left"
    },
    showroom: {
      eyebrow: { fr: "01 — Showroom", nl: "01 — Showroom", en: "01 — Showroom" },
      title: { fr: "Des occasions choisies une par une.", nl: "Tweedehandswagens, één voor één geselecteerd.", en: "Used cars, hand-picked one by one." },
      body: {
        fr: "Carnet d’entretien, double clés, historique clair : chaque véhicule est contrôlé avant d’entrer dans le showroom.",
        nl: "Onderhoudsboekje, dubbele sleutels, duidelijke historiek: elke wagen wordt gecontroleerd voor hij de showroom in gaat.",
        en: "Service book, two keys, a clear history: every car is checked before it enters the showroom."
      },
      mobileTitle: { fr: "Des occasions choisies une par une.", nl: "Wagens, één voor één geselecteerd.", en: "Used cars, hand-picked." },
      actions: [{ label: { fr: "Parcourir le stock", nl: "Bekijk het aanbod", en: "Browse the stock" }, href: "#vehicules" }],
      align: "right"
    },
    reception: {
      eyebrow: { fr: "02 — Réception", nl: "02 — Onthaal", en: "02 — Reception" },
      title: { fr: "Vendez votre véhicule au meilleur prix.", nl: "Verkoop uw wagen aan de beste prijs.", en: "Sell your car at the best price." },
      body: {
        fr: "Estimation gratuite et réponse rapide. Nous rachetons votre voiture en toute simplicité.",
        nl: "Gratis schatting en snel antwoord. Wij kopen uw wagen eenvoudig over.",
        en: "Free valuation and a quick answer. We buy your car, hassle-free."
      },
      mobileTitle: { fr: "Vendez votre véhicule, simplement.", nl: "Verkoop uw wagen, eenvoudig.", en: "Sell your car, simply." },
      actions: [{ label: { fr: "Estimation gratuite", nl: "Gratis schatting", en: "Free valuation" }, href: "#reprise" }],
      align: "left"
    },
    atelier: {
      eyebrow: { fr: "03 — Atelier", nl: "03 — Werkplaats", en: "03 — Workshop" },
      title: { fr: "Un atelier qui connaît votre voiture.", nl: "Een werkplaats die uw wagen kent.", en: "A workshop that knows your car." },
      body: {
        fr: "Pré-contrôle technique, diagnostic, entretien, airco, pneus et réparations — réalisés sur place par nos mécaniciens.",
        nl: "Voorkeuring, diagnose, onderhoud, airco, banden en herstellingen — ter plaatse uitgevoerd door onze mecaniciens.",
        en: "Pre-inspection, diagnostics, servicing, air-con, tyres and repairs — done on site by our mechanics."
      },
      mobileTitle: { fr: "L’atelier, juste derrière le showroom.", nl: "De werkplaats, vlak achter de showroom.", en: "The workshop, right behind the showroom." },
      actions: [{ label: { fr: "Prendre rendez-vous", nl: "Afspraak maken", en: "Book an appointment" }, href: "#atelier" }],
      align: "right"
    },
    reveal: {
      eyebrow: { fr: "Venez nous rendre visite", nl: "Kom langs", en: "Come and visit" },
      title: { fr: "Spoelewielenlaan 10, Lendelede.", nl: "Spoelewielenlaan 10, Lendelede.", en: "Spoelewielenlaan 10, Lendelede." },
      body: {
        fr: "Passez au showroom, essayez un véhicule ou déposez votre voiture à l’atelier.",
        nl: "Kom langs in de showroom, maak een proefrit of breng uw wagen naar de werkplaats.",
        en: "Visit the showroom, take a test drive or drop your car at the workshop."
      },
      mobileTitle: { fr: "Spoelewielenlaan 10, Lendelede.", nl: "Spoelewielenlaan 10, Lendelede.", en: "Spoelewielenlaan 10, Lendelede." },
      actions: [
        { label: { fr: "Itinéraire", nl: "Route", en: "Directions" }, href: "maps", primary: true },
        { label: "0496 30 40 96", href: "tel" }
      ],
      align: "left"  // building sits centre-right in the final aerial
    }
  },

  /* ---- Quotes shown on the transitions (brand voice, editable) -----------
     Attach one to a beat with  quote: "<id>". Consecutive beats with the same
     quote keep it on screen. More ideas: « Votre voiture entre de bonnes mains. »,
     « Vous roulez, on veille. », « Un garage, une équipe, zéro souci. »          */
  quotes: {
    forget: {
      text: { fr: "Déposez votre voiture. On s’occupe du reste.", nl: "Breng uw wagen binnen. Wij doen de rest.", en: "Drop off your car. We’ll take care of the rest." },
      by: { fr: "L’équipe HAK AUTO", nl: "Het HAK AUTO-team", en: "The HAK AUTO team" }
    },
    care: {
      text: { fr: "On prend soin de votre voiture comme si c’était la nôtre.", nl: "Wij zorgen voor uw wagen alsof het de onze is.", en: "We look after your car as if it were our own." },
      by: { fr: "L’atelier HAK AUTO", nl: "De HAK AUTO-werkplaats", en: "The HAK AUTO workshop" }
    }
  },

  /* ---- Fly-through beat timeline -----------------------------------------
     Each beat maps its own scroll distance (vh = viewport heights) to its own
     slice of the master video (from/to in seconds). from === to is a hold.
     `chapter` names the copy carried by the beat; consecutive beats with the
     same chapter keep it on screen. `focus` is the horizontal crop focus used
     on tall/narrow screens (0 = left, 0.5 = centre, 1 = right).
     `mvh` optionally overrides vh on phones.
     Times are measured on the stitched master (production/clips/flythrough-master.mp4,
     30.04 s = clip A 0-10.08 + clip B 10.08-20.08 + clip C 20.08-30.04).       */
  beats: [
    // focus = horizontal crop centre on tall screens at the START of the beat; it eases to the
    // next beat's value. Chosen from production/mobile/portrait-preview.jpg.
    { id: "hero-hold",  vh: 0.8, mvh: 0.45, from: 0.0,  to: 0.0,  chapter: "arrive",    focus: 0.38 },  // full HAK AUTO sign + open doors
    { id: "approach",   vh: 1.4, mvh: 1.0,  from: 0.0,  to: 3.0,  chapter: "arrive",    focus: 0.38 },  // forecourt -> through the glass doors
    { id: "showroom",   vh: 2.2, mvh: 1.6,  from: 3.0,  to: 8.4,  chapter: "showroom",  focus: 0.5 },   // glide down the showroom
    { id: "reception",  vh: 1.4, mvh: 1.0,  from: 8.4,  to: 12.0, chapter: "reception", focus: 0.38 },  // reception desk (left of centre)
    { id: "door",       vh: 1.2, mvh: 0.9,  from: 12.0, to: 14.3, chapter: null, quote: "forget", focus: 0.6 },   // mechanic opens the door (right)
    { id: "atelier",    vh: 2.0, mvh: 1.5,  from: 14.3, to: 18.8, chapter: "atelier",   focus: 0.5 },   // lift, technician, trolley, airco
    { id: "exit",       vh: 1.0, mvh: 0.8,  from: 18.8, to: 21.6, chapter: null, quote: "care",   focus: 0.45 },  // roller door -> rear yard, vans
    { id: "yaw-180",    vh: 0.9, mvh: 0.7,  from: 21.6, to: 23.2, chapter: null, quote: "care",   focus: 0.5 },   // fast 180 deg turn: own beat
    { id: "climb-a",    vh: 0.5, mvh: 0.4,  from: 23.2, to: 25.2, chapter: "reveal",    focus: 0.45 },  // backing away from the rear roller door
    { id: "climb-b",    vh: 0.45, mvh: 0.35, from: 25.2, to: 27.5, chapter: "reveal",   focus: 0.78 },  // glass corner + HAK AUTO sign (right)
    { id: "climb-c",    vh: 0.45, mvh: 0.35, from: 27.5, to: 30.0, chapter: "reveal",   focus: 0.66 },  // whole premises
    { id: "final-hold", vh: 1.0, mvh: 0.55, from: 30.0, to: 30.0, chapter: "reveal",    focus: 0.6 }
  ],

  media: {
    manifest: "media/flight/manifest.json",
    poster: "media/flight/poster.webp",
    // Representative stills for reduced-motion / constrained devices (exported by frames.py;
    // main.js prefers the list in the manifest, these are the fallback).
    stills: {
      arrive: "media/flight/still-arrive.webp",
      showroom: "media/flight/still-showroom.webp",
      reception: "media/flight/still-reception.webp",
      atelier: "media/flight/still-atelier.webp",
      reveal: "media/flight/still-reveal.webp"
    }
  },

  stats: [
    { value: "2021", label: { fr: "Au service de la région depuis", nl: "In dienst van de regio sinds", en: "Serving the region since" } },
    { value: { fr: "3 500+", nl: "3.500+", en: "3,500+" }, label: { fr: "Véhicules vendus", nl: "Verkochte wagens", en: "Cars sold" } },
    { value: "4", label: { fr: "Métiers : achat, vente, atelier, location", nl: "Diensten: aankoop, verkoop, werkplaats, verhuur", en: "Services: buying, selling, workshop, rental" } },
    { value: "95", label: { fr: "Véhicules en ligne aujourd’hui", nl: "Wagens online vandaag", en: "Cars online today" }, dynamic: "stockCount" }
  ],

  /* ---- Workshop services — prices as published by HAK AUTO --------------
     VERIFY: the three `points` per service are generic descriptions (not from HAK AUTO). */
  services: [
    {
      id: "entretien",
      title: { fr: "Entretien véhicule", nl: "Onderhoud", en: "Car servicing" },
      price: { fr: "239 € – 329 €", nl: "€ 239 – € 329", en: "€239 – €329" },
      note: {
        fr: "Service essentiel selon véhicule et litres d’huile CASTROL.",
        nl: "Basisonderhoud, afhankelijk van de wagen en het aantal liter CASTROL-olie.",
        en: "Essential service, depending on the car and litres of CASTROL oil."
      },
      points: {
        fr: ["Vidange & filtres", "Contrôle des niveaux", "Remise à zéro de l’entretien"],
        nl: ["Olieverversing & filters", "Controle van de niveaus", "Onderhoudsindicator resetten"],
        en: ["Oil & filter change", "Fluid level checks", "Service indicator reset"]
      }
    },
    {
      id: "precontrole",
      title: { fr: "Pré-contrôle technique", nl: "Voorkeuring", en: "Pre-inspection check" },
      price: { fr: "Sur devis", nl: "Op offerte", en: "On quote" },
      note: {
        fr: "On vérifie tout avant le passage au contrôle technique.",
        nl: "Wij controleren alles vóór uw wagen naar de keuring gaat.",
        en: "We check everything before your car goes for its roadworthiness test."
      },
      points: {
        fr: ["Freins, éclairage, pneus", "Émissions", "Conseil avant passage"],
        nl: ["Remmen, verlichting, banden", "Uitstoot", "Advies vóór de keuring"],
        en: ["Brakes, lights, tyres", "Emissions", "Advice before the test"]
      }
    },
    {
      id: "diagnostic",
      title: { fr: "Diagnostic", nl: "Diagnose", en: "Diagnostics" },
      price: { fr: "Sur devis", nl: "Op offerte", en: "On quote" },
      note: { fr: "Lecture électronique et recherche de panne.", nl: "Elektronische uitlezing en foutopsporing.", en: "Electronic read-out and fault finding." },
      points: {
        fr: ["Valise de diagnostic", "Témoins moteur", "Devis clair avant réparation"],
        nl: ["Diagnosetoestel", "Motorwaarschuwingslampjes", "Duidelijke offerte vóór herstelling"],
        en: ["Diagnostic tool", "Engine warning lights", "Clear quote before any repair"]
      }
    },
    {
      id: "airco",
      title: { fr: "Gaz airco", nl: "Airco bijvullen", en: "Air-con regas" },
      price: { fr: "99 € – 169 €", nl: "€ 99 – € 169", en: "€99 – €169" },
      note: { fr: "Recharge de climatisation selon le véhicule.", nl: "Bijvullen van de airco, afhankelijk van de wagen.", en: "Air-conditioning recharge, depending on the car." },
      points: {
        fr: ["Contrôle d’étanchéité", "Recharge du gaz", "Test de performance"],
        nl: ["Lektest", "Gas bijvullen", "Prestatietest"],
        en: ["Leak check", "Gas recharge", "Performance test"]
      }
    },
    {
      id: "pneus",
      title: { fr: "Pneus", nl: "Banden", en: "Tyres" },
      price: { fr: "dès 70 €", nl: "vanaf € 70", en: "from €70" },
      note: {
        fr: "Pneus neufs dès 70 €, montage dès 20 € par pneu.",
        nl: "Nieuwe banden vanaf € 70, montage vanaf € 20 per band.",
        en: "New tyres from €70, fitting from €20 per tyre."
      },
      points: {
        fr: ["Été, hiver, 4 saisons", "Montage & équilibrage", "Conseil de dimension"],
        nl: ["Zomer, winter, all-season", "Montage & balanceren", "Advies over de maat"],
        en: ["Summer, winter, all-season", "Fitting & balancing", "Size advice"]
      }
    },
    {
      id: "polissage",
      title: { fr: "Polissage automobile", nl: "Polijsten", en: "Car polishing" },
      price: { fr: "dès 279 €", nl: "vanaf € 279", en: "from €279" },
      note: { fr: "Redonnez de l’éclat à la carrosserie.", nl: "Geef uw koetswerk zijn glans terug.", en: "Bring the shine back to your paintwork." },
      points: {
        fr: ["Correction légère", "Brillance & protection", "Finition soignée"],
        nl: ["Lichte correctie", "Glans & bescherming", "Verzorgde afwerking"],
        en: ["Light correction", "Gloss & protection", "Careful finish"]
      }
    }
  ],

  rental: {
    title: "Peugeot Boxer L3H2",
    kind: { fr: "Utilitaire grand volume", nl: "Grote bestelwagen", en: "Large van" },
    price: { fr: "dès 90 €", nl: "vanaf € 90", en: "from €90" },
    // VERIFY — rental period (per day?) and conditions were not stated by HAK AUTO.
    priceNote: { fr: "Tarif et conditions sur demande", nl: "Prijs en voorwaarden op aanvraag", en: "Rates and terms on request" },
    image: "https://cdn.shopify.com/s/files/1/0982/5946/8672/files/photo_2026-04-09_12-10-42_26eea285-4f9f-47b3-bc2e-92b2ef3b1983.jpg"
  }
};
