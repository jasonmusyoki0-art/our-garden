/* 🏆 Love League: who's winning, head-to-head per game, your record against the computer, and recent results.
   Every finished game saves one little row (see kit.record in kit.js). Edit the points or titles below any time. */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.games = LN.games || {};
  const POINTS = { win: 3, draw: 1 };                       // points per game against each other
  const TITLES = [[0, "Little Sprout 🌱"], [6, "Budding Challenger 🌷"], [15, "Blooming Rival 🌸"], [30, "Rose Champion 🌹"], [60, "Garden Legend 👑"]];
  const NAMES = { chess: "Chess ♟️", ludo: "Ludo 🎲", ttt: "Tic-Tac-Toe ⭕", c4: "Connect Four 🔴", reversi: "Reversi ⚫", dots: "Dots & Boxes ▫️", pong: "Ping-Pong 🏓", rps: "Rock Paper Scissors ✊" };
  const LV = { 1: "Easy", 2: "Medium", 3: "Hard" };
  const titleFor = (pts) => TITLES.filter((t) => pts >= t[0]).pop()[1];

  /* turns the raw rows (newest first) into the numbers we show */
  const league = (LN.league = {
    summary(rows) {
      const pvp = rows.filter((r) => r.mode === "pvp");
      const S = { a: { w: 0, pts: 0 }, b: { w: 0, pts: 0 }, draws: 0, games: pvp.length, per: {}, streak: { who: "", n: 0 } };
      pvp.forEach((r) => {
        const g = (S.per[r.game] = S.per[r.game] || { a: 0, b: 0, d: 0 });
        if (r.winner === "a" || r.winner === "b") { S[r.winner].w++; S[r.winner].pts += POINTS.win; g[r.winner]++; }
        else { S.draws++; S.a.pts += POINTS.draw; S.b.pts += POINTS.draw; g.d++; }
      });
      for (const r of pvp) { // rows are newest first: count the current winning streak
        if (r.winner !== "a" && r.winner !== "b") break;
        if (!S.streak.who) S.streak.who = r.winner;
        if (r.winner !== S.streak.who) break;
        S.streak.n++;
      }
      S.cpu = { a: {}, b: {} };
      rows.filter((r) => r.mode === "cpu").forEach((r) => {
        const p = (S.cpu[r.author] = S.cpu[r.author] || {});
        const l = (p[r.level] = p[r.level] || { w: 0, l: 0, d: 0 });
        if (r.winner === "draw") l.d++; else if (r.winner === r.author) l.w++; else l.l++;
      });
      S.title = { a: titleFor(S.a.pts), b: titleFor(S.b.pts) };
      S.lead = S.a.pts === S.b.pts ? "" : S.a.pts > S.b.pts ? "a" : "b";
      return S;
    },
    line(r) {
      const { util: U, ctx } = LN;
      const g = NAMES[r.game] || r.game;
      const who = r.winner === "draw" ? "A draw 🤝" : r.winner === "cpu" ? "The computer won 🤖" : `${U.esc(ctx.name(r.winner))} won 🏆`;
      const vs = r.mode === "cpu" ? ` · ${U.esc(ctx.name(r.author))} vs computer (${LV[r.level] || ""})` : "";
      return `<b>${g}</b> · ${who}${vs}`;
    },
    /* a small strip for the Play menu */
    async strip() {
      const { util: U, ctx, db } = LN;
      const rows = await db.list("results");
      const S = league.summary(rows);
      if (!S.games) return `<button class="league" data-g="scores"><b>🏆 Love League</b><small>Play a game together and the scoreboard begins!</small></button>`;
      return `<button class="league" data-g="scores"><b>🏆 Love League</b>
        <span class="lscore"><span>${U.esc(ctx.name("a"))} <i>${S.a.w}</i></span><em>–</em><span><i>${S.b.w}</i> ${U.esc(ctx.name("b"))}</span></span>
        <small>${S.lead ? `${U.esc(ctx.name(S.lead))} leads` : "All square"}${S.draws ? ` · ${S.draws} draw${S.draws > 1 ? "s" : ""}` : ""} · tap for details</small></button>`;
    }
  });

  LN.games.scores = {
    icon: "🏆", name: "Love League", desc: "Scoreboard, rankings and recent results.", offlineOk: false, tut: [],
    async run(box, env) {
      const { U, db, ctx } = env;
      let rows;
      try { rows = await db.list("results"); }
      catch (e) { box.innerHTML = `<p class="empty">Couldn't load results 🥀 If this is new, run <code>supabase/add-chat-and-results.sql</code> once (see the README).</p>`; return; }
      const S = league.summary(rows);
      const nm = (w) => U.esc(ctx.name(w));
      const card = (w) => `<div class="lcard p-${w} ${S.lead === w ? "lead" : ""}"><div class="lcrown">${S.lead === w ? "👑" : "🌸"}</div><b>${nm(w)}</b>
        <div class="lbig">${S[w].w}<small> wins</small></div><div class="ltitle">${U.esc(S.title[w])}</div><small>${S[w].pts} points</small></div>`;
      const per = Object.keys(S.per).map((k) => `<tr><td>${NAMES[k] || U.esc(k)}</td><td>${S.per[k].a}</td><td>${S.per[k].d}</td><td>${S.per[k].b}</td></tr>`).join("");
      const cpuRow = (w) => {
        const p = S.cpu[w] || {};
        const cells = [1, 2, 3].map((l) => p[l] ? `${p[l].w}W ${p[l].l}L${p[l].d ? " " + p[l].d + "D" : ""}` : "–");
        return `<tr><td>${nm(w)}</td>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
      };
      const recent = rows.slice(0, 15).map((r) => `<li>${league.line(r)}<small>${U.esc(U.fmtDate(r.created_at))}</small></li>`).join("");
      box.innerHTML = `<div class="lgrid">${card("a")}${card("b")}</div>
        <p class="center muted">${S.games ? `${S.games} game${S.games > 1 ? "s" : ""} played together${S.draws ? ` · ${S.draws} draw${S.draws > 1 ? "s" : ""}` : ""}${S.streak.n > 1 ? ` · 🔥 ${nm(S.streak.who)} is on a ${S.streak.n}-win streak` : ""}` : "No games together yet. Win 3 points, draw 1 🌷"}</p>
        ${per ? `<section class="card"><h3>Head to head</h3><table class="ltable"><thead><tr><th>Game</th><th>${nm("a")}</th><th>Draws</th><th>${nm("b")}</th></tr></thead><tbody>${per}</tbody></table></section>` : ""}
        <section class="card"><h3>Against the computer 🤖</h3><table class="ltable"><thead><tr><th></th><th>Easy</th><th>Medium</th><th>Hard</th></tr></thead><tbody>${cpuRow("a")}${cpuRow("b")}</tbody></table></section>
        <section class="card"><h3>Recent results</h3>${recent ? `<ul class="lrecent">${recent}</ul>` : `<p class="muted">Nothing yet. Go play! 🎮</p>`}</section>`;
    }
  };
})();
