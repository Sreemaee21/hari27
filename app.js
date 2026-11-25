(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVGNS = "http://www.w3.org/2000/svg";
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ======================= sound (Web Audio, no files) ======================= */
  const Sound = (() => {
    let ctx = null, master = null, verb = null;
    let muted = localStorage.getItem("hari27-muted") === "1";

    function init() {
      if (ctx) return ctx.resume();
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
      // cheap "distance" reverb: two damped feedback delays
      verb = ctx.createGain(); verb.gain.value = 1;
      [0.23, 0.37].forEach((t) => {
        const d = ctx.createDelay(1); d.delayTime.value = t;
        const fb = ctx.createGain(); fb.gain.value = 0.38;
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800;
        const wet = ctx.createGain(); wet.gain.value = 0.35;
        verb.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(master);
      });
    }

    function noise(dur) {
      const len = Math.ceil(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf; return src;
    }
    function env(g, t, peak, decay) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    }
    function ping(t, freq, peak, decay, dest = master) {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
      const g = ctx.createGain(); env(g, t, peak, decay);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + decay + 0.05);
    }
    function burst(t, dur, type, freq, q, peak, dest = master) {
      const n = noise(dur);
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); env(g, t, peak, dur);
      n.connect(f); f.connect(g); g.connect(dest); n.start(t); n.stop(t + dur);
    }

    // heavy iron cage landing
    function clank(delay = 0) {
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      burst(t, 0.18, "bandpass", 2300, 6, 0.5);
      burst(t, 0.09, "lowpass", 400, 1, 0.5);
      const o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
      const g = ctx.createGain(); env(g, t, 0.45, 0.3);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.35);
      [1210, 1874, 2650, 3420].forEach((f, i) => ping(t, f, 0.06 / (i + 1), 0.6 + i * 0.1, verb));
    }
    // padlock latch: two bright clicks
    function latch(delay = 0) {
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      burst(t, 0.025, "highpass", 3200, 0.8, 0.55);
      burst(t + 0.07, 0.04, "bandpass", 2600, 3, 0.7);
      ping(t + 0.07, 3100, 0.08, 0.25);
      ping(t + 0.07, 4650, 0.04, 0.18);
    }
    // distant clocktower bell
    function bell(delay = 0, f = 261.6, vol = 0.22) {
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
      const out = ctx.createGain(); out.gain.value = vol;
      lp.connect(out); out.connect(master); out.connect(verb);
      [[0.5, 0.5, 4.5], [1, 1, 3.6], [1.19, 0.45, 2.8], [1.5, 0.35, 2.4], [2, 0.3, 2], [2.74, 0.18, 1.4], [3.76, 0.1, 1], [5.4, 0.05, 0.6]]
        .forEach(([r, a, d]) => ping(t, f * r, a, d, lp));
    }
    function chime(delay = 0) {
      bell(delay, 329.6, 0.2);
      bell(delay + 0.9, 261.6, 0.22);
      bell(delay + 1.8, 196, 0.24);
    }
    function shimmer(delay = 0) {
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      [1568, 1976, 2349, 2637].forEach((f, i) => ping(t + i * 0.06, f, 0.05, 0.9, verb));
      burst(t, 0.3, "bandpass", 5000, 2, 0.04);
    }
    function setMuted(m) {
      muted = m;
      localStorage.setItem("hari27-muted", m ? "1" : "0");
      if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
    }
    return { init, clank, latch, chime, shimmer, setMuted, get muted() { return muted; } };
  })();

  /* ======================= stars ======================= */
  function starEl(cls) {
    const s = document.createElement("span");
    s.className = cls;
    s.innerHTML = '<svg viewBox="0 0 20 20"><use href="#star4"/></svg>';
    return s;
  }
  (function makeStars() {
    const box = $("#stars");
    const n = innerWidth < 380 ? 26 : 34;
    for (let i = 0; i < n; i++) {
      const s = starEl("star");
      const size = Math.random() < 0.15 ? rand(10, 15) : rand(4, 8);
      Object.assign(s.style, {
        left: rand(4, 96) + "%", top: rand(2, 96) + "%",
        width: size + "px", height: size + "px",
      });
      s.style.setProperty("--t", rand(3.5, 7.5).toFixed(2) + "s");
      s.style.setProperty("--dl", (-rand(0, 7)).toFixed(2) + "s");
      box.appendChild(s);
    }
  })();

  /* ======================= cage SVG (procedural bars) ======================= */
  (function buildCage() {
    const bars = $("#bars"), barsHi = $("#barsHi"), ribs = $("#ribs"), arcade = $("#arcade");
    const xs = [];
    for (let x = 38; x <= 262; x += 18.6) xs.push(x);
    xs.forEach((x) => {
      const l = document.createElementNS(SVGNS, "path");
      l.setAttribute("d", `M${x.toFixed(1)} 126 V 360`);
      bars.appendChild(l);
      const hl = document.createElementNS(SVGNS, "path");
      hl.setAttribute("d", `M${(x - 0.8).toFixed(1)} 130 V 356`);
      barsHi.appendChild(hl);
      // gothic rib from apex down to the top band
      const r = document.createElementNS(SVGNS, "path");
      const k = (x - 150) / 112;
      r.setAttribute("d", `M150 52 C ${(150 + k * 30).toFixed(1)} 62, ${x.toFixed(1)} ${(78 + Math.abs(k) * 6).toFixed(1)}, ${x.toFixed(1)} 122`);
      ribs.appendChild(r);
    });
    // pointed arches between bars near the base
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i], b = xs[i + 1], m = (a + b) / 2;
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", `M${a.toFixed(1)} 342 L${a.toFixed(1)} 322 Q ${a.toFixed(1)} 310, ${m.toFixed(1)} 304 Q ${b.toFixed(1)} 310, ${b.toFixed(1)} 322`);
      arcade.appendChild(p);
    }
  })();

  /* ======================= the gate ======================= */
  const gate = $("#gate"), swear = $("#swear"), muteBtn = $("#mute"), page = $("#page");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function syncMute() {
    muteBtn.setAttribute("aria-pressed", String(Sound.muted));
    muteBtn.setAttribute("aria-label", Sound.muted ? "Unmute sound" : "Mute sound");
  }
  syncMute();
  muteBtn.addEventListener("click", () => { Sound.init(); Sound.setMuted(!Sound.muted); syncMute(); });

  swear.addEventListener("click", async () => {
    Sound.init();
    swear.disabled = true;
    const fall = reduceMotion ? 0 : 1;

    gate.classList.add("is-dropping");
    Sound.clank(fall * 0.66);
    if (!reduceMotion) setTimeout(() => Sound.clank(0), 960);         // little rebound tap
    await wait(fall ? 1180 : 150);

    gate.classList.add("is-locking");
    await wait(260);
    gate.classList.add("is-locked");
    Sound.latch(0);
    Sound.chime(0.35);

    await wait(220);
    gate.classList.add("is-caged");                                    // caption
    await wait(1300);

    unlock();
  });

  function unlock() {
    gate.classList.add("is-open");
    document.body.classList.remove("locked");
    document.body.classList.add("unlocked");
    page.removeAttribute("aria-hidden");
    window.scrollTo(0, 0);
    setTimeout(() => { gate.hidden = true; }, 1150);
  }

  /* ======================= scroll reveals ======================= */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ======================= calendar (.ics) ======================= */
  $("#calendar").addEventListener("click", () => {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//hari27//summons//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:hari27-botc-20261128@summons",
      "DTSTAMP:" + stamp,
      "DTSTART:20261128T133000Z",   // 7:00 PM IST
      "DTEND:20261128T180000Z",     // 11:30 PM IST
      "SUMMARY:Hari's 27th × Blood on the Clocktower",
      "LOCATION:Flamingo B\\, 201\\, Doyens Township",
      "DESCRIPTION:BYOB: Bring Your Own Blood. Dress warm.",
      "BEGIN:VALARM",
      "TRIGGER:-PT2H",
      "ACTION:DISPLAY",
      "DESCRIPTION:You have been summoned",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
    a.download = "haris-27th-botc.ics";
    document.body.appendChild(a); a.click(); a.remove();
  });

  /* ======================= draw your token ======================= */
  const TEAMS = {
    Townsfolk: { leaf: "#2f5f8a", ui: "#9cc0ea" },
    Outsider:  { leaf: "#3d7f95", ui: "#8fd0e0" },
    Minion:    { leaf: "#8a2424", ui: "#ef9a9a" },
    Demon:     { leaf: "#6a0c10", ui: "#ff7a7a" },
  };
  const I = {
    key:    '<circle cx="30" cy="30" r="15"/><circle cx="30" cy="30" r="6"/><path d="M41 41 L84 84 M68 68 L77 59 M76 76 L85 67"/>',
    lyre:   '<path d="M30 16 C 16 46, 28 80, 50 88 C 72 80, 84 46, 70 16"/><path d="M26 28 H74"/><path d="M42 28 V83 M50 28 V88 M58 28 V83"/><circle cx="30" cy="14" r="4" fill="currentColor"/><circle cx="70" cy="14" r="4" fill="currentColor"/>',
    goblet: '<path d="M26 14 H74 C 74 46, 62 58, 50 58 C 38 58, 26 46, 26 14 Z"/><path d="M28 28 H72" opacity=".6"/><path d="M50 58 V82"/><path d="M32 88 Q 50 76 68 88 Z" fill="currentColor"/>',
    lock:   '<path d="M34 46 V32 a16 16 0 0 1 32 0 V46"/><rect x="24" y="46" width="52" height="42" rx="7" fill="currentColor"/><circle cx="50" cy="63" r="5" fill="#eadcbc" stroke="none"/><path d="M48 65 L46 76 H54 L52 65 Z" fill="#eadcbc" stroke="none"/>',
    dagger: '<path d="M50 6 L58 20 L56 64 H44 L42 20 Z"/><path d="M50 12 V60" opacity=".55"/><path d="M28 64 H72"/><path d="M50 64 V86"/><circle cx="50" cy="91" r="4.5" fill="currentColor"/>',
    eye:    '<path d="M10 50 Q 50 12 90 50 Q 50 88 10 50 Z"/><circle cx="50" cy="50" r="13"/><circle cx="50" cy="50" r="5.5" fill="currentColor"/><path d="M50 18 V8 M30 24 L24 15 M70 24 L76 15"/>',
    cake:   '<rect x="22" y="54" width="56" height="32" rx="3"/><path d="M22 68 Q 30 74 36 68 T 50 68 T 64 68 T 78 68"/><path d="M50 54 V36"/><path d="M50 22 Q 57 30 50 35 Q 43 30 50 22 Z" fill="currentColor"/><path d="M60 54 L72 40 L78 54" opacity=".7"/>',
    bulb:   '<path d="M50 14 C 32 14, 25 34, 36 48 C 42 56, 42 60, 42 66 H58 C 58 60, 58 56, 64 48 C 75 34, 68 14, 50 14 Z"/><path d="M42 72 H58 M44 79 H56"/><path d="M50 4 V0 M20 20 L14 14 M80 20 L86 14 M14 44 H6 M86 44 H94" /><path d="M46 66 L46 50 L50 44 L54 50 L54 66" opacity=".6"/>',
    horns:  '<path d="M22 78 C 8 50, 14 24, 32 10 C 28 30, 32 46, 44 58"/><path d="M78 78 C 92 50, 86 24, 68 10 C 72 30, 68 46, 56 58"/><path d="M50 22 L62 60 H38 Z" fill="currentColor"/><circle cx="50" cy="18" r="4.5" fill="currentColor"/><path d="M36 76 Q 50 88 64 76"/>',
    bottle: '<path d="M44 8 H56 V28 C 66 34, 68 42, 68 50 V88 H32 V50 C 32 42, 34 34, 44 28 Z"/><rect x="36" y="56" width="28" height="18" rx="2" fill="currentColor"/><path d="M44 14 H56"/><path d="M76 20 q 6 -6 0 -12 M84 26 q 8 -10 0 -20" opacity=".7"/>',
  };
  const ROLES = [
    { name: "Terrace Conspirator", team: "Minion",    icon: "key",    ability: "You know where the night really ends. Say nothing." },
    { name: "Secret Balladeer",    team: "Townsfolk", icon: "lyre",   ability: "Once per night, when the moment is right, you lead the chorus." },
    { name: "Beverage Baron",      team: "Townsfolk", icon: "goblet", ability: "Each night, choose a player: their glass is never empty." },
    { name: "Keeper of Secrets",   team: "Townsfolk", icon: "lock",   ability: "If the Storyteller learns of the terrace, you die. Don't die." },
    { name: "Demon Hunter",        team: "Townsfolk", icon: "dagger", ability: "Once per game, publicly accuse anyone. If they're the Demon, take a victory sip." },
    { name: "Suspicious Townsfolk",team: "Outsider",  icon: "eye",    ability: "You think everyone is lying. You are probably right." },
    { name: "Cake Thief",          team: "Minion",    icon: "cake",   ability: "Each night, you may take a second slice. The Storyteller will never know." },
    { name: "Lamplighter",         team: "Townsfolk", icon: "bulb",   ability: "When the lights flicker, you know something is about to happen." },
    { name: "Birthday Demon",      team: "Demon",     icon: "horns",  ability: "Each night*, the Storyteller ages one year. Nothing can stop you." },
    { name: "Tipsy Drunk",         team: "Outsider",  icon: "bottle", ability: "You think you are the Storyteller. You are not." },
  ];

  const token = $("#token"), result = $("#result"), drawBtn = $("#drawBtn"), again = $("#again");
  const tokenSvg = $(".token__svg");
  (function leaves() {
    const g = $(".token__leaves");
    for (let a = -58; a <= 58; a += 14.5) {
      const rad = (a - 90) * Math.PI / 180;
      const cx = 100 + 80 * Math.cos(rad), cy = 100 + 80 * Math.sin(rad);
      const e = document.createElementNS(SVGNS, "path");
      e.setAttribute("d", "M0 -9 C 5 -4, 5 4, 0 9 C -5 4, -5 -4, 0 -9 Z");
      e.setAttribute("transform", `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${a})`);
      g.appendChild(e);
    }
  })();

  let last = -1, busy = false;
  function pick() {
    let i;
    do { i = Math.floor(Math.random() * ROLES.length); } while (i === last);
    last = i; return ROLES[i];
  }
  function paint(role) {
    const t = TEAMS[role.team];
    tokenSvg.style.setProperty("--team", t.leaf);
    result.style.setProperty("--team-ui", t.ui);
    $("#tokenIcon").innerHTML = `<g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${I[role.icon]}</g>`;
    $("#tokenName").textContent = role.name;
    $("#team").textContent = role.team;
    $("#ability").textContent = role.ability;
    token.setAttribute("aria-label", `Your token: the ${role.name}, ${role.team}. ${role.ability}`);
  }
  async function draw() {
    if (busy) return;
    busy = true;
    Sound.init();
    if (token.classList.contains("is-flipped")) {
      result.classList.remove("is-shown");
      token.classList.remove("is-flipped");
      await wait(reduceMotion ? 50 : 650);
    }
    paint(pick());
    token.classList.add("is-flipped");
    Sound.shimmer(reduceMotion ? 0 : 0.25);
    result.classList.add("is-shown");
    drawBtn.hidden = true;
    again.hidden = false;
    await wait(reduceMotion ? 50 : 700);
    busy = false;
  }
  token.addEventListener("click", draw);
  drawBtn.addEventListener("click", draw);
  again.addEventListener("click", draw);

  /* ======================= rooftop glows ======================= */
  (function glows() {
    const box = $("#glows");
    // bulb centres measured on assets/rooftop.webp (1400 x 969)
    const big = [[232,120],[320,135],[418,152],[535,160],[662,165],[806,152],[1015,115],[1170,65],
                 [392,185],[498,212],[578,240],[660,248],[752,265],[838,283],[930,290],[1027,292],[1112,285],[1218,290],[1300,282]];
    const small = [[380,312],[460,326],[560,345],[620,350],[690,352],[760,352],[818,345],[885,345],[1040,338],[1150,350],[1245,370],[1310,355],
                   [30,545],[80,555],[140,540],[40,880],[90,860],[150,890],[210,900]];
    const lanterns = [[858,410],[195,540],[248,462]];
    const add = ([x, y], size, t) => {
      const g = document.createElement("span");
      g.className = "glow";
      g.style.left = (x / 14).toFixed(2) + "%";
      g.style.top = (y / 9.69).toFixed(2) + "%";
      g.style.setProperty("--g", size);
      g.style.setProperty("--t", t.toFixed(2) + "s");
      g.style.setProperty("--dl", (-rand(0, 5)).toFixed(2) + "s");
      box.appendChild(g);
    };
    big.forEach((p) => add(p, "clamp(16px, 7vw, 30px)", rand(2.4, 4.6)));
    small.forEach((p) => add(p, "clamp(10px, 4vw, 18px)", rand(1.8, 4)));
    lanterns.forEach((p) => add(p, "clamp(30px, 12vw, 52px)", rand(3.5, 6)));
    // a few extra sky twinkles above the strands
    [[8,6],[22,3],[52,4],[70,8],[88,4],[96,14]].forEach(([x, y]) => {
      const s = starEl("sky-star");
      s.style.left = x + "%"; s.style.top = y + "%";
      s.style.setProperty("--t", rand(2.5, 5).toFixed(2) + "s");
      s.style.setProperty("--dl", (-rand(0, 4)).toFixed(2) + "s");
      box.appendChild(s);
    });
  })();
})();
