/* The secret-code door. */
(function () {
  const LN = window.LN, U = LN.util, C = LN.config;
  LN.views = LN.views || {};

  LN.views.lock = {
    show() {
      return new Promise((resolve) => {
        const setup = LN.db.needsSetup();
        const len = C.codeLength;
        let step = setup ? "create" : "enter", first = "", code = "", busy = false;

        const el = document.createElement("div");
        el.id = "lock";
        el.innerHTML = `
          <div class="lock-card">
            <div class="lock-flower"></div>
            <h1 class="script">${U.esc(C.appTitle)}</h1>
            <p class="lock-sub" id="lsub"></p>
            <div class="dots" id="dots" aria-hidden="true">${'<i></i>'.repeat(len)}</div>
            <div class="pad" role="group" aria-label="Secret code keypad">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join("")}
              <button class="ghost" data-k="clear" aria-label="Clear">✕</button>
              <button data-k="0">0</button>
              <button class="ghost" data-k="back" aria-label="Delete">⌫</button>
            </div>
            <p class="lock-msg" id="lmsg" aria-live="polite"></p>
            <button class="btn small ghost" id="offbtn" hidden>🎮 No internet? Play the computer</button>
            ${LN.db.mode === "local" ? '<p class="lock-note">Local mode: this device only. See the guide to connect the cloud.</p>' : ""}
          </div>`;
        document.body.appendChild(el);
        U.$(".lock-flower", el).innerHTML = LN.art.flower(12, 90, { petals: 8, layers: 3 });

        const offbtn = U.$("#offbtn", el);
        if (LN.db.mode === "cloud" && !navigator.onLine) offbtn.hidden = false;
        offbtn.onclick = () => { LN.offlineOnly = true; done(); };
        const sub = U.$("#lsub", el), dots = U.$$("#dots i", el), msg = U.$("#lmsg", el);
        const texts = {
          enter: "Whisper our secret code 🤍",
          create: `Create your secret code (${len} digits)`,
          confirm: "Type it once more to confirm"
        };
        const lockInfo = () => JSON.parse(localStorage.getItem("ln_fail") || '{"n":0,"until":0}');
        const paint = () => {
          sub.textContent = texts[step];
          dots.forEach((d, i) => d.classList.toggle("on", i < code.length));
        };
        const shake = (m) => {
          msg.textContent = m;
          U.$(".lock-card", el).classList.remove("shake");
          void el.offsetWidth;
          U.$(".lock-card", el).classList.add("shake");
          code = "";
          setTimeout(paint, 350);
        };
        const submit = async () => {
          if (busy) return;
          const li = lockInfo();
          if (step === "enter" && Date.now() < li.until) {
            return shake(`Too many tries. Wait ${Math.ceil((li.until - Date.now()) / 1000)}s 🌙`);
          }
          busy = true;
          try {
            if (step === "create") { first = code; code = ""; step = "confirm"; msg.textContent = ""; return paint(); }
            if (step === "confirm") {
              if (code !== first) { step = "create"; first = ""; return shake("Those didn't match. Start again 💭"); }
              await LN.db.setLocalCode(code);
              return done();
            }
            const r = await LN.db.login(code);
            if (r === "ok") { localStorage.removeItem("ln_fail"); return done(); }
            if (r === "network") { offbtn.hidden = false; return shake("Can't reach the garden. Check your internet."); }
            const n = li.n + 1;
            // after 5 wrong tries, wait 30s, then 60s, 120s ... (slows down guessing)
            const until = n >= 5 ? Date.now() + 30000 * Math.pow(2, Math.min(n - 5, 6)) : 0;
            localStorage.setItem("ln_fail", JSON.stringify({ n, until }));
            shake(n >= 5 ? "Too many tries. Take a little break 🌙" : "That's not our code 🥀");
          } finally { busy = false; }
        };
        const done = () => {
          el.classList.add("out");
          setTimeout(() => el.remove(), 700);
          resolve();
        };
        const press = (k) => {
          if (busy) return;
          msg.textContent = "";
          if (k === "back") code = code.slice(0, -1);
          else if (k === "clear") code = "";
          else if (code.length < len) code += k;
          paint();
          if (code.length === len) setTimeout(submit, 120);
        };
        el.addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (b) press(b.dataset.k); });
        const keyH = (e) => {
          if (!document.body.contains(el)) return document.removeEventListener("keydown", keyH);
          if (/^\d$/.test(e.key)) press(e.key);
          else if (e.key === "Backspace") press("back");
          else if (e.key === "Escape") press("clear");
        };
        document.addEventListener("keydown", keyH);
        paint();
      });
    }
  };
})();
