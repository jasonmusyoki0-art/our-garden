/* ✨ UI magic: the pop-ups, the flower page-transition and the name-writing welcome.
   Everything here is part of the site (no ugly browser pop-ups).
   Edit the look in css/ui.css. */
(function () {
  const LN = window.LN, U = LN.util;
  const ui = (LN.ui = { ready: false });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  const flower = (seed, size, o) => { try { return LN.art.flower(seed, size, o || { petals: 8, layers: 3 }); } catch (e) { return "🌸"; } };
  let uid = 0;

  /* ---------- pop-up cards ---------- */
  ui.modal = (opts) => new Promise((resolve) => {
    const o = Object.assign({ icon: "", title: "", text: "", buttons: [{ label: "OK", value: true, kind: "primary" }], input: null, dismiss: null, locked: false, tone: "", choices: null }, opts);
    const id = "um" + ++uid, prev = document.activeElement;
    const el = document.createElement("div");
    el.className = "umodal " + o.tone;
    el.innerHTML = `<div class="uback"></div>
      <div class="ucard" role="dialog" aria-modal="true" aria-labelledby="${id}t">
        <div class="ubloom">${o.icon ? `<span class="uicon">${o.icon}</span>` : flower(uid * 13 + 5, 64, { petals: 8, layers: 2 })}</div>
        ${o.title ? `<h3 id="${id}t">${U.esc(o.title)}</h3>` : ""}
        ${o.text ? `<p class="utext">${U.esc(o.text)}</p>` : ""}
        ${o.html || ""}
        ${o.choices ? `<div class="uchoices">${o.choices.map((x, i) => `<button type="button" class="uchoice ${x.cls || ""}" data-c="${i}"><span class="uce">${x.icon || ""}</span><b>${U.esc(x.label)}</b>${x.sub ? `<small>${U.esc(x.sub)}</small>` : ""}</button>`).join("")}</div>` : ""}
        ${o.input ? `<input class="uinput" type="${o.input.type || "text"}" maxlength="${o.input.max || 80}" placeholder="${U.esc(o.input.placeholder || "")}" value="${U.esc(o.input.value || "")}" ${o.input.inputmode ? `inputmode="${o.input.inputmode}"` : ""} autocomplete="off">` : ""}
        <div class="ubtns">${o.buttons.map((b, i) => `<button type="button" class="ubtn ${b.kind || ""}" data-i="${i}">${b.html || U.esc(b.label)}</button>`).join("")}</div>
      </div>`;
    document.body.appendChild(el);
    const input = U.$(".uinput", el);
    let done = false;
    const close = (v) => {
      if (done) return; done = true;
      document.removeEventListener("keydown", key, true);
      el.classList.remove("in"); el.classList.add("out");
      setTimeout(() => { el.remove(); try { prev && prev.focus && prev.focus({ preventScroll: true }); } catch (e) {} }, 240);
      resolve(v);
    };
    const pick = (i) => { const b = o.buttons[i]; if (!b) return; close(o.input && b.kind === "primary" ? input.value : b.value); };
    const key = (e) => {
      if (e.key === "Escape" && !o.locked) { e.stopPropagation(); close(o.dismiss); }
      else if (e.key === "Enter" && input && document.activeElement === input) { e.preventDefault(); const i = o.buttons.findIndex((b) => b.kind === "primary"); pick(i < 0 ? 0 : i); }
      else if (e.key === "Tab") { // keep focus inside the card
        const f = U.$$("button, input", el); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key, true);
    U.$(".uback", el).onclick = () => { if (!o.locked) close(o.dismiss); };
    U.$$(".ubtn", el).forEach((b) => (b.onclick = () => pick(+b.dataset.i)));
    U.$$(".uchoice", el).forEach((b) => (b.onclick = () => { b.classList.add("picked"); close(o.choices[+b.dataset.c].value); }));
    requestAnimationFrame(() => { el.classList.add("in"); (input || U.$(".ubtn.primary", el) || U.$(".uchoice", el) || U.$(".ubtn", el)).focus({ preventScroll: true }); if (input) input.select(); });
  });

  ui.confirm = (text, o = {}) => ui.modal({
    icon: o.icon || (o.danger ? "🥀" : ""), title: o.title || "", text, dismiss: false, tone: o.danger ? "danger" : "",
    buttons: [{ label: o.cancel || "Not now", value: false, kind: "ghost" }, { label: o.ok || "Yes", value: true, kind: o.danger ? "danger primary" : "primary" }]
  });
  ui.alert = (text, o = {}) => ui.modal({ icon: o.icon || "", title: o.title || "", text, buttons: [{ label: o.ok || "OK", value: true, kind: "primary" }], dismiss: true });
  ui.prompt = (text, o = {}) => ui.modal({
    title: o.title || "", text, dismiss: null, input: { value: o.value || "", placeholder: o.placeholder || "", type: o.type || "text", max: o.max || 80, inputmode: o.inputmode },
    buttons: [{ label: "Cancel", value: null, kind: "ghost" }, { label: o.ok || "Save", value: "", kind: "primary" }]
  });
  /* "who are you?": big, pretty choice cards. `options` = [{ label, sub, value, cls, icon }] */
  ui.choose = (title, text, options, o = {}) => ui.modal({ title, text, locked: o.locked !== false, tone: "choose", choices: options, buttons: [] });
  U.confirm = ui.confirm; // everywhere that asks "are you sure?" now uses the pretty version (and is async)

  /* ---------- flower page-transition ---------- */
  let veil = null;
  const mkVeil = () => {
    const v = document.createElement("div");
    v.className = "bloomveil";
    const seed = Math.floor(Math.random() * 9999);
    const petals = Array.from({ length: 12 }, (_, i) => `<i style="--a:${i * 30}deg;--d:${(i % 3) * 25}ms">${flower(seed + i * 3, 46, { petals: 6, layers: 2 })}</i>`).join("");
    v.innerHTML = `<div class="bv-wash"></div><div class="bv-ring">${petals}</div><div class="bv-main">${flower(seed, 210, { petals: 10, layers: 4 })}</div>`;
    return v;
  };
  ui.transition = async (swap) => {
    if (reduced() || !ui.ready || document.hidden) { await swap(); return; }
    const v = (veil = mkVeil());
    document.body.appendChild(v);
    void v.offsetWidth;
    v.classList.add("in");
    await wait(300);                 // flowers have bloomed and cover the page
    try { await swap(); } finally { window.scrollTo(0, 0); }
    v.classList.remove("in"); v.classList.add("out");
    await wait(300);
    v.remove(); if (veil === v) veil = null;
  };

  /* ---------- the welcome: Jason and Linet's names written by hand ---------- */
  const letters = (name, start) => [...name].map((ch, i) => `<span class="il" style="--d:${(start + i * 0.12).toFixed(2)}s">${ch === " " ? "&nbsp;" : U.esc(ch)}</span>`).join("");
  ui.intro = (nameA, nameB) => new Promise((resolve) => {
    if (reduced()) return resolve();
    const el = document.createElement("div");
    el.className = "intro";
    const a = (nameA || "Jason").slice(0, 14), b = (nameB || "Linet").slice(0, 14);
    const tA = 0.9, tB = tA + a.length * 0.12 + 1.5, end = tB + b.length * 0.12 + 1.9;
    const swirl = (c, d) => `<svg class="iswirl" viewBox="0 0 300 30" style="--c:${c};--d:${d}s"><path pathLength="1" d="M4 20 C 50 4, 90 30, 150 14 S 250 4, 296 16"/></svg>`;
    el.innerHTML = `<div class="in-bg"></div>
      <div class="in-flowers">${Array.from({ length: 9 }, (_, i) => `<i style="--i:${i};--x:${(i * 41 + 7) % 100}%;--y:${(i * 29 + 13) % 100}%">${flower(70 + i * 5, 60 + (i % 3) * 26, { petals: 6 + (i % 5), layers: 3 })}</i>`).join("")}</div>
      <div class="in-center">
        <div class="in-bloom" style="--t:0.15s">${flower(321, 120, { petals: 12, layers: 4 })}</div>
        <div class="in-name a">${letters(a, tA)}<em class="pen" style="--t:${tA}s;--w:${a.length * 0.12 + 0.3}s"></em>${swirl("var(--him)", tA + a.length * 0.12 + 0.2)}</div>
        <div class="in-amp" style="--t:${tB - 0.9}s"><span>💜</span><b>&amp;</b><span>🌸</span></div>
        <div class="in-name b">${letters(b, tB)}<em class="pen" style="--t:${tB}s;--w:${b.length * 0.12 + 0.3}s"></em>${swirl("var(--her)", tB + b.length * 0.12 + 0.2)}</div>
        <p class="in-sub" style="--t:${end - 1.5}s">our little garden</p>
      </div>
      <button class="in-skip" type="button">Skip ›</button>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("go"));
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      clearTimeout(t1); clearTimeout(t2);
      try { LN.art.burst(innerWidth / 2, innerHeight * 0.45, ["🌸", "💜", "✨", "🌷", "💗"], 26); } catch (e) {}
      el.classList.add("out");
      setTimeout(() => { el.remove(); resolve(); }, 900);
    };
    const t1 = setTimeout(() => { try { LN.art.burst(innerWidth / 2, innerHeight * 0.5, ["🌸", "💜", "✨"], 16); } catch (e) {} }, (tB + b.length * 0.12 + 0.6) * 1000);
    const t2 = setTimeout(finish, end * 1000);
    U.$(".in-skip", el).onclick = finish;
    el.addEventListener("click", (e) => { if (!e.target.closest(".in-skip") && done === false && Date.now() - t0 > 1200) finish(); });
    const t0 = Date.now();
  });


  /* ---------- names in the background: big soft ones drifting, small ones blooming in the corners ---------- */
  ui.ambient = (nameA, nameB) => {
    if (document.getElementById("ambient")) return;
    const names = [[(nameA || "Jason").slice(0, 14), "a"], [(nameB || "Linet").slice(0, 14), "b"]];
    const el = document.createElement("div");
    el.id = "ambient"; el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    const mk = (cls, who, name, style) => {
      const n = document.createElement("span");
      n.className = "amb " + cls + " " + who; n.textContent = name; n.style.cssText = style;
      el.appendChild(n); return n;
    };
    let k = 0;
    const big = () => {
      if (document.hidden) return;
      const [nm, w] = names[k++ % 2];
      const n = mk("big", w, nm, `--x:${w === "a" ? 6 + Math.random() * 14 : 40 + Math.random() * 14}%;--y:${22 + Math.random() * 50}%;--r:${(Math.random() * 14 - 7).toFixed(1)}deg`);
      setTimeout(() => n.remove(), 14000);
    };
    const spots = [[3, 12], [78, 10], [4, 80], [76, 84], [40, 4], [42, 90], [2, 46], [84, 48]];
    let sp = 0;
    const small = () => {
      if (document.hidden) return;
      const [nm, w] = names[Math.floor(Math.random() * 2)], [x, y] = spots[sp++ % spots.length];
      const n = mk("small", w, nm + (w === "a" ? " 💜" : " 🌸"), `left:${x}%;top:${y}%;--r:${(Math.random() * 16 - 8).toFixed(0)}deg`);
      setTimeout(() => n.remove(), 5200);
    };
    big(); setTimeout(small, 1200);
    if (!reduced()) { setInterval(big, 9000); setInterval(small, 2600); }
  };

  ui.ready = true;
})();
