import { useRef, useState } from "react";
import { BarkRecorder } from "../modules/audio/recorder";
import { LiveWaveform } from "./LiveWaveform";

interface RecordButtonProps {
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
}

export function RecordButton({ onRecorded, disabled }: RecordButtonProps) {
  const [state, setState] = useState<"idle" | "recording" | "processing" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<BarkRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function handleClick() {
    if (state === "recording") {
      setState("processing");
      stopTimer();
      try {
        const blob = await recorderRef.current?.stop();
        if (blob) onRecorded(blob);
        setState("idle");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setState("error");
      } finally {
        setAnalyser(null);
      }
      return;
    }

    setErrorMessage(null);
    try {
      recorderRef.current = new BarkRecorder();
      await recorderRef.current.start();
      setAnalyser(recorderRef.current.getAnalyser());
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 0.1), 100);
      setState("recording");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? `Couldn't access microphone: ${err.message}`
          : "Couldn't access microphone",
      );
      setState("error");
    }
  }

  return (
    <div className="record-button-wrap">
      <button
        type="button"
        className={`record-button ${state === "recording" ? "is-recording" : ""}`}
        onClick={handleClick}
        disabled={disabled || state === "processing"}
      >
        {state === "recording" ? (
          <span className="record-live">
            <span className="record-dot" />
            Stop Recording · {elapsed.toFixed(1)}s
          </span>
        ) : state === "processing" ? (
          "Processing…"
        ) : (
          "🎙️ Record Bark"
        )}
      </button>
      {state === "recording" && <LiveWaveform analyser={analyser} />}
      {errorMessage && <p className="error-text">{errorMessage}</p>}
    </div>
  );
}
