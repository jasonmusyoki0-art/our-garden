/* 🔴 Connect Four (hearts vs flowers) */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.engines = LN.engines || {};
  LN.games = LN.games || {};
  const E = (LN.engines.c4 = {});
  const W = 7, H = 6;
  E.W = W; E.H = H;
  E.fresh = () => ({ b: Array(W * H).fill(""), turn: "a", winner: "", line: [] });
  E.drop = (st, col) => {
    for (let r = H - 1; r >= 0; r--) {
      const i = r * W + col;
      if (!st.b[i]) {
        const s = { b: st.b.slice(), turn: st.turn, winner: "", line: [] };
        s.b[i] = st.turn;
        for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
          const cells = [i];
          for (const sgn of [1, -1]) {
            let rr = r + dr * sgn, cc = col + dc * sgn;
            while (rr >= 0 && rr < H && cc >= 0 && cc < W && s.b[rr * W + cc] === st.turn) { cells.push(rr * W + cc); rr += dr * sgn; cc += dc * sgn; }
          }
          if (cells.length >= 4) { s.winner = st.turn; s.line = cells; break; }
        }
        if (!s.winner && s.b.every(Boolean)) s.winner = "draw";
        s.turn = st.turn === "a" ? "b" : "a";
        return s;
      }
    }
    return null; // column full
  };

  LN.games.c4 = {
    icon: "🔴", name: "Connect Four", desc: "Drop hearts and flowers. Line up four to win.",
    tut: [
      { icon: "🎯", title: "The goal", text: "Be the first to line up four of your pieces in a row: across, up and down, or diagonally. He is 💜, she is 🌸." },
      { icon: "👇", title: "How to play", text: "Tap a column and your piece drops to the lowest free spot. Then it's the other player's turn." },
      { icon: "🧠", title: "Tip", text: "Block your partner's line of three, and try to build two threats at once. Moves save automatically, so you can play from different places." }
    ],
    vs: true, offlineOk: true,
    async run(box, env, opts = {}) {
      const { U, db, ctx, A } = env, kit = LN.kit;
      const cpu = !!opts.cpu, level = opts.level || 2, nm = kit.namer(cpu), local = db.mode === "local" && !cpu;
      let busy = false;
      const S = await kit.session(box, "c4", E.fresh, paint, { cpu });
      const MK = { a: "💜", b: "🌸" };
      function paint() {
        const st = S.st, mine = cpu ? st.turn === "a" : local || st.turn === ctx.who;
        let cells = "";
        for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const i = r * W + c; cells += `<button class="c4cell ${st.line.includes(i) ? "win" : ""}" data-c="${c}" aria-label="Column ${c + 1}">${st.b[i] ? MK[st.b[i]] : ""}</button>`; }
        const msg = st.winner === "draw" ? "It's a draw 🤝" : st.winner ? `${U.esc(nm(st.line.length ? S.st.b[st.line[0]] : "a"))} wins! 🎉` : mine ? `Your turn ${MK[cpu ? "a" : local ? st.turn : ctx.who]}` : `Waiting for ${U.esc(nm(st.turn))}… ${MK[st.turn]}`;
        box.innerHTML = `<p class="big-text center" aria-live="polite">${msg}</p><div class="c4">${cells}</div>
          <div class="row end"><button class="btn small ghost" id="newg">New game</button></div>
          <p class="muted center">${U.esc(nm("a"))} ${MK.a} · ${U.esc(nm("b"))} ${MK.b}</p>`;
        U.$$(".c4cell", box).forEach((b) => (b.onclick = () => {
          if (st.winner) return;
          if (!mine) return U.toast("Wait for your turn 🌷");
          const n = E.drop(st, +b.dataset.c);
          if (!n) return U.toast("That column is full");
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
          const n = E.drop(st, LN.ai.c4(st, level));
          if (n) S.st = n;
          paint();
        }, 550);
      }
      paint();
    }
  };
})();
