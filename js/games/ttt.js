/* ❌⭕ Tic-Tac-Toe in four flavours: Classic 3x3, Big 5x5 (4 to win), Giant 7x7 (5 to win), Ultimate (9 boards) */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.engines = LN.engines || {};
  LN.games = LN.games || {};
  const E = (LN.engines.ttt = {});

  E.MODES = {
    classic: { n: 3, k: 3, name: "Classic 3×3", desc: "Three in a row" },
    big: { n: 5, k: 4, name: "Big 5×5", desc: "Four in a row" },
    giant: { n: 7, k: 5, name: "Giant 7×7", desc: "Five in a row" },
    ultimate: { n: 3, k: 3, name: "Ultimate", desc: "9 boards in one. Your move decides where she plays next!" }
  };
  const LINES3 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const other = (w) => (w === "a" ? "b" : "a");

  E.fresh = (mode = "classic") => {
    const m = E.MODES[mode];
    if (mode === "ultimate") return { mode, turn: "a", winner: "", next: -1, sub: Array.from({ length: 9 }, () => Array(9).fill("")), big: Array(9).fill(""), last: null };
    return { mode, turn: "a", winner: "", board: Array(m.n * m.n).fill(""), line: [], last: -1 };
  };

  const winAt = (board, n, k, i, who) => {
    const r = Math.floor(i / n), c = i % n;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const cells = [i];
      for (const s of [1, -1]) {
        let rr = r + dr * s, cc = c + dc * s;
        while (rr >= 0 && rr < n && cc >= 0 && cc < n && board[rr * n + cc] === who) { cells.push(rr * n + cc); rr += dr * s; cc += dc * s; }
      }
      if (cells.length >= k) return cells;
    }
    return null;
  };
  E.winAt = winAt; E.LINES3 = LINES3;
  const win3 = (b, who) => LINES3.find((l) => l.every((i) => b[i] === who));

  /* classic / big / giant */
  E.place = (st, i) => {
    if (st.winner || st.board[i]) return null;
    const m = E.MODES[st.mode], s = { ...st, board: st.board.slice(), line: [], last: i };
    s.board[i] = st.turn;
    const w = winAt(s.board, m.n, m.k, i, st.turn);
    if (w) { s.winner = st.turn; s.line = w; }
    else if (s.board.every(Boolean)) s.winner = "draw";
    else s.turn = other(st.turn);
    return s;
  };

  /* ultimate: small board b, cell c */
  E.placeU = (st, b, c) => {
    if (st.winner || st.big[b] || st.sub[b][c]) return null;
    if (st.next !== -1 && st.next !== b) return null;
    const s = { ...st, sub: st.sub.map((x) => x.slice()), big: st.big.slice(), last: [b, c] };
    s.sub[b][c] = st.turn;
    if (win3(s.sub[b], st.turn)) s.big[b] = st.turn;
    else if (s.sub[b].every(Boolean)) s.big[b] = "draw";
    const bigWin = LINES3.find((l) => l.every((i) => s.big[i] === st.turn));
    if (bigWin) s.winner = st.turn;
    else if (s.big.every(Boolean)) {
      const a = s.big.filter((x) => x === "a").length, bb = s.big.filter((x) => x === "b").length;
      s.winner = a === bb ? "draw" : a > bb ? "a" : "b"; // every board decided: most boards wins
    }
    s.next = s.big[c] ? -1 : c; // sent to the board matching the cell you played, unless it's already decided
    if (!s.winner) s.turn = other(st.turn);
    return s;
  };
  E.legalU = (st) => {
    const out = [];
    for (let b = 0; b < 9; b++) {
      if (st.big[b] || (st.next !== -1 && st.next !== b)) continue;
      for (let c = 0; c < 9; c++) if (!st.sub[b][c]) out.push([b, c]);
    }
    return out;
  };

  const MK = { a: "💜", b: "🌸" };
  LN.games.ttt = {
    icon: "💜", name: "Heart Tic-Tac-Toe", desc: "Four versions: classic, big, giant and Ultimate.",
    tut: [
      { icon: "❌", title: "The basics", text: "Take turns placing your mark (him 💜, her 🌸). Get the required number in a row (across, down or diagonal) to win." },
      { icon: "📐", title: "Pick your board", text: "Classic 3×3 needs 3 in a row. Big 5×5 needs 4. Giant 7×7 needs 5, and it's a real strategy game. Pick any from the menu at the top." },
      { icon: "🧩", title: "Ultimate", text: "Nine small boards make one big board. Wherever you play inside a small board decides which small board your partner must play in next. Win three small boards in a row to win." },
      { icon: "💌", title: "Playing apart", text: "Moves save automatically and appear on her phone within seconds, so you can play whenever you both have a minute." }
    ],
    vs: true, offlineOk: true,
    async run(box, env, opts = {}) {
      const { U, db, ctx, A } = env, kit = LN.kit;
      const cpu = !!opts.cpu, level = opts.level || 2, nm = kit.namer(cpu), local = db.mode === "local" && !cpu;
      let mode = "classic", busy = false;
      if (!cpu) { try { const saved = await db.kvGet("ttt2"); if (saved && E.MODES[saved.mode]) mode = saved.mode; } catch (e) {} }
      const S = await kit.session(box, "ttt2", () => E.fresh(mode), paint, { cpu });
      if (S.st.mode) mode = S.st.mode;

      function paint() {
        const st = S.st; mode = st.mode;
        const mine = cpu ? st.turn === "a" : local || st.turn === ctx.who;
        const msg = st.winner === "draw" ? "It's a draw 🤝" : st.winner ? `${U.esc(nm(st.winner))} wins! ${MK[st.winner]}🎉` : mine ? `Your turn ${MK[cpu ? "a" : local ? st.turn : ctx.who]}` : `Waiting for ${U.esc(nm(st.turn))}… ${MK[st.turn]}`;
        let body;
        if (mode === "ultimate") {
          const legal = new Set(E.legalU(st).map(([b, c]) => b * 9 + c));
          body = `<div class="ult">${st.sub.map((sb, b) => `<div class="ub ${st.big[b] ? "done" : ""} ${!st.winner && !st.big[b] && (st.next === -1 || st.next === b) ? "live" : ""}">
            ${sb.map((v, c) => `<button class="uc ${st.last && st.last[0] === b && st.last[1] === c ? "lastm" : ""}" data-b="${b}" data-c="${c}" ${v || !legal.has(b * 9 + c) ? "disabled" : ""} aria-label="board ${b + 1} cell ${c + 1}">${v ? MK[v] : ""}</button>`).join("")}
            ${st.big[b] ? `<span class="ubw">${st.big[b] === "draw" ? "🤝" : MK[st.big[b]]}</span>` : ""}</div>`).join("")}</div>
            <p class="muted center">${st.winner ? "" : st.next === -1 ? "Free choice: play in any glowing board" : `Play in the highlighted board (${st.next + 1})`}</p>`;
        } else {
          const m = E.MODES[mode];
          body = `<div class="tgrid2" style="--n:${m.n}">${st.board.map((v, i) => `<button class="tc ${st.line.includes(i) ? "win" : ""} ${st.last === i ? "lastm" : ""}" data-i="${i}" ${v || st.winner ? "disabled" : ""} aria-label="cell ${i + 1}">${v ? MK[v] : ""}</button>`).join("")}</div><p class="muted center">${m.k} in a row wins</p>`;
        }
        box.innerHTML = `<div class="tabs">${Object.entries(E.MODES).map(([k, m]) => `<button class="${k === mode ? "on" : ""}" data-m="${k}" title="${U.esc(m.desc)}">${U.esc(m.name)}</button>`).join("")}</div>
          <p class="big-text center" aria-live="polite">${msg}</p>${body}
          <div class="row end"><button class="btn small ghost" id="newg">New game</button></div>
          <p class="muted center">${U.esc(nm("a"))} ${MK.a} · ${U.esc(nm("b"))} ${MK.b}${local ? " · local mode: pass the phone" : ""}</p>`;
        U.$$(".tabs button", box).forEach((b) => (b.onclick = () => {
          if (b.dataset.m === mode) return;
          const inProg = (S.st.board && S.st.board.some(Boolean) || S.st.sub && S.st.sub.some((x) => x.some(Boolean))) && !S.st.winner;
          if (inProg && !U.confirm("Switch board? This ends the current game.")) return;
          mode = b.dataset.m; S.st = E.fresh(mode); paint(); S.save();
        }));
        U.$$(".tc", box).forEach((b) => (b.onclick = () => {
          if (!mine) return U.toast("Wait for your turn 🌷");
          const n = E.place(S.st, +b.dataset.i);
          if (n) { S.st = n; if (n.winner && n.winner !== "draw") A.burst(innerWidth / 2, 260, ["💜", "🌸", "✨"], 14); paint(); S.save(); }
        }));
        U.$$(".uc", box).forEach((b) => (b.onclick = () => {
          if (!mine) return U.toast("Wait for your turn 🌷");
          const n = E.placeU(S.st, +b.dataset.b, +b.dataset.c);
          if (n) { S.st = n; if (n.winner && n.winner !== "draw") A.burst(innerWidth / 2, 260, ["💜", "🌸", "✨"], 14); paint(); S.save(); }
        }));
        U.$("#newg", box).onclick = () => { if (U.confirm("Start a new game?")) { S.st = E.fresh(mode); paint(); S.save(); } };
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
          let n;
          if (st.mode === "ultimate") { const [b, c] = LN.ai.tttU(st, level); n = E.placeU(st, b, c); }
          else n = E.place(st, LN.ai.ttt(st, level));
          if (n) S.st = n;
          paint();
        }, 450);
      }
      paint();
    }
  };
})();
