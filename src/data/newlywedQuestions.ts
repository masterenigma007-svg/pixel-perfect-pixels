export interface NewlywedQuestion {
  question: string;
  perspective: "his" | "hers";
  options: string[];
  comedyAnswers: Record<string, string>; // option -> funny reveal
}

export const newlywedQuestions: NewlywedQuestion[] = [
  {
    question: "What does your partner actually mean when they say 'I'm fine'?",
    perspective: "hers",
    options: [
      "They're genuinely fine",
      "They're testing if you'll ask again",
      "They've been upset for 3 days",
      "They forgot what they were mad about",
    ],
    comedyAnswers: {
      "They're genuinely fine": "Oh honey... nobody in the history of relationships has ever been 'genuinely fine.'",
      "They're testing if you'll ask again": "Correct! And you just failed the test by picking this confidently.",
      "They've been upset for 3 days": "Close! It's actually been 5 days, but who's counting? (They are.)",
      "They forgot what they were mad about": "They never forget. They have a spreadsheet.",
    },
  },
  {
    question: "When he says 'I'll do it later,' when does 'later' actually mean?",
    perspective: "his",
    options: [
      "Within the hour",
      "Sometime this week",
      "When reminded for the 5th time",
      "Never, but he'll insist he was 'about to'",
    ],
    comedyAnswers: {
      "Within the hour": "That's adorable. You must be newlyweds.",
      "Sometime this week": "Optimistic! We love that energy.",
      "When reminded for the 5th time": "Getting warmer! The magic number is actually 7.",
      "Never, but he'll insist he was 'about to'": "🎯 And he'll say it with complete sincerity every single time.",
    },
  },
  {
    question: "What is she really saying when she asks 'Does this look okay?'",
    perspective: "hers",
    options: [
      "She wants your honest opinion",
      "She wants enthusiastic praise",
      "She's already decided and is testing you",
      "She wants you to look up from your phone",
    ],
    comedyAnswers: {
      "She wants your honest opinion": "WRONG. This is the trap. Never give honest fashion opinions. NEVER.",
      "She wants enthusiastic praise": "Yes! Minimum three compliments. 'Fine' is a war crime.",
      "She's already decided and is testing you": "Partially correct! She's decided AND testing you simultaneously.",
      "She wants you to look up from your phone": "Also correct! The real question was 'Do you still see me?'",
    },
  },
  {
    question: "He says he's 'on his way.' Where is he actually?",
    perspective: "his",
    options: [
      "Actually in the car driving",
      "Still on the couch looking for his keys",
      "Just got out of the shower",
      "Hasn't even started getting ready",
    ],
    comedyAnswers: {
      "Actually in the car driving": "You sweet summer child.",
      "Still on the couch looking for his keys": "Getting closer! The keys are in his pocket. He checked everywhere else first.",
      "Just got out of the shower": "Possible! Add 25 minutes to his ETA.",
      "Hasn't even started getting ready": "🎯 'On my way' is aspirational, not geographical.",
    },
  },
  {
    question: "She says 'I don't care where we eat.' What does she want?",
    perspective: "hers",
    options: [
      "She genuinely doesn't care",
      "She wants you to suggest her favorite place",
      "She wants you to guess correctly on the first try",
      "She's already decided but wants you to say it first",
    ],
    comedyAnswers: {
      "She genuinely doesn't care": "This answer has never been true in the history of dining.",
      "She wants you to suggest her favorite place": "Close! But you'd better know which favorite — she has seven.",
      "She wants you to guess correctly on the first try": "Yes! And each wrong guess costs you one level of patience.",
      "She's already decided but wants you to say it first": "🎯 It's a mind-reading exam and the stakes are dinner.",
    },
  },
  {
    question: "What does 'We need to talk' actually mean?",
    perspective: "hers",
    options: [
      "A casual conversation",
      "A rehearsed prosecution with evidence",
      "She's been thinking about this for weeks",
      "You're about to learn what you did on March 14th",
    ],
    comedyAnswers: {
      "A casual conversation": "Nobody in history has ever casually said 'we need to talk.'",
      "A rehearsed prosecution with evidence": "🎯 She has opening statements, exhibits A through F, and a closing argument.",
      "She's been thinking about this for weeks": "Minimum two weeks. Maximum: since the incident of 2019.",
      "You're about to learn what you did on March 14th": "She has the receipts. Literally. She saved the actual receipts.",
    },
  },
  {
    question: "He says the thermostat is 'fine.' What temperature battle is happening?",
    perspective: "his",
    options: [
      "It's actually a comfortable temperature",
      "He's defending 68°F like it's a constitutional right",
      "He'd rather wear three blankets than move that dial",
      "He has secretly changed it back 4 times today",
    ],
    comedyAnswers: {
      "It's actually a comfortable temperature": "For him, maybe. She's wearing a parka indoors.",
      "He's defending 68°F like it's a constitutional right": "🎯 This thermostat setting is his Alamo.",
      "He'd rather wear three blankets than move that dial": "Correct! Blankets are free. Heat costs money. This is the hill.",
      "He has secretly changed it back 4 times today": "Both partners have been adjusting it all day in a cold war.",
    },
  },
  {
    question: "She says 'I'm not being passive aggressive.' What's really happening?",
    perspective: "hers",
    options: [
      "She's being direct and honest",
      "She loaded the dishwasher VERY loudly",
      "She's using a tone that could cut glass",
      "She's fine. Everything is fine. THIS IS FINE.",
    ],
    comedyAnswers: {
      "She's being direct and honest": "If she has to say she's not being passive aggressive, she's being passive aggressive.",
      "She loaded the dishwasher VERY loudly": "🎯 Every plate placement was a statement. Every fork, a verdict.",
      "She's using a tone that could cut glass": "The tone is doing more work than the words. Trust the tone.",
      "She's fine. Everything is fine. THIS IS FINE.": "Nothing is fine. The word 'fine' has been weaponized.",
    },
  },
  {
    question: "He says 'I can fix that.' What's about to happen?",
    perspective: "his",
    options: [
      "He'll fix it perfectly",
      "He'll spend $200 on tools for a $50 repair",
      "He'll make it worse then call a professional",
      "He'll watch 3 hours of YouTube and still not start",
    ],
    comedyAnswers: {
      "He'll fix it perfectly": "This is the rarest outcome. Like seeing a unicorn. A competent unicorn.",
      "He'll spend $200 on tools for a $50 repair": "🎯 But he NEEDED that oscillating multi-tool. For... things.",
      "He'll make it worse then call a professional": "And he'll tell the professional 'I already tried a few things.'",
      "He'll watch 3 hours of YouTube and still not start": "He's 'researching.' This is an important phase. Do not disturb.",
    },
  },
  {
    question: "She says 'I told my friends about this.' What just happened?",
    perspective: "hers",
    options: [
      "She casually mentioned it",
      "A group chat of 12 women has analyzed your every word",
      "Her friends now have opinions about your future",
      "You've been tried in the court of group brunch",
    ],
    comedyAnswers: {
      "She casually mentioned it": "There is no casual. The group chat has screenshots.",
      "A group chat of 12 women has analyzed your every word": "🎯 They did a full forensic analysis with emoji reactions.",
      "Her friends now have opinions about your future": "They had opinions before. Now they have INFORMED opinions.",
      "You've been tried in the court of group brunch": "The mimosas were flowing. The verdict was unanimous.",
    },
  },
  {
    question: "He says 'Five more minutes.' How long will it actually be?",
    perspective: "his",
    options: [
      "Exactly five minutes",
      "15-20 minutes minimum",
      "He's entered a time vortex",
      "He'll emerge when the episode/game/level ends",
    ],
    comedyAnswers: {
      "Exactly five minutes": "This has literally never happened. Not once. In all of human history.",
      "15-20 minutes minimum": "This is the optimistic answer and we respect your faith.",
      "He's entered a time vortex": "Time works differently in the gaming/sports dimension.",
      "He'll emerge when the episode/game/level ends": "🎯 'Five minutes' is not a time measurement. It's an emotional state.",
    },
  },
  {
    question: "She says 'I had a dream about you.' What should you brace for?",
    perspective: "hers",
    options: [
      "A sweet, romantic dream",
      "Dream-you did something wrong and she's mad at real-you",
      "She's testing your reaction to a hypothetical scenario",
      "She dreamed you forgot the anniversary and now you're in trouble",
    ],
    comedyAnswers: {
      "A sweet, romantic dream": "Sometimes! But never trust this answer without follow-up questions.",
      "Dream-you did something wrong and she's mad at real-you": "🎯 You need to apologize for crimes committed by your subconscious avatar.",
      "She's testing your reaction to a hypothetical scenario": "The dream is the test. Your face right now is the answer.",
      "She dreamed you forgot the anniversary and now you're in trouble": "Set a calendar reminder. Dream-you is trying to warn you.",
    },
  },
];

export function getRandomQuestions(count: number): NewlywedQuestion[] {
  const shuffled = [...newlywedQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
