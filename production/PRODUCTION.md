# HAK AUTO — production note

## Status (2026-10-06)

| Item | State |
| --- | --- |
| Website (desktop), style tile, content file, scroll engine | **Built and checked in the browser** |
| Brand assets (logo, icons, photos) | Taken from hakauto.be, not redrawn |
| Stock | 95 vehicles from the live Shopify catalogue (`tools/refresh-stock.py`) |
| Mockup | `site/?mockup` scrolls an animatic built from real HAK photos; storyboard in `production/storyboard-hakauto.jpg` (`production/animatic/`) |
| 3D prototype | `site/?3d`: real-time Three.js model of the premises on the same route and beats, no credits needed (`site/js/flight3d.js`) |
| Fly-through footage | **Live**: 30 s Seedance 2.5 master at 480p (`clips/flythrough-master.mp4`), made by hand on higgsfield.ai with the trial credits. 721 frames in `site/media/flight/` |
| Placeholder frames | Archived in `production/archive/placeholder-flight/` |
| Mobile refinement pass | **Done** (prompt 02). Phones load a pre-cropped 9:19.5 portrait sequence (222×480, 4.3 MB) that follows a per-beat horizontal focus (`portrait.py`); landscape phones/tablets/desktop load the landscape set. Checked at 360×740, 390×844, 430×932 and 844×390 |

## Direction

**« Showroom Noir »**: graphite from the building fascia, white linework from the logo, and one signal-blue accent from the sky in the brand flags. Jost (display, already used on hakauto.be), DM Sans (text) and DM Mono (data). See `site/style-tile.html`.

The site is French-first, like hakauto.be. The flags are in Dutch, so adding an NL version is a natural next step.

## Flight route

This route follows the real building's signage: *Show room → Atelier/garage → Receptie*.

1. Arrival on the paving. Glide past the white car, line up with the open double doors, enter.
2. Showroom (white tile floor and ceiling spots, matching the real listing photos). Bank along an SUV, S-curve between two cars, yaw to the street.
3. Reception desk. Arc around it.
4. A mechanic opens the workshop door; the camera flies through.
5. Workshop: car on a lift with a technician, diagnostic trolley, airco machine, tyre machine.
6. Out through the rear roller door into the yard, then a 180° yaw while moving.
7. Fly backwards and climb to reveal the premises, the street and the business park.

The beat timeline (scroll distance in vh, plus video in/out seconds) is in `site/js/content.js`. The times are planned against a master of about 42 s. Re-time them once the real master is measured.

## Budget plan: 270 credits

Measured prices (2026-10-06):

| Job | Price |
| --- | --- |
| Seedance 2.5 at 480p, or draft mode | 3 credits/s |
| Seedance 2.5 at 720p | 7 credits/s |
| Seedance 2.5 at 1080p | 12 credits/s |
| Extensions (preflight) | Same rate as fresh clips; may bill higher in practice |
| GPT Image 2.5, medium | 1 credit |
| GPT Image 2.5, high 2k | 2.75 credits |

| Step | Credits |
| --- | --- |
| API access test (low-quality still) | ~0.5 |
| 2 start-still options (medium) → chosen one at high | 2 + 3 |
| Reveal still (high) | 3 |
| Clip A: 10 s i2v, 720p | 70 |
| Clip B: 10 s extension, 720p | 70 |
| Clip C: 10 s extension + reveal ref, 720p | 70 |
| **Planned total** | **~218** |
| Reserve: one 5 s 720p repair (35) or a 10 s draft test of clip C (30) | ~50 |

Why this works:

- **Flight length doesn't change scroll length.** Scroll distance is set in vh per beat, so a 30 s master (3 × 10 s) gives the same page length as 42 s. A 24 fps master still yields 720 frames, which is plenty for smooth scrubbing.
- **720p instead of 1080p saves 40%.** Frames export at native 1280 px (never upscaled). The 2K GPT still is the exact first frame, so the opening hold, where visitors linger, stays sharp. Motion hides the softness elsewhere.
- **Stills are approved before any video.** Options are drafted at medium (1 credit); only the chosen one is re-rendered at high.
- **Every clip is gated.** Inspect it (`inspect.sh`) before paying for the next one. Never regenerate a whole clip: trim it and extend from a clean tail, or re-run only a short stretch.
- **Draft mode (3 credits/s)** is the safety valve for the riskiest segment (clip C: exit, 180° yaw, reveal). Whether a draft can be upgraded via `draft_job_id`, and at what price, needs checking on first use.

## Run the footage (once Higgsfield API access works)

Defaults are 10 s at 720p. Override with `RES=1080p DUR=15` if more credits arrive. `DRAFT=1` makes a cheap test render.

```bash
bash production/scripts/generate.sh test                                     # proves the trial restriction is gone
bash production/scripts/generate.sh stills                                   # review both, pick a or b
bash production/scripts/generate.sh final-still a
bash production/scripts/generate.sh reveal production/stills/start-final.png
bash production/scripts/generate.sh clip-a production/stills/start-final.png
bash production/scripts/inspect.sh production/clips/clip-a.mp4               # view contact.jpg, tail.jpg; check cuts
bash production/scripts/generate.sh clip-b production/clips/clip-a.mp4
bash production/scripts/inspect.sh production/clips/clip-b.mp4
bash production/scripts/generate.sh clip-c production/clips/clip-b.mp4 production/stills/reveal.png
bash production/scripts/inspect.sh production/clips/clip-c.mp4
bash production/scripts/stitch.sh production/clips/clip-{a,b,c}.mp4           # hard concat; XFADE=1 for 0.125 s fades
python production/scripts/frames.py production/clips/flythrough-master.mp4 --fps 24 --width 1280 --portrait
```

Then re-time `beats` in `content.js` to the ~30 s master. The 10 s prompt timings map to these beats: approach 0–3.5, showroom 3.5–7.5, reception 7.5–12, door 12–13.5, atelier 13.5–18, exit 18–22, yaw 22–24, climb 24–30.

`frames.py` writes the frames, `manifest.json` (with a new cache-busting version), `poster.webp` and per-chapter stills into `site/media/flight/`. The site picks these up automatically: the placeholder badge disappears and the reduced-motion stills switch over. Then re-time `beats` in `content.js` to the master.

Prompts are in `production/prompts/`. Rules they follow: never say "drone"; "the camera itself is flying"; timed manoeuvres; everything stationary unless described; no logos or lettering on cars.

**Repair, don't regenerate.** If a clip ends badly, trim it and extend from the clean tail. Remove stray objects with a short video edit and splice the result back in.

Pipeline tested on synthetic clips (hard concat, crossfade, cut detection, frame export, portrait crop, manifest).

## Mobile framing

Per-beat `focus` in `content.js` (crop centre on tall screens, chosen from `production/mobile/portrait-preview.jpg` and `focus-options-195.jpg`):

| Beat | Focus | Keeps in frame |
| --- | --- | --- |
| hero-hold / approach | 0.38 | Full HAK AUTO sign + open doors |
| reception | 0.38 | Desk and grey door |
| door | 0.6 | Mechanic opening the door |
| atelier | 0.5 | Technician under the lift |
| climb-a | 0.45 | Rear roller door |
| climb-b | 0.78 | Glass corner + HAK AUTO sign |
| climb-c / final | 0.66 / 0.6 | Whole premises with sign |

After changing a focus value: `python production/scripts/portrait.py`, then bump `version` in the manifest.

## Credits used so far

Generated by hand on higgsfield.ai with the trial credits (`higgsfield-web-kit/STEPS.md`):

| Step | Output | Credits | Balance |
| --- | --- | --- | --- |
| Start image: GPT Image 2.5 Flare, high, 2K | `clips/start.png` (2688×1520). Faithful façade, doors open | 2.75 | 97.25 |
| Clip A: Seedance 2.5 i2v, 10 s, 480p | `clips/clip-a.mp4` (854×480, 24 fps). No cuts; ends on the reception desk beside a grey double door | 30 | 67.25 |
| Clip B: Seedance 2.5 extension, 10 s, 480p | `clips/clip-b.mp4`. Mechanic opens the grey door; workshop lift, technician; out the roller door to the yard | 30 | 37.25 |
| Clip C: Seedance 2.5 extension, 10 s, 480p | `clips/clip-c.mp4`. Yard, 180° yaw at ~1.6–3.1 s, reverse climb to the aerial reveal | 30 | 7.25 |

Master: hard concat at native 854×480 (`SIZE=854:480 stitch.sh`), 30.04 s, no cuts detected at either seam (seam frame difference 6.1 and 10.9 / 255). Beats in `content.js` re-timed to it.

Notes: the reveal shows a two-storey glass corner, while the real showroom is single-storey (AI interpretation). Clip A: a Renault badge is visible at about 6.5–9 s (accepted; repair would need a paid edit). The interior is an AI interpretation, and a far-wall sign has garbled lettering.

## Facts to verify before launch

- Opening hours: not published on hakauto.be. Currently shown as "À confirmer" (`content.js → business.hours`).
- Rental price period and conditions for the Peugeot Boxer: hakauto.be says only "90 €".
- Prices for pré-contrôle technique and diagnostic: shown as "Sur devis".
- Service bullet points in `content.js → services[].points` are generic descriptions. Confirm or edit them.
- Logo: only a 930 px PNG exists. Ask the client for the SVG/AI master.
- Forms send to WhatsApp +32 496 30 40 96 or by email, with a prefilled message, and the page tells the visitor to press Send. Nothing is claimed as sent.
- **Email address**: not published anywhere (site, 95 listings, shop data). The email option on the forms and vehicle details stays disabled ("adresse à configurer") until `content.js → business.email` is filled in.
- **Translations**: NL and EN were written for this site. Have a native (Flemish) speaker proofread NL before launch. The quote attributions (e.g. "L'équipe HAK AUTO") are brand-voice lines I wrote, not things HAK AUTO said.
- **Vehicle descriptions** come from the French Shopify listings. In NL/EN the detail view shows them in French, with a note saying so.
- **Facebook**: listings mention a Facebook page "HAK Auto" (no URL given). Add it to `content.js → social` if wanted.
- **2ememain / 2dehands**: the profile URL given is on 2ememain.be (the French name of the platform). The same platform is called 2dehands in Dutch. Check whether a 2dehands.be URL for the Dutch version is preferred.
- **Photos and stock data** still come from the Shopify store (`cdn.shopify.com`, `products.json`), but nothing links to hakauto.be any more. If the Shopify store is closed, the stock needs another source.
