/* 💬 Chat. One shared message list that powers both the Chat page and the little chat bubble inside games.
   Every few seconds we fetch the newest messages (by order, not by clock time, so a wrong phone clock can't hide anything). */
(function () {
  const LN = window.LN, U = LN.util;
  const C = (LN.chat = { msgs: [], unread: 0, missing: false, failed: false, _cb: [] });
  const mounts = new Set(); // chats currently on screen
  const vis = () => { mounts.forEach((b) => { if (!document.body.contains(b)) mounts.delete(b); }); return mounts.size; };
  const KEY = "ln_chat_seen";
  const MAX = 1000;
  let seen = new Set(), pending = [], busy = false, tick = 0, started = false, primed = false;
  try { seen = new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch (e) {}
  const saveSeen = () => { try { localStorage.setItem(KEY, JSON.stringify([...seen].slice(-400))); } catch (e) {} };

  C.on = (cb) => { C._cb.push(cb); return () => { C._cb = C._cb.filter((x) => x !== cb); }; };
  const emit = () => C._cb.slice().forEach((cb) => { try { cb(C); } catch (e) {} });
  C.enabled = () => !LN.offlineOnly && !!LN.ctx.who;

  const markSeen = () => {
    let changed = false;
    C.msgs.forEach((m) => { if (!seen.has(m.id)) { seen.add(m.id); changed = true; } });
    if (changed) saveSeen();
    C.unread = 0;
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
    pending.push(m); C.msgs = C.msgs.concat(m); emit();
    try {
      const { pending: _p, ...row } = m;
      await LN.db.add("messages", row);
      poll(true);
      return true;
    } catch (e) {
      pending = pending.filter((p) => p.id !== m.id);
      C.msgs = C.msgs.filter((x) => x.id !== m.id); emit();
      U.toast(String(e && e.message).match(/messages|relation/i) ? "Chat isn't set up in Supabase yet (see the README)" : "Couldn't send. Check your internet.");
      return false;
    }
  };
  C.remove = async (m) => {
    try { await LN.db.remove("messages", m.id); C.msgs = C.msgs.filter((x) => x.id !== m.id); emit(); } catch (e) { U.toast("Couldn't delete"); }
  };

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

  /* put a chat into `box`. Returns a function that stops it. */
  C.mount = (box, opts = {}) => {
    if (!C.enabled()) return () => {};
    const other = LN.ctx.name(LN.ctx.other);
    box.classList.add("chat");
    box.innerHTML = `<div class="cmsgs" role="log" aria-live="polite"></div>
      <p class="cnote muted" hidden></p>
      <div class="cquick">${QUICK.map((q) => `<button type="button" class="cq" data-q="${U.esc(q)}">${U.esc(q)}</button>`).join("")}</div>
      <form class="cform"><input class="cin" maxlength="${MAX}" autocomplete="off" placeholder="Say something sweet to ${U.esc(other)}…" aria-label="Message"><button class="btn small csend" aria-label="Send">💗</button></form>`;
    const list = U.$(".cmsgs", box), note = U.$(".cnote", box), input = U.$(".cin", box);
    let live = true, lastCount = -1, lastSig = "";
    mounts.add(box);

    const paint = () => {
      if (!live) return;
      if (!document.body.contains(box)) return stop();
      markSeen();
      note.hidden = !(C.missing || (LN.db.mode !== "cloud"));
      note.textContent = C.missing ? "Chat isn't set up in Supabase yet. Run supabase/add-chat-and-results.sql once (see the README)." : LN.db.mode !== "cloud" ? "Chat connects the two of you once the cloud is set up. For now it's just notes to yourself." : "";
      const sig = C.msgs.map((m) => m.id + (m.pending ? "p" : "")).join(",");
      if (sig === lastSig) return;
      lastSig = sig;
      const nearEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 80 || lastCount < 0;
      list.textContent = "";
      if (!C.msgs.length) { const p = document.createElement("p"); p.className = "empty"; p.textContent = "No messages yet. Say hi 🌷"; list.appendChild(p); }
      let day = "";
      C.msgs.forEach((m) => {
        const dl = dayLabel(m.created_at);
        if (dl !== day) { day = dl; const s = document.createElement("div"); s.className = "cday"; s.textContent = dl; list.appendChild(s); }
        const mine = m.author === LN.ctx.who;
        const b = document.createElement("div");
        b.className = "cmsg " + (mine ? "mine" : "theirs") + (m.pending ? " pend" : "");
        const t = document.createElement("span"); t.className = "ctext"; t.textContent = m.text;
        const tm = document.createElement("small"); tm.textContent = timeLabel(m.created_at) + (m.pending ? " · sending…" : "");
        b.append(t, tm);
        if (mine && !m.pending) {
          const x = document.createElement("button");
          x.type = "button"; x.className = "cdel"; x.setAttribute("aria-label", "Delete message"); x.textContent = "✕";
          x.onclick = () => { if (U.confirm("Delete this message?")) C.remove(m); };
          b.appendChild(x);
        }
        list.appendChild(b);
      });
      if (nearEnd || (C.msgs.length && C.msgs[C.msgs.length - 1].author === LN.ctx.who)) list.scrollTop = list.scrollHeight;
      lastCount = C.msgs.length;
    };
    const unsub = C.on(paint);
    const stop = () => { if (!live) return; live = false; mounts.delete(box); unsub(); };

    const send = async (txt) => { if (await C.send(txt)) { input.value = ""; } };
    U.$(".cform", box).onsubmit = (e) => { e.preventDefault(); const v = input.value; if (v.trim()) { input.value = ""; C.send(v).then((ok) => { if (!ok) input.value = v; }); } };
    U.$(".cquick", box).onclick = (e) => {
      const b = e.target.closest("[data-q]"); if (!b) return;
      C.send(b.dataset.q);
    };
    void send;
    paint();
    poll(true);
    return stop;
  };

  /* the floating 💬 bubble used inside games. Lives inside `host`, so it disappears when you leave the page. */
  C.dock = (host) => {
    if (!C.enabled() || LN.db.mode !== "cloud") return;
    const wrap = document.createElement("div");
    wrap.className = "cdock";
    wrap.innerHTML = `<button class="cfab" aria-label="Open chat" aria-expanded="false">💬<span class="nbadge" hidden></span></button>
      <div class="csheet" hidden><div class="chead"><b>${U.esc(LN.ctx.name(LN.ctx.other))} 💗</b><button class="cclose" aria-label="Close chat">✕</button></div><div class="cbody"></div></div>`;
    host.appendChild(wrap);
    const fab = U.$(".cfab", wrap), sheet = U.$(".csheet", wrap), badge = U.$(".nbadge", wrap), body = U.$(".cbody", wrap);
    let stop = null;
    const close = () => { sheet.hidden = true; fab.setAttribute("aria-expanded", "false"); if (stop) { stop(); stop = null; } };
    const open = () => { sheet.hidden = false; fab.setAttribute("aria-expanded", "true"); stop = C.mount(body); setTimeout(() => { const i = U.$(".cin", body); if (i && innerWidth > 700) i.focus(); }, 50); };
    fab.onclick = () => (sheet.hidden ? open() : close());
    U.$(".cclose", wrap).onclick = close;
    const unsub = C.on(() => {
      if (!document.body.contains(wrap)) { if (stop) stop(); return unsub(); }
      badge.hidden = !C.unread || !sheet.hidden;
      badge.textContent = C.unread > 9 ? "9+" : C.unread;
    });
  };
})();
