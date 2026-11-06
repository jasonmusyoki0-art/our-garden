LN.views.questions = {
  async render(root) {
    const { util: U, gen: G, db } = LN, ctx = LN.ctx;
    const today = U.dateKey();
    let rows = [];
    try { rows = await db.list("answers"); } catch (e) { U.toast("Couldn't load answers"); }
    const asks = rows.filter((r) => r.kind === "ask");
    const ans = rows.filter((r) => r.kind === "answer");
    const dailyQ = G.questionFor(today);
    let current = { qid: "daily:" + today, qtext: dailyQ };

    const thread = (qid, qtext) => {
      const mine = ans.find((a) => a.qid === qid && a.author === ctx.who);
      const theirs = ans.find((a) => a.qid === qid && a.author !== ctx.who);
      const d = document.createElement("div");
      d.className = "thread";
      d.innerHTML = `<p class="qtext">${U.esc(qtext)}</p>
        <div class="answers">
          <div class="ans mine"><p class="eyebrow">${U.esc(ctx.name(ctx.who))}</p>
            ${mine ? `<p class="pre">${U.esc(mine.text)}</p><button class="btn small ghost del">Delete my answer</button>`
                   : `<textarea rows="4" maxlength="2000" placeholder="Your answer…"></textarea><button class="btn small save">Save answer 💗</button>`}
          </div>
          <div class="ans theirs ${mine ? "" : "locked"}"><p class="eyebrow">${U.esc(ctx.name(ctx.other))}</p>
            ${!mine ? `<p class="muted">🔒 Answer first to peek at ${U.esc(ctx.name(ctx.other))}'s answer${theirs ? " (it's waiting!)" : ""}.</p>`
              : theirs ? `<p class="pre">${U.esc(theirs.text)}</p>` : `<p class="muted">Waiting for ${U.esc(ctx.name(ctx.other))}… 🌷</p>`}
          </div></div>`;
      const save = U.$(".save", d);
      if (save) save.onclick = async () => {
        const text = U.$("textarea", d).value.trim();
        if (!text) return U.toast("Write something first 🌷");
        save.disabled = true;
        try { await db.add("answers", { kind: "answer", qid, qtext, author: ctx.who, text, day: today }); U.toast("Saved 💗"); LN.views.questions.render(root); }
        catch (e) { save.disabled = false; U.toast("Couldn't save. Try again."); }
      };
      const del = U.$(".del", d);
      if (del) del.onclick = async () => { if (U.confirm("Delete your answer?")) { await db.remove("answers", mine.id); LN.views.questions.render(root); } };
      return d;
    };

    root.innerHTML = `<h2 class="page-title script">Questions</h2>
      <section class="card"><p class="eyebrow">Question of the day</p><div id="q-main"></div>
        <div class="row"><button class="btn small ghost" id="another">🎲 Another question</button></div></section>
      <section class="card"><h3>Ask her something of your own</h3>
        <form id="askf" class="row wrap"><input name="q" maxlength="200" placeholder="Ask anything…" required><button class="btn small">Send 💌</button></form></section>
      <div id="pending"></div>
      <h3 class="sub">Our answers so far</h3><div id="archive" class="stack"></div>`;

    const main = U.$("#q-main", root);
    main.appendChild(thread(current.qid, current.qtext));

    U.$("#another", root).onclick = () => {
      const all = LN.content.questions;
      const q = LN.deepQuestion && Math.random() < 0.5 ? LN.deepQuestion("all", LN._qseen || (LN._qseen = new Set())).text : U.pick(Math.random, all);
      current = { qid: "rand:" + U.hash(q), qtext: q };
      main.innerHTML = "";
      main.appendChild(thread(current.qid, current.qtext));
    };

    U.$("#askf", root).onsubmit = async (e) => {
      e.preventDefault();
      const q = new FormData(e.target).get("q").trim();
      if (!q) return;
      await db.add("answers", { kind: "ask", qid: "", qtext: q, author: ctx.who, text: "", day: today });
      U.toast("Question sent 💌");
      LN.views.questions.render(root);
    };

    /* questions the other person asked that I haven't answered yet, plus my own asks */
    const pend = U.$("#pending", root);
    asks.forEach((a) => {
      const qid = "ask:" + a.id;
      const card = document.createElement("section");
      card.className = "card";
      card.innerHTML = `<p class="eyebrow">${a.author === ctx.who ? "You asked" : ctx.name(a.author) + " asked you"}</p>`;
      card.appendChild(thread(qid, a.qtext));
      pend.appendChild(card);
    });

    /* archive of every thread where at least one answer exists (daily + random) */
    const seen = new Map();
    ans.forEach((a) => { if (!a.qid.startsWith("ask:") && !seen.has(a.qid)) seen.set(a.qid, a); });
    const arch = U.$("#archive", root);
    if (!seen.size) arch.innerHTML = `<p class="empty">Your answers will grow into a little book here 📖</p>`;
    seen.forEach((a, qid) => {
      if (qid === current.qid) return;
      const c = document.createElement("section");
      c.className = "card";
      c.innerHTML = `<p class="eyebrow">${U.esc(U.fmtDate(a.created_at))}</p>`;
      c.appendChild(thread(qid, a.qtext));
      arch.appendChild(c);
    });
  }
};
