/* 🏓 Pong (ping-pong tennis). Drag your paddle left and right. First to 7 wins.
   With her: it is LIVE. Jason's phone runs the game and both phones talk through a tiny live line (nothing is saved except the final result).
   Against the computer: works offline. You are always the bottom paddle. */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.games = LN.games || {};
  const W = 300, H = 450, PW = 64, PH = 9, BR = 7, WIN = 7;
  const YA = H - 22, YB = 22 - PH; // bottom paddle top edge, top paddle top edge
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* the physics: used by the host phone and by the computer game */
  function newGame() { return { bx: W / 2, by: H / 2, vx: 0, vy: 0, xa: W / 2, xb: W / 2, sa: 0, sb: 0, hold: 1.2, speed: 250, over: "", toward: 1 }; }
  function serve(g, dir) { const ang = (Math.random() * 0.8 - 0.4); g.bx = W / 2; g.by = H / 2; g.speed = 250; g.vx = Math.sin(ang) * g.speed; g.vy = Math.cos(ang) * g.speed * dir; g.hold = 1.1; g.toward = dir; }
  function step(g, dt) {
    if (g.over) return;
    if (g.hold > 0) { g.hold -= dt; return; }
    g.bx += g.vx * dt; g.by += g.vy * dt;
    if (g.bx < BR) { g.bx = BR; g.vx = Math.abs(g.vx); } else if (g.bx > W - BR) { g.bx = W - BR; g.vx = -Math.abs(g.vx); }
    // bottom paddle (a)
    if (g.vy > 0 && g.by + BR >= YA && g.by - BR <= YA + PH && Math.abs(g.bx - g.xa) <= PW / 2 + BR) hit(g, g.xa, -1);
    // top paddle (b)
    else if (g.vy < 0 && g.by - BR <= YB + PH && g.by + BR >= YB && Math.abs(g.bx - g.xb) <= PW / 2 + BR) hit(g, g.xb, 1);
    if (g.by > H + 20) { g.sb++; point(g, 1); } else if (g.by < -20) { g.sa++; point(g, -1); }
  }
  function hit(g, px, dir) {
    g.speed = Math.min(520, g.speed * 1.05);
    const off = clamp((g.bx - px) / (PW / 2), -1, 1);
    g.vx = off * g.speed * 0.8; g.vy = dir * Math.sqrt(Math.max(g.speed * g.speed - g.vx * g.vx, (g.speed * 0.5) ** 2));
    g.by = dir < 0 ? YA - BR - 1 : YB + PH + BR + 1;
  }
  function point(g, dir) { if (g.sa >= WIN) g.over = "a"; else if (g.sb >= WIN) g.over = "b"; else serve(g, dir); }

  /* drawing: "me" is always at the bottom. `flip` rotates the picture for the guest. */
  function draw(cv, g, flip, myKey, names) {
    const x = cv.getContext("2d"), s = cv.width / W;
    x.setTransform(s, 0, 0, s, 0, 0);
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#fff0f6"); bg.addColorStop(1, "#ffe3ee");
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.strokeStyle = "rgba(232,80,138,.25)"; x.setLineDash([8, 8]); x.lineWidth = 2; x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke(); x.setLineDash([]);
    const P = (px, py) => (flip ? [W - px, H - py] : [px, py]);
    const col = { a: "#7a46b5", b: "#e8508a" };
    const pad = (px, y, c) => { const [qx, qy] = P(px, y + PH / 2); x.fillStyle = c; x.beginPath(); if (x.roundRect) x.roundRect(qx - PW / 2, qy - PH / 2, PW, PH, 5); else x.rect(qx - PW / 2, qy - PH / 2, PW, PH); x.fill(); };
    pad(g.xa, YA, col.a); pad(g.xb, YB, col.b);
    const [bx, by] = P(g.bx, g.by);
    x.shadowColor = "rgba(232,80,138,.6)"; x.shadowBlur = 10; x.fillStyle = "#fff"; x.beginPath(); x.arc(bx, by, BR, 0, 7); x.fill(); x.shadowBlur = 0;
    x.fillStyle = "rgba(90,42,69,.55)"; x.font = "700 13px sans-serif"; x.textAlign = "left";
    const mine = myKey === "a" ? [g.sa, g.sb] : [g.sb, g.sa];
    x.fillText(`${names.top}  ${mine[1]}`, 10, 18); x.fillText(`${names.me}  ${mine[0]}`, 10, H - 10);
    if (g.hold > 0 && !g.over) { x.textAlign = "center"; x.font = "800 22px sans-serif"; x.fillStyle = "rgba(232,80,138,.85)"; x.fillText("Get ready…", W / 2, H / 2 - 24); }
  }

  LN.games.pong = {
    icon: "🏓", name: "Ping-Pong", desc: "Live paddle battle. First to 7 wins!",
    tut: [
      { icon: "🏓", title: "The goal", text: "Bounce the ball past your partner's paddle. First to 7 points wins. You are always the paddle at the bottom." },
      { icon: "👆", title: "How to move", text: "Slide your finger left and right anywhere on the court (or use the ← → keys on a computer). Hit the ball with the edge of your paddle to send it at a sharp angle." },
      { icon: "📡", title: "Playing together", text: "Both of you open Ping-Pong and pick each other. It's live, so you play at the same time. Jason's phone runs the game, so ask him to open it first. Or play the computer any time, even offline." }
    ],
    vs: true, offlineOk: true,
    async run(box, env, opts = {}) {
      const { U, db, ctx, A } = env, kit = LN.kit;
      const cpu = !!opts.cpu, level = opts.level || 2;
      if (!cpu && db.mode !== "cloud") {
        box.innerHTML = `<div class="card center"><p class="big-text">Live Ping-Pong needs both phones online ☁️</p><p class="muted">Once Supabase is connected you can play each other. For now, try the computer!</p><button class="btn" id="vscpu">Play the computer</button></div>`;
        U.$("#vscpu", box).onclick = () => LN.games.pong.run(box, env, { cpu: true, level: 2 });
        return;
      }
      const host = cpu || ctx.who === "a";
      const myKey = cpu ? "a" : ctx.who, otherKey = myKey === "a" ? "b" : "a";
      const names = { me: ctx.name(ctx.who), top: cpu ? "Computer 🤖" : ctx.name(ctx.other) };
      box.innerHTML = `<p class="big-text center" id="pmsg" aria-live="polite">&nbsp;</p>
        <canvas id="pcv" class="pongcv" width="600" height="900" aria-label="Ping-Pong court"></canvas>
        <div class="row center-row"><button class="btn small ghost" id="prematch" hidden>Play again</button></div>`;
      const cv = U.$("#pcv", box), msg = U.$("#pmsg", box), again = U.$("#prematch", box);
      let g = newGame(), myX = W / 2, peerX = W / 2, last = performance.now(), raf = 0, ch = null;
      let lastPeer = 0, started = false, recorded = false, status = "", lastSend = 0, liveState = null, lastRecv = 0;
      const setMsg = (t) => { if (msg.textContent !== t) msg.textContent = t; };

      /* controls */
      const setX = (clientX) => { const r = cv.getBoundingClientRect(); myX = clamp(((clientX - r.left) / r.width) * W, PW / 2, W - PW / 2); };
      cv.style.touchAction = "none";
      cv.addEventListener("pointermove", (e) => setX(e.clientX));
      cv.addEventListener("pointerdown", (e) => setX(e.clientX));
      const key = (e) => { if (!document.body.contains(box)) return document.removeEventListener("keydown", key); if (e.key === "ArrowLeft") myX = clamp(myX - 16, PW / 2, W - PW / 2); if (e.key === "ArrowRight") myX = clamp(myX + 16, PW / 2, W - PW / 2); };
      document.addEventListener("keydown", key);

      const finish = () => {
        if (recorded) return; recorded = true;
        const win = g.over;
        if (cpu) kit.record("pong", win, { cpu: true, level }, {});
        else if (host) kit.record("pong", win, { cpu: false }, {});
        if (win === myKey) A.burst(innerWidth / 2, 260, ["💜", "🌸", "🏓"], 16);
        again.hidden = false;
      };
      const restart = () => { g = newGame(); serve(g, 1); recorded = false; again.hidden = true; };
      again.onclick = () => { if (host) { restart(); } else if (ch) ch.send({ t: "again" }); };

      if (!cpu) {
        const onMsg = (m) => {
          if (!m) return;
          lastPeer = performance.now();
          if (host) {
            if (m.t === "hi" && !started) { started = true; serve(g, 1); }
            else if (m.t === "p") peerX = W - clamp(m.x, 0, W);        // guest sees the court turned around
            else if (m.t === "again" && g.over) restart();
          } else if (m.t === "s") { liveState = m; lastRecv = performance.now(); }
        };
        ch = db.channel("garden-pong", onMsg, (s) => { status = s; });
      } else { serve(g, 1); started = true; }

      const loop = (now) => {
        if (!document.body.contains(box)) { cancelAnimationFrame(raf); if (ch) ch.close(); document.removeEventListener("keydown", key); return; }
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (host) {
          g.xa = myX;
          if (cpu) {
            const sp = [0, 150, 240, 380][level] || 240, err = level === 1 ? 26 : level === 2 ? 10 : 0;
            const target = g.vy < 0 || g.by < H * 0.55 ? g.bx + (Math.sin(g.by / 37) * err) : W / 2;
            g.xb += clamp(target - g.xb, -sp * dt, sp * dt);
            if (!g.over) step(g, dt);
          } else {
            g.xb = peerX;
            const peerHere = now - lastPeer < 5000;
            if (started && peerHere && !g.over) step(g, dt);
            if (started && !peerHere) setMsg(`${names.top} left… waiting 🌷`);
            if (ch && now - lastSend > 45) { lastSend = now; ch.send({ t: "s", g: { bx: g.bx, by: g.by, vx: g.vx, vy: g.vy, xa: g.xa, xb: g.xb, sa: g.sa, sb: g.sb, hold: g.hold, over: g.over } }); }
          }
          if (g.over) { finish(); }
          if (cpu || (started && now - lastPeer < 5000)) setMsg(g.over ? (g.over === myKey ? "You win! 🎉" : `${names.top} wins!`) : "Drag to move");
          else if (!started) setMsg(status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "Couldn't open the live line. Try the computer, or check your internet." : `Waiting for ${names.top} to open Ping-Pong… 🌷`);
          draw(cv, g, false, myKey, names);
        } else {
          // guest: send my paddle, draw what the host says (with a little prediction between updates)
          if (ch && now - lastSend > 45) { lastSend = now; ch.send({ t: liveState ? "p" : "hi", x: myX }); }
          if (liveState) {
            const age = Math.min(0.12, (now - lastRecv) / 1000), s = liveState.g;
            // my own paddle comes straight from my finger (never lags); the ball is nudged forward between updates
            g = { ...s, bx: s.bx + (s.hold > 0 ? 0 : s.vx * age), by: s.by + (s.hold > 0 ? 0 : s.vy * age), xb: W - myX };
            if (s.over) { again.hidden = false; setMsg(s.over === myKey ? "You win! 🎉" : `${names.top} wins!`); if (!recorded) { recorded = true; if (s.over === myKey) A.burst(innerWidth / 2, 260, ["💜", "🌸", "🏓"], 16); } }
            else { again.hidden = true; recorded = false; setMsg(now - lastRecv > 3000 ? `Lost ${names.top}… 🌷` : "Drag to move"); }
            draw(cv, g, true, myKey, names);
          } else {
            setMsg(status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "Couldn't open the live line. Try the computer, or check your internet." : `Joining ${names.top}… (ask them to open Ping-Pong too)`);
            draw(cv, g, true, myKey, names);
          }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
  };
  LN.engines = LN.engines || {};
  LN.engines.pong = { newGame, serve, step, W, H, PW };
})();
