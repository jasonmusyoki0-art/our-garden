LN.views.today = {
  async render(root) {
    const { util: U, gen: G, art: A } = LN, S = LN.gen.settings;
    const key = U.dateKey();
    const L = G.letterFor(key, S);
    const mood = G.moodFor(key);
    const gest = G.gestureFor(key);
    const q = G.questionFor(key);
    const mission = G.missionFor(key);
    const days = S.anniversary ? U.daysBetween(S.anniversary, key) : null;
    const seedF = U.hash("bloom" + key);

    root.innerHTML = `
      <section class="hero">
        <div class="bloom">${A.flower(seedF, 150, { layers: 3 })}</div>
        <p class="eyebrow">${U.esc(U.fmtLong(key))}</p>
        <h2 class="script">Today's bloom: ${U.esc(L.flower.name)}</h2>
        <p class="muted">${U.esc(L.flower.meaning)}</p>
        ${days !== null && days >= 0 ? `<p class="counter"><b>${days.toLocaleString()}</b> days of us 💗</p><p class="muted" id="livemini"></p>` : ""}
        <span class="mood-chip">Today's mood: ${U.esc(mood.name)}</span>
      </section>

      <section class="card letter ${L.paper} ${L.isSpecial ? "special" : ""}" id="letter">
        <div class="letter-head"><span class="stamp">${A.flower(seedF + 1, 44, { layers: 2 })}</span><p class="eyebrow">Today's letter</p></div>
        <h3 class="script">${U.esc(L.greeting)}</h3>
        ${L.paras.map((p) => `<p>${U.esc(p)}</p>`).join("")}
        <p class="closing">${U.esc(L.closing)}</p>
        <p class="sig script">${U.esc(L.signature)}</p>
        <p class="ps">${U.esc(L.ps)}</p>
        <div class="row end"><button class="btn small ghost" id="speak">🔊 Read aloud</button></div>
      </section>

      <section class="card">
        <p class="eyebrow">Today's playful gesture</p>
        <h3>${U.esc(LN.gestureUI.titles[gest.kind])}</h3>
        <div id="gesture"></div>
      </section>

      <section class="grid2">
        <div class="card mission">
          <p class="eyebrow">Tiny mission</p>
          <p class="big-text">🎀 ${U.esc(mission)}</p>
        </div>
        <a class="card linkcard" href="#questions">
          <p class="eyebrow">Question of the day</p>
          <p class="big-text">💭 ${U.esc(q)}</p>
          <span class="link">Answer it →</span>
        </a>
      </section>

      <a class="card linkcard" href="#memories">
        <p class="eyebrow">${S.cadence === "daily" ? "Today's" : "This week's"} memory drop</p>
        <p class="big-text">📸 ${U.esc(G.dropPromptFor(S.cadence === "daily" ? key : U.weekKey()))}</p>
        <span class="link">Share a moment →</span>
      </a>`;

    const lm = U.$("#livemini", root);
    if (lm) {
      clearInterval(LN._lt);
      const tick = () => {
        if (!document.body.contains(lm)) return clearInterval(LN._lt);
        const e = U.elapsed(S.anniversary);
        lm.textContent = `${e.years}y ${e.months}m ${e.days}d · ${String(e.h).padStart(2, "0")}:${String(e.mi).padStart(2, "0")}:${String(e.s).padStart(2, "0")} into today`;
      };
      tick(); LN._lt = setInterval(tick, 1000);
    }
    try {
      const evs = (await LN.db.list("events")).filter((e) => e.day >= key && !e.done).sort((a, b) => (a.day < b.day ? -1 : 1)).slice(0, 2);
      if (evs.length) {
        const c = document.createElement("a");
        c.className = "card linkcard"; c.href = "#calendar";
        c.innerHTML = `<p class="eyebrow">Coming up</p>${evs.map((e) => `<p class="big-text">💕 ${U.esc(e.title)} <small class="muted">${U.esc(U.relDay(e.day))}</small></p>`).join("")}<span class="link">Open calendar →</span>`;
        root.appendChild(c);
      }
    } catch (e) {}
    LN.gestureUI[gest.kind](U.$("#gesture", root), gest);

    U.$("#speak", root).onclick = () => {
      if (!("speechSynthesis" in window)) return U.toast("Reading aloud isn't supported on this device");
      speechSynthesis.cancel();
      const text = [L.greeting, ...L.paras, L.closing, L.signature, L.ps].join(". ");
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      speechSynthesis.speak(u);
    };
  }
};
