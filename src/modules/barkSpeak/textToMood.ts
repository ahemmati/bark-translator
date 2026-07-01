import { DEFAULT_CATEGORIES, type MoodCategory } from "../../types";

// Keyword rules for mapping what a human says in English to the mood/energy
// the dog is likely to respond with. Pure lookup table -- no ML, no AI.
const MOOD_KEYWORDS: { mood: MoodCategory; keywords: string[] }[] = [
  {
    mood: "hungry",
    keywords: [
      "food", "eat", "dinner", "lunch", "breakfast", "treat", "treats",
      "hungry", "kibble", "snack", "meal", "bowl", "cookie", "bone",
      "are you hungry", "want food", "feeding time",
    ],
  },
  {
    mood: "wantsToPlay",
    keywords: [
      "play", "ball", "fetch", "walk", "run", "outside", "park",
      "toy", "frisbee", "stick", "chase", "game", "fun", "let's go",
      "wanna play", "want to play", "go for a walk", "walkies", "walk time",
      "exercise", "romp",
    ],
  },
  {
    mood: "alertWarning",
    keywords: [
      "danger", "watch out", "alert", "careful", "look", "listen",
      "stay", "stop", "wait", "no", "off", "down", "sit", "heel",
      "what's that", "what was that", "someone's here", "doorbell", "stranger",
    ],
  },
  {
    mood: "anxious",
    keywords: [
      "scared", "afraid", "nervous", "thunder", "fireworks", "vet",
      "bath", "car ride", "scary", "worried", "stress", "calm down",
      "it's okay", "you're safe", "don't worry", "relax", "easy",
    ],
  },
  {
    mood: "wantsAttention",
    keywords: [
      "love you", "i love you", "good boy", "good girl", "good dog",
      "pet", "cuddle", "belly rub", "scratch", "brush", "hug",
      "come here", "come", "here boy", "here girl", "over here",
      "attention", "who's a good", "best dog",
    ],
  },
  {
    mood: "inPain",
    keywords: [
      "hurt", "pain", "ouch", "ow", "careful", "gently", "easy",
      "are you okay", "are you hurt", "what's wrong", "sick", "feel okay",
      "vet", "medicine", "shot", "examination",
    ],
  },
  {
    mood: "greeting",
    keywords: [
      "hello", "hi", "hey", "good morning", "good evening", "i'm home",
      "i'm back", "welcome", "woo", "yay", "miss you", "happy to see",
      "who's a good", "oh hi", "there you are", "hey you",
    ],
  },
  {
    mood: "lonely",
    keywords: [
      "i'm leaving", "going out", "be back", "stay here", "bye", "goodbye",
      "see you later", "alone", "miss me", "don't be sad", "i'll be back",
      "home soon", "leaving soon", "going to work",
    ],
  },
];

export interface MoodDetectionResult {
  mood: MoodCategory;
  label: string;
  confidence: "clear" | "inferred";
  matchedKeywords: string[];
}

/** Map English text to a dog mood via keyword matching. Never calls any AI/ML — pure lookup. */
export function detectMoodFromText(text: string): MoodDetectionResult {
  const lower = text.toLowerCase();

  const scores: { mood: MoodCategory; hits: string[] }[] = MOOD_KEYWORDS.map(({ mood, keywords }) => ({
    mood,
    hits: keywords.filter((k) => lower.includes(k)),
  }));

  scores.sort((a, b) => b.hits.length - a.hits.length);
  const top = scores[0];

  if (top.hits.length > 0) {
    return {
      mood: top.mood,
      label: DEFAULT_CATEGORIES.find((c) => c.id === top.mood)!.label,
      confidence: "clear",
      matchedKeywords: top.hits,
    };
  }

  // No keywords matched — default to greeting (friendly fallback).
  return {
    mood: "greeting",
    label: DEFAULT_CATEGORIES.find((c) => c.id === "greeting")!.label,
    confidence: "inferred",
    matchedKeywords: [],
  };
}
