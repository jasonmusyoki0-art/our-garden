# 🌸 Our Little Garden — a private, playful love website

A pink-and-white (with a whisper of purple) website for just the two of you:

- 🔐 **Secret digit code** door (keypad, lockout after wrong tries, auto-lock when idle)
- 💌 **A brand-new love letter every day**, generated from the date (plus a unique flower of the day, a new soft pink "mood", and a new letter-paper style)
- 🎀 **A different playful gesture every day** (catch hearts, scratch card, hold-to-hug, spin wheel, envelope, plant a garden), plus a tiny daily mission
- 💭 **Question of the day**, answers from both of you (you must answer to peek at the other's), plus "ask your own question"
- ✍️ **Handwritten letters**, time-capsule letters, and "Open when…" envelopes
- 📅 **Calendar & timeline**: plan dates, write reflections, tap any day for a love note, live "time together" counter
- 🎮 **Play tab**: Chess, Ludo, Tic-Tac-Toe (3×3, 5×5, 7×7 and Ultimate), Connect Four, Deep Talk (endless romantic questions), Love Dice, Memory Match, This or That, Finish the Sentence. Every board game has a skippable tutorial.
- 🎙️ **Voice notes** (record, play, download)
- 📸 **Photos & videos**, albums, a **daily or weekly Memory Drop**, and **download** of single files or whole albums as a .zip

It is a *static* website (no server to maintain) hosted free on **GitHub Pages**. Shared storage between your two phones uses a free **Supabase** project. Until you connect Supabase it runs in **Local mode** (one device only), so you can try everything immediately.

---

## Step 1: Install the tools (once)

1. **VS Code**: https://code.visualstudio.com → install.
2. **Git**: https://git-scm.com/downloads → install (keep the defaults).
3. In VS Code, click the square "Extensions" icon (left bar), search **Live Server** (by Ritwick Dey) → Install.
4. Create a free **GitHub** account: https://github.com

## Step 2: Open the project

1. Unzip `our-garden.zip` somewhere easy (e.g. Documents).
2. VS Code → **File → Open Folder…** → choose the `our-garden` folder.
3. Open `index.html`, then right-click in the editor → **Open with Live Server**.
4. Your browser opens the site. Pick a 6-digit code (it's only stored on this device in Local mode), fill in your names and date. Play around! 🌸

> Don't just double-click `index.html`; always use Live Server (or the GitHub link later).

## Step 3: Make it yours (edit anytime)

Everything is plain text. Edit, save, refresh the browser.

| I want to change… | Open this file |
|---|---|
| Site title, code length, auto-lock time | `js/config.js` |
| Deep Talk question themes and templates | `js/content/deeptalk.js` |
| Mini-game content (This or That pairs, sentences) | `js/content/games.js` |
| Colors (pink shades, purple accent) | `css/style.css` → top `:root { … }` |
| Letter sentences (openers, "I love…" lines, wishes, P.S., "Open when…") | `js/content/letters.js` |
| Questions | `js/content/questions.js` |
| Calendar day notes (past / today / future) | `js/content/notes.js` |
| Compliments, missions, wheel items, flowers, drop prompts | `js/content/gestures.js` |
| New playful game ideas | `js/core/gestures-ui.js` (and add its name to `KINDS` in `js/core/generator.js`) |
| Names, nicknames, inside jokes, anniversary | In the site: **Us** page (stored privately) |

Tip: add more lines to the lists = more variety. The daily letter picks pieces by date, so each day differs, and the same day shows the same letter to both of you.

**Personal stuff (inside jokes, nicknames, birthday) goes in the "Us" page, not in the files**, because the files are public on GitHub.

## Step 4: Connect the cloud (so you both share everything)

1. Go to https://supabase.com → sign up free → **New project** (any name, pick a strong database password, region near you).
2. Wait ~2 minutes. Left menu → **Authentication → Providers → Email**: turn **OFF "Allow new users to sign up"** (important) and turn OFF "Confirm email". Save.
3. Left menu → **Authentication → Users → Add user → Create new user**:
   - Email: `garden@ourlittleworld.app` (or your own made-up one; it must match `sharedEmail` in `js/config.js` AND the email inside `supabase/setup.sql`)
   - Password: `bloom-` + your digit code, e.g. `bloom-48291573` (the prefix is `passwordPrefix` in `config.js`)
   - Tick **Auto Confirm User**.
4. Left menu → **SQL Editor → New query**. Open `supabase/setup.sql` from your folder, (if you changed the email, replace it in the 4 places), paste everything, press **Run**. It creates the tables, locks them so only your login can read/write, and makes a private storage bucket.
5. Left menu → **Project Settings → API**. Copy **Project URL** and the **anon public** key into `js/config.js`:
   ```js
   supabaseUrl: "https://xxxx.supabase.co",
   supabaseAnonKey: "eyJ...",
   ```
   and set `codeLength` to your code's length (**8 digits is recommended**).
6. Refresh the site. Enter your code. If it opens, you're in the cloud. ☁️

To change the code later: Supabase → Authentication → Users → your user → reset the password to `bloom-NEWCODE` (and tell her the new code).

Free plan notes: 1 GB storage, 50 MB per file; a project **pauses after ~7 days of no use** (just click "Restore" in the dashboard). Photos are auto-shrunk (max ~2600px) to save space; very large videos may be refused, so trim them.

### Already ran the SQL before the Calendar existed?
Open Supabase → SQL Editor and run `supabase/add-calendar.sql` once (change the email in it to match yours). New projects don't need this, since `setup.sql` already includes it.

## Step 5: Put it online with GitHub

1. On github.com → **New repository** → name it (e.g. `our-garden`) → **Public** → Create (don't add a README).
2. In VS Code open the Terminal (**Terminal → New Terminal**) and run, one line at a time (replace YOURNAME):
   ```
   git init
   git add .
   git commit -m "Our garden"
   git branch -M main
   git remote add origin https://github.com/jasonmusyoki0-art/our-garden.git
   git push -u origin main
   ```
   (GitHub asks you to sign in the first time.)
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save.**
4. After ~1 minute your site is at `https://YOURNAME.github.io/our-garden/`. Send her the link + the code (in person or in a separate message), and on her phone choose **Share → Add to Home Screen** so it feels like an app. 📱

**Updating later:** edit files in VS Code, then in the terminal:
```
git add .
git commit -m "new letters"
git push
```
It's live in about a minute.

## Playing together from two places (and against the computer)

Once the cloud is connected (Step 4) you can each play on **your own phone, wherever you are**:

1. Both of you open the site and go to **Play**, then choose a board game (Chess, Ludo, Tic-Tac-Toe, Connect Four).
2. Pick **her name** (or his) on the "Who do you want to play against?" screen.
3. A small badge tells you if your partner is **online 🟢** or **offline ⚪**. It checks every few seconds. The Play menu also shows a "Join her" shortcut when she's already in a game.
4. Moves appear on the other phone within a few seconds. If she's offline, go ahead and move anyway: the game is saved and waits for her.

**Playing the computer** is on the same screen: choose **The computer** and a level (Easy, Medium, Hard). It's private to your phone and needs no internet.

**No internet at all?** On the lock screen tap **"No internet? Play the computer"**. This works after the site has been opened once with internet (it saves itself on your phone). Chat, photos and shared games need a connection; the computer games don't.

Notes: "online" means the app is open and visible on her phone. If her phone sleeps or she switches apps she'll show as offline after about 40 seconds. The status uses a tiny heartbeat saved in your private database; it adds no cost.

## Changing your mind later (everything is fixable)

- **Words, names, nicknames, anniversary, inside jokes:** the **Us** page. Edit and press Save any time.
- **A letter, answer, plan, photo or voice note you regret:** open it and tap Delete (you can delete your own).
- **Games, letters, questions, colors:** edit the files in the table in Step 3, save, refresh the browser. If you break something, press **Ctrl+Z** in VS Code, or use the **Timeline** panel (bottom-left of VS Code's Explorer) to see and restore earlier versions of a file.
- **Undo a whole change you already uploaded to GitHub:** in the terminal run `git log --oneline` (lists your saves), then `git revert HEAD` (undoes the latest one) and `git push`. Nothing is ever lost in Git, so you can always go back.
- **Change the secret code:** Supabase → Authentication → Users → your user → set the password to `bloom-NEWCODE`. In local mode, use "Change local code" on the Us page.
- **Safety copy:** on the **Us** page tap **Download a backup** for a file with all your letters, answers, plans and settings. For photos and videos use **Memories → Everything → Download all (.zip)**. Do this now and then, especially before big changes.
- **Edits not showing up?** Press Ctrl+Shift+R (Cmd+Shift+R on Mac) once. The site always fetches newer files when online, so this is rarely needed.

## Is it secure? (honest answer)

- Photos, videos, voice notes, answers and letters live in Supabase behind a login, with Row Level Security allowing **only your one account**. The storage bucket is private (files are served by short-lived links).
- The GitHub repo is **public** (free GitHub Pages requires it). It contains only the website code and *no secrets*. The Supabase "anon" key is designed to be public; it can do nothing without the login. Your code is never in the files.
- A **digit code is guessable if short**. Use 8 digits. The site slows guessing after 5 tries and Supabase rate-limits logins, but 4 digits is weak. Don't pick a birthday.
- Closing the tab logs out; it also auto-locks when idle.
- "Sealed until" letters hide the text in the app, but it is not unbreakable cryptography (fine for fun, don't put real secrets in them).
- Want the repo private too? Netlify or Cloudflare Pages host private repos for free; the same folder works there.

## Troubleshooting

- **"Can't reach the garden"**: no internet, or the Supabase project is paused (free projects pause after about a week unused: open supabase.com → your project → Restore). Your data is safe. You can still tap "Play the computer".
- **She shows as offline but she's here**: she needs the site open and on screen. Ask her to refresh once. Both phones need internet.

- **Code rejected in cloud mode**: the Supabase password must be exactly `passwordPrefix + code`, the email must match, and `codeLength` must equal your code's length.
- **"Couldn't save"**: SQL in step 4 not run, or the email in the SQL differs from `config.js`.
- **Page blank on GitHub**: Pages not enabled yet, or wait a minute and hard-refresh.
- **Mic not working**: allow microphone when the browser asks; needs https (GitHub link) or Live Server.
- **Local mode data**: lives in that one browser only; it's wiped if you clear site data.

Made with love. Go make her smile. 💗
