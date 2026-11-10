/* ▫️ Dots & Boxes: draw lines between dots. Close a box and it's yours, plus you go again! */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.games = LN.games || {};
  LN.engines = LN.engines || {};
  const E = (LN.engines.dots = {});
  const B = 4; // 4 x 4 boxes (5 x 5 dots)
  const other = (w) => (w === "a" ? "b" : "a");
  const H = (r, c) => r * B + c, V = (r, c) => r * (B + 1) + c; // h: (B+1) rows x B, v: B rows x (B+1)
  E.fresh = () => ({ h: Array((B + 1) * B).fill(""), v: Array(B * (B + 1)).fill(""), box: Array(B * B).fill(""), turn: "a", winner: "", last: "" });
  const sides = (st, r, c) => [st.h[H(r, c)], st.h[H(r + 1, c)], st.v[V(r, c)], st.v[V(r, c + 1)]].filter(Boolean).length;
  const touching = (k, r, c) => (k === "h" ? [[r - 1, c], [r, c]] : [[r, c - 1], [r, c]]).filter(([rr, cc]) => rr >= 0 && rr < B && cc >= 0 && cc < B);

  /* k = "h" or "v", (r, c) = the line's position */
  E.apply = (st, k, r, c) => {
    if (st.winner) return null;
    const arr = k === "h" ? st.h : st.v, i = k === "h" ? H(r, c) : V(r, c);
    if (arr[i]) return null;
    const s = { h: st.h.slice(), v: st.v.slice(), box: st.box.slice(), turn: st.turn, winner: "", last: k + r + "," + c };
    (k === "h" ? s.h : s.v)[i] = st.turn;
    let got = 0;
    touching(k, r, c).forEach(([rr, cc]) => { if (sides(s, rr, cc) === 4 && !s.box[rr * B + cc]) { s.box[rr * B + cc] = st.turn; got++; } });
    if (!got) s.turn = other(st.turn);
    if (s.box.every(Boolean)) { const a = s.box.filter((x) => x === "a").length, b = B * B - a; s.winner = a === b ? "draw" : a > b ? "a" : "b"; }
    return s;
  };
  E.edges = (st) => { const o = []; for (let r = 0; r <= B; r++) for (let c = 0; c < B; c++) if (!st.h[H(r, c)]) o.push(["h", r, c]); for (let r = 0; r < B; r++) for (let c = 0; c <= B; c++) if (!st.v[V(r, c)]) o.push(["v", r, c]); return o; };
  E.score = (st) => ({ a: st.box.filter((x) => x === "a").length, b: st.box.filter((x) => x === "b").length });

  /* computer: 1 = random, 2 = takes any box it can, 3 = also avoids handing you a box */
  E.ai = (st, level) => {
    const es = E.edges(st), pick = (a) => a[Math.floor(Math.random() * a.length)];
    if (level <= 1) return pick(es);
    const takes = es.filter((e) => touching(e[0], e[1], e[2]).some(([r, c]) => sides(st, r, c) === 3));
    if (takes.length) return pick(takes);
    if (level === 2) return pick(es);
    const safe = es.filter((e) => touching(e[0], e[1], e[2]).every(([r, c]) => sides(st, r, c) < 2));
    if (safe.length) return pick(safe);
    let best = [], bv = 99; // everything gives something away: give the least
    es.forEach((e) => { const v = touching(e[0], e[1], e[2]).filter(([r, c]) => sides(st, r, c) === 2).length; if (v < bv) { bv = v; best = [e]; } else if (v === bv) best.push(e); });
    return pick(best);
  };

  LN.games.dots = {
    icon: "▫️", name: "Dots & Boxes", desc: "Draw lines, close boxes, steal the most.",
    tut: [
      { icon: "🎯", title: "The goal", text: "Close more boxes than your partner. He is 💜, she is 🌸." },
      { icon: "✏️", title: "Your move", text: "Tap the space between two dots to draw a line. When your line finishes a box, it turns your color and you get to go again!" },
      { icon: "🧠", title: "Tip", text: "Try not to draw the third side of a box, or your partner will happily close it. Late in the game, that's where the fun trading begins." }
    ],
    vs: true, offlineOk: true,
    async run(box, env, opts = {}) {
      const { U, db, ctx, A } = env, kit = LN.kit;
      const cpu = !!opts.cpu, level = opts.level || 2, nm = kit.namer(cpu), local = db.mode === "local" && !cpu;
      let busy = false;
      const S = await kit.session(box, "dots", E.fresh, paint, { cpu, level });
      const MK = { a: "💜", b: "🌸" };
      function paint() {
        const st = S.st, mine = cpu ? st.turn === "a" : local || st.turn === ctx.who, sc = E.score(st);
        let cells = "";
        for (let R = 0; R <= 2 * B; R++) for (let C = 0; C <= 2 * B; C++) {
          if (R % 2 === 0 && C % 2 === 0) cells += `<i class="dd"></i>`;
          else if (R % 2 === 0) { const r = R / 2, c = (C - 1) / 2, o = st.h[H(r, c)]; cells += `<button class="de h ${o ? "own-" + o : ""} ${st.last === "h" + r + "," + c ? "lastm" : ""}" data-k="h" data-r="${r}" data-c="${c}" aria-label="line"></button>`; }
          else if (C % 2 === 0) { const r = (R - 1) / 2, c = C / 2, o = st.v[V(r, c)]; cells += `<button class="de v ${o ? "own-" + o : ""} ${st.last === "v" + r + "," + c ? "lastm" : ""}" data-k="v" data-r="${r}" data-c="${c}" aria-label="line"></button>`; }
          else { const o = st.box[((R - 1) / 2) * B + (C - 1) / 2]; cells += `<span class="db ${o ? "own-" + o : ""}">${o ? MK[o] : ""}</span>`; }
        }
        const msg = st.winner === "draw" ? "It's a draw 🤝" : st.winner ? `${U.esc(nm(st.winner))} wins! ${MK[st.winner]}🎉` : mine ? `Your turn ${MK[cpu ? "a" : local ? st.turn : ctx.who]}` : `Waiting for ${U.esc(nm(st.turn))}… ${MK[st.turn]}`;
        box.innerHTML = `<p class="big-text center" aria-live="polite">${msg}</p><p class="center muted">${MK.a} ${sc.a} · ${MK.b} ${sc.b}</p>
          <div class="dgrid" style="--n:${B}">${cells}</div><div class="row end"><button class="btn small ghost" id="newg">New game</button></div>`;
        U.$$(".de", box).forEach((b) => (b.onclick = () => {
          if (st.winner) return;
          if (!mine) return U.toast("Wait for your turn 🌷");
          const n = E.apply(st, b.dataset.k, +b.dataset.r, +b.dataset.c);
          if (!n) return;
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
          const e = E.ai(st, level), n = E.apply(st, e[0], e[1], e[2]);
          if (n) S.st = n;
          paint();
        }, 600);
      }
      paint();
    }
  };
})();
