/* 🎮 Play together: Memory Match, This or That, Heart Tic-Tac-Toe, Finish the Sentence */
LN.views.play = {
  game: null,
  timer: null,

  async render(root) {
    const V = LN.views.play, { util: U, gen: G, art: A, db } = LN, ctx = LN.ctx;
    clearInterval(V.timer);
    const today = U.dateKey();

    const REG = ["chess", "ludo", "ttt", "c4", "deep", "dice"];
    const menu = () => {
      V.game = null;
      LN.presence.setGame("");
      const off = !!LN.offlineOnly;
      const items = (off ? [["match", "🃏", "Memory Match", "Find the pairs. Beat your best!"]] : [["match", "🃏", "Memory Match", "Find the pairs. Beat each other's best!"], ["tot", "⚖️", "This or That", "5 quick picks a day. How alike are you?"], ["fin", "✏️", "Finish the Sentence", "A new sentence each day. Compare answers."]])
        .concat(REG.filter((k) => LN.games[k] && (!off || LN.games[k].offlineOk)).map((k) => [k, LN.games[k].icon, LN.games[k].name, LN.games[k].desc]));
      root.innerHTML = `<h2 class="page-title script">Play</h2>
        <p class="muted">Little games just for the two of you 🎮</p>
        ${off ? "" : '<p class="pchip" id="mchip"></p>'}
        <div class="gamegrid">${items.map(([k, e, n, d]) => `<button class="gamecard" data-g="${k}"><span class="ge">${e}</span><b>${U.esc(n)}</b><small>${U.esc(d)}</small></button>`).join("")}</div>`;
      U.$$(".gamecard", root).forEach((b) => (b.onclick = () => { V.game = b.dataset.g; start(); }));
      const chip = U.$("#mchip", root);
      if (chip) {
        const upd = () => {
          if (!document.body.contains(chip)) return unsub();
          const t = LN.presence.text(), g = LN.presence.game && LN.games[LN.presence.game];
          chip.className = "pchip " + t.cls;
          chip.innerHTML = U.esc(t.text) + (g ? ` · <button class="linkbtn" id="joinbtn">Join ${U.esc(ctx.name(ctx.other))} in ${U.esc(g.name)} →</button>` : "");
          const j = U.$("#joinbtn", chip);
          if (j) j.onclick = () => { V.game = LN.presence.game; start(); };
        };
        const unsub = LN.presence.on(upd);
        upd();
      }
    };

    const shell = (title, body) => {
      root.innerHTML = `<button class="btn small ghost" id="gback">‹ All games</button><h2 class="page-title script">${title}</h2><div id="gbody">${body || ""}</div>`;
      U.$("#gback", root).onclick = () => { clearInterval(V.timer); menu(); };
      return U.$("#gbody", root);
    };

    /* ---------------- Memory Match ---------------- */
    async function match() {
      const box = shell("Memory Match");
      let scores = {};
      try { scores = (await db.kvGet("scores")) || {}; } catch (e) {}
      const symbols = U.shuffle(Math.random, LN.content.matchEmoji).slice(0, 6);
      const cards = U.shuffle(Math.random, [...symbols, ...symbols]);
      let first = null, lock = false, moves = 0, found = 0;
      const best = () => ["a", "b"].map((w) => `<span class="chip ${scores[w] ? "yes" : ""}">${U.esc(ctx.name(w))}: ${scores[w] ? scores[w] + " moves" : "no score yet"}</span>`).join("");
      box.innerHTML = `<div class="row wrap">${best()}</div><p class="g-count2">Moves: <b id="mv">0</b></p><div class="mgrid" id="mg"></div><p id="mres" aria-live="polite"></p>`;
      const grid = U.$("#mg", box);
      cards.forEach((s, i) => {
        const c = document.createElement("button");
        c.className = "mcard"; c.setAttribute("aria-label", "Card");
        c.innerHTML = `<span class="mf">🌸</span><span class="mb">${s}</span>`;
        c.onclick = async () => {
          if (lock || c.classList.contains("up")) return;
          c.classList.add("up");
          if (!first) { first = c; return; }
          U.$("#mv", box).textContent = ++moves;
          if (first.textContent.slice(2) === c.textContent.slice(2)) { // same symbol
            first.classList.add("done"); c.classList.add("done"); first = null;
            if (++found === 6) {
              const r = c.getBoundingClientRect(); A.burst(r.left, r.top, ["🌸", "💗", "✨"], 16);
              const prev = scores[ctx.who];
              let msg = `All matched in ${moves} moves! 💗`;
              if (!prev || moves < prev) { scores[ctx.who] = moves; msg += " New personal best! 🏆"; try { await db.kvSet("scores", scores); } catch (e) {} }
              U.$("#mres", box).innerHTML = `${U.esc(msg)} <button class="btn small" id="again">Play again</button>`;
              U.$("#again", box).onclick = match;
            }
          } else {
            lock = true; const a = first; first = null;
            setTimeout(() => { a.classList.remove("up"); c.classList.remove("up"); lock = false; }, 800);
          }
        };
        grid.appendChild(c);
      });
    }

    /* ---------------- This or That ---------------- */
    async function tot() {
      const box = shell("This or That");
      let rows = [];
      try { rows = (await db.list("answers")).filter((r) => r.kind === "game" && r.qid === "tot:" + today); } catch (e) { U.toast("Couldn't load"); }
      const bank = LN.content.thisOrThat;
      const order = U.shuffle(U.rng(U.hash("tot" + today)), bank.map((_, i) => i)).slice(0, 5);
      const mine = rows.find((r) => r.author === ctx.who), theirs = rows.find((r) => r.author !== ctx.who);

      const results = () => {
        const a = JSON.parse(mine.text), b = theirs ? JSON.parse(theirs.text) : null;
        let same = 0;
        const lines = order.map((qi, i) => {
          const p = bank[qi], me = p[a[i]], th = b ? p[b[i]] : null;
          if (b && a[i] === b[i]) same++;
          return `<div class="totrow ${b && a[i] === b[i] ? "same" : ""}"><span>${U.esc(me)}</span><small>${b ? (a[i] === b[i] ? "💞" : "🙈") : ""}</small><span>${th ? U.esc(th) : "…"}</span></div>`;
        }).join("");
        box.innerHTML = `<div class="card"><div class="totrow head"><b>${U.esc(ctx.name(ctx.who))}</b><span></span><b>${U.esc(ctx.name(ctx.other))}</b></div>${lines}
          ${b ? `<p class="big-text center">You matched on <b>${same} of 5</b> ${same >= 4 ? "🥰 soulmates!" : same >= 2 ? "💗 so cute" : "😂 opposites attract!"}</p>` : `<p class="muted center">Waiting for ${U.esc(ctx.name(ctx.other))} to play today 🌷</p>`}</div>
          <p class="muted center">A new set arrives tomorrow.</p>`;
        if (b) A.burst(innerWidth / 2, 200, ["💞", "✨"], 8);
      };
      if (mine) return results();

      const picks = [];
      const ask = (i) => {
        const p = bank[order[i]];
        box.innerHTML = `<div class="card center"><p class="eyebrow">Question ${i + 1} of 5</p>
          <div class="totbtns"><button class="btn totb" data-c="0">${U.esc(p[0])}</button><span class="or">or</span><button class="btn totb ghost" data-c="1">${U.esc(p[1])}</button></div></div>`;
        U.$$(".totb", box).forEach((b) => (b.onclick = async () => {
          picks.push(+b.dataset.c);
          if (i < 4) return ask(i + 1);
          try {
            mine_ = await db.add("answers", { kind: "game", qid: "tot:" + today, qtext: "This or That", author: ctx.who, text: JSON.stringify(picks), day: today });
            rows.push(mine_); rows.sort(() => 0);
            tot();
          } catch (e) { U.toast("Couldn't save. Try again."); }
        }));
      };
      let mine_;
      ask(0);
    }

    /* ---------------- Finish the Sentence ---------------- */
    async function fin() {
      const box = shell("Finish the Sentence");
      let rows = [];
      try { rows = (await db.list("answers")).filter((r) => r.kind === "game" && r.qid === "fin:" + today); } catch (e) {}
      const prompt = G.cycle(today, LN.content.sentences, "fin");
      const mine = rows.find((r) => r.author === ctx.who), theirs = rows.find((r) => r.author !== ctx.who);
      box.innerHTML = `<div class="card"><p class="qtext">${U.esc(prompt)}</p><div class="answers">
        <div class="ans mine"><p class="eyebrow">${U.esc(ctx.name(ctx.who))}</p>${mine ? `<p class="pre">${U.esc(mine.text)}</p>` : `<textarea rows="3" maxlength="500" placeholder="…"></textarea><button class="btn small" id="fsave">Share 💗</button>`}</div>
        <div class="ans theirs ${mine ? "" : "locked"}"><p class="eyebrow">${U.esc(ctx.name(ctx.other))}</p>${!mine ? `<p class="muted">🔒 Finish yours to peek${theirs ? " (it's waiting!)" : ""}.</p>` : theirs ? `<p class="pre">${U.esc(theirs.text)}</p>` : `<p class="muted">Waiting… 🌷</p>`}</div></div></div>`;
      const s = U.$("#fsave", box);
      if (s) s.onclick = async () => {
        const text = U.$("textarea", box).value.trim();
        if (!text) return U.toast("Write something first 🌷");
        try { await db.add("answers", { kind: "game", qid: "fin:" + today, qtext: prompt, author: ctx.who, text, day: today }); fin(); } catch (e) { U.toast("Couldn't save. Try again."); }
      };
    }

    const start = async () => {
      const g = LN.games[V.game];
      if (!g) return ({ match, tot, fin }[V.game] || menu)();
      const game = V.game, body = shell(g.name);
      const how = document.createElement("button");
      how.className = "btn small ghost"; how.id = "how"; how.textContent = "📖 How to play";
      how.onclick = () => LN.kit.tutorial(game, g.tut, true);
      U.$("#gback", root).after(" ", how);
      const alive = () => V.game === game && document.body.contains(body);
      await LN.kit.tutorial(game, g.tut);
      if (!alive()) return;
      let opts = {};
      if (g.vs) { opts = await LN.kit.chooser(body); if (!alive()) return; }
      /* a status line above the board: who you're playing, and whether she's online */
      const stat = document.createElement("div");
      stat.className = "gstat"; stat.id = "gstat";
      body.before(stat);
      const lv = { 1: "Easy", 2: "Medium", 3: "Hard" };
      if (g.vs && opts.cpu) { stat.innerHTML = `<span class="pchip on">🤖 You vs the computer · ${lv[opts.level]}</span> <button class="linkbtn" id="chg">Change opponent</button>`; LN.presence.setGame(""); }
      else {
        LN.presence.setGame(game);
        const upd = () => {
          if (!document.body.contains(stat)) return unsub();
          const t = LN.presence.text();
          stat.innerHTML = `<span class="pchip ${t.cls}">${U.esc(t.text)}</span>${g.vs ? ' <button class="linkbtn" id="chg">Change opponent</button>' : ""}`;
          const c = U.$("#chg", stat); if (c) c.onclick = start;
        };
        const unsub = LN.presence.on(upd);
        upd();
      }
      const chg = U.$("#chg", stat); if (chg) chg.onclick = start;
      try { await g.run(body, { U, db, ctx, A, G }, opts); } catch (e) { console.error(e); body.innerHTML = `<p class="empty">This game wandered off 🥀 Try again.</p>`; }
    };

    if (V.game) start(); else menu();
  }
};
