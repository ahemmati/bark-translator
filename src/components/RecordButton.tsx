import { useRef, useState } from "react";
import { BarkRecorder } from "../modules/audio/recorder";
import { LiveWaveform } from "./LiveWaveform";

interface RecordButtonProps {
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
}

// All formats AudioContext.decodeAudioData() can handle in modern browsers.
// Listed explicitly so mobile file pickers surface audio files reliably.
const AUDIO_ACCEPT = "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,.mp4,.opus,.wma,.aiff,.aif";

export function RecordButton({ onRecorded, disabled }: RecordButtonProps) {
  const [state, setState] = useState<"idle" | "recording" | "processing" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<BarkRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setUploadedName(null);
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

  function handleUpload(file: File | null) {
    if (!file) return;
    setErrorMessage(null);
    setUploadedName(file.name);
    onRecorded(file);
    // Reset input so the same file can be re-selected if needed.
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  return (
    <div className="record-button-wrap">
      <button
        type="button"
        className={`record-button ${isRecording ? "is-recording" : ""}`}
        onClick={handleClick}
        disabled={disabled || isProcessing}
      >
        {isRecording ? (
          <span className="record-live">
            <span className="record-dot" />
            Stop Recording · {elapsed.toFixed(1)}s
          </span>
        ) : isProcessing ? (
          "Processing…"
        ) : (
          "🎙️ Record Bark"
        )}
      </button>

      {isRecording && <LiveWaveform analyser={analyser} />}

      {!isRecording && !isProcessing && (
        <div className="upload-audio-row">
          <span className="upload-audio-divider">or</span>
          <label className="upload-audio-label">
            📂 Upload audio file
            <input
              ref={fileInputRef}
              type="file"
              accept={AUDIO_ACCEPT}
              disabled={disabled}
              onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
            />
          </label>
          {uploadedName && (
            <span className="upload-audio-name" title={uploadedName}>
              ✓ {uploadedName}
            </span>
          )}
        </div>
      )}

      {errorMessage && <p className="error-text">{errorMessage}</p>}
    </div>
  );
}
