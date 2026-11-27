/* Starts everything: lock -> first-time setup -> pages. */
(function () {
  const LN = window.LN, U = LN.util, C = LN.config;
  const ctx = (LN.ctx = {
    who: localStorage.getItem("ln_who") || "",
    get other() { return this.who === "a" ? "b" : "a"; },
    name(w) { const S = LN.gen.settings; return w === "a" ? S.nameA : w === "b" ? S.nameB : "Someone"; }
  });
  LN.setWho = (w) => { ctx.who = w; localStorage.setItem("ln_who", w); };

  const NAV = [
    ["today", "🌸", "Today"], ["chat", "💬", "Chat"], ["letters", "💌", "Letters"], ["memories", "📸", "Memories"], ["play", "🎮", "Play"],
    ["calendar", "📅", "Calendar"], ["questions", "💭", "Questions"], ["voice", "🎙️", "Voice"], ["settings", "🤍", "Us"]
  ];

  LN.lockNow = async () => { await LN.db.logout(); location.reload(); };

  /* auto-lock when idle */
  function idleLock() {
    const m = C.idleLockMinutes;
    if (!m) return;
    let t;
    const reset = () => { clearTimeout(t); t = setTimeout(LN.lockNow, m * 60000); };
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach((e) => addEventListener(e, reset, { passive: true }));
    reset();
  }

  function shell() {
    document.title = C.appTitle;
    const app = U.$("#app");
    app.innerHTML = `
      <header class="top"><a href="#today" class="brand script">${U.esc(C.appTitle)} <span>🌸</span></a><span class="pstat" id="pstat" hidden></span>
        <button class="menubtn" id="menubtn" aria-expanded="false" aria-controls="menu" aria-label="Open menu"><span class="menulbl" id="menulbl">Today</span><span class="bars"><i></i><i></i><i></i></span><span class="nbadge" id="menubadge" hidden></span></button>
        <button class="lockbtn" id="lockbtn" aria-label="Lock">🔒</button></header>
      <div class="menu" id="menu" hidden>
        <div class="menuback" id="menuback"></div>
        <nav class="menupanel" aria-label="Pages">${NAV.map(([k, e, n], i) => `<a href="#${k}" data-k="${k}" class="mi" style="--i:${i}"><span class="mie">${e}</span><span class="mil">${n}</span>${k === "chat" ? '<span class="nbadge" id="chatbadge" hidden></span>' : ""}</a>`).join("")}</nav>
      </div>
      <main id="view" tabindex="-1"></main>
      <footer class="foot">made with love 🤍</footer>`;
    U.$("#lockbtn").onclick = async () => { if (await LN.ui.confirm("Lock the garden?", { ok: "Lock it 🔒", cancel: "Stay" })) LN.lockNow(); };
    /* online / last seen, on every page */
    const ps = U.$("#pstat");
    if (LN.presence.enabled()) {
      const paintP = () => {
        const P = LN.presence, n = U.esc(ctx.name(ctx.other));
        ps.hidden = !P.known;
        ps.innerHTML = P.online ? `<i class="dot on"></i>${n} online` : `<i class="dot"></i>${n} · ${U.esc(P.seenText())}`;
      };
      LN.presence.on(paintP); paintP();
    }
    LN.chat.dock();
    /* red dot on Chat when she's written something you haven't seen */
    LN.chat.on((c) => {
      const b = U.$("#chatbadge"), mb = U.$("#menubadge"), t = c.unread > 9 ? "9+" : c.unread;
      if (b) { b.hidden = !c.unread; b.textContent = t; }
      if (mb) { mb.hidden = !c.unread; mb.textContent = t; }
    });
    /* the one menu button: everything unfolds from it */
    const menu = U.$("#menu"), btn = U.$("#menubtn");
    let closing = 0;
    const setMenu = (open) => {
      clearTimeout(closing);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("menu-open", open);
      if (open) { menu.hidden = false; void menu.offsetWidth; menu.classList.add("open"); const on = U.$(".mi.on", menu) || U.$(".mi", menu); setTimeout(() => on && on.focus({ preventScroll: true }), 120); }
      else { menu.classList.remove("open"); closing = setTimeout(() => { menu.hidden = true; }, 420); }
    };
    LN.closeMenu = () => setMenu(false);
    btn.onclick = (e) => { e.stopPropagation(); setMenu(menu.hidden || !menu.classList.contains("open")); };
    U.$("#menuback").onclick = () => setMenu(false);
    U.$$(".mi", menu).forEach((a) => a.addEventListener("click", () => {
      setMenu(false);
      if (a.dataset.k === currentKey) { e2(); }
    }));
    const e2 = () => {}; // tapping the page you're already on just closes the menu
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { setMenu(false); btn.focus(); } });
  }
  LN.refreshShell = () => { const k = (location.hash || "#today").slice(1); route(k, true); };

  let currentKey = "", routing = false, queued = false;
  async function route(forced, noFx) {
    if (routing) { queued = true; return; }
    routing = true;
    const k = forced || (location.hash || "#today").slice(1);
    const key = NAV.find((n) => n[0] === k) ? k : "today";
    const view = LN.views[key];
    const root = U.$("#view");
    const draw = async () => {
      currentKey = key;
      document.body.classList.toggle("on-chat", key === "chat");
      U.$$("#menu .mi").forEach((a) => a.classList.toggle("on", a.dataset.k === key));
      const lbl = U.$("#menulbl"); if (lbl) lbl.textContent = (NAV.find((n) => n[0] === key) || [])[2] || "";
      // each day gets its own soft pink mood
      const mood = LN.gen.moodFor(U.dateKey());
      document.documentElement.style.setProperty("--accent", mood.a);
      document.documentElement.style.setProperty("--accent-soft", mood.s);
      if (key !== "play") { LN.presence.setGame(""); LN.views.play.game = null; } // Play always opens on the games menu
      root.innerHTML = `<p class="loading">🌸</p>`;
      try { await view.render(root); } catch (e) { console.error(e); root.innerHTML = `<div class="card center"><p class="big-text">Something wandered off 🥀</p><p class="muted">Pull down or press refresh and it will bloom again.</p></div>`; }
      window.scrollTo(0, 0);
    };
    try {
      if (noFx || !currentKey) await draw(); else await LN.ui.transition(draw);
    } finally { routing = false; }
    if (queued) { queued = false; route(); }
  }

  function onboarding() {
    return new Promise((resolve) => {
      const S = LN.gen.settings;
      const el = document.createElement("div");
      el.className = "onboard";
      el.innerHTML = `<form class="card">
        <h2 class="script">Let's plant the first seed 🌱</h2>
        <p class="muted">A few details so the letters can sound like <i>you</i>. You can change everything later in "Us".</p>
        <div class="grid2">
          <label class="field">His name<input name="nameA" required maxlength="30"></label>
          <label class="field">Her name<input name="nameB" required maxlength="30"></label>
        </div>
        <label class="field">On this phone, I am…<select name="who"><option value="a">him</option><option value="b">her</option></select></label>
        <label class="field">The day we got together<input type="date" name="anniversary"></label>
        <label class="field">Nicknames for her (comma separated)<input name="nicknames" placeholder="love, baby, sunshine"></label>
        <button class="btn">Open our garden 🌸</button></form>`;
      document.body.appendChild(el);
      U.$("form", el).onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const next = {
          ...S, nameA: f.get("nameA").trim(), nameB: f.get("nameB").trim(), anniversary: f.get("anniversary") || "",
          nicknames: f.get("nicknames").split(",").map((s) => s.trim()).filter(Boolean)
        };
        try { await LN.db.kvSet("settings", next); } catch (err) { return U.toast("Couldn't save. Try again."); }
        Object.assign(S, next);
        LN.setWho(f.get("who"));
        el.remove();
        resolve();
      };
    });
  }

  /* ---- keeps "today" honest: rolls over at midnight, after sleep, and after timezone changes ---- */
  function clockWatch() {
    LN.todayKey = U.dateKey();
    const check = () => {
      const k = U.dateKey();
      if (k !== LN.todayKey) {
        LN.todayKey = k;
        U.toast("A new day has bloomed 🌸");
        const open = document.querySelector(".lightbox, textarea:focus, input:focus");
        if (!open) route();
      }
    };
    setInterval(check, 15000);
    document.addEventListener("visibilitychange", () => !document.hidden && check());
    addEventListener("focus", check);
  }

  /* ---- "something new from her" alerts (cloud mode) ---- */
  function syncWatch() {
    if (LN.db.mode !== "cloud") return;
    let fp = "", busy = false;
    const rebase = async () => { try { fp = await LN.db.fingerprint(); } catch (e) {} };
    LN.sync = { rebase };
    ["add", "update", "remove"].forEach((fn) => {
      const o = LN.db[fn];
      LN.db[fn] = async (...a) => { const r = await o.apply(LN.db, a); rebase(); return r; };
    });
    const banner = document.createElement("button");
    banner.id = "fresh"; banner.hidden = true; banner.textContent = "💌 Something new arrived. Tap to refresh";
    banner.onclick = () => { banner.hidden = true; rebase(); route(); };
    document.body.appendChild(banner);
    const poll = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try { const n = await LN.db.fingerprint(); if (fp && n && n !== fp) { banner.hidden = false; fp = n; } else if (!fp) fp = n; } catch (e) {}
      busy = false;
    };
    rebase();
    setInterval(poll, 20000);
    document.addEventListener("visibilitychange", () => !document.hidden && poll());
  }

  /* a tiny site for when there's no internet: only the games against the computer */
  function offlineBoot() {
    ctx.who = "a";
    document.title = C.appTitle;
    U.$("#app").innerHTML = `<header class="top"><span class="brand script">${U.esc(C.appTitle)} <span>🌸</span></span><button class="lockbtn" id="lockbtn" aria-label="Try again">↻</button></header>
      <p class="offbanner">📴 Offline mode: games against the computer. <button class="linkbtn" id="retry">Reconnect</button></p><main id="view" tabindex="-1"></main>`;
    U.$("#retry").onclick = U.$("#lockbtn").onclick = () => location.reload();
    LN.views.play.render(U.$("#view"));
  }

  async function boot() {
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
    LN.art.petals();
    LN.art.garlands();
    /* quiet safety net: a hiccup anywhere shows one gentle note instead of a pile of errors */
    let lastHiccup = 0;
    const hiccup = (err) => { console.error(err); if (Date.now() - lastHiccup > 30000 && LN.todayKey) { lastHiccup = Date.now(); U.toast("Something hiccuped 🥀 If it keeps happening, refresh the page.", 4200); } };
    addEventListener("error", (e) => { if (e.filename && e.filename.startsWith(location.origin)) hiccup(e.error || e.message); });
    addEventListener("unhandledrejection", (e) => hiccup(e.reason));

    let justUnlocked = false;
    if (!(await LN.db.hasSession().catch(() => false))) { await LN.views.lock.show(); justUnlocked = true; }
    if (LN.offlineOnly) return offlineBoot();

    let saved = null, loaded = false;
    while (!loaded) {
      try { saved = await LN.db.kvGet("settings"); loaded = true; }
      catch (e) {
        console.error(e);
        // never fall through to first-time setup just because the connection blipped: that could overwrite your real settings
        const choice = await new Promise((res) => {
          const el = document.createElement("div");
          el.className = "onboard";
          el.innerHTML = `<div class="card center"><h2 class="script">Can't reach the garden 🥀</h2><p class="muted">Check your internet connection, then try again. Your memories are safe.</p><div class="row wrap center-row"><button class="btn" data-a="retry">Try again</button><button class="btn ghost" data-a="off">Play offline</button></div></div>`;
          document.body.appendChild(el);
          el.onclick = (ev) => { const b = ev.target.closest("[data-a]"); if (b) { el.remove(); res(b.dataset.a); } };
        });
        if (choice === "off") { LN.offlineOnly = true; return offlineBoot(); }
      }
    }
    if (saved) Object.assign(LN.gen.settings, saved);
    else await onboarding();
    const S = LN.gen.settings;
    if (!ctx.who) {
      // someone logged in on a new device: ask who they are
      ctx.who = "a";
      const pick = await LN.ui.choose("Who's here? 🌸", "So the garden knows whose phone or computer this is.", [
        { label: S.nameA, sub: "that's me", value: "a", cls: "him", icon: "💜" },
        { label: S.nameB, sub: "that's me", value: "b", cls: "her", icon: "🌸" }
      ]);
      LN.setWho(pick);
    }
    const intro = justUnlocked ? LN.ui.intro(S.nameA, S.nameB) : null;   // names written by hand, right after the secret code
    shell();
    idleLock();
    clockWatch();
    syncWatch();
    LN.presence.start();
    try { LN.ui.ambient(S.nameA, S.nameB); } catch (e) {}
    LN.chat.watch();
    await route(undefined, true);                                       // the home page is ready behind the welcome
    addEventListener("hashchange", () => route());
    if (intro) await intro;
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
