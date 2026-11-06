/* ============================================================
   🌠 DEEP TALK — positive, romantic questions that grow your bond and your future.
   Each category has hand-written questions + "templates" with {slots}.
   Templates mix with the slot lists below, so the 🔄 button keeps making new ones.
   Add your own lines anywhere!
   ============================================================ */
window.LN = window.LN || {};
LN.content = LN.content || {};

LN.content.deepTalk = {
  slots: {
    span: ["3 months", "6 months", "12 months", "2 years", "5 years", "10 years"],
    together: ["learn something brand new", "take a trip somewhere we've never been", "start a tradition just for us", "build a daily habit", "host a little celebration", "try a creative hobby", "save up for something special", "do something kind for others", "cook an ambitious meal", "make our space feel more like us", "get healthier side by side", "read the same book"],
    quality: ["patience", "adventure", "kindness", "trust", "playfulness", "calm", "courage", "gratitude", "laughter", "romance", "teamwork", "tenderness"],
    moment: ["morning", "evening", "weekend", "trip", "celebration", "rainy day", "quiet night", "anniversary", "lazy Sunday"],
    strength: ["listening", "teamwork", "sense of humor", "forgiveness", "affection", "honesty", "support for each other", "communication", "curiosity about each other"],
    area: ["career", "health", "friendships", "creativity", "home", "family", "adventures", "finances", "learning", "personal growth", "rest and self-care"]
  },
  cats: [
    { id: "future", emoji: "🌠", name: "Dreams & Future",
      curated: [
        "What's a dream you want us to chase together, and what's the very first small step?",
        "Picture us ten years from now on an ordinary happy day. What does it look like?",
        "What's something you want to have built or created by the time we're 40?",
        "If nothing could go wrong, what would you try with me?",
        "Which of your dreams do you most want me to cheer for?",
        "What would our dream year look like, month by month?",
        "What adventure should be our next big one?",
        "What do you hope people say about us as a couple?"
      ],
      templates: ["What's one thing you'd love for us to {together} in the next {span}?", "If we could {together} in the next {span}, how would you want it to go?", "Where would you love for us to be in {span}, and what's one thing we can do now to head that way?"] },
    { id: "romance", emoji: "💞", name: "Romance & Closeness",
      curated: [
        "What's a small romantic gesture that makes your heart melt?",
        "When do you feel closest to me?",
        "What's your favorite way to be shown love?",
        "What's the most romantic thing you can imagine us doing on an ordinary day?",
        "What's one thing I do that makes you feel really chosen?",
        "What would make a perfect love-note surprise for you?",
        "What song would you slow-dance with me to?",
        "What's a moment between us that you'd frame if you could?"
      ],
      templates: ["Describe our perfect {moment} together, in detail.", "What would make our next {moment} feel extra romantic for you?", "How can we bring more {quality} into our love this month?"] },
    { id: "grow", emoji: "🌱", name: "Growing Together",
      curated: [
        "What's one thing we've gotten better at as a couple?",
        "What's something you'd love us to try, to become even closer?",
        "How can I make you feel more supported when things get hard?",
        "What did you learn about love from our relationship?",
        "What's one habit we could build together that would make our life better?",
        "What do you need more of from me, and what can I give more of?",
        "What conversation do you wish we had more often?",
        "What makes you feel safest to be fully yourself with me?"
      ],
      templates: ["How would you rate our {strength} lately, and what would make it even better?", "What's one way you've seen our {strength} grow, and how can we nurture it?", "How can I best support you with your {area} goals this year?"] },
    { id: "grat", emoji: "🙏", name: "Gratitude",
      curated: [
        "What's something I did recently that you're really grateful for?",
        "What's a quality of mine you hope I never lose?",
        "What's one thing you're thankful for about us that you don't say often enough?",
        "What's the kindest thing anyone's done for you, and how did it shape you?",
        "Which of our memories are you most grateful for?",
        "What's something small about our daily life that you cherish?",
        "Who helped bring us together, and what would you say to them?",
        "What are three things that made today better?"
      ],
      templates: ["What's a moment from the last {span} that you're proud of us for?", "What does {quality} mean to you, and where have you seen it in me?", "Thank me for something specific, then I'll thank you for something too."] },
    { id: "play", emoji: "🎲", name: "Playful What-ifs",
      curated: [
        "If we had a free week and unlimited budget, where would we go and what would we do?",
        "If we started a business together, what would it be?",
        "If we wrote a book about us, what would the title be?",
        "If we could live anywhere for a year, where would we pick?",
        "If we could have a superpower as a couple, what would it be?",
        "If our love were a flavor, a season and a song, what would they be?",
        "If we could time-travel to any day of our relationship, which one?",
        "What would our dream pet be, and what would we name it?"
      ],
      templates: ["If we spent a whole {moment} doing only things that make us laugh, what would we do?", "What's the most fun way for us to {together}?", "If we made a bucket list for the next {span}, what are your top three?"] },
    { id: "values", emoji: "🧭", name: "Values & Life",
      curated: [
        "What matters most to you in life, and how can I help you live it?",
        "What does a good life look like to you?",
        "What's a value you hope we always share?",
        "What does feeling at home mean to you?",
        "How do you like to celebrate wins, big and small?",
        "What does a successful, happy relationship look like to you?",
        "What do you want to be remembered for?",
        "What's a lesson from your family that you'd like to carry into ours?"
      ],
      templates: ["How do you want us to practice {quality} in everyday life?", "What would a life full of {quality} look like for us?", "How can we make time for your {area} while still protecting our time together?"] },
    { id: "home", emoji: "🏡", name: "Our Home & Plans",
      curated: [
        "What would our dream home feel like when you walk in?",
        "What's a weekly ritual you'd love us to have?",
        "How would you like us to spend holidays together?",
        "What small thing at home would make daily life feel like a hug?",
        "What's a skill you'd love for us to learn together?",
        "What would our perfect morning routine look like?",
        "What's a tradition from your childhood you'd love to share with me?",
        "If we could host one dream dinner party, who would be there?"
      ],
      templates: ["How could we make our {moment} routine even more special?", "What's one thing we could do in the next {span} to make our space more 'us'?", "What do you want our {moment}s to feel like in {span}?"] }
  ]
};
