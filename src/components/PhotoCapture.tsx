import { useRef, useState } from "react";

interface PhotoCaptureProps {
  onCapture: (blob: Blob | null) => void;
}

export function PhotoCapture({ onCapture }: PhotoCaptureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | null) {
    if (!file) {
      setPreviewUrl(null);
      setFileName(null);
      onCapture(null);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
    onCapture(file);
  }

  function clear() {
    setPreviewUrl(null);
    setFileName(null);
    onCapture(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="photo-capture">
      {/* No `capture` attribute: lets users pick from camera OR photo library OR any file on device */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.avif"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {previewUrl && (
        <div className="photo-preview">
          <img src={previewUrl} alt={fileName ?? "Selected photo"} />
          <span className="photo-filename">{fileName}</span>
          <button type="button" onClick={clear}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
