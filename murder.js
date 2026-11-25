(() => {
  // TEST VARIANT: the Storyteller has been murdered (murder.html only)
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
      // iPhones mute web audio when the side switch is on silent unless the
      // page asks to be treated like media playback (iOS 17+)
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
      if (ctx) { if (ctx.state !== "running") ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      if (ctx.state !== "running") ctx.resume();
      // older iOS only unlocks after something is played inside the tap
      const blank = ctx.createBufferSource(); blank.buffer = ctx.createBuffer(1, 1, 22050);
      blank.connect(ctx.destination); blank.start(0);
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
    // doors swinging open: a rush of air, no tonal groan
    function doors(delay = 0) {
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      const n = noise(1.6);
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 0.8;
      f.frequency.setValueAtTime(480, t); f.frequency.exponentialRampToValueAtTime(2000, t + 1.1);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.12, t + 0.6); ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      n.connect(f); f.connect(ng); ng.connect(master); n.start(t); n.stop(t + 1.6);
    }
    function toll(delay = 0, vol = 0.34) { bell(delay, 110, vol); bell(delay, 220, vol * 0.35); }
    function kill(delay = 0) {
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      burst(t, 0.35, "bandpass", 3200, 1.2, 0.35);           // glass crack
      burst(t + 0.03, 0.08, "highpass", 5000, 0.7, 0.3);
      const o = ctx.createOscillator(); o.type = "sine";     // gut thud
      o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.6);
      const g = ctx.createGain(); env(g, t, 0.6, 0.7);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.75);
      // dissonant drone that hangs in the air
      [[55, 0.05], [58.3, 0.04], [82.4, 0.03]].forEach(([f, a]) => {
        const d = ctx.createOscillator(); d.type = "sawtooth"; d.frequency.value = f;
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260;
        const dg = ctx.createGain();
        dg.gain.setValueAtTime(0.0001, t); dg.gain.exponentialRampToValueAtTime(a, t + 0.8); dg.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
        d.connect(lp); lp.connect(dg); dg.connect(master); dg.connect(verb); d.start(t); d.stop(t + 4.6);
      });
    }
    function setMuted(m) {
      muted = m;
      localStorage.setItem("hari27-muted", m ? "1" : "0");
      if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
    }
    return { init, clank, latch, chime, shimmer, doors, toll, kill, setMuted, get muted() { return muted; }, get started() { return !!ctx; } };
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

  /* ======================= clock ticks ======================= */
  (function ticks() {
    const g = $("#ticks");
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, big = i % 3 === 0;
      const r1 = big ? 62 : 66, r2 = 71;
      const l = document.createElementNS(SVGNS, "line");
      l.setAttribute("x1", (150 + r1 * Math.sin(a)).toFixed(1)); l.setAttribute("y1", (240 - r1 * Math.cos(a)).toFixed(1));
      l.setAttribute("x2", (150 + r2 * Math.sin(a)).toFixed(1)); l.setAttribute("y2", (240 - r2 * Math.cos(a)).toFixed(1));
      l.setAttribute("stroke-width", big ? 3.5 : 2);
      g.appendChild(l);
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
  muteBtn.addEventListener("click", () => {
    Sound.init(); Sound.setMuted(!Sound.muted); syncMute();
    if (!Sound.muted) Sound.shimmer(0.05);       // a little chime so you know it works
  });
  // phones suspend audio when the tab is backgrounded; wake it on return
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Sound.started) Sound.init(); });

  swear.addEventListener("click", async () => {
    Sound.init();
    swear.disabled = true;
    const q = reduceMotion ? 0.15 : 1;

    // scene 1: the cage drops over the Storyteller
    gate.classList.add("is-dropping");
    Sound.clank(reduceMotion ? 0 : 0.66);
    if (!reduceMotion) setTimeout(() => Sound.clank(0), 960);
    await wait(reduceMotion ? 150 : 1180);
    gate.classList.add("is-locking");
    await wait(260);
    gate.classList.add("is-locked");
    Sound.latch(0);
    Sound.chime(0.35);                          // chime as the lock snaps
    await wait(220);
    gate.classList.add("is-caged");
    await wait(2600 * q);                       // let the chime finish

    // scene 2: the clocktower, already tolling as it appears

    gate.classList.add("scene-2", "is-tolling");
    $(".scene--cage").setAttribute("aria-hidden", "true");
    $(".scene--tower").removeAttribute("aria-hidden");
    Sound.toll(0); Sound.toll(1.1); Sound.toll(2.2);
    await wait(2300 * q);

    gate.classList.add("is-murdered");
    Sound.kill(0);
    await wait(700 * q);
    gate.classList.add("show-cap1");
    await wait(1300 * q);
    gate.classList.add("show-cap2");
    await wait(1900 * q);

    // the creaking gate opens onto the town square
    gate.classList.add("is-opening");
    await wait(reduceMotion ? 100 : 600);
    unlock();
  });

  function unlock() {
    gate.classList.add("is-open");              // doors swing, camera pushes through
    Sound.doors(0);
    document.body.classList.remove("locked");
    document.body.classList.add("unlocked");
    page.removeAttribute("aria-hidden");
    window.scrollTo(0, 0);
    setTimeout(() => gate.classList.add("is-gone"), reduceMotion ? 300 : 1250);
    setTimeout(() => { gate.hidden = true; }, reduceMotion ? 700 : 2000);
  }

  /* ======================= scroll phases ======================= */
  // every screen after the summons builds itself step by step when it arrives
  document.querySelectorAll(".phase:not(.hero)").forEach((ph) => {
    ph.querySelectorAll(":scope > :not(.draw__result), :scope > .grimoire > :not(.corner)").forEach((el, i) => {
      el.classList.add("step"); el.style.setProperty("--i", i);
    });
  });
  // a small gothic arrow at the foot of every screen but the last
  const phases = [...document.querySelectorAll(".phase")];
  phases.forEach((ph, k) => {
    if (k === 0 || k === phases.length - 1) return;   // summons has its own cue; rooftop is the end
    const m = document.createElement("button");
    m.type = "button"; m.className = "more"; m.setAttribute("aria-label", "Next");
    m.innerHTML = '<svg viewBox="0 0 24 44" aria-hidden="true"><circle cx="12" cy="3" r="1.8" fill="currentColor"/><path d="M12 7 V 31" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M7 13 Q 12 18 17 13" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M12 42 L 5.5 28 Q 12 32 18.5 28 Z" fill="currentColor"/></svg>';
    m.addEventListener("click", () => phases[k + 1].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }));
    ph.appendChild(m);
  });
  const phaseIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); phaseIO.unobserve(e.target); } });
  }, { threshold: 0.4 });
  document.querySelectorAll(".phase:not(.hero)").forEach((el) => phaseIO.observe(el));

  /* ======================= scroll reveals ======================= */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ======================= draw your token ======================= */
  const LEAVES = ["#2f5f8a", "#3d7f95", "#8a2424", "#5b3a8a", "#7a5a1e"];
  const I = {
    key:    '<circle cx="30" cy="30" r="15"/><circle cx="30" cy="30" r="6"/><path d="M41 41 L84 84 M68 68 L77 59 M76 76 L85 67"/>',
    lyre:   '<path d="M30 16 C 16 46, 28 80, 50 88 C 72 80, 84 46, 70 16"/><path d="M26 28 H74"/><path d="M42 28 V83 M50 28 V88 M58 28 V83"/><circle cx="30" cy="14" r="4" fill="currentColor"/><circle cx="70" cy="14" r="4" fill="currentColor"/>',
    goblet: '<path d="M26 14 H74 C 74 46, 62 58, 50 58 C 38 58, 26 46, 26 14 Z"/><path d="M28 28 H72" opacity=".6"/><path d="M50 58 V82"/><path d="M32 88 Q 50 76 68 88 Z" fill="currentColor"/>',
    moon:   '<path d="M62 12 A 38 38 0 1 0 88 66 A 30 30 0 1 1 62 12 Z" fill="currentColor"/><path d="M24 22 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill="currentColor" stroke="none"/>',
    dagger: '<path d="M50 6 L58 20 L56 64 H44 L42 20 Z"/><path d="M50 12 V60" opacity=".55"/><path d="M28 64 H72"/><path d="M50 64 V86"/><circle cx="50" cy="91" r="4.5" fill="currentColor"/>',
    eye:    '<path d="M10 50 Q 50 12 90 50 Q 50 88 10 50 Z"/><circle cx="50" cy="50" r="13"/><circle cx="50" cy="50" r="5.5" fill="currentColor"/><path d="M50 18 V8 M30 24 L24 15 M70 24 L76 15"/>',
    cake:   '<rect x="22" y="54" width="56" height="32" rx="3"/><path d="M22 68 Q 30 74 36 68 T 50 68 T 64 68 T 78 68"/><path d="M50 54 V36"/><path d="M50 22 Q 57 30 50 35 Q 43 30 50 22 Z" fill="currentColor"/><path d="M60 54 L72 40 L78 54" opacity=".7"/>',
    bulb:   '<path d="M50 14 C 32 14, 25 34, 36 48 C 42 56, 42 60, 42 66 H58 C 58 60, 58 56, 64 48 C 75 34, 68 14, 50 14 Z"/><path d="M42 72 H58 M44 79 H56"/><path d="M50 4 V0 M20 20 L14 14 M80 20 L86 14 M14 44 H6 M86 44 H94" /><path d="M46 66 L46 50 L50 44 L54 50 L54 66" opacity=".6"/>',
    horns:  '<path d="M22 78 C 8 50, 14 24, 32 10 C 28 30, 32 46, 44 58"/><path d="M78 78 C 92 50, 86 24, 68 10 C 72 30, 68 46, 56 58"/><path d="M50 22 L62 60 H38 Z" fill="currentColor"/><circle cx="50" cy="18" r="4.5" fill="currentColor"/><path d="M36 76 Q 50 88 64 76"/>',
    bottle: '<path d="M44 8 H56 V28 C 66 34, 68 42, 68 50 V88 H32 V50 C 32 42, 34 34, 44 28 Z"/><rect x="36" y="56" width="28" height="18" rx="2" fill="currentColor"/><path d="M44 14 H56"/><path d="M76 20 q 6 -6 0 -12 M84 26 q 8 -10 0 -20" opacity=".7"/>',
  };
  const ROLES = [
    { name: "Terrace Wanderer",    icon: "key",    fate: "You always find the best spot in the house, even the ones nobody told you about." },
    { name: "Secret Balladeer",    icon: "lyre",   fate: "When the music starts, you will know every word. Every single one." },
    { name: "Beverage Baron",      icon: "goblet", fate: "You arrive bearing the finest bottle in town. Everyone remembers." },
    { name: "Midnight Snacker",    icon: "cake",   fate: "You will find the snacks before anyone else knows they exist." },
    { name: "Gut-Feeling Oracle",  icon: "eye",    fate: "Your first suspicion is always right. You will ignore it anyway." },
    { name: "Lamplighter",         icon: "bulb",   fate: "When the lights flicker, you are the first to sense something is coming." },
    { name: "Birthday Ghoul",      icon: "horns",  fate: "You will make Hari feel every one of his 27 years." },
    { name: "Tipsy Philosopher",   icon: "bottle", fate: "By midnight you will have one theory that explains everything." },
    { name: "Silver Tongue",       icon: "dagger", fate: "You will lie so beautifully that even you believe it." },
    { name: "Night Owl",           icon: "moon",   fate: "You leave last, and you leave with the best story." },
  ];

  (function seats() {
    const box = $("#seats"), n = ROLES.length;
    ROLES.forEach((r, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const s = document.createElement("span");
      s.className = "seat";
      s.style.left = (50 + 43 * Math.cos(a)).toFixed(2) + "%";
      s.style.top = (50 + 43 * Math.sin(a)).toFixed(2) + "%";
      s.style.setProperty("--dl", (i * 0.6).toFixed(1) + "s");
      s.innerHTML = `<svg viewBox="0 0 100 100"><g transform="translate(18 18) scale(.64)" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${I[r.icon]}</g></svg>`;
      box.appendChild(s);
    });
  })();

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
    tokenSvg.style.setProperty("--team", LEAVES[ROLES.indexOf(role) % LEAVES.length]);
    $("#tokenIcon").innerHTML = `<g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${I[role.icon]}</g>`;
    $("#tokenName").textContent = role.name;
    $("#ability").textContent = role.fate;
    token.setAttribute("aria-label", `Your token: the ${role.name}. ${role.fate}`);
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
