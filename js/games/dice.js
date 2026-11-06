/* 🎲 Love Dice: three dice make a sweet, silly little dare for the two of you. */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.games = LN.games || {};
  const FACES = {
    do: ["Give a forehead kiss", "Slow dance", "Say a heartfelt compliment", "Whisper a secret", "Hold hands", "Share a favorite memory", "Give a long hug", "Sing a line of our song", "Tell a joke", "Draw each other"],
    how: ["for 30 seconds", "while looking into each other's eyes", "in your silliest voice", "in slow motion", "without laughing", "with a big smile", "like a movie scene", "while whispering"],
    when: ["right now", "in the kitchen", "under a blanket", "before goodnight", "next time we meet", "on our next walk", "while the music plays", "tonight"]
  };
  LN.games.dice = {
    offlineOk: true, icon: "🎰", name: "Love Dice", desc: "Roll three dice for a sweet, silly little dare.",
    tut: [
      { icon: "🎰", title: "Roll the dice", text: "Tap Roll and three dice give you something to do, how to do it, and when. Then do it together!" },
      { icon: "💞", title: "Make it yours", text: "Not feeling it? Just roll again. You can add your own ideas in js/content or edit the lists in js/games/dice.js." }
    ],
    async run(box, env) {
      const { U, A } = env, kit = LN.kit;
      let r = null;
      const paint = () => {
        box.innerHTML = `<div class="dice3">${["do", "how", "when"].map((k) => `<div class="dcard" id="d-${k}"><small>${{ do: "DO", how: "HOW", when: "WHEN" }[k]}</small><p>${r ? U.esc(r[k]) : "❔"}</p></div>`).join("")}</div>
          <div class="center-row row"><button class="btn" id="rollit">🎲 Roll</button></div>
          ${r ? `<p class="big-text center">${U.esc(r.do)} ${U.esc(r.how)}, ${U.esc(r.when)} 💗</p>` : ""}`;
        U.$("#rollit", box).onclick = () => {
          const btn = U.$("#rollit", box); btn.disabled = true;
          let n = 0;
          const t = setInterval(() => {
            ["do", "how", "when"].forEach((k) => (U.$("#d-" + k + " p", box).textContent = FACES[k][kit.rand(FACES[k].length)]));
            if (++n > 9) { clearInterval(t); r = { do: FACES.do[kit.rand(FACES.do.length)], how: FACES.how[kit.rand(FACES.how.length)], when: FACES.when[kit.rand(FACES.when.length)] }; paint(); A.burst(innerWidth / 2, 240, ["💗", "✨", "🎲"], 10); }
          }, 90);
        };
      };
      paint();
    }
  };
})();
