import type { ConfidenceBucket, MoodCategory, PostureTag } from "../../types";

export const OPENERS_BY_CONFIDENCE: Record<ConfidenceBucket, string[]> = {
  notSure: ["Maybe", "I think", "Possibly", "Not totally sure, but maybe"],
  fairlyConfident: ["Pretty sure", "I'd guess", "Sounds like", "My best read is"],
  veryConfident: ["Definitely", "No doubt about it", "Clearly", "100%"],
};

export const DEFAULT_VERB_PHRASES: Record<MoodCategory, string[]> = {
  hungry: ["I'm hungry", "I want food, now", "feed me already", "my bowl is empty"],
  wantsToPlay: ["I want to play", "let's play, c'mon!", "throw the ball already", "I've got so much energy right now"],
  alertWarning: ["something's out there", "I hear something you don't", "we need to stay alert", "someone's at the door"],
  anxious: ["I'm scared", "I'm anxious about something", "I don't like this", "something's making me nervous"],
  wantsAttention: ["pay attention to me", "look at me, look at me", "I want pets right now", "notice me, please"],
  inPain: ["something hurts", "I'm in pain", "I don't feel good", "something's wrong with me"],
  greeting: ["hello!", "you're home!", "hi there!", "I'm so happy to see you"],
  lonely: ["I'm lonely", "I miss you", "I don't want to be alone", "come keep me company"],
};

export const CONTEXT_CLAUSES: Record<PostureTag, string> = {
  tailWagging: ", tail wagging like crazy",
  tailHighStiff: ", tail held up high and stiff",
  tailLowSlowWag: ", tail low and wagging slowly",
  tailTucked: ", tail tucked between my legs",
  earsUp: ", ears up and alert",
  earsBack: ", ears pinned back",
  whaleEye: ", showing you the whites of my eyes",
  hardStare: ", giving you a hard stare",
  avertingGaze: ", looking away from you",
  softEyes: ", with the softest eyes",
  lipLicking: ", licking my lips about it",
  yawningStressed: ", yawning, but I'm not even tired",
  relaxedOpenMouth: ", mouth open and relaxed",
  lipsTight: ", lips pulled tight",
  playBow: ", doing my best play bow",
  crouched: ", crouched down low",
  standingTall: ", standing tall about it",
  frozenStill: ", frozen completely still",
  relaxedLoose: ", body totally loose and relaxed",
  hacklesRaised: ", hackles raised",
  bellyExposed: ", belly up and exposed",
  leaningIn: ", leaning my whole weight into you",
  wholeBodyWiggle: ", wiggling with my whole body",
  pawRaised: ", one paw raised in the air",
  pacing: ", pacing back and forth",
  lyingDown: ", from right here on the floor",
};
