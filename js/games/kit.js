/* Shared helpers for the board games: skippable tutorials + turn syncing between your two phones. */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.games = LN.games || {};
  LN.engines = LN.engines || {};
  const kit = (LN.kit = {});

  /* A skippable step-by-step tutorial. Shows once per game, and again whenever "How to play" is tapped. */
  kit.tutorial = (id, steps, force) =>
    new Promise((resolve) => {
      const U = LN.util;
      let seen = null;
      try { seen = localStorage.getItem("ln_tut_" + id); } catch (e) {}
      if ((seen && !force) || !steps || !steps.length) return resolve();
      let i = 0;
      const el = document.createElement("div");
      el.className = "tut";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      const key = (e) => { if (e.key === "Escape") close(); };
      const close = () => {
        try { localStorage.setItem("ln_tut_" + id, "1"); } catch (e) {}
        document.removeEventListener("keydown", key);
        el.remove();
        resolve();
      };
      const paint = () => {
        const s = steps[i];
        el.innerHTML = `<div class="tut-card"><button class="tut-skip" data-a="skip">Skip ✕</button>
          <div class="tut-ico">${U.esc(s.icon || "🌸")}</div><h3>${U.esc(s.title)}</h3><p>${U.esc(s.text)}</p>
          <div class="tut-dots">${steps.map((_, j) => `<i class="${j === i ? "on" : ""}"></i>`).join("")}</div>
          <div class="row end">${i > 0 ? '<button class="btn small ghost" data-a="back">Back</button>' : ""}<button class="btn small" data-a="next">${i === steps.length - 1 ? "Let's play 💗" : "Next"}</button></div></div>`;
      };
      el.onclick = (e) => {
        const a = e.target.closest("[data-a]");
        if (!a) return;
        if (a.dataset.a === "skip") close();
        else if (a.dataset.a === "back") { i--; paint(); }
        else if (i >= steps.length - 1) close();
        else { i++; paint(); }
      };
      document.addEventListener("keydown", key);
      document.body.appendChild(el);
      paint();
    });

  /* Keeps one shared game state (in the database) in step between both phones. */
  kit.sync = async (box, key, fresh, paint) => {
    const S = { st: null, dirty: false };
    const load = async () => { try { return await LN.db.kvGet(key); } catch (e) { return null; } };
    S.st = (await load()) || fresh();
    S.save = async () => {
      S.dirty = true;
      try { await LN.db.kvSet(key, S.st); } catch (e) { LN.util.toast("Couldn't save the move. Check your internet."); }
      S.dirty = false;
    };
    S.reset = () => { S.st = fresh(); paint(); return S.save(); };
    S.timer = setInterval(async () => {
      if (!document.body.contains(box)) return clearInterval(S.timer);
      if (S.dirty) return;
      const v = await load();
      if (S.dirty || !v) return;
      if (JSON.stringify(v) !== JSON.stringify(S.st)) { S.st = v; paint(); }
    }, 3000);
    return S;
  };

  /* In "computer" mode the game state lives only on this device (works offline); otherwise it syncs with her. */
  kit.session = async (box, key, fresh, paint, opts = {}) => {
    let S;
    if (!opts.cpu) S = await kit.sync(box, key, fresh, paint);
    else {
      S = { st: fresh(), dirty: false, save: async () => {} };
      S.reset = () => { S.st = fresh(); paint(); };
      /* the computer's own moves don't call save(), so watch for the end of the game */
      S.timer = setInterval(() => {
        if (!document.body.contains(box)) return clearInterval(S.timer);
        if (S.st.rec) return;
        const o = kit.outcome(key, S.st);
        if (o) { S.st.rec = 1; kit.record(key, o, opts, S.st); }
      }, 600);
    }
    /* when a game ends, write one result row (st.rec stops it being written twice, even from the other phone) */
    const inner = S.save;
    S.save = async () => {
      const o = kit.outcome(key, S.st);
      if (o && !S.st.rec) { S.st.rec = 1; kit.record(key, o, opts, S.st); }
      return inner();
    };
    try { fx.watch(box, S, key, opts); } catch (e) { console.error(e); }
    return S;
  };


  /* ---------- game juice: sounds, move pops, winner celebration ---------- */
  const fx = (kit.fx = {});
  let ac = null;
  const muted = () => { try { return localStorage.getItem("ln_mute") === "1"; } catch (e) { return false; } };
  fx.muted = muted;
  fx.setMuted = (m) => { try { localStorage.setItem("ln_mute", m ? "1" : "0"); } catch (e) {} };
  fx.tone = (notes, o = {}) => {
    if (muted()) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = ac || new AC(); if (ac.state === "suspended") ac.resume();
      let t = ac.currentTime + 0.01;
      notes.forEach(([f, d]) => {
        const osc = ac.createOscillator(), g = ac.createGain();
        osc.type = o.type || "sine"; osc.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        osc.connect(g); g.connect(ac.destination); osc.start(t); osc.stop(t + d + 0.02); t += d * 0.8;
      });
    } catch (e) {}
  };
  fx.pop = () => fx.tone([[620, 0.09], [820, 0.09]], { vol: 0.08 });
  fx.win = () => fx.tone([[523, 0.14], [659, 0.14], [784, 0.14], [1047, 0.34]], { vol: 0.13 });
  fx.lose = () => fx.tone([[392, 0.2], [349, 0.2], [330, 0.34]], { vol: 0.09, type: "triangle" });
  fx.draw = () => fx.tone([[440, 0.16], [440, 0.22]], { vol: 0.08 });

  /* a pretty "you won" card with confetti; mine = did I win? */
  fx.celebrate = (o, opts = {}) => {
    try {
      const me = LN.ctx.who, cpu = !!opts.cpu;
      const won = o === "draw" ? null : cpu ? o === "a" : o === me;
      const name = o === "draw" ? "" : cpu ? (o === "a" ? LN.ctx.name(me) : "The computer") : LN.ctx.name(o);
      if (won === true) fx.win(); else if (won === false) fx.lose(); else fx.draw();
      const R = LN.art && LN.art.burst;
      if (R && won !== false) for (let i = 0; i < 4; i++) setTimeout(() => R(innerWidth * (0.2 + 0.2 * i), innerHeight * 0.4, ["🌸", "💜", "✨", "🌷", "💗", "🎉"], 14), i * 220);
      const t = o === "draw" ? ["🤝", "It's a draw!", "Evenly matched. That's love 💞"]
        : won ? ["🏆", cpu ? "You won!" : `${name} wins!`, "Beautifully played 🌸"]
        : cpu ? ["🤖", "The computer won", "Good game! Try again, you've got this 💪"]
        : ["💗", `${name} wins!`, "Good game, so close 💗"];
      LN.ui.modal({ icon: t[0], title: t[1], text: t[2], tone: "win", buttons: [{ label: "Lovely 💗", value: true, kind: "primary" }], dismiss: true });
    } catch (e) { console.error(e); }
  };

  /* watch a game board: cells that changed get a little pop + sound; a finished game is celebrated once */
  fx.watch = (box, S, key, opts) => {
    const SEL = ".c4cell,.rvc,.sq,.tc,.uc,.lt,.die";
    let prev = null, queued = false, shown = !!kit.outcome(key, S.st);
    const snap = () => Array.from(box.querySelectorAll(SEL), (n) => n.innerHTML);
    const check = () => {
      queued = false;
      if (!document.body.contains(box)) return mo.disconnect();
      const cells = box.querySelectorAll(SEL), cur = snap();
      if (prev && prev.length === cur.length) {
        let n = 0;
        cur.forEach((h, i) => { if (h !== prev[i]) { n++; cells[i].classList.remove("pop"); void cells[i].offsetWidth; cells[i].classList.add("pop"); } });
        if (n && n < 8) fx.pop();
      }
      prev = cur;
      const o = kit.outcome(key, S.st);
      if (o && !shown) { shown = true; setTimeout(() => fx.celebrate(o, opts), 650); }
      if (!o) shown = false;
    };
    const mo = new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(check); } });
    mo.observe(box, { childList: true, subtree: true });
    prev = snap();
  };

  /* who won? returns "a" | "b" | "draw", or null while the game is still going */
  kit.outcome = (key, st) => {
    if (key === "chess") {
      const r = LN.engines.chess.status(st);
      return r.state === "mate" ? (st.t === "w" ? "b" : "a") : r.state === "stalemate" || r.state === "draw" ? "draw" : null;
    }
    return st.winner || null;
  };

  /* save a finished game to the results list (League table + recent results) */
  kit.record = async (key, o, opts, st) => {
    try {
      const me = LN.ctx.who;
      const cpu = !!opts.cpu;
      await LN.db.add("results", {
        game: key === "ttt2" ? "ttt" : key,
        mode: cpu ? "cpu" : "pvp",
        level: cpu ? opts.level || 2 : 0,
        winner: o === "draw" ? "draw" : cpu ? (o === "a" ? me : "cpu") : o,
        author: me,
        detail: st && st.mode ? String(st.mode) : ""
      });
    } catch (e) { console.error("result not saved", e); }
  };
  kit.namer = (cpu) => (w) => (cpu ? (w === "a" ? LN.ctx.name(LN.ctx.who) : "Computer 🤖") : LN.ctx.name(w));

  /* "Who do you want to play against?" */
  kit.chooser = (box) =>
    new Promise((resolve) => {
      const U = LN.util, P = LN.presence, off = !!LN.offlineOnly;
      box.innerHTML = `<div class="card chooser"><h3>Who do you want to play against?</h3>
        <button class="opt" data-m="partner" ${off ? "disabled" : ""}><span class="oi">👫</span><span class="ot"><b>${U.esc(LN.ctx.name(LN.ctx.other))}</b><small id="pstat"></small></span></button>
        <div class="opt cpu"><span class="oi">🤖</span><span class="ot"><b>The computer</b><small>Works with no internet</small></span>
          <span class="lv"><button class="btn small ghost" data-l="1">Easy</button><button class="btn small ghost" data-l="2">Medium</button><button class="btn small" data-l="3">Hard</button></span></div></div>`;
      const upd = () => {
        const el = U.$("#pstat", box);
        if (!el) return unsub();
        const t = off ? { cls: "off", text: "Needs an internet connection" } : P.text();
        el.textContent = t.text; el.className = t.cls;
      };
      const unsub = P.on(upd);
      upd();
      box.onclick = (e) => {
        const b = e.target.closest("button");
        if (!b || b.disabled) return;
        if (b.dataset.m === "partner") { unsub(); box.onclick = null; resolve({ cpu: false }); }
        else if (b.dataset.l) { unsub(); box.onclick = null; resolve({ cpu: true, level: +b.dataset.l }); }
      };
    });

  /* Fair dice / random numbers */
  kit.rand = (n) => {
    if (window.crypto && crypto.getRandomValues) {
      const a = new Uint32Array(1);
      const lim = Math.floor(4294967296 / n) * n;
      do crypto.getRandomValues(a); while (a[0] >= lim);
      return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  };
})();
