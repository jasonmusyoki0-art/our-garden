/* ============================================================
   💌 LETTER INGREDIENTS — edit freely!
   Every day the site mixes these pieces (using the date as a
   seed) into a brand-new letter. Add more lines = more variety.

   You can use these magic words inside any line:
     {nick}     one of her nicknames (set in the "Us" page)
     {her} {me} your names
     {days}     days you've been together
     {weekday}  Monday, Tuesday...      {season}  spring, summer...
     {flower} {meaning}  today's flower and what it means
     {joke}     one of your inside jokes (from the "Us" page)
   Lines using {days} or {joke} are skipped automatically
   if you haven't filled those in yet.
   ============================================================ */
window.LN = window.LN || {};
LN.content = LN.content || {};

LN.content.letters = {
  greetings: [
    "Happy {weekday}, {nick} 🌸",
    "Good day, my {nick} 💗",
    "To my favorite person, on this {weekday}",
    "Dearest {nick},",
    "Hello, beautiful {nick} 🌷",
    "My sweet {nick},",
    "Hi you. Yes, you. 💕",
    "{nick}, my heart,"
  ],

  openers: [
    "I woke up thinking about you, and honestly, that's the best way to start any {weekday}.",
    "There's a quiet kind of magic in knowing that somewhere today, you exist, and that I get to love you.",
    "I tried to write you something clever this morning, but all that came out was: I'm so grateful for you.",
    "Some days I look at my life and wonder what I did to be this lucky. Then I remember your name.",
    "It's {weekday}, and the world feels softer because you're in it.",
    "If I could bottle how I feel when you smile at me, I'd hand it to every sad day I've ever had.",
    "Day {days} of us, and my heart still does that little skip when your name lights up my phone.",
    "I just wanted to interrupt your day with a reminder: you are adored, wildly and completely.",
    "The {season} air smells like possibility, but nothing compares to the feeling of coming home to you.",
    "Loving you isn't something I do on special days. It's the steady music of my whole life, and today it's playing a little louder.",
    "Hi {nick}. Yes, it's me again, still head over heels.",
    "Every love story is beautiful, but ours is my favorite.",
    "I was thinking about how many ordinary moments we've turned into favorites, and I just had to tell you.",
    "Out of every person in the world, my heart found you. I'm still amazed.",
    "Nobody told me love could feel this calm and this exciting at the same time. Then there was you.",
    "A little note, because some feelings are too big to keep to myself: I adore you."
  ],

  loveLines: [
    "I love the way you laugh with your whole face, like joy is something you can't keep to yourself.",
    "I love how safe I feel next to you, like the world can be loud and I'd still hear only your heartbeat.",
    "I love your kindness, the quiet, effortless kind that makes people feel seen.",
    "I love how you make ordinary things (a walk, a snack, a long drive) feel like little adventures.",
    "I love the softness you carry, and the strength underneath it that you don't always give yourself credit for.",
    "I love the way you say my name.",
    "I love that with you, silence is comfortable and talking is endless.",
    "I love how deeply you care, even when you pretend you don't.",
    "I love your dreams, and I want to be the loudest one cheering for every single one.",
    "I love how you turn bad days into stories we laugh about later.",
    "I love the little faces you make when you think nobody is watching. (I'm always watching, and I'm always smitten.)",
    "I love how you've made a home out of moments instead of places.",
    "I love the way your hand fits in mine, like it was always meant to.",
    "I love your curiosity, and how you find wonder in tiny things.",
    "I love that you're beautiful in the dressed-up ways and even more in the sleepy, messy-hair ways.",
    "I love that you're my best friend, my favorite person, and my favorite place all at once.",
    "I love how you make me want to be softer, braver and better, without ever asking me to change.",
    "I love how you remember the little things I say, and how that tells me you really listen.",
    "I love your voice when you're sleepy. It's my favorite sound in the whole world.",
    "I love that you're patient with me on the days I'm not at my best."
  ],

  flowerLines: [
    "Today's flower is the {flower}, which stands for {meaning}. It felt like it was describing you, so I picked it.",
    "I asked the garden who should bloom today, and the {flower} stepped forward: {meaning}. Sounds like us.",
    "In the language of flowers, the {flower} means {meaning}. I don't need a dictionary to say the same about you.",
    "The {flower} blooms today for you, a symbol of {meaning}. Consider it a tiny bouquet from me.",
    "Flowers have always whispered what words can't. Today the {flower} whispers: {meaning}."
  ],

  wishes: [
    "Today I wish you gentle moments, kind messages, and at least three things that make you smile for no reason.",
    "I hope today treats you the way you treat everyone else: with warmth, patience and kindness.",
    "My promise for today is the same as always: I'm in your corner, no matter what the day throws at you.",
    "May you have your favorite drink, hear your favorite song, and feel how loved you are, all before lunch.",
    "If today gets heavy, lean on me. That's what I'm here for, and it's my favorite job.",
    "I hope you take a minute today to be as proud of yourself as I am of you.",
    "Whatever you're facing today, remember: you're braver than you think, and I'm right here.",
    "Today I'm sending you a hug, a kiss on the forehead, and a reminder to drink some water. In that order.",
    "Take a deep breath, roll your shoulders back, and know that someone thinks you hung the moon.",
    "Go easy on yourself today. You're doing beautifully, even on the days it doesn't feel like it."
  ],

  closings: [
    "Always and gently yours,",
    "Forever your biggest fan,",
    "Yours in every sunrise,",
    "With all my heart (and a little extra),",
    "Madly, deeply, quietly, loudly yours,",
    "Counting down to the next time I see you,",
    "Your forever person,",
    "Love, from the one who adores you,",
    "Yours, today and all my tomorrows,",
    "Hugging you through the screen,"
  ],

  ps: [
    "P.S. You owe me a kiss. I accept payment in installments.",
    "P.S. {days} days down, a whole lifetime to go.",
    "P.S. I counted: I've thought about you roughly a thousand times today already.",
    "P.S. Check your pocket for an invisible kiss. Got it? Good.",
    "P.S. If you're reading this and smiling, my plan worked.",
    "P.S. {joke}",
    "P.S. Tell me one thing that made you smile today? I'd love to know.",
    "P.S. Come find me for a hug later. Non-negotiable.",
    "P.S. {joke} (see, I haven't forgotten).",
    "P.S. Drink some water. This has been a message from your biggest admirer."
  ],

  /* Special days replace the usual opening. */
  special: {
    anniversary: "Today is our anniversary, {nick}. {days} days of choosing each other, and I'd choose you again in every lifetime.",
    monthly: "Happy monthiversary, my love! Another month of us, and somehow I fall a little harder every time.",
    hundred: "{days} days. A hundred-day milestone, and every single one of them was better because of you.",
    birthday: "HAPPY BIRTHDAY, {nick}! 🎂 The world got luckier the day you were born, and so did I."
  },

  /* "Open when..." envelopes (Letters page). Rewrite them in your own voice! */
  openWhen: [
    { emoji: "🥺", title: "Open when you miss me", body: "I miss you too. More than I can say, honestly. Close your eyes and picture my arms around you, because that's exactly where I wish I were right now. Distance is just a pause between hugs. Go play our song, text me, or leave me a voice note. I'll answer faster than you think." },
    { emoji: "🌧️", title: "Open when you're sad", body: "I'm sorry today feels heavy. You don't have to be strong right now, or explain it, or fix anything. You're allowed to just feel it. Wrap yourself in something soft, take a slow breath, and know that I'm so proud of you for getting through every hard day you've ever had. I'm here. Always." },
    { emoji: "🌙", title: "Open when you can't sleep", body: "Come here. Let's pretend I'm next to you. Breathe in for four, hold for four, out for four. Think of the last time we laughed until it hurt. Think of the next time I'll hold your hand. You're safe, you're loved, and tomorrow is a new day to be adored. Sweet dreams, my love." },
    { emoji: "🪞", title: "Open when you doubt yourself", body: "Listen to me, because I see you clearly. You're brilliant, you're kind, you're stronger than you realize, and you are enough exactly as you are. The person who looks at you with so much love in his eyes? He doesn't lie. Believe me today, until you can believe yourself." },
    { emoji: "☕", title: "Open when you're stressed", body: "Pause. Unclench your jaw. Drop your shoulders. You can only do one thing at a time, and you're already doing so much. Make tea, step outside, breathe. Whatever's on your list will still be there, and so will I, cheering for you the whole way." },
    { emoji: "😂", title: "Open when you need a laugh", body: "Remember the time we laughed so hard we couldn't breathe, and neither of us even remembered why it was funny? Think of that. Now think of me, trying (and failing) to be serious about how much I adore you. You're my favorite person to be ridiculous with." },
    { emoji: "😤", title: "Open when you're mad at me", body: "Okay, I probably deserve this. I'm sorry. Whatever I did (or didn't do), it's never because I love you any less. Take your time, then come find me, and let's talk it out and be on the same team again. I'd rather be in an argument with you than in agreement with anyone else." },
    { emoji: "💞", title: "Open when you want to feel loved", body: "Here's your reminder, in writing, so you can come back to it: you are loved. Not in a someday way, in a right-now, this-very-second, all-day-every-day way. Loved when you're glowing and loved when you're tired. Loved on purpose, completely, and for a very long time." }
  ]
};
