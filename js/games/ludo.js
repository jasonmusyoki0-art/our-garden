/* 🎲 Ludo for two (him = pink, her = purple). Engine first, screen below. */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.engines = LN.engines || {};
  LN.games = LN.games || {};
  const E = (LN.engines.ludo = {});

  /* The 52 squares of the main loop on a 15x15 grid, clockwise, starting at pink's entry square. */
  const T = [];
  const add = (r, c) => T.push([r, c]);
  for (let c = 1; c <= 5; c++) add(6, c);
  for (let r = 5; r >= 0; r--) add(r, 6);
  add(0, 7); add(0, 8);
  for (let r = 1; r <= 5; r++) add(r, 8);
  for (let c = 9; c <= 14; c++) add(6, c);
  add(7, 14); add(8, 14);
  for (let c = 13; c >= 9; c--) add(8, c);
  for (let r = 9; r <= 14; r++) add(14 - 14 + r, 8);
  add(14, 7); add(14, 6);
  for (let r = 13; r >= 9; r--) add(r, 6);
  for (let c = 5; c >= 0; c--) add(8, c);
  add(7, 0); add(6, 0);
  E.TRACK = T;
  E.START = { a: 0, b: 26 };
  E.SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  E.HOME = { a: [1, 2, 3, 4, 5].map((c) => [7, c]), b: [13, 12, 11, 10, 9].map((c) => [7, c]) };
  E.CENTER = { a: [7, 6], b: [7, 8] };
  E.YARD = { a: [[2, 2], [2, 3], [3, 2], [3, 3]], b: [[10, 10], [10, 11], [11, 10], [11, 11]] };
  const opp = (w) => (w === "a" ? "b" : "a");

  E.fresh = () => ({ tok: { a: [-1, -1, -1, -1], b: [-1, -1, -1, -1] }, turn: "a", roll: null, last: null, winner: "", note: "" });
  /* progress: -1 yard, 0..50 main loop, 51..55 home column, 56 home */
  E.cell = (who, i, p) => (p < 0 ? E.YARD[who][i] : p <= 50 ? T[(E.START[who] + p) % 52] : p < 56 ? E.HOME[who][p - 51] : E.CENTER[who]);
  const trackIdx = (who, p) => (p >= 0 && p <= 50 ? (E.START[who] + p) % 52 : -1);
  E.trackIdx = trackIdx;

  E.moves = (st, who, roll) => {
    const out = [];
    st.tok[who].forEach((p, i) => { if (p === -1 ? roll === 6 : p + roll <= 56) out.push(i); });
    return out;
  };
  E.apply = (st, who, roll, i) => {
    const s = JSON.parse(JSON.stringify(st));
    const p = s.tok[who][i], np = p === -1 ? 0 : p + roll;
    s.tok[who][i] = np;
    let captured = false;
    const ti = trackIdx(who, np);
    if (ti >= 0 && !E.SAFE.has(ti)) {
      const o = opp(who);
      s.tok[o] = s.tok[o].map((q) => { if (trackIdx(o, q) === ti) { captured = true; return -1; } return q; });
    }
    const finished = np === 56;
    s.roll = null;
    s.last = { who, roll, note: captured ? "captured" : finished ? "home" : "" };
    if (s.tok[who].every((q) => q === 56)) s.winner = who;
    else s.turn = roll === 6 || captured || finished ? who : opp(who); // 6, capture or reaching home = roll again
    return s;
  };
  /* roll the dice; if nothing can move, the turn passes */
  E.rollDice = (st, value) => {
    const s = JSON.parse(JSON.stringify(st));
    s.roll = value;
    if (!E.moves(s, s.turn, value).length) {
      s.last = { who: s.turn, roll: value, note: "stuck" };
      s.roll = null;
      s.turn = opp(s.turn);
    }
    return s;
  };

  /* ---------------- screen ---------------- */
  const TRK = new Map(T.map(([r, c], i) => [r + "," + c, i]));
  const homeKey = new Map();
  ["a", "b"].forEach((w) => E.HOME[w].forEach(([r, c]) => homeKey.set(r + "," + c, w)));

  LN.games.ludo = {
    icon: "🎲", name: "Ludo", desc: "Race your four hearts home. Capture and be captured!",
    tut: [
      { icon: "🎯", title: "The goal", text: "Get all 4 of your hearts around the board and into the centre home. You are pink if you're him, purple if you're her." },
      { icon: "🎲", title: "Rolling", text: "Tap Roll on your turn. You need a 6 to bring a heart out of your corner. Then tap a glowing heart to move it by the number rolled." },
      { icon: "⭐", title: "Rolling again", text: "You roll again after a 6, after capturing, and when a heart reaches home. Landing exactly on another player's heart sends it back to their corner." },
      { icon: "🛡️", title: "Safe squares", text: "Squares marked ★ are safe: nobody can be captured there. Your own colored entry square is safe too." },
      { icon: "🏠", title: "Getting home", text: "After a full lap your heart turns into your coloured home road. You need the exact number to land in the centre. Moves save automatically, so play at your own pace." }
    ],
    vs: true, offlineOk: true,
    async run(box, env, opts = {}) {
      const { U, db, ctx, A } = env, kit = LN.kit;
      const cpu = !!opts.cpu, level = opts.level || 2, nm = kit.namer(cpu);
      const local = db.mode === "local" && !cpu;
      const S = await kit.session(box, "ludo", E.fresh, paint, { cpu });
      let rolling = false, busy = false;

      function paint() {
        const st = S.st, mine = cpu ? st.turn === "a" : local || st.turn === ctx.who, who = st.turn;
        const opts = st.roll ? E.moves(st, who, st.roll) : [];
        const board = Array.from({ length: 15 }, () => Array(15).fill(null));
        for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) board[r][c] = { cls: cellClass(r, c), kids: [] };
        ["a", "b"].forEach((w) => st.tok[w].forEach((p, i) => {
          const [r, c] = E.cell(w, i, p);
          board[r][c].kids.push({ w, i, can: !st.winner && mine && w === who && opts.includes(i) });
        }));
        let html = "";
        for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) {
          const cell = board[r][c], ti = TRK.get(r + "," + c);
          const star = ti !== undefined && E.SAFE.has(ti) && !cell.kids.length ? "★" : "";
          html += `<div class="lc2 ${cell.cls}">${star}${cell.kids.map((k) => `<button class="lt lt-${k.w} ${k.can ? "can" : ""} n${cell.kids.length}" data-w="${k.w}" data-i="${k.i}" ${k.can ? "" : "tabindex=-1"} aria-label="${k.w === "a" ? "pink" : "purple"} heart">${k.w === "a" ? "💗" : "💜"}</button>`).join("")}</div>`;
        }
        const msg = st.winner ? `${U.esc(nm(st.winner))} wins! 🏆🎉`
          : `${mine ? "Your turn" : `Waiting for ${U.esc(nm(who))}…`} ${who === "a" ? "💗" : "💜"}`;
        const last = st.last ? ({ captured: "captured a heart! 💥", home: "got a heart home! 🏠", stuck: "had no move 🙈", "": "moved" }[st.last.note]) : "";
        box.innerHTML = `<p class="big-text center" aria-live="polite">${msg}</p>
          <div class="ludo">${html}</div>
          <div class="ludo-ctl"><div class="die" id="die" aria-live="polite">${st.roll || (st.last ? st.last.roll : "🎲")}</div>
            ${!st.winner && mine && !st.roll ? '<button class="btn" id="roll">Roll 🎲</button>' : st.roll && mine ? '<p class="muted">Tap a glowing heart to move it</p>' : ""}</div>
          <p class="muted center">${st.last ? `${U.esc(nm(st.last.who))} rolled ${st.last.roll} and ${last}` : "Roll a 6 to bring your first heart out"}</p>
          <div class="row end"><button class="btn small ghost" id="newg">New game</button></div>`;
        const rb = U.$("#roll", box);
        if (rb) rb.onclick = roll;
        U.$$(".lt.can", box).forEach((b) => (b.onclick = () => move(+b.dataset.i)));
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
          if (!st.roll) S.st = E.rollDice(st, 1 + kit.rand(6));
          else S.st = E.apply(st, "b", st.roll, LN.ai.ludo(st, "b", level));
          paint();
        }, 850);
      }
      function cellClass(r, c) {
        if (r < 6 && c < 6) return r > 0 && r < 5 && c > 0 && c < 5 ? "y ya" : "y yedge ya";
        if (r > 8 && c > 8) return r < 14 && c < 14 && r > 9 && c > 9 ? "y yb" : "y yedge yb";
        if (r < 6 && c > 8) return "y yx";
        if (r > 8 && c < 6) return "y yx";
        if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return "ctr";
        const k = r + "," + c, h = homeKey.get(k);
        if (h) return "hc h" + h;
        const ti = TRK.get(k);
        if (ti === undefined) return "hc hx";
        return "tk" + (ti === 0 ? " sa" : ti === 26 ? " sb" : "");
      }
      function roll() {
        if (rolling) return;
        rolling = true;
        const die = U.$("#die", box);
        let n = 0;
        const t = setInterval(() => { die.textContent = 1 + kit.rand(6); if (++n > 8) { clearInterval(t); finish(); } }, 70);
        function finish() {
          rolling = false;
          S.st = E.rollDice(S.st, 1 + kit.rand(6));
          paint(); S.save();
        }
      }
      function move(i) {
        const st = S.st;
        if (!st.roll) return;
        const was = JSON.stringify(st.tok);
        S.st = E.apply(st, st.turn, st.roll, i);
        if (S.st.last.note === "captured" || S.st.last.note === "home") A.burst(innerWidth / 2, 300, ["💥", "💗", "✨"], 12);
        if (S.st.winner) A.burst(innerWidth / 2, 300, ["🏆", "💗", "🎉"], 20);
        paint(); S.save();
      }
      paint();
    }
  };
})();
