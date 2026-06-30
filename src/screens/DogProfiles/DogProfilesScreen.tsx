import { useState } from "react";
import { useDogs } from "../../app/DogContext";
import { dogsStore } from "../../modules/storage/db";
import { PhotoCapture } from "../../components/PhotoCapture";
import type { Dog } from "../../types";

export function DogProfilesScreen() {
  const { dogs, activeDogId, setActiveDogId, refreshDogs } = useDogs();
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);

  async function addDog() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    const dog: Dog = {
      id: crypto.randomUUID(),
      name: trimmed,
      photoThumb: photo ?? undefined,
      createdAt: Date.now(),
    };
    await dogsStore.put(dog);
    await refreshDogs();
    setActiveDogId(dog.id);
    setName("");
    setPhoto(null);
    setBusy(false);
  }

  async function removeDog(id: string) {
    if (!confirm("Delete this dog and all of its training data? This can't be undone.")) return;
    await dogsStore.remove(id);
    await refreshDogs();
  }

  return (
    <div className="screen">
      <h2>Dog Profiles</h2>
      <p className="hint">Each dog gets its own trained model — bark "vocabulary" is personal to the dog.</p>

      <ul className="dog-list">
        {dogs.map((dog) => (
          <li key={dog.id} className={dog.id === activeDogId ? "is-active" : ""}>
            <button type="button" className="dog-select" onClick={() => setActiveDogId(dog.id)}>
              {dog.photoThumb && <img src={URL.createObjectURL(dog.photoThumb)} alt={dog.name} />}
              <span>{dog.name}</span>
              {dog.id === activeDogId && <em>active</em>}
            </button>
            <button type="button" className="danger" onClick={() => removeDog(dog.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      <div className="add-dog">
        <h3>Add a dog</h3>
        <input
          type="text"
          placeholder="Dog's name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <PhotoCapture onCapture={setPhoto} />
        <button type="button" onClick={addDog} disabled={busy || !name.trim()}>
          Add Dog
        </button>
      </div>
    </div>
  );
}
