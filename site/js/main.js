/* HAK AUTO — page behaviour (languages, navigation, header state, stock + vehicle details,
   forms via WhatsApp or email, social links, fly-through or static fallback) */
(function () {
  "use strict";
  const C = window.HAK_CONTENT;
  const B = C.business;
  const I = window.HAK_I18N;
  const t = I.t, L = I.L;
  const STOCK = (window.HAK_STOCK || []).filter((v) => v.price > 0);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const euro = (n) => new Intl.NumberFormat(I.locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const num = (n) => new Intl.NumberFormat(I.locale).format(n);

  const links = {
    tel: "tel:" + B.phoneIntl,
    wa: "https://wa.me/" + B.whatsapp,
    maps: "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(B.mapsQuery),
    mail: B.email ? "mailto:" + B.email : ""
  };
  const resolveHref = (h) => links[h] || h;
  const waLink = (text) => links.wa + "?text=" + encodeURIComponent(text);
  const mailLink = (subject, body) => "mailto:" + B.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

  /* ---------- branded intro: whole sequence (incl. 0.8 s curtain) ends ≤ 3.0 s after navigation ---------- */
  (function runIntro() {
    const intro = document.getElementById("intro");
    if (!intro) return;
    const body = document.body;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Deep links (#vehicules…) and ?nointro go straight to the page.
    if (location.hash || /[?&]nointro\b/.test(location.search)) { intro.remove(); return; }
    body.classList.add("intro-active");
    // QA: ?introat=<ms> freezes the intro animation at that moment (no exit).
    const freezeAt = new URLSearchParams(location.search).get("introat");
    if (freezeAt !== null) {
      requestAnimationFrame(() => intro.getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = +freezeAt; }));
      intro.querySelector(".intro__bar span").style.setProperty("--p", Math.min(1, +freezeAt / 2400).toFixed(2));
      return;
    }
    // Absolute times since navigation start (performance.now()): curtain lifts between MIN and MAX.
    const MIN = reduce ? 500 : 2000, MAX = reduce ? 1200 : 2200;
    const bar = intro.querySelector(".intro__bar span");
    const ready = { fonts: false, poster: false, live: false };
    const setProgress = () => {
      const n = Object.values(ready).filter(Boolean).length;
      bar.style.setProperty("--p", (0.12 + 0.88 * n / 3).toFixed(2));
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { ready.fonts = true; setProgress(); });
    const poster = document.querySelector(".flight__poster");
    (poster && poster.decode ? poster.decode() : Promise.resolve()).catch(() => {}).then(() => { ready.poster = true; setProgress(); });
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      bar.style.setProperty("--p", "1");
      intro.classList.add("is-leaving");
      body.classList.remove("intro-active");
      body.classList.add("intro-done");
      setTimeout(() => intro.remove(), reduce ? 350 : 820);
    };
    const timer = setInterval(() => {
      // "live" = first frame drawn on the canvas, or the still-image fallback is showing.
      const flight = document.getElementById("flight");
      if (!ready.live && (flight.classList.contains("is-live") || flight.hidden)) { ready.live = true; setProgress(); }
      const elapsed = performance.now();
      if ((elapsed >= MIN && Object.values(ready).every(Boolean)) || elapsed >= MAX) { clearInterval(timer); finish(); }
    }, 80);
  })();

  /* ---------- language-independent bindings ---------- */
  const textMap = { phone: B.phoneDisplay, street: B.street, city: B.city, name: B.name, email: B.email };
  $$("[data-text]").forEach((el) => { el.textContent = textMap[el.dataset.text] || ""; });
  $$("[data-href]").forEach((el) => { const h = resolveHref(el.dataset.href); if (h) el.href = h; });
  $$("[data-social]").forEach((el) => { const s = C.social[el.dataset.social]; if (s) el.href = s.url; });
  $("#year").textContent = new Date().getFullYear();
  if (B.email) $$(".contact__mail").forEach((el) => { el.hidden = false; });
  $$(".channel").forEach((el) => el.classList.toggle("channel--nomail", !B.email));
  if (!B.email) $$('.channel input[value="email"]').forEach((i) => { i.disabled = true; });

  // Localised copy for the fly-through engine / static fallback.
  const locChapters = () => Object.fromEntries(Object.entries(C.chapters).map(([id, c]) => [id, {
    eyebrow: L(c.eyebrow), title: L(c.title), body: L(c.body), mobileTitle: L(c.mobileTitle), align: c.align,
    actions: (c.actions || []).map((a) => ({ label: L(a.label), href: a.href, primary: a.primary }))
  }]));
  // Quote marks follow the language's typography: « … » in French, “ … ” in Dutch and English.
  const QUOTE_MARKS = { fr: ["« ", " »"], nl: ["“", "”"], en: ["“", "”"] };
  const locQuotes = () => Object.fromEntries(Object.entries(C.quotes || {}).map(([id, q]) => {
    const [open, close] = QUOTE_MARKS[I.lang] || QUOTE_MARKS.fr;
    return [id, { text: L(q.text), by: L(q.by), open, close }];
  }));

  /* ---------- social links (2ememain first: it carries most of the sales) ---------- */
  const socialRow = () =>
    '<a class="social-link social-link--2m" href="' + esc(C.social.secondhand.url) + '" target="_blank" rel="noopener">' +
      '<svg aria-hidden="true"><use href="#i-tag"/></svg><span><b>' + esc(t("social.2m")) + "</b><small>" + esc(t("social.2mSub")) + "</small></span></a>" +
    '<a class="social-link" href="' + esc(C.social.instagram.url) + '" target="_blank" rel="noopener">' +
      '<svg aria-hidden="true"><use href="#i-instagram"/></svg><span><b>' + esc(t("social.instagram")) + "</b><small>" + esc(C.social.instagram.handle) + "</small></span></a>" +
    '<a class="social-link" href="' + esc(C.social.tiktok.url) + '" target="_blank" rel="noopener">' +
      '<svg aria-hidden="true"><use href="#i-tiktok"/></svg><span><b>' + esc(t("social.tiktok")) + "</b><small>" + esc(C.social.tiktok.handle) + "</small></span></a>";

  /* ---------- language switcher ---------- */
  const renderLangSwitch = () => {
    $$(".lang-switch").forEach((el) => {
      el.innerHTML = I.LANGS.map((l) =>
        '<button type="button" lang="' + l + '" data-lang="' + l + '" aria-pressed="' + (l === I.lang) + '">' + l.toUpperCase() + "</button>").join("");
    });
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".lang-switch [data-lang]");
    if (b && b.dataset.lang !== I.lang) setLanguage(b.dataset.lang);
  });

  /* ---------- static strings ---------- */
  const applyStaticStrings = () => {
    document.documentElement.lang = I.lang;
    document.title = t("meta.title");
    const md = $('meta[name="description"]'); if (md) md.content = t("meta.desc");
    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(";").forEach((pair) => { const [attr, key] = pair.split(":"); el.setAttribute(attr, t(key)); });
    });
    // The menu button's label depends on state.
    const tg = $(".menu-toggle"); if (tg) tg.setAttribute("aria-label", t(tg.getAttribute("aria-expanded") === "true" ? "a11y.menuClose" : "a11y.menuOpen"));
  };

  /* ---------- navigation, stats, services, hours, rental ---------- */
  const renderNav = () => {
    const html = C.nav.map((n) => '<li><a href="' + n.href + '">' + esc(L(n.label)) + "</a></li>").join("");
    $("#nav-list").innerHTML = html;
    $("#footer-nav").innerHTML = html;
    $("#mobile-nav-list").innerHTML = C.nav.map((n) => '<li><a href="' + n.href + '" data-close>' + esc(L(n.label)) + "</a></li>").join("");
  };
  const renderStats = () => {
    $("#stats").innerHTML = C.stats.map((s) => {
      const v = s.dynamic === "stockCount" ? String(STOCK.filter((x) => !x.sold).length) : L(s.value);
      return '<div class="stat"><span class="stat__value">' + esc(v) + '</span><span class="stat__label">' + esc(L(s.label)) + "</span></div>";
    }).join("");
  };
  const renderServices = () => {
    $("#service-grid").innerHTML = C.services.map((s, i) =>
      '<li class="service"><span class="service__index">' + String(i + 1).padStart(2, "0") + "</span>" +
      '<h3 class="service__title">' + esc(L(s.title)) + '</h3><p class="service__price">' + esc(L(s.price)) + "</p>" +
      '<p class="service__note">' + esc(L(s.note)) + '</p><ul class="service__points">' +
      L(s.points).map((p) => "<li>" + esc(p) + "</li>").join("") +
      '</ul><a class="service__cta" href="#rendez-vous" data-service="' + esc(s.id) + '">' + esc(t("service.book")) + ' <span aria-hidden="true">→</span></a></li>'
    ).join("");
    const sel = $("#b-service"), keep = sel.value;
    sel.innerHTML = C.services.map((s) => '<option value="' + esc(s.id) + '">' + esc(L(s.title)) + "</option>").join("") +
      '<option value="other">' + esc(t("service.other")) + "</option>";
    if (keep) sel.value = keep;
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest(".service__cta");
    if (a) $("#b-service").value = a.dataset.service;
  });
  const renderHours = () => {
    $("#hours").innerHTML = B.hours.map((h) => "<div><dt>" + esc(L(h.days)) + "</dt><dd>" + esc(L(h.time)) + "</dd></div>").join("");
  };
  const R = C.rental;
  $("#rental-img").src = R.image + "?width=1200";
  $("#rental-img").alt = R.title;
  const renderRental = () => {
    $("#rental-kind").textContent = L(R.kind);
    $("#rental-title").textContent = R.title;
    $("#rental-price").textContent = L(R.price);
    $("#rental-note").textContent = L(R.priceNote);
    $("#rental-wa").href = waLink(t("rental.waMsg", { title: R.title }));
  };
  const renderSocial = () => { $$(".social-row").forEach((el) => { el.innerHTML = socialRow(); }); };

  /* ---------- stock ---------- */
  const grid = $("#stock-grid"), form = $("#stock-filters"), countEl = $("#stock-count"), moreBtn = $("#stock-more");
  const priceInput = $("#f-price"), priceOut = $("#f-price-out");
  const maxPrice = Math.ceil(Math.max(...STOCK.map((v) => v.price)) / 1000) * 1000;
  priceInput.max = maxPrice; priceInput.value = maxPrice;
  const makes = [...new Set(STOCK.map((v) => v.make))].sort((a, b) => a.localeCompare(b, "fr"));
  $("#f-make").insertAdjacentHTML("beforeend", makes.map((m) => '<option value="' + esc(m) + '">' + esc(m) + "</option>").join(""));
  const PAGE = 9;
  let shown = PAGE;

  const splitTitle = (v) => {
    const rest = v.title.slice(v.title.indexOf(" ") + 1);
    const m = rest.match(/^(.*?)(\s\d[\d.,]*\s?[a-zA-Z].*)$/);
    return m ? [v.make + " " + m[1].trim(), m[2].trim()] : [v.make + " " + rest, ""];
  };
  const carMeta = (v) => [v.year, v.km != null ? num(v.km) + " km" : null, v.fuel ? t("fuel." + v.fuel) : null, t(v.auto ? "car.auto" : "car.manual")].filter(Boolean);
  // Card = article with one stretched button (accessible "whole card is clickable" pattern).
  const card = (v) => {
    const [name, spec] = splitTitle(v);
    const img = v.images[0] ? v.images[0] + "?width=720" : "";
    return '<li class="car' + (v.sold ? " car--sold" : "") + '"><article class="car__card">' +
      '<div class="car__media">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async" width="720" height="540">' : "") +
      (v.sold ? '<span class="car__badge">' + esc(t("car.sold")) + "</span>" : "") + "</div>" +
      '<div class="car__body"><h3 class="car__name"><button class="car__open" type="button" data-car="' + esc(v.id) + '">' + esc(name) + "</button></h3>" +
      '<p class="car__spec">' + esc(spec) + "</p>" +
      '<ul class="car__meta">' + carMeta(v).map((m) => "<li>" + esc(m) + "</li>").join("") + "</ul>" +
      '<div class="car__foot"><span class="car__price">' + euro(v.price) + '</span><span class="car__link" aria-hidden="true">' + esc(t("car.view")) + " →</span></div></div></article></li>";
  };
  const renderStock = () => {
    const f = new FormData(form);
    const make = f.get("make"), kind = f.get("kind"), max = +f.get("price"), sort = f.get("sort");
    priceOut.textContent = max >= maxPrice ? t("stock.noLimit") : "≤ " + euro(max);
    let list = STOCK.filter((v) => (!make || v.make === make) && v.price <= max &&
      (!kind || (kind === "auto" ? v.auto : kind === "utility" ? v.utility : v.fuel === kind)));
    const sorters = {
      recent: null,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      "km-asc": (a, b) => (a.km ?? 1e9) - (b.km ?? 1e9),
      "year-desc": (a, b) => (b.year ?? 0) - (a.year ?? 0)
    };
    // Available cars first, sold ones last.
    list = list.slice().sort((a, b) => (a.sold - b.sold) || (sorters[sort] ? sorters[sort](a, b) : 0));
    const sold = list.filter((v) => v.sold).length, avail = list.length - sold;
    countEl.textContent = t(sold ? "stock.count" : "stock.countNoSold", { a: avail, b: sold, s: avail > 1 ? "s" : "", t: sold > 1 ? "s" : "" });
    grid.innerHTML = list.slice(0, shown).map(card).join("") ||
      '<li class="stock-empty">' + t("stock.empty", { tel: links.tel }) + "</li>";
    moreBtn.hidden = list.length <= shown;
  };
  form.addEventListener("input", () => { shown = PAGE; renderStock(); });
  form.addEventListener("submit", (e) => e.preventDefault());
  moreBtn.addEventListener("click", () => { shown += PAGE; renderStock(); });

  /* ---------- vehicle detail dialog ---------- */
  const dlg = $("#car-dialog");
  let current = null, photo = 0, opener = null;
  const showPhoto = (i) => {
    const imgs = current.images;
    photo = (i + imgs.length) % imgs.length;
    const img = $(".car-dialog__img", dlg);
    img.src = imgs[photo] + "?width=1400";
    img.alt = splitTitle(current)[0] + " — " + t("car.photo", { n: photo + 1, total: imgs.length });
    $(".car-dialog__count", dlg).textContent = t("car.photo", { n: photo + 1, total: imgs.length });
    $$(".car-dialog__thumbs button", dlg).forEach((b, k) => b.setAttribute("aria-current", k === photo ? "true" : "false"));
    const multi = imgs.length > 1;
    $$(".car-dialog__nav", dlg).forEach((b) => { b.hidden = !multi; });
  };
  const renderCar = () => {
    const v = current, [name, spec] = splitTitle(v);
    $(".car-dialog__title", dlg).textContent = name;
    $(".car-dialog__spec", dlg).textContent = spec;
    $(".car-dialog__price", dlg).innerHTML = euro(v.price) + (v.sold ? ' <span class="car__badge car__badge--inline">' + esc(t("car.sold")) + "</span>" : "");
    const facts = [["car.year", v.year], ["car.km", v.km != null ? num(v.km) + " km" : null], ["car.fuel", v.fuel ? t("fuel." + v.fuel) : null], ["car.gearbox", t(v.auto ? "car.auto" : "car.manual")]];
    $(".car-dialog__facts", dlg).innerHTML = facts.filter((f) => f[1]).map((f) => "<div><dt>" + esc(t(f[0])) + "</dt><dd>" + esc(f[1]) + "</dd></div>").join("");
    const priceTxt = euro(v.price);
    const actions = [
      '<a class="btn btn--primary" target="_blank" rel="noopener" href="' + esc(waLink(t("car.waMsg", { title: v.title, price: priceTxt }))) + '"><svg class="btn__icon" aria-hidden="true"><use href="#i-whatsapp"/></svg>' + esc(t("car.wa")) + "</a>",
      '<a class="btn btn--ghost-dark" href="' + links.tel + '"><svg class="btn__icon" aria-hidden="true"><use href="#i-phone"/></svg>' + esc(t("car.call")) + "</a>"
    ];
    if (B.email) actions.push('<a class="btn btn--ghost-dark" href="' + esc(mailLink(t("car.mailSubject", { title: v.title }), t("car.waMsg", { title: v.title, price: priceTxt }))) + '"><svg class="btn__icon" aria-hidden="true"><use href="#i-mail"/></svg>' + esc(t("car.mail")) + "</a>");
    $(".car-dialog__actions", dlg).innerHTML = actions.join("") +
      '<a class="link-2m" href="' + esc(C.social.secondhand.url) + '" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-tag"/></svg><span>' + esc(t("car.on2m")) + '</span><svg aria-hidden="true"><use href="#i-ext"/></svg></a>';
    let more = "";
    if (v.highlights && v.highlights.length) more += "<h3>" + esc(t("car.highlights")) + '</h3><ul class="car-dialog__highlights">' + v.highlights.map((h) => "<li>" + esc(h) + "</li>").join("") + "</ul>";
    if (v.description) more += '<p class="car-dialog__desc">' + esc(v.description) + "</p>";
    if (v.equipment && v.equipment.length) more += "<h3>" + esc(t("car.equipment")) + '</h3><ul class="car-dialog__equipment">' + v.equipment.map((h) => "<li>" + esc(h) + "</li>").join("") + "</ul>";
    if (more && I.lang !== "fr" && t("car.sourceNote")) more += '<p class="car-dialog__note" lang="' + I.lang + '">' + esc(t("car.sourceNote")) + "</p>";
    const moreEl = $(".car-dialog__more", dlg);
    moreEl.innerHTML = more;
    moreEl.lang = "fr";   // listing text comes from the French catalogue
    $(".car-dialog__thumbs", dlg).innerHTML = v.images.length > 1 ? v.images.map((src, k) =>
      '<button type="button" aria-label="' + esc(t("car.photo", { n: k + 1, total: v.images.length })) + '"><img src="' + esc(src) + '?width=160" alt="" loading="lazy"></button>').join("") : "";
    showPhoto(photo);
  };
  const openCar = (id, from) => {
    current = STOCK.find((v) => v.id === id);
    if (!current) return;
    opener = from || null;
    photo = 0;
    renderCar();
    dlg.showModal();
    $(".car-dialog__inner", dlg).scrollTop = 0;
  };
  grid.addEventListener("click", (e) => {
    const b = e.target.closest(".car__open") || (e.target.closest(".car__card") && e.target.closest(".car__card").querySelector(".car__open"));
    if (b) openCar(b.dataset.car, b);
  });
  $(".car-dialog__close", dlg).addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });   // backdrop
  dlg.addEventListener("close", () => { if (opener && document.contains(opener)) opener.focus(); });
  $(".car-dialog__nav--prev", dlg).addEventListener("click", () => showPhoto(photo - 1));
  $(".car-dialog__nav--next", dlg).addEventListener("click", () => showPhoto(photo + 1));
  $(".car-dialog__thumbs", dlg).addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) showPhoto([...b.parentNode.children].indexOf(b));
  });
  dlg.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select")) return;
    if (e.key === "ArrowLeft") showPhoto(photo - 1);
    if (e.key === "ArrowRight") showPhoto(photo + 1);
  });

  /* ---------- forms -> WhatsApp or email (real destinations; never fake a "sent") ---------- */
  const optText = (f, name) => { const el = f.elements[name]; return el && el.options ? el.options[el.selectedIndex].text : (el ? el.value : ""); };
  const builders = {
    booking: (f, d) => ({
      subject: t("msg.bookSubject"),
      body: t("msg.bookIntro") + "\n" +
        t("msg.service") + " : " + optText(f, "service") + "\n" + t("msg.car") + " : " + (d.car || "-") + "\n" +
        t("msg.date") + " : " + (d.date || "-") + " (" + optText(f, "slot") + ")\n" +
        t("msg.name") + " : " + d.name + "\n" + t("msg.phone") + " : " + d.phone + (d.message ? "\n" + t("msg.message") + " : " + d.message : "")
    }),
    estimate: (f, d) => ({
      subject: t("msg.estimateSubject"),
      body: t("msg.estimateIntro") + "\n" +
        d.make + " " + d.model + " — " + (d.year || "?") + ", " + (d.km || "?") + " km, " + optText(f, "fuel") + ", " + t("msg.state") + " : " + optText(f, "state") + "\n" +
        t("msg.name") + " : " + d.name + "\n" + t("msg.phone") + " : " + d.phone
    })
  };
  const channelOf = (f) => (f.elements.channel && f.elements.channel.value) || "whatsapp";
  const refreshForm = (f) => {
    const kind = f.dataset.kind, ch = channelOf(f);
    f.querySelector('button[type="submit"]').textContent =
      t(kind === "booking" ? (ch === "email" ? "form.sendMail" : "form.sendWa") : (ch === "email" ? "form.estimateMail" : "form.estimateWa"));
    const note = f.querySelector(".form__note");
    if (!note.dataset.state) note.textContent = kind === "estimate" ? t(ch === "email" ? "form.photosMail" : "form.photosWa") : "";
  };
  $$("form[data-kind]").forEach((f) => {
    const note = f.querySelector(".form__note");
    f.addEventListener("change", (e) => { if (e.target.name === "channel") { delete note.dataset.state; refreshForm(f); } });
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const req = $$("[required]", f);
      const missing = req.filter((el) => !el.value.trim());
      req.forEach((el) => el.toggleAttribute("aria-invalid", !el.value.trim()));
      if (missing.length) { note.dataset.state = "error"; note.textContent = t("form.required"); missing[0].focus(); return; }
      const d = Object.fromEntries(new FormData(f));
      const msg = builders[f.dataset.kind](f, d);
      if (channelOf(f) === "email" && B.email) {
        window.location.href = mailLink(msg.subject, msg.body);
        note.dataset.state = "sent"; note.textContent = t("form.openedMail");
      } else {
        window.open(waLink(msg.body), "_blank", "noopener");
        note.dataset.state = "sent"; note.textContent = t("form.openedWa");
      }
    });
  });

  /* ---------- map: click-to-load (no third-party cookies before consent) ---------- */
  $("#load-map").addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.title = t("map.title", { address: B.street + ", " + B.city });
    f.src = "https://www.google.com/maps?q=" + encodeURIComponent(B.mapsQuery) + "&z=15&output=embed";
    f.referrerPolicy = "no-referrer-when-downgrade";
    $("#contact-map").appendChild(f);
    f.focus();
  });

  /* ---------- header: glass over the flight, solid after it ---------- */
  const header = $(".site-header"), flightEl = $("#flight");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const updateHeader = () => {
    const ref = flightEl.hidden ? $("#flight-static") : flightEl;
    const bottom = ref.getBoundingClientRect().bottom;
    const solid = bottom <= header.offsetHeight || document.body.classList.contains("menu-open");
    header.dataset.state = solid ? "solid" : "glass";
  };
  window.addEventListener("scroll", updateHeader, { passive: true });
  window.addEventListener("resize", updateHeader);
  window.addEventListener("orientationchange", updateHeader);
  window.addEventListener("load", updateHeader);

  /* ---------- mobile menu ---------- */
  const menu = $("#mobile-menu"), toggle = $(".menu-toggle"), closeBtn = $(".mobile-menu__close");
  const focusables = () => $$("a[href], button:not([disabled])", menu);
  const openMenu = () => {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add("is-open"));
    document.body.classList.add("menu-open");
    document.documentElement.classList.add("menu-open");   // iOS needs the lock on <html> too
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", t("a11y.menuClose"));
    updateHeader();
    closeBtn.focus();
  };
  const closeMenu = (restore = true) => {
    menu.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    document.documentElement.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", t("a11y.menuOpen"));
    setTimeout(() => { menu.hidden = true; }, reduceMotion.matches ? 0 : 250);
    updateHeader();
    if (restore) toggle.focus();   // always back to the menu button (Safari doesn't focus buttons on tap)
  };
  toggle.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", () => closeMenu());
  menu.addEventListener("click", (e) => {
    if (e.target === menu) closeMenu();
    if (e.target.closest("[data-close]")) closeMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (menu.hidden) return;
    if (e.key === "Escape") closeMenu();
    if (e.key === "Tab") {
      const f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- fly-through or static fallback ---------- */
  const conn = navigator.connection || {};
  const constrained = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "") || (navigator.deviceMemory && navigator.deviceMemory < 2);
  let engine = null, staticMode = false;

  // Prefer per-chapter stills exported with the footage (manifest), else content.js stills.
  let stillsCache = null;
  const chapterStills = async () => {
    if (stillsCache) return stillsCache;
    try {
      const m = await (await fetch(C.media.manifest, { cache: "no-cache" })).json();
      if (m.stills) {
        const base = C.media.manifest.slice(0, C.media.manifest.lastIndexOf("/") + 1);
        return (stillsCache = Object.fromEntries(Object.entries(m.stills).map(([k, v]) => [k, base + v])));
      }
    } catch (e) { /* fall through */ }
    return (stillsCache = C.media.stills);
  };

  const renderStatic = async () => {
    staticMode = true;
    const wrap = $("#flight-static");
    const stills = await chapterStills();
    const chapters = locChapters(), quotes = locQuotes();
    // Chapters and quotes in beat order (each once).
    const seq = [];
    C.beats.forEach((b) => {
      if (b.chapter && !seq.some((x) => x.type === "c" && x.id === b.chapter)) seq.push({ type: "c", id: b.chapter });
      if (b.quote && quotes[b.quote] && !seq.some((x) => x.type === "q" && x.id === b.quote)) seq.push({ type: "q", id: b.quote });
    });
    let n = 0;
    wrap.innerHTML = seq.map((item) => {
      if (item.type === "q") {
        const q = quotes[item.id];
        return '<figure class="static-quote container"><blockquote class="flight-quote__text">' + q.open + esc(q.text) + q.close + "</blockquote>" +
          (q.by ? '<figcaption class="flight-quote__by">' + esc(q.by) + "</figcaption>" : "") + "</figure>";
      }
      const id = item.id, c = chapters[id];
      const Tag = n++ === 0 ? "h1" : "h2";
      return '<article class="static-chapter" style="--img:url(\'' + (stills[id] || C.media.poster) + '\')">' +
        '<div class="static-chapter__inner container"><p class="chapter__eyebrow">' + esc(c.eyebrow) + "</p><" + Tag + ' class="chapter__title">' + esc(c.title) + "</" + Tag + ">" +
        '<p class="chapter__body">' + esc(c.body) + '</p><div class="chapter__actions">' +
        (c.actions || []).map((a) => {
          const h = resolveHref(a.href);
          return '<a class="btn ' + (a.primary ? "btn--primary" : "btn--glass") + '" href="' + h + '"' + (/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : "") + ">" + esc(a.label) + "</a>";
        }).join("") + "</div></div></article>";
    }).join("");
    wrap.hidden = false;
    flightEl.hidden = true;
    updateHeader();
  };

  /* ---------- render everything for the current language ---------- */
  const renderAll = () => {
    applyStaticStrings();
    renderLangSwitch();
    renderNav();
    renderStats();
    renderServices();
    renderHours();
    renderRental();
    renderSocial();
    renderStock();
    $$("form[data-kind]").forEach(refreshForm);
    if (engine) engine.setCopy(locChapters(), locQuotes());
    if (staticMode) renderStatic();
    if (dlg.open && current) renderCar();
  };
  const setLanguage = (lang) => {
    I.setLang(lang);
    const url = new URL(location.href);
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
    renderAll();
  };
  renderAll();

  // ?static forces the reduced-motion presentation (QA).
  if (reduceMotion.matches || constrained || /[?&]static\b/.test(location.search)) {
    renderStatic();
  } else {
    // ?3d renders the route live in WebGL (free alternative to generated footage).
    const want3d = /[?&]3d\b/.test(location.search);
    const start = async () => {
      let realtime = null;
      if (want3d) {
        const gl = document.createElement("canvas");
        gl.className = "flight__canvas flight__gl";
        gl.setAttribute("aria-hidden", "true");
        $(".flight__canvas").replaceWith(gl);
        const { createFlightScene } = await import("./flight3d.js?v=" + (window.HAK_ASSET_V || "1"));
        const scene = await createFlightScene(gl, { logoUrl: "assets/brand/hakauto-logo-white.png" });
        realtime = { render: scene.render, resize: scene.resize, label: "Prototype 3D temps réel — sans crédits" };
      }
      engine = new window.HAKFlight.FlightEngine({ section: flightEl, beats: C.beats, chapters: locChapters(), quotes: locQuotes(), resolveHref, realtime });
      // ?mockup plays the animatic built from real photos instead of the production sequence.
      const manifest = /[?&]mockup\b/.test(location.search) ? "media/mockup/manifest.json" : C.media.manifest;
      await engine.init(manifest);
      // ?shot=<beat-id> jumps to the middle of a beat (storyboard captures / QA).
      const shot = new URLSearchParams(location.search).get("shot");
      const seg = shot && engine.timeline.find((b) => b.id === shot);
      if (seg) window.scrollTo({ top: flightEl.offsetTop + (seg.start + seg.end) / 2, behavior: "instant" });
    };
    start()
      .catch((err) => { console.warn("Fly-through unavailable, using stills:", err); engine = null; renderStatic(); });
  }
  updateHeader();
})();
