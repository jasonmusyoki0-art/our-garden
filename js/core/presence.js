/* 🟢 Who's online? Each phone writes a tiny "I'm here" heartbeat; the other phone watches it.
   (Cloud mode only. Nothing is stored except a counter and the name of the game you're in.) */
(function () {
  const LN = window.LN, U = LN.util;
  const P = (LN.presence = { online: false, game: "", known: false, _cb: [] });
  let n = 0, seen = null, lastChange = 0, first = true, myGame = "", started = false;

  P.on = (cb) => { P._cb.push(cb); return () => (P._cb = P._cb.filter((x) => x !== cb)); };
  const emit = () => P._cb.slice().forEach((cb) => { try { cb(P); } catch (e) {} });
  P.enabled = () => LN.db.mode === "cloud" && !LN.offlineOnly;

  async function beat(off) {
    if (!P.enabled() || !LN.ctx.who) return;
    if (document.hidden && !off) return; // a background tab doesn't count as "online"
    try { await LN.db.kvSet("presence:" + LN.ctx.who, { n: ++n, game: myGame, off: !!off, t: Date.now() }); } catch (e) {}
  }
  P.setGame = (g) => { if (myGame !== (g || "")) { myGame = g || ""; beat(); } };

  async function poll() {
    if (!P.enabled() || document.hidden) return;
    let v = null;
    try { v = await LN.db.kvGet("presence:" + LN.ctx.other); } catch (e) { return; }
    const now = Date.now(), was = P.online;
    let on = false, game = "";
    if (v && !v.off) {
      const sig = v.n + "|" + v.t;
      if (seen === null) { seen = sig; lastChange = now - (now - v.t < 30000 ? 0 : 999999); } // first look: trust a fresh timestamp
      else if (sig !== seen) { seen = sig; lastChange = now; }
      on = now - lastChange < 40000;
      game = on ? v.game || "" : "";
    } else if (v && v.off) seen = null;
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

  /* A friendly sentence about the partner for the Play pages */
  P.text = () => {
    const name = LN.ctx.name(LN.ctx.other);
    if (LN.db.mode !== "cloud") return { cls: "local", text: "Same device · pass the phone" };
    if (!P.known) return { cls: "", text: "Checking if " + name + " is online…" };
    return P.online ? { cls: "on", text: `${name} is online 🟢` } : { cls: "off", text: `${name} is offline ⚪ · moves are saved for when she's back` };
  };
})();
