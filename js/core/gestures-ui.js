/* The little interactive games that rotate daily. */
(function () {
  const LN = window.LN, U = LN.util, A = LN.art;
  const G = (LN.gestureUI = {});
  const reveal = (msg) => `<div class="g-reveal"><span class="g-big">💌</span><p>${U.esc(msg)}</p></div>`;
  const alive = (el) => document.body.contains(el);

  G.titles = {
    hearts: "Catch the Hearts",
    scratch: "Scratch & Reveal",
    hug: "Send a Hug",
    wheel: "Spin the Wheel of Us",
    envelope: "A Little Envelope",
    garden: "Plant Our Garden"
  };

  G.hearts = (box, { message }) => {
    const goal = 7;
    let n = 0;
    box.innerHTML = `<div class="g-stage g-hearts"><div class="g-count">0 / ${goal}</div></div><p class="g-hint">Tap the floating hearts to catch ${goal} 💗</p>`;
    const stage = U.$(".g-stage", box), cnt = U.$(".g-count", box);
    const spawn = () => {
      const b = document.createElement("button");
      b.className = "fheart";
      b.textContent = U.pick(Math.random, ["💗", "💖", "💕", "🩷", "💞"]);
      b.setAttribute("aria-label", "Catch heart");
      b.style.left = 5 + Math.random() * 80 + "%";
      b.style.animationDuration = 3 + Math.random() * 2 + "s";
      b.onclick = (e) => {
        A.burst(e.clientX, e.clientY, ["💗", "✨"], 6);
        b.remove();
        cnt.textContent = ++n + " / " + goal;
        if (n >= goal) {
          clearInterval(t);
          box.innerHTML = reveal(message);
        }
      };
      b.addEventListener("animationend", () => b.remove());
      stage.appendChild(b);
    };
    const t = setInterval(() => (alive(box) ? spawn() : clearInterval(t)), 600);
    spawn();
  };

  G.scratch = (box, { message }) => {
    box.innerHTML = `<div class="g-scratch"><div class="g-msg">${U.esc(message)}</div><canvas></canvas></div><p class="g-hint">Scratch with your finger ✨</p>`;
    const wrap = U.$(".g-scratch", box), cv = U.$("canvas", wrap);
    const w = (cv.width = wrap.clientWidth || 300), h = (cv.height = 170);
    const ctx = cv.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#ffc2d9"); g.addColorStop(0.5, "#ffe3ee"); g.addColorStop(1, "#f7a8c8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.font = "26px 'Dancing Script', cursive"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    ctx.fillText("scratch me, love ✨", w / 2, h / 2 + 8);
    let down = false, moves = 0, done = false;
    const scratch = (e) => {
      if (!down || done) return;
      const r = cv.getBoundingClientRect();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(((e.clientX - r.left) * w) / r.width, ((e.clientY - r.top) * h) / r.height, 20, 0, 7);
      ctx.fill();
      if (++moves % 12 === 0) {
        const d = ctx.getImageData(0, 0, w, h).data;
        let clear = 0;
        for (let i = 3; i < d.length; i += 64) if (d[i] === 0) clear++;
        if (clear / (d.length / 64) > 0.5) {
          done = true; cv.style.transition = "opacity .8s"; cv.style.opacity = 0;
          const rc = cv.getBoundingClientRect(); A.burst(rc.left + rc.width / 2, rc.top + rc.height / 2);
        }
      }
    };
    cv.addEventListener("pointerdown", (e) => { down = true; cv.setPointerCapture(e.pointerId); scratch(e); });
    cv.addEventListener("pointermove", scratch);
    cv.addEventListener("pointerup", () => (down = false));
  };

  G.hug = (box, { message }) => {
    box.innerHTML = `<div class="g-hug"><button class="hugbtn" aria-label="Press and hold to send a hug"><span>🤗</span></button></div><p class="g-hint">Press & hold for 3 seconds to send a big hug</p>`;
    const btn = U.$(".hugbtn", box);
    let p = 0, t = null;
    const stop = () => { clearInterval(t); t = null; if (p < 1) { p = 0; btn.style.setProperty("--p", 0); } };
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (t) return;
      t = setInterval(() => {
        p += 50 / 3000;
        btn.style.setProperty("--p", Math.min(p, 1));
        if (navigator.vibrate) navigator.vibrate(8);
        if (p >= 1) {
          clearInterval(t);
          if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
          const r = btn.getBoundingClientRect(); A.burst(r.left + r.width / 2, r.top + r.height / 2, ["🤍", "💗", "🤗", "✨"], 14);
          box.innerHTML = reveal("Hug delivered 🤍 Squeeze for as long as you need. " + message);
        }
      }, 50);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, stop));
  };

  G.wheel = (box) => {
    const items = LN.content.wheel, n = items.length, seg = 360 / n;
    const R = 120, cols = ["#ffd0e0", "#ffe9f1", "#ffb3cf", "#fff3f8"];
    const pt = (a) => [(R * Math.cos(((a - 90) * Math.PI) / 180)).toFixed(2), (R * Math.sin(((a - 90) * Math.PI) / 180)).toFixed(2)];
    let svg = `<svg viewBox="-125 -125 250 250" class="wheel-svg"><g class="wheel-g">`;
    items.forEach((it, i) => {
      const [x1, y1] = pt(i * seg), [x2, y2] = pt((i + 1) * seg);
      svg += `<path d="M0 0L${x1} ${y1}A${R} ${R} 0 0 1 ${x2} ${y2}Z" fill="${cols[i % cols.length]}" stroke="#fff" stroke-width="2"/>`;
      const mid = i * seg + seg / 2;
      svg += `<text transform="rotate(${mid - 90}) translate(${R * 0.34},0)" font-size="9.5" fill="#7a3556" font-family="Quicksand,sans-serif" font-weight="700">${U.esc(it.length > 22 ? it.slice(0, 21) + "…" : it)}</text>`;
    });
    svg += `</g></svg>`;
    box.innerHTML = `<div class="g-wheel"><div class="wheel-pin">▼</div>${svg}</div><button class="btn" id="spin">Spin 💫</button><p class="g-result" aria-live="polite"></p>`;
    const g = U.$(".wheel-g", box), res = U.$(".g-result", box), btn = U.$("#spin", box);
    let rot = 0;
    btn.onclick = () => {
      btn.disabled = true; res.textContent = "";
      rot += 360 * 5 + Math.random() * 360;
      g.style.transition = "transform 4s cubic-bezier(.15,.7,.1,1)";
      g.style.transform = `rotate(${rot}deg)`;
      setTimeout(() => {
        const idx = Math.floor(((360 - (rot % 360)) % 360) / seg) % n;
        res.textContent = "Tonight's pick: " + items[idx];
        btn.disabled = false; btn.textContent = "Spin again 💫";
        const r = btn.getBoundingClientRect(); A.burst(r.left + r.width / 2, r.top, ["✨", "💗"], 10);
      }, 4100);
    };
  };

  G.envelope = (box, { message }) => {
    box.innerHTML = `<button class="env" aria-label="Open the envelope"><div class="env-back"></div><div class="env-letter"><p>${U.esc(message)}</p></div><div class="env-front"></div><div class="env-flap"></div><span class="env-seal">💗</span></button><p class="g-hint">Tap to open</p>`;
    const e = U.$(".env", box);
    e.onclick = () => {
      e.classList.add("open");
      const r = e.getBoundingClientRect(); A.burst(r.left + r.width / 2, r.top + 30, ["💗", "🌸", "✨"], 10);
    };
  };

  G.garden = (box, { message }) => {
    const goal = 5;
    let n = 0;
    box.innerHTML = `<div class="g-stage g-garden"><div class="g-count">🌱 0 / ${goal}</div></div><p class="g-hint">Tap the soil to plant flowers for her 🌸</p>`;
    const stage = U.$(".g-stage", box), cnt = U.$(".g-count", box);
    stage.addEventListener("pointerdown", (e) => {
      if (n >= goal) return;
      const r = stage.getBoundingClientRect();
      const f = document.createElement("span");
      f.className = "planted";
      f.style.left = e.clientX - r.left - 35 + "px";
      f.style.top = e.clientY - r.top - 55 + "px";
      f.innerHTML = A.flower(Math.floor(Math.random() * 1e6), 70);
      stage.appendChild(f);
      A.burst(e.clientX, e.clientY, ["🌸", "✨"], 5);
      cnt.textContent = `🌱 ${++n} / ${goal}`;
      if (n >= goal) {
        setTimeout(() => {
          const m = document.createElement("div");
          m.className = "g-garden-msg";
          m.textContent = message;
          stage.appendChild(m);
        }, 600);
      }
    });
  };
})();
