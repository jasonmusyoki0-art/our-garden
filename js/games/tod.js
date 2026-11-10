/* 🎭 Truth or Dare: sweet, silly and a little deep. Works with no internet. Add your own to the lists any time! */
(function () {
  const LN = (window.LN = window.LN || {});
  LN.games = LN.games || {};
  const TRUTH = [
    "What was your very first thought when you met me?", "What's one thing I do that always makes you smile?", "What's your favorite memory of us so far?",
    "What's something you've never told me but wish you had?", "When did you first know you liked me?", "What's the most romantic thing you've ever dreamed of doing with me?",
    "What's a habit of mine that secretly makes you laugh?", "What song reminds you of us?", "What's one thing you want us to do together this year?",
    "What do you miss most when we're apart?", "What's your most embarrassing moment you can laugh about now?", "What's one small thing I do that makes you feel loved?",
    "If we could live anywhere for a year, where would it be?", "What's something about me you admire?", "What's the silliest thing you've ever done for love?",
    "What nickname for me do you secretly love?", "What would our perfect lazy day look like?", "What's a dream you haven't told many people?",
    "What's one thing you'd like me to know about you that I don't yet?", "What was the best day we've had together?", "What's something that scares you about the future, and how can I help?",
    "What's your love language, in your own words?", "What do you think we'll be doing in 10 years?", "What was your first impression of my voice?"
  ];
  const DARE = [
    "Send me a voice note saying three things you love about me.", "Do your best impression of me for 30 seconds.", "Sing a line of a love song, as dramatically as possible.",
    "Tell me a compliment without using the word 'beautiful' or 'cute'.", "Make a heart with your hands and hold it up to the camera.", "Describe our first date in exactly 3 sentences.",
    "Show me the funniest photo on your phone.", "Say 'I love you' in three different silly voices.", "Do a 10-second happy dance right now.",
    "Write me a two-line poem on the spot.", "Tell me your favorite thing about my smile.", "Draw me (or us) in 20 seconds and send a picture.",
    "Give me a nickname you've never used before.", "Talk in a movie-trailer voice about our love story.", "Name 5 things we should do on our next date, in 20 seconds.",
    "Blow me a kiss and send a selfie.", "Whisper a secret compliment.", "Teach me a word or phrase in a language I don't know.",
    "Plan a surprise for me and tell me only a hint.", "Do your best model walk for me."
  ];
  LN.games.tod = {
    offlineOk: true, icon: "🎭", name: "Truth or Dare", desc: "Sweet, silly and a little deep. Swap turns!",
    tut: [{ icon: "🎭", title: "How to play", text: "Take turns. Tap Truth or Dare, then do it (or answer honestly) out loud, on a call, or in the chat. Not feeling a card? Skip it and draw another." }],
    async run(box, env) {
      const { U } = env, kit = LN.kit;
      let turn = 0, card = null;
      const nm = (n) => (n % 2 === 0 ? LN.ctx.name("a") : LN.ctx.name("b"));
      const paint = () => {
        box.innerHTML = `<p class="big-text center">${U.esc(nm(turn))}, your turn!</p>
          ${card ? `<div class="card todcard ${card.k}"><p class="eyebrow">${card.k === "t" ? "TRUTH 💭" : "DARE 🔥"}</p><p class="qtext">${U.esc(card.text)}</p>
            <div class="row center-row"><button class="btn" id="done">Done! Next player</button><button class="btn ghost" id="skip">Skip, draw another</button></div></div>`
            : `<div class="row center-row"><button class="btn" data-k="t">Truth 💭</button><button class="btn" data-k="d">Dare 🔥</button></div>`}`;
        U.$$("[data-k]", box).forEach((b) => (b.onclick = () => draw(b.dataset.k)));
        const d = U.$("#done", box), s = U.$("#skip", box);
        if (d) d.onclick = () => { card = null; turn++; paint(); };
        if (s) s.onclick = () => draw(card.k);
      };
      const draw = (k) => { const list = k === "t" ? TRUTH : DARE; card = { k, text: list[kit.rand(list.length)] }; paint(); };
      paint();
    }
  };
})();
