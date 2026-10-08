"""Render a storyboard sheet: animatic frame + real site overlay for key beats.
    node -e "<export content.js>"  (see PRODUCTION.md)  then  python production/animatic/storyboard.py
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / "production/animatic"
C = json.load(open(A / "content.json", encoding="utf-8"))
FR = ROOT / "site/media/mockup/frames"
FPS = 8
W, H = 1440, 810
NFRAMES = len(list(FR.glob("*.webp")))


def font(name, size, wght=None):
    f = ImageFont.truetype(str(A / "fonts" / name), size)
    if wght:
        axes = f.get_variation_axes()
        f.set_variation_by_axes([wght] if len(axes) == 1 else [min(size, 40), wght])
    return f


JOST = lambda s, w=500: font("Jost.ttf", s, w)
SANS = lambda s, w=400: font("DMSans.ttf", s, w)
MONO = lambda s: font("DMMono.ttf", s)
WHITE, ACCENT, NIGHT = (255, 255, 255), (61, 134, 255), (11, 13, 16)

logo = Image.open(ROOT / "site/assets/brand/hakauto-logo-white.png").convert("RGBA")
logo = logo.resize((int(logo.width * 34 / logo.height), 34), Image.LANCZOS)


def frame_at(t):
    i = min(int(round(t * FPS)), NFRAMES - 1)
    return Image.open(FR / f"frame-{i:04d}.webp").convert("RGB").resize((W, H), Image.LANCZOS)


def gradient(size, stops, horizontal):
    g = Image.new("L", (256, 1) if horizontal else (1, 256))
    for k in range(256):
        u, v = k / 255, 0
        for (a, va), (b, vb) in zip(stops, stops[1:]):
            if a <= u <= b:
                v = va + (vb - va) * (u - a) / (b - a)
        g.putpixel((k, 0) if horizontal else (0, k), int(v * 255))
    return g.resize(size, Image.BILINEAR)


def shade(img, align):
    over = Image.new("RGB", img.size, NIGHT)
    stops = {
        "left": [(0, .72), (.42, .25), (.6, 0), (1, .25)],
        "right": [(0, .25), (.4, 0), (.58, .25), (1, .72)],
        "center": [(0, .12), (.5, .05), (1, .2)],
    }[align]
    img = Image.composite(over, img, gradient(img.size, stops, True))
    return Image.composite(over, img, gradient(img.size, [(0, .45), (.25, 0), (.6, 0), (1, .78)], False))


def wrap(d, text, f, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= maxw:
            cur = t
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


def button(d, x, y, label, primary):
    """Pill button; glass variant is composited on a separate layer so alpha blends."""
    f = SANS(17, 600)
    w, h = d.textlength(label, font=f) + 48, 52
    img = d._image
    if primary:
        d.rounded_rectangle([x, y, x + w, y + h], h // 2, fill=ACCENT)
    else:
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.rounded_rectangle([x, y, x + w, y + h], h // 2, fill=(255, 255, 255, 34), outline=(255, 255, 255, 120), width=1)
        img.alpha_composite(layer)
    d.text((x + 24, y + h / 2), label, font=f, fill=WHITE, anchor="lm")
    return w


def render(beat, chapter, step, progress):
    b = next(x for x in C["beats"] if x["id"] == beat)
    ch = C["chapters"].get(chapter) if chapter else None
    base = shade(frame_at((b["from"] + b["to"]) / 2), ch["align"] if ch else "center").convert("RGBA")
    img = Image.new("RGBA", base.size, (0, 0, 0, 0))  # overlay layer, composited once at the end
    d = ImageDraw.Draw(img)

    # Header (glass state)
    img.alpha_composite(logo, (64, 22))
    nf = SANS(16, 500)
    bw = d.textlength("Rendez-vous", font=SANS(17, 600)) + 48
    bx = W - 64 - bw
    button(d, bx, 14, "Rendez-vous", True)
    px = bx - 28 - d.textlength(C["business"]["phoneDisplay"], font=MONO(15))
    d.text((px, 40), C["business"]["phoneDisplay"], font=MONO(15), fill=WHITE, anchor="lm")
    d.ellipse([px - 18, 36, px - 10, 44], fill=(61, 220, 132))
    nx = px - 52
    for n in reversed(C["nav"]):
        nx -= d.textlength(n["label"], font=nf)
        d.text((nx, 40), n["label"], font=nf, fill=(255, 255, 255, 225), anchor="lm")
        nx -= 30

    # Chapter copy
    if ch:
        hero = chapter == "arrive"
        tf = JOST(76 if hero else 62, 500)
        lines = wrap(d, ch["title"], tf, 720 if hero else 640)
        bf = SANS(19)
        body = wrap(d, ch["body"], bf, 520)
        lh = tf.size * 1.04
        block = 34 + len(lines) * lh + 30 + len(body) * 30 + 30 + 52
        y = H - 110 - block
        align = ch["align"]
        x = {"left": 64, "right": W - 64, "center": W / 2}[align]
        anc = {"left": "la", "right": "ra", "center": "ma"}[align]

        ef = SANS(14, 500)
        eb = ch["eyebrow"].upper()
        ew = sum(d.textlength(c, font=ef) + 3 for c in eb)
        ex0 = {"left": x + 40, "right": x - ew, "center": x - ew / 2 + 20}[align]
        d.line([ex0 - 40, y + 9, ex0 - 12, y + 9], fill=(105, 163, 255), width=1)
        cx = ex0
        for c in eb:
            d.text((cx, y), c, font=ef, fill=(207, 213, 221))
            cx += d.textlength(c, font=ef) + 3
        y += 34
        for ln in lines:
            d.text((x, y), ln, font=tf, fill=WHITE, anchor=anc)
            y += lh
        y += 30
        for ln in body:
            d.text((x, y), ln, font=bf, fill=(255, 255, 255, 215), anchor=anc)
            y += 30
        y += 30
        acts = ch["actions"]
        labels = [C["business"]["phoneDisplay"] if a["href"] == "tel" else a["label"] for a in acts]
        widths = [d.textlength(l, font=SANS(17, 600)) + 48 for l in labels]
        total = sum(widths) + 12 * (len(acts) - 1)
        bx = {"left": x, "right": x - total, "center": x - total / 2}[align]
        for a, l, w in zip(acts, labels, widths):
            button(d, bx, y, l, a.get("primary"))
            bx += w + 12

    # HUD: skip link, progress, chapter steps
    d.text((64, H - 36), "PASSER LA VISITE  ↓", font=SANS(13, 600), fill=(255, 255, 255, 200), anchor="lm")
    d.line([270, H - 36, W - 230, H - 36], fill=(255, 255, 255, 50), width=1)
    d.line([270, H - 36, 270 + (W - 500) * progress, H - 36], fill=WHITE, width=1)
    sx = W - 210
    for k in range(5):
        d.text((sx, H - 36), f"{k + 1:02d}", font=MONO(13), fill=WHITE if k == step else (255, 255, 255, 95), anchor="lm")
        sx += 30
    return Image.alpha_composite(base, img).convert("RGB")


PANELS = [
    ("hero-hold", "arrive", 0, .03, "01 — Arrivée",
     "Plan fixe sur la façade, puis la caméra glisse et s’aligne sur les portes ouvertes.",
     "Final : votre vraie façade, portes ouvertes (GPT Image 2.5)"),
    ("showroom", "showroom", 1, .27, "02 — Showroom",
     "Ralentit, longe un SUV de profil, S-curve entre deux voitures.",
     "Maquette : photo réelle de votre showroom"),
    ("reception", "reception", 2, .42, "03 — Réception",
     "Arc autour du comptoir d’accueil, cap vers la porte de l’atelier.",
     "Maquette : fond du showroom réel"),
    ("door", None, 2, .52, "Transition — Porte de l’atelier",
     "Un mécanicien ouvre la porte, la caméra passe au travers.",
     "Aucun texte — le mouvement guide"),
    ("atelier", "atelier", 3, .64, "04 — Atelier",
     "Voiture sur pont, technicien, diagnostic, station airco, pneus.",
     "Maquette : visuels atelier de hakauto.be"),
    ("exit", None, 3, .76, "Transition — Sortie",
     "Sortie par la porte sectionnelle vers la cour arrière.",
     "Aucun texte"),
    ("yaw-180", None, 3, .83, "Transition — Demi-tour 180°",
     "Pivote de 180° en mouvement pour faire face au bâtiment.",
     "Aucun texte — beat court dédié"),
    ("final-hold", "reveal", 4, 1.0, "05 — Révélation",
     "Recule et monte : bâtiment, Spoelewielenlaan, zoning de Lendelede.",
     "Maquette : façade réelle · Final : vue aérienne générée"),
]

PW, PH, pad, cap, cols, head = 960, 540, 40, 112, 2, 200
rows = (len(PANELS) + cols - 1) // cols
sheet = Image.new("RGB", (cols * PW + (cols + 1) * pad, head + rows * (PH + cap + pad) + 40), NIGHT)
d = ImageDraw.Draw(sheet)
d.text((pad, 50), "HAK AUTO — storyboard du fly-through", font=JOST(54, 500), fill=WHITE)
d.text((pad, 124), "Maquette : l’interface réelle du site sur un animatic monté à partir de vos photos.", font=SANS(21), fill=(170, 179, 191))
d.text((pad, 156), "Les images définitives seront générées par Higgsfield (GPT Image 2.5 + Seedance 2.5) en un seul plan continu.", font=SANS(21), fill=(170, 179, 191))
(A / "shots").mkdir(exist_ok=True)
for k, (beat, ch, step, prog, title, motion, ref) in enumerate(PANELS):
    x = pad + (k % cols) * (PW + pad)
    y = head + (k // cols) * (PH + cap + pad)
    p = render(beat, ch, step, prog)
    p.save(A / "shots" / f"{k + 1:02d}-{beat}.jpg", quality=90)
    sheet.paste(p.resize((PW, PH), Image.LANCZOS), (x, y))
    d.text((x, y + PH + 16), title, font=JOST(27, 500), fill=WHITE)
    d.text((x, y + PH + 54), motion, font=SANS(18), fill=(207, 213, 221))
    d.text((x, y + PH + 82), ref, font=MONO(14), fill=(139, 149, 163))
out = ROOT / "production/storyboard-hakauto.jpg"
sheet.save(out, quality=88)
print(out, sheet.size)
