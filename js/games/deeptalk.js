/* 🌠 Deep Talk: endless fresh, positive questions. Answer, then peek at each other's. */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.games = LN.games || {};

  /* returns { text, cat }. Never repeats until every question has been used. */
  LN.deepQuestion = (catId, seen) => {
    const D = LN.content.deepTalk, U = LN.util, pickR = (a) => a[Math.floor(Math.random() * a.length)];
    const cats = catId && catId !== "all" ? D.cats.filter((c) => c.id === catId) : D.cats;
    const make = () => {
      const c = pickR(cats);
      const useT = Math.random() < 0.5 && c.templates.length;
      let text = useT ? pickR(c.templates) : pickR(c.curated);
      text = text.replace(/\{(\w+)\}/g, (m, k) => (D.slots[k] ? pickR(D.slots[k]) : m));
      return { text, cat: c };
    };
    for (let i = 0; i < 60; i++) { const q = make(); if (!seen || !seen.has(q.text)) { seen && seen.add(q.text); return q; } }
    seen && seen.clear();
    return make();
  };

  LN.games.deep = {
    icon: "🌠", name: "Deep Talk", desc: "Fresh romantic questions that build your future. Tap 🔄 for a new one.",
    tut: [
      { icon: "🔄", title: "Endless questions", text: "Every tap on 'New question' makes a fresh, positive question about your dreams, your closeness and your future. Pick a theme or mix them all." },
      { icon: "✍️", title: "Answer honestly", text: "Write your answer first. Then you can peek at your partner's, and talk about it together in person or on a call." },
      { icon: "📖", title: "Your little book", text: "Every answer is saved below, so you can look back at how your dreams and feelings grow over time." }
    ],
    async run(box, env) {
      const { U, db, ctx } = env;
      const seen = new Set();
      let cat = "all", q = LN.deepQuestion(cat, seen), rows = [];
      const load = async () => { try { rows = (await db.list("answers")).filter((r) => r.kind === "game" && r.qid.startsWith("dt:")); } catch (e) {} };
      await load();

      const thread = (qid, text) => {
        const mine = rows.find((r) => r.qid === qid && r.author === ctx.who), theirs = rows.find((r) => r.qid === qid && r.author !== ctx.who);
        const d = document.createElement("div");
        d.innerHTML = `<div class="answers">
          <div class="ans mine by-${ctx.who}"><p class="eyebrow">${U.esc(ctx.name(ctx.who))}</p>${mine ? `<p class="pre">${U.esc(mine.text)}</p>` : `<textarea rows="4" maxlength="2000" placeholder="Your answer…"></textarea><button class="btn small save">Save answer 💗</button>`}</div>
          <div class="ans theirs by-${ctx.other} ${mine ? "" : "locked"}"><p class="eyebrow">${U.esc(ctx.name(ctx.other))}</p>${!mine ? `<p class="muted">🔒 Answer first to peek${theirs ? " (it's waiting!)" : ""}.</p>` : theirs ? `<p class="pre">${U.esc(theirs.text)}</p>` : `<p class="muted">Waiting… 🌷</p>`}</div></div>`;
        const save = U.$(".save", d);
        if (save) save.onclick = async () => {
          const v = U.$("textarea", d).value.trim();
          if (!v) return U.toast("Write something first 🌷");
          save.disabled = true;
          try { await db.add("answers", { kind: "game", qid, qtext: text, author: ctx.who, text: v, day: U.dateKey() }); await load(); paint(); U.toast("Saved 💗"); }
          catch (e) { save.disabled = false; U.toast("Couldn't save. Try again."); }
        };
        return d;
      };

      function paint() {
        const D = LN.content.deepTalk, qid = "dt:" + U.hash(q.text);
        box.innerHTML = `<div class="tabs">${[{ id: "all", emoji: "✨", name: "Mix" }, ...D.cats].map((c) => `<button class="${c.id === cat ? "on" : ""}" data-c="${c.id}">${c.emoji} ${U.esc(c.name)}</button>`).join("")}</div>
          <section class="card"><p class="eyebrow">${q.cat.emoji} ${U.esc(q.cat.name)}</p><p class="qtext" id="dq">${U.esc(q.text)}</p><div id="dth"></div>
          <div class="row"><button class="btn small ghost" id="newq">🔄 New question</button></div></section>
          <h3 class="sub">Our answers so far</h3><div id="dhist" class="stack"></div>`;
        U.$$(".tabs button", box).forEach((b) => (b.onclick = () => { cat = b.dataset.c; q = LN.deepQuestion(cat, seen); paint(); }));
        U.$("#newq", box).onclick = () => { q = LN.deepQuestion(cat, seen); paint(); };
        U.$("#dth", box).appendChild(thread(qid, q.text));
        const hist = U.$("#dhist", box), done = new Map();
        rows.forEach((r) => { if (r.qid !== qid && !done.has(r.qid)) done.set(r.qid, r); });
        if (!done.size) hist.innerHTML = `<p class="empty">Your answers will collect here 📖</p>`;
        done.forEach((r, id) => { const c = document.createElement("section"); c.className = "card"; c.innerHTML = `<p class="eyebrow">${U.esc(U.fmtDate(r.created_at))}</p><p class="qtext">${U.esc(r.qtext)}</p>`; c.appendChild(thread(id, r.qtext)); hist.appendChild(c); });
      }
      paint();
    }
  };
})();
