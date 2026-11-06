/* Data layer. Two modes, same API:
   - "cloud": Supabase (shared by both of you, protected by login + row level security)
   - "local": this browser only (IndexedDB) - used until you add Supabase keys */
(function () {
  const LN = window.LN, C = LN.config, U = LN.util;
  const cloud = !!(C.supabaseUrl && C.supabaseAnonKey); // configured = cloud, even if the library failed to load (then we report "can't reach" instead of silently switching to local mode)
  let sb = null;
  if (cloud && !window.supabase) {
    const down = () => { throw new Error("The cloud library did not load (no internet?)"); };
    sb = { from: down, storage: { from: down }, auth: { getSession: async () => ({ data: { session: null } }), signOut: async () => ({}), signInWithPassword: async () => ({ error: { status: 0, message: "network" } }) } };
  } else if (cloud) {
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, {
      // sessionStorage = closing the tab forgets the login, so the code is needed again
      auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
  }

  /* ---------- IndexedDB helpers (local mode) ---------- */
  let _idb;
  const idb = () =>
    _idb ||
    (_idb = new Promise((res, rej) => {
      const q = indexedDB.open("ourgarden", 3);
      q.onupgradeneeded = () => {
        const d = q.result;
        ["kv", "answers", "letters", "albums", "media", "files", "events", "messages", "results"].forEach((s) => {
          if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: s === "kv" ? "key" : s === "files" ? "path" : "id" });
        });
      };
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    }));
  const run = async (store, mode, fn) => {
    const d = await idb();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const rq = fn(t.objectStore(store));
      t.oncomplete = () => res(rq && rq.result);
      t.onerror = () => rej(t.error);
    });
  };
  const sha = async (s) => {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
  };

  const urlCache = new Map(), urlTime = new Map();

  const db = (LN.db = {
    mode: cloud ? "cloud" : "local",

    /* ----- login ----- */
    needsSetup: () => !cloud && !localStorage.getItem("ln_hash"),
    async hasSession() {
      if (cloud) {
        const { data } = await sb.auth.getSession();
        return !!data.session;
      }
      return sessionStorage.getItem("ln_ok") === "1";
    },
    async setLocalCode(code) {
      const salt = U.uuid();
      localStorage.setItem("ln_salt", salt);
      localStorage.setItem("ln_hash", await sha(salt + code));
      sessionStorage.setItem("ln_ok", "1");
    },
    async login(code) {
      if (cloud) {
        const { error } = await sb.auth.signInWithPassword({ email: C.sharedEmail, password: C.passwordPrefix + code });
        if (!error) return "ok";
        return error.status === 400 || /invalid/i.test(error.message) ? "wrong" : "network";
      }
      const ok = (await sha(localStorage.getItem("ln_salt") + code)) === localStorage.getItem("ln_hash");
      if (ok) sessionStorage.setItem("ln_ok", "1");
      return ok ? "ok" : "wrong";
    },
    async logout() {
      urlCache.clear();
      sessionStorage.removeItem("ln_ok");
      if (cloud) await sb.auth.signOut();
    },

    /* ----- rows ----- */
    async list(table) {
      if (cloud) {
        // the server hands out at most 1000 rows per request, so ask page by page until we have everything
        const out = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await sb.from(table).select("*").order("created_at", { ascending: false }).order("id").range(from, from + 999);
          if (error) throw error;
          out.push(...data);
          if (data.length < 1000) break;
        }
        return out;
      }
      const all = await run(table, "readonly", (s) => s.getAll());
      return all.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },
    /* the newest N rows, newest first (small and quick, used by chat) */
    async recent(table, n = 100) {
      if (cloud) {
        const { data, error } = await sb.from(table).select("*").order("created_at", { ascending: false }).limit(n);
        if (error) throw error;
        return data;
      }
      return (await db.list(table)).slice(0, n);
    },
    async add(table, row) {
      row = { id: U.uuid(), created_at: new Date().toISOString(), ...row };
      if (cloud) {
        const { error } = await sb.from(table).insert(row);
        if (error) throw error;
      } else await run(table, "readwrite", (s) => s.put(row));
      return row;
    },
    async update(table, id, patch) {
      if (cloud) {
        const { error } = await sb.from(table).update(patch).eq("id", id);
        if (error) throw error;
      } else {
        const d = await idb();
        const cur = await new Promise((r) => (d.transaction(table).objectStore(table).get(id).onsuccess = (e) => r(e.target.result)));
        await run(table, "readwrite", (s) => s.put({ ...cur, ...patch }));
      }
    },
    async remove(table, id) {
      if (cloud) {
        const { error } = await sb.from(table).delete().eq("id", id);
        if (error) throw error;
      } else await run(table, "readwrite", (s) => s.delete(id));
    },

    /* ----- tiny "has anything changed?" check, used for the "something new" alert ----- */
    async fingerprint() {
      if (!cloud) return "";
      const parts = [];
      for (const t of ["answers", "letters", "media", "albums", "events"]) {
        const { count, error } = await sb.from(t).select("id", { count: "exact", head: true });
        parts.push(error ? "x" : count);
      }
      return parts.join("-");
    },

    /* ----- settings (small key/value) ----- */
    async kvGet(key) {
      if (cloud) {
        const { data, error } = await sb.from("kv").select("value").eq("key", key).maybeSingle();
        if (error) throw error;
        return data ? data.value : null;
      }
      const r = await run("kv", "readonly", (s) => s.get(key));
      return r ? r.value : null;
    },
    async kvSet(key, value) {
      if (cloud) {
        const { error } = await sb.from("kv").upsert({ key, value });
        if (error) throw error;
      } else await run("kv", "readwrite", (s) => s.put({ key, value }));
    },

    /* ----- files (photos, videos, voice notes) ----- */
    async putFile(path, blob) {
      if (cloud) {
        const { error } = await sb.storage.from("memories").upload(path, blob, { contentType: blob.type || "application/octet-stream" });
        if (error) throw error;
      } else await run("files", "readwrite", (s) => s.put({ path, blob }));
    },
    async fileBlob(path) {
      if (cloud) {
        const { data, error } = await sb.storage.from("memories").download(path);
        if (error) throw error;
        return data;
      }
      const r = await run("files", "readonly", (s) => s.get(path));
      return r && r.blob;
    },
    async fileUrls(paths) {
      paths = paths.filter(Boolean);
      const fresh = (p) => urlCache.has(p) && (!cloud || Date.now() - (urlTime.get(p) || 0) < 45 * 60000);
      const need = paths.filter((p) => !fresh(p));
      if (cloud && need.length) {
        const { data, error } = await sb.storage.from("memories").createSignedUrls(need, 3600);
        if (error) throw error;
        data.forEach((d) => { if (d.signedUrl) { urlCache.set(d.path, d.signedUrl); urlTime.set(d.path, Date.now()); } });
      } else if (!cloud) {
        for (const p of need) {
          const r = await run("files", "readonly", (s) => s.get(p));
          if (r) urlCache.set(p, URL.createObjectURL(r.blob));
        }
      }
      return paths.map((p) => urlCache.get(p) || "");
    },
    async fileUrl(path) {
      return (await db.fileUrls([path]))[0];
    },
    async removeFile(path) {
      if (!path) return;
      urlCache.delete(path);
      if (cloud) await sb.storage.from("memories").remove([path]);
      else await run("files", "readwrite", (s) => s.delete(path));
    }
  });
})();
