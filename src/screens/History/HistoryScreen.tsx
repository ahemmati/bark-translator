import { useEffect, useState } from "react";
import { useDogs } from "../../app/DogContext";
import { historyStore } from "../../modules/storage/db";
import { DEFAULT_CATEGORIES, categoryEmoji } from "../../types";
import type { TranslationRecord } from "../../types";

function categoryLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return DEFAULT_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function HistoryScreen() {
  const { activeDog } = useDogs();
  const [records, setRecords] = useState<TranslationRecord[]>([]);

  useEffect(() => {
    if (!activeDog) return;
    void historyStore.byDog(activeDog.id).then(setRecords);
  }, [activeDog?.id]);

  if (!activeDog) {
    return (
      <div className="screen">
        <h2>History</h2>
        <p>Create a dog profile first on the Dogs tab.</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>History — {activeDog.name}</h2>
      {records.length === 0 && <p className="hint">No translations yet.</p>}
      <ul className="history-list">
        {records.map((r) => (
          <li key={r.id}>
            <div className="history-time">{new Date(r.createdAt).toLocaleString()}</div>
            <div>
              <strong>
                {categoryEmoji(r.predictedCategory)} {categoryLabel(r.predictedCategory)}
              </strong>
              : "{r.sentence}"
            </div>
            {r.correctedSentence && (
              <div className="history-correction">
                Corrected to {categoryEmoji(r.correctedCategory)} {categoryLabel(r.correctedCategory)}: "
                {r.correctedSentence}"
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
