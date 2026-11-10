/* 💞 How Well Do You Know Me? Each day: 5 questions. You answer for yourself AND guess your partner's answers.
   When you've both played you see who knows who best. Add your own questions to the list below any time! */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.games = LN.games || {};
  const BANK = [
    ["Perfect lazy day", ["Sleeping in", "Movie marathon", "Long walk outside", "Cooking something yummy"]],
    ["Dream holiday", ["Beach", "Mountains", "A big city", "A cosy cabin"]],
    ["Comfort food", ["Pizza", "Something sweet", "Hot soup", "Fries"]],
    ["Go-to drink", ["Coffee", "Tea", "Juice", "Soda"]],
    ["Best time of day", ["Early morning", "Afternoon", "Evening", "Late at night"]],
    ["Ideal date night", ["Dinner out", "Movie at home", "Adventure outdoors", "Games together"]],
    ["Favorite season", ["Summer", "Rainy season", "Cool breezy days", "Holiday season"]],
    ["Way to relax", ["Music", "Scrolling my phone", "A nap", "A hot bath or shower"]],
    ["Favorite way to be shown love", ["Words", "Hugs", "Gifts", "Time together"]],
    ["Superpower I'd pick", ["Fly", "Be invisible", "Read minds", "Stop time"]],
    ["Pet I'd have", ["Dog", "Cat", "Bunny", "No pets"]],
    ["Movie type", ["Romance", "Comedy", "Action", "Scary"]],
    ["Breakfast", ["Eggs", "Pancakes", "Cereal", "Just coffee"]],
    ["Biggest fear", ["Spiders", "Heights", "Being alone", "Public speaking"]],
    ["Dessert", ["Ice cream", "Cake", "Chocolate", "Fruit"]],
    ["Music mood", ["Chill", "Dance", "Slow love songs", "Old favorites"]],
    ["Gift I'd love most", ["Something handmade", "A surprise trip", "Flowers", "A heartfelt letter"]],
    ["I'm most likely to", ["Be late", "Cry at a movie", "Fall asleep first", "Steal the blankets"]],
    ["Perfect weekend", ["Staying in", "Trying a new place", "Seeing friends", "Being with just us"]],
    ["Morning person or night owl?", ["Morning person", "Night owl", "Depends on the day", "Neither, sleepy always"]],
    ["Favorite snack", ["Chips", "Fruit", "Sweets", "Nuts or popcorn"]],
    ["When I'm upset I want", ["Space", "A hug", "To talk it out", "Distraction"]]
  ];
  LN.games.know = {
    icon: "💞", name: "How Well Do You Know Me?", desc: "Answer for yourself, guess for them. Who wins?",
    tut: [
      { icon: "💞", title: "How it works", text: "Five new questions every day. For each one you pick YOUR answer, then guess what your partner would pick." },
      { icon: "🔍", title: "The reveal", text: "When you've both played, you'll see how many you guessed right about each other. Come back tomorrow for new questions!" }
    ],
    async run(box, env) {
      const { U, db, ctx, A } = env, today = U.dateKey(), qid = "know:" + today;
      let rows = [];
      try { rows = (await db.list("answers")).filter((r) => r.kind === "game" && r.qid === qid); } catch (e) { U.toast("Couldn't load"); }
      const order = U.shuffle(U.rng(U.hash("know" + today)), BANK.map((_, i) => i)).slice(0, 5);
      const mine = rows.find((r) => r.author === ctx.who), theirs = rows.find((r) => r.author !== ctx.who);
      const other = ctx.name(ctx.other);

      const results = () => {
        const a = JSON.parse(mine.text), b = theirs ? JSON.parse(theirs.text) : null;
        let myHits = 0, herHits = 0;
        const lines = order.map((qi, i) => {
          const [q, opts] = BANK[qi];
          const ok1 = b && a.guess[i] === b.me[i], ok2 = b && b.guess[i] === a.me[i];
          if (ok1) myHits++; if (ok2) herHits++;
          return `<div class="card knowrow"><p class="eyebrow">${U.esc(q)}</p>
            <p><b>${U.esc(ctx.name(ctx.who))}</b> said <span class="chip yes">${U.esc(opts[a.me[i]])}</span>${b ? ` · ${U.esc(other)} guessed <span class="chip ${ok2 ? "yes" : ""}">${U.esc(opts[b.guess[i]])}</span> ${ok2 ? "✅" : "❌"}` : ""}</p>
            ${b ? `<p><b>${U.esc(other)}</b> said <span class="chip yes">${U.esc(opts[b.me[i]])}</span> · you guessed <span class="chip ${ok1 ? "yes" : ""}">${U.esc(opts[a.guess[i]])}</span> ${ok1 ? "✅" : "❌"}</p>` : `<p class="muted">Waiting for ${U.esc(other)}…</p>`}</div>`;
        }).join("");
        const verdict = !b ? `Waiting for ${U.esc(other)} to play today 🌷` : myHits === herHits ? `A tie! You both got ${myHits}/5 💞` : myHits > herHits ? `You know ${U.esc(other)} best: ${myHits}/5 vs ${herHits}/5 🏆` : `${U.esc(other)} knows you best: ${herHits}/5 vs ${myHits}/5 🏆`;
        box.innerHTML = `<p class="big-text center">${verdict}</p>${lines}<p class="muted center">A new set arrives tomorrow.</p>`;
        if (b) A.burst(innerWidth / 2, 200, ["💞", "✨"], 8);
      };
      if (mine) return results();

      const me = [], guess = [];
      const ask = (i, phase) => {
        const [q, opts] = BANK[order[i]];
        const title = phase === "me" ? `${U.esc(q)}: <b>your</b> answer` : `${U.esc(q)}: what would <b>${U.esc(other)}</b> pick?`;
        box.innerHTML = `<div class="card center"><p class="eyebrow">Question ${i + 1} of 5 · ${phase === "me" ? "about you" : "your guess"}</p><p class="qtext">${title}</p>
          <div class="knowopts">${opts.map((o, k) => `<button class="btn ${phase === "me" ? "" : "ghost"} kopt" data-k="${k}">${U.esc(o)}</button>`).join("")}</div></div>`;
        U.$$(".kopt", box).forEach((b) => (b.onclick = async () => {
          (phase === "me" ? me : guess).push(+b.dataset.k);
          if (phase === "me") return ask(i, "guess");
          if (i < 4) return ask(i + 1, "me");
          try { await db.add("answers", { kind: "game", qid, qtext: "How well do you know me?", author: ctx.who, text: JSON.stringify({ me, guess }), day: today }); LN.games.know.run(box, env); }
          catch (e) { U.toast("Couldn't save. Try again."); }
        }));
      };
      ask(0, "me");
    }
  };
})();
