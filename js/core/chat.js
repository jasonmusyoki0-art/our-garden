/* 💬 Chat. One shared message list that powers the Chat page AND the floating chat bubble that lives on every page.
   Features: replies (drag a message right, or use the ⋯ menu), emoji reactions, "seen" ticks, unread badge.
   We fetch the newest messages every few seconds (by order, not clock time, so a wrong phone clock can't hide anything). */
(function () {
  const LN = window.LN, U = LN.util;
  const C = (LN.chat = { msgs: [], unread: 0, missing: false, failed: false, otherSeen: "", replyTo: null, _cb: [] });
  const mounts = new Set(); // chats currently on screen
  const vis = () => { mounts.forEach((b) => { if (!document.body.contains(b)) mounts.delete(b); }); return mounts.size; };
  const KEY = "ln_chat_seen";
  const MAX = 1000;
  const REACT = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
  let seen = new Set(), pending = [], busy = false, tick = 0, started = false, primed = false, mySeenT = "";
  try { seen = new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch (e) {}
  const saveSeen = () => { try { localStorage.setItem(KEY, JSON.stringify([...seen].slice(-400))); } catch (e) {} };

  C.on = (cb) => { C._cb.push(cb); return () => { C._cb = C._cb.filter((x) => x !== cb); }; };
  const emit = () => C._cb.slice().forEach((cb) => { try { cb(C); } catch (e) {} });
  C.enabled = () => !LN.offlineOnly && !!LN.ctx.who;

  /* the other person's messages I have now looked at: remember locally, and tell her/him ("seen") */
  const markSeen = () => {
    let changed = false, newest = "";
    C.msgs.forEach((m) => {
      if (m.author === LN.ctx.who) return;
      if (!seen.has(m.id)) { seen.add(m.id); changed = true; }
      if (!newest || m.created_at > newest) newest = m.created_at;
    });
    if (changed) saveSeen();
    C.unread = 0;
    if (newest && newest > mySeenT && LN.db.mode === "cloud") {
      mySeenT = newest;
      LN.db.kvSet("chatseen:" + LN.ctx.who, { t: newest }).catch(() => {});
    }
  };

  async function poll(force) {
    if (busy || !C.enabled() || (document.hidden && !force)) return;
    busy = true;
    try {
      const rows = (await LN.db.recent("messages", 150)).slice().reverse(); // oldest first
      const ids = new Set(rows.map((r) => r.id));
      pending = pending.filter((p) => !ids.has(p.id));
      C.msgs = rows.concat(pending);
      C.missing = false; C.failed = false;
      if (LN.db.mode === "cloud") {
        try { const v = await LN.db.kvGet("chatseen:" + LN.ctx.other); C.otherSeen = (v && v.t) || ""; } catch (e) {}
      }
      if (!primed) {
        primed = true;
        if (!seen.size) C.msgs.forEach((m) => seen.add(m.id)); // brand new phone: don't announce the whole history
      }
      const fresh = C.msgs.filter((m) => m.author !== LN.ctx.who && !seen.has(m.id));
      if (vis() > 0) markSeen();
      else {
        if (fresh.length > C.unread) {
          const m = fresh[fresh.length - 1];
          U.toast(`💬 ${LN.ctx.name(m.author)}: ${m.text.length > 60 ? m.text.slice(0, 60) + "…" : m.text}`);
        }
        C.unread = fresh.length;
      }
    } catch (e) {
      const msg = String((e && (e.message || e.code)) || "");
      if (/messages|PGRST205|42P01|relation/i.test(msg)) C.missing = true; else C.failed = true;
    }
    busy = false;
    emit();
  }
  C.poll = poll;

  C.send = async (text) => {
    text = String(text || "").trim().slice(0, MAX);
    if (!text) return false;
    const m = { id: U.uuid(), created_at: new Date().toISOString(), author: LN.ctx.who, text, pending: true };
    if (C.replyTo) m.reply_to = C.replyTo.id;
    pending.push(m); C.msgs = C.msgs.concat(m); C.replyTo = null; emit();
    try {
      const { pending: _p, ...row } = m;
      await LN.db.add("messages", row);
      poll(true);
      return true;
    } catch (e) {
      pending = pending.filter((p) => p.id !== m.id);
      C.msgs = C.msgs.filter((x) => x.id !== m.id); emit();
      const bad = String(e && (e.message || e.code)).match(/messages|relation|reply_to|column/i);
      U.toast(bad ? "Chat needs a one-time Supabase update (see the README)" : "Couldn't send. Check your internet.");
      return false;
    }
  };
  C.remove = async (m) => {
    try { await LN.db.remove("messages", m.id); C.msgs = C.msgs.filter((x) => x.id !== m.id); emit(); } catch (e) { U.toast("Couldn't delete"); }
  };
  /* tap a reaction: set mine, or tap the same one again to take it back */
  C.react = async (m, emoji) => {
    const who = LN.ctx.who;
    const apply = (r) => { const o = { ...(r || {}) }; if (o[who] === emoji) delete o[who]; else o[who] = emoji; return o; };
    const local = C.msgs.find((x) => x.id === m.id); if (!local) return;
    const before = local.reactions;
    local.reactions = apply(local.reactions); emit();
    try {
      const cur = await LN.db.get("messages", m.id); // re-read so we don't wipe the other person's reaction
      await LN.db.update("messages", m.id, { reactions: apply(cur && cur.reactions) });
      poll(true);
    } catch (e) { local.reactions = before; emit(); U.toast("Reactions need a one-time Supabase update (see the README)"); }
  };
  C.reply = (m) => { C.replyTo = m; emit(); };

  /* runs for the whole visit: quick polling while a chat is on screen, slow polling (for the badge) otherwise */
  C.watch = () => {
    if (started || !C.enabled()) return;
    started = true;
    setInterval(() => { tick++; if (vis() > 0 || tick % 4 === 0) poll(); }, 3000);
    document.addEventListener("visibilitychange", () => !document.hidden && poll());
    poll();
  };

  const dayLabel = (iso) => {
    const d = new Date(iso), t = new Date(), y = new Date(Date.now() - 864e5);
    const same = (a, b) => a.toDateString() === b.toDateString();
    return same(d, t) ? "Today" : same(d, y) ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  };
  const timeLabel = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const QUICK = ["💗", "😘", "😂", "🥺", "🌸", "Miss you", "Your move!", "Good game 🎉"];
  const snip = (t) => (t.length > 70 ? t.slice(0, 70) + "…" : t);

  /* put a chat into `box`. Returns a function that stops it. */
  C.mount = (box) => {
    if (!C.enabled()) return () => {};
    const other = LN.ctx.name(LN.ctx.other), P = LN.presence;
    box.classList.add("chat");
    box.innerHTML = `<div class="cwho"></div>
      <div class="cmsgs" role="log" aria-live="polite"></div>
      <p class="cnote muted" hidden></p>
      <div class="cquick">${QUICK.map((q) => `<button type="button" class="cq" data-q="${U.esc(q)}">${U.esc(q)}</button>`).join("")}</div>
      <div class="creply" hidden><span class="crtxt"></span><button type="button" class="crx" aria-label="Cancel reply">✕</button></div>
      <form class="cform"><input class="cin" maxlength="${MAX}" autocomplete="off" placeholder="Say something sweet to ${U.esc(other)}…" aria-label="Message"><button class="btn small csend" aria-label="Send">💗</button></form>`;
    const list = U.$(".cmsgs", box), note = U.$(".cnote", box), input = U.$(".cin", box), who = U.$(".cwho", box), rbar = U.$(".creply", box);
    let live = true, lastSig = "", menu = null;
    mounts.add(box);

    const closeMenu = () => { if (menu) { menu.remove(); menu = null; } };
    const flash = (id) => {
      const el = list.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1200); }
    };

    function openMenu(m, bubble) {
      closeMenu();
      menu = document.createElement("div");
      menu.className = "cmenu";
      const mine = m.author === LN.ctx.who;
      menu.innerHTML = `<div class="cemo">${REACT.map((e) => `<button type="button" data-e="${e}">${e}</button>`).join("")}</div>
        <div class="cact"><button type="button" data-a="reply">↩ Reply</button><button type="button" data-a="copy">⧉ Copy</button>${mine ? '<button type="button" data-a="del">🗑 Delete</button>' : ""}</div>`;
      menu.onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.e) C.react(m, b.dataset.e);
        else if (b.dataset.a === "reply") { C.reply(m); setTimeout(() => input.focus(), 30); }
        else if (b.dataset.a === "copy") { try { navigator.clipboard.writeText(m.text); U.toast("Copied"); } catch (er) {} }
        else if (b.dataset.a === "del" && U.confirm("Delete this message?")) C.remove(m);
        closeMenu();
      };
      bubble.appendChild(menu);
      if (bubble.getBoundingClientRect().top - list.getBoundingClientRect().top < 120) { menu.style.bottom = "auto"; menu.style.top = "calc(100% + 6px)"; } // near the top: open downwards
    }
    const outside = (e) => { if (menu && !e.target.closest(".cmenu, .cmore")) closeMenu(); };
    document.addEventListener("pointerdown", outside);

    /* drag a message to the right to reply (like WhatsApp); hold it for the menu */
    function wire(b, m) {
      let x0 = 0, y0 = 0, dx = 0, drag = false, track = false, hold = null;
      b.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button, .cmenu, .cquote")) return;
        x0 = e.clientX; y0 = e.clientY; dx = 0; track = true; drag = false;
        hold = setTimeout(() => { if (!drag) { track = false; openMenu(m, b); } }, 480);
      });
      b.addEventListener("pointermove", (e) => {
        if (!track) return;
        const mx = e.clientX - x0, my = e.clientY - y0;
        if (!drag && Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.5 && mx > 0) { drag = true; clearTimeout(hold); try { b.setPointerCapture(e.pointerId); } catch (er) {} }
        if (drag) { dx = Math.max(0, Math.min(mx, 80)); b.style.transform = `translateX(${dx}px)`; b.classList.toggle("armed", dx > 55); }
      });
      const end = () => {
        clearTimeout(hold);
        if (drag && dx > 55) { C.reply(m); setTimeout(() => input.focus(), 30); }
        b.style.transform = ""; b.classList.remove("armed"); track = false; drag = false;
      };
      b.addEventListener("pointerup", end);
      b.addEventListener("pointercancel", end);
      b.addEventListener("contextmenu", (e) => { e.preventDefault(); openMenu(m, b); });
    }

    const paintReply = () => {
      rbar.hidden = !C.replyTo;
      if (C.replyTo) U.$(".crtxt", box).textContent = `↩ Replying to ${LN.ctx.name(C.replyTo.author)}: ${snip(C.replyTo.text)}`;
    };
    const paintWho = () => {
      if (LN.db.mode !== "cloud") { who.textContent = ""; return; }
      who.innerHTML = P.online ? `<i class="dot on"></i> ${U.esc(other)} is online` : `<i class="dot"></i> ${U.esc(other)} · ${U.esc(P.seenText())}`;
    };

    const paint = () => {
      if (!live) return;
      if (!document.body.contains(box)) return stop();
      markSeen(); paintReply(); paintWho();
      note.hidden = !(C.missing || LN.db.mode !== "cloud");
      note.textContent = C.missing ? "Chat isn't set up in Supabase yet. Run supabase/add-chat-and-results.sql once (see the README)." : LN.db.mode !== "cloud" ? "Chat connects the two of you once the cloud is set up. For now it's just notes to yourself." : "";
      const sig = C.msgs.map((m) => m.id + (m.pending ? "p" : "") + JSON.stringify(m.reactions || "")).join(",") + "|" + C.otherSeen;
      if (sig === lastSig) return;
      lastSig = sig;
      closeMenu();
      const nearEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 90 || !list.children.length;
      const byId = new Map(C.msgs.map((m) => [m.id, m]));
      // the last of my messages that has been seen gets a "Seen" label
      let lastSeenId = "";
      C.msgs.forEach((m) => { if (m.author === LN.ctx.who && !m.pending && C.otherSeen && m.created_at <= C.otherSeen) lastSeenId = m.id; });
      list.textContent = "";
      if (!C.msgs.length) { const p = document.createElement("p"); p.className = "empty"; p.textContent = "No messages yet. Say hi 🌷"; list.appendChild(p); }
      let day = "";
      C.msgs.forEach((m) => {
        const dl = dayLabel(m.created_at);
        if (dl !== day) { day = dl; const s = document.createElement("div"); s.className = "cday"; s.textContent = dl; list.appendChild(s); }
        const mine = m.author === LN.ctx.who;
        const b = document.createElement("div");
        b.className = `cmsg by-${m.author} ${mine ? "mine" : "theirs"}${m.pending ? " pend" : ""}`;
        b.dataset.id = m.id;
        if (m.reply_to) {
          const o = byId.get(m.reply_to);
          const q = document.createElement("button");
          q.type = "button"; q.className = "cquote";
          q.textContent = o ? `${LN.ctx.name(o.author)}: ${snip(o.text)}` : "Original message";
          q.onclick = () => o && flash(o.id);
          b.appendChild(q);
        }
        const t = document.createElement("span"); t.className = "ctext"; t.textContent = m.text;
        const tm = document.createElement("small");
        let tick2 = "";
        if (mine) tick2 = m.pending ? " 🕓" : C.otherSeen && m.created_at <= C.otherSeen ? " ✓✓" : " ✓";
        tm.textContent = timeLabel(m.created_at) + tick2 + (m.id === lastSeenId ? " · Seen" : "");
        if (m.id === lastSeenId) tm.className = "seenl";
        b.append(t, tm);
        const rx = m.reactions && Object.keys(m.reactions);
        if (rx && rx.length) {
          const r = document.createElement("div"); r.className = "creacts";
          const groups = {};
          rx.forEach((w) => { (groups[m.reactions[w]] = groups[m.reactions[w]] || []).push(w); });
          Object.keys(groups).forEach((e) => {
            const c = document.createElement("button");
            c.type = "button"; c.className = "creact" + (groups[e].includes(LN.ctx.who) ? " me" : "");
            c.textContent = e + (groups[e].length > 1 ? " " + groups[e].length : "");
            c.title = groups[e].map((w) => LN.ctx.name(w)).join(", ");
            c.onclick = () => C.react(m, e);
            r.appendChild(c);
          });
          b.appendChild(r);
        }
        if (!m.pending) {
          const more = document.createElement("button");
          more.type = "button"; more.className = "cmore"; more.setAttribute("aria-label", "Message options"); more.textContent = "⋯";
          more.onclick = (e) => { e.stopPropagation(); menu && menu.parentNode === b ? closeMenu() : openMenu(m, b); };
          b.appendChild(more);
          wire(b, m);
        }
        list.appendChild(b);
      });
      if (nearEnd || (C.msgs.length && C.msgs[C.msgs.length - 1].author === LN.ctx.who)) list.scrollTop = list.scrollHeight;
    };
    const unsub = C.on(paint);
    const stop = () => { if (!live) return; live = false; mounts.delete(box); unsub(); document.removeEventListener("pointerdown", outside); closeMenu(); };
    const unP = P.on(paintWho);

    U.$(".crx", box).onclick = () => { C.replyTo = null; paintReply(); };
    U.$(".cform", box).onsubmit = (e) => { e.preventDefault(); const v = input.value; if (v.trim()) { input.value = ""; C.send(v).then((ok) => { if (!ok) input.value = v; }); } };
    U.$(".cquick", box).onclick = (e) => { const b = e.target.closest("[data-q]"); if (b) C.send(b.dataset.q); };
    paint();
    poll(true);
    return () => { stop(); unP(); };
  };

  /* the floating 💬 bubble. Lives on every page (not on the Chat page itself, where the chat is already open). */
  C.dock = () => {
    if (!C.enabled() || LN.db.mode !== "cloud" || document.querySelector(".cdock")) return;
    const wrap = document.createElement("div");
    wrap.className = "cdock";
    wrap.innerHTML = `<button class="cfab" aria-label="Open chat" aria-expanded="false">💬<span class="nbadge" hidden></span></button>
      <div class="csheet" hidden><div class="chead"><b>${U.esc(LN.ctx.name(LN.ctx.other))} 💗</b><button class="cclose" aria-label="Close chat">✕</button></div><div class="cbody"></div></div>`;
    document.body.appendChild(wrap);
    const fab = U.$(".cfab", wrap), sheet = U.$(".csheet", wrap), badge = U.$(".nbadge", wrap), body = U.$(".cbody", wrap);
    let stop = null;
    const close = () => { sheet.hidden = true; fab.setAttribute("aria-expanded", "false"); if (stop) { stop(); stop = null; } };
    const open = () => { sheet.hidden = false; fab.setAttribute("aria-expanded", "true"); stop = C.mount(body); setTimeout(() => { const i = U.$(".cin", body); if (i && innerWidth > 700) i.focus(); }, 50); };
    fab.onclick = () => (sheet.hidden ? open() : close());
    U.$(".cclose", wrap).onclick = close;
    window.addEventListener("hashchange", () => { if (location.hash === "#chat") close(); });
    C.on(() => { badge.hidden = !C.unread || !sheet.hidden; badge.textContent = C.unread > 9 ? "9+" : C.unread; });
  };
})();
