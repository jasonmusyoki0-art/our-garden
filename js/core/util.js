(function () {
  const LN = (window.LN = window.LN || {});
  const U = (LN.util = {});

  U.esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Same text in -> same number out. This is what makes "daily" content stable for a given day.
  U.hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  U.rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  U.shuffle = (r, arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const p2 = (n) => String(n).padStart(2, "0");
  U.dateKey = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  U.parseKey = (k) => {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  U.daysBetween = (a, b) => Math.round((Date.UTC(...U.ymd(b)) - Date.UTC(...U.ymd(a))) / 86400000);
  U.ymd = (k) => {
    const [y, m, d] = k.split("-").map(Number);
    return [y, m - 1, d];
  };
  U.dayNumber = (k) => Math.floor(Date.UTC(...U.ymd(k)) / 86400000);
  U.weekKey = (d = new Date()) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const back = (x.getDay() + 6) % 7; // Monday start
    x.setDate(x.getDate() - back);
    return U.dateKey(x);
  };
  U.fmtDate = (v, opts) =>
    new Date(v).toLocaleDateString(undefined, opts || { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  U.fmtLong = (k) =>
    U.parseKey(k).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  U.fmtBytes = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.ceil(n / 1024) + " KB");

  U.uuid = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === "x" ? r : (r & 3) | 8).toString(16);
        });

  U.fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== "" ? vars[k] : m));

  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  U.toast = (msg, ms = 2600) => {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(U._tt);
    U._tt = setTimeout(() => t.classList.remove("show"), ms);
  };

  U.download = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);
  };

  /* Calendar-correct "time together". Uses local calendar fields, so it is safe across DST and month lengths. */
  U.elapsed = (startKey, now = new Date()) => {
    const [y, m, d] = U.ymd(startKey);
    let years = now.getFullYear() - y, months = now.getMonth() - m, days = now.getDate() - d;
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    return { years, months, days, h: now.getHours(), mi: now.getMinutes(), s: now.getSeconds(), total: U.daysBetween(startKey, U.dateKey(now)) };
  };
  U.addMonths = (key, n) => {
    const [y, m, d] = U.ymd(key);
    const dim = new Date(y, m + n + 1, 0).getDate();
    return U.dateKey(new Date(y, m + n, Math.min(d, dim)));
  };
  U.addDays = (key, n) => { const [y, m, d] = U.ymd(key); return U.dateKey(new Date(y, m, d + n)); };
  U.relDay = (key, today = U.dateKey()) => {
    const n = U.daysBetween(today, key);
    return n === 0 ? "today" : n === 1 ? "tomorrow" : n === -1 ? "yesterday" : n > 0 ? `in ${n} days` : `${-n} days ago`;
  };

  U.confirm = (msg) => window.confirm(msg);
})();
