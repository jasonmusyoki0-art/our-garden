/* 🤖 Computer opponents for every two-player game. Levels: 1 easy, 2 medium, 3 hard. Works fully offline. */
(function () {
  const LN = (window.LN = window.LN || {});
  const AI = (LN.ai = {});
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];

  /* ---------- chess ---------- */
  const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
  function evalChess(st) {
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const p = st.b[i];
      if (!p) continue;
      const r = i >> 3, c = i & 7, cen = 7 - Math.abs(c - 3.5) - Math.abs(r - 3.5);
      let pos = 0;
      if (p[1] === "P") pos = (p[0] === "w" ? 6 - r : r - 1) * 6 + cen * 2;
      else if (p[1] === "N" || p[1] === "B") pos = cen * 5;
      else if (p[1] === "Q") pos = cen;
      s += (p[0] === "w" ? 1 : -1) * (VAL[p[1]] + pos);
    }
    return s;
  }
  function order(st, moves) {
    return moves.map((m) => ({ m, k: (st.b[m.t] ? 10 * VAL[st.b[m.t][1]] - VAL[st.b[m.f][1]] : 0) + (m.pr ? 800 : 0) + rnd(3) })).sort((a, b) => b.k - a.k).map((x) => x.m);
  }
  function negamax(E, st, d, alpha, beta, ply) {
    const moves = E.legal(st);
    if (!moves.length) return E.inCheck(st, st.t) ? -100000 + ply : 0;
    if (d === 0) { const e = evalChess(st); return st.t === "w" ? e : -e; }
    let best = -Infinity;
    for (const m of order(st, moves)) {
      const v = -negamax(E, E.apply(st, m), d - 1, -beta, -alpha, ply + 1);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  AI.chess = (st, level = 2) => {
    const E = LN.engines.chess, moves = E.legal(st);
    if (!moves.length) return null;
    if (level <= 1) { const caps = moves.filter((m) => st.b[m.t]); return Math.random() < 0.4 && caps.length ? pick(caps) : pick(moves); }
    const depth = level === 2 ? 2 : 3;
    let best = null, bv = -Infinity;
    for (const m of order(st, moves)) {
      const v = -negamax(E, E.apply(st, m), depth - 1, -Infinity, Infinity, 1) + Math.random() * 2;
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  };

  /* ---------- ludo ---------- */
  AI.ludo = (st, who, level = 2) => {
    const E = LN.engines.ludo, opts = E.moves(st, who, st.roll), roll = st.roll, o = who === "a" ? "b" : "a";
    if (level <= 1) return pick(opts);
    const danger = (idx) => st.tok[o].some((q) => { const j = E.trackIdx(o, q); return j >= 0 && ((idx - j + 52) % 52) >= 1 && ((idx - j + 52) % 52) <= 6; });
    let best = [], bs = -Infinity;
    for (const i of opts) {
      const p = st.tok[who][i], np = p === -1 ? 0 : p + roll, ti = E.trackIdx(who, np), ci = E.trackIdx(who, p);
      let s = np / 10;
      if (np === 56) s += 100;
      if (p === -1) s += 50;
      if (ti >= 0 && !E.SAFE.has(ti)) {
        if (st.tok[o].some((q) => E.trackIdx(o, q) === ti)) s += 80;
        else if (level >= 3 && danger(ti)) s -= 25;
      } else if (ti >= 0) s += 15;
      if (level >= 3 && ci >= 0 && !E.SAFE.has(ci) && danger(ci)) s += 25;
      if (s > bs + 1e-9) { bs = s; best = [i]; } else if (Math.abs(s - bs) < 1e-9) best.push(i);
    }
    return pick(best);
  };

  /* ---------- tic-tac-toe (classic / big / giant) ---------- */
  function run(board, n, i, who) {
    const r = Math.floor(i / n), c = i % n;
    let best = 1;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      let len = 1;
      for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < n && cc >= 0 && cc < n && board[rr * n + cc] === who) { len++; rr += dr * s; cc += dc * s; } }
      best = Math.max(best, len);
    }
    return best;
  }
  function mm(b, me, op, turn, LINES) {
    const w = LINES.find((l) => b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]);
    if (w) return b[w[0]] === me ? 10 : -10;
    if (b.every(Boolean)) return 0;
    let best = turn === me ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = turn;
      const v = mm(b, me, op, turn === me ? op : me, LINES);
      b[i] = "";
      best = turn === me ? Math.max(best, v - 0) : Math.min(best, v);
    }
    return best;
  }
  AI.ttt = (st, level = 2) => {
    const E = LN.engines.ttt, m = E.MODES[st.mode], n = m.n, k = m.k, me = st.turn, op = me === "a" ? "b" : "a";
    const empty = st.board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (level <= 1) return pick(empty);
    for (const who of [me, op]) for (const i of empty) { const b = st.board.slice(); b[i] = who; if (E.winAt(b, n, k, i, who)) return i; }
    if (level === 2) { const mid = (n * n - 1) / 2; return st.board[mid] ? pick(empty) : mid; }
    if (n === 3) {
      let best = [], bv = -Infinity;
      for (const i of empty) { const b = st.board.slice(); b[i] = me; const v = mm(b, me, op, op, E.LINES3); if (v > bv) { bv = v; best = [i]; } else if (v === bv) best.push(i); }
      return pick(best);
    }
    let best = [], bs = -Infinity;
    for (const i of empty) {
      const b1 = st.board.slice(); b1[i] = me; const b2 = st.board.slice(); b2[i] = op;
      const cr = Math.floor(i / n), cc = i % n, dist = Math.abs(cr - (n - 1) / 2) + Math.abs(cc - (n - 1) / 2);
      const s = Math.pow(8, run(b1, n, i, me)) + 0.9 * Math.pow(8, run(b2, n, i, op)) - dist;
      if (s > bs) { bs = s; best = [i]; } else if (s === bs) best.push(i);
    }
    return pick(best);
  };

  /* ---------- ultimate tic-tac-toe ---------- */
  AI.tttU = (st, level = 2) => {
    const E = LN.engines.ttt, legal = E.legalU(st), me = st.turn, op = me === "a" ? "b" : "a";
    if (level <= 1) return pick(legal);
    let best = [], bs = -Infinity;
    for (const [b, c] of legal) {
      const sim = E.placeU(st, b, c);
      let s = Math.random();
      if (sim.winner === me) s += 10000;
      if (sim.big[b] === me && st.big[b] !== me) s += 60;
      const t = st.sub[b].slice(); t[c] = op;
      if (E.LINES3.some((l) => l.every((i) => t[i] === op))) s += 40; // blocks her winning this small board
      if (c === 4) s += 3;
      if (level >= 3 && !sim.winner) {
        if (sim.next === -1) s -= 8;
        for (const [b2, c2] of E.legalU(sim)) {
          const r = E.placeU(sim, b2, c2);
          if (r.winner === op) s -= 5000; else if (r.big[b2] === op && sim.big[b2] !== op) s -= 25;
        }
      }
      if (s > bs) { bs = s; best = [[b, c]]; } else if (s === bs) best.push([b, c]);
    }
    return pick(best);
  };

  /* ---------- connect four ---------- */
  const W = 7, H = 6;
  function evalC4(b, me) {
    const op = me === "a" ? "b" : "a";
    let s = 0;
    for (let r = 0; r < H; r++) if (b[r * W + 3] === me) s += 3; else if (b[r * W + 3] === op) s -= 3;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]])
      for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
        const er = r + 3 * dr, ec = c + 3 * dc;
        if (er < 0 || er >= H || ec < 0 || ec >= W) continue;
        let m = 0, o = 0;
        for (let k = 0; k < 4; k++) { const v = b[(r + dr * k) * W + c + dc * k]; if (v === me) m++; else if (v === op) o++; }
        if (m && !o) s += m === 3 ? 5 : m === 2 ? 2 : 0; else if (o && !m) s -= o === 3 ? 6 : o === 2 ? 2 : 0;
      }
    return s;
  }
  function nmC4(E, st, d, alpha, beta, me) {
    let best = -Infinity, any = false;
    for (const c of [3, 2, 4, 1, 5, 0, 6]) {
      const n = E.drop(st, c);
      if (!n) continue;
      any = true;
      let v;
      if (n.winner === "draw") v = 0; else if (n.winner) v = 100000 + d; else if (d <= 1) v = evalC4(n.b, st.turn); else v = -nmC4(E, n, d - 1, -beta, -alpha, me);
      if (d <= 1 && !n.winner) v = evalC4(n.b, st.turn);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return any ? best : 0;
  }
  AI.c4 = (st, level = 2) => {
    const E = LN.engines.c4, cols = [0, 1, 2, 3, 4, 5, 6].filter((c) => E.drop(st, c));
    for (const c of cols) { if (E.drop(st, c).winner === st.turn) return c; } // win now
    const op = st.turn === "a" ? "b" : "a";
    if (level <= 1) {
      for (const c of cols) { const t = E.drop({ ...st, turn: op }, c); if (t && t.winner === op) return c; }
      return pick(cols);
    }
    const depth = level === 2 ? 3 : 5;
    let best = [], bv = -Infinity;
    for (const c of cols) {
      const n = E.drop(st, c);
      const v = n.winner ? 100000 : -nmC4(E, n, depth - 1, -Infinity, Infinity, st.turn);
      if (v > bv) { bv = v; best = [c]; } else if (v === bv) best.push(c);
    }
    return pick(best);
  };
})();
