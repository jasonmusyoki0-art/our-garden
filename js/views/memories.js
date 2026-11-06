LN.views.memories = {
  open: null, // null = overview, otherwise an album id or "all"

  async render(root) {
    const V = LN.views.memories, { util: U, gen: G, db } = LN, ctx = LN.ctx, S = G.settings;
    let albums = [], media = [];
    try {
      albums = await db.list("albums");
      media = (await db.list("media")).filter((m) => m.kind !== "voice");
    } catch (e) { U.toast("Couldn't load memories"); }

    const cadence = S.cadence === "daily" ? "daily" : "weekly";
    const period = cadence === "daily" ? U.dateKey() : U.weekKey();
    const inAlbum = (id) => (id === "all" ? media : media.filter((m) => m.album_id === id));

    /* ---------- helpers ---------- */
    const shrink = async (file, max, q) => {
      try {
        const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
        const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
        cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
        return await new Promise((r) => cv.toBlob(r, "image/jpeg", q));
      } catch (e) { return null; } // e.g. HEIC on a browser that can't read it: we keep the original
    };

    async function ensureDropsAlbum() {
      let a = albums.find((x) => x.auto === "drops");
      if (!a) { a = await db.add("albums", { name: "Memory Drops", emoji: "💞", auto: "drops", author: ctx.who }); albums.push(a); }
      return a;
    }

    async function upload(files, albumId, caption, isDrop) {
      const maxB = LN.config.maxUploadMB * 1048576;
      const wrap = U.$("#upstat");
      wrap.hidden = false;
      let ok = 0;
      for (const [i, file] of [...files].entries()) {
        wrap.textContent = `Uploading ${i + 1} of ${files.length}: ${file.name}…`;
        const isVid = file.type.startsWith("video/"), isImg = file.type.startsWith("image/");
        if (!isVid && !isImg) { U.toast(`${file.name}: only photos and videos`); continue; }
        if (file.size > maxB) { U.toast(`${file.name} is over ${LN.config.maxUploadMB} MB`); continue; }
        try {
          const id = U.uuid().slice(0, 8), base = `${ctx.who}/${Date.now()}-${id}`;
          let main = file, thumb = null, ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
          if (isImg && file.type !== "image/gif") {
            const big = await shrink(file, 2600, 0.9);
            if (big && big.size < file.size) { main = big; ext = "jpg"; }
            const th = await shrink(file, 520, 0.8);
            if (th) thumb = th;
          }
          await db.putFile(`${base}.${ext}`, main);
          if (thumb) await db.putFile(`${base}-thumb.jpg`, thumb);
          await db.add("media", {
            kind: isVid ? "video" : "photo", album_id: albumId, path: `${base}.${ext}`, thumb_path: thumb ? `${base}-thumb.jpg` : null,
            name: file.name, mime: main.type || file.type, caption, author: ctx.who, period: isDrop ? period : "", size: main.size
          });
          ok++;
        } catch (e) { console.error(e); U.toast(`Couldn't upload ${file.name}`); }
      }
      wrap.hidden = true;
      if (ok) U.toast(`${ok} memor${ok > 1 ? "ies" : "y"} saved 💗`);
      V.render(root);
    }

    async function zipDownload(list, name) {
      if (!window.JSZip) return U.toast("Zip tool didn't load. Check your internet.");
      if (!list.length) return U.toast("Nothing to download yet");
      const zip = new JSZip(), used = new Set();
      for (const [i, m] of list.entries()) {
        U.toast(`Packing ${i + 1} of ${list.length}…`, 60000);
        try {
          const b = await db.fileBlob(m.path);
          let n = (m.name || "memory").replace(/[^\w.\- ]+/g, "_"), k = 1;
          while (used.has(n.toLowerCase())) n = `${k++}-${m.name.replace(/[^\w.\- ]+/g, "_")}`;
          used.add(n.toLowerCase());
          // photos we resized are saved as .jpg - keep the extension honest
          if (m.path.endsWith(".jpg") && !/\.jpe?g$/i.test(n)) n = n.replace(/\.[^.]+$/, "") + ".jpg";
          zip.file(n, b);
        } catch (e) { console.error(e); }
      }
      const out = await zip.generateAsync({ type: "blob" });
      U.download(out, `${name.replace(/[^\w\- ]+/g, "")}.zip`);
      U.toast("Download ready 💗");
    }

    async function lightbox(list, idx) {
      const lb = document.createElement("div");
      lb.className = "lightbox";
      document.body.appendChild(lb);
      const show = async () => {
        const m = list[idx];
        const url = await db.fileUrl(m.path);
        lb.innerHTML = `<button class="lb-x" aria-label="Close">✕</button>
          ${list.length > 1 ? '<button class="lb-n prev" aria-label="Previous">‹</button><button class="lb-n next" aria-label="Next">›</button>' : ""}
          <div class="lb-media">${m.kind === "video" ? `<video src="${U.esc(url)}" controls autoplay playsinline></video>` : `<img src="${U.esc(url)}" alt="${U.esc(m.caption || m.name)}">`}</div>
          <div class="lb-bar"><div><b>${U.esc(ctx.name(m.author))}</b> · ${U.esc(U.fmtDate(m.created_at))}${m.caption ? `<br><span>${U.esc(m.caption)}</span>` : ""}</div>
          <div class="row"><button class="btn small" id="lbdl">⬇ Download</button>${m.author === ctx.who ? '<button class="btn small ghost" id="lbdel">Delete</button>' : ""}</div></div>`;
        U.$(".lb-x", lb).onclick = close;
        const p = U.$(".prev", lb), n = U.$(".next", lb);
        if (p) { p.onclick = () => { idx = (idx - 1 + list.length) % list.length; show(); }; n.onclick = () => { idx = (idx + 1) % list.length; show(); }; }
        U.$("#lbdl", lb).onclick = async () => U.download(await db.fileBlob(m.path), m.path.endsWith(".jpg") && !/\.jpe?g$/i.test(m.name) ? m.name.replace(/\.[^.]+$/, "") + ".jpg" : m.name);
        const d = U.$("#lbdel", lb);
        if (d) d.onclick = async () => {
          if (!U.confirm("Delete this memory forever?")) return;
          await db.removeFile(m.path); await db.removeFile(m.thumb_path); await db.remove("media", m.id);
          close(); V.render(root);
        };
      };
      const key = (e) => { if (e.key === "Escape") close(); if (e.key === "ArrowRight") U.$(".next", lb)?.click(); if (e.key === "ArrowLeft") U.$(".prev", lb)?.click(); };
      const close = () => { document.removeEventListener("keydown", key); lb.remove(); };
      document.addEventListener("keydown", key);
      show();
    }

    /* ---------- screens ---------- */
    const grid = async (list, target) => {
      const urls = await db.fileUrls(list.map((m) => m.thumb_path || m.path));
      list.forEach((m, i) => {
        const b = document.createElement("button");
        b.className = "tile";
        b.setAttribute("aria-label", "Open memory");
        b.innerHTML = m.kind === "video"
          ? `<video src="${U.esc(urls[i])}#t=0.1" preload="metadata" muted playsinline></video><span class="play">▶</span>`
          : `<img loading="lazy" src="${U.esc(urls[i])}" alt="${U.esc(m.caption || "memory")}">`;
        b.onclick = () => lightbox(list, i);
        target.appendChild(b);
      });
    };

    const uploader = `
      <section class="card" id="uploadbox">
        <h3>Add memories</h3>
        <form id="upf">
          <label class="field">Photos or videos <input type="file" id="files" accept="image/*,video/*" multiple required></label>
          <label class="field">Album <select id="alb"></select></label>
          <label class="field">A little caption (optional) <input id="cap" maxlength="140" placeholder="our sunset walk 🌅"></label>
          <button class="btn">Upload 📸</button>
        </form>
        <p id="upstat" class="muted" hidden></p>
      </section>`;

    if (V.open) {
      const isAll = V.open === "all";
      const alb = isAll ? { name: "Everything", emoji: "🌸" } : albums.find((a) => a.id === V.open);
      if (!alb) { V.open = null; return V.render(root); }
      const list = inAlbum(V.open);
      root.innerHTML = `<div class="row between"><button class="btn small ghost" id="back">‹ All albums</button>
        <div class="row"><button class="btn small" id="zip">⬇ Download all (.zip)</button>${!isAll && alb.auto !== "drops" ? '<button class="btn small ghost" id="delalb">Delete album</button>' : ""}</div></div>
        <h2 class="page-title script">${U.esc(alb.emoji)} ${U.esc(alb.name)}</h2>
        <p class="muted">${list.length} memor${list.length === 1 ? "y" : "ies"}</p>
        <div class="gallery" id="gal"></div>${list.length ? "" : '<p class="empty">Nothing here yet 🌷</p>'}${uploader}`;
      U.$("#back", root).onclick = () => { V.open = null; V.render(root); };
      U.$("#zip", root).onclick = () => zipDownload(list, alb.name);
      const da = U.$("#delalb", root);
      if (da) da.onclick = async () => {
        if (!U.confirm("Delete this album? Its photos and videos stay in 'Everything'.")) return;
        for (const m of list) await db.update("media", m.id, { album_id: null });
        await db.remove("albums", alb.id); V.open = null; V.render(root);
      };
      await grid(list, U.$("#gal", root));
    } else {
      const mine = media.filter((m) => m.period === period && m.author === ctx.who).length;
      const hers = media.filter((m) => m.period === period && m.author === ctx.other).length;
      root.innerHTML = `<h2 class="page-title script">Memories</h2>
        <section class="card drop">
          <p class="eyebrow">${cadence === "daily" ? "Today's" : "This week's"} memory drop</p>
          <p class="big-text">📸 ${U.esc(G.dropPromptFor(period))}</p>
          <div class="row wrap"><span class="chip ${mine ? "yes" : ""}">${mine ? "✓" : "○"} ${U.esc(ctx.name(ctx.who))}</span><span class="chip ${hers ? "yes" : ""}">${hers ? "✓" : "○"} ${U.esc(ctx.name(ctx.other))}</span></div>
          <button class="btn" id="dropbtn">Add my drop</button>
        </section>
        <div class="row between"><h3 class="sub">Albums</h3><button class="btn small ghost" id="newalb">＋ New album</button></div>
        <div class="albums" id="albs"></div>${uploader}`;
      const wrap = U.$("#albs", root);
      const tile = (id, emoji, name, list) => {
        const b = document.createElement("button");
        b.className = "album";
        b.innerHTML = `<span class="cover">${U.esc(emoji)}</span><b>${U.esc(name)}</b><small>${list.length} item${list.length === 1 ? "" : "s"}</small>`;
        b.onclick = () => { V.open = id; V.render(root); window.scrollTo(0, 0); };
        wrap.appendChild(b);
        const first = list.find((m) => m.kind === "photo");
        if (first) db.fileUrl(first.thumb_path || first.path).then((u) => u && (U.$(".cover", b).style.cssText = `background-image:url("${u}");font-size:0`));
      };
      tile("all", "🌸", "Everything", media);
      albums.forEach((a) => tile(a.id, a.emoji, a.name, inAlbum(a.id)));
      U.$("#newalb", root).onclick = async () => {
        const name = (prompt("Name your album (e.g. Our First Trip)") || "").trim();
        if (!name) return;
        const emoji = (prompt("Pick an emoji for it", "💗") || "💗").trim().slice(0, 4);
        await db.add("albums", { name: name.slice(0, 50), emoji, auto: "", author: ctx.who });
        V.render(root);
      };
      U.$("#dropbtn", root).onclick = () => { U.$("#files", root).setAttribute("data-drop", "1"); U.$("#alb", root).value = "__drops"; U.$("#files", root).click(); };
    }

    /* upload form */
    const sel = U.$("#alb", root);
    sel.innerHTML = `<option value="__drops">💞 Memory Drops</option><option value="">No album</option>` +
      albums.filter((a) => a.auto !== "drops").map((a) => `<option value="${U.esc(a.id)}">${U.esc(a.emoji)} ${U.esc(a.name)}</option>`).join("");
    if (V.open && V.open !== "all") { const a = albums.find((x) => x.id === V.open); if (a && a.auto !== "drops") sel.value = a.id; }
    const fileIn = U.$("#files", root);
    const go = async () => {
      if (!fileIn.files.length) return;
      let albumId = sel.value, isDrop = false;
      if (albumId === "__drops") { albumId = (await ensureDropsAlbum()).id; isDrop = true; }
      else if (albumId && albums.find((a) => a.id === albumId)?.auto === "drops") isDrop = true;
      await upload(fileIn.files, albumId || null, U.$("#cap", root).value.trim(), isDrop);
    };
    U.$("#upf", root).onsubmit = (e) => { e.preventDefault(); go(); };
    fileIn.addEventListener("change", () => { if (fileIn.dataset.drop) { fileIn.dataset.drop = ""; go(); } });
  }
};
