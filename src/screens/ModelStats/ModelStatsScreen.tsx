import { useEffect, useState } from "react";
import { useDogs } from "../../app/DogContext";
import { modelsStore, samplesStore } from "../../modules/storage/db";
import { estimateStorage, type StorageEstimate } from "../../modules/storage/blobStore";
import { DEFAULT_CATEGORIES, type MoodCategory, type Sample, type StoredModel } from "../../types";

export function ModelStatsScreen() {
  const { activeDog } = useDogs();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [model, setModel] = useState<StoredModel | null>(null);
  const [storage, setStorage] = useState<StorageEstimate | null>(null);

  useEffect(() => {
    if (!activeDog) return;
    void samplesStore.byDog(activeDog.id).then(setSamples);
    void modelsStore.get(activeDog.id).then((m) => setModel(m ?? null));
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

  const counts = new Map<MoodCategory, number>();
  for (const s of samples) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  const correctionCount = samples.filter((s) => s.source === "correction").length;

  return (
    <div className="screen">
      <h2>Model Stats — {activeDog.name}</h2>

      <section className="card">
        <h3>Model</h3>
        {model ? (
          <ul>
            <li>Last trained: {new Date(model.trainedAt).toLocaleString()}</li>
            <li>Samples at last training: {model.sampleCountAtTrain}</li>
            <li>Categories: {model.categories.length}</li>
          </ul>
        ) : (
          <p className="hint">No model trained yet.</p>
        )}
      </section>

      <section className="card">
        <h3>Dataset ({samples.length} samples, {correctionCount} from corrections)</h3>
        <ul>
          {DEFAULT_CATEGORIES.map((c) => (
            <li key={c.id}>
              {c.label}: {counts.get(c.id) ?? 0}
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
