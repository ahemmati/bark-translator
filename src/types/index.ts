export type MoodCategory =
  | "hungry"
  | "wantsToPlay"
  | "alertWarning"
  | "anxious"
  | "wantsAttention"
  | "inPain"
  | "greeting"
  | "lonely";

export const DEFAULT_CATEGORIES: { id: MoodCategory; label: string; emoji: string }[] = [
  { id: "hungry", label: "Hungry", emoji: "🍖" },
  { id: "wantsToPlay", label: "Wants to Play", emoji: "🎾" },
  { id: "alertWarning", label: "Alert / Warning", emoji: "🚨" },
  { id: "anxious", label: "Anxious / Scared", emoji: "😰" },
  { id: "wantsAttention", label: "Wants Attention", emoji: "🤗" },
  { id: "inPain", label: "In Pain", emoji: "🤕" },
  { id: "greeting", label: "Greeting", emoji: "👋" },
  { id: "lonely", label: "Lonely", emoji: "🥺" },
];

export function categoryEmoji(id: MoodCategory | null | undefined): string {
  return DEFAULT_CATEGORIES.find((c) => c.id === id)?.emoji ?? "🐶";
}

export type PostureGroup = "Tail" | "Ears" | "Eyes" | "Mouth" | "Body" | "Movement";

export type PostureTag =
  // Tail
  | "tailWagging"
  | "tailHighStiff"
  | "tailLowSlowWag"
  | "tailTucked"
  // Ears
  | "earsUp"
  | "earsBack"
  // Eyes
  | "whaleEye"
  | "hardStare"
  | "avertingGaze"
  | "softEyes"
  // Mouth
  | "lipLicking"
  | "yawningStressed"
  | "relaxedOpenMouth"
  | "lipsTight"
  // Body
  | "playBow"
  | "crouched"
  | "standingTall"
  | "frozenStill"
  | "relaxedLoose"
  | "hacklesRaised"
  | "bellyExposed"
  | "leaningIn"
  | "wholeBodyWiggle"
  | "pawRaised"
  // Movement
  | "pacing"
  | "lyingDown";

export interface PostureTagInfo {
  id: PostureTag;
  label: string;
  emoji: string;
  group: PostureGroup;
  /** General canine body-language knowledge -- not a diagnosis, just a common-knowledge starting point. */
  generalMeaning: string;
  /** Soft hint only: nudges the category picker, never auto-selects it. */
  suggestedCategory?: MoodCategory;
}

// A small library of well-established general dog body-language signals
// (the kind of thing in any vet/trainer handout) used to seed sensible
// defaults and an in-app reference -- not learned from any dataset.
export const POSTURE_TAGS: PostureTagInfo[] = [
  {
    id: "tailWagging",
    label: "Tail wagging (loose, broad)",
    emoji: "🐾",
    group: "Tail",
    generalMeaning: "A loose, broad wag generally signals friendly arousal or excitement.",
    suggestedCategory: "greeting",
  },
  {
    id: "tailHighStiff",
    label: "Tail high & stiff",
    emoji: "⚠️",
    group: "Tail",
    generalMeaning: "A tail held high and rigid often signals alertness or tension, not friendliness.",
    suggestedCategory: "alertWarning",
  },
  {
    id: "tailLowSlowWag",
    label: "Tail low, slow wag",
    emoji: "🤔",
    group: "Tail",
    generalMeaning: "A slow wag held low can mean a dog is unsure or cautiously assessing something.",
    suggestedCategory: "anxious",
  },
  {
    id: "tailTucked",
    label: "Tail tucked between legs",
    emoji: "😟",
    group: "Tail",
    generalMeaning: "One of the clearest fear signals in dogs.",
    suggestedCategory: "anxious",
  },
  {
    id: "earsUp",
    label: "Ears up & forward",
    emoji: "👂",
    group: "Ears",
    generalMeaning: "Forward, perked ears signal alertness and interest in something.",
    suggestedCategory: "alertWarning",
  },
  {
    id: "earsBack",
    label: "Ears pinned back",
    emoji: "🙉",
    group: "Ears",
    generalMeaning: "Flattened ears often signal fear or appeasement.",
    suggestedCategory: "anxious",
  },
  {
    id: "whaleEye",
    label: "Whites of eyes showing",
    emoji: "👀",
    group: "Eyes",
    generalMeaning: "Showing the whites of the eyes (\"whale eye\") is a classic stress/discomfort signal.",
    suggestedCategory: "anxious",
  },
  {
    id: "hardStare",
    label: "Hard, direct stare",
    emoji: "😠",
    group: "Eyes",
    generalMeaning: "A fixed, hard stare can be a warning or guarding signal.",
    suggestedCategory: "alertWarning",
  },
  {
    id: "avertingGaze",
    label: "Avoiding eye contact",
    emoji: "🙈",
    group: "Eyes",
    generalMeaning: "Turning the head away or avoiding eye contact is often an appeasement gesture.",
    suggestedCategory: "anxious",
  },
  {
    id: "softEyes",
    label: "Soft eyes / slow blink",
    emoji: "😌",
    group: "Eyes",
    generalMeaning: "Soft, relaxed eyes and slow blinking generally signal calm and trust.",
    suggestedCategory: "greeting",
  },
  {
    id: "lipLicking",
    label: "Licking lips/nose (no food around)",
    emoji: "👅",
    group: "Mouth",
    generalMeaning: "A quick lip lick with no food nearby is a subtle, common stress signal.",
    suggestedCategory: "anxious",
  },
  {
    id: "yawningStressed",
    label: "Yawning, but not tired",
    emoji: "🥱",
    group: "Mouth",
    generalMeaning: "Yawning outside of tiredness is a well-known canine calming/stress signal.",
    suggestedCategory: "anxious",
  },
  {
    id: "relaxedOpenMouth",
    label: "Relaxed open mouth (\"smiling\")",
    emoji: "😄",
    group: "Mouth",
    generalMeaning: "A loose, open mouth with no tension generally signals a relaxed, content dog.",
    suggestedCategory: "greeting",
  },
  {
    id: "lipsTight",
    label: "Lips tightly closed/pulled forward",
    emoji: "😬",
    group: "Mouth",
    generalMeaning: "Tightly pursed or forward-pulled lips can signal tension or a warning.",
    suggestedCategory: "alertWarning",
  },
  {
    id: "playBow",
    label: "Play bow (front down, rear up)",
    emoji: "🙇",
    group: "Body",
    generalMeaning: "Front legs down, rear up -- the universal canine invitation to play.",
    suggestedCategory: "wantsToPlay",
  },
  {
    id: "crouched",
    label: "Crouched low",
    emoji: "🐕",
    group: "Body",
    generalMeaning: "A low, crouched posture often signals fear or submission.",
    suggestedCategory: "anxious",
  },
  {
    id: "standingTall",
    label: "Standing tall, weight forward",
    emoji: "🧍",
    group: "Body",
    generalMeaning: "Weight shifted forward onto a tall stance can signal confidence or assertiveness.",
    suggestedCategory: "alertWarning",
  },
  {
    id: "frozenStill",
    label: "Frozen, stiff and still",
    emoji: "🧊",
    group: "Body",
    generalMeaning: "Sudden stillness is a high-alert signal, often right before a bigger reaction.",
    suggestedCategory: "alertWarning",
  },
  {
    id: "relaxedLoose",
    label: "Loose, relaxed body",
    emoji: "😎",
    group: "Body",
    generalMeaning: "A loose, wiggly body with no tension generally signals a calm, content dog.",
    suggestedCategory: "greeting",
  },
  {
    id: "hacklesRaised",
    label: "Hackles raised (fur up on back)",
    emoji: "🔺",
    group: "Body",
    generalMeaning: "Raised fur along the spine signals strong arousal -- can be fear, excitement, or threat.",
    suggestedCategory: "alertWarning",
  },
  {
    id: "bellyExposed",
    label: "Rolling over, belly exposed",
    emoji: "🙃",
    group: "Body",
    generalMeaning: "Can be submission/appeasement, or simply a relaxed dog asking for a belly rub.",
    suggestedCategory: "wantsAttention",
  },
  {
    id: "leaningIn",
    label: "Leaning body weight into you",
    emoji: "🤗",
    group: "Body",
    generalMeaning: "Many dogs lean into people they trust as a way of seeking closeness or comfort.",
    suggestedCategory: "wantsAttention",
  },
  {
    id: "wholeBodyWiggle",
    label: "Whole body wiggling",
    emoji: "🥰",
    group: "Body",
    generalMeaning: "Wiggling through the whole body, not just the tail, is a classic joyful greeting.",
    suggestedCategory: "greeting",
  },
  {
    id: "pawRaised",
    label: "One paw raised/lifted",
    emoji: "🐾",
    group: "Body",
    generalMeaning: "A lifted paw often signals uncertainty or heightened attention on something.",
    suggestedCategory: "alertWarning",
  },
  {
    id: "pacing",
    label: "Pacing back and forth",
    emoji: "🚶",
    group: "Movement",
    generalMeaning: "Repeated pacing often signals restlessness, anxiety, or overstimulation.",
    suggestedCategory: "anxious",
  },
  {
    id: "lyingDown",
    label: "Lying down, settled",
    emoji: "🛌",
    group: "Movement",
    generalMeaning: "Usually just a relaxed, settled dog -- though sudden lethargy can also indicate discomfort.",
    suggestedCategory: "lonely",
  },
];

export const POSTURE_GROUPS: PostureGroup[] = ["Tail", "Ears", "Eyes", "Mouth", "Body", "Movement"];

/** Soft suggestion only -- majority vote across selected tags' general-knowledge hints. */
export function suggestCategoryFromTags(tags: PostureTag[]): MoodCategory | null {
  if (tags.length === 0) return null;
  const counts = new Map<MoodCategory, number>();
  for (const tagId of tags) {
    const suggestion = POSTURE_TAGS.find((t) => t.id === tagId)?.suggestedCategory;
    if (suggestion) counts.set(suggestion, (counts.get(suggestion) ?? 0) + 1);
  }
  let best: MoodCategory | null = null;
  let bestCount = 0;
  for (const [category, count] of counts) {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }
  return best;
}

export interface AudioFeatures {
  durationSec: number;
  meanPitchHz: number;
  pitchVarianceHz: number;
  rmsEnergy: number;
  zeroCrossingRate: number;
  spectralCentroid: number;
  barkCount: number;
  attackSec: number;
}

export interface Dog {
  id: string;
  name: string;
  photoThumb?: Blob;
  createdAt: number;
}

export type SampleSource = "training" | "correction";

export interface AudioPayload {
  audioBlob: Blob;
  features: AudioFeatures;
}

export interface ImagePayload {
  imageBlob: Blob;
}

interface SampleBase {
  id: string;
  dogId: string;
  postureTags: PostureTag[];
  category: MoodCategory;
  sentence?: string;
  source: SampleSource;
  createdAt: number;
}

// A sample must carry at least one modality. Modeled as a discriminated
// union (rather than two independently-optional fields) so "has audio" /
// "has image" is a compiler-checked narrowing everywhere a Sample is read,
// not a convention every call site has to re-derive.
export type Sample = SampleBase &
  (
    | { modality: "audio"; audio: AudioPayload; image?: undefined }
    | { modality: "image"; image: ImagePayload; audio?: undefined }
    | { modality: "both"; audio: AudioPayload; image: ImagePayload }
  );

export function hasAudio(sample: Sample): sample is Sample & { audio: AudioPayload } {
  return sample.modality === "audio" || sample.modality === "both";
}

export function hasImage(sample: Sample): sample is Sample & { image: ImagePayload } {
  return sample.modality === "image" || sample.modality === "both";
}

export interface StoredModel {
  dogId: string;
  topology: unknown;
  weightSpecs: unknown;
  weightDataBase64: string;
  trainedAt: number;
  sampleCountAtTrain: number;
  categories: MoodCategory[];
}

export interface StoredImageModel {
  dogId: string;
  topology: unknown;
  weightSpecs: unknown;
  weightDataBase64: string;
  trainedAt: number;
  sampleCountAtTrain: number;
  categories: MoodCategory[];
}

export interface PhraseTemplateSlotPools {
  openers: string[];
  verbPhrases: string[];
  contextClauses: string[];
}

export interface PhrasePool {
  dogId: string;
  category: MoodCategory;
  custom: PhraseTemplateSlotPools;
  recentPicks: string[];
}

export type ConfidenceBucket = "notSure" | "fairlyConfident" | "veryConfident";

export type ModalityUsed = "audio" | "image" | "both";

export interface TranslationRecord {
  id: string;
  dogId: string;
  sampleId: string;
  predictedCategory: MoodCategory | null;
  confidence: ConfidenceBucket | "insufficientData";
  modalityUsed: ModalityUsed;
  sentence: string;
  correctedCategory?: MoodCategory;
  correctedSentence?: string;
  createdAt: number;
}
