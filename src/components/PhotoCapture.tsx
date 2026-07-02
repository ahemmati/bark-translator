import { useRef, useState } from "react";

interface PhotoCaptureProps {
  onCapture: (blob: Blob | null) => void;
  /** Called with the video blob when the user uploads a video / Live Photo MOV,
   *  so the caller can extract the bark sound from the same file. */
  onAudioExtracted?: (blob: Blob) => void;
}

/** Pull a JPEG still frame from a video blob (for Live Photo MOV previews). */
async function extractVideoFrame(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.preload = "metadata";
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Couldn't load video file for frame extraction"));
    });

    // Seek to 0.5 s (or mid-point for very short clips) for a representative frame.
    video.currentTime = Math.min(0.5, video.duration / 2);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      setTimeout(resolve, 2000); // safety
    });

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);

    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Frame extraction failed"))),
        "image/jpeg",
        0.9,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoCapture({ onCapture, onAudioExtracted }: PhotoCaptureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLivePhoto, setIsLivePhoto] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | null) {
    if (!file) {
      setPreviewUrl(null);
      setFileName(null);
      setIsLivePhoto(false);
      onCapture(null);
      return;
    }

    const isVideo = file.type.startsWith("video/") || /\.(mov|mp4|m4v)$/i.test(file.name);

    if (isVideo) {
      setExtracting(true);
      setFileName(file.name);
      setIsLivePhoto(true);
      try {
        const frame = await extractVideoFrame(file);
        const frameUrl = URL.createObjectURL(frame);
        setPreviewUrl(frameUrl);
        onCapture(frame);
        onAudioExtracted?.(file); // bark sound lives in the video's audio track
      } catch {
        setFileName(null);
        setIsLivePhoto(false);
        onCapture(null);
      } finally {
        setExtracting(false);
      }
    } else {
      setPreviewUrl(URL.createObjectURL(file));
      setFileName(file.name);
      setIsLivePhoto(false);
      onCapture(file);
    }
  }

  function clear() {
    setPreviewUrl(null);
    setFileName(null);
    setIsLivePhoto(false);
    onCapture(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="photo-capture">
      {!previewUrl && !extracting ? (
        <label className="photo-pick-label">
          📷 Choose photo or Live Photo
          {/* Accepting video/* lets users select Live Photo MOV files from Files
              app. The MOV gives us both a still frame (image) and the audio
              track (bark sound) from the same upload. */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*,.heic,.heif,.avif,.mov,.mp4,.m4v"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
      ) : extracting ? (
        <p className="hint">Extracting frame and audio from Live Photo…</p>
      ) : (
        <div className="photo-preview">
          <img src={previewUrl!} alt={fileName ?? "Selected photo"} />
          <div className="photo-preview-footer">
            <span className="photo-filename">
              {isLivePhoto ? "🎬 " : ""}
              {fileName}
              {isLivePhoto && onAudioExtracted ? " · bark audio extracted" : ""}
            </span>
            <button type="button" onClick={clear}>✕ Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}
