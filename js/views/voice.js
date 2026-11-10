/* 🎙️ Voice notes.
   Why some notes wouldn't play on her phone: Chrome records ".webm", which iPhones can't play, while iPhones
   record ".m4a", which plays everywhere. So now: we record in the most universal format available, convert
   anything else to WAV (plays on every phone and browser), and quietly repair older notes. */
LN.voice = {
  /* does THIS browser know how to play this kind of file? */
  canPlay(mime) {
    const base = String(mime || "").split(";")[0].trim().toLowerCase();
    if (!base) return true;
    const a = document.createElement("audio");
    return !!a.canPlayType && a.canPlayType(base) !== "";
  },
  needsFix(mime) { return /webm|ogg|opus/i.test(String(mime || "")); },

  /* any recording -> mono 22kHz 16-bit WAV (about 2.6 MB per minute) */
  async toWav(blob) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !window.OfflineAudioContext) throw new Error("no audio tools");
    const ac = new AC();
    let audio;
    try { audio = await ac.decodeAudioData(await blob.arrayBuffer()); } finally { if (ac.close) ac.close(); }
    const rate = 22050, len = Math.max(1, Math.ceil(audio.duration * rate));
    const off = new OfflineAudioContext(1, len, rate), src = off.createBufferSource();
    src.buffer = audio; src.connect(off.destination); src.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    const buf = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) { const x = Math.max(-1, Math.min(1, pcm[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
    return new Blob([buf], { type: "audio/wav" });
  },

  /* repair one of MY older notes so every phone can play it */
  async repair(n) {
    const { db, util: U } = LN;
    const wav = await LN.voice.toWav(await db.fileBlob(n.path));
    const path = n.path.replace(/\.[^.\/]+$/, "") + ".wav";
    await db.putFile(path, wav);
    await db.update("media", n.id, { path, mime: "audio/wav", size: wav.size });
    try { await db.removeFile(n.path); } catch (e) {}
    return path;
  },

  async render(root) {
    const V = LN.voice, { util: U, db } = LN, ctx = LN.ctx;
    let notes = [];
    try { notes = (await db.list("media")).filter((m) => m.kind === "voice"); } catch (e) { U.toast("Couldn't load voice notes"); }

    root.innerHTML = `<h2 class="page-title script">Voice Notes</h2>
      <section class="card recorder">
        <p class="muted">Record something sweet, a goodnight, a giggle, a song. ${U.esc(ctx.name(ctx.other))} can hear it on any phone 🎙️</p>
        <button class="recbtn" id="rec" aria-label="Start recording"><span>🎙️</span></button>
        <p class="timer" id="timer">0:00</p>
        <div id="preview" hidden>
          <audio controls id="pa"></audio>
          <label class="field">Title (optional)<input id="vt" maxlength="60" placeholder="Goodnight, my love"></label>
          <div class="row"><button class="btn" id="vsave">Send 💗</button><button class="btn ghost" id="vdisc">Discard</button></div>
        </div>
      </section>
      <div id="vlist" class="stack"></div>`;

    let mr, chunks = [], blob = null, tick, t0;
    const rec = U.$("#rec", root), timer = U.$("#timer", root);
    const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

    rec.onclick = async () => {
      if (mr && mr.state === "recording") { mr.stop(); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder) return U.toast("Recording isn't supported in this browser");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // most universal first: mp4/aac plays on every phone. webm/ogg get converted to WAV after recording.
        const mime = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
        mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        chunks = [];
        mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        mr.onstop = async () => {
          clearInterval(tick);
          stream.getTracks().forEach((t) => t.stop());
          rec.classList.remove("on");
          blob = new Blob(chunks, { type: (mr.mimeType || "audio/webm").split(";")[0] });
          if (V.needsFix(blob.type)) {
            try { U.toast("Getting it ready for every phone…"); blob = await V.toWav(blob); } catch (e) { console.error(e); }
          }
          U.$("#pa", root).src = URL.createObjectURL(blob);
          U.$("#preview", root).hidden = false;
        };
        mr.start();
        t0 = Date.now();
        rec.classList.add("on");
        U.$("#preview", root).hidden = true;
        tick = setInterval(() => {
          const s = Math.floor((Date.now() - t0) / 1000);
          timer.textContent = fmt(s);
          if (s >= 600) mr.stop(); // 10 minute cap
        }, 250);
      } catch (e) { U.toast("Please allow microphone access 🎙️"); }
    };

    U.$("#vdisc", root).onclick = () => { blob = null; U.$("#preview", root).hidden = true; timer.textContent = "0:00"; };
    U.$("#vsave", root).onclick = async () => {
      if (!blob) return;
      const ext = blob.type.includes("wav") ? "wav" : blob.type.includes("mp4") || blob.type.includes("aac") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      const path = `${ctx.who}/voice-${Date.now()}-${U.uuid().slice(0, 6)}.${ext}`;
      const btn = U.$("#vsave", root); btn.disabled = true; btn.textContent = "Sending…";
      try {
        await db.putFile(path, blob);
        await db.add("media", {
          kind: "voice", album_id: null, path, thumb_path: null, name: U.$("#vt", root).value.trim() || "Voice note",
          mime: blob.type, caption: "", author: ctx.who, period: "", size: blob.size
        });
        U.toast("Voice note sent 💗");
        V.render(root);
      } catch (e) { btn.disabled = false; btn.textContent = "Send 💗"; U.toast("Couldn't upload. Try again."); }
    };

    /* quietly repair MY older notes (this phone recorded them, so this phone can convert them) */
    const mineOld = notes.filter((n) => n.author === ctx.who && V.needsFix(n.mime));
    if (mineOld.length && window.OfflineAudioContext) {
      (async () => {
        let fixed = 0;
        for (const n of mineOld) { try { await V.repair(n); fixed++; } catch (e) { console.error(e); } }
        if (fixed) { U.toast(`Made ${fixed} of your voice notes playable on every phone 💗`); if (document.body.contains(root) && U.$("#vlist", root)) V.render(root); }
      })();
    }

    const list = U.$("#vlist", root);
    if (!notes.length) list.innerHTML = `<p class="empty">No voice notes yet. Be the first to say hi 🌷</p>`;
    const urls = await db.fileUrls(notes.map((n) => n.path));
    notes.forEach((n, i) => {
      const mine = n.author === ctx.who, playable = V.canPlay(n.mime);
      const c = document.createElement("article");
      c.className = "card voicecard by-" + n.author + " " + (mine ? "mine" : "theirs");
      c.innerHTML = `<p class="eyebrow">${U.esc(ctx.name(n.author))} · ${U.esc(U.fmtDate(n.created_at))}</p><h3>${U.esc(n.name)}</h3>
        <audio controls preload="none" src="${U.esc(urls[i])}"></audio>
        <p class="muted vwarn" hidden></p>
        <div class="row"><button class="btn small ghost dl">⬇ Download</button>${mine ? '<button class="btn small ghost del">Delete</button>' : ""}</div>`;
      const au = U.$("audio", c), warn = U.$(".vwarn", c);
      const explain = () => {
        warn.hidden = false;
        warn.textContent = mine
          ? "This note is in a format some phones can't play. It's being fixed automatically; refresh in a moment."
          : `This phone can't play this recording yet. Ask ${ctx.name(n.author)} to open the Voice page once and it will fix itself. Meanwhile you can download it.`;
      };
      if (!playable) explain();
      au.addEventListener("error", explain);
      U.$(".dl", c).onclick = async () => {
        const b = await db.fileBlob(n.path);
        U.download(b, `${n.name.replace(/[^\w\- ]+/g, "")}-${n.created_at.slice(0, 10)}.${n.path.split(".").pop()}`);
      };
      const del = U.$(".del", c);
      if (del) del.onclick = async () => {
        if (!U.confirm("Delete this voice note?")) return;
        await db.removeFile(n.path); await db.remove("media", n.id);
        V.render(root);
      };
      list.appendChild(c);
    });
  }
};
LN.views.voice = { render: (root) => LN.voice.render(root) };
