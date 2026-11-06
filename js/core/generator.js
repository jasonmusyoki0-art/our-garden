/* The "daily magic": everything here depends only on the date,
   so both of you see the same letter / flower / question on the same day,
   and tomorrow brings something new — no server needed. */
(function () {
  const LN = window.LN, U = LN.util;
  const G = (LN.gen = {});
  const C = () => LN.content;

  G.settings = { nameA: "Me", nameB: "You", nicknames: [], anniversary: "", birthdayB: "", jokes: [], loveLines: [], cadence: "weekly" };

  G.flowerFor = (key) => U.pick(U.rng(U.hash("flower" + key)), C().flowers);

  const SEASONS = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"];

  /* a different soft pink "mood" every day */
  const MOODS = [
    { name: "Blush", a: "#e8508a", s: "#ffe3ee" },
    { name: "Rosewater", a: "#d9608f", s: "#ffe9f0" },
    { name: "Peony", a: "#ee6aa0", s: "#ffe0ed" },
    { name: "Cotton Candy", a: "#f06ba8", s: "#ffe6f2" },
    { name: "Petal", a: "#e0568c", s: "#fff0f5" },
    { name: "Camellia", a: "#d94f86", s: "#ffe4ec" },
    { name: "Orchid Pink", a: "#c75ba6", s: "#fbe6f5" }
  ];
  G.moodFor = (key) => MOODS[U.hash("mood" + key) % MOODS.length];

  const PAPERS = ["paper-lace", "paper-wash", "paper-lines", "paper-dots", "paper-petal"];

  const usable = (arr, hasDays, hasJoke) =>
    arr.filter((s) => (hasDays || !s.includes("{days}")) && (hasJoke || !s.includes("{joke}")));

  G.letterFor = (key, S = G.settings) => {
    const L = C().letters;
    const r = U.rng(U.hash("letter" + key));
    const d = U.parseKey(key);
    const fl = G.flowerFor(key);
    const days = S.anniversary ? Math.max(0, U.daysBetween(S.anniversary, key)) : null;
    const hasDays = days !== null && days > 0;
    const jokes = (S.jokes || []).filter(Boolean);
    const nicks = (S.nicknames || []).filter(Boolean);
    const vars = {
      nick: nicks.length ? U.pick(r, nicks) : S.nameB,
      her: S.nameB,
      me: S.nameA,
      days: days ? days.toLocaleString() : "",
      weekday: d.toLocaleDateString(undefined, { weekday: "long" }),
      season: SEASONS[d.getMonth()],
      flower: fl.name,
      meaning: fl.meaning,
      joke: jokes.length ? U.pick(r, jokes) : ""
    };
    const f = (s) => U.fill(s, vars);

    /* special days */
    let special = null;
    const md = key.slice(5);
    if (S.birthdayB && S.birthdayB === md) special = L.special.birthday;
    else if (S.anniversary && hasDays) {
      if (S.anniversary.slice(5) === md) special = L.special.anniversary;
      else if (+S.anniversary.slice(8) === d.getDate()) special = L.special.monthly;
      else if (days % 100 === 0) special = L.special.hundred;
    }

    const opener = special || U.pick(r, usable(L.openers, hasDays, false));

    /* your own custom "things I love about you" count double */
    const custom = (S.loveLines || []).filter(Boolean);
    const pool = L.loveLines.concat(custom, custom);
    const loves = [];
    const count = 2 + (r() < 0.4 ? 1 : 0);
    let guard = 0;
    while (loves.length < count && guard++ < 50) {
      const l = U.pick(r, pool);
      if (!loves.includes(l)) loves.push(l);
    }

    const paras = [opener, loves.join(" "), U.pick(r, L.flowerLines), U.pick(r, L.wishes)].map(f);
    return {
      key,
      greeting: (g => g.charAt(0).toUpperCase() + g.slice(1))(f(U.pick(r, L.greetings))),
      paras,
      closing: f(U.pick(r, L.closings)),
      signature: S.nameA,
      ps: f(U.pick(r, usable(L.ps, hasDays, jokes.length > 0))),
      flower: fl,
      paper: U.pick(r, PAPERS),
      isSpecial: !!special
    };
  };

  /* no repeats until every question has been used */
  const cycle = (key, arr, salt) => {
    const n = U.dayNumber(key), len = arr.length;
    const order = U.shuffle(U.rng(U.hash(salt + Math.floor(n / len))), arr.map((_, i) => i));
    return arr[order[((n % len) + len) % len]];
  };
  G.cycle = cycle;
  G.questionFor = (key) => cycle(key, C().questions, "q");
  G.missionFor = (key) => cycle(key, C().missions, "m");
  G.dropPromptFor = (key) => cycle(key, C().dropPrompts, "d");

  /* A short, date-aware love note for ANY day (past, today or future). `variant` gives a fresh one on demand. */
  G.noteFor = (key, S = G.settings, variant = 0) => {
    const N = C().notes, today = U.dateKey();
    const r = U.rng(U.hash("note" + key + ":" + variant));
    const d = U.parseKey(key), fl = G.flowerFor(key);
    const diff = U.daysBetween(today, key);
    const nicks = (S.nicknames || []).filter(Boolean);
    const days = S.anniversary ? U.daysBetween(S.anniversary, key) : null;
    const vars = {
      nick: nicks.length ? U.pick(r, nicks) : S.nameB, her: S.nameB, me: S.nameA,
      weekday: d.toLocaleDateString(undefined, { weekday: "long" }),
      month: d.toLocaleDateString(undefined, { month: "long" }),
      dateLong: d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      flower: fl.name, meaning: fl.meaning
    };
    const f = (x) => U.fill(x, vars);
    const tense = diff === 0 ? N.present : diff > 0 ? N.future : N.past;
    const custom = (S.loveLines || []).filter(Boolean);
    const love = U.pick(r, C().letters.loveLines.concat(custom, custom));
    const parts = [U.pick(r, tense), love, N.months[d.getMonth()]];
    if (days !== null && days > 0 && r() < 0.6) parts.splice(1, 0, U.pick(r, N.counting).replace("{n}", days.toLocaleString()));
    else if (days !== null && days < 0 && r() < 0.6) parts.splice(1, 0, U.pick(r, N.before).replace("{n}", (-days).toLocaleString()));
    return {
      key, text: parts.map(f).join(" "),
      sign: f(U.pick(r, N.signs)), flower: fl, emoji: U.pick(r, ["🌸", "💗", "🌷", "💌", "🦋", "🍓", "✨", "🤍"])
    };
  };

  const KINDS = ["hearts", "scratch", "hug", "wheel", "envelope", "garden"];
  G.gestureFor = (key) => {
    const r = U.rng(U.hash("gesture" + key));
    return { kind: KINDS[U.dayNumber(key) % KINDS.length], message: U.pick(r, C().compliments) };
  };
})();
