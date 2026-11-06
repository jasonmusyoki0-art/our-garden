LN.views.letters = {
  async render(root) {
    const { util: U, gen: G, art: A, db } = LN, S = G.settings;
    let tab = sessionStorage.getItem("ln_ltab") || "daily";
    const today = U.dateKey();
    let mine = [];
    try { mine = (await db.list("letters")).filter((l) => l.kind !== "openwhen"); } catch (e) { U.toast("Couldn't load letters"); }
    let ow = [];
    try { ow = (await db.list("letters")).filter((l) => l.kind === "openwhen"); } catch (e) {}

    const paper = (L) => `
      <article class="card letter ${L.paper}">
        <h3 class="script">${U.esc(L.greeting)}</h3>
        ${L.paras.map((p) => `<p>${U.esc(p)}</p>`).join("")}
        <p class="closing">${U.esc(L.closing)}</p><p class="sig script">${U.esc(L.signature)}</p><p class="ps">${U.esc(L.ps)}</p>
      </article>`;

    const draw = () => {
      sessionStorage.setItem("ln_ltab", tab);
      const tabs = [["daily", "🌸 Daily letters"], ["written", "✍️ Our letters"], ["open", "💌 Open when…"]];
      root.innerHTML = `
        <h2 class="page-title script">Letters</h2>
        <div class="tabs" role="tablist">${tabs.map(([k, n]) => `<button role="tab" class="${tab === k ? "on" : ""}" data-t="${k}">${n}</button>`).join("")}</div>
        <div id="ltab"></div>`;
      U.$$(".tabs button", root).forEach((b) => (b.onclick = () => { tab = b.dataset.t; draw(); }));
      const box = U.$("#ltab", root);

      if (tab === "daily") {
        box.innerHTML = `
          <p class="muted">A brand new letter appears every day, written just for her. Pick any past day to read it again.</p>
          <label class="field">Go to a day <input type="date" id="pday" max="${today}" value="${today}"></label>
          <div id="pletter"></div>
          <h3 class="sub">Recent days</h3>
          <div class="list" id="recent"></div>`;
        const show = (k) => (U.$("#pletter", box).innerHTML = paper(G.letterFor(k, S)));
        show(today);
        U.$("#pday", box).onchange = (e) => e.target.value && e.target.value <= today && show(e.target.value);
        const rec = U.$("#recent", box);
        for (let i = 1; i <= 14; i++) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const k = U.dateKey(d), L = G.letterFor(k, S);
          const b = document.createElement("button");
          b.className = "listitem";
          b.innerHTML = `<span class="mini">${A.flower(U.hash("bloom" + k), 38)}</span><span><b>${U.esc(U.fmtLong(k))}</b><br><small>${U.esc(L.paras[0].slice(0, 70))}…</small></span>`;
          b.onclick = () => { U.$("#pday", box).value = k; show(k); window.scrollTo({ top: 0, behavior: "smooth" }); };
          rec.appendChild(b);
        }
      }

      if (tab === "written") {
        box.innerHTML = `
          <form class="card" id="wform">
            <h3>Write a letter</h3>
            <label class="field">Title <input name="title" maxlength="80" placeholder="e.g. For when you read this later" required></label>
            <label class="field">Your words <textarea name="body" rows="7" maxlength="6000" placeholder="Dear you…" required></textarea></label>
            <label class="field">Seal until (optional time capsule) <input type="date" name="unlock" min="${today}"></label>
            <button class="btn">Seal & send 💌</button>
          </form>
          <div id="wlist" class="stack"></div>`;
        U.$("#wform", box).onsubmit = async (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          try {
            await db.add("letters", { kind: "letter", author: LN.ctx.who, title: f.get("title"), body: f.get("body"), unlock_on: f.get("unlock") || null });
            U.toast("Letter sealed 💌");
            LN.views.letters.render(root);
          } catch (err) { U.toast("Couldn't save. Try again."); }
        };
        const list = U.$("#wlist", box);
        if (!mine.length) list.innerHTML = `<p class="empty">No letters yet. Write the first one 🌷</p>`;
        mine.forEach((l) => list.appendChild(letterCard(l, today)));
      }

      if (tab === "open") {
        box.innerHTML = `<p class="muted">Little envelopes for different moods. Tap one when you need it. Make your own below.</p><div class="envgrid" id="owgrid"></div>
          <form class="card" id="owform"><h3>Add your own “Open when…” envelope</h3>
            <label class="field">Open when… <input name="title" maxlength="80" placeholder="you're having a great day" required></label>
            <label class="field">Message <textarea name="body" rows="5" maxlength="4000" required></textarea></label>
            <button class="btn">Add envelope</button></form>`;
        const grid = U.$("#owgrid", box);
        const all = LN.content.letters.openWhen.map((o) => ({ ...o, mine: false })).concat(ow.map((o) => ({ emoji: "💝", title: o.title.startsWith("Open when") ? o.title : "Open when " + o.title, body: o.body, mine: true, id: o.id })));
        all.forEach((o) => {
          const d = document.createElement("div");
          d.className = "owcard";
          d.innerHTML = `<button class="owbtn"><span class="owe">${o.emoji}</span><b>${U.esc(o.title)}</b></button><div class="owbody" hidden><p>${U.esc(o.body)}</p>${o.mine ? '<button class="btn small ghost del">Delete</button>' : ""}</div>`;
          U.$(".owbtn", d).onclick = () => { const b = U.$(".owbody", d); b.hidden = !b.hidden; d.classList.toggle("open", !b.hidden); };
          const del = U.$(".del", d);
          if (del) del.onclick = async () => { if (U.confirm("Delete this envelope?")) { await db.remove("letters", o.id); LN.views.letters.render(root); } };
          grid.appendChild(d);
        });
        U.$("#owform", box).onsubmit = async (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          await db.add("letters", { kind: "openwhen", author: LN.ctx.who, title: f.get("title"), body: f.get("body") });
          U.toast("Envelope added 💝");
          LN.views.letters.render(root);
        };
      }
    };

    function letterCard(l, today) {
      const locked = l.unlock_on && l.unlock_on > today;
      const d = document.createElement("article");
      d.className = "card letter paper-lines written" + (locked ? " locked" : "");
      const who = LN.ctx.name(l.author);
      d.innerHTML = locked
        ? `<p class="eyebrow">From ${U.esc(who)}</p><h3>🔒 ${U.esc(l.title)}</h3><p class="muted">Sealed until ${U.esc(U.fmtDate(l.unlock_on + "T12:00"))}. Be patient, love 💗</p>`
        : `<p class="eyebrow">From ${U.esc(who)} · ${U.esc(U.fmtDate(l.created_at))}</p><h3 class="script">${U.esc(l.title)}</h3><p class="pre">${U.esc(l.body)}</p>`;
      if (l.author === LN.ctx.who) {
        const b = document.createElement("button");
        b.className = "btn small ghost"; b.textContent = "Delete";
        b.onclick = async () => { if (U.confirm("Delete this letter?")) { await db.remove("letters", l.id); LN.views.letters.render(root); } };
        d.appendChild(b);
      }
      return d;
    }
    draw();
  }
};
