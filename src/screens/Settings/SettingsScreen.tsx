import { useEffect, useState } from "react";
import { getAvailableVoices, onVoicesChanged, isSpeechSupported } from "../../modules/tts/speak";
import { exportAllData, importAllData, downloadBlob } from "../../modules/storage/exportImport";
import { useDogs } from "../../app/DogContext";

const VOICE_KEY = "bark-translator:voiceURI";

export function SettingsScreen() {
  const { refreshDogs } = useDogs();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState(() => localStorage.getItem(VOICE_KEY) ?? "");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isSpeechSupported()) return;
    setVoices(getAvailableVoices());
    return onVoicesChanged(setVoices);
  }, []);

  function selectVoice(uri: string) {
    setVoiceURI(uri);
    localStorage.setItem(VOICE_KEY, uri);
  }

  async function handleExport() {
    const blob = await exportAllData();
    downloadBlob(blob, `bark-translator-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setStatus("Exported.");
  }

  async function handleImport(file: File | null) {
    if (!file) return;
    setStatus("Importing…");
    try {
      const result = await importAllData(file);
      await refreshDogs();
      setStatus(`Imported ${result.dogsImported} dog(s), ${result.samplesImported} sample(s).`);
    } catch (err) {
      setStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="screen">
      <h2>Settings</h2>

      {isSpeechSupported() && (
        <section className="card">
          <h3>Voice</h3>
          <select value={voiceURI} onChange={(e) => selectVoice(e.target.value)}>
            <option value="">Default voice</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </section>
      )}

      <section className="card">
        <h3>Backup</h3>
        <p className="hint">
          Everything is stored only on this device. Export regularly to keep a backup, especially on iOS where the
          browser can clear data after a week of inactivity if the app isn't installed to your home screen.
        </p>
        <div className="row">
          <button type="button" onClick={handleExport}>
            Export all data
          </button>
          <label className="file-button">
            Import backup
            <input type="file" accept="application/json" onChange={(e) => handleImport(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        {status && <p className="hint">{status}</p>}
      </section>
    </div>
  );
}
