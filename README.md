# 🐶 Bark Translator

Record your dog's bark (and optionally their posture), and get a locally
generated guess at what they're trying to say — trained entirely on your own
data, on your own device. No cloud AI, no accounts, no server.

> This is a fun, personal-pet-translation toy grounded in real general canine
> body-language knowledge, not a scientific or veterinary tool. See
> [Disclaimer](#disclaimer).

## Why "no cloud AI"?

Every model in this app is small, trained from scratch in your browser via
[TensorFlow.js](https://www.tensorflow.org/js), on samples *you* record and
label. There are no calls to any third-party AI/ML API and no pretrained
models. That's a deliberate constraint, not a limitation we're working around
— it's what makes the whole thing privacy-respecting and fully offline-capable.

## Features

- **Training Mode** — record a bark, label its meaning (mood category +
  optional posture/body-language tags + an optional example sentence), and
  train a small per-dog neural net entirely on-device (runs in a Web Worker
  so the UI never blocks).
- **Translate Mode** — record a new bark, get a generated sentence with a
  confidence level, hear it spoken aloud, and correct it if it's wrong.
  Corrections feed straight back into that dog's training data and phrase
  pool.
- **Dog Behavior Library** — a built-in reference of well-established general
  canine body-language signals (tail position, ear position, eye contact,
  etc.) with plain-language explanations. Selecting these tags while training
  also nudges (never forces) a sensible default mood category.
- **Multiple dog profiles** — each dog gets its own model, since bark
  "vocabulary" is personal to the dog.
- **History, stats, and JSON export/import** — since everything lives in the
  browser's IndexedDB, export is your backup path. There's no server to lose
  data to, but also none to fall back on.
- **Installable PWA**, works offline once installed.

## How translation works (no LLM involved)

1. A recorded bark is analyzed locally with the Web Audio API: pitch,
   duration, energy, zero-crossing rate, spectral centroid, and bark count.
2. Those features (plus any posture tags you select) feed a small dense
   neural network — trained only on that dog's labeled samples — that
   classifies a mood category with a confidence score.
3. A sentence is generated from a template/phrase-pool engine (openers +
   verb phrases + context clauses), **not** a language model. Corrections you
   make are added back into that category's phrase pool, so the app's
   "vocabulary" grows from real feedback over time.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL, allow microphone access, create a dog profile,
and start recording in Training Mode. You'll need at least 4 labeled samples
across 2+ categories before you can train, and around 30 total samples before
Translate Mode will show a guess instead of a "still learning" message — small
sample counts don't produce a trustworthy classifier, so the UI doesn't
pretend otherwise.

```bash
npm run build    # production build + typecheck
npm run lint     # oxlint
npm run preview  # serve the production build locally
```

## Architecture

```
src/
  app/            # App shell, dog-profile context
  modules/
    audio/        # mic recording, live waveform, DSP feature extraction
    ml/            # feature vectors, model definition, worker-based training, inference
    storage/       # IndexedDB schema/CRUD, JSON export/import
    phrases/       # template/phrase-pool sentence generation
    tts/            # SpeechSynthesis wrapper
  screens/         # one folder per app tab
  components/      # shared UI building blocks
  types/           # shared types + the dog-behavior knowledge base
```

Everything is client-side. There is no backend and no build-time dependency
on any external API.

## Roadmap / known gaps

- iOS/Android wrapping via [Capacitor](https://capacitorjs.com/) hasn't been
  done yet — the app is built to make that straightforward, but it hasn't
  been smoke-tested in a real WebView.
- New dog profiles start with a from-scratch model (cold start). A shared
  base model fine-tuned per dog would improve early accuracy — see
  [Contributing](#contributing) if you want to take this on.
- Mood categories are currently fixed; making them user-editable is a natural
  next step.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Disclaimer

Dogs don't have a literal spoken language, and this app does not claim
scientific accuracy. The Dog Behavior Library reflects commonly cited,
general canine body-language knowledge (the kind found in vet/trainer
educational material), but it is not veterinary or behavioral advice. If
you're concerned about your dog's health or behavior, talk to a vet or a
certified trainer.

## License

[MIT](LICENSE)
