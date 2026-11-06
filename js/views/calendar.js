/* 📅 Calendar + Timeline: plan dates, reflect on memories, tap any day for a love note. */
LN.views.calendar = {
  tab: "month", ym: null, sel: null, variant: 0, showLetter: false, timer: null,

  milestones(S) {
    const U = LN.util;
    if (!S.anniversary) return [];
    const out = [{ key: S.anniversary, label: "The day we began 🌱", kind: "start" }];
    const total = Math.max(0, U.daysBetween(S.anniversary, U.dateKey()));
    for (let n = 100; n <= Math.ceil((total + 1000) / 100) * 100; n += 100)
      out.push({ key: U.addDays(S.anniversary, n), label: `${n.toLocaleString()} days together 💯`, kind: "days" });
    const months = Math.ceil(total / 28) + 30;
    for (let m = 1; m <= months; m++) {
      const yr = m % 12 === 0;
      out.push({ key: U.addMonths(S.anniversary, m), label: yr ? `${m / 12} year anniversary 💍` : `${m} month${m > 1 ? "s" : ""} together 🥂`, kind: yr ? "year" : "month" });
    }
    return out.sort((a, b) => (a.key < b.key ? -1 : 1));
  },

  async render(root) {
    const V = LN.views.calendar, { util: U, gen: G, db } = LN, ctx = LN.ctx, S = G.settings;
    clearInterval(V.timer);
    const today = U.dateKey();
    if (!V.ym) { const n = new Date(); V.ym = { y: n.getFullYear(), m: n.getMonth() }; }
    if (!V.sel) V.sel = today;

    let events = [], media = [], answers = [], eventsOk = true;
    try { events = await db.list("events"); } catch (e) { eventsOk = false; }
    try { media = (await db.list("media")).filter((m) => m.kind !== "voice"); } catch (e) {}
    try { answers = (await db.list("answers")).filter((a) => a.kind === "answer" || a.kind === "game"); } catch (e) {}
    const ms = V.milestones(S);
    const msBy = {}; ms.forEach((m) => (msBy[m.key] = msBy[m.key] || []).push(m));
    const evBy = {}; events.forEach((e) => (evBy[e.day] = evBy[e.day] || []).push(e));
    const dayOf = (iso) => U.dateKey(new Date(iso));
    const memBy = {}; media.forEach((m) => (memBy[dayOf(m.created_at)] = memBy[dayOf(m.created_at)] || []).push(m));

    root.innerHTML = `<h2 class="page-title script">Calendar</h2>
      <div class="tabs"><button class="${V.tab === "month" ? "on" : ""}" data-t="month">📅 Calendar</button><button class="${V.tab === "time" ? "on" : ""}" data-t="time">⏳ Our timeline</button></div>
      <div id="ctab"></div>`;
    U.$$(".tabs button", root).forEach((b) => (b.onclick = () => { V.tab = b.dataset.t; V.render(root); }));
    const box = U.$("#ctab", root);

    /* ================= TIMELINE ================= */
    if (V.tab === "time") {
      if (!S.anniversary) { box.innerHTML = `<div class="card center"><p>Add the day you got together on the <a href="#settings">Us</a> page and your timeline will start ticking 🌱</p></div>`; return; }
      box.innerHTML = `<section class="card center live-card"><p class="eyebrow">Together for</p><div id="live" class="live"></div><p class="muted" id="liveSub"></p></section><div id="tl" class="timeline"></div>`;
      const live = U.$("#live", box), sub = U.$("#liveSub", box);
      const tick = () => {
        if (!document.body.contains(live)) return clearInterval(V.timer);
        const e = U.elapsed(S.anniversary), cell = (n, l) => `<div class="lc"><b>${String(n).padStart(2, "0")}</b><small>${l}</small></div>`;
        live.innerHTML = cell(e.years, "years") + cell(e.months, "months") + cell(e.days, "days") + cell(e.h, "hrs") + cell(e.mi, "min") + cell(e.s, "sec");
        sub.textContent = `${e.total.toLocaleString()} days in total, and counting 💗`;
      };
      tick(); V.timer = setInterval(tick, 1000);

      const all = ms.map((m) => ({ ...m, day: m.key })).concat(events.map((e) => ({ key: e.day, label: e.title, kind: "event", ev: e })));
      all.sort((a, b) => (a.key < b.key ? -1 : 1));
      const past = all.filter((m) => m.key < today).slice(-5), future = all.filter((m) => m.key >= today).slice(0, 10);
      const tl = U.$("#tl", box);
      const item = (m, i, isNext) => `<button class="tli ${m.key < today ? "past" : ""} ${isNext ? "next" : ""} ${m.key === today ? "now" : ""}" data-k="${m.key}"><span class="dot"></span><div><b>${U.esc(m.label)}</b><br><small>${U.esc(U.fmtDate(m.key + "T12:00"))} · ${U.esc(U.relDay(m.key))}</small></div></button>`;
      tl.innerHTML = past.map((m) => item(m)).join("") + `<div class="tlnow">✨ you are here · ${U.esc(U.fmtLong(today))}</div>` + future.map((m, i) => item(m, i, i === 0)).join("");
      U.$$(".tli", tl).forEach((b) => (b.onclick = () => { V.sel = b.dataset.k; const [y, m] = U.ymd(b.dataset.k); V.ym = { y, m }; V.tab = "month"; V.render(root); }));
      return;
    }

    /* ================= MONTH ================= */
    const { y, m } = V.ym;
    const first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, dim = new Date(y, m + 1, 0).getDate();
    const upcoming = events.filter((e) => e.day >= today && !e.done).sort((a, b) => (a.day < b.day ? -1 : 1)).slice(0, 3);
    let cells = "";
    for (let i = 0; i < lead; i++) cells += `<span class="cd empty"></span>`;
    for (let d = 1; d <= dim; d++) {
      const k = U.dateKey(new Date(y, m, d));
      cells += `<button class="cd ${k === today ? "today" : ""} ${k === V.sel ? "sel" : ""}" data-k="${k}"><span class="n">${d}</span><span class="marks">${msBy[k] ? "<i class='m1'></i>" : ""}${evBy[k] ? "<i class='m2'></i>" : ""}${memBy[k] ? "<i class='m3'></i>" : ""}</span></button>`;
    }
    box.innerHTML = `
      ${upcoming.length ? `<section class="card upnext"><p class="eyebrow">Coming up</p>${upcoming.map((e) => `<p class="upi"><b>${U.esc(e.title)}</b> <small>${U.esc(U.relDay(e.day))}${e.time ? " · " + U.esc(e.time) : ""}</small></p>`).join("")}</section>` : ""}
      <section class="card cal">
        <div class="cal-head"><button class="btn small ghost" id="pm" aria-label="Previous month">‹</button>
          <h3>${first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
          <button class="btn small ghost" id="nm" aria-label="Next month">›</button></div>
        <div class="cal-grid"><span class="dow">Mon</span><span class="dow">Tue</span><span class="dow">Wed</span><span class="dow">Thu</span><span class="dow">Fri</span><span class="dow">Sat</span><span class="dow">Sun</span>${cells}</div>
        <p class="legend"><i class="m1"></i> milestone <i class="m2"></i> plan <i class="m3"></i> memories
          <button class="btn small ghost" id="tdy" style="float:right">Today</button></p>
      </section>
      <div id="day"></div>`;
    U.$("#pm", box).onclick = () => { V.ym = m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }; V.render(root); };
    U.$("#nm", box).onclick = () => { V.ym = m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }; V.render(root); };
    U.$("#tdy", box).onclick = () => { const n = new Date(); V.ym = { y: n.getFullYear(), m: n.getMonth() }; V.sel = today; V.variant = 0; V.render(root); };
    U.$$(".cd[data-k]", box).forEach((b) => (b.onclick = () => { V.sel = b.dataset.k; V.variant = 0; V.showLetter = false; U.$$(".cd.sel", box).forEach((x) => x.classList.remove("sel")); b.classList.add("sel"); panel(); }));

    /* ---- the selected day ---- */
    async function panel() {
      const k = V.sel, p = U.$("#day", box);
      const note = G.noteFor(k, S, V.variant);
      const evs = (evBy[k] || []).slice().sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      const mems = memBy[k] || [];
      const theseAns = answers.filter((a) => dayOf(a.created_at) === k && a.kind === "answer");
      const myQids = new Set(answers.filter((a) => a.author === ctx.who).map((a) => a.qid));
      p.innerHTML = `
        <section class="card daypanel">
          <p class="eyebrow">${U.esc(U.relDay(k))}</p>
          <h3>${U.esc(U.fmtLong(k))}${k.slice(0, 4) !== String(new Date().getFullYear()) ? ", " + k.slice(0, 4) : ""}</h3>
          ${(msBy[k] || []).map((x) => `<span class="chip yes">${U.esc(x.label)}</span> `).join("")}
          <div class="note ${U.esc(note.key ? "" : "")}"><span class="ne">${note.emoji}</span>
            <p>${U.esc(note.text)}</p><p class="sig script">${U.esc(note.sign)}</p></div>
          <div class="row wrap"><button class="btn small" id="another">✨ Another note</button><button class="btn small ghost" id="fullbtn">${V.showLetter ? "Hide" : "📖 Read"} the full letter</button></div>
          <div id="full"></div>
        </section>
        <section class="card">
          <h3>Plans & reflections</h3>
          <div id="evlist">${evs.length ? "" : `<p class="muted">Nothing here yet. Plan a date, or write a few words about how this day felt 🌷</p>`}</div>
          ${eventsOk ? `<form id="evf" class="evform">
            <div class="grid2"><label class="field">What<input name="title" maxlength="80" placeholder="Picnic by the lake 🧺" required></label>
            <label class="field">Type<select name="kind"><option value="date">💕 Date / plan</option><option value="event">🎉 Event</option><option value="reflection">📝 Reflection</option><option value="special">🎂 Special day</option></select></label></div>
            <div class="grid2"><label class="field">Time (optional)<input type="time" name="time"></label>
            <label class="field">Notes<input name="note" maxlength="500" placeholder="Bring the blanket"></label></div>
            <button class="btn small">Add to ${U.esc(U.fmtDate(k + "T12:00", { month: "short", day: "numeric" }))}</button></form>`
            : `<p class="muted">To use plans, run <code>supabase/add-calendar.sql</code> once (see README).</p>`}
        </section>
        ${mems.length || theseAns.length ? `<section class="card"><h3>Remember this day</h3>
          ${mems.length ? `<div class="gallery small" id="dmem"></div><a class="link" href="#memories">Open in Memories →</a>` : ""}
          ${theseAns.filter((a) => myQids.has(a.qid)).map((a) => `<p class="pre"><small class="muted">${U.esc(ctx.name(a.author))} on “${U.esc(a.qtext)}”</small><br>${U.esc(a.text)}</p>`).join("")}</section>` : ""}`;

      U.$("#another", p).onclick = () => { V.variant++; panel(); };
      U.$("#fullbtn", p).onclick = () => { V.showLetter = !V.showLetter; panel(); };
      if (V.showLetter) {
        const L = G.letterFor(k, S);
        U.$("#full", p).innerHTML = `<article class="card letter ${L.paper}"><h3 class="script">${U.esc(L.greeting)}</h3>${L.paras.map((x) => `<p>${U.esc(x)}</p>`).join("")}<p class="closing">${U.esc(L.closing)}</p><p class="sig script">${U.esc(L.signature)}</p><p class="ps">${U.esc(L.ps)}</p></article>`;
      }
      const icons = { date: "💕", event: "🎉", reflection: "📝", special: "🎂" };
      const list = U.$("#evlist", p);
      evs.forEach((e) => {
        const d = document.createElement("div");
        d.className = "evitem " + (e.done ? "done" : "");
        d.innerHTML = `<button class="chk" aria-label="Mark done">${e.done ? "✓" : ""}</button><div><b>${icons[e.kind] || "💕"} ${U.esc(e.title)}</b>${e.time ? ` <small>· ${U.esc(e.time)}</small>` : ""}${e.note ? `<br><small class="muted">${U.esc(e.note)}</small>` : ""}<br><small class="muted">added by ${U.esc(ctx.name(e.author))}</small></div><button class="x" aria-label="Delete">🗑</button>`;
        U.$(".chk", d).onclick = async () => { await db.update("events", e.id, { done: !e.done }); V.render(root); };
        U.$(".x", d).onclick = async () => { if (U.confirm("Delete this?")) { await db.remove("events", e.id); V.render(root); } };
        list.appendChild(d);
      });
      const f = U.$("#evf", p);
      if (f) f.onsubmit = async (ev) => {
        ev.preventDefault();
        const fd = new FormData(f);
        try { await db.add("events", { day: k, title: fd.get("title").trim(), kind: fd.get("kind"), time: fd.get("time") || "", note: fd.get("note").trim(), author: ctx.who, done: false }); U.toast("Added 💗"); V.render(root); }
        catch (err) { U.toast("Couldn't save. Try again."); }
      };
      if (mems.length) {
        const urls = await db.fileUrls(mems.map((x) => x.thumb_path || x.path));
        const g = U.$("#dmem", p);
        mems.slice(0, 12).forEach((x, i) => { const t = document.createElement("a"); t.className = "tile"; t.href = "#memories"; t.innerHTML = x.kind === "video" ? `<video src="${U.esc(urls[i])}#t=0.1" preload="metadata" muted></video>` : `<img src="${U.esc(urls[i])}" alt="">`; g.appendChild(t); });
      }
    }
    panel();
  }
};
