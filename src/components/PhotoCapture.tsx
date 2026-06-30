import { useRef, useState } from "react";

interface PhotoCaptureProps {
  onCapture: (blob: Blob | null) => void;
}

export function PhotoCapture({ onCapture }: PhotoCaptureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | null) {
    if (!file) {
      setPreviewUrl(null);
      onCapture(null);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    onCapture(file);
  }

  function clear() {
    setPreviewUrl(null);
    onCapture(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="photo-capture">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {previewUrl && (
        <div className="photo-preview">
          <img src={previewUrl} alt="Captured dog" />
          <button type="button" onClick={clear}>
            Remove photo
          </button>
        </div>
      )}
    </div>
  );
}
