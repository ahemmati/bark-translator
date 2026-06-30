import { Suspense, lazy, useState } from "react";
import { DogProvider, useDogs } from "./app/DogContext";
import { DogProfilesScreen } from "./screens/DogProfiles/DogProfilesScreen";
import { HistoryScreen } from "./screens/History/HistoryScreen";
import { ModelStatsScreen } from "./screens/ModelStats/ModelStatsScreen";
import { SettingsScreen } from "./screens/Settings/SettingsScreen";
import { LibraryScreen } from "./screens/Library/LibraryScreen";

// These two screens pull in TensorFlow.js (~700kB+); lazy-load so the rest of
// the app shell (profiles, history, settings) is usable before that downloads.
const TrainingModeScreen = lazy(() =>
  import("./screens/TrainingMode/TrainingModeScreen").then((m) => ({ default: m.TrainingModeScreen })),
);
const TranslateModeScreen = lazy(() =>
  import("./screens/TranslateMode/TranslateModeScreen").then((m) => ({ default: m.TranslateModeScreen })),
);

type Tab = "translate" | "train" | "dogs" | "library" | "history" | "stats" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "translate", label: "Translate", icon: "🗣️" },
  { id: "train", label: "Train", icon: "🎓" },
  { id: "dogs", label: "Dogs", icon: "🐕" },
  { id: "library", label: "Library", icon: "📖" },
  { id: "history", label: "History", icon: "🕓" },
  { id: "stats", label: "Stats", icon: "📊" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

function Shell() {
  const [tab, setTab] = useState<Tab>("translate");
  const { activeDog, dogs, setActiveDogId } = useDogs();
  const activeIndex = TABS.findIndex((t) => t.id === tab);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>
          <span className="header-dog">🐶</span> Bark Translator
        </h1>
        {dogs.length > 1 && (
          <select value={activeDog?.id ?? ""} onChange={(e) => setActiveDogId(e.target.value)}>
            {dogs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </header>

      <main className="app-main">
        <Suspense fallback={<p className="hint">Loading…</p>}>
          <div key={tab} className="screen-transition">
            {tab === "translate" && <TranslateModeScreen />}
            {tab === "train" && <TrainingModeScreen />}
            {tab === "dogs" && <DogProfilesScreen />}
            {tab === "library" && <LibraryScreen />}
            {tab === "history" && <HistoryScreen />}
            {tab === "stats" && <ModelStatsScreen />}
            {tab === "settings" && <SettingsScreen />}
          </div>
        </Suspense>
      </main>

      <nav className="app-nav" style={{ ["--tab-count" as string]: TABS.length }}>
        <div className="nav-indicator" style={{ transform: `translateX(${activeIndex * 100}%)` }} />
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "is-active" : ""}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <DogProvider>
      <Shell />
    </DogProvider>
  );
}
