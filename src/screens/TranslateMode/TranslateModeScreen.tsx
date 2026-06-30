import { useEffect, useState } from "react";
import { useDogs } from "../../app/DogContext";
import { RecordButton } from "../../components/RecordButton";
import { PostureTagPicker } from "../../components/PostureTagPicker";
import { ConfidenceBadge } from "../../components/ConfidenceBadge";
import { CategoryPicker } from "../../components/CategoryPicker";
import { decodeAudioBlob } from "../../modules/audio/recorder";
import { extractAudioFeatures } from "../../modules/audio/features";
import { playBlob } from "../../modules/audio/playback";
import { samplesStore, modelsStore, phrasePoolsStore, historyStore } from "../../modules/storage/db";
import { predict, hasEnoughDataForConfidentTranslation, type PredictionResult } from "../../modules/ml/inference";
import { generateSentence, withCorrectionPhrase } from "../../modules/phrases/generator";
import { speak, isSpeechSupported } from "../../modules/tts/speak";
import { trainModelForDog, MIN_SAMPLES_FOR_CONFIDENT_TRANSLATE } from "../../modules/ml/trainModel";
import {
  DEFAULT_CATEGORIES,
  categoryEmoji,
  type AudioFeatures,
  type MoodCategory,
  type PostureTag,
  type Sample,
  type StoredModel,
  type TranslationRecord,
} from "../../types";

export function TranslateModeScreen() {
  const { activeDog } = useDogs();
  const [model, setModel] = useState<StoredModel | null>(null);
  const [totalSamples, setTotalSamples] = useState(0);

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [features, setFeatures] = useState<AudioFeatures | null>(null);
  const [postureTags, setPostureTags] = useState<PostureTag[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [sentence, setSentence] = useState<string | null>(null);
  const [record, setRecord] = useState<TranslationRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [correcting, setCorrecting] = useState(false);
  const [correctedCategory, setCorrectedCategory] = useState<MoodCategory | null>(null);
  const [correctedSentence, setCorrectedSentence] = useState("");
  const [savedCorrection, setSavedCorrection] = useState(false);

  useEffect(() => {
    if (!activeDog) return;
    void refresh();
  }, [activeDog?.id]);

  async function refresh() {
    if (!activeDog) return;
    setModel((await modelsStore.get(activeDog.id)) ?? null);
    setTotalSamples((await samplesStore.byDog(activeDog.id)).length);
  }

  async function handleRecorded(blob: Blob) {
    setAudioBlob(blob);
    setPrediction(null);
    setSentence(null);
    setRecord(null);
    setCorrecting(false);
    setSavedCorrection(false);
    setError(null);
    try {
      const buffer = await decodeAudioBlob(blob);
      setFeatures(extractAudioFeatures(buffer));
    } catch (err) {
      setError(`Couldn't analyze audio: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleTranslate() {
    if (!activeDog || !model || !audioBlob || !features) return;
    setBusy(true);
    setError(null);
    try {
      const result = await predict(model, features, postureTags);
      const pool = await phrasePoolsStore.get(activeDog.id, result.category);
      const generated = generateSentence({
        dogName: activeDog.name,
        category: result.category,
        confidence: result.confidence,
        postureTags,
        pool,
      });
      await phrasePoolsStore.put({
        dogId: activeDog.id,
        category: result.category,
        custom: pool?.custom ?? { openers: [], verbPhrases: [], contextClauses: [] },
        recentPicks: generated.recentPicks,
      });

      const sampleId = crypto.randomUUID();
      const newRecord: TranslationRecord = {
        id: crypto.randomUUID(),
        dogId: activeDog.id,
        sampleId,
        predictedCategory: result.category,
        confidence: result.confidence,
        sentence: generated.sentence,
        createdAt: Date.now(),
      };
      await historyStore.put(newRecord);

      setPrediction(result);
      setSentence(generated.sentence);
      setRecord(newRecord);
      setCorrectedCategory(result.category);
      setCorrectedSentence(generated.sentence);
    } catch (err) {
      setError(`Translation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveCorrection() {
    if (!activeDog || !audioBlob || !features || !record || !correctedCategory) return;
    const correctedSample: Sample = {
      id: crypto.randomUUID(),
      dogId: activeDog.id,
      audioBlob,
      features,
      postureTags,
      category: correctedCategory,
      sentence: correctedSentence.trim() || undefined,
      source: "correction",
      createdAt: Date.now(),
    };
    await samplesStore.put(correctedSample);

    if (correctedSentence.trim()) {
      const pool = await phrasePoolsStore.get(activeDog.id, correctedCategory);
      const updated = withCorrectionPhrase(pool, activeDog.id, correctedCategory, correctedSentence.trim());
      await phrasePoolsStore.put(updated);
    }

    await historyStore.put({
      ...record,
      correctedCategory,
      correctedSentence: correctedSentence.trim() || undefined,
    });

    setSavedCorrection(true);
    setCorrecting(false);
    await refresh();
  }

  async function retrainNow() {
    if (!activeDog) return;
    setBusy(true);
    try {
      const stored = await trainModelForDog(activeDog.id);
      setModel(stored);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveCorrectionAndRetrain() {
    await saveCorrection();
    await retrainNow();
  }

  if (!activeDog) {
    return (
      <div className="screen">
        <h2>Translate Mode</h2>
        <p>Create a dog profile first on the Dogs tab.</p>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="screen">
        <h2>Translate Mode — {activeDog.name}</h2>
        <p>No trained model yet. Head to Training Mode, label some barks, then train.</p>
      </div>
    );
  }

  const readyForConfidentGuess = hasEnoughDataForConfidentTranslation(totalSamples);

  return (
    <div className="screen">
      <h2>Translate Mode — {activeDog.name}</h2>

      {!readyForConfidentGuess && (
        <p className="hint warning">
          Still learning {activeDog.name} — {totalSamples}/{MIN_SAMPLES_FOR_CONFIDENT_TRANSLATE} training samples.
          Add more in Training Mode for trustworthy guesses.
        </p>
      )}

      <section className="card">
        <RecordButton onRecorded={handleRecorded} />
        {audioBlob && (
          <div className="row">
            <button type="button" onClick={() => playBlob(audioBlob)}>
              ▶ Play back
            </button>
          </div>
        )}

        {audioBlob && (
          <>
            <p className="hint">What's the dog's posture/context right now? (optional, improves accuracy)</p>
            <PostureTagPicker value={postureTags} onChange={setPostureTags} />
            <button type="button" onClick={handleTranslate} disabled={busy || !readyForConfidentGuess}>
              {busy ? "Translating…" : "Translate"}
            </button>
          </>
        )}
        {error && <p className="error-text">{error}</p>}
      </section>

      {prediction && sentence && (
        <section className="card translation-result">
          <div className="translation-emoji">{categoryEmoji(prediction.category)}</div>
          <h3>{sentence}</h3>
          <ConfidenceBadge confidence={prediction.confidence} />
          {isSpeechSupported() && (
            <button type="button" onClick={() => speak(sentence)}>
              🔊 Speak
            </button>
          )}

          <details>
            <summary>Other possibilities</summary>
            <ul>
              {prediction.scoresByCategory.slice(1, 4).map((s) => (
                <li key={s.category}>
                  {categoryEmoji(s.category)} {DEFAULT_CATEGORIES.find((c) => c.id === s.category)?.label}:{" "}
                  {Math.round(s.score * 100)}%
                </li>
              ))}
            </ul>
          </details>

          {!correcting && !savedCorrection && (
            <button type="button" onClick={() => setCorrecting(true)}>
              Not quite right? Correct it
            </button>
          )}
          {savedCorrection && <p className="hint">Correction saved — it'll improve future translations.</p>}

          {correcting && (
            <div className="correction-form">
              <p className="hint">What did they actually mean?</p>
              <CategoryPicker value={correctedCategory} onChange={setCorrectedCategory} />
              <textarea
                value={correctedSentence}
                onChange={(e) => setCorrectedSentence(e.target.value)}
                placeholder="Write what the dog actually meant"
              />
              <div className="row">
                <button type="button" onClick={saveCorrection} disabled={!correctedCategory}>
                  Save Correction
                </button>
                <button type="button" onClick={saveCorrectionAndRetrain} disabled={busy || !correctedCategory}>
                  Save & Retrain Now
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
