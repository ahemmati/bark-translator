import { useEffect, useState } from "react";
import { useDogs } from "../../app/DogContext";
import { RecordButton } from "../../components/RecordButton";
import { PostureTagPicker } from "../../components/PostureTagPicker";
import { PhotoCapture } from "../../components/PhotoCapture";
import { ConfidenceBadge } from "../../components/ConfidenceBadge";
import { CategoryPicker } from "../../components/CategoryPicker";
import { decodeAudioBlob } from "../../modules/audio/recorder";
import { extractAudioFeatures } from "../../modules/audio/features";
import { playBlob } from "../../modules/audio/playback";
import { samplesStore, modelsStore, imageModelsStore, phrasePoolsStore, historyStore } from "../../modules/storage/db";
import {
  predictFromAudio,
  predictFromImage,
  combinePredictions,
  hasEnoughDataForConfidentTranslation,
  hasEnoughImageDataForConfidentTranslation,
  type PredictionResult,
} from "../../modules/ml/inference";
import { generateSentence, withCorrectionPhrase } from "../../modules/phrases/generator";
import { speak, isSpeechSupported } from "../../modules/tts/speak";
import { trainModelForDog, MIN_SAMPLES_FOR_CONFIDENT_TRANSLATE } from "../../modules/ml/trainModel";
import { trainImageModelForDog } from "../../modules/ml/trainImageModel";
import {
  DEFAULT_CATEGORIES,
  categoryEmoji,
  hasAudio,
  hasImage,
  type AudioFeatures,
  type ModalityUsed,
  type MoodCategory,
  type PostureTag,
  type Sample,
  type StoredImageModel,
  type StoredModel,
  type TranslationRecord,
} from "../../types";

const MODALITY_LABEL: Record<ModalityUsed, string> = {
  audio: "🎤 based on the bark",
  image: "📷 based on the look",
  both: "🎤📷 based on the bark + the look",
};

export function TranslateModeScreen() {
  const { activeDog } = useDogs();
  const [model, setModel] = useState<StoredModel | null>(null);
  const [imageModel, setImageModel] = useState<StoredImageModel | null>(null);
  const [audioSampleCount, setAudioSampleCount] = useState(0);
  const [imageCountsByCategory, setImageCountsByCategory] = useState<Map<MoodCategory, number>>(new Map());

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [features, setFeatures] = useState<AudioFeatures | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [postureTags, setPostureTags] = useState<PostureTag[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [modalityUsed, setModalityUsed] = useState<ModalityUsed | null>(null);
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
    setImageModel((await imageModelsStore.get(activeDog.id)) ?? null);
    const samples = await samplesStore.byDog(activeDog.id);
    setAudioSampleCount(samples.filter(hasAudio).length);
    const counts = new Map<MoodCategory, number>();
    for (const s of samples) {
      if (hasImage(s)) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    }
    setImageCountsByCategory(counts);
  }

  function resetResult() {
    setPrediction(null);
    setModalityUsed(null);
    setSentence(null);
    setRecord(null);
    setCorrecting(false);
    setSavedCorrection(false);
    setError(null);
  }

  async function handleRecorded(blob: Blob) {
    setAudioBlob(blob);
    resetResult();
    try {
      const buffer = await decodeAudioBlob(blob);
      setFeatures(extractAudioFeatures(buffer));
    } catch (err) {
      setError(`Couldn't analyze audio: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handlePhoto(blob: Blob | null) {
    setPhoto(blob);
    resetResult();
  }

  const audioReady = !!model && !!audioBlob && !!features && hasEnoughDataForConfidentTranslation(audioSampleCount);
  const imageReady = !!imageModel && !!photo && hasEnoughImageDataForConfidentTranslation(imageCountsByCategory);

  async function handleTranslate() {
    if (!activeDog || (!audioReady && !imageReady)) return;
    setBusy(true);
    setError(null);
    try {
      const audioResult = audioReady ? await predictFromAudio(model!, features!, postureTags) : null;
      const imageResult = imageReady ? await predictFromImage(imageModel!, photo!) : null;
      const combined = combinePredictions(audioResult, imageResult);
      const usedModality: ModalityUsed = audioResult && imageResult ? "both" : audioResult ? "audio" : "image";

      const pool = await phrasePoolsStore.get(activeDog.id, combined.category);
      const generated = generateSentence({
        dogName: activeDog.name,
        category: combined.category,
        confidence: combined.confidence,
        postureTags,
        pool,
      });
      await phrasePoolsStore.put({
        dogId: activeDog.id,
        category: combined.category,
        custom: pool?.custom ?? { openers: [], verbPhrases: [], contextClauses: [] },
        recentPicks: generated.recentPicks,
      });

      const sampleId = crypto.randomUUID();
      const newRecord: TranslationRecord = {
        id: crypto.randomUUID(),
        dogId: activeDog.id,
        sampleId,
        predictedCategory: combined.category,
        confidence: combined.confidence,
        modalityUsed: usedModality,
        sentence: generated.sentence,
        createdAt: Date.now(),
      };
      await historyStore.put(newRecord);

      setPrediction(combined);
      setModalityUsed(usedModality);
      setSentence(generated.sentence);
      setRecord(newRecord);
      setCorrectedCategory(combined.category);
      setCorrectedSentence(generated.sentence);
    } catch (err) {
      setError(`Translation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveCorrection() {
    if (!activeDog || !record || !correctedCategory || !modalityUsed) return;
    const includeAudio = (modalityUsed === "audio" || modalityUsed === "both") && audioBlob && features;
    const includeImage = (modalityUsed === "image" || modalityUsed === "both") && photo;
    if (!includeAudio && !includeImage) return;

    const base = {
      id: crypto.randomUUID(),
      dogId: activeDog.id,
      postureTags,
      category: correctedCategory,
      sentence: correctedSentence.trim() || undefined,
      source: "correction" as const,
      createdAt: Date.now(),
    };

    let correctedSample: Sample;
    if (includeAudio && includeImage) {
      correctedSample = { ...base, modality: "both", audio: { audioBlob: audioBlob!, features: features! }, image: { imageBlob: photo! } };
    } else if (includeAudio) {
      correctedSample = { ...base, modality: "audio", audio: { audioBlob: audioBlob!, features: features! } };
    } else {
      correctedSample = { ...base, modality: "image", image: { imageBlob: photo! } };
    }
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
    }
    try {
      const storedImage = await trainImageModelForDog(activeDog.id);
      setImageModel(storedImage);
    } catch {
      // Image retraining is opportunistic here; the dedicated status UI lives in Training Mode.
    }
    setBusy(false);
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

  if (!model && !imageModel) {
    return (
      <div className="screen">
        <h2>Translate Mode — {activeDog.name}</h2>
        <p>No trained model yet. Head to Training Mode, label some barks and/or photos, then train.</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>Translate Mode — {activeDog.name}</h2>
      <p className="hint">Record a bark, add a photo, or both — Translate uses whichever is ready.</p>

      <section className="card">
        <RecordButton onRecorded={handleRecorded} />
        {audioBlob && (
          <div className="row">
            <button type="button" onClick={() => playBlob(audioBlob)}>
              ▶ Play back
            </button>
          </div>
        )}
        {audioBlob && !audioReady && (
          <p className="hint warning">
            🎤 Still learning {activeDog.name}'s bark — {audioSampleCount}/{MIN_SAMPLES_FOR_CONFIDENT_TRANSLATE}{" "}
            training samples.
          </p>
        )}

        <p className="hint">Photo</p>
        <PhotoCapture onCapture={handlePhoto} onAudioExtracted={handleRecorded} />
        {photo && !imageReady && (
          <p className="hint warning">📷 Still learning {activeDog.name}'s look — needs more labeled photos per category in Training Mode.</p>
        )}

        {(audioBlob || photo) && (
          <>
            <p className="hint">What's the dog's posture/context right now? (optional, improves accuracy)</p>
            <PostureTagPicker value={postureTags} onChange={setPostureTags} />
            <button type="button" onClick={handleTranslate} disabled={busy || (!audioReady && !imageReady)}>
              {busy ? "Translating…" : "Translate"}
            </button>
          </>
        )}
        {error && <p className="error-text">{error}</p>}
      </section>

      {prediction && sentence && modalityUsed && (
        <section className="card translation-result">
          <div className="translation-emoji">{categoryEmoji(prediction.category)}</div>
          <h3>{sentence}</h3>
          <ConfidenceBadge confidence={prediction.confidence} />
          <p className="hint">{MODALITY_LABEL[modalityUsed]}</p>
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
