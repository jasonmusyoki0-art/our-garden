/* 🟢 Who's online? Each phone writes a tiny "I'm here" heartbeat; the other phone watches it.
   (Cloud mode only. Nothing is stored except a counter and the name of the game you're in.) */
(function () {
  const LN = window.LN, U = LN.util;
  const P = (LN.presence = { online: false, game: "", known: false, lastSeen: 0, _cb: [] });
  let n = 0, first = true, myGame = "", started = false;
  const seenMap = {}; // per device of the other person: what we last saw and when it changed
  /* every phone / computer gets its own little id, so as many devices as you like can be signed in at once */
  const dev = (() => { try { let d = localStorage.getItem("ln_dev"); if (!d) { d = Math.random().toString(36).slice(2, 8); localStorage.setItem("ln_dev", d); } return d; } catch (e) { return Math.random().toString(36).slice(2, 8); } })();

  P.on = (cb) => { P._cb.push(cb); return () => (P._cb = P._cb.filter((x) => x !== cb)); };
  const emit = () => P._cb.slice().forEach((cb) => { try { cb(P); } catch (e) {} });
  P.enabled = () => LN.db.mode === "cloud" && !LN.offlineOnly;

  async function beat(off) {
    if (!P.enabled() || !LN.ctx.who) return;
    if (document.hidden && !off) return; // a background tab doesn't count as "online"
    try { await LN.db.kvSet("presence:" + LN.ctx.who + ":" + dev, { n: ++n, game: myGame, off: !!off, t: Date.now() }); } catch (e) {}
  }
  P.setGame = (g) => { if (myGame !== (g || "")) { myGame = g || ""; beat(); } };

  async function poll() {
    if (!P.enabled() || document.hidden) return;
    let rows = [];
    try { rows = await LN.db.kvList("presence:" + LN.ctx.other + ":"); } catch (e) { return; }
    const now = Date.now(), was = P.online;
    let on = false, game = "", newest = 0, bestT = 0;
    rows.forEach((r) => {
      const v = r.value; if (!v || !v.t || now - v.t > 7 * 864e5) return;
      newest = Math.max(newest, v.t);
      const m = seenMap[r.key] || (seenMap[r.key] = { sig: null, change: 0 });
      if (v.off) { m.sig = null; return; }
      const sig = v.n + "|" + v.t;
      if (m.sig === null) { m.sig = sig; m.change = now - v.t < 30000 ? now : 0; }   // first look: trust a fresh timestamp
      else if (sig !== m.sig) { m.sig = sig; m.change = now; }
      if (now - m.change < 40000) { on = true; if (v.t >= bestT) { bestT = v.t; game = v.game || ""; } }
    });
    if (newest) P.lastSeen = newest;
    P.online = on; P.game = game; P.known = true;
    if (!first && on && !was && LN.ctx.who) U.toast(`💗 ${LN.ctx.name(LN.ctx.other)} just came online`);
    first = false;
    emit();
  }

  P.start = () => {
    if (started || !P.enabled()) return;
    started = true;
    beat(); poll();
    setInterval(beat, 12000);
    setInterval(poll, 6000);
    document.addEventListener("visibilitychange", () => { if (document.hidden) beat(true); else { beat(); poll(); } });
    addEventListener("pagehide", () => beat(true));
  };

  /* "last seen today 14:02" for the header and the chat */
  P.seenText = () => {
    if (!P.lastSeen) return "offline";
    const d = new Date(P.lastSeen), n = new Date(), y = new Date(Date.now() - 864e5);
    const tm = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (d.toDateString() === n.toDateString()) return "last seen " + tm;
    if (d.toDateString() === y.toDateString()) return "last seen yesterday " + tm;
    return "last seen " + d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  /* A friendly sentence about the partner for the Play pages */
  P.text = () => {
    const name = LN.ctx.name(LN.ctx.other);
    if (LN.db.mode !== "cloud") return { cls: "local", text: "Same device · pass the phone" };
    if (!P.known) return { cls: "", text: "Checking if " + name + " is online…" };
    return P.online ? { cls: "on", text: `${name} is online 🟢` } : { cls: "off", text: `${name} is offline ⚪ · moves are saved for when she's back` };
  };
})();
