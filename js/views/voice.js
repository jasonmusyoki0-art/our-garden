LN.views.voice = {
  async render(root) {
    const { util: U, db } = LN, ctx = LN.ctx;
    let notes = [];
    try { notes = (await db.list("media")).filter((m) => m.kind === "voice"); } catch (e) { U.toast("Couldn't load voice notes"); }

    root.innerHTML = `<h2 class="page-title script">Voice Notes</h2>
      <section class="card recorder">
        <p class="muted">Record something sweet, a goodnight, a giggle, a song. She'll hear your voice whenever she wants 🎙️</p>
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
        const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
        mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        chunks = [];
        mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        mr.onstop = () => {
          clearInterval(tick);
          stream.getTracks().forEach((t) => t.stop());
          rec.classList.remove("on");
          blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
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
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      const path = `${ctx.who}/voice-${Date.now()}-${U.uuid().slice(0, 6)}.${ext}`;
      const btn = U.$("#vsave", root); btn.disabled = true; btn.textContent = "Sending…";
      try {
        await db.putFile(path, blob);
        await db.add("media", {
          kind: "voice", album_id: null, path, thumb_path: null, name: U.$("#vt", root).value.trim() || "Voice note",
          mime: blob.type, caption: "", author: ctx.who, period: "", size: blob.size
        });
        U.toast("Voice note sent 💗");
        LN.views.voice.render(root);
      } catch (e) { btn.disabled = false; btn.textContent = "Send 💗"; U.toast("Couldn't upload. Try again."); }
    };

    const list = U.$("#vlist", root);
    if (!notes.length) list.innerHTML = `<p class="empty">No voice notes yet. Be the first to say hi 🌷</p>`;
    const urls = await db.fileUrls(notes.map((n) => n.path));
    notes.forEach((n, i) => {
      const c = document.createElement("article");
      c.className = "card voicecard " + (n.author === ctx.who ? "mine" : "theirs");
      c.innerHTML = `<p class="eyebrow">${U.esc(ctx.name(n.author))} · ${U.esc(U.fmtDate(n.created_at))}</p><h3>${U.esc(n.name)}</h3>
        <audio controls preload="none" src="${U.esc(urls[i])}"></audio>
        <div class="row"><button class="btn small ghost dl">⬇ Download</button>${n.author === ctx.who ? '<button class="btn small ghost del">Delete</button>' : ""}</div>`;
      U.$(".dl", c).onclick = async () => {
        const b = await db.fileBlob(n.path);
        U.download(b, `${n.name.replace(/[^\w\- ]+/g, "")}-${n.created_at.slice(0, 10)}.${n.path.split(".").pop()}`);
      };
      const del = U.$(".del", c);
      if (del) del.onclick = async () => {
        if (!U.confirm("Delete this voice note?")) return;
        await db.removeFile(n.path); await db.remove("media", n.id);
        LN.views.voice.render(root);
      };
      list.appendChild(c);
    });
  }
};
