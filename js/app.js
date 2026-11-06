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
  const MAIN = 5; // the first 5 are always visible, the rest live under "More"

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
      <header class="top"><a href="#today" class="brand script">${U.esc(C.appTitle)} <span>🌸</span></a>
        <nav class="nav" id="nav">${NAV.slice(0, MAIN).map(([k, e, n]) => `<a href="#${k}" data-k="${k}"><span class="ni">${e}</span><span class="nl">${n}</span></a>`).join("")}
          <button class="morebtn" id="more" aria-expanded="false"><span class="ni">✨</span><span class="nl">More</span></button></nav>
        <div class="moresheet" id="moresheet" hidden>${NAV.slice(MAIN).map(([k, e, n]) => `<a href="#${k}" data-k="${k}"><span class="ni">${e}</span> ${n}</a>`).join("")}</div>
        <button class="lockbtn" id="lockbtn" aria-label="Lock">🔒</button></header>
      <main id="view" tabindex="-1"></main>
      <footer class="foot">made with love 🤍</footer>`;
    U.$("#lockbtn").onclick = LN.lockNow;
    /* red dot on Chat when she's written something you haven't seen */
    const cl = U.$('#nav a[data-k="chat"]');
    if (cl) { const bd = document.createElement("span"); bd.className = "nbadge"; bd.hidden = true; cl.appendChild(bd); LN.chat.on((c) => { bd.hidden = !c.unread; bd.textContent = c.unread > 9 ? "9+" : c.unread; }); }
    const more = U.$("#more"), sheet = U.$("#moresheet");
    more.onclick = (e) => { e.stopPropagation(); sheet.hidden = !sheet.hidden; more.setAttribute("aria-expanded", String(!sheet.hidden)); };
    document.addEventListener("click", () => { sheet.hidden = true; });
  }
  LN.refreshShell = () => { const k = (location.hash || "#today").slice(1); route(k); };

  async function route(forced) {
    const k = forced || (location.hash || "#today").slice(1);
    const view = LN.views[NAV.find((n) => n[0] === k) ? k : "today"];
    const key = NAV.find((n) => n[0] === k) ? k : "today";
    U.$$("#nav a, #moresheet a").forEach((a) => a.classList.toggle("on", a.dataset.k === key));
    U.$("#more").classList.toggle("on", NAV.findIndex((n) => n[0] === key) >= MAIN);
    U.$("#moresheet").hidden = true;
    const root = U.$("#view");
    // each day gets its own soft pink mood
    const mood = LN.gen.moodFor(U.dateKey());
    document.documentElement.style.setProperty("--accent", mood.a);
    document.documentElement.style.setProperty("--accent-soft", mood.s);
    if (key !== "play") { LN.presence.setGame(""); LN.views.play.game = null; } // Play always opens on the games menu
    root.innerHTML = `<p class="loading">🌸</p>`;
    try { await view.render(root); } catch (e) { console.error(e); root.innerHTML = `<p class="empty">Something wandered off 🥀 Try refreshing.</p>`; }
    window.scrollTo(0, 0);
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
    if (!(await LN.db.hasSession().catch(() => false))) await LN.views.lock.show();
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
    if (!ctx.who) {
      // someone logged in on a new device: ask who they are
      ctx.who = "a";
      const S = LN.gen.settings;
      const pick = confirm(`Is this ${S.nameB}'s phone?\n\nOK = I'm ${S.nameB}\nCancel = I'm ${S.nameA}`);
      LN.setWho(pick ? "b" : "a");
    }
    shell();
    idleLock();
    clockWatch();
    syncWatch();
    LN.presence.start();
    LN.chat.watch();
    addEventListener("hashchange", () => route());
    route();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
