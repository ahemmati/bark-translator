import { useEffect, useState } from "react";
import { useDogs } from "../../app/DogContext";
import { modelsStore, imageModelsStore, samplesStore } from "../../modules/storage/db";
import { estimateStorage, type StorageEstimate } from "../../modules/storage/blobStore";
import {
  DEFAULT_CATEGORIES,
  hasAudio,
  hasImage,
  type MoodCategory,
  type Sample,
  type StoredImageModel,
  type StoredModel,
} from "../../types";

export function ModelStatsScreen() {
  const { activeDog } = useDogs();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [model, setModel] = useState<StoredModel | null>(null);
  const [imageModel, setImageModel] = useState<StoredImageModel | null>(null);
  const [storage, setStorage] = useState<StorageEstimate | null>(null);

  useEffect(() => {
    if (!activeDog) return;
    void samplesStore.byDog(activeDog.id).then(setSamples);
    void modelsStore.get(activeDog.id).then((m) => setModel(m ?? null));
    void imageModelsStore.get(activeDog.id).then((m) => setImageModel(m ?? null));
    void estimateStorage().then(setStorage);
  }, [activeDog?.id]);

  if (!activeDog) {
    return (
      <div className="screen">
        <h2>Model Stats</h2>
        <p>Create a dog profile first on the Dogs tab.</p>
      </div>
    );
  }

  const audioCounts = new Map<MoodCategory, number>();
  const imageCounts = new Map<MoodCategory, number>();
  for (const s of samples) {
    if (hasAudio(s)) audioCounts.set(s.category, (audioCounts.get(s.category) ?? 0) + 1);
    if (hasImage(s)) imageCounts.set(s.category, (imageCounts.get(s.category) ?? 0) + 1);
  }
  const correctionCount = samples.filter((s) => s.source === "correction").length;

  return (
    <div className="screen">
      <h2>Model Stats — {activeDog.name}</h2>

      <section className="card">
        <h3>🎤 Bark model</h3>
        {model ? (
          <ul>
            <li>Last trained: {new Date(model.trainedAt).toLocaleString()}</li>
            <li>Samples at last training: {model.sampleCountAtTrain}</li>
            <li>Categories: {model.categories.length}</li>
          </ul>
        ) : (
          <p className="hint">No bark model trained yet.</p>
        )}
      </section>

      <section className="card">
        <h3>📷 Photo model</h3>
        {imageModel ? (
          <ul>
            <li>Last trained: {new Date(imageModel.trainedAt).toLocaleString()}</li>
            <li>Samples at last training: {imageModel.sampleCountAtTrain}</li>
            <li>Categories: {imageModel.categories.length}</li>
          </ul>
        ) : (
          <p className="hint">
            No photo model trained yet. Photo-based translation needs noticeably more labeled samples than bark
            translation to be reliable.
          </p>
        )}
      </section>

      <section className="card">
        <h3>Dataset ({samples.length} samples, {correctionCount} from corrections)</h3>
        <ul>
          {DEFAULT_CATEGORIES.map((c) => (
            <li key={c.id}>
              {c.emoji} {c.label}: 🎤{audioCounts.get(c.id) ?? 0} 📷{imageCounts.get(c.id) ?? 0}
            </li>
          ))}
        </ul>
      </section>

      {storage && (
        <section className="card">
          <h3>Storage</h3>
          <p className="hint">
            Using {(storage.usageBytes / 1024 / 1024).toFixed(1)} MB of {(storage.quotaBytes / 1024 / 1024).toFixed(0)} MB
            ({Math.round(storage.usageRatio * 100)}%)
          </p>
        </section>
      )}
    </div>
  );
}
