import { useEffect, useState } from "react";
import { useDogs } from "../../app/DogContext";
import { RecordButton } from "../../components/RecordButton";
import { CategoryPicker } from "../../components/CategoryPicker";
import { PostureTagPicker } from "../../components/PostureTagPicker";
import { PhotoCapture } from "../../components/PhotoCapture";
import { decodeAudioBlob } from "../../modules/audio/recorder";
import { extractAudioFeatures } from "../../modules/audio/features";
import { playBlob } from "../../modules/audio/playback";
import { samplesStore, modelsStore, imageModelsStore } from "../../modules/storage/db";
import { trainModelForDog, InsufficientDataError, MIN_SAMPLES_TO_TRAIN, MIN_CATEGORIES_TO_TRAIN } from "../../modules/ml/trainModel";
import {
  trainImageModelForDog,
  DegenerateModelError,
  MIN_IMAGE_SAMPLES_TO_TRAIN,
  MIN_IMAGE_CATEGORIES_TO_TRAIN,
} from "../../modules/ml/trainImageModel";
import {
  DEFAULT_CATEGORIES,
  hasAudio,
  hasImage,
  suggestCategoryFromTags,
  type AudioFeatures,
  type MoodCategory,
  type PostureTag,
  type Sample,
  type StoredImageModel,
  type StoredModel,
} from "../../types";

export function TrainingModeScreen() {
  const { activeDog } = useDogs();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [model, setModel] = useState<StoredModel | null>(null);
  const [imageModel, setImageModel] = useState<StoredImageModel | null>(null);

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [features, setFeatures] = useState<AudioFeatures | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [postureTags, setPostureTags] = useState<PostureTag[]>([]);
  const [category, setCategory] = useState<MoodCategory | null>(null);
  const [exampleSentence, setExampleSentence] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [trainStatus, setTrainStatus] = useState<string | null>(null);
  const [imageTrainStatus, setImageTrainStatus] = useState<string | null>(null);
  const [training, setTraining] = useState(false);

  useEffect(() => {
    if (!activeDog) return;
    void refresh();
  }, [activeDog?.id]);

  async function refresh() {
    if (!activeDog) return;
    setSamples(await samplesStore.byDog(activeDog.id));
    setModel((await modelsStore.get(activeDog.id)) ?? null);
    setImageModel((await imageModelsStore.get(activeDog.id)) ?? null);
  }

  async function handleRecorded(blob: Blob) {
    setStatus("Analyzing bark…");
    setAudioBlob(blob);
    try {
      const buffer = await decodeAudioBlob(blob);
      setFeatures(extractAudioFeatures(buffer));
      setStatus(null);
    } catch (err) {
      setStatus(`Couldn't analyze audio: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function resetForm() {
    setAudioBlob(null);
    setFeatures(null);
    setPhoto(null);
    setPostureTags([]);
    setCategory(null);
    setExampleSentence("");
  }

  async function saveSample() {
    if (!activeDog || !category) return;
    const hasAudioInput = audioBlob && features;
    const hasImageInput = !!photo;
    if (!hasAudioInput && !hasImageInput) return;

    const base = {
      id: crypto.randomUUID(),
      dogId: activeDog.id,
      postureTags,
      category,
      sentence: exampleSentence.trim() || undefined,
      source: "training" as const,
      createdAt: Date.now(),
    };

    let sample: Sample;
    if (hasAudioInput && hasImageInput) {
      sample = { ...base, modality: "both", audio: { audioBlob: audioBlob!, features: features! }, image: { imageBlob: photo! } };
    } else if (hasAudioInput) {
      sample = { ...base, modality: "audio", audio: { audioBlob: audioBlob!, features: features! } };
    } else {
      sample = { ...base, modality: "image", image: { imageBlob: photo! } };
    }

    await samplesStore.put(sample);
    resetForm();
    await refresh();
  }

  async function deleteSample(id: string) {
    await samplesStore.remove(id);
    await refresh();
  }

  async function handleTrain() {
    if (!activeDog) return;
    setTraining(true);
    setTrainStatus(null);
    setImageTrainStatus(null);

    try {
      const stored = await trainModelForDog(activeDog.id, (s) => setTrainStatus(s));
      setModel(stored);
      setTrainStatus(`🎤 Trained on ${stored.sampleCountAtTrain} bark samples across ${stored.categories.length} categories.`);
    } catch (err) {
      if (err instanceof InsufficientDataError) {
        setTrainStatus(`🎤 ${err.message}`);
      } else {
        setTrainStatus(`🎤 Training failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    try {
      const storedImage = await trainImageModelForDog(activeDog.id, (s) => setImageTrainStatus(`📷 ${s}`));
      setImageModel(storedImage);
      setImageTrainStatus(
        `📷 Trained on ${storedImage.sampleCountAtTrain} photos across ${storedImage.categories.length} categories.`,
      );
    } catch (err) {
      if (err instanceof InsufficientDataError || err instanceof DegenerateModelError) {
        setImageTrainStatus(`📷 ${err.message}`);
      } else {
        setImageTrainStatus(`📷 Training failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    setTraining(false);
  }

  if (!activeDog) {
    return (
      <div className="screen">
        <h2>Training Mode</h2>
        <p>Create a dog profile first on the Dogs tab.</p>
      </div>
    );
  }

  const audioCountsByCategory = new Map<MoodCategory, number>();
  const imageCountsByCategory = new Map<MoodCategory, number>();
  for (const s of samples) {
    if (hasAudio(s)) audioCountsByCategory.set(s.category, (audioCountsByCategory.get(s.category) ?? 0) + 1);
    if (hasImage(s)) imageCountsByCategory.set(s.category, (imageCountsByCategory.get(s.category) ?? 0) + 1);
  }
  const audioSampleCount = samples.filter(hasAudio).length;
  const imageSampleCount = samples.filter(hasImage).length;
  const canSave = !!category && ((audioBlob && features) || photo);

  return (
    <div className="screen">
      <h2>Training Mode — {activeDog.name}</h2>

      <section className="card">
        <h3>1. Capture this moment</h3>
        <p className="hint">Record a bark, take a photo, or both — either is enough to start labeling.</p>
        <RecordButton onRecorded={handleRecorded} />
        {status && <p className="hint">{status}</p>}
        {audioBlob && (
          <div className="row">
            <button type="button" onClick={() => playBlob(audioBlob)}>
              ▶ Play back
            </button>
            {features && (
              <span className="hint">
                {features.durationSec.toFixed(1)}s · {features.barkCount} bark(s) detected · pitch ~
                {Math.round(features.meanPitchHz)}Hz
              </span>
            )}
          </div>
        )}
        <p className="hint">Photo</p>
        <PhotoCapture onCapture={setPhoto} onAudioExtracted={handleRecorded} />
      </section>

      {((audioBlob && features) || photo) && (
        <section className="card">
          <h3>2. Label it</h3>
          <p className="hint">What's the dog's posture/context right now? (optional, but it sharpens the guess below)</p>
          <PostureTagPicker value={postureTags} onChange={setPostureTags} />

          <p className="hint">
            What does this mean?
            {suggestCategoryFromTags(postureTags) && (
              <> — body language suggests <strong>{DEFAULT_CATEGORIES.find((c) => c.id === suggestCategoryFromTags(postureTags))?.label}</strong> ✨, but you know your dog best</>
            )}
          </p>
          <CategoryPicker value={category} onChange={setCategory} suggested={suggestCategoryFromTags(postureTags)} />

          <p className="hint">Optional: write what you think the dog is "saying" in this exact moment</p>
          <input
            type="text"
            placeholder="e.g. I'm hungry, feed me!"
            value={exampleSentence}
            onChange={(e) => setExampleSentence(e.target.value)}
          />

          <button type="button" onClick={saveSample} disabled={!canSave}>
            Save Training Sample
          </button>
        </section>
      )}

      <section className="card">
        <h3>3. Dataset (🎤 {audioSampleCount} bark · 📷 {imageSampleCount} photo)</h3>
        <ul className="category-counts">
          {DEFAULT_CATEGORIES.map((c) => (
            <li key={c.id}>
              {c.emoji} {c.label}: 🎤{audioCountsByCategory.get(c.id) ?? 0} 📷{imageCountsByCategory.get(c.id) ?? 0}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleTrain}
          disabled={training || (audioSampleCount < MIN_SAMPLES_TO_TRAIN && imageSampleCount < MIN_IMAGE_SAMPLES_TO_TRAIN)}
        >
          {training ? "Training…" : "Train Model"}
        </button>
        <p className="hint">
          Bark model needs {MIN_SAMPLES_TO_TRAIN}+ samples across {MIN_CATEGORIES_TO_TRAIN}+ categories. Photo model
          needs {MIN_IMAGE_SAMPLES_TO_TRAIN}+ across {MIN_IMAGE_CATEGORIES_TO_TRAIN}+ (photos take noticeably more
          data to train reliably than barks).
        </p>
        {trainStatus && <p className="hint">{trainStatus}</p>}
        {imageTrainStatus && <p className="hint">{imageTrainStatus}</p>}
        {model && (
          <p className="hint">
            🎤 Last trained {new Date(model.trainedAt).toLocaleString()} on {model.sampleCountAtTrain} samples.
          </p>
        )}
        {imageModel && (
          <p className="hint">
            📷 Last trained {new Date(imageModel.trainedAt).toLocaleString()} on {imageModel.sampleCountAtTrain}{" "}
            samples.
          </p>
        )}

        <details>
          <summary>Manage saved samples</summary>
          <ul className="sample-list">
            {samples.map((s) => (
              <li key={s.id}>
                <span>
                  {DEFAULT_CATEGORIES.find((c) => c.id === s.category)?.label} ·{" "}
                  {new Date(s.createdAt).toLocaleDateString()} · {s.source}
                </span>
                {hasAudio(s) && (
                  <button type="button" onClick={() => playBlob(s.audio.audioBlob)}>
                    ▶
                  </button>
                )}
                {hasImage(s) && <img className="sample-thumb" src={URL.createObjectURL(s.image.imageBlob)} alt="" />}
                <button type="button" className="danger" onClick={() => deleteSample(s.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
