/* Procedural flowers + falling petals + corner garlands.
   Every flower is generated from a number ("seed"), so each day gets its own bloom. */
(function () {
  const LN = window.LN, U = LN.util;
  const A = (LN.art = {});

  const PINKS = ["#ffc2d9", "#ff9ec1", "#ffb3cf", "#ffd9e6", "#f7a8c8", "#ffcfe0", "#ff8fb8", "#ffe3ee"];
  const RARE = ["#e7c6ff", "#d9b8f5"]; // a tiny touch of purple for you 💜
  const LEAF = ["#cfe9d8", "#bfe0cb", "#d9efdf"];

  A.flower = (seed, size = 100, o = {}) => {
    const r = U.rng(seed);
    const n = o.petals || 5 + Math.floor(r() * 7);
    const layers = o.layers || 2 + Math.floor(r() * 2);
    const rare = r() < 0.07;
    const pal = rare ? RARE : PINKS;
    const base = Math.floor(r() * pal.length);
    const round = 0.34 + r() * 0.24;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" width="${size}" height="${size}" aria-hidden="true">`;
    for (let l = 0; l < layers; l++) {
      const len = 46 - l * 11;
      const w = len * (round + l * 0.04);
      const col = pal[(base + l * 2) % pal.length];
      const off = l * (180 / n) + r() * 10;
      for (let i = 0; i < n; i++) {
        s += `<path transform="rotate(${(i * 360) / n + off})" d="M0 0C${-w} ${-len * 0.3} ${-w * 0.95} ${-len} 0 ${-len}C${w * 0.95} ${-len} ${w} ${-len * 0.3} 0 0Z" fill="${col}" fill-opacity="${0.88 - l * 0.04}" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>`;
      }
    }
    const cr = 5 + r() * 3;
    s += `<circle r="${cr}" fill="#ffe28f"/><circle r="${cr * 0.55}" fill="#ffc861"/>`;
    for (let i = 0; i < 7; i++) {
      const a = r() * 6.28, d = cr * (0.9 + r() * 0.6);
      s += `<circle cx="${Math.cos(a) * d}" cy="${Math.sin(a) * d}" r="1" fill="#fff" fill-opacity=".8"/>`;
    }
    return s + "</svg>";
  };

  A.leaf = (seed, size = 40) => {
    const r = U.rng(seed);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 40 40" width="${size}" height="${size}" aria-hidden="true"><path d="M0 18C-14 6 -12 -10 0 -18C12 -10 14 6 0 18Z" fill="${U.pick(r, LEAF)}" stroke="#fff" stroke-opacity=".6" stroke-width=".8"/><path d="M0 16V-12" stroke="#fff" stroke-opacity=".7" stroke-width=".8"/></svg>`;
  };

  /* soft flower clusters in the four corners */
  A.garlands = () => {
    const wrap = document.createElement("div");
    wrap.className = "garlands";
    wrap.setAttribute("aria-hidden", "true");
    const spots = [
      { cls: "tl", seed: 11 }, { cls: "tr", seed: 29 }, { cls: "bl", seed: 47 }, { cls: "br", seed: 83 }
    ];
    spots.forEach(({ cls, seed }) => {
      const g = document.createElement("div");
      g.className = "garland " + cls;
      const r = U.rng(seed);
      let html = "";
      for (let i = 0; i < 7; i++) {
        const x = (r() * 100) | 0, y = (r() * 100) | 0;
        html += `<span class="gl" style="left:${x}%;top:${y}%;animation-delay:${(-r() * 8).toFixed(1)}s">${A.leaf(seed + i, 36 + r() * 30)}</span>`;
      }
      for (let i = 0; i < 6; i++) {
        const x = (r() * 85) | 0, y = (r() * 85) | 0;
        html += `<span class="gf" style="left:${x}%;top:${y}%;animation-delay:${(-r() * 8).toFixed(1)}s">${A.flower(seed * 7 + i, 48 + r() * 56)}</span>`;
      }
      g.innerHTML = html;
      wrap.appendChild(g);
    });
    document.body.prepend(wrap);
  };

  /* falling petals on a canvas */
  A.petals = () => {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.createElement("canvas");
    cv.id = "petals";
    cv.setAttribute("aria-hidden", "true");
    document.body.prepend(cv);
    const ctx = cv.getContext("2d");
    let W, H, list = [];
    const size = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; cv._d = d;
    };
    size();
    addEventListener("resize", size);
    const mk = (first) => ({
      x: Math.random() * W, y: first ? Math.random() * H : -30,
      s: (6 + Math.random() * 10) * cv._d, vy: (0.35 + Math.random() * 0.8) * cv._d, vx: (Math.random() - 0.5) * 0.5 * cv._d,
      a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.03, sw: Math.random() * 6.28,
      c: Math.random() < 0.08 ? "#e5c9fb" : PINKS[(Math.random() * PINKS.length) | 0], o: 0.45 + Math.random() * 0.4
    });
    const count = innerWidth < 600 ? 16 : 28;
    for (let i = 0; i < count; i++) list.push(mk(true));
    let run = true;
    document.addEventListener("visibilitychange", () => { run = !document.hidden; if (run) loop(); });
    function loop() {
      if (!run) return;
      ctx.clearRect(0, 0, W, H);
      list.forEach((p, i) => {
        p.sw += 0.012; p.x += p.vx + Math.sin(p.sw) * 0.6 * cv._d; p.y += p.vy; p.a += p.va;
        if (p.y > H + 30) list[i] = mk(false);
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = p.o; ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-p.s, -p.s * 0.6, -p.s * 0.5, -p.s * 1.6, 0, -p.s * 1.3);
        ctx.bezierCurveTo(p.s * 0.5, -p.s * 1.6, p.s, -p.s * 0.6, 0, 0);
        ctx.fill();
        ctx.restore();
      });
      requestAnimationFrame(loop);
    }
    loop();
  };

  /* burst of emoji from a point (used by gestures) */
  A.burst = (x, y, emojis = ["💗", "🌸", "✨", "💖"], n = 10) => {
    for (let i = 0; i < n; i++) {
      const e = document.createElement("span");
      e.className = "burst";
      e.textContent = U.pick(Math.random, emojis);
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5, dist = 50 + Math.random() * 70;
      e.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist - 30}px`;
      document.body.appendChild(e);
      setTimeout(() => e.remove(), 1100);
    }
  };
})();
