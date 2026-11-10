/* ✊ Rock Paper Scissors: first to 3 wins. Both of you pick in secret; the picks are revealed together.
   Each phone only writes its OWN picks (two saved notes, rps:a and rps:b), so you can both pick at the same time. */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.games = LN.games || {};
  const SY = { r: "✊", p: "✋", s: "✌️" }, BEATS = { r: "s", p: "r", s: "p" }, FIRST = 3;
  const duel = (x, y) => (x === y ? 0 : BEATS[x] === y ? 1 : -1); // 1 = x wins

  LN.games.rps = {
    icon: "✊", name: "Rock Paper Scissors", desc: "Pick in secret, reveal together. First to 3!",
    tut: [
      { icon: "✊", title: "The rules", text: "Rock beats scissors, scissors beat paper, paper beats rock. Both of you pick, then the picks are revealed at the same time." },
      { icon: "🏆", title: "First to 3", text: "The first player to win 3 rounds wins the match. Ties don't count, so go again!" }
    ],
    vs: true, offlineOk: true,
    async run(box, env, opts = {}) {
      const { U, db, ctx, A } = env, kit = LN.kit;
      const cpu = !!opts.cpu, level = opts.level || 2, me = cpu ? "a" : ctx.who, you = me === "a" ? "b" : "a";
      const nm = (w) => (cpu ? (w === "a" ? ctx.name(ctx.who) : "Computer 🤖") : ctx.name(w));
      const get = async (k) => { try { return await db.kvGet("rps:" + k); } catch (e) { return undefined; } };
      let mine = (!cpu && (await get(me))) || { g: 0, picks: [] }, theirs = (!cpu && (await get(you))) || { g: 0, picks: [] };
      let recorded = !!mine.rec, saving = false;
      const save = async () => { if (cpu) return; try { await db.kvSet("rps:" + me, mine); } catch (e) { U.toast("Couldn't save your pick. Check your internet."); } };

      const tally = () => {
        const tp = theirs.g === mine.g ? theirs.picks : [];
        const n = Math.min(mine.picks.length, tp.length), rounds = [];
        const sc = { a: 0, b: 0 };
        for (let i = 0; i < n; i++) {
          const r = duel(mine.picks[i], tp[i]);
          rounds.push([mine.picks[i], tp[i], r]);
          if (r === 1) sc[me]++; else if (r === -1) sc[you]++;
        }
        const winner = sc[me] >= FIRST ? me : sc[you] >= FIRST ? you : "";
        return { rounds, sc, winner, tp };
      };
      const cpuPick = () => {
        const my = mine.picks; // computer is "theirs"
        if (level === 1 || my.length < 2) return "rps"[Math.floor(Math.random() * 3)];
        const counter = (x) => Object.keys(BEATS).find((k) => BEATS[k] === x); // what beats x?
        if (level === 2) return Math.random() < 0.5 ? counter(my[my.length - 1]) : "rps"[Math.floor(Math.random() * 3)];
        const cnt = { r: 0, p: 0, s: 0 }; my.forEach((x) => cnt[x]++);
        const fav = Object.keys(cnt).sort((x, y) => cnt[y] - cnt[x])[0];
        return Math.random() < 0.7 ? counter(fav) : "rps"[Math.floor(Math.random() * 3)];
      };

      function paint() {
        const t = tally(), over = !!t.winner, picked = mine.picks.length > t.rounds.length;
        const rows = t.rounds.map(([x, y, r]) => `<div class="rpsrow ${r === 1 ? "w" : r === -1 ? "l" : ""}"><span>${SY[x]}</span><small>${r === 1 ? "you" : r === -1 ? U.esc(nm(you)) : "tie"}</small><span>${SY[y]}</span></div>`).join("");
        const msg = over ? (t.winner === me ? "You win the match! 🎉" : `${U.esc(nm(you))} wins the match!`) : picked ? `Locked in ${SY[mine.picks[mine.picks.length - 1]]}. Waiting for ${U.esc(nm(you))}… 🌷` : "Pick your move";
        box.innerHTML = `<p class="big-text center" aria-live="polite">${msg}</p>
          <p class="center muted">${U.esc(nm(me))} <b>${t.sc[me]}</b> – <b>${t.sc[you]}</b> ${U.esc(nm(you))} · first to ${FIRST}</p>
          ${over ? "" : `<div class="rpspick">${Object.keys(SY).map((k) => `<button class="rpsb" data-k="${k}" ${picked ? "disabled" : ""} aria-label="${k}">${SY[k]}</button>`).join("")}</div>`}
          <div class="rpshist">${rows}</div>
          <div class="row end"><button class="btn small ghost" id="newg">${over ? "Play again" : "New match"}</button></div>`;
        U.$$(".rpsb", box).forEach((b) => (b.onclick = async () => {
          if (saving) return; saving = true;
          mine.picks.push(b.dataset.k);
          if (cpu) theirs = { g: mine.g, picks: theirs.picks.concat(cpuPick()) };
          paint(); await save(); saving = false;
        }));
        U.$("#newg", box).onclick = async () => {
          if (!over && !U.confirm("Start a new match?")) return;
          mine = { g: Date.now(), picks: [] }; if (cpu) theirs = { g: mine.g, picks: [] };
          recorded = false; paint(); await save();
        };
        if (over && !recorded) {
          recorded = true;
          if (t.winner === me) A.burst(innerWidth / 2, 260, ["✊", "💗", "✨"], 14);
          if (cpu) kit.record("rps", t.winner === me ? "a" : "b", { cpu: true, level }, {});
          else if (me === "a") { mine.rec = 1; save(); kit.record("rps", t.winner, { cpu: false }, {}); }
        }
      }
      paint();
      if (!cpu) {
        const timer = setInterval(async () => {
          if (!document.body.contains(box)) return clearInterval(timer);
          if (saving) return;
          const o = await get(you); if (!o) return;
          if (o.g > mine.g) { mine = { g: o.g, picks: [] }; recorded = false; paint(); save(); }   // she started a new match
          if (JSON.stringify(o) !== JSON.stringify(theirs)) { theirs = o; paint(); }
        }, 2500);
      }
    }
  };
})();
