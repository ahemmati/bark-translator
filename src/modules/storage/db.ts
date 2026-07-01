import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Dog, PhrasePool, Sample, StoredImageModel, StoredModel, TranslationRecord } from "../../types";

interface BarkDB extends DBSchema {
  dogs: { key: string; value: Dog };
  samples: { key: string; value: Sample; indexes: { dogId: string } };
  models: { key: string; value: StoredModel };
  imageModels: { key: string; value: StoredImageModel };
  phrasePools: { key: string; value: PhrasePool; indexes: { dogId: string } };
  translationHistory: {
    key: string;
    value: TranslationRecord;
    indexes: { dogId: string };
  };
}

let dbPromise: Promise<IDBPDatabase<BarkDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<BarkDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BarkDB>("bark-translator", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("dogs", { keyPath: "id" });

          const samples = db.createObjectStore("samples", { keyPath: "id" });
          samples.createIndex("dogId", "dogId");

          db.createObjectStore("models", { keyPath: "dogId" });

          const pools = db.createObjectStore("phrasePools", { keyPath: ["dogId", "category"] as never });
          pools.createIndex("dogId", "dogId");

          const history = db.createObjectStore("translationHistory", { keyPath: "id" });
          history.createIndex("dogId", "dogId");
        }
        if (oldVersion < 2) {
          db.createObjectStore("imageModels", { keyPath: "dogId" });
        }
      },
    });
  }
  return dbPromise;
}

export const dogsStore = {
  async all(): Promise<Dog[]> {
    const db = await getDB();
    return db.getAll("dogs");
  },
  async get(id: string): Promise<Dog | undefined> {
    const db = await getDB();
    return db.get("dogs", id);
  },
  async put(dog: Dog): Promise<void> {
    const db = await getDB();
    await db.put("dogs", dog);
  },
  async remove(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(
      ["dogs", "samples", "models", "imageModels", "phrasePools", "translationHistory"],
      "readwrite",
    );
    await tx.objectStore("dogs").delete(id);
    const sampleKeys = await tx.objectStore("samples").index("dogId").getAllKeys(id);
    await Promise.all(sampleKeys.map((k) => tx.objectStore("samples").delete(k)));
    await tx.objectStore("models").delete(id);
    await tx.objectStore("imageModels").delete(id);
    const poolKeys = await tx.objectStore("phrasePools").index("dogId").getAllKeys(id);
    await Promise.all(poolKeys.map((k) => tx.objectStore("phrasePools").delete(k)));
    const historyKeys = await tx.objectStore("translationHistory").index("dogId").getAllKeys(id);
    await Promise.all(historyKeys.map((k) => tx.objectStore("translationHistory").delete(k)));
    await tx.done;
  },
};

export const samplesStore = {
  async byDog(dogId: string): Promise<Sample[]> {
    const db = await getDB();
    return db.getAllFromIndex("samples", "dogId", dogId);
  },
  async put(sample: Sample): Promise<void> {
    const db = await getDB();
    await db.put("samples", sample);
  },
  async remove(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("samples", id);
  },
};

export const modelsStore = {
  async get(dogId: string): Promise<StoredModel | undefined> {
    const db = await getDB();
    return db.get("models", dogId);
  },
  async put(model: StoredModel): Promise<void> {
    const db = await getDB();
    await db.put("models", model);
  },
};

export const imageModelsStore = {
  async get(dogId: string): Promise<StoredImageModel | undefined> {
    const db = await getDB();
    return db.get("imageModels", dogId);
  },
  async put(model: StoredImageModel): Promise<void> {
    const db = await getDB();
    await db.put("imageModels", model);
  },
};

export const phrasePoolsStore = {
  async byDog(dogId: string): Promise<PhrasePool[]> {
    const db = await getDB();
    return db.getAllFromIndex("phrasePools", "dogId", dogId);
  },
  async get(dogId: string, category: string): Promise<PhrasePool | undefined> {
    const db = await getDB();
    return db.get("phrasePools", [dogId, category] as never);
  },
  async put(pool: PhrasePool): Promise<void> {
    const db = await getDB();
    await db.put("phrasePools", pool);
  },
};

export const historyStore = {
  async byDog(dogId: string): Promise<TranslationRecord[]> {
    const db = await getDB();
    const records = await db.getAllFromIndex("translationHistory", "dogId", dogId);
    return records.sort((a, b) => b.createdAt - a.createdAt);
  },
  async put(record: TranslationRecord): Promise<void> {
    const db = await getDB();
    await db.put("translationHistory", record);
  },
};
