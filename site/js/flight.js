/* ==========================================================================
   HAK AUTO — scroll-driven fly-through
   - Pinned canvas stage; native scrolling only (no hijacking).
   - Piecewise beat timeline: each beat maps its own scroll distance (vh) to its
     own slice of the master video (seconds). Holds map a range to one frame.
   - Bounded frame loader: prioritises the needed frame and its neighbours in
     the scroll direction, caps concurrent requests and decoded bitmaps, aborts
     obsolete requests, closes evicted bitmaps, retries with backoff.
   ========================================================================== */
(function () {
  "use strict";

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);

  function FlightEngine(opts) {
    this.section = opts.section;
    this.stage = opts.section.querySelector(".flight__stage");
    this.canvas = opts.section.querySelector(".flight__canvas");
    // Realtime mode (WebGL scene) renders by time instead of drawing pre-rendered frames.
    this.realtime = opts.realtime || null;
    this.ctx = this.realtime ? null : this.canvas.getContext("2d", { alpha: false });
    this.poster = opts.section.querySelector(".flight__poster");
    this.chapterRoot = opts.section.querySelector("#flight-chapters");
    this.stepsRoot = opts.section.querySelector("#flight-steps");
    this.progressBar = opts.section.querySelector(".flight__progress span");
    this.cue = opts.section.querySelector(".flight__cue");
    this.beats = opts.beats;
    this.chapters = opts.chapters;
    this.quotes = opts.quotes || {};
    this.resolveHref = opts.resolveHref;
    this.mobileQuery = window.matchMedia("(max-width: 760px)");

    this.cache = new Map();     // frame index -> ImageBitmap
    this.inflight = new Map();  // frame index -> AbortController
    this.failures = new Map();  // frame index -> retry count
    this.target = 0;
    this.dir = 1;
    this.lastOffset = 0;
    this.drawn = -1;
    this.dirty = true;
    this.focus = 0.5;
  }

  FlightEngine.prototype.init = async function (manifestUrl) {
    let m;
    if (this.realtime) {
      m = { fps: 30, count: 1e6, pattern: "", version: "realtime", placeholder: true, label: this.realtime.label };
    } else {
      const res = await fetch(manifestUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error("manifest " + res.status);
      m = await res.json();
    }
    this.manifest = m;
    const base = manifestUrl.slice(0, manifestUrl.lastIndexOf("/") + 1);
    // Phones get the pre-cropped portrait sequence (same footage, fewer bytes); everything else the
    // landscape one. Decided before the first request; switched cleanly on breakpoint changes.
    this.portraitMode = !!(m.portrait && this.mobileQuery.matches);
    this.frameUrl = (i) =>
      base + (this.portraitMode ? m.portrait : m.pattern).replace(/%0(\d)d/, (_, n) => String(i + (m.start || 0)).padStart(+n, "0")) + "?v=" + encodeURIComponent(m.version);
    this.maxFrame = m.count - 1;
    this.maxDecoded = this.mobileQuery.matches ? 48 : 96;
    this.maxConcurrent = this.mobileQuery.matches ? 4 : 6;

    if (m.placeholder) {
      const badge = this.section.querySelector(".flight__badge");
      if (badge) { badge.hidden = false; if (m.label) badge.textContent = m.label; }
    }

    this.buildChapters();
    this.layout();

    // rAF drives rendering; the timer is a fallback for throttled/hidden documents.
    this.onScroll = () => {
      this.dirty = true;
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = setTimeout(() => { if (this.dirty) { this.dirty = false; this.update(); } }, 120);
    };
    this.onResize = () => {
      const wantPortrait = !!(this.manifest.portrait && this.mobileQuery.matches);
      if (wantPortrait !== this.portraitMode) this.switchSequence(wantPortrait);
      this.layout(); this.dirty = true; this.drawn = -1;
    };
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onResize);
    window.addEventListener("orientationchange", this.onResize);
    this.mobileQuery.addEventListener("change", this.onResize);

    const tick = () => {
      if (this.dirty) { this.dirty = false; this.update(); }
      this.raf = requestAnimationFrame(tick);
    };
    this.update();
    tick();
  };

  /* ---------------- timeline ---------------- */
  FlightEngine.prototype.layout = function () {
    const vh = window.innerHeight;
    const mobile = this.mobileQuery.matches;
    let acc = 0;
    this.timeline = this.beats.map((b) => {
      const len = (mobile && b.mvh != null ? b.mvh : b.vh) * vh;
      const seg = Object.assign({}, b, { start: acc, end: acc + len, len });
      acc += len;
      return seg;
    });
    this.travel = acc;
    // Stage is 100vh and sticky; the section adds the pinned travel beneath it.
    this.section.style.height = this.travel + vh + "px";

    // Copy ranges = consecutive beats that carry the same chapter (or the same quote).
    this.ranges = [];
    for (const kind of ["chapter", "quote"]) {
      let last = null;
      this.timeline.forEach((s) => {
        const id = s[kind] ? kind + ":" + s[kind] : null;
        if (id && last && last.key === id && last.end === s.start) last.end = s.end;
        else if (id) { last = { key: id, id: s[kind], kind, start: s.start, end: s.end }; this.ranges.push(last); }
        else last = null;
      });
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.stage.clientWidth, h = this.stage.clientHeight;
    this._lw = w; this._lh = h;
    if (this.realtime) { this.realtime.resize(w, h, dpr); this.lastTime = undefined; }  // resizing clears the GL buffer
    else {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.maxDecoded = mobile ? 48 : 96;
  };

  FlightEngine.prototype.offset = function () {
    const top = this.section.getBoundingClientRect().top;
    return clamp(-top, 0, this.travel);
  };

  FlightEngine.prototype.sample = function (off) {
    const tl = this.timeline;
    let i = tl.findIndex((s) => off < s.end);
    if (i === -1) i = tl.length - 1;
    const s = tl[i];
    const t = s.len > 0 ? clamp((off - s.start) / s.len, 0, 1) : 1;
    const time = lerp(s.from, s.to, t);
    const next = tl[i + 1];
    const focus = next ? lerp(s.focus ?? 0.5, next.focus ?? 0.5, smooth(t)) : (s.focus ?? 0.5);
    return { index: i, time, focus };
  };

  /* ---------------- per-frame update ---------------- */
  FlightEngine.prototype.update = function () {
    // A zero-height viewport (hidden/collapsed frame) has no timeline yet; wait for a resize.
    if (!this.travel) { if (window.innerHeight > 0) this.layout(); if (!this.travel) return; }
    // Safety net: some environments resize without firing resize/media-query events.
    if (this.stage.clientWidth !== this._lw || this.stage.clientHeight !== this._lh) this.onResize();
    const off = this.offset();
    if (off !== this.lastOffset) this.dir = off > this.lastOffset ? 1 : -1;
    this.lastOffset = off;

    const { index, time, focus } = this.sample(off);
    this.focus = focus;
    // Expose the current beat so CSS can adapt copy per beat (e.g. phones: full reveal copy only on the final hold).
    const beatId = this.timeline[index].id;
    if (this.section.dataset.beat !== beatId) this.section.dataset.beat = beatId;
    if (this.realtime) {
      if (time !== this.lastTime) { this.lastTime = time; this.realtime.render(time); }
      if (!this.revealed) { this.revealed = true; this.section.classList.add("is-live"); }
    } else {
      this.target = clamp(Math.round(time * this.manifest.fps), 0, this.maxFrame);
      this.schedule();
      this.draw();
      this.applyScrim(this.target);
    }
    this.updateChapters(off);

    const p = this.travel ? off / this.travel : 0;
    this.progressBar.style.transform = "scaleX(" + p.toFixed(4) + ")";
    this.cue.classList.toggle("is-hidden", off > 40);
  };

  /* ---------------- frame loading ---------------- */
  FlightEngine.prototype.wanted = function () {
    const ahead = this.mobileQuery.matches ? 24 : 40, behind = 10;
    const list = [this.target];
    for (let k = 1; k <= ahead; k++) {
      const a = this.target + this.dir * k;
      if (a >= 0 && a <= this.maxFrame) list.push(a);
      if (k <= behind) {
        const b = this.target - this.dir * k;
        if (b >= 0 && b <= this.maxFrame) list.push(b);
      }
    }
    return list;
  };

  FlightEngine.prototype.schedule = function () {
    const want = this.wanted();
    const wantSet = new Set(want);
    // Abort obsolete requests (fast jumps / direction changes).
    this.inflight.forEach((ctrl, i) => { if (!wantSet.has(i)) { ctrl.abort(); this.inflight.delete(i); } });
    for (const i of want) {
      if (this.inflight.size >= this.maxConcurrent) break;
      if (this.cache.has(i) || this.inflight.has(i)) continue;
      if ((this.failures.get(i) || 0) > 2) continue;
      this.load(i);
    }
  };

  FlightEngine.prototype.load = function (i) {
    const ctrl = new AbortController();
    this.inflight.set(i, ctrl);
    fetch(this.frameUrl(i), { signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then((blob) => createImageBitmap(blob))
      .then((bmp) => {
        if (this.inflight.get(i) !== ctrl) { bmp.close && bmp.close(); return; }
        this.inflight.delete(i);
        this.cache.set(i, bmp);
        this.evict();
        if (Math.abs(i - this.target) <= 30) { this.dirty = true; this.draw(); }
        this.schedule();
      })
      .catch((err) => {
        if (this.inflight.get(i) === ctrl) this.inflight.delete(i);
        if (err && err.name === "AbortError") return;
        const n = (this.failures.get(i) || 0) + 1;
        this.failures.set(i, n);
        if (n <= 2) setTimeout(() => { this.dirty = true; }, 400 * n * n);
      });
  };

  // Swap landscape <-> portrait: cancel obsolete requests and release every decoded bitmap first.
  FlightEngine.prototype.switchSequence = function (portrait) {
    this.inflight.forEach((ctrl) => ctrl.abort());
    this.inflight.clear();
    this.cache.forEach((bmp) => bmp.close && bmp.close());
    this.cache.clear();
    this.failures.clear();
    this.portraitMode = portrait;
    this.drawn = -1;
  };

  FlightEngine.prototype.evict = function () {
    if (this.cache.size <= this.maxDecoded) return;
    const keys = [...this.cache.keys()].sort((a, b) => Math.abs(b - this.target) - Math.abs(a - this.target));
    while (this.cache.size > this.maxDecoded && keys.length) {
      const k = keys.shift();
      const bmp = this.cache.get(k);
      if (bmp && bmp.close) bmp.close();
      this.cache.delete(k);
    }
  };

  FlightEngine.prototype.nearestLoaded = function () {
    if (this.cache.has(this.target)) return this.target;
    for (let k = 1; k <= 60; k++) {
      if (this.cache.has(this.target - this.dir * k)) return this.target - this.dir * k;
      if (this.cache.has(this.target + this.dir * k)) return this.target + this.dir * k;
    }
    return -1;
  };

  /* ---------------- drawing (canvas object-fit: cover + focus) ---------------- */
  FlightEngine.prototype.draw = function () {
    const i = this.nearestLoaded();
    if (i < 0) return;
    const key = i + ":" + (this.portraitMode ? "p" : this.focus.toFixed(3)) + ":" + this.canvas.width + "x" + this.canvas.height;
    if (key === this.drawn) return;
    const bmp = this.cache.get(i);
    const cw = this.canvas.width, ch = this.canvas.height;
    const scale = Math.max(cw / bmp.width, ch / bmp.height);
    const dw = bmp.width * scale, dh = bmp.height * scale;
    const focus = this.portraitMode ? 0.5 : this.focus;   // portrait frames are already framed
    const x = (cw - dw) * focus, y = (ch - dh) / 2;
    this.ctx.drawImage(bmp, x, y, dw, dh);
    this.drawn = key;
    if (!this.revealed) { this.revealed = true; this.section.classList.add("is-live"); }
  };

  /* ---------------- adaptive legibility panel ----------------
     manifest.luma holds the pre-computed brightness (0-255) behind each copy position per frame.
     Pick the panel opacity so the blended background behind the text stays around 72/255:
     opacity = (L - 72) / (L - 11), where 11 is the panel colour (--ink-950). Floor 0.3, cap 0.8. */
  FlightEngine.prototype.applyScrim = function (frame) {
    const luma = this.manifest.luma;
    if (!luma) return;
    const mobile = this.mobileQuery.matches;
    for (const id in this.chapterEls) {
      const el = this.chapterEls[id];
      if (!el._visible) continue;
      const series = luma[mobile ? "mobile" : el.dataset.align] || luma.center;
      const L = series[Math.min(frame, series.length - 1)];
      const scrim = clamp((L - 72) / Math.max(L - 11, 1), 0.3, 0.8);
      if (Math.abs(scrim - (el._scrim || 0)) > 0.02) {
        el._scrim = scrim;
        el.style.setProperty("--scrim", scrim.toFixed(2));
      }
    }
  };

  /* ---------------- chapters ---------------- */
  // Swap the copy (e.g. language change) without touching footage or scroll position.
  FlightEngine.prototype.setCopy = function (chapters, quotes) {
    this.chapters = chapters;
    this.quotes = quotes || {};
    if (!this.chapterRoot) return;
    this.buildChapters();
    if (this.timeline) { this.dirty = true; this.update(); }
  };

  FlightEngine.prototype.buildChapters = function () {
    const order = [];
    this.beats.forEach((b) => { if (b.chapter && !order.includes(b.chapter)) order.push(b.chapter); });
    this.chapterEls = {};
    this.chapterRoot.innerHTML = "";
    this.stepsRoot.innerHTML = "";
    order.forEach((id, n) => {
      const c = this.chapters[id];
      const el = document.createElement("article");
      el.className = "chapter chapter--" + (c.align || "left") + (n === 0 ? " chapter--hero" : "");
      el.dataset.chapter = id;
      el.dataset.align = c.align || "left";
      const Tag = n === 0 ? "h1" : "h2";
      el.innerHTML =
        '<p class="chapter__eyebrow">' + c.eyebrow + "</p>" +
        "<" + Tag + ' class="chapter__title"><span class="t-desk">' + c.title + '</span><span class="t-mob">' + (c.mobileTitle || c.title) + "</span></" + Tag + ">" +
        '<p class="chapter__body">' + c.body + "</p>" +
        '<div class="chapter__actions">' +
        (c.actions || []).map((a) => {
          const href = this.resolveHref(a.href);
          const ext = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : "";
          return '<a class="btn ' + (a.primary ? "btn--primary" : "btn--glass") + '" href="' + href + '"' + ext + ">" + a.label + "</a>";
        }).join("") +
        "</div>";
      this.chapterRoot.appendChild(el);
      this.chapterEls["chapter:" + id] = el;

      const li = document.createElement("li");
      li.textContent = String(n + 1).padStart(2, "0");
      li.dataset.chapter = id;
      this.stepsRoot.appendChild(li);
    });

    // Quotes: large editorial lines on the transitions, revealed word by word with scroll.
    const quoteIds = [];
    this.beats.forEach((b) => { if (b.quote && !quoteIds.includes(b.quote)) quoteIds.push(b.quote); });
    quoteIds.forEach((id) => {
      const q = this.quotes[id];
      if (!q) return;
      const el = document.createElement("figure");
      el.className = "chapter flight-quote";
      el.dataset.quote = id;
      el.dataset.align = "center";
      const words = q.text.split(/\s+/);
      el.innerHTML =
        '<blockquote class="flight-quote__text">' +
        words.map((w, i) => {
          // Quote marks travel with the first/last word so they appear together.
          const open = i === 0 ? '<span class="flight-quote__mark" aria-hidden="true">' + (q.open || "«") + "</span>" : "";
          const close = i === words.length - 1 ? '<span class="flight-quote__mark" aria-hidden="true">' + (q.close || "»") + "</span>" : "";
          return '<span class="flight-quote__w" style="--i:' + i + '">' + open + w + close + "</span>";
        }).join(" ") +
        "</blockquote>" +
        (q.by ? '<figcaption class="flight-quote__by">' + q.by + "</figcaption>" : "");
      el._words = [...el.querySelectorAll(".flight-quote__w")];
      this.chapterRoot.appendChild(el);
      this.chapterEls["quote:" + id] = el;
    });
  };

  FlightEngine.prototype.updateChapters = function (off) {
    const vh = window.innerHeight;
    this.ranges.forEach((r) => {
      const el = this.chapterEls[r.key];
      if (!el) return;
      const span = r.end - r.start;
      const fade = Math.min(span * 0.28, vh * 0.35);
      const isFirst = r.start <= 0.5, isLast = r.end >= this.travel - 0.5;
      let o;
      if (off < r.start || off > r.end) o = (isFirst && off <= r.start) || (isLast && off >= r.end) ? 1 : 0;
      else {
        const fin = isFirst ? 1 : clamp((off - r.start) / fade, 0, 1);
        const fout = isLast ? 1 : clamp((r.end - off) / fade, 0, 1);
        o = Math.min(fin, fout);
      }
      const shift = (1 - o) * (off < (r.start + r.end) / 2 ? 24 : -24);
      el.style.opacity = o.toFixed(3);
      el.style.transform = "translate3d(0," + shift.toFixed(1) + "px,0)";
      const visible = o > 0.02;
      if (visible !== el._visible) {
        el._visible = visible;
        el.style.visibility = visible ? "visible" : "hidden";
        el.inert = !visible;
        el.setAttribute("aria-hidden", visible ? "false" : "true");
      }
      if (r.kind === "quote") {
        // Words appear one after another over the first half of the quote's scroll range.
        if (visible && el._words) {
          const p = clamp((off - r.start) / span, 0, 1);
          const n = el._words.length;
          el._words.forEach((w, i) => {
            const t = clamp((p - (0.04 + (i / n) * 0.42)) / 0.09, 0, 1);
            if (w._t !== t) { w._t = t; w.style.setProperty("--t", t.toFixed(3)); }
          });
        }
        return;
      }
      const step = this.stepsRoot.querySelector('[data-chapter="' + r.id + '"]');
      if (step) step.classList.toggle("is-active", o > 0.5);
    });
  };

  window.HAKFlight = { FlightEngine };
})();
