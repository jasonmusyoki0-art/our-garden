LN.views.settings = {
  async render(root) {
    const { util: U, db } = LN, S = LN.gen.settings, ctx = LN.ctx;
    root.innerHTML = `<h2 class="page-title script">Us</h2>
      <form class="card" id="sf">
        <h3>About us</h3>
        <p class="muted">This is stored privately in your ${db.mode === "cloud" ? "cloud database" : "browser"}, never in the public code. It personalises the daily letters.</p>
        <div class="grid2">
          <label class="field">His name<input name="nameA" maxlength="30" value="${U.esc(S.nameA)}" required></label>
          <label class="field">Her name<input name="nameB" maxlength="30" value="${U.esc(S.nameB)}" required></label>
        </div>
        <label class="field">I am…
          <select name="who"><option value="a" ${ctx.who === "a" ? "selected" : ""}>${U.esc(S.nameA)} (him)</option><option value="b" ${ctx.who === "b" ? "selected" : ""}>${U.esc(S.nameB)} (her)</option></select>
          <small>(set separately on each phone)</small></label>
        <div class="grid2">
          <label class="field">Our anniversary / day we got together<input type="date" name="anniversary" value="${U.esc(S.anniversary)}"></label>
          <label class="field">Her birthday (month-day)<input type="text" name="birthdayB" pattern="\\d\\d-\\d\\d" placeholder="MM-DD e.g. 03-14" value="${U.esc(S.birthdayB)}"></label>
        </div>
        <label class="field">Nicknames for her (comma separated)<input name="nicknames" placeholder="love, baby, my sunshine" value="${U.esc((S.nicknames || []).join(", "))}"></label>
        <label class="field">Inside jokes (one per line, they show up as P.S. lines)<textarea name="jokes" rows="3" placeholder="Remember the pancake incident? 🥞">${U.esc((S.jokes || []).join("\n"))}</textarea></label>
        <label class="field">Things I love about her (one per line, mixed into daily letters)<textarea name="loveLines" rows="4" placeholder="I love the way you hum when you cook.">${U.esc((S.loveLines || []).join("\n"))}</textarea></label>
        <label class="field">Memory drops are<select name="cadence"><option value="weekly" ${S.cadence === "weekly" ? "selected" : ""}>weekly</option><option value="daily" ${S.cadence === "daily" ? "selected" : ""}>daily</option></select></label>
        <button class="btn">Save 💗</button>
      </form>
      <section class="card">
        <h3>Security</h3>
        <p class="muted">Mode: <b>${db.mode === "cloud" ? "☁️ Cloud (shared between you two)" : "🏠 Local (this device only)"}</b>. Auto-locks after ${LN.config.idleLockMinutes || "never"} min of inactivity.</p>
        <div class="row wrap"><button class="btn ghost" id="locknow">🔒 Lock now</button><button class="btn ghost" id="bk">⬇ Download a backup</button>${db.mode === "local" ? '<button class="btn ghost" id="chg">Change local code</button>' : ""}</div>
      </section>`;
    U.$("#sf", root).onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const lines = (k) => f.get(k).split("\n").map((s) => s.trim()).filter(Boolean);
      const next = {
        nameA: f.get("nameA").trim(), nameB: f.get("nameB").trim(), anniversary: f.get("anniversary") || "",
        birthdayB: (f.get("birthdayB") || "").trim(), cadence: f.get("cadence"),
        nicknames: f.get("nicknames").split(",").map((s) => s.trim()).filter(Boolean),
        jokes: lines("jokes"), loveLines: lines("loveLines")
      };
      try {
        await db.kvSet("settings", next);
        Object.assign(S, next);
        LN.setWho(f.get("who"));
        U.toast("Saved 💗");
        LN.refreshShell();
      } catch (err) { U.toast("Couldn't save. Try again."); }
    };
    U.$("#locknow", root).onclick = () => LN.lockNow();
    /* a safety copy of all your words (letters, answers, plans, settings). Photos and videos: use Memories → Everything → Download. */
    U.$("#bk", root).onclick = async () => {
      try {
        const out = { app: "our-garden", saved: new Date().toISOString(), settings: S };
        for (const t of ["answers", "letters", "albums", "events", "media"]) { try { out[t] = await db.list(t); } catch (e) { out[t] = []; } }
        U.download(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }), `our-garden-backup-${U.dateKey()}.json`);
        U.toast("Backup saved 💗");
      } catch (e) { U.toast("Couldn't make a backup. Try again."); }
    };
    const chg = U.$("#chg", root);
    if (chg) chg.onclick = async () => {
      const old = prompt("Current code:");
      if (old === null) return;
      if ((await db.login(old)) !== "ok") return U.toast("That's not the current code");
      const nw = prompt(`New ${LN.config.codeLength}-digit code:`);
      if (!nw || !new RegExp(`^\\d{${LN.config.codeLength}}$`).test(nw)) return U.toast(`Needs exactly ${LN.config.codeLength} digits`);
      await db.setLocalCode(nw);
      U.toast("Code changed 🔐");
    };
  }
};
