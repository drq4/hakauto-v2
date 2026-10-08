"""Refresh site/js/stock.js from the live HAK AUTO Shopify catalogue.

    python tools/refresh-stock.py

Each vehicle keeps its photos (hosted on the Shopify CDN), the specs parsed from the title and
listing ("Année 10/2021, 5.000km"), plus the listing's highlights (✅ lines), equipment list and
short description, so the site can show a full detail view without linking out.
"""
import html, json, re, urllib.request
from pathlib import Path

SKIP = {"peugeot-boxer-l3h2", "polissage-automobile", "pneus", "gaz-airco", "appointment"}  # services / rental
req = urllib.request.Request("https://hakauto.be/products.json?limit=250", headers={"User-Agent": "Mozilla/5.0"})
products = json.load(urllib.request.urlopen(req))["products"]

NOISE = re.compile(r"tiktok|instagram|facebook|site-web|hakauto\.be|t[ée]l[ée]phone|\b0032|\b0496", re.I)
CALL_TO_ACTION = re.compile(r"plus d.informations|contactez|appelez", re.I)


def parse_body(body_html, title):
    """Split a listing into highlights (✅ lines), equipment (comma list) and a short description."""
    t = html.unescape(re.sub(r"<br\s*/?>", "\n", body_html or "", flags=re.I))
    t = re.sub(r"</p>|</li>|</div>", "\n", t)
    t = re.sub(r"<[^>]+>", "", t)
    lines = [l.strip() for l in t.split("\n") if l.strip()]
    highlights, equipment, desc = [], [], []
    for l in lines:
        if l == title.strip() or re.match(r"ann[ée]e\s*\d", l, re.I) or NOISE.search(l):
            continue
        if "✅" in l:
            highlights.append(l.replace("✅", "").strip())
        elif l.count(",") >= 4 and not equipment:
            equipment = [x.strip(" .") for x in l.split(",") if x.strip(" .")]
        elif len(l) > 40:
            sentences = [x for x in re.split(r"(?<=[.!?])\s+", l) if not CALL_TO_ACTION.search(x)]
            if sentences:
                desc.append(" ".join(sentences))
    return highlights[:6], equipment[:40], " ".join(desc)[:600]


def fuel_of(t):
    t = t.lower()
    if re.search(r"hybride|hybrid|électrique|\d{3}e\b|225xe|\d{3}h\b", t): return "Hybride"
    if "cng" in t: return "Essence/CNG"
    if re.search(r"essence|benzine|\d\.\di\b|tfsi|tsi|tce|dce|t-gdi", t): return "Essence"
    if re.search(r"diesel|tdi|hdi|dci|cdti|cdi|crdi|tdci|bluetec|\d\.\dd\b|\b\d{3}d\b|c180d|d4\b|sd\b", t): return "Diesel"
    return None


out = []
for p in products:
    if p["handle"] in SKIP: continue
    t = p["title"].replace("Mercedes-benz", "Mercedes-Benz").strip()
    body = html.unescape(re.sub(r"<[^>]+>", " ", p["body_html"] or ""))
    m = re.search(r"Ann[ée]e\s*(\d{1,2})/(\d{4})\s*,?\s*([\d.\s]+)\s*km", body, re.I)
    year = int(m.group(2)) if m else (int(y.group(1)) if (y := re.search(r"\b(20[012]\d)\b", t)) else None)
    km = int(re.sub(r"\D", "", m.group(3))) if m else None
    make = t.split()[0]
    make = {"vw": "Volkswagen", "mini": "MINI", "range": "Land Rover"}.get(make.lower(), make)
    highlights, equipment, description = parse_body(p["body_html"], p["title"])
    out.append(dict(
        id=p["handle"], title=t, make=make, price=float(p["variants"][0]["price"]), year=year, km=km, fuel=fuel_of(t),
        auto=bool(re.search(r"automati|automaat", t.lower())),
        utility=bool(re.search(r"utilitaire|van\b|traffic|master|movano|transit|proace|boxer|combo|partner", t.lower())),
        sold="vendu" in [x.lower() for x in p["tags"]],
        images=[i["src"].split("?")[0] for i in p["images"][:8]],
        highlights=highlights, equipment=equipment, description=description,
    ))

js = ("// Snapshot of the live HAK AUTO catalogue (Shopify products.json). Descriptions are in French (source).\n"
      "// Refresh with: python tools/refresh-stock.py\nwindow.HAK_STOCK = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
Path(__file__).resolve().parents[1].joinpath("site/js/stock.js").write_text(js, encoding="utf-8")
print(f"{len(out)} vehicles written ({sum(o['sold'] for o in out)} sold)")
