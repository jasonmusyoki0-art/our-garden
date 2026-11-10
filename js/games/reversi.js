/* ⚫ Reversi (Othello): flip your partner's pieces by trapping them. Most pieces at the end wins. */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.games = LN.games || {};
  LN.engines = LN.engines || {};
  const E = (LN.engines.reversi = {});
  const N = 8, DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const other = (w) => (w === "a" ? "b" : "a");
  E.fresh = () => { const b = Array(64).fill(""); b[27] = b[36] = "b"; b[28] = b[35] = "a"; return { b, turn: "a", winner: "", last: -1, note: "" }; };

  /* which pieces would I flip if I played at square i? */
  E.flips = (b, i, who) => {
    if (b[i]) return [];
    const r0 = Math.floor(i / N), c0 = i % N, out = [];
    for (const [dr, dc] of DIRS) {
      const line = [];
      let r = r0 + dr, c = c0 + dc;
      while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === other(who)) { line.push(r * N + c); r += dr; c += dc; }
      if (line.length && r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === who) out.push(...line);
    }
    return out;
  };
  E.moves = (b, who) => { const m = []; for (let i = 0; i < 64; i++) { const f = E.flips(b, i, who); if (f.length) m.push({ i, f }); } return m; };
  E.count = (b) => ({ a: b.filter((x) => x === "a").length, b: b.filter((x) => x === "b").length });

  E.apply = (st, i) => {
    if (st.winner) return null;
    const f = E.flips(st.b, i, st.turn);
    if (!f.length) return null;
    const b = st.b.slice();
    b[i] = st.turn; f.forEach((x) => (b[x] = st.turn));
    const s = { b, turn: other(st.turn), winner: "", last: i, note: "" };
    if (!E.moves(b, s.turn).length) {
      if (E.moves(b, st.turn).length) { s.note = `${s.turn} has no move, so ${st.turn} goes again`; s.turn = st.turn; s.pass = other(st.turn); }
      else { const c = E.count(b); s.winner = c.a === c.b ? "draw" : c.a > c.b ? "a" : "b"; }
    }
    return s;
  };

  /* computer: 1 = random, 2 = grabs the most pieces, 3 = loves corners and thinks one move ahead */
  const WT = [100, -20, 10, 5, 5, 10, -20, 100, -20, -50, -2, -2, -2, -2, -50, -20, 10, -2, 1, 1, 1, 1, -2, 10, 5, -2, 1, 0, 0, 1, -2, 5];
  const wt = (i) => { const r = Math.floor(i / 8), c = i % 8, rr = r > 3 ? 7 - r : r, cc = c > 3 ? 7 - c : c; return WT[rr * 8 + cc]; };
  E.ai = (st, level) => {
    const me = st.turn, ms = E.moves(st.b, me);
    if (!ms.length) return -1;
    if (level <= 1) return ms[Math.floor(Math.random() * ms.length)].i;
    if (level === 2) { let best = ms[0]; ms.forEach((m) => { if (m.f.length > best.f.length) best = m; }); return best.i; }
    let best = null, bs = -1e9;
    ms.forEach((m) => {
      const b = st.b.slice(); b[m.i] = me; m.f.forEach((x) => (b[x] = me));
      let score = wt(m.i) + m.f.length * 0.5;
      const reply = E.moves(b, other(me));
      if (reply.length) score -= Math.max(...reply.map((r) => wt(r.i) + r.f.length * 0.3)) * 0.6; else score += 30;
      if (score > bs) { bs = score; best = m; }
    });
    return best.i;
  };

  LN.games.reversi = {
    icon: "⚫", name: "Reversi", desc: "Trap and flip your partner's pieces. Most pieces wins.",
    tut: [
      { icon: "🎯", title: "The goal", text: "End the game with more pieces than your partner. He is 💜, she is 🌸." },
      { icon: "👆", title: "Your move", text: "Tap a glowing square. Your new piece must trap a line of your partner's pieces between itself and another of yours. Every trapped piece flips to your color!" },
      { icon: "🧠", title: "Tip", text: "Corners can never be flipped, so they are gold. If you have no move, your turn is skipped automatically." }
    ],
    vs: true, offlineOk: true,
    async run(box, env, opts = {}) {
      const { U, db, ctx, A } = env, kit = LN.kit;
      const cpu = !!opts.cpu, level = opts.level || 2, nm = kit.namer(cpu), local = db.mode === "local" && !cpu;
      let busy = false;
      const S = await kit.session(box, "reversi", E.fresh, paint, { cpu, level });
      const MK = { a: "💜", b: "🌸" };
      function paint() {
        const st = S.st, mine = cpu ? st.turn === "a" : local || st.turn === ctx.who;
        const ms = st.winner ? [] : E.moves(st.b, st.turn), can = new Set(ms.map((m) => m.i)), c = E.count(st.b);
        const msg = st.winner === "draw" ? "It's a draw 🤝" : st.winner ? `${U.esc(nm(st.winner))} wins! ${MK[st.winner]}🎉` : mine ? `Your turn ${MK[cpu ? "a" : local ? st.turn : ctx.who]}` : `Waiting for ${U.esc(nm(st.turn))}… ${MK[st.turn]}`;
        box.innerHTML = `<p class="big-text center" aria-live="polite">${msg}</p>
          <p class="center muted">${MK.a} ${c.a} · ${MK.b} ${c.b}${st.note ? " · " + U.esc(st.note.replace(/\ba\b/g, nm("a")).replace(/\bb\b/g, nm("b"))) : ""}</p>
          <div class="rv">${st.b.map((v, i) => `<button class="rvc ${can.has(i) && mine ? "can" : ""} ${st.last === i ? "lastm" : ""}" data-i="${i}" aria-label="square ${i + 1}">${v ? MK[v] : ""}</button>`).join("")}</div>
          <div class="row end"><button class="btn small ghost" id="newg">New game</button></div>`;
        U.$$(".rvc", box).forEach((b) => (b.onclick = () => {
          if (st.winner) return;
          if (!mine) return U.toast("Wait for your turn 🌷");
          const n = E.apply(st, +b.dataset.i);
          if (!n) return U.toast("Pick a glowing square");
          S.st = n;
          if (n.winner && n.winner !== "draw") A.burst(innerWidth / 2, 260, ["💜", "🌸", "✨"], 14);
          paint(); S.save();
        }));
        U.$("#newg", box).onclick = () => { if (U.confirm("Start a new game?")) S.reset(); };
        think();
      }
      function think() {
        if (!cpu || S.st.winner || S.st.turn !== "b" || busy) return;
        busy = true;
        setTimeout(() => {
          busy = false;
          if (!document.body.contains(box)) return;
          const st = S.st;
          if (st.winner || st.turn !== "b") return;
          const n = E.apply(st, E.ai(st, level));
          if (n) S.st = n;
          paint();
        }, 650);
      }
      paint();
    }
  };
})();
