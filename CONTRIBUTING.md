# Contributing to Bark Translator

Thanks for considering a contribution! This project is intentionally small
and dependency-light — please keep that spirit in mind.

## Ground rules

- **No cloud AI / no pretrained models.** The whole point of this project is
  that translation is trained from scratch, locally, on the user's own data.
  PRs that add calls to a third-party AI API or bundle a pretrained model
  won't be merged. Bringing in libraries for *local* signal processing or
  on-device ML (like TensorFlow.js itself) is fine.
- **Stay serverless.** No backend, no required accounts.
- **Keep it dependency-light.** Before adding a package, check whether the
  Web Audio/Speech/Storage APIs already cover it.

## Dev setup

```bash
npm install
npm run dev
```

Useful scripts:

```bash
npm run build    # tsc typecheck + production build
npm run lint      # oxlint
npm run preview   # serve the production build locally
```

There's no automated test suite yet — when you touch `modules/audio`,
`modules/ml`, or `modules/phrases`, please manually verify the
record → label → train → translate → correct loop in a real browser (mic
permission is required, so this can't be done headlessly without
`--use-fake-device-for-media-stream`).

## Where things live

See the Architecture section in [README.md](README.md) for the module
layout. A few notes that aren't obvious from the file tree:

- `modules/ml/training.worker.ts` runs in a Web Worker so training never
  blocks the UI thread — keep it that way.
- `types/index.ts` doubles as the dog-behavior knowledge base
  (`POSTURE_TAGS`). If you're adding new body-language signals, add them
  there with a `generalMeaning` and (optionally) a `suggestedCategory`, and
  add a matching entry to `CONTEXT_CLAUSES` in
  `modules/phrases/pools.ts` — TypeScript will flag it if you forget, since
  that map is typed as `Record<PostureTag, string>`.
- IndexedDB schema changes belong in `modules/storage/db.ts`. Bump the `idb`
  `openDB` version number if you change the schema shape, and update
  `modules/storage/exportImport.ts` to match.

## Good first contributions

- Expanding the Dog Behavior Library (`types/index.ts` → `POSTURE_TAGS`)
  with more well-established general canine body-language signals.
- More variety in `modules/phrases/pools.ts` (openers, verb phrases, context
  clauses) — the more authored variety, the less repetitive translations
  feel.
- A shared/base model fine-tuned per dog, to fix the cold-start problem for
  brand-new dog profiles (see Roadmap in README.md).
- iOS/Android wrapping via Capacitor.

## Submitting a PR

1. Fork and branch from `main`.
2. Make sure `npm run build` and `npm run lint` pass.
3. Describe what you tested manually (screenshots/recordings welcome for UI
   changes) — this project doesn't have CI coverage for the actual
   record/train/translate flow, so a clear test description matters.
4. Open the PR. Small, focused PRs are much easier to review than large ones.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
