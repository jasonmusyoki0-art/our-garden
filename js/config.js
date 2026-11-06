/* ============================================================
   🌸 OUR GARDEN — SETTINGS YOU CAN EDIT
   Nothing secret goes in this file (it is public on GitHub).
   Your secret digit code is NEVER written anywhere in the code.
   ============================================================ */
window.LN = window.LN || {};

LN.config = {
  // Name shown at the top of the site
  appTitle: "Our Little Garden",

  // How many digits your secret code has. 8 is much safer than 4!
  // (If you use the cloud mode, this must match the code you set in Supabase.)
  codeLength: 6,

  // ---------- CLOUD MODE (shared between your two phones) ----------
  // Leave both empty to run in "local mode" (data stays on this one device,
  // great for trying things out). Fill them in after following README step 4.
  supabaseUrl: "https://obcgdkvtqehasxaxhkpe.supabase.co",
  supabaseAnonKey: "sb_publishable_U48GKs4ystRl8Q_965hDGg_tsZ-WL2H",

  // These two build your cloud password:  passwordPrefix + your digit code
  // Example:  "bloom-" + "48291573"  =>  "bloom-48291573"
  sharedEmail: "garden@ourlittleworld.app", // any email-looking text, must match README step 4
  passwordPrefix: "bloom-291026",                // change it to anything you like (min 3 chars)

  // Auto-lock after this many minutes of doing nothing (0 = never)
  idleLockMinutes: 5,

  // Biggest single file you can upload (Supabase free plan allows 50 MB)
  maxUploadMB: 50
};
