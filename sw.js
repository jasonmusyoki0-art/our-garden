/* Lets the site open and the computer games run with no internet.
   Network-first: when you're online you always get the newest files, so your edits show up right away.
   On the very first visit it also saves every page file, so the next visit works offline.
   (New files you add later are saved automatically the first time they load while you're online.) */
const V = "garden-v2";
const FILES = ["css/style.css", "index.html", "js/app.js", "js/config.js", "js/content/deeptalk.js", "js/content/games.js", "js/content/gestures.js", "js/content/letters.js", "js/content/notes.js", "js/content/questions.js", "js/core/art.js", "js/core/db.js", "js/core/generator.js", "js/core/gestures-ui.js", "js/core/presence.js", "js/core/util.js", "js/games/ai.js", "js/games/chess.js", "js/games/connect4.js", "js/games/deeptalk.js", "js/games/dice.js", "js/games/kit.js", "js/games/ludo.js", "js/games/ttt.js", "js/views/calendar.js", "js/views/letters.js", "js/views/lock.js", "js/views/memories.js", "js/views/play.js", "js/views/questions.js", "js/views/settings.js", "js/views/today.js", "js/views/voice.js"];
const LIBS = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js",
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"
];
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    // one missing file must never stop the others from being saved
    await Promise.allSettled([
      ...["./"].concat(FILES).map((f) => c.add(new Request(f, { cache: "reload" }))),
      ...LIBS.map(async (u) => { const r = await fetch(u, { mode: "no-cors" }); await c.put(u, r); })
    ]);
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  const ours = u.origin === location.origin;
  const lib = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"].includes(u.hostname);
  if (!ours && !lib) return; // never touch the database / photo traffic
  e.respondWith(
    fetch(r, ours ? { cache: "no-cache" } : undefined)
      .then((res) => {
        if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(V).then((c) => c.put(r, copy)).catch(() => {}); }
        return res;
      })
      .catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || (r.mode === "navigate" ? caches.match("./index.html") || caches.match("./") : Response.error())))
  );
});
