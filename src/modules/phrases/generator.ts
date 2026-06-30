import type { ConfidenceBucket, MoodCategory, PhrasePool, PostureTag } from "../../types";
import { CONTEXT_CLAUSES, DEFAULT_VERB_PHRASES, OPENERS_BY_CONFIDENCE } from "./pools";

const RECENT_HISTORY_SIZE = 5;
const CUSTOM_PHRASE_USE_CHANCE = 0.4;
const CUSTOM_CONTEXT_USE_CHANCE = 0.3;

function pickAvoidingRecent(options: string[], recent: string[]): string {
  const filtered = options.filter((o) => !recent.includes(o));
  const pool = filtered.length > 0 ? filtered : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

function updateRecent(recent: string[], pick: string): string[] {
  return [pick, ...recent.filter((r) => r !== pick)].slice(0, RECENT_HISTORY_SIZE);
}

function pickContextClause(postureTags: PostureTag[], pool?: PhrasePool): string {
  if (postureTags.length > 0) {
    const tag = postureTags[Math.floor(Math.random() * postureTags.length)];
    return CONTEXT_CLAUSES[tag] ?? "";
  }
  const customClauses = pool?.custom.contextClauses ?? [];
  if (customClauses.length > 0 && Math.random() < CUSTOM_CONTEXT_USE_CHANCE) {
    return customClauses[Math.floor(Math.random() * customClauses.length)];
  }
  return "";
}

function composeSentence(opener: string, dogName: string, verbPhrase: string, contextClause: string): string {
  const text = `${opener}, ${dogName} seems to be saying: "${verbPhrase}${contextClause}"`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface GeneratedSentence {
  sentence: string;
  recentPicks: string[];
}

export function generateSentence(params: {
  dogName: string;
  category: MoodCategory;
  confidence: ConfidenceBucket;
  postureTags: PostureTag[];
  pool?: PhrasePool;
}): GeneratedSentence {
  const { dogName, category, confidence, postureTags, pool } = params;
  const recent = pool?.recentPicks ?? [];

  const opener = OPENERS_BY_CONFIDENCE[confidence][
    Math.floor(Math.random() * OPENERS_BY_CONFIDENCE[confidence].length)
  ];

  const customPhrases = pool?.custom.verbPhrases ?? [];
  if (customPhrases.length > 0 && Math.random() < CUSTOM_PHRASE_USE_CHANCE) {
    const chosen = pickAvoidingRecent(customPhrases, recent);
    return {
      sentence: composeSentence(opener, dogName, chosen, ""),
      recentPicks: updateRecent(recent, chosen),
    };
  }
  const verbPhrase = pickAvoidingRecent(DEFAULT_VERB_PHRASES[category], recent);
  const contextClause = pickContextClause(postureTags, pool);

  return {
    sentence: composeSentence(opener, dogName, verbPhrase, contextClause),
    recentPicks: updateRecent(recent, verbPhrase),
  };
}

export function withCorrectionPhrase(
  pool: PhrasePool | undefined,
  dogId: string,
  category: MoodCategory,
  sentence: string,
): PhrasePool {
  const base: PhrasePool = pool ?? {
    dogId,
    category,
    custom: { openers: [], verbPhrases: [], contextClauses: [] },
    recentPicks: [],
  };
  if (base.custom.verbPhrases.includes(sentence)) return base;
  return {
    ...base,
    custom: { ...base.custom, verbPhrases: [...base.custom.verbPhrases, sentence] },
  };
}
