/* ♟️ Chess engine (pure functions, no screen code) + the game screen at the bottom. */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.engines = LN.engines || {};
  LN.games = LN.games || {};
  const E = (LN.engines.chess = {});

  const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  E.fresh = () => {
    const back = ["R", "N", "B", "Q", "K", "B", "N", "R"];
    const b = Array(64).fill("");
    back.forEach((p, c) => { b[c] = "b" + p; b[8 + c] = "bP"; b[48 + c] = "wP"; b[56 + c] = "w" + p; });
    return { b, t: "w", c: "KQkq", ep: -1, last: null, over: "" };
  };

  E.attacked = (b, sq, by) => {
    const r = Math.floor(sq / 8), c = sq % 8;
    const pr = by === "w" ? r + 1 : r - 1;
    for (const dc of [-1, 1]) if (inb(pr, c + dc) && b[pr * 8 + c + dc] === by + "P") return true;
    for (const [dr, dc] of KN) if (inb(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === by + "N") return true;
    for (const [dr, dc] of KG) if (inb(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === by + "K") return true;
    for (const [set, kinds] of [[DIAG, "BQ"], [ORTH, "RQ"]])
      for (const [dr, dc] of set) {
        let rr = r + dr, cc = c + dc;
        while (inb(rr, cc)) {
          const p = b[rr * 8 + cc];
          if (p) { if (p[0] === by && kinds.includes(p[1])) return true; break; }
          rr += dr; cc += dc;
        }
      }
    return false;
  };

  const kingSq = (b, col) => b.indexOf(col + "K");
  E.inCheck = (st, col) => { const k = kingSq(st.b, col); return k >= 0 && E.attacked(st.b, k, col === "w" ? "b" : "w"); };

  function pseudo(st, f) {
    const b = st.b, p = b[f], col = p[0], opp = col === "w" ? "b" : "w", type = p[1];
    const r = Math.floor(f / 8), c = f % 8, out = [];
    const add = (t, extra) => out.push({ f, t, ...extra });
    if (type === "P") {
      const dir = col === "w" ? -1 : 1, start = col === "w" ? 6 : 1, last = col === "w" ? 0 : 7;
      const push = (t) => {
        if (Math.floor(t / 8) === last) ["Q", "R", "B", "N"].forEach((pr) => add(t, { pr }));
        else add(t);
      };
      if (inb(r + dir, c) && !b[(r + dir) * 8 + c]) {
        push((r + dir) * 8 + c);
        if (r === start && !b[(r + 2 * dir) * 8 + c]) add((r + 2 * dir) * 8 + c);
      }
      for (const dc of [-1, 1]) {
        if (!inb(r + dir, c + dc)) continue;
        const t = (r + dir) * 8 + c + dc;
        if (b[t] && b[t][0] === opp) push(t);
        else if (t === st.ep) add(t);
      }
    } else if (type === "N" || type === "K") {
      for (const [dr, dc] of type === "N" ? KN : KG) {
        if (!inb(r + dr, c + dc)) continue;
        const t = (r + dr) * 8 + c + dc;
        if (!b[t] || b[t][0] === opp) add(t);
      }
      if (type === "K") {
        const home = col === "w" ? 60 : 4, K = col === "w" ? "K" : "k", Q = col === "w" ? "Q" : "q";
        if (f === home && !E.attacked(b, f, opp)) {
          if (st.c.includes(K) && !b[f + 1] && !b[f + 2] && b[f + 3] === col + "R" && !E.attacked(b, f + 1, opp) && !E.attacked(b, f + 2, opp)) add(f + 2);
          if (st.c.includes(Q) && !b[f - 1] && !b[f - 2] && !b[f - 3] && b[f - 4] === col + "R" && !E.attacked(b, f - 1, opp) && !E.attacked(b, f - 2, opp)) add(f - 2);
        }
      }
    } else {
      const dirs = type === "B" ? DIAG : type === "R" ? ORTH : DIAG.concat(ORTH);
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (inb(rr, cc)) {
          const t = rr * 8 + cc;
          if (!b[t]) add(t);
          else { if (b[t][0] === opp) add(t); break; }
          rr += dr; cc += dc;
        }
      }
    }
    return out;
  }

  const RIGHTS = { 60: "KQ", 63: "K", 56: "Q", 4: "kq", 7: "k", 0: "q" };
  E.apply = (st, m) => {
    const b = st.b.slice(), p = b[m.f], col = p[0], type = p[1];
    let ep = -1;
    if (type === "P" && m.t === st.ep && !b[m.t] && m.f % 8 !== m.t % 8) b[m.t + (col === "w" ? 8 : -8)] = "";
    b[m.t] = p; b[m.f] = "";
    if (type === "K" && Math.abs(m.t - m.f) === 2) {
      if (m.t > m.f) { b[m.f + 1] = b[m.f + 3]; b[m.f + 3] = ""; } else { b[m.f - 1] = b[m.f - 4]; b[m.f - 4] = ""; }
    }
    if (m.pr) b[m.t] = col + m.pr;
    if (type === "P" && Math.abs(m.t - m.f) === 16) ep = (m.f + m.t) / 2;
    let c = st.c;
    for (const sq of [m.f, m.t]) if (RIGHTS[sq]) for (const ch of RIGHTS[sq]) c = c.replace(ch, "");
    return { b, t: col === "w" ? "b" : "w", c, ep, last: [m.f, m.t], over: st.over || "" };
  };

  E.legal = (st) => {
    const out = [];
    for (let f = 0; f < 64; f++) {
      if (!st.b[f] || st.b[f][0] !== st.t) continue;
      for (const m of pseudo(st, f)) if (!E.inCheck(E.apply(st, m), st.t)) out.push(m);
    }
    return out;
  };

  /* play / check / mate / stalemate / draw (draw = not enough pieces left to ever checkmate) */
  E.status = (st) => {
    const moves = E.legal(st), check = E.inCheck(st, st.t);
    const pcs = st.b.filter((x) => x && x[1] !== "K");
    const minor = pcs.length <= 1 && pcs.every((x) => x[1] === "B" || x[1] === "N");
    let state = "play";
    if (!moves.length) state = check ? "mate" : "stalemate";
    else if (!pcs.length || minor) state = "draw";
    return { moves, check, state };
  };

  E.perft = (st, d) => {
    if (d === 0) return 1;
    let n = 0;
    for (const m of E.legal(st)) n += d === 1 ? 1 : E.perft(E.apply(st, m), d - 1);
    return n;
  };

  /* ---------------- screen ---------------- */
  /* Hand-drawn SVG pieces: they look the same on every phone and browser. */
  const BASE = '<rect x="10" y="36" width="25" height="4.5" rx="2"/>';
  const SHAPES = {
    P: '<circle cx="22.5" cy="13" r="5.5"/><path d="M15 36c0-8 3-10 7.5-13 4.500 3 7.500 5 7.500 13z"/>' + BASE,
    R: '<path d="M11 12h5v4h4v-4h5v4h4v-4h5v10l-4 3v8H15v-8l-4-3z"/>' + BASE,
    B: '<circle cx="22.5" cy="8" r="2.6"/><path d="M22.500 10c4 3 6 6 6 9.500 0 3-2 5-3 7h-6c-1-2-3-4-3-7 0-3.500 2-6.500 6-9.500z"/><path d="M15 36c0-5 3-8 7.500-9.500 4.500 1.500 7.500 4.500 7.500 9.500z"/>' + BASE,
    N: '<path d="M13 36c0-10 2-14 6-18l-3-3 3-6 5 2c8 1 13 9 13 25z"/><circle cx="21" cy="14" r="1.4" class="eye"/>' + BASE,
    Q: '<circle cx="9" cy="13" r="2.4"/><circle cx="17" cy="9" r="2.4"/><circle cx="22.5" cy="7.500" r="2.4"/><circle cx="28" cy="9" r="2.4"/><circle cx="36" cy="13" r="2.4"/><path d="M9 14l4 22h19l4-22-6.500 9-2-12-3.500 10-3.500-10-2 12z"/>' + BASE,
    K: '<path d="M22.500 3v9M18.500 6.500h8" fill="none" stroke-width="2.4"/><path d="M22.500 24c-6 0-10-3-10-8 0-4 3-6 6-6 2 0 3 1 4 2 1-1 2-2 4-2 3 0 6 2 6 6 0 5-4 8-10 8z"/><path d="M13 36c0-9 3-12 9.500-12S32 27 32 36z"/>' + BASE
  };
  const glyph = (p) => {
    const white = p[0] === "w";
    return `<svg viewBox="0 0 45 45" class="pcs" aria-hidden="true" fill="${white ? "#fff" : "#5b2a73"}" stroke="${white ? "#9c3d6b" : "#2d1240"}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${SHAPES[p[1]]}</svg>`;
  };

  LN.games.chess = {
    icon: "♟️", name: "Chess", desc: "The classic. Move whenever you like, she answers later.",
    tut: [
      { icon: "♟️", title: "The goal", text: "Trap the other player's king so it can't escape (checkmate). You are white (the pink-ish pieces) if you're him, and plum if you're her. White moves first." },
      { icon: "👆", title: "How to move", text: "Tap one of your pieces, and green dots show where it can go. Tap a dot to move. The game only lets you make legal moves, so you can't break the rules by accident." },
      { icon: "♞", title: "The pieces", text: "Pawns step forward (and capture diagonally). Rooks go straight, bishops go diagonal, the queen does both, the knight jumps in an L, and the king steps one square." },
      { icon: "✨", title: "Special moves", text: "Castling (king + rook swap places), en passant (a special pawn capture) and promotion (a pawn reaching the far side becomes a queen, rook, bishop or knight) are all built in." },
      { icon: "💌", title: "Taking turns", text: "Moves save automatically. You'll see her move within a few seconds if she's online, or whenever you next open the game." }
    ],
    vs: true, offlineOk: true,
    async run(box, env, opts = {}) {
      const { U, db, ctx, A } = env, kit = LN.kit;
      const cpu = !!opts.cpu, level = opts.level || 2, nm = kit.namer(cpu);
      const local = db.mode === "local" && !cpu;
      const myCol = cpu ? "w" : ctx.who === "a" ? "w" : "b";
      let sel = -1, promo = null, thinking = false;
      const S = await kit.session(box, "chess", E.fresh, paint, { cpu });

      function paint() {
        const st = S.st, res = E.status(st);
        const mine = local || st.t === myCol;
        const flip = !local && myCol === "b";
        const moves = res.moves.filter((m) => m.f === sel);
        const wname = nm("a"), bname = nm("b");
        let msg;
        if (st.over) msg = `${U.esc(st.over.endsWith("w") ? bname : wname)} wins (${U.esc(st.over.endsWith("w") ? wname : bname)} resigned) 🏳️`;
        else if (res.state === "mate") msg = `Checkmate! ${U.esc(st.t === "w" ? bname : wname)} wins 🎉`;
        else if (res.state === "stalemate") msg = "Stalemate, it's a draw 🤝";
        else if (res.state === "draw") msg = "Draw: not enough pieces to checkmate 🤝";
        else msg = `${mine ? "Your move" : `Waiting for ${U.esc(st.t === "w" ? wname : bname)}…`}${res.check ? " · Check! ⚠️" : ""}`;
        const done = !!st.over || res.state !== "play";
        let cells = "";
        for (let dr = 0; dr < 8; dr++)
          for (let dc = 0; dc < 8; dc++) {
            const r = flip ? 7 - dr : dr, c = flip ? 7 - dc : dc, i = r * 8 + c, p = st.b[i];
            const cls = ["sq", (r + c) % 2 ? "dk" : "lt", i === sel ? "sel" : "", moves.some((m) => m.t === i) ? "tgt" : "", st.last && st.last.includes(i) ? "lastm" : "", res.check && p === st.t + "K" ? "chk" : ""].join(" ");
            cells += `<button class="${cls}" data-i="${i}" aria-label="${p || "empty"}">${p ? `<span class="pc ${p[0]}">${glyph(p)}</span>` : ""}</button>`;
          }
        box.innerHTML = `<p class="big-text center" aria-live="polite">${msg}</p>
          <div class="chessboard">${cells}</div>
          ${promo ? `<div class="promo">Promote to: ${["Q", "R", "B", "N"].map((x) => `<button class="btn small ghost" data-p="${x}">${glyph(st.t + x)}</button>`).join("")}</div>` : ""}
          <div class="row wrap center-row"><button class="btn small ghost" id="resign" ${done ? "disabled" : ""}>🏳️ Resign</button><button class="btn small ghost" id="newg">New game</button></div>
          <p class="muted center">${U.esc(wname)} = pink-white · ${U.esc(bname)} = plum${local ? " · local mode: pass the phone" : ""}</p>`;
        U.$$(".sq", box).forEach((b) => (b.onclick = () => click(+b.dataset.i, res, mine, done)));
        U.$$("[data-p]", box).forEach((b) => (b.onclick = () => { const m = promo.find((x) => x.pr === b.dataset.p); promo = null; play(m); }));
        U.$("#newg", box).onclick = () => { if (U.confirm("Start a new game?")) { sel = -1; promo = null; S.reset(); } };
        U.$("#resign", box).onclick = () => { if (U.confirm("Resign this game?")) { S.st.over = "resign-" + (local ? st.t : myCol); paint(); S.save(); } };
        think(res);
      }
      function click(i, res, mine, done) {
        if (done) return;
        if (!mine) return U.toast("Wait for your turn 🌷");
        const st = S.st, cand = res.moves.filter((m) => m.f === sel && m.t === i);
        if (sel >= 0 && cand.length) {
          if (cand.length > 1) { promo = cand; return paint(); }
          return play(cand[0]);
        }
        sel = st.b[i] && st.b[i][0] === st.t ? i : -1;
        paint();
      }
      function think(res) {
        if (!cpu || S.st.over || res.state !== "play" || S.st.t !== "b" || thinking) return;
        thinking = true;
        setTimeout(() => {
          thinking = false;
          if (!document.body.contains(box)) return;
          const st = S.st;
          if (st.t !== "b" || st.over) return;
          const m = LN.ai.chess(st, level);
          if (m) S.st = E.apply(st, m);
          paint();
        }, 400);
      }
      function play(m) {
        S.st = E.apply(S.st, m);
        sel = -1;
        const r = E.status(S.st);
        if (r.state === "mate") A.burst(innerWidth / 2, 240, ["♛", "💗", "✨"], 14);
        paint(); S.save();
      }
      paint();
    }
  };
})();
