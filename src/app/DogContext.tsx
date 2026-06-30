import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Dog } from "../types";
import { dogsStore } from "../modules/storage/db";

interface DogContextValue {
  dogs: Dog[];
  activeDog: Dog | null;
  activeDogId: string | null;
  setActiveDogId: (id: string | null) => void;
  refreshDogs: () => Promise<void>;
}

const DogContext = createContext<DogContextValue | null>(null);

const ACTIVE_DOG_KEY = "bark-translator:activeDogId";

export function DogProvider({ children }: { children: ReactNode }) {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [activeDogId, setActiveDogIdState] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_DOG_KEY),
  );

  const refreshDogs = useCallback(async () => {
    const all = await dogsStore.all();
    all.sort((a, b) => a.createdAt - b.createdAt);
    setDogs(all);
  }, []);

  useEffect(() => {
    void refreshDogs();
  }, [refreshDogs]);

  useEffect(() => {
    if (activeDogId && !dogs.some((d) => d.id === activeDogId) && dogs.length > 0) {
      setActiveDogIdState(dogs[0].id);
    } else if (!activeDogId && dogs.length > 0) {
      setActiveDogIdState(dogs[0].id);
    }
  }, [dogs, activeDogId]);

  const setActiveDogId = useCallback((id: string | null) => {
    setActiveDogIdState(id);
    if (id) localStorage.setItem(ACTIVE_DOG_KEY, id);
    else localStorage.removeItem(ACTIVE_DOG_KEY);
  }, []);

  const activeDog = dogs.find((d) => d.id === activeDogId) ?? null;

  return (
    <DogContext.Provider value={{ dogs, activeDog, activeDogId, setActiveDogId, refreshDogs }}>
      {children}
    </DogContext.Provider>
  );
}

export function useDogs(): DogContextValue {
  const ctx = useContext(DogContext);
  if (!ctx) throw new Error("useDogs must be used within DogProvider");
  return ctx;
}
