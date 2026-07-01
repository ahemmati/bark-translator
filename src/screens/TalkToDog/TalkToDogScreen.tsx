import { useRef, useState } from "react";
import { useDogs } from "../../app/DogContext";
import { CategoryPicker } from "../../components/CategoryPicker";
import { detectMoodFromText } from "../../modules/barkSpeak/textToMood";
import { playBarkReply } from "../../modules/barkSpeak/barkPlayer";
import { generateSentence } from "../../modules/phrases/generator";
import { phrasePoolsStore } from "../../modules/storage/db";
import { DEFAULT_CATEGORIES, categoryEmoji, type MoodCategory } from "../../types";

interface ConversationEntry {
  id: number;
  speaker: "human" | "dog";
  text: string;
  mood?: MoodCategory;
  barkCount?: number;
  couldNotBark?: boolean;
}

export function TalkToDogScreen() {
  const { activeDog } = useDogs();
  const [input, setInput] = useState("");
  const [detectedMood, setDetectedMood] = useState<MoodCategory | null>(null);
  const [overrideMood, setOverrideMood] = useState<MoodCategory | null>(null);
  const [confidence, setConfidence] = useState<"clear" | "inferred" | null>(null);
  const [log, setLog] = useState<ConversationEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  function addEntry(entry: Omit<ConversationEntry, "id">) {
    setLog((prev) => [...prev, { ...entry, id: nextId.current++ }]);
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  function handleInput(text: string) {
    setInput(text);
    if (!text.trim()) {
      setDetectedMood(null);
      setOverrideMood(null);
      setConfidence(null);
      return;
    }
    const result = detectMoodFromText(text);
    setDetectedMood(result.mood);
    setOverrideMood(null);
    setConfidence(result.confidence);
  }

  const activeMood = overrideMood ?? detectedMood;

  async function handleSend() {
    if (!activeDog || !input.trim() || !activeMood) return;
    setBusy(true);

    const humanText = input.trim();
    addEntry({ speaker: "human", text: humanText });
    setInput("");
    setDetectedMood(null);
    setOverrideMood(null);
    setConfidence(null);

    const result = await playBarkReply(activeDog.id, activeMood);

    if (!result) {
      addEntry({
        speaker: "dog",
        text: `${activeDog.name} doesn't have any recorded barks yet! Record some in Training Mode first.`,
        couldNotBark: true,
      });
      setBusy(false);
      return;
    }

    const pool = await phrasePoolsStore.get(activeDog.id, activeMood);
    const generated = generateSentence({
      dogName: activeDog.name,
      category: activeMood,
      confidence: "fairlyConfident",
      postureTags: [],
      pool,
    });

    addEntry({
      speaker: "dog",
      text: generated.sentence,
      mood: activeMood,
      barkCount: result.count,
    });

    setBusy(false);
  }

  if (!activeDog) {
    return (
      <div className="screen">
        <h2>Talk to Your Dog</h2>
        <p>Create a dog profile first on the Dogs tab.</p>
      </div>
    );
  }

  const moodLabel = activeMood ? DEFAULT_CATEGORIES.find((c) => c.id === activeMood)?.label : null;

  return (
    <div className="screen talk-screen">
      <h2>Talk to {activeDog.name} 🗣️→🐶</h2>
      <p className="hint">
        Type what you want to say in English — {activeDog.name} will reply in their own bark, played
        from their real recordings.
      </p>

      <div className="talk-log" ref={logRef}>
        {log.length === 0 && (
          <p className="hint talk-placeholder">
            Say something to {activeDog.name}…
          </p>
        )}
        {log.map((entry) => (
          <div key={entry.id} className={`talk-entry talk-entry--${entry.speaker}`}>
            {entry.speaker === "human" ? (
              <>
                <span className="talk-speaker">You</span>
                <div className="talk-bubble talk-bubble--human">{entry.text}</div>
              </>
            ) : entry.couldNotBark ? (
              <>
                <span className="talk-speaker">{activeDog.name}</span>
                <div className="talk-bubble talk-bubble--dog talk-bubble--no-bark">{entry.text}</div>
              </>
            ) : (
              <>
                <span className="talk-speaker">
                  {categoryEmoji(entry.mood)} {activeDog.name}
                </span>
                <div className="talk-bubble talk-bubble--dog">
                  <div className="talk-bark-indicator">
                    {Array.from({ length: entry.barkCount ?? 1 }, (_, i) => (
                      <span key={i} className="talk-bark-wave">🔊</span>
                    ))}
                    <span className="talk-bark-label">real bark played</span>
                  </div>
                  <div className="talk-bark-translation">"{entry.text}"</div>
                </div>
              </>
            )}
          </div>
        ))}
        {busy && (
          <div className="talk-entry talk-entry--dog">
            <span className="talk-speaker">{activeDog.name}</span>
            <div className="talk-bubble talk-bubble--dog talk-bubble--thinking">
              <span className="thinking-dots" />
            </div>
          </div>
        )}
      </div>

      <div className="talk-composer">
        {input.trim() && detectedMood && (
          <div className="talk-mood-hint">
            <span className="hint">
              {categoryEmoji(activeMood)}{" "}
              {confidence === "inferred" ? "Guessing" : "Sounds like"}{" "}
              <strong>{moodLabel}</strong> energy
              {confidence === "inferred" ? " (no keyword match)" : ""}
            </span>
            {confidence === "inferred" && (
              <button type="button" className="talk-override-btn" onClick={() => setOverrideMood(overrideMood ? null : detectedMood)}>
                {overrideMood ? "Using override" : "Change mood"}
              </button>
            )}
          </div>
        )}
        {input.trim() && confidence === "inferred" && (
          <div className="talk-mood-override">
            <p className="hint">Pick the mood you want {activeDog.name} to respond with:</p>
            <CategoryPicker value={activeMood} onChange={setOverrideMood} />
          </div>
        )}

        <div className="talk-input-row">
          <textarea
            className="talk-input"
            placeholder={`Say something to ${activeDog.name}…`}
            value={input}
            rows={2}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!busy && input.trim() && activeMood) void handleSend();
              }
            }}
          />
          <button
            type="button"
            className="talk-send-btn"
            onClick={handleSend}
            disabled={busy || !input.trim() || !activeMood}
          >
            {busy ? "🐾" : "Send →"}
          </button>
        </div>
        <p className="hint">
          Enter / Send — {activeDog.name} will reply using real bark recordings from Training Mode.
        </p>
      </div>
    </div>
  );
}
