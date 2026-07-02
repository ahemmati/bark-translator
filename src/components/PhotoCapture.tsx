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
      {!previewUrl ? (
        <label className="photo-pick-label">
          📷 Choose photo
          {/* No `capture` attribute so the sheet shows camera + photo library + Files.
              Explicit Apple formats alongside image/* so iOS file picker surfaces
              HEIC/HEIF photos from the camera roll. */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.heic,.heif,.avif,.dng"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <div className="photo-preview">
          <img src={previewUrl} alt={fileName ?? "Selected photo"} />
          <div className="photo-preview-footer">
            <span className="photo-filename">{fileName}</span>
            <button type="button" onClick={clear}>✕ Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}
